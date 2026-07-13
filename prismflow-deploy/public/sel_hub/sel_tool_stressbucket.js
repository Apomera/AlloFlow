// ═══════════════════════════════════════════════════════════════
// sel_tool_stressbucket.js — Stress Bucket
// A CBT-tradition visual: stressors pour INTO a bucket; coping
// practices act as TAPS that drain it. When inflow exceeds outflow,
// the bucket overflows, and overflow shows up as sleep changes,
// mood, body, or behavior.
//
// Honest framing: this is a useful capacity metaphor; it does NOT
// imply that all stress is individually removable through coping.
// Structural stressors require structural responses.
//
// Originally Brabban & Turkington (2002) in CBT for psychosis;
// adapted broadly via NHS IAPT and Mind UK for general mental
// health education.
// Registered tool ID: "stressBucket"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('stressBucket'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-stressbucket')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-stressbucket';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  var WEIGHTS = [
    { value: 1, label: 'Light',  color: '#22c55e' },
    { value: 2, label: 'Medium', color: '#facc15' },
    { value: 3, label: 'Heavy',  color: '#f97316' },
    { value: 4, label: 'Crushing', color: '#ef4444' }
  ];
  var CAPACITIES = [
    { value: 1, label: 'A little drain' },
    { value: 2, label: 'Medium drain' },
    { value: 3, label: 'Big drain' }
  ];

  var STRESSOR_STARTERS = [
    'School workload right now',
    'A specific class or teacher',
    'A friendship or social conflict',
    'Family stress or conflict at home',
    'Financial pressure',
    'Not enough sleep',
    'Health stuff (mine or someone I love)',
    'A worry about the future',
    'Living with [identity that the world treats badly]',
    'A job',
    'Caretaking for someone',
    'Anniversary or grief',
    'Sensory load (commute, crowds, lights)',
    'Big change happening (move, breakup, new school)'
  ];
  var TAP_STARTERS = [
    'Sleep (real sleep, not phone-in-bed)',
    'Movement / exercise',
    'Time outside',
    'Talking to a specific person',
    'A creative practice (drawing, writing, music)',
    'A specific pet or animal',
    'My faith / spiritual practice',
    'Cooking / eating well',
    'Therapy or counseling',
    'Time alone to recharge',
    'A specific friend group activity',
    'A specific hobby that absorbs me'
  ];
  var OVERFLOW_STARTERS = [
    'Trouble falling asleep, or sleeping too much',
    'Crying more easily',
    'Snapping at people I love',
    'Shutting down, ghosting',
    'Headaches, stomachaches, body pain',
    'Eating too much or too little',
    'Avoiding everything',
    'Drinking, using, scrolling for hours',
    'Cannot focus, grades slipping',
    'Self-critical voice gets loud',
    'Catastrophizing thoughts',
    'Numbness, going through motions'
  ];

  function defaultState() {
    return {
      view: 'bucket',
      stressors: [],     // [{label, weight}]
      taps: [],          // [{label, capacity}]
      overflowSigns: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // ── Extended Stress Bucket Narrative Library ──

  var STRESS_NARRATIVES_89 = [
    {
      id: 'sn89_1',
      title: 'My bucket and final farewell wisdom',
      narrative: [
        'Years of bucket awareness.',
        '',
        'Tools accumulated.',
        '',
        'Suffering integrated.',
        '',
        'I tell future readers: practice possible.'
      ],
      lesson: 'Years of bucket awareness with accumulated tools integrate suffering.'
    },
    {
      id: 'sn89_2',
      title: 'My bucket and gentleness',
      narrative: [
        'Gentleness toward self.',
        '',
        'Bucket overflow happens.',
        '',
        'Recovery follows.',
        '',
        'I tell harsh-self: gentleness.'
      ],
      lesson: 'Gentleness toward self when bucket overflow happens enables recovery.'
    },
    {
      id: 'sn89_3',
      title: 'My bucket and curiosity continued',
      narrative: [
        'Curiosity continues.',
        '',
        'What new tool?',
        '',
        'Learning never ends.',
        '',
        'I tell experienced: curiosity continues.'
      ],
      lesson: 'Curiosity continues asking what new tool with learning never ending.'
    },
    {
      id: 'sn89_4',
      title: 'My bucket and trust in process',
      narrative: [
        'Trust in process.',
        '',
        'Years compound.',
        '',
        'Slow growth is growth.',
        '',
        'I tell impatient: trust process.'
      ],
      lesson: 'Trust in process with years compounding; slow growth is real growth.'
    },
    {
      id: 'sn89_5',
      title: 'My bucket and forgiveness of self',
      narrative: [
        'Forgive self for overflow.',
        '',
        'Imperfection human.',
        '',
        'Begin again.',
        '',
        'I tell shame-stressed: forgive begin again.'
      ],
      lesson: 'Forgive self for overflow recognizing imperfection as human; begin again.'
    },
    {
      id: 'sn89_6',
      title: 'My bucket and remembering this body',
      narrative: [
        'This body matters.',
        '',
        'Vehicle of life.',
        '',
        'Honor it.',
        '',
        'I tell body-neglecting: this body matters.'
      ],
      lesson: 'This body matters as vehicle of life; honor it.'
    },
    {
      id: 'sn89_7',
      title: 'My bucket and remembering this mind',
      narrative: [
        'This mind matters.',
        '',
        'Tools for thinking.',
        '',
        'Honor it.',
        '',
        'I tell mind-neglecting: this mind matters.'
      ],
      lesson: 'This mind matters with tools for thinking; honor it.'
    },
    {
      id: 'sn89_8',
      title: 'My bucket and remembering this spirit',
      narrative: [
        'This spirit matters.',
        '',
        'Sacred essence.',
        '',
        'Honor it.',
        '',
        'I tell spirit-neglecting: spirit matters.'
      ],
      lesson: 'This spirit matters as sacred essence; honor it.'
    },
    {
      id: 'sn89_9',
      title: 'My bucket and remembering connection',
      narrative: [
        'You are not alone.',
        '',
        'Connection essential.',
        '',
        'Reach for community.',
        '',
        'I tell isolated: not alone.'
      ],
      lesson: 'You are not alone; connection essential through reaching for community.'
    },
    {
      id: 'sn89_10',
      title: 'My bucket and final final word',
      narrative: [
        'Practice continues.',
        '',
        'You matter.',
        '',
        'Help is here.',
        '',
        'Tools exist.',
        '',
        'I tell future readers: practice, matter, help, tools.'
      ],
      lesson: 'Final final word: practice continues, you matter, help is here, tools exist.'
    }
  ];

  var STRESS_NARRATIVES_88 = [
    {
      id: 'sn88_1',
      title: 'My bucket final daily check',
      narrative: [
        'Each day check bucket.',
        '',
        'Inflow today?',
        '',
        'Taps to open?',
        '',
        'I tell beginners: daily check.'
      ],
      lesson: 'Daily bucket check assesses inflow and identifies taps to open.'
    },
    {
      id: 'sn88_2',
      title: 'My bucket and tools always present',
      narrative: [
        'Tools always present.',
        '',
        'Breath, body, presence.',
        '',
        'Always accessible.',
        '',
        'I tell stuck: tools present.'
      ],
      lesson: 'Tools always present like breath, body, presence are always accessible.'
    },
    {
      id: 'sn88_3',
      title: 'My bucket and community always present',
      narrative: [
        'Community accessible.',
        '',
        'Phone reach.',
        '',
        'Help available.',
        '',
        'I tell isolated: reach out.'
      ],
      lesson: 'Community accessible through phone reach; help always available.'
    },
    {
      id: 'sn88_4',
      title: 'My bucket and crisis support',
      narrative: [
        'Crisis support exists.',
        '',
        '988 lifeline.',
        '',
        '24/7 available.',
        '',
        'I tell at-risk: 988 available.'
      ],
      lesson: '988 crisis lifeline available 24/7 for bucket overflow emergencies.'
    },
    {
      id: 'sn88_5',
      title: 'My bucket and final word: you matter',
      narrative: [
        'You matter.',
        '',
        'Your bucket matters.',
        '',
        'Tools available.',
        '',
        'Help possible.',
        '',
        'I tell stressed: you matter.'
      ],
      lesson: 'Final word: you matter, your bucket matters, tools are available, help is possible.'
    }
  ];

  var STRESS_NARRATIVES_87 = [
    {
      id: 'sn87_1',
      title: 'My bucket and final daily practice',
      narrative: [
        'Daily practice complete.',
        '',
        'Morning movement.',
        '',
        'Midday break.',
        '',
        'Evening rest.',
        '',
        'I tell beginners: daily complete.'
      ],
      lesson: 'Daily complete practice with morning movement, midday break, evening rest.'
    },
    {
      id: 'sn87_2',
      title: 'My bucket and weekly anchors',
      narrative: [
        'Weekly anchors set.',
        '',
        'Therapy day.',
        '',
        'Rest day.',
        '',
        'Connection day.',
        '',
        'I tell weekly: anchors.'
      ],
      lesson: 'Weekly anchors with therapy, rest, connection days structure week.'
    },
    {
      id: 'sn87_3',
      title: 'My bucket and monthly retreat',
      narrative: [
        'Monthly retreat day.',
        '',
        'Solo time.',
        '',
        'Bucket reset.',
        '',
        'I tell monthly: retreat day.'
      ],
      lesson: 'Monthly retreat day with solo time resets bucket.'
    },
    {
      id: 'sn87_4',
      title: 'My bucket and quarterly review',
      narrative: [
        'Quarterly review.',
        '',
        'Major areas examined.',
        '',
        'Adjustments made.',
        '',
        'I tell quarterly: review.'
      ],
      lesson: 'Quarterly review examines major areas enabling adjustments.'
    },
    {
      id: 'sn87_5',
      title: 'My bucket and annual sabbatical',
      narrative: [
        'Annual sabbatical week.',
        '',
        'Deep reset.',
        '',
        'Year recalibrated.',
        '',
        'I tell yearly: sabbatical.'
      ],
      lesson: 'Annual sabbatical week provides deep reset recalibrating year.'
    },
    {
      id: 'sn87_6',
      title: 'My bucket and lifelong gratitude',
      narrative: [
        'Lifelong gratitude.',
        '',
        'Daily practice.',
        '',
        'Brain trained.',
        '',
        'I tell mood-stuck: gratitude lifelong.'
      ],
      lesson: 'Lifelong gratitude daily practice trains brain over years.'
    },
    {
      id: 'sn87_7',
      title: 'My bucket and lifelong learning',
      narrative: [
        'Lifelong learning continues.',
        '',
        'Curiosity sustained.',
        '',
        'Mind alive.',
        '',
        'I tell stagnant: lifelong learning.'
      ],
      lesson: 'Lifelong learning continues with sustained curiosity keeping mind alive.'
    },
    {
      id: 'sn87_8',
      title: 'My bucket and lifelong service',
      narrative: [
        'Lifelong service.',
        '',
        'Help others always.',
        '',
        'Meaning sustained.',
        '',
        'I tell purpose-curious: service.'
      ],
      lesson: 'Lifelong service helping others always sustains meaning.'
    },
    {
      id: 'sn87_9',
      title: 'My bucket and lifelong love',
      narrative: [
        'Lifelong love.',
        '',
        'Self and others.',
        '',
        'Anchor always.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Lifelong love for self and others always provides anchor.'
    },
    {
      id: 'sn87_10',
      title: 'My bucket and lifelong wisdom',
      narrative: [
        'Lifelong wisdom emerges.',
        '',
        'Practice deepens.',
        '',
        'Suffering integrated.',
        '',
        'I tell experienced: wisdom.'
      ],
      lesson: 'Lifelong wisdom emerges as practice deepens integrating suffering.'
    },
    {
      id: 'sn87_11',
      title: 'My bucket and lifelong compassion',
      narrative: [
        'Lifelong compassion.',
        '',
        'For self and world.',
        '',
        'Heart open.',
        '',
        'I tell heart-closed: compassion.'
      ],
      lesson: 'Lifelong compassion for self and world keeps heart open.'
    },
    {
      id: 'sn87_12',
      title: 'My bucket and lifelong humility',
      narrative: [
        'Lifelong humility.',
        '',
        'Always learning.',
        '',
        'Beginners mind.',
        '',
        'I tell expert: humility.'
      ],
      lesson: 'Lifelong humility always learning with beginners mind.'
    },
    {
      id: 'sn87_13',
      title: 'My bucket and lifelong joy',
      narrative: [
        'Lifelong joy cultivated.',
        '',
        'Brain trained.',
        '',
        'Bucket lifted.',
        '',
        'I tell joy-curious: cultivation.'
      ],
      lesson: 'Lifelong joy cultivated through brain training lifts bucket.'
    },
    {
      id: 'sn87_14',
      title: 'My bucket and final integration message',
      narrative: [
        'All integrated.',
        '',
        'Body, mind, spirit, community.',
        '',
        'Whole life bucket.',
        '',
        'I tell beginners: integration possible.'
      ],
      lesson: 'All integrated body, mind, spirit, community as whole life bucket.'
    },
    {
      id: 'sn87_15',
      title: 'My bucket and final word: practice continues',
      narrative: [
        'Practice continues.',
        '',
        'Daily, weekly, yearly.',
        '',
        'Lifelong commitment.',
        '',
        'I tell beginners: practice continues.'
      ],
      lesson: 'Final word: practice continues daily, weekly, yearly as lifelong commitment.'
    }
  ];

  var STRESS_NARRATIVES_86 = [
    {
      id: 'sn86_1',
      title: 'My bucket and morning intention final',
      narrative: [
        'Morning intention practice.',
        '',
        'Day theme set.',
        '',
        'Bucket aligned.',
        '',
        'I tell scattered: intention.'
      ],
      lesson: 'Morning intention practice sets day theme aligning bucket.'
    },
    {
      id: 'sn86_2',
      title: 'My bucket and three good things',
      narrative: [
        'Daily three good things.',
        '',
        'Brain shifts measurably.',
        '',
        'Mood lifts.',
        '',
        'I tell mood-stuck: three good things.'
      ],
      lesson: 'Daily three good things measurably shifts brain and lifts mood.'
    },
    {
      id: 'sn86_3',
      title: 'My bucket and acceptance ultimate',
      narrative: [
        'Acceptance ultimate practice.',
        '',
        'What is, is.',
        '',
        'Fighting drops.',
        '',
        'I tell resisting: acceptance.'
      ],
      lesson: 'Acceptance ultimate practice with what is, is drops fighting.'
    },
    {
      id: 'sn86_4',
      title: 'My bucket and self-compassion ultimate',
      narrative: [
        'Self-compassion ultimate.',
        '',
        'Kindness to self.',
        '',
        'Bucket steady.',
        '',
        'I tell self-critical: compassion.'
      ],
      lesson: 'Self-compassion ultimate practice with kindness to self steadies bucket.'
    },
    {
      id: 'sn86_5',
      title: 'My bucket and gratitude ultimate',
      narrative: [
        'Gratitude ultimate practice.',
        '',
        'Notice good.',
        '',
        'Bucket lighter.',
        '',
        'I tell heavy: gratitude.'
      ],
      lesson: 'Gratitude ultimate practice noticing good lightens bucket.'
    },
    {
      id: 'sn86_6',
      title: 'My bucket and movement ultimate',
      narrative: [
        'Movement medicine.',
        '',
        'Daily commitment.',
        '',
        'Body grateful.',
        '',
        'I tell sedentary: movement medicine.'
      ],
      lesson: 'Movement is medicine through daily commitment as body grateful.'
    },
    {
      id: 'sn86_7',
      title: 'My bucket and sleep ultimate',
      narrative: [
        'Sleep ultimate priority.',
        '',
        '9 hours nightly.',
        '',
        'Protected fiercely.',
        '',
        'I tell sleep-flexible: protect.'
      ],
      lesson: 'Sleep ultimate priority with 9 hours nightly protected fiercely.'
    },
    {
      id: 'sn86_8',
      title: 'My bucket and community ultimate',
      narrative: [
        'Community essential.',
        '',
        'Not alone.',
        '',
        'Mutual support.',
        '',
        'I tell isolated: community essential.'
      ],
      lesson: 'Community essential as not alone provides mutual support.'
    },
    {
      id: 'sn86_9',
      title: 'My bucket and boundaries ultimate',
      narrative: [
        'Boundaries ultimate.',
        '',
        'No is full sentence.',
        '',
        'Bucket protected.',
        '',
        'I tell people-pleaser: boundaries.'
      ],
      lesson: 'Boundaries ultimate with no as full sentence protect bucket.'
    },
    {
      id: 'sn86_10',
      title: 'My bucket and service ultimate',
      narrative: [
        'Service ultimate meaning.',
        '',
        'Others helped.',
        '',
        'Self meaning.',
        '',
        'I tell purpose-curious: service.'
      ],
      lesson: 'Service ultimate meaning helps others giving self meaning.'
    },
    {
      id: 'sn86_11',
      title: 'My bucket and love ultimate',
      narrative: [
        'Love ultimate anchor.',
        '',
        'Self and others.',
        '',
        'Bucket aligned.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Love ultimate anchor for self and others aligns bucket.'
    },
    {
      id: 'sn86_12',
      title: 'My bucket and presence ultimate',
      narrative: [
        'Presence ultimate practice.',
        '',
        'This moment.',
        '',
        'Always available.',
        '',
        'I tell scattered: presence.'
      ],
      lesson: 'Presence ultimate practice this moment always available.'
    },
    {
      id: 'sn86_13',
      title: 'My bucket and patience ultimate',
      narrative: [
        'Patience cultivated.',
        '',
        'Slow growth.',
        '',
        'Trust process.',
        '',
        'I tell impatient: patience cultivation.'
      ],
      lesson: 'Patience cultivated through slow growth trusting process.'
    },
    {
      id: 'sn86_14',
      title: 'My bucket and humility ultimate',
      narrative: [
        'Humility maintained.',
        '',
        'Beginners mind.',
        '',
        'Always learning.',
        '',
        'I tell expert: humility.'
      ],
      lesson: 'Humility maintained with beginners mind keeps always learning.'
    },
    {
      id: 'sn86_15',
      title: 'My bucket and final lifelong commitment',
      narrative: [
        'Lifelong commitment.',
        '',
        'Practice continues.',
        '',
        'Daily renewal.',
        '',
        'I tell new-beginners: lifelong.'
      ],
      lesson: 'Lifelong commitment continues practice as daily renewal.'
    }
  ];

  var STRESS_NARRATIVES_85 = [
    {
      id: 'sn85_1',
      title: 'My bucket and complete daily practice',
      narrative: [
        'Daily complete practice.',
        '',
        'Morning, midday, evening.',
        '',
        'All elements integrated.',
        '',
        'I tell beginners: daily complete practice possible.'
      ],
      lesson: 'Daily complete practice integrating morning, midday, evening elements is possible.'
    },
    {
      id: 'sn85_2',
      title: 'My bucket and weekly complete practice',
      narrative: [
        'Weekly anchors set.',
        '',
        'Sunday plan.',
        '',
        'Weekend rest.',
        '',
        'Therapy session.',
        '',
        'I tell weekly-stressed: weekly anchors.'
      ],
      lesson: 'Weekly anchors set with Sunday plan, weekend rest, therapy session.'
    },
    {
      id: 'sn85_3',
      title: 'My bucket and monthly complete practice',
      narrative: [
        'Monthly anchors.',
        '',
        'Solo retreat.',
        '',
        'Review.',
        '',
        'Adjustments.',
        '',
        'I tell monthly: monthly anchors.'
      ],
      lesson: 'Monthly anchors with solo retreat, review, adjustments structure month.'
    },
    {
      id: 'sn85_4',
      title: 'My bucket and quarterly complete practice',
      narrative: [
        'Quarterly anchors.',
        '',
        'Major review.',
        '',
        'Adjustments significant.',
        '',
        'I tell quarterly: anchor practice.'
      ],
      lesson: 'Quarterly anchors with major review enable significant adjustments.'
    },
    {
      id: 'sn85_5',
      title: 'My bucket and annual complete practice',
      narrative: [
        'Annual anchors.',
        '',
        'Year review.',
        '',
        'Direction set.',
        '',
        'I tell annual: year practice.'
      ],
      lesson: 'Annual anchors with year review set direction for coming year.'
    },
    {
      id: 'sn85_6',
      title: 'My bucket and seasonal complete practice',
      narrative: [
        'Seasonal practice shifts.',
        '',
        'Body aligned.',
        '',
        'Nature rhythm.',
        '',
        'I tell rigid: seasonal shifts.'
      ],
      lesson: 'Seasonal practice shifts align body with nature rhythm.'
    },
    {
      id: 'sn85_7',
      title: 'My bucket and life-stage complete practice',
      narrative: [
        'Life-stage adapted.',
        '',
        'Bucket reshapes.',
        '',
        'Practices fit.',
        '',
        'I tell stage-shifting: adapt.'
      ],
      lesson: 'Life-stage adapted practices reshape bucket and fit current need.'
    },
    {
      id: 'sn85_8',
      title: 'My bucket and decade reflection',
      narrative: [
        'Decade reflection.',
        '',
        'Patterns recognized.',
        '',
        'Wisdom emerges.',
        '',
        'I tell decade-marker: reflection.'
      ],
      lesson: 'Decade reflection recognizes patterns as wisdom emerges.'
    },
    {
      id: 'sn85_9',
      title: 'My bucket and lifelong arc',
      narrative: [
        'Lifelong arc reviewed.',
        '',
        'Whole life.',
        '',
        'Meaning made.',
        '',
        'I tell elderly: lifelong arc.'
      ],
      lesson: 'Lifelong arc reviewed examining whole life makes meaning.'
    },
    {
      id: 'sn85_10',
      title: 'My bucket and final word: love continues',
      narrative: [
        'Love continues.',
        '',
        'Through bucket.',
        '',
        'Through life.',
        '',
        'I tell all: love.'
      ],
      lesson: 'Final word: love continues through bucket and through life.'
    },
    {
      id: 'sn85_11',
      title: 'My bucket and service emerges from practice',
      narrative: [
        'Service emerges.',
        '',
        'From bucket awareness.',
        '',
        'Help others.',
        '',
        'I tell practitioners: service emerges.'
      ],
      lesson: 'Service emerges from bucket awareness as we help others.'
    },
    {
      id: 'sn85_12',
      title: 'My bucket and teaching is service',
      narrative: [
        'Teaching is service.',
        '',
        'Share what learned.',
        '',
        'Others benefit.',
        '',
        'I tell experienced: teaching service.'
      ],
      lesson: 'Teaching is service through sharing what learned for others benefit.'
    },
    {
      id: 'sn85_13',
      title: 'My bucket and mentoring is service',
      narrative: [
        'Mentoring is service.',
        '',
        'Walk path together.',
        '',
        'Both grow.',
        '',
        'I tell experienced: mentor.'
      ],
      lesson: 'Mentoring is service walking path together as both grow.'
    },
    {
      id: 'sn85_14',
      title: 'My bucket and final integration practice',
      narrative: [
        'All integrated.',
        '',
        'Body, mind, spirit.',
        '',
        'Whole person.',
        '',
        'I tell separated: integration.'
      ],
      lesson: 'All integrated body, mind, spirit as whole person.'
    },
    {
      id: 'sn85_15',
      title: 'My bucket and lifelong wisdom',
      narrative: [
        'Lifelong wisdom emerges.',
        '',
        'Bucket awareness foundation.',
        '',
        'Daily renewal.',
        '',
        'I tell beginners: wisdom emerges.'
      ],
      lesson: 'Lifelong wisdom emerges with bucket awareness foundation as daily renewal.'
    }
  ];

  var STRESS_NARRATIVES_83 = [
    {
      id: 'sn83_1',
      title: 'My bucket lifelong learning',
      narrative: [
        'Lifelong learning.',
        '',
        'Bucket practice deepens.',
        '',
        'Tools refined.',
        '',
        'I tell beginners: lifelong learning.'
      ],
      lesson: 'Lifelong bucket learning deepens practice and refines tools.'
    },
    {
      id: 'sn83_2',
      title: 'My bucket and final acceptance',
      narrative: [
        'Final acceptance.',
        '',
        'Bucket as is.',
        '',
        'Capacity honored.',
        '',
        'I tell fighting: final acceptance.'
      ],
      lesson: 'Final acceptance of bucket as is honors capacity.'
    },
    {
      id: 'sn83_3',
      title: 'My bucket and morning quiet hour',
      narrative: [
        'Morning quiet hour.',
        '',
        'Before world wakes.',
        '',
        'Solo time.',
        '',
        'I tell solo-seeking: morning quiet.'
      ],
      lesson: 'Morning quiet hour before world wakes provides solo time.'
    },
    {
      id: 'sn83_4',
      title: 'My bucket and evening quiet hour',
      narrative: [
        'Evening quiet hour.',
        '',
        'After family asleep.',
        '',
        'Self time.',
        '',
        'I tell self-time: evening quiet.'
      ],
      lesson: 'Evening quiet hour after family asleep provides self time.'
    },
    {
      id: 'sn83_5',
      title: 'My bucket and weekly solo time',
      narrative: [
        'Weekly solo time.',
        '',
        'Whole day if possible.',
        '',
        'Bucket recharges.',
        '',
        'I tell over-giving: weekly solo.'
      ],
      lesson: 'Weekly solo time whole day if possible recharges bucket.'
    },
    {
      id: 'sn83_6',
      title: 'My bucket and monthly solo retreat',
      narrative: [
        'Monthly solo retreat.',
        '',
        'Weekend alone.',
        '',
        'Deep recharge.',
        '',
        'I tell stressed: monthly retreat.'
      ],
      lesson: 'Monthly solo retreats weekend alone provide deep recharge.'
    },
    {
      id: 'sn83_7',
      title: 'My bucket and annual sabbatical',
      narrative: [
        'Annual sabbatical week.',
        '',
        'Extended off-grid.',
        '',
        'Major reset.',
        '',
        'I tell driven: annual sabbatical.'
      ],
      lesson: 'Annual sabbatical week extended off-grid provides major reset.'
    },
    {
      id: 'sn83_8',
      title: 'My bucket and life sabbatical',
      narrative: [
        'Life sabbatical years.',
        '',
        'Major transition.',
        '',
        'Whole life reset.',
        '',
        'I tell mid-life: sabbatical.'
      ],
      lesson: 'Life sabbatical years as major transition provides whole life reset.'
    },
    {
      id: 'sn83_9',
      title: 'My bucket and pilgrimage practice',
      narrative: [
        'Annual pilgrimage.',
        '',
        'Sacred journey.',
        '',
        'Year deepens.',
        '',
        'I tell faith-curious: pilgrimage.'
      ],
      lesson: 'Annual pilgrimage as sacred journey deepens year.'
    },
    {
      id: 'sn83_10',
      title: 'My bucket and big trip annually',
      narrative: [
        'Big trip annually.',
        '',
        'Different place.',
        '',
        'Perspective expanded.',
        '',
        'I tell routine-bound: annual trip.'
      ],
      lesson: 'Annual big trips to different places expand perspective.'
    },
    {
      id: 'sn83_11',
      title: 'My bucket and seasonal trip',
      narrative: [
        'Each season trip.',
        '',
        'Year structure.',
        '',
        'Time markers.',
        '',
        'I tell anchored: seasonal trips.'
      ],
      lesson: 'Each season trip structures year with time markers.'
    },
    {
      id: 'sn83_12',
      title: 'My bucket and quarterly retreat',
      narrative: [
        'Quarterly retreat.',
        '',
        'Four times yearly.',
        '',
        'Bucket maintained.',
        '',
        'I tell systematic: quarterly retreats.'
      ],
      lesson: 'Quarterly retreats four times yearly maintain bucket.'
    },
    {
      id: 'sn83_13',
      title: 'My bucket and silence retreat annual',
      narrative: [
        'Annual silent retreat.',
        '',
        'Weekend silence.',
        '',
        'Deep practice.',
        '',
        'I tell silence-curious: annual.'
      ],
      lesson: 'Annual silent weekend retreats provide deep practice.'
    },
    {
      id: 'sn83_14',
      title: 'My bucket and writing retreat',
      narrative: [
        'Writing retreat annual.',
        '',
        'Days of writing.',
        '',
        'Voice deepens.',
        '',
        'I tell writer-deep: retreat.'
      ],
      lesson: 'Annual writing retreats with days of writing deepen voice.'
    },
    {
      id: 'sn83_15',
      title: 'My bucket and meditation retreat',
      narrative: [
        'Meditation retreat annual.',
        '',
        'Days of practice.',
        '',
        'Brain deepens.',
        '',
        'I tell meditator: annual retreat.'
      ],
      lesson: 'Annual meditation retreats with days of practice deepen brain.'
    }
  ];

  var STRESS_NARRATIVES_84 = [
    {
      id: 'sn84_1',
      title: 'My bucket and final wisdom',
      narrative: [
        'Final wisdom emerges.',
        '',
        'Years of practice.',
        '',
        'Suffering integrated.',
        '',
        'I tell experienced: final wisdom.'
      ],
      lesson: 'Final wisdom emerges from years of practice integrating suffering.'
    },
    {
      id: 'sn84_2',
      title: 'My bucket and patience cultivated',
      narrative: [
        'Patience over years.',
        '',
        'Slow growth.',
        '',
        'Bucket deepens.',
        '',
        'I tell impatient: cultivation.'
      ],
      lesson: 'Patience cultivated over years through slow growth deepens bucket.'
    },
    {
      id: 'sn84_3',
      title: 'My bucket and persistence rewarded',
      narrative: [
        'Persistence rewarded.',
        '',
        'Daily practice.',
        '',
        'Years compound.',
        '',
        'I tell quitting: persistence rewards.'
      ],
      lesson: 'Persistence rewarded through daily practice as years compound.'
    },
    {
      id: 'sn84_4',
      title: 'My bucket and curiosity sustained',
      narrative: [
        'Curiosity sustained.',
        '',
        'New tools added.',
        '',
        'Practice evolves.',
        '',
        'I tell stagnant: curiosity.'
      ],
      lesson: 'Curiosity sustained adds new tools as practice evolves.'
    },
    {
      id: 'sn84_5',
      title: 'My bucket and adaptation continuous',
      narrative: [
        'Continuous adaptation.',
        '',
        'Life changes.',
        '',
        'Bucket adjusts.',
        '',
        'I tell rigid: adaptation.'
      ],
      lesson: 'Continuous adaptation to life changes adjusts bucket.'
    },
    {
      id: 'sn84_6',
      title: 'My bucket and gratitude lifelong',
      narrative: [
        'Lifelong gratitude.',
        '',
        'Tools available.',
        '',
        'Suffering bearable.',
        '',
        'I tell stressed: gratitude.'
      ],
      lesson: 'Lifelong gratitude with tools available makes suffering bearable.'
    },
    {
      id: 'sn84_7',
      title: 'My bucket and compassion expanded',
      narrative: [
        'Compassion expanded.',
        '',
        'For self and others.',
        '',
        'Bucket wisdom shared.',
        '',
        'I tell experienced: compassion expansion.'
      ],
      lesson: 'Compassion expanded for self and others shares bucket wisdom.'
    },
    {
      id: 'sn84_8',
      title: 'My bucket and humility maintained',
      narrative: [
        'Humility maintained.',
        '',
        'Always more to learn.',
        '',
        'Beginners mind.',
        '',
        'I tell expert-feeling: humility.'
      ],
      lesson: 'Humility maintained with always more to learn keeps beginners mind.'
    },
    {
      id: 'sn84_9',
      title: 'My bucket and joy returned',
      narrative: [
        'Joy returned.',
        '',
        'After bucket work.',
        '',
        'Bucket lighter.',
        '',
        'I tell heavy: joy returns.'
      ],
      lesson: 'Joy returns after bucket work making bucket lighter.'
    },
    {
      id: 'sn84_10',
      title: 'My bucket and peace cultivated',
      narrative: [
        'Peace cultivated.',
        '',
        'Inner not outer.',
        '',
        'Bucket settled.',
        '',
        'I tell peace-seeking: inner peace.'
      ],
      lesson: 'Peace cultivated inner not outer settles bucket.'
    },
    {
      id: 'sn84_11',
      title: 'My bucket and equanimity built',
      narrative: [
        'Equanimity built.',
        '',
        'Highs and lows.',
        '',
        'Both met.',
        '',
        'I tell reactive: equanimity.'
      ],
      lesson: 'Equanimity built meets both highs and lows.'
    },
    {
      id: 'sn84_12',
      title: 'My bucket and resilience deepened',
      narrative: [
        'Resilience deepened.',
        '',
        'Bouncing back faster.',
        '',
        'Practice pays.',
        '',
        'I tell resilience-curious: deepened.'
      ],
      lesson: 'Resilience deepened with bouncing back faster pays through practice.'
    },
    {
      id: 'sn84_13',
      title: 'My bucket and meaning lived',
      narrative: [
        'Meaning lived.',
        '',
        'Service to others.',
        '',
        'Bucket aligned.',
        '',
        'I tell purpose: meaning lived.'
      ],
      lesson: 'Meaning lived through service to others aligns bucket.'
    },
    {
      id: 'sn84_14',
      title: 'My bucket and love deepened',
      narrative: [
        'Love deepened.',
        '',
        'Self and others.',
        '',
        'Bucket open.',
        '',
        'I tell love-curious: deepening.'
      ],
      lesson: 'Love deepened for self and others keeps bucket open.'
    },
    {
      id: 'sn84_15',
      title: 'My bucket and final word integrated',
      narrative: [
        'Final word: integration.',
        '',
        'All practices woven.',
        '',
        'Life rich.',
        '',
        'I tell beginners: integration possible.'
      ],
      lesson: 'Final word: integration weaves all practices for rich life.'
    }
  ];

  var STRESS_NARRATIVES_80 = [
    {
      id: 'sn80_1',
      title: 'My bucket and morning gratitude list',
      narrative: [
        'Daily morning three.',
        '',
        'Brain trained.',
        '',
        'Bucket lighter.',
        '',
        'I tell mood-stuck: morning three.'
      ],
      lesson: 'Daily morning three gratitudes train brain lightening bucket.'
    },
    {
      id: 'sn80_2',
      title: 'My bucket and evening reflection',
      narrative: [
        'Evening reflection writing.',
        '',
        'Day patterns.',
        '',
        'Bucket reviewed.',
        '',
        'I tell daily-aware: evening reflection.'
      ],
      lesson: 'Evening reflection writing examines day patterns reviewing bucket.'
    },
    {
      id: 'sn80_3',
      title: 'My bucket and morning intention',
      narrative: [
        'Single word intention.',
        '',
        'Day theme.',
        '',
        'Direction set.',
        '',
        'I tell scattered: intention setting.'
      ],
      lesson: 'Single word morning intention sets day theme and direction.'
    },
    {
      id: 'sn80_4',
      title: 'My bucket and weekly planning',
      narrative: [
        'Sunday weekly plan.',
        '',
        'Week mapped.',
        '',
        'Bucket prepared.',
        '',
        'I tell scattered-week: Sunday plan.'
      ],
      lesson: 'Sunday weekly planning maps week preparing bucket.'
    },
    {
      id: 'sn80_5',
      title: 'My bucket and monthly review',
      narrative: [
        'Monthly habits review.',
        '',
        'What worked.',
        '',
        'Adjustments made.',
        '',
        'I tell habit-curious: monthly review.'
      ],
      lesson: 'Monthly habits review examines what worked enabling adjustments.'
    },
    {
      id: 'sn80_6',
      title: 'My bucket and quarterly check-in',
      narrative: [
        'Quarterly life check.',
        '',
        'Major areas reviewed.',
        '',
        'Direction adjusted.',
        '',
        'I tell systematic: quarterly check.'
      ],
      lesson: 'Quarterly life check reviews major areas adjusting direction.'
    },
    {
      id: 'sn80_7',
      title: 'My bucket and annual review practice',
      narrative: [
        'Annual life review.',
        '',
        'Year reflected.',
        '',
        'Wisdom distilled.',
        '',
        'I tell New Year: annual review.'
      ],
      lesson: 'Annual life review reflects year distilling wisdom.'
    },
    {
      id: 'sn80_8',
      title: 'My bucket and birthday reflection',
      narrative: [
        'Annual birthday reflection.',
        '',
        'Personal year.',
        '',
        'Growth examined.',
        '',
        'I tell birthday-reflective: review.'
      ],
      lesson: 'Annual birthday reflection examines personal year growth.'
    },
    {
      id: 'sn80_9',
      title: 'My bucket and relationship review',
      narrative: [
        'Anniversary review yearly.',
        '',
        'Relationship examined.',
        '',
        'Growth tracked.',
        '',
        'I tell partnered: anniversary review.'
      ],
      lesson: 'Annual anniversary review examines relationship tracking growth.'
    },
    {
      id: 'sn80_10',
      title: 'My bucket and career review',
      narrative: [
        'Career review yearly.',
        '',
        'Path examined.',
        '',
        'Direction adjusted.',
        '',
        'I tell career: annual review.'
      ],
      lesson: 'Yearly career review examines path adjusting direction.'
    },
    {
      id: 'sn80_11',
      title: 'My bucket and health review',
      narrative: [
        'Health review yearly.',
        '',
        'Physical and mental.',
        '',
        'Both examined.',
        '',
        'I tell health-aware: annual.'
      ],
      lesson: 'Yearly health review examines both physical and mental health.'
    },
    {
      id: 'sn80_12',
      title: 'My bucket and finance review',
      narrative: [
        'Finance review yearly.',
        '',
        'Budget plus goals.',
        '',
        'Future planned.',
        '',
        'I tell finance: annual.'
      ],
      lesson: 'Yearly finance review with budget plus goals plans future.'
    },
    {
      id: 'sn80_13',
      title: 'My bucket and friendship review',
      narrative: [
        'Friendship review yearly.',
        '',
        'Investment evaluated.',
        '',
        'Energy directed.',
        '',
        'I tell friend-curious: annual review.'
      ],
      lesson: 'Yearly friendship review evaluates investment directing energy.'
    },
    {
      id: 'sn80_14',
      title: 'My bucket and values review',
      narrative: [
        'Values review yearly.',
        '',
        'Alignment checked.',
        '',
        'Living examined.',
        '',
        'I tell values-curious: annual review.'
      ],
      lesson: 'Yearly values review checks alignment examining living.'
    },
    {
      id: 'sn80_15',
      title: 'My bucket and purpose review',
      narrative: [
        'Purpose review yearly.',
        '',
        'Direction clarified.',
        '',
        'Path aligned.',
        '',
        'I tell purpose-curious: annual review.'
      ],
      lesson: 'Yearly purpose review clarifies direction aligning path.'
    }
  ];

  var STRESS_NARRATIVES_81 = [
    {
      id: 'sn81_1',
      title: 'My bucket and morning sun outside',
      narrative: [
        'Morning sun 10 min.',
        '',
        'Outside daily.',
        '',
        'Circadian aligned.',
        '',
        'I tell sleep-stressed: morning sun.'
      ],
      lesson: 'Morning sun 10 min outside daily aligns circadian rhythm.'
    },
    {
      id: 'sn81_2',
      title: 'My bucket and outdoor lunch',
      narrative: [
        'Outdoor lunch daily.',
        '',
        'Midday sun.',
        '',
        'Vitamin D.',
        '',
        'I tell desk-bound: outdoor lunch.'
      ],
      lesson: 'Daily outdoor lunch provides midday sun and vitamin D.'
    },
    {
      id: 'sn81_3',
      title: 'My bucket and afternoon outside',
      narrative: [
        'Afternoon outside time.',
        '',
        'Energy maintained.',
        '',
        'Daylight extended.',
        '',
        'I tell afternoon-slump: outside.'
      ],
      lesson: 'Afternoon outside time maintains energy through extended daylight.'
    },
    {
      id: 'sn81_4',
      title: 'My bucket and evening outside',
      narrative: [
        'Evening porch sit.',
        '',
        'Sunset watched.',
        '',
        'Day transitions.',
        '',
        'I tell evening: porch sit.'
      ],
      lesson: 'Evening porch sit watching sunset transitions day.'
    },
    {
      id: 'sn81_5',
      title: 'My bucket and weekend nature',
      narrative: [
        'Weekend nature outings.',
        '',
        'Trails or parks.',
        '',
        'Deep restoration.',
        '',
        'I tell weekend: nature outings.'
      ],
      lesson: 'Weekend nature outings to trails or parks provide deep restoration.'
    },
    {
      id: 'sn81_6',
      title: 'My bucket and weekly forest visit',
      narrative: [
        'Weekly forest visit.',
        '',
        'Tree presence.',
        '',
        'Forest bathing.',
        '',
        'I tell stressed: weekly forest.'
      ],
      lesson: 'Weekly forest visits with tree presence provide forest bathing.'
    },
    {
      id: 'sn81_7',
      title: 'My bucket and monthly mountain',
      narrative: [
        'Monthly mountain.',
        '',
        'Elevation perspective.',
        '',
        'Wide views.',
        '',
        'I tell mountain-near: monthly.'
      ],
      lesson: 'Monthly mountain visits provide elevation perspective and wide views.'
    },
    {
      id: 'sn81_8',
      title: 'My bucket and monthly ocean',
      narrative: [
        'Monthly ocean visit.',
        '',
        'Wave sounds.',
        '',
        'Vast scale.',
        '',
        'I tell coastal: monthly ocean.'
      ],
      lesson: 'Monthly ocean visits provide wave sounds and vast scale.'
    },
    {
      id: 'sn81_9',
      title: 'My bucket and annual wilderness',
      narrative: [
        'Annual wilderness trip.',
        '',
        'Deep nature.',
        '',
        'No signal.',
        '',
        'I tell tech-tethered: wilderness.'
      ],
      lesson: 'Annual wilderness trips with deep nature and no signal reset.'
    },
    {
      id: 'sn81_10',
      title: 'My bucket and outdoor exercise',
      narrative: [
        'Outdoor exercise.',
        '',
        'Two taps stacked.',
        '',
        'Movement plus nature.',
        '',
        'I tell efficient-tap: outdoor exercise.'
      ],
      lesson: 'Outdoor exercise stacks movement plus nature taps efficiently.'
    },
    {
      id: 'sn81_11',
      title: 'My bucket and outdoor reading',
      narrative: [
        'Park bench reading.',
        '',
        'Book plus air.',
        '',
        'Two taps.',
        '',
        'I tell book-loving: outdoor reading.'
      ],
      lesson: 'Park bench reading provides book plus air as two stacked taps.'
    },
    {
      id: 'sn81_12',
      title: 'My bucket and outdoor cooking',
      narrative: [
        'Outdoor cooking weekly.',
        '',
        'Fire plus air.',
        '',
        'Sensory engagement.',
        '',
        'I tell cooking-curious: outdoor.'
      ],
      lesson: 'Weekly outdoor cooking with fire plus air engages senses.'
    },
    {
      id: 'sn81_13',
      title: 'My bucket and outdoor sleeping',
      narrative: [
        'Outdoor sleeping summer.',
        '',
        'Stars overhead.',
        '',
        'Night sounds.',
        '',
        'I tell adventurous: outdoor sleeping.'
      ],
      lesson: 'Outdoor sleeping in summer with stars overhead provides night sounds.'
    },
    {
      id: 'sn81_14',
      title: 'My bucket and outdoor breakfast',
      narrative: [
        'Breakfast outside daily.',
        '',
        'Morning air.',
        '',
        'Day begins right.',
        '',
        'I tell morning-curious: outdoor breakfast.'
      ],
      lesson: 'Daily outdoor breakfast in morning air begins day right.'
    },
    {
      id: 'sn81_15',
      title: 'My bucket and outdoor work',
      narrative: [
        'Outdoor work session.',
        '',
        'Laptop at park.',
        '',
        'Office of nature.',
        '',
        'I tell remote-worker: outdoor work.'
      ],
      lesson: 'Outdoor work sessions with laptop at park provide office of nature.'
    }
  ];

  var STRESS_NARRATIVES_82 = [
    {
      id: 'sn82_1',
      title: 'My bucket and complete principle integration',
      narrative: [
        'All principles integrated.',
        '',
        'Years of practice.',
        '',
        'Lifelong skill.',
        '',
        'I tell beginners: integration achievable.'
      ],
      lesson: 'All principles integrated through years of practice as lifelong skill.'
    },
    {
      id: 'sn82_2',
      title: 'My bucket and humble continuation',
      narrative: [
        'Practice continues humble.',
        '',
        'Beginners mind.',
        '',
        'Learning ongoing.',
        '',
        'I tell experienced: humble continuation.'
      ],
      lesson: 'Practice continues humbly with beginners mind and ongoing learning.'
    },
    {
      id: 'sn82_3',
      title: 'My bucket and gratitude for journey',
      narrative: [
        'Gratitude for bucket journey.',
        '',
        'Tools available.',
        '',
        'Suffering managed.',
        '',
        'I tell stressed: gratitude for tools.'
      ],
      lesson: 'Gratitude for bucket journey with tools available enables managed suffering.'
    },
    {
      id: 'sn82_4',
      title: 'My bucket and service emerging',
      narrative: [
        'Service emerges.',
        '',
        'Help others.',
        '',
        'Suffering becomes gift.',
        '',
        'I tell experienced: serve.'
      ],
      lesson: 'Service emerges helping others as suffering becomes gift.'
    },
    {
      id: 'sn82_5',
      title: 'My bucket and teaching others',
      narrative: [
        'Teaching others bucket.',
        '',
        'Wisdom shared.',
        '',
        'Family, friends.',
        '',
        'I tell mature: teach.'
      ],
      lesson: 'Teaching others bucket shares wisdom with family and friends.'
    },
    {
      id: 'sn82_6',
      title: 'My bucket and mentoring practitioners',
      narrative: [
        'Mentor newer practitioners.',
        '',
        'Path walked together.',
        '',
        'Both grow.',
        '',
        'I tell experienced: mentor.'
      ],
      lesson: 'Mentoring newer practitioners walks path together as both grow.'
    },
    {
      id: 'sn82_7',
      title: 'My bucket and lifelong commitment',
      narrative: [
        'Lifelong commitment.',
        '',
        'Practice never ends.',
        '',
        'Daily renewal.',
        '',
        'I tell new-learner: lifelong.'
      ],
      lesson: 'Lifelong commitment practice never ends as daily renewal.'
    },
    {
      id: 'sn82_8',
      title: 'My bucket and acceptance complete',
      narrative: [
        'Complete acceptance.',
        '',
        'What is, is.',
        '',
        'Energy preserved.',
        '',
        'I tell fighting: acceptance.'
      ],
      lesson: 'Complete acceptance with what is, is preserves energy.'
    },
    {
      id: 'sn82_9',
      title: 'My bucket and love complete',
      narrative: [
        'Love complete.',
        '',
        'Self and others.',
        '',
        'Anchor of life.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Love complete for self and others as anchor of life.'
    },
    {
      id: 'sn82_10',
      title: 'My bucket and presence complete',
      narrative: [
        'Present moment.',
        '',
        'Always available.',
        '',
        'Return practiced.',
        '',
        'I tell scattered: presence.'
      ],
      lesson: 'Present moment always available through practiced return.'
    },
    {
      id: 'sn82_11',
      title: 'My bucket and connection complete',
      narrative: [
        'Connection essential.',
        '',
        'Community taps.',
        '',
        'Not alone.',
        '',
        'I tell isolated: connection.'
      ],
      lesson: 'Connection essential through community taps; not alone in human experience.'
    },
    {
      id: 'sn82_12',
      title: 'My bucket and body honored',
      narrative: [
        'Body honored.',
        '',
        'Movement, sleep, food.',
        '',
        'Vessel respected.',
        '',
        'I tell body-neglecting: honor.'
      ],
      lesson: 'Body honored through movement, sleep, food as vessel respected.'
    },
    {
      id: 'sn82_13',
      title: 'My bucket and mind cared for',
      narrative: [
        'Mind cared for.',
        '',
        'Learning, rest, beauty.',
        '',
        'Cognitive health.',
        '',
        'I tell mind-neglecting: care.'
      ],
      lesson: 'Mind cared for through learning, rest, beauty as cognitive health.'
    },
    {
      id: 'sn82_14',
      title: 'My bucket and spirit nourished',
      narrative: [
        'Spirit nourished.',
        '',
        'Beauty, meaning, awe.',
        '',
        'Deeper than mind.',
        '',
        'I tell spirit-neglecting: nourish.'
      ],
      lesson: 'Spirit nourished through beauty, meaning, awe deeper than mind.'
    },
    {
      id: 'sn82_15',
      title: 'My bucket and final integration',
      narrative: [
        'Final integration.',
        '',
        'Body, mind, spirit.',
        '',
        'Whole person bucket.',
        '',
        'I tell separated-self: integration.'
      ],
      lesson: 'Final integration of body, mind, spirit as whole person bucket.'
    }
  ];

  var STRESS_NARRATIVES_76 = [
    {
      id: 'sn76_1',
      title: 'My bucket and morning routine evolved',
      narrative: [
        'Morning routine evolved years.',
        '',
        'What works kept.',
        '',
        'Adjustments ongoing.',
        '',
        'I tell evolving: routines adjust.'
      ],
      lesson: 'Morning routines evolve over years; what works kept and adjustments ongoing.'
    },
    {
      id: 'sn76_2',
      title: 'My bucket and routine seasonal',
      narrative: [
        'Routine shifts seasonal.',
        '',
        'Winter inside.',
        '',
        'Summer outside.',
        '',
        'Body aligned.',
        '',
        'I tell seasonal: routine shifts.'
      ],
      lesson: 'Seasonal routine shifts with winter inside and summer outside align body.'
    },
    {
      id: 'sn76_3',
      title: 'My bucket and family routine',
      narrative: [
        'Family routine.',
        '',
        'Shared rhythms.',
        '',
        'Bucket support mutual.',
        '',
        'I tell families: routine together.'
      ],
      lesson: 'Family routine with shared rhythms provides mutual bucket support.'
    },
    {
      id: 'sn76_4',
      title: 'My bucket and morning yoga routine',
      narrative: [
        'Morning yoga 20 min.',
        '',
        'Same sequence.',
        '',
        'Body opens predictably.',
        '',
        'I tell yoga-curious: morning sequence.'
      ],
      lesson: 'Morning yoga 20 min same sequence opens body predictably.'
    },
    {
      id: 'sn76_5',
      title: 'My bucket and morning meditation routine',
      narrative: [
        'Morning meditation 20 min.',
        '',
        'Same cushion, same time.',
        '',
        'Brain trained.',
        '',
        'I tell consistent: same time.'
      ],
      lesson: 'Morning meditation 20 min same cushion same time trains brain.'
    },
    {
      id: 'sn76_6',
      title: 'My bucket and breakfast routine',
      narrative: [
        'Same breakfast.',
        '',
        'Decision removed.',
        '',
        'Bucket lighter.',
        '',
        'I tell choice-heavy: same breakfast.'
      ],
      lesson: 'Same breakfast removes decision making bucket lighter.'
    },
    {
      id: 'sn76_7',
      title: 'My bucket and morning coffee routine',
      narrative: [
        'Same coffee mug.',
        '',
        'Same brew.',
        '',
        'Same time.',
        '',
        'Ritual anchors.',
        '',
        'I tell coffee-loving: ritual.'
      ],
      lesson: 'Same coffee mug, brew, time as ritual anchors morning.'
    },
    {
      id: 'sn76_8',
      title: 'My bucket and lunch routine',
      narrative: [
        'Same lunch types rotated.',
        '',
        '5 options.',
        '',
        'Easy decisions.',
        '',
        'I tell lunch-decision: rotation.'
      ],
      lesson: 'Same lunch types rotated 5 options ease decisions.'
    },
    {
      id: 'sn76_9',
      title: 'My bucket and dinner routine',
      narrative: [
        'Theme dinner days.',
        '',
        'Monday Mexican.',
        '',
        'Tuesday Italian.',
        '',
        'Choices reduced.',
        '',
        'I tell dinner-stressed: themes.'
      ],
      lesson: 'Theme dinner days like Monday Mexican and Tuesday Italian reduce choices.'
    },
    {
      id: 'sn76_10',
      title: 'My bucket and bedtime routine',
      narrative: [
        'Bath, book, bed.',
        '',
        'Same sequence nightly.',
        '',
        'Body predicts sleep.',
        '',
        'I tell sleep-anxious: routine.'
      ],
      lesson: 'Bath, book, bed sequence nightly enables body sleep prediction.'
    },
    {
      id: 'sn76_11',
      title: 'My bucket and exercise routine',
      narrative: [
        'Same exercise routine.',
        '',
        'Same days weekly.',
        '',
        'Body adapts.',
        '',
        'I tell exercise-curious: weekly schedule.'
      ],
      lesson: 'Same exercise routine same days weekly enables body adaptation.'
    },
    {
      id: 'sn76_12',
      title: 'My bucket and reading routine',
      narrative: [
        'Reading time daily.',
        '',
        'Same chair, same time.',
        '',
        'Mind prepares.',
        '',
        'I tell reader: ritual.'
      ],
      lesson: 'Daily reading time same chair same time prepares mind.'
    },
    {
      id: 'sn76_13',
      title: 'My bucket and weekend routine',
      narrative: [
        'Saturday rest day.',
        '',
        'Sunday prep day.',
        '',
        'Predictable weekend.',
        '',
        'I tell weekend-curious: structure.'
      ],
      lesson: 'Saturday rest day and Sunday prep day structure weekend predictably.'
    },
    {
      id: 'sn76_14',
      title: 'My bucket and Sunday routine',
      narrative: [
        'Sunday review and plan.',
        '',
        'Week ahead mapped.',
        '',
        'Bucket prepared.',
        '',
        'I tell weekly-stressed: Sunday routine.'
      ],
      lesson: 'Sunday review and plan maps week ahead preparing bucket.'
    },
    {
      id: 'sn76_15',
      title: 'My bucket and monthly routine',
      narrative: [
        'Monthly review.',
        '',
        'Habits checked.',
        '',
        'Adjustments made.',
        '',
        'I tell habit-curious: monthly review.'
      ],
      lesson: 'Monthly review checks habits and enables adjustments.'
    }
  ];

  var STRESS_NARRATIVES_77 = [
    {
      id: 'sn77_1',
      title: 'My bucket and pet daily presence',
      narrative: [
        'Daily pet presence.',
        '',
        'Love unconditional.',
        '',
        'Body grounded.',
        '',
        'I tell pet-curious: daily.'
      ],
      lesson: 'Daily pet presence with unconditional love grounds body.'
    },
    {
      id: 'sn77_2',
      title: 'My bucket and dog daily walks',
      narrative: [
        'Multiple daily walks.',
        '',
        'Forced routine.',
        '',
        'Body engaged.',
        '',
        'I tell dog-owners: forced movement.'
      ],
      lesson: 'Multiple daily dog walks force routine and engage body.'
    },
    {
      id: 'sn77_3',
      title: 'My bucket and cat lap time',
      narrative: [
        'Cat lap time daily.',
        '',
        'Purring calms.',
        '',
        'Reading shared.',
        '',
        'I tell cat-owners: lap time.'
      ],
      lesson: 'Daily cat lap time with purring calming shares reading.'
    },
    {
      id: 'sn77_4',
      title: 'My bucket and bird watching window',
      narrative: [
        'Window bird feeder.',
        '',
        'Daily watching.',
        '',
        'Wildlife wonder.',
        '',
        'I tell window: bird feeder.'
      ],
      lesson: 'Window bird feeder enables daily wildlife wonder watching.'
    },
    {
      id: 'sn77_5',
      title: 'My bucket and aquarium presence',
      narrative: [
        'Fish tank watching.',
        '',
        'Daily ritual.',
        '',
        'Nervous system softens.',
        '',
        'I tell home-bound: aquarium.'
      ],
      lesson: 'Daily fish tank watching softens nervous system.'
    },
    {
      id: 'sn77_6',
      title: 'My bucket and dog grooming',
      narrative: [
        'Brushing dog daily.',
        '',
        'Bonding ritual.',
        '',
        'Both calmed.',
        '',
        'I tell dog-bonded: brushing.'
      ],
      lesson: 'Daily dog brushing as bonding ritual calms both.'
    },
    {
      id: 'sn77_7',
      title: 'My bucket and cat brushing',
      narrative: [
        'Cat brushing weekly.',
        '',
        'Long-haired needs.',
        '',
        'Quiet shared time.',
        '',
        'I tell cat-bonded: brushing.'
      ],
      lesson: 'Weekly cat brushing shares quiet time meeting long-haired needs.'
    },
    {
      id: 'sn77_8',
      title: 'My bucket and pet training',
      narrative: [
        'Training time daily.',
        '',
        'New tricks taught.',
        '',
        'Mind plus bond.',
        '',
        'I tell pet-curious: training daily.'
      ],
      lesson: 'Daily pet training time teaches new tricks combining mind plus bond.'
    },
    {
      id: 'sn77_9',
      title: 'My bucket and dog park',
      narrative: [
        'Weekly dog park.',
        '',
        'Social for both.',
        '',
        'Community formed.',
        '',
        'I tell dog-owners: dog park.'
      ],
      lesson: 'Weekly dog park provides social for both dog and owner forming community.'
    },
    {
      id: 'sn77_10',
      title: 'My bucket and animal volunteering',
      narrative: [
        'Animal shelter weekly.',
        '',
        'Volunteer service.',
        '',
        'Animals plus purpose.',
        '',
        'I tell purpose-seeking: animal volunteer.'
      ],
      lesson: 'Weekly animal shelter volunteering combines animal time with purpose service.'
    },
    {
      id: 'sn77_11',
      title: 'My bucket and horseback riding',
      narrative: [
        'Weekly horseback riding.',
        '',
        'Body engaged.',
        '',
        'Large animal partnership.',
        '',
        'I tell equine-curious: weekly riding.'
      ],
      lesson: 'Weekly horseback riding engages body in large animal partnership.'
    },
    {
      id: 'sn77_12',
      title: 'My bucket and chicken keeping',
      narrative: [
        'Backyard chickens.',
        '',
        'Daily care.',
        '',
        'Eggs gathered.',
        '',
        'I tell yard-having: chickens.'
      ],
      lesson: 'Backyard chickens with daily care provide gathered eggs and connection.'
    },
    {
      id: 'sn77_13',
      title: 'My bucket and bee keeping',
      narrative: [
        'Beekeeping hobby.',
        '',
        'Hive tending.',
        '',
        'Honey harvested.',
        '',
        'I tell yard-having: bees.'
      ],
      lesson: 'Beekeeping hobby with hive tending provides harvested honey.'
    },
    {
      id: 'sn77_14',
      title: 'My bucket and wildlife garden',
      narrative: [
        'Wildlife-friendly garden.',
        '',
        'Visitors welcomed.',
        '',
        'Backyard ecosystem.',
        '',
        'I tell ecology-curious: wildlife garden.'
      ],
      lesson: 'Wildlife-friendly garden welcomes visitors creating backyard ecosystem.'
    },
    {
      id: 'sn77_15',
      title: 'My bucket and pet loss bucket impact',
      narrative: [
        'Pet death heavy inflow.',
        '',
        'Bucket overflow common.',
        '',
        'Specialty grief support.',
        '',
        'I tell pet-grievers: specialty.'
      ],
      lesson: 'Pet death heavy bucket inflow with overflow common needs specialty grief support.'
    }
  ];

  var STRESS_NARRATIVES_78 = [
    {
      id: 'sn78_1',
      title: 'My bucket and aging body acceptance',
      narrative: [
        'Aging body accepted.',
        '',
        'Capacity smaller.',
        '',
        'Practices adjusted.',
        '',
        'I tell aging: acceptance.'
      ],
      lesson: 'Aging body accepted with smaller capacity adjusts practices.'
    },
    {
      id: 'sn78_2',
      title: 'My bucket and chronic illness adjustment',
      narrative: [
        'Chronic illness inflow.',
        '',
        'Permanent reality.',
        '',
        'More taps needed.',
        '',
        'I tell chronically-ill: more taps.'
      ],
      lesson: 'Chronic illness inflow as permanent reality requires more bucket taps.'
    },
    {
      id: 'sn78_3',
      title: 'My bucket and chronic pain adjustment',
      narrative: [
        'Chronic pain inflow.',
        '',
        'Plus reduced tap access.',
        '',
        'Specialty support.',
        '',
        'I tell chronic-pain: specialty.'
      ],
      lesson: 'Chronic pain inflow with reduced tap access requires specialty support.'
    },
    {
      id: 'sn78_4',
      title: 'My bucket and disability adjustment',
      narrative: [
        'Disability bucket different.',
        '',
        'Accessibility needs.',
        '',
        'Disability community.',
        '',
        'I tell disabled: community.'
      ],
      lesson: 'Disability bucket different requires accessibility and disability community.'
    },
    {
      id: 'sn78_5',
      title: 'My bucket and caregiving capacity',
      narrative: [
        'Caregiver bucket fills.',
        '',
        'Respite essential.',
        '',
        'Caregiver therapy.',
        '',
        'I tell caregivers: respite plus therapy.'
      ],
      lesson: 'Caregiver bucket fills requiring respite plus therapy.'
    },
    {
      id: 'sn78_6',
      title: 'My bucket and grief integration',
      narrative: [
        'Grief eventually integrates.',
        '',
        'Years of work.',
        '',
        'New normal.',
        '',
        'I tell grieving: integration possible.'
      ],
      lesson: 'Grief eventually integrates after years of work into new normal.'
    },
    {
      id: 'sn78_7',
      title: 'My bucket and trauma recovery',
      narrative: [
        'Trauma recovery years.',
        '',
        'Specialty therapy.',
        '',
        'Capacity restored.',
        '',
        'I tell trauma-survivors: specialty years.'
      ],
      lesson: 'Trauma recovery years through specialty therapy restores capacity.'
    },
    {
      id: 'sn78_8',
      title: 'My bucket and PTSD treatment',
      narrative: [
        'PTSD evidence-based.',
        '',
        'Prolonged exposure or EMDR.',
        '',
        'Specialty support.',
        '',
        'I tell PTSD: evidence-based.'
      ],
      lesson: 'PTSD evidence-based treatments like prolonged exposure or EMDR with specialty support.'
    },
    {
      id: 'sn78_9',
      title: 'My bucket and addiction recovery',
      narrative: [
        'Addiction recovery.',
        '',
        'False taps replaced.',
        '',
        'Real taps found.',
        '',
        'I tell recovering: real taps.'
      ],
      lesson: 'Addiction recovery replaces false taps with real taps found.'
    },
    {
      id: 'sn78_10',
      title: 'My bucket and eating disorder recovery',
      narrative: [
        'Eating disorder recovery.',
        '',
        'Specialty team.',
        '',
        'Food relationship.',
        '',
        'I tell ED-recovering: specialty.'
      ],
      lesson: 'Eating disorder recovery through specialty team restores food relationship.'
    },
    {
      id: 'sn78_11',
      title: 'My bucket and depression treatment',
      narrative: [
        'Depression treatment.',
        '',
        'Medication plus therapy.',
        '',
        'Taps reopen.',
        '',
        'I tell depressed: treatment opens taps.'
      ],
      lesson: 'Depression treatment with medication plus therapy reopens taps.'
    },
    {
      id: 'sn78_12',
      title: 'My bucket and bipolar management',
      narrative: [
        'Bipolar management.',
        '',
        'Mood stabilizers.',
        '',
        'Bucket stable.',
        '',
        'I tell bipolar: medication stabilizes.'
      ],
      lesson: 'Bipolar management with mood stabilizers keeps bucket stable.'
    },
    {
      id: 'sn78_13',
      title: 'My bucket and anxiety disorder treatment',
      narrative: [
        'Anxiety disorder treatment.',
        '',
        'CBT plus medication.',
        '',
        'Bucket manageable.',
        '',
        'I tell anxiety-disorder: combined.'
      ],
      lesson: 'Anxiety disorder treatment with CBT plus medication makes bucket manageable.'
    },
    {
      id: 'sn78_14',
      title: 'My bucket and OCD treatment',
      narrative: [
        'OCD treatment.',
        '',
        'ERP specialty.',
        '',
        'Rituals reduced.',
        '',
        'I tell OCD: ERP works.'
      ],
      lesson: 'OCD treatment with ERP specialty reduces ritual bucket inflow.'
    },
    {
      id: 'sn78_15',
      title: 'My bucket and panic disorder management',
      narrative: [
        'Panic disorder management.',
        '',
        'CBT plus exposure.',
        '',
        'Panic reduced.',
        '',
        'I tell panic-prone: CBT exposure.'
      ],
      lesson: 'Panic disorder management with CBT plus exposure reduces panic frequency.'
    }
  ];

  var STRESS_NARRATIVES_79 = [
    {
      id: 'sn79_1',
      title: 'My bucket and community garden weekly',
      narrative: [
        'Community garden weekly.',
        '',
        'Plot tended.',
        '',
        'Neighbors known.',
        '',
        'I tell urban: community garden.'
      ],
      lesson: 'Weekly community garden with plot tended makes neighbors known.'
    },
    {
      id: 'sn79_2',
      title: 'My bucket and farmers market weekly',
      narrative: [
        'Saturday farmers market.',
        '',
        'Local food.',
        '',
        'Community ritual.',
        '',
        'I tell market-curious: weekly.'
      ],
      lesson: 'Saturday farmers market provides local food and community ritual.'
    },
    {
      id: 'sn79_3',
      title: 'My bucket and library visits',
      narrative: [
        'Weekly library visit.',
        '',
        'Free resources.',
        '',
        'Quiet space.',
        '',
        'I tell book-loving: library visits.'
      ],
      lesson: 'Weekly library visits provide free resources and quiet space.'
    },
    {
      id: 'sn79_4',
      title: 'My bucket and museum visits',
      narrative: [
        'Monthly museum visit.',
        '',
        'Beauty plus learning.',
        '',
        'Culture engaged.',
        '',
        'I tell urban: museum visits.'
      ],
      lesson: 'Monthly museum visits provide beauty plus learning engaging culture.'
    },
    {
      id: 'sn79_5',
      title: 'My bucket and concert series',
      narrative: [
        'Concert series subscription.',
        '',
        'Live music regularly.',
        '',
        'Cultural community.',
        '',
        'I tell music-curious: concerts.'
      ],
      lesson: 'Concert series subscription provides regular live music and cultural community.'
    },
    {
      id: 'sn79_6',
      title: 'My bucket and theater subscription',
      narrative: [
        'Theater season tickets.',
        '',
        'Performance immersion.',
        '',
        'Artist appreciation.',
        '',
        'I tell theater-loving: subscription.'
      ],
      lesson: 'Theater season tickets provide performance immersion and artist appreciation.'
    },
    {
      id: 'sn79_7',
      title: 'My bucket and book club monthly',
      narrative: [
        'Monthly book club.',
        '',
        'Reading anchor.',
        '',
        'Discussion community.',
        '',
        'I tell readers: book club.'
      ],
      lesson: 'Monthly book club provides reading anchor and discussion community.'
    },
    {
      id: 'sn79_8',
      title: 'My bucket and film club',
      narrative: [
        'Weekly film club.',
        '',
        'Movies discussed.',
        '',
        'Friends share.',
        '',
        'I tell film-curious: weekly club.'
      ],
      lesson: 'Weekly film clubs share movies through discussion with friends.'
    },
    {
      id: 'sn79_9',
      title: 'My bucket and community classes',
      narrative: [
        'Community college classes.',
        '',
        'Lifelong learning.',
        '',
        'Mind plus community.',
        '',
        'I tell learning-curious: classes.'
      ],
      lesson: 'Community college classes provide lifelong learning combining mind plus community.'
    },
    {
      id: 'sn79_10',
      title: 'My bucket and adult ed classes',
      narrative: [
        'Adult education weekly.',
        '',
        'New skill learned.',
        '',
        'Brain engaged.',
        '',
        'I tell skill-curious: adult ed.'
      ],
      lesson: 'Adult education weekly classes learn new skill engaging brain.'
    },
    {
      id: 'sn79_11',
      title: 'My bucket and senior center activities',
      narrative: [
        'Senior center programs.',
        '',
        'Daily activities.',
        '',
        'Community for elderly.',
        '',
        'I tell elderly: senior center.'
      ],
      lesson: 'Senior center programs provide daily activities community for elderly.'
    },
    {
      id: 'sn79_12',
      title: 'My bucket and volunteer service',
      narrative: [
        'Weekly volunteer service.',
        '',
        'Purpose plus community.',
        '',
        'Self meaning.',
        '',
        'I tell purpose-curious: weekly service.'
      ],
      lesson: 'Weekly volunteer service provides purpose plus community giving self meaning.'
    },
    {
      id: 'sn79_13',
      title: 'My bucket and church community',
      narrative: [
        'Church community weekly.',
        '',
        'Faith plus belonging.',
        '',
        'Multiple supports.',
        '',
        'I tell faithful: church community.'
      ],
      lesson: 'Weekly church community combines faith plus belonging in multiple supports.'
    },
    {
      id: 'sn79_14',
      title: 'My bucket and small group at church',
      narrative: [
        'Small group weekly.',
        '',
        'Deeper community.',
        '',
        'Intimate practice.',
        '',
        'I tell faith-deepening: small group.'
      ],
      lesson: 'Weekly small group at church provides deeper intimate community practice.'
    },
    {
      id: 'sn79_15',
      title: 'My bucket and prayer group',
      narrative: [
        'Prayer group weekly.',
        '',
        'Spiritual support.',
        '',
        'Shared practice.',
        '',
        'I tell faith-prayer: prayer group.'
      ],
      lesson: 'Weekly prayer group provides spiritual support through shared practice.'
    }
  ];

  var STRESS_NARRATIVES_71 = [
    {
      id: 'sn71_1',
      title: 'My bucket and music as tap',
      narrative: [
        'Daily music.',
        '',
        'Mood matched or shifted.',
        '',
        'Body responds.',
        '',
        'I tell music-curious: daily.'
      ],
      lesson: 'Daily music matches or shifts mood with body response.'
    },
    {
      id: 'sn71_2',
      title: 'My bucket and singing tap',
      narrative: [
        'Daily singing.',
        '',
        'Vagal stimulation.',
        '',
        'Body calms.',
        '',
        'I tell shy-voice: singing alone.'
      ],
      lesson: 'Daily singing stimulates vagal nerve calming body.'
    },
    {
      id: 'sn71_3',
      title: 'My bucket and humming tap',
      narrative: [
        'Humming throughout day.',
        '',
        'Vagal stimulation.',
        '',
        'Internal music.',
        '',
        'I tell calm-needing: hum.'
      ],
      lesson: 'Humming throughout day stimulates vagal nerve as internal music.'
    },
    {
      id: 'sn71_4',
      title: 'My bucket and playing instrument',
      narrative: [
        'Weekly instrument practice.',
        '',
        'Body engaged.',
        '',
        'Mind absorbed.',
        '',
        'I tell music-curious: instrument.'
      ],
      lesson: 'Weekly instrument practice engages body and absorbs mind.'
    },
    {
      id: 'sn71_5',
      title: 'My bucket and music classes',
      narrative: [
        'Music classes adults.',
        '',
        'Community plus learning.',
        '',
        'New skill.',
        '',
        'I tell adult-learner: music classes.'
      ],
      lesson: 'Adult music classes provide community plus learning new skill.'
    },
    {
      id: 'sn71_6',
      title: 'My bucket and concert attendance',
      narrative: [
        'Live concerts.',
        '',
        'Music immersion.',
        '',
        'Group experience.',
        '',
        'I tell live-music: concerts.'
      ],
      lesson: 'Live concerts provide music immersion as group experience.'
    },
    {
      id: 'sn71_7',
      title: 'My bucket and dance to music',
      narrative: [
        'Dancing daily.',
        '',
        'Even alone.',
        '',
        'Body free.',
        '',
        'I tell movement-curious: dance.'
      ],
      lesson: 'Daily dancing even alone frees body.'
    },
    {
      id: 'sn71_8',
      title: 'My bucket and music meditation',
      narrative: [
        'Music meditation.',
        '',
        'Just listening.',
        '',
        'No multitasking.',
        '',
        'I tell distracted: music meditation.'
      ],
      lesson: 'Music meditation just listening without multitasking.'
    },
    {
      id: 'sn71_9',
      title: 'My bucket and binaural beats',
      narrative: [
        'Binaural beats headphones.',
        '',
        'Brain entrainment.',
        '',
        'Specific frequencies.',
        '',
        'I tell tech-curious: binaural.'
      ],
      lesson: 'Binaural beats headphones provide brain entrainment at specific frequencies.'
    },
    {
      id: 'sn71_10',
      title: 'My bucket and nature sounds',
      narrative: [
        'Nature sounds played.',
        '',
        'Forest, ocean, rain.',
        '',
        'Brain calms.',
        '',
        'I tell indoor-stressed: nature sounds.'
      ],
      lesson: 'Nature sounds played like forest, ocean, rain calm brain indoors.'
    },
    {
      id: 'sn71_11',
      title: 'My bucket and chanting practice',
      narrative: [
        'Chanting practice.',
        '',
        'Sacred sound.',
        '',
        'Body vibrates.',
        '',
        'I tell vibration-curious: chant.'
      ],
      lesson: 'Chanting practice with sacred sound makes body vibrate.'
    },
    {
      id: 'sn71_12',
      title: 'My bucket and singing bowls',
      narrative: [
        'Singing bowls sound bath.',
        '',
        'Body resonates.',
        '',
        'Cells responding.',
        '',
        'I tell sound-curious: singing bowls.'
      ],
      lesson: 'Singing bowls sound bath makes body resonate with cellular response.'
    },
    {
      id: 'sn71_13',
      title: 'My bucket and gong meditation',
      narrative: [
        'Gong bath meditation.',
        '',
        'Sound waves through body.',
        '',
        'Deep relaxation.',
        '',
        'I tell sound-curious: gong.'
      ],
      lesson: 'Gong bath meditation with sound waves through body produces deep relaxation.'
    },
    {
      id: 'sn71_14',
      title: 'My bucket and music as healing',
      narrative: [
        'Music healing tradition.',
        '',
        'Cultures use sound.',
        '',
        'Ancient practice.',
        '',
        'I tell sound-healing: tradition.'
      ],
      lesson: 'Music healing tradition uses sound across cultures as ancient practice.'
    },
    {
      id: 'sn71_15',
      title: 'My bucket and music therapy',
      narrative: [
        'Music therapy professional.',
        '',
        'Body and emotion.',
        '',
        'Trained therapist.',
        '',
        'I tell music-stuck: music therapy.'
      ],
      lesson: 'Professional music therapy engages body and emotion through trained therapist.'
    }
  ];

  var STRESS_NARRATIVES_72 = [
    {
      id: 'sn72_1',
      title: 'My bucket and art practice daily',
      narrative: [
        'Daily art making.',
        '',
        'No purpose.',
        '',
        'Expression released.',
        '',
        'I tell visual-curious: daily art.'
      ],
      lesson: 'Daily art making without purpose releases expression.'
    },
    {
      id: 'sn72_2',
      title: 'My bucket and visual journaling',
      narrative: [
        'Visual journal practice.',
        '',
        'Colors plus images.',
        '',
        'Non-verbal expression.',
        '',
        'I tell verbal-stuck: visual journal.'
      ],
      lesson: 'Visual journal practice with colors plus images provides non-verbal expression.'
    },
    {
      id: 'sn72_3',
      title: 'My bucket and morning art pages',
      narrative: [
        'Morning art pages.',
        '',
        'Quick visual brain dump.',
        '',
        'Day begun creatively.',
        '',
        'I tell creative-stuck: morning art.'
      ],
      lesson: 'Morning art pages provide quick visual brain dump beginning day creatively.'
    },
    {
      id: 'sn72_4',
      title: 'My bucket and weekly art class',
      narrative: [
        'Weekly art class.',
        '',
        'Skill plus community.',
        '',
        'Practice supported.',
        '',
        'I tell art-curious: weekly class.'
      ],
      lesson: 'Weekly art class provides skill plus community supporting practice.'
    },
    {
      id: 'sn72_5',
      title: 'My bucket and art retreat',
      narrative: [
        'Annual art retreat.',
        '',
        'Days creating.',
        '',
        'Deep practice.',
        '',
        'I tell creative-deep: art retreat.'
      ],
      lesson: 'Annual art retreats with days creating provide deep practice.'
    },
    {
      id: 'sn72_6',
      title: 'My bucket and watercolor practice',
      narrative: [
        'Watercolor weekly.',
        '',
        'Forgiving medium.',
        '',
        'Flow and play.',
        '',
        'I tell perfectionist: watercolor play.'
      ],
      lesson: 'Weekly watercolor practice as forgiving medium enables flow and play.'
    },
    {
      id: 'sn72_7',
      title: 'My bucket and acrylic painting',
      narrative: [
        'Acrylic painting.',
        '',
        'Forgiving and bold.',
        '',
        'Color play.',
        '',
        'I tell color-curious: acrylic.'
      ],
      lesson: 'Acrylic painting forgiving and bold enables color play.'
    },
    {
      id: 'sn72_8',
      title: 'My bucket and oil painting',
      narrative: [
        'Oil painting weekly.',
        '',
        'Slow medium.',
        '',
        'Patience cultivated.',
        '',
        'I tell patient-art: oil painting.'
      ],
      lesson: 'Weekly oil painting slow medium cultivates patience.'
    },
    {
      id: 'sn72_9',
      title: 'My bucket and drawing practice',
      narrative: [
        'Daily drawing.',
        '',
        'Pencil and paper.',
        '',
        'Hand-eye trained.',
        '',
        'I tell drawing-curious: daily.'
      ],
      lesson: 'Daily drawing with pencil and paper trains hand-eye.'
    },
    {
      id: 'sn72_10',
      title: 'My bucket and sketching outdoors',
      narrative: [
        'Outdoor sketching.',
        '',
        'Nature and art.',
        '',
        'Two taps.',
        '',
        'I tell outdoor-art: sketching.'
      ],
      lesson: 'Outdoor sketching combines nature and art as two stacked taps.'
    },
    {
      id: 'sn72_11',
      title: 'My bucket and life drawing',
      narrative: [
        'Life drawing class.',
        '',
        'Human form study.',
        '',
        'Anatomy learned.',
        '',
        'I tell anatomy-curious: life drawing.'
      ],
      lesson: 'Life drawing class human form study teaches anatomy.'
    },
    {
      id: 'sn72_12',
      title: 'My bucket and portrait drawing',
      narrative: [
        'Portrait practice.',
        '',
        'Faces studied.',
        '',
        'Attention training.',
        '',
        'I tell face-curious: portraits.'
      ],
      lesson: 'Portrait practice with faces studied trains attention.'
    },
    {
      id: 'sn72_13',
      title: 'My bucket and landscape painting',
      narrative: [
        'Landscape painting outside.',
        '',
        'Nature observed.',
        '',
        'Color study.',
        '',
        'I tell nature-art: landscapes.'
      ],
      lesson: 'Landscape painting outside observes nature through color study.'
    },
    {
      id: 'sn72_14',
      title: 'My bucket and abstract art',
      narrative: [
        'Abstract expression.',
        '',
        'No subject required.',
        '',
        'Pure emotion.',
        '',
        'I tell emotional-art: abstract.'
      ],
      lesson: 'Abstract art expression without subject required releases pure emotion.'
    },
    {
      id: 'sn72_15',
      title: 'My bucket and mixed media',
      narrative: [
        'Mixed media exploration.',
        '',
        'Many materials.',
        '',
        'Freedom expanded.',
        '',
        'I tell experimental: mixed media.'
      ],
      lesson: 'Mixed media exploration with many materials expands freedom.'
    }
  ];

  var STRESS_NARRATIVES_73 = [
    {
      id: 'sn73_1',
      title: 'My bucket and writing practice daily',
      narrative: [
        'Daily writing practice.',
        '',
        'Even 10 minutes.',
        '',
        'Voice developed.',
        '',
        'I tell writing-curious: daily.'
      ],
      lesson: 'Daily writing practice even 10 minutes develops voice.'
    },
    {
      id: 'sn73_2',
      title: 'My bucket and morning pages',
      narrative: [
        'Three morning pages.',
        '',
        'Stream of consciousness.',
        '',
        'Brain dumped.',
        '',
        'I tell ruminating: morning pages.'
      ],
      lesson: 'Three morning pages stream of consciousness brain dump.'
    },
    {
      id: 'sn73_3',
      title: 'My bucket and poetry writing',
      narrative: [
        'Poetry writing weekly.',
        '',
        'Compressed feeling.',
        '',
        'Form supports.',
        '',
        'I tell poetic: writing.'
      ],
      lesson: 'Weekly poetry writing as compressed feeling supports through form.'
    },
    {
      id: 'sn73_4',
      title: 'My bucket and fiction writing',
      narrative: [
        'Fiction writing.',
        '',
        'Story crafted.',
        '',
        'Other worlds.',
        '',
        'I tell story-curious: fiction.'
      ],
      lesson: 'Fiction writing crafts stories creating other worlds.'
    },
    {
      id: 'sn73_5',
      title: 'My bucket and memoir writing',
      narrative: [
        'Memoir writing.',
        '',
        'Life examined.',
        '',
        'Patterns revealed.',
        '',
        'I tell life-examining: memoir.'
      ],
      lesson: 'Memoir writing examines life revealing patterns.'
    },
    {
      id: 'sn73_6',
      title: 'My bucket and essay writing',
      narrative: [
        'Essay writing.',
        '',
        'Ideas explored.',
        '',
        'Thinking clarified.',
        '',
        'I tell idea-curious: essays.'
      ],
      lesson: 'Essay writing explores ideas clarifying thinking.'
    },
    {
      id: 'sn73_7',
      title: 'My bucket and journal writing',
      narrative: [
        'Daily journal.',
        '',
        'Private reflection.',
        '',
        'Self known.',
        '',
        'I tell self-curious: daily journal.'
      ],
      lesson: 'Daily journal as private reflection knows self.'
    },
    {
      id: 'sn73_8',
      title: 'My bucket and letter writing',
      narrative: [
        'Hand letters monthly.',
        '',
        'Connection deepened.',
        '',
        'Slow communication.',
        '',
        'I tell connection-craving: hand letters.'
      ],
      lesson: 'Monthly hand letters deepen connection through slow communication.'
    },
    {
      id: 'sn73_9',
      title: 'My bucket and writing group',
      narrative: [
        'Weekly writing group.',
        '',
        'Community plus practice.',
        '',
        'Voice supported.',
        '',
        'I tell writer-isolated: group.'
      ],
      lesson: 'Weekly writing group community plus practice supports voice.'
    },
    {
      id: 'sn73_10',
      title: 'My bucket and writing class',
      narrative: [
        'Writing class adults.',
        '',
        'Skill plus community.',
        '',
        'Practice deepened.',
        '',
        'I tell skill-building: writing class.'
      ],
      lesson: 'Adult writing class with skill plus community deepens practice.'
    },
    {
      id: 'sn73_11',
      title: 'My bucket and writing retreat',
      narrative: [
        'Annual writing retreat.',
        '',
        'Days writing.',
        '',
        'Deep practice.',
        '',
        'I tell writer-deep: retreat.'
      ],
      lesson: 'Annual writing retreats with days writing provide deep practice.'
    },
    {
      id: 'sn73_12',
      title: 'My bucket and morning poem',
      narrative: [
        'Daily morning poem.',
        '',
        'Mood captured.',
        '',
        'Voice trained.',
        '',
        'I tell poetry-curious: daily.'
      ],
      lesson: 'Daily morning poem captures mood and trains voice.'
    },
    {
      id: 'sn73_13',
      title: 'My bucket and evening reflection',
      narrative: [
        'Evening reflection writing.',
        '',
        'Day examined.',
        '',
        'Patterns noticed.',
        '',
        'I tell daily-aware: evening reflection.'
      ],
      lesson: 'Evening reflection writing examines day noticing patterns.'
    },
    {
      id: 'sn73_14',
      title: 'My bucket and writing prompts',
      narrative: [
        'Writing prompts daily.',
        '',
        'New starting points.',
        '',
        'Block prevented.',
        '',
        'I tell stuck-writer: prompts.'
      ],
      lesson: 'Daily writing prompts provide new starting points preventing block.'
    },
    {
      id: 'sn73_15',
      title: 'My bucket and writing rituals',
      narrative: [
        'Writing ritual created.',
        '',
        'Same time, same place.',
        '',
        'Practice habituated.',
        '',
        'I tell writer-curious: rituals.'
      ],
      lesson: 'Writing rituals at same time and place habituate practice.'
    }
  ];

  var STRESS_NARRATIVES_74 = [
    {
      id: 'sn74_1',
      title: 'My bucket and meditation cushion daily',
      narrative: [
        'Daily cushion practice.',
        '',
        '20 min minimum.',
        '',
        'Years of practice.',
        '',
        'I tell consistent-curious: daily cushion.'
      ],
      lesson: 'Daily cushion practice 20 min minimum across years builds meditation foundation.'
    },
    {
      id: 'sn74_2',
      title: 'My bucket and breath meditation',
      narrative: [
        'Breath as anchor.',
        '',
        'Always available.',
        '',
        'Return when scattered.',
        '',
        'I tell scattered: breath meditation.'
      ],
      lesson: 'Breath as always-available anchor returns scattered mind.'
    },
    {
      id: 'sn74_3',
      title: 'My bucket and body scan meditation',
      narrative: [
        'Body scan daily.',
        '',
        'Head to feet.',
        '',
        'Without judgment.',
        '',
        'I tell body-disconnected: scan.'
      ],
      lesson: 'Daily body scan head to feet without judgment reconnects body awareness.'
    },
    {
      id: 'sn74_4',
      title: 'My bucket and walking meditation',
      narrative: [
        'Walking meditation.',
        '',
        'Slow foot attention.',
        '',
        'Body and motion.',
        '',
        'I tell sitting-stuck: walking meditation.'
      ],
      lesson: 'Walking meditation with slow foot attention combines body and motion.'
    },
    {
      id: 'sn74_5',
      title: 'My bucket and loving-kindness meditation',
      narrative: [
        'Metta practice.',
        '',
        'Wishing well.',
        '',
        'Heart opens.',
        '',
        'I tell heart-closed: metta.'
      ],
      lesson: 'Metta loving-kindness practice wishing well opens heart.'
    },
    {
      id: 'sn74_6',
      title: 'My bucket and Tonglen meditation',
      narrative: [
        'Tonglen practice.',
        '',
        'Take in suffering.',
        '',
        'Send out love.',
        '',
        'Heart expands.',
        '',
        'I tell heart-closed: Tonglen.'
      ],
      lesson: 'Tonglen takes in suffering and sends out love expanding heart.'
    },
    {
      id: 'sn74_7',
      title: 'My bucket and noting meditation',
      narrative: [
        'Noting practice.',
        '',
        'Thoughts labeled.',
        '',
        'Just thoughts.',
        '',
        'I tell thought-fused: noting.'
      ],
      lesson: 'Noting practice labels thoughts as just thoughts; defusion enabled.'
    },
    {
      id: 'sn74_8',
      title: 'My bucket and choiceless awareness',
      narrative: [
        'Choiceless awareness.',
        '',
        'Whatever arises.',
        '',
        'Open observation.',
        '',
        'I tell advanced-curious: choiceless awareness.'
      ],
      lesson: 'Choiceless awareness welcomes whatever arises in open observation.'
    },
    {
      id: 'sn74_9',
      title: 'My bucket and mantra meditation',
      narrative: [
        'Mantra repetition.',
        '',
        'Sacred sound.',
        '',
        'Mind anchored.',
        '',
        'I tell scattered-mind: mantra.'
      ],
      lesson: 'Mantra repetition with sacred sound anchors mind.'
    },
    {
      id: 'sn74_10',
      title: 'My bucket and visualization meditation',
      narrative: [
        'Visualization practice.',
        '',
        'Inner imagery.',
        '',
        'Mind directed.',
        '',
        'I tell imagery-curious: visualization.'
      ],
      lesson: 'Visualization practice with inner imagery directs mind.'
    },
    {
      id: 'sn74_11',
      title: 'My bucket and prayer meditation',
      narrative: [
        'Prayer as meditation.',
        '',
        'Sacred conversation.',
        '',
        'Heart turned.',
        '',
        'I tell faithful: prayer meditation.'
      ],
      lesson: 'Prayer as meditation provides sacred conversation with heart turned.'
    },
    {
      id: 'sn74_12',
      title: 'My bucket and contemplative meditation',
      narrative: [
        'Contemplative reading.',
        '',
        'Sacred text slow.',
        '',
        'Lectio practice.',
        '',
        'I tell text-loving: contemplative.'
      ],
      lesson: 'Contemplative reading sacred text slow as lectio practice.'
    },
    {
      id: 'sn74_13',
      title: 'My bucket and Zen meditation',
      narrative: [
        'Zen zazen.',
        '',
        'Just sitting.',
        '',
        'Mind opens.',
        '',
        'I tell minimalist: Zen.'
      ],
      lesson: 'Zen zazen just sitting opens mind through minimalist practice.'
    },
    {
      id: 'sn74_14',
      title: 'My bucket and group meditation',
      narrative: [
        'Weekly Sangha sit.',
        '',
        'Group energy.',
        '',
        'Practice supported.',
        '',
        'I tell solo-meditation: group.'
      ],
      lesson: 'Weekly Sangha group meditation supports practice through group energy.'
    },
    {
      id: 'sn74_15',
      title: 'My bucket and silent retreat',
      narrative: [
        'Annual silent retreat.',
        '',
        'Deep practice.',
        '',
        'Year refreshed.',
        '',
        'I tell deep-practice: silent retreat.'
      ],
      lesson: 'Annual silent retreats deepen practice refreshing year.'
    }
  ];

  var STRESS_NARRATIVES_75 = [
    {
      id: 'sn75_1',
      title: 'My bucket model lifelong',
      narrative: [
        'Bucket model lifelong.',
        '',
        'Awareness integrated.',
        '',
        'Daily second nature.',
        '',
        'I tell beginners: integration achievable.'
      ],
      lesson: 'Bucket model lifelong with awareness integrated as daily second nature.'
    },
    {
      id: 'sn75_2',
      title: 'My bucket and final principles',
      narrative: [
        'Bucket model wisdom.',
        '',
        'Honest about limits.',
        '',
        'Structural needs structural.',
        '',
        'I tell new-learner: honest limits.'
      ],
      lesson: 'Bucket model wisdom honest about limits; structural stressors need structural responses.'
    },
    {
      id: 'sn75_3',
      title: 'My bucket and acceptance final',
      narrative: [
        'Acceptance ultimate.',
        '',
        'What is, is.',
        '',
        'Fighting drops.',
        '',
        'I tell fighting-stressed: acceptance.'
      ],
      lesson: 'Acceptance ultimate practice with fighting dropped.'
    },
    {
      id: 'sn75_4',
      title: 'My bucket and gratitude final',
      narrative: [
        'Gratitude lifts.',
        '',
        'Notice good.',
        '',
        'Brain shifts.',
        '',
        'I tell heavy-stressed: gratitude.'
      ],
      lesson: 'Gratitude lifts noticing good shifting brain.'
    },
    {
      id: 'sn75_5',
      title: 'My bucket and community final',
      narrative: [
        'Community essential.',
        '',
        'Not alone.',
        '',
        'Mutual support.',
        '',
        'I tell isolated: community.'
      ],
      lesson: 'Community essential as not alone provides mutual support.'
    },
    {
      id: 'sn75_6',
      title: 'My bucket and service final',
      narrative: [
        'Service shifts perspective.',
        '',
        'Others helped.',
        '',
        'Self meaning.',
        '',
        'I tell self-focused: service.'
      ],
      lesson: 'Service shifts perspective helping others giving self meaning.'
    },
    {
      id: 'sn75_7',
      title: 'My bucket and movement final',
      narrative: [
        'Movement medicine.',
        '',
        'Body needs motion.',
        '',
        'Treatment grade.',
        '',
        'I tell sedentary: movement.'
      ],
      lesson: 'Movement is treatment-grade medicine; body needs motion.'
    },
    {
      id: 'sn75_8',
      title: 'My bucket and sleep final',
      narrative: [
        'Sleep master tap.',
        '',
        'Protect bedtime.',
        '',
        'Bucket regenerates.',
        '',
        'I tell sleep-flexible: protect.'
      ],
      lesson: 'Sleep is master tap; protect bedtime for bucket regeneration.'
    },
    {
      id: 'sn75_9',
      title: 'My bucket and nutrition final',
      narrative: [
        'Nutrition foundation.',
        '',
        'Whole foods.',
        '',
        'Body fueled.',
        '',
        'I tell processed-heavy: whole foods.'
      ],
      lesson: 'Nutrition as foundation with whole foods properly fuels body.'
    },
    {
      id: 'sn75_10',
      title: 'My bucket and boundaries final',
      narrative: [
        'Boundaries protect bucket.',
        '',
        'No is sentence.',
        '',
        'Yes is choice.',
        '',
        'I tell over-giving: boundaries.'
      ],
      lesson: 'Boundaries protect bucket; no is full sentence and yes is choice.'
    },
    {
      id: 'sn75_11',
      title: 'My bucket and self-compassion final',
      narrative: [
        'Self-compassion always.',
        '',
        'Kindness to self.',
        '',
        'Bucket steady.',
        '',
        'I tell self-critical: compassion.'
      ],
      lesson: 'Self-compassion always with kindness to self keeps bucket steady.'
    },
    {
      id: 'sn75_12',
      title: 'My bucket and humor final',
      narrative: [
        'Humor lightens.',
        '',
        'Laughter medicine.',
        '',
        'Bucket buoyant.',
        '',
        'I tell heavy: humor.'
      ],
      lesson: 'Humor lightens with laughter medicine making bucket buoyant.'
    },
    {
      id: 'sn75_13',
      title: 'My bucket and meaning final',
      narrative: [
        'Meaning from suffering.',
        '',
        'Service to others.',
        '',
        'Life mattered.',
        '',
        'I tell purpose-curious: meaning.'
      ],
      lesson: 'Meaning from suffering through service to others ensures life mattered.'
    },
    {
      id: 'sn75_14',
      title: 'My bucket and love final',
      narrative: [
        'Love is anchor.',
        '',
        'Self and others.',
        '',
        'Bucket aligned.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Love is anchor for self and others aligning bucket.'
    },
    {
      id: 'sn75_15',
      title: 'My bucket and final word',
      narrative: [
        'Final word: practice.',
        '',
        'Daily, weekly, yearly.',
        '',
        'Lifelong.',
        '',
        'I tell beginners: practice.'
      ],
      lesson: 'Final word: practice daily, weekly, yearly as lifelong.'
    }
  ];

  var STRESS_FINAL_PRINCIPLES = [
    {
      id: 'sfp_1',
      principle: 'Bucket has capacity; you cannot exceed it without consequences.',
      explanation: 'Honor capacity through inflow management and tap usage; respect overflow signs.'
    },
    {
      id: 'sfp_2',
      principle: 'Structural stressors require structural responses.',
      explanation: 'Personal coping cannot fix toxic workplaces, poverty, systemic injustice; honest truth.'
    },
    {
      id: 'sfp_3',
      principle: 'Tap diversification beats single coping tool.',
      explanation: 'Body, mind, social, spiritual taps stacked; single tap insufficient over time.'
    },
    {
      id: 'sfp_4',
      principle: 'Sleep is master tap; protect it fiercely.',
      explanation: 'No tap replaces sleep; bucket regenerates through nightly rest.'
    },
    {
      id: 'sfp_5',
      principle: 'Movement is treatment-grade medicine not optional lifestyle.',
      explanation: 'Aerobic exercise three to four times weekly is real intervention not nice-to-have.'
    },
    {
      id: 'sfp_6',
      principle: 'Boundaries protect bucket; saying no is full sentence.',
      explanation: 'No without explanation; yes as conscious choice not default.'
    },
    {
      id: 'sfp_7',
      principle: 'Community taps provide what solo cannot.',
      explanation: 'Connection drains stress through shared experience; isolation amplifies.'
    },
    {
      id: 'sfp_8',
      principle: 'Self-compassion when overflow happens; not self-criticism.',
      explanation: 'Overflow is information not failure; kindness enables faster recovery.'
    },
    {
      id: 'sfp_9',
      principle: 'Bucket capacity varies; some days less than others.',
      explanation: 'Hormones, sleep, illness affect capacity; adjust inflow accordingly day by day.'
    },
    {
      id: 'sfp_10',
      principle: 'Years of practice build pattern recognition.',
      explanation: 'Triggers identified, overflow predicted, intervention earlier through tracking.'
    },
    {
      id: 'sfp_11',
      principle: 'Bucket model is lifelong practice not destination.',
      explanation: 'Daily renewal through tools; practice never complete but continually refined.'
    },
    {
      id: 'sfp_12',
      principle: 'Crisis backup plan written before crisis.',
      explanation: 'Safety plan, emergency contacts, crisis tools pre-decided enable response.'
    },
    {
      id: 'sfp_13',
      principle: 'Acceptance shortens stress waves; fighting prolongs them.',
      explanation: 'What is, is; acceptance preserves energy for action where possible.'
    },
    {
      id: 'sfp_14',
      principle: 'Service to others shifts self-focus and lightens bucket.',
      explanation: 'Helping others shifts perspective; meaning emerges through service.'
    },
    {
      id: 'sfp_15',
      principle: 'Bucket teaching across generations builds family system.',
      explanation: 'Common vocabulary, shared awareness; children inherit lifelong skill.'
    },
    {
      id: 'sfp_16',
      principle: 'Workplace bucket awareness creates healthier culture.',
      explanation: 'Manager check-ins, meeting consideration, boundaries shared; team supported.'
    },
    {
      id: 'sfp_17',
      principle: 'Honor your specific bucket; do not compare.',
      explanation: 'Each capacity unique; comparison adds inflow without changing reality.'
    },
    {
      id: 'sfp_18',
      principle: 'Bucket overflow happens; recovery is the question.',
      explanation: 'Even with practice, overflow occurs; how quickly we return matters most.'
    },
    {
      id: 'sfp_19',
      principle: 'Therapy provides reliable weekly major tap.',
      explanation: 'Drainage deeper than daily tools reach; investment in self over years.'
    },
    {
      id: 'sfp_20',
      principle: 'Gratitude practice measurably shifts brain over weeks.',
      explanation: 'Specific daily gratitudes train positive awareness; bucket lightens.'
    }
  ];

  var STRESS_NARRATIVES_66 = [
    {
      id: 'sn66_1',
      title: 'My bucket and partner communication',
      narrative: [
        'Bucket vocabulary shared.',
        '',
        'Common language.',
        '',
        'Mutual understanding.',
        '',
        'I tell partnered: vocabulary.'
      ],
      lesson: 'Partner bucket vocabulary shared as common language enables mutual understanding.'
    },
    {
      id: 'sn66_2',
      title: 'My bucket and morning partner check',
      narrative: [
        'Morning partner check.',
        '',
        'Bucket level shared.',
        '',
        'Day planned together.',
        '',
        'I tell partnered: morning check.'
      ],
      lesson: 'Morning partner check shares bucket levels for joint day planning.'
    },
    {
      id: 'sn66_3',
      title: 'My bucket and evening partner check',
      narrative: [
        'Evening partner check.',
        '',
        'Day reviewed.',
        '',
        'Support exchanged.',
        '',
        'I tell partnered: evening check.'
      ],
      lesson: 'Evening partner check reviews day and exchanges support.'
    },
    {
      id: 'sn66_4',
      title: 'My bucket and weekly partner meeting',
      narrative: [
        'Weekly partner meeting.',
        '',
        'Bigger picture.',
        '',
        'Both buckets reviewed.',
        '',
        'I tell partnered: weekly.'
      ],
      lesson: 'Weekly partner meetings provide bigger picture review of both buckets.'
    },
    {
      id: 'sn66_5',
      title: 'My bucket and partner gratitude',
      narrative: [
        'Daily partner gratitude.',
        '',
        'Specific appreciation.',
        '',
        'Bond strengthens.',
        '',
        'I tell partnered: gratitude.'
      ],
      lesson: 'Daily partner gratitude with specific appreciation strengthens bond.'
    },
    {
      id: 'sn66_6',
      title: 'My bucket and partner appreciation',
      narrative: [
        'Weekly written appreciation.',
        '',
        'Love letter.',
        '',
        'Partner felt valued.',
        '',
        'I tell partnered: written appreciation.'
      ],
      lesson: 'Weekly written partner appreciation as love letter values partner.'
    },
    {
      id: 'sn66_7',
      title: 'My bucket and partner date night',
      narrative: [
        'Weekly date night.',
        '',
        'Just us time.',
        '',
        'Connection maintained.',
        '',
        'I tell partnered: weekly date.'
      ],
      lesson: 'Weekly date night just us time maintains connection.'
    },
    {
      id: 'sn66_8',
      title: 'My bucket and partner walk',
      narrative: [
        'Daily walk together.',
        '',
        'Conversation flows.',
        '',
        'Movement together.',
        '',
        'I tell partnered: daily walk.'
      ],
      lesson: 'Daily walks together provide conversation flow and movement together.'
    },
    {
      id: 'sn66_9',
      title: 'My bucket and partner meals',
      narrative: [
        'Meals together regularly.',
        '',
        'Phones away.',
        '',
        'Attention shared.',
        '',
        'I tell partnered: phones away meals.'
      ],
      lesson: 'Regular partner meals phones away share attention.'
    },
    {
      id: 'sn66_10',
      title: 'My bucket and partner support requests',
      narrative: [
        'Asking for what I need.',
        '',
        'Specific requests.',
        '',
        'Partner understands.',
        '',
        'I tell partnered: ask specifically.'
      ],
      lesson: 'Asking partner for specific needs enables understanding.'
    },
    {
      id: 'sn66_11',
      title: 'My bucket and partner conflict resolution',
      narrative: [
        'Repair after conflict.',
        '',
        'Same evening.',
        '',
        'Bucket rebalanced.',
        '',
        'I tell conflict-stressed: same-evening repair.'
      ],
      lesson: 'Same-evening repair after conflict rebalances bucket for partnered couples.'
    },
    {
      id: 'sn66_12',
      title: 'My bucket and partner appreciation list',
      narrative: [
        'Daily three things appreciated.',
        '',
        'About partner.',
        '',
        'Lens shifts.',
        '',
        'I tell critical-partner: appreciation list.'
      ],
      lesson: 'Daily three things appreciated about partner shifts lens from critical.'
    },
    {
      id: 'sn66_13',
      title: 'My bucket and partner physical affection',
      narrative: [
        'Daily affection practice.',
        '',
        'Touch beyond sex.',
        '',
        'Oxytocin maintained.',
        '',
        'I tell touch-disconnected: daily affection.'
      ],
      lesson: 'Daily affection practice touch beyond sex maintains oxytocin bond.'
    },
    {
      id: 'sn66_14',
      title: 'My bucket and partner intimacy',
      narrative: [
        'Weekly intimacy.',
        '',
        'Connection deepens.',
        '',
        'Bucket drains.',
        '',
        'I tell intimacy-distant: weekly practice.'
      ],
      lesson: 'Weekly intimacy practice deepens connection draining bucket.'
    },
    {
      id: 'sn66_15',
      title: 'My bucket and partner annual review',
      narrative: [
        'Annual relationship review.',
        '',
        'Where we are.',
        '',
        'Where we are going.',
        '',
        'I tell partnered: annual review.'
      ],
      lesson: 'Annual relationship review examines where we are and going as couple.'
    }
  ];

  var STRESS_NARRATIVES_67 = [
    {
      id: 'sn67_1',
      title: 'My bucket and child bucket teaching',
      narrative: [
        'Children taught bucket model.',
        '',
        'Common vocabulary.',
        '',
        'Generational skill.',
        '',
        'I tell parents: teach children.'
      ],
      lesson: 'Children taught bucket model creates common family vocabulary as generational skill.'
    },
    {
      id: 'sn67_2',
      title: 'My bucket and child morning check',
      narrative: [
        'Morning child check-in.',
        '',
        'How is your bucket?',
        '',
        'Day plan adjusted.',
        '',
        'I tell parents: morning child check.'
      ],
      lesson: 'Morning child check-in with how is your bucket adjusts day plan.'
    },
    {
      id: 'sn67_3',
      title: 'My bucket and child evening check',
      narrative: [
        'Evening child check-in.',
        '',
        'Day reviewed.',
        '',
        'Tomorrow planned.',
        '',
        'I tell parents: evening child.'
      ],
      lesson: 'Evening child check-in reviews day and plans tomorrow.'
    },
    {
      id: 'sn67_4',
      title: 'My bucket and child gratitude',
      narrative: [
        'Bedtime three gratitudes.',
        '',
        'Child gratitude practice.',
        '',
        'Brain trained early.',
        '',
        'I tell parents: bedtime gratitude.'
      ],
      lesson: 'Bedtime three gratitudes child practice trains brain early.'
    },
    {
      id: 'sn67_5',
      title: 'My bucket and child emotion naming',
      narrative: [
        'Emotion vocabulary taught.',
        '',
        'Feelings named.',
        '',
        'Self-awareness built.',
        '',
        'I tell parents: emotion words.'
      ],
      lesson: 'Emotion vocabulary taught to children with feelings named builds self-awareness.'
    },
    {
      id: 'sn67_6',
      title: 'My bucket and child breathing',
      narrative: [
        'Belly breathing taught.',
        '',
        'When child upset.',
        '',
        'Tool given.',
        '',
        'I tell parents: teach belly breath.'
      ],
      lesson: 'Belly breathing taught when child upset gives lifelong tool.'
    },
    {
      id: 'sn67_7',
      title: 'My bucket and child grounding',
      narrative: [
        '5-4-3-2-1 grounding.',
        '',
        'Child uses when overwhelmed.',
        '',
        'Senses anchor.',
        '',
        'I tell parents: teach 5-4-3-2-1.'
      ],
      lesson: '5-4-3-2-1 grounding taught to children anchors through senses when overwhelmed.'
    },
    {
      id: 'sn67_8',
      title: 'My bucket and child movement break',
      narrative: [
        'Movement when stuck.',
        '',
        'Dance, jump, run.',
        '',
        'Body resets.',
        '',
        'I tell parents: movement breaks.'
      ],
      lesson: 'Movement breaks when child stuck through dance, jump, run reset body.'
    },
    {
      id: 'sn67_9',
      title: 'My bucket and child quiet time',
      narrative: [
        'Daily quiet time.',
        '',
        'Solo play.',
        '',
        'Bucket recovery.',
        '',
        'I tell parents: daily quiet.'
      ],
      lesson: 'Daily quiet time with solo play provides child bucket recovery.'
    },
    {
      id: 'sn67_10',
      title: 'My bucket and child outside time',
      narrative: [
        'Daily outside time.',
        '',
        'Nature contact.',
        '',
        'Body and bucket both.',
        '',
        'I tell parents: outside daily.'
      ],
      lesson: 'Daily outside time provides nature contact for body and bucket.'
    },
    {
      id: 'sn67_11',
      title: 'My bucket and child screen limits',
      narrative: [
        'Screen time limits.',
        '',
        'Bucket protected.',
        '',
        'Other activities make space.',
        '',
        'I tell parents: screen limits.'
      ],
      lesson: 'Child screen time limits protect bucket and make space for other activities.'
    },
    {
      id: 'sn67_12',
      title: 'My bucket and child sleep schedule',
      narrative: [
        'Sleep schedule protected.',
        '',
        'Bedtime non-negotiable.',
        '',
        'Bucket regenerates.',
        '',
        'I tell parents: protect bedtime.'
      ],
      lesson: 'Child sleep schedule protected with non-negotiable bedtime regenerates bucket.'
    },
    {
      id: 'sn67_13',
      title: 'My bucket and child play time',
      narrative: [
        'Daily free play.',
        '',
        'Unstructured time.',
        '',
        'Creativity flows.',
        '',
        'I tell parents: free play daily.'
      ],
      lesson: 'Daily free play unstructured time enables creative flow.'
    },
    {
      id: 'sn67_14',
      title: 'My bucket and child art time',
      narrative: [
        'Daily art available.',
        '',
        'Crayons, paper.',
        '',
        'Expression released.',
        '',
        'I tell parents: art available.'
      ],
      lesson: 'Daily art available with crayons and paper releases child expression.'
    },
    {
      id: 'sn67_15',
      title: 'My bucket and child reading time',
      narrative: [
        'Daily reading time.',
        '',
        'Story shared.',
        '',
        'Imagination grows.',
        '',
        'I tell parents: reading daily.'
      ],
      lesson: 'Daily reading time with shared stories grows imagination.'
    }
  ];

  var STRESS_NARRATIVES_68 = [
    {
      id: 'sn68_1',
      title: 'My bucket and workplace bucket awareness',
      narrative: [
        'Team bucket awareness.',
        '',
        'Manager checks in.',
        '',
        'Workload adjusted.',
        '',
        'I tell managers: team bucket.'
      ],
      lesson: 'Team bucket awareness with manager check-ins adjusts workload.'
    },
    {
      id: 'sn68_2',
      title: 'My bucket and meeting bucket consideration',
      narrative: [
        'Meetings consider bucket.',
        '',
        'Length appropriate.',
        '',
        'Breaks built in.',
        '',
        'I tell meeting-runners: consider bucket.'
      ],
      lesson: 'Meetings considering bucket with appropriate length and breaks built in.'
    },
    {
      id: 'sn68_3',
      title: 'My bucket and email bucket etiquette',
      narrative: [
        'Email bucket etiquette.',
        '',
        'No after-hours sends.',
        '',
        'Weekend off.',
        '',
        'I tell email-senders: etiquette.'
      ],
      lesson: 'Email bucket etiquette with no after-hours sends and weekend off.'
    },
    {
      id: 'sn68_4',
      title: 'My bucket and workplace breaks',
      narrative: [
        'Real breaks taken.',
        '',
        'Not desk eating.',
        '',
        'Bucket recovers.',
        '',
        'I tell workplace: real breaks.'
      ],
      lesson: 'Real workplace breaks not desk eating allow bucket recovery.'
    },
    {
      id: 'sn68_5',
      title: 'My bucket and PTO usage',
      narrative: [
        'PTO actually used.',
        '',
        'Vacation taken.',
        '',
        'Bucket drains.',
        '',
        'I tell PTO-banking: use it.'
      ],
      lesson: 'PTO actually used and vacation taken drains bucket.'
    },
    {
      id: 'sn68_6',
      title: 'My bucket and sick day permission',
      narrative: [
        'Sick days when sick.',
        '',
        'No martyrdom.',
        '',
        'Body honored.',
        '',
        'I tell pushing-through: sick days.'
      ],
      lesson: 'Sick days when sick without martyrdom honor body.'
    },
    {
      id: 'sn68_7',
      title: 'My bucket and mental health days',
      narrative: [
        'Mental health days permitted.',
        '',
        'Bucket overflow.',
        '',
        'Day off.',
        '',
        'I tell overflowing: mental health day.'
      ],
      lesson: 'Mental health days permitted for bucket overflow as legitimate day off.'
    },
    {
      id: 'sn68_8',
      title: 'My bucket and remote work flexibility',
      narrative: [
        'Remote work option.',
        '',
        'Commute saved.',
        '',
        'Bucket lighter.',
        '',
        'I tell commute-heavy: remote work.'
      ],
      lesson: 'Remote work flexibility saves commute making bucket lighter.'
    },
    {
      id: 'sn68_9',
      title: 'My bucket and hybrid work',
      narrative: [
        'Hybrid schedule.',
        '',
        'Best of both.',
        '',
        'Bucket optimized.',
        '',
        'I tell hybrid-curious: optimal.'
      ],
      lesson: 'Hybrid work schedule provides best of both worlds optimizing bucket.'
    },
    {
      id: 'sn68_10',
      title: 'My bucket and flexible hours',
      narrative: [
        'Flexible start time.',
        '',
        'Match my rhythm.',
        '',
        'Productive hours used.',
        '',
        'I tell schedule-curious: flexibility.'
      ],
      lesson: 'Flexible start times match personal rhythm using productive hours.'
    },
    {
      id: 'sn68_11',
      title: 'My bucket and 4-day work week',
      narrative: [
        '4-day work week trial.',
        '',
        'Bucket drained weekly.',
        '',
        'Productivity maintained.',
        '',
        'I tell future-work: 4 days.'
      ],
      lesson: '4-day work week trial drains bucket weekly maintaining productivity.'
    },
    {
      id: 'sn68_12',
      title: 'My bucket and sabbatical leave',
      narrative: [
        'Sabbatical taken.',
        '',
        'Months off.',
        '',
        'Deep bucket drain.',
        '',
        'I tell mid-career: sabbatical.'
      ],
      lesson: 'Sabbatical leave with months off provides deep bucket drain.'
    },
    {
      id: 'sn68_13',
      title: 'My bucket and parental leave',
      narrative: [
        'Parental leave taken.',
        '',
        'Babies and bonding.',
        '',
        'Society supports.',
        '',
        'I tell new-parents: take leave.'
      ],
      lesson: 'Parental leave taken for babies and bonding when society supports.'
    },
    {
      id: 'sn68_14',
      title: 'My bucket and bereavement leave',
      narrative: [
        'Bereavement leave used.',
        '',
        'Grief honored.',
        '',
        'Time given.',
        '',
        'I tell grieving: take leave.'
      ],
      lesson: 'Bereavement leave used honors grief with time given.'
    },
    {
      id: 'sn68_15',
      title: 'My bucket and unpaid leave',
      narrative: [
        'Unpaid leave when needed.',
        '',
        'Job protected.',
        '',
        'Bucket emergency.',
        '',
        'I tell crisis-stressed: unpaid option.'
      ],
      lesson: 'Unpaid leave when needed protects job during bucket emergency.'
    }
  ];

  var STRESS_NARRATIVES_69 = [
    {
      id: 'sn69_1',
      title: 'My bucket and life-long practice integration',
      narrative: [
        'Decades of practice.',
        '',
        'All integrated.',
        '',
        'Daily second nature.',
        '',
        'I tell beginners: integration possible.'
      ],
      lesson: 'Decades of bucket practice all integrated into daily second nature.'
    },
    {
      id: 'sn69_2',
      title: 'My bucket and aging body adjustment',
      narrative: [
        'Aging changes capacity.',
        '',
        'Practices adjust.',
        '',
        'Patience cultivated.',
        '',
        'I tell aging: adjustment.'
      ],
      lesson: 'Aging body adjustment adjusts practices and cultivates patience.'
    },
    {
      id: 'sn69_3',
      title: 'My bucket and elderly community',
      narrative: [
        'Senior community involvement.',
        '',
        'Mutual support.',
        '',
        'Wisdom shared.',
        '',
        'I tell elderly: community.'
      ],
      lesson: 'Senior community involvement provides mutual support and shared wisdom.'
    },
    {
      id: 'sn69_4',
      title: 'My bucket and grandparent practice',
      narrative: [
        'Grandparent role.',
        '',
        'Bucket teaching.',
        '',
        'Generational wisdom.',
        '',
        'I tell grandparents: teach.'
      ],
      lesson: 'Grandparent role enables bucket teaching as generational wisdom.'
    },
    {
      id: 'sn69_5',
      title: 'My bucket and elder mentor practice',
      narrative: [
        'Elder mentor practice.',
        '',
        'Wisdom shared.',
        '',
        'Younger benefit.',
        '',
        'I tell elders: mentor.'
      ],
      lesson: 'Elder mentor practice shares wisdom benefiting younger generations.'
    },
    {
      id: 'sn69_6',
      title: 'My bucket and retirement bucket',
      narrative: [
        'Retirement bucket reshapes.',
        '',
        'Identity transitions.',
        '',
        'New rhythm.',
        '',
        'I tell retiring: bucket reshapes.'
      ],
      lesson: 'Retirement bucket reshapes through identity transitions and new rhythm.'
    },
    {
      id: 'sn69_7',
      title: 'My bucket and health decline acceptance',
      narrative: [
        'Health decline accepted.',
        '',
        'Capacity smaller.',
        '',
        'Practices adjusted.',
        '',
        'I tell aging-stressed: acceptance.'
      ],
      lesson: 'Health decline accepted with smaller capacity adjusts practices.'
    },
    {
      id: 'sn69_8',
      title: 'My bucket and mortality awareness',
      narrative: [
        'Mortality awareness.',
        '',
        'Death contemplated.',
        '',
        'Life lived more.',
        '',
        'I tell death-avoiding: awareness lives more.'
      ],
      lesson: 'Mortality awareness with death contemplated paradoxically allows living more.'
    },
    {
      id: 'sn69_9',
      title: 'My bucket and legacy planning',
      narrative: [
        'Legacy planning.',
        '',
        'What I leave.',
        '',
        'Bucket frame.',
        '',
        'I tell mid-life: legacy planning.'
      ],
      lesson: 'Legacy planning examines what we leave through bucket frame.'
    },
    {
      id: 'sn69_10',
      title: 'My bucket and life review',
      narrative: [
        'Life review practice.',
        '',
        'Patterns over decades.',
        '',
        'Wisdom distilled.',
        '',
        'I tell elderly: life review.'
      ],
      lesson: 'Life review practice examines patterns over decades distilling wisdom.'
    },
    {
      id: 'sn69_11',
      title: 'My bucket and forgiveness practice',
      narrative: [
        'Forgiveness practice.',
        '',
        'Self and others.',
        '',
        'Bucket lightens.',
        '',
        'I tell holding-grudges: forgiveness.'
      ],
      lesson: 'Forgiveness practice for self and others lightens bucket.'
    },
    {
      id: 'sn69_12',
      title: 'My bucket and amends practice',
      narrative: [
        'Making amends.',
        '',
        'Past harms addressed.',
        '',
        'Bucket cleared.',
        '',
        'I tell past-burdened: amends.'
      ],
      lesson: 'Making amends for past harms addressed clears bucket.'
    },
    {
      id: 'sn69_13',
      title: 'My bucket and reconciliation practice',
      narrative: [
        'Estranged reconciliation.',
        '',
        'Where possible.',
        '',
        'Bucket healing.',
        '',
        'I tell estranged: reconciliation try.'
      ],
      lesson: 'Estranged reconciliation where possible provides bucket healing.'
    },
    {
      id: 'sn69_14',
      title: 'My bucket and acceptance of past',
      narrative: [
        'Past accepted.',
        '',
        'What was is.',
        '',
        'Energy preserved.',
        '',
        'I tell past-stuck: acceptance.'
      ],
      lesson: 'Past acceptance with what was is preserves energy.'
    },
    {
      id: 'sn69_15',
      title: 'My bucket and meaning making',
      narrative: [
        'Meaning made from life.',
        '',
        'Suffering integrated.',
        '',
        'Wisdom emerges.',
        '',
        'I tell suffering-stressed: meaning making.'
      ],
      lesson: 'Meaning making from life with suffering integrated allows wisdom emergence.'
    }
  ];

  var STRESS_NARRATIVES_70 = [
    {
      id: 'sn70_1',
      title: 'My bucket final principles integrated',
      narrative: [
        'All principles integrated.',
        '',
        'Daily lived.',
        '',
        'Bucket wisdom.',
        '',
        'I tell beginners: integration possible.'
      ],
      lesson: 'All bucket principles integrated and daily lived as wisdom.'
    },
    {
      id: 'sn70_2',
      title: 'My bucket and acceptance final',
      narrative: [
        'Acceptance ultimate practice.',
        '',
        'What is, is.',
        '',
        'Fighting drops.',
        '',
        'I tell resisting: acceptance.'
      ],
      lesson: 'Acceptance ultimate practice drops fighting with what is.'
    },
    {
      id: 'sn70_3',
      title: 'My bucket and presence final',
      narrative: [
        'Present moment practice.',
        '',
        'Past and future released.',
        '',
        'Now available.',
        '',
        'I tell time-traveling: presence.'
      ],
      lesson: 'Present moment practice releases past and future for now available.'
    },
    {
      id: 'sn70_4',
      title: 'My bucket and gratitude final',
      narrative: [
        'Gratitude practice ultimate.',
        '',
        'Notice what is good.',
        '',
        'Bucket lightens.',
        '',
        'I tell heavy: gratitude practice.'
      ],
      lesson: 'Gratitude practice ultimate noticing what is good lightens bucket.'
    },
    {
      id: 'sn70_5',
      title: 'My bucket and self-compassion final',
      narrative: [
        'Self-compassion always.',
        '',
        'Kindness to self.',
        '',
        'Bucket steady.',
        '',
        'I tell self-critical: compassion always.'
      ],
      lesson: 'Self-compassion always with kindness to self keeps bucket steady.'
    },
    {
      id: 'sn70_6',
      title: 'My bucket and love final',
      narrative: [
        'Love is anchor.',
        '',
        'Self and others.',
        '',
        'Bucket aligned.',
        '',
        'I tell love-curious: anchor.'
      ],
      lesson: 'Love as anchor for self and others aligns bucket.'
    },
    {
      id: 'sn70_7',
      title: 'My bucket and service final',
      narrative: [
        'Service ultimate purpose.',
        '',
        'Others helped.',
        '',
        'Self meaning.',
        '',
        'I tell purpose-seeking: service.'
      ],
      lesson: 'Service ultimate purpose helps others giving self meaning.'
    },
    {
      id: 'sn70_8',
      title: 'My bucket and presence to others',
      narrative: [
        'Presence to others.',
        '',
        'Listen deeply.',
        '',
        'Gift offered.',
        '',
        'I tell distracted: presence gift.'
      ],
      lesson: 'Presence to others through deep listening offers gift.'
    },
    {
      id: 'sn70_9',
      title: 'My bucket and trust final',
      narrative: [
        'Trust in process.',
        '',
        'Life unfolds.',
        '',
        'Control released.',
        '',
        'I tell controlling: trust.'
      ],
      lesson: 'Trust in process as life unfolds releases control.'
    },
    {
      id: 'sn70_10',
      title: 'My bucket and humility final',
      narrative: [
        'Humility maintained.',
        '',
        'Beginners mind.',
        '',
        'Learning continues.',
        '',
        'I tell mature: humility.'
      ],
      lesson: 'Humility maintained with beginners mind continues learning.'
    },
    {
      id: 'sn70_11',
      title: 'My bucket and curiosity final',
      narrative: [
        'Curiosity ongoing.',
        '',
        'Wonder cultivated.',
        '',
        'Life rich.',
        '',
        'I tell stagnant: curiosity.'
      ],
      lesson: 'Curiosity ongoing with wonder cultivated keeps life rich.'
    },
    {
      id: 'sn70_12',
      title: 'My bucket and integrity final',
      narrative: [
        'Integrity practice.',
        '',
        'Values lived.',
        '',
        'Bucket aligned.',
        '',
        'I tell value-confused: integrity.'
      ],
      lesson: 'Integrity practice with values lived aligns bucket.'
    },
    {
      id: 'sn70_13',
      title: 'My bucket and authenticity final',
      narrative: [
        'Authentic living.',
        '',
        'True self expressed.',
        '',
        'Bucket aligned.',
        '',
        'I tell false-self: authenticity.'
      ],
      lesson: 'Authentic living with true self expressed aligns bucket.'
    },
    {
      id: 'sn70_14',
      title: 'My bucket and meaning final',
      narrative: [
        'Meaning made from suffering.',
        '',
        'Service to others.',
        '',
        'Life mattered.',
        '',
        'I tell suffering: meaning emerges.'
      ],
      lesson: 'Meaning made from suffering through service to others ensures life mattered.'
    },
    {
      id: 'sn70_15',
      title: 'My bucket and final word',
      narrative: [
        'Final word: love.',
        '',
        'Self, others, world.',
        '',
        'All connected.',
        '',
        'I tell all-grievers: love.'
      ],
      lesson: 'Final word: love self, others, world as all connected.'
    }
  ];

  var STRESS_NARRATIVES_61 = [
    {
      id: 'sn61_1',
      title: 'My bucket and morning intention',
      narrative: [
        'Single word intention.',
        '',
        'Day theme set.',
        '',
        'Bucket aligned.',
        '',
        'I tell scattered: intention.'
      ],
      lesson: 'Single word morning intention sets day theme aligning bucket.'
    },
    {
      id: 'sn61_2',
      title: 'My bucket and evening review',
      narrative: [
        'Evening day review.',
        '',
        'What went well.',
        '',
        'Bucket accounted.',
        '',
        'I tell reflective: evening review.'
      ],
      lesson: 'Evening day review noting what went well accounts bucket through reflection.'
    },
    {
      id: 'sn61_3',
      title: 'My bucket and weekly intention',
      narrative: [
        'Sunday weekly theme.',
        '',
        'Week direction set.',
        '',
        'Bucket aligned.',
        '',
        'I tell weekly-curious: theme.'
      ],
      lesson: 'Sunday weekly theme sets week direction aligning bucket.'
    },
    {
      id: 'sn61_4',
      title: 'My bucket and monthly intention',
      narrative: [
        'Monthly intention.',
        '',
        'Month direction.',
        '',
        'Bigger picture.',
        '',
        'I tell monthly-curious: intention.'
      ],
      lesson: 'Monthly intention sets month direction for bigger picture awareness.'
    },
    {
      id: 'sn61_5',
      title: 'My bucket and quarterly review',
      narrative: [
        'Quarterly review.',
        '',
        'Major life areas.',
        '',
        'Adjustments made.',
        '',
        'I tell systematic: quarterly.'
      ],
      lesson: 'Quarterly reviews examine major life areas enabling adjustments.'
    },
    {
      id: 'sn61_6',
      title: 'My bucket and annual review',
      narrative: [
        'Annual review.',
        '',
        'Year reflected.',
        '',
        'Direction set.',
        '',
        'I tell New Year: annual.'
      ],
      lesson: 'Annual reviews reflect year and set direction for coming year.'
    },
    {
      id: 'sn61_7',
      title: 'My bucket and decade review',
      narrative: [
        'Decade review.',
        '',
        'Patterns over time.',
        '',
        'Major arcs.',
        '',
        'I tell decade-marker: review.'
      ],
      lesson: 'Decade reviews examine patterns over time and major arcs.'
    },
    {
      id: 'sn61_8',
      title: 'My bucket and birthday reflection',
      narrative: [
        'Annual birthday reflection.',
        '',
        'Year of self.',
        '',
        'Direction examined.',
        '',
        'I tell birthday-reflective: review.'
      ],
      lesson: 'Annual birthday reflection examines year of self and direction.'
    },
    {
      id: 'sn61_9',
      title: 'My bucket and gratitude review',
      narrative: [
        'Weekly gratitude review.',
        '',
        'Specific blessings.',
        '',
        'Brain shifts.',
        '',
        'I tell mood-stuck: weekly gratitude.'
      ],
      lesson: 'Weekly gratitude review with specific blessings shifts brain.'
    },
    {
      id: 'sn61_10',
      title: 'My bucket and values review',
      narrative: [
        'Annual values check.',
        '',
        'Aligned with what?',
        '',
        'Adjustments needed?',
        '',
        'I tell values-curious: annual review.'
      ],
      lesson: 'Annual values check examines alignment and reveals needed adjustments.'
    },
    {
      id: 'sn61_11',
      title: 'My bucket and relationship review',
      narrative: [
        'Annual relationship review.',
        '',
        'Each relationship examined.',
        '',
        'Investment evaluated.',
        '',
        'I tell relationship-curious: annual.'
      ],
      lesson: 'Annual relationship review examines each relationship and evaluates investment.'
    },
    {
      id: 'sn61_12',
      title: 'My bucket and career review',
      narrative: [
        'Annual career review.',
        '',
        'Path evaluated.',
        '',
        'Next steps planned.',
        '',
        'I tell career-curious: annual.'
      ],
      lesson: 'Annual career reviews evaluate path and plan next steps.'
    },
    {
      id: 'sn61_13',
      title: 'My bucket and health review',
      narrative: [
        'Annual health review.',
        '',
        'Physical and mental.',
        '',
        'Adjustments made.',
        '',
        'I tell health-curious: annual.'
      ],
      lesson: 'Annual health reviews of physical and mental enable adjustments.'
    },
    {
      id: 'sn61_14',
      title: 'My bucket and finance review',
      narrative: [
        'Annual finance review.',
        '',
        'Budget plus goals.',
        '',
        'Direction adjusted.',
        '',
        'I tell finance-curious: annual.'
      ],
      lesson: 'Annual finance review with budget and goals adjusts direction.'
    },
    {
      id: 'sn61_15',
      title: 'My bucket and life review',
      narrative: [
        'Annual life review.',
        '',
        'Whole picture.',
        '',
        'Integration.',
        '',
        'I tell systematic: annual life.'
      ],
      lesson: 'Annual life review provides whole picture integration.'
    }
  ];

  var STRESS_NARRATIVES_62 = [
    {
      id: 'sn62_1',
      title: 'My bucket and morning meditation gift',
      narrative: [
        'Morning meditation gift.',
        '',
        'To future self.',
        '',
        'Daily practice.',
        '',
        'I tell consistent-curious: gift.'
      ],
      lesson: 'Morning meditation as gift to future self maintains daily practice.'
    },
    {
      id: 'sn62_2',
      title: 'My bucket and evening journal gift',
      narrative: [
        'Evening journal.',
        '',
        'Gift to next morning.',
        '',
        'Bucket externalized.',
        '',
        'I tell journaling-curious: gift.'
      ],
      lesson: 'Evening journal as gift to next morning externalizes bucket.'
    },
    {
      id: 'sn62_3',
      title: 'My bucket and weekly therapy investment',
      narrative: [
        'Weekly therapy.',
        '',
        'Investment in self.',
        '',
        'Long-term wealth.',
        '',
        'I tell therapy-curious: investment.'
      ],
      lesson: 'Weekly therapy as investment in self provides long-term wealth.'
    },
    {
      id: 'sn62_4',
      title: 'My bucket and exercise investment',
      narrative: [
        'Daily exercise.',
        '',
        'Future health.',
        '',
        'Compound benefits.',
        '',
        'I tell future-self: exercise.'
      ],
      lesson: 'Daily exercise investment in future health compounds benefits.'
    },
    {
      id: 'sn62_5',
      title: 'My bucket and sleep investment',
      narrative: [
        '9 hours nightly.',
        '',
        'Future capacity.',
        '',
        'Investment compounding.',
        '',
        'I tell sleep-curious: investment.'
      ],
      lesson: 'Nine hours nightly sleep invests in future capacity with compounding benefits.'
    },
    {
      id: 'sn62_6',
      title: 'My bucket and nutrition investment',
      narrative: [
        'Whole foods plate.',
        '',
        'Future body.',
        '',
        'Investment in cells.',
        '',
        'I tell future-body: nutrition.'
      ],
      lesson: 'Whole foods plate invests in future body through nutrition.'
    },
    {
      id: 'sn62_7',
      title: 'My bucket and relationship investment',
      narrative: [
        'Weekly relationship time.',
        '',
        'Connection compounds.',
        '',
        'Future love.',
        '',
        'I tell relationship-curious: investment.'
      ],
      lesson: 'Weekly relationship time invests in connection that compounds future love.'
    },
    {
      id: 'sn62_8',
      title: 'My bucket and friendship investment',
      narrative: [
        'Friend time weekly.',
        '',
        'Bonds maintained.',
        '',
        'Future support.',
        '',
        'I tell friend-curious: weekly.'
      ],
      lesson: 'Weekly friend time maintains bonds investing in future support.'
    },
    {
      id: 'sn62_9',
      title: 'My bucket and learning investment',
      narrative: [
        'Daily learning.',
        '',
        'Brain growth.',
        '',
        'Future capability.',
        '',
        'I tell learning-curious: daily.'
      ],
      lesson: 'Daily learning invests in brain growth and future capability.'
    },
    {
      id: 'sn62_10',
      title: 'My bucket and emergency fund investment',
      narrative: [
        'Emergency fund building.',
        '',
        'Future stress reduction.',
        '',
        'Bucket investment.',
        '',
        'I tell finance-curious: emergency fund.'
      ],
      lesson: 'Emergency fund building invests in future stress reduction as bucket investment.'
    },
    {
      id: 'sn62_11',
      title: 'My bucket and retirement investment',
      narrative: [
        'Retirement saving.',
        '',
        'Future security.',
        '',
        'Compound investment.',
        '',
        'I tell future-financial: retirement.'
      ],
      lesson: 'Retirement saving invests in future security through compounding.'
    },
    {
      id: 'sn62_12',
      title: 'My bucket and skill investment',
      narrative: [
        'Skill development weekly.',
        '',
        'Future capability.',
        '',
        'Career investment.',
        '',
        'I tell career-curious: skill weekly.'
      ],
      lesson: 'Weekly skill development invests in future career capability.'
    },
    {
      id: 'sn62_13',
      title: 'My bucket and reading investment',
      narrative: [
        'Daily reading.',
        '',
        'Knowledge accumulation.',
        '',
        'Wisdom compounding.',
        '',
        'I tell book-curious: daily.'
      ],
      lesson: 'Daily reading invests in knowledge accumulation and wisdom compounding.'
    },
    {
      id: 'sn62_14',
      title: 'My bucket and reflection investment',
      narrative: [
        'Daily reflection time.',
        '',
        'Self-knowledge growth.',
        '',
        'Wisdom investment.',
        '',
        'I tell self-curious: reflection.'
      ],
      lesson: 'Daily reflection time invests in self-knowledge growth as wisdom.'
    },
    {
      id: 'sn62_15',
      title: 'My bucket and self-care investment',
      narrative: [
        'Self-care prioritized.',
        '',
        'Future capacity.',
        '',
        'Sustainable investment.',
        '',
        'I tell over-giving: self-care.'
      ],
      lesson: 'Self-care prioritized invests in future capacity for sustainable giving.'
    }
  ];

  var STRESS_NARRATIVES_63 = [
    {
      id: 'sn63_1',
      title: 'My bucket and morning practice anchored',
      narrative: [
        'Morning practice anchor.',
        '',
        'Same time daily.',
        '',
        'Day begins right.',
        '',
        'I tell scattered-mornings: anchor.'
      ],
      lesson: 'Morning practice as anchor at same time daily begins day right.'
    },
    {
      id: 'sn63_2',
      title: 'My bucket and evening practice anchored',
      narrative: [
        'Evening practice anchor.',
        '',
        'Same routine.',
        '',
        'Day ends well.',
        '',
        'I tell rushed-evenings: anchor.'
      ],
      lesson: 'Evening practice as anchor with same routine ends day well.'
    },
    {
      id: 'sn63_3',
      title: 'My bucket and weekly practice anchored',
      narrative: [
        'Sunday practice anchor.',
        '',
        'Weekly reset.',
        '',
        'Week begins centered.',
        '',
        'I tell weekly-scattered: anchor.'
      ],
      lesson: 'Sunday practice as weekly anchor provides reset for centered week beginning.'
    },
    {
      id: 'sn63_4',
      title: 'My bucket and monthly retreat anchored',
      narrative: [
        'Monthly retreat anchor.',
        '',
        'Solo time.',
        '',
        'Deep reset.',
        '',
        'I tell stressed: monthly anchor.'
      ],
      lesson: 'Monthly retreat as anchor with solo time provides deep reset.'
    },
    {
      id: 'sn63_5',
      title: 'My bucket and annual retreat anchored',
      narrative: [
        'Annual retreat anchor.',
        '',
        'Major reset.',
        '',
        'Year recalibrated.',
        '',
        'I tell yearly: anchor retreat.'
      ],
      lesson: 'Annual retreat as anchor provides major reset recalibrating year.'
    },
    {
      id: 'sn63_6',
      title: 'My bucket and Sabbath practice',
      narrative: [
        'Weekly Sabbath day.',
        '',
        'Rest commanded.',
        '',
        'Bucket fully drains.',
        '',
        'I tell religious-curious: Sabbath.'
      ],
      lesson: 'Weekly Sabbath rest day commanded enables bucket full drainage.'
    },
    {
      id: 'sn63_7',
      title: 'My bucket and Sunday rest',
      narrative: [
        'Sunday rest practice.',
        '',
        'No work.',
        '',
        'Family or solo.',
        '',
        'I tell rest-curious: Sunday.'
      ],
      lesson: 'Sunday rest practice without work allows family or solo restoration.'
    },
    {
      id: 'sn63_8',
      title: 'My bucket and protected weekends',
      narrative: [
        'Weekend protected.',
        '',
        'No work intrusion.',
        '',
        'Recovery time.',
        '',
        'I tell work-bleeding: protect weekends.'
      ],
      lesson: 'Protected weekends without work intrusion provide recovery time.'
    },
    {
      id: 'sn63_9',
      title: 'My bucket and protected evenings',
      narrative: [
        'Evening protected.',
        '',
        'After 6pm sacred.',
        '',
        'Family or self.',
        '',
        'I tell late-working: protect evenings.'
      ],
      lesson: 'Protected evenings after 6pm as sacred for family or self.'
    },
    {
      id: 'sn63_10',
      title: 'My bucket and protected mornings',
      narrative: [
        'Morning protected.',
        '',
        'Before 9am sacred.',
        '',
        'Self-care time.',
        '',
        'I tell rushed-mornings: protect.'
      ],
      lesson: 'Protected mornings before 9am as sacred self-care time.'
    },
    {
      id: 'sn63_11',
      title: 'My bucket and protected breaks',
      narrative: [
        'Lunch break protected.',
        '',
        'Real break, not desk.',
        '',
        'Bucket recovers midday.',
        '',
        'I tell working-through: break.'
      ],
      lesson: 'Lunch breaks protected as real breaks away from desk enable midday bucket recovery.'
    },
    {
      id: 'sn63_12',
      title: 'My bucket and protected vacations',
      narrative: [
        'Vacation truly off.',
        '',
        'Email auto-responder.',
        '',
        'Phone off.',
        '',
        'I tell never-off: protect vacation.'
      ],
      lesson: 'Protected vacations truly off with auto-responder and phone off enable full bucket drain.'
    },
    {
      id: 'sn63_13',
      title: 'My bucket and protected sleep',
      narrative: [
        'Sleep schedule protected.',
        '',
        'Bedtime non-negotiable.',
        '',
        'Bucket regenerates.',
        '',
        'I tell sleep-flexible: protect bedtime.'
      ],
      lesson: 'Protected sleep schedule with non-negotiable bedtime enables bucket regeneration.'
    },
    {
      id: 'sn63_14',
      title: 'My bucket and protected meals',
      narrative: [
        'Meal times protected.',
        '',
        'Not at desk.',
        '',
        'Body fed properly.',
        '',
        'I tell desk-eating: protect meals.'
      ],
      lesson: 'Protected meal times away from desk feed body properly.'
    },
    {
      id: 'sn63_15',
      title: 'My bucket and protected solo time',
      narrative: [
        'Daily solo time.',
        '',
        '30 min minimum.',
        '',
        'Self attended.',
        '',
        'I tell over-giving: solo time.'
      ],
      lesson: 'Daily protected solo time 30 min minimum attends self for over-givers.'
    }
  ];

  var STRESS_NARRATIVES_64 = [
    {
      id: 'sn64_1',
      title: 'My bucket and morning prayer practice',
      narrative: [
        'Morning prayer 15 min.',
        '',
        'Faith plus calm.',
        '',
        'Day grounded.',
        '',
        'I tell faithful: morning prayer.'
      ],
      lesson: 'Morning prayer 15 min with faith plus calm grounds day.'
    },
    {
      id: 'sn64_2',
      title: 'My bucket and evening prayer practice',
      narrative: [
        'Evening prayer.',
        '',
        'Day surrendered.',
        '',
        'Sleep welcomed.',
        '',
        'I tell faithful: evening prayer.'
      ],
      lesson: 'Evening prayer surrenders day welcoming sleep.'
    },
    {
      id: 'sn64_3',
      title: 'My bucket and meal prayers',
      narrative: [
        'Grace before meals.',
        '',
        'Gratitude practiced.',
        '',
        'Food blessed.',
        '',
        'I tell faithful: meal prayers.'
      ],
      lesson: 'Grace before meals practices gratitude and blesses food.'
    },
    {
      id: 'sn64_4',
      title: 'My bucket and Sabbath observance',
      narrative: [
        'Sabbath kept weekly.',
        '',
        'Rest commanded.',
        '',
        'Body and soul honor.',
        '',
        'I tell religious-curious: Sabbath.'
      ],
      lesson: 'Sabbath kept weekly as commanded rest honors body and soul.'
    },
    {
      id: 'sn64_5',
      title: 'My bucket and weekly service',
      narrative: [
        'Weekly faith service.',
        '',
        'Community plus liturgy.',
        '',
        'Faith maintained.',
        '',
        'I tell faithful: weekly attendance.'
      ],
      lesson: 'Weekly faith service with community plus liturgy maintains faith.'
    },
    {
      id: 'sn64_6',
      title: 'My bucket and small group',
      narrative: [
        'Weekly faith small group.',
        '',
        'Deep community.',
        '',
        'Intimate practice.',
        '',
        'I tell faith-deepening: small group.'
      ],
      lesson: 'Weekly faith small group provides deep intimate community practice.'
    },
    {
      id: 'sn64_7',
      title: 'My bucket and bible study',
      narrative: [
        'Bible study weekly.',
        '',
        'Sacred text study.',
        '',
        'Faith plus learning.',
        '',
        'I tell faith-learning: bible study.'
      ],
      lesson: 'Weekly bible study of sacred text combines faith plus learning.'
    },
    {
      id: 'sn64_8',
      title: 'My bucket and lectio divina',
      narrative: [
        'Lectio divina practice.',
        '',
        'Slow sacred reading.',
        '',
        'Heart opens.',
        '',
        'I tell contemplative-curious: lectio.'
      ],
      lesson: 'Lectio divina slow sacred reading opens heart.'
    },
    {
      id: 'sn64_9',
      title: 'My bucket and centering prayer',
      narrative: [
        'Centering prayer practice.',
        '',
        'Christian contemplative.',
        '',
        'Silent prayer.',
        '',
        'I tell Christian-meditation: centering prayer.'
      ],
      lesson: 'Centering prayer Christian contemplative practice provides silent prayer.'
    },
    {
      id: 'sn64_10',
      title: 'My bucket and dhikr practice',
      narrative: [
        'Islamic dhikr.',
        '',
        'Sacred remembrance.',
        '',
        'Heart connected.',
        '',
        'I tell Islamic-spiritual: dhikr.'
      ],
      lesson: 'Islamic dhikr sacred remembrance connects heart.'
    },
    {
      id: 'sn64_11',
      title: 'My bucket and tefillin',
      narrative: [
        'Jewish tefillin daily.',
        '',
        'Sacred wrapping.',
        '',
        'Body sanctified.',
        '',
        'I tell Jewish-spiritual: tefillin.'
      ],
      lesson: 'Daily Jewish tefillin sacred wrapping sanctifies body.'
    },
    {
      id: 'sn64_12',
      title: 'My bucket and prayer beads',
      narrative: [
        'Prayer beads practice.',
        '',
        'Tactile prayer.',
        '',
        'Anchored attention.',
        '',
        'I tell tactile-spiritual: prayer beads.'
      ],
      lesson: 'Prayer beads provide tactile prayer with anchored attention.'
    },
    {
      id: 'sn64_13',
      title: 'My bucket and pilgrimage',
      narrative: [
        'Annual pilgrimage.',
        '',
        'Sacred journey.',
        '',
        'Spiritual deepening.',
        '',
        'I tell spiritual-curious: pilgrimage.'
      ],
      lesson: 'Annual pilgrimage as sacred journey deepens spiritual practice.'
    },
    {
      id: 'sn64_14',
      title: 'My bucket and sacred space at home',
      narrative: [
        'Home altar or sacred corner.',
        '',
        'Visual anchor.',
        '',
        'Daily reminder.',
        '',
        'I tell faith-home: sacred space.'
      ],
      lesson: 'Home altar or sacred corner provides visual anchor for daily faith reminder.'
    },
    {
      id: 'sn64_15',
      title: 'My bucket and spiritual director',
      narrative: [
        'Monthly spiritual director.',
        '',
        'Soul journey companion.',
        '',
        'Discernment supported.',
        '',
        'I tell faith-deepening: spiritual director.'
      ],
      lesson: 'Monthly spiritual director supports soul journey discernment.'
    }
  ];

  var STRESS_NARRATIVES_65 = [
    {
      id: 'sn65_1',
      title: 'My bucket and final integration practice',
      narrative: [
        'All practices stacked.',
        '',
        'Years of integration.',
        '',
        'Lifelong skill.',
        '',
        'I tell beginners: integration possible.'
      ],
      lesson: 'All practices stacked over years of integration become lifelong skill.'
    },
    {
      id: 'sn65_2',
      title: 'My bucket and life-long practice commitment',
      narrative: [
        'Lifelong practice commitment.',
        '',
        'Not destination.',
        '',
        'Daily renewal.',
        '',
        'I tell beginners: commit lifelong.'
      ],
      lesson: 'Lifelong practice commitment as daily renewal not destination.'
    },
    {
      id: 'sn65_3',
      title: 'My bucket and pattern recognition mastery',
      narrative: [
        'Patterns recognized.',
        '',
        'Triggers identified.',
        '',
        'Predictive ability.',
        '',
        'I tell systematic-curious: pattern mastery.'
      ],
      lesson: 'Pattern recognition mastery identifies triggers for predictive ability.'
    },
    {
      id: 'sn65_4',
      title: 'My bucket and intervention timing',
      narrative: [
        'Earlier intervention.',
        '',
        'Bucket levels caught.',
        '',
        'Overflow prevented.',
        '',
        'I tell crisis-prone: early intervention.'
      ],
      lesson: 'Earlier intervention catches bucket levels and prevents overflow.'
    },
    {
      id: 'sn65_5',
      title: 'My bucket and tap diversification',
      narrative: [
        'Multiple taps diversified.',
        '',
        'Single tap insufficient.',
        '',
        'Body, mind, social, spiritual.',
        '',
        'I tell single-tap: diversify.'
      ],
      lesson: 'Multiple diversified taps across body, mind, social, spiritual prevent single-tap insufficiency.'
    },
    {
      id: 'sn65_6',
      title: 'My bucket and seasonal adjustment',
      narrative: [
        'Seasonal capacity awareness.',
        '',
        'Inflow adjusted.',
        '',
        'Taps matched.',
        '',
        'I tell seasonal-affected: adjust.'
      ],
      lesson: 'Seasonal capacity awareness adjusts inflow and matches taps.'
    },
    {
      id: 'sn65_7',
      title: 'My bucket and life-stage adjustment',
      narrative: [
        'Life stage capacity shifts.',
        '',
        'Bucket reshapes.',
        '',
        'Practices adjust.',
        '',
        'I tell stage-shifting: adjust.'
      ],
      lesson: 'Life stage capacity shifts reshape bucket; practices adjust accordingly.'
    },
    {
      id: 'sn65_8',
      title: 'My bucket and aging awareness',
      narrative: [
        'Aging changes capacity.',
        '',
        'Adjustments needed.',
        '',
        'Patience cultivated.',
        '',
        'I tell aging: capacity awareness.'
      ],
      lesson: 'Aging changes capacity requiring adjustments and cultivating patience.'
    },
    {
      id: 'sn65_9',
      title: 'My bucket and acceptance of limits',
      narrative: [
        'Limits accepted.',
        '',
        'Capacity honored.',
        '',
        'Energy preserved.',
        '',
        'I tell limit-fighting: accept.'
      ],
      lesson: 'Limits accepted honor capacity and preserve energy.'
    },
    {
      id: 'sn65_10',
      title: 'My bucket and service emerging',
      narrative: [
        'Service emerges.',
        '',
        'Bucket awareness shared.',
        '',
        'Others helped.',
        '',
        'I tell experienced: serve others.'
      ],
      lesson: 'Service emerges from bucket awareness; others helped through shared experience.'
    },
    {
      id: 'sn65_11',
      title: 'My bucket and teaching others',
      narrative: [
        'Teaching the model.',
        '',
        'Family, friends, community.',
        '',
        'Wisdom shared.',
        '',
        'I tell mature: teach.'
      ],
      lesson: 'Teaching the bucket model to family, friends, community shares wisdom.'
    },
    {
      id: 'sn65_12',
      title: 'My bucket and mentoring others',
      narrative: [
        'Mentor newer practitioners.',
        '',
        'Path walked together.',
        '',
        'Wisdom transferred.',
        '',
        'I tell experienced: mentor.'
      ],
      lesson: 'Mentoring newer practitioners walks path together transferring wisdom.'
    },
    {
      id: 'sn65_13',
      title: 'My bucket and gratitude for tools',
      narrative: [
        'Gratitude for bucket model.',
        '',
        'Tools available.',
        '',
        'Suffering can be managed.',
        '',
        'I tell new-learner: gratitude.'
      ],
      lesson: 'Gratitude for bucket model recognizes tools available for managing suffering.'
    },
    {
      id: 'sn65_14',
      title: 'My bucket and humility maintained',
      narrative: [
        'Humility maintained.',
        '',
        'Overflow still possible.',
        '',
        'Beginners mind.',
        '',
        'I tell mature: humility.'
      ],
      lesson: 'Humility maintained recognizes overflow still possible; beginners mind continues.'
    },
    {
      id: 'sn65_15',
      title: 'My bucket and lifelong learning continues',
      narrative: [
        'Always learning.',
        '',
        'Practice evolves.',
        '',
        'New tools added.',
        '',
        'I tell mature: lifelong learning.'
      ],
      lesson: 'Always learning continues lifelong as practice evolves with new tools added.'
    }
  ];

  var STRESS_NARRATIVES_56 = [
    {
      id: 'sn56_1',
      title: 'My bucket and weekly meal prep',
      narrative: [
        'Sunday meal prep.',
        '',
        'Week food ready.',
        '',
        'Daily decisions reduced.',
        '',
        'I tell food-stressed: prep.'
      ],
      lesson: 'Sunday meal prep reduces daily food decisions; weekly inflow reduced.'
    },
    {
      id: 'sn56_2',
      title: 'My bucket and slow cooking',
      narrative: [
        'Slow cooker weekly.',
        '',
        'Dinner ready when home.',
        '',
        'Evening relief.',
        '',
        'I tell evening-rushed: slow cooker.'
      ],
      lesson: 'Weekly slow cooker meals ready when home provide evening relief.'
    },
    {
      id: 'sn56_3',
      title: 'My bucket and batch cooking',
      narrative: [
        'Batch cooking weekly.',
        '',
        'Freezer stocked.',
        '',
        'Future meals ready.',
        '',
        'I tell cook-tired: batch.'
      ],
      lesson: 'Weekly batch cooking stocks freezer with future meals ready.'
    },
    {
      id: 'sn56_4',
      title: 'My bucket and one-pot meals',
      narrative: [
        'One-pot meal nights.',
        '',
        'Less cleanup.',
        '',
        'Simple cooking.',
        '',
        'I tell cleanup-stressed: one-pot.'
      ],
      lesson: 'One-pot meal nights provide simple cooking with less cleanup.'
    },
    {
      id: 'sn56_5',
      title: 'My bucket and meal delivery',
      narrative: [
        'Meal delivery service.',
        '',
        'When bucket overflows.',
        '',
        'Healthy support.',
        '',
        'I tell stressed-cook: meal delivery.'
      ],
      lesson: 'Meal delivery services provide healthy support during bucket overflow.'
    },
    {
      id: 'sn56_6',
      title: 'My bucket and grocery delivery',
      narrative: [
        'Grocery delivery.',
        '',
        'Time saved.',
        '',
        'Bucket lighter.',
        '',
        'I tell time-stressed: delivery.'
      ],
      lesson: 'Grocery delivery saves time; bucket lighter through delegation.'
    },
    {
      id: 'sn56_7',
      title: 'My bucket and weekly menu',
      narrative: [
        'Weekly menu planned.',
        '',
        'Shopping list automatic.',
        '',
        'Decisions reduced.',
        '',
        'I tell food-planning: weekly menu.'
      ],
      lesson: 'Weekly menu planning generates automatic shopping list and reduces decisions.'
    },
    {
      id: 'sn56_8',
      title: 'My bucket and theme dinners',
      narrative: [
        'Theme dinner nights.',
        '',
        'Monday Italian.',
        '',
        'Tuesday taco.',
        '',
        'Choices reduced.',
        '',
        'I tell daily-decisions: theme nights.'
      ],
      lesson: 'Theme dinner nights like Monday Italian and Tuesday taco reduce daily choices.'
    },
    {
      id: 'sn56_9',
      title: 'My bucket and breakfast routine',
      narrative: [
        'Same breakfast daily.',
        '',
        'Decision removed.',
        '',
        'Bucket lighter.',
        '',
        'I tell morning-decisions: same breakfast.'
      ],
      lesson: 'Same breakfast daily removes decision and lightens bucket.'
    },
    {
      id: 'sn56_10',
      title: 'My bucket and lunch routine',
      narrative: [
        'Same lunch types.',
        '',
        'Rotated weekly.',
        '',
        'Easy and predictable.',
        '',
        'I tell lunch-stressed: routine.'
      ],
      lesson: 'Same lunch types rotated weekly provide easy predictable bucket maintenance.'
    },
    {
      id: 'sn56_11',
      title: 'My bucket and dinner rotation',
      narrative: [
        'Rotating dinner menu.',
        '',
        '14 meals on rotation.',
        '',
        'Variety with predictability.',
        '',
        'I tell menu-stuck: rotation.'
      ],
      lesson: 'Rotating dinner menu with 14 meals provides variety with predictability.'
    },
    {
      id: 'sn56_12',
      title: 'My bucket and grocery shopping ritual',
      narrative: [
        'Saturday morning shop.',
        '',
        'Same store, same time.',
        '',
        'Ritual reduces stress.',
        '',
        'I tell shopping-stressed: ritual.'
      ],
      lesson: 'Saturday morning grocery shop same store same time as ritual reduces stress.'
    },
    {
      id: 'sn56_13',
      title: 'My bucket and pantry stocked',
      narrative: [
        'Stocked pantry essentials.',
        '',
        'Always able to cook.',
        '',
        'Emergency meals possible.',
        '',
        'I tell food-anxious: stocked pantry.'
      ],
      lesson: 'Stocked pantry essentials always enable cooking and emergency meal capability.'
    },
    {
      id: 'sn56_14',
      title: 'My bucket and frozen meal backup',
      narrative: [
        'Frozen meals ready.',
        '',
        'Bucket overflow nights.',
        '',
        'Quick dinner.',
        '',
        'I tell overflow-prone: frozen backup.'
      ],
      lesson: 'Frozen meal backup for bucket overflow nights enables quick dinner.'
    },
    {
      id: 'sn56_15',
      title: 'My bucket and takeout permission',
      narrative: [
        'Takeout when needed.',
        '',
        'No guilt.',
        '',
        'Bucket protected.',
        '',
        'I tell cook-pressured: takeout permission.'
      ],
      lesson: 'Takeout when needed without guilt protects bucket from cooking pressure.'
    }
  ];

  var STRESS_NARRATIVES_57 = [
    {
      id: 'sn57_1',
      title: 'My bucket and morning sunshine',
      narrative: [
        '10 min morning sun.',
        '',
        'Circadian aligned.',
        '',
        'Cortisol regulated.',
        '',
        'I tell sleep-stressed: morning sun.'
      ],
      lesson: '10 min morning sun aligns circadian and regulates cortisol.'
    },
    {
      id: 'sn57_2',
      title: 'My bucket and lunchtime sunshine',
      narrative: [
        'Lunch outside.',
        '',
        'Midday vitamin D.',
        '',
        'Mood supported.',
        '',
        'I tell vitamin-D-low: lunch outside.'
      ],
      lesson: 'Lunch outside provides midday vitamin D supporting mood.'
    },
    {
      id: 'sn57_3',
      title: 'My bucket and afternoon light',
      narrative: [
        'Afternoon outside time.',
        '',
        'Sustains energy.',
        '',
        'Bucket draining.',
        '',
        'I tell afternoon-slump: outside light.'
      ],
      lesson: 'Afternoon outside time sustains energy and drains bucket.'
    },
    {
      id: 'sn57_4',
      title: 'My bucket and sunset watching',
      narrative: [
        'Daily sunset watching.',
        '',
        'Beauty plus pause.',
        '',
        'Day transition.',
        '',
        'I tell pace-curious: sunset.'
      ],
      lesson: 'Daily sunset watching provides beauty plus pause for day transition.'
    },
    {
      id: 'sn57_5',
      title: 'My bucket and sunrise watching',
      narrative: [
        'Morning sunrise watching.',
        '',
        'New day begins.',
        '',
        'Wonder cultivated.',
        '',
        'I tell early-rising: sunrise.'
      ],
      lesson: 'Morning sunrise watching marks new day beginning and cultivates wonder.'
    },
    {
      id: 'sn57_6',
      title: 'My bucket and moon watching',
      narrative: [
        'Moon phase watching.',
        '',
        'Monthly cycle felt.',
        '',
        'Cosmic rhythm.',
        '',
        'I tell cycle-curious: moon.'
      ],
      lesson: 'Moon phase watching feels monthly cycle through cosmic rhythm.'
    },
    {
      id: 'sn57_7',
      title: 'My bucket and star gazing',
      narrative: [
        'Star gazing nights.',
        '',
        'Universe perspective.',
        '',
        'Personal small.',
        '',
        'I tell perspective-seeking: stars.'
      ],
      lesson: 'Star gazing nights provide universe perspective making personal feel small in good way.'
    },
    {
      id: 'sn57_8',
      title: 'My bucket and weather watching',
      narrative: [
        'Sky watching daily.',
        '',
        'Clouds plus light.',
        '',
        'Awareness expanded.',
        '',
        'I tell window-having: sky.'
      ],
      lesson: 'Daily sky watching with clouds plus light expands awareness.'
    },
    {
      id: 'sn57_9',
      title: 'My bucket and rain watching',
      narrative: [
        'Rain watching ritual.',
        '',
        'Window seat.',
        '',
        'Sound of rain.',
        '',
        'I tell rain-curious: ritual.'
      ],
      lesson: 'Rain watching ritual from window seat with sound of rain provides sensory bucket tap.'
    },
    {
      id: 'sn57_10',
      title: 'My bucket and snow watching',
      narrative: [
        'Snow falling watched.',
        '',
        'Quiet beauty.',
        '',
        'World transformed.',
        '',
        'I tell winter-curious: snow watching.'
      ],
      lesson: 'Snow falling watched provides quiet beauty as world transforms.'
    },
    {
      id: 'sn57_11',
      title: 'My bucket and seasonal changes',
      narrative: [
        'Seasonal awareness.',
        '',
        'Each season noticed.',
        '',
        'Earth time felt.',
        '',
        'I tell time-curious: seasonal.'
      ],
      lesson: 'Seasonal awareness noticing each season felt as Earth time.'
    },
    {
      id: 'sn57_12',
      title: 'My bucket and equinox marking',
      narrative: [
        'Equinox ritual.',
        '',
        'Balance acknowledged.',
        '',
        'Earth turning marked.',
        '',
        'I tell seasonal-curious: equinox.'
      ],
      lesson: 'Equinox ritual acknowledges balance and marks Earth turning.'
    },
    {
      id: 'sn57_13',
      title: 'My bucket and solstice marking',
      narrative: [
        'Solstice ritual.',
        '',
        'Longest and shortest days.',
        '',
        'Earth pause marked.',
        '',
        'I tell seasonal-curious: solstice.'
      ],
      lesson: 'Solstice ritual marks longest and shortest days as Earth pause.'
    },
    {
      id: 'sn57_14',
      title: 'My bucket and quarter days',
      narrative: [
        'Cross-quarter days.',
        '',
        'Mid-season markers.',
        '',
        'Earth rhythm.',
        '',
        'I tell earth-rhythm: quarter days.'
      ],
      lesson: 'Cross-quarter days as mid-season markers honor Earth rhythm.'
    },
    {
      id: 'sn57_15',
      title: 'My bucket and lunar new year',
      narrative: [
        'Lunar new year marked.',
        '',
        'Beyond Gregorian.',
        '',
        'Multiple calendars.',
        '',
        'I tell calendar-curious: lunar.'
      ],
      lesson: 'Lunar new year marked beyond Gregorian provides multiple calendar awareness.'
    }
  ];

  var STRESS_NARRATIVES_58 = [
    {
      id: 'sn58_1',
      title: 'My bucket and ocean visits',
      narrative: [
        'Monthly ocean visits.',
        '',
        'Wave sounds.',
        '',
        'Vast perspective.',
        '',
        'I tell inland: ocean monthly.'
      ],
      lesson: 'Monthly ocean visits provide wave sounds and vast perspective.'
    },
    {
      id: 'sn58_2',
      title: 'My bucket and lake visits',
      narrative: [
        'Weekly lake visits.',
        '',
        'Still water.',
        '',
        'Reflective surface.',
        '',
        'I tell water-curious: lakes.'
      ],
      lesson: 'Weekly lake visits with still water provide reflective surface.'
    },
    {
      id: 'sn58_3',
      title: 'My bucket and river visits',
      narrative: [
        'River visits regularly.',
        '',
        'Flowing water.',
        '',
        'Rhythm of moving.',
        '',
        'I tell flow-needing: river.'
      ],
      lesson: 'Regular river visits with flowing water provide rhythm of moving meditation.'
    },
    {
      id: 'sn58_4',
      title: 'My bucket and stream visits',
      narrative: [
        'Forest stream visits.',
        '',
        'Small water sounds.',
        '',
        'Intimate nature.',
        '',
        'I tell small-water: streams.'
      ],
      lesson: 'Forest stream visits with small water sounds provide intimate nature.'
    },
    {
      id: 'sn58_5',
      title: 'My bucket and waterfall visits',
      narrative: [
        'Waterfall visits.',
        '',
        'Negative ions.',
        '',
        'Power of water.',
        '',
        'I tell water-power: waterfalls.'
      ],
      lesson: 'Waterfall visits provide negative ions and power of water.'
    },
    {
      id: 'sn58_6',
      title: 'My bucket and pond visits',
      narrative: [
        'Pond visits.',
        '',
        'Frogs and ducks.',
        '',
        'Small ecosystem.',
        '',
        'I tell small-wildlife: ponds.'
      ],
      lesson: 'Pond visits with frogs and ducks reveal small ecosystem.'
    },
    {
      id: 'sn58_7',
      title: 'My bucket and creek visits',
      narrative: [
        'Creek visits.',
        '',
        'Stepping stones.',
        '',
        'Childhood echo.',
        '',
        'I tell child-self: creek visits.'
      ],
      lesson: 'Creek visits with stepping stones echo childhood play.'
    },
    {
      id: 'sn58_8',
      title: 'My bucket and water meditation',
      narrative: [
        'Water meditation.',
        '',
        'Wave or stream.',
        '',
        'Mind drained.',
        '',
        'I tell water-curious: meditation.'
      ],
      lesson: 'Water meditation by wave or stream drains mind through aquatic focus.'
    },
    {
      id: 'sn58_9',
      title: 'My bucket and dock sitting',
      narrative: [
        'Dock sitting daily.',
        '',
        'Water lapping.',
        '',
        'Time slowed.',
        '',
        'I tell lakeside: dock sitting.'
      ],
      lesson: 'Daily dock sitting with water lapping slows time.'
    },
    {
      id: 'sn58_10',
      title: 'My bucket and beach walking',
      narrative: [
        'Beach walks weekly.',
        '',
        'Sand under feet.',
        '',
        'Waves rhythm.',
        '',
        'I tell coastal: beach walks.'
      ],
      lesson: 'Weekly beach walks with sand under feet and waves rhythm.'
    },
    {
      id: 'sn58_11',
      title: 'My bucket and tide pools',
      narrative: [
        'Tide pool exploration.',
        '',
        'Marine life found.',
        '',
        'Wonder cultivated.',
        '',
        'I tell ocean-curious: tide pools.'
      ],
      lesson: 'Tide pool exploration finds marine life and cultivates wonder.'
    },
    {
      id: 'sn58_12',
      title: 'My bucket and seashells',
      narrative: [
        'Shell collecting.',
        '',
        'Slow walking.',
        '',
        'Treasures found.',
        '',
        'I tell beach-walking: shells.'
      ],
      lesson: 'Shell collecting on slow beach walks finds treasures.'
    },
    {
      id: 'sn58_13',
      title: 'My bucket and sand castles',
      narrative: [
        'Sand castle building.',
        '',
        'Adult play.',
        '',
        'Hands engaged.',
        '',
        'I tell adult-play: sand castles.'
      ],
      lesson: 'Adult sand castle building engages hands as play.'
    },
    {
      id: 'sn58_14',
      title: 'My bucket and beach reading',
      narrative: [
        'Beach reading.',
        '',
        'Sun plus book.',
        '',
        'Two taps stacked.',
        '',
        'I tell beach-going: bring book.'
      ],
      lesson: 'Beach reading combines sun plus book as two stacked taps.'
    },
    {
      id: 'sn58_15',
      title: 'My bucket and beach meditation',
      narrative: [
        'Beach meditation.',
        '',
        'Wave breath.',
        '',
        'In and out.',
        '',
        'I tell meditation-coastal: beach.'
      ],
      lesson: 'Beach meditation with wave breath in and out aligns body to ocean.'
    }
  ];

  var STRESS_NARRATIVES_59 = [
    {
      id: 'sn59_1',
      title: 'My bucket and mountain hiking',
      narrative: [
        'Weekly mountain hike.',
        '',
        'Elevation challenge.',
        '',
        'Vista reward.',
        '',
        'I tell mountain-near: weekly.'
      ],
      lesson: 'Weekly mountain hiking provides elevation challenge and vista reward.'
    },
    {
      id: 'sn59_2',
      title: 'My bucket and trail walking',
      narrative: [
        'Trail walking weekly.',
        '',
        'Different terrain.',
        '',
        'Mind absorbed.',
        '',
        'I tell trail-near: weekly walk.'
      ],
      lesson: 'Weekly trail walking on different terrain absorbs mind through navigation.'
    },
    {
      id: 'sn59_3',
      title: 'My bucket and forest immersion',
      narrative: [
        'Forest bathing weekly.',
        '',
        'Slow nature.',
        '',
        'Research-backed.',
        '',
        'I tell stressed: forest bathing.'
      ],
      lesson: 'Weekly forest bathing slow nature immersion is research-backed.'
    },
    {
      id: 'sn59_4',
      title: 'My bucket and canyon visits',
      narrative: [
        'Canyon visits annually.',
        '',
        'Scale humbling.',
        '',
        'Geologic time.',
        '',
        'I tell perspective-needing: canyon.'
      ],
      lesson: 'Annual canyon visits provide humbling scale and geologic time perspective.'
    },
    {
      id: 'sn59_5',
      title: 'My bucket and desert visits',
      narrative: [
        'Desert visits annually.',
        '',
        'Vast silence.',
        '',
        'Spaciousness felt.',
        '',
        'I tell spaciousness-curious: desert.'
      ],
      lesson: 'Annual desert visits provide vast silence and felt spaciousness.'
    },
    {
      id: 'sn59_6',
      title: 'My bucket and prairie visits',
      narrative: [
        'Prairie visits.',
        '',
        'Wide grassland.',
        '',
        'Wind through grasses.',
        '',
        'I tell open-needing: prairie.'
      ],
      lesson: 'Prairie visits with wide grassland and wind through grasses provide openness.'
    },
    {
      id: 'sn59_7',
      title: 'My bucket and wetland visits',
      narrative: [
        'Wetland visits.',
        '',
        'Bird and frog sound.',
        '',
        'Ecosystem rich.',
        '',
        'I tell wildlife-curious: wetlands.'
      ],
      lesson: 'Wetland visits with bird and frog sound reveal rich ecosystem.'
    },
    {
      id: 'sn59_8',
      title: 'My bucket and old-growth forest',
      narrative: [
        'Old-growth forest visits.',
        '',
        'Ancient trees.',
        '',
        'Time scale shifts.',
        '',
        'I tell time-curious: old-growth.'
      ],
      lesson: 'Old-growth forest visits with ancient trees shift time scale awareness.'
    },
    {
      id: 'sn59_9',
      title: 'My bucket and waterfall hikes',
      narrative: [
        'Waterfall hikes.',
        '',
        'Destination hike.',
        '',
        'Reward at end.',
        '',
        'I tell goal-hiking: waterfalls.'
      ],
      lesson: 'Waterfall destination hikes provide goal and reward at end.'
    },
    {
      id: 'sn59_10',
      title: 'My bucket and summit hikes',
      narrative: [
        'Summit hikes.',
        '',
        'Peak achievement.',
        '',
        'Vista reward.',
        '',
        'I tell achievement-curious: summits.'
      ],
      lesson: 'Summit hikes provide peak achievement and vista reward.'
    },
    {
      id: 'sn59_11',
      title: 'My bucket and ridge walking',
      narrative: [
        'Ridge walking.',
        '',
        'Views both sides.',
        '',
        'High air.',
        '',
        'I tell heights-curious: ridges.'
      ],
      lesson: 'Ridge walking provides views both sides in high air.'
    },
    {
      id: 'sn59_12',
      title: 'My bucket and meadow walking',
      narrative: [
        'Meadow walking.',
        '',
        'Wildflowers.',
        '',
        'Soft underfoot.',
        '',
        'I tell meadow-curious: walking.'
      ],
      lesson: 'Meadow walking with wildflowers softens underfoot for gentle experience.'
    },
    {
      id: 'sn59_13',
      title: 'My bucket and creek crossing',
      narrative: [
        'Creek crossings.',
        '',
        'Stepping stones.',
        '',
        'Balance required.',
        '',
        'I tell adventure-curious: creek crossings.'
      ],
      lesson: 'Creek crossings on stepping stones require balance and provide playful adventure.'
    },
    {
      id: 'sn59_14',
      title: 'My bucket and cave exploration',
      narrative: [
        'Cave exploration.',
        '',
        'Dark and cool.',
        '',
        'Different world.',
        '',
        'I tell underground-curious: caves.'
      ],
      lesson: 'Cave exploration in dark and cool reveals different world.'
    },
    {
      id: 'sn59_15',
      title: 'My bucket and rock scrambling',
      narrative: [
        'Rock scrambling.',
        '',
        'Hands and feet.',
        '',
        'Whole body engaged.',
        '',
        'I tell adventure-curious: scrambling.'
      ],
      lesson: 'Rock scrambling with hands and feet engages whole body.'
    }
  ];

  var STRESS_NARRATIVES_60 = [
    {
      id: 'sn60_1',
      title: 'My bucket and pet companionship',
      narrative: [
        'Pet companionship.',
        '',
        'Daily presence.',
        '',
        'Love unconditional.',
        '',
        'I tell pet-curious: companionship.'
      ],
      lesson: 'Pet companionship daily presence provides unconditional love.'
    },
    {
      id: 'sn60_2',
      title: 'My bucket and dog walks',
      narrative: [
        'Daily dog walks.',
        '',
        'Routine forced.',
        '',
        'Body and bond.',
        '',
        'I tell dog-owners: walks.'
      ],
      lesson: 'Daily dog walks force routine and provide body plus bond.'
    },
    {
      id: 'sn60_3',
      title: 'My bucket and cat petting',
      narrative: [
        'Cat petting daily.',
        '',
        'Purring calming.',
        '',
        'Stillness shared.',
        '',
        'I tell cat-owners: petting time.'
      ],
      lesson: 'Daily cat petting with purring calming shares stillness.'
    },
    {
      id: 'sn60_4',
      title: 'My bucket and bird feeding',
      narrative: [
        'Bird feeder window.',
        '',
        'Watching daily.',
        '',
        'Wildlife connection.',
        '',
        'I tell window-having: bird feeder.'
      ],
      lesson: 'Window bird feeder watching daily provides wildlife connection.'
    },
    {
      id: 'sn60_5',
      title: 'My bucket and fish tank',
      narrative: [
        'Fish tank watching.',
        '',
        'Bubbler sound.',
        '',
        'Nervous system softens.',
        '',
        'I tell home-bound: aquarium.'
      ],
      lesson: 'Fish tank watching with bubbler sound softens nervous system.'
    },
    {
      id: 'sn60_6',
      title: 'My bucket and pet therapy visits',
      narrative: [
        'Therapy dog visits.',
        '',
        'Hospital programs.',
        '',
        'Stranger animals comfort.',
        '',
        'I tell pet-loving: therapy dog programs.'
      ],
      lesson: 'Therapy dog visits in hospital programs provide stranger animal comfort.'
    },
    {
      id: 'sn60_7',
      title: 'My bucket and animal shelter',
      narrative: [
        'Animal shelter volunteer.',
        '',
        'Cats and dogs.',
        '',
        'Service plus pets.',
        '',
        'I tell volunteer-curious: animals.'
      ],
      lesson: 'Animal shelter volunteering combines service plus pet presence.'
    },
    {
      id: 'sn60_8',
      title: 'My bucket and horse therapy',
      narrative: [
        'Equine therapy.',
        '',
        'Large animal presence.',
        '',
        'Body mirror.',
        '',
        'I tell experiential: equine.'
      ],
      lesson: 'Equine therapy with large animal presence provides body mirror experience.'
    },
    {
      id: 'sn60_9',
      title: 'My bucket and farm animals',
      narrative: [
        'Farm visits.',
        '',
        'Chickens, goats, pigs.',
        '',
        'Animal community.',
        '',
        'I tell farm-curious: visits.'
      ],
      lesson: 'Farm visits with chickens, goats, pigs reveal animal community.'
    },
    {
      id: 'sn60_10',
      title: 'My bucket and zoo visits',
      narrative: [
        'Zoo or sanctuary visits.',
        '',
        'Wild animals safely.',
        '',
        'Wonder cultivated.',
        '',
        'I tell wildlife-curious: zoo.'
      ],
      lesson: 'Zoo or sanctuary visits provide safe wild animal exposure cultivating wonder.'
    },
    {
      id: 'sn60_11',
      title: 'My bucket and wildlife watching',
      narrative: [
        'Wild bird watching.',
        '',
        'Wild squirrels.',
        '',
        'Backyard wildlife.',
        '',
        'I tell backyard: wildlife.'
      ],
      lesson: 'Wild bird watching and squirrels reveal backyard wildlife.'
    },
    {
      id: 'sn60_12',
      title: 'My bucket and butterfly watching',
      narrative: [
        'Butterfly watching.',
        '',
        'Garden visitors.',
        '',
        'Delicate beauty.',
        '',
        'I tell garden: butterfly watching.'
      ],
      lesson: 'Butterfly watching in garden reveals delicate visitor beauty.'
    },
    {
      id: 'sn60_13',
      title: 'My bucket and bee watching',
      narrative: [
        'Bee watching pollinator garden.',
        '',
        'Industrious work.',
        '',
        'Pollination wonder.',
        '',
        'I tell pollinator-curious: bee watching.'
      ],
      lesson: 'Bee watching in pollinator garden reveals industrious work and pollination wonder.'
    },
    {
      id: 'sn60_14',
      title: 'My bucket and dragonfly watching',
      narrative: [
        'Pond dragonfly watching.',
        '',
        'Iridescent flight.',
        '',
        'Summer beauty.',
        '',
        'I tell pond: dragonfly watching.'
      ],
      lesson: 'Pond dragonfly watching reveals iridescent flight summer beauty.'
    },
    {
      id: 'sn60_15',
      title: 'My bucket and firefly watching',
      narrative: [
        'Firefly evenings.',
        '',
        'Magic of lights.',
        '',
        'Childhood echo.',
        '',
        'I tell firefly-areas: evenings.'
      ],
      lesson: 'Firefly evenings reveal magic of lights echoing childhood.'
    }
  ];

  var STRESS_NARRATIVES_51 = [
    {
      id: 'sn51_1',
      title: 'My bucket and morning gratitude',
      narrative: [
        'Three gratitudes morning.',
        '',
        'Brain shifts.',
        '',
        'Day begins positive.',
        '',
        'I tell mood-stuck: gratitude.'
      ],
      lesson: 'Morning three gratitudes shift brain for positive day beginning.'
    },
    {
      id: 'sn51_2',
      title: 'My bucket and evening gratitude',
      narrative: [
        'Evening gratitude.',
        '',
        'Day reviewed positive.',
        '',
        'Sleep welcomed.',
        '',
        'I tell evening-grateful: review.'
      ],
      lesson: 'Evening gratitude reviewing day positive welcomes sleep.'
    },
    {
      id: 'sn51_3',
      title: 'My bucket and gratitude journal',
      narrative: [
        'Daily gratitude journal.',
        '',
        'Specific entries.',
        '',
        'Brain trained.',
        '',
        'I tell journaling-curious: gratitude journal.'
      ],
      lesson: 'Daily gratitude journal with specific entries trains brain over weeks.'
    },
    {
      id: 'sn51_4',
      title: 'My bucket and gratitude letters',
      narrative: [
        'Monthly gratitude letter.',
        '',
        'Sent or unsent.',
        '',
        'Connection felt.',
        '',
        'I tell connection-seeking: gratitude letters.'
      ],
      lesson: 'Monthly gratitude letters sent or unsent feel connection through acknowledgment.'
    },
    {
      id: 'sn51_5',
      title: 'My bucket and thank you notes',
      narrative: [
        'Handwritten thank yous.',
        '',
        'Recipient and writer benefit.',
        '',
        'Connection deepens.',
        '',
        'I tell connection-builders: thank you notes.'
      ],
      lesson: 'Handwritten thank yous benefit both recipient and writer; connection deepens.'
    },
    {
      id: 'sn51_6',
      title: 'My bucket and gratitude meditation',
      narrative: [
        'Gratitude meditation.',
        '',
        'Each person felt.',
        '',
        'Heart opens.',
        '',
        'I tell heart-closed: gratitude meditation.'
      ],
      lesson: 'Gratitude meditation with each person felt opens heart.'
    },
    {
      id: 'sn51_7',
      title: 'My bucket and gratitude prayers',
      narrative: [
        'Prayers of gratitude.',
        '',
        'Sacred acknowledgment.',
        '',
        'Faith deepens.',
        '',
        'I tell faithful: gratitude prayers.'
      ],
      lesson: 'Gratitude prayers as sacred acknowledgment deepen faith practice.'
    },
    {
      id: 'sn51_8',
      title: 'My bucket and gratitude walks',
      narrative: [
        'Gratitude walks.',
        '',
        'Each step thankful.',
        '',
        'Body and mind shift.',
        '',
        'I tell walking-meditation: gratitude steps.'
      ],
      lesson: 'Gratitude walks with each step thankful shift body and mind together.'
    },
    {
      id: 'sn51_9',
      title: 'My bucket and gratitude awareness',
      narrative: [
        'Day-long gratitude awareness.',
        '',
        'Catching moments.',
        '',
        'Mind trained.',
        '',
        'I tell present-curious: awareness.'
      ],
      lesson: 'Day-long gratitude awareness catching moments trains mind through repetition.'
    },
    {
      id: 'sn51_10',
      title: 'My bucket and small joy notice',
      narrative: [
        'Notice small joys.',
        '',
        'Morning coffee.',
        '',
        'Birdsong.',
        '',
        'Sunlight.',
        '',
        'I tell joy-blind: notice small.'
      ],
      lesson: 'Noticing small joys like morning coffee, birdsong, sunlight trains joyful awareness.'
    },
    {
      id: 'sn51_11',
      title: 'My bucket and three good things',
      narrative: [
        'Three good things daily.',
        '',
        'Specific not general.',
        '',
        'Brain shifts measurably.',
        '',
        'I tell mood-curious: three good.'
      ],
      lesson: 'Three good things daily specific not general shift brain measurably.'
    },
    {
      id: 'sn51_12',
      title: 'My bucket and savoring practice',
      narrative: [
        'Savor positive moments.',
        '',
        'Hold attention.',
        '',
        'Amplify experience.',
        '',
        'I tell rushed-positive: savor.'
      ],
      lesson: 'Savoring positive moments by holding attention amplifies experience.'
    },
    {
      id: 'sn51_13',
      title: 'My bucket and positivity ratio',
      narrative: [
        'Positivity to negativity ratio.',
        '',
        'Track over time.',
        '',
        'Shift achievable.',
        '',
        'I tell negative-stuck: track ratio.'
      ],
      lesson: 'Tracking positivity-to-negativity ratio reveals achievable shift over time.'
    },
    {
      id: 'sn51_14',
      title: 'My bucket and reframe practice',
      narrative: [
        'Reframe daily setbacks.',
        '',
        'Lesson or opportunity.',
        '',
        'Resilience built.',
        '',
        'I tell setback-stuck: reframe.'
      ],
      lesson: 'Reframing daily setbacks as lessons or opportunities builds resilience.'
    },
    {
      id: 'sn51_15',
      title: 'My bucket and benefits finding',
      narrative: [
        'Find hidden benefits.',
        '',
        'Even in stress.',
        '',
        'Perspective expanded.',
        '',
        'I tell stress-stuck: benefits finding.'
      ],
      lesson: 'Finding hidden benefits even in stress expands perspective.'
    }
  ];

  var STRESS_NARRATIVES_52 = [
    {
      id: 'sn52_1',
      title: 'My bucket and self-compassion practice',
      narrative: [
        'Self-compassion daily.',
        '',
        'Kind to self.',
        '',
        'Bucket lighter.',
        '',
        'I tell self-critical: compassion daily.'
      ],
      lesson: 'Daily self-compassion practice with kindness to self makes bucket lighter.'
    },
    {
      id: 'sn52_2',
      title: 'My bucket and inner friend voice',
      narrative: [
        'Imagine speaking to friend.',
        '',
        'Speak that way to self.',
        '',
        'Inner voice softens.',
        '',
        'I tell harsh-inner: friend voice.'
      ],
      lesson: 'Imagining speaking to friend then speaking to self that way softens inner voice.'
    },
    {
      id: 'sn52_3',
      title: 'My bucket and self-hug',
      narrative: [
        'Hug self when stressed.',
        '',
        'Oxytocin release.',
        '',
        'Body soothes.',
        '',
        'I tell touch-deprived: self-hug.'
      ],
      lesson: 'Self-hug when stressed releases oxytocin; body soothes through touch.'
    },
    {
      id: 'sn52_4',
      title: 'My bucket and hand on heart',
      narrative: [
        'Hand on heart.',
        '',
        'Warmth felt.',
        '',
        'Body acknowledged.',
        '',
        'I tell distress-needing: hand heart.'
      ],
      lesson: 'Hand on heart with warmth felt acknowledges body during distress.'
    },
    {
      id: 'sn52_5',
      title: 'My bucket and self-touch',
      narrative: [
        'Self-touch soothing.',
        '',
        'Arms rubbed.',
        '',
        'Back patted.',
        '',
        'I tell touch-stressed: self-touch.'
      ],
      lesson: 'Self-touch soothing with arms rubbed and back patted provides comfort.'
    },
    {
      id: 'sn52_6',
      title: 'My bucket and self-massage',
      narrative: [
        'Self-massage tools.',
        '',
        'Tennis ball back.',
        '',
        'Foam roller legs.',
        '',
        'I tell body-tense: self-massage.'
      ],
      lesson: 'Self-massage tools like tennis balls and foam rollers release body tension.'
    },
    {
      id: 'sn52_7',
      title: 'My bucket and warm drink',
      narrative: [
        'Warm drink in hands.',
        '',
        'Body comforted.',
        '',
        'I tell comfort-needing: warm drink.'
      ],
      lesson: 'Warm drink in hands provides body comfort through warmth.'
    },
    {
      id: 'sn52_8',
      title: 'My bucket and warm bath',
      narrative: [
        'Bath ritual.',
        '',
        'Body enveloped.',
        '',
        'Warmth comfort.',
        '',
        'I tell tense-comfort: bath.'
      ],
      lesson: 'Bath ritual envelops body in warmth comfort.'
    },
    {
      id: 'sn52_9',
      title: 'My bucket and warm shower',
      narrative: [
        'Shower as ritual.',
        '',
        'Body cleansed.',
        '',
        'Stress washed.',
        '',
        'I tell daily-ritual: shower.'
      ],
      lesson: 'Shower as ritual cleanses body and metaphorically washes stress.'
    },
    {
      id: 'sn52_10',
      title: 'My bucket and warm hugs',
      narrative: [
        '20 second hugs.',
        '',
        'Oxytocin release.',
        '',
        'Connection felt.',
        '',
        'I tell touch-deprived: hug.'
      ],
      lesson: 'Twenty-second hugs release oxytocin; connection felt through touch.'
    },
    {
      id: 'sn52_11',
      title: 'My bucket and pet snuggles',
      narrative: [
        'Pet snuggling.',
        '',
        'Body warmth shared.',
        '',
        'Calming chemistry.',
        '',
        'I tell pet-having: snuggles.'
      ],
      lesson: 'Pet snuggling shares body warmth; calming chemistry through animal contact.'
    },
    {
      id: 'sn52_12',
      title: 'My bucket and partner cuddle',
      narrative: [
        'Daily partner cuddle.',
        '',
        'Bonding chemistry.',
        '',
        'Connection maintained.',
        '',
        'I tell partner-bonded: cuddle.'
      ],
      lesson: 'Daily partner cuddles maintain bonding chemistry and connection.'
    },
    {
      id: 'sn52_13',
      title: 'My bucket and child snuggle',
      narrative: [
        'Bedtime child snuggle.',
        '',
        'Connection deep.',
        '',
        'Both buckets drain.',
        '',
        'I tell parents: bedtime snuggle.'
      ],
      lesson: 'Bedtime child snuggle provides deep connection draining both buckets.'
    },
    {
      id: 'sn52_14',
      title: 'My bucket and friend handshake',
      narrative: [
        'Long friend handshakes.',
        '',
        'Connection felt.',
        '',
        'I tell touch-comfortable: handshakes.'
      ],
      lesson: 'Long friend handshakes felt provide connection through touch.'
    },
    {
      id: 'sn52_15',
      title: 'My bucket and touch boundaries',
      narrative: [
        'Touch what feels right.',
        '',
        'Consent always.',
        '',
        'Comfort prioritized.',
        '',
        'I tell touch-sensitive: only consensual.'
      ],
      lesson: 'Touch only what feels right with consent always; comfort prioritized.'
    }
  ];

  var STRESS_NARRATIVES_53 = [
    {
      id: 'sn53_1',
      title: 'My bucket and laughter daily',
      narrative: [
        'Daily laugh source.',
        '',
        'Funny videos.',
        '',
        'Brain chemistry shifts.',
        '',
        'I tell serious: daily laugh.'
      ],
      lesson: 'Daily laugh source through funny videos shifts brain chemistry.'
    },
    {
      id: 'sn53_2',
      title: 'My bucket and humor podcasts',
      narrative: [
        'Comedy podcasts.',
        '',
        'Walking accompaniment.',
        '',
        'Laughter during exercise.',
        '',
        'I tell walking-bored: comedy podcasts.'
      ],
      lesson: 'Comedy podcasts as walking accompaniment add laughter during exercise.'
    },
    {
      id: 'sn53_3',
      title: 'My bucket and comedy specials',
      narrative: [
        'Weekly comedy special.',
        '',
        'Live laughter.',
        '',
        'Body chemistry shifts.',
        '',
        'I tell laughter-curious: comedy specials.'
      ],
      lesson: 'Weekly comedy specials provide live laughter shifting body chemistry.'
    },
    {
      id: 'sn53_4',
      title: 'My bucket and stand-up shows',
      narrative: [
        'Live stand-up shows.',
        '',
        'Group laughter.',
        '',
        'Community joy.',
        '',
        'I tell live-laughter: stand-up.'
      ],
      lesson: 'Live stand-up shows provide group community laughter joy.'
    },
    {
      id: 'sn53_5',
      title: 'My bucket and joke books',
      narrative: [
        'Joke books bathroom.',
        '',
        'Daily laugh.',
        '',
        'Mood lifter.',
        '',
        'I tell mood-stuck: joke books.'
      ],
      lesson: 'Joke books in bathroom provide daily mood-lifting laugh.'
    },
    {
      id: 'sn53_6',
      title: 'My bucket and dad jokes',
      narrative: [
        'Dad joke a day.',
        '',
        'Cheesy humor.',
        '',
        'Family laughter.',
        '',
        'I tell parents: dad jokes.'
      ],
      lesson: 'Daily dad jokes provide cheesy humor and family laughter ritual.'
    },
    {
      id: 'sn53_7',
      title: 'My bucket and puns',
      narrative: [
        'Pun appreciation.',
        '',
        'Word play.',
        '',
        'Mind delighted.',
        '',
        'I tell language-curious: puns.'
      ],
      lesson: 'Pun appreciation through word play delights mind.'
    },
    {
      id: 'sn53_8',
      title: 'My bucket and absurdist humor',
      narrative: [
        'Absurdist humor.',
        '',
        'Reality questioned.',
        '',
        'Mind opens.',
        '',
        'I tell rational-stuck: absurdist humor.'
      ],
      lesson: 'Absurdist humor questions reality and opens mind.'
    },
    {
      id: 'sn53_9',
      title: 'My bucket and slapstick',
      narrative: [
        'Slapstick comedy.',
        '',
        'Physical humor.',
        '',
        'Body laughs.',
        '',
        'I tell heady-stressed: slapstick.'
      ],
      lesson: 'Slapstick comedy physical humor makes body laugh.'
    },
    {
      id: 'sn53_10',
      title: 'My bucket and improv',
      narrative: [
        'Improv classes.',
        '',
        'Play in adults.',
        '',
        'Community plus laughter.',
        '',
        'I tell adult-too-serious: improv class.'
      ],
      lesson: 'Improv classes provide adult play, community, laughter combined.'
    },
    {
      id: 'sn53_11',
      title: 'My bucket and laughter yoga',
      narrative: [
        'Laughter yoga class.',
        '',
        'Forced laughter real.',
        '',
        'Body responds.',
        '',
        'I tell skeptical: laughter yoga research.'
      ],
      lesson: 'Laughter yoga forced laughter becomes real; body responds; research-backed.'
    },
    {
      id: 'sn53_12',
      title: 'My bucket and silly walks',
      narrative: [
        'Monty Python silly walk.',
        '',
        'Privately practiced.',
        '',
        'Self-laughter.',
        '',
        'I tell self-laughter-seeking: silly walks.'
      ],
      lesson: 'Privately practiced silly walks like Monty Python produce self-laughter.'
    },
    {
      id: 'sn53_13',
      title: 'My bucket and silly faces',
      narrative: [
        'Silly faces in mirror.',
        '',
        'Self-amusement.',
        '',
        'Mood lifts.',
        '',
        'I tell mood-stuck: mirror silly.'
      ],
      lesson: 'Silly faces in mirror self-amuse and lift mood.'
    },
    {
      id: 'sn53_14',
      title: 'My bucket and cartoon time',
      narrative: [
        'Childrens cartoons.',
        '',
        'Adult enjoyment.',
        '',
        'Inner child plays.',
        '',
        'I tell adult-too-serious: cartoons.'
      ],
      lesson: 'Childrens cartoons for adult enjoyment let inner child play.'
    },
    {
      id: 'sn53_15',
      title: 'My bucket and funny shows binge',
      narrative: [
        'Weekly funny show.',
        '',
        'Sitcom comfort.',
        '',
        'Familiar laughs.',
        '',
        'I tell comfort-seeking: funny shows.'
      ],
      lesson: 'Weekly funny show sitcom comfort with familiar laughs provides comfort.'
    }
  ];

  var STRESS_NARRATIVES_54 = [
    {
      id: 'sn54_1',
      title: 'My bucket and creative practice daily',
      narrative: [
        'Creative time daily.',
        '',
        'Even 20 min.',
        '',
        'Expression released.',
        '',
        'I tell creative-blocked: 20 min daily.'
      ],
      lesson: 'Daily 20-minute creative time releases expression for blocked creativity.'
    },
    {
      id: 'sn54_2',
      title: 'My bucket and morning pages',
      narrative: [
        'Three pages morning.',
        '',
        'Stream of consciousness.',
        '',
        'Bucket externalized.',
        '',
        'I tell journaling-curious: morning pages.'
      ],
      lesson: 'Three morning pages stream of consciousness externalize bucket before day.'
    },
    {
      id: 'sn54_3',
      title: 'My bucket and artist date',
      narrative: [
        'Weekly artist date.',
        '',
        'Solo creative outing.',
        '',
        'Inspiration filled.',
        '',
        'I tell creative-stuck: artist date.'
      ],
      lesson: 'Weekly artist date solo creative outing fills inspiration.'
    },
    {
      id: 'sn54_4',
      title: 'My bucket and sketching',
      narrative: [
        'Daily sketching practice.',
        '',
        'Hands engaged.',
        '',
        'Visual mind.',
        '',
        'I tell visual-curious: daily sketch.'
      ],
      lesson: 'Daily sketching practice engages hands and visual mind.'
    },
    {
      id: 'sn54_5',
      title: 'My bucket and painting',
      narrative: [
        'Weekly painting.',
        '',
        'Color absorbed.',
        '',
        'Mind quieted.',
        '',
        'I tell color-curious: weekly paint.'
      ],
      lesson: 'Weekly painting absorbs color and quiets mind.'
    },
    {
      id: 'sn54_6',
      title: 'My bucket and pottery',
      narrative: [
        'Weekly pottery class.',
        '',
        'Hands in clay.',
        '',
        'Body absorbed.',
        '',
        'I tell tactile-curious: pottery.'
      ],
      lesson: 'Weekly pottery class with hands in clay absorbs body in tactile work.'
    },
    {
      id: 'sn54_7',
      title: 'My bucket and weaving',
      narrative: [
        'Weaving practice.',
        '',
        'Rhythmic motion.',
        '',
        'Meditative work.',
        '',
        'I tell rhythm-curious: weaving.'
      ],
      lesson: 'Weaving practice with rhythmic motion provides meditative work.'
    },
    {
      id: 'sn54_8',
      title: 'My bucket and knitting',
      narrative: [
        'Knitting evenings.',
        '',
        'Hands busy.',
        '',
        'Mind eased.',
        '',
        'I tell evening-anxious: knitting.'
      ],
      lesson: 'Evening knitting keeps hands busy and eases mind.'
    },
    {
      id: 'sn54_9',
      title: 'My bucket and crochet',
      narrative: [
        'Crochet hobby.',
        '',
        'Portable.',
        '',
        'Hands moving.',
        '',
        'I tell portable-craft: crochet.'
      ],
      lesson: 'Crochet hobby portable with hands moving anywhere.'
    },
    {
      id: 'sn54_10',
      title: 'My bucket and embroidery',
      narrative: [
        'Embroidery hoops.',
        '',
        'Detail work absorbing.',
        '',
        'Patience cultivated.',
        '',
        'I tell detail-curious: embroidery.'
      ],
      lesson: 'Embroidery hoop detail work absorbs and cultivates patience.'
    },
    {
      id: 'sn54_11',
      title: 'My bucket and quilting',
      narrative: [
        'Quilting project.',
        '',
        'Long-term creation.',
        '',
        'Heirloom made.',
        '',
        'I tell long-project: quilting.'
      ],
      lesson: 'Quilting projects long-term creation make heirlooms.'
    },
    {
      id: 'sn54_12',
      title: 'My bucket and bookbinding',
      narrative: [
        'Bookbinding craft.',
        '',
        'Hands detail work.',
        '',
        'Beautiful objects.',
        '',
        'I tell book-loving: bookbinding.'
      ],
      lesson: 'Bookbinding craft with hand detail work produces beautiful objects.'
    },
    {
      id: 'sn54_13',
      title: 'My bucket and calligraphy',
      narrative: [
        'Calligraphy practice.',
        '',
        'Slow letter forms.',
        '',
        'Beauty cultivated.',
        '',
        'I tell letter-curious: calligraphy.'
      ],
      lesson: 'Calligraphy practice slow letter forms cultivates beauty.'
    },
    {
      id: 'sn54_14',
      title: 'My bucket and woodworking',
      narrative: [
        'Garage woodworking.',
        '',
        'Tools and wood.',
        '',
        'Hands engaged.',
        '',
        'I tell tool-curious: woodworking.'
      ],
      lesson: 'Garage woodworking with tools and wood engages hands.'
    },
    {
      id: 'sn54_15',
      title: 'My bucket and metalworking',
      narrative: [
        'Metalworking studio.',
        '',
        'Fire and metal.',
        '',
        'Intense focus.',
        '',
        'I tell intense-craft: metalworking.'
      ],
      lesson: 'Metalworking studio with fire and metal requires intense focus.'
    }
  ];

  var STRESS_NARRATIVES_55 = [
    {
      id: 'sn55_1',
      title: 'My bucket and gardening practice',
      narrative: [
        'Daily garden tending.',
        '',
        'Hands in soil.',
        '',
        'Earth connection.',
        '',
        'I tell soil-curious: gardening.'
      ],
      lesson: 'Daily garden tending with hands in soil provides Earth connection.'
    },
    {
      id: 'sn55_2',
      title: 'My bucket and vegetable garden',
      narrative: [
        'Vegetable garden backyard.',
        '',
        'Food grown.',
        '',
        'Connection plus nutrition.',
        '',
        'I tell food-curious: vegetable garden.'
      ],
      lesson: 'Backyard vegetable garden provides food grown plus connection plus nutrition.'
    },
    {
      id: 'sn55_3',
      title: 'My bucket and flower garden',
      narrative: [
        'Flower garden colors.',
        '',
        'Beauty cultivated.',
        '',
        'Daily delight.',
        '',
        'I tell beauty-seeking: flower garden.'
      ],
      lesson: 'Flower garden cultivates colors and beauty for daily delight.'
    },
    {
      id: 'sn55_4',
      title: 'My bucket and herb garden',
      narrative: [
        'Herb garden kitchen.',
        '',
        'Fresh herbs daily.',
        '',
        'Cooking enhanced.',
        '',
        'I tell cooking-curious: herb garden.'
      ],
      lesson: 'Kitchen herb garden provides fresh herbs daily enhancing cooking.'
    },
    {
      id: 'sn55_5',
      title: 'My bucket and indoor plants',
      narrative: [
        'House plants throughout.',
        '',
        'Green presence.',
        '',
        'Air quality.',
        '',
        'I tell apartment-dwellers: house plants.'
      ],
      lesson: 'House plants throughout provide green presence and air quality.'
    },
    {
      id: 'sn55_6',
      title: 'My bucket and orchid collection',
      narrative: [
        'Orchid care.',
        '',
        'Detailed plant attention.',
        '',
        'Bloom rewards.',
        '',
        'I tell plant-curious: orchids.'
      ],
      lesson: 'Orchid care provides detailed plant attention with bloom rewards.'
    },
    {
      id: 'sn55_7',
      title: 'My bucket and succulent garden',
      narrative: [
        'Succulent collection.',
        '',
        'Low maintenance.',
        '',
        'Beauty without burden.',
        '',
        'I tell beginner-plants: succulents.'
      ],
      lesson: 'Succulent collections low maintenance provide beauty without burden for beginners.'
    },
    {
      id: 'sn55_8',
      title: 'My bucket and bonsai practice',
      narrative: [
        'Bonsai practice.',
        '',
        'Patient cultivation.',
        '',
        'Long-term project.',
        '',
        'I tell patient-curious: bonsai.'
      ],
      lesson: 'Bonsai practice patient cultivation as long-term project.'
    },
    {
      id: 'sn55_9',
      title: 'My bucket and butterfly garden',
      narrative: [
        'Butterfly attracting plants.',
        '',
        'Visitors welcomed.',
        '',
        'Daily wildlife.',
        '',
        'I tell butterfly-curious: garden.'
      ],
      lesson: 'Butterfly-attracting plants welcome visitors for daily wildlife.'
    },
    {
      id: 'sn55_10',
      title: 'My bucket and bird-friendly garden',
      narrative: [
        'Native plants for birds.',
        '',
        'Habitat created.',
        '',
        'Bird-watching from porch.',
        '',
        'I tell bird-loving: native garden.'
      ],
      lesson: 'Native plants for birds create habitat enabling porch bird-watching.'
    },
    {
      id: 'sn55_11',
      title: 'My bucket and pollinator garden',
      narrative: [
        'Pollinator-friendly plants.',
        '',
        'Bees welcomed.',
        '',
        'Ecosystem supported.',
        '',
        'I tell ecology-curious: pollinator.'
      ],
      lesson: 'Pollinator-friendly plants welcome bees and support ecosystem.'
    },
    {
      id: 'sn55_12',
      title: 'My bucket and compost practice',
      narrative: [
        'Backyard composting.',
        '',
        'Waste reduced.',
        '',
        'Soil enriched.',
        '',
        'I tell ecology-curious: compost.'
      ],
      lesson: 'Backyard composting reduces waste and enriches soil.'
    },
    {
      id: 'sn55_13',
      title: 'My bucket and seasonal harvesting',
      narrative: [
        'Seasonal harvesting.',
        '',
        'Foods preserved.',
        '',
        'Pantry stocked.',
        '',
        'I tell preserving-curious: seasonal harvest.'
      ],
      lesson: 'Seasonal harvesting preserves foods and stocks pantry.'
    },
    {
      id: 'sn55_14',
      title: 'My bucket and seed saving',
      narrative: [
        'Heirloom seed saving.',
        '',
        'Generational continuity.',
        '',
        'Biodiversity preserved.',
        '',
        'I tell heritage-curious: seed saving.'
      ],
      lesson: 'Heirloom seed saving provides generational continuity and biodiversity.'
    },
    {
      id: 'sn55_15',
      title: 'My bucket and forest gardening',
      narrative: [
        'Forest garden food system.',
        '',
        'Permaculture principles.',
        '',
        'Long-term sustainable.',
        '',
        'I tell sustainability-curious: forest gardening.'
      ],
      lesson: 'Forest garden food systems with permaculture principles provide long-term sustainability.'
    }
  ];

  var STRESS_NARRATIVES_46 = [
    {
      id: 'sn46_1',
      title: 'My bucket and partner support practice',
      narrative: [
        'Weekly check-in.',
        '',
        'Both buckets reviewed.',
        '',
        'Mutual support.',
        '',
        'I tell partnered: weekly mutual.'
      ],
      lesson: 'Weekly partner check-ins review both buckets for mutual support.'
    },
    {
      id: 'sn46_2',
      title: 'My bucket and family meeting',
      narrative: [
        'Weekly family meeting.',
        '',
        'Each shares bucket.',
        '',
        'Family system aware.',
        '',
        'I tell families: weekly meeting.'
      ],
      lesson: 'Weekly family meetings with bucket sharing build family system awareness.'
    },
    {
      id: 'sn46_3',
      title: 'My bucket and child check-in',
      narrative: [
        'Daily child check-in.',
        '',
        'How is your bucket?',
        '',
        'Common vocabulary.',
        '',
        'I tell parents: daily child check.'
      ],
      lesson: 'Daily child check-ins with bucket vocabulary build common family language.'
    },
    {
      id: 'sn46_4',
      title: 'My bucket and teen check-in',
      narrative: [
        'Weekly teen check-in.',
        '',
        'Bucket plus week plan.',
        '',
        'Connection maintained.',
        '',
        'I tell teen parents: weekly check.'
      ],
      lesson: 'Weekly teen check-ins with bucket and plan maintain connection.'
    },
    {
      id: 'sn46_5',
      title: 'My bucket and elder parent check-in',
      narrative: [
        'Weekly elder parent call.',
        '',
        'Bucket plus health check.',
        '',
        'Connection plus safety.',
        '',
        'I tell adult children: weekly call.'
      ],
      lesson: 'Weekly elder parent calls with bucket and health check ensure connection plus safety.'
    },
    {
      id: 'sn46_6',
      title: 'My bucket and sibling check-in',
      narrative: [
        'Sibling check-in monthly.',
        '',
        'Connection maintained.',
        '',
        'Mutual support.',
        '',
        'I tell siblings: monthly check.'
      ],
      lesson: 'Monthly sibling check-ins maintain connection and mutual support.'
    },
    {
      id: 'sn46_7',
      title: 'My bucket and best friend check-in',
      narrative: [
        'Weekly best friend call.',
        '',
        'Bucket reviewed together.',
        '',
        'Deep support.',
        '',
        'I tell friend-deep: weekly best call.'
      ],
      lesson: 'Weekly best friend calls reviewing bucket together provide deep support.'
    },
    {
      id: 'sn46_8',
      title: 'My bucket and therapist check-in',
      narrative: [
        'Weekly therapy.',
        '',
        'Bucket level reviewed.',
        '',
        'Adjustments planned.',
        '',
        'I tell therapy-utilizing: weekly.'
      ],
      lesson: 'Weekly therapy reviews bucket level and plans adjustments.'
    },
    {
      id: 'sn46_9',
      title: 'My bucket and support group check-in',
      narrative: [
        'Weekly support group.',
        '',
        'Bucket shared.',
        '',
        'Community supports.',
        '',
        'I tell group-curious: weekly support.'
      ],
      lesson: 'Weekly support group with shared bucket provides community support.'
    },
    {
      id: 'sn46_10',
      title: 'My bucket and mentor check-in',
      narrative: [
        'Monthly mentor call.',
        '',
        'Big picture review.',
        '',
        'Wisdom shared.',
        '',
        'I tell mentee: monthly mentor.'
      ],
      lesson: 'Monthly mentor calls review big picture with shared wisdom.'
    },
    {
      id: 'sn46_11',
      title: 'My bucket and coach check-in',
      narrative: [
        'Weekly coach.',
        '',
        'Action plan reviewed.',
        '',
        'Accountability.',
        '',
        'I tell coach-working: weekly coach.'
      ],
      lesson: 'Weekly coach calls review action plan with accountability.'
    },
    {
      id: 'sn46_12',
      title: 'My bucket and spiritual director',
      narrative: [
        'Monthly spiritual director.',
        '',
        'Soul journey.',
        '',
        'Direction discerned.',
        '',
        'I tell faith-deepening: spiritual director.'
      ],
      lesson: 'Monthly spiritual director sessions discern soul journey direction.'
    },
    {
      id: 'sn46_13',
      title: 'My bucket and accountability partner',
      narrative: [
        'Weekly accountability call.',
        '',
        'Goals plus follow-through.',
        '',
        'Both supported.',
        '',
        'I tell goal-bound: accountability.'
      ],
      lesson: 'Weekly accountability partner calls support goals plus follow-through.'
    },
    {
      id: 'sn46_14',
      title: 'My bucket and writing group',
      narrative: [
        'Weekly writing group.',
        '',
        'Voice supported.',
        '',
        'Community of writers.',
        '',
        'I tell writers: weekly group.'
      ],
      lesson: 'Weekly writing groups support voice through community of writers.'
    },
    {
      id: 'sn46_15',
      title: 'My bucket and art group',
      narrative: [
        'Weekly art group.',
        '',
        'Creative community.',
        '',
        'Practice supported.',
        '',
        'I tell artists: weekly art group.'
      ],
      lesson: 'Weekly art groups provide creative community supporting practice.'
    }
  ];

  var STRESS_NARRATIVES_47 = [
    {
      id: 'sn47_1',
      title: 'My bucket and digital boundary 9pm',
      narrative: [
        '9pm digital off.',
        '',
        'Phone in another room.',
        '',
        'Bucket recovers.',
        '',
        'I tell device-tethered: 9pm off.'
      ],
      lesson: '9pm digital off with phone in another room allows bucket recovery overnight.'
    },
    {
      id: 'sn47_2',
      title: 'My bucket and morning digital delay',
      narrative: [
        'No phone first hour.',
        '',
        'Morning routine protected.',
        '',
        'Inflow delayed.',
        '',
        'I tell morning-scrollers: hour delay.'
      ],
      lesson: 'No phone first hour delays inflow and protects morning routine.'
    },
    {
      id: 'sn47_3',
      title: 'My bucket and notification audit',
      narrative: [
        'Weekly notification audit.',
        '',
        'Each one questioned.',
        '',
        'Most disabled.',
        '',
        'I tell notification-heavy: audit.'
      ],
      lesson: 'Weekly notification audit questions each notification; most disabled to reduce inflow.'
    },
    {
      id: 'sn47_4',
      title: 'My bucket and app deletion',
      narrative: [
        'Apps deleted regularly.',
        '',
        'Time-wasters removed.',
        '',
        'Bucket recovers.',
        '',
        'I tell app-heavy: delete some.'
      ],
      lesson: 'Regular app deletion of time-wasters allows bucket recovery.'
    },
    {
      id: 'sn47_5',
      title: 'My bucket and email folder management',
      narrative: [
        'Inbox zero practice.',
        '',
        'Email organized.',
        '',
        'Mental load reduced.',
        '',
        'I tell inbox-stressed: zero practice.'
      ],
      lesson: 'Inbox zero practice organizes email and reduces mental load.'
    },
    {
      id: 'sn47_6',
      title: 'My bucket and email batching',
      narrative: [
        'Three email times.',
        '',
        '9am, 1pm, 4pm.',
        '',
        'Bucket protected.',
        '',
        'I tell email-anxious: batching.'
      ],
      lesson: 'Three-times-daily email batching at 9am, 1pm, 4pm protects bucket from constant inflow.'
    },
    {
      id: 'sn47_7',
      title: 'My bucket and unsubscribe practice',
      narrative: [
        'Weekly unsubscribe.',
        '',
        'Email lists reduced.',
        '',
        'Inflow lighter.',
        '',
        'I tell email-heavy: unsubscribe.'
      ],
      lesson: 'Weekly unsubscribe practice reduces email lists and lightens inflow.'
    },
    {
      id: 'sn47_8',
      title: 'My bucket and social media deletion',
      narrative: [
        'One platform at a time.',
        '',
        'Tested deletion.',
        '',
        'Bucket measured.',
        '',
        'I tell platform-stressed: test delete.'
      ],
      lesson: 'Test platform deletion one at a time measures bucket impact.'
    },
    {
      id: 'sn47_9',
      title: 'My bucket and news limit',
      narrative: [
        'Weekly news only.',
        '',
        'Print summary preferred.',
        '',
        'Doom scroll stopped.',
        '',
        'I tell news-anxious: weekly print.'
      ],
      lesson: 'Weekly print news only stops doom scrolling daily inflow.'
    },
    {
      id: 'sn47_10',
      title: 'My bucket and Sunday paper',
      narrative: [
        'Sunday paper only.',
        '',
        'Slow news.',
        '',
        'Considered consumption.',
        '',
        'I tell news-overwhelmed: Sunday only.'
      ],
      lesson: 'Sunday paper only provides slow news consumption considered weekly.'
    },
    {
      id: 'sn47_11',
      title: 'My bucket and dumb phone trial',
      narrative: [
        'Switched to dumb phone.',
        '',
        'Inflow stopped.',
        '',
        'Bucket recovered.',
        '',
        'I tell smartphone-stressed: dumb phone.'
      ],
      lesson: 'Switching to dumb phone stops inflow and allows bucket recovery.'
    },
    {
      id: 'sn47_12',
      title: 'My bucket and grayscale phone',
      narrative: [
        'Grayscale enabled.',
        '',
        'Less stimulating.',
        '',
        'Bucket inflow reduced.',
        '',
        'I tell colorful-anxious: grayscale.'
      ],
      lesson: 'Grayscale phone reduces stimulation and bucket inflow.'
    },
    {
      id: 'sn47_13',
      title: 'My bucket and home screen reduction',
      narrative: [
        'Apps off home screen.',
        '',
        'Reduced visual inflow.',
        '',
        'Bucket lighter.',
        '',
        'I tell phone-cluttered: clean home.'
      ],
      lesson: 'Apps off home screen reduce visual inflow and lighten bucket.'
    },
    {
      id: 'sn47_14',
      title: 'My bucket and one screen at a time',
      narrative: [
        'One screen practice.',
        '',
        'No second screen.',
        '',
        'Focus preserved.',
        '',
        'I tell multitasking: one screen.'
      ],
      lesson: 'One screen at a time practice preserves focus and reduces bucket scatter.'
    },
    {
      id: 'sn47_15',
      title: 'My bucket and analog hours',
      narrative: [
        'Analog hours weekly.',
        '',
        'Book, pen, paper.',
        '',
        'Bucket recovers.',
        '',
        'I tell digital-bound: analog hours.'
      ],
      lesson: 'Weekly analog hours with book, pen, paper allow bucket recovery from digital.'
    }
  ];

  var STRESS_NARRATIVES_48 = [
    {
      id: 'sn48_1',
      title: 'My bucket and house declutter',
      narrative: [
        'Monthly declutter session.',
        '',
        'One area at a time.',
        '',
        'Less maintenance inflow.',
        '',
        'I tell clutter-stressed: monthly.'
      ],
      lesson: 'Monthly declutter sessions one area at a time reduce maintenance inflow.'
    },
    {
      id: 'sn48_2',
      title: 'My bucket and kitchen declutter',
      narrative: [
        'Kitchen counter clear.',
        '',
        'Visual inflow reduced.',
        '',
        'Cooking easier.',
        '',
        'I tell cluttered-kitchen: clear counter.'
      ],
      lesson: 'Clear kitchen counter reduces visual inflow and makes cooking easier.'
    },
    {
      id: 'sn48_3',
      title: 'My bucket and bedroom declutter',
      narrative: [
        'Bedroom for sleep.',
        '',
        'No clutter.',
        '',
        'Sleep supported.',
        '',
        'I tell sleep-anxious: clear bedroom.'
      ],
      lesson: 'Bedroom clutter-free supports sleep through visual quietness.'
    },
    {
      id: 'sn48_4',
      title: 'My bucket and closet declutter',
      narrative: [
        'Capsule wardrobe.',
        '',
        'Fewer options.',
        '',
        'Daily decisions reduced.',
        '',
        'I tell decision-stressed: capsule.'
      ],
      lesson: 'Capsule wardrobe with fewer options reduces daily decision inflow.'
    },
    {
      id: 'sn48_5',
      title: 'My bucket and digital declutter',
      narrative: [
        'Files organized.',
        '',
        'Email folders sorted.',
        '',
        'Mental load reduced.',
        '',
        'I tell digitally-cluttered: organize.'
      ],
      lesson: 'Digital declutter with organized files and folders reduces mental load.'
    },
    {
      id: 'sn48_6',
      title: 'My bucket and donation regular',
      narrative: [
        'Monthly donation pile.',
        '',
        'Things leaving.',
        '',
        'Home lighter.',
        '',
        'I tell collector-stressed: monthly donate.'
      ],
      lesson: 'Monthly donation piles with things leaving make home lighter.'
    },
    {
      id: 'sn48_7',
      title: 'My bucket and one in one out',
      narrative: [
        'One in one out rule.',
        '',
        'New thing means donate one.',
        '',
        'Stable inventory.',
        '',
        'I tell accumulating: one in one out.'
      ],
      lesson: 'One in one out rule maintains stable inventory through pairing additions with donations.'
    },
    {
      id: 'sn48_8',
      title: 'My bucket and Marie Kondo method',
      narrative: [
        'KonMari method.',
        '',
        'Joy spark test.',
        '',
        'Things keep or go.',
        '',
        'I tell method-curious: KonMari.'
      ],
      lesson: 'KonMari method joy spark test enables clear keep-or-go decisions.'
    },
    {
      id: 'sn48_9',
      title: 'My bucket and Swedish death cleaning',
      narrative: [
        'Death cleaning practice.',
        '',
        'Prepare possessions.',
        '',
        'Burden reduced.',
        '',
        'I tell aging-aware: death cleaning.'
      ],
      lesson: 'Swedish death cleaning prepares possessions to reduce future burden on family.'
    },
    {
      id: 'sn48_10',
      title: 'My bucket and minimalist test',
      narrative: [
        '30 day minimalist challenge.',
        '',
        'Remove daily.',
        '',
        'Bucket lighter.',
        '',
        'I tell minimalism-curious: 30-day test.'
      ],
      lesson: '30-day minimalist challenge removing daily makes bucket lighter through subtraction.'
    },
    {
      id: 'sn48_11',
      title: 'My bucket and seasonal closet rotation',
      narrative: [
        'Seasonal clothes rotated.',
        '',
        'Out of sight stored.',
        '',
        'Visual inflow reduced.',
        '',
        'I tell cluttered-closet: rotation.'
      ],
      lesson: 'Seasonal closet rotation with out-of-season storage reduces visual inflow.'
    },
    {
      id: 'sn48_12',
      title: 'My bucket and paper management',
      narrative: [
        'Paper handled once.',
        '',
        'File, recycle, or act.',
        '',
        'No piles.',
        '',
        'I tell paper-cluttered: handle once.'
      ],
      lesson: 'Paper handled once filed, recycled, or acted on prevents pile accumulation.'
    },
    {
      id: 'sn48_13',
      title: 'My bucket and bag emptying',
      narrative: [
        'Daily bag empty.',
        '',
        'Items returned to homes.',
        '',
        'Tomorrow ready.',
        '',
        'I tell bag-cluttered: daily empty.'
      ],
      lesson: 'Daily bag emptying with items returned home prepares tomorrow.'
    },
    {
      id: 'sn48_14',
      title: 'My bucket and clean before leaving',
      narrative: [
        'Reset spaces before leaving.',
        '',
        'Return to order.',
        '',
        'Welcome home.',
        '',
        'I tell return-stressed: reset.'
      ],
      lesson: 'Resetting spaces before leaving creates welcoming order on return.'
    },
    {
      id: 'sn48_15',
      title: 'My bucket and 10-minute tidying',
      narrative: [
        'Nightly 10 min tidy.',
        '',
        'Home maintained.',
        '',
        'Morning calm.',
        '',
        'I tell evening-tired: 10 min only.'
      ],
      lesson: 'Nightly 10-minute tidying maintains home for calm mornings.'
    }
  ];

  var STRESS_NARRATIVES_49 = [
    {
      id: 'sn49_1',
      title: 'My bucket and weekly planning',
      narrative: [
        'Sunday weekly plan.',
        '',
        'Week mapped.',
        '',
        'Week starts focused.',
        '',
        'I tell scattered-weeks: Sunday plan.'
      ],
      lesson: 'Sunday weekly planning maps week for focused start.'
    },
    {
      id: 'sn49_2',
      title: 'My bucket and daily planning',
      narrative: [
        'Morning daily plan.',
        '',
        'Three priorities.',
        '',
        'Day focused.',
        '',
        'I tell unfocused-days: morning three.'
      ],
      lesson: 'Morning daily plan with three priorities focuses day.'
    },
    {
      id: 'sn49_3',
      title: 'My bucket and rule of three',
      narrative: [
        'Three things daily.',
        '',
        'Three things weekly.',
        '',
        'Manageable scope.',
        '',
        'I tell overcommitted: rule of three.'
      ],
      lesson: 'Rule of three for daily and weekly priorities provides manageable scope.'
    },
    {
      id: 'sn49_4',
      title: 'My bucket and time blocking calendar',
      narrative: [
        'Calendar time blocks.',
        '',
        'Each task scheduled.',
        '',
        'Hidden tasks visible.',
        '',
        'I tell calendar-curious: time blocking.'
      ],
      lesson: 'Time blocking calendar with each task scheduled makes hidden tasks visible.'
    },
    {
      id: 'sn49_5',
      title: 'My bucket and theme days',
      narrative: [
        'Theme each day.',
        '',
        'Monday admin.',
        '',
        'Tuesday creative.',
        '',
        'Context-switching reduced.',
        '',
        'I tell switching-tired: theme days.'
      ],
      lesson: 'Theme days reduce context switching through dedicated focus areas.'
    },
    {
      id: 'sn49_6',
      title: 'My bucket and batching tasks',
      narrative: [
        'Similar tasks batched.',
        '',
        'Email batch.',
        '',
        'Calls batch.',
        '',
        'Focus preserved.',
        '',
        'I tell context-switching: batching.'
      ],
      lesson: 'Task batching groups similar tasks; focus preserved through reduced switching.'
    },
    {
      id: 'sn49_7',
      title: 'My bucket and morning priority',
      narrative: [
        'Most important task first.',
        '',
        'Morning energy used.',
        '',
        'Day momentum built.',
        '',
        'I tell procrastinating: morning priority.'
      ],
      lesson: 'Most important task first in morning uses peak energy and builds momentum.'
    },
    {
      id: 'sn49_8',
      title: 'My bucket and eat the frog',
      narrative: [
        'Hardest thing first.',
        '',
        'Rest of day easier.',
        '',
        'I tell avoidant: eat the frog.'
      ],
      lesson: 'Hardest thing first makes rest of day easier; eat the frog principle.'
    },
    {
      id: 'sn49_9',
      title: 'My bucket and Pareto principle',
      narrative: [
        '80/20 rule.',
        '',
        'High impact tasks identified.',
        '',
        'Bucket focused.',
        '',
        'I tell scattered-effort: 80/20.'
      ],
      lesson: 'Pareto 80/20 principle identifies high-impact tasks for focused effort.'
    },
    {
      id: 'sn49_10',
      title: 'My bucket and Eisenhower matrix',
      narrative: [
        'Urgent vs important.',
        '',
        'Matrix used daily.',
        '',
        'Clarity built.',
        '',
        'I tell overwhelmed: Eisenhower matrix.'
      ],
      lesson: 'Eisenhower matrix urgent vs important provides daily clarity on priorities.'
    },
    {
      id: 'sn49_11',
      title: 'My bucket and pomodoro technique',
      narrative: [
        '25 min focus.',
        '',
        '5 min break.',
        '',
        'Cycles built.',
        '',
        'I tell focus-stressed: pomodoro.'
      ],
      lesson: 'Pomodoro technique 25 min focus 5 min break builds sustainable cycles.'
    },
    {
      id: 'sn49_12',
      title: 'My bucket and deep work blocks',
      narrative: [
        '2-hour deep work.',
        '',
        'No interruption.',
        '',
        'Flow state.',
        '',
        'I tell shallow-work: deep blocks.'
      ],
      lesson: 'Two-hour deep work blocks without interruption enable flow state.'
    },
    {
      id: 'sn49_13',
      title: 'My bucket and one big task',
      narrative: [
        'One big thing daily.',
        '',
        'Rest is bonus.',
        '',
        'Manageable.',
        '',
        'I tell overwhelmed: one big.'
      ],
      lesson: 'One big task daily with rest as bonus provides manageable scope.'
    },
    {
      id: 'sn49_14',
      title: 'My bucket and shutdown ritual',
      narrative: [
        'End of work shutdown.',
        '',
        'Tomorrow list made.',
        '',
        'Mind released.',
        '',
        'I tell work-bleed: shutdown ritual.'
      ],
      lesson: 'End of work shutdown ritual with tomorrow list releases mind from work bleed.'
    },
    {
      id: 'sn49_15',
      title: 'My bucket and shutdown phrase',
      narrative: [
        'Spoken shutdown phrase.',
        '',
        'Work complete for day.',
        '',
        'Brain releases.',
        '',
        'I tell mental-bleed: spoken phrase.'
      ],
      lesson: 'Spoken shutdown phrase like work complete for day releases brain from work bleed.'
    }
  ];

  var STRESS_NARRATIVES_50 = [
    {
      id: 'sn50_1',
      title: 'My bucket integrated over years',
      narrative: [
        'Years of practice.',
        '',
        'Bucket awareness integrated.',
        '',
        'Daily second nature.',
        '',
        'I tell beginners: integration possible.'
      ],
      lesson: 'Years of practice integrate bucket awareness into daily second nature.'
    },
    {
      id: 'sn50_2',
      title: 'My bucket and life-long practice',
      narrative: [
        'Lifelong practice.',
        '',
        'Not destination.',
        '',
        'Daily renewal.',
        '',
        'I tell stress-curious: lifelong.'
      ],
      lesson: 'Bucket management is lifelong practice not destination; daily renewal.'
    },
    {
      id: 'sn50_3',
      title: 'My bucket recovery community',
      narrative: [
        'Recovery community.',
        '',
        'Others on path.',
        '',
        'Shared experience.',
        '',
        'I tell isolated: recovery community.'
      ],
      lesson: 'Recovery community of others on stress management path provides shared experience.'
    },
    {
      id: 'sn50_4',
      title: 'My bucket teaches my children',
      narrative: [
        'Children learn bucket.',
        '',
        'Common vocabulary.',
        '',
        'Generational skill.',
        '',
        'I tell parents: teach children.'
      ],
      lesson: 'Teaching bucket vocabulary to children creates generational stress management skill.'
    },
    {
      id: 'sn50_5',
      title: 'My bucket teaches at work',
      narrative: [
        'Coworkers learn bucket.',
        '',
        'Workplace healthier.',
        '',
        'I tell managers: teach workplace.'
      ],
      lesson: 'Teaching bucket model to coworkers makes workplace healthier through shared vocabulary.'
    },
    {
      id: 'sn50_6',
      title: 'My bucket teaches in community',
      narrative: [
        'Community classes.',
        '',
        'Bucket education.',
        '',
        'Wider impact.',
        '',
        'I tell teachers: community classes.'
      ],
      lesson: 'Community classes on bucket education extend wider impact beyond personal practice.'
    },
    {
      id: 'sn50_7',
      title: 'My bucket and humility',
      narrative: [
        'Bucket overflow still happens.',
        '',
        'Practice imperfect.',
        '',
        'Humility cultivated.',
        '',
        'I tell perfectionists: humility.'
      ],
      lesson: 'Bucket overflow still happens despite practice; humility cultivated through imperfection.'
    },
    {
      id: 'sn50_8',
      title: 'My bucket and self-compassion',
      narrative: [
        'Self-compassion when overflow.',
        '',
        'Kind not harsh.',
        '',
        'Recovery faster.',
        '',
        'I tell self-critical: compassion.'
      ],
      lesson: 'Self-compassion when overflow with kind not harsh response enables faster recovery.'
    },
    {
      id: 'sn50_9',
      title: 'My bucket and forgiveness',
      narrative: [
        'Forgive imperfect practice.',
        '',
        'No shame.',
        '',
        'Begin again.',
        '',
        'I tell shame-stressed: forgive begin again.'
      ],
      lesson: 'Forgiving imperfect practice without shame enables beginning again.'
    },
    {
      id: 'sn50_10',
      title: 'My bucket and growth mindset',
      narrative: [
        'Growth not fixed mindset.',
        '',
        'Practice improvable.',
        '',
        'Stress skills grow.',
        '',
        'I tell stuck-stressed: growth mindset.'
      ],
      lesson: 'Growth not fixed mindset views stress skills as improvable through practice.'
    },
    {
      id: 'sn50_11',
      title: 'My bucket and learning from overflow',
      narrative: [
        'Each overflow teaches.',
        '',
        'What was inflow?',
        '',
        'Which taps closed?',
        '',
        'I tell overflow-shame: learn from it.'
      ],
      lesson: 'Each overflow teaches through analyzing inflow and closed taps; learning replaces shame.'
    },
    {
      id: 'sn50_12',
      title: 'My bucket and pattern recognition',
      narrative: [
        'Patterns over years.',
        '',
        'Triggers identified.',
        '',
        'Predictive ability.',
        '',
        'I tell repeating-stress: pattern recognition.'
      ],
      lesson: 'Years of bucket tracking enable pattern recognition and predictive ability.'
    },
    {
      id: 'sn50_13',
      title: 'My bucket and stress as teacher',
      narrative: [
        'Stress as teacher.',
        '',
        'Not enemy.',
        '',
        'Wisdom emerges.',
        '',
        'I tell stress-hating: teacher reframe.'
      ],
      lesson: 'Stress as teacher not enemy reframe extracts wisdom from suffering.'
    },
    {
      id: 'sn50_14',
      title: 'My bucket and limits as gifts',
      narrative: [
        'Bucket size as gift.',
        '',
        'Capacity reality.',
        '',
        'Honored not fought.',
        '',
        'I tell limit-fighting: gifts.'
      ],
      lesson: 'Bucket size as gift honors capacity reality rather than fighting it.'
    },
    {
      id: 'sn50_15',
      title: 'My bucket and gratitude for practice',
      narrative: [
        'Grateful for practice.',
        '',
        'Tools available.',
        '',
        'Suffering can be managed.',
        '',
        'I tell stressed: gratitude for tools.'
      ],
      lesson: 'Gratitude for practice tools recognizes suffering can be managed through bucket awareness.'
    }
  ];

  var STRESS_NARRATIVES_41 = [
    {
      id: 'sn41_1',
      title: 'My bucket and morning stretch',
      narrative: [
        '10 min morning stretch.',
        '',
        'Body opens.',
        '',
        'Day begins gentle.',
        '',
        'I tell stiff-stressed: morning stretch.'
      ],
      lesson: 'Daily 10 min morning stretches open body and begin day gently for bucket capacity.'
    },
    {
      id: 'sn41_2',
      title: 'My bucket and evening stretch',
      narrative: [
        'Evening stretches.',
        '',
        'Body wound down.',
        '',
        'Sleep supported.',
        '',
        'I tell evening-stressed: stretch.'
      ],
      lesson: 'Evening stretches wind down body and support sleep through bucket release.'
    },
    {
      id: 'sn41_3',
      title: 'My bucket and standing stretches',
      narrative: [
        'Hourly standing stretches.',
        '',
        'Desk work breaks.',
        '',
        'Body refreshed.',
        '',
        'I tell desk-bound: hourly stretch.'
      ],
      lesson: 'Hourly standing stretches at desk refresh body during work bucket inflow.'
    },
    {
      id: 'sn41_4',
      title: 'My bucket and yoga at desk',
      narrative: [
        'Chair yoga at desk.',
        '',
        'Subtle movements.',
        '',
        'Body engaged.',
        '',
        'I tell desk-bound: chair yoga.'
      ],
      lesson: 'Chair yoga at desk with subtle movements engages body during work.'
    },
    {
      id: 'sn41_5',
      title: 'My bucket and walking meetings',
      narrative: [
        'Walking meetings outside.',
        '',
        'Body and conversation.',
        '',
        'Bucket flows.',
        '',
        'I tell meeting-stressed: walking meetings.'
      ],
      lesson: 'Walking meetings outside combine body and conversation; bucket flows during work.'
    },
    {
      id: 'sn41_6',
      title: 'My bucket and walking lunches',
      narrative: [
        'Lunch walks daily.',
        '',
        'Midday body break.',
        '',
        'Afternoon energy.',
        '',
        'I tell desk-bound: lunch walks.'
      ],
      lesson: 'Daily lunch walks provide midday body break and afternoon energy through movement.'
    },
    {
      id: 'sn41_7',
      title: 'My bucket and walking breaks',
      narrative: [
        '10 min walks each hour.',
        '',
        'Brain refreshed.',
        '',
        'Body engaged.',
        '',
        'I tell sedentary: hourly walks.'
      ],
      lesson: 'Hourly 10-minute walks refresh brain and engage body during sedentary work.'
    },
    {
      id: 'sn41_8',
      title: 'My bucket and exercise classes',
      narrative: [
        'Weekly fitness class.',
        '',
        'Community plus body.',
        '',
        'Accountability.',
        '',
        'I tell motivation-needing: classes.'
      ],
      lesson: 'Weekly fitness classes provide community plus body with accountability.'
    },
    {
      id: 'sn41_9',
      title: 'My bucket and morning yoga',
      narrative: [
        'Daily morning yoga.',
        '',
        '30 min routine.',
        '',
        'Body opened.',
        '',
        'I tell flexibility-curious: morning yoga.'
      ],
      lesson: 'Daily morning yoga 30 min routine opens body for day.'
    },
    {
      id: 'sn41_10',
      title: 'My bucket and evening yoga',
      narrative: [
        'Restorative evening yoga.',
        '',
        'Body softened.',
        '',
        'Sleep prepared.',
        '',
        'I tell sleep-anxious: evening yoga.'
      ],
      lesson: 'Restorative evening yoga softens body and prepares sleep.'
    },
    {
      id: 'sn41_11',
      title: 'My bucket and gentle yoga class',
      narrative: [
        'Gentle yoga weekly.',
        '',
        'Not power yoga.',
        '',
        'Nervous system softens.',
        '',
        'I tell stressed: gentle not power.'
      ],
      lesson: 'Gentle yoga not power yoga softens nervous system specifically.'
    },
    {
      id: 'sn41_12',
      title: 'My bucket and yin yoga',
      narrative: [
        'Yin yoga long holds.',
        '',
        'Connective tissue.',
        '',
        'Deep release.',
        '',
        'I tell deep-tension: yin yoga.'
      ],
      lesson: 'Yin yoga long holds work connective tissue for deep release.'
    },
    {
      id: 'sn41_13',
      title: 'My bucket and restorative yoga',
      narrative: [
        'Restorative props.',
        '',
        'Body supported.',
        '',
        'Nervous system reset.',
        '',
        'I tell exhausted: restorative yoga.'
      ],
      lesson: 'Restorative yoga with props supports body for nervous system reset.'
    },
    {
      id: 'sn41_14',
      title: 'My bucket and Iyengar yoga',
      narrative: [
        'Iyengar precision.',
        '',
        'Props plus alignment.',
        '',
        'Body learning.',
        '',
        'I tell alignment-curious: Iyengar.'
      ],
      lesson: 'Iyengar yoga precision with props teaches body alignment.'
    },
    {
      id: 'sn41_15',
      title: 'My bucket and Vinyasa flow',
      narrative: [
        'Vinyasa flow practice.',
        '',
        'Body in motion.',
        '',
        'Breath linked.',
        '',
        'I tell movement-curious: Vinyasa.'
      ],
      lesson: 'Vinyasa flow practice links body motion to breath for flow state.'
    }
  ];

  var STRESS_NARRATIVES_42 = [
    {
      id: 'sn42_1',
      title: 'My bucket and meditation practice years',
      narrative: [
        'Years of daily meditation.',
        '',
        '20 min cushion.',
        '',
        'Brain measurably changed.',
        '',
        'I tell consistent-curious: years.'
      ],
      lesson: 'Years of daily 20-minute cushion meditation measurably change brain.'
    },
    {
      id: 'sn42_2',
      title: 'My bucket and Vipassana meditation',
      narrative: [
        'Vipassana practice.',
        '',
        'Body sensation awareness.',
        '',
        'Equanimity built.',
        '',
        'I tell traditional-curious: Vipassana.'
      ],
      lesson: 'Vipassana practice builds equanimity through body sensation awareness.'
    },
    {
      id: 'sn42_3',
      title: 'My bucket and loving-kindness meditation',
      narrative: [
        'Metta meditation.',
        '',
        'Loving-kindness practice.',
        '',
        'Heart opens.',
        '',
        'I tell heart-closed: loving-kindness.'
      ],
      lesson: 'Metta loving-kindness meditation opens heart through practice.'
    },
    {
      id: 'sn42_4',
      title: 'My bucket and Zen meditation',
      narrative: [
        'Zen zazen sitting.',
        '',
        'Just sitting.',
        '',
        'Mind opens.',
        '',
        'I tell minimalist: Zen.'
      ],
      lesson: 'Zen zazen just sitting opens mind through minimalist practice.'
    },
    {
      id: 'sn42_5',
      title: 'My bucket and Christian contemplation',
      narrative: [
        'Centering prayer.',
        '',
        'Christian contemplative practice.',
        '',
        'Sacred silence.',
        '',
        'I tell Christian-meditating: centering prayer.'
      ],
      lesson: 'Christian centering prayer contemplative practice provides sacred silence.'
    },
    {
      id: 'sn42_6',
      title: 'My bucket and Islamic dhikr',
      narrative: [
        'Islamic dhikr remembrance.',
        '',
        'Sacred names.',
        '',
        'Heart connected.',
        '',
        'I tell Islamic-meditating: dhikr.'
      ],
      lesson: 'Islamic dhikr remembrance practice with sacred names connects heart.'
    },
    {
      id: 'sn42_7',
      title: 'My bucket and Jewish meditation',
      narrative: [
        'Jewish hitbonenut.',
        '',
        'Contemplative tradition.',
        '',
        'Sacred reflection.',
        '',
        'I tell Jewish-meditating: hitbonenut.'
      ],
      lesson: 'Jewish hitbonenut contemplative tradition provides sacred reflection.'
    },
    {
      id: 'sn42_8',
      title: 'My bucket and Hindu meditation',
      narrative: [
        'Mantra meditation.',
        '',
        'Sacred sound.',
        '',
        'Mind anchored.',
        '',
        'I tell Hindu-meditating: mantra.'
      ],
      lesson: 'Hindu mantra meditation with sacred sound anchors mind.'
    },
    {
      id: 'sn42_9',
      title: 'My bucket and walking meditation Buddhist',
      narrative: [
        'Buddhist walking meditation.',
        '',
        'Slow foot attention.',
        '',
        'Mindful motion.',
        '',
        'I tell sitting-stuck: walking meditation.'
      ],
      lesson: 'Buddhist walking meditation with slow foot attention provides mindful motion.'
    },
    {
      id: 'sn42_10',
      title: 'My bucket and Tonglen practice',
      narrative: [
        'Tibetan Tonglen practice.',
        '',
        'Take in suffering.',
        '',
        'Send out love.',
        '',
        'Heart expands.',
        '',
        'I tell heart-closed: Tonglen.'
      ],
      lesson: 'Tibetan Tonglen practice takes in suffering and sends out love; heart expands.'
    },
    {
      id: 'sn42_11',
      title: 'My bucket and 4-7-8 breath',
      narrative: [
        '4 in, 7 hold, 8 out.',
        '',
        'Activates parasympathetic.',
        '',
        'Quick bucket drain.',
        '',
        'I tell quick-tap: 4-7-8.'
      ],
      lesson: '4-7-8 breath activates parasympathetic nervous system for quick bucket drain.'
    },
    {
      id: 'sn42_12',
      title: 'My bucket and Ujjayi breath',
      narrative: [
        'Ujjayi ocean breath.',
        '',
        'Throat slightly constricted.',
        '',
        'Sound calming.',
        '',
        'I tell yoga-breath curious: Ujjayi.'
      ],
      lesson: 'Ujjayi ocean breath with slightly constricted throat creates calming sound.'
    },
    {
      id: 'sn42_13',
      title: 'My bucket and Kapalabhati breath',
      narrative: [
        'Skull shining breath.',
        '',
        'Active forceful exhale.',
        '',
        'Energizing tap.',
        '',
        'I tell energy-needing: Kapalabhati.'
      ],
      lesson: 'Kapalabhati skull shining breath with active forceful exhale energizes.'
    },
    {
      id: 'sn42_14',
      title: 'My bucket and Bhramari breath',
      narrative: [
        'Bee breath humming.',
        '',
        'Long exhale hum.',
        '',
        'Vagal stimulation.',
        '',
        'I tell calm-needing: Bhramari.'
      ],
      lesson: 'Bhramari bee breath humming on long exhale stimulates vagal nerve.'
    },
    {
      id: 'sn42_15',
      title: 'My bucket and Nadi Shodhana',
      narrative: [
        'Alternate nostril breath.',
        '',
        'Balancing pranayama.',
        '',
        'Energy balanced.',
        '',
        'I tell balance-needing: Nadi Shodhana.'
      ],
      lesson: 'Nadi Shodhana alternate nostril breathing balances energy through pranayama.'
    }
  ];

  var STRESS_NARRATIVES_43 = [
    {
      id: 'sn43_1',
      title: 'My bucket and morning hydration',
      narrative: [
        'Glass of water first thing.',
        '',
        'Body rehydrates.',
        '',
        'Day begins right.',
        '',
        'I tell dehydrated: morning water.'
      ],
      lesson: 'Glass of water first thing rehydrates body from overnight; day begins right.'
    },
    {
      id: 'sn43_2',
      title: 'My bucket and electrolyte morning',
      narrative: [
        'Salt water morning.',
        '',
        'Electrolyte balance.',
        '',
        'Adrenal support.',
        '',
        'I tell adrenal-stressed: electrolytes morning.'
      ],
      lesson: 'Salt water morning electrolyte balance supports adrenals for bucket stress.'
    },
    {
      id: 'sn43_3',
      title: 'My bucket and protein breakfast',
      narrative: [
        'Protein within hour of waking.',
        '',
        'Blood sugar stable.',
        '',
        'Bucket capacity supported.',
        '',
        'I tell breakfast-skippers: protein hour.'
      ],
      lesson: 'Protein within hour of waking stabilizes blood sugar and supports bucket capacity.'
    },
    {
      id: 'sn43_4',
      title: 'My bucket and balanced lunch',
      narrative: [
        'Balanced lunch plate.',
        '',
        'Protein, carbs, vegetables.',
        '',
        'Afternoon energy.',
        '',
        'I tell afternoon-slumpers: balanced lunch.'
      ],
      lesson: 'Balanced lunch with protein, carbs, vegetables sustains afternoon energy.'
    },
    {
      id: 'sn43_5',
      title: 'My bucket and early dinner',
      narrative: [
        '6pm dinner.',
        '',
        'Digestion complete by bed.',
        '',
        'Sleep improved.',
        '',
        'I tell sleep-anxious: early dinner.'
      ],
      lesson: 'Early 6pm dinner completes digestion by bed; sleep improved through timing.'
    },
    {
      id: 'sn43_6',
      title: 'My bucket and no caffeine after noon',
      narrative: [
        'Last coffee by noon.',
        '',
        'Sleep protected.',
        '',
        'I tell sleep-stressed: noon cutoff.'
      ],
      lesson: 'No caffeine after noon protects sleep from late stimulant effect.'
    },
    {
      id: 'sn43_7',
      title: 'My bucket and no alcohol weekday',
      narrative: [
        'Weekday alcohol-free.',
        '',
        'Sleep improved.',
        '',
        'Mood stable.',
        '',
        'I tell alcohol-heavy: weekday off.'
      ],
      lesson: 'Weekday alcohol-free protects sleep and mood; bucket lighter.'
    },
    {
      id: 'sn43_8',
      title: 'My bucket and limit sugar',
      narrative: [
        'Reduced sugar.',
        '',
        'Mood swings reduced.',
        '',
        'Energy stable.',
        '',
        'I tell sugar-heavy: reduce.'
      ],
      lesson: 'Reduced sugar minimizes mood swings and stabilizes energy.'
    },
    {
      id: 'sn43_9',
      title: 'My bucket and whole foods plate',
      narrative: [
        'Mostly whole foods.',
        '',
        'Less processed.',
        '',
        'Body responds.',
        '',
        'I tell processed-heavy: whole foods.'
      ],
      lesson: 'Mostly whole foods plate with less processed allows body bucket response.'
    },
    {
      id: 'sn43_10',
      title: 'My bucket and vitamin D',
      narrative: [
        'Vitamin D supplemented.',
        '',
        'Especially winter.',
        '',
        'Mood supported.',
        '',
        'I tell winter-stressed: vitamin D.'
      ],
      lesson: 'Vitamin D supplementation especially in winter supports mood through bucket.'
    },
    {
      id: 'sn43_11',
      title: 'My bucket and omega-3s',
      narrative: [
        'Omega-3 supplemented.',
        '',
        'Brain support.',
        '',
        'Inflammation reduced.',
        '',
        'I tell brain-curious: omega-3.'
      ],
      lesson: 'Omega-3 supplementation supports brain function and reduces inflammation.'
    },
    {
      id: 'sn43_12',
      title: 'My bucket and magnesium',
      narrative: [
        'Magnesium before bed.',
        '',
        'Sleep support.',
        '',
        'Muscle relaxation.',
        '',
        'I tell sleep-troubled: magnesium.'
      ],
      lesson: 'Magnesium before bed supports sleep and muscle relaxation.'
    },
    {
      id: 'sn43_13',
      title: 'My bucket and B vitamins',
      narrative: [
        'B complex daily.',
        '',
        'Energy and nervous system.',
        '',
        'Stress support.',
        '',
        'I tell low-energy: B vitamins.'
      ],
      lesson: 'Daily B complex supports energy and nervous system for stress.'
    },
    {
      id: 'sn43_14',
      title: 'My bucket and adaptogens',
      narrative: [
        'Ashwagandha or rhodiola.',
        '',
        'Adaptogenic herbs.',
        '',
        'Stress adaptation.',
        '',
        'I tell herb-curious: adaptogens.'
      ],
      lesson: 'Ashwagandha or rhodiola adaptogenic herbs support stress adaptation.'
    },
    {
      id: 'sn43_15',
      title: 'My bucket and probiotics',
      narrative: [
        'Daily probiotics.',
        '',
        'Gut-brain axis.',
        '',
        'Mood support.',
        '',
        'I tell gut-stressed: probiotics.'
      ],
      lesson: 'Daily probiotics support gut-brain axis for mood through bucket.'
    }
  ];

  var STRESS_NARRATIVES_44 = [
    {
      id: 'sn44_1',
      title: 'My bucket and morning walk',
      narrative: [
        'First thing walk.',
        '',
        'Sunlight plus movement.',
        '',
        'Circadian aligned.',
        '',
        'I tell morning-curious: first walk.'
      ],
      lesson: 'First thing morning walks combine sunlight and movement; circadian aligned.'
    },
    {
      id: 'sn44_2',
      title: 'My bucket and lunch walk',
      narrative: [
        'Lunch walks daily.',
        '',
        'Midday outside.',
        '',
        'Energy maintained.',
        '',
        'I tell desk-bound: lunch walks.'
      ],
      lesson: 'Daily lunch walks midday outside maintain afternoon energy.'
    },
    {
      id: 'sn44_3',
      title: 'My bucket and evening walk',
      narrative: [
        'Evening walks slow.',
        '',
        'Day settles.',
        '',
        'Sleep prepared.',
        '',
        'I tell evening-anxious: evening walk.'
      ],
      lesson: 'Slow evening walks settle day and prepare sleep.'
    },
    {
      id: 'sn44_4',
      title: 'My bucket and walking podcast',
      narrative: [
        'Walking plus podcast.',
        '',
        'Movement plus learning.',
        '',
        'Stacked taps.',
        '',
        'I tell efficient-tapper: walking podcast.'
      ],
      lesson: 'Walking plus podcast stacks movement and learning taps efficiently.'
    },
    {
      id: 'sn44_5',
      title: 'My bucket and walking phone call',
      narrative: [
        'Walking phone calls.',
        '',
        'Movement during connection.',
        '',
        'Both taps.',
        '',
        'I tell phone-talkers: walk during.'
      ],
      lesson: 'Walking phone calls combine movement and connection taps.'
    },
    {
      id: 'sn44_6',
      title: 'My bucket and walking with friend',
      narrative: [
        'Walking friend.',
        '',
        'Movement and connection.',
        '',
        'I tell social-walking: friend walks.'
      ],
      lesson: 'Walking with friend combines movement and connection in shared time.'
    },
    {
      id: 'sn44_7',
      title: 'My bucket and walking errands',
      narrative: [
        'Errands on foot when possible.',
        '',
        'Body engaged daily.',
        '',
        'I tell car-bound: walk errands.'
      ],
      lesson: 'Walking errands when possible engages body daily through life rhythm.'
    },
    {
      id: 'sn44_8',
      title: 'My bucket and walking commute',
      narrative: [
        'Walking commute.',
        '',
        'Daily transit movement.',
        '',
        'Time used twice.',
        '',
        'I tell commute-able: walking.'
      ],
      lesson: 'Walking commute uses transit time for daily movement.'
    },
    {
      id: 'sn44_9',
      title: 'My bucket and stair climbing',
      narrative: [
        'Stairs not elevator.',
        '',
        'Daily cardio.',
        '',
        'Habit built.',
        '',
        'I tell elevator-users: stairs.'
      ],
      lesson: 'Choosing stairs over elevator provides daily cardio habit.'
    },
    {
      id: 'sn44_10',
      title: 'My bucket and walking dog',
      narrative: [
        'Dog walks four daily.',
        '',
        'Forced routine.',
        '',
        'I tell dog-owners: forced movement.'
      ],
      lesson: 'Four daily dog walks force routine outdoor movement.'
    },
    {
      id: 'sn44_11',
      title: 'My bucket and walking park',
      narrative: [
        'Park walks weekly.',
        '',
        'Green space.',
        '',
        'Nature plus movement.',
        '',
        'I tell urban: park walks.'
      ],
      lesson: 'Weekly park walks combine green space and movement.'
    },
    {
      id: 'sn44_12',
      title: 'My bucket and walking trail',
      narrative: [
        'Weekend trail walks.',
        '',
        'Nature immersion.',
        '',
        'Mind clears.',
        '',
        'I tell weekend-stressed: trails.'
      ],
      lesson: 'Weekend trail walks immerse in nature and clear mind.'
    },
    {
      id: 'sn44_13',
      title: 'My bucket and walking beach',
      narrative: [
        'Beach walks.',
        '',
        'Sand plus waves.',
        '',
        'Sensory immersion.',
        '',
        'I tell coastal: beach walks.'
      ],
      lesson: 'Beach walks immerse in sand and waves through sensory drainage.'
    },
    {
      id: 'sn44_14',
      title: 'My bucket and walking mountains',
      narrative: [
        'Mountain trail walks.',
        '',
        'Elevation challenge.',
        '',
        'Perspective shifts.',
        '',
        'I tell mountain-near: trail walks.'
      ],
      lesson: 'Mountain trail walks with elevation challenge shift perspective.'
    },
    {
      id: 'sn44_15',
      title: 'My bucket and walking river',
      narrative: [
        'River walks.',
        '',
        'Water sound.',
        '',
        'Flowing rhythm.',
        '',
        'I tell water-near: river walks.'
      ],
      lesson: 'River walks with water sound provide flowing rhythm tap.'
    }
  ];

  var STRESS_NARRATIVES_45 = [
    {
      id: 'sn45_1',
      title: 'My bucket and morning meditation cushion',
      narrative: [
        'Daily cushion.',
        '',
        '20 min minimum.',
        '',
        'Brain trained over years.',
        '',
        'I tell consistent: cushion daily.'
      ],
      lesson: 'Daily morning meditation cushion 20 min trains brain over years.'
    },
    {
      id: 'sn45_2',
      title: 'My bucket and breath awareness',
      narrative: [
        'Daily breath awareness.',
        '',
        'Foundation practice.',
        '',
        'Always accessible.',
        '',
        'I tell beginners: breath awareness.'
      ],
      lesson: 'Daily breath awareness as foundation practice is always accessible.'
    },
    {
      id: 'sn45_3',
      title: 'My bucket and body scan daily',
      narrative: [
        '10 min body scan.',
        '',
        'Head to toe.',
        '',
        'Without judgment.',
        '',
        'I tell body-disconnected: scan.'
      ],
      lesson: 'Daily 10 min body scan head to toe without judgment reconnects.'
    },
    {
      id: 'sn45_4',
      title: 'My bucket and silent retreat annual',
      narrative: [
        'Weekend silent annual.',
        '',
        'Deep practice.',
        '',
        'Year refreshed.',
        '',
        'I tell deep-practice curious: silent annual.'
      ],
      lesson: 'Annual weekend silent retreats provide deep practice refreshing year.'
    },
    {
      id: 'sn45_5',
      title: 'My bucket and Sangha community',
      narrative: [
        'Weekly meditation group.',
        '',
        'Sangha community.',
        '',
        'Practice supported.',
        '',
        'I tell solo-practice: Sangha.'
      ],
      lesson: 'Weekly meditation group Sangha community supports practice over years.'
    },
    {
      id: 'sn45_6',
      title: 'My bucket and Dharma talks',
      narrative: [
        'Weekly Dharma talks.',
        '',
        'Buddhist teachings.',
        '',
        'Practice deepened.',
        '',
        'I tell Buddhist-curious: Dharma.'
      ],
      lesson: 'Weekly Dharma talks deepen Buddhist practice through ongoing teaching.'
    },
    {
      id: 'sn45_7',
      title: 'My bucket and Christian retreats',
      narrative: [
        'Christian silent retreats.',
        '',
        'Contemplative tradition.',
        '',
        'Sacred silence.',
        '',
        'I tell Christian-contemplative: retreats.'
      ],
      lesson: 'Christian silent retreats in contemplative tradition provide sacred silence.'
    },
    {
      id: 'sn45_8',
      title: 'My bucket and Sufi practices',
      narrative: [
        'Sufi practices.',
        '',
        'Whirling and dhikr.',
        '',
        'Embodied prayer.',
        '',
        'I tell mystical-curious: Sufi.'
      ],
      lesson: 'Sufi practices like whirling and dhikr provide embodied prayer.'
    },
    {
      id: 'sn45_9',
      title: 'My bucket and yoga philosophy',
      narrative: [
        'Yoga sutras study.',
        '',
        'Beyond postures.',
        '',
        'Eight limbs.',
        '',
        'I tell yoga-deep: philosophy.'
      ],
      lesson: 'Yoga sutras study beyond postures explores eight limbs philosophy.'
    },
    {
      id: 'sn45_10',
      title: 'My bucket and Stoic philosophy',
      narrative: [
        'Stoic daily reading.',
        '',
        'Marcus Aurelius.',
        '',
        'Practical philosophy.',
        '',
        'I tell ancient-wisdom: Stoicism.'
      ],
      lesson: 'Stoic daily reading like Marcus Aurelius provides practical philosophy.'
    },
    {
      id: 'sn45_11',
      title: 'My bucket and existential reading',
      narrative: [
        'Existential philosophy.',
        '',
        'Meaning explored.',
        '',
        'Frankl, Camus.',
        '',
        'I tell meaning-seeking: existential.'
      ],
      lesson: 'Existential philosophy Frankl, Camus explores meaning through reading.'
    },
    {
      id: 'sn45_12',
      title: 'My bucket and Zen koans',
      narrative: [
        'Zen koan study.',
        '',
        'Mind paradoxes.',
        '',
        'Beyond rational.',
        '',
        'I tell rational-stuck: koans.'
      ],
      lesson: 'Zen koan study presents mind paradoxes beyond rational thought.'
    },
    {
      id: 'sn45_13',
      title: 'My bucket and Taoism',
      narrative: [
        'Tao Te Ching daily.',
        '',
        'Flow philosophy.',
        '',
        'Natural way.',
        '',
        'I tell flow-seeking: Taoism.'
      ],
      lesson: 'Tao Te Ching daily reading teaches flow philosophy and natural way.'
    },
    {
      id: 'sn45_14',
      title: 'My bucket and indigenous wisdom',
      narrative: [
        'Indigenous teachings.',
        '',
        'Earth connection.',
        '',
        'Ancestor wisdom.',
        '',
        'I tell roots-seeking: indigenous wisdom.'
      ],
      lesson: 'Indigenous teachings provide Earth connection and ancestor wisdom.'
    },
    {
      id: 'sn45_15',
      title: 'My bucket and personal philosophy',
      narrative: [
        'Personal philosophy developed.',
        '',
        'Values clarified.',
        '',
        'Life examined.',
        '',
        'I tell unexamined: develop philosophy.'
      ],
      lesson: 'Personal philosophy developed through values clarification provides life examination.'
    }
  ];

  var STRESS_NARRATIVES_36 = [
    {
      id: 'sn36_1',
      title: 'My bucket and breath as anchor',
      narrative: [
        'Breath is anchor.',
        '',
        'Always with me.',
        '',
        'Return when scattered.',
        '',
        'I tell anchor-seeking: breath.'
      ],
      lesson: 'Breath is foundational anchor always available; return to it when scattered.'
    },
    {
      id: 'sn36_2',
      title: 'My bucket and body as anchor',
      narrative: [
        'Body is anchor.',
        '',
        'Always present.',
        '',
        'Feet on ground.',
        '',
        'I tell scattered: body anchor.'
      ],
      lesson: 'Body always present provides anchor; feet on ground returns awareness.'
    },
    {
      id: 'sn36_3',
      title: 'My bucket and senses as anchor',
      narrative: [
        'Five senses anchor.',
        '',
        'See, hear, smell, touch, taste.',
        '',
        'Present moment.',
        '',
        'I tell future-stuck: senses anchor.'
      ],
      lesson: 'Five senses anchor in present moment; see, hear, smell, touch, taste available always.'
    },
    {
      id: 'sn36_4',
      title: 'My bucket and feet as anchor',
      narrative: [
        'Feet on floor.',
        '',
        'Weight felt.',
        '',
        'Grounded.',
        '',
        'I tell ungrounded: feet anchor.'
      ],
      lesson: 'Feet on floor with weight felt provides grounded anchor.'
    },
    {
      id: 'sn36_5',
      title: 'My bucket and hands as anchor',
      narrative: [
        'Press hands together.',
        '',
        'Feel pressure.',
        '',
        'Body present.',
        '',
        'I tell anxious: hands anchor.'
      ],
      lesson: 'Pressing hands together with pressure felt brings body present anchor.'
    },
    {
      id: 'sn36_6',
      title: 'My bucket and water as anchor',
      narrative: [
        'Cold water on wrists.',
        '',
        'Nervous system shifts.',
        '',
        'Quick anchor.',
        '',
        'I tell panic: water anchor.'
      ],
      lesson: 'Cold water on wrists provides quick nervous system shift anchor.'
    },
    {
      id: 'sn36_7',
      title: 'My bucket and sound as anchor',
      narrative: [
        'Listen for three sounds.',
        '',
        'Far, medium, close.',
        '',
        'Sound landscape.',
        '',
        'I tell scattered: sound anchor.'
      ],
      lesson: 'Three sounds far, medium, close map sound landscape anchor.'
    },
    {
      id: 'sn36_8',
      title: 'My bucket and color as anchor',
      narrative: [
        'Find five blue things.',
        '',
        'Visual search.',
        '',
        'Present moment.',
        '',
        'I tell anxious: color search anchor.'
      ],
      lesson: 'Finding five things of color provides visual search present moment anchor.'
    },
    {
      id: 'sn36_9',
      title: 'My bucket and prayer as anchor',
      narrative: [
        'Short prayer.',
        '',
        'Sacred connection.',
        '',
        'Heart turned.',
        '',
        'I tell faithful: prayer anchor.'
      ],
      lesson: 'Short prayers provide sacred connection anchor through heart turning.'
    },
    {
      id: 'sn36_10',
      title: 'My bucket and mantra as anchor',
      narrative: [
        'Repeated mantra.',
        '',
        'Mind anchored.',
        '',
        'Repetition calms.',
        '',
        'I tell scattered-mind: mantra.'
      ],
      lesson: 'Repeated mantra anchors mind through repetition calming.'
    },
    {
      id: 'sn36_11',
      title: 'My bucket and counting as anchor',
      narrative: [
        'Count to 10 slowly.',
        '',
        'Each number conscious.',
        '',
        'Present anchor.',
        '',
        'I tell scattered: counting anchor.'
      ],
      lesson: 'Counting to 10 slowly with each number conscious provides present anchor.'
    },
    {
      id: 'sn36_12',
      title: 'My bucket and back to feet',
      narrative: [
        'Whenever lost.',
        '',
        'Back to feet on ground.',
        '',
        'Return anchor.',
        '',
        'I tell habituated: feet return.'
      ],
      lesson: 'Habituated return to feet on ground provides reliable lost return anchor.'
    },
    {
      id: 'sn36_13',
      title: 'My bucket and back to breath',
      narrative: [
        'Whenever scattered.',
        '',
        'Back to breath.',
        '',
        'Three conscious breaths.',
        '',
        'I tell scattered-habit: breath return.'
      ],
      lesson: 'Habitual return to breath with three conscious breaths anchors scattered mind.'
    },
    {
      id: 'sn36_14',
      title: 'My bucket and back to body',
      narrative: [
        'Whenever heady.',
        '',
        'Back to body scan.',
        '',
        'Each part sensed.',
        '',
        'I tell mind-trapped: body return.'
      ],
      lesson: 'Habitual body scan return from mind-trapped state senses each part for anchor.'
    },
    {
      id: 'sn36_15',
      title: 'My bucket and back to senses',
      narrative: [
        'Whenever lost in thought.',
        '',
        'Back to senses.',
        '',
        'See hear smell touch taste.',
        '',
        'I tell thought-stuck: senses return.'
      ],
      lesson: 'Habitual sense return from thought-stuck state engages see hear smell touch taste.'
    }
  ];

  var STRESS_NARRATIVES_37 = [
    {
      id: 'sn37_1',
      title: 'My bucket and trauma-informed bucket model',
      narrative: [
        'Trauma reduces capacity.',
        '',
        'Triggers heavy inflow.',
        '',
        'Specialty therapy needed.',
        '',
        'I tell trauma-survivors: specialty therapy.'
      ],
      lesson: 'Trauma-informed bucket model recognizes reduced capacity and heavy trigger inflow needing specialty therapy.'
    },
    {
      id: 'sn37_2',
      title: 'My bucket and PTSD bucket',
      narrative: [
        'PTSD specific bucket.',
        '',
        'Hypervigilance inflow.',
        '',
        'Flashback triggers.',
        '',
        'Specialty support.',
        '',
        'I tell PTSD: specialty support.'
      ],
      lesson: 'PTSD bucket has hypervigilance inflow and flashback triggers; specialty support essential.'
    },
    {
      id: 'sn37_3',
      title: 'My bucket and complex PTSD',
      narrative: [
        'Complex PTSD chronic inflow.',
        '',
        'Childhood roots.',
        '',
        'Long-term therapy.',
        '',
        'I tell C-PTSD: long-term therapy.'
      ],
      lesson: 'Complex PTSD chronic inflow with childhood roots requires long-term specialty therapy.'
    },
    {
      id: 'sn37_4',
      title: 'My bucket and dissociation',
      narrative: [
        'Dissociation overflow response.',
        '',
        'Body protects through disconnection.',
        '',
        'Grounding essential.',
        '',
        'I tell dissociating: grounding skills.'
      ],
      lesson: 'Dissociation can be overflow response; body protects through disconnection; grounding essential.'
    },
    {
      id: 'sn37_5',
      title: 'My bucket and panic disorder bucket',
      narrative: [
        'Panic overflow bucket.',
        '',
        'Symptoms misread as crisis.',
        '',
        'CBT teaches differently.',
        '',
        'I tell panicking: CBT works.'
      ],
      lesson: 'Panic disorder bucket reads symptoms as crisis; CBT teaches differently for management.'
    },
    {
      id: 'sn37_6',
      title: 'My bucket and OCD bucket',
      narrative: [
        'OCD rituals false drains.',
        '',
        'ERP teaches real tools.',
        '',
        'Bucket healthier.',
        '',
        'I tell OCD: ERP teaches.'
      ],
      lesson: 'OCD ritual false drains; ERP teaches real bucket tools for healthier management.'
    },
    {
      id: 'sn37_7',
      title: 'My bucket and depression bucket',
      narrative: [
        'Depression closes taps.',
        '',
        'Cannot access usual tools.',
        '',
        'Treatment opens access.',
        '',
        'I tell depressed: treatment opens.'
      ],
      lesson: 'Depression closes tap access; treatment opens ability to use usual coping tools.'
    },
    {
      id: 'sn37_8',
      title: 'My bucket and anxiety disorders',
      narrative: [
        'Anxiety disorders smaller bucket.',
        '',
        'Lower overflow threshold.',
        '',
        'Specialty treatment.',
        '',
        'I tell anxiety-disorder: specialty.'
      ],
      lesson: 'Anxiety disorders present as smaller bucket with lower overflow threshold; specialty treatment.'
    },
    {
      id: 'sn37_9',
      title: 'My bucket and bipolar bucket',
      narrative: [
        'Bipolar bucket varies.',
        '',
        'Manic phase huge capacity.',
        '',
        'Depressed phase tiny.',
        '',
        'Medication stabilizes.',
        '',
        'I tell bipolar: medication stabilizes.'
      ],
      lesson: 'Bipolar bucket varies with manic huge capacity and depressed tiny; medication stabilizes.'
    },
    {
      id: 'sn37_10',
      title: 'My bucket and schizophrenia',
      narrative: [
        'Schizophrenia specialty support.',
        '',
        'Medication essential.',
        '',
        'Plus therapy.',
        '',
        'Plus community.',
        '',
        'I tell schizophrenia: combined.'
      ],
      lesson: 'Schizophrenia requires combined specialty support: medication, therapy, community.'
    },
    {
      id: 'sn37_11',
      title: 'My bucket and personality disorders',
      narrative: [
        'Personality disorders specific.',
        '',
        'DBT for BPD.',
        '',
        'Long-term therapy.',
        '',
        'I tell PD: specific therapy.'
      ],
      lesson: 'Personality disorders need specific specialty therapy like DBT for BPD long-term.'
    },
    {
      id: 'sn37_12',
      title: 'My bucket and eating disorders',
      narrative: [
        'Eating disorders specialty.',
        '',
        'Nutritionist plus therapy.',
        '',
        'Medical monitoring.',
        '',
        'I tell ED: specialty team.'
      ],
      lesson: 'Eating disorders need specialty team of nutritionist, therapist, medical monitoring.'
    },
    {
      id: 'sn37_13',
      title: 'My bucket and substance use disorders',
      narrative: [
        'Substance use false drains.',
        '',
        'Real taps in recovery.',
        '',
        '12-step plus therapy.',
        '',
        'I tell using: recovery teaches.'
      ],
      lesson: 'Substance use false drains; recovery teaches real taps through 12-step plus therapy.'
    },
    {
      id: 'sn37_14',
      title: 'My bucket and chronic pain bucket',
      narrative: [
        'Chronic pain dual impact.',
        '',
        'Adds inflow.',
        '',
        'Reduces tap access.',
        '',
        'Specialty support.',
        '',
        'I tell chronic-pain: specialty.'
      ],
      lesson: 'Chronic pain has dual impact adding inflow and reducing tap access; specialty support.'
    },
    {
      id: 'sn37_15',
      title: 'My bucket and chronic illness bucket',
      narrative: [
        'Chronic illness chronic inflow.',
        '',
        'Specialty support.',
        '',
        'Disease community.',
        '',
        'I tell chronically ill: specialty plus community.'
      ],
      lesson: 'Chronic illness chronic inflow needs specialty support plus disease community.'
    }
  ];

  var STRESS_NARRATIVES_38 = [
    {
      id: 'sn38_1',
      title: 'My bucket and ACT therapy approach',
      narrative: [
        'Acceptance Commitment Therapy.',
        '',
        'Values clarified.',
        '',
        'Action aligned.',
        '',
        'I tell stuck: ACT helps.'
      ],
      lesson: 'ACT therapy clarifies values and aligns action; bucket lighter through values-driven living.'
    },
    {
      id: 'sn38_2',
      title: 'My bucket and ACT defusion',
      narrative: [
        'Thoughts as clouds.',
        '',
        'Not facts.',
        '',
        'Defusion practice.',
        '',
        'I tell thought-fused: defusion.'
      ],
      lesson: 'ACT defusion practice sees thoughts as clouds not facts; bucket lightens.'
    },
    {
      id: 'sn38_3',
      title: 'My bucket and ACT acceptance',
      narrative: [
        'Accept what is.',
        '',
        'Stop fighting.',
        '',
        'Energy preserved.',
        '',
        'I tell resisting: ACT acceptance.'
      ],
      lesson: 'ACT acceptance accepts what is and stops fighting; energy preserved for values action.'
    },
    {
      id: 'sn38_4',
      title: 'My bucket and IFS parts work',
      narrative: [
        'Internal Family Systems.',
        '',
        'Parts within understood.',
        '',
        'Conflict resolved.',
        '',
        'I tell internally-conflicted: IFS.'
      ],
      lesson: 'IFS parts work understands internal family of parts; conflict resolved through dialogue.'
    },
    {
      id: 'sn38_5',
      title: 'My bucket and somatic experiencing',
      narrative: [
        'Body holds trauma.',
        '',
        'Somatic experiencing releases.',
        '',
        'Body-based therapy.',
        '',
        'I tell body-held: somatic experiencing.'
      ],
      lesson: 'Somatic experiencing releases body-held trauma; body-based therapy specialty.'
    },
    {
      id: 'sn38_6',
      title: 'My bucket and EMDR',
      narrative: [
        'Eye Movement Desensitization.',
        '',
        'Memory reprocessing.',
        '',
        'Triggers reduced.',
        '',
        'I tell trauma: EMDR works.'
      ],
      lesson: 'EMDR therapy reprocesses memories through eye movement; triggers reduced.'
    },
    {
      id: 'sn38_7',
      title: 'My bucket and brainspotting',
      narrative: [
        'Brainspotting therapy.',
        '',
        'Body-mind connection.',
        '',
        'Newer modality.',
        '',
        'I tell newer-curious: brainspotting.'
      ],
      lesson: 'Brainspotting therapy works through body-mind connection; newer trauma modality.'
    },
    {
      id: 'sn38_8',
      title: 'My bucket and TF-CBT',
      narrative: [
        'Trauma-Focused CBT.',
        '',
        'Child-specific.',
        '',
        'Family included.',
        '',
        'I tell child-trauma: TF-CBT.'
      ],
      lesson: 'TF-CBT trauma-focused CBT is child-specific and includes family in treatment.'
    },
    {
      id: 'sn38_9',
      title: 'My bucket and CPT therapy',
      narrative: [
        'Cognitive Processing Therapy.',
        '',
        'Trauma-specific CBT.',
        '',
        'Stuck points addressed.',
        '',
        'I tell trauma: CPT works.'
      ],
      lesson: 'CPT cognitive processing therapy is trauma-specific CBT addressing stuck points.'
    },
    {
      id: 'sn38_10',
      title: 'My bucket and prolonged exposure',
      narrative: [
        'Prolonged exposure therapy.',
        '',
        'Imaginal and in-vivo.',
        '',
        'PTSD evidence-based.',
        '',
        'I tell PTSD: PE works.'
      ],
      lesson: 'Prolonged exposure therapy with imaginal and in-vivo PTSD evidence-based treatment.'
    },
    {
      id: 'sn38_11',
      title: 'My bucket and DBT for trauma',
      narrative: [
        'DBT trauma adaptation.',
        '',
        'Phase-based.',
        '',
        'Skills first.',
        '',
        'I tell complex-trauma: DBT phase.'
      ],
      lesson: 'DBT trauma adaptation phase-based with skills first for complex trauma.'
    },
    {
      id: 'sn38_12',
      title: 'My bucket and art therapy',
      narrative: [
        'Art therapy creative.',
        '',
        'Non-verbal expression.',
        '',
        'Trauma accessed differently.',
        '',
        'I tell verbal-stuck: art therapy.'
      ],
      lesson: 'Art therapy provides non-verbal expression accessing trauma differently.'
    },
    {
      id: 'sn38_13',
      title: 'My bucket and music therapy',
      narrative: [
        'Music therapy.',
        '',
        'Songs and improvisation.',
        '',
        'Body and emotion engaged.',
        '',
        'I tell musical: music therapy.'
      ],
      lesson: 'Music therapy engages body and emotion through songs and improvisation.'
    },
    {
      id: 'sn38_14',
      title: 'My bucket and dance therapy',
      narrative: [
        'Dance/movement therapy.',
        '',
        'Body expression.',
        '',
        'Held energies released.',
        '',
        'I tell body-stuck: dance therapy.'
      ],
      lesson: 'Dance movement therapy expresses body and releases held energies.'
    },
    {
      id: 'sn38_15',
      title: 'My bucket and equine therapy',
      narrative: [
        'Horse-assisted therapy.',
        '',
        'Animal mirror.',
        '',
        'Body learning.',
        '',
        'I tell experiential: equine therapy.'
      ],
      lesson: 'Equine horse-assisted therapy uses animal mirror for body experiential learning.'
    }
  ];

  var STRESS_NARRATIVES_39 = [
    {
      id: 'sn39_1',
      title: 'My bucket and 30-day challenge',
      narrative: [
        '30 day habit challenge.',
        '',
        'New practice tested.',
        '',
        'Whether to keep.',
        '',
        'I tell habit-curious: 30-day.'
      ],
      lesson: '30-day habit challenges test new practices to decide whether to keep.'
    },
    {
      id: 'sn39_2',
      title: 'My bucket and 21-day habit',
      narrative: [
        '21 days for habit formation.',
        '',
        'Consistency tested.',
        '',
        'I tell habit-forming: 21 days.'
      ],
      lesson: '21 days tests habit formation consistency.'
    },
    {
      id: 'sn39_3',
      title: 'My bucket and 90-day reset',
      narrative: [
        '90 day life reset.',
        '',
        'Major changes.',
        '',
        'Habits established.',
        '',
        'I tell major-change: 90 days.'
      ],
      lesson: '90-day life resets establish major changes through extended habit period.'
    },
    {
      id: 'sn39_4',
      title: 'My bucket and quarterly review',
      narrative: [
        'Quarterly life review.',
        '',
        'Major areas examined.',
        '',
        'Adjustments planned.',
        '',
        'I tell systematic: quarterly.'
      ],
      lesson: 'Quarterly reviews examine major life areas and plan adjustments.'
    },
    {
      id: 'sn39_5',
      title: 'My bucket and annual review',
      narrative: [
        'New Year reflection.',
        '',
        'Year in review.',
        '',
        'Year ahead planned.',
        '',
        'I tell New Year: annual review.'
      ],
      lesson: 'Annual New Year reflection reviews past year and plans coming.'
    },
    {
      id: 'sn39_6',
      title: 'My bucket and decade review',
      narrative: [
        'Decade-end review.',
        '',
        'Patterns examined.',
        '',
        'Major arcs reflected.',
        '',
        'I tell decade-marker: review.'
      ],
      lesson: 'Decade-end reviews examine patterns and reflect major arcs.'
    },
    {
      id: 'sn39_7',
      title: 'My bucket and birthday review',
      narrative: [
        'Annual birthday reflection.',
        '',
        'Year of self.',
        '',
        'Direction examined.',
        '',
        'I tell birthday-reflective: review.'
      ],
      lesson: 'Annual birthday reflection examines year of self and direction.'
    },
    {
      id: 'sn39_8',
      title: 'My bucket and anniversary review',
      narrative: [
        'Anniversary year review.',
        '',
        'Relationship examined.',
        '',
        'Growth tracked.',
        '',
        'I tell partnered: anniversary review.'
      ],
      lesson: 'Anniversary reviews examine relationship and track growth annually.'
    },
    {
      id: 'sn39_9',
      title: 'My bucket and end of year letter',
      narrative: [
        'Year-end letter to self.',
        '',
        'Past year captured.',
        '',
        'Wisdom distilled.',
        '',
        'I tell reflective: year letter.'
      ],
      lesson: 'Year-end letters to self capture past year and distill wisdom.'
    },
    {
      id: 'sn39_10',
      title: 'My bucket and future letter',
      narrative: [
        'Letter to future self.',
        '',
        'Year ahead.',
        '',
        'Intentions set.',
        '',
        'I tell future-curious: future letter.'
      ],
      lesson: 'Letters to future self set intentions for year ahead.'
    },
    {
      id: 'sn39_11',
      title: 'My bucket and past letter',
      narrative: [
        'Letter to past self.',
        '',
        'Younger self addressed.',
        '',
        'Wisdom offered.',
        '',
        'I tell self-compassionate: past letter.'
      ],
      lesson: 'Letters to past self address younger self with wisdom from current perspective.'
    },
    {
      id: 'sn39_12',
      title: 'My bucket and bucket list',
      narrative: [
        'Life bucket list.',
        '',
        'Big dreams written.',
        '',
        'Direction clarified.',
        '',
        'I tell stagnant: bucket list.'
      ],
      lesson: 'Life bucket lists with big dreams written clarify direction.'
    },
    {
      id: 'sn39_13',
      title: 'My bucket and not-to-do list',
      narrative: [
        'Not-to-do list.',
        '',
        'Things to stop.',
        '',
        'Subtraction power.',
        '',
        'I tell overcommitted: not-to-do.'
      ],
      lesson: 'Not-to-do lists with things to stop provide subtraction power.'
    },
    {
      id: 'sn39_14',
      title: 'My bucket and stop doing list',
      narrative: [
        'Stop doing list.',
        '',
        'Habits to release.',
        '',
        'Energy reclaimed.',
        '',
        'I tell habit-bound: stop list.'
      ],
      lesson: 'Stop doing lists release habits and reclaim energy.'
    },
    {
      id: 'sn39_15',
      title: 'My bucket and yes list',
      narrative: [
        'Annual yes list.',
        '',
        'Things to invite.',
        '',
        'Direction set.',
        '',
        'I tell direction-needing: yes list.'
      ],
      lesson: 'Annual yes lists invite things into life and set direction.'
    }
  ];

  var STRESS_NARRATIVES_40 = [
    {
      id: 'sn40_1',
      title: 'My bucket and emergency contacts list',
      narrative: [
        'Emergency contacts written.',
        '',
        'On fridge.',
        '',
        'Crisis-accessible.',
        '',
        'I tell at-risk: emergency list.'
      ],
      lesson: 'Emergency contacts list written on fridge provides crisis-accessible support.'
    },
    {
      id: 'sn40_2',
      title: 'My bucket and safety plan written',
      narrative: [
        'Safety plan on paper.',
        '',
        'Crisis steps clear.',
        '',
        'Pre-decided.',
        '',
        'I tell at-risk: paper safety plan.'
      ],
      lesson: 'Written safety plans with clear crisis steps pre-decided enable response.'
    },
    {
      id: 'sn40_3',
      title: 'My bucket and crisis toolkit',
      narrative: [
        'Physical crisis toolkit.',
        '',
        'Comfort items.',
        '',
        'Distraction tools.',
        '',
        'I tell crisis-prone: toolkit.'
      ],
      lesson: 'Physical crisis toolkits with comfort items and distraction tools accessible during overflow.'
    },
    {
      id: 'sn40_4',
      title: 'My bucket and grounding kit',
      narrative: [
        'Grounding kit ready.',
        '',
        'Sensory items.',
        '',
        'Quick access.',
        '',
        'I tell dissociation-prone: grounding kit.'
      ],
      lesson: 'Grounding kit with sensory items provides quick dissociation support access.'
    },
    {
      id: 'sn40_5',
      title: 'My bucket and comfort box',
      narrative: [
        'Comfort box at home.',
        '',
        'Notes, photos, soothing items.',
        '',
        'Crisis comfort.',
        '',
        'I tell home-stressed: comfort box.'
      ],
      lesson: 'Comfort boxes at home with notes, photos, soothing items provide crisis comfort.'
    },
    {
      id: 'sn40_6',
      title: 'My bucket and travel comfort kit',
      narrative: [
        'Travel comfort kit.',
        '',
        'Familiar scents.',
        '',
        'Photos.',
        '',
        'Crisis on the go.',
        '',
        'I tell travel-anxious: kit.'
      ],
      lesson: 'Travel comfort kits with familiar scents and photos support crisis on the go.'
    },
    {
      id: 'sn40_7',
      title: 'My bucket and work comfort tools',
      narrative: [
        'Desk comfort items.',
        '',
        'Stress ball.',
        '',
        'Photo of family.',
        '',
        'Quiet support.',
        '',
        'I tell work-stressed: desk comfort.'
      ],
      lesson: 'Desk comfort items like stress balls and family photos provide quiet work support.'
    },
    {
      id: 'sn40_8',
      title: 'My bucket and car comfort items',
      narrative: [
        'Car emergency comfort.',
        '',
        'Calming playlist.',
        '',
        'Water bottle.',
        '',
        'I tell commute-stressed: car comfort.'
      ],
      lesson: 'Car emergency comfort with calming playlist and water supports commute stress.'
    },
    {
      id: 'sn40_9',
      title: 'My bucket and bedside comfort items',
      narrative: [
        'Bedside support.',
        '',
        'Notes to self.',
        '',
        'Photos.',
        '',
        'Nighttime crisis ready.',
        '',
        'I tell night-anxious: bedside.'
      ],
      lesson: 'Bedside comfort items with notes and photos prepare for nighttime crisis.'
    },
    {
      id: 'sn40_10',
      title: 'My bucket and bathroom comfort',
      narrative: [
        'Bathroom safety items.',
        '',
        'Calming sprays.',
        '',
        'Cold water reminder.',
        '',
        'I tell bathroom-cryers: comfort.'
      ],
      lesson: 'Bathroom safety items provide private comfort space with reminders.'
    },
    {
      id: 'sn40_11',
      title: 'My bucket and shower comfort',
      narrative: [
        'Shower comfort routine.',
        '',
        'Soothing soap.',
        '',
        'Warm water tap.',
        '',
        'I tell tense: shower as tap.'
      ],
      lesson: 'Shower comfort routine with soothing soap and warm water provides reliable bucket tap.'
    },
    {
      id: 'sn40_12',
      title: 'My bucket and kitchen comfort foods',
      narrative: [
        'Comfort foods stocked.',
        '',
        'Tea, soup, simple meals.',
        '',
        'Cooking as tap.',
        '',
        'I tell food-comfort: stock.'
      ],
      lesson: 'Stocked comfort foods like tea, soup, simple meals provide kitchen cooking tap.'
    },
    {
      id: 'sn40_13',
      title: 'My bucket and reading nook',
      narrative: [
        'Reading nook home.',
        '',
        'Comfortable chair.',
        '',
        'Books nearby.',
        '',
        'Refuge.',
        '',
        'I tell book-lovers: nook.'
      ],
      lesson: 'Reading nooks with comfortable chair and books provide home refuge tap.'
    },
    {
      id: 'sn40_14',
      title: 'My bucket and meditation corner',
      narrative: [
        'Dedicated meditation corner.',
        '',
        'Cushion plus candle.',
        '',
        'Sacred space.',
        '',
        'I tell meditators: corner.'
      ],
      lesson: 'Dedicated meditation corner with cushion and candle creates sacred home space.'
    },
    {
      id: 'sn40_15',
      title: 'My bucket and garden refuge',
      narrative: [
        'Garden as refuge.',
        '',
        'Plants tended.',
        '',
        'Earth contact.',
        '',
        'I tell outdoor-need: garden refuge.'
      ],
      lesson: 'Gardens as refuge with tended plants provide earth contact home space.'
    }
  ];

  var STRESS_NARRATIVES_31 = [
    {
      id: 'sn31_1',
      title: 'My bucket and quiet hour',
      narrative: [
        'Daily protected hour.',
        '',
        'No interruptions.',
        '',
        'Sacred time.',
        '',
        'I tell over-scheduled: quiet hour.'
      ],
      lesson: 'Daily protected quiet hour without interruptions provides sacred bucket maintenance time.'
    },
    {
      id: 'sn31_2',
      title: 'My bucket and silent meal',
      narrative: [
        'One silent meal weekly.',
        '',
        'No phone, no talking.',
        '',
        'Full taste presence.',
        '',
        'I tell distracted-eaters: silent meal.'
      ],
      lesson: 'Weekly silent meals without phone or talking provide full taste presence.'
    },
    {
      id: 'sn31_3',
      title: 'My bucket and meditation retreat',
      narrative: [
        'Annual weekend retreat.',
        '',
        'Silent practice.',
        '',
        'Deep bucket clearing.',
        '',
        'I tell stressed: annual retreat.'
      ],
      lesson: 'Annual weekend silent meditation retreats provide deep bucket clearing.'
    },
    {
      id: 'sn31_4',
      title: 'My bucket and digital detox',
      narrative: [
        'Weekend digital detox.',
        '',
        'No screens 48 hours.',
        '',
        'Brain rests.',
        '',
        'I tell device-stressed: digital detox.'
      ],
      lesson: 'Weekend 48-hour digital detoxes rest brain from screen inflow.'
    },
    {
      id: 'sn31_5',
      title: 'My bucket and phone-free dinner',
      narrative: [
        'Family dinner phones away.',
        '',
        'Full attention.',
        '',
        'Connection tap quality.',
        '',
        'I tell distracted-families: phones away.'
      ],
      lesson: 'Family dinner with phones away preserves full attention and connection tap quality.'
    },
    {
      id: 'sn31_6',
      title: 'My bucket and one-thing focus',
      narrative: [
        'One thing at a time.',
        '',
        'No multitasking.',
        '',
        'Attention preserved.',
        '',
        'I tell multitaskers: one thing.'
      ],
      lesson: 'One thing at a time without multitasking preserves attention quality.'
    },
    {
      id: 'sn31_7',
      title: 'My bucket and listening practice',
      narrative: [
        'Listen fully.',
        '',
        'Not waiting to speak.',
        '',
        'Presence with other.',
        '',
        'I tell reactive-stressed: full listening.'
      ],
      lesson: 'Full listening without waiting to speak provides presence with other person.'
    },
    {
      id: 'sn31_8',
      title: 'My bucket and slow walking',
      narrative: [
        'Walking slowly.',
        '',
        'Each step intentional.',
        '',
        'Body present.',
        '',
        'I tell rushed: slow walk.'
      ],
      lesson: 'Slow walking with intentional steps brings body present; meditation in motion.'
    },
    {
      id: 'sn31_9',
      title: 'My bucket and slow eating',
      narrative: [
        'Chew thoroughly.',
        '',
        'Taste each bite.',
        '',
        'Digestion supported.',
        '',
        'I tell rushed-eaters: chew.'
      ],
      lesson: 'Slow eating with thorough chewing supports digestion and full taste.'
    },
    {
      id: 'sn31_10',
      title: 'My bucket and slow talking',
      narrative: [
        'Pause before speaking.',
        '',
        'Choose words.',
        '',
        'Less reactive.',
        '',
        'I tell reactive: slow talking.'
      ],
      lesson: 'Slow talking with pauses before speaking enables word choice and less reactivity.'
    },
    {
      id: 'sn31_11',
      title: 'My bucket and slow driving',
      narrative: [
        'Drive at speed limit.',
        '',
        'No rushing.',
        '',
        'Stress reduced.',
        '',
        'I tell rushed-drivers: slow.'
      ],
      lesson: 'Slow driving at speed limit without rushing reduces stress.'
    },
    {
      id: 'sn31_12',
      title: 'My bucket and slow morning',
      narrative: [
        '90 minute slow morning.',
        '',
        'No rushing.',
        '',
        'Day begun gently.',
        '',
        'I tell rushed-mornings: slow start.'
      ],
      lesson: 'Ninety minute slow mornings without rushing begin day gently.'
    },
    {
      id: 'sn31_13',
      title: 'My bucket and slow evening',
      narrative: [
        'Slow evening hour.',
        '',
        'No rushing to bed.',
        '',
        'Body transitions.',
        '',
        'I tell rushed-evenings: slow wind down.'
      ],
      lesson: 'Slow evening hours without rushing to bed enable body sleep transition.'
    },
    {
      id: 'sn31_14',
      title: 'My bucket and seasonal pace',
      narrative: [
        'Winter slower.',
        '',
        'Summer more active.',
        '',
        'Pace matches season.',
        '',
        'I tell rigid-pace: seasonal.'
      ],
      lesson: 'Seasonal pace with winter slower and summer active matches body to natural rhythm.'
    },
    {
      id: 'sn31_15',
      title: 'My bucket and life pace',
      narrative: [
        'Slower life pace overall.',
        '',
        'Less ambition.',
        '',
        'More presence.',
        '',
        'I tell ambitious-stressed: slow life.'
      ],
      lesson: 'Slower life pace overall with less ambition allows more present living.'
    }
  ];

  var STRESS_NARRATIVES_32 = [
    {
      id: 'sn32_1',
      title: 'My bucket and creative play',
      narrative: [
        'No purpose creating.',
        '',
        'Just play.',
        '',
        'Inner child plays.',
        '',
        'I tell serious: creative play.'
      ],
      lesson: 'No-purpose creative play activates inner child; bucket drains through play.'
    },
    {
      id: 'sn32_2',
      title: 'My bucket and coloring books',
      narrative: [
        'Adult coloring book.',
        '',
        'Hands busy.',
        '',
        'Mind absorbed.',
        '',
        'I tell stuck-stressed: coloring book.'
      ],
      lesson: 'Adult coloring books keep hands busy and mind absorbed; simple bucket tap.'
    },
    {
      id: 'sn32_3',
      title: 'My bucket and watercolors',
      narrative: [
        'Watercolor practice.',
        '',
        'Forgiving medium.',
        '',
        'Just play.',
        '',
        'I tell visual-curious: watercolor play.'
      ],
      lesson: 'Watercolor practice as forgiving medium enables play without perfection pressure.'
    },
    {
      id: 'sn32_4',
      title: 'My bucket and clay play',
      narrative: [
        'Clay in hands.',
        '',
        'Squish, shape, rebuild.',
        '',
        'Sensory tap.',
        '',
        'I tell hands-busy: clay play.'
      ],
      lesson: 'Clay play with squishing and shaping provides sensory hands-busy bucket tap.'
    },
    {
      id: 'sn32_5',
      title: 'My bucket and sand play',
      narrative: [
        'Sand tray therapy.',
        '',
        'Adult play.',
        '',
        'Subconscious surfaces.',
        '',
        'I tell stuck-stressed: sand play.'
      ],
      lesson: 'Sand tray therapy provides adult play; subconscious surfaces through tactile engagement.'
    },
    {
      id: 'sn32_6',
      title: 'My bucket and games with friends',
      narrative: [
        'Board games weekly.',
        '',
        'Play and laughter.',
        '',
        'Connection plus fun.',
        '',
        'I tell adult-too-serious: game night.'
      ],
      lesson: 'Weekly board games with friends combine play, laughter, connection, fun for adults.'
    },
    {
      id: 'sn32_7',
      title: 'My bucket and video games',
      narrative: [
        'Casual video games.',
        '',
        'Mind absorbed.',
        '',
        'Limit time.',
        '',
        'I tell gaming-curious: casual games.'
      ],
      lesson: 'Casual video games absorb mind; limit time as one tap not main coping.'
    },
    {
      id: 'sn32_8',
      title: 'My bucket and puzzles',
      narrative: [
        'Jigsaw puzzles.',
        '',
        '1000 piece.',
        '',
        'Mind absorbed.',
        '',
        'I tell focus-curious: puzzles.'
      ],
      lesson: '1000-piece jigsaw puzzles absorb mind in focused flow state.'
    },
    {
      id: 'sn32_9',
      title: 'My bucket and crossword',
      narrative: [
        'Daily crossword.',
        '',
        'Mind challenged.',
        '',
        'Brain exercised.',
        '',
        'I tell word-curious: crossword.'
      ],
      lesson: 'Daily crossword challenges and exercises brain; word puzzle tap.'
    },
    {
      id: 'sn32_10',
      title: 'My bucket and sudoku',
      narrative: [
        'Daily sudoku.',
        '',
        'Logic challenge.',
        '',
        'Focused absorption.',
        '',
        'I tell logic-curious: sudoku.'
      ],
      lesson: 'Daily sudoku provides logic challenge focused absorption.'
    },
    {
      id: 'sn32_11',
      title: 'My bucket and chess',
      narrative: [
        'Online chess daily.',
        '',
        'Strategic absorption.',
        '',
        'Bucket paused.',
        '',
        'I tell strategy-curious: chess.'
      ],
      lesson: 'Daily online chess provides strategic absorption; bucket paused during play.'
    },
    {
      id: 'sn32_12',
      title: 'My bucket and bridge',
      narrative: [
        'Weekly bridge club.',
        '',
        'Strategy plus community.',
        '',
        'Mind plus connection.',
        '',
        'I tell card-curious: bridge.'
      ],
      lesson: 'Weekly bridge clubs combine strategy and community; mind plus connection taps.'
    },
    {
      id: 'sn32_13',
      title: 'My bucket and mahjong',
      narrative: [
        'Weekly mahjong.',
        '',
        'Strategy plus community.',
        '',
        'Asian heritage.',
        '',
        'I tell community-seeking: mahjong.'
      ],
      lesson: 'Weekly mahjong combines strategy and community; cultural heritage connection.'
    },
    {
      id: 'sn32_14',
      title: 'My bucket and reading fiction',
      narrative: [
        'Fiction transports.',
        '',
        'Other world.',
        '',
        'Mind drained.',
        '',
        'I tell stuck-mind: fiction.'
      ],
      lesson: 'Fiction transports mind to other worlds; bucket mind drained through absorption.'
    },
    {
      id: 'sn32_15',
      title: 'My bucket and reading poetry',
      narrative: [
        'Daily poem.',
        '',
        'Slow attention.',
        '',
        'Image absorbed.',
        '',
        'I tell deep-readers: daily poem.'
      ],
      lesson: 'Daily poems require slow attention; image absorbed deeply.'
    }
  ];

  var STRESS_NARRATIVES_33 = [
    {
      id: 'sn33_1',
      title: 'My bucket and volunteer service',
      narrative: [
        'Weekly volunteer.',
        '',
        'Service to others.',
        '',
        'Self-focus shifts.',
        '',
        'I tell self-focused: service.'
      ],
      lesson: 'Weekly volunteer service shifts self-focus through serving others; bucket lighter.'
    },
    {
      id: 'sn33_2',
      title: 'My bucket and animal shelter volunteering',
      narrative: [
        'Animal shelter volunteer.',
        '',
        'Cats and dogs.',
        '',
        'Grounded by animals.',
        '',
        'I tell purpose-seeking: shelter volunteer.'
      ],
      lesson: 'Animal shelter volunteering with cats and dogs grounds through animal presence.'
    },
    {
      id: 'sn33_3',
      title: 'My bucket and library volunteering',
      narrative: [
        'Library volunteer.',
        '',
        'Quiet service.',
        '',
        'Books surround.',
        '',
        'I tell quiet-volunteer: library.'
      ],
      lesson: 'Library volunteering provides quiet service surrounded by books.'
    },
    {
      id: 'sn33_4',
      title: 'My bucket and food pantry',
      narrative: [
        'Food pantry volunteer.',
        '',
        'Direct service.',
        '',
        'Need met visibly.',
        '',
        'I tell visible-impact: food pantry.'
      ],
      lesson: 'Food pantry volunteering provides direct service with visible need met.'
    },
    {
      id: 'sn33_5',
      title: 'My bucket and soup kitchen',
      narrative: [
        'Soup kitchen weekly.',
        '',
        'Meal preparation.',
        '',
        'Community feeding.',
        '',
        'I tell food-volunteering: soup kitchen.'
      ],
      lesson: 'Weekly soup kitchen volunteering through meal preparation feeds community.'
    },
    {
      id: 'sn33_6',
      title: 'My bucket and hospice volunteering',
      narrative: [
        'Hospice volunteer.',
        '',
        'Presence with dying.',
        '',
        'Perspective shifts.',
        '',
        'I tell perspective-seeking: hospice.'
      ],
      lesson: 'Hospice volunteering provides presence with dying; perspective shifts through service.'
    },
    {
      id: 'sn33_7',
      title: 'My bucket and hospital volunteering',
      narrative: [
        'Hospital volunteer.',
        '',
        'Patient visits.',
        '',
        'Service plus presence.',
        '',
        'I tell healthcare-curious: hospital volunteer.'
      ],
      lesson: 'Hospital volunteering combines service and presence through patient visits.'
    },
    {
      id: 'sn33_8',
      title: 'My bucket and school tutoring',
      narrative: [
        'After-school tutoring.',
        '',
        'Help kids learn.',
        '',
        'Direct impact.',
        '',
        'I tell teacher-hearts: tutoring.'
      ],
      lesson: 'After-school tutoring provides direct impact through helping kids learn.'
    },
    {
      id: 'sn33_9',
      title: 'My bucket and mentoring youth',
      narrative: [
        'Big Brothers Big Sisters.',
        '',
        'Match with youth.',
        '',
        'Long-term mentorship.',
        '',
        'I tell mentor-curious: youth mentoring.'
      ],
      lesson: 'Big Brothers Big Sisters mentoring provides long-term youth match relationships.'
    },
    {
      id: 'sn33_10',
      title: 'My bucket and environmental volunteering',
      narrative: [
        'Park clean-ups.',
        '',
        'Beach clean-ups.',
        '',
        'Earth service.',
        '',
        'I tell environmental-curious: clean-ups.'
      ],
      lesson: 'Park and beach clean-ups provide environmental Earth service volunteering.'
    },
    {
      id: 'sn33_11',
      title: 'My bucket and political volunteering',
      narrative: [
        'Campaign volunteer.',
        '',
        'Phone banking.',
        '',
        'Door knocking.',
        '',
        'I tell civically engaged: campaigns.'
      ],
      lesson: 'Campaign volunteering through phone banking and door knocking engages civically.'
    },
    {
      id: 'sn33_12',
      title: 'My bucket and faith community service',
      narrative: [
        'Church/temple/mosque service.',
        '',
        'Faith community gives back.',
        '',
        'I tell faithful: community service.'
      ],
      lesson: 'Faith community service through church temple mosque gives back to community.'
    },
    {
      id: 'sn33_13',
      title: 'My bucket and chosen family service',
      narrative: [
        'Help chosen family.',
        '',
        'Errands for sick friend.',
        '',
        'Connection through service.',
        '',
        'I tell friend-helpers: errands.'
      ],
      lesson: 'Chosen family service like errands for sick friends connects through service.'
    },
    {
      id: 'sn33_14',
      title: 'My bucket and neighbor service',
      narrative: [
        'Help elderly neighbor.',
        '',
        'Snow shoveling.',
        '',
        'Garbage cans.',
        '',
        'I tell neighborhood-connected: small help.'
      ],
      lesson: 'Small neighbor service like snow shoveling and garbage cans connects neighborhood.'
    },
    {
      id: 'sn33_15',
      title: 'My bucket and giving money',
      narrative: [
        'Annual donations.',
        '',
        'Causes I care about.',
        '',
        'Impact through resources.',
        '',
        'I tell financially-able: donations.'
      ],
      lesson: 'Annual donations to causes provide impact through financial resources.'
    }
  ];

  var STRESS_NARRATIVES_34 = [
    {
      id: 'sn34_1',
      title: 'My bucket and learning',
      narrative: [
        'New skill weekly.',
        '',
        'Brain engaged.',
        '',
        'Growth tap.',
        '',
        'I tell stagnant-stressed: learning.'
      ],
      lesson: 'Weekly new skill learning engages brain through growth tap.'
    },
    {
      id: 'sn34_2',
      title: 'My bucket and language learning',
      narrative: [
        'Daily 15 min Duolingo.',
        '',
        'Slow mastery.',
        '',
        'Cognitive engagement.',
        '',
        'I tell linguistically-curious: Duolingo.'
      ],
      lesson: 'Daily 15-minute Duolingo language learning provides cognitive engagement through slow mastery.'
    },
    {
      id: 'sn34_3',
      title: 'My bucket and instrument learning',
      narrative: [
        'Piano lessons weekly.',
        '',
        'Body plus mind plus music.',
        '',
        'Multiple taps.',
        '',
        'I tell music-curious: piano.'
      ],
      lesson: 'Weekly piano lessons combine body, mind, music taps in multiple engagement.'
    },
    {
      id: 'sn34_4',
      title: 'My bucket and online courses',
      narrative: [
        'Coursera weekly course.',
        '',
        'New subject monthly.',
        '',
        'Brain stretched.',
        '',
        'I tell intellectual-curious: online courses.'
      ],
      lesson: 'Weekly Coursera courses on monthly new subjects stretch brain through learning.'
    },
    {
      id: 'sn34_5',
      title: 'My bucket and book club reading',
      narrative: [
        'Monthly book club book.',
        '',
        'Diverse subjects.',
        '',
        'Discussion plus reading.',
        '',
        'I tell readers: book club.'
      ],
      lesson: 'Monthly book club books with diverse subjects combine discussion and reading.'
    },
    {
      id: 'sn34_6',
      title: 'My bucket and podcast listening',
      narrative: [
        'Daily walking podcast.',
        '',
        'Learning while moving.',
        '',
        'Stacked taps.',
        '',
        'I tell movement-walking: podcast.'
      ],
      lesson: 'Daily walking podcasts stack learning while moving for combined tap.'
    },
    {
      id: 'sn34_7',
      title: 'My bucket and history learning',
      narrative: [
        'Historical fiction.',
        '',
        'Time periods explored.',
        '',
        'Perspective gained.',
        '',
        'I tell history-curious: historical fiction.'
      ],
      lesson: 'Historical fiction explores time periods through narrative; perspective gained.'
    },
    {
      id: 'sn34_8',
      title: 'My bucket and science learning',
      narrative: [
        'Science podcasts.',
        '',
        'New discoveries.',
        '',
        'Wonder cultivated.',
        '',
        'I tell wonder-seeking: science.'
      ],
      lesson: 'Science podcasts share new discoveries; wonder cultivated through ongoing learning.'
    },
    {
      id: 'sn34_9',
      title: 'My bucket and philosophy learning',
      narrative: [
        'Philosophy classes.',
        '',
        'Big questions.',
        '',
        'Mind stretched.',
        '',
        'I tell deep-thinkers: philosophy.'
      ],
      lesson: 'Philosophy classes engage big questions; mind stretched through deep thinking.'
    },
    {
      id: 'sn34_10',
      title: 'My bucket and art history',
      narrative: [
        'Art history online.',
        '',
        'Visual culture.',
        '',
        'Museum visits richer.',
        '',
        'I tell visual-curious: art history.'
      ],
      lesson: 'Online art history makes museum visits richer through visual culture knowledge.'
    },
    {
      id: 'sn34_11',
      title: 'My bucket and astronomy',
      narrative: [
        'Astronomy podcast.',
        '',
        'Stars and galaxies.',
        '',
        'Perspective shift.',
        '',
        'I tell perspective-needing: astronomy.'
      ],
      lesson: 'Astronomy podcasts share stars and galaxies; perspective shift through cosmic scale.'
    },
    {
      id: 'sn34_12',
      title: 'My bucket and botany',
      narrative: [
        'Plant identification.',
        '',
        'Local plants known.',
        '',
        'Nature richer.',
        '',
        'I tell nature-curious: botany.'
      ],
      lesson: 'Plant identification makes nature richer; local plants known through learning.'
    },
    {
      id: 'sn34_13',
      title: 'My bucket and birdwatching learning',
      narrative: [
        'Bird ID app.',
        '',
        'Species learned.',
        '',
        'Walks richer.',
        '',
        'I tell walks-curious: bird app.'
      ],
      lesson: 'Bird ID app teaches species; walks richer through bird identification.'
    },
    {
      id: 'sn34_14',
      title: 'My bucket and history podcasts',
      narrative: [
        'History podcasts daily.',
        '',
        'Stories absorbed.',
        '',
        'Context built.',
        '',
        'I tell history-curious: podcasts.'
      ],
      lesson: 'Daily history podcasts absorb stories and build context through audio.'
    },
    {
      id: 'sn34_15',
      title: 'My bucket and biographies',
      narrative: [
        'Biographies monthly.',
        '',
        'Lives explored.',
        '',
        'Wisdom from others.',
        '',
        'I tell wisdom-seeking: biographies.'
      ],
      lesson: 'Monthly biographies explore lives; wisdom from others lives lived.'
    }
  ];

  var STRESS_NARRATIVES_35 = [
    {
      id: 'sn35_1',
      title: 'My bucket and weekly date with self',
      narrative: [
        'Weekly self-date.',
        '',
        'Solo activity.',
        '',
        'Self-love practice.',
        '',
        'I tell over-giving: self-date.'
      ],
      lesson: 'Weekly self-dates with solo activities provide self-love practice for over-givers.'
    },
    {
      id: 'sn35_2',
      title: 'My bucket and self-massage',
      narrative: [
        'Self-massage tools.',
        '',
        'Foam roller, lacrosse ball.',
        '',
        'Body tension released.',
        '',
        'I tell tense: self-massage.'
      ],
      lesson: 'Self-massage tools like foam rollers and lacrosse balls release body tension.'
    },
    {
      id: 'sn35_3',
      title: 'My bucket and self-care morning',
      narrative: [
        'Long self-care morning.',
        '',
        'Bath, breakfast, journal.',
        '',
        'Self attended.',
        '',
        'I tell self-neglecting: self-care morning.'
      ],
      lesson: 'Long self-care mornings with bath, breakfast, journal attend self deliberately.'
    },
    {
      id: 'sn35_4',
      title: 'My bucket and self-care evening',
      narrative: [
        'Evening self-care.',
        '',
        'Skin care plus tea plus book.',
        '',
        'Day completion.',
        '',
        'I tell rushed-evenings: care evening.'
      ],
      lesson: 'Evening self-care with skin care, tea, book provides day completion ritual.'
    },
    {
      id: 'sn35_5',
      title: 'My bucket and self-care weekend',
      narrative: [
        'Weekend self-care day.',
        '',
        'No obligations.',
        '',
        'Just self.',
        '',
        'I tell over-scheduled: care weekend.'
      ],
      lesson: 'Weekend self-care days without obligations provide deep self attention.'
    },
    {
      id: 'sn35_6',
      title: 'My bucket and pampering',
      narrative: [
        'Monthly pampering.',
        '',
        'Spa day or salon.',
        '',
        'Body attended.',
        '',
        'I tell self-neglecting: pampering.'
      ],
      lesson: 'Monthly pampering through spa or salon attends body deliberately.'
    },
    {
      id: 'sn35_7',
      title: 'My bucket and treat yourself',
      narrative: [
        'Small treats daily.',
        '',
        'Favorite coffee.',
        '',
        'Self-acknowledgment.',
        '',
        'I tell deserve-doubting: small treats.'
      ],
      lesson: 'Small daily treats like favorite coffee provide self-acknowledgment moments.'
    },
    {
      id: 'sn35_8',
      title: 'My bucket and saying yes to joy',
      narrative: [
        'Yes to joy.',
        '',
        'Spontaneous pleasures.',
        '',
        'Bucket lifts.',
        '',
        'I tell joyless-stressed: yes to joy.'
      ],
      lesson: 'Saying yes to spontaneous joy and pleasures lifts bucket through positive moments.'
    },
    {
      id: 'sn35_9',
      title: 'My bucket and play time',
      narrative: [
        'Weekly play.',
        '',
        'No purpose.',
        '',
        'Just fun.',
        '',
        'Inner child.',
        '',
        'I tell serious-stressed: play.'
      ],
      lesson: 'Weekly play time without purpose activates inner child; bucket lifts through fun.'
    },
    {
      id: 'sn35_10',
      title: 'My bucket and dancing alone',
      narrative: [
        'Living room dancing.',
        '',
        'No audience.',
        '',
        'Body expressed.',
        '',
        'I tell self-conscious: solo dancing.'
      ],
      lesson: 'Living room solo dancing without audience expresses body freely.'
    },
    {
      id: 'sn35_11',
      title: 'My bucket and singing in shower',
      narrative: [
        'Shower singing.',
        '',
        'Voice unjudged.',
        '',
        'Vagal stimulation.',
        '',
        'I tell shy-voice: shower singing.'
      ],
      lesson: 'Shower singing with voice unjudged provides vagal nerve stimulation.'
    },
    {
      id: 'sn35_12',
      title: 'My bucket and silly faces',
      narrative: [
        'Silly faces in mirror.',
        '',
        'Self-laughter.',
        '',
        'Mood lifted.',
        '',
        'I tell heavy-stressed: silliness.'
      ],
      lesson: 'Silly faces in mirror produce self-laughter; mood lifted through silliness.'
    },
    {
      id: 'sn35_13',
      title: 'My bucket and laugh out loud',
      narrative: [
        'Funny videos daily.',
        '',
        'Laughter medicine.',
        '',
        'Chemistry shifts.',
        '',
        'I tell heavy-mood: laughter.'
      ],
      lesson: 'Daily funny videos provide laughter medicine; brain chemistry shifts.'
    },
    {
      id: 'sn35_14',
      title: 'My bucket and comedy show',
      narrative: [
        'Weekly comedy show.',
        '',
        'Live laughter.',
        '',
        'Community laughter.',
        '',
        'I tell laugh-curious: live comedy.'
      ],
      lesson: 'Weekly comedy shows provide live community laughter experience.'
    },
    {
      id: 'sn35_15',
      title: 'My bucket and joy practice',
      narrative: [
        'Joy practice daily.',
        '',
        'Notice three joys.',
        '',
        'Brain trained.',
        '',
        'I tell joyless: joy practice.'
      ],
      lesson: 'Daily joy practice noticing three joys trains brain toward positive awareness.'
    }
  ];

  var STRESS_NARRATIVES_26 = [
    {
      id: 'sn26_1',
      title: 'My bucket and morning sun on porch',
      narrative: [
        'Sun on face.',
        '',
        'Circadian aligned.',
        '',
        'Body knows morning.',
        '',
        'I tell circadian-disrupted: morning sun.'
      ],
      lesson: 'Morning sun on porch aligns circadian rhythm; body knows morning through natural cue.'
    },
    {
      id: 'sn26_2',
      title: 'My bucket and afternoon walk',
      narrative: [
        'Walk after lunch.',
        '',
        'Movement plus light.',
        '',
        'Energy maintained.',
        '',
        'I tell afternoon-slumpers: walk.'
      ],
      lesson: 'Afternoon walks after lunch combine movement and light; energy maintained against slumps.'
    },
    {
      id: 'sn26_3',
      title: 'My bucket and evening wind down',
      narrative: [
        'Hour before bed.',
        '',
        'No screens.',
        '',
        'Dim lights.',
        '',
        'Body prepares sleep.',
        '',
        'I tell sleep-troubled: wind down.'
      ],
      lesson: 'Evening wind down hour before bed with no screens and dim lights prepares sleep.'
    },
    {
      id: 'sn26_4',
      title: 'My bucket and morning movement',
      narrative: [
        'Movement non-negotiable.',
        '',
        '20 min minimum.',
        '',
        'Day starts engaged.',
        '',
        'I tell sedentary: morning movement.'
      ],
      lesson: 'Non-negotiable 20-minute morning movement starts day engaged; bucket primed.'
    },
    {
      id: 'sn26_5',
      title: 'My bucket and evening movement',
      narrative: [
        'Evening walk.',
        '',
        '30 min slow.',
        '',
        'Body settled.',
        '',
        'I tell evening-anxious: walk.'
      ],
      lesson: 'Evening 30-minute slow walks settle body; bucket drains before sleep.'
    },
    {
      id: 'sn26_6',
      title: 'My bucket and morning protein',
      narrative: [
        'Protein breakfast.',
        '',
        'Blood sugar steady.',
        '',
        'Energy stable.',
        '',
        'I tell unstable: protein morning.'
      ],
      lesson: 'Morning protein steadies blood sugar; energy stable throughout day.'
    },
    {
      id: 'sn26_7',
      title: 'My bucket and hydration',
      narrative: [
        'Water bottle present.',
        '',
        'Sip throughout.',
        '',
        'Body hydrated.',
        '',
        'I tell dehydrated: water bottle.'
      ],
      lesson: 'Water bottle present with sipping throughout day maintains body hydration.'
    },
    {
      id: 'sn26_8',
      title: 'My bucket and electrolytes',
      narrative: [
        'Electrolyte balance.',
        '',
        'Magnesium for sleep.',
        '',
        'Sodium for energy.',
        '',
        'I tell exercise-stressed: electrolytes.'
      ],
      lesson: 'Electrolyte balance with magnesium for sleep and sodium for energy supports body.'
    },
    {
      id: 'sn26_9',
      title: 'My bucket and balanced meals',
      narrative: [
        'Plate balance.',
        '',
        'Protein, carbs, fats, vegetables.',
        '',
        'Energy stable.',
        '',
        'I tell food-stressed: balanced plate.'
      ],
      lesson: 'Balanced plate with protein, carbs, fats, vegetables provides stable energy.'
    },
    {
      id: 'sn26_10',
      title: 'My bucket and gut health',
      narrative: [
        'Probiotics daily.',
        '',
        'Fermented foods.',
        '',
        'Gut-brain axis.',
        '',
        'I tell gut-stressed: probiotics.'
      ],
      lesson: 'Daily probiotics and fermented foods support gut-brain axis bucket connection.'
    },
    {
      id: 'sn26_11',
      title: 'My bucket and elimination diet',
      narrative: [
        'Elimination diet trial.',
        '',
        'Trigger foods identified.',
        '',
        'Inflammation reduced.',
        '',
        'I tell food-sensitive: elimination trial.'
      ],
      lesson: 'Elimination diet trials identify trigger foods; inflammation reduction supports bucket capacity.'
    },
    {
      id: 'sn26_12',
      title: 'My bucket and intermittent fasting',
      narrative: [
        '16:8 fasting.',
        '',
        'Body discipline.',
        '',
        'Mental clarity.',
        '',
        'I tell food-curious: IF works.'
      ],
      lesson: 'Intermittent fasting 16:8 provides body discipline and mental clarity benefits.'
    },
    {
      id: 'sn26_13',
      title: 'My bucket and sugar reduction',
      narrative: [
        'Reduced sugar.',
        '',
        'Mood swings reduced.',
        '',
        'Energy stable.',
        '',
        'I tell sugar-heavy: reduce.'
      ],
      lesson: 'Reduced sugar reduces mood swings; energy stable through pharmacological subtraction.'
    },
    {
      id: 'sn26_14',
      title: 'My bucket and whole foods',
      narrative: [
        'Whole foods plate.',
        '',
        'Minimal processed.',
        '',
        'Body responds.',
        '',
        'I tell processed-heavy: whole foods.'
      ],
      lesson: 'Whole foods plate with minimal processed responds well in body bucket capacity.'
    },
    {
      id: 'sn26_15',
      title: 'My bucket and mindful eating',
      narrative: [
        'Mindful eating practice.',
        '',
        'Slow chewing.',
        '',
        'Senses engaged.',
        '',
        'I tell rushed-eaters: mindful.'
      ],
      lesson: 'Mindful eating with slow chewing and senses engaged supports digestion and bucket awareness.'
    }
  ];

  var STRESS_NARRATIVES_27 = [
    {
      id: 'sn27_1',
      title: 'My bucket and bedtime routine',
      narrative: [
        'Same sequence nightly.',
        '',
        'Bath, book, bed.',
        '',
        'Body predicts sleep.',
        '',
        'I tell sleep-anxious: routine.'
      ],
      lesson: 'Consistent bedtime routine of bath, book, bed enables body prediction of sleep.'
    },
    {
      id: 'sn27_2',
      title: 'My bucket and screens before bed',
      narrative: [
        'No screens hour before.',
        '',
        'Blue light avoided.',
        '',
        'Melatonin protected.',
        '',
        'I tell screen-late: hour before.'
      ],
      lesson: 'No screens hour before bed protects melatonin from blue light disruption.'
    },
    {
      id: 'sn27_3',
      title: 'My bucket and cool bedroom',
      narrative: [
        '65 degrees bedroom.',
        '',
        'Sleep-supportive temperature.',
        '',
        'Body cools naturally.',
        '',
        'I tell warm-sleepers: cool bedroom.'
      ],
      lesson: 'Cool 65 degree bedroom supports sleep through body natural cooling.'
    },
    {
      id: 'sn27_4',
      title: 'My bucket and dark bedroom',
      narrative: [
        'Blackout curtains.',
        '',
        'Total darkness.',
        '',
        'Melatonin maximized.',
        '',
        'I tell light-sensitive: blackout.'
      ],
      lesson: 'Blackout curtains create total darkness; melatonin maximized for deeper sleep.'
    },
    {
      id: 'sn27_5',
      title: 'My bucket and consistent bedtime',
      narrative: [
        'Same bedtime nightly.',
        '',
        'Even weekends.',
        '',
        'Circadian stable.',
        '',
        'I tell variable-sleepers: consistent.'
      ],
      lesson: 'Consistent bedtime even on weekends stabilizes circadian rhythm.'
    },
    {
      id: 'sn27_6',
      title: 'My bucket and 9 hours sleep',
      narrative: [
        '9 hours nightly.',
        '',
        'Full restoration.',
        '',
        'Bucket regenerates.',
        '',
        'I tell short-sleepers: 9 hours.'
      ],
      lesson: 'Nine hours nightly sleep provides full restoration; bucket regenerates through extended rest.'
    },
    {
      id: 'sn27_7',
      title: 'My bucket and sleep hygiene',
      narrative: [
        'Phone outside bedroom.',
        '',
        'No TV in bedroom.',
        '',
        'Bedroom for sleep only.',
        '',
        'I tell mixed-use: bedroom is for sleep.'
      ],
      lesson: 'Sleep hygiene with bedroom for sleep only excludes phones and TVs for protected space.'
    },
    {
      id: 'sn27_8',
      title: 'My bucket and morning sunlight',
      narrative: [
        '10 min outside morning.',
        '',
        'Circadian aligned.',
        '',
        'Cortisol regulated.',
        '',
        'I tell sleep-anxious: morning sun.'
      ],
      lesson: 'Ten minutes morning sunlight aligns circadian; cortisol regulated naturally.'
    },
    {
      id: 'sn27_9',
      title: 'My bucket and weighted blanket',
      narrative: [
        'Weighted blanket use.',
        '',
        'Deep pressure stimulation.',
        '',
        'Body calms.',
        '',
        'I tell anxious-sleepers: weighted blanket.'
      ],
      lesson: 'Weighted blankets provide deep pressure stimulation; body calms for sleep.'
    },
    {
      id: 'sn27_10',
      title: 'My bucket and lavender pillow',
      narrative: [
        'Lavender spray pillow.',
        '',
        'Scent calming.',
        '',
        'Sleep-associated cue.',
        '',
        'I tell scent-curious: lavender.'
      ],
      lesson: 'Lavender pillow spray provides calming scent cue associated with sleep.'
    },
    {
      id: 'sn27_11',
      title: 'My bucket and white noise machine',
      narrative: [
        'White noise machine.',
        '',
        'Brain quieted.',
        '',
        'External sounds masked.',
        '',
        'I tell noisy-environment: white noise.'
      ],
      lesson: 'White noise machines quiet brain by masking external sounds; sleep supported.'
    },
    {
      id: 'sn27_12',
      title: 'My bucket and herbal tea before bed',
      narrative: [
        'Chamomile tea.',
        '',
        'Warm liquid.',
        '',
        'Calming compounds.',
        '',
        'I tell pre-sleep: tea ritual.'
      ],
      lesson: 'Chamomile tea before bed combines warm liquid ritual with calming compounds.'
    },
    {
      id: 'sn27_13',
      title: 'My bucket and warm shower before bed',
      narrative: [
        'Warm shower 90 min before.',
        '',
        'Body cools after.',
        '',
        'Sleep induced.',
        '',
        'I tell sleep-troubled: warm shower.'
      ],
      lesson: 'Warm shower 90 min before bed induces sleep through subsequent body cooling.'
    },
    {
      id: 'sn27_14',
      title: 'My bucket and bedtime reading',
      narrative: [
        'Physical book before bed.',
        '',
        'No screens.',
        '',
        'Mind absorbed.',
        '',
        'I tell screen-stuck: physical book.'
      ],
      lesson: 'Physical book bedtime reading without screens absorbs mind for sleep transition.'
    },
    {
      id: 'sn27_15',
      title: 'My bucket and bedtime gratitude',
      narrative: [
        'Three gratitudes at bedtime.',
        '',
        'Brain shifts.',
        '',
        'Sleep welcomed.',
        '',
        'I tell anxious-sleepers: gratitude.'
      ],
      lesson: 'Three bedtime gratitudes shift brain; sleep welcomed through positive focus.'
    }
  ];

  var STRESS_NARRATIVES_28 = [
    {
      id: 'sn28_1',
      title: 'My bucket and emotional regulation skills',
      narrative: [
        'Name the feeling.',
        '',
        'Locate in body.',
        '',
        'Breathe with it.',
        '',
        'Let it move.',
        '',
        'I tell emotion-stuck: name locate breathe.'
      ],
      lesson: 'Emotional regulation through naming, locating, breathing with feelings lets them move.'
    },
    {
      id: 'sn28_2',
      title: 'My bucket and cognitive reframing',
      narrative: [
        'Catastrophic thought caught.',
        '',
        'Reframed realistically.',
        '',
        'Bucket inflow reduced.',
        '',
        'I tell catastrophizing: reframe.'
      ],
      lesson: 'Cognitive reframing of catastrophic thoughts reduces bucket inflow through realism.'
    },
    {
      id: 'sn28_3',
      title: 'My bucket and thought stopping',
      narrative: [
        'Worry thoughts caught.',
        '',
        'STOP technique.',
        '',
        'Interruption.',
        '',
        'I tell ruminating: thought stopping.'
      ],
      lesson: 'Thought stopping technique interrupts worry rumination cycles.'
    },
    {
      id: 'sn28_4',
      title: 'My bucket and worry time',
      narrative: [
        'Scheduled worry time.',
        '',
        '15 min daily.',
        '',
        'Rest of day off limits.',
        '',
        'I tell ruminating: worry scheduled.'
      ],
      lesson: 'Scheduled worry time of 15 min daily contains worry to specific window.'
    },
    {
      id: 'sn28_5',
      title: 'My bucket and worry park',
      narrative: [
        'Notebook worry park.',
        '',
        'Write down.',
        '',
        'Return tomorrow.',
        '',
        'Sleep enabled.',
        '',
        'I tell nighttime-worriers: park notebook.'
      ],
      lesson: 'Notebook worry park writes worries for tomorrow review; enables sleep through containment.'
    },
    {
      id: 'sn28_6',
      title: 'My bucket and acceptance practice',
      narrative: [
        'Cannot change what is.',
        '',
        'Accept reality.',
        '',
        'Resistance drops.',
        '',
        'Bucket lightens.',
        '',
        'I tell resisting: acceptance.'
      ],
      lesson: 'Acceptance practice drops resistance to unchangeable reality; bucket lightens.'
    },
    {
      id: 'sn28_7',
      title: 'My bucket and radical acceptance',
      narrative: [
        'DBT radical acceptance.',
        '',
        'Full acceptance.',
        '',
        'No fighting reality.',
        '',
        'I tell DBT-curious: radical acceptance.'
      ],
      lesson: 'DBT radical acceptance is full acceptance without fighting reality; bucket relief.'
    },
    {
      id: 'sn28_8',
      title: 'My bucket and self-compassion break',
      narrative: [
        'This is hard moment.',
        '',
        'Hardness is part of human.',
        '',
        'May I be kind to myself.',
        '',
        'I tell self-critical: compassion break.'
      ],
      lesson: 'Self-compassion break three steps softens self-critical inflow in hard moments.'
    },
    {
      id: 'sn28_9',
      title: 'My bucket and inner critic redirect',
      narrative: [
        'Inner critic caught.',
        '',
        'Imagine friend instead.',
        '',
        'Would I speak this way?',
        '',
        'I tell self-critical: friend perspective.'
      ],
      lesson: 'Inner critic redirect through imagining friend perspective softens self-talk.'
    },
    {
      id: 'sn28_10',
      title: 'My bucket and emotion surfing',
      narrative: [
        'Emotion as wave.',
        '',
        'Ride it out.',
        '',
        'Passes naturally.',
        '',
        'I tell intense-emotions: wave surf.'
      ],
      lesson: 'Emotion surfing rides waves until they pass naturally; bucket overflow prevented.'
    },
    {
      id: 'sn28_11',
      title: 'My bucket and TIPP DBT skill',
      narrative: [
        'Temperature, intense exercise.',
        '',
        'Paced breathing, paired muscle.',
        '',
        'Quick distress tolerance.',
        '',
        'I tell crisis-prone: TIPP.'
      ],
      lesson: 'TIPP DBT skill of temperature, intense exercise, paced breathing, paired muscle provides quick distress tolerance.'
    },
    {
      id: 'sn28_12',
      title: 'My bucket and STOP DBT skill',
      narrative: [
        'Stop, take step back.',
        '',
        'Observe, proceed mindfully.',
        '',
        'Pause before reacting.',
        '',
        'I tell reactive: STOP skill.'
      ],
      lesson: 'STOP DBT skill of stop, step back, observe, proceed mindfully pauses reaction.'
    },
    {
      id: 'sn28_13',
      title: 'My bucket and PLEASE DBT skill',
      narrative: [
        'Physical illness treat.',
        '',
        'Balanced eating.',
        '',
        'Avoid substances.',
        '',
        'Sleep balanced.',
        '',
        'Exercise.',
        '',
        'I tell daily-practice: PLEASE.'
      ],
      lesson: 'PLEASE DBT skill addresses physical illness, eating, substances, sleep, exercise as foundation.'
    },
    {
      id: 'sn28_14',
      title: 'My bucket and wise mind',
      narrative: [
        'Wise mind balance.',
        '',
        'Emotion plus reason.',
        '',
        'Integrated decision.',
        '',
        'I tell extremes-stressed: wise mind.'
      ],
      lesson: 'Wise mind balances emotion and reason for integrated decisions.'
    },
    {
      id: 'sn28_15',
      title: 'My bucket and DEAR MAN DBT skill',
      narrative: [
        'Describe, express.',
        '',
        'Assert, reinforce.',
        '',
        'Mindful, appear confident.',
        '',
        'Negotiate.',
        '',
        'I tell conflict-stressed: DEAR MAN.'
      ],
      lesson: 'DEAR MAN DBT skill structures requests through describe, express, assert, reinforce, mindful, appear confident, negotiate.'
    }
  ];

  var STRESS_NARRATIVES_29 = [
    {
      id: 'sn29_1',
      title: 'My bucket and body scan practice',
      narrative: [
        '10 min body scan.',
        '',
        'Head to feet.',
        '',
        'Attention without judgment.',
        '',
        'I tell body-disconnected: scan.'
      ],
      lesson: 'Daily 10 min body scan practice reconnects awareness; attention without judgment.'
    },
    {
      id: 'sn29_2',
      title: 'My bucket and progressive muscle relaxation',
      narrative: [
        'Tense and release.',
        '',
        'Each muscle group.',
        '',
        'Body learns relaxation.',
        '',
        'I tell tense-stressed: PMR.'
      ],
      lesson: 'Progressive muscle relaxation tenses and releases each group; body learns relaxation.'
    },
    {
      id: 'sn29_3',
      title: 'My bucket and yoga nidra',
      narrative: [
        'Yoga nidra deep rest.',
        '',
        '20 min guided.',
        '',
        'Body and mind reset.',
        '',
        'I tell deep-rest curious: yoga nidra.'
      ],
      lesson: 'Yoga nidra provides 20 min guided deep rest practice; body and mind reset.'
    },
    {
      id: 'sn29_4',
      title: 'My bucket and tai chi',
      narrative: [
        'Tai chi in park.',
        '',
        'Slow flowing movement.',
        '',
        'Energy balanced.',
        '',
        'I tell movement-curious: tai chi.'
      ],
      lesson: 'Tai chi slow flowing movement balances energy; movement meditation practice.'
    },
    {
      id: 'sn29_5',
      title: 'My bucket and qigong',
      narrative: [
        'Qigong daily.',
        '',
        'Breath plus movement.',
        '',
        'Energy cultivation.',
        '',
        'I tell energy-curious: qigong.'
      ],
      lesson: 'Daily qigong combines breath and movement for energy cultivation practice.'
    },
    {
      id: 'sn29_6',
      title: 'My bucket and Feldenkrais',
      narrative: [
        'Feldenkrais classes.',
        '',
        'Subtle body awareness.',
        '',
        'Movement re-education.',
        '',
        'I tell body-curious: Feldenkrais.'
      ],
      lesson: 'Feldenkrais classes teach subtle body awareness and movement re-education.'
    },
    {
      id: 'sn29_7',
      title: 'My bucket and Alexander Technique',
      narrative: [
        'Alexander Technique lessons.',
        '',
        'Postural awareness.',
        '',
        'Tension reduction.',
        '',
        'I tell posture-stressed: Alexander.'
      ],
      lesson: 'Alexander Technique lessons teach postural awareness for tension reduction.'
    },
    {
      id: 'sn29_8',
      title: 'My bucket and Pilates',
      narrative: [
        'Pilates twice weekly.',
        '',
        'Core strength.',
        '',
        'Body alignment.',
        '',
        'I tell core-weak: Pilates.'
      ],
      lesson: 'Twice-weekly Pilates builds core strength and body alignment.'
    },
    {
      id: 'sn29_9',
      title: 'My bucket and barre class',
      narrative: [
        'Barre class weekly.',
        '',
        'Body sculpting.',
        '',
        'Community practice.',
        '',
        'I tell ballet-curious: barre.'
      ],
      lesson: 'Weekly barre classes provide body sculpting and community practice.'
    },
    {
      id: 'sn29_10',
      title: 'My bucket and spin class',
      narrative: [
        'Spin class three weekly.',
        '',
        'Cardio plus music.',
        '',
        'Community workout.',
        '',
        'I tell cardio-curious: spin.'
      ],
      lesson: 'Three-times-weekly spin classes combine cardio, music, community workout.'
    },
    {
      id: 'sn29_11',
      title: 'My bucket and dance fitness',
      narrative: [
        'Zumba twice weekly.',
        '',
        'Body plus music plus fun.',
        '',
        'Joy in movement.',
        '',
        'I tell fun-seeking: dance fitness.'
      ],
      lesson: 'Twice-weekly dance fitness like Zumba combines body, music, joy in movement.'
    },
    {
      id: 'sn29_12',
      title: 'My bucket and CrossFit',
      narrative: [
        'CrossFit community.',
        '',
        'High intensity plus accountability.',
        '',
        'Group workouts.',
        '',
        'I tell intensity-curious: CrossFit.'
      ],
      lesson: 'CrossFit community combines high intensity and accountability in group workouts.'
    },
    {
      id: 'sn29_13',
      title: 'My bucket and rock climbing',
      narrative: [
        'Climbing gym weekly.',
        '',
        'Physical plus problem solving.',
        '',
        'Mind absorbed.',
        '',
        'I tell adventurous: climbing.'
      ],
      lesson: 'Weekly rock climbing combines physical and problem solving; mind absorbed.'
    },
    {
      id: 'sn29_14',
      title: 'My bucket and trail running',
      narrative: [
        'Trail running weekly.',
        '',
        'Cardio plus nature.',
        '',
        'Body and mind both drain.',
        '',
        'I tell trail-curious: trail running.'
      ],
      lesson: 'Weekly trail running combines cardio and nature; body and mind both drain.'
    },
    {
      id: 'sn29_15',
      title: 'My bucket and swimming',
      narrative: [
        'Lap swimming weekly.',
        '',
        'Body engaged in water.',
        '',
        'Unique sensory drain.',
        '',
        'I tell water-curious: swimming.'
      ],
      lesson: 'Weekly lap swimming engages body in water for unique sensory bucket drain.'
    }
  ];

  var STRESS_NARRATIVES_30 = [
    {
      id: 'sn30_1',
      title: 'My bucket and morning journaling',
      narrative: [
        'Morning pages three.',
        '',
        'Brain dump format.',
        '',
        'Bucket externalized.',
        '',
        'I tell journaling-curious: morning pages.'
      ],
      lesson: 'Morning pages three brain dump externalizes bucket before day begins.'
    },
    {
      id: 'sn30_2',
      title: 'My bucket and evening journaling',
      narrative: [
        'Evening journal day review.',
        '',
        'What worked, what stressed.',
        '',
        'Bucket noted.',
        '',
        'I tell evening-reflective: journal.'
      ],
      lesson: 'Evening journaling reviews day for what worked and stressed; bucket noted.'
    },
    {
      id: 'sn30_3',
      title: 'My bucket and gratitude journal',
      narrative: [
        'Three gratitudes daily.',
        '',
        'Specific not general.',
        '',
        'Brain shifts.',
        '',
        'I tell mood-stuck: gratitude.'
      ],
      lesson: 'Daily three gratitudes specific not general shifts brain over weeks.'
    },
    {
      id: 'sn30_4',
      title: 'My bucket and feelings journal',
      narrative: [
        'Daily feelings log.',
        '',
        'Name emotions.',
        '',
        'Track patterns.',
        '',
        'I tell emotion-stuck: feelings log.'
      ],
      lesson: 'Daily feelings logs name emotions and track patterns over time.'
    },
    {
      id: 'sn30_5',
      title: 'My bucket and prayer journal',
      narrative: [
        'Daily prayer journal.',
        '',
        'Faith plus reflection.',
        '',
        'Spiritual practice.',
        '',
        'I tell faithful: prayer journal.'
      ],
      lesson: 'Daily prayer journals combine faith and reflection in spiritual practice.'
    },
    {
      id: 'sn30_6',
      title: 'My bucket and dream journal',
      narrative: [
        'Dream journal bedside.',
        '',
        'Record morning.',
        '',
        'Subconscious processed.',
        '',
        'I tell dream-curious: journal bedside.'
      ],
      lesson: 'Dream journals bedside recorded mornings process subconscious content.'
    },
    {
      id: 'sn30_7',
      title: 'My bucket and reflection journal',
      narrative: [
        'Weekly reflection.',
        '',
        'Patterns and growth.',
        '',
        'Long-term awareness.',
        '',
        'I tell growth-curious: reflection.'
      ],
      lesson: 'Weekly reflection journals track patterns and growth for long-term awareness.'
    },
    {
      id: 'sn30_8',
      title: 'My bucket and goal journal',
      narrative: [
        'Quarterly goal review.',
        '',
        'Progress tracked.',
        '',
        'Adjustments made.',
        '',
        'I tell goal-tracking: quarterly review.'
      ],
      lesson: 'Quarterly goal journal reviews track progress and enable adjustments.'
    },
    {
      id: 'sn30_9',
      title: 'My bucket and travel journal',
      narrative: [
        'Travel journal during trips.',
        '',
        'Experiences captured.',
        '',
        'Memory preserved.',
        '',
        'I tell traveler: journal trips.'
      ],
      lesson: 'Travel journals during trips capture experiences and preserve memory.'
    },
    {
      id: 'sn30_10',
      title: 'My bucket and art journal',
      narrative: [
        'Visual art journal.',
        '',
        'Colors plus images.',
        '',
        'Non-verbal expression.',
        '',
        'I tell visual: art journal.'
      ],
      lesson: 'Visual art journals with colors and images provide non-verbal expression.'
    },
    {
      id: 'sn30_11',
      title: 'My bucket and bullet journal',
      narrative: [
        'Bullet journal system.',
        '',
        'Tasks plus reflection.',
        '',
        'Organized creativity.',
        '',
        'I tell organized-creative: bullet journal.'
      ],
      lesson: 'Bullet journal system combines tasks and reflection in organized creativity.'
    },
    {
      id: 'sn30_12',
      title: 'My bucket and writing letters never sent',
      narrative: [
        'Letters never sent.',
        '',
        'To deceased.',
        '',
        'To estranged.',
        '',
        'Externalize.',
        '',
        'I tell stuck-emotion: letters.'
      ],
      lesson: 'Letters never sent to deceased or estranged externalize stuck emotion.'
    },
    {
      id: 'sn30_13',
      title: 'My bucket and morning intention setting',
      narrative: [
        'Daily intention.',
        '',
        'Single word focus.',
        '',
        'Day grounded.',
        '',
        'I tell scattered: intention setting.'
      ],
      lesson: 'Daily morning intention setting with single word focus grounds day.'
    },
    {
      id: 'sn30_14',
      title: 'My bucket and evening intention review',
      narrative: [
        'Evening intention review.',
        '',
        'Did I live it?',
        '',
        'Reflect.',
        '',
        'I tell intention-setting: evening review.'
      ],
      lesson: 'Evening intention review reflects on day living of morning intention.'
    },
    {
      id: 'sn30_15',
      title: 'My bucket and weekly intention',
      narrative: [
        'Sunday weekly intention.',
        '',
        'Theme for week.',
        '',
        'Bigger picture.',
        '',
        'I tell weekly-curious: intention.'
      ],
      lesson: 'Sunday weekly intention theme provides bigger picture frame for daily living.'
    }
  ];

  var STRESS_NARRATIVES_21 = [
    {
      id: 'sn21_1',
      title: 'My bucket and box breathing',
      narrative: [
        'Four count breath box.',
        '',
        'In, hold, out, hold.',
        '',
        'Each count four.',
        '',
        'Quick bucket drain.',
        '',
        'I tell anxious: box breathing.'
      ],
      lesson: 'Box breathing with four-count cycle provides quick bucket drain through respiratory rhythm.'
    },
    {
      id: 'sn21_2',
      title: 'My bucket and alternate nostril breath',
      narrative: [
        'Alternate nostril breath.',
        '',
        'Pranayama practice.',
        '',
        'Balanced nervous system.',
        '',
        'I tell breath-curious: alternate nostril.'
      ],
      lesson: 'Alternate nostril breathing pranayama practice balances nervous system through breath.'
    },
    {
      id: 'sn21_3',
      title: 'My bucket and belly breathing',
      narrative: [
        'Hand on belly.',
        '',
        'Breathe into hand.',
        '',
        'Diaphragmatic breath.',
        '',
        'I tell shallow-breathers: belly breath.'
      ],
      lesson: 'Belly breathing with hand on stomach engages diaphragm; deeper breath drains bucket.'
    },
    {
      id: 'sn21_4',
      title: 'My bucket and physiological sigh',
      narrative: [
        'Two inhales, one long exhale.',
        '',
        'Physiological sigh.',
        '',
        'Quick nervous system reset.',
        '',
        'I tell quick-tap-needers: physiological sigh.'
      ],
      lesson: 'Physiological sighs with two inhales and one long exhale quickly reset nervous system.'
    },
    {
      id: 'sn21_5',
      title: 'My bucket and Wim Hof breathing',
      narrative: [
        'Wim Hof method.',
        '',
        'Power breathing.',
        '',
        'Energizing tap.',
        '',
        'I tell adventurous: Wim Hof.'
      ],
      lesson: 'Wim Hof breathing method provides energizing tap through power breathing technique.'
    },
    {
      id: 'sn21_6',
      title: 'My bucket and humming breath',
      narrative: [
        'Hum on exhale.',
        '',
        'Vagal stimulation.',
        '',
        'Calming tap.',
        '',
        'I tell calm-needers: humming breath.'
      ],
      lesson: 'Humming on exhale stimulates vagus nerve; calming tap accessible anywhere.'
    },
    {
      id: 'sn21_7',
      title: 'My bucket and lions breath',
      narrative: [
        'Roar out breath.',
        '',
        'Tongue out.',
        '',
        'Tension release.',
        '',
        'I tell tense-stressed: lions breath.'
      ],
      lesson: 'Lions breath with tongue out and roar releases facial tension and built-up stress.'
    },
    {
      id: 'sn21_8',
      title: 'My bucket and cold water face',
      narrative: [
        'Cold water on face.',
        '',
        'Mammalian dive response.',
        '',
        'Heart slows.',
        '',
        'I tell panic-prone: cold face.'
      ],
      lesson: 'Cold water on face triggers mammalian dive response; heart slows and bucket drains.'
    },
    {
      id: 'sn21_9',
      title: 'My bucket and cold shower',
      narrative: [
        'Cold shower morning.',
        '',
        'Vagal nerve stimulation.',
        '',
        'Bucket reset.',
        '',
        'I tell brave: cold shower.'
      ],
      lesson: 'Morning cold showers stimulate vagal nerve; bucket reset through cold exposure.'
    },
    {
      id: 'sn21_10',
      title: 'My bucket and ice plunge',
      narrative: [
        'Ice bath weekly.',
        '',
        'Deep cold exposure.',
        '',
        'Major bucket reset.',
        '',
        'I tell extreme: ice plunge.'
      ],
      lesson: 'Weekly ice baths provide deep cold exposure for major bucket reset.'
    },
    {
      id: 'sn21_11',
      title: 'My bucket and sauna',
      narrative: [
        'Sauna twice weekly.',
        '',
        'Heat stress hormesis.',
        '',
        'Body adapts.',
        '',
        'I tell body-curious: sauna.'
      ],
      lesson: 'Twice-weekly sauna provides heat stress hormesis; body adapts and bucket capacity grows.'
    },
    {
      id: 'sn21_12',
      title: 'My bucket and steam room',
      narrative: [
        'Steam room weekly.',
        '',
        'Heat plus moisture.',
        '',
        'Body relaxation.',
        '',
        'I tell stressed: steam room.'
      ],
      lesson: 'Weekly steam rooms combine heat and moisture; body relaxation drains bucket.'
    },
    {
      id: 'sn21_13',
      title: 'My bucket and hot tub',
      narrative: [
        'Hot tub evening.',
        '',
        'Heat plus jets.',
        '',
        'Tension released.',
        '',
        'I tell tension-stressed: hot tub.'
      ],
      lesson: 'Evening hot tubs combine heat and jet massage; muscle tension released drains bucket.'
    },
    {
      id: 'sn21_14',
      title: 'My bucket and infrared sauna',
      narrative: [
        'Infrared sauna.',
        '',
        'Deep heat penetration.',
        '',
        'Detox response.',
        '',
        'I tell sauna-curious: infrared.'
      ],
      lesson: 'Infrared saunas provide deep heat penetration; detox-style response drains bucket.'
    },
    {
      id: 'sn21_15',
      title: 'My bucket and float tank',
      narrative: [
        'Sensory deprivation float.',
        '',
        'No input.',
        '',
        'Nervous system reset.',
        '',
        'I tell tried-everything: floating.'
      ],
      lesson: 'Sensory deprivation floating provides unique nervous system reset through no input.'
    }
  ];

  var STRESS_NARRATIVES_22 = [
    {
      id: 'sn22_1',
      title: 'My bucket and walking partner',
      narrative: [
        'Daily walking partner.',
        '',
        '30 min together.',
        '',
        'Connection plus movement.',
        '',
        'I tell isolated: walking partner.'
      ],
      lesson: 'Daily walking partner combines connection and movement taps for isolation stress relief.'
    },
    {
      id: 'sn22_2',
      title: 'My bucket and gym buddy',
      narrative: [
        'Workout partner three times weekly.',
        '',
        'Accountability plus movement.',
        '',
        'I tell exercise-lonely: gym buddy.'
      ],
      lesson: 'Three-times-weekly gym buddies provide accountability plus movement for exercise consistency.'
    },
    {
      id: 'sn22_3',
      title: 'My bucket and book club',
      narrative: [
        'Monthly book club.',
        '',
        'Reading plus community.',
        '',
        'Mind plus connection.',
        '',
        'I tell readers: book club.'
      ],
      lesson: 'Monthly book clubs combine reading and community; mind plus connection taps stacked.'
    },
    {
      id: 'sn22_4',
      title: 'My bucket and writing group',
      narrative: [
        'Weekly writing group.',
        '',
        'Voice plus community.',
        '',
        'Creative tap stacked.',
        '',
        'I tell writers: writing group.'
      ],
      lesson: 'Weekly writing groups stack creative voice and community taps for writers.'
    },
    {
      id: 'sn22_5',
      title: 'My bucket and art class',
      narrative: [
        'Weekly art class.',
        '',
        'Creative plus social.',
        '',
        'Instruction plus practice.',
        '',
        'I tell visual: art class.'
      ],
      lesson: 'Weekly art classes combine creative practice and social instruction taps.'
    },
    {
      id: 'sn22_6',
      title: 'My bucket and choir',
      narrative: [
        'Community choir weekly.',
        '',
        'Voice plus group.',
        '',
        'Music plus connection.',
        '',
        'I tell musical: choir.'
      ],
      lesson: 'Weekly community choirs combine voice, group, music, connection taps.'
    },
    {
      id: 'sn22_7',
      title: 'My bucket and dance class',
      narrative: [
        'Weekly dance class.',
        '',
        'Body plus community.',
        '',
        'Music plus movement.',
        '',
        'I tell movement-curious: dance class.'
      ],
      lesson: 'Weekly dance classes combine body, community, music, movement taps.'
    },
    {
      id: 'sn22_8',
      title: 'My bucket and martial arts class',
      narrative: [
        'Martial arts twice weekly.',
        '',
        'Body plus discipline plus community.',
        '',
        'Multiple taps.',
        '',
        'I tell physical-curious: martial arts.'
      ],
      lesson: 'Twice-weekly martial arts combine body, discipline, community for multiple bucket taps.'
    },
    {
      id: 'sn22_9',
      title: 'My bucket and yoga class',
      narrative: [
        'Yoga class three times weekly.',
        '',
        'Body plus breath plus community.',
        '',
        'I tell yoga-curious: class.'
      ],
      lesson: 'Three-times-weekly yoga classes combine body, breath, community taps.'
    },
    {
      id: 'sn22_10',
      title: 'My bucket and meditation group',
      narrative: [
        'Weekly meditation group.',
        '',
        'Sitting plus support.',
        '',
        'Practice deepened.',
        '',
        'I tell solo-meditation: group helps.'
      ],
      lesson: 'Weekly meditation groups deepen practice through group sitting plus support.'
    },
    {
      id: 'sn22_11',
      title: 'My bucket and faith community',
      narrative: [
        'Weekly faith service.',
        '',
        'Spiritual plus belonging.',
        '',
        'Multiple taps.',
        '',
        'I tell faithful: weekly attendance.'
      ],
      lesson: 'Weekly faith services combine spiritual practice and belonging taps for faith community.'
    },
    {
      id: 'sn22_12',
      title: 'My bucket and prayer group',
      narrative: [
        'Weekly prayer group.',
        '',
        'Faith plus community.',
        '',
        'Deeper than service alone.',
        '',
        'I tell faithful-deeper: prayer group.'
      ],
      lesson: 'Weekly prayer groups combine faith and intimate community deeper than larger services.'
    },
    {
      id: 'sn22_13',
      title: 'My bucket and bible study',
      narrative: [
        'Weekly bible study.',
        '',
        'Faith plus learning plus community.',
        '',
        'Triple tap.',
        '',
        'I tell faith-learners: bible study.'
      ],
      lesson: 'Weekly bible study combines faith, learning, community taps as triple tap engagement.'
    },
    {
      id: 'sn22_14',
      title: 'My bucket and mens group',
      narrative: [
        'Mens emotional support group.',
        '',
        'Vulnerability with men.',
        '',
        'Rare and valuable.',
        '',
        'I tell men: support groups exist.'
      ],
      lesson: 'Mens emotional support groups enable rare vulnerability with men; valuable bucket support.'
    },
    {
      id: 'sn22_15',
      title: 'My bucket and womens group',
      narrative: [
        'Womens support group.',
        '',
        'Shared experiences.',
        '',
        'Sisterhood tap.',
        '',
        'I tell women: support groups.'
      ],
      lesson: 'Womens support groups create sisterhood tap through shared experiences.'
    }
  ];

  var STRESS_NARRATIVES_23 = [
    {
      id: 'sn23_1',
      title: 'My bucket model for adolescents',
      narrative: [
        'Teen bucket education.',
        '',
        'Accessible model.',
        '',
        'Tracking begins early.',
        '',
        'I tell parents: teach bucket model.'
      ],
      lesson: 'Bucket model accessible to teens; early tracking education enables lifelong skill.'
    },
    {
      id: 'sn23_2',
      title: 'My bucket model for elementary kids',
      narrative: [
        'Simple bucket drawing.',
        '',
        'Color stressors.',
        '',
        'Color taps.',
        '',
        'Visual teaching.',
        '',
        'I tell parents: visual model.'
      ],
      lesson: 'Elementary kids grasp bucket through visual drawings with colored stressors and taps.'
    },
    {
      id: 'sn23_3',
      title: 'My bucket model in classroom',
      narrative: [
        'Teacher used model.',
        '',
        'Whole class taught.',
        '',
        'Common vocabulary.',
        '',
        'I tell teachers: classroom tool.'
      ],
      lesson: 'Teachers using bucket model build whole-class common vocabulary for stress.'
    },
    {
      id: 'sn23_4',
      title: 'My bucket model for autistic kids',
      narrative: [
        'Visual model accessible.',
        '',
        'Sensory inflow named.',
        '',
        'Strategies clear.',
        '',
        'I tell autism parents: bucket helps.'
      ],
      lesson: 'Visual bucket model accessible to autistic kids; sensory inflow named with clear strategies.'
    },
    {
      id: 'sn23_5',
      title: 'My bucket model for ADHD kids',
      narrative: [
        'Decision inflow heavy.',
        '',
        'Bucket fills fast.',
        '',
        'Tools emphasized.',
        '',
        'I tell ADHD parents: bucket teaches.'
      ],
      lesson: 'ADHD kids have heavy decision inflow filling bucket fast; tools emphasized in bucket teaching.'
    },
    {
      id: 'sn23_6',
      title: 'My bucket model for traumatized kids',
      narrative: [
        'Trauma reduces capacity.',
        '',
        'Trigger inflow heavy.',
        '',
        'Specialty therapy.',
        '',
        'I tell trauma parents: specialty therapy.'
      ],
      lesson: 'Traumatized kids have reduced bucket capacity with heavy trigger inflow; specialty therapy.'
    },
    {
      id: 'sn23_7',
      title: 'My bucket model for sensitive kids',
      narrative: [
        'Highly sensitive bucket.',
        '',
        'Lower threshold.',
        '',
        'More taps needed.',
        '',
        'I tell HSP parents: more taps.'
      ],
      lesson: 'Highly sensitive kids have lower bucket threshold; more taps needed for management.'
    },
    {
      id: 'sn23_8',
      title: 'My bucket model for gifted kids',
      narrative: [
        'Gifted kids overthink.',
        '',
        'Mental inflow heavy.',
        '',
        'Mind taps essential.',
        '',
        'I tell gifted parents: mind taps.'
      ],
      lesson: 'Gifted kids overthink with heavy mental inflow; mind taps essential for bucket management.'
    },
    {
      id: 'sn23_9',
      title: 'My bucket model for athletic kids',
      narrative: [
        'Sports inflow heavy.',
        '',
        'Performance pressure.',
        '',
        'Body taps natural fit.',
        '',
        'I tell sports parents: body taps.'
      ],
      lesson: 'Athletic kids have sports performance inflow; body taps natural fit for management.'
    },
    {
      id: 'sn23_10',
      title: 'My bucket model for creative kids',
      narrative: [
        'Creative kids deep feelings.',
        '',
        'Art is natural tap.',
        '',
        'Creative expression.',
        '',
        'I tell creative parents: art taps.'
      ],
      lesson: 'Creative kids feel deeply; art as natural tap for expression-based bucket management.'
    },
    {
      id: 'sn23_11',
      title: 'My bucket model for shy kids',
      narrative: [
        'Social inflow heavy.',
        '',
        'Solo recovery time.',
        '',
        'Quiet taps emphasized.',
        '',
        'I tell shy parents: quiet recovery.'
      ],
      lesson: 'Shy kids face heavy social inflow; quiet solo recovery taps emphasized.'
    },
    {
      id: 'sn23_12',
      title: 'My bucket model for outgoing kids',
      narrative: [
        'Outgoing kids feel social energy.',
        '',
        'Drained by isolation.',
        '',
        'Social taps emphasized.',
        '',
        'I tell social parents: social taps.'
      ],
      lesson: 'Outgoing kids drained by isolation; social taps emphasized for energy maintenance.'
    },
    {
      id: 'sn23_13',
      title: 'My bucket model for LGBTQ kids',
      narrative: [
        'Identity stress chronic.',
        '',
        'Affirming environment essential.',
        '',
        'Community taps.',
        '',
        'I tell LGBTQ parents: affirming community.'
      ],
      lesson: 'LGBTQ kids face chronic identity stress; affirming environment and community taps essential.'
    },
    {
      id: 'sn23_14',
      title: 'My bucket model for minority kids',
      narrative: [
        'Minority stress chronic inflow.',
        '',
        'Affinity community essential.',
        '',
        'Cultural taps.',
        '',
        'I tell minority parents: community essential.'
      ],
      lesson: 'Minority kids face chronic stress inflow; affinity community and cultural taps essential.'
    },
    {
      id: 'sn23_15',
      title: 'My bucket model for disabled kids',
      narrative: [
        'Disability bucket different.',
        '',
        'Accessibility taps needed.',
        '',
        'Disability community.',
        '',
        'I tell disability parents: community.'
      ],
      lesson: 'Disabled kids have different bucket with accessibility needs; disability community essential.'
    }
  ];

  var STRESS_NARRATIVES_24 = [
    {
      id: 'sn24_1',
      title: 'My bucket and workplace boundaries',
      narrative: [
        'Strict work hours.',
        '',
        'No email after 6pm.',
        '',
        'Bucket protected.',
        '',
        'I tell overworked: strict hours.'
      ],
      lesson: 'Strict work hours with no after-hours email protect bucket from work inflow overflow.'
    },
    {
      id: 'sn24_2',
      title: 'My bucket and meeting boundaries',
      narrative: [
        'No back-to-back meetings.',
        '',
        '15 min between buffer.',
        '',
        'Bucket recovers.',
        '',
        'I tell meeting-heavy: buffer.'
      ],
      lesson: 'Buffer time between meetings allows bucket recovery; no back-to-back protects capacity.'
    },
    {
      id: 'sn24_3',
      title: 'My bucket and email boundaries',
      narrative: [
        'Three email times daily.',
        '',
        '9am, 1pm, 4pm only.',
        '',
        'Inflow contained.',
        '',
        'I tell email-anxious: three times.'
      ],
      lesson: 'Three-times-daily email checking contains inflow; bucket protected from constant notification.'
    },
    {
      id: 'sn24_4',
      title: 'My bucket and phone boundaries',
      narrative: [
        'Phone in another room.',
        '',
        'Work hours only.',
        '',
        'Inflow stopped.',
        '',
        'I tell phone-tethered: physical distance.'
      ],
      lesson: 'Phone in another room during off-work hours stops inflow through physical distance.'
    },
    {
      id: 'sn24_5',
      title: 'My bucket and home work separation',
      narrative: [
        'Separate workspace.',
        '',
        'Closed door when done.',
        '',
        'Symbolic separation.',
        '',
        'I tell remote workers: physical separation.'
      ],
      lesson: 'Remote workers need physical workspace separation with closed door for symbolic boundary.'
    },
    {
      id: 'sn24_6',
      title: 'My bucket and weekend protection',
      narrative: [
        'Weekend protected.',
        '',
        'No work email.',
        '',
        'Bucket recovers weekly.',
        '',
        'I tell weekend-workers: protect.'
      ],
      lesson: 'Protected weekends without work email allow weekly bucket recovery.'
    },
    {
      id: 'sn24_7',
      title: 'My bucket and vacation protection',
      narrative: [
        'Vacation truly off.',
        '',
        'Auto-responder set.',
        '',
        'Phone off.',
        '',
        'Bucket fully drains.',
        '',
        'I tell never-off vacationers: truly off.'
      ],
      lesson: 'Truly off vacations with auto-responders and phone off allow full bucket drainage.'
    },
    {
      id: 'sn24_8',
      title: 'My bucket and family time boundaries',
      narrative: [
        'Dinner phones away.',
        '',
        'Family attention protected.',
        '',
        'Connection tap quality.',
        '',
        'I tell family-stressed: dinner phones.'
      ],
      lesson: 'Dinner phones away protects family attention; connection tap quality preserved.'
    },
    {
      id: 'sn24_9',
      title: 'My bucket and partner time',
      narrative: [
        'Weekly date night.',
        '',
        'Phones away.',
        '',
        'Partner attention.',
        '',
        'I tell partners: weekly date night.'
      ],
      lesson: 'Weekly date nights with phones away preserve partner attention and connection tap.'
    },
    {
      id: 'sn24_10',
      title: 'My bucket and self time',
      narrative: [
        'Daily self time protected.',
        '',
        'Even 30 min.',
        '',
        'Bucket maintenance.',
        '',
        'I tell over-giving: self time.'
      ],
      lesson: 'Daily protected self time even 30 minutes provides bucket maintenance for over-givers.'
    },
    {
      id: 'sn24_11',
      title: 'My bucket and friend time',
      narrative: [
        'Weekly friend time.',
        '',
        'Protected social tap.',
        '',
        'Connection scheduled.',
        '',
        'I tell isolated-stressed: friend time.'
      ],
      lesson: 'Weekly scheduled friend time provides protected social tap; connection scheduled.'
    },
    {
      id: 'sn24_12',
      title: 'My bucket and creative time',
      narrative: [
        'Weekly creative practice.',
        '',
        'Protected creation.',
        '',
        'Expression tap.',
        '',
        'I tell creative-stuck: protect time.'
      ],
      lesson: 'Weekly protected creative practice provides expression tap for creative bucket drainage.'
    },
    {
      id: 'sn24_13',
      title: 'My bucket and learning time',
      narrative: [
        'Weekly learning practice.',
        '',
        'Growth tap.',
        '',
        'Curiosity engaged.',
        '',
        'I tell stagnant-stressed: learning time.'
      ],
      lesson: 'Weekly learning practice provides growth tap through engaged curiosity.'
    },
    {
      id: 'sn24_14',
      title: 'My bucket and rest time',
      narrative: [
        'Weekly rest day.',
        '',
        'No goals.',
        '',
        'Bucket truly drains.',
        '',
        'I tell achievement-stressed: rest day.'
      ],
      lesson: 'Weekly rest days without goals allow true bucket drainage.'
    },
    {
      id: 'sn24_15',
      title: 'My bucket and play time',
      narrative: [
        'Weekly pure play.',
        '',
        'No purpose.',
        '',
        'Just fun.',
        '',
        'Bucket tap.',
        '',
        'I tell serious-stressed: play time.'
      ],
      lesson: 'Weekly pure play without purpose provides fun-based bucket tap.'
    }
  ];

  var STRESS_NARRATIVES_25 = [
    {
      id: 'sn25_1',
      title: 'My bucket and time blocking',
      narrative: [
        'Calendar blocks.',
        '',
        'Each task its time.',
        '',
        'No multitasking.',
        '',
        'Bucket focused.',
        '',
        'I tell scattered-stressed: time blocking.'
      ],
      lesson: 'Time blocking dedicates calendar to single tasks; no multitasking focuses bucket usage.'
    },
    {
      id: 'sn25_2',
      title: 'My bucket and task batching',
      narrative: [
        'Batch similar tasks.',
        '',
        'Email batch.',
        '',
        'Call batch.',
        '',
        'Focus preserved.',
        '',
        'I tell task-switching: batch.'
      ],
      lesson: 'Task batching groups similar tasks; preserves focus and reduces switching cost.'
    },
    {
      id: 'sn25_3',
      title: 'My bucket and deep work',
      narrative: [
        'Deep work blocks daily.',
        '',
        'Two hour minimum.',
        '',
        'Focused output.',
        '',
        'I tell shallow-work: deep blocks.'
      ],
      lesson: 'Daily deep work blocks of two hours minimum enable focused output and bucket flow state.'
    },
    {
      id: 'sn25_4',
      title: 'My bucket and shallow work batching',
      narrative: [
        'Shallow tasks batched.',
        '',
        'Email, admin, meetings.',
        '',
        'Afternoon block.',
        '',
        'I tell unscheduled: batch shallow.'
      ],
      lesson: 'Shallow work batched into afternoon block frees morning for deep work.'
    },
    {
      id: 'sn25_5',
      title: 'My bucket and pomodoro',
      narrative: [
        '25 min focus.',
        '',
        '5 min rest.',
        '',
        'Pomodoro technique.',
        '',
        'Bucket regulated.',
        '',
        'I tell focus-curious: pomodoro.'
      ],
      lesson: 'Pomodoro technique with 25 min focus and 5 min rest regulates bucket usage.'
    },
    {
      id: 'sn25_6',
      title: 'My bucket and ultradian rhythms',
      narrative: [
        '90 min focused.',
        '',
        '20 min recovery.',
        '',
        'Natural body cycles.',
        '',
        'I tell biology-curious: ultradian rhythms.'
      ],
      lesson: 'Ultradian rhythm of 90 min focus and 20 min recovery aligns work with natural body cycles.'
    },
    {
      id: 'sn25_7',
      title: 'My bucket and standing desk',
      narrative: [
        'Standing desk alternating.',
        '',
        'Body engagement.',
        '',
        'Energy maintained.',
        '',
        'I tell desk-stressed: alternating standing.'
      ],
      lesson: 'Standing desk with alternating positions maintains body engagement and energy at work.'
    },
    {
      id: 'sn25_8',
      title: 'My bucket and walking meetings',
      narrative: [
        'Walking meetings.',
        '',
        'Body engaged during work.',
        '',
        'Stress released.',
        '',
        'I tell meeting-heavy: walking meetings.'
      ],
      lesson: 'Walking meetings engage body during work conversations; stress released through movement.'
    },
    {
      id: 'sn25_9',
      title: 'My bucket and lunch walks',
      narrative: [
        'Daily lunch walk.',
        '',
        'Outside midday.',
        '',
        'Bucket drains.',
        '',
        'I tell desk-bound: lunch walks.'
      ],
      lesson: 'Daily lunch walks outside midday drain bucket and provide sunlight exposure.'
    },
    {
      id: 'sn25_10',
      title: 'My bucket and microbreaks',
      narrative: [
        'Hourly microbreaks.',
        '',
        '2 min stand stretch.',
        '',
        'Body refreshed.',
        '',
        'I tell desk-bound: hourly stretches.'
      ],
      lesson: 'Hourly microbreaks with 2 minute stand and stretch refresh body throughout workday.'
    },
    {
      id: 'sn25_11',
      title: 'My bucket and ergonomic workspace',
      narrative: [
        'Ergonomic setup.',
        '',
        'Body supported.',
        '',
        'Physical inflow reduced.',
        '',
        'I tell pain-stressed: ergonomics.'
      ],
      lesson: 'Ergonomic workspace setup supports body; physical pain inflow reduced through proper posture.'
    },
    {
      id: 'sn25_12',
      title: 'My bucket and natural lighting',
      narrative: [
        'Window light workspace.',
        '',
        'Circadian aligned.',
        '',
        'Energy maintained.',
        '',
        'I tell artificial-lit: window light.'
      ],
      lesson: 'Natural light workspaces align circadian and maintain energy throughout workday.'
    },
    {
      id: 'sn25_13',
      title: 'My bucket and plants in office',
      narrative: [
        'Office plants.',
        '',
        'Green presence.',
        '',
        'Calming workspace.',
        '',
        'I tell sterile-office: plants.'
      ],
      lesson: 'Office plants provide green presence; calming workspace through nature elements.'
    },
    {
      id: 'sn25_14',
      title: 'My bucket and noise control',
      narrative: [
        'Noise-canceling headphones.',
        '',
        'Auditory control.',
        '',
        'Focus protected.',
        '',
        'I tell noisy-office: noise canceling.'
      ],
      lesson: 'Noise-canceling headphones provide auditory control; focus protected in noisy environments.'
    },
    {
      id: 'sn25_15',
      title: 'My bucket and workspace ritual',
      narrative: [
        'Morning workspace setup.',
        '',
        'Light candle.',
        '',
        'Set intention.',
        '',
        'Ritual marks start.',
        '',
        'I tell ritualistic: workspace ritual.'
      ],
      lesson: 'Workspace rituals like candles and intention setting mark workday start ceremoniously.'
    }
  ];

  var STRESS_NARRATIVES_16 = [
    {
      id: 'sn16_1',
      title: 'My morning bucket check practice',
      narrative: [
        'Every morning ask.',
        '',
        'How full is my bucket?',
        '',
        'What inflow today?',
        '',
        'What taps will I open?',
        '',
        'I tell new bucket users: morning check.'
      ],
      lesson: 'Morning bucket check identifies daily inflow and plans tap usage proactively.'
    },
    {
      id: 'sn16_2',
      title: 'My midday bucket check',
      narrative: [
        'Lunchtime check.',
        '',
        'Bucket at noon level.',
        '',
        'Adjust afternoon plan.',
        '',
        'I tell midday-stressed: lunch check.'
      ],
      lesson: 'Midday bucket checks at lunch enable afternoon adjustment based on morning inflow.'
    },
    {
      id: 'sn16_3',
      title: 'My evening bucket check',
      narrative: [
        'Before sleep check.',
        '',
        'How full now?',
        '',
        'What needs draining?',
        '',
        'I tell sleep-troubled: evening check.'
      ],
      lesson: 'Evening bucket checks before sleep identify final draining needs for restorative rest.'
    },
    {
      id: 'sn16_4',
      title: 'My bucket and crisis indicator',
      narrative: [
        'Crisis level identified.',
        '',
        'When bucket overflows.',
        '',
        'Pre-planned response.',
        '',
        'I tell at-risk: crisis plan.'
      ],
      lesson: 'Crisis indicator at bucket overflow level triggers pre-planned response from preparedness.'
    },
    {
      id: 'sn16_5',
      title: 'My bucket and warning level',
      narrative: [
        'Warning level set.',
        '',
        'When bucket near full.',
        '',
        'Trigger increased taps.',
        '',
        'I tell systematic-stressed: warning level.'
      ],
      lesson: 'Warning level at near-full bucket triggers increased tap usage before overflow.'
    },
    {
      id: 'sn16_6',
      title: 'My bucket and green zone',
      narrative: [
        'Green zone bucket half.',
        '',
        'Sustainable level.',
        '',
        'Continue routine.',
        '',
        'I tell stable-stressed: green zone.'
      ],
      lesson: 'Green zone at half-full bucket indicates sustainable level for routine maintenance.'
    },
    {
      id: 'sn16_7',
      title: 'My bucket and yellow zone',
      narrative: [
        'Yellow zone bucket three-quarters.',
        '',
        'Need additional taps.',
        '',
        'Watch closely.',
        '',
        'I tell rising-stressed: yellow zone alert.'
      ],
      lesson: 'Yellow zone at three-quarters bucket signals need for additional tap usage and monitoring.'
    },
    {
      id: 'sn16_8',
      title: 'My bucket and red zone',
      narrative: [
        'Red zone bucket near overflow.',
        '',
        'Emergency taps activated.',
        '',
        'Crisis plan possible.',
        '',
        'I tell overflowing-stressed: red zone.'
      ],
      lesson: 'Red zone near-overflow triggers emergency taps and may activate crisis plan.'
    },
    {
      id: 'sn16_9',
      title: 'My bucket and overflow protocol',
      narrative: [
        'Overflow happens despite tools.',
        '',
        'Protocol activates.',
        '',
        'Support team called.',
        '',
        'I tell crisis-prone: overflow protocol.'
      ],
      lesson: 'Overflow protocol activates support team when tools insufficient for bucket overflow.'
    },
    {
      id: 'sn16_10',
      title: 'My bucket and team support',
      narrative: [
        'Identified team members.',
        '',
        'Available for support.',
        '',
        'Therapist, friend, family.',
        '',
        'I tell isolated-stressed: team identified.'
      ],
      lesson: 'Identified support team of therapist, friend, family enables crisis response readiness.'
    },
    {
      id: 'sn16_11',
      title: 'My bucket and emergency contacts',
      narrative: [
        'Crisis line numbers ready.',
        '',
        '988 and local.',
        '',
        'Pre-saved in phone.',
        '',
        'I tell at-risk: numbers ready.'
      ],
      lesson: 'Crisis hotline numbers like 988 pre-saved in phone enable quick emergency access.'
    },
    {
      id: 'sn16_12',
      title: 'My bucket and safety plan',
      narrative: [
        'Written safety plan.',
        '',
        'Warning signs listed.',
        '',
        'Steps for each level.',
        '',
        'Resources at end.',
        '',
        'I tell at-risk: written safety plan.'
      ],
      lesson: 'Written safety plans list warning signs, steps for each level, and resources.'
    },
    {
      id: 'sn16_13',
      title: 'My bucket and medication backup',
      narrative: [
        'PRN medication available.',
        '',
        'When bucket overflows.',
        '',
        'Used sparingly.',
        '',
        'I tell medication-curious: PRN exists.'
      ],
      lesson: 'PRN as-needed medication available for bucket overflow used sparingly as backup support.'
    },
    {
      id: 'sn16_14',
      title: 'My bucket and crisis stabilization',
      narrative: [
        'Crisis residential available.',
        '',
        'Short-term stabilization.',
        '',
        'Less than hospital.',
        '',
        'I tell crisis-prone: residential exists.'
      ],
      lesson: 'Crisis residential programs provide short-term stabilization between outpatient and hospitalization.'
    },
    {
      id: 'sn16_15',
      title: 'My bucket and hospital backup',
      narrative: [
        'Hospital when severe.',
        '',
        'Not failure.',
        '',
        'Highest level care.',
        '',
        'I tell hospitalization-avoiders: not failure.'
      ],
      lesson: 'Hospital is highest level care for severe bucket overflow; not failure but appropriate care.'
    }
  ];

  var STRESS_NARRATIVES_17 = [
    {
      id: 'sn17_1',
      title: 'My bucket and weighted blanket',
      narrative: [
        '15 lb blanket.',
        '',
        'Deep pressure stimulation.',
        '',
        'Nervous system calms.',
        '',
        'Bucket drains overnight.',
        '',
        'I tell sleep-anxious: weighted blanket.'
      ],
      lesson: 'Fifteen-pound weighted blankets provide deep pressure stimulation; bucket drains overnight.'
    },
    {
      id: 'sn17_2',
      title: 'My bucket and sound machine',
      narrative: [
        'White noise machine.',
        '',
        'Brain quiets.',
        '',
        'Sleep tap supported.',
        '',
        'I tell sleep-troubled: sound machine.'
      ],
      lesson: 'White noise machines quiet brain; sound machines support sleep tap function.'
    },
    {
      id: 'sn17_3',
      title: 'My bucket and essential oils',
      narrative: [
        'Lavender diffuser.',
        '',
        'Bedroom scent.',
        '',
        'Bucket calmed.',
        '',
        'I tell scent-curious: essential oils.'
      ],
      lesson: 'Essential oil diffusers provide aromatherapy bucket support; lavender calms nervous system.'
    },
    {
      id: 'sn17_4',
      title: 'My bucket and meditation app',
      narrative: [
        'Daily 10 min app meditation.',
        '',
        'Consistent practice.',
        '',
        'Bucket baseline dropped.',
        '',
        'I tell tech-comfortable: meditation app.'
      ],
      lesson: 'Daily 10-minute meditation app sessions consistent practice reduce bucket baseline over weeks.'
    },
    {
      id: 'sn17_5',
      title: 'My bucket and breathing app',
      narrative: [
        'Breathing app for panic.',
        '',
        '4-7-8 guided.',
        '',
        'Quick bucket drain.',
        '',
        'I tell panic-prone: breathing app.'
      ],
      lesson: 'Breathing apps with guided 4-7-8 provide quick bucket drain during panic.'
    },
    {
      id: 'sn17_6',
      title: 'My bucket and sleep app',
      narrative: [
        'Sleep stories app.',
        '',
        'Calming narratives.',
        '',
        'Bucket drains to sleep.',
        '',
        'I tell sleep-troubled: sleep app.'
      ],
      lesson: 'Sleep story apps with calming narratives drain bucket through pre-sleep audio support.'
    },
    {
      id: 'sn17_7',
      title: 'My bucket and mood tracking app',
      narrative: [
        'Daily mood log.',
        '',
        'Bucket awareness measured.',
        '',
        'Patterns emerge.',
        '',
        'I tell systematic: mood tracking.'
      ],
      lesson: 'Daily mood tracking apps measure bucket awareness; patterns emerge through systematic logging.'
    },
    {
      id: 'sn17_8',
      title: 'My bucket and habit tracker',
      narrative: [
        'Habits tracked.',
        '',
        'Taps used measured.',
        '',
        'Accountability built.',
        '',
        'I tell habit-curious: habit tracker.'
      ],
      lesson: 'Habit tracking apps measure tap usage; accountability built through systematic tracking.'
    },
    {
      id: 'sn17_9',
      title: 'My bucket and journal app',
      narrative: [
        'Daily journal app.',
        '',
        'Bucket externalized digitally.',
        '',
        'Reflection enabled.',
        '',
        'I tell digital-journaler: journal app.'
      ],
      lesson: 'Daily journal apps externalize bucket digitally; reflection enabled through systematic logging.'
    },
    {
      id: 'sn17_10',
      title: 'My bucket and reminder app',
      narrative: [
        'Tap reminders.',
        '',
        'Phone notifications.',
        '',
        'Practice cued.',
        '',
        'I tell forgetting-tappers: reminder app.'
      ],
      lesson: 'Reminder apps cue tap practice through phone notifications; consistency built.'
    },
    {
      id: 'sn17_11',
      title: 'My bucket and music app',
      narrative: [
        'Calming playlist.',
        '',
        'Music tap accessible.',
        '',
        'Bucket drains.',
        '',
        'I tell music-curious: music app.'
      ],
      lesson: 'Music apps with calming playlists make music tap accessible; bucket drains through audio.'
    },
    {
      id: 'sn17_12',
      title: 'My bucket and walking app',
      narrative: [
        'Step tracker.',
        '',
        'Daily movement.',
        '',
        'Body tap measured.',
        '',
        'I tell movement-tracking: walking app.'
      ],
      lesson: 'Step tracker apps measure daily movement; body tap usage quantified through tracking.'
    },
    {
      id: 'sn17_13',
      title: 'My bucket and yoga app',
      narrative: [
        'Yoga at home.',
        '',
        'App guided.',
        '',
        'Body tap accessible.',
        '',
        'I tell home-yoga: yoga app.'
      ],
      lesson: 'Yoga apps enable home practice; body tap accessible through guided sessions.'
    },
    {
      id: 'sn17_14',
      title: 'My bucket and gratitude app',
      narrative: [
        'Daily three gratitudes app.',
        '',
        'Brain shifts logged.',
        '',
        'Bucket lighter.',
        '',
        'I tell gratitude-curious: app helps.'
      ],
      lesson: 'Gratitude apps log daily three gratitudes; brain shifts and bucket lighter through practice.'
    },
    {
      id: 'sn17_15',
      title: 'My bucket and therapy via telehealth',
      narrative: [
        'Telehealth therapy.',
        '',
        'Accessible from home.',
        '',
        'Weekly bucket drain.',
        '',
        'I tell access-limited: telehealth.'
      ],
      lesson: 'Telehealth therapy enables weekly bucket drain accessible from home for access-limited.'
    }
  ];

  var STRESS_NARRATIVES_18 = [
    {
      id: 'sn18_1',
      title: 'My bucket and weekly therapy',
      narrative: [
        'Weekly 50 min therapy.',
        '',
        'Major bucket drain.',
        '',
        'Reliable practice.',
        '',
        'I tell weekly-curious: weekly therapy.'
      ],
      lesson: 'Weekly 50-minute therapy provides major reliable bucket drain practice.'
    },
    {
      id: 'sn18_2',
      title: 'My bucket and biweekly therapy',
      narrative: [
        'Biweekly therapy when stable.',
        '',
        'Maintenance frequency.',
        '',
        'Bucket sustained.',
        '',
        'I tell stable-stressed: biweekly works.'
      ],
      lesson: 'Biweekly therapy provides maintenance frequency for stable bucket sustainability.'
    },
    {
      id: 'sn18_3',
      title: 'My bucket and group therapy',
      narrative: [
        'Weekly group therapy.',
        '',
        'Community plus skills.',
        '',
        'Bucket drained collectively.',
        '',
        'I tell isolated: group therapy.'
      ],
      lesson: 'Weekly group therapy provides community plus skills; bucket drained collectively.'
    },
    {
      id: 'sn18_4',
      title: 'My bucket and intensive outpatient',
      narrative: [
        'IOP three days weekly.',
        '',
        'Multiple bucket drains.',
        '',
        'Concentrated treatment.',
        '',
        'I tell crisis-stressed: IOP exists.'
      ],
      lesson: 'Intensive outpatient programs three days weekly provide concentrated multiple bucket drains.'
    },
    {
      id: 'sn18_5',
      title: 'My bucket and partial hospitalization',
      narrative: [
        'PHP daily attendance.',
        '',
        'Five days weekly.',
        '',
        'Major bucket support.',
        '',
        'I tell severe-stressed: PHP exists.'
      ],
      lesson: 'Partial hospitalization daily attendance five days weekly provides major bucket support.'
    },
    {
      id: 'sn18_6',
      title: 'My bucket and DBT skills group',
      narrative: [
        'DBT teaches concrete skills.',
        '',
        'Bucket tools provided.',
        '',
        'Plus accountability.',
        '',
        'I tell DBT-curious: skills group works.'
      ],
      lesson: 'DBT skills groups teach concrete bucket tools plus group accountability.'
    },
    {
      id: 'sn18_7',
      title: 'My bucket and CBT therapy',
      narrative: [
        'CBT individual.',
        '',
        'Thought-mood-behavior link.',
        '',
        'Bucket model explained.',
        '',
        'I tell CBT-curious: works for many.'
      ],
      lesson: 'CBT individual therapy teaches thought-mood-behavior link including bucket model.'
    },
    {
      id: 'sn18_8',
      title: 'My bucket and EMDR',
      narrative: [
        'EMDR for trauma.',
        '',
        'Triggers reduced.',
        '',
        'Bucket inflow decreased.',
        '',
        'I tell trauma-stressed: EMDR works.'
      ],
      lesson: 'EMDR therapy for trauma reduces triggers; bucket inflow decreased through processing.'
    },
    {
      id: 'sn18_9',
      title: 'My bucket and somatic therapy',
      narrative: [
        'Body-based therapy.',
        '',
        'Held stress released.',
        '',
        'Bucket drains physically.',
        '',
        'I tell body-stressed: somatic helps.'
      ],
      lesson: 'Body-based somatic therapy releases held stress; bucket drains physically.'
    },
    {
      id: 'sn18_10',
      title: 'My bucket and IFS therapy',
      narrative: [
        'Internal Family Systems.',
        '',
        'Parts understood.',
        '',
        'Internal conflict reduced.',
        '',
        'I tell conflicted: IFS helps.'
      ],
      lesson: 'Internal Family Systems therapy understands parts; internal conflict reduced.'
    },
    {
      id: 'sn18_11',
      title: 'My bucket and ACT therapy',
      narrative: [
        'Acceptance Commitment Therapy.',
        '',
        'Values clarified.',
        '',
        'Action aligned.',
        '',
        'I tell values-confused: ACT helps.'
      ],
      lesson: 'ACT therapy clarifies values and aligns action; bucket lighter through values-aligned living.'
    },
    {
      id: 'sn18_12',
      title: 'My bucket and psychodynamic therapy',
      narrative: [
        'Longer-term psychodynamic.',
        '',
        'Patterns understood.',
        '',
        'Bucket history clarified.',
        '',
        'I tell deep-seeking: psychodynamic.'
      ],
      lesson: 'Psychodynamic therapy understands patterns over longer term; bucket history clarified.'
    },
    {
      id: 'sn18_13',
      title: 'My bucket and family therapy',
      narrative: [
        'Family therapy.',
        '',
        'System addressed.',
        '',
        'Multiple buckets together.',
        '',
        'I tell family-stressed: family therapy.'
      ],
      lesson: 'Family therapy addresses system; multiple family buckets addressed together.'
    },
    {
      id: 'sn18_14',
      title: 'My bucket and couples therapy',
      narrative: [
        'Couples therapy.',
        '',
        'Partner buckets addressed.',
        '',
        'Mutual support built.',
        '',
        'I tell partnered-stressed: couples therapy.'
      ],
      lesson: 'Couples therapy addresses both partner buckets; mutual support built through joint work.'
    },
    {
      id: 'sn18_15',
      title: 'My bucket and group support',
      narrative: [
        'Specialty support groups.',
        '',
        'Loss, illness, identity.',
        '',
        'Specific buckets shared.',
        '',
        'I tell specific-stressed: specialty groups.'
      ],
      lesson: 'Specialty support groups for specific stressors enable shared bucket experiences.'
    }
  ];

  var STRESS_NARRATIVES_19 = [
    {
      id: 'sn19_1',
      title: 'My bucket and outdoor exercise',
      narrative: [
        'Outdoor exercise combines.',
        '',
        'Movement plus nature.',
        '',
        'Two taps at once.',
        '',
        'I tell tap-stacking: outdoor exercise.'
      ],
      lesson: 'Outdoor exercise combines movement and nature taps simultaneously for maximum drainage.'
    },
    {
      id: 'sn19_2',
      title: 'My bucket and walking with friend',
      narrative: [
        'Walking and connecting.',
        '',
        'Movement plus social.',
        '',
        'Two taps together.',
        '',
        'I tell friend-walker: tap stacking.'
      ],
      lesson: 'Walking with friend combines movement and social taps; stacked taps drain efficiently.'
    },
    {
      id: 'sn19_3',
      title: 'My bucket and gardening with music',
      narrative: [
        'Garden plus music.',
        '',
        'Body plus mind plus earth.',
        '',
        'Multiple taps.',
        '',
        'I tell tap-stacker: garden plus music.'
      ],
      lesson: 'Gardening with music combines body, mind, earth taps simultaneously.'
    },
    {
      id: 'sn19_4',
      title: 'My bucket and cooking with podcast',
      narrative: [
        'Cooking plus podcast.',
        '',
        'Body busy plus mind engaged.',
        '',
        'Both tap.',
        '',
        'I tell efficient-tappers: combine.'
      ],
      lesson: 'Cooking with podcast combines body busy and mind engaged taps; efficient combination.'
    },
    {
      id: 'sn19_5',
      title: 'My bucket and bath with book',
      narrative: [
        'Bath plus reading.',
        '',
        'Body plus mind.',
        '',
        'Double tap.',
        '',
        'I tell luxury-tappers: bath plus book.'
      ],
      lesson: 'Bath with book combines body warmth and mind absorption; luxurious double tap.'
    },
    {
      id: 'sn19_6',
      title: 'My bucket and yoga with music',
      narrative: [
        'Yoga plus music.',
        '',
        'Movement plus auditory.',
        '',
        'Combined tap.',
        '',
        'I tell yoga-curious: with music.'
      ],
      lesson: 'Yoga with music combines movement and auditory taps; combined experience.'
    },
    {
      id: 'sn19_7',
      title: 'My bucket and journaling with tea',
      narrative: [
        'Journal plus tea.',
        '',
        'Writing plus warmth.',
        '',
        'Combined ritual.',
        '',
        'I tell journalers: add tea.'
      ],
      lesson: 'Journaling with tea combines writing and warmth taps; ritualized combination.'
    },
    {
      id: 'sn19_8',
      title: 'My bucket and meditation with chime',
      narrative: [
        'Meditation plus chime.',
        '',
        'Internal plus auditory anchor.',
        '',
        'Practice deepened.',
        '',
        'I tell meditation-curious: chime helps.'
      ],
      lesson: 'Meditation with chime adds auditory anchor; practice deepens through sound integration.'
    },
    {
      id: 'sn19_9',
      title: 'My bucket and prayer with candle',
      narrative: [
        'Prayer plus candle.',
        '',
        'Verbal plus visual.',
        '',
        'Sacred space made.',
        '',
        'I tell faithful: candle deepens.'
      ],
      lesson: 'Prayer with candle creates sacred space; verbal plus visual deepens practice.'
    },
    {
      id: 'sn19_10',
      title: 'My bucket and reading with cat',
      narrative: [
        'Reading plus cat on lap.',
        '',
        'Mind plus body warmth.',
        '',
        'Quiet tap.',
        '',
        'I tell cat-owners: reading with cat.'
      ],
      lesson: 'Reading with cat on lap combines mind absorption and body warmth taps quietly.'
    },
    {
      id: 'sn19_11',
      title: 'My bucket and dog walking with podcast',
      narrative: [
        'Dog walk plus podcast.',
        '',
        'Triple tap.',
        '',
        'Body plus pet plus mind.',
        '',
        'I tell triple-tappers: dog walks.'
      ],
      lesson: 'Dog walks with podcast combine body movement, pet presence, mind engagement.'
    },
    {
      id: 'sn19_12',
      title: 'My bucket and quilt making with movie',
      narrative: [
        'Quilting plus movie.',
        '',
        'Hands plus story.',
        '',
        'Creative tap stacking.',
        '',
        'I tell crafters: stack hobbies.'
      ],
      lesson: 'Quilting with movie combines hand work and story absorption taps; creative stacking.'
    },
    {
      id: 'sn19_13',
      title: 'My bucket and morning porch with coffee',
      narrative: [
        'Porch plus coffee plus dawn.',
        '',
        'Outdoor plus warmth plus light.',
        '',
        'Daily triple tap.',
        '',
        'I tell morning-curious: porch coffee.'
      ],
      lesson: 'Morning porch coffee at dawn combines outdoor, warmth, light taps daily.'
    },
    {
      id: 'sn19_14',
      title: 'My bucket and evening tea with sunset',
      narrative: [
        'Sunset porch tea.',
        '',
        'Beauty plus warmth plus pace.',
        '',
        'Evening triple tap.',
        '',
        'I tell evening-curious: sunset tea.'
      ],
      lesson: 'Evening porch tea at sunset combines beauty, warmth, slowing taps.'
    },
    {
      id: 'sn19_15',
      title: 'My bucket and morning meditation with sun',
      narrative: [
        'Morning meditation outside.',
        '',
        'Sun on face plus mind quiet.',
        '',
        'Sacred morning.',
        '',
        'I tell deep-tappers: outdoor meditation.'
      ],
      lesson: 'Outdoor morning meditation combines sun face exposure and mind quieting; sacred morning practice.'
    }
  ];

  var STRESS_NARRATIVES_20 = [
    {
      id: 'sn20_1',
      title: 'My bucket and walking meditation',
      narrative: [
        'Slow walking meditation.',
        '',
        'Foot attention.',
        '',
        'Body and mind together.',
        '',
        'I tell sitting-stuck: walking meditation.'
      ],
      lesson: 'Walking meditation combines foot attention, body and mind; alternative to sitting practice.'
    },
    {
      id: 'sn20_2',
      title: 'My bucket and forest bathing',
      narrative: [
        'Forest bathing weekly.',
        '',
        'Slow nature immersion.',
        '',
        'Research-backed drain.',
        '',
        'I tell stressed: forest bathing.'
      ],
      lesson: 'Forest bathing weekly provides research-backed nature immersion bucket drain.'
    },
    {
      id: 'sn20_3',
      title: 'My bucket and beach walking',
      narrative: [
        'Beach walk weekly.',
        '',
        'Waves plus sand plus air.',
        '',
        'Sensory tap.',
        '',
        'I tell coastal: beach walking.'
      ],
      lesson: 'Beach walking provides combined wave, sand, air sensory tap.'
    },
    {
      id: 'sn20_4',
      title: 'My bucket and mountain hiking',
      narrative: [
        'Mountain hike weekly.',
        '',
        'Body engagement plus elevation.',
        '',
        'Perspective shift.',
        '',
        'I tell mountain-near: hiking tap.'
      ],
      lesson: 'Weekly mountain hiking provides body engagement, elevation, perspective shift taps.'
    },
    {
      id: 'sn20_5',
      title: 'My bucket and water bodies',
      narrative: [
        'Lake or river weekly.',
        '',
        'Water sound plus light.',
        '',
        'Calming presence.',
        '',
        'I tell water-near: water visits.'
      ],
      lesson: 'Lake or river weekly visits provide water sound and light calming presence taps.'
    },
    {
      id: 'sn20_6',
      title: 'My bucket and city parks',
      narrative: [
        'City park visits.',
        '',
        'Nature in urban.',
        '',
        'Accessible tap.',
        '',
        'I tell urban-stressed: park visits.'
      ],
      lesson: 'City park visits provide accessible nature tap for urban stressed environments.'
    },
    {
      id: 'sn20_7',
      title: 'My bucket and backyard nature',
      narrative: [
        'Backyard time.',
        '',
        'Even small green space.',
        '',
        'Nature tap accessible.',
        '',
        'I tell home-bound: backyard tap.'
      ],
      lesson: 'Backyard nature tap accessible even in small green spaces for home-bound users.'
    },
    {
      id: 'sn20_8',
      title: 'My bucket and balcony plants',
      narrative: [
        'Apartment balcony plants.',
        '',
        'Green tap in apartment.',
        '',
        'Accessible.',
        '',
        'I tell apartment-dwellers: balcony plants.'
      ],
      lesson: 'Apartment balcony plants provide green tap accessibly; nature accessible even in small spaces.'
    },
    {
      id: 'sn20_9',
      title: 'My bucket and indoor plants',
      narrative: [
        'Houseplants throughout home.',
        '',
        'Green presence daily.',
        '',
        'Nature in walls.',
        '',
        'I tell apartment-dwellers: houseplants.'
      ],
      lesson: 'Indoor houseplants throughout home provide daily green presence within walls.'
    },
    {
      id: 'sn20_10',
      title: 'My bucket and window views',
      narrative: [
        'Window with tree view.',
        '',
        'Daily nature glimpse.',
        '',
        'Visual tap.',
        '',
        'I tell window-having: tree view.'
      ],
      lesson: 'Window tree views provide daily visual nature tap accessible from indoors.'
    },
    {
      id: 'sn20_11',
      title: 'My bucket and nature documentaries',
      narrative: [
        'Nature documentaries.',
        '',
        'Vicarious nature.',
        '',
        'Tap when indoors.',
        '',
        'I tell weather-stuck: documentaries.'
      ],
      lesson: 'Nature documentaries provide vicarious nature tap when weather prevents outdoor access.'
    },
    {
      id: 'sn20_12',
      title: 'My bucket and bird watching',
      narrative: [
        'Window bird watching.',
        '',
        'Patient observation.',
        '',
        'Daily visual.',
        '',
        'I tell observation-curious: bird watching.'
      ],
      lesson: 'Window bird watching provides patient observation daily visual tap.'
    },
    {
      id: 'sn20_13',
      title: 'My bucket and bird feeder',
      narrative: [
        'Bird feeder window.',
        '',
        'Birds invited.',
        '',
        'Daily presence.',
        '',
        'I tell window-having: bird feeder.'
      ],
      lesson: 'Window bird feeders invite birds for daily presence visual tap.'
    },
    {
      id: 'sn20_14',
      title: 'My bucket and sky watching',
      narrative: [
        'Sky watching daily.',
        '',
        'Clouds plus light.',
        '',
        'Free meditation.',
        '',
        'I tell sky-curious: watching.'
      ],
      lesson: 'Daily sky watching provides free meditation with clouds and light changes.'
    },
    {
      id: 'sn20_15',
      title: 'My bucket and moon watching',
      narrative: [
        'Moon phases watched.',
        '',
        'Monthly cycle.',
        '',
        'Time aware.',
        '',
        'I tell rhythm-curious: moon watching.'
      ],
      lesson: 'Moon phase watching provides monthly cycle awareness and time grounding.'
    }
  ];

  var STRESS_NARRATIVES_11 = [
    {
      id: 'sn11_1',
      title: 'My bucket weekly check-in practice',
      narrative: [
        'Sunday evening review.',
        '',
        'Bucket level scaled 1-10.',
        '',
        'Inflows of past week.',
        '',
        'Taps used and missed.',
        '',
        'Plan upcoming week.',
        '',
        'I tell systematic-stressed: weekly check-in.'
      ],
      lesson: 'Sunday weekly check-ins review bucket level, inflows, taps used and missed for next week planning.'
    },
    {
      id: 'sn11_2',
      title: 'My bucket and family system',
      narrative: [
        'Family system buckets connected.',
        '',
        'When one overflows, others fill.',
        '',
        'Family bucket awareness.',
        '',
        'I tell families: connected buckets.'
      ],
      lesson: 'Family system buckets connected; one overflow fills others through emotional contagion.'
    },
    {
      id: 'sn11_3',
      title: 'My bucket and team at work',
      narrative: [
        'Team bucket awareness.',
        '',
        'Manager checks bucket weekly.',
        '',
        'Adjusts workload.',
        '',
        'I tell managers: bucket-aware leadership.'
      ],
      lesson: 'Bucket-aware managers check team buckets weekly and adjust workload accordingly.'
    },
    {
      id: 'sn11_4',
      title: 'My bucket model for teens',
      narrative: [
        'Taught teen daughter.',
        '',
        'Bucket model accessible.',
        '',
        'She tracks her own.',
        '',
        'I tell parents: teach bucket model.'
      ],
      lesson: 'Teens grasp bucket model easily; teaching enables self-tracking and stress awareness.'
    },
    {
      id: 'sn11_5',
      title: 'My bucket model for children',
      narrative: [
        'Drew bucket on paper.',
        '',
        'Kid colored stressors.',
        '',
        'Made tap diagrams.',
        '',
        'Visual learning.',
        '',
        'I tell parents: visual bucket teaching.'
      ],
      lesson: 'Visual bucket teaching with paper and colors enables children to grasp stress management.'
    },
    {
      id: 'sn11_6',
      title: 'My bucket in middle school',
      narrative: [
        'Middle school counselor.',
        '',
        'Used bucket model.',
        '',
        'Students tracked.',
        '',
        'Common vocabulary.',
        '',
        'I tell counselors: bucket as classroom tool.'
      ],
      lesson: 'School counselors teach bucket model providing common vocabulary for student stress tracking.'
    },
    {
      id: 'sn11_7',
      title: 'My bucket in high school',
      narrative: [
        'High school stress survey.',
        '',
        'Bucket overflow signs measured.',
        '',
        'Early intervention.',
        '',
        'I tell schools: bucket measurement.'
      ],
      lesson: 'High school stress surveys using bucket overflow signs enable early intervention before crisis.'
    },
    {
      id: 'sn11_8',
      title: 'My bucket in college transition',
      narrative: [
        'College freshman stress.',
        '',
        'New stressors stacked.',
        '',
        'Counseling center taught bucket.',
        '',
        'Survived freshman year.',
        '',
        'I tell new college students: counseling center.'
      ],
      lesson: 'College freshmen face stacked new stressors; counseling centers teaching bucket model help survival.'
    },
    {
      id: 'sn11_9',
      title: 'My bucket as graduate student',
      narrative: [
        'Grad school stress.',
        '',
        'Bucket constantly full.',
        '',
        'Weekly therapy.',
        '',
        'Plus medication.',
        '',
        'I tell grad students: combine modes.'
      ],
      lesson: 'Graduate student bucket stays full; weekly therapy plus medication combine for management.'
    },
    {
      id: 'sn11_10',
      title: 'My bucket as new attorney',
      narrative: [
        'Law firm bucket overflow.',
        '',
        'Billable hours pressure.',
        '',
        'Therapy plus boundaries.',
        '',
        'I tell new attorneys: combined support.'
      ],
      lesson: 'New attorney bucket overflows from billable hours; therapy plus boundaries combine.'
    },
    {
      id: 'sn11_11',
      title: 'My bucket as medical resident',
      narrative: [
        'Residency massive inflow.',
        '',
        'Sleep deprivation.',
        '',
        'High stakes.',
        '',
        'Peer support critical.',
        '',
        'I tell residents: peer support.'
      ],
      lesson: 'Medical residency massive inflow with sleep deprivation; peer support critical for survival.'
    },
    {
      id: 'sn11_12',
      title: 'My bucket as teacher',
      narrative: [
        'Teaching constant inflow.',
        '',
        'Boundaries hard.',
        '',
        'Specialty teacher therapy.',
        '',
        'Plus union support.',
        '',
        'I tell teachers: specialty plus community.'
      ],
      lesson: 'Teachers face constant inflow; specialty teacher therapy plus union community support.'
    },
    {
      id: 'sn11_13',
      title: 'My bucket as nurse',
      narrative: [
        'Nursing massive inflow.',
        '',
        'Compassion fatigue.',
        '',
        'Specialty nurse therapy.',
        '',
        'Plus peer support.',
        '',
        'I tell nurses: compassion fatigue real.'
      ],
      lesson: 'Nurses face compassion fatigue inflow; specialty nurse therapy plus peer support address.'
    },
    {
      id: 'sn11_14',
      title: 'My bucket as social worker',
      narrative: [
        'Social work secondary trauma.',
        '',
        'Specialty supervision required.',
        '',
        'Plus personal therapy.',
        '',
        'I tell social workers: supervision plus therapy.'
      ],
      lesson: 'Social workers face secondary trauma inflow; required supervision plus personal therapy address.'
    },
    {
      id: 'sn11_15',
      title: 'My bucket as first responder',
      narrative: [
        'First responder PTSD risk.',
        '',
        'Specialty first responder support.',
        '',
        'Plus peer support.',
        '',
        'I tell first responders: specialty support exists.'
      ],
      lesson: 'First responders face PTSD risk from job inflow; specialty support and peer groups exist.'
    }
  ];

  var STRESS_NARRATIVES_12 = [
    {
      id: 'sn12_1',
      title: 'My bucket morning routine',
      narrative: [
        'Wake at consistent time.',
        '',
        'Coffee outside.',
        '',
        '10 min movement.',
        '',
        'Bucket primed for day.',
        '',
        'I tell morning-rushers: routine helps.'
      ],
      lesson: 'Consistent morning routine primes bucket for day; coffee outside plus movement provide foundation.'
    },
    {
      id: 'sn12_2',
      title: 'My bucket evening routine',
      narrative: [
        'Same evening sequence.',
        '',
        'Bath, book, bed.',
        '',
        'Bucket drained.',
        '',
        'Sleep arrives.',
        '',
        'I tell sleep-troubled: evening routine.'
      ],
      lesson: 'Consistent evening routine drains bucket; bath, book, bed sequence prepares sleep.'
    },
    {
      id: 'sn12_3',
      title: 'My bucket weekend structure',
      narrative: [
        'Saturday rest day.',
        '',
        'Sunday prep day.',
        '',
        'Both restorative.',
        '',
        'I tell weekend-stressed: structure helps.'
      ],
      lesson: 'Structured weekends with Saturday rest and Sunday prep both restorative for bucket capacity.'
    },
    {
      id: 'sn12_4',
      title: 'My bucket and seasonal practices',
      narrative: [
        'Winter slower pace.',
        '',
        'Spring renewed activity.',
        '',
        'Summer outdoor.',
        '',
        'Fall reflection.',
        '',
        'I tell seasonal-stressed: align with seasons.'
      ],
      lesson: 'Seasonal-aligned practices match bucket needs to natural rhythms across the year.'
    },
    {
      id: 'sn12_5',
      title: 'My bucket and lunar awareness',
      narrative: [
        'Full moon energy.',
        '',
        'New moon rest.',
        '',
        'Lunar bucket cycle.',
        '',
        'I tell cycle-aware: lunar awareness.'
      ],
      lesson: 'Lunar cycle awareness aligns bucket practices with monthly natural rhythms.'
    },
    {
      id: 'sn12_6',
      title: 'My bucket and circadian rhythm',
      narrative: [
        'Body has natural rhythm.',
        '',
        'Cortisol morning peak.',
        '',
        'Melatonin evening.',
        '',
        'Align practices.',
        '',
        'I tell biology-curious: circadian align.'
      ],
      lesson: 'Circadian rhythm awareness aligns stress practices with biological hormone cycles.'
    },
    {
      id: 'sn12_7',
      title: 'My bucket and weekly cycle',
      narrative: [
        'Monday highest inflow.',
        '',
        'Friday lowest capacity.',
        '',
        'Weekend restoration.',
        '',
        'Plan accordingly.',
        '',
        'I tell weekly-cyclic: plan around.'
      ],
      lesson: 'Weekly cycles show Monday inflow peaks and Friday capacity lows; plan around predictable pattern.'
    },
    {
      id: 'sn12_8',
      title: 'My bucket and annual cycle',
      narrative: [
        'Holiday stress predictable.',
        '',
        'Tax season predictable.',
        '',
        'Plan increased taps.',
        '',
        'I tell annually-stressed: predictable cycles.'
      ],
      lesson: 'Annual cycles like holidays and tax season predictable; plan increased taps during peaks.'
    },
    {
      id: 'sn12_9',
      title: 'My bucket and birthday season',
      narrative: [
        'Birthday brings reflection.',
        '',
        'Plus social pressure.',
        '',
        'Bucket inflow mixed.',
        '',
        'I tell birthday-stressed: plan around.'
      ],
      lesson: 'Birthday seasons bring mixed reflection and social inflow; plan capacity accordingly.'
    },
    {
      id: 'sn12_10',
      title: 'My bucket and anniversary reactions',
      narrative: [
        'Anniversary triggers.',
        '',
        'Body remembers.',
        '',
        'Predictable inflow.',
        '',
        'I tell anniversary-aware: plan.'
      ],
      lesson: 'Anniversary reaction inflow predictable; body remembers dates with somatic responses.'
    },
    {
      id: 'sn12_11',
      title: 'My bucket and life transitions',
      narrative: [
        'Major transitions overflow bucket.',
        '',
        'Marriage, baby, move, job.',
        '',
        'Reduce other inflow.',
        '',
        'Multiple taps.',
        '',
        'I tell transitioning: reduce other inflow.'
      ],
      lesson: 'Major life transitions overflow bucket; reduce other inflow and increase tap usage during.'
    },
    {
      id: 'sn12_12',
      title: 'My bucket and identity changes',
      narrative: [
        'Identity transitions inflow.',
        '',
        'Therapy plus community.',
        '',
        'Time as primary tap.',
        '',
        'I tell identity-shifting: time and community.'
      ],
      lesson: 'Identity transitions add inflow; therapy plus community plus time tap address.'
    },
    {
      id: 'sn12_13',
      title: 'My bucket and parenting stages',
      narrative: [
        'Infant inflow.',
        '',
        'Toddler inflow.',
        '',
        'Teen inflow.',
        '',
        'Different per stage.',
        '',
        'I tell parents: stage-specific bucket.'
      ],
      lesson: 'Parenting stage-specific bucket inflow; infant, toddler, teen each present different challenges.'
    },
    {
      id: 'sn12_14',
      title: 'My bucket and empty nest',
      narrative: [
        'Empty nest transition.',
        '',
        'Identity shift inflow.',
        '',
        'Plus new freedom.',
        '',
        'Bucket reshaped.',
        '',
        'I tell empty-nesting: identity therapy.'
      ],
      lesson: 'Empty nest transition reshapes bucket; identity inflow with new freedom requires therapy.'
    },
    {
      id: 'sn12_15',
      title: 'My bucket and retirement',
      narrative: [
        'Retirement transition.',
        '',
        'Identity loss inflow.',
        '',
        'Plus financial concerns.',
        '',
        'Retirement coaching plus therapy.',
        '',
        'I tell retiring: combined support.'
      ],
      lesson: 'Retirement transition adds identity and financial inflow; coaching plus therapy provide combined.'
    }
  ];

  var STRESS_NARRATIVES_13 = [
    {
      id: 'sn13_1',
      title: 'My bucket and ADHD medication',
      narrative: [
        'ADHD treatment.',
        '',
        'Smaller bucket actually.',
        '',
        'Medication expands capacity.',
        '',
        'Plus structure.',
        '',
        'I tell ADHD: medication helps capacity.'
      ],
      lesson: 'ADHD medication expands bucket capacity; treatment plus structure manage smaller default bucket.'
    },
    {
      id: 'sn13_2',
      title: 'My bucket and antidepressants',
      narrative: [
        'SSRI helped capacity.',
        '',
        'Could open taps again.',
        '',
        'Treatment plus therapy.',
        '',
        'I tell depressed: medication restores access.'
      ],
      lesson: 'Antidepressant medication restores tap access; treatment plus therapy combined.'
    },
    {
      id: 'sn13_3',
      title: 'My bucket and anti-anxiety medication',
      narrative: [
        'Anxiety medication.',
        '',
        'Reduced background inflow.',
        '',
        'Bucket manageable.',
        '',
        'I tell anxiety-stressed: medication helps.'
      ],
      lesson: 'Anti-anxiety medication reduces background inflow; bucket manageable through pharmacological support.'
    },
    {
      id: 'sn13_4',
      title: 'My bucket and thyroid medication',
      narrative: [
        'Hypothyroid affected capacity.',
        '',
        'Medication restored.',
        '',
        'Bucket normal again.',
        '',
        'I tell unexplained-stress: check thyroid.'
      ],
      lesson: 'Thyroid issues affect bucket capacity; medication restores normal stress tolerance.'
    },
    {
      id: 'sn13_5',
      title: 'My bucket and hormone therapy',
      narrative: [
        'Perimenopause hormones.',
        '',
        'Bucket shrank.',
        '',
        'HRT restored.',
        '',
        'I tell midlife women: HRT may help.'
      ],
      lesson: 'Perimenopause hormones shrink bucket; HRT may restore capacity.'
    },
    {
      id: 'sn13_6',
      title: 'My bucket and exercise medication',
      narrative: [
        'Exercise is medicine.',
        '',
        'Treatment-grade tap.',
        '',
        'Not optional.',
        '',
        'I tell sedentary: exercise is medicine.'
      ],
      lesson: 'Exercise is treatment-grade medicine for stress; not optional lifestyle but real intervention.'
    },
    {
      id: 'sn13_7',
      title: 'My bucket and sleep medication',
      narrative: [
        'Sleep medication short-term.',
        '',
        'Restored sleep tap.',
        '',
        'Then weaned off.',
        '',
        'I tell sleep-troubled: short-term help.'
      ],
      lesson: 'Sleep medication short-term restores sleep tap; wean off as habits rebuild.'
    },
    {
      id: 'sn13_8',
      title: 'My bucket and supplements',
      narrative: [
        'Vitamin D winter.',
        '',
        'Magnesium for sleep.',
        '',
        'B vitamins for energy.',
        '',
        'I tell supplement-curious: research helps.'
      ],
      lesson: 'Targeted supplements like vitamin D, magnesium, B vitamins support bucket capacity research-based.'
    },
    {
      id: 'sn13_9',
      title: 'My bucket and nutrition',
      narrative: [
        'Diet affects bucket.',
        '',
        'Sugar spikes inflow.',
        '',
        'Protein steadies.',
        '',
        'I tell food-curious: nutrition affects stress.'
      ],
      lesson: 'Nutrition affects bucket; sugar spikes inflow while protein steadies stress chemistry.'
    },
    {
      id: 'sn13_10',
      title: 'My bucket and caffeine',
      narrative: [
        'Reduced caffeine.',
        '',
        'Less inflow.',
        '',
        'Bucket lighter.',
        '',
        'I tell coffee-heavy: reduce.'
      ],
      lesson: 'Reduced caffeine reduces bucket inflow; lighter bucket through pharmacological subtraction.'
    },
    {
      id: 'sn13_11',
      title: 'My bucket and alcohol',
      narrative: [
        'Reduced alcohol.',
        '',
        'Less rebound inflow.',
        '',
        'Bucket recovers.',
        '',
        'I tell drinkers: reduce.'
      ],
      lesson: 'Reduced alcohol reduces rebound stress inflow; bucket recovers through subtraction.'
    },
    {
      id: 'sn13_12',
      title: 'My bucket and cannabis',
      narrative: [
        'Cannabis daily use.',
        '',
        'Created false drain.',
        '',
        'Reduced use.',
        '',
        'Found real taps.',
        '',
        'I tell cannabis-users: real taps available.'
      ],
      lesson: 'Cannabis can create false drain illusion; reducing use finds real bucket taps.'
    },
    {
      id: 'sn13_13',
      title: 'My bucket and acupuncture',
      narrative: [
        'Weekly acupuncture.',
        '',
        'Nervous system reset.',
        '',
        'Adjunct tap.',
        '',
        'I tell skeptics: acupuncture has research.'
      ],
      lesson: 'Weekly acupuncture has research base as adjunct tap; nervous system reset support.'
    },
    {
      id: 'sn13_14',
      title: 'My bucket and massage',
      narrative: [
        'Monthly massage.',
        '',
        'Body tension released.',
        '',
        'Bucket drained.',
        '',
        'I tell body-tense: massage tap.'
      ],
      lesson: 'Monthly massage releases body tension; bodily tap drains accumulated bucket stress.'
    },
    {
      id: 'sn13_15',
      title: 'My bucket and chiropractic',
      narrative: [
        'Weekly chiropractic.',
        '',
        'Spinal alignment.',
        '',
        'Body system reset.',
        '',
        'I tell body-stressed: bodywork helps.'
      ],
      lesson: 'Weekly chiropractic provides spinal alignment; body system reset supports bucket management.'
    }
  ];

  var STRESS_NARRATIVES_14 = [
    {
      id: 'sn14_1',
      title: 'My bucket and grief integration',
      narrative: [
        'Grief eventually integrates.',
        '',
        'Bucket adjusts.',
        '',
        'New normal.',
        '',
        'I tell long-grieving: integration possible.'
      ],
      lesson: 'Grief integrates over years; bucket adjusts to new normal; integration possible.'
    },
    {
      id: 'sn14_2',
      title: 'My bucket and trauma integration',
      narrative: [
        'Trauma therapy.',
        '',
        'EMDR processed memories.',
        '',
        'Triggers reduced.',
        '',
        'Bucket capacity restored.',
        '',
        'I tell trauma survivors: EMDR processes.'
      ],
      lesson: 'EMDR trauma therapy processes memories reducing triggers; bucket capacity restored.'
    },
    {
      id: 'sn14_3',
      title: 'My bucket and PTSD treatment',
      narrative: [
        'PTSD specialty treatment.',
        '',
        'Prolonged exposure plus CBT.',
        '',
        'Symptoms reduced.',
        '',
        'I tell PTSD survivors: specialty treatments work.'
      ],
      lesson: 'PTSD specialty treatments like prolonged exposure plus CBT reduce symptoms and bucket inflow.'
    },
    {
      id: 'sn14_4',
      title: 'My bucket and complex trauma',
      narrative: [
        'Complex trauma extended therapy.',
        '',
        'Years to build capacity.',
        '',
        'Slowly bucket grows.',
        '',
        'I tell complex trauma: years of work.'
      ],
      lesson: 'Complex trauma extended therapy builds bucket capacity over years; patient growth.'
    },
    {
      id: 'sn14_5',
      title: 'My bucket and abandonment trauma',
      narrative: [
        'Childhood abandonment.',
        '',
        'Attachment therapy.',
        '',
        'Secure attachment earned.',
        '',
        'Bucket expanded.',
        '',
        'I tell abandoned: attachment work.'
      ],
      lesson: 'Childhood abandonment treated through attachment therapy; earned secure attachment expands bucket.'
    },
    {
      id: 'sn14_6',
      title: 'My bucket and abuse recovery',
      narrative: [
        'Abuse history.',
        '',
        'Long therapy.',
        '',
        'Body work.',
        '',
        'Plus medication.',
        '',
        'Slowly recovered capacity.',
        '',
        'I tell abuse survivors: combined modalities.'
      ],
      lesson: 'Abuse recovery combines therapy, body work, medication over years; capacity slowly restored.'
    },
    {
      id: 'sn14_7',
      title: 'My bucket and addiction recovery',
      narrative: [
        'Addiction recovery.',
        '',
        'Removed false tap.',
        '',
        'Found real taps.',
        '',
        'Bucket manageable.',
        '',
        'I tell recovering: real taps exist.'
      ],
      lesson: 'Addiction recovery removes false drains; finding real taps makes bucket manageable.'
    },
    {
      id: 'sn14_8',
      title: 'My bucket and eating disorder recovery',
      narrative: [
        'Eating disorder treatment.',
        '',
        'Restored relationship with food.',
        '',
        'Bucket relationship restored.',
        '',
        'I tell recovering: specialty essential.'
      ],
      lesson: 'Eating disorder specialty treatment restores food and bucket relationship.'
    },
    {
      id: 'sn14_9',
      title: 'My bucket and self-harm recovery',
      narrative: [
        'Self-harm was false drain.',
        '',
        'DBT taught real skills.',
        '',
        'Bucket healthier.',
        '',
        'I tell recovering: DBT teaches.'
      ],
      lesson: 'Self-harm as false drain; DBT teaches real skills for healthier bucket management.'
    },
    {
      id: 'sn14_10',
      title: 'My bucket and suicide ideation recovery',
      narrative: [
        'Crisis treatment plus ongoing therapy.',
        '',
        'Bucket capacity grew.',
        '',
        'Safety plan included.',
        '',
        'I tell recovering: ongoing support.'
      ],
      lesson: 'Suicide ideation recovery requires crisis treatment plus ongoing therapy plus safety plan.'
    },
    {
      id: 'sn14_11',
      title: 'My bucket and panic disorder treatment',
      narrative: [
        'Panic disorder CBT.',
        '',
        'Exposure therapy.',
        '',
        'Panic reduced.',
        '',
        'Bucket inflow reduced.',
        '',
        'I tell panicking: CBT works.'
      ],
      lesson: 'Panic disorder CBT with exposure therapy reduces panic; bucket inflow decreases.'
    },
    {
      id: 'sn14_12',
      title: 'My bucket and OCD treatment',
      narrative: [
        'OCD exposure response prevention.',
        '',
        'Rituals reduced.',
        '',
        'Bucket healthier.',
        '',
        'I tell OCD: ERP works.'
      ],
      lesson: 'OCD exposure response prevention treatment reduces ritual inflow; healthier bucket.'
    },
    {
      id: 'sn14_13',
      title: 'My bucket and social anxiety treatment',
      narrative: [
        'Social anxiety CBT.',
        '',
        'Exposure plus reframing.',
        '',
        'Social bucket inflow reduced.',
        '',
        'I tell socially anxious: treatment works.'
      ],
      lesson: 'Social anxiety CBT with exposure plus reframing reduces social bucket inflow.'
    },
    {
      id: 'sn14_14',
      title: 'My bucket and phobia treatment',
      narrative: [
        'Phobia treatment.',
        '',
        'Graduated exposure.',
        '',
        'Fear reduced.',
        '',
        'Bucket trigger removed.',
        '',
        'I tell phobic: graduated exposure works.'
      ],
      lesson: 'Specific phobia treatment with graduated exposure removes bucket triggers.'
    },
    {
      id: 'sn14_15',
      title: 'My bucket and bipolar management',
      narrative: [
        'Bipolar disorder medication.',
        '',
        'Plus therapy.',
        '',
        'Plus support group.',
        '',
        'Bucket stabilized.',
        '',
        'I tell bipolar: combined modalities essential.'
      ],
      lesson: 'Bipolar disorder requires medication plus therapy plus support combined for bucket stability.'
    }
  ];

  var STRESS_NARRATIVES_15 = [
    {
      id: 'sn15_1',
      title: 'My bucket recovery story',
      narrative: [
        'Crisis ten years ago.',
        '',
        'Slow recovery.',
        '',
        'Bucket integrated.',
        '',
        'Life rich now.',
        '',
        'I tell long-stressed: recovery possible.'
      ],
      lesson: 'Long-term bucket recovery is possible; crisis ten years prior integrates into rich life.'
    },
    {
      id: 'sn15_2',
      title: 'My bucket and aging body',
      narrative: [
        'Aging body different.',
        '',
        'Less physical capacity.',
        '',
        'Adjust expectations.',
        '',
        'I tell aging: adjust capacity expectations.'
      ],
      lesson: 'Aging body has different capacity; adjust expectations to current bucket size.'
    },
    {
      id: 'sn15_3',
      title: 'My bucket and slowing pace',
      narrative: [
        'Slowed pace at 60.',
        '',
        'Less inflow.',
        '',
        'Smaller bucket okay.',
        '',
        'I tell aging: slower is okay.'
      ],
      lesson: 'Aging-appropriate pace slowing reduces inflow; smaller bucket capacity is okay.'
    },
    {
      id: 'sn15_4',
      title: 'My bucket and acceptance of limits',
      narrative: [
        'Cannot do everything.',
        '',
        'Acceptance liberates.',
        '',
        'Bucket lighter.',
        '',
        'I tell perfectionists: accept limits.'
      ],
      lesson: 'Accepting cannot-do-everything liberates; bucket lighter through accepted limits.'
    },
    {
      id: 'sn15_5',
      title: 'My bucket and saying no often',
      narrative: [
        'No is sentence.',
        '',
        'Practice saying no.',
        '',
        'Reduced inflow.',
        '',
        'I tell yes-people: no is full sentence.'
      ],
      lesson: 'Practicing saying no without explanation reduces bucket inflow significantly.'
    },
    {
      id: 'sn15_6',
      title: 'My bucket and ranked priorities',
      narrative: [
        'Top three priorities.',
        '',
        'Everything else optional.',
        '',
        'Bucket lighter.',
        '',
        'I tell overcommitted: rank ruthlessly.'
      ],
      lesson: 'Ranking top three priorities makes everything else optional; bucket lighter.'
    },
    {
      id: 'sn15_7',
      title: 'My bucket and simplified life',
      narrative: [
        'Simpler life.',
        '',
        'Fewer possessions.',
        '',
        'Fewer commitments.',
        '',
        'Bucket smaller inflow.',
        '',
        'I tell complex-lifed: simplify.'
      ],
      lesson: 'Simplified life with fewer possessions and commitments reduces bucket inflow.'
    },
    {
      id: 'sn15_8',
      title: 'My bucket and minimalism',
      narrative: [
        'Minimalist approach.',
        '',
        'Less stuff.',
        '',
        'Less maintenance.',
        '',
        'Bucket lighter.',
        '',
        'I tell cluttered: minimalism reduces inflow.'
      ],
      lesson: 'Minimalist approach with less stuff and maintenance reduces ongoing bucket inflow.'
    },
    {
      id: 'sn15_9',
      title: 'My bucket and digital minimalism',
      narrative: [
        'Tech minimum approach.',
        '',
        'Essential devices only.',
        '',
        'Reduced digital inflow.',
        '',
        'I tell tech-overwhelmed: digital minimalism.'
      ],
      lesson: 'Digital minimalism with essential devices only reduces digital bucket inflow.'
    },
    {
      id: 'sn15_10',
      title: 'My bucket and intentional living',
      narrative: [
        'Each choice considered.',
        '',
        'Reactive to intentional.',
        '',
        'Bucket aligned.',
        '',
        'I tell reactive-stressed: intentional living.'
      ],
      lesson: 'Intentional living considers each choice; bucket aligned with values reduces inflow.'
    },
    {
      id: 'sn15_11',
      title: 'My bucket and values clarification',
      narrative: [
        'Therapy clarified values.',
        '',
        'Decisions easier.',
        '',
        'Bucket aligned.',
        '',
        'I tell values-confused: clarification helps.'
      ],
      lesson: 'Values clarification therapy makes decisions easier; bucket aligned with clear values.'
    },
    {
      id: 'sn15_12',
      title: 'My bucket and purpose-driven life',
      narrative: [
        'Found purpose.',
        '',
        'Reordered life.',
        '',
        'Bucket aligned.',
        '',
        'I tell purposeless-stressed: purpose clarifies.'
      ],
      lesson: 'Purpose-driven life reorders priorities; bucket aligned with meaningful direction.'
    },
    {
      id: 'sn15_13',
      title: 'My bucket and service to others',
      narrative: [
        'Service reduces self-focus.',
        '',
        'Bucket lighter.',
        '',
        'Perspective shifts.',
        '',
        'I tell self-focused: service shifts.'
      ],
      lesson: 'Service to others shifts self-focus; bucket lighter through perspective change.'
    },
    {
      id: 'sn15_14',
      title: 'My bucket and gratitude practice',
      narrative: [
        'Daily three gratitudes.',
        '',
        'Brain shifts.',
        '',
        'Bucket lighter.',
        '',
        'I tell stuck: gratitude shifts.'
      ],
      lesson: 'Daily three gratitudes shift brain; bucket lighter through grateful focus.'
    },
    {
      id: 'sn15_15',
      title: 'My bucket and self-compassion',
      narrative: [
        'Self-compassion practice.',
        '',
        'Inner voice softened.',
        '',
        'Bucket lighter.',
        '',
        'I tell self-critical: compassion lightens.'
      ],
      lesson: 'Self-compassion practice softens inner critic; bucket lighter through self-kindness.'
    }
  ];

  var STRESS_NARRATIVES_4 = [
    {
      id: 'sn4_1',
      title: 'My bucket and chronic illness',
      narrative: [
        'Chronic illness adds permanent inflow.',
        '',
        'Cannot remove the stressor.',
        '',
        'Must increase draining capacity.',
        '',
        'More taps needed.',
        '',
        'I tell chronically ill: more draining tools.'
      ],
      lesson: 'Chronic illness adds permanent inflow; requires increased draining capacity through more taps.'
    },
    {
      id: 'sn4_2',
      title: 'My bucket during pandemic',
      narrative: [
        'Pandemic massive inflow.',
        '',
        'Isolation reduced taps.',
        '',
        'Bucket overflowed widely.',
        '',
        'Slow recovery as taps reopened.',
        '',
        'I tell pandemic-stressed: rebuild taps.'
      ],
      lesson: 'Pandemic added inflow while reducing taps; bucket overflow widespread, recovery requires rebuilding taps.'
    },
    {
      id: 'sn4_3',
      title: 'My bucket overflow as panic attack',
      narrative: [
        'Panic in grocery store.',
        '',
        'Bucket overflow.',
        '',
        'Body said no more.',
        '',
        'Therapy taught earlier signs.',
        '',
        'I tell panic-sufferers: bucket model helps.'
      ],
      lesson: 'Panic attacks can be bucket overflow; body signals capacity reached.'
    },
    {
      id: 'sn4_4',
      title: 'My bucket overflow as depression',
      narrative: [
        'Long-term overflow.',
        '',
        'Became depression.',
        '',
        'Treatment plus draining.',
        '',
        'Slowly recovered.',
        '',
        'I tell depressed-stressed: chronic overflow leads here.'
      ],
      lesson: 'Long-term bucket overflow can become depression; chronic capacity overload leads to clinical state.'
    },
    {
      id: 'sn4_5',
      title: 'My bucket overflow as substance use',
      narrative: [
        'Drinking too much.',
        '',
        'Numbed overflow.',
        '',
        'Therapy addressed root.',
        '',
        'Bucket drained other ways.',
        '',
        'I tell substance-using: overflow underneath.'
      ],
      lesson: 'Substance use can mask bucket overflow; therapy addresses underlying capacity issue.'
    },
    {
      id: 'sn4_6',
      title: 'My bucket overflow as anger outbursts',
      narrative: [
        'Snapped at family weekly.',
        '',
        'Overflow as anger.',
        '',
        'Therapy on bucket.',
        '',
        'Anger reduced as bucket managed.',
        '',
        'I tell angry-family: bucket model.'
      ],
      lesson: 'Family anger outbursts often bucket overflow; managing bucket reduces anger expression.'
    },
    {
      id: 'sn4_7',
      title: 'My bucket overflow as physical illness',
      narrative: [
        'Got sick frequently.',
        '',
        'Body wore down.',
        '',
        'Overflow weakened immune.',
        '',
        'Stress management helped.',
        '',
        'I tell frequently-ill: bucket weakens body.'
      ],
      lesson: 'Frequent illness can be bucket overflow; chronic stress weakens immune through overload.'
    },
    {
      id: 'sn4_8',
      title: 'My bucket and my children',
      narrative: [
        'Children buckets unmonitored.',
        '',
        'Family conversations.',
        '',
        'Each tracks own.',
        '',
        'Family system aware.',
        '',
        'I tell parents: family bucket awareness.'
      ],
      lesson: 'Family bucket awareness with each member tracking own builds family system management.'
    },
    {
      id: 'sn4_9',
      title: 'My bucket at work',
      narrative: [
        'Work fills bucket.',
        '',
        'Boundaries needed.',
        '',
        'Strict hours.',
        '',
        'Email times only.',
        '',
        'I tell overworked: boundaries protect bucket.'
      ],
      lesson: 'Work boundaries protect bucket capacity; strict hours and email times prevent overflow.'
    },
    {
      id: 'sn4_10',
      title: 'My bucket and aging parents',
      narrative: [
        'Caring for parents.',
        '',
        'Bucket fills.',
        '',
        'Respite care.',
        '',
        'Caregiver group.',
        '',
        'Multiple taps needed.',
        '',
        'I tell sandwich-generation: multiple taps.'
      ],
      lesson: 'Sandwich generation caring requires multiple taps; respite plus group support manage caregiving bucket.'
    },
    {
      id: 'sn4_11',
      title: 'My bucket overflow as insomnia',
      narrative: [
        'Could not sleep.',
        '',
        'Bucket too full.',
        '',
        'Evening tap practice.',
        '',
        'Sleep restored.',
        '',
        'I tell insomniacs: bucket overflow possible.'
      ],
      lesson: 'Insomnia can be bucket overflow preventing sleep; evening tap practice drains for restoration.'
    },
    {
      id: 'sn4_12',
      title: 'My bucket overflow as forgetting',
      narrative: [
        'Memory slips.',
        '',
        'Bucket full of stress.',
        '',
        'Brain cannot encode.',
        '',
        'Stress management restored memory.',
        '',
        'I tell forgetful-stressed: bucket affects memory.'
      ],
      lesson: 'Memory slips can be bucket overflow; stress impairs encoding when full.'
    },
    {
      id: 'sn4_13',
      title: 'My bucket overflow as decision paralysis',
      narrative: [
        'Could not decide.',
        '',
        'Bucket too full.',
        '',
        'Stress impaired choosing.',
        '',
        'Drained bucket, decisions returned.',
        '',
        'I tell paralyzed-stressed: bucket and decisions.'
      ],
      lesson: 'Decision paralysis can be bucket overflow; full bucket impairs choosing capacity.'
    },
    {
      id: 'sn4_14',
      title: 'My bucket overflow as physical pain',
      narrative: [
        'Chronic neck pain.',
        '',
        'No medical cause.',
        '',
        'Stress somatic.',
        '',
        'Bucket drainage helped.',
        '',
        'I tell pain-stressed: somatic stress real.'
      ],
      lesson: 'Chronic pain without medical cause can be bucket overflow somatized; drainage helps.'
    },
    {
      id: 'sn4_15',
      title: 'My bucket awareness changed my life',
      narrative: [
        'Therapy taught bucket model.',
        '',
        'Awareness transformed.',
        '',
        'Now I see inflow daily.',
        '',
        'Tap accordingly.',
        '',
        'I tell newly-aware: model is gift.'
      ],
      lesson: 'Bucket model awareness transforms life; daily inflow visibility enables tap response.'
    }
  ];

  var STRESS_NARRATIVES_5 = [
    {
      id: 'sn5_1',
      title: 'My morning sunlight tap',
      narrative: [
        'Daily morning sunlight.',
        '',
        'Body clock tap.',
        '',
        'Cortisol regulated.',
        '',
        'Stress hormone drained.',
        '',
        'I tell sleep-stressed: morning sun.'
      ],
      lesson: 'Morning sunlight regulates cortisol; body clock tap drains stress hormone naturally.'
    },
    {
      id: 'sn5_2',
      title: 'My evening lighting tap',
      narrative: [
        'Dim warm light evenings.',
        '',
        'Body signals night.',
        '',
        'Tap for sleep prep.',
        '',
        'I tell sleep-stressed: evening lighting.'
      ],
      lesson: 'Dim warm evening lighting signals night to body; tap prepares sleep.'
    },
    {
      id: 'sn5_3',
      title: 'My structured day reduces inflow',
      narrative: [
        'Predictable schedule.',
        '',
        'Reduces decision inflow.',
        '',
        'Bucket fills slower.',
        '',
        'I tell chaotic-stressed: structure helps.'
      ],
      lesson: 'Structured days reduce decision inflow; predictability slows bucket filling.'
    },
    {
      id: 'sn5_4',
      title: 'My meal planning reduces inflow',
      narrative: [
        'Weekly meal prep.',
        '',
        'Reduces daily food decisions.',
        '',
        'Bucket fills slower.',
        '',
        'I tell food-decision stressed: meal prep.'
      ],
      lesson: 'Weekly meal prep reduces daily food decision inflow; bucket fills slower.'
    },
    {
      id: 'sn5_5',
      title: 'My capsule wardrobe reduces inflow',
      narrative: [
        'Reduced clothing options.',
        '',
        'No daily decisions.',
        '',
        'Bucket fills slower.',
        '',
        'I tell decision-anxious: simplify wardrobe.'
      ],
      lesson: 'Capsule wardrobes reduce daily clothing decisions; bucket fills slower through simplification.'
    },
    {
      id: 'sn5_6',
      title: 'My phone-free hours tap',
      narrative: [
        '9pm to 8am phone-free.',
        '',
        'Notification inflow stopped.',
        '',
        'Bucket recovers overnight.',
        '',
        'I tell device-tethered: phone-free hours.'
      ],
      lesson: 'Phone-free hours stop notification inflow; bucket recovers overnight.'
    },
    {
      id: 'sn5_7',
      title: 'My news limit tap',
      narrative: [
        'Weekly news only.',
        '',
        'No daily doomscrolling.',
        '',
        'Bucket fills slower.',
        '',
        'I tell news-anxious: weekly limit.'
      ],
      lesson: 'Weekly news limits stop daily doomscrolling inflow; bucket fills slower.'
    },
    {
      id: 'sn5_8',
      title: 'My social media limit tap',
      narrative: [
        'Two apps deleted.',
        '',
        'Reduced inflow.',
        '',
        'Bucket lighter.',
        '',
        'I tell platform-stressed: delete some.'
      ],
      lesson: 'Deleting social media apps reduces platform inflow; bucket lighter through subtraction.'
    },
    {
      id: 'sn5_9',
      title: 'My yes-no boundary tap',
      narrative: [
        'Practiced saying no.',
        '',
        'Reduced commitment inflow.',
        '',
        'Bucket capacity restored.',
        '',
        'I tell people-pleasers: no is tap.'
      ],
      lesson: 'Boundaries through saying no reduce commitment inflow; bucket capacity restored.'
    },
    {
      id: 'sn5_10',
      title: 'My delegation reduces inflow',
      narrative: [
        'Hired help.',
        '',
        'Cleaner, lawn care.',
        '',
        'Reduced home inflow.',
        '',
        'Bucket lighter.',
        '',
        'I tell over-responsible: delegate.'
      ],
      lesson: 'Delegating to hired help reduces home maintenance inflow; bucket lighter.'
    },
    {
      id: 'sn5_11',
      title: 'My calendar boundaries reduce inflow',
      narrative: [
        'Protected hours.',
        '',
        'No meetings before 10am.',
        '',
        'No meetings after 4pm.',
        '',
        'Bucket capacity protected.',
        '',
        'I tell meeting-stressed: calendar boundaries.'
      ],
      lesson: 'Calendar boundaries protect bucket capacity from meeting overflow.'
    },
    {
      id: 'sn5_12',
      title: 'My emergency fund reduces financial inflow',
      narrative: [
        'Built 3 month fund.',
        '',
        'Reduced money anxiety inflow.',
        '',
        'Bucket lighter on finance.',
        '',
        'I tell money-stressed: fund builds.'
      ],
      lesson: 'Emergency funds reduce financial anxiety inflow; bucket lighter on money worry.'
    },
    {
      id: 'sn5_13',
      title: 'My partner support tap',
      narrative: [
        'Weekly check-in with partner.',
        '',
        'Mutual bucket support.',
        '',
        'Both buckets drain.',
        '',
        'I tell partnered: mutual check-ins.'
      ],
      lesson: 'Weekly partner check-ins provide mutual bucket support; both drain through shared awareness.'
    },
    {
      id: 'sn5_14',
      title: 'My therapist tap weekly',
      narrative: [
        'Weekly therapy 50 min.',
        '',
        'Major bucket drain.',
        '',
        'Reliable weekly tap.',
        '',
        'I tell weekly-curious: therapy tap.'
      ],
      lesson: 'Weekly therapy provides reliable major bucket drain through 50-minute session.'
    },
    {
      id: 'sn5_15',
      title: 'My group support tap',
      narrative: [
        'Weekly support group.',
        '',
        'Community tap.',
        '',
        'Shared draining.',
        '',
        'I tell stressed: groups drain.'
      ],
      lesson: 'Weekly support groups provide community tap; shared experience drains through belonging.'
    }
  ];

  var STRESS_NARRATIVES_6 = [
    {
      id: 'sn6_1',
      title: 'My bucket too small for the stressors',
      narrative: [
        'Wished bucket bigger.',
        '',
        'Therapist: capacity is what it is.',
        '',
        'Manage inflow and outflow.',
        '',
        'Not bucket size.',
        '',
        'I tell capacity-frustrated: work with what is.'
      ],
      lesson: 'Bucket capacity fixed; manage inflow and outflow rather than wishing for larger bucket.'
    },
    {
      id: 'sn6_2',
      title: 'My bucket on a low capacity day',
      narrative: [
        'Some days less capacity.',
        '',
        'Sleep, hormones, illness.',
        '',
        'Reduce inflow that day.',
        '',
        'I tell variable-capacity: adjust daily.'
      ],
      lesson: 'Some days less capacity than others; reduce inflow on low-capacity days.'
    },
    {
      id: 'sn6_3',
      title: 'My bucket and PMS',
      narrative: [
        'PMS reduces capacity.',
        '',
        'Same stressors feel heavier.',
        '',
        'Hormonal cycle awareness.',
        '',
        'Plan accordingly.',
        '',
        'I tell cycling: hormone awareness.'
      ],
      lesson: 'Menstrual cycles affect bucket capacity; hormonal awareness enables proactive planning.'
    },
    {
      id: 'sn6_4',
      title: 'My bucket and perimenopause',
      narrative: [
        'Perimenopause shrank bucket.',
        '',
        'Same stressors overflow.',
        '',
        'Hormone treatment helped.',
        '',
        'Plus therapy.',
        '',
        'I tell midlife women: perimenopause affects bucket.'
      ],
      lesson: 'Perimenopause shrinks bucket capacity; hormone treatment plus therapy restore management.'
    },
    {
      id: 'sn6_5',
      title: 'My bucket and pregnancy',
      narrative: [
        'Pregnancy changed bucket.',
        '',
        'Hormones shifted capacity.',
        '',
        'New stressors arrived.',
        '',
        'Perinatal support.',
        '',
        'I tell pregnant: capacity shifts.'
      ],
      lesson: 'Pregnancy changes bucket through hormones and new stressors; perinatal support helps.'
    },
    {
      id: 'sn6_6',
      title: 'My bucket and postpartum',
      narrative: [
        'Newborn massive inflow.',
        '',
        'Sleep reduced taps.',
        '',
        'Bucket overflowed.',
        '',
        'Postpartum support critical.',
        '',
        'I tell new parents: postpartum support.'
      ],
      lesson: 'Postpartum period creates inflow with reduced taps; specialty support critical.'
    },
    {
      id: 'sn6_7',
      title: 'My bucket and ADHD',
      narrative: [
        'ADHD smaller bucket.',
        '',
        'Decision inflow heavier.',
        '',
        'Treatment plus structure.',
        '',
        'Bucket manageable.',
        '',
        'I tell ADHD: structural support.'
      ],
      lesson: 'ADHD often presents as smaller bucket; treatment plus structure manages capacity.'
    },
    {
      id: 'sn6_8',
      title: 'My bucket and autism',
      narrative: [
        'Autism different bucket.',
        '',
        'Sensory inflow heavier.',
        '',
        'Sensory accommodations.',
        '',
        'Bucket manageable.',
        '',
        'I tell autistic: sensory accommodations.'
      ],
      lesson: 'Autistic buckets have heavier sensory inflow; sensory accommodations reduce overload.'
    },
    {
      id: 'sn6_9',
      title: 'My bucket and trauma history',
      narrative: [
        'Trauma history smaller bucket.',
        '',
        'Triggers add heavy inflow.',
        '',
        'Trauma therapy expanded capacity.',
        '',
        'I tell trauma survivors: therapy expands.'
      ],
      lesson: 'Trauma history reduces bucket capacity; trauma therapy expands through trigger processing.'
    },
    {
      id: 'sn6_10',
      title: 'My bucket and depression',
      narrative: [
        'Depression reduced taps.',
        '',
        'Could not open them.',
        '',
        'Treatment restored access.',
        '',
        'Taps flowed again.',
        '',
        'I tell depressed: treatment opens taps.'
      ],
      lesson: 'Depression reduces tap access; treatment restores ability to open coping practices.'
    },
    {
      id: 'sn6_11',
      title: 'My bucket and chronic pain',
      narrative: [
        'Pain adds permanent inflow.',
        '',
        'Plus reduces tap access.',
        '',
        'Both ends affected.',
        '',
        'Specialty pain support.',
        '',
        'I tell chronic-pain: dual effect.'
      ],
      lesson: 'Chronic pain adds inflow and reduces tap access; specialty pain support addresses both.'
    },
    {
      id: 'sn6_12',
      title: 'My bucket and grief',
      narrative: [
        'Grief major inflow.',
        '',
        'Time as tap.',
        '',
        'Plus therapy.',
        '',
        'Plus community.',
        '',
        'Years to integrate.',
        '',
        'I tell grieving: multiple slow taps.'
      ],
      lesson: 'Grief major inflow drained slowly by time, therapy, community; integration over years.'
    },
    {
      id: 'sn6_13',
      title: 'My bucket and divorce',
      narrative: [
        'Divorce massive inflow.',
        '',
        'Identity, finances, kids.',
        '',
        'Multiple taps needed.',
        '',
        'Therapy plus group.',
        '',
        'I tell divorcing: multiple taps.'
      ],
      lesson: 'Divorce creates massive multi-faceted inflow requiring multiple simultaneous taps.'
    },
    {
      id: 'sn6_14',
      title: 'My bucket and job loss',
      narrative: [
        'Job loss major inflow.',
        '',
        'Identity, finances, future.',
        '',
        'Coach plus therapy.',
        '',
        'Plus emergency fund.',
        '',
        'I tell job-lost: combined support.'
      ],
      lesson: 'Job loss creates multi-faceted inflow requiring coach plus therapy plus financial buffer.'
    },
    {
      id: 'sn6_15',
      title: 'My bucket and moving',
      narrative: [
        'Moving major inflow.',
        '',
        'Logistics plus loss.',
        '',
        'Multiple taps.',
        '',
        'I tell movers: capacity reduce during.'
      ],
      lesson: 'Moving creates major inflow combining logistics and loss; reduce other inflow during.'
    }
  ];

  var STRESS_NARRATIVES_7 = [
    {
      id: 'sn7_1',
      title: 'My bucket and chronic illness diagnosis',
      narrative: [
        'New diagnosis.',
        '',
        'Massive bucket inflow.',
        '',
        'Specialty support team.',
        '',
        'Disease-specific community.',
        '',
        'I tell newly-diagnosed: team approach.'
      ],
      lesson: 'New chronic illness diagnoses create massive inflow requiring specialty team support.'
    },
    {
      id: 'sn7_2',
      title: 'My bucket and family illness',
      narrative: [
        'Family member sick.',
        '',
        'Caregiver inflow.',
        '',
        'Plus emotional load.',
        '',
        'Caregiver therapy.',
        '',
        'I tell family caregivers: specialty therapy.'
      ],
      lesson: 'Family illness creates caregiver and emotional inflow; specialty therapy addresses both layers.'
    },
    {
      id: 'sn7_3',
      title: 'My bucket and partner illness',
      narrative: [
        'Partner serious illness.',
        '',
        'Massive inflow.',
        '',
        'Caregiver group plus therapy.',
        '',
        'I tell partners of ill: combined support.'
      ],
      lesson: 'Partner illness creates massive inflow; caregiver group plus therapy provide combined support.'
    },
    {
      id: 'sn7_4',
      title: 'My bucket and child illness',
      narrative: [
        'Child diagnosed.',
        '',
        'Parental bucket overflow.',
        '',
        'Pediatric mental health.',
        '',
        'Parent and child supported.',
        '',
        'I tell parent caregivers: specialty support.'
      ],
      lesson: 'Child illness diagnosis overflows parental bucket; pediatric mental health supports family.'
    },
    {
      id: 'sn7_5',
      title: 'My bucket and elderly parent',
      narrative: [
        'Aging parents inflow.',
        '',
        'Sandwich generation.',
        '',
        'Specialty support.',
        '',
        'I tell sandwich-stressed: specialty.'
      ],
      lesson: 'Aging parent care creates sandwich generation inflow; specialty support addresses unique load.'
    },
    {
      id: 'sn7_6',
      title: 'My bucket and disabled child',
      narrative: [
        'Disabled child permanent inflow.',
        '',
        'Specialty parent groups.',
        '',
        'Respite care.',
        '',
        'Caregiver therapy.',
        '',
        'I tell special needs parents: specialty.'
      ],
      lesson: 'Disabled child care creates permanent inflow; specialty parent groups, respite, therapy combined.'
    },
    {
      id: 'sn7_7',
      title: 'My bucket and IEP meetings',
      narrative: [
        'School meetings stressful.',
        '',
        'Advocate plus prep.',
        '',
        'Reduced inflow per meeting.',
        '',
        'I tell IEP parents: advocate.'
      ],
      lesson: 'IEP meetings stress reduces with advocate plus preparation; structured approach lowers per-meeting inflow.'
    },
    {
      id: 'sn7_8',
      title: 'My bucket and custody battle',
      narrative: [
        'Custody battle massive inflow.',
        '',
        'Specialty family law therapy.',
        '',
        'Plus mediation.',
        '',
        'I tell custody-battling: specialty therapy.'
      ],
      lesson: 'Custody battles create massive inflow; specialty family law therapy plus mediation reduce load.'
    },
    {
      id: 'sn7_9',
      title: 'My bucket and immigration stress',
      narrative: [
        'Immigration status uncertainty.',
        '',
        'Chronic inflow.',
        '',
        'Culturally competent therapy.',
        '',
        'I tell immigrant-stressed: culturally competent.'
      ],
      lesson: 'Immigration status uncertainty creates chronic inflow; culturally competent therapy addresses.'
    },
    {
      id: 'sn7_10',
      title: 'My bucket and minority stress',
      narrative: [
        'Minority stress chronic inflow.',
        '',
        'Cannot remove societal stressor.',
        '',
        'Specialty minority therapy.',
        '',
        'Community plus advocacy.',
        '',
        'I tell minority-stressed: specialty therapy plus community.'
      ],
      lesson: 'Minority stress creates chronic societal inflow; specialty therapy plus community plus advocacy.'
    },
    {
      id: 'sn7_11',
      title: 'My bucket and queer stress',
      narrative: [
        'Minority stress as queer.',
        '',
        'Affirming therapist.',
        '',
        'Plus community.',
        '',
        'I tell queer-stressed: affirming care.'
      ],
      lesson: 'Queer minority stress responds to affirming therapy plus community; specialty support exists.'
    },
    {
      id: 'sn7_12',
      title: 'My bucket and trans stress',
      narrative: [
        'Trans minority stress.',
        '',
        'Gender-affirming therapist.',
        '',
        'Plus trans community.',
        '',
        'I tell trans-stressed: affirming care.'
      ],
      lesson: 'Trans minority stress responds to gender-affirming therapy plus trans community support.'
    },
    {
      id: 'sn7_13',
      title: 'My bucket and racial stress',
      narrative: [
        'Racial stress chronic.',
        '',
        'BIPOC-specific therapy.',
        '',
        'Plus community.',
        '',
        'I tell racial-stressed: BIPOC therapy.'
      ],
      lesson: 'Racial stress chronic inflow; BIPOC-specific therapy plus community provide culturally aware support.'
    },
    {
      id: 'sn7_14',
      title: 'My bucket and disability stress',
      narrative: [
        'Disability societal stress.',
        '',
        'Disability community.',
        '',
        'Plus advocacy.',
        '',
        'I tell disabled-stressed: community.'
      ],
      lesson: 'Disability societal stress responds to disability community plus advocacy work.'
    },
    {
      id: 'sn7_15',
      title: 'My bucket and intersectional stress',
      narrative: [
        'Multiple identities.',
        '',
        'Layered stress.',
        '',
        'Specialty intersectional therapy.',
        '',
        'I tell intersectional: specialty matters.'
      ],
      lesson: 'Intersectional identity stress requires therapy that addresses layered minority experiences.'
    }
  ];

  var STRESS_NARRATIVES_8 = [
    {
      id: 'sn8_1',
      title: 'My breath tap is always available',
      narrative: [
        'Four-seven-eight breath.',
        '',
        'Always with me.',
        '',
        'Quick bucket drain.',
        '',
        'I tell beginners: breath is foundational tap.'
      ],
      lesson: 'Breath taps always available; four-seven-eight provides quick bucket drain anytime.'
    },
    {
      id: 'sn8_2',
      title: 'My grounding tap is always available',
      narrative: [
        'Five-four-three-two-one.',
        '',
        'Five things see.',
        '',
        'Four things touch.',
        '',
        'Three things hear.',
        '',
        'Two things smell.',
        '',
        'One thing taste.',
        '',
        'I tell anxious-stressed: grounding tap.'
      ],
      lesson: 'Grounding through five senses provides always-available bucket drain through present awareness.'
    },
    {
      id: 'sn8_3',
      title: 'My movement tap is always available',
      narrative: [
        'Even 5 min walk drains.',
        '',
        'Body in motion.',
        '',
        'Stress chemistry shifts.',
        '',
        'I tell sedentary-stressed: 5 min walk works.'
      ],
      lesson: 'Five-minute walks shift stress chemistry; movement always available as bucket tap.'
    },
    {
      id: 'sn8_4',
      title: 'My water tap is always available',
      narrative: [
        'Glass of water.',
        '',
        'Hydration helps stress.',
        '',
        'Body needs fluid.',
        '',
        'I tell dehydrated-stressed: drink water.'
      ],
      lesson: 'Water provides physiological tap; hydration helps body manage stress chemistry.'
    },
    {
      id: 'sn8_5',
      title: 'My singing tap is always available',
      narrative: [
        'Hum or sing.',
        '',
        'Vagal nerve activation.',
        '',
        'Body calms.',
        '',
        'I tell stuck-stressed: hum a song.'
      ],
      lesson: 'Humming or singing activates vagal nerve; available physiological calming tap.'
    },
    {
      id: 'sn8_6',
      title: 'My cold tap drains intensity',
      narrative: [
        'Cold water on face.',
        '',
        'Mammalian dive response.',
        '',
        'Heart rate drops.',
        '',
        'I tell panic-prone: cold water tap.'
      ],
      lesson: 'Cold water on face triggers mammalian dive response; heart rate drops drainage tap.'
    },
    {
      id: 'sn8_7',
      title: 'My laughter tap',
      narrative: [
        'Watch funny video.',
        '',
        'Laughter shifts chemistry.',
        '',
        'Bucket drains.',
        '',
        'I tell stuck-stressed: laughter is tap.'
      ],
      lesson: 'Laughter shifts brain chemistry; even brief funny content drains bucket.'
    },
    {
      id: 'sn8_8',
      title: 'My pet tap',
      narrative: [
        'Pet the cat.',
        '',
        'Stroke the dog.',
        '',
        'Touch animal.',
        '',
        'Calming chemistry.',
        '',
        'I tell pet-owners: physical contact tap.'
      ],
      lesson: 'Pet contact provides calming chemistry tap; physical touch with animals drains stress.'
    },
    {
      id: 'sn8_9',
      title: 'My hug tap',
      narrative: [
        '20 second hug.',
        '',
        'Oxytocin release.',
        '',
        'Stress drains.',
        '',
        'I tell touched-stressed: hugs are tap.'
      ],
      lesson: 'Twenty-second hugs release oxytocin; physical embrace provides chemistry-based drain.'
    },
    {
      id: 'sn8_10',
      title: 'My sleep is master tap',
      narrative: [
        'Sleep restores capacity.',
        '',
        'Most important tap.',
        '',
        'Protect bedtime.',
        '',
        'I tell sleep-deficient: master tap.'
      ],
      lesson: 'Sleep is master tap restoring bucket capacity; protect bedtime fiercely as foundational practice.'
    },
    {
      id: 'sn8_11',
      title: 'My nature tap restores',
      narrative: [
        'Even 10 min outside.',
        '',
        'Nature drains.',
        '',
        'Body responds to earth.',
        '',
        'I tell urban-stressed: outdoor tap.'
      ],
      lesson: 'Ten minutes outside drains bucket; body responds to nature contact physiologically.'
    },
    {
      id: 'sn8_12',
      title: 'My phone-free time tap',
      narrative: [
        'Phone in another room.',
        '',
        'Inflow stops.',
        '',
        'Bucket recovers.',
        '',
        'I tell tethered-stressed: physical distance.'
      ],
      lesson: 'Phone-free time with physical distance stops inflow; bucket recovers through subtraction.'
    },
    {
      id: 'sn8_13',
      title: 'My silence tap',
      narrative: [
        'No music, no podcast.',
        '',
        'Silent presence.',
        '',
        'Brain rests.',
        '',
        'I tell noisy-stressed: silence is tap.'
      ],
      lesson: 'Silent presence without media rests brain; silence provides tap through subtraction.'
    },
    {
      id: 'sn8_14',
      title: 'My deep breath sigh tap',
      narrative: [
        'Long sigh out.',
        '',
        'Twice in, once out long.',
        '',
        'Body resets.',
        '',
        'I tell quick-tap-needers: sigh works.'
      ],
      lesson: 'Long sighs with two inhales and one long exhale reset nervous system quickly.'
    },
    {
      id: 'sn8_15',
      title: 'My acceptance tap',
      narrative: [
        'Accept what is.',
        '',
        'Stop fighting reality.',
        '',
        'Bucket lightens.',
        '',
        'I tell resistance-stressed: acceptance drains.'
      ],
      lesson: 'Accepting what cannot be changed lightens bucket; fighting reality adds inflow.'
    }
  ];

  var STRESS_NARRATIVES_9 = [
    {
      id: 'sn9_1',
      title: 'My bucket and burnout',
      narrative: [
        'Chronic overflow became burnout.',
        '',
        'Time off mandatory.',
        '',
        'Plus systemic change.',
        '',
        'Plus therapy.',
        '',
        'I tell burnt out: leave is treatment.'
      ],
      lesson: 'Chronic bucket overflow becomes burnout; leave plus systemic change plus therapy treat.'
    },
    {
      id: 'sn9_2',
      title: 'My bucket and toxic workplace',
      narrative: [
        'Workplace constant inflow.',
        '',
        'No draining tools sufficient.',
        '',
        'Had to leave.',
        '',
        'I tell toxic-stressed: leave is treatment.'
      ],
      lesson: 'Toxic workplaces create constant inflow no taps can drain; leaving is the only treatment.'
    },
    {
      id: 'sn9_3',
      title: 'My bucket and abusive relationship',
      narrative: [
        'Abuse constant inflow.',
        '',
        'No coping sufficient.',
        '',
        'Domestic violence support.',
        '',
        'Safe exit.',
        '',
        'I tell abused: specialty support exists.'
      ],
      lesson: 'Abusive relationships create constant inflow no coping can drain; DV support enables exit.'
    },
    {
      id: 'sn9_4',
      title: 'My bucket and financial scarcity',
      narrative: [
        'Poverty chronic inflow.',
        '',
        'No bucket model fix.',
        '',
        'Structural support needed.',
        '',
        'I tell poverty-stressed: structural truth.'
      ],
      lesson: 'Poverty is chronic structural inflow not fixable through individual coping; honest truth.'
    },
    {
      id: 'sn9_5',
      title: 'My bucket and housing insecurity',
      narrative: [
        'Housing uncertainty massive inflow.',
        '',
        'Cannot drain individually.',
        '',
        'Structural support.',
        '',
        'I tell housing-insecure: structural.'
      ],
      lesson: 'Housing insecurity is massive structural inflow requiring structural not individual support.'
    },
    {
      id: 'sn9_6',
      title: 'My bucket and healthcare cost stress',
      narrative: [
        'Medical bills constant inflow.',
        '',
        'No coping fixes systemic.',
        '',
        'Structural truth.',
        '',
        'I tell medical-debt: structural problem.'
      ],
      lesson: 'Healthcare cost stress is structural problem; individual coping cannot fix systemic inflow.'
    },
    {
      id: 'sn9_7',
      title: 'My bucket and food insecurity',
      narrative: [
        'Food anxiety chronic.',
        '',
        'Structural problem.',
        '',
        'Food assistance plus advocacy.',
        '',
        'I tell food-stressed: structural truth.'
      ],
      lesson: 'Food insecurity is structural problem requiring food assistance and advocacy not individual coping.'
    },
    {
      id: 'sn9_8',
      title: 'My bucket and student debt',
      narrative: [
        'Debt constant inflow.',
        '',
        'Structural problem.',
        '',
        'Repayment plans help some.',
        '',
        'I tell debt-stressed: structural.'
      ],
      lesson: 'Student debt is structural problem; repayment plans help individual management but problem is systemic.'
    },
    {
      id: 'sn9_9',
      title: 'My bucket and climate anxiety',
      narrative: [
        'Climate change anxiety chronic.',
        '',
        'Structural global problem.',
        '',
        'Action plus acceptance.',
        '',
        'I tell climate-anxious: action plus acceptance.'
      ],
      lesson: 'Climate anxiety is structural global problem; action plus acceptance manage individual load.'
    },
    {
      id: 'sn9_10',
      title: 'My bucket and political stress',
      narrative: [
        'Political climate stressor.',
        '',
        'Limit news intake.',
        '',
        'Channel into action.',
        '',
        'I tell politically-stressed: limit plus action.'
      ],
      lesson: 'Political stress responds to limited news intake plus channeled action; structural plus personal.'
    },
    {
      id: 'sn9_11',
      title: 'My bucket and discrimination at work',
      narrative: [
        'Workplace discrimination inflow.',
        '',
        'HR plus legal plus therapy.',
        '',
        'I tell discriminated: combined response.'
      ],
      lesson: 'Workplace discrimination requires HR plus legal plus therapy combined response.'
    },
    {
      id: 'sn9_12',
      title: 'My bucket and microaggressions',
      narrative: [
        'Daily microaggressions add inflow.',
        '',
        'Cannot drain individually.',
        '',
        'Affinity groups plus therapy.',
        '',
        'I tell microaggression-stressed: community.'
      ],
      lesson: 'Microaggressions add daily inflow; affinity groups plus therapy help; individual coping limited.'
    },
    {
      id: 'sn9_13',
      title: 'My bucket and caregiver exhaustion',
      narrative: [
        'Long-term caregiving overflow.',
        '',
        'Respite care critical.',
        '',
        'Caregiver therapy.',
        '',
        'I tell caregivers: respite is treatment.'
      ],
      lesson: 'Long-term caregiver overflow requires respite care; respite is essential treatment.'
    },
    {
      id: 'sn9_14',
      title: 'My bucket and grief stack',
      narrative: [
        'Multiple losses close together.',
        '',
        'Bucket cannot recover.',
        '',
        'Grief therapy.',
        '',
        'Time as primary tap.',
        '',
        'I tell stacked-grievers: time tap.'
      ],
      lesson: 'Multiple stacked losses prevent bucket recovery; grief therapy plus time tap address.'
    },
    {
      id: 'sn9_15',
      title: 'My bucket and trauma anniversary',
      narrative: [
        'Annual trauma date.',
        '',
        'Predictable inflow.',
        '',
        'Plan around date.',
        '',
        'Reduce other inflow.',
        '',
        'I tell anniversary-stricken: plan.'
      ],
      lesson: 'Annual trauma anniversaries create predictable inflow; plan to reduce other inflow during.'
    }
  ];

  var STRESS_NARRATIVES_10 = [
    {
      id: 'sn10_1',
      title: 'My bucket recovered after time off',
      narrative: [
        'Week vacation.',
        '',
        'Bucket drained.',
        '',
        'Returned with capacity.',
        '',
        'I tell never-vacationing: time off restores.'
      ],
      lesson: 'Time off restores bucket capacity; vacation provides bulk drainage time.'
    },
    {
      id: 'sn10_2',
      title: 'My bucket and sabbatical',
      narrative: [
        'Three month sabbatical.',
        '',
        'Deep bucket drain.',
        '',
        'Returned with structural changes.',
        '',
        'I tell long-stressed: sabbatical possible.'
      ],
      lesson: 'Sabbaticals provide deep bucket drain; return with structural changes to prevent re-overflow.'
    },
    {
      id: 'sn10_3',
      title: 'My bucket and retreat',
      narrative: [
        'Monthly weekend retreat.',
        '',
        'Solo silent retreat.',
        '',
        'Bucket reset.',
        '',
        'I tell tech-tethered: retreat reset.'
      ],
      lesson: 'Monthly weekend solo retreats reset bucket; silence and solitude provide deep drainage.'
    },
    {
      id: 'sn10_4',
      title: 'My bucket and meditation retreat',
      narrative: [
        'Weeklong silent retreat.',
        '',
        'Major bucket clearing.',
        '',
        'Effects last months.',
        '',
        'I tell stressed: silent retreat treatment.'
      ],
      lesson: 'Weeklong silent meditation retreats provide major bucket clearing; effects last months.'
    },
    {
      id: 'sn10_5',
      title: 'My bucket and yoga retreat',
      narrative: [
        'Yoga retreat reset.',
        '',
        'Body plus mind drain.',
        '',
        'Multiple taps daily.',
        '',
        'I tell stressed: yoga retreat reset.'
      ],
      lesson: 'Yoga retreats provide body-mind reset; multiple daily taps offer deep bucket drainage.'
    },
    {
      id: 'sn10_6',
      title: 'My bucket and writing retreat',
      narrative: [
        'Writing retreat.',
        '',
        'Creative tap deep.',
        '',
        'Bucket cleared through expression.',
        '',
        'I tell writer-stressed: retreat.'
      ],
      lesson: 'Writing retreats provide deep creative tap; expression clears accumulated stress.'
    },
    {
      id: 'sn10_7',
      title: 'My bucket and art retreat',
      narrative: [
        'Art making retreat.',
        '',
        'Hands and heart engaged.',
        '',
        'Bucket emptied.',
        '',
        'I tell creative-stressed: art retreat.'
      ],
      lesson: 'Art making retreats engage hands and heart; bucket emptied through creative absorption.'
    },
    {
      id: 'sn10_8',
      title: 'My bucket and hiking trip',
      narrative: [
        'Multi-day hike.',
        '',
        'Body engaged.',
        '',
        'Nature absorbing.',
        '',
        'No phone signal.',
        '',
        'I tell trail-curious: multi-day hike.'
      ],
      lesson: 'Multi-day hikes engage body in nature without signal; deep bucket reset.'
    },
    {
      id: 'sn10_9',
      title: 'My bucket and pilgrimage',
      narrative: [
        'Walked the Camino.',
        '',
        'Six weeks.',
        '',
        'Daily walking.',
        '',
        'Bucket transformed.',
        '',
        'I tell life-stressed: pilgrimage.'
      ],
      lesson: 'Pilgrimage like Camino provides weeks of daily walking; bucket transformed through extended practice.'
    },
    {
      id: 'sn10_10',
      title: 'My bucket and wilderness trip',
      narrative: [
        'Wilderness solo trip.',
        '',
        'No service.',
        '',
        'Body and mind reset.',
        '',
        'I tell tech-tethered: wilderness reset.'
      ],
      lesson: 'Wilderness solo trips without service reset body and mind; deep bucket clearing.'
    },
    {
      id: 'sn10_11',
      title: 'My bucket and travel',
      narrative: [
        'Two week trip abroad.',
        '',
        'Different routines.',
        '',
        'Bucket reset.',
        '',
        'I tell routine-stuck: travel reset.'
      ],
      lesson: 'Extended travel disrupts routines; bucket resets through new experiences and patterns.'
    },
    {
      id: 'sn10_12',
      title: 'My bucket and visiting nature',
      narrative: [
        'Annual mountain visit.',
        '',
        'Cabin getaway.',
        '',
        'Bucket drained.',
        '',
        'I tell urban-stressed: nature getaway.'
      ],
      lesson: 'Annual mountain or cabin getaways provide nature-based bucket drainage.'
    },
    {
      id: 'sn10_13',
      title: 'My bucket and ocean visit',
      narrative: [
        'Beach trip.',
        '',
        'Ocean sounds.',
        '',
        'Vast perspective.',
        '',
        'Bucket drained.',
        '',
        'I tell inland-stressed: ocean visit.'
      ],
      lesson: 'Beach trips provide ocean sounds and vast perspective; bucket drained by water presence.'
    },
    {
      id: 'sn10_14',
      title: 'My bucket and family vacation',
      narrative: [
        'Annual family vacation.',
        '',
        'Time together.',
        '',
        'Routines paused.',
        '',
        'I tell family-stressed: vacation together.'
      ],
      lesson: 'Annual family vacations pause routines; bucket drains through together-time and break.'
    },
    {
      id: 'sn10_15',
      title: 'My bucket and solo trip',
      narrative: [
        'Annual solo trip.',
        '',
        'My choices only.',
        '',
        'Bucket fully drained.',
        '',
        'I tell others-focused: solo trip.'
      ],
      lesson: 'Annual solo trips drain bucket through autonomy; only own choices for protected time.'
    }
  ];

  var STRESS_NARRATIVES_1 = [
    {
      id: 'sn1_1',
      title: 'My bucket overflowed at work',
      narrative: [
        'Three deadlines that week.',
        '',
        'Plus sick kid at home.',
        '',
        'Plus argument with partner.',
        '',
        'Bucket overflowed Friday.',
        '',
        'Cried at work bathroom.',
        '',
        'Realized I had not opened any taps.',
        '',
        'No exercise.',
        '',
        'No sleep.',
        '',
        'No support.',
        '',
        'I tell new bucket users: track inflow AND outflow.'
      ],
      lesson: 'Bucket overflow happens when inflow exceeds outflow; both sides need attention.'
    },
    {
      id: 'sn1_2',
      title: 'My structural stressors I cannot drain',
      narrative: [
        'Bucket model has limits.',
        '',
        'Cannot drain poverty by breathing.',
        '',
        'Cannot drain racism by yoga.',
        '',
        'Cannot drain healthcare costs by meditation.',
        '',
        'Therapist named this honestly.',
        '',
        'Structural stressors need structural response.',
        '',
        'Coping helps personal load.',
        '',
        'But systemic load needs systemic change.',
        '',
        'I tell oppressed individuals: your coping is real but not sufficient.'
      ],
      lesson: 'Structural stressors require structural responses; personal coping helps but does not resolve systemic load.'
    },
    {
      id: 'sn1_3',
      title: 'My morning walk is my best tap',
      narrative: [
        'Daily 30 min walk.',
        '',
        'Same time every morning.',
        '',
        'Drains my bucket reliably.',
        '',
        'Therapist taught: same tap every day.',
        '',
        'Predictable drainage.',
        '',
        'I tell stressed: find your most reliable tap.'
      ],
      lesson: 'Reliable daily taps drain bucket predictably; consistency over intensity.'
    },
    {
      id: 'sn1_4',
      title: 'My bucket capacity changes by season',
      narrative: [
        'Winter capacity smaller.',
        '',
        'Cold, dark, holidays.',
        '',
        'Summer capacity larger.',
        '',
        'Light, warmth, slower pace.',
        '',
        'Therapist taught seasonal awareness.',
        '',
        'I tell bucket-users: capacity shifts with seasons.'
      ],
      lesson: 'Bucket capacity changes seasonally; awareness lets us plan inflow accordingly.'
    },
    {
      id: 'sn1_5',
      title: 'My stressors I can name now',
      narrative: [
        'Could not name what stressed me.',
        '',
        'Therapist taught inventory.',
        '',
        'Listed each stressor.',
        '',
        'Weighed each one.',
        '',
        'Light, medium, heavy, crushing.',
        '',
        'Now I see my bucket clearly.',
        '',
        'I tell bucket-curious: inventory first.'
      ],
      lesson: 'Stress inventory makes invisible visible; naming weighs each stressor.'
    },
    {
      id: 'sn1_6',
      title: 'My taps I forgot existed',
      narrative: [
        'Listed coping tools I used to use.',
        '',
        'Reading.',
        '',
        'Calling mom.',
        '',
        'Drawing.',
        '',
        'Forgot about them.',
        '',
        'Therapist: what worked before will work again.',
        '',
        'Reopened old taps.',
        '',
        'Bucket drained.',
        '',
        'I tell stuck: revisit old coping.'
      ],
      lesson: 'Old coping tools that worked before usually work again; revisit them.'
    },
    {
      id: 'sn1_7',
      title: 'My bucket overflowed and I learned the signs',
      narrative: [
        'Sleep changes first.',
        '',
        'Then mood.',
        '',
        'Then body.',
        '',
        'Then behavior.',
        '',
        'My overflow pattern.',
        '',
        'Catching it earlier each cycle.',
        '',
        'I tell bucket-users: know your overflow signs.'
      ],
      lesson: 'Each person has overflow pattern; knowing signs enables earlier intervention.'
    },
    {
      id: 'sn1_8',
      title: 'My single tap could not drain everything',
      narrative: [
        'Used only exercise.',
        '',
        'Worked for a while.',
        '',
        'Then bucket overflowed anyway.',
        '',
        'Therapist: need multiple taps.',
        '',
        'Body tap, mind tap, connection tap.',
        '',
        'I tell single-coping: diversify taps.'
      ],
      lesson: 'Single coping tools insufficient; diversified taps across body, mind, connection.'
    },
    {
      id: 'sn1_9',
      title: 'My bucket and my partners bucket together',
      narrative: [
        'We share home and life.',
        '',
        'Our buckets affect each other.',
        '',
        'When mine overflows, hers fills.',
        '',
        'Couples therapy taught mutual bucket care.',
        '',
        'I tell partnered: bucket awareness is dyadic.'
      ],
      lesson: 'Partner buckets affect each other; mutual bucket care strengthens both.'
    },
    {
      id: 'sn1_10',
      title: 'My bucket and my children buckets',
      narrative: [
        'Parents bucket fills with everyones overflow.',
        '',
        'Plus own stressors.',
        '',
        'Children buckets unmonitored.',
        '',
        'Family bucket conversations.',
        '',
        'Each tracks own.',
        '',
        'Helps family system.',
        '',
        'I tell parents: family bucket awareness.'
      ],
      lesson: 'Family bucket awareness with each tracking own helps family system management.'
    },
    {
      id: 'sn1_11',
      title: 'My work bucket vs personal bucket',
      narrative: [
        'Therapist: same bucket actually.',
        '',
        'Work inflow plus personal inflow.',
        '',
        'Same total capacity.',
        '',
        'Cannot separate buckets.',
        '',
        'Whole life one bucket.',
        '',
        'I tell compartmentalizers: one bucket only.'
      ],
      lesson: 'Work and personal stress fill same bucket; cannot truly compartmentalize.'
    },
    {
      id: 'sn1_12',
      title: 'My bucket overflow caused physical symptoms',
      narrative: [
        'Migraines started.',
        '',
        'Doctor ruled out medical.',
        '',
        'Therapist named stress overflow.',
        '',
        'Body holds what mind cannot.',
        '',
        'Bucket overflow somatic.',
        '',
        'I tell symptomatic-stressed: body holds overflow.'
      ],
      lesson: 'Physical symptoms can be bucket overflow; body holds what mind cannot.'
    },
    {
      id: 'sn1_13',
      title: 'My bucket overflow caused anger',
      narrative: [
        'Snapped at family.',
        '',
        'Did not understand why.',
        '',
        'Therapist named overflow as anger.',
        '',
        'Anger is one face.',
        '',
        'Of overflowing bucket.',
        '',
        'I tell angry-stressed: anger may be overflow.'
      ],
      lesson: 'Anger toward family can be bucket overflow expressing through irritability.'
    },
    {
      id: 'sn1_14',
      title: 'My bucket overflow caused withdrawal',
      narrative: [
        'Stopped calling friends.',
        '',
        'Did not realize.',
        '',
        'Therapist named withdrawal.',
        '',
        'Overflow as social withdrawal.',
        '',
        'I tell withdrawing-stressed: this may be overflow.'
      ],
      lesson: 'Social withdrawal can be bucket overflow; one face of overwhelmed state.'
    },
    {
      id: 'sn1_15',
      title: 'My bucket overflow led to therapy',
      narrative: [
        'Crisis forced help.',
        '',
        'Therapy began.',
        '',
        'Learned bucket model.',
        '',
        'Tools emerged.',
        '',
        'Slowly bucket manageable.',
        '',
        'I tell crisis-driven: therapy teaches bucket tools.'
      ],
      lesson: 'Crisis-driven entry to therapy teaches bucket tools that enable ongoing management.'
    }
  ];

  var STRESS_NARRATIVES_2 = [
    {
      id: 'sn2_1',
      title: 'My daily inventory practice',
      narrative: [
        'Morning bucket check.',
        '',
        'What is in bucket today?',
        '',
        'What weight each?',
        '',
        'What taps available?',
        '',
        'Daily 5 min review.',
        '',
        'Bucket awareness habituated.',
        '',
        'I tell bucket-curious: daily inventory.'
      ],
      lesson: 'Daily morning bucket inventory builds awareness habit through 5-minute review.'
    },
    {
      id: 'sn2_2',
      title: 'My evening tap practice',
      narrative: [
        'Evening tap ritual.',
        '',
        'Open one tap before bed.',
        '',
        'Reading, bath, breath.',
        '',
        'Drains daily inflow.',
        '',
        'Sleep restoration.',
        '',
        'I tell evening-stressed: drain before bed.'
      ],
      lesson: 'Evening tap ritual drains daily inflow before bed; sleep restoration follows.'
    },
    {
      id: 'sn2_3',
      title: 'My weekly bucket review',
      narrative: [
        'Sunday evening bucket review.',
        '',
        'Past week stressors.',
        '',
        'Past week taps used.',
        '',
        'Coming week stressors anticipated.',
        '',
        'Coming week taps planned.',
        '',
        'Weekly rhythm.',
        '',
        'I tell organized-bucket users: weekly review.'
      ],
      lesson: 'Weekly bucket reviews on Sunday evenings build organized stress management rhythm.'
    },
    {
      id: 'sn2_4',
      title: 'My biggest stressor I named honestly',
      narrative: [
        'Avoided naming it.',
        '',
        'Job I hated.',
        '',
        'Therapist asked plainly.',
        '',
        'Job is your biggest stressor.',
        '',
        'Yes.',
        '',
        'Naming opened action.',
        '',
        'I tell avoidant-stressed: naming opens action.'
      ],
      lesson: 'Honestly naming biggest stressor opens path to systemic action beyond coping.'
    },
    {
      id: 'sn2_5',
      title: 'My structural stressor I had to leave',
      narrative: [
        'Job toxic.',
        '',
        'No bucket draining could fix.',
        '',
        'Structural change needed.',
        '',
        'Quit despite financial fear.',
        '',
        'Bucket smaller after.',
        '',
        'I tell structurally-stressed: change is treatment.'
      ],
      lesson: 'Sometimes leaving structural stressor is the only treatment; coping cannot fix toxic environment.'
    },
    {
      id: 'sn2_6',
      title: 'My financial stressor I budgeted',
      narrative: [
        'Money stress chronic.',
        '',
        'Financial counselor helped.',
        '',
        'Budget plus emergency fund.',
        '',
        'Stressor reduced through action.',
        '',
        'Bucket lighter.',
        '',
        'I tell money-stressed: action reduces inflow.'
      ],
      lesson: 'Financial action reduces money stress inflow; budgeting and emergency funds drain proactively.'
    },
    {
      id: 'sn2_7',
      title: 'My health stressor I addressed',
      narrative: [
        'Chronic illness diagnosis.',
        '',
        'Stressor I could not remove.',
        '',
        'Therapist helped reframe.',
        '',
        'Living with not against.',
        '',
        'Stressor reduced through relationship.',
        '',
        'I tell chronically ill: relationship reframe.'
      ],
      lesson: 'Chronic illness as living-with not living-against reduces internal struggle weight.'
    },
    {
      id: 'sn2_8',
      title: 'My relationship stressor I worked on',
      narrative: [
        'Partner relationship stressor.',
        '',
        'Couples therapy.',
        '',
        'Communication improved.',
        '',
        'Stressor reduced through action.',
        '',
        'Bucket lighter.',
        '',
        'I tell relationship-stressed: action helps.'
      ],
      lesson: 'Relationship stress reduces through couples therapy action; communication shifts decrease inflow.'
    },
    {
      id: 'sn2_9',
      title: 'My parental stressor I shared',
      narrative: [
        'Parenting stress alone.',
        '',
        'Joined parent group.',
        '',
        'Shared load.',
        '',
        'Stressor weight lifted.',
        '',
        'Community helps.',
        '',
        'I tell parenting-stressed: community lifts.'
      ],
      lesson: 'Parenting stress shared in community lifts weight through shared experience.'
    },
    {
      id: 'sn2_10',
      title: 'My commute stressor I changed',
      narrative: [
        'Long commute stress daily.',
        '',
        'Moved closer to work.',
        '',
        'Or changed work to remote.',
        '',
        'Major stressor removed.',
        '',
        'Bucket significantly lighter.',
        '',
        'I tell commute-stressed: structural change.'
      ],
      lesson: 'Long commute structural stressor often removable through moving or remote work.'
    },
    {
      id: 'sn2_11',
      title: 'My caregiver stressor I bucketed',
      narrative: [
        'Caring for elderly mom.',
        '',
        'Major bucket inflow.',
        '',
        'Caregiver therapy.',
        '',
        'Plus respite care.',
        '',
        'Bucket manageable.',
        '',
        'I tell caregivers: therapy plus respite.'
      ],
      lesson: 'Caregiver stress requires therapy plus respite to make bucket manageable.'
    },
    {
      id: 'sn2_12',
      title: 'My school stressor I planned',
      narrative: [
        'College plus job stress.',
        '',
        'Therapist helped plan.',
        '',
        'Calendar capacity.',
        '',
        'Reduced class load.',
        '',
        'Bucket realistic.',
        '',
        'I tell college-stressed: realistic planning.'
      ],
      lesson: 'School stress responds to realistic capacity planning; reduce load to match bucket size.'
    },
    {
      id: 'sn2_13',
      title: 'My grief stressor I gave time',
      narrative: [
        'Loss as bucket inflow.',
        '',
        'Grief therapy.',
        '',
        'Time as draining tap.',
        '',
        'Gradually less inflow.',
        '',
        'Years to integrate.',
        '',
        'I tell grieving: time is tap.'
      ],
      lesson: 'Grief as bucket inflow drained by time tap; gradual integration over years.'
    },
    {
      id: 'sn2_14',
      title: 'My health crisis stressor I survived',
      narrative: [
        'Cancer diagnosis.',
        '',
        'Massive bucket inflow.',
        '',
        'Treatment plus therapy.',
        '',
        'Plus support group.',
        '',
        'Multiple taps opened.',
        '',
        'Survived.',
        '',
        'I tell crisis-stressed: multiple taps essential.'
      ],
      lesson: 'Health crises require multiple simultaneous taps; treatment plus therapy plus community.'
    },
    {
      id: 'sn2_15',
      title: 'My bucket awareness saved my marriage',
      narrative: [
        'Stress overflowed onto partner.',
        '',
        'Therapy taught bucket model.',
        '',
        'Now I name when full.',
        '',
        'Partner understands.',
        '',
        'Marriage stronger.',
        '',
        'I tell partners: bucket vocabulary saves.'
      ],
      lesson: 'Bucket vocabulary saves relationships; naming full bucket replaces angry overflow.'
    }
  ];

  var STRESS_NARRATIVES_3 = [
    {
      id: 'sn3_1',
      title: 'My morning meditation drains my bucket',
      narrative: [
        'Daily 20 min meditation.',
        '',
        'Mind tap.',
        '',
        'Drains overnight inflow.',
        '',
        'Starts day with capacity.',
        '',
        'I tell meditation-curious: morning drain.'
      ],
      lesson: 'Morning meditation drains overnight bucket inflow; day starts with capacity.'
    },
    {
      id: 'sn3_2',
      title: 'My running drains body tension',
      narrative: [
        'Daily 30 min run.',
        '',
        'Body tap.',
        '',
        'Stress sweats out.',
        '',
        'Bucket drains through movement.',
        '',
        'I tell sedentary-stressed: movement tap.'
      ],
      lesson: 'Running provides body tap that drains stress through movement; sedentary lifestyle lets bucket fill.'
    },
    {
      id: 'sn3_3',
      title: 'My talking friend drains my bucket',
      narrative: [
        'Weekly call with best friend.',
        '',
        'Connection tap.',
        '',
        'Talk through stressors.',
        '',
        'Bucket drains through hearing.',
        '',
        'I tell isolated-stressed: connection tap.'
      ],
      lesson: 'Weekly friend calls provide connection tap; talking through stressors drains bucket.'
    },
    {
      id: 'sn3_4',
      title: 'My garden drains my bucket',
      narrative: [
        'Daily garden time.',
        '',
        'Hands in soil.',
        '',
        'Body and mind both drain.',
        '',
        'Earth contact tap.',
        '',
        'I tell stressed: gardening drains.'
      ],
      lesson: 'Gardening provides combined body-mind tap; earth contact drains accumulated stress.'
    },
    {
      id: 'sn3_5',
      title: 'My journal drains my bucket',
      narrative: [
        'Evening journal practice.',
        '',
        'Day stressors named.',
        '',
        'Written out.',
        '',
        'Externalized through paper.',
        '',
        'I tell ruminating-stressed: paper drains.'
      ],
      lesson: 'Evening journaling externalizes day stressors onto paper; rumination drains through writing.'
    },
    {
      id: 'sn3_6',
      title: 'My therapy session weekly drain',
      narrative: [
        'Weekly therapy 50 min.',
        '',
        'Deep bucket drain.',
        '',
        'Major weekly tap.',
        '',
        'Drains what daily cannot.',
        '',
        'I tell therapy-curious: weekly deep drain.'
      ],
      lesson: 'Weekly therapy provides major bucket drain; deeper than daily taps can reach.'
    },
    {
      id: 'sn3_7',
      title: 'My weekend rest drains my bucket',
      narrative: [
        'Saturday off work.',
        '',
        'Sunday slow.',
        '',
        'Both rest days.',
        '',
        'Bucket drains weekly.',
        '',
        'I tell weekend-workers: rest is tap.'
      ],
      lesson: 'Weekend rest provides weekly bucket drain; protect both days for full restoration.'
    },
    {
      id: 'sn3_8',
      title: 'My creativity drains my bucket',
      narrative: [
        'Weekly art practice.',
        '',
        'Painting, music, writing.',
        '',
        'Creative tap.',
        '',
        'Expression drains.',
        '',
        'I tell creative-curious: art is tap.'
      ],
      lesson: 'Creative practice provides expression tap; making art drains stress through externalization.'
    },
    {
      id: 'sn3_9',
      title: 'My nature time drains my bucket',
      narrative: [
        'Weekly hike.',
        '',
        'Forest bathing.',
        '',
        'Nature tap.',
        '',
        'Body and mind drain together.',
        '',
        'I tell urban-stressed: nature tap.'
      ],
      lesson: 'Weekly nature time provides combined body-mind drain through forest bathing.'
    },
    {
      id: 'sn3_10',
      title: 'My family connection drains my bucket',
      narrative: [
        'Family dinner weekly.',
        '',
        'Connection tap.',
        '',
        'Belonging drains stress.',
        '',
        'I tell isolated-stressed: family connection.'
      ],
      lesson: 'Weekly family dinners provide belonging tap; connection drains stress through ritual.'
    },
    {
      id: 'sn3_11',
      title: 'My faith practice drains my bucket',
      narrative: [
        'Daily prayer.',
        '',
        'Weekly service.',
        '',
        'Faith tap.',
        '',
        'Spiritual drainage.',
        '',
        'I tell faith-curious: prayer drains.'
      ],
      lesson: 'Daily prayer and weekly service provide faith tap; spiritual practice drains stress.'
    },
    {
      id: 'sn3_12',
      title: 'My pet time drains my bucket',
      narrative: [
        'Daily dog walks.',
        '',
        'Petting cat.',
        '',
        'Animal tap.',
        '',
        'Presence drains stress.',
        '',
        'I tell pet-owners: animal time tap.'
      ],
      lesson: 'Pet time provides presence tap; animal companionship drains stress through grounding.'
    },
    {
      id: 'sn3_13',
      title: 'My music drains my bucket',
      narrative: [
        'Daily music listening.',
        '',
        'Sometimes playing.',
        '',
        'Music tap.',
        '',
        'Body and mind both drain.',
        '',
        'I tell music-curious: music tap.'
      ],
      lesson: 'Daily music provides combined body-mind tap; listening and playing both drain stress.'
    },
    {
      id: 'sn3_14',
      title: 'My reading drains my bucket',
      narrative: [
        'Daily reading hour.',
        '',
        'Fiction transports.',
        '',
        'Mind tap.',
        '',
        'Drains rumination.',
        '',
        'I tell book-lovers: reading drains.'
      ],
      lesson: 'Daily reading provides mind tap; fiction transports and drains rumination through absorption.'
    },
    {
      id: 'sn3_15',
      title: 'My bath drains my bucket',
      narrative: [
        'Weekly bath ritual.',
        '',
        'Body tap.',
        '',
        'Warmth and time drain.',
        '',
        'I tell stressed: bath ritual.'
      ],
      lesson: 'Weekly bath rituals provide body tap; warmth and protected time drain accumulated stress.'
    }
  ];

  window.SelHub.registerTool('stressBucket', {
    icon: '🪣',
    label: 'Stress Bucket',
    desc: 'A visual capacity model. Stressors pour into a bucket; coping practices drain it. When inflow exceeds outflow, the bucket overflows. Useful for seeing whether your current stressors and taps are balanced. CBT-tradition tool (Brabban and Turkington 2002), widely used in NHS IAPT and Mind UK. NOT a claim that all stress is individually removable.',
    color: 'teal',
    category: 'self-regulation',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _sbkT = (ctx && ctx.theme) || {};
      var _sbkHC = !!_sbkT.isContrast, _sbkL = !_sbkHC && !_sbkT.isDark;
      var _sbk_BGL = {'#0b1220':'#f1f5f9','#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _sbk_BGH = {'#0b1220':'#000000','#0f172a':'#000000','#1e293b':'#000000','#fb7185':'#000000','#7c3aed':'#000000','#ef4444':'#000000','#fff':'#000000','#dc2626':'#000000'};
      var _sbk_FGL = {'#cbd5e1':'#334155','#5eead4':'#0f766e','#94a3b8':'#64748b','#99f6e4':'#0f766e','#fecaca':'#b91c1c','#fca5a5':'#991b1b','#e2e8f0':'#1e293b','#a78bfa':'#6d28d9','#fde68a':'#92400e','#c4b5fd':'#5b21b6','#e9d5ff':'#581c87','#fcd34d':'#78350f'}, _sbk_FGH = {'#cbd5e1':'#ffff00','#5eead4':'#ffff00','#94a3b8':'#ffff00','#99f6e4':'#ffff00','#fff':'#ffff00','#fecaca':'#ffff00','#fca5a5':'#ffff00','#fed7aa':'#ffff00','#fb7185':'#ffff00','#e2e8f0':'#ffff00','#a78bfa':'#ffff00','#64748b':'#ffff00','#fde68a':'#ffff00','#c4b5fd':'#ffff00','#e9d5ff':'#ffff00','#fcd34d':'#ffff00','#0f172a':'#ffff00','#475569':'#ffff00'};
      var _sbk_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _sbk_BDH = {'#334155':'#ffff00','#ef4444':'#ffff00','#1e293b':'#ffff00','#fb7185':'#ffff00','#a78bfa':'#ffff00','#475569':'#ffff00','#14b8a6':'#ffff00','#f59e0b':'#ffff00','#cbd5e1':'#ffff00','#0d9488':'#ffff00'};
      var _sbkBg = function(h){ return _sbkHC ? (_sbk_BGH[h]||h) : (_sbkL ? (_sbk_BGL[h]||h) : h); };
      var _sbkFg = function(h){ return _sbkHC ? (_sbk_FGH[h]||h) : (_sbkL ? (_sbk_FGL[h]||h) : h); };
      var _sbkBd = function(h){ return _sbkHC ? (_sbk_BDH[h]||h) : (_sbkL ? (_sbk_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.stressBucket || defaultState();
      function setSB(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.stressBucket) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.stressors || patch.taps || patch.overflowSigns) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { stressBucket: next });
        });
      }
      var view = d.view || 'bucket';
      function goto(v) { setSB({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _sbkFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _sbkFg('#5eead4'), fontSize: 22, fontWeight: 900 } }, '🪣 Stress Bucket'),
            h('div', { style: { fontSize: 12, color: _sbkFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'A visual of what is filling your bucket and what is draining it.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'bucket', label: 'My Bucket', icon: '🪣' },
          { id: 'edit', label: 'Edit', icon: '✏️' },
          { id: 'reflect', label: 'Reflect', icon: '💭' },
          { id: 'print', label: 'Print view', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Stress Bucket sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#14b8a6' : '#334155'),
                background: active ? 'rgba(20,184,166,0.18)' : _sbkBg('#1e293b'),
                color: active ? _sbkFg('#99f6e4') : _sbkFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: _sbkFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'The bucket model is one way to see your capacity. It does not say every stressor is yours to fix; some inflows are structural and require structural responses. If your bucket is consistently overflowing, that is worth bringing to a counselor. Crisis Text Line: text HOME to 741741.'
        );
      }

      function totalInflow() {
        return (d.stressors || []).reduce(function(sum, s) { return sum + (s.weight || 0); }, 0);
      }
      function totalOutflow() {
        return (d.taps || []).reduce(function(sum, t) { return sum + (t.capacity || 0); }, 0);
      }
      function bucketFill() {
        var net = totalInflow() - totalOutflow();
        // Clamp 0-100 percentage
        return Math.max(0, Math.min(100, net * 8));
      }

      // ═══════════════════════════════════════════════════════════
      // BUCKET — SVG visualization
      // ═══════════════════════════════════════════════════════════
      function renderBucket() {
        var stressors = d.stressors || [];
        var taps = d.taps || [];
        var overflow = d.overflowSigns || [];
        var inflow = totalInflow();
        var outflow = totalOutflow();
        var net = inflow - outflow;
        var fill = bucketFill();
        var overflowing = fill >= 100;

        if (stressors.length === 0 && taps.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 28, borderRadius: 14, background: 'linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(20,184,166,0.4)', textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 56, marginBottom: 8 } }, '🪣'),
              h('h3', { style: { margin: '0 0 8px', color: _sbkFg('#99f6e4'), fontSize: 18 } }, 'Your bucket is empty'),
              h('p', { style: { margin: '0 0 14px', color: _sbkFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.65 } },
                'Add what is currently pouring INTO your bucket (stressors) and what is draining it OUT (the practices, people, and time that help). The visual will show whether you are net-filling or net-draining.'),
              h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Start filling my bucket',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: _sbkFg('#fff'), fontWeight: 800, fontSize: 14 } },
                '+ Start filling my bucket')
            ),
            h('div', {
              style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.12)', borderLeft: '3px solid #ef4444', marginTop: 14, fontSize: 12, color: _sbkFg('#fecaca'), lineHeight: 1.65 } },
              h('div', { style: { fontWeight: 800, marginBottom: 4, color: _sbkFg('#fca5a5') } }, '🩺 When the bucket model isn\'t enough'),
              h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: _sbkFg('#fed7aa') } },
                h('li', null, 'Distress lasting most of the day, most days, for 2+ weeks'),
                h('li', null, 'Coping strategies that used to work no longer do'),
                h('li', null, 'Functioning declining at school, work, or in relationships'),
                h('li', null, 'Thoughts of self-harm or suicide — 988 (call/text) or text HOME to 741741 right now'),
                h('li', null, 'Substance use you can\'t stop'),
                h('li', null, 'Talk to a school counselor, therapist, or doctor — this tool supports care, not replaces it')
              )
            ),
            softPointer()
          );
        }

        // SVG bucket
        var bucketW = 220, bucketH = 280;
        var bucketX = 200, bucketY = 100;
        // Fill rectangle inside the bucket
        var fillH = (fill / 100) * (bucketH - 30);
        var fillY = bucketY + (bucketH - fillH) - 10;
        var fillColor = overflowing ? _sbkBg('#ef4444') : (fill > 70 ? '#f97316' : (fill > 40 ? '#facc15' : '#14b8a6'));

        // Accessibility description, computed from live data
        var svgDesc = 'Stress bucket showing capacity at ' + Math.round(fill) + ' percent. ' +
          'Inflow total: ' + inflow + ' from ' + stressors.length + ' stressor' + (stressors.length === 1 ? '' : 's') + '. ' +
          'Outflow total: ' + outflow + ' from ' + taps.length + ' tap' + (taps.length === 1 ? '' : 's') + '. ' +
          (overflowing ? 'The bucket is overflowing.' :
            (net > 5 ? 'Filling faster than draining.' :
              (net > 0 ? 'Slightly more in than out.' :
                (net === 0 ? 'Roughly balanced.' : 'Draining faster than filling.'))));

        return h('div', null,
          // Summary line
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: overflowing ? 'rgba(239,68,68,0.15)' : '#0f172a', border: '1px solid ' + (overflowing ? _sbkBg('#ef4444') : _sbkBg('#1e293b')), marginBottom: 12, flexWrap: 'wrap' } },
            h('div', { style: { flex: 1, minWidth: 200 } },
              h('div', { style: { fontSize: 12, color: _sbkFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Right now'),
              h('div', { style: { fontSize: 16, color: overflowing ? _sbkFg('#fca5a5') : _sbkFg('#e2e8f0'), fontWeight: 800 } },
                overflowing ? '⚠️ Your bucket is overflowing' :
                  (net > 5 ? 'Your bucket is filling faster than it is draining' :
                    (net > 0 ? 'Slightly more in than out right now' :
                      (net === 0 ? 'Roughly balanced today' : 'Draining faster than filling'))))
            ),
            h('div', { style: { fontSize: 12, color: _sbkFg('#94a3b8'), textAlign: 'right' } },
              h('div', null, 'Inflow: ' + inflow),
              h('div', null, 'Outflow: ' + outflow)
            )
          ),

          // SVG bucket
          h('div', { style: { padding: 10, borderRadius: 12, background: _sbkBg('#0b1220'), border: '1px solid #1e293b', marginBottom: 12, overflowX: 'auto', textAlign: 'center' } },
            h('svg', { width: '100%', viewBox: '0 0 620 480', style: { maxWidth: 620 }, 'aria-labelledby': 'stressbucket-svg-title stressbucket-svg-desc', role: 'img' },
              h('title', { id: 'stressbucket-svg-title' }, 'Stress Bucket visualization'),
              h('desc', { id: 'stressbucket-svg-desc' }, svgDesc),
              // Stressor inflows (top, pouring in)
              stressors.slice(0, 8).map(function(s, i) {
                var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                var x = 230 + (i % 4) * 40;
                var y = 30 + Math.floor(i / 4) * 30;
                return h('g', { key: 's_' + i },
                  h('text', { x: x, y: y, textAnchor: 'middle', fontSize: 18, fill: w.color }, '💧'),
                  h('line', { x1: x, y1: y + 6, x2: x, y2: 95, stroke: w.color, strokeWidth: w.value * 1.2, strokeDasharray: '2 4', opacity: 0.7 })
                );
              }),

              // Bucket outline
              h('path', {
                d: 'M ' + bucketX + ' ' + bucketY +
                   ' L ' + (bucketX + bucketW) + ' ' + bucketY +
                   ' L ' + (bucketX + bucketW - 20) + ' ' + (bucketY + bucketH) +
                   ' L ' + (bucketX + 20) + ' ' + (bucketY + bucketH) +
                   ' Z',
                fill: _sbkBg('#1e293b'), stroke: _sbkFg('#5eead4'), strokeWidth: 3
              }),

              // Fill
              fill > 0 ? h('rect', {
                x: bucketX + 24, y: fillY,
                width: bucketW - 48, height: fillH,
                fill: fillColor, opacity: 0.75,
                clipPath: 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)'
              }) : null,

              // Overflow drips
              overflowing ? h('g', null,
                h('text', { x: bucketX + 30, y: bucketY - 10, fontSize: 22 }, '💧'),
                h('text', { x: bucketX + bucketW - 50, y: bucketY - 10, fontSize: 22 }, '💧'),
                h('text', { x: bucketX + bucketW / 2 - 10, y: bucketY - 14, fontSize: 24 }, '💧')
              ) : null,

              // Bucket label
              h('text', { x: bucketX + bucketW / 2, y: bucketY + bucketH / 2, textAnchor: 'middle', fontSize: 12, fill: '#0f172a', style: { fontWeight: 800 } },
                Math.round(fill) + '%'),

              // Taps (right side, draining out)
              taps.slice(0, 4).map(function(t, i) {
                var tapY = bucketY + 40 + i * 50;
                var capW = (t.capacity || 1) * 2;
                return h('g', { key: 't_' + i },
                  h('rect', { x: bucketX + bucketW - 8, y: tapY, width: 30, height: 10, fill: _sbkFg('#a78bfa') }),
                  h('rect', { x: bucketX + bucketW + 22, y: tapY - 4, width: 8, height: 18, fill: _sbkFg('#a78bfa') }),
                  h('line', { x1: bucketX + bucketW + 26, y1: tapY + 14, x2: bucketX + bucketW + 26, y2: tapY + 50, stroke: _sbkFg('#a78bfa'), strokeWidth: capW, opacity: 0.7, strokeDasharray: '2 3' }),
                  h('text', { x: bucketX + bucketW + 35, y: tapY + 6, fontSize: 11, fill: _sbkFg('#a78bfa'), style: { fontWeight: 700 } }, (t.label || '').slice(0, 18))
                );
              }),

              // Title labels
              h('text', { x: bucketX + bucketW / 2, y: 18, textAnchor: 'middle', fontSize: 12, fill: '#fb7185', style: { fontWeight: 800 } }, 'Stressors pour in'),
              h('text', { x: bucketX + bucketW + 80, y: bucketY + 30, textAnchor: 'middle', fontSize: 12, fill: _sbkFg('#a78bfa'), style: { fontWeight: 800 } }, 'Taps drain')
            )
          ),

          // Text-equivalent (accessible to all users; WCAG 1.1.1)
          h('details', { style: { marginBottom: 12 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, color: _sbkFg('#5eead4'), fontWeight: 700, padding: '6px 10px', borderRadius: 6, background: _sbkBg('#0f172a'), border: '1px solid #1e293b' } }, '🔤 Read this bucket as text'),
            h('div', { style: { marginTop: 6, padding: 12, borderRadius: 8, background: _sbkBg('#0f172a'), border: '1px solid #1e293b' } },
              h('p', { style: { margin: '0 0 8px', color: _sbkFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } }, svgDesc),
              stressors.length > 0 ? h('div', { style: { marginBottom: 8 } },
                h('div', { style: { fontSize: 12, color: _sbkFg('#fb7185'), fontWeight: 700, marginBottom: 4 } }, '💧 Stressors flowing in'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _sbkFg('#e2e8f0'), fontSize: 12.5, lineHeight: 1.6 } },
                  stressors.map(function(s, i) {
                    var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                    return h('li', { key: i }, s.label + ' (' + w.label + ', weight ' + s.weight + ')');
                  })
                )
              ) : null,
              taps.length > 0 ? h('div', null,
                h('div', { style: { fontSize: 12, color: _sbkFg('#a78bfa'), fontWeight: 700, marginBottom: 4 } }, '🛟 Taps draining'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _sbkFg('#e2e8f0'), fontSize: 12.5, lineHeight: 1.6 } },
                  taps.map(function(t, i) {
                    var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                    return h('li', { key: i }, t.label + ' (' + c.label + ', capacity ' + t.capacity + ')');
                  })
                )
              ) : null
            )
          ),

          // Lists
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 12 } },
            h('div', { style: { padding: 12, borderRadius: 10, background: _sbkBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _sbkFg('#fb7185'), marginBottom: 8 } }, '💧 Inflow ' + '(' + inflow + ')'),
              stressors.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 16px', color: _sbkFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.65 } },
                    stressors.map(function(s, i) {
                      var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                      return h('li', { key: i }, s.label, h('span', { style: { color: w.color, marginLeft: 6 } }, '(' + w.label + ')'));
                    }))
                : h('div', { style: { fontSize: 11, color: _sbkFg('#64748b'), fontStyle: 'italic' } }, '(none added)')
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: _sbkBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a78bfa' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _sbkFg('#a78bfa'), marginBottom: 8 } }, '🛟 Outflow ' + '(' + outflow + ')'),
              taps.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 16px', color: _sbkFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.65 } },
                    taps.map(function(t, i) {
                      var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                      return h('li', { key: i }, t.label, h('span', { style: { color: _sbkFg('#a78bfa'), marginLeft: 6 } }, '(' + c.label + ')'));
                    }))
                : h('div', { style: { fontSize: 11, color: _sbkFg('#64748b'), fontStyle: 'italic' } }, '(none added)')
            )
          ),

          overflow.length > 0 && overflowing ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _sbkFg('#fca5a5'), marginBottom: 6 } }, '⚠️ How my overflow shows up'),
            h('div', { style: { fontSize: 12.5, color: _sbkFg('#fecaca'), lineHeight: 1.65 } }, overflow.join('  ·  '))
          ) : null,

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('edit'); }, 'aria-label': 'Edit bucket',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: _sbkFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '✏️ Edit'),
            h('button', { onClick: function() { goto('reflect'); }, 'aria-label': 'Reflect',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: _sbkBg('#1e293b'), color: _sbkFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '💭 Reflect'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: _sbkBg('#1e293b'), color: _sbkFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          // Escalation callout — naming the bucket is useful, but some buckets need more than self-help
          h('div', {
            style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.12)', borderLeft: '3px solid #ef4444', marginTop: 14, fontSize: 12, color: _sbkFg('#fecaca'), lineHeight: 1.65 } },
            h('div', { style: { fontWeight: 800, marginBottom: 4, color: _sbkFg('#fca5a5') } }, '🩺 When the bucket model isn\'t enough'),
            h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: _sbkFg('#fed7aa') } },
              h('li', null, 'Distress lasting most of the day, most days, for 2+ weeks'),
              h('li', null, 'Coping strategies that used to work no longer do'),
              h('li', null, 'Functioning declining at school, work, or in relationships'),
              h('li', null, 'Thoughts of self-harm or suicide — 988 (call/text) or text HOME to 741741 right now'),
              h('li', null, 'Substance use you can\'t stop'),
              h('li', null, 'Talk to a school counselor, therapist, or doctor — this tool supports care, not replaces it')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // EDIT
      // ═══════════════════════════════════════════════════════════
      function renderEdit() {
        function addStressor() {
          var lbl = document.getElementById('sb-stressor-input');
          var w = document.getElementById('sb-stressor-weight');
          if (!lbl || !lbl.value.trim()) return;
          var entry = { label: lbl.value.trim(), weight: parseInt(w ? w.value : '2', 10) };
          setSB({ stressors: (d.stressors || []).concat([entry]) });
          lbl.value = '';
        }
        function addTap() {
          var lbl = document.getElementById('sb-tap-input');
          var c = document.getElementById('sb-tap-capacity');
          if (!lbl || !lbl.value.trim()) return;
          var entry = { label: lbl.value.trim(), capacity: parseInt(c ? c.value : '2', 10) };
          setSB({ taps: (d.taps || []).concat([entry]) });
          lbl.value = '';
        }
        function addOverflow(value) {
          if (!value || !value.trim()) return;
          var current = (d.overflowSigns || []).slice();
          if (current.indexOf(value.trim()) === -1) current.push(value.trim());
          setSB({ overflowSigns: current });
        }
        function addOverflowFromInput() {
          var el = document.getElementById('sb-overflow-input');
          if (!el) return;
          addOverflow(el.value);
          el.value = '';
        }
        function removeStressor(i) {
          var nx = (d.stressors || []).slice();
          nx.splice(i, 1);
          setSB({ stressors: nx });
        }
        function removeTap(i) {
          var nx = (d.taps || []).slice();
          nx.splice(i, 1);
          setSB({ taps: nx });
        }
        function removeOverflow(i) {
          var nx = (d.overflowSigns || []).slice();
          nx.splice(i, 1);
          setSB({ overflowSigns: nx });
        }

        return h('div', null,
          // Stressors
          h('div', { style: { padding: 14, borderRadius: 10, background: _sbkBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _sbkFg('#fb7185'), marginBottom: 8 } }, '💧 Stressors pouring INTO my bucket'),
            (d.stressors || []).length > 0 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 } },
              (d.stressors || []).map(function(s, i) {
                var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, background: _sbkBg('#1e293b') } },
                  h('span', { style: { width: 50, fontSize: 11, color: w.color, fontWeight: 700, textTransform: 'uppercase' } }, w.label),
                  h('span', { style: { flex: 1, fontSize: 13, color: _sbkFg('#e2e8f0') } }, s.label),
                  h('button', { onClick: function() { removeStressor(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: '1px solid #475569', color: _sbkFg('#94a3b8'), borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                );
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sb-stressor-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add stressor'),
              h('input', { id: 'sb-stressor-input', type: 'text', placeholder: 'A stressor...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addStressor(); } },
                style: { flex: 2, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _sbkBg('#1e293b'), color: _sbkFg('#e2e8f0'), fontSize: 13 } }),
              h('select', { id: 'sb-stressor-weight', defaultValue: '2',
                style: { padding: 8, borderRadius: 6, border: '1px solid #334155', background: _sbkBg('#1e293b'), color: _sbkFg('#e2e8f0'), fontSize: 13 } },
                WEIGHTS.map(function(w) { return h('option', { key: w.value, value: w.value }, w.label); })),
              h('button', { onClick: addStressor, 'aria-label': 'Add stressor',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _sbkBg('#fb7185'), color: _sbkFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _sbkFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                STRESSOR_STARTERS.map(function(s, si) {
                  return h('button', { key: si, onClick: function() { setSB({ stressors: (d.stressors || []).concat([{ label: s, weight: 2 }]) }); }, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #fb718566', background: 'rgba(15,23,42,0.6)', color: _sbkFg('#cbd5e1'), cursor: 'pointer', fontSize: 11 } }, '+ ' + s);
                })
              )
            )
          ),

          // Taps
          h('div', { style: { padding: 14, borderRadius: 10, background: _sbkBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a78bfa', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _sbkFg('#a78bfa'), marginBottom: 8 } }, '🛟 Taps draining my bucket'),
            (d.taps || []).length > 0 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 } },
              (d.taps || []).map(function(t, i) {
                var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, background: _sbkBg('#1e293b') } },
                  h('span', { style: { width: 80, fontSize: 11, color: _sbkFg('#a78bfa'), fontWeight: 700, textTransform: 'uppercase' } }, c.label),
                  h('span', { style: { flex: 1, fontSize: 13, color: _sbkFg('#e2e8f0') } }, t.label),
                  h('button', { onClick: function() { removeTap(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: '1px solid #475569', color: _sbkFg('#94a3b8'), borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                );
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sb-tap-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add tap'),
              h('input', { id: 'sb-tap-input', type: 'text', placeholder: 'A practice or person that drains the bucket...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addTap(); } },
                style: { flex: 2, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _sbkBg('#1e293b'), color: _sbkFg('#e2e8f0'), fontSize: 13 } }),
              h('select', { id: 'sb-tap-capacity', defaultValue: '2',
                style: { padding: 8, borderRadius: 6, border: '1px solid #334155', background: _sbkBg('#1e293b'), color: _sbkFg('#e2e8f0'), fontSize: 13 } },
                CAPACITIES.map(function(c) { return h('option', { key: c.value, value: c.value }, c.label); })),
              h('button', { onClick: addTap, 'aria-label': 'Add tap',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _sbkBg('#7c3aed'), color: _sbkFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _sbkFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                TAP_STARTERS.map(function(s, si) {
                  return h('button', { key: si, onClick: function() { setSB({ taps: (d.taps || []).concat([{ label: s, capacity: 2 }]) }); }, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #a78bfa66', background: 'rgba(15,23,42,0.6)', color: _sbkFg('#cbd5e1'), cursor: 'pointer', fontSize: 11 } }, '+ ' + s);
                })
              )
            )
          ),

          // Overflow signs
          h('div', { style: { padding: 14, borderRadius: 10, background: _sbkBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _sbkFg('#fca5a5'), marginBottom: 6 } }, '⚠️ How overflow shows up in me'),
            h('div', { style: { fontSize: 11.5, color: _sbkFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 } }, 'These are the early signs that your bucket is overflowing, so you can catch it earlier next time.'),
            (d.overflowSigns || []).length > 0
              ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
                  d.overflowSigns.map(function(s, i) {
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: _sbkBg('#1e293b'), border: '1px solid rgba(239,68,68,0.4)', fontSize: 12, color: _sbkFg('#fecaca') } },
                      h('span', null, s),
                      h('button', { onClick: function() { removeOverflow(i); }, 'aria-label': 'Remove',
                        style: { background: 'transparent', border: 'none', color: _sbkFg('#94a3b8'), cursor: 'pointer', fontSize: 11 } }, '✕')
                    );
                  })
                )
              : null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sb-overflow-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add overflow sign'),
              h('input', { id: 'sb-overflow-input', type: 'text', placeholder: 'How does overflow show up in YOU?',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addOverflowFromInput(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _sbkBg('#1e293b'), color: _sbkFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: addOverflowFromInput, 'aria-label': 'Add overflow sign',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _sbkBg('#ef4444'), color: _sbkFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _sbkFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                OVERFLOW_STARTERS.map(function(s, si) {
                  var already = (d.overflowSigns || []).indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addOverflow(s); }, disabled: already, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.5)', background: already ? _sbkBg('#1e293b') : 'rgba(15,23,42,0.6)', color: already ? _sbkFg('#64748b') : _sbkFg('#cbd5e1'), cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        var stressors = d.stressors || [];
        var taps = d.taps || [];
        var inflow = totalInflow();
        var outflow = totalOutflow();
        var crushing = stressors.filter(function(s) { return s.weight === 4; });
        var heavy = stressors.filter(function(s) { return s.weight === 3; });
        var bigTaps = taps.filter(function(t) { return t.capacity === 3; });

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(20,184,166,0.08)', borderTop: '1px solid rgba(20,184,166,0.3)', borderRight: '1px solid rgba(20,184,166,0.3)', borderBottom: '1px solid rgba(20,184,166,0.3)', borderLeft: '3px solid #14b8a6', marginBottom: 14, fontSize: 13, color: _sbkFg('#99f6e4'), lineHeight: 1.65 } },
            h('strong', null, '💭 The bucket model is descriptive, not prescriptive. '),
            'It does not say "drain your bucket better." It says "see clearly what is in there, and decide what is yours to act on."'
          ),

          inflow > outflow + 5 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: _sbkFg('#fca5a5'), fontWeight: 800, marginBottom: 6 } }, '⚠️ Inflow is significantly higher than outflow'),
            h('p', { style: { margin: 0, color: _sbkFg('#fecaca'), fontSize: 13, lineHeight: 1.65 } },
              'Your inflow is ' + inflow + ' and your outflow is ' + outflow + '. That is the kind of imbalance that runs people down over time. Two questions worth sitting with: (1) Is there a stressor on the inflow list that an adult could actually help reduce? (a workload, a conflict, a financial thing.) (2) Is there a tap you used to use that has fallen out of your week, that you could bring back?'
            )
          ) : null,

          crushing.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: _sbkFg('#fca5a5'), fontWeight: 800, marginBottom: 6 } }, '🔴 Crushing-weight stressors'),
            h('p', { style: { margin: '0 0 6px', color: _sbkFg('#fecaca'), fontSize: 13, lineHeight: 1.65 } },
              'You marked ' + crushing.length + ' stressor' + (crushing.length === 1 ? '' : 's') + ' as crushing-weight: ' + crushing.map(function(s) { return s.label; }).join('; ') + '.'),
            h('p', { style: { margin: 0, color: _sbkFg('#fde68a'), fontSize: 12.5, lineHeight: 1.65, fontStyle: 'italic' } },
              'A crushing-weight stressor is the kind that does not get solved by adding more taps. It usually needs an adult on it with you (counselor, parent, mentor, school psych). If you have not told anyone about a crushing-weight stressor, that is the most useful single move.')
          ) : null,

          taps.length === 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.3)', borderRight: '1px solid rgba(167,139,250,0.3)', borderBottom: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: _sbkFg('#c4b5fd'), fontWeight: 800, marginBottom: 6 } }, '💭 No taps listed'),
            h('p', { style: { margin: 0, color: _sbkFg('#e9d5ff'), fontSize: 13, lineHeight: 1.65 } },
              'You have not added anything to the outflow side. Sometimes that is because you do not have any practices that help; sometimes it is because they do not feel "big enough" to count. They count. A 10-minute walk counts. Texting one friend counts. Watching one episode of a show that makes you feel like yourself counts. Add what is actually there.')
          ) : null,

          bigTaps.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: _sbkFg('#c4b5fd'), fontWeight: 800, marginBottom: 6 } }, '🛟 Your biggest taps'),
            h('p', { style: { margin: 0, color: _sbkFg('#e9d5ff'), fontSize: 13, lineHeight: 1.65 } },
              'These are doing the most work for you right now: ' + bigTaps.map(function(t) { return t.label; }).join('; ') + '. Worth noticing. If one of these is taken away (e.g. a sport season ends, a friend moves), you will probably need to find a new big tap, not just hope.')
          ) : null,

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: _sbkFg('#fcd34d'), fontWeight: 800, marginBottom: 6 } }, '⚖️ Honest reflection question'),
            h('p', { style: { margin: 0, color: _sbkFg('#fde68a'), fontSize: 13, lineHeight: 1.65 } },
              'Looking at your inflow side: which of those stressors is yours to act on, and which is structural? Structural stressors (a school policy, a family situation, a financial reality) are not your fault to "cope better" with. The bucket model is honest about this; if a structural stressor is pouring in at a heavy rate, the only real fix is at the source, not at your taps.'
            )
          ),

          // Escalation callout — reflecting is a useful step, but some buckets need more than self-help
          h('div', {
            style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.12)', borderLeft: '3px solid #ef4444', marginBottom: 10, fontSize: 12, color: _sbkFg('#fecaca'), lineHeight: 1.65 } },
            h('div', { style: { fontWeight: 800, marginBottom: 4, color: _sbkFg('#fca5a5') } }, '🩺 When reflecting isn\'t enough'),
            h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: _sbkFg('#fed7aa') } },
              h('li', null, 'Distress lasting most of the day, most days, for 2+ weeks'),
              h('li', null, 'Coping strategies that used to work no longer do'),
              h('li', null, 'Functioning declining at school, work, or in relationships'),
              h('li', null, 'Thoughts of self-harm or suicide — 988 (call/text) or text HOME to 741741 right now'),
              h('li', null, 'Substance use you can\'t stop'),
              h('li', null, 'Talk to a school counselor, therapist, or doctor — this tool supports care, not replaces it')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var stressors = d.stressors || [];
        var taps = d.taps || [];
        var overflow = d.overflowSigns || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(20,184,166,0.10)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _sbkFg('#99f6e4'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', color: _sbkFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('bucket'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: _sbkBg('#1e293b'), color: _sbkFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'stressbucket-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _sbkBg('#fff'), color: _sbkFg('#0f172a'), borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#stressbucket-print-region, #stressbucket-print-region * { visibility: visible !important; } ' +
              '#stressbucket-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #0d9488' } },
              h('div', { style: { fontSize: 10, color: _sbkFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Stress Bucket'),
              h('h1', { style: { margin: 0, fontSize: 28, fontWeight: 900 } }, 'My Stress Bucket'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _sbkFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null,
              h('div', { style: { fontSize: 12, color: _sbkFg('#475569'), marginTop: 4 } }, 'Inflow total: ' + totalInflow() + '  ·  Outflow total: ' + totalOutflow())
            ),

            // Stressors
            h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _sbkBg('#fb7185'), color: _sbkFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Stressors (inflow)'),
              stressors.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _sbkFg('#0f172a'), fontSize: 13, lineHeight: 1.65 } },
                    stressors.map(function(s, i) {
                      var w = WEIGHTS.find(function(w) { return w.value === s.weight; }) || WEIGHTS[1];
                      return h('li', { key: i }, s.label + '  (' + w.label + ')');
                    }))
                : h('div', { style: { fontSize: 11, color: _sbkFg('#94a3b8'), fontStyle: 'italic' } }, '(none added)')
            ),

            // Taps
            h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _sbkBg('#7c3aed'), color: _sbkFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Taps (outflow)'),
              taps.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _sbkFg('#0f172a'), fontSize: 13, lineHeight: 1.65 } },
                    taps.map(function(t, i) {
                      var c = CAPACITIES.find(function(c) { return c.value === t.capacity; }) || CAPACITIES[0];
                      return h('li', { key: i }, t.label + '  (' + c.label + ')');
                    }))
                : h('div', { style: { fontSize: 11, color: _sbkFg('#94a3b8'), fontStyle: 'italic' } }, '(none added)')
            ),

            // Overflow
            h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _sbkBg('#dc2626'), color: _sbkFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'How overflow shows up in me'),
              overflow.length > 0
                ? h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _sbkFg('#0f172a'), fontSize: 13, lineHeight: 1.65 } },
                    overflow.map(function(s, i) { return h('li', { key: i }, s); }))
                : h('div', { style: { fontSize: 11, color: _sbkFg('#94a3b8'), fontStyle: 'italic' } }, '(none added)')
            ),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _sbkFg('#94a3b8'), textAlign: 'center', lineHeight: 1.5 } },
              'Stress Bucket model from Brabban, A. and Turkington, D. (2002), adapted widely in NHS IAPT and Mind UK practice. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('stressBucket', h, ctx) : null),
          h('div', { style: { padding: 16, borderRadius: 12, background: _sbkBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _sbkFg('#5eead4'), fontSize: 16 } }, 'What the Stress Bucket is'),
            h('p', { style: { margin: '0 0 10px', color: _sbkFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'The Stress Bucket is a capacity model. You picture yourself carrying a bucket. Stressors pour in from the top, sized by how heavy each one is. Coping practices, supports, sleep, and time function as taps that drain the bucket out the side. When inflow exceeds outflow, the bucket overflows, and overflow shows up as the early-warning signs you already know about yourself (sleep changes, mood, body, behavior).'
            ),
            h('p', { style: { margin: 0, color: _sbkFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'The point of the visual is to see capacity clearly. Two students can be carrying the same workload and one is fine because the rest of their bucket is light; the other is overflowing because of what is happening at home. The bucket is not graded; it is a picture.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _sbkBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _sbkFg('#5eead4'), fontSize: 16 } }, 'Where the model comes from'),
            h('p', { style: { margin: 0, color: _sbkFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The Stress Bucket is part of the wider Cognitive Behavioral Therapy (CBT) tradition. The version most commonly used in mental-health education comes from Alison Brabban and Douglas Turkington (2002), originally developed for cognitive therapy of psychosis. The metaphor was adopted broadly by NHS Improving Access to Psychological Therapies (IAPT) self-help materials and by Mind UK as an accessible explanation of the relationship between stressors, coping resources, and symptom onset. The visual you are looking at is the same one used in many UK secondary schools and community mental-health services.'
            )
          ),

          // Sources
          h('div', { style: { padding: 16, borderRadius: 12, background: _sbkBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _sbkFg('#5eead4'), fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: _sbkFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for the Stress Bucket model.'),
            sourceCard('Brabban, A. and Turkington, D. (2002)', '"The Search for Meaning: Detecting Congruence Between Symptom Content and Personal Meaning in Psychosis," in A. Morrison (Ed.), A Casebook of Cognitive Therapy for Psychosis, Routledge', 'The clinical chapter where the Stress Bucket as taught today is presented in CBT for psychosis. Foundational publication.', null),
            sourceCard('Turkington, D., Kingdon, D., and Weiden, P. J. (2006)', '"Cognitive Behavior Therapy for Schizophrenia," American Journal of Psychiatry, 163(3), 365-373', 'Peer-reviewed overview of CBT for psychosis including the bucket model in clinical practice.', null),
            sourceCard('NHS Mental Health Self-Help', 'nhs.uk/mental-health/self-help', 'UK NHS resources, including the Stress Bucket framing in Improving Access to Psychological Therapies (IAPT) self-help materials.', 'https://www.nhs.uk/mental-health/self-help/'),
            sourceCard('Mind UK', 'mind.org.uk', 'UK mental-health charity; Stress Bucket adapted for accessible public-facing mental health education. Free resources.', 'https://www.mind.org.uk/')
          ),

          // Honest limits
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _sbkFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _sbkFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'The bucket model can be used to imply that all stress is individually drainable through better coping. It is not. Many inflows are structural: poverty, racism, ableism, housing instability, oppressive school environments, family violence. Adding more "taps" does not fix a structural inflow; the source has to change.'),
              h('li', null, 'The model is helpful for self-awareness and for naming overflow signs early. It is not a clinical diagnostic.'),
              h('li', null, 'The weight ratings (light/medium/heavy/crushing) and the capacity ratings (little drain/medium drain/big drain) are subjective. Two people in the same situation may weight the same stressor differently. Your weights are honest data; they are not measurements.'),
              h('li', null, 'If your bucket overflows constantly, that is information; it deserves a counselor or therapist on it with you, not just more taps.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(20,184,166,0.10)', borderTop: '1px solid rgba(20,184,166,0.3)', borderRight: '1px solid rgba(20,184,166,0.3)', borderBottom: '1px solid rgba(20,184,166,0.3)', borderLeft: '3px solid #14b8a6', fontSize: 12.5, color: _sbkFg('#99f6e4'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'The Stress Bucket pairs well with the Window of Tolerance: the Window is about real-time arousal, the Bucket is about accumulated load. A student whose bucket is overflowing is more likely to live outside their Window. The pair gives students two complementary self-knowledge tools without overcomplicating things.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _sbkBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _sbkFg('#5eead4'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _sbkFg('#99f6e4'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _sbkFg('#99f6e4'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _sbkFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'edit') body = renderEdit();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderBucket();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Stress Bucket' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
