// ═══════════════════════════════════════════════════════════════
// sel_tool_griefloss.js — Grief & Loss Companion
// A guided self-companion for adolescents experiencing loss:
// death of a person, death of a pet, friendship loss, family
// transitions (divorce, moving, parent deployment), loss of
// health, identity loss, ambiguous loss. NOT a clinical
// instrument; a structured space for naming what is being
// carried.
//
// Built on:
//   - Worden's Tasks of Mourning (1991, 2018 4th ed.) — the four
//     tasks framework, widely taught in grief counseling
//   - Stroebe & Schut Dual Process Model (1999) — oscillation
//     between loss-orientation and restoration-orientation
//   - Boss's framework of Ambiguous Loss (1999, 2006)
//   - Worden's adaptation for children and adolescents (2018)
//
// Safety: includes prominent guidance about when grief needs a
// clinician, and explicitly screens for thoughts of joining the
// deceased (referral to Crisis Companion / 988).
//
// Registered tool ID: "griefLoss"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('griefLoss'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-griefloss')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-griefloss';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Worden's 4 Tasks of Mourning (modernized phrasing)
  var TASKS = [
    {
      id: 'accept',
      number: 1,
      label: 'Accept the reality of the loss',
      icon: '👁️',
      color: '#6366f1',
      blurb: 'Not "be okay with" the loss. Accept that it has happened. The brain often holds onto disbelief ("they\'ll call later," "I\'ll see them at school") long after the cognitive knowing.',
      prompts: [
        'When did you first hear / understand what happened?',
        'Are there moments where you forget it has happened, and then remember?',
        'What rituals or moments have helped the reality settle in (a funeral, a service, a goodbye, a returned object)?'
      ],
      whatHelps: 'Saying it out loud. Going to the place. Looking at photos. Writing about it. Not rushing it.',
      whatHurts: 'Being told to "stay positive" or "they\'re in a better place" before you\'ve even let the loss land.'
    },
    {
      id: 'pain',
      number: 2,
      label: 'Process the pain of grief',
      icon: '🌊',
      color: '#0ea5e9',
      blurb: 'Grief is not a feeling; it\'s every feeling. Sadness, anger, guilt, relief, anxiety, numbness, longing, sometimes love so intense it hurts. ALL of these are normal. The work is to let them through, not to push them away.',
      prompts: [
        'What emotions have you been feeling? Even the ones you think you "shouldn\'t" be feeling?',
        'Where in your body do you feel the grief?',
        'Are there feelings you\'re afraid of (anger at the deceased, relief, jealousy)? These are normal in grief; they don\'t mean you didn\'t love them.'
      ],
      whatHelps: 'Letting yourself cry. Talking with someone who can hear hard feelings. Movement (walking, sports). Creative work (art, music, writing). Hard physical activity when you\'re angry. Soft activities when you\'re tender.',
      whatHurts: 'Suppression. "I should be over this by now." Substance use as the main coping. Being alone all the time.'
    },
    {
      id: 'adjust',
      number: 3,
      label: 'Adjust to a world without them',
      icon: '🌅',
      color: '#22c55e',
      blurb: 'The world is genuinely different now. Some of the adjustments are practical (who do I sit with at lunch?), some are emotional (who do I turn to when I\'m scared?), and some are about identity (who am I without them?).',
      prompts: [
        'What practical things have changed in your day-to-day?',
        'What role did the person play in your life that you now have to fill or replace differently?',
        'Has anything about who you ARE shifted since the loss?'
      ],
      whatHelps: 'Naming the specific role they played. Letting the role be filled in a new way over time, not all at once. New routines. New skills you didn\'t know you needed.',
      whatHurts: 'Rushing to fill the gap (a new partner, a new pet, a new project right away). Some gap needs to be felt before it gets filled.'
    },
    {
      id: 'connect',
      number: 4,
      label: 'Find an enduring connection while moving forward',
      icon: '🕯️',
      color: '#f59e0b',
      blurb: 'You don\'t leave the dead behind; you carry them differently. The task is finding the place for them in your life now — usually a place that\'s smaller in time but enduring. You move forward AND you stay connected. Both.',
      prompts: [
        'What about them do you want to carry forward?',
        'What rituals or moments would you want to keep — an annual visit, wearing something of theirs, telling stories on their birthday?',
        'How do you imagine your relationship with them, over time?'
      ],
      whatHelps: 'Anniversary rituals (visits to a grave, a meal they loved, a story session). Carrying an object. Letters you don\'t send. Doing something they would have valued. Telling their stories to people who didn\'t know them.',
      whatHurts: 'Either extreme: pretending they never existed, OR keeping them so present that you can\'t move forward.'
    }
  ];

  // Types of losses (so students know what counts)
  var LOSS_TYPES = [
    { id: 'death_person', label: 'Death of a person', desc: 'Family member, friend, mentor, classmate.' },
    { id: 'death_pet', label: 'Death of a pet', desc: 'Real grief, often dismissed by others. It counts.' },
    { id: 'family_change', label: 'Family change', desc: 'Parents divorcing, a parent moving away, a sibling leaving, a parent in prison or deployed.' },
    { id: 'friendship', label: 'Loss of a friendship', desc: 'A close friendship ending, a friend group changing, a best friend moving away.' },
    { id: 'health', label: 'Loss of health', desc: 'A new diagnosis, an injury, a change in what your body can do.' },
    { id: 'identity', label: 'Loss tied to identity', desc: 'Coming out and family rejection. A culture or language fading. A community changing.' },
    { id: 'place', label: 'Loss of a place', desc: 'Moving away, losing a home (fire, eviction, financial), losing a community.' },
    { id: 'role', label: 'Loss of a role', desc: 'Caregiving role ending, leaving a team, a relationship ending where you were "the one who".' },
    { id: 'future', label: 'Loss of an imagined future', desc: 'The life you thought you\'d have. Plans that changed. Dreams that have to be different now.' },
    { id: 'ambiguous', label: 'Ambiguous loss', desc: 'Loss without closure: a missing person, a parent with dementia, a friend who has changed beyond recognition, anyone "there but not there."' }
  ];

  function defaultState() {
    return {
      view: 'home',
      loss: '',                  // what is being grieved (free text)
      lossType: '',              // category
      whoOrWhat: '',             // name (private)
      taskNotes: {},             // taskId -> reflection text
      currentTask: null,         // which task is in focus
      letter: '',                // a letter to the lost (or about the loss)
      ritualPlan: '',            // anniversary / ritual ideas
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // ── Extended Grief & Loss Narrative Library ──

  var GRIEF_NARRATIVES_83 = [
    {
      id: 'gn83_1',
      title: 'My grief sustains the bond',
      narrative: [
        'Bond sustained.',
        '',
        'Through grief practice.',
        '',
        'Continuing love.',
        '',
        'I tell long-grievers: sustained.'
      ],
      lesson: 'Long-term grief sustains the bond with deceased through ongoing practice.'
    },
    {
      id: 'gn83_2',
      title: 'My grief is the doorway home',
      narrative: [
        'Each grief moment.',
        '',
        'Door to home.',
        '',
        'Home is love.',
        '',
        'I tell long-grievers: home.'
      ],
      lesson: 'Long-term grief is doorway home to love each moment.'
    },
    {
      id: 'gn83_3',
      title: 'My grief is the path of devotion',
      narrative: [
        'Devotion path.',
        '',
        'Through grief.',
        '',
        'To love continuing.',
        '',
        'I tell long-grievers: path.'
      ],
      lesson: 'Long-term grief is devotion path through suffering to love continuing.'
    },
    {
      id: 'gn83_4',
      title: 'My grief is the bond renewing',
      narrative: [
        'Each remembering.',
        '',
        'Renews bond.',
        '',
        'Continuing.',
        '',
        'I tell long-grievers: renewing.'
      ],
      lesson: 'Long-term grief renews bond each remembering; continuing presence.'
    },
    {
      id: 'gn83_5',
      title: 'My grief is the song of love',
      narrative: [
        'Song unending.',
        '',
        'Of love.',
        '',
        'Through grief.',
        '',
        'I tell long-grievers: song.'
      ],
      lesson: 'Long-term grief is unending song of love through suffering.'
    },
    {
      id: 'gn83_6',
      title: 'My grief is the presence enduring',
      narrative: [
        'Presence endures.',
        '',
        'Beyond physical.',
        '',
        'Through love.',
        '',
        'I tell long-grievers: endures.'
      ],
      lesson: 'Long-term grief reveals presence enduring beyond physical through love.'
    },
    {
      id: 'gn83_7',
      title: 'My grief is the witness',
      narrative: [
        'Witness to love.',
        '',
        'Witness to loss.',
        '',
        'Stand witness.',
        '',
        'I tell long-grievers: witness.'
      ],
      lesson: 'Long-term grief makes us witness to love and loss; standing witness for self and others.'
    },
    {
      id: 'gn83_8',
      title: 'My final word: I loved deeply',
      narrative: [
        'Grief proves love.',
        '',
        'I loved deeply.',
        '',
        'Loved enough to grieve.',
        '',
        'I tell all grievers: love proved.'
      ],
      lesson: 'Long-term grief proves we loved deeply; deep love produces deep grief in proof.'
    },
    {
      id: 'gn83_9',
      title: 'My grief is the sacred space held',
      narrative: [
        'Hold sacred space.',
        '',
        'For the deceased.',
        '',
        'Within my heart.',
        '',
        'I tell long-grievers: sacred.'
      ],
      lesson: 'Long-term grief holds sacred space for deceased within heart.'
    },
    {
      id: 'gn83_10',
      title: 'My grief is my freedom to love',
      narrative: [
        'Free to love.',
        '',
        'Knowing loss possible.',
        '',
        'Love anyway.',
        '',
        'I tell long-grievers: free to love.'
      ],
      lesson: 'Long-term grief frees us to love knowing loss possible; love anyway.'
    },
    {
      id: 'gn83_11',
      title: 'My final word: I will love and grieve again',
      narrative: [
        'Love continues.',
        '',
        'Grief continues.',
        '',
        'Both lifelong.',
        '',
        'I tell all grievers: both.'
      ],
      lesson: 'Long-term truth: love and grief continue lifelong through future loves and losses.'
    }
  ];

  var GRIEF_NARRATIVES_82 = [
    {
      id: 'gn82_1',
      title: 'My grief is my deepest love',
      narrative: [
        'Loss measures love.',
        '',
        'Deepest love shows in grief.',
        '',
        'I tell long-grievers: depth.'
      ],
      lesson: 'Long-term grief measures deepest love through suffering depth.'
    },
    {
      id: 'gn82_2',
      title: 'My grief is my continuing relationship',
      narrative: [
        'Conversation continues.',
        '',
        'Internal dialogue.',
        '',
        'Ongoing relationship.',
        '',
        'I tell long-grievers: relationship.'
      ],
      lesson: 'Long-term grief is continuing relationship through internal conversation.'
    },
    {
      id: 'gn82_3',
      title: 'My grief is my honest face to world',
      narrative: [
        'No more pretense.',
        '',
        'Real face shown.',
        '',
        'I tell long-grievers: honest.'
      ],
      lesson: 'Long-term grief brings honest face to world; no more pretense.'
    },
    {
      id: 'gn82_4',
      title: 'My grief is the love continuing',
      narrative: [
        'Love continues.',
        '',
        'In new form.',
        '',
        'Always.',
        '',
        'I tell all grievers: continuing.'
      ],
      lesson: 'Long-term grief is love continuing in new form always.'
    },
    {
      id: 'gn82_5',
      title: 'My grief is my devotion',
      narrative: [
        'Devotion practice.',
        '',
        'To memory.',
        '',
        'To love.',
        '',
        'I tell long-grievers: devotion.'
      ],
      lesson: 'Long-term grief is devotion practice to memory and love.'
    },
    {
      id: 'gn82_6',
      title: 'My grief is my service',
      narrative: [
        'Service to others.',
        '',
        'Suffering taught.',
        '',
        'Help grievers.',
        '',
        'I tell long-grievers: service.'
      ],
      lesson: 'Long-term grief becomes service to other grievers through suffering taught.'
    },
    {
      id: 'gn82_7',
      title: 'My grief is my deepest truth',
      narrative: [
        'Cannot hide.',
        '',
        'Truth of love and loss.',
        '',
        'Honest.',
        '',
        'I tell long-grievers: truth.'
      ],
      lesson: 'Long-term grief reveals deepest truth of love and loss; honest living.'
    },
    {
      id: 'gn82_8',
      title: 'My grief is my belonging',
      narrative: [
        'Belong to grievers.',
        '',
        'Universal community.',
        '',
        'All who lost.',
        '',
        'I tell long-grievers: belong.'
      ],
      lesson: 'Long-term grief brings belonging to universal community of all who have loved and lost.'
    },
    {
      id: 'gn82_9',
      title: 'My grief is my prayer',
      narrative: [
        'Wordless prayer.',
        '',
        'Heart toward sacred.',
        '',
        'Daily practice.',
        '',
        'I tell faithful-grievers: prayer.'
      ],
      lesson: 'Long-term grief is wordless prayer with heart turned toward sacred daily.'
    },
    {
      id: 'gn82_10',
      title: 'My final word: love continues forever',
      narrative: [
        'Love does not end.',
        '',
        'Continues in grief.',
        '',
        'Continues in memory.',
        '',
        'Continues in service.',
        '',
        'Continues forever.',
        '',
        'I tell all grievers: love continues forever.'
      ],
      lesson: 'Final grief word: love continues forever through grief, memory, service.'
    }
  ];

  var GRIEF_NARRATIVES_81 = [
    {
      id: 'gn81_1',
      title: 'My grief is a daily practice now',
      narrative: [
        'Each morning acknowledge.',
        '',
        'Each day choose tools.',
        '',
        'Each evening rest.',
        '',
        'Daily grief practice.',
        '',
        'I tell long-grievers: daily.'
      ],
      lesson: 'Long-term grief becomes daily practice; morning, day, evening tools.'
    },
    {
      id: 'gn81_2',
      title: 'My grief is the bond unbroken',
      narrative: [
        'Bond continues.',
        '',
        'Death did not break it.',
        '',
        'Continuing presence.',
        '',
        'I tell long-grievers: unbroken.'
      ],
      lesson: 'Long-term grief reveals bond unbroken; death changes form but continues bond.'
    },
    {
      id: 'gn81_3',
      title: 'My grief is the path home',
      narrative: [
        'Each grief moment.',
        '',
        'Brings me home.',
        '',
        'To love.',
        '',
        'I tell long-grievers: home.'
      ],
      lesson: 'Long-term grief is path home to love; each grief moment brings return.'
    },
    {
      id: 'gn81_4',
      title: 'My grief is the love kept alive',
      narrative: [
        'Keep love alive.',
        '',
        'Through grief.',
        '',
        'Continuing presence.',
        '',
        'I tell long-grievers: alive.'
      ],
      lesson: 'Long-term grief keeps love alive; continuing presence through honoring.'
    },
    {
      id: 'gn81_5',
      title: 'My grief is the ongoing relationship',
      narrative: [
        'Relationship continues.',
        '',
        'In new form.',
        '',
        'Internal conversation.',
        '',
        'I tell long-grievers: relationship.'
      ],
      lesson: 'Long-term grief is ongoing relationship; conversation continues internally.'
    },
    {
      id: 'gn81_6',
      title: 'My grief is the witness to love',
      narrative: [
        'Loss witnesses love.',
        '',
        'Grief shows depth.',
        '',
        'Witness continues.',
        '',
        'I tell long-grievers: witness.'
      ],
      lesson: 'Long-term grief witnesses love that was; grief shows depth of loving.'
    },
    {
      id: 'gn81_7',
      title: 'My grief is the silence held',
      narrative: [
        'Silence after.',
        '',
        'Hold the absence.',
        '',
        'Sacred silence.',
        '',
        'I tell long-grievers: silence.'
      ],
      lesson: 'Long-term grief holds silence as sacred; absence honored through quiet.'
    },
    {
      id: 'gn81_8',
      title: 'My grief is the place where love lives',
      narrative: [
        'Love lives in grief.',
        '',
        'Place of continuing.',
        '',
        'Home for love.',
        '',
        'I tell long-grievers: place.'
      ],
      lesson: 'Long-term grief is place where love lives; home for continuing love.'
    },
    {
      id: 'gn81_9',
      title: 'My grief is the river of memory',
      narrative: [
        'Flows through me.',
        '',
        'River of memory.',
        '',
        'Always present.',
        '',
        'I tell long-grievers: river.'
      ],
      lesson: 'Long-term grief is river of memory flowing through always present.'
    },
    {
      id: 'gn81_10',
      title: 'My grief is the tide returning',
      narrative: [
        'Tides come and go.',
        '',
        'Grief tides.',
        '',
        'Predictable rhythm.',
        '',
        'I tell long-grievers: tides.'
      ],
      lesson: 'Long-term grief comes in tides; predictable rhythm of returning waves.'
    },
    {
      id: 'gn81_11',
      title: 'My grief is the song unending',
      narrative: [
        'Song of love.',
        '',
        'Continues unending.',
        '',
        'Through grief.',
        '',
        'I tell long-grievers: song.'
      ],
      lesson: 'Long-term grief is unending song of love; continues through loss.'
    },
    {
      id: 'gn81_12',
      title: 'My grief is the door to depth',
      narrative: [
        'Door opens.',
        '',
        'To depth.',
        '',
        'Through suffering.',
        '',
        'I tell long-grievers: depth.'
      ],
      lesson: 'Long-term grief is door to depth; suffering opens depth of being.'
    },
    {
      id: 'gn81_13',
      title: 'My grief is the bond renewed',
      narrative: [
        'Each remembering.',
        '',
        'Renews the bond.',
        '',
        'Continuing.',
        '',
        'I tell long-grievers: renewed.'
      ],
      lesson: 'Long-term grief renews bond each remembering; continuing connection.'
    },
    {
      id: 'gn81_14',
      title: 'My grief is the love continuing',
      narrative: [
        'Love continues.',
        '',
        'Through grief.',
        '',
        'Always.',
        '',
        'I tell all grievers: continuing.'
      ],
      lesson: 'Long-term grief is love continuing; always through changing form.'
    },
    {
      id: 'gn81_15',
      title: 'My final word: grief is love continuing',
      narrative: [
        'Grief is love.',
        '',
        'Love continuing.',
        '',
        'Always.',
        '',
        'I tell all grievers: love continuing.'
      ],
      lesson: 'Final word: grief is love continuing always; love and grief one continuing reality.'
    }
  ];

  var GRIEF_NARRATIVES_77 = [
    {
      id: 'gn77_1',
      title: 'My grief led me to write a book',
      narrative: [
        'Wrote memoir of loss.',
        '',
        'Published it.',
        '',
        'Readers find me.',
        '',
        'Service through writing.',
        '',
        'I tell long-grievers: writing helps.'
      ],
      lesson: 'Writing books about long-term grief connects with other grievers and serves through publication.'
    },
    {
      id: 'gn77_2',
      title: 'My grief led me to start a foundation',
      narrative: [
        'Founded organization.',
        '',
        'In loved ones name.',
        '',
        'Help others.',
        '',
        'Long-term legacy.',
        '',
        'I tell long-grievers: foundation possible.'
      ],
      lesson: 'Starting foundations in deceased loved ones names creates long-term legacy and helps others.'
    },
    {
      id: 'gn77_3',
      title: 'My grief led me to advocacy work',
      narrative: [
        'Advocate for prevention.',
        '',
        'In loved ones name.',
        '',
        'Politics changed.',
        '',
        'I tell preventable-loss survivors: advocate.'
      ],
      lesson: 'Preventable loss survivors become advocates; loss shapes civic engagement.'
    },
    {
      id: 'gn77_4',
      title: 'My grief led me to community organizing',
      narrative: [
        'Organized grief group.',
        '',
        'For my community.',
        '',
        'No one was helping.',
        '',
        'So I did.',
        '',
        'I tell long-grievers: organize.'
      ],
      lesson: 'Long-term grievers can organize community grief groups when none exist; fill the gap.'
    },
    {
      id: 'gn77_5',
      title: 'My grief shaped my dissertation',
      narrative: [
        'Graduate research on grief.',
        '',
        'Personal experience.',
        '',
        'Academic legacy.',
        '',
        'I tell academic-grievers: research.'
      ],
      lesson: 'Long-term grief experience can shape academic research; personal becomes scholarly.'
    },
    {
      id: 'gn77_6',
      title: 'My grief connected me to my heritage',
      narrative: [
        'Lost grandmother.',
        '',
        'Took up her cultural traditions.',
        '',
        'Connected to roots.',
        '',
        'I tell heritage-grievers: roots strengthen.'
      ],
      lesson: 'Long-term grief can connect us to cultural heritage; roots strengthen through loss.'
    },
    {
      id: 'gn77_7',
      title: 'My grief led me to faith conversion',
      narrative: [
        'Searched after loss.',
        '',
        'Found new faith tradition.',
        '',
        'Belonging.',
        '',
        'I tell searching-grievers: faith finds.'
      ],
      lesson: 'Long-term grief can lead to faith finding; belonging emerges through search.'
    },
    {
      id: 'gn77_8',
      title: 'My grief led me to therapy career',
      narrative: [
        'Became therapist.',
        '',
        'Specialty in grief.',
        '',
        'Wounded healer.',
        '',
        'I tell career-shifting grievers: therapy.'
      ],
      lesson: 'Long-term grief experience shapes therapy careers; wounded healers serve.'
    },
    {
      id: 'gn77_9',
      title: 'My grief led me to social work',
      narrative: [
        'Became social worker.',
        '',
        'Serve families in crisis.',
        '',
        'Suffering taught me.',
        '',
        'I tell social-workers in mourning: service.'
      ],
      lesson: 'Long-term grief leads to social work careers; serving families in crisis from experience.'
    },
    {
      id: 'gn77_10',
      title: 'My grief led me to chaplaincy',
      narrative: [
        'Became hospice chaplain.',
        '',
        'Serve dying and grieving.',
        '',
        'Wounded healer.',
        '',
        'I tell faith-grievers: chaplaincy possible.'
      ],
      lesson: 'Long-term grief can shape chaplaincy careers; faith grievers serve dying and grieving.'
    },
    {
      id: 'gn77_11',
      title: 'My grief led me to grief blog',
      narrative: [
        'Started blog about loss.',
        '',
        'Readers from all over.',
        '',
        'Build community online.',
        '',
        'I tell writing-grievers: blog.'
      ],
      lesson: 'Long-term grievers blogs build online communities; writers find readers from all over.'
    },
    {
      id: 'gn77_12',
      title: 'My grief led me to teach',
      narrative: [
        'Teach about grief.',
        '',
        'College courses.',
        '',
        'Workshops.',
        '',
        'Service through teaching.',
        '',
        'I tell academic-grievers: teach.'
      ],
      lesson: 'Long-term grievers teach grief through college courses and workshops; service through teaching.'
    },
    {
      id: 'gn77_13',
      title: 'My grief led me to volunteer chaplaincy',
      narrative: [
        'Volunteer hospital chaplain.',
        '',
        'Visit dying.',
        '',
        'Sit with families.',
        '',
        'I tell faith-volunteers: chaplaincy.'
      ],
      lesson: 'Long-term grievers volunteer as hospital chaplains; visit dying and sit with families.'
    },
    {
      id: 'gn77_14',
      title: 'My grief led me to start support group',
      narrative: [
        'Started weekly grief group.',
        '',
        'Local community.',
        '',
        'Years of facilitation.',
        '',
        'I tell long-grievers: facilitate.'
      ],
      lesson: 'Long-term grievers start weekly groups in local communities; years of facilitation help many.'
    },
    {
      id: 'gn77_15',
      title: 'My grief is my gift to the world',
      narrative: [
        'Suffering became gift.',
        '',
        'Now offered to others.',
        '',
        'Generations served.',
        '',
        'I tell long-grievers: gift.'
      ],
      lesson: 'Long-term grief becomes gift offered to others; generations served through suffering transformed.'
    }
  ];

  var GRIEF_NARRATIVES_78 = [
    {
      id: 'gn78_1',
      title: 'My grief practice continues forever',
      narrative: [
        'Every day choose tools.',
        '',
        'Every week tend self.',
        '',
        'Every year refine.',
        '',
        'Grief practice never ends.',
        '',
        'I tell long-grievers: practice continues.'
      ],
      lesson: 'Long-term grief practice continues forever; daily, weekly, yearly tending sustains.'
    },
    {
      id: 'gn78_2',
      title: 'My grief is part of who I am',
      narrative: [
        'Cannot separate me from grief.',
        '',
        'Part of identity.',
        '',
        'Whole self.',
        '',
        'I tell long-grievers: integrated identity.'
      ],
      lesson: 'Long-term grief becomes integrated identity; cannot separate from whole self.'
    },
    {
      id: 'gn78_3',
      title: 'My grief is my deepest teacher',
      narrative: [
        'Suffering taught much.',
        '',
        'Deepest teacher.',
        '',
        'Still teaching.',
        '',
        'I tell long-grievers: teacher continues.'
      ],
      lesson: 'Long-term grief continues teaching; deepest teacher of love, loss, presence, meaning.'
    },
    {
      id: 'gn78_4',
      title: 'My grief connects me to ancestors',
      narrative: [
        'All ancestors knew loss.',
        '',
        'Continuing line of grievers.',
        '',
        'Ancestral connection.',
        '',
        'I tell long-grievers: ancestral.'
      ],
      lesson: 'Long-term grief connects to ancestral line of grievers; all who have come before knew loss.'
    },
    {
      id: 'gn78_5',
      title: 'My grief is the deepest love',
      narrative: [
        'Measures love.',
        '',
        'Deepest love shows in grief.',
        '',
        'Grief is depth meter.',
        '',
        'I tell long-grievers: depth.'
      ],
      lesson: 'Long-term grief measures deepest love; depth meter of love depth.'
    },
    {
      id: 'gn78_6',
      title: 'My grief continues but I continue too',
      narrative: [
        'Both continue.',
        '',
        'Grief and me.',
        '',
        'Side by side.',
        '',
        'I tell long-grievers: continue.'
      ],
      lesson: 'Long-term grief continues and we continue; both real, both present, both lived.'
    },
    {
      id: 'gn78_7',
      title: 'My grief made me more human',
      narrative: [
        'Suffering taught humanity.',
        '',
        'Understand limits.',
        '',
        'Connect through vulnerability.',
        '',
        'I tell long-grievers: human.'
      ],
      lesson: 'Long-term grief makes us more human; understand limits, connect through vulnerability.'
    },
    {
      id: 'gn78_8',
      title: 'My grief is sacred',
      narrative: [
        'Holy ground.',
        '',
        'Sacred space.',
        '',
        'Reverence.',
        '',
        'I tell long-grievers: sacred.'
      ],
      lesson: 'Long-term grief is sacred; holy ground requiring reverence.'
    },
    {
      id: 'gn78_9',
      title: 'My grief is gift to my children',
      narrative: [
        'Teach them about loss.',
        '',
        'Prepare them.',
        '',
        'Honest grief teaching.',
        '',
        'I tell parent-grievers: teach.'
      ],
      lesson: 'Long-term grief becomes gift teaching children about loss; preparation through honest teaching.'
    },
    {
      id: 'gn78_10',
      title: 'My grief is the price worth paying',
      narrative: [
        'Love costs grief.',
        '',
        'Worth paying.',
        '',
        'Love over grief.',
        '',
        'I tell all-grievers: worth.'
      ],
      lesson: 'Grief is the price of love worth paying; love over grief.'
    },
    {
      id: 'gn78_11',
      title: 'My grief is communion with the dead',
      narrative: [
        'Connection continues.',
        '',
        'Communion across veil.',
        '',
        'Bond transforms.',
        '',
        'I tell faithful-grievers: communion.'
      ],
      lesson: 'Long-term grief is communion with the dead; bond transforms across veil.'
    },
    {
      id: 'gn78_12',
      title: 'My grief made me grateful',
      narrative: [
        'Loss showed value.',
        '',
        'Gratitude for what was.',
        '',
        'Precious memories.',
        '',
        'I tell long-grievers: gratitude.'
      ],
      lesson: 'Long-term grief reveals gratitude for what was; precious memories sustain.'
    },
    {
      id: 'gn78_13',
      title: 'My grief is my prayer',
      narrative: [
        'Grief prays.',
        '',
        'Without words.',
        '',
        'Heart toward sacred.',
        '',
        'I tell faithful-grievers: prayer.'
      ],
      lesson: 'Long-term grief is wordless prayer; heart turned toward sacred.'
    },
    {
      id: 'gn78_14',
      title: 'My grief is my belonging',
      narrative: [
        'Belong to community of grievers.',
        '',
        'Universal.',
        '',
        'Connected through loss.',
        '',
        'I tell long-grievers: belong.'
      ],
      lesson: 'Long-term grief is belonging to universal community of grievers; connected through loss.'
    },
    {
      id: 'gn78_15',
      title: 'My final grief lesson: gratitude for love',
      narrative: [
        'Grateful loved deeply enough to grieve.',
        '',
        'Grief shows love.',
        '',
        'Gratitude for love.',
        '',
        'I tell all-grievers: gratitude.'
      ],
      lesson: 'Final grief lesson: gratitude for love that produced grief; grief shows love depth.'
    }
  ];

  var GRIEF_NARRATIVES_79 = [
    {
      id: 'gn79_1',
      title: 'My grief was the doorway to becoming',
      narrative: [
        'Loss broke who I was.',
        '',
        'New person emerged.',
        '',
        'Doorway to becoming.',
        '',
        'I tell long-grievers: doorway.'
      ],
      lesson: 'Long-term grief is doorway to becoming; loss breaks old self for new emergence.'
    },
    {
      id: 'gn79_2',
      title: 'My grief is part of my creativity',
      narrative: [
        'Loss inspires.',
        '',
        'Art emerges from grief.',
        '',
        'Creative response.',
        '',
        'I tell creator-grievers: emerges.'
      ],
      lesson: 'Long-term grief inspires creativity; art emerges from loss as creative response.'
    },
    {
      id: 'gn79_3',
      title: 'My grief is my truth',
      narrative: [
        'Cannot hide it.',
        '',
        'Truth of love and loss.',
        '',
        'Lived honestly.',
        '',
        'I tell long-grievers: truth.'
      ],
      lesson: 'Long-term grief is our truth; love and loss lived honestly.'
    },
    {
      id: 'gn79_4',
      title: 'My grief is my freedom',
      narrative: [
        'Released from pretense.',
        '',
        'No need to fake okay.',
        '',
        'Free to be human.',
        '',
        'I tell long-grievers: freedom.'
      ],
      lesson: 'Long-term grief frees from pretense; no need to fake okay, free to be human.'
    },
    {
      id: 'gn79_5',
      title: 'My grief is my courage',
      narrative: [
        'Faced suffering.',
        '',
        'Continue daily.',
        '',
        'Quiet courage.',
        '',
        'I tell long-grievers: courage.'
      ],
      lesson: 'Long-term grief is quiet daily courage; facing suffering and continuing.'
    },
    {
      id: 'gn79_6',
      title: 'My grief is my devotion',
      narrative: [
        'Devotion to memory.',
        '',
        'Devotion to love.',
        '',
        'Practice of devotion.',
        '',
        'I tell long-grievers: devotion.'
      ],
      lesson: 'Long-term grief is devotion practice; memory and love sustained through devotion.'
    },
    {
      id: 'gn79_7',
      title: 'My grief is my prayer practice',
      narrative: [
        'Grief prays in body.',
        '',
        'Without words.',
        '',
        'Heart turned.',
        '',
        'I tell faithful-grievers: practice.'
      ],
      lesson: 'Long-term grief is bodily prayer practice; wordless heart-turning toward sacred.'
    },
    {
      id: 'gn79_8',
      title: 'My grief is my gift',
      narrative: [
        'Gift to others.',
        '',
        'Suffering becomes gift.',
        '',
        'Now offered freely.',
        '',
        'I tell long-grievers: gift.'
      ],
      lesson: 'Long-term grief becomes gift offered to others; suffering becomes generous offering.'
    },
    {
      id: 'gn79_9',
      title: 'My grief is my purpose',
      narrative: [
        'Purpose from loss.',
        '',
        'Serve others.',
        '',
        'Born of suffering.',
        '',
        'I tell long-grievers: purpose.'
      ],
      lesson: 'Long-term grief shapes purpose born of suffering; serving others is purpose.'
    },
    {
      id: 'gn79_10',
      title: 'My grief is my whole self',
      narrative: [
        'Cannot separate.',
        '',
        'Part of identity.',
        '',
        'Whole self.',
        '',
        'I tell long-grievers: whole.'
      ],
      lesson: 'Long-term grief becomes whole self; cannot separate from integrated identity.'
    },
    {
      id: 'gn79_11',
      title: 'My grief is my deepest connection',
      narrative: [
        'Connect through loss.',
        '',
        'Deepest bonds.',
        '',
        'Formed in suffering.',
        '',
        'I tell long-grievers: connection.'
      ],
      lesson: 'Long-term grief creates deepest connections; bonds formed in shared suffering.'
    },
    {
      id: 'gn79_12',
      title: 'My grief is my mentor',
      narrative: [
        'Teaches me daily.',
        '',
        'Lessons emerging.',
        '',
        'Lifelong mentor.',
        '',
        'I tell long-grievers: mentor.'
      ],
      lesson: 'Long-term grief is lifelong mentor; lessons emerge daily through suffering.'
    },
    {
      id: 'gn79_13',
      title: 'My grief is my belonging',
      narrative: [
        'Belong to grievers.',
        '',
        'Universal community.',
        '',
        'All who lost.',
        '',
        'I tell long-grievers: belong.'
      ],
      lesson: 'Long-term grief brings belonging to universal community; all who have lost.'
    },
    {
      id: 'gn79_14',
      title: 'My grief is my honest face',
      narrative: [
        'Pretend abandoned.',
        '',
        'Real face shown.',
        '',
        'Authentic living.',
        '',
        'I tell long-grievers: honest.'
      ],
      lesson: 'Long-term grief brings honest face; abandons pretense for authentic living.'
    },
    {
      id: 'gn79_15',
      title: 'My grief is my offering',
      narrative: [
        'Offer to others.',
        '',
        'My suffering.',
        '',
        'Becomes gift.',
        '',
        'I tell long-grievers: offering.'
      ],
      lesson: 'Long-term grief offered to others becomes gift; suffering becomes generous offering.'
    }
  ];

  var GRIEF_NARRATIVES_80 = [
    {
      id: 'gn80_1',
      title: 'My grief practice integrated my whole life',
      narrative: [
        'Decades out.',
        '',
        'Practice continues.',
        '',
        'Whole life shaped.',
        '',
        'I tell long-grievers: whole life.'
      ],
      lesson: 'Decades of grief practice shape whole life; integration becomes daily living.'
    },
    {
      id: 'gn80_2',
      title: 'My grief continues to teach',
      narrative: [
        'Every year teaches.',
        '',
        'New lessons.',
        '',
        'Continuing wisdom.',
        '',
        'I tell long-grievers: teaches.'
      ],
      lesson: 'Long-term grief continues teaching new lessons every year; wisdom emerges continuously.'
    },
    {
      id: 'gn80_3',
      title: 'My grief is my witness',
      narrative: [
        'Witness to loss.',
        '',
        'Witness to love.',
        '',
        'Stand witness.',
        '',
        'I tell long-grievers: witness.'
      ],
      lesson: 'Long-term grief makes us witnesses; to loss, to love, standing witness for others.'
    },
    {
      id: 'gn80_4',
      title: 'My grief is my prayer',
      narrative: [
        'Grief prays.',
        '',
        'Daily without words.',
        '',
        'Heart toward sacred.',
        '',
        'I tell faithful-grievers: prayer.'
      ],
      lesson: 'Long-term grief is daily wordless prayer; heart turned toward sacred.'
    },
    {
      id: 'gn80_5',
      title: 'My grief is my legacy',
      narrative: [
        'Leave grief stories.',
        '',
        'For my children.',
        '',
        'Honest grief legacy.',
        '',
        'I tell long-grievers: legacy.'
      ],
      lesson: 'Long-term grief leaves stories as legacy for children; honest grief teaching continues.'
    },
    {
      id: 'gn80_6',
      title: 'My grief is part of my faith',
      narrative: [
        'Faith and grief integrated.',
        '',
        'Lost shaped belief.',
        '',
        'Both real.',
        '',
        'I tell faithful-grievers: integrated.'
      ],
      lesson: 'Long-term grief integrates with faith; belief shaped by loss in unity.'
    },
    {
      id: 'gn80_7',
      title: 'My grief is my deepest gift',
      narrative: [
        'Gift to world.',
        '',
        'Suffering transformed.',
        '',
        'Now offered.',
        '',
        'I tell long-grievers: deepest gift.'
      ],
      lesson: 'Long-term grief becomes deepest gift to world; suffering transformed into offering.'
    },
    {
      id: 'gn80_8',
      title: 'My grief connects me to all who love',
      narrative: [
        'All who love grieve.',
        '',
        'Connection universal.',
        '',
        'Bond through loss.',
        '',
        'I tell long-grievers: universal.'
      ],
      lesson: 'Long-term grief connects to all who have loved; universal bond through shared loss.'
    },
    {
      id: 'gn80_9',
      title: 'My grief is my honest face to world',
      narrative: [
        'No pretense.',
        '',
        'Real face.',
        '',
        'Authentic always.',
        '',
        'I tell long-grievers: honest.'
      ],
      lesson: 'Long-term grief shows honest face to world; no pretense, authentic always.'
    },
    {
      id: 'gn80_10',
      title: 'My grief made my heart wider',
      narrative: [
        'Heart broken wider.',
        '',
        'Love more.',
        '',
        'Welcome more.',
        '',
        'I tell long-grievers: wider.'
      ],
      lesson: 'Long-term grief breaks heart wider; loving and welcoming more after.'
    },
    {
      id: 'gn80_11',
      title: 'My grief is the love continuing',
      narrative: [
        'Love did not die.',
        '',
        'Continuing form.',
        '',
        'Grief is love.',
        '',
        'I tell all grievers: continuing love.'
      ],
      lesson: 'Long-term grief is love continuing; love did not die, just changed form.'
    },
    {
      id: 'gn80_12',
      title: 'My grief is my practice of presence',
      narrative: [
        'Loss teaches presence.',
        '',
        'Each moment matters.',
        '',
        'Practice of presence.',
        '',
        'I tell long-grievers: present.'
      ],
      lesson: 'Long-term grief becomes practice of presence; each moment matters through loss awareness.'
    },
    {
      id: 'gn80_13',
      title: 'My grief is my path of becoming',
      narrative: [
        'Loss is path.',
        '',
        'Becoming through grief.',
        '',
        'New self emerging.',
        '',
        'I tell long-grievers: path.'
      ],
      lesson: 'Long-term grief is path of becoming; new self emerges through suffering.'
    },
    {
      id: 'gn80_14',
      title: 'My grief is my truest self',
      narrative: [
        'Stripped of pretense.',
        '',
        'Truest self emerges.',
        '',
        'Honest living.',
        '',
        'I tell long-grievers: truest.'
      ],
      lesson: 'Long-term grief strips pretense revealing truest self; honest living after loss.'
    },
    {
      id: 'gn80_15',
      title: 'My final word: love continues',
      narrative: [
        'Love does not end.',
        '',
        'Just changes form.',
        '',
        'Continuing always.',
        '',
        'I tell all grievers: love continues.'
      ],
      lesson: 'Final word: love does not end with death; changes form, continues always as grief and memory.'
    }
  ];

  var GRIEF_NARRATIVES_76 = [
    {
      id: 'gn76_1',
      title: 'My grandfather died and his birthday family fishing',
      narrative: [
        'Annual family fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue family sport.'
    },
    {
      id: 'gn76_2',
      title: 'My friend died and her birthday is gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn76_3',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family tradition.'
    },
    {
      id: 'gn76_4',
      title: 'My grandmother died and her birthday is tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn76_5',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn76_6',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing day.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn76_7',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn76_8',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual camp his spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn76_9',
      title: 'My friend died and her birthday poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friend groups continue voice memorial.'
    },
    {
      id: 'gn76_10',
      title: 'My partner died and his birthday photo print',
      narrative: [
        'Annual photo print.',
        '',
        'Year together photos.',
        '',
        'Frame.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photographically.'
    },
    {
      id: 'gn76_11',
      title: 'My mother died and her birthday meal',
      narrative: [
        'Annual family meal.',
        '',
        'Her holiday menu.',
        '',
        'Family gathered.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual family meals on deceased mothers birthdays cooking holiday menus continue table tradition.'
    },
    {
      id: 'gn76_12',
      title: 'My grandmother died and her birthday is cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continue.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn76_13',
      title: 'My grandfather died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn76_14',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes continue sport tradition.'
    },
    {
      id: 'gn76_15',
      title: 'My grief is the legacy of love',
      narrative: [
        'Love leaves legacy.',
        '',
        'Grief is its sign.',
        '',
        'Continuing presence.',
        '',
        'I tell long-grievers: legacy.'
      ],
      lesson: 'Long-term grief is the legacy of love; sign of continuing presence.'
    }
  ];

  var GRIEF_FINAL_PRINCIPLES = [
    {
      id: 'gfp_1',
      principle: 'Grief is not a problem to solve; it is love with nowhere to go.',
      explanation: 'Do not rush yourself or others through grief; honor its time.'
    },
    {
      id: 'gfp_2',
      principle: 'Grief comes in waves, not stages.',
      explanation: 'Five stages are myth; expect non-linear waves over years.'
    },
    {
      id: 'gfp_3',
      principle: 'Anticipatory grief during illness is real grief.',
      explanation: 'Permission to grieve before death; ambiguous and concrete losses both real.'
    },
    {
      id: 'gfp_4',
      principle: 'Disenfranchised grief deserves naming.',
      explanation: 'Pet loss, friendship loss, identity loss; all real grief deserving recognition.'
    },
    {
      id: 'gfp_5',
      principle: 'Continuing bonds are healthy grief practice.',
      explanation: 'Keep photos, items, traditions; bond continues in changed form.'
    },
    {
      id: 'gfp_6',
      principle: 'Complicated grief includes relief, anger, guilt; all valid.',
      explanation: 'Especially after long illness or difficult relationships; complicated emotions are normal.'
    },
    {
      id: 'gfp_7',
      principle: 'Specialty support exists for every type of loss.',
      explanation: 'Suicide loss, pet loss, child loss, military loss; specific communities and therapists exist.'
    },
    {
      id: 'gfp_8',
      principle: 'Body remembers grief; honor somatic responses.',
      explanation: 'Anniversary reactions, scent triggers, sensory dreams; body holds memory.'
    },
    {
      id: 'gfp_9',
      principle: 'Rituals contain grief; create and continue them.',
      explanation: 'Annual visits, birthday traditions, candles, recipes; ritual sustains.'
    },
    {
      id: 'gfp_10',
      principle: 'Grief is love that continues in new form.',
      explanation: 'Not absence of love; love changing direction toward memory.'
    },
    {
      id: 'gfp_11',
      principle: 'Children grieve differently and need age-appropriate support.',
      explanation: 'Honest words, concrete concepts, time to process; do not minimize.'
    },
    {
      id: 'gfp_12',
      principle: 'Grief support shrinks over time; long-term groups become essential.',
      explanation: 'First months bring meal trains; years need ongoing groups.'
    },
    {
      id: 'gfp_13',
      principle: 'Grief and joy can coexist.',
      explanation: 'Both real, both present; permission for both in long-term mourning.'
    },
    {
      id: 'gfp_14',
      principle: 'Asking for help in grief is strength, not weakness.',
      explanation: 'Therapy, groups, friends, family; reach out repeatedly over years.'
    },
    {
      id: 'gfp_15',
      principle: 'Grief integrates rather than disappears.',
      explanation: 'Wholeness with loss is the destination; not over but woven through.'
    },
    {
      id: 'gfp_16',
      principle: 'When grief includes thoughts of joining the deceased, get help immediately.',
      explanation: 'Crisis Companion, 988, or trusted adult; this is medical emergency.'
    },
    {
      id: 'gfp_17',
      principle: 'Trauma plus grief require both treatments.',
      explanation: 'Sudden, violent, or traumatic deaths need trauma plus grief therapy.'
    },
    {
      id: 'gfp_18',
      principle: 'Service to other grievers honors deceased and heals self.',
      explanation: 'Wounded healer; long-term grief becomes ability to help newly bereaved.'
    },
    {
      id: 'gfp_19',
      principle: 'Anniversary reactions are predictable; plan and prepare.',
      explanation: 'Body remembers dates; honor with rituals and self-care.'
    },
    {
      id: 'gfp_20',
      principle: 'Grief is universal human experience connecting us all.',
      explanation: 'All who have loved will grieve; you are not alone.'
    }
  ];

  var GRIEF_NARRATIVES_71 = [
    {
      id: 'gn71_1',
      title: 'My grandfather died and his birthday family workshop',
      narrative: [
        'Annual family workshop.',
        '',
        'Build something.',
        '',
        'His tools.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual family workshops on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn71_2',
      title: 'My friend died and her birthday is bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book.',
        '',
        'Read it.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue.'
    },
    {
      id: 'gn71_3',
      title: 'My uncle died and his birthday is camp',
      narrative: [
        'Annual family camp.',
        '',
        'His spot.',
        '',
        'Fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn71_4',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn71_5',
      title: 'My partner died and his birthday photo print',
      narrative: [
        'Annual print.',
        '',
        'Year photos.',
        '',
        'Frame.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photographically.'
    },
    {
      id: 'gn71_6',
      title: 'My mother died and her birthday church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn71_7',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue sport.'
    },
    {
      id: 'gn71_8',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue memorial.'
    },
    {
      id: 'gn71_9',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn71_10',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continue.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn71_11',
      title: 'My partner died and his birthday meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn71_12',
      title: 'My mother died and her birthday cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased mothers recipes continue family tradition.'
    },
    {
      id: 'gn71_13',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn71_14',
      title: 'My uncle died and his birthday family hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Family walks aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware visits on deceased uncle birthdays continue place tradition.'
    },
    {
      id: 'gn71_15',
      title: 'My grief is the love I still feel',
      narrative: [
        'Love did not die.',
        '',
        'It is grief now.',
        '',
        'Same thing transformed.',
        '',
        'I tell long-grievers: love transformed.'
      ],
      lesson: 'Long-term grief is love transformed; same thing continuing in new form.'
    }
  ];

  var GRIEF_NARRATIVES_72 = [
    {
      id: 'gn72_1',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn72_2',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn72_3',
      title: 'My grandfather died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn72_4',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes continue sport.'
    },
    {
      id: 'gn72_5',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn72_6',
      title: 'My mother died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists continue art memorial.'
    },
    {
      id: 'gn72_7',
      title: 'My grandfather died and his birthday hunting',
      narrative: [
        'Annual hunting.',
        '',
        'His spot.',
        '',
        'Family.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips on deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn72_8',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Year news.',
        '',
        'Continuing.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends on birthdays maintain continuing conversational bond.'
    },
    {
      id: 'gn72_9',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn72_10',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn72_11',
      title: 'My partner died and his birthday meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn72_12',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn72_13',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn72_14',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual family camp.',
        '',
        'His spot.',
        '',
        'Fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn72_15',
      title: 'My grief is universal and personal',
      narrative: [
        'All grieve.',
        '',
        'And mine is mine.',
        '',
        'Both universal and personal.',
        '',
        'I tell long-grievers: both.'
      ],
      lesson: 'Long-term grief is both universal human experience and uniquely personal at once.'
    }
  ];

  var GRIEF_NARRATIVES_73 = [
    {
      id: 'gn73_1',
      title: 'My grandmother died and her birthday is bake',
      narrative: [
        'Annual baking day.',
        '',
        'Her recipes.',
        '',
        'Family kitchen.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual family baking from deceased grandmothers recipes continue family kitchen tradition.'
    },
    {
      id: 'gn73_2',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual visit.',
        '',
        'Order his usual.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual restaurant visits at deceased partners favorite spots ordering his usual continue place memory.'
    },
    {
      id: 'gn73_3',
      title: 'My uncle died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased uncle birthdays continue place ritual.'
    },
    {
      id: 'gn73_4',
      title: 'My friend died and her birthday is gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn73_5',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue family sport tradition.'
    },
    {
      id: 'gn73_6',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual volunteer.',
        '',
        'Her cause.',
        '',
        'Service.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through action.'
    },
    {
      id: 'gn73_7',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased grandmothers recipes continue family tradition.'
    },
    {
      id: 'gn73_8',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual family camp.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds continue camp tradition.'
    },
    {
      id: 'gn73_9',
      title: 'My partner died and his birthday dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn73_10',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn73_11',
      title: 'My grandfather died and his birthday BBQ',
      narrative: [
        'Annual BBQ.',
        '',
        'His grill.',
        '',
        'Family.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs on deceased grandfathers birthdays using his grill gather family in cooking.'
    },
    {
      id: 'gn73_12',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing day.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn73_13',
      title: 'My uncle died and his birthday charity',
      narrative: [
        'Annual donation.',
        '',
        'His cause.',
        '',
        'In his name.',
        '',
        'I tell charity-mourners: annual.'
      ],
      lesson: 'Annual donations to deceased uncle causes in his name continue giving values.'
    },
    {
      id: 'gn73_14',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family handwork.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days on deceased grandmothers birthdays from her patterns continue handwork.'
    },
    {
      id: 'gn73_15',
      title: 'My grief is my devotion',
      narrative: [
        'Devotion to memory.',
        '',
        'Devotion to love.',
        '',
        'Grief is practice.',
        '',
        'I tell long-grievers: devotion.'
      ],
      lesson: 'Long-term grief is devotion practice; memory and love sustained through devotion.'
    }
  ];

  var GRIEF_NARRATIVES_74 = [
    {
      id: 'gn74_1',
      title: 'My grandfather died and his birthday family hardware tour',
      narrative: [
        'Annual hardware tour.',
        '',
        'Three stores he loved.',
        '',
        'Family walks aisles.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware tours on deceased grandfathers birthdays continue place ritual extensively.'
    },
    {
      id: 'gn74_2',
      title: 'My friend died and her birthday travel',
      narrative: [
        'Annual trip her place.',
        '',
        'Solo or friends.',
        '',
        'Travel memorial.',
        '',
        'I tell travel-mourners: annual.'
      ],
      lesson: 'Annual trips to places deceased friends loved provide travel memorial.'
    },
    {
      id: 'gn74_3',
      title: 'My uncle died and his birthday fishing tournament',
      narrative: [
        'Annual fishing tournament.',
        '',
        'In his memory.',
        '',
        'Community gathers.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual fishing tournaments in deceased uncle memory gather community through sport.'
    },
    {
      id: 'gn74_4',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn74_5',
      title: 'My grandmother died and her birthday is recipe',
      narrative: [
        'Annual recipe distribution.',
        '',
        'New family copies.',
        '',
        'Continuing.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe distributions on deceased grandmothers birthdays continue family legacy.'
    },
    {
      id: 'gn74_6',
      title: 'My mother died and her birthday hike',
      narrative: [
        'Annual family hike.',
        '',
        'Her trail.',
        '',
        'In her memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased mothers favorite trails continue physical memorial.'
    },
    {
      id: 'gn74_7',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual family fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue family sport.'
    },
    {
      id: 'gn74_8',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn74_9',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn74_10',
      title: 'My grandmother died and her birthday is craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days on deceased grandmothers birthdays from her patterns continue.'
    },
    {
      id: 'gn74_11',
      title: 'My partner died and his birthday photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year photos.',
        '',
        'Captions.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays with year captions preserve relationship.'
    },
    {
      id: 'gn74_12',
      title: 'My mother died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists continue art memorial.'
    },
    {
      id: 'gn74_13',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn74_14',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell her year.',
        '',
        'Continuing.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends on birthdays maintain continuing conversational bond.'
    },
    {
      id: 'gn74_15',
      title: 'My grief became part of my faith',
      narrative: [
        'Faith and grief intertwined.',
        '',
        'Lost shaped belief.',
        '',
        'Now they are one.',
        '',
        'I tell faithful-grievers: integrated.'
      ],
      lesson: 'Long-term grief becomes integrated with faith; belief shaped by loss in unity.'
    }
  ];

  var GRIEF_NARRATIVES_75 = [
    {
      id: 'gn75_1',
      title: 'My final grief lesson: love continues',
      narrative: [
        'Love does not end.',
        '',
        'Just changes form.',
        '',
        'Continuing bond.',
        '',
        'I tell all grievers: love continues.'
      ],
      lesson: 'Final grief lesson: love does not end with death; changes form, continues as bond.'
    },
    {
      id: 'gn75_2',
      title: 'My grief made me a better friend',
      narrative: [
        'Loss taught listening.',
        '',
        'Better friend now.',
        '',
        'I tell long-grievers: friend better.'
      ],
      lesson: 'Long-term grief teaches deep listening; survivors become better friends.'
    },
    {
      id: 'gn75_3',
      title: 'My grief made me a better parent',
      narrative: [
        'Loss taught presence.',
        '',
        'More present with children.',
        '',
        'I tell parent-grievers: present.'
      ],
      lesson: 'Long-term grief teaches presence; survivors become more present parents.'
    },
    {
      id: 'gn75_4',
      title: 'My grief made me a better partner',
      narrative: [
        'Loss taught love.',
        '',
        'Love more openly.',
        '',
        'I tell partnered-grievers: love openly.'
      ],
      lesson: 'Long-term grief teaches openness; survivors love partners more openly.'
    },
    {
      id: 'gn75_5',
      title: 'My grief shaped my wholeness',
      narrative: [
        'Whole now.',
        '',
        'Shaped by loss.',
        '',
        'Different but whole.',
        '',
        'I tell long-grievers: whole.'
      ],
      lesson: 'Grief shapes wholeness; different but whole through long-term grief integration.'
    },
    {
      id: 'gn75_6',
      title: 'My grief is the price of love',
      narrative: [
        'Loss is loving cost.',
        '',
        'Worth paying.',
        '',
        'Love over grief.',
        '',
        'I tell all grievers: love costs.'
      ],
      lesson: 'Grief is the price of love; worth paying for what loving was.'
    },
    {
      id: 'gn75_7',
      title: 'My grief connects me to all who grieve',
      narrative: [
        'Universal experience.',
        '',
        'All humans.',
        '',
        'Connection through loss.',
        '',
        'I tell long-grievers: universal connection.'
      ],
      lesson: 'Grief connects us to all humans who have loved and lost; universal connection.'
    },
    {
      id: 'gn75_8',
      title: 'My grief is integrated with life',
      narrative: [
        'Years out.',
        '',
        'Integrated.',
        '',
        'Life continues.',
        '',
        'I tell long-grievers: life continues.'
      ],
      lesson: 'Long-term grief integrates with continuing life; both real, both lived.'
    },
    {
      id: 'gn75_9',
      title: 'My grief became service to others',
      narrative: [
        'Suffering taught service.',
        '',
        'Help newly bereaved.',
        '',
        'I tell long-grievers: serve.'
      ],
      lesson: 'Long-term grief becomes service; suffering teaches helping the newly bereaved.'
    },
    {
      id: 'gn75_10',
      title: 'My grief gave me my deepest connections',
      narrative: [
        'Grief bonds.',
        '',
        'Deepest connections.',
        '',
        'Made in loss.',
        '',
        'I tell long-grievers: deepest bonds.'
      ],
      lesson: 'Long-term grief creates deepest connections; bonds form in shared loss.'
    },
    {
      id: 'gn75_11',
      title: 'My grief shaped my purpose',
      narrative: [
        'Purpose from suffering.',
        '',
        'Help others.',
        '',
        'Service born of loss.',
        '',
        'I tell long-grievers: purpose.'
      ],
      lesson: 'Long-term grief shapes purpose; service to others born of suffering.'
    },
    {
      id: 'gn75_12',
      title: 'My grief and my joy live together',
      narrative: [
        'Both real.',
        '',
        'Both present.',
        '',
        'Both lived.',
        '',
        'I tell long-grievers: both.'
      ],
      lesson: 'Grief and joy live together; both real, both present, both lived in long-term mourning.'
    },
    {
      id: 'gn75_13',
      title: 'My grief made my heart wider',
      narrative: [
        'Heart broken open.',
        '',
        'Wider after.',
        '',
        'Love more.',
        '',
        'I tell long-grievers: heart wider.'
      ],
      lesson: 'Long-term grief breaks heart open wider; survivors love more after.'
    },
    {
      id: 'gn75_14',
      title: 'My grief gave me my voice',
      narrative: [
        'Speak about loss.',
        '',
        'Voice emerged.',
        '',
        'Help others find theirs.',
        '',
        'I tell long-grievers: voice.'
      ],
      lesson: 'Long-term grief gives voice to speak about loss; helps others find theirs.'
    },
    {
      id: 'gn75_15',
      title: 'My final word: love',
      narrative: [
        'Grief is love.',
        '',
        'Continuing.',
        '',
        'Always.',
        '',
        'I tell all grievers: love.'
      ],
      lesson: 'Final word on grief: it is love continuing always.'
    }
  ];

  var GRIEF_NARRATIVES_66 = [
    {
      id: 'gn66_1',
      title: 'My grandmother died and her birthday is recipe day',
      narrative: [
        'Annual recipe printing.',
        '',
        'New family copies.',
        '',
        'Continuing distribution.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe distributions on deceased grandmothers birthdays continue family legacy.'
    },
    {
      id: 'gn66_2',
      title: 'My uncle died and his birthday bowling tournament',
      narrative: [
        'Annual bowling tournament.',
        '',
        'In his memory.',
        '',
        'Family enters.',
        '',
        'Community gathers.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual bowling tournaments in deceased uncle memory gather community through sport.'
    },
    {
      id: 'gn66_3',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual visit.',
        '',
        'His favorite restaurant.',
        '',
        'Order his usual.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual visits to deceased partners favorite restaurants ordering his usual continue place memory.'
    },
    {
      id: 'gn66_4',
      title: 'My mother died and her birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'Her holiday menu.',
        '',
        'Family gathered.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual family meals on deceased mothers birthdays from holiday menus continue table tradition.'
    },
    {
      id: 'gn66_5',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter to her.',
        '',
        'Year news.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends maintain continuing conversational bond.'
    },
    {
      id: 'gn66_6',
      title: 'My grandfather died and his birthday is hardware tour',
      narrative: [
        'Annual hardware tour.',
        '',
        'Three stores.',
        '',
        'Family walks aisles.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware tours on deceased grandfathers birthdays continue place ritual extensively.'
    },
    {
      id: 'gn66_7',
      title: 'My uncle died and his birthday charity tournament',
      narrative: [
        'Annual charity tournament.',
        '',
        'His name.',
        '',
        'Community gathers.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual charity tournaments in deceased uncle names continue community gathering through sport.'
    },
    {
      id: 'gn66_8',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn66_9',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn66_10',
      title: 'My mother died and her birthday is church visit',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn66_11',
      title: 'My grandfather died and his birthday hunting',
      narrative: [
        'Annual hunting trip.',
        '',
        'His spot.',
        '',
        'Family hunts.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips on deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn66_12',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Memorial.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn66_13',
      title: 'My uncle died and his birthday family camp',
      narrative: [
        'Annual camp.',
        '',
        'His spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn66_14',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continue.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn66_15',
      title: 'My grief is part of who I am',
      narrative: [
        'Identity shaped by loss.',
        '',
        'Whole self includes grief.',
        '',
        'I tell long-grievers: identity integrated.'
      ],
      lesson: 'Identity shaped by loss; whole self includes integrated grief.'
    }
  ];

  var GRIEF_NARRATIVES_67 = [
    {
      id: 'gn67_1',
      title: 'My partner died and his birthday is photo print',
      narrative: [
        'Annual photo print.',
        '',
        'Year together.',
        '',
        'Frame and hang.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photographically.'
    },
    {
      id: 'gn67_2',
      title: 'My mother died and her birthday recipe',
      narrative: [
        'Annual recipe printing.',
        '',
        'New family copies.',
        '',
        'Continuing.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe printings on deceased mothers birthdays continue family legacy.'
    },
    {
      id: 'gn67_3',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs with deceased grandfathers grill gather family in cooking tradition.'
    },
    {
      id: 'gn67_4',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes continue sport tradition.'
    },
    {
      id: 'gn67_5',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn67_6',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn67_7',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn67_8',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn67_9',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn67_10',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual camp.',
        '',
        'His spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn67_11',
      title: 'My friend died and her birthday poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn67_12',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn67_13',
      title: 'My partner died and his birthday meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn67_14',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual volunteer.',
        '',
        'Her cause.',
        '',
        'Family service.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through action.'
    },
    {
      id: 'gn67_15',
      title: 'My grief is the deepest love',
      narrative: [
        'Loss measures love.',
        '',
        'Deepest love shows in grief.',
        '',
        'I tell long-grievers: love measures.'
      ],
      lesson: 'Grief measures love depth; deepest love shows in long-term grief.'
    }
  ];

  var GRIEF_NARRATIVES_68 = [
    {
      id: 'gn68_1',
      title: 'My grandfather died and his birthday is family work day',
      narrative: [
        'Annual home repair.',
        '',
        'Family fixes house.',
        '',
        'Continue.',
        '',
        'I tell repair-mourners: annual.'
      ],
      lesson: 'Annual home repair days on deceased grandfathers birthdays gather family in hands work.'
    },
    {
      id: 'gn68_2',
      title: 'My friend died and her birthday is travel',
      narrative: [
        'Annual trip place she loved.',
        '',
        'Solo or with friends.',
        '',
        'Travel memorial.',
        '',
        'I tell travel-mourners: annual.'
      ],
      lesson: 'Annual trips to places deceased friends loved provide travel memorial.'
    },
    {
      id: 'gn68_3',
      title: 'My uncle died and his birthday family hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Family walks aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware visits on deceased uncle birthdays continue place tradition.'
    },
    {
      id: 'gn68_4',
      title: 'My grandmother died and her birthday is bake',
      narrative: [
        'Annual baking.',
        '',
        'Her recipes.',
        '',
        'Family kitchen.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual family baking on deceased grandmothers birthdays from her recipes fill kitchen.'
    },
    {
      id: 'gn68_5',
      title: 'My partner died and his birthday is meal cook',
      narrative: [
        'Annual full meal cook.',
        '',
        'His menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meal cooks on deceased partners birthdays continue food tradition.'
    },
    {
      id: 'gn68_6',
      title: 'My mother died and her birthday is gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists continue art memorial.'
    },
    {
      id: 'gn68_7',
      title: 'My grandfather died and his birthday is hunting',
      narrative: [
        'Annual hunting.',
        '',
        'His spot.',
        '',
        'Family.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips on deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn68_8',
      title: 'My friend died and her birthday bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have.',
        '',
        'Read.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue taste.'
    },
    {
      id: 'gn68_9',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn68_10',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased grandmothers recipes continue family tradition.'
    },
    {
      id: 'gn68_11',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual restaurant visit.',
        '',
        'His favorite.',
        '',
        'Order his usual.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual restaurant visits at deceased partners favorite spots ordering usual continue place memory.'
    },
    {
      id: 'gn68_12',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn68_13',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue sport tradition.'
    },
    {
      id: 'gn68_14',
      title: 'My friend died and her birthday potluck',
      narrative: [
        'Annual friend potluck.',
        '',
        'Her recipes.',
        '',
        'Stories.',
        '',
        'I tell potluck-mourners: annual.'
      ],
      lesson: 'Annual friend potlucks on deceased friend birthdays bring her recipes and stories together.'
    },
    {
      id: 'gn68_15',
      title: 'My grief is in service to others now',
      narrative: [
        'Help newly bereaved.',
        '',
        'Suffering taught me.',
        '',
        'Service my answer.',
        '',
        'I tell long-grievers: serve.'
      ],
      lesson: 'Long-term grief becomes service; suffering taught compassion for newly bereaved.'
    }
  ];

  var GRIEF_NARRATIVES_69 = [
    {
      id: 'gn69_1',
      title: 'My grandfather died and his birthday workshop class',
      narrative: [
        'Annual class.',
        '',
        'Teach grandchildren skills.',
        '',
        'Continue teaching.',
        '',
        'I tell teaching-mourners: annual.'
      ],
      lesson: 'Annual classes teaching grandchildren deceased grandfather skills continue teaching legacy.'
    },
    {
      id: 'gn69_2',
      title: 'My uncle died and his birthday is golf',
      narrative: [
        'Annual golf.',
        '',
        'His course.',
        '',
        'Family rounds.',
        '',
        'I tell golf-mourners: annual.'
      ],
      lesson: 'Annual family golf rounds at deceased uncle favorite courses continue sport memorial.'
    },
    {
      id: 'gn69_3',
      title: 'My partner died and his birthday dance',
      narrative: [
        'Annual dance.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn69_4',
      title: 'My mother died and her birthday library',
      narrative: [
        'Annual library visit.',
        '',
        'Her books.',
        '',
        'Read them.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits checking out deceased mothers books continue reading legacy.'
    },
    {
      id: 'gn69_5',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays continue hospitality.'
    },
    {
      id: 'gn69_6',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends gather.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue memorial.'
    },
    {
      id: 'gn69_7',
      title: 'My uncle died and his birthday family camp',
      narrative: [
        'Annual camp.',
        '',
        'His spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn69_8',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers birthdays at favorite lakes continue.'
    },
    {
      id: 'gn69_9',
      title: 'My mother died and her birthday meal',
      narrative: [
        'Annual full meal.',
        '',
        'Her menu.',
        '',
        'Family.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual family meals on deceased mothers birthdays from holiday menus continue tradition.'
    },
    {
      id: 'gn69_10',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter to her.',
        '',
        'Year news.',
        '',
        'Continuing.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends maintain conversational bond.'
    },
    {
      id: 'gn69_11',
      title: 'My uncle died and his birthday charity',
      narrative: [
        'Annual donation.',
        '',
        'His cause.',
        '',
        'In his name.',
        '',
        'I tell charity-mourners: annual.'
      ],
      lesson: 'Annual donations to deceased uncle causes in his name continue giving values.'
    },
    {
      id: 'gn69_12',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continue.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn69_13',
      title: 'My partner died and his birthday photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year photos.',
        '',
        'Captions.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays with captions preserve year together.'
    },
    {
      id: 'gn69_14',
      title: 'My grandfather died and his birthday hardware tour',
      narrative: [
        'Annual hardware tour.',
        '',
        'Three stores.',
        '',
        'Family walks aisles.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware tours on deceased grandfathers birthdays continue place ritual extensively.'
    },
    {
      id: 'gn69_15',
      title: 'My grief and love are one',
      narrative: [
        'Same thing.',
        '',
        'Grief is love.',
        '',
        'Love is grief.',
        '',
        'I tell long-grievers: one.'
      ],
      lesson: 'Long-term grief reveals grief and love are one; same thing continuing through loss.'
    }
  ];

  var GRIEF_NARRATIVES_70 = [
    {
      id: 'gn70_1',
      title: 'My mother died and her birthday recipe sharing online',
      narrative: [
        'Annual recipe online.',
        '',
        'Wider distribution.',
        '',
        'Strangers cook.',
        '',
        'I tell online-mourners: annual.'
      ],
      lesson: 'Annual online recipe sharing on deceased mothers birthdays spread recipes to strangers.'
    },
    {
      id: 'gn70_2',
      title: 'My uncle died and his birthday family bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual family bowling on deceased uncle birthdays with his ball continue family tradition.'
    },
    {
      id: 'gn70_3',
      title: 'My grandfather died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place tradition.'
    },
    {
      id: 'gn70_4',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friend groups continue voice memorial.'
    },
    {
      id: 'gn70_5',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family eats.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased grandmothers recipes continue family tradition.'
    },
    {
      id: 'gn70_6',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn70_7',
      title: 'My mother died and her birthday is volunteer',
      narrative: [
        'Annual family volunteer.',
        '',
        'Her cause.',
        '',
        'Service honors.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through action.'
    },
    {
      id: 'gn70_8',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual camp.',
        '',
        'His spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots continue fire tradition.'
    },
    {
      id: 'gn70_9',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue sport tradition.'
    },
    {
      id: 'gn70_10',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn70_11',
      title: 'My grandmother died and her birthday is craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn70_12',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn70_13',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn70_14',
      title: 'My uncle died and his birthday hardware tour',
      narrative: [
        'Annual hardware tour.',
        '',
        'His three stores.',
        '',
        'Walk aisles.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store tours on deceased uncle birthdays continue place ritual extensively.'
    },
    {
      id: 'gn70_15',
      title: 'My grief continues and so does life',
      narrative: [
        'Both true.',
        '',
        'Always.',
        '',
        'Grief and life.',
        '',
        'I tell long-grievers: both.'
      ],
      lesson: 'Grief and life continue side by side; both true always in long-term mourning.'
    }
  ];

  var GRIEF_NARRATIVES_61 = [
    {
      id: 'gn61_1',
      title: 'My grandfather died and his birthday family hardware tour',
      narrative: [
        'Annual family tour.',
        '',
        'Three hardware stores he loved.',
        '',
        'Walk all aisles.',
        '',
        'Each buy small thing.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware tours on deceased grandfathers birthdays continue place ritual extensively.'
    },
    {
      id: 'gn61_2',
      title: 'My partner died and his birthday is photo display upgrade',
      narrative: [
        'Annual frame upgrade.',
        '',
        'Best year photo.',
        '',
        'Hang prominently.',
        '',
        'I tell photo-mourners: annual frame.'
      ],
      lesson: 'Annual photo frame upgrades on deceased partners birthdays hang best year photos prominently.'
    },
    {
      id: 'gn61_3',
      title: 'My mother died and her birthday recipe online',
      narrative: [
        'Annual online recipe.',
        '',
        'Strangers cook.',
        '',
        'Wider memory spread.',
        '',
        'I tell online-mourners: annual.'
      ],
      lesson: 'Annual online recipe shares on deceased mothers birthdays spread memory to strangers.'
    },
    {
      id: 'gn61_4',
      title: 'My grandmother died and her birthday is bake-off',
      narrative: [
        'Annual family bake-off.',
        '',
        'Her recipes.',
        '',
        'Best wins.',
        '',
        'I tell bake-off mourners: annual.'
      ],
      lesson: 'Annual family bake-offs with deceased grandmothers recipes continue family kitchen tradition.'
    },
    {
      id: 'gn61_5',
      title: 'My uncle died and his birthday charity tournament',
      narrative: [
        'Annual charity tournament.',
        '',
        'His memory.',
        '',
        'Community gathers.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual charity tournaments in deceased uncle memory gather community through sport.'
    },
    {
      id: 'gn61_6',
      title: 'My friend died and her birthday is travel',
      narrative: [
        'Annual trip place she loved.',
        '',
        'Solo or with friends.',
        '',
        'Honor through travel.',
        '',
        'I tell travel-mourners: annual.'
      ],
      lesson: 'Annual trips to places deceased friends loved honor through travel memorial.'
    },
    {
      id: 'gn61_7',
      title: 'My grandfather died and his birthday family BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'His recipes.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs with deceased grandfathers grill and recipes gather family in cooking tradition.'
    },
    {
      id: 'gn61_8',
      title: 'My mother died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists continue art appreciation memorial.'
    },
    {
      id: 'gn61_9',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn61_10',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual family camp.',
        '',
        'His campground.',
        '',
        'Fires and stories.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds with fires continue stories.'
    },
    {
      id: 'gn61_11',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family handwork.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn61_12',
      title: 'My friend died and her birthday is hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends gather.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn61_13',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop project.',
        '',
        'His tools.',
        '',
        'Family builds.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop projects on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn61_14',
      title: 'My mother died and her birthday is volunteer',
      narrative: [
        'Annual family volunteer.',
        '',
        'Her cause.',
        '',
        'Service honors.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor.'
    },
    {
      id: 'gn61_15',
      title: 'My grief is my teacher always',
      narrative: [
        'Years on.',
        '',
        'Still teaching me.',
        '',
        'Loss continues to teach.',
        '',
        'I tell long-grievers: teacher continues.'
      ],
      lesson: 'Long-term grief continues teaching us; loss is lifelong teacher.'
    }
  ];

  var GRIEF_NARRATIVES_62 = [
    {
      id: 'gn62_1',
      title: 'My friend died and her birthday is poetry reading',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends read aloud.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn62_2',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family casts.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes with his tackle continue sport.'
    },
    {
      id: 'gn62_3',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Family kitchen.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids decorating on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn62_4',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Live music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn62_5',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn62_6',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue family sport tradition.'
    },
    {
      id: 'gn62_7',
      title: 'My friend died and her birthday is bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have.',
        '',
        'Read it.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue her taste.'
    },
    {
      id: 'gn62_8',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn62_9',
      title: 'My grandmother died and her birthday tea party',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn62_10',
      title: 'My partner died and his birthday is photo',
      narrative: [
        'Annual photo print.',
        '',
        'Year together.',
        '',
        'Frame and hang.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photographically.'
    },
    {
      id: 'gn62_11',
      title: 'My mother died and her birthday cake',
      narrative: [
        'Annual birthday cake.',
        '',
        'Her recipe.',
        '',
        'Family eats.',
        '',
        'Continuing.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased mothers recipes continue family tradition.'
    },
    {
      id: 'gn62_12',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn62_13',
      title: 'My friend died and her birthday is gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn62_14',
      title: 'My uncle died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased uncle birthdays continue place tradition.'
    },
    {
      id: 'gn62_15',
      title: 'My grief opened my heart to love deeper',
      narrative: [
        'Loss broke me open.',
        '',
        'Heart wider after.',
        '',
        'Love more openly.',
        '',
        'I tell long-grievers: hearts open.'
      ],
      lesson: 'Long-term grief opens hearts to deeper love through learned vulnerability.'
    }
  ];

  var GRIEF_NARRATIVES_63 = [
    {
      id: 'gn63_1',
      title: 'My mother died and her birthday is recipe sharing',
      narrative: [
        'Annual online share.',
        '',
        'Wider distribution.',
        '',
        'Strangers cook.',
        '',
        'I tell recipe-sharers: annual.'
      ],
      lesson: 'Annual online recipe sharing on deceased mothers birthdays spread recipes to strangers continuing legacy.'
    },
    {
      id: 'gn63_2',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ.',
        '',
        'His grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs using deceased grandfathers grill gather family in cooking tradition.'
    },
    {
      id: 'gn63_3',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends gather.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn63_4',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual family camping.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds continue fire tradition.'
    },
    {
      id: 'gn63_5',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn63_6',
      title: 'My partner died and his birthday dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn63_7',
      title: 'My mother died and her birthday library',
      narrative: [
        'Annual library visit.',
        '',
        'Her books.',
        '',
        'Read them.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits checking out deceased mothers favorite books continue reading legacy.'
    },
    {
      id: 'gn63_8',
      title: 'My grandfather died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn63_9',
      title: 'My friend died and her birthday poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn63_10',
      title: 'My uncle died and his birthday is bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn63_11',
      title: 'My grandmother died and her birthday is recipe day',
      narrative: [
        'Annual recipe distribution.',
        '',
        'New family copies.',
        '',
        'Continuing.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe distributions on deceased grandmothers birthdays continue family legacy.'
    },
    {
      id: 'gn63_12',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual restaurant visit.',
        '',
        'Order his usual.',
        '',
        'Same booth.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual restaurant visits at deceased partners favorite spots ordering his usual continue.'
    },
    {
      id: 'gn63_13',
      title: 'My mother died and her birthday is volunteer',
      narrative: [
        'Annual volunteer.',
        '',
        'Her cause.',
        '',
        'Family service.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through action.'
    },
    {
      id: 'gn63_14',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue family sport tradition.'
    },
    {
      id: 'gn63_15',
      title: 'My grief made my love more visible',
      narrative: [
        'Loss expressed love.',
        '',
        'People see it now.',
        '',
        'Visible love through grief.',
        '',
        'I tell long-grievers: visible love.'
      ],
      lesson: 'Long-term grief makes love visible; grief is love made apparent to others.'
    }
  ];

  var GRIEF_NARRATIVES_64 = [
    {
      id: 'gn64_1',
      title: 'My friend died and her birthday is letter writing',
      narrative: [
        'Annual letter to her.',
        '',
        'Tell her year.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends maintain continuing conversational connection.'
    },
    {
      id: 'gn64_2',
      title: 'My grandmother died and her birthday is craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family handwork.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days on deceased grandmothers birthdays from her patterns continue handwork.'
    },
    {
      id: 'gn64_3',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual family fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at his lake with his tackle continue sport.'
    },
    {
      id: 'gn64_4',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn64_5',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn64_6',
      title: 'My mother died and her birthday is gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists continue art memorial.'
    },
    {
      id: 'gn64_7',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continue.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn64_8',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual family camp.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite campgrounds continue fire tradition.'
    },
    {
      id: 'gn64_9',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ.',
        '',
        'His grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs using deceased grandfathers grill gather family in cooking tradition.'
    },
    {
      id: 'gn64_10',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn64_11',
      title: 'My friend died and her birthday poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends read.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn64_12',
      title: 'My mother died and her birthday church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn64_13',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn64_14',
      title: 'My grandfather died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place tradition.'
    },
    {
      id: 'gn64_15',
      title: 'My grief and my joy coexist',
      narrative: [
        'Both true.',
        '',
        'Grief deep.',
        '',
        'Joy returning.',
        '',
        'Both real.',
        '',
        'I tell long-grievers: both coexist.'
      ],
      lesson: 'Long-term grief and joy coexist; both real, both present, both lived.'
    }
  ];

  var GRIEF_NARRATIVES_65 = [
    {
      id: 'gn65_1',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn65_2',
      title: 'My partner died and his birthday photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year together photos.',
        '',
        'Captions.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays with year captions preserve relationship.'
    },
    {
      id: 'gn65_3',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing day.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn65_4',
      title: 'My uncle died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased uncle birthdays continue place tradition.'
    },
    {
      id: 'gn65_5',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family casts.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers birthdays at favorite lakes continue sport.'
    },
    {
      id: 'gn65_6',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn65_7',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual birthday cake.',
        '',
        'Her recipe.',
        '',
        'Family eats.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased grandmothers recipes continue family tradition.'
    },
    {
      id: 'gn65_8',
      title: 'My uncle died and his birthday is family camp',
      narrative: [
        'Annual camp his spot.',
        '',
        'Family fires.',
        '',
        'Stories.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots gather around fire for stories.'
    },
    {
      id: 'gn65_9',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn65_10',
      title: 'My mother died and her birthday hike',
      narrative: [
        'Annual family hike.',
        '',
        'Her trail.',
        '',
        'Family walks.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased mothers favorite trails continue physical memorial.'
    },
    {
      id: 'gn65_11',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn65_12',
      title: 'My friend died and her birthday is hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends gather.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn65_13',
      title: 'My uncle died and his birthday family BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs with deceased uncle grill gather family in cooking tradition.'
    },
    {
      id: 'gn65_14',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual family volunteer.',
        '',
        'Her cause.',
        '',
        'Service honors.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through action.'
    },
    {
      id: 'gn65_15',
      title: 'My grief is my life and I am whole',
      narrative: [
        'Years out.',
        '',
        'Grief integrated.',
        '',
        'Life is whole.',
        '',
        'Loss present.',
        '',
        'I tell long-grievers: whole life.'
      ],
      lesson: 'Long-term grief integrated into whole life; loss present but life whole.'
    }
  ];

  var GRIEF_NARRATIVES_56 = [
    {
      id: 'gn56_1',
      title: 'My partner died and his birthday meal cooked',
      narrative: [
        'Annual cook day.',
        '',
        'His favorite meal.',
        '',
        'Family eats.',
        '',
        'I tell solo-cooks: annual.'
      ],
      lesson: 'Annual cooking of deceased partners favorite meals continues food tradition.'
    },
    {
      id: 'gn56_2',
      title: 'My mother died and her birthday recipe',
      narrative: [
        'Annual recipe book printing.',
        '',
        'New family receives.',
        '',
        'Continuing distribution.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe book distributions on deceased mothers birthdays continue family legacy.'
    },
    {
      id: 'gn56_3',
      title: 'My grandfather died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk his aisles.',
        '',
        'Continue tradition.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn56_4',
      title: 'My friend died and her birthday is hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends walk.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friends continue physical memorial.'
    },
    {
      id: 'gn56_5',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at his favorite lakes continue sport.'
    },
    {
      id: 'gn56_6',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn56_7',
      title: 'My partner died and his birthday dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn56_8',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn56_9',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn56_10',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell her year.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends maintain conversational bond.'
    },
    {
      id: 'gn56_11',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual camping.',
        '',
        'His spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots continues fire-story tradition.'
    },
    {
      id: 'gn56_12',
      title: 'My grandmother died and her birthday is craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns gather family in handwork.'
    },
    {
      id: 'gn56_13',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual restaurant visit.',
        '',
        'His favorite spot.',
        '',
        'Order his usual.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual visits to deceased partners favorite restaurants ordering his usual continue place memory.'
    },
    {
      id: 'gn56_14',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn56_15',
      title: 'My grief became wisdom for others',
      narrative: [
        'Now help newly bereaved.',
        '',
        'Wisdom from wound.',
        '',
        'Service my response.',
        '',
        'I tell long-grievers: serve others.'
      ],
      lesson: 'Long-term grief becomes wisdom for newly bereaved; service is response to suffering.'
    }
  ];

  var GRIEF_NARRATIVES_57 = [
    {
      id: 'gn57_1',
      title: 'My grandfather died and his birthday workshop class',
      narrative: [
        'Annual class teaching grandkids.',
        '',
        'His skills.',
        '',
        'Continuing teaching.',
        '',
        'I tell teaching-mourners: annual.'
      ],
      lesson: 'Annual classes teaching grandkids deceased grandfather skills continue teaching legacy.'
    },
    {
      id: 'gn57_2',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn57_3',
      title: 'My uncle died and his birthday is bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn57_4',
      title: 'My partner died and his birthday is photo book',
      narrative: [
        'Annual album.',
        '',
        'Year photos.',
        '',
        'Captions added.',
        '',
        'I tell album-mourners: annual.'
      ],
      lesson: 'Annual photo albums on deceased partners birthdays with year captions preserve relationship.'
    },
    {
      id: 'gn57_5',
      title: 'My mother died and her birthday garden',
      narrative: [
        'Annual planting.',
        '',
        'Her flowers.',
        '',
        'Garden grows.',
        '',
        'I tell garden-mourners: annual.'
      ],
      lesson: 'Annual plantings on deceased mothers birthdays of favorite flowers grow garden memorial.'
    },
    {
      id: 'gn57_6',
      title: 'My grandmother died and her birthday is cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continuing.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn57_7',
      title: 'My friend died and her birthday bookstore tour',
      narrative: [
        'Annual visit her bookstores.',
        '',
        'Buy books she would have.',
        '',
        'Read them.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore tours buying books deceased friends would have read continue taste.'
    },
    {
      id: 'gn57_8',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs with deceased grandfathers grill gather family in his cooking tradition.'
    },
    {
      id: 'gn57_9',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual camp.',
        '',
        'His spot.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots gather for fire tradition.'
    },
    {
      id: 'gn57_10',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Live music.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn57_11',
      title: 'My mother died and her birthday is hike',
      narrative: [
        'Annual family hike.',
        '',
        'Her trail.',
        '',
        'In her memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased mothers favorite trails continue physical memorial.'
    },
    {
      id: 'gn57_12',
      title: 'My grandfather died and his birthday library',
      narrative: [
        'Annual library visit.',
        '',
        'Books he loved.',
        '',
        'Read them.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits checking out deceased grandfathers favorite books continue reading.'
    },
    {
      id: 'gn57_13',
      title: 'My friend died and her birthday potluck',
      narrative: [
        'Annual friend potluck.',
        '',
        'Her recipes.',
        '',
        'Stories shared.',
        '',
        'I tell potluck-mourners: annual.'
      ],
      lesson: 'Annual friend potlucks on deceased friends birthdays bring her recipes and stories together.'
    },
    {
      id: 'gn57_14',
      title: 'My uncle died and his birthday hardware tour',
      narrative: [
        'Annual three hardware stores.',
        '',
        'Walk aisles.',
        '',
        'Buy small items.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store tours on deceased uncle birthdays continue place ritual extensively.'
    },
    {
      id: 'gn57_15',
      title: 'My grief gave me my voice',
      narrative: [
        'Wrote about loss.',
        '',
        'Spoke publicly.',
        '',
        'Voice emerged.',
        '',
        'I tell long-grievers: voice can emerge.'
      ],
      lesson: 'Long-term grief can emerge voice through writing or speaking about loss.'
    }
  ];

  var GRIEF_NARRATIVES_58 = [
    {
      id: 'gn58_1',
      title: 'My grandmother died and her birthday is bake-off',
      narrative: [
        'Annual family bake-off.',
        '',
        'Her recipes.',
        '',
        'Best wins.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual family bake-offs using deceased grandmothers recipes continue family kitchen.'
    },
    {
      id: 'gn58_2',
      title: 'My uncle died and his birthday camping trip',
      narrative: [
        'Annual full camping trip.',
        '',
        'His campground.',
        '',
        'Family gathered.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual full family camping trips at deceased uncle favorite campgrounds continue camp tradition.'
    },
    {
      id: 'gn58_3',
      title: 'My friend died and her birthday is letter writing',
      narrative: [
        'Annual letter.',
        '',
        'Tell her everything.',
        '',
        'Year in review.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual birthday letters to deceased friends with year review maintain conversation.'
    },
    {
      id: 'gn58_4',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'Family or solo.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his favorite menus continue food tradition.'
    },
    {
      id: 'gn58_5',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers birthdays at his favorite lakes continue sport.'
    },
    {
      id: 'gn58_6',
      title: 'My mother died and her birthday is recipe',
      narrative: [
        'Annual recipe printing.',
        '',
        'New family copies.',
        '',
        'Distribute.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe distributions on deceased mothers birthdays spread family kitchen.'
    },
    {
      id: 'gn58_7',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn58_8',
      title: 'My friend died and her birthday is pilgrimage',
      narrative: [
        'Annual grave visit.',
        '',
        'Bring flowers.',
        '',
        'Sit and remember.',
        '',
        'I tell grave-mourners: annual.'
      ],
      lesson: 'Annual grave pilgrimages with flowers continue place memorial.'
    },
    {
      id: 'gn58_9',
      title: 'My uncle died and his birthday is family game',
      narrative: [
        'Annual board games.',
        '',
        'His favorites.',
        '',
        'Family plays.',
        '',
        'I tell game-mourners: annual.'
      ],
      lesson: 'Annual board game days on deceased uncle birthdays play his favorites in family time.'
    },
    {
      id: 'gn58_10',
      title: 'My partner died and his birthday is photo',
      narrative: [
        'Annual photo print.',
        '',
        'Year together photos.',
        '',
        'Frame.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photos.'
    },
    {
      id: 'gn58_11',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop project.',
        '',
        'His tools.',
        '',
        'Family builds.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop projects on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn58_12',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn58_13',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hospitality.'
    },
    {
      id: 'gn58_14',
      title: 'My uncle died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased uncle birthdays continue place tradition.'
    },
    {
      id: 'gn58_15',
      title: 'My grief shaped my politics',
      narrative: [
        'Lost loved one to preventable cause.',
        '',
        'Politics changed.',
        '',
        'Advocate now.',
        '',
        'I tell preventable-loss mourners: advocacy emerges.'
      ],
      lesson: 'Preventable loss creates advocacy through politics; grief shapes civic engagement.'
    }
  ];

  var GRIEF_NARRATIVES_59 = [
    {
      id: 'gn59_1',
      title: 'My partner died and his birthday is travel',
      narrative: [
        'Annual trip places we loved.',
        '',
        'Or wanted to go.',
        '',
        'Solo or with friends.',
        '',
        'I tell travel-mourners: annual.'
      ],
      lesson: 'Annual trips to places shared or planned with deceased partners continue travel partnership.'
    },
    {
      id: 'gn59_2',
      title: 'My mother died and her birthday is bake',
      narrative: [
        'Annual bake day.',
        '',
        'Her cake.',
        '',
        'Family eats.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual cake bake days on deceased mothers birthdays continue family birthday tradition.'
    },
    {
      id: 'gn59_3',
      title: 'My grandfather died and his birthday is hardware visit',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn59_4',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn59_5',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes continue sport tradition.'
    },
    {
      id: 'gn59_6',
      title: 'My grandmother died and her birthday is canning',
      narrative: [
        'Annual canning day.',
        '',
        'Her tomatoes.',
        '',
        'Family preserves.',
        '',
        'I tell canning-mourners: annual.'
      ],
      lesson: 'Annual canning days on deceased grandmothers birthdays preserve her tomato recipes.'
    },
    {
      id: 'gn59_7',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn59_8',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn59_9',
      title: 'My grandfather died and his birthday hunting',
      narrative: [
        'Annual hunting trip.',
        '',
        'His spot.',
        '',
        'Family hunts.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips at deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn59_10',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike her trail.',
        '',
        'Friends walk.',
        '',
        'In her memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friends continue physical memorial.'
    },
    {
      id: 'gn59_11',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn59_12',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays continue hospitality tradition.'
    },
    {
      id: 'gn59_13',
      title: 'My partner died and his birthday dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn59_14',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'Family service.',
        '',
        'In her honor.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through service.'
    },
    {
      id: 'gn59_15',
      title: 'My grief gave me unexpected joy',
      narrative: [
        'Joy returned eventually.',
        '',
        'Unexpected moments.',
        '',
        'Allowed to feel.',
        '',
        'I tell long-grievers: joy returns.'
      ],
      lesson: 'Long-term grief allows joy to return; permission to feel joy alongside loss.'
    }
  ];

  var GRIEF_NARRATIVES_60 = [
    {
      id: 'gn60_1',
      title: 'My grandfather died and his birthday is family workshop',
      narrative: [
        'Annual family workshop.',
        '',
        'Build something.',
        '',
        'His tools.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual family workshops on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn60_2',
      title: 'My friend died and her birthday is gallery tour',
      narrative: [
        'Annual gallery tour.',
        '',
        'Her favorite museums.',
        '',
        'Friends visit.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery tours of deceased friends favorite museums by friends continue art memorial.'
    },
    {
      id: 'gn60_3',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual family camp.',
        '',
        'His campground.',
        '',
        'Continue tradition.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds continue camp tradition.'
    },
    {
      id: 'gn60_4',
      title: 'My partner died and his birthday photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year photos with captions.',
        '',
        'Family receives.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays with captions preserve year together for family.'
    },
    {
      id: 'gn60_5',
      title: 'My grandmother died and her birthday is recipe',
      narrative: [
        'Annual recipe distribution.',
        '',
        'New family member.',
        '',
        'Continuing.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe distributions on deceased grandmothers birthdays continue family legacy.'
    },
    {
      id: 'gn60_6',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn60_7',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs with deceased grandfathers grill gather family in his cooking tradition.'
    },
    {
      id: 'gn60_8',
      title: 'My friend died and her birthday volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'In her name.',
        '',
        'Service.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased friends birthdays at her causes honor through service.'
    },
    {
      id: 'gn60_9',
      title: 'My uncle died and his birthday is family game',
      narrative: [
        'Annual board games.',
        '',
        'His favorites.',
        '',
        'Family plays.',
        '',
        'I tell game-mourners: annual.'
      ],
      lesson: 'Annual board game days on deceased uncle birthdays play his favorites in family time.'
    },
    {
      id: 'gn60_10',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his menu continue food tradition.'
    },
    {
      id: 'gn60_11',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'Continue.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased grandmothers birthdays continue family kitchen.'
    },
    {
      id: 'gn60_12',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing day.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers machines for grandchildren continue craft tradition.'
    },
    {
      id: 'gn60_13',
      title: 'My grandfather died and his birthday hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place tradition.'
    },
    {
      id: 'gn60_14',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell her year news.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual birthday letters to deceased friends maintain continuing conversational bond.'
    },
    {
      id: 'gn60_15',
      title: 'My grief became universal grief',
      narrative: [
        'My loss is also others losses.',
        '',
        'Universal experience.',
        '',
        'All humans grieve.',
        '',
        'I tell long-grievers: universal.'
      ],
      lesson: 'Long-term grief becomes universal grief understanding; all humans grieve.'
    }
  ];

  var GRIEF_NARRATIVES_51 = [
    {
      id: 'gn51_1',
      title: 'My grandmother died and her annual visit ritual',
      narrative: [
        'Annual visit her grave.',
        '',
        'Plant flowers spring.',
        '',
        'Clean stone fall.',
        '',
        'Visit on her birthday.',
        '',
        'I tell grave-keepers: annual cycle.'
      ],
      lesson: 'Annual visit cycle to deceased grandmothers graves with spring planting and fall cleaning sustains.'
    },
    {
      id: 'gn51_2',
      title: 'My uncle died and his birthday charity tournament',
      narrative: [
        'Annual charity tournament in his name.',
        '',
        'Family organizes.',
        '',
        'Community participates.',
        '',
        'Money for his cause.',
        '',
        'I tell tournament-mourners: annual fundraiser.'
      ],
      lesson: 'Annual charity tournaments in deceased uncle names raise funds and continue community gathering.'
    },
    {
      id: 'gn51_3',
      title: 'My partner died and his birthday is travel',
      narrative: [
        'Annual trip places he loved.',
        '',
        'Or places we planned.',
        '',
        'Solo travel.',
        '',
        'I tell travel-mourners: annual trip.'
      ],
      lesson: 'Annual trips to places deceased partners loved or planned continue travel partnership.'
    },
    {
      id: 'gn51_4',
      title: 'My grandfather died and his birthday is fishing trip',
      narrative: [
        'Annual full fishing day.',
        '',
        'His lake.',
        '',
        'Family rods cast.',
        '',
        'Continuing.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual full fishing days at deceased grandfathers favorite lakes continue family sport tradition.'
    },
    {
      id: 'gn51_5',
      title: 'My mother died and her birthday neighborhood walk',
      narrative: [
        'Walk her neighborhood her birthday.',
        '',
        'Pass places she lived.',
        '',
        'Annual ritual.',
        '',
        'I tell walk-mourners: annual.'
      ],
      lesson: 'Annual walks through deceased mothers neighborhoods past her places continue spatial memory.'
    },
    {
      id: 'gn51_6',
      title: 'My friend died and her favorite museum annually',
      narrative: [
        'Annual museum visit.',
        '',
        'Her favorite paintings.',
        '',
        'Sit on her bench.',
        '',
        'Sit memorial.',
        '',
        'I tell museum-mourners: annual.'
      ],
      lesson: 'Annual museum visits to deceased friends favorite paintings sitting at her bench provide memorial.'
    },
    {
      id: 'gn51_7',
      title: 'My uncle died and his birthday family game night',
      narrative: [
        'Annual board game night.',
        '',
        'His favorite games.',
        '',
        'Family plays.',
        '',
        'I tell game-mourners: annual.'
      ],
      lesson: 'Annual family board game nights on deceased uncle birthdays play his favorites.'
    },
    {
      id: 'gn51_8',
      title: 'My grandmother died and her birthday recipe gift',
      narrative: [
        'Print recipe books.',
        '',
        'Distribute her birthday.',
        '',
        'Each year new family copies.',
        '',
        'I tell recipe-gift mourners: annual.'
      ],
      lesson: 'Annual recipe book distributions on deceased grandmothers birthdays continue legacy widely.'
    },
    {
      id: 'gn51_9',
      title: 'My partner died and his birthday is photo display',
      narrative: [
        'Annual photo print.',
        '',
        'Year together photos.',
        '',
        'Frame and hang.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo displays on deceased partners birthdays preserve year together photographically.'
    },
    {
      id: 'gn51_10',
      title: 'My mother died and her birthday cake bake-off',
      narrative: [
        'Annual family bake-off.',
        '',
        'Her cake recipe.',
        '',
        'Best version wins.',
        '',
        'I tell bake-off mourners: annual.'
      ],
      lesson: 'Annual family bake-offs on deceased mothers cake recipes continue family tradition.'
    },
    {
      id: 'gn51_11',
      title: 'My grandfather died and his birthday is hardware tour',
      narrative: [
        'Annual tour hardware stores.',
        '',
        'Three he loved.',
        '',
        'Walk aisles.',
        '',
        'Buy small.',
        '',
        'I tell hardware-mourners: annual tour.'
      ],
      lesson: 'Annual hardware store tours on deceased grandfathers birthdays continue place ritual extensively.'
    },
    {
      id: 'gn51_12',
      title: 'My friend died and her birthday is bookstore tour',
      narrative: [
        'Annual visit three bookstores.',
        '',
        'Buy book each.',
        '',
        'Books she would have read.',
        '',
        'I tell bookstore-mourners: annual tour.'
      ],
      lesson: 'Annual bookstore tours buying books deceased friends would have read continue taste extensively.'
    },
    {
      id: 'gn51_13',
      title: 'My uncle died and his birthday hiking trip',
      narrative: [
        'Annual hike his trail.',
        '',
        'Family walks.',
        '',
        'In his memory.',
        '',
        'Physical memorial.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased uncle favorite trails continue physical memorial.'
    },
    {
      id: 'gn51_14',
      title: 'My grandmother died and her birthday tea party',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'Continuing hospitality.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays continue hospitality tradition.'
    },
    {
      id: 'gn51_15',
      title: 'My grief made me a teacher',
      narrative: [
        'Suffering taught me.',
        '',
        'Now I teach others.',
        '',
        'Grief education work.',
        '',
        'I tell long-grievers: teach.'
      ],
      lesson: 'Long-term grief becomes teaching role; suffering teaches us to teach others.'
    }
  ];

  var GRIEF_NARRATIVES_52 = [
    {
      id: 'gn52_1',
      title: 'My partner died and his birthday is meal cook',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his favorite menus continue family table.'
    },
    {
      id: 'gn52_2',
      title: 'My mother died and her birthday is recipe sharing',
      narrative: [
        'Annual online recipe.',
        '',
        'Wider distribution.',
        '',
        'Strangers cook her.',
        '',
        'I tell recipe-sharers: annual.'
      ],
      lesson: 'Annual online recipe sharing on deceased mothers birthdays spread her recipes to strangers.'
    },
    {
      id: 'gn52_3',
      title: 'My grandfather died and his birthday is workshop class',
      narrative: [
        'Annual workshop class.',
        '',
        'Teach grandchildren skills.',
        '',
        'Continuing teaching.',
        '',
        'I tell teaching-mourners: annual.'
      ],
      lesson: 'Annual workshop classes teaching grandchildren deceased grandfather skills continue teaching legacy.'
    },
    {
      id: 'gn52_4',
      title: 'My friend died and her birthday is grave visit',
      narrative: [
        'Annual grave visit.',
        '',
        'Bring flowers.',
        '',
        'Sit and remember.',
        '',
        'I tell grave-mourners: annual.'
      ],
      lesson: 'Annual grave visits with flowers and remembering sit continue physical memorial place.'
    },
    {
      id: 'gn52_5',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes continue sport tradition.'
    },
    {
      id: 'gn52_6',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her patterns.',
        '',
        'Family handwork.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days from deceased grandmothers patterns continue handwork tradition.'
    },
    {
      id: 'gn52_7',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His favorite music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn52_8',
      title: 'My mother died and her birthday is library',
      narrative: [
        'Annual library visit.',
        '',
        'Her books.',
        '',
        'Read them.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits checking out deceased mothers favorite books continue reading legacy.'
    },
    {
      id: 'gn52_9',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'His recipes.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs on deceased grandfathers birthdays using his grill and recipes continue cooking.'
    },
    {
      id: 'gn52_10',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn52_11',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual camping his spot.',
        '',
        'Family fires.',
        '',
        'Stories.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots gather around fire for stories.'
    },
    {
      id: 'gn52_12',
      title: 'My grandmother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased grandmothers birthdays continue faith voices.'
    },
    {
      id: 'gn52_13',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn52_14',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual volunteer.',
        '',
        'Her cause.',
        '',
        'Service honors.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased mothers birthdays at her causes honor through service action.'
    },
    {
      id: 'gn52_15',
      title: 'My grief opened my heart',
      narrative: [
        'Loss broke me open.',
        '',
        'Heart wider after.',
        '',
        'Love more.',
        '',
        'I tell long-grievers: hearts open.'
      ],
      lesson: 'Loss breaks hearts open; long-term grief opens hearts wider to love more.'
    }
  ];

  var GRIEF_NARRATIVES_53 = [
    {
      id: 'gn53_1',
      title: 'My grandfather died and his birthday is fishing tournament',
      narrative: [
        'Annual fishing tournament.',
        '',
        'His memory.',
        '',
        'Family enters.',
        '',
        'Community gathers.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual fishing tournaments in deceased grandfathers memory gather family and community.'
    },
    {
      id: 'gn53_2',
      title: 'My friend died and her birthday potluck',
      narrative: [
        'Annual friend potluck.',
        '',
        'Bring her recipes.',
        '',
        'Stories shared.',
        '',
        'Friend group.',
        '',
        'I tell potluck-mourners: annual.'
      ],
      lesson: 'Annual friend potlucks on deceased friend birthdays bringing her recipes continue shared meal.'
    },
    {
      id: 'gn53_3',
      title: 'My uncle died and his birthday family hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Family walks aisles.',
        '',
        'Continue tradition.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware store visits on deceased uncle birthdays continue place tradition.'
    },
    {
      id: 'gn53_4',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Live music.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue live music memorial.'
    },
    {
      id: 'gn53_5',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family eats.',
        '',
        'Continuing.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual birthday cakes from deceased grandmothers recipes continue family tradition.'
    },
    {
      id: 'gn53_6',
      title: 'My mother died and her birthday garden plant',
      narrative: [
        'Annual planting.',
        '',
        'Her favorite flowers.',
        '',
        'Garden grows.',
        '',
        'I tell garden-mourners: annual.'
      ],
      lesson: 'Annual plantings on deceased mothers birthdays of favorite flowers grow garden memorial.'
    },
    {
      id: 'gn53_7',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends walk.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn53_8',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn53_9',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue family bowling tradition.'
    },
    {
      id: 'gn53_10',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his favorite menus continue family table.'
    },
    {
      id: 'gn53_11',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn53_12',
      title: 'My grandmother died and her birthday is canning',
      narrative: [
        'Annual canning day.',
        '',
        'Her tomato recipe.',
        '',
        'Family preserves.',
        '',
        'I tell canning-mourners: annual.'
      ],
      lesson: 'Annual canning days on deceased grandmothers birthdays preserve her tomato recipes family-style.'
    },
    {
      id: 'gn53_13',
      title: 'My friend died and her birthday is volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'In her name.',
        '',
        'Service honors.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased friends birthdays at her causes honor through service.'
    },
    {
      id: 'gn53_14',
      title: 'My uncle died and his birthday is camp',
      narrative: [
        'Annual camp his spot.',
        '',
        'Family fires.',
        '',
        'Stories told.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots gather for fire-side stories.'
    },
    {
      id: 'gn53_15',
      title: 'My grief gave me my deepest connections',
      narrative: [
        'Grief bonds people.',
        '',
        'Deepest connections.',
        '',
        'Made in loss.',
        '',
        'I tell long-grievers: bonds form.'
      ],
      lesson: 'Long-term grief creates deepest connections; bonds form in shared loss experience.'
    }
  ];

  var GRIEF_NARRATIVES_54 = [
    {
      id: 'gn54_1',
      title: 'My grandfather died and his birthday is family work day',
      narrative: [
        'Annual home repair.',
        '',
        'Family fixes house.',
        '',
        'Honor through hands work.',
        '',
        'I tell repair-families: annual.'
      ],
      lesson: 'Annual home repair days on deceased grandfathers birthdays gather family in hands work.'
    },
    {
      id: 'gn54_2',
      title: 'My mother died and her birthday is family cooking',
      narrative: [
        'Annual cooking day.',
        '',
        'Family contributes.',
        '',
        'Her recipes.',
        '',
        'Meal of memory.',
        '',
        'I tell cook-families: annual.'
      ],
      lesson: 'Annual family cooking days on deceased mothers birthdays from her recipes create memory meal.'
    },
    {
      id: 'gn54_3',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends read aloud.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friends continue voice memorial.'
    },
    {
      id: 'gn54_4',
      title: 'My uncle died and his birthday fishing trip',
      narrative: [
        'Annual full fishing day.',
        '',
        'His favorite lake.',
        '',
        'Family rods.',
        '',
        'Continuing.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual full fishing days at deceased uncle favorite lakes continue family sport tradition.'
    },
    {
      id: 'gn54_5',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Family kids decorate.',
        '',
        'Continuing.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking on deceased grandmothers birthdays with kids decorating continue family.'
    },
    {
      id: 'gn54_6',
      title: 'My partner died and his birthday is photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year together photos.',
        '',
        'Captions added.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays with year captions preserve relationship.'
    },
    {
      id: 'gn54_7',
      title: 'My grandfather died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Buy small.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn54_8',
      title: 'My mother died and her birthday is family meal',
      narrative: [
        'Annual full meal.',
        '',
        'Her holiday menu.',
        '',
        'Family gathered.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual family meals on deceased mothers birthdays cooking holiday menus continue tradition.'
    },
    {
      id: 'gn54_9',
      title: 'My friend died and her birthday is bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have.',
        '',
        'Read it.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue taste.'
    },
    {
      id: 'gn54_10',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual camping.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds continue camp tradition.'
    },
    {
      id: 'gn54_11',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Friends invited.',
        '',
        'I tell tea-mourners: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays continue hospitality through teacups.'
    },
    {
      id: 'gn54_12',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His favorite music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing together.'
    },
    {
      id: 'gn54_13',
      title: 'My mother died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists provide art memorial.'
    },
    {
      id: 'gn54_14',
      title: 'My grandfather died and his birthday hunting',
      narrative: [
        'Annual hunting trip.',
        '',
        'His spot.',
        '',
        'Family hunts.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips on deceased grandfathers favorite spots continue sport tradition.'
    },
    {
      id: 'gn54_15',
      title: 'My grief is gift and burden',
      narrative: [
        'Both true.',
        '',
        'Burden of loss.',
        '',
        'Gift of love.',
        '',
        'I tell long-grievers: both.'
      ],
      lesson: 'Long-term grief is both gift and burden; love and loss intertwined.'
    }
  ];

  var GRIEF_NARRATIVES_55 = [
    {
      id: 'gn55_1',
      title: 'My grandmother died and her birthday is recipe day',
      narrative: [
        'Annual recipe printing.',
        '',
        'New family member.',
        '',
        'Continuing distribution.',
        '',
        'I tell recipe-mourners: annual.'
      ],
      lesson: 'Annual recipe distributions on deceased grandmothers birthdays continue family legacy widely.'
    },
    {
      id: 'gn55_2',
      title: 'My friend died and her birthday is grave',
      narrative: [
        'Annual grave visit.',
        '',
        'Flowers brought.',
        '',
        'Stay an hour.',
        '',
        'I tell grave-mourners: annual.'
      ],
      lesson: 'Annual grave visits with flowers and an hour stay continue place memorial.'
    },
    {
      id: 'gn55_3',
      title: 'My partner died and his birthday photo print',
      narrative: [
        'Annual photo print.',
        '',
        'Year photos.',
        '',
        'Frame.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo printing on deceased partners birthdays preserve year together photos in frames.'
    },
    {
      id: 'gn55_4',
      title: 'My uncle died and his birthday is golf',
      narrative: [
        'Annual golf round.',
        '',
        'His course.',
        '',
        'His clubs.',
        '',
        'Family.',
        '',
        'I tell golf-mourners: annual.'
      ],
      lesson: 'Annual family golf rounds at deceased uncle favorite courses with his clubs continue sport.'
    },
    {
      id: 'gn55_5',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing day.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'Continuing.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn55_6',
      title: 'My grandfather died and his birthday is hardware project',
      narrative: [
        'Annual hardware project.',
        '',
        'Fix something.',
        '',
        'His tools.',
        '',
        'I tell project-mourners: annual.'
      ],
      lesson: 'Annual hardware projects on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn55_7',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friend groups continue voice memorial.'
    },
    {
      id: 'gn55_8',
      title: 'My grandmother died and her birthday is craft fair',
      narrative: [
        'Annual craft fair booth.',
        '',
        'Sell her crafts.',
        '',
        'In her honor.',
        '',
        'I tell craft-sellers: annual.'
      ],
      lesson: 'Annual craft fair booths selling deceased grandmothers crafts honor her teaching.'
    },
    {
      id: 'gn55_9',
      title: 'My uncle died and his birthday charity tournament',
      narrative: [
        'Annual charity tournament.',
        '',
        'His name.',
        '',
        'Community gathers.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual charity tournaments in deceased uncle names continue community gathering through sport.'
    },
    {
      id: 'gn55_10',
      title: 'My partner died and his birthday meal',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'Family or solo.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased partners birthdays from his favorite menus continue food tradition.'
    },
    {
      id: 'gn55_11',
      title: 'My mother died and her birthday is volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'Family service.',
        '',
        'In her honor.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays at her causes honor through action.'
    },
    {
      id: 'gn55_12',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue family sport tradition.'
    },
    {
      id: 'gn55_13',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'In her memory.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art appreciation memorial.'
    },
    {
      id: 'gn55_14',
      title: 'My uncle died and his birthday hike',
      narrative: [
        'Annual family hike.',
        '',
        'His trail.',
        '',
        'In his memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased uncle favorite trails continue physical memorial.'
    },
    {
      id: 'gn55_15',
      title: 'My grief continues and so do I',
      narrative: [
        'Both continue.',
        '',
        'Grief and life.',
        '',
        'Side by side.',
        '',
        'I tell long-grievers: both continue.'
      ],
      lesson: 'Grief and life continue side by side; both real, both present, both lived.'
    }
  ];

  var GRIEF_NARRATIVES_46 = [
    {
      id: 'gn46_1',
      title: 'My family pet died and we made memorial garden',
      narrative: [
        'Backyard memorial.',
        '',
        'Her favorite plants.',
        '',
        'Family visits.',
        '',
        'Living memorial.',
        '',
        'I tell pet-mourners: garden honors.'
      ],
      lesson: 'Backyard memorial gardens with pets favorite plants create living family memorial.'
    },
    {
      id: 'gn46_2',
      title: 'My grandmother died and her birthday recipe printing',
      narrative: [
        'Annual recipe print.',
        '',
        'New family copies.',
        '',
        'Continuing distribution.',
        '',
        'I tell distribute-mourners: annual.'
      ],
      lesson: 'Annual recipe printings continue distribution of deceased grandmothers cooking legacy.'
    },
    {
      id: 'gn46_3',
      title: 'My friend died and we keep her contact name',
      narrative: [
        'Group text still shows her name.',
        '',
        'Phantom presence.',
        '',
        'Cannot remove.',
        '',
        'I tell text-mourners: keep her.'
      ],
      lesson: 'Group text contacts of deceased friends remain phantom presences.'
    },
    {
      id: 'gn46_4',
      title: 'My uncle died and his stories I retell',
      narrative: [
        'Family gatherings.',
        '',
        'His stories.',
        '',
        'Retell with his gestures.',
        '',
        'Continuing.',
        '',
        'I tell story-bearers: retell.'
      ],
      lesson: 'Retelling deceased uncle stories with his gestures continues storyteller voice.'
    },
    {
      id: 'gn46_5',
      title: 'My mother died and her birthday is letter writing',
      narrative: [
        'Annual letter to her.',
        '',
        'Wedding news.',
        '',
        'Kids news.',
        '',
        'Year news.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased mothers tell year news maintain continuing conversation.'
    },
    {
      id: 'gn46_6',
      title: 'My grandfather died and his birthday workshop visit',
      narrative: [
        'Annual workshop visit.',
        '',
        'His shed.',
        '',
        'Use his tools.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual visits to deceased grandfathers workshops using his tools continue presence.'
    },
    {
      id: 'gn46_7',
      title: 'My partner died and his coffee mug rotation',
      narrative: [
        'His mugs in rotation.',
        '',
        'Use them weekly.',
        '',
        'Continuing morning ritual.',
        '',
        'I tell mug-mourners: rotation.'
      ],
      lesson: 'Mug rotation of deceased partners coffee mugs continues morning ritual variety.'
    },
    {
      id: 'gn46_8',
      title: 'My friend died and her favorite restaurant',
      narrative: [
        'Annual visit.',
        '',
        'Sit at our booth.',
        '',
        'Order her usual.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual restaurant visits at booths shared with deceased friends ordering her usual continue.'
    },
    {
      id: 'gn46_9',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual camping his spot.',
        '',
        'His tent.',
        '',
        'Family fires.',
        '',
        'I tell camping-mourners: annual.'
      ],
      lesson: 'Annual camping at deceased uncle favorite spots with his tent continue camp tradition.'
    },
    {
      id: 'gn46_10',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her crafts.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual craft days from deceased grandmothers patterns gather family in handwork.'
    },
    {
      id: 'gn46_11',
      title: 'My partner died and his birthday is photo album',
      narrative: [
        'Annual album.',
        '',
        'Year photos.',
        '',
        'Print and frame.',
        '',
        'I tell album-mourners: annual.'
      ],
      lesson: 'Annual photo albums on deceased partners birthdays preserve year photos in pages.'
    },
    {
      id: 'gn46_12',
      title: 'My mother died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased mothers favorite artists provide art memorial.'
    },
    {
      id: 'gn46_13',
      title: 'My grandfather died and his birthday hunting',
      narrative: [
        'Annual hunting trip.',
        '',
        'His spot.',
        '',
        'Family hunts together.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips on deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn46_14',
      title: 'My uncle died and his bowling ball',
      narrative: [
        'Inherited.',
        '',
        'Custom fit.',
        '',
        'Bowl with it.',
        '',
        'I tell bowling-inheritors: continue.'
      ],
      lesson: 'Inherited custom-fitted bowling balls continued by family continue uncles game.'
    },
    {
      id: 'gn46_15',
      title: 'My grief made me a better friend',
      narrative: [
        'Loss taught listening.',
        '',
        'Better friend now.',
        '',
        'Hold others pain.',
        '',
        'I tell long-grievers: become listeners.'
      ],
      lesson: 'Grief teaches deep listening; long-term grievers become better friends.'
    }
  ];

  var GRIEF_NARRATIVES_47 = [
    {
      id: 'gn47_1',
      title: 'My grandmother died and her embroidery hoops',
      narrative: [
        'Inherited hoops.',
        '',
        'Stitching now.',
        '',
        'Same patterns.',
        '',
        'I tell embroidery-inheritors: continue.'
      ],
      lesson: 'Inherited embroidery hoops with same patterns continue grandmothers handwork.'
    },
    {
      id: 'gn47_2',
      title: 'My partner died and his birthday is meal cook',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'I tell solo-cooks: annual meal.'
      ],
      lesson: 'Annual solo meal cooking of deceased partners favorite menus continue food tradition.'
    },
    {
      id: 'gn47_3',
      title: 'My mother died and her birthday cake recipe',
      narrative: [
        'Annual cake from her recipe.',
        '',
        'Family eats.',
        '',
        'Continuing.',
        '',
        'I tell cake-mourners: annual.'
      ],
      lesson: 'Annual cake from deceased mothers recipes continue family birthday tradition.'
    },
    {
      id: 'gn47_4',
      title: 'My grandfather died and his birthday family BBQ',
      narrative: [
        'Annual BBQ.',
        '',
        'His grill.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual family BBQs on deceased grandfathers birthdays using his grill continue cooking.'
    },
    {
      id: 'gn47_5',
      title: 'My friend died and her birthday pilgrimage',
      narrative: [
        'Annual visit her grave.',
        '',
        'Flowers brought.',
        '',
        'Stay an hour.',
        '',
        'I tell grave-mourners: annual.'
      ],
      lesson: 'Annual grave visits with flowers staying an hour continue place ritual.'
    },
    {
      id: 'gn47_6',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling with deceased uncle ball by family continues bowling memorial.'
    },
    {
      id: 'gn47_7',
      title: 'My grandmother died and her birthday is sewing',
      narrative: [
        'Annual sewing.',
        '',
        'Her machine.',
        '',
        'Make for family.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing on deceased grandmothers machine for family continues craft tradition.'
    },
    {
      id: 'gn47_8',
      title: 'My partner died and his birthday is donate',
      narrative: [
        'Annual donation.',
        '',
        'His cause.',
        '',
        'In his name.',
        '',
        'I tell donation-mourners: annual.'
      ],
      lesson: 'Annual donations to deceased partners causes in his name continue giving values.'
    },
    {
      id: 'gn47_9',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn47_10',
      title: 'My grandfather died and his birthday family hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Family walks aisles.',
        '',
        'Tradition continues.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware store visits on deceased grandfathers birthdays continue place tradition.'
    },
    {
      id: 'gn47_11',
      title: 'My friend died and her birthday is bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have.',
        '',
        'Continue her reading.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue taste.'
    },
    {
      id: 'gn47_12',
      title: 'My uncle died and his birthday is family camp',
      narrative: [
        'Annual camp.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite campgrounds continue fire tradition.'
    },
    {
      id: 'gn47_13',
      title: 'My grandmother died and her birthday is tea party',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Family gathered.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays continue hosting through teacups.'
    },
    {
      id: 'gn47_14',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Live music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn47_15',
      title: 'My grief made me grateful for what I had',
      narrative: [
        'Loss showed value.',
        '',
        'Gratitude for what was.',
        '',
        'Now precious memories.',
        '',
        'I tell long-grievers: gratitude.'
      ],
      lesson: 'Long-term grief reveals gratitude for what was; precious memories sustain.'
    }
  ];

  var GRIEF_NARRATIVES_48 = [
    {
      id: 'gn48_1',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual family volunteer.',
        '',
        'Her cause.',
        '',
        'Honor through action.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased mothers birthdays honor through family action.'
    },
    {
      id: 'gn48_2',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family casts.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers birthdays at his lake continue sport.'
    },
    {
      id: 'gn48_3',
      title: 'My friend died and her birthday is pilgrimage',
      narrative: [
        'Annual grave visit.',
        '',
        'Bring flowers.',
        '',
        'Stay an hour.',
        '',
        'I tell grave-mourners: annual.'
      ],
      lesson: 'Annual grave pilgrimages on deceased friends birthdays with flowers continue place memorial.'
    },
    {
      id: 'gn48_4',
      title: 'My uncle died and his birthday hiking',
      narrative: [
        'Annual hike.',
        '',
        'His mountain.',
        '',
        'Family walks.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased uncle favorite mountains continue physical memorial.'
    },
    {
      id: 'gn48_5',
      title: 'My grandmother died and her birthday is cooking',
      narrative: [
        'Annual full cook day.',
        '',
        'Her recipes.',
        '',
        'Family meal.',
        '',
        'I tell cook-mourners: annual.'
      ],
      lesson: 'Annual full cook days on deceased grandmothers recipes continue family meal tradition.'
    },
    {
      id: 'gn48_6',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn48_7',
      title: 'My mother died and her birthday garden',
      narrative: [
        'Annual planting.',
        '',
        'Her favorite flowers.',
        '',
        'Garden grows.',
        '',
        'I tell garden-mourners: annual.'
      ],
      lesson: 'Annual plantings on deceased mothers birthdays of favorite flowers grow garden memorial.'
    },
    {
      id: 'gn48_8',
      title: 'My grandfather died and his birthday is workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn48_9',
      title: 'My friend died and her birthday is movie',
      narrative: [
        'Annual movie night.',
        '',
        'Her favorite films.',
        '',
        'Friends gather.',
        '',
        'I tell movie-mourners: annual.'
      ],
      lesson: 'Annual movie nights of deceased friends favorites gather friends in shared viewing.'
    },
    {
      id: 'gn48_10',
      title: 'My uncle died and his birthday family fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing at deceased uncle favorite lakes continues sport memorial.'
    },
    {
      id: 'gn48_11',
      title: 'My grandmother died and her birthday is bake',
      narrative: [
        'Annual baking.',
        '',
        'Her recipes.',
        '',
        'Family kitchen.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual baking on deceased grandmothers birthdays from her recipes fill family kitchen.'
    },
    {
      id: 'gn48_12',
      title: 'My partner died and his birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell him year.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased partners on their birthdays maintain conversation.'
    },
    {
      id: 'gn48_13',
      title: 'My mother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her crafts.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days on deceased mothers crafts continue craft tradition.'
    },
    {
      id: 'gn48_14',
      title: 'My grandfather died and his birthday is family hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Family walks aisles.',
        '',
        'Continue place tradition.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual family hardware visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn48_15',
      title: 'My grief shaped my creative work',
      narrative: [
        'Loss became material.',
        '',
        'Writing about loss.',
        '',
        'Art from grief.',
        '',
        'Creative response.',
        '',
        'I tell creators: grief is material.'
      ],
      lesson: 'Grief becomes creative material; writing and art emerge from loss as response.'
    }
  ];

  var GRIEF_NARRATIVES_49 = [
    {
      id: 'gn49_1',
      title: 'My friend died and her birthday is gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'In her memory.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art memorial.'
    },
    {
      id: 'gn49_2',
      title: 'My uncle died and his birthday concert',
      narrative: [
        'Annual concert his favorite band.',
        '',
        'Live music.',
        '',
        'Tribute.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual concerts of deceased uncle favorite bands continue music memorial.'
    },
    {
      id: 'gn49_3',
      title: 'My grandmother died and her birthday tea party',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Family gathered.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays continue hosting tradition.'
    },
    {
      id: 'gn49_4',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'Solo or friends.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals from deceased partners favorite menus continue cooking ritual.'
    },
    {
      id: 'gn49_5',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn49_6',
      title: 'My grandfather died and his birthday is hunting',
      narrative: [
        'Annual hunting trip.',
        '',
        'His spot.',
        '',
        'Family hunts.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips at deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn49_7',
      title: 'My friend died and her birthday is bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have.',
        '',
        'Read it.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue taste.'
    },
    {
      id: 'gn49_8',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual fishing on deceased uncle birthdays at favorite lakes continue family sport.'
    },
    {
      id: 'gn49_9',
      title: 'My grandmother died and her birthday craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her crafts.',
        '',
        'Family handwork.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual family craft days on deceased grandmothers crafts continue handwork tradition.'
    },
    {
      id: 'gn49_10',
      title: 'My partner died and his birthday is photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year photos.',
        '',
        'Frame favorites.',
        '',
        'I tell photo-book mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays preserve year photos.'
    },
    {
      id: 'gn49_11',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn49_12',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn49_13',
      title: 'My friend died and her birthday poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends read aloud.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites by friend groups continue voice.'
    },
    {
      id: 'gn49_14',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual family camping.',
        '',
        'His campground.',
        '',
        'Continue camp.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds continue camp tradition.'
    },
    {
      id: 'gn49_15',
      title: 'My grief is part of how I love',
      narrative: [
        'Love and loss intertwined.',
        '',
        'Knowing loss possible.',
        '',
        'Love stronger.',
        '',
        'I tell deep-loving: grief shapes love.'
      ],
      lesson: 'Long-term grief intertwines with love; knowing loss possible shapes deeper loving.'
    }
  ];

  var GRIEF_NARRATIVES_50 = [
    {
      id: 'gn50_1',
      title: 'My final grief lesson: I survived',
      narrative: [
        'Did not think I would.',
        '',
        'Years out.',
        '',
        'Still here.',
        '',
        'Carrying loss.',
        '',
        'Living anyway.',
        '',
        'I tell new grievers: you will survive.'
      ],
      lesson: 'Grief survival is possible; years out, carrying loss, living anyway.'
    },
    {
      id: 'gn50_2',
      title: 'My grief integrated and I am whole',
      narrative: [
        'Whole again.',
        '',
        'Different but whole.',
        '',
        'Loss part of me.',
        '',
        'Not all of me.',
        '',
        'I tell long-grievers: wholeness.'
      ],
      lesson: 'Wholeness with integrated grief is possible; different but whole.'
    },
    {
      id: 'gn50_3',
      title: 'My grief made me wiser',
      narrative: [
        'Suffering taught.',
        '',
        'Wisdom from wound.',
        '',
        'Now help others.',
        '',
        'I tell long-grievers: wisdom is gift.'
      ],
      lesson: 'Long-term grief produces wisdom; suffering becomes ability to help others.'
    },
    {
      id: 'gn50_4',
      title: 'My grief deepened my faith',
      narrative: [
        'Faith tested.',
        '',
        'Faith deepened.',
        '',
        'Spiritual response.',
        '',
        'I tell faith-tested: grief can deepen.'
      ],
      lesson: 'Grief tests but can deepen faith; spiritual response strengthens through loss.'
    },
    {
      id: 'gn50_5',
      title: 'My grief shaped my compassion',
      narrative: [
        'Suffering taught compassion.',
        '',
        'Strangers might be grieving.',
        '',
        'Gentle with them.',
        '',
        'I tell long-grievers: compassion grows.'
      ],
      lesson: 'Long-term grief grows compassion for strangers who might also be grieving.'
    },
    {
      id: 'gn50_6',
      title: 'My grief connects me to all who grieve',
      narrative: [
        'Universal experience.',
        '',
        'All humans grieve.',
        '',
        'Connection through loss.',
        '',
        'I tell long-grievers: universal connection.'
      ],
      lesson: 'Grief is universal human experience connecting all who have loved and lost.'
    },
    {
      id: 'gn50_7',
      title: 'My grief led me to grief work',
      narrative: [
        'Became grief counselor.',
        '',
        'My loss became my work.',
        '',
        'Wounded healer.',
        '',
        'I tell career-changed: profession can shift.'
      ],
      lesson: 'Grief experience can shift career to grief counseling; wounded healer paradigm.'
    },
    {
      id: 'gn50_8',
      title: 'My grief gave me unexpected friends',
      narrative: [
        'Grief group bonds.',
        '',
        'Strangers became family.',
        '',
        'Chosen family in loss.',
        '',
        'I tell grief-group members: bonds form.'
      ],
      lesson: 'Grief groups create unexpected chosen family through shared loss bonds.'
    },
    {
      id: 'gn50_9',
      title: 'My grief made each moment precious',
      narrative: [
        'Loss taught preciousness.',
        '',
        'Each moment matters.',
        '',
        'Live presently.',
        '',
        'I tell long-grievers: presence.'
      ],
      lesson: 'Grief teaches preciousness of moments; loss inspires present living.'
    },
    {
      id: 'gn50_10',
      title: 'My grief continues but life is good',
      narrative: [
        'Years out.',
        '',
        'Grief continues.',
        '',
        'Life is good.',
        '',
        'Both true.',
        '',
        'I tell long-grievers: both true.'
      ],
      lesson: 'Long-term grief continues alongside good life; both true forever.'
    },
    {
      id: 'gn50_11',
      title: 'My grief inheritance is love continuing',
      narrative: [
        'Love did not die.',
        '',
        'Just changed form.',
        '',
        'Continuing bond.',
        '',
        'I tell long-grievers: love continues.'
      ],
      lesson: 'Love does not die with the loved one; bond continues in changed form.'
    },
    {
      id: 'gn50_12',
      title: 'My grief teaches the next generation',
      narrative: [
        'Tell my children.',
        '',
        'About loss.',
        '',
        'About grief.',
        '',
        'About love.',
        '',
        'I tell parent-grievers: teach.'
      ],
      lesson: 'Parents teaching children about grief and love prepare generation for inevitable loss.'
    },
    {
      id: 'gn50_13',
      title: 'My grief returns at unexpected times',
      narrative: [
        'Triggered by smells.',
        '',
        'Songs.',
        '',
        'Anniversaries.',
        '',
        'Unexpected dates.',
        '',
        'I tell long-grievers: waves continue.'
      ],
      lesson: 'Long-term grief returns in waves at unexpected times; smells, songs, dates trigger.'
    },
    {
      id: 'gn50_14',
      title: 'My grief is woven into my life',
      narrative: [
        'Not over.',
        '',
        'Not gone.',
        '',
        'Woven into life.',
        '',
        'Daily presence.',
        '',
        'I tell long-grievers: woven.'
      ],
      lesson: 'Long-term grief is woven into daily life; not over but woven through.'
    },
    {
      id: 'gn50_15',
      title: 'My final word: love',
      narrative: [
        'Grief is love.',
        '',
        'With nowhere to go.',
        '',
        'Or love with new direction.',
        '',
        'Continuing.',
        '',
        'I tell all grievers: grief is love.'
      ],
      lesson: 'Grief is love with nowhere to go, or love taking new direction; continuing always.'
    }
  ];

  var GRIEF_NARRATIVES_41 = [
    {
      id: 'gn41_1',
      title: 'My mother died and her hand cream is on my nightstand',
      narrative: [
        'Her hand cream.',
        '',
        'Smell sometimes.',
        '',
        'Years after.',
        '',
        'Scent of her hands.',
        '',
        'I tell scent-mourners: bottle holds.'
      ],
      lesson: 'Saved hand cream of deceased mothers holds scent of their hands years after.'
    },
    {
      id: 'gn41_2',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ.',
        '',
        'His grill.',
        '',
        'His recipes.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs with deceased grandfathers grill and recipes gather family in his cooking.'
    },
    {
      id: 'gn41_3',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His favorite music.',
        '',
        'Body remembers dancing.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays continue dancing body memory.'
    },
    {
      id: 'gn41_4',
      title: 'My friend died and her favorite restaurant menu',
      narrative: [
        'Annual dinner her restaurant.',
        '',
        'Order her usual.',
        '',
        'Same booth.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual dinners at deceased friends favorite restaurants ordering her usual continue.'
    },
    {
      id: 'gn41_5',
      title: 'My uncle died and his bowling team continues',
      narrative: [
        'Team carries on.',
        '',
        'His locker held.',
        '',
        'Memorial spot.',
        '',
        'I tell team-mourners: spot held.'
      ],
      lesson: 'Bowling teams continuing keep deceased uncle locker as memorial spot.'
    },
    {
      id: 'gn41_6',
      title: 'My grandmother died and her tablecloth',
      narrative: [
        'Special meal cloth.',
        '',
        'Anniversaries holidays.',
        '',
        'Continuing presence.',
        '',
        'I tell cloth-mourners: special meals.'
      ],
      lesson: 'Special tablecloths of deceased grandmothers cover anniversary and holiday meals continuing presence.'
    },
    {
      id: 'gn41_7',
      title: 'My mother died and her favorite movie weekly',
      narrative: [
        'Watch her favorite movie.',
        '',
        'Weekly evening.',
        '',
        'Continuing her time.',
        '',
        'I tell weekly-mourners: ritual.'
      ],
      lesson: 'Weekly viewing of deceased mothers favorite movies continues her evening preference.'
    },
    {
      id: 'gn41_8',
      title: 'My grandfather died and his hunting boots',
      narrative: [
        'Heavy work boots.',
        '',
        'Inherited.',
        '',
        'Wear hunting.',
        '',
        'Continuing his trail.',
        '',
        'I tell boot-inheritors: continue.'
      ],
      lesson: 'Inherited hunting boots worn hunting continue deceased grandfathers trail walking.'
    },
    {
      id: 'gn41_9',
      title: 'My partner died and his birthday is silence',
      narrative: [
        'Annual silent day.',
        '',
        'No phones.',
        '',
        'Just memory.',
        '',
        'Quiet honor.',
        '',
        'I tell silent-mourners: annual.'
      ],
      lesson: 'Annual silent days on deceased partners birthdays honor through quiet memory time.'
    },
    {
      id: 'gn41_10',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Read aloud.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites read aloud gather friend group.'
    },
    {
      id: 'gn41_11',
      title: 'My uncle died and his hat collection at home',
      narrative: [
        'Many hats.',
        '',
        'On display.',
        '',
        'Wear rotating.',
        '',
        'I tell hat-collectors: continue.'
      ],
      lesson: 'Rotating wear of inherited hat collections provides ongoing tribute through head wear.'
    },
    {
      id: 'gn41_12',
      title: 'My grandmother died and her tablecloth annual',
      narrative: [
        'Annual Thanksgiving cloth.',
        '',
        'Family meal cover.',
        '',
        'Each year same.',
        '',
        'I tell cloth-mourners: annual.'
      ],
      lesson: 'Annual Thanksgiving tablecloths of deceased grandmothers continue family meal traditions.'
    },
    {
      id: 'gn41_13',
      title: 'My mother died and her birthday is meal cooking',
      narrative: [
        'Annual full meal.',
        '',
        'Her holiday menu.',
        '',
        'Family eats.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meals on deceased mothers birthdays cooking holiday menus continue family table.'
    },
    {
      id: 'gn41_14',
      title: 'My grandfather died and his birthday is church',
      narrative: [
        'Annual church service.',
        '',
        'His congregation.',
        '',
        'Sit in his pew.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual church services at deceased grandfathers congregations sitting in his pew continue.'
    },
    {
      id: 'gn41_15',
      title: 'My grief made me a witness for others',
      narrative: [
        'Witness to grief now.',
        '',
        'Others share with me.',
        '',
        'Hold their pain.',
        '',
        'I tell grief-witnesses: presence helps.'
      ],
      lesson: 'Long-term grievers become witnesses for others; presence holds shared pain.'
    }
  ];

  var GRIEF_NARRATIVES_42 = [
    {
      id: 'gn42_1',
      title: 'My grandmother died and her birthday is baking',
      narrative: [
        'Annual bake day.',
        '',
        'Her recipes.',
        '',
        'Family contributes.',
        '',
        'House full of scent.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual family bake days from deceased grandmothers recipes fill house with scent.'
    },
    {
      id: 'gn42_2',
      title: 'My friend died and her favorite hike continues',
      narrative: [
        'Annual hike her trail.',
        '',
        'Friends gather.',
        '',
        'In her memory.',
        '',
        'Walk her path.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails walked by friends continue path memory.'
    },
    {
      id: 'gn42_3',
      title: 'My partner died and his birthday photo print',
      narrative: [
        'Annual best photo print.',
        '',
        'Year together.',
        '',
        'Frame.',
        '',
        'Hang wall.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual best photo prints framed and hung continue year-together legacy on walls.'
    },
    {
      id: 'gn42_4',
      title: 'My uncle died and his birthday family fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family rods cast.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at his lake with tackle continue legacy.'
    },
    {
      id: 'gn42_5',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Her hymns.',
        '',
        'Family attends.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual family church visits sitting in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn42_6',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop project.',
        '',
        'Build something.',
        '',
        'His tools.',
        '',
        'Continuing.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop projects on deceased grandfathers birthdays continue hands work tradition.'
    },
    {
      id: 'gn42_7',
      title: 'My friend died and her favorite bookstore visit',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have.',
        '',
        'Read it.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue taste.'
    },
    {
      id: 'gn42_8',
      title: 'My grandmother died and her birthday tea party',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Family gathered.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hosting.'
    },
    {
      id: 'gn42_9',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn42_10',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual family camp.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite campgrounds continue fire tradition.'
    },
    {
      id: 'gn42_11',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'Service honors.',
        '',
        'Family participates.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays honor causes she loved.'
    },
    {
      id: 'gn42_12',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual fishing on deceased grandfathers birthdays at his lake continues sport tradition.'
    },
    {
      id: 'gn42_13',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'In her memory.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art appreciation.'
    },
    {
      id: 'gn42_14',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue sport memorial.'
    },
    {
      id: 'gn42_15',
      title: 'My grief is integrated into who I am',
      narrative: [
        'Years out.',
        '',
        'Grief part of me.',
        '',
        'Not all of me.',
        '',
        'Integrated.',
        '',
        'I tell long-grievers: integrated.'
      ],
      lesson: 'Long-term grief integrated into identity; part not whole.'
    }
  ];

  var GRIEF_NARRATIVES_43 = [
    {
      id: 'gn43_1',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual cake her recipe.',
        '',
        'Family eats.',
        '',
        'Continuing.',
        '',
        'I tell cake-bakers: annual.'
      ],
      lesson: 'Annual birthday cake from deceased grandmothers recipes continues family ritual.'
    },
    {
      id: 'gn43_2',
      title: 'My uncle died and his birthday is family camp',
      narrative: [
        'Annual camping.',
        '',
        'His spot.',
        '',
        'Family gathered.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots continue camp legacy.'
    },
    {
      id: 'gn43_3',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual visit.',
        '',
        'His favorite restaurant.',
        '',
        'Order his usual.',
        '',
        'I tell solo-diners: annual.'
      ],
      lesson: 'Annual solo dinners ordering deceased partners usual at favorite restaurants continue.'
    },
    {
      id: 'gn43_4',
      title: 'My friend died and her birthday is poetry',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends gather.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites among friends continue voice.'
    },
    {
      id: 'gn43_5',
      title: 'My mother died and her birthday library',
      narrative: [
        'Annual library visit.',
        '',
        'Books she loved.',
        '',
        'Check out and read.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits checking out deceased mothers favorite books continue reading.'
    },
    {
      id: 'gn43_6',
      title: 'My grandfather died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual fishing on deceased grandfathers favorite lakes continue family fishing tradition.'
    },
    {
      id: 'gn43_7',
      title: 'My uncle died and his birthday workshop',
      narrative: [
        'Annual workshop project.',
        '',
        'His tools.',
        '',
        'Family builds.',
        '',
        'I tell workshop-families: annual.'
      ],
      lesson: 'Annual workshop projects on deceased uncle birthdays gather family in hands work.'
    },
    {
      id: 'gn43_8',
      title: 'My grandmother died and her birthday is craft',
      narrative: [
        'Annual craft day.',
        '',
        'Her crafts.',
        '',
        'Family makes.',
        '',
        'I tell craft-mourners: annual.'
      ],
      lesson: 'Annual craft days from deceased grandmothers patterns gather family in handwork.'
    },
    {
      id: 'gn43_9',
      title: 'My partner died and his birthday photo album',
      narrative: [
        'Annual album.',
        '',
        'Year photos.',
        '',
        'Print and frame.',
        '',
        'I tell photo-album mourners: annual.'
      ],
      lesson: 'Annual photo albums on deceased partners birthdays preserve year together photos.'
    },
    {
      id: 'gn43_10',
      title: 'My mother died and her birthday recipe sharing',
      narrative: [
        'Annual online recipe share.',
        '',
        'Wider distribution.',
        '',
        'Strangers cook her.',
        '',
        'I tell recipe-sharers: annual.'
      ],
      lesson: 'Annual online recipe sharing of deceased mothers recipes spread to strangers continue distribution.'
    },
    {
      id: 'gn43_11',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Friends gather.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails by friend groups continue physical memorial.'
    },
    {
      id: 'gn43_12',
      title: 'My grandfather died and his birthday is hardware',
      narrative: [
        'Annual hardware store visit.',
        '',
        'Walk aisles.',
        '',
        'Buy small item.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn43_13',
      title: 'My uncle died and his birthday is golf',
      narrative: [
        'Annual golf.',
        '',
        'His course.',
        '',
        'His clubs.',
        '',
        'Family rounds.',
        '',
        'I tell golf-mourners: annual.'
      ],
      lesson: 'Annual family golf rounds at deceased uncle favorite courses with his clubs continue sport.'
    },
    {
      id: 'gn43_14',
      title: 'My grandmother died and her birthday recipe',
      narrative: [
        'Annual recipe distribution.',
        '',
        'New family member.',
        '',
        'Continuing legacy.',
        '',
        'I tell recipe-distributors: annual.'
      ],
      lesson: 'Annual recipe distribution on deceased grandmothers birthdays to new family continue legacy.'
    },
    {
      id: 'gn43_15',
      title: 'My grief is bearable now',
      narrative: [
        'Years out.',
        '',
        'Grief still present.',
        '',
        'But bearable.',
        '',
        'Life continues.',
        '',
        'I tell new grievers: bearable comes.'
      ],
      lesson: 'Long-term grief becomes bearable; present but workable in life continuing.'
    }
  ];

  var GRIEF_NARRATIVES_44 = [
    {
      id: 'gn44_1',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual visit.',
        '',
        'His favorite spot.',
        '',
        'Order his usual.',
        '',
        'I tell solo-diners: annual.'
      ],
      lesson: 'Annual solo dinners at deceased partners favorite restaurants ordering usual continue place ritual.'
    },
    {
      id: 'gn44_2',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'Family service.',
        '',
        'Honor through action.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays honor through action.'
    },
    {
      id: 'gn44_3',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes continue sport.'
    },
    {
      id: 'gn44_4',
      title: 'My grandmother died and her birthday cookies',
      narrative: [
        'Annual cookie baking.',
        '',
        'Family kids decorate.',
        '',
        'House full of scent.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking on deceased grandmothers birthdays with kids gather kitchen scent.'
    },
    {
      id: 'gn44_5',
      title: 'My grandfather died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk aisles.',
        '',
        'Continue.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn44_6',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'Continue.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists continue art appreciation.'
    },
    {
      id: 'gn44_7',
      title: 'My partner died and his birthday is dinner',
      narrative: [
        'Annual restaurant.',
        '',
        'Order his usual.',
        '',
        'Solo or friends.',
        '',
        'I tell dinner-mourners: annual.'
      ],
      lesson: 'Annual dinners on deceased partners birthdays at favorite restaurants continue place memory.'
    },
    {
      id: 'gn44_8',
      title: 'My uncle died and his birthday bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue bowling memorial.'
    },
    {
      id: 'gn44_9',
      title: 'My mother died and her birthday is sewing',
      narrative: [
        'Annual sewing day.',
        '',
        'Her machine.',
        '',
        'Make for grandchildren.',
        '',
        'Continuing.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn44_10',
      title: 'My grandmother died and her birthday tea',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Family gathered.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties on deceased grandmothers birthdays with her teacups continue hosting.'
    },
    {
      id: 'gn44_11',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Build something.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop building on deceased grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn44_12',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell her year news.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual birthday letters to deceased friends maintain conversational continuing bond.'
    },
    {
      id: 'gn44_13',
      title: 'My uncle died and his birthday camp',
      narrative: [
        'Annual camping.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle campgrounds continue fire tradition.'
    },
    {
      id: 'gn44_14',
      title: 'My partner died and his birthday concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'Live music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music memorial.'
    },
    {
      id: 'gn44_15',
      title: 'My grief is integrated and life is rich',
      narrative: [
        'Years out.',
        '',
        'Grief integrated.',
        '',
        'Life rich.',
        '',
        'Both true.',
        '',
        'I tell long-grievers: richness with grief.'
      ],
      lesson: 'Life rich alongside integrated grief; both true in long-term mourning.'
    }
  ];

  var GRIEF_NARRATIVES_45 = [
    {
      id: 'gn45_1',
      title: 'My mother died and her birthday family meal',
      narrative: [
        'Annual full meal.',
        '',
        'Her holiday menu.',
        '',
        'Family gathers.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual family meals on deceased mothers birthdays cooking holiday menus continue table.'
    },
    {
      id: 'gn45_2',
      title: 'My grandfather died and his birthday is project',
      narrative: [
        'Annual home project.',
        '',
        'Family fixes house.',
        '',
        'His honor.',
        '',
        'Hands work tradition.',
        '',
        'I tell project-mourners: annual.'
      ],
      lesson: 'Annual home project days on deceased grandfathers birthdays continue family hands work.'
    },
    {
      id: 'gn45_3',
      title: 'My friend died and her birthday is poetry reading',
      narrative: [
        'Annual poetry reading.',
        '',
        'Her favorites.',
        '',
        'Friends read aloud.',
        '',
        'I tell poetry-mourners: annual.'
      ],
      lesson: 'Annual poetry readings of deceased friends favorites read aloud by friend groups continue.'
    },
    {
      id: 'gn45_4',
      title: 'My uncle died and his birthday fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual fishing on deceased uncle birthdays at his lake with his tackle continue.'
    },
    {
      id: 'gn45_5',
      title: 'My grandmother died and her birthday hike',
      narrative: [
        'Annual hike.',
        '',
        'Her trail.',
        '',
        'Family walks.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased grandmothers favorite trails continue family physical memorial.'
    },
    {
      id: 'gn45_6',
      title: 'My partner died and his birthday is photo print',
      narrative: [
        'Annual photo print.',
        '',
        'Year together.',
        '',
        'Frame and hang.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photographically.'
    },
    {
      id: 'gn45_7',
      title: 'My mother died and her birthday hymn',
      narrative: [
        'Annual hymn singing.',
        '',
        'Her favorites.',
        '',
        'Family voices.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices.'
    },
    {
      id: 'gn45_8',
      title: 'My grandfather died and his birthday fishing day',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'Family rods cast.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased grandfathers favorite lakes continue sport tradition.'
    },
    {
      id: 'gn45_9',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell her everything.',
        '',
        'Year in review.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual letters to deceased friends on their birthdays maintain conversational bond.'
    },
    {
      id: 'gn45_10',
      title: 'My uncle died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'His tools.',
        '',
        'Family builds.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop days on deceased uncle birthdays gather family in hands work.'
    },
    {
      id: 'gn45_11',
      title: 'My grandmother died and her birthday is bake-off',
      narrative: [
        'Annual family bake-off.',
        '',
        'Her recipes.',
        '',
        'Best wins.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual family bake-offs on deceased grandmothers birthdays using her recipes continue family.'
    },
    {
      id: 'gn45_12',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn45_13',
      title: 'My mother died and her birthday volunteer',
      narrative: [
        'Annual service.',
        '',
        'Her cause.',
        '',
        'Family participates.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual family volunteer service on deceased mothers birthdays honor causes through action.'
    },
    {
      id: 'gn45_14',
      title: 'My grandfather died and his birthday is hardware',
      narrative: [
        'Annual hardware visit.',
        '',
        'Walk his aisles.',
        '',
        'Buy something small.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays buy small items in memory.'
    },
    {
      id: 'gn45_15',
      title: 'My grief deepened my faith in life',
      narrative: [
        'Loss tested faith.',
        '',
        'Faith deepened.',
        '',
        'Life precious.',
        '',
        'Each moment.',
        '',
        'I tell faith-tested: deepens.'
      ],
      lesson: 'Grief tests but can deepen faith in life; each moment precious through awareness.'
    }
  ];

  var GRIEF_NARRATIVES_36 = [
    {
      id: 'gn36_1',
      title: 'My partner died and his birthday is gym day',
      narrative: [
        'His favorite gym.',
        '',
        'Annual workout there.',
        '',
        'On his birthday.',
        '',
        'Continuing his exercise.',
        '',
        'I tell gym-mourners: annual.'
      ],
      lesson: 'Annual workouts at deceased partners favorite gyms continue exercise tradition.'
    },
    {
      id: 'gn36_2',
      title: 'My mother died and her birthday is church visit',
      narrative: [
        'Annual church visit.',
        '',
        'Her church.',
        '',
        'Sit in her pew.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual church visits sitting in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn36_3',
      title: 'My grandfather died and his birthday is library visit',
      narrative: [
        'Annual library his birthday.',
        '',
        'Check out books he read.',
        '',
        'Continuing reading.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits checking out grandfather books continue his reading.'
    },
    {
      id: 'gn36_4',
      title: 'My uncle died and his birthday is family fishing',
      narrative: [
        'Annual family fishing.',
        '',
        'Lake he loved.',
        '',
        'Rods cast.',
        '',
        'I tell fishing-families: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays at favorite lakes cast in his honor.'
    },
    {
      id: 'gn36_5',
      title: 'My grandmother died and her birthday is craft fair',
      narrative: [
        'Annual craft fair.',
        '',
        'Sell crafts she taught me.',
        '',
        'In her honor.',
        '',
        'I tell craft-sellers: annual.'
      ],
      lesson: 'Annual craft fairs selling crafts deceased grandmothers taught honor their teaching.'
    },
    {
      id: 'gn36_6',
      title: 'My friend died and her favorite bookstore',
      narrative: [
        'Annual visit.',
        '',
        'Buy book she would have read.',
        '',
        'Read it.',
        '',
        'Continuing.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue.'
    },
    {
      id: 'gn36_7',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'His favorite restaurant.',
        '',
        'Annual dinner alone.',
        '',
        'Order his usual.',
        '',
        'I tell solo-diners: annual.'
      ],
      lesson: 'Annual solo dinners at deceased partners favorite restaurants ordering his usual continue.'
    },
    {
      id: 'gn36_8',
      title: 'My grandfather died and his birthday is BBQ',
      narrative: [
        'Annual BBQ.',
        '',
        'His grill.',
        '',
        'Family gathered.',
        '',
        'Stories shared.',
        '',
        'I tell BBQ-families: annual.'
      ],
      lesson: 'Annual BBQs on deceased grandfathers birthdays using his grill gather family for stories.'
    },
    {
      id: 'gn36_9',
      title: 'My mother died and her birthday is volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'Animal shelter.',
        '',
        'Family service.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased mothers birthdays at causes continue values.'
    },
    {
      id: 'gn36_10',
      title: 'My uncle died and his birthday is bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His shoes.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his equipment honor sport memorial.'
    },
    {
      id: 'gn36_11',
      title: 'My grandmother died and her birthday cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family eats.',
        '',
        'Continuing.',
        '',
        'I tell cake-bakers: annual.'
      ],
      lesson: 'Annual cake baking from deceased grandmothers recipes continue family tradition.'
    },
    {
      id: 'gn36_12',
      title: 'My friend died and her birthday hike',
      narrative: [
        'Annual hike her trail.',
        '',
        'Friends gather.',
        '',
        'In her memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails continue physical memorial.'
    },
    {
      id: 'gn36_13',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual tribute concert.',
        '',
        'His favorite band.',
        '',
        'I attend.',
        '',
        'Music memorial.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual tribute concerts of deceased partners favorite bands continue music love.'
    },
    {
      id: 'gn36_14',
      title: 'My grandfather died and his birthday is workshop',
      narrative: [
        'Annual workshop.',
        '',
        'Build something.',
        '',
        'His tools.',
        '',
        'Continuing hands work.',
        '',
        'I tell workshop-mourners: annual building.'
      ],
      lesson: 'Annual workshop building on grandfathers birthdays with his tools continue hands work.'
    },
    {
      id: 'gn36_15',
      title: 'My grief made me kinder to strangers',
      narrative: [
        'Suffering taught compassion.',
        '',
        'Strangers might be grieving.',
        '',
        'Gentle with them.',
        '',
        'I tell long-grievers: kindness extends.'
      ],
      lesson: 'Long-term grief extends kindness to strangers who might be grieving silently.'
    }
  ];

  var GRIEF_NARRATIVES_37 = [
    {
      id: 'gn37_1',
      title: 'My mother died and her birthday is library day',
      narrative: [
        'Annual library visit.',
        '',
        'Her favorite books.',
        '',
        'Read them.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library visits read deceased mothers favorite books continuing reading.'
    },
    {
      id: 'gn37_2',
      title: 'My grandfather died and his birthday is restoration',
      narrative: [
        'Annual restoration project.',
        '',
        'Old item fixed.',
        '',
        'In his honor.',
        '',
        'Hands work.',
        '',
        'I tell restoration-mourners: annual.'
      ],
      lesson: 'Annual restoration projects on deceased grandfathers birthdays continue hands work.'
    },
    {
      id: 'gn37_3',
      title: 'My friend died and her birthday gallery',
      narrative: [
        'Annual gallery visit.',
        '',
        'Her favorite artists.',
        '',
        'In her memory.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits on deceased friends birthdays to favorite artists continue art love.'
    },
    {
      id: 'gn37_4',
      title: 'My uncle died and his birthday is family camp',
      narrative: [
        'Annual camp.',
        '',
        'His favorite spot.',
        '',
        'Family gathers.',
        '',
        'Fire and stories.',
        '',
        'I tell camp-mourners: annual.'
      ],
      lesson: 'Annual family camp at deceased uncle favorite spots continues fire-story tradition.'
    },
    {
      id: 'gn37_5',
      title: 'My grandmother died and her birthday is potluck',
      narrative: [
        'Annual potluck.',
        '',
        'Her recipes.',
        '',
        'Family contributes.',
        '',
        'Meal of her.',
        '',
        'I tell potluck-mourners: annual.'
      ],
      lesson: 'Annual potlucks on deceased grandmothers birthdays with her recipes gather family in meal.'
    },
    {
      id: 'gn37_6',
      title: 'My partner died and his birthday is donate',
      narrative: [
        'Annual donation his cause.',
        '',
        'In his name.',
        '',
        'Continuing his giving.',
        '',
        'I tell donation-mourners: annual.'
      ],
      lesson: 'Annual donations to deceased partners causes in his name continue his giving.'
    },
    {
      id: 'gn37_7',
      title: 'My mother died and her birthday cookie bake',
      narrative: [
        'Annual cookie baking.',
        '',
        'Kids decorate.',
        '',
        'House smells like her.',
        '',
        'I tell cookie-mourners: annual.'
      ],
      lesson: 'Annual cookie baking with kids on deceased mothers birthdays gather kitchen in scent.'
    },
    {
      id: 'gn37_8',
      title: 'My grandfather died and his birthday is fishing',
      narrative: [
        'Annual fishing.',
        '',
        'His lake.',
        '',
        'His tackle.',
        '',
        'Family rods.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual fishing on deceased grandfathers birthdays at his lake with his tackle continue.'
    },
    {
      id: 'gn37_9',
      title: 'My friend died and her birthday letter',
      narrative: [
        'Annual letter.',
        '',
        'On her birthday.',
        '',
        'Tell her year news.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual birthday letters to deceased friends tell year news maintain conversation.'
    },
    {
      id: 'gn37_10',
      title: 'My uncle died and his birthday photo album',
      narrative: [
        'Annual photo album.',
        '',
        'Year photos.',
        '',
        'Print and frame.',
        '',
        'Annual gift to him.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo albums on deceased uncle birthdays print year photos as gifts.'
    },
    {
      id: 'gn37_11',
      title: 'My grandmother died and her birthday tea party',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Family gathered.',
        '',
        'Continuing hosting.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties with deceased grandmothers teacups continue family hosting tradition.'
    },
    {
      id: 'gn37_12',
      title: 'My partner died and his birthday dance',
      narrative: [
        'Annual dance evening.',
        '',
        'His favorite music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember dancing.'
    },
    {
      id: 'gn37_13',
      title: 'My mother died and her birthday is family movie',
      narrative: [
        'Annual movie night.',
        '',
        'Her favorite films.',
        '',
        'Family gathered.',
        '',
        'I tell movie-mourners: annual.'
      ],
      lesson: 'Annual family movie nights on deceased mothers birthdays watch favorites together.'
    },
    {
      id: 'gn37_14',
      title: 'My grandfather died and his birthday workshop class',
      narrative: [
        'Annual class.',
        '',
        'Teach grandkids his skill.',
        '',
        'Continuing teaching.',
        '',
        'I tell teaching-mourners: annual.'
      ],
      lesson: 'Annual classes teaching grandkids deceased grandfathers skills continue teaching legacy.'
    },
    {
      id: 'gn37_15',
      title: 'My grief gave me unlikely friends',
      narrative: [
        'Met in grief group.',
        '',
        'Different ages, lives.',
        '',
        'Bonded in loss.',
        '',
        'Unexpected friendships.',
        '',
        'I tell grief-group members: bonds form.'
      ],
      lesson: 'Grief groups create unlikely friendships across age and background through shared loss.'
    }
  ];

  var GRIEF_NARRATIVES_38 = [
    {
      id: 'gn38_1',
      title: 'My uncle died and his fishing pole stays in my truck',
      narrative: [
        'Truck cab pole.',
        '',
        'Ready always.',
        '',
        'Continuing his readiness.',
        '',
        'I tell truck-mourners: tools ready.'
      ],
      lesson: 'Keeping deceased uncle fishing pole in truck cab continues readiness to fish.'
    },
    {
      id: 'gn38_2',
      title: 'My grandmother died and her birthday is canning',
      narrative: [
        'Annual canning day.',
        '',
        'Tomatoes she canned.',
        '',
        'Same recipe.',
        '',
        'Family preserves.',
        '',
        'I tell canning-mourners: annual.'
      ],
      lesson: 'Annual canning days on deceased grandmothers birthdays preserve same recipes family-style.'
    },
    {
      id: 'gn38_3',
      title: 'My partner died and his desk drawer',
      narrative: [
        'Drawer of his desk.',
        '',
        'Untouched.',
        '',
        'Open sometimes.',
        '',
        'Look at his things.',
        '',
        'I tell desk-keepers: sacred drawer.'
      ],
      lesson: 'Untouched desk drawers of deceased partners hold sacred items for occasional viewing.'
    },
    {
      id: 'gn38_4',
      title: 'My mother died and her birthday is meal cooking',
      narrative: [
        'Annual full meal.',
        '',
        'Her holiday menu.',
        '',
        'Family eats.',
        '',
        'Continuing meal.',
        '',
        'I tell meal-mourners: annual.'
      ],
      lesson: 'Annual full meal cooking from deceased mothers holiday menus continue family table.'
    },
    {
      id: 'gn38_5',
      title: 'My grandfather died and his bird feeder lives',
      narrative: [
        'His bird feeder.',
        '',
        'In my yard now.',
        '',
        'Same seed.',
        '',
        'Birds continue.',
        '',
        'I tell feeder-inheritors: continue feeding.'
      ],
      lesson: 'Inherited bird feeders kept stocked continue deceased grandfathers bird watching.'
    },
    {
      id: 'gn38_6',
      title: 'My friend died and her birthday is donation',
      narrative: [
        'Annual donation her cause.',
        '',
        'In her name.',
        '',
        'Continuing giving.',
        '',
        'I tell donation-mourners: annual.'
      ],
      lesson: 'Annual donations to deceased friends causes in her name continue giving values.'
    },
    {
      id: 'gn38_7',
      title: 'My uncle died and his birthday fishing tournament',
      narrative: [
        'Annual fishing tournament.',
        '',
        'In his memory.',
        '',
        'Family enters.',
        '',
        'Prizes from his estate.',
        '',
        'I tell tournament-mourners: annual.'
      ],
      lesson: 'Annual fishing tournaments in deceased uncle memory continue community gathering through sport.'
    },
    {
      id: 'gn38_8',
      title: 'My grandmother died and her birthday is family hike',
      narrative: [
        'Annual family hike.',
        '',
        'Trail she loved.',
        '',
        'In her memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual family hikes on deceased grandmothers birthdays at her favorite trails continue.'
    },
    {
      id: 'gn38_9',
      title: 'My partner died and his birthday is photo print',
      narrative: [
        'Annual print best photo.',
        '',
        'Year together.',
        '',
        'Frame and hang.',
        '',
        'I tell photo-mourners: annual.'
      ],
      lesson: 'Annual photo prints on deceased partners birthdays preserve year together photos.'
    },
    {
      id: 'gn38_10',
      title: 'My mother died and her birthday is sewing day',
      narrative: [
        'Annual sewing day.',
        '',
        'Her sewing machine.',
        '',
        'Make something.',
        '',
        'Continuing her craft.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing days on deceased mothers birthdays use her machine continuing craft.'
    },
    {
      id: 'gn38_11',
      title: 'My grandfather died and his old map collection',
      narrative: [
        'Inherited his maps.',
        '',
        'Frame and hang.',
        '',
        'His travels visible.',
        '',
        'I tell map-inheritors: frame.'
      ],
      lesson: 'Inherited maps of deceased grandfathers framed display their travels visibly.'
    },
    {
      id: 'gn38_12',
      title: 'My uncle died and his birthday family BBQ',
      narrative: [
        'Annual BBQ his grill.',
        '',
        'His recipes.',
        '',
        'Family gathered.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs using deceased uncle grill and recipes gather family in his cooking.'
    },
    {
      id: 'gn38_13',
      title: 'My grandmother died and her favorite hymn',
      narrative: [
        'Played at her funeral.',
        '',
        'Now I play it on her birthday.',
        '',
        'Solo annual.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Playing favorite hymns of deceased grandmothers annually on birthdays continues faith.'
    },
    {
      id: 'gn38_14',
      title: 'My partner died and his birthday is restaurant visit',
      narrative: [
        'Annual visit.',
        '',
        'His favorite restaurant.',
        '',
        'Same waiter remembers.',
        '',
        'Annual ritual.',
        '',
        'I tell restaurant-mourners: annual.'
      ],
      lesson: 'Annual visits to deceased partners favorite restaurants with same waiters continue ritual.'
    },
    {
      id: 'gn38_15',
      title: 'My grief made me more present',
      narrative: [
        'Loss taught me to be here.',
        '',
        'Each moment.',
        '',
        'Present focus.',
        '',
        'Gift of grief.',
        '',
        'I tell long-grievers: presence is gift.'
      ],
      lesson: 'Grief teaches presence; each moment becomes precious through loss awareness.'
    }
  ];

  var GRIEF_NARRATIVES_39 = [
    {
      id: 'gn39_1',
      title: 'My mother died and her birthday is sewing project',
      narrative: [
        'Annual project on her machine.',
        '',
        'Make for grandchildren.',
        '',
        'Continuing.',
        '',
        'I tell sewing-mourners: annual.'
      ],
      lesson: 'Annual sewing projects on deceased mothers machines for grandchildren continue craft.'
    },
    {
      id: 'gn39_2',
      title: 'My grandfather died and his birthday is fishing pond',
      narrative: [
        'Annual visit his pond.',
        '',
        'His rod.',
        '',
        'His lures.',
        '',
        'Family fishes.',
        '',
        'I tell pond-mourners: annual.'
      ],
      lesson: 'Annual fishing on deceased grandfathers favorite ponds with his equipment continue legacy.'
    },
    {
      id: 'gn39_3',
      title: 'My friend died and her birthday is volunteer work',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'In her name.',
        '',
        'Service honors.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased friends birthdays at her causes honor through action.'
    },
    {
      id: 'gn39_4',
      title: 'My uncle died and his birthday is bowling',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his ball continue bowling memorial.'
    },
    {
      id: 'gn39_5',
      title: 'My grandmother died and her birthday is canning',
      narrative: [
        'Annual canning.',
        '',
        'Tomatoes preserved.',
        '',
        'Family pantry.',
        '',
        'I tell canning-mourners: annual.'
      ],
      lesson: 'Annual canning on deceased grandmothers birthdays preserve tomatoes for family pantry.'
    },
    {
      id: 'gn39_6',
      title: 'My partner died and his birthday is restaurant',
      narrative: [
        'Annual dinner.',
        '',
        'His favorite restaurant.',
        '',
        'Solo or with friends.',
        '',
        'I tell dinner-mourners: annual.'
      ],
      lesson: 'Annual dinners at deceased partners favorite restaurants solo or with friends continue place.'
    },
    {
      id: 'gn39_7',
      title: 'My mother died and her birthday is church',
      narrative: [
        'Annual church visit.',
        '',
        'Her pew.',
        '',
        'Her favorite hymns.',
        '',
        'I tell church-mourners: annual.'
      ],
      lesson: 'Annual church visits sitting in deceased mothers pews continue faith ritual.'
    },
    {
      id: 'gn39_8',
      title: 'My grandfather died and his birthday is project day',
      narrative: [
        'Annual home project.',
        '',
        'Family fixes house.',
        '',
        'In his honor.',
        '',
        'I tell project-mourners: annual.'
      ],
      lesson: 'Annual home project days on deceased grandfathers birthdays gather family in hands work.'
    },
    {
      id: 'gn39_9',
      title: 'My friend died and her birthday is letter',
      narrative: [
        'Annual letter.',
        '',
        'Tell her everything.',
        '',
        'Continuing conversation.',
        '',
        'I tell letter-mourners: annual.'
      ],
      lesson: 'Annual birthday letters to deceased friends maintain conversational connection.'
    },
    {
      id: 'gn39_10',
      title: 'My uncle died and his birthday camping',
      narrative: [
        'Annual camping.',
        '',
        'His tent.',
        '',
        'His campground.',
        '',
        'Family fires.',
        '',
        'I tell camping-mourners: annual.'
      ],
      lesson: 'Annual camping on deceased uncle birthdays with his tent at his campground continue.'
    },
    {
      id: 'gn39_11',
      title: 'My grandmother died and her birthday is bake',
      narrative: [
        'Annual baking day.',
        '',
        'Her recipes.',
        '',
        'Family contributes.',
        '',
        'I tell bake-mourners: annual.'
      ],
      lesson: 'Annual family bake days from deceased grandmothers recipes gather kitchen in scent.'
    },
    {
      id: 'gn39_12',
      title: 'My partner died and his birthday is concert',
      narrative: [
        'Annual concert.',
        '',
        'His favorite band.',
        '',
        'Live music.',
        '',
        'I tell concert-mourners: annual.'
      ],
      lesson: 'Annual concerts of deceased partners favorite bands continue live music tradition.'
    },
    {
      id: 'gn39_13',
      title: 'My mother died and her birthday garden plant',
      narrative: [
        'Annual planting.',
        '',
        'New plant her birthday.',
        '',
        'Garden grows.',
        '',
        'I tell garden-mourners: annual.'
      ],
      lesson: 'Annual plantings on deceased mothers birthdays grow garden as living memorial.'
    },
    {
      id: 'gn39_14',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop.',
        '',
        'Build something.',
        '',
        'His tools.',
        '',
        'I tell workshop-mourners: annual.'
      ],
      lesson: 'Annual workshop building on deceased grandfathers birthdays continue hands work.'
    },
    {
      id: 'gn39_15',
      title: 'My grief became service to others',
      narrative: [
        'Suffering taught me.',
        '',
        'Service is my response.',
        '',
        'Help other grievers.',
        '',
        'I tell service-mourners: help others.'
      ],
      lesson: 'Grief becomes service through helping other grievers; suffering teaches service response.'
    }
  ];

  var GRIEF_NARRATIVES_40 = [
    {
      id: 'gn40_1',
      title: 'My friend died and her birthday is pilgrimage',
      narrative: [
        'Annual visit her grave.',
        '',
        'Bring flowers.',
        '',
        'Sit and remember.',
        '',
        'I tell grave-mourners: annual.'
      ],
      lesson: 'Annual grave visits with flowers on deceased friends birthdays continue place ritual.'
    },
    {
      id: 'gn40_2',
      title: 'My grandmother died and her birthday recipe shared',
      narrative: [
        'Share recipes online her birthday.',
        '',
        'Strangers cook her food.',
        '',
        'Wider reach.',
        '',
        'I tell recipe-sharers: annual.'
      ],
      lesson: 'Annual online recipe sharing on deceased grandmothers birthdays spread recipes widely.'
    },
    {
      id: 'gn40_3',
      title: 'My partner died and his birthday is photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year together photos.',
        '',
        'Captions of life.',
        '',
        'I tell photo-book mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased partners birthdays preserve year together with captions.'
    },
    {
      id: 'gn40_4',
      title: 'My uncle died and his birthday bike ride',
      narrative: [
        'Annual bike ride.',
        '',
        'His route.',
        '',
        'Family rides.',
        '',
        'I tell ride-mourners: annual.'
      ],
      lesson: 'Annual family bike rides on deceased uncle routes continue cycling memorial.'
    },
    {
      id: 'gn40_5',
      title: 'My grandfather died and his birthday is hardware',
      narrative: [
        'Annual hardware store visit.',
        '',
        'Walk aisles.',
        '',
        'Buy small item.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on deceased grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn40_6',
      title: 'My mother died and her birthday hymn singing',
      narrative: [
        'Annual hymn singing.',
        '',
        'Family gathers.',
        '',
        'Her favorite hymns.',
        '',
        'I tell hymn-mourners: annual.'
      ],
      lesson: 'Annual family hymn singing on deceased mothers birthdays continue faith voices together.'
    },
    {
      id: 'gn40_7',
      title: 'My friend died and her birthday is movie night',
      narrative: [
        'Annual movie night.',
        '',
        'Her favorite films.',
        '',
        'Friends gather.',
        '',
        'I tell movie-mourners: annual.'
      ],
      lesson: 'Annual movie nights of deceased friends favorites gather friends in shared watching.'
    },
    {
      id: 'gn40_8',
      title: 'My grandmother died and her birthday party',
      narrative: [
        'Annual birthday party.',
        '',
        'Family gathers.',
        '',
        'Her favorite cake.',
        '',
        'Honor through gathering.',
        '',
        'I tell party-mourners: annual.'
      ],
      lesson: 'Annual birthday parties for deceased grandmothers gather family for cake and honor.'
    },
    {
      id: 'gn40_9',
      title: 'My uncle died and his birthday charity match',
      narrative: [
        'Annual donation.',
        '',
        'His cause.',
        '',
        'Yearly gift.',
        '',
        'Continuing giving.',
        '',
        'I tell charity-mourners: annual.'
      ],
      lesson: 'Annual charity donations on deceased uncle birthdays to his causes continue giving values.'
    },
    {
      id: 'gn40_10',
      title: 'My partner died and his birthday is meal',
      narrative: [
        'Annual full meal.',
        '',
        'His favorite menu.',
        '',
        'I tell solo-mourners: annual.'
      ],
      lesson: 'Annual full meals cooked from deceased partners favorite menus continue cooking ritual.'
    },
    {
      id: 'gn40_11',
      title: 'My mother died and her birthday gallery visit',
      narrative: [
        'Annual gallery.',
        '',
        'Her favorite artists.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual.'
      ],
      lesson: 'Annual gallery visits on deceased mothers birthdays to favorite artists memorial through art.'
    },
    {
      id: 'gn40_12',
      title: 'My grandfather died and his birthday is hunting',
      narrative: [
        'Annual hunting trip.',
        '',
        'His favorite spot.',
        '',
        'Family hunts together.',
        '',
        'I tell hunting-mourners: annual.'
      ],
      lesson: 'Annual family hunting trips on deceased grandfathers favorite spots continue sport memorial.'
    },
    {
      id: 'gn40_13',
      title: 'My friend died and her birthday bookstore',
      narrative: [
        'Annual visit her bookstore.',
        '',
        'Buy book she would have.',
        '',
        'Read it.',
        '',
        'I tell bookstore-mourners: annual.'
      ],
      lesson: 'Annual bookstore visits buying books deceased friends would have read continue her taste.'
    },
    {
      id: 'gn40_14',
      title: 'My uncle died and his birthday fishing day',
      narrative: [
        'Annual fishing.',
        '',
        'His pole.',
        '',
        'His lake.',
        '',
        'Family casts.',
        '',
        'I tell fishing-mourners: annual.'
      ],
      lesson: 'Annual family fishing on deceased uncle birthdays with his equipment continue ritual.'
    },
    {
      id: 'gn40_15',
      title: 'My grief opened me to deeper love',
      narrative: [
        'Loss taught vulnerability.',
        '',
        'Now love more openly.',
        '',
        'Knowing loss possible.',
        '',
        'I tell long-grievers: love opens.'
      ],
      lesson: 'Grief opens to deeper love through learned vulnerability; knowing loss is possible.'
    }
  ];

  var GRIEF_NARRATIVES_31 = [
    {
      id: 'gn31_1',
      title: 'My family pet died after long life',
      narrative: [
        '17 years with us.',
        '',
        'Full pet life.',
        '',
        'Peaceful end.',
        '',
        'Grief still full.',
        '',
        'I tell long-life pets: grief is real.'
      ],
      lesson: 'Long-lived pet deaths still produce full grief despite full life.'
    },
    {
      id: 'gn31_2',
      title: 'My friend died and her ceramics are mine',
      narrative: [
        'She was a potter.',
        '',
        'Pieces I inherited.',
        '',
        'Use daily.',
        '',
        'Her craft sustains.',
        '',
        'I tell ceramic-inheritors: daily use.'
      ],
      lesson: 'Daily use of inherited ceramics by potter friends sustains their craft in homes.'
    },
    {
      id: 'gn31_3',
      title: 'My grandfather died and his beard is style I keep',
      narrative: [
        'Grew beard after he died.',
        '',
        'Same shape.',
        '',
        'See him in mirror.',
        '',
        'I tell beard-growers: continuing style.'
      ],
      lesson: 'Growing beards like deceased grandfathers continues bodily resemblance grief.'
    },
    {
      id: 'gn31_4',
      title: 'My partner died and his suit hangs in closet',
      narrative: [
        'Wedding suit.',
        '',
        'In closet.',
        '',
        'Cannot give away.',
        '',
        'Some objects sacred.',
        '',
        'I tell suit-keepers: keep sacred.'
      ],
      lesson: 'Keeping wedding suits of deceased partners is sacred grief practice; some objects untouched.'
    },
    {
      id: 'gn31_5',
      title: 'My mother died and her glasses are on bookshelf',
      narrative: [
        'Her old reading glasses.',
        '',
        'On bookshelf with photos.',
        '',
        'Daily glance.',
        '',
        'I tell glasses-keepers: shelf display.'
      ],
      lesson: 'Display of deceased loved ones glasses on bookshelves provides daily glance memorial.'
    },
    {
      id: 'gn31_6',
      title: 'My uncle died and his birthday is hike day',
      narrative: [
        'Mountain he loved.',
        '',
        'Annual family hike.',
        '',
        'In his memory.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased uncle birthdays at favorite mountains continue tradition.'
    },
    {
      id: 'gn31_7',
      title: 'My grandmother died and her birthday is hat day',
      narrative: [
        'She loved hats.',
        '',
        'Family wears hats annually her birthday.',
        '',
        'Each chooses style.',
        '',
        'Visible honor.',
        '',
        'I tell hat-mourners: family hats.'
      ],
      lesson: 'Family hat days on deceased grandmothers birthdays visibly honor her style love.'
    },
    {
      id: 'gn31_8',
      title: 'My friend died and her favorite flowers bloom annual',
      narrative: [
        'Daffodils she loved.',
        '',
        'Planted in her honor.',
        '',
        'Annual spring bloom.',
        '',
        'I tell flower-mourners: spring announces.'
      ],
      lesson: 'Daffodils planted in honor of deceased friends announce them every spring.'
    },
    {
      id: 'gn31_9',
      title: 'My partner died and his car runs',
      narrative: [
        'His car.',
        '',
        'I drive it sometimes.',
        '',
        'Engine he serviced.',
        '',
        'His maintenance continues.',
        '',
        'I tell car-keepers: drive sometimes.'
      ],
      lesson: 'Driving inherited cars sometimes continues deceased partners maintenance and care.'
    },
    {
      id: 'gn31_10',
      title: 'My grandfather died and his garden tools age',
      narrative: [
        'Old wooden handles.',
        '',
        'Inherited.',
        '',
        'Use daily in garden.',
        '',
        'Worn hands fit them.',
        '',
        'I tell garden-tool inheritors: continue use.'
      ],
      lesson: 'Daily use of inherited garden tools with worn wooden handles continues hands work.'
    },
    {
      id: 'gn31_11',
      title: 'My mother died and her birthday is friend dinner',
      narrative: [
        'Her closest friends.',
        '',
        'Annual dinner.',
        '',
        'On her birthday.',
        '',
        'Stories shared.',
        '',
        'I tell friend-dinner: annual gathering.'
      ],
      lesson: 'Annual dinners with deceased mothers closest friends gather memory around table.'
    },
    {
      id: 'gn31_12',
      title: 'My uncle died and his birthday is golf game',
      narrative: [
        'Annual golf in his honor.',
        '',
        'Same course.',
        '',
        'His favorite clubs.',
        '',
        'Family rounds.',
        '',
        'I tell golf-mourners: annual game.'
      ],
      lesson: 'Annual golf rounds with deceased uncle equipment at favorite courses honor sport.'
    },
    {
      id: 'gn31_13',
      title: 'My grandmother died and her birthday is teacup day',
      narrative: [
        'Annual tea party.',
        '',
        'Her teacups.',
        '',
        'Family gathered.',
        '',
        'Continuing her tea hosting.',
        '',
        'I tell tea-party hosts: annual.'
      ],
      lesson: 'Annual tea parties with inherited teacups continue deceased grandmothers hosting tradition.'
    },
    {
      id: 'gn31_14',
      title: 'My friend died and we run her memorial race',
      narrative: [
        'Annual 5K her memory.',
        '',
        'Family organized.',
        '',
        '500 runners.',
        '',
        'Continuing presence.',
        '',
        'I tell race-mourners: annual run.'
      ],
      lesson: 'Annual memorial 5K races organized by family continue deceased friends presence.'
    },
    {
      id: 'gn31_15',
      title: 'My grief integrated and beauty continues',
      narrative: [
        'Years out.',
        '',
        'Grief integrated.',
        '',
        'Beauty continues alongside.',
        '',
        'Both real.',
        '',
        'I tell long-grievers: beauty returns.'
      ],
      lesson: 'Long-term grief integrated alongside continuing beauty; both real in life.'
    }
  ];

  var GRIEF_NARRATIVES_32 = [
    {
      id: 'gn32_1',
      title: 'My partner died and his birthday celebrate his life',
      narrative: [
        'Annual gathering of friends and family.',
        '',
        'Stories of his life.',
        '',
        'Photos shared.',
        '',
        'Celebrate his impact.',
        '',
        'I tell life-celebrants: annual gathering.'
      ],
      lesson: 'Annual life-celebration gatherings on deceased partners birthdays continue impact stories.'
    },
    {
      id: 'gn32_2',
      title: 'My mother died and her birthday cake recipe',
      narrative: [
        'Her birthday cake.',
        '',
        'Bake on her birthday.',
        '',
        'Family eats.',
        '',
        'Annual tradition.',
        '',
        'I tell cake-bakers: annual recipe.'
      ],
      lesson: 'Annual birthday cake baking from deceased mothers recipes sustains family tradition.'
    },
    {
      id: 'gn32_3',
      title: 'My grandfather died and his birthday is hardware store visit',
      narrative: [
        'He loved hardware stores.',
        '',
        'Annual visit on his birthday.',
        '',
        'Walk aisles.',
        '',
        'Buy small item.',
        '',
        'I tell hardware-mourners: annual visit.'
      ],
      lesson: 'Annual hardware store visits on grandfathers birthdays continue place ritual.'
    },
    {
      id: 'gn32_4',
      title: 'My friend died and her favorite ice cream is annual',
      narrative: [
        'Mint chip her favorite.',
        '',
        'Eat annually her birthday.',
        '',
        'Memorial scoop.',
        '',
        'I tell ice-cream mourners: annual scoop.'
      ],
      lesson: 'Annual ice cream scoops of deceased friends favorite flavors provide memorial ritual.'
    },
    {
      id: 'gn32_5',
      title: 'My uncle died and his old guitar plays',
      narrative: [
        'Inherited his guitar.',
        '',
        'Learned to play.',
        '',
        'Family parties guitar nights.',
        '',
        'I tell instrument-inheritors: learn play.'
      ],
      lesson: 'Inherited guitars learned by descendants continue family party music.'
    },
    {
      id: 'gn32_6',
      title: 'My grandmother died and her recipe cards',
      narrative: [
        'Box of recipe cards.',
        '',
        'Handwritten.',
        '',
        'I copy and cook.',
        '',
        'Handwriting continues.',
        '',
        'I tell recipe-card inheritors: cook from cards.'
      ],
      lesson: 'Cooking from handwritten recipe cards of deceased grandmothers continues handwriting.'
    },
    {
      id: 'gn32_7',
      title: 'My partner died and his coffee shop weekly',
      narrative: [
        'Cafe we frequented.',
        '',
        'I go weekly.',
        '',
        'Sit at our table.',
        '',
        'Order his usual.',
        '',
        'I tell weekly-mourners: continued visit.'
      ],
      lesson: 'Weekly cafe visits to shared coffee shops continue ritual of partnership.'
    },
    {
      id: 'gn32_8',
      title: 'My mother died and her birthday is library day',
      narrative: [
        'She loved library.',
        '',
        'Annual library visit her birthday.',
        '',
        'Check out books she loved.',
        '',
        'I tell library-mourners: annual visit.'
      ],
      lesson: 'Annual library visits on deceased mothers birthdays check out her favorite books.'
    },
    {
      id: 'gn32_9',
      title: 'My grandfather died and his birthday is hardware project',
      narrative: [
        'Annual project on his birthday.',
        '',
        'Build something.',
        '',
        'In his honor.',
        '',
        'Continuing his hands work.',
        '',
        'I tell project-mourners: annual building.'
      ],
      lesson: 'Annual building projects on deceased grandfathers birthdays continue hands work.'
    },
    {
      id: 'gn32_10',
      title: 'My friend died and her favorite scarf is mine',
      narrative: [
        'Wool scarf she wore.',
        '',
        'I wear winters.',
        '',
        'Around neck.',
        '',
        'Continuing her warmth.',
        '',
        'I tell scarf-inheritors: winter wear.'
      ],
      lesson: 'Inherited scarves worn in winter continue deceased friends warmth around neck.'
    },
    {
      id: 'gn32_11',
      title: 'My uncle died and his fishing knot lives',
      narrative: [
        'He taught me knot.',
        '',
        'I teach my kids.',
        '',
        'Knot continues.',
        '',
        'Generations.',
        '',
        'I tell knot-teachers: continue teaching.'
      ],
      lesson: 'Teaching deceased uncle fishing knots to children continues generational fishing knowledge.'
    },
    {
      id: 'gn32_12',
      title: 'My grandmother died and her favorite cookies',
      narrative: [
        'Snickerdoodle her recipe.',
        '',
        'Bake monthly.',
        '',
        'House smells like her.',
        '',
        'I tell cookie-mourners: monthly bake.'
      ],
      lesson: 'Monthly baking of deceased grandmothers cookie recipes fills house with their scent.'
    },
    {
      id: 'gn32_13',
      title: 'My partner died and his birthday is photo print',
      narrative: [
        'Annual photo print.',
        '',
        'Best photo of year together.',
        '',
        'Frame it.',
        '',
        'Annual photo legacy.',
        '',
        'I tell photo-printers: annual frame.'
      ],
      lesson: 'Annual photo printing of best photos with deceased partners builds frame legacy.'
    },
    {
      id: 'gn32_14',
      title: 'My mother died and her hospital chaplain knew her',
      narrative: [
        'Chaplain visited her end.',
        '',
        'Knew her last days.',
        '',
        'I visit chaplain sometimes.',
        '',
        'Bond formed in care.',
        '',
        'I tell hospital-mourners: chaplain bond.'
      ],
      lesson: 'Hospital chaplains who cared for dying parents form bond with bereaved children.'
    },
    {
      id: 'gn32_15',
      title: 'My grandfather died and his birthday is family work day',
      narrative: [
        'Annual house repair on his birthday.',
        '',
        'Family fixes something.',
        '',
        'In his honor.',
        '',
        'Continuing hands work.',
        '',
        'I tell repair-families: annual project.'
      ],
      lesson: 'Annual house repair days on grandfathers birthdays gather family in hands work.'
    }
  ];

  var GRIEF_NARRATIVES_33 = [
    {
      id: 'gn33_1',
      title: 'My friend died and her favorite blanket is mine',
      narrative: [
        'Inherited her favorite blanket.',
        '',
        'Wrap up under it.',
        '',
        'Continuing her comfort.',
        '',
        'I tell blanket-inheritors: wrap up.'
      ],
      lesson: 'Inherited blankets wrapped under continue deceased friends comfort body presence.'
    },
    {
      id: 'gn33_2',
      title: 'My grandmother died and her birthday is recipe day',
      narrative: [
        'Print her recipes annually.',
        '',
        'New ones found in her things.',
        '',
        'Family cookbook expands.',
        '',
        'I tell cookbook-makers: annual additions.'
      ],
      lesson: 'Annual additions to family cookbooks from newly found recipes expand deceased grandmother legacy.'
    },
    {
      id: 'gn33_3',
      title: 'My uncle died and his pickup truck restored',
      narrative: [
        'Inherited pickup.',
        '',
        'Restored over years.',
        '',
        'Drive proudly.',
        '',
        'Continuing his work.',
        '',
        'I tell truck-restorers: continuing.'
      ],
      lesson: 'Inherited pickup trucks restored over years continue deceased uncles work proudly.'
    },
    {
      id: 'gn33_4',
      title: 'My partner died and his birthday is silence day',
      narrative: [
        'Silent day each year.',
        '',
        'No phones.',
        '',
        'Just memory.',
        '',
        'Quiet honor.',
        '',
        'I tell silent-mourners: annual quiet.'
      ],
      lesson: 'Annual silent days on deceased partners birthdays honor through quiet memory time.'
    },
    {
      id: 'gn33_5',
      title: 'My mother died and her shoes are in closet',
      narrative: [
        'Her shoes in closet.',
        '',
        'I wear sometimes.',
        '',
        'Same size.',
        '',
        'Walk in her shoes.',
        '',
        'I tell shoe-inheritors: walk.'
      ],
      lesson: 'Wearing deceased mothers shoes literalizes walking in their footsteps.'
    },
    {
      id: 'gn33_6',
      title: 'My grandfather died and his coffee grinds smell',
      narrative: [
        'Old coffee grinder.',
        '',
        'Inherited.',
        '',
        'Use daily.',
        '',
        'Smells like his kitchen.',
        '',
        'I tell grinder-inheritors: use daily.'
      ],
      lesson: 'Daily use of inherited coffee grinders continues deceased grandfathers kitchen scent.'
    },
    {
      id: 'gn33_7',
      title: 'My friend died and her favorite bookstore visit',
      narrative: [
        'Bookstore we frequented.',
        '',
        'I visit alone.',
        '',
        'Touch books she would have read.',
        '',
        'I tell bookstore-mourners: solo visit.'
      ],
      lesson: 'Solo bookstore visits to shared favorite shops touch books deceased friends would have read.'
    },
    {
      id: 'gn33_8',
      title: 'My uncle died and his birthday is bar visit',
      narrative: [
        'Annual visit to his favorite bar.',
        '',
        'Order his drink.',
        '',
        'Bartender remembers.',
        '',
        'Annual ritual.',
        '',
        'I tell bar-mourners: annual.'
      ],
      lesson: 'Annual bar visits on deceased uncle birthdays ordering his drink continue place ritual.'
    },
    {
      id: 'gn33_9',
      title: 'My grandmother died and her birthday is craft day',
      narrative: [
        'Annual craft day.',
        '',
        'Family crochets together.',
        '',
        'Her hooks distributed.',
        '',
        'In her honor.',
        '',
        'I tell craft-families: annual.'
      ],
      lesson: 'Annual craft days on deceased grandmothers birthdays gather family in handwork.'
    },
    {
      id: 'gn33_10',
      title: 'My partner died and his birthday is dance',
      narrative: [
        'He loved to dance.',
        '',
        'Annual dance evening.',
        '',
        'His favorite music.',
        '',
        'Body remembers.',
        '',
        'I tell dance-mourners: annual.'
      ],
      lesson: 'Annual dance evenings on deceased partners birthdays let bodies remember their dancing.'
    },
    {
      id: 'gn33_11',
      title: 'My mother died and her favorite hike continues',
      narrative: [
        'Trail she loved.',
        '',
        'Annual family hike.',
        '',
        'On her birthday.',
        '',
        'Continuing.',
        '',
        'I tell trail-mourners: annual hike.'
      ],
      lesson: 'Annual hikes on trails deceased mothers loved continue family physical memorial.'
    },
    {
      id: 'gn33_12',
      title: 'My grandfather died and his fishing photos line wall',
      narrative: [
        'Photos of his catches.',
        '',
        'Frames on wall.',
        '',
        'Daily presence.',
        '',
        'I tell photo-display: hobby photos.'
      ],
      lesson: 'Framed photos of grandfathers fishing catches on walls provide daily hobby memorial.'
    },
    {
      id: 'gn33_13',
      title: 'My friend died and her favorite quote is on mug',
      narrative: [
        'Custom mug with her quote.',
        '',
        'Coffee daily.',
        '',
        'Her words morning.',
        '',
        'I tell quote-mourners: mug daily.'
      ],
      lesson: 'Custom mugs with deceased friends favorite quotes provide daily morning word memorial.'
    },
    {
      id: 'gn33_14',
      title: 'My uncle died and his birthday is family camp',
      narrative: [
        'Annual camping trip.',
        '',
        'His favorite campground.',
        '',
        'Family fires together.',
        '',
        'In his honor.',
        '',
        'I tell camping-families: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite campgrounds continue camp tradition.'
    },
    {
      id: 'gn33_15',
      title: 'My grandmother died and her recipe binder lives',
      narrative: [
        'Three-ring binder.',
        '',
        'Inherited.',
        '',
        'Add new family recipes.',
        '',
        'Growing legacy.',
        '',
        'I tell recipe-binders: keep adding.'
      ],
      lesson: 'Inherited recipe binders growing with new family recipes extend deceased grandmother legacy.'
    }
  ];

  var GRIEF_NARRATIVES_34 = [
    {
      id: 'gn34_1',
      title: 'My partner died and his backyard tools',
      narrative: [
        'Garden tools he owned.',
        '',
        'I use them.',
        '',
        'Same plot.',
        '',
        'Continuing his garden.',
        '',
        'I tell tool-inheritors: continue.'
      ],
      lesson: 'Inherited garden tools used in same plot continue deceased partners garden work.'
    },
    {
      id: 'gn34_2',
      title: 'My mother died and her favorite hymn at church',
      narrative: [
        'Church plays her hymn.',
        '',
        'On her birthday.',
        '',
        'Family attends together.',
        '',
        'Continuing faith.',
        '',
        'I tell hymn-mourners: annual hymn.'
      ],
      lesson: 'Annual hymn singing at church on deceased mothers birthdays continue family faith ritual.'
    },
    {
      id: 'gn34_3',
      title: 'My grandfather died and his birthday is project day',
      narrative: [
        'Annual home project.',
        '',
        'Family fixes house.',
        '',
        'In his memory.',
        '',
        'Hands work tradition.',
        '',
        'I tell project-families: annual.'
      ],
      lesson: 'Annual home project days on grandfathers birthdays continue family hands work tradition.'
    },
    {
      id: 'gn34_4',
      title: 'My uncle died and his stories live in family text',
      narrative: [
        'Family text thread.',
        '',
        'His stories retold weekly.',
        '',
        'New generation hears.',
        '',
        'I tell text-storytellers: weekly retell.'
      ],
      lesson: 'Family text threads sharing deceased uncle stories weekly continue family folklore.'
    },
    {
      id: 'gn34_5',
      title: 'My friend died and her favorite poetry collection',
      narrative: [
        'Her favorite poetry book.',
        '',
        'Read annually her birthday.',
        '',
        'Same poems.',
        '',
        'Voice continues.',
        '',
        'I tell poetry-mourners: annual reading.'
      ],
      lesson: 'Annual reading of deceased friends favorite poetry collections continues their voice.'
    },
    {
      id: 'gn34_6',
      title: 'My grandmother died and her tea cabinet',
      narrative: [
        'Her tea cabinet.',
        '',
        'Inherited.',
        '',
        'Same teas.',
        '',
        'Daily brew.',
        '',
        'I tell cabinet-inheritors: same teas.'
      ],
      lesson: 'Continuing same teas in inherited cabinets continue deceased grandmothers tea selection.'
    },
    {
      id: 'gn34_7',
      title: 'My partner died and his old coats hang',
      narrative: [
        'His coats in closet.',
        '',
        'Some I gave away.',
        '',
        'Favorite ones kept.',
        '',
        'Wear them sometimes.',
        '',
        'I tell coat-keepers: keep favorites.'
      ],
      lesson: 'Keeping favorite coats of deceased partners worn sometimes continues bodily warmth.'
    },
    {
      id: 'gn34_8',
      title: 'My mother died and her birthday is volunteer',
      narrative: [
        'Annual volunteer her cause.',
        '',
        'Animal shelter she loved.',
        '',
        'Family service.',
        '',
        'In her honor.',
        '',
        'I tell volunteer-mourners: annual.'
      ],
      lesson: 'Annual volunteer service on deceased mothers birthdays at her causes continue values.'
    },
    {
      id: 'gn34_9',
      title: 'My uncle died and his trucker hat at door',
      narrative: [
        'His hat on hook.',
        '',
        'Daily visual reminder.',
        '',
        'Sometimes wear.',
        '',
        'I tell hat-keepers: visible reminder.'
      ],
      lesson: 'Inherited trucker hats on door hooks provide daily visual reminder of deceased uncles.'
    },
    {
      id: 'gn34_10',
      title: 'My grandfather died and his birthday is golf day',
      narrative: [
        'Annual golf round his birthday.',
        '',
        'His favorite course.',
        '',
        'His clubs.',
        '',
        'Family plays.',
        '',
        'I tell golf-families: annual.'
      ],
      lesson: 'Annual family golf rounds on deceased grandfathers birthdays continue sport memorial.'
    },
    {
      id: 'gn34_11',
      title: 'My friend died and her favorite restaurant menu',
      narrative: [
        'Saved menu from her favorite.',
        '',
        'Frame on wall.',
        '',
        'Daily reminder.',
        '',
        'I tell menu-keepers: frame and hang.'
      ],
      lesson: 'Framed menus from deceased friends favorite restaurants provide daily memory.'
    },
    {
      id: 'gn34_12',
      title: 'My grandmother died and her birthday is bake-off',
      narrative: [
        'Family bake-off her birthday.',
        '',
        'Cook her recipes.',
        '',
        'Best version wins.',
        '',
        'I tell bake-mourners: family competition.'
      ],
      lesson: 'Family bake-offs on deceased grandmothers birthdays cooking her recipes continue tradition.'
    },
    {
      id: 'gn34_13',
      title: 'My partner died and his birthday is letter writing',
      narrative: [
        'Letter to him annual.',
        '',
        'Year news.',
        '',
        'Tell him everything.',
        '',
        'Annual writing.',
        '',
        'I tell letter-writers: annual.'
      ],
      lesson: 'Annual birthday letters to deceased partners maintain conversational continuing bond.'
    },
    {
      id: 'gn34_14',
      title: 'My uncle died and his birthday is bowling night',
      narrative: [
        'Annual bowling.',
        '',
        'His ball.',
        '',
        'His shoes if fit.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his equipment continue sport memorial.'
    },
    {
      id: 'gn34_15',
      title: 'My grief reshaped my values',
      narrative: [
        'Lost taught me.',
        '',
        'Priorities shifted.',
        '',
        'What matters clear.',
        '',
        'People over things.',
        '',
        'I tell grief-shaped: values clarify.'
      ],
      lesson: 'Grief clarifies values; what matters becomes clear in priority shift.'
    }
  ];

  var GRIEF_NARRATIVES_35 = [
    {
      id: 'gn35_1',
      title: 'My mother died and her birthday photo book',
      narrative: [
        'Annual photo book.',
        '',
        'Year in photos.',
        '',
        'Captions to her.',
        '',
        'Annual gift to her.',
        '',
        'I tell photo-book mourners: annual.'
      ],
      lesson: 'Annual photo books on deceased mothers birthdays present year in photos as gifts to her.'
    },
    {
      id: 'gn35_2',
      title: 'My grandfather died and his birthday brunch',
      narrative: [
        'Annual brunch his birthday.',
        '',
        'His favorite cafe.',
        '',
        'Family gathers.',
        '',
        'Order what he would.',
        '',
        'I tell brunch-mourners: annual.'
      ],
      lesson: 'Annual brunches on deceased grandfathers birthdays at favorite cafes continue place ritual.'
    },
    {
      id: 'gn35_3',
      title: 'My friend died and her birthday gallery visit',
      narrative: [
        'Annual gallery visit her birthday.',
        '',
        'Her favorite artists.',
        '',
        'Sit and look.',
        '',
        'Memorial through art.',
        '',
        'I tell gallery-mourners: annual visit.'
      ],
      lesson: 'Annual gallery visits to deceased friends favorite artists provide memorial through art.'
    },
    {
      id: 'gn35_4',
      title: 'My uncle died and his birthday is workshop fix',
      narrative: [
        'Annual workshop project.',
        '',
        'Family fixes something old.',
        '',
        'Continuing hands work.',
        '',
        'I tell workshop-families: annual fix.'
      ],
      lesson: 'Annual workshop fix days on deceased uncle birthdays continue family hands work.'
    },
    {
      id: 'gn35_5',
      title: 'My grandmother died and her birthday party for elderly',
      narrative: [
        'Volunteer at senior center.',
        '',
        'Her birthday day.',
        '',
        'Cook her cookies.',
        '',
        'Bring to seniors.',
        '',
        'I tell senior-volunteer: annual.'
      ],
      lesson: 'Annual senior center volunteer days bringing deceased grandmothers cookies extend care.'
    },
    {
      id: 'gn35_6',
      title: 'My partner died and his birthday charity match',
      narrative: [
        'Annual charity donation.',
        '',
        'His chosen cause.',
        '',
        'Year amount his age would be.',
        '',
        'Annual giving.',
        '',
        'I tell donation-mourners: age amount.'
      ],
      lesson: 'Annual donations matching deceased partners would-be age continue giving milestone.'
    },
    {
      id: 'gn35_7',
      title: 'My mother died and her birthday garden plant',
      narrative: [
        'New plant each birthday.',
        '',
        'Annual garden addition.',
        '',
        'Grows over years.',
        '',
        'Living memorial.',
        '',
        'I tell garden-mourners: annual plant.'
      ],
      lesson: 'Annual plant additions on deceased mothers birthdays grow garden as living memorial.'
    },
    {
      id: 'gn35_8',
      title: 'My grandfather died and his birthday workshop',
      narrative: [
        'Annual workshop visit.',
        '',
        'His shed.',
        '',
        'Use his tools.',
        '',
        'Continuing presence.',
        '',
        'I tell workshop-mourners: visit annually.'
      ],
      lesson: 'Annual workshop visits on grandfathers birthdays use his tools continuing presence.'
    },
    {
      id: 'gn35_9',
      title: 'My friend died and her favorite cafe employees',
      narrative: [
        'Workers there knew her.',
        '',
        'Asked about her absence.',
        '',
        'Told them.',
        '',
        'Continuing bond with strangers.',
        '',
        'I tell place-friends: tell strangers.'
      ],
      lesson: 'Cafe employees who knew deceased friends become continuing bonds with strangers.'
    },
    {
      id: 'gn35_10',
      title: 'My uncle died and his birthday is family camping',
      narrative: [
        'Annual camping his birthday weekend.',
        '',
        'His favorite spot.',
        '',
        'Family gathers.',
        '',
        'Stories around fire.',
        '',
        'I tell camping-mourners: annual.'
      ],
      lesson: 'Annual family camping at deceased uncle favorite spots gather for fire-side stories.'
    },
    {
      id: 'gn35_11',
      title: 'My grandmother died and her birthday is letter writing',
      narrative: [
        'Letters to her annually.',
        '',
        'Read aloud at her grave.',
        '',
        'Then burn.',
        '',
        'Spirit travels.',
        '',
        'I tell letter-ritualists: annual.'
      ],
      lesson: 'Annual letter writing read aloud at grave then burned releases spirit communication.'
    },
    {
      id: 'gn35_12',
      title: 'My partner died and his birthday is music day',
      narrative: [
        'His favorite music plays all day.',
        '',
        'Annual.',
        '',
        'House filled his sound.',
        '',
        'Body remembers.',
        '',
        'I tell music-mourners: annual day.'
      ],
      lesson: 'Annual music days on deceased partners birthdays fill house with their sound.'
    },
    {
      id: 'gn35_13',
      title: 'My mother died and her birthday recipe printing',
      narrative: [
        'Annual recipe print.',
        '',
        'New family member gets copy.',
        '',
        'Continuing distribution.',
        '',
        'I tell recipe-distributors: annual.'
      ],
      lesson: 'Annual recipe printings on deceased mothers birthdays distributed to new family members continue legacy.'
    },
    {
      id: 'gn35_14',
      title: 'My grandfather died and his birthday is hardware visit',
      narrative: [
        'Annual visit hardware store.',
        '',
        'Walk aisles he loved.',
        '',
        'Buy small thing.',
        '',
        'In his memory.',
        '',
        'I tell hardware-mourners: annual.'
      ],
      lesson: 'Annual hardware store visits on grandfathers birthdays buy small things in memory.'
    },
    {
      id: 'gn35_15',
      title: 'My grief held me and now I hold others',
      narrative: [
        'Held in grief by others.',
        '',
        'Now I hold others.',
        '',
        'Reciprocal grief support.',
        '',
        'Wounded healer.',
        '',
        'I tell long-grievers: hold others.'
      ],
      lesson: 'Reciprocal grief support emerges; held in grief by others, now we hold others.'
    }
  ];

  var GRIEF_NARRATIVES_26 = [
    {
      id: 'gn26_1',
      title: 'My mother died and her birthday is hike day',
      narrative: [
        'Annual hike on her birthday.',
        '',
        'Mountain she loved.',
        '',
        'Family walks.',
        '',
        'Continuing.',
        '',
        'I tell hike-mourners: annual.'
      ],
      lesson: 'Annual hikes on deceased mothers birthdays at favorite mountains continue family memorial.'
    },
    {
      id: 'gn26_2',
      title: 'My grandfather died and his birthday is workshop',
      narrative: [
        'Annual workshop day.',
        '',
        'Family builds together.',
        '',
        'In his memory.',
        '',
        'I tell workshop-families: annual building.'
      ],
      lesson: 'Annual workshop days continuing deceased grandfathers building practice.'
    },
    {
      id: 'gn26_3',
      title: 'My friend died and her favorite cafe is my haunt',
      narrative: [
        'We met there often.',
        '',
        'I go alone now.',
        '',
        'Sit at our table.',
        '',
        'Place memorial.',
        '',
        'I tell cafe-mourners: same spot.'
      ],
      lesson: 'Cafes shared with deceased friends become solo memorial places.'
    },
    {
      id: 'gn26_4',
      title: 'My partner died and his birthday is family meal',
      narrative: [
        'Annual family meal.',
        '',
        'His favorite restaurant.',
        '',
        'Kids and I gather.',
        '',
        'I tell widowed-with-kids: family meal.'
      ],
      lesson: 'Annual family meals on deceased partners birthdays gather widowed with children.'
    },
    {
      id: 'gn26_5',
      title: 'My grandmother died and her crochet patterns mine',
      narrative: [
        'Inherited patterns.',
        '',
        'Crochet from them.',
        '',
        'Same projects.',
        '',
        'I tell pattern-inheritors: crochet from them.'
      ],
      lesson: 'Inherited crochet patterns continued provide ongoing project connection to grandmother.'
    },
    {
      id: 'gn26_6',
      title: 'My uncle died and his stories live in family folklore',
      narrative: [
        'Tales of his adventures.',
        '',
        'Each generation retells.',
        '',
        'Folklore grows.',
        '',
        'Larger than life.',
        '',
        'I tell story-keepers: folklore lives.'
      ],
      lesson: 'Family folklore of deceased uncles grows through generational retellings.'
    },
    {
      id: 'gn26_7',
      title: 'My mother died and her aunts are mine now',
      narrative: [
        'Her sisters call me.',
        '',
        'Maternal substitutes.',
        '',
        'Continuing maternal line.',
        '',
        'I tell motherless: aunts step in.'
      ],
      lesson: 'Maternal aunts can step into mother roles after mother death; continuing maternal line.'
    },
    {
      id: 'gn26_8',
      title: 'My grandfather died and his pocket watch chains',
      narrative: [
        'Wear on vest at weddings.',
        '',
        'Continuing his style.',
        '',
        'Special occasions only.',
        '',
        'I tell watch-special: events wear.'
      ],
      lesson: 'Pocket watches worn at weddings continue deceased grandfathers special occasion style.'
    },
    {
      id: 'gn26_9',
      title: 'My friend died and her writing journal is mine',
      narrative: [
        'Her journal of essays.',
        '',
        'Inherited.',
        '',
        'Read essays sometimes.',
        '',
        'Her voice continues.',
        '',
        'I tell journal-inheritors: read essays.'
      ],
      lesson: 'Reading deceased friends journal essays continues their inner voice through writing.'
    },
    {
      id: 'gn26_10',
      title: 'My partner died and his birthday celebrate his cause',
      narrative: [
        'Volunteer at his cause.',
        '',
        'Annual gift of time.',
        '',
        'Continuing his values.',
        '',
        'I tell value-continuers: time gift.'
      ],
      lesson: 'Annual volunteer service on deceased partners birthdays continues their values.'
    },
    {
      id: 'gn26_11',
      title: 'My grandmother died and her birthday cookies bake',
      narrative: [
        'Annual cookie baking.',
        '',
        'Family kids decorate.',
        '',
        'Smell house with cookies.',
        '',
        'I tell cookie-family: annual.'
      ],
      lesson: 'Annual cookie baking on deceased grandmothers birthdays gathers family in scent.'
    },
    {
      id: 'gn26_12',
      title: 'My mother died and her favorite movie is annual',
      narrative: [
        'On her birthday.',
        '',
        'Family watches her favorite movie.',
        '',
        'Annual tradition.',
        '',
        'I tell movie-mourners: annual viewing.'
      ],
      lesson: 'Annual movie viewings of deceased mothers favorites gather family in shared watching.'
    },
    {
      id: 'gn26_13',
      title: 'My uncle died and his pickup truck plates',
      narrative: [
        'Old license plates.',
        '',
        'Saved.',
        '',
        'Hang in garage.',
        '',
        'Continuing his truck.',
        '',
        'I tell plate-keepers: garage display.'
      ],
      lesson: 'Saved license plates of deceased uncle trucks hung in garage continue truck memory.'
    },
    {
      id: 'gn26_14',
      title: 'My grandfather died and his birthday war stories',
      narrative: [
        'Annual we tell.',
        '',
        'His military stories.',
        '',
        'Family hears.',
        '',
        'Sacrifice remembered.',
        '',
        'I tell military families: annual stories.'
      ],
      lesson: 'Annual telling of deceased grandfathers military stories continues sacrifice memory.'
    },
    {
      id: 'gn26_15',
      title: 'My friend died and her bookshelf is replicated',
      narrative: [
        'Her favorite books.',
        '',
        'I bought copies.',
        '',
        'My shelf mirrors hers.',
        '',
        'Continuing her reading.',
        '',
        'I tell book-mourners: replicate shelf.'
      ],
      lesson: 'Replicating deceased friends bookshelves continues their reading taste in your library.'
    }
  ];

  var GRIEF_NARRATIVES_27 = [
    {
      id: 'gn27_1',
      title: 'My partner died and his coffee shop visit annual',
      narrative: [
        'On his birthday.',
        '',
        'Order his usual.',
        '',
        'Sit at our spot.',
        '',
        'Annual ritual.',
        '',
        'I tell coffee-mourners: order his.'
      ],
      lesson: 'Annual coffee shop visits ordering deceased partners usual continues their order ritual.'
    },
    {
      id: 'gn27_2',
      title: 'My mother died and her birthday is garden day',
      narrative: [
        'Annual garden day.',
        '',
        'Plant on her birthday.',
        '',
        'Family hands in soil.',
        '',
        'I tell garden-mourners: annual plant.'
      ],
      lesson: 'Annual planting on deceased mothers birthdays gathers family in soil work.'
    },
    {
      id: 'gn27_3',
      title: 'My grandmother died and her embroidery is daily wear',
      narrative: [
        'Her embroidered tea towels.',
        '',
        'I use daily.',
        '',
        'Stitches of her hands.',
        '',
        'I tell embroidery-inheritors: use daily.'
      ],
      lesson: 'Daily use of inherited embroidered tea towels continues grandmothers hand work.'
    },
    {
      id: 'gn27_4',
      title: 'My uncle died and his birthday is bowling night',
      narrative: [
        'Annual bowling on his birthday.',
        '',
        'His ball.',
        '',
        'His shoes if they fit.',
        '',
        'Family rolls.',
        '',
        'I tell bowling-mourners: annual rolling.'
      ],
      lesson: 'Annual bowling on deceased uncle birthdays with his equipment continues bowling spirit.'
    },
    {
      id: 'gn27_5',
      title: 'My grandfather died and his fishing pole is mine',
      narrative: [
        'Inherited pole.',
        '',
        'Annual fishing in his honor.',
        '',
        'Cast lines.',
        '',
        'Same lake.',
        '',
        'I tell fishing-inheritors: cast yearly.'
      ],
      lesson: 'Annual fishing with inherited poles in deceased grandfathers favorite lakes continues legacy.'
    },
    {
      id: 'gn27_6',
      title: 'My friend died and her favorite words are tattoo',
      narrative: [
        'Her favorite quote.',
        '',
        'Tattooed on my arm.',
        '',
        'Carry her words.',
        '',
        'Daily reminder.',
        '',
        'I tell tattoo-mourners: words on body.'
      ],
      lesson: 'Tattooing deceased friends favorite quotes on body carries their words daily.'
    },
    {
      id: 'gn27_7',
      title: 'My mother died and her favorite bench in park',
      narrative: [
        'Bench at lake she loved.',
        '',
        'Visit weekly.',
        '',
        'Sit and think.',
        '',
        'Continuing presence in place.',
        '',
        'I tell place-mourners: weekly visit.'
      ],
      lesson: 'Weekly visits to deceased loved ones favorite places continue presence in space.'
    },
    {
      id: 'gn27_8',
      title: 'My partner died and his birthday is dinner with friends',
      narrative: [
        'Friends gather annually.',
        '',
        'His birthday.',
        '',
        'Restaurant we shared.',
        '',
        'Stories.',
        '',
        'I tell dinner-mourners: annual gathering.'
      ],
      lesson: 'Annual dinners with friends on deceased partners birthdays at shared restaurants honor.'
    },
    {
      id: 'gn27_9',
      title: 'My grandfather died and his birthday is BBQ ritual',
      narrative: [
        'July 8.',
        '',
        'Annual BBQ.',
        '',
        'Family gathers.',
        '',
        'Same date.',
        '',
        'I tell BBQ-families: annual ritual.'
      ],
      lesson: 'Annual BBQs on grandfathers birthdays sustain family gathering tradition.'
    },
    {
      id: 'gn27_10',
      title: 'My friend died and her dog is my running partner',
      narrative: [
        'Her dog runs with me.',
        '',
        'Daily exercise together.',
        '',
        'Animal grief partner.',
        '',
        'I tell pet-inheritors: shared movement.'
      ],
      lesson: 'Inherited pets become exercise companions sharing grief through movement together.'
    },
    {
      id: 'gn27_11',
      title: 'My uncle died and his car wax is in garage',
      narrative: [
        'Old car wax.',
        '',
        'In garage shelf.',
        '',
        'Use it on inherited truck.',
        '',
        'Continuing car care.',
        '',
        'I tell car-care inheritors: continue.'
      ],
      lesson: 'Continuing car care with inherited products continues deceased uncle vehicle pride.'
    },
    {
      id: 'gn27_12',
      title: 'My grandmother died and her favorite garden chairs',
      narrative: [
        'Wicker chairs.',
        '',
        'On my porch now.',
        '',
        'Sit there evenings.',
        '',
        'Continuing her ritual.',
        '',
        'I tell chair-keepers: evening sit.'
      ],
      lesson: 'Inherited wicker chairs on porches continue deceased grandmothers evening ritual.'
    },
    {
      id: 'gn27_13',
      title: 'My mother died and her favorite poetry book is mine',
      narrative: [
        'Mary Oliver poems.',
        '',
        'Underlined favorites.',
        '',
        'I read her favorites.',
        '',
        'Words continue.',
        '',
        'I tell poetry-mourners: read favorites.'
      ],
      lesson: 'Reading deceased mothers underlined poetry favorites continues their voice through words.'
    },
    {
      id: 'gn27_14',
      title: 'My partner died and his birthday is volunteer day',
      narrative: [
        'Annual volunteer.',
        '',
        'His chosen cause.',
        '',
        'Time gift.',
        '',
        'Continuing values.',
        '',
        'I tell volunteer-mourners: time gift.'
      ],
      lesson: 'Annual volunteer service on deceased partners birthdays continues their values.'
    },
    {
      id: 'gn27_15',
      title: 'My grandfather died and his stories live on',
      narrative: [
        'Tales of his adventures.',
        '',
        'Told around fire.',
        '',
        'Each retelling.',
        '',
        'Memory alive.',
        '',
        'I tell story-fire keepers: retell.'
      ],
      lesson: 'Telling deceased grandfathers stories around fire keeps memory alive in family lore.'
    }
  ];

  var GRIEF_NARRATIVES_28 = [
    {
      id: 'gn28_1',
      title: 'My uncle died and his bowling shoes are mine',
      narrative: [
        'Same size.',
        '',
        'Annual bowling in his honor.',
        '',
        'Wear them.',
        '',
        'Continuing his game.',
        '',
        'I tell shoe-inheritors: annual.'
      ],
      lesson: 'Inherited bowling shoes worn annually continue deceased uncle bowling tradition.'
    },
    {
      id: 'gn28_2',
      title: 'My grandmother died and her tea cozies',
      narrative: [
        'Her hand-knitted tea cozies.',
        '',
        'Cover my pots.',
        '',
        'Hot tea daily.',
        '',
        'Her work continues.',
        '',
        'I tell cozy-keepers: daily use.'
      ],
      lesson: 'Daily use of inherited tea cozies continues grandmothers handwork warming pots.'
    },
    {
      id: 'gn28_3',
      title: 'My mother died and her birthday is letter day',
      narrative: [
        'Annual letter to her.',
        '',
        'On her birthday.',
        '',
        'Tell her everything.',
        '',
        'Year in review.',
        '',
        'I tell letter-writers: annual.'
      ],
      lesson: 'Annual birthday letters to deceased mothers maintain conversational connection.'
    },
    {
      id: 'gn28_4',
      title: 'My friend died and her favorite playlist plays',
      narrative: [
        'Her Spotify playlist.',
        '',
        'I follow.',
        '',
        'Plays in kitchen.',
        '',
        'Her curation continues.',
        '',
        'I tell playlist-followers: continue.'
      ],
      lesson: 'Following deceased friends playlists continues their music curation in daily life.'
    },
    {
      id: 'gn28_5',
      title: 'My grandfather died and his vintage radio',
      narrative: [
        'Tube radio.',
        '',
        'Inherited.',
        '',
        'Restored to working.',
        '',
        'Plays mornings.',
        '',
        'I tell radio-restorers: continue.'
      ],
      lesson: 'Restoring inherited tube radios to working continues grandfathers radio mornings.'
    },
    {
      id: 'gn28_6',
      title: 'My partner died and his birthday is movie night',
      narrative: [
        'His favorite movies.',
        '',
        'Family movie night.',
        '',
        'On his birthday.',
        '',
        'Annual viewing.',
        '',
        'I tell movie-mourners: family night.'
      ],
      lesson: 'Annual movie nights on deceased partners birthdays watching favorites gather family.'
    },
    {
      id: 'gn28_7',
      title: 'My uncle died and his Christmas Eve tradition',
      narrative: [
        'His annual party.',
        '',
        'Family continues.',
        '',
        'Same date.',
        '',
        'New host but tradition.',
        '',
        'I tell tradition-continuers: keep date.'
      ],
      lesson: 'Christmas Eve traditions of deceased uncles continued by new hosts maintain family date.'
    },
    {
      id: 'gn28_8',
      title: 'My mother died and her recipe for chicken soup',
      narrative: [
        'When family sick.',
        '',
        'Make her chicken soup.',
        '',
        'Same recipe.',
        '',
        'Healing tradition.',
        '',
        'I tell sick-care: her soup.'
      ],
      lesson: 'Making deceased mothers chicken soup recipes for sick family continues healing tradition.'
    },
    {
      id: 'gn28_9',
      title: 'My grandmother died and her tablecloth at Thanksgiving',
      narrative: [
        'Annual tablecloth.',
        '',
        'Family meal cover.',
        '',
        'Continuing presence.',
        '',
        'I tell tablecloth-mourners: annual use.'
      ],
      lesson: 'Annual Thanksgiving tablecloths of grandmothers cover family meals continuing presence.'
    },
    {
      id: 'gn28_10',
      title: 'My friend died and her favorite hike is annual',
      narrative: [
        'Trail she loved.',
        '',
        'Annual group hike.',
        '',
        'Friends gather.',
        '',
        'In her memory.',
        '',
        'I tell hike-mourners: friend group.'
      ],
      lesson: 'Annual friend group hikes on deceased friends favorite trails sustain memorial.'
    },
    {
      id: 'gn28_11',
      title: 'My grandfather died and his folding chair on porch',
      narrative: [
        'His old chair.',
        '',
        'Folding.',
        '',
        'Inherited.',
        '',
        'Sit in it evenings.',
        '',
        'I tell chair-keepers: evening sit.'
      ],
      lesson: 'Inherited folding chairs sat in evenings continue grandfathers porch ritual.'
    },
    {
      id: 'gn28_12',
      title: 'My mother died and her birthday I visit her grave',
      narrative: [
        'Annual visit.',
        '',
        'Bring flowers.',
        '',
        'Clean stone.',
        '',
        'Tell her year news.',
        '',
        'I tell grave-visitors: annual ritual.'
      ],
      lesson: 'Annual grave visits on deceased mothers birthdays with flowers and news sustain ritual.'
    },
    {
      id: 'gn28_13',
      title: 'My partner died and his cologne lingers in closet',
      narrative: [
        'Bottle in closet.',
        '',
        'Smell years later.',
        '',
        'Faint but present.',
        '',
        'I tell cologne-keepers: bottle holds.'
      ],
      lesson: 'Saved cologne bottles in closets after partner loss hold faint scent for years.'
    },
    {
      id: 'gn28_14',
      title: 'My uncle died and his bowling team continues',
      narrative: [
        'Team carries on.',
        '',
        'New member fills his spot.',
        '',
        'But his locker stays.',
        '',
        'Continuing team.',
        '',
        'I tell team-continuers: spot held.'
      ],
      lesson: 'Bowling teams continuing after uncle death keep deceased member locker as memorial.'
    },
    {
      id: 'gn28_15',
      title: 'My grandmother died and her recipes feed family',
      narrative: [
        'Annual cookbook printing.',
        '',
        'New grandchildren get copies.',
        '',
        'Recipes spread generationally.',
        '',
        'I tell cookbook-distributors: spread.'
      ],
      lesson: 'Annual cookbook printings distributed to new grandchildren spread deceased grandmother recipes.'
    }
  ];

  var GRIEF_NARRATIVES_29 = [
    {
      id: 'gn29_1',
      title: 'My friend died and her favorite store still has presence',
      narrative: [
        'We shopped there together.',
        '',
        'I visit sometimes alone.',
        '',
        'Touch fabrics she would have liked.',
        '',
        'Memorial through shopping.',
        '',
        'I tell shop-mourners: visit alone.'
      ],
      lesson: 'Solo visits to stores shared with deceased friends become memorial through shopping.'
    },
    {
      id: 'gn29_2',
      title: 'My grandfather died and his birthday is hunting story day',
      narrative: [
        'Family gathers.',
        '',
        'Hunting stories told.',
        '',
        'His adventures recounted.',
        '',
        'Each year.',
        '',
        'I tell hunting-storytellers: gather.'
      ],
      lesson: 'Annual gatherings on grandfathers birthdays to tell hunting stories sustain adventure memory.'
    },
    {
      id: 'gn29_3',
      title: 'My mother died and her birthday gift to me each year',
      narrative: [
        'On her birthday.',
        '',
        'Give myself her gift.',
        '',
        'Imagine her giving.',
        '',
        'Self-care she would have given.',
        '',
        'I tell self-gifters: imagine.'
      ],
      lesson: 'Self-gifts imagined as deceased mother giving on her birthday continue care tradition.'
    },
    {
      id: 'gn29_4',
      title: 'My uncle died and his Christmas tree topper continues',
      narrative: [
        'Star he made.',
        '',
        'On family tree annually.',
        '',
        'Continuing tradition.',
        '',
        'I tell ornament-tradition: annual.'
      ],
      lesson: 'Handmade Christmas tree toppers of deceased uncles continue annual tree tradition.'
    },
    {
      id: 'gn29_5',
      title: 'My partner died and his birthday I write him letter',
      narrative: [
        'Letter to him on his birthday.',
        '',
        'Tell him year news.',
        '',
        'Wedding, kids, work.',
        '',
        'Annual letter.',
        '',
        'I tell letter-mourners: annual writing.'
      ],
      lesson: 'Annual birthday letters to deceased partners maintain conversational continuing bond.'
    },
    {
      id: 'gn29_6',
      title: 'My grandmother died and her tablecloth covers anniversaries',
      narrative: [
        'Special occasion cloth.',
        '',
        'Anniversaries dinners.',
        '',
        'Continuing presence at table.',
        '',
        'I tell occasion-cloth: special events.'
      ],
      lesson: 'Anniversary tablecloths of deceased grandmothers used for special occasions continue presence.'
    },
    {
      id: 'gn29_7',
      title: 'My friend died and her dog has new puppy',
      narrative: [
        'Years after.',
        '',
        'Got new puppy.',
        '',
        'Both grieving and growing.',
        '',
        'Multi-pet household.',
        '',
        'I tell pet-grievers: new can come.'
      ],
      lesson: 'New pets after grief alongside inherited grief pets create multi-pet households of love.'
    },
    {
      id: 'gn29_8',
      title: 'My grandfather died and his trucker hat collection',
      narrative: [
        'Hats from his life.',
        '',
        'Wear different ones.',
        '',
        'Rotating tribute.',
        '',
        'I tell hat-collectors: rotate.'
      ],
      lesson: 'Rotating wear of inherited trucker hat collection provides ongoing tribute.'
    },
    {
      id: 'gn29_9',
      title: 'My mother died and her bag carries my things',
      narrative: [
        'Her brown handbag.',
        '',
        'I carry it weekly.',
        '',
        'Inside her things.',
        '',
        'Body envelope of presence.',
        '',
        'I tell bag-inheritors: carry weekly.'
      ],
      lesson: 'Inherited handbags carried weekly keep deceased mothers possessions in daily life.'
    },
    {
      id: 'gn29_10',
      title: 'My uncle died and his vintage cars sold',
      narrative: [
        'Family decision to sell.',
        '',
        'Layered grief.',
        '',
        'Lost objects of love.',
        '',
        'Necessary letting go.',
        '',
        'I tell collection-sellers: necessary loss.'
      ],
      lesson: 'Selling vintage car collections sometimes necessary; layered grief in object loss.'
    },
    {
      id: 'gn29_11',
      title: 'My grandmother died and her cake plate is for special',
      narrative: [
        'Her cake plate.',
        '',
        'Birthdays only.',
        '',
        'Cake displayed.',
        '',
        'Continuing tradition.',
        '',
        'I tell plate-keepers: special.'
      ],
      lesson: 'Inherited cake plates used for special occasion birthdays continue grandmothers cake display.'
    },
    {
      id: 'gn29_12',
      title: 'My grandfather died and his hat at door',
      narrative: [
        'Old fedora.',
        '',
        'On hook by door.',
        '',
        'Daily reminder.',
        '',
        'I tell hat-keepers: visible reminder.'
      ],
      lesson: 'Inherited fedoras at door hooks provide daily visual reminders of grandfathers.'
    },
    {
      id: 'gn29_13',
      title: 'My friend died and her ceramic vase holds flowers',
      narrative: [
        'She made the vase.',
        '',
        'Holds fresh flowers weekly.',
        '',
        'Her craft sustains.',
        '',
        'I tell artisan-friend mourners: use creation.'
      ],
      lesson: 'Vases made by deceased artist friends used weekly continue their craft displayed.'
    },
    {
      id: 'gn29_14',
      title: 'My partner died and his birthday is photo year',
      narrative: [
        'On his birthday.',
        '',
        'Look at photos.',
        '',
        'All decades together.',
        '',
        'Annual photo time.',
        '',
        'I tell photo-mourners: annual review.'
      ],
      lesson: 'Annual photo reviewing on deceased partners birthdays remembers all chapters together.'
    },
    {
      id: 'gn29_15',
      title: 'My grief led me to grief work career',
      narrative: [
        'Became grief counselor.',
        '',
        'My loss became my work.',
        '',
        'Wounded healer.',
        '',
        'I tell career-changed: profession can shift.'
      ],
      lesson: 'Grief experience can shift career to grief counseling; wounded healer paradigm.'
    }
  ];

  var GRIEF_NARRATIVES_30 = [
    {
      id: 'gn30_1',
      title: 'My mother died and her birthday is community service',
      narrative: [
        'Annual community service.',
        '',
        'Her favorite cause.',
        '',
        'Family volunteers.',
        '',
        'I tell community-mourners: service.'
      ],
      lesson: 'Annual community service on deceased mothers birthdays at favorite causes honor through action.'
    },
    {
      id: 'gn30_2',
      title: 'My grandfather died and his rocking chair on my porch',
      narrative: [
        'Inherited.',
        '',
        'On my porch.',
        '',
        'Rock evenings.',
        '',
        'Continuing.',
        '',
        'I tell rocking-mourners: continue rocking.'
      ],
      lesson: 'Rocking in inherited rocking chairs evenings continues grandfathers porch ritual.'
    },
    {
      id: 'gn30_3',
      title: 'My uncle died and his birthday is annual game day',
      narrative: [
        'Annual board games.',
        '',
        'His favorite games.',
        '',
        'Family plays.',
        '',
        'In his honor.',
        '',
        'I tell game-mourners: annual.'
      ],
      lesson: 'Annual board game days on deceased uncles birthdays play their favorites in honor.'
    },
    {
      id: 'gn30_4',
      title: 'My friend died and her name is on bench',
      narrative: [
        'Memorial bench in park.',
        '',
        'Name on plaque.',
        '',
        'Strangers sit.',
        '',
        'Her name lives.',
        '',
        'I tell bench-mourners: name lives.'
      ],
      lesson: 'Memorial benches with deceased friends names in parks keep names alive for strangers.'
    },
    {
      id: 'gn30_5',
      title: 'My grandmother died and her sewing machine sews',
      narrative: [
        'Old Singer.',
        '',
        'Inherited.',
        '',
        'Sew on it monthly.',
        '',
        'Continuing.',
        '',
        'I tell machine-inheritors: sew monthly.'
      ],
      lesson: 'Inherited sewing machines used monthly continue deceased grandmothers sewing practice.'
    },
    {
      id: 'gn30_6',
      title: 'My partner died and his coffee cup chips',
      narrative: [
        'Favorite chipped mug.',
        '',
        'I keep using.',
        '',
        'Years past chip.',
        '',
        'Daily presence.',
        '',
        'I tell mug-keepers: chipped fine.'
      ],
      lesson: 'Continued use of chipped mugs of deceased partners maintains daily presence.'
    },
    {
      id: 'gn30_7',
      title: 'My uncle died and his train set runs',
      narrative: [
        'Model train layout.',
        '',
        'Inherited.',
        '',
        'Run at Christmas.',
        '',
        'Continuing his hobby.',
        '',
        'I tell train-inheritors: annual run.'
      ],
      lesson: 'Annual Christmas running of inherited model train sets continues uncles hobby.'
    },
    {
      id: 'gn30_8',
      title: 'My grandfather died and his birthday is library day',
      narrative: [
        'Annual library visit.',
        '',
        'Check out books he loved.',
        '',
        'Read them.',
        '',
        'Continuing his reading.',
        '',
        'I tell library-mourners: annual.'
      ],
      lesson: 'Annual library days on deceased grandfathers birthdays read his favorites continuing reading.'
    },
    {
      id: 'gn30_9',
      title: 'My mother died and her birthday is recipe sharing',
      narrative: [
        'Share her recipes online.',
        '',
        'On her birthday.',
        '',
        'Annual recipe gift.',
        '',
        'Wider spread.',
        '',
        'I tell recipe-sharers: annual online.'
      ],
      lesson: 'Annual online recipe sharing on deceased mothers birthdays spreads recipes widely.'
    },
    {
      id: 'gn30_10',
      title: 'My friend died and her favorite museum is annual visit',
      narrative: [
        'Annual visit to her favorite museum.',
        '',
        'Her favorite paintings.',
        '',
        'Sit, look.',
        '',
        'Continuing her appreciation.',
        '',
        'I tell museum-mourners: annual.'
      ],
      lesson: 'Annual museum visits to deceased friends favorite paintings continue art appreciation.'
    },
    {
      id: 'gn30_11',
      title: 'My grandfather died and his fishing tackle box',
      narrative: [
        'Inherited tackle box.',
        '',
        'His lures.',
        '',
        'Fish with them annually.',
        '',
        'I tell tackle-inheritors: annual.'
      ],
      lesson: 'Annual fishing with inherited tackle boxes continues grandfathers fishing through gear.'
    },
    {
      id: 'gn30_12',
      title: 'My grandmother died and her pearl necklace',
      narrative: [
        'Pearls she wore.',
        '',
        'Inherited.',
        '',
        'Wear them special occasions.',
        '',
        'Continuing her style.',
        '',
        'I tell pearl-inheritors: special wear.'
      ],
      lesson: 'Inherited pearl necklaces worn special occasions continue grandmothers elegance.'
    },
    {
      id: 'gn30_13',
      title: 'My partner died and his birthday is concert night',
      narrative: [
        'His favorite band.',
        '',
        'Tribute concert annual.',
        '',
        'I attend.',
        '',
        'Annual music ritual.',
        '',
        'I tell concert-mourners: tribute night.'
      ],
      lesson: 'Annual tribute concert attendance for deceased partners favorite bands continue music love.'
    },
    {
      id: 'gn30_14',
      title: 'My uncle died and his stories of war retold',
      narrative: [
        'His war stories.',
        '',
        'Family tells annually.',
        '',
        'Sacrifice remembered.',
        '',
        'Continuing.',
        '',
        'I tell military-stories: annual telling.'
      ],
      lesson: 'Annual retelling of deceased uncles war stories preserves sacrifice in family memory.'
    },
    {
      id: 'gn30_15',
      title: 'My grandmother died and her tea is daily',
      narrative: [
        'Her tea brand.',
        '',
        'Brew daily.',
        '',
        'Same cup.',
        '',
        'Same time.',
        '',
        'Continuing ritual.',
        '',
        'I tell tea-mourners: daily.'
      ],
      lesson: 'Daily brewing of deceased grandmothers tea brand continues morning ritual.'
    }
  ];

  var GRIEF_NARRATIVES_21 = [
    {
      id: 'gn21_1',
      title: 'My loss came at the same time as a graduation',
      narrative: [
        'Grandfather died week of graduation.',
        '',
        'Joy and grief together.',
        '',
        'Walked across stage in his honor.',
        '',
        'Carried him.',
        '',
        'I tell milestone-grievers: carry them.'
      ],
      lesson: 'Loss during milestones carries deceased into achievement; honor through marker.'
    },
    {
      id: 'gn21_2',
      title: 'My partner died at the same time as our anniversary',
      narrative: [
        'Anniversary became death day.',
        '',
        'Hard date forever.',
        '',
        'Therapy named the layering.',
        '',
        'I tell anniversary-death survivors: layered grief.'
      ],
      lesson: 'Anniversary-coinciding death creates layered hard date deserving naming.'
    },
    {
      id: 'gn21_3',
      title: 'My grandmother died and her quilt is on my couch',
      narrative: [
        'Her quilt.',
        '',
        'On couch daily.',
        '',
        'Sit under it.',
        '',
        'Body wrapped in her love.',
        '',
        'I tell quilt-keepers: daily use.'
      ],
      lesson: 'Daily use of inherited quilts wraps body in deceased grandmothers love.'
    },
    {
      id: 'gn21_4',
      title: 'My uncle died and his stories I retell',
      narrative: [
        'Family stories he told.',
        '',
        'I retell at gatherings.',
        '',
        'Same gestures.',
        '',
        'Same timing.',
        '',
        'Storyteller continues.',
        '',
        'I tell story-bearers: retell with gestures.'
      ],
      lesson: 'Retelling deceased uncles stories with their gestures continues storyteller voice.'
    },
    {
      id: 'gn21_5',
      title: 'My mother died and I dream of cooking with her',
      narrative: [
        'Dreams of her kitchen.',
        '',
        'Both of us cooking.',
        '',
        'Wake with longing.',
        '',
        'Sensory dreams.',
        '',
        'I tell cooking-dreamers: dreams are visits.'
      ],
      lesson: 'Cooking dreams with deceased mothers are sensory visits providing presence in sleep.'
    },
    {
      id: 'gn21_6',
      title: 'My partner died and his favorite chair is sacred',
      narrative: [
        'His recliner.',
        '',
        'Untouched.',
        '',
        'Sometimes I sit there.',
        '',
        'Continuing his shape.',
        '',
        'I tell chair-keepers: bodily shape held.'
      ],
      lesson: 'Untouched chairs of deceased partners hold bodily shape; sometimes sitting continues form.'
    },
    {
      id: 'gn21_7',
      title: 'My grandfather died and his ham radio runs',
      narrative: [
        'Inherited his radio gear.',
        '',
        'Learned to operate.',
        '',
        'Continue his connections.',
        '',
        'Reach strangers globally.',
        '',
        'I tell radio-inheritors: continue.'
      ],
      lesson: 'Inherited ham radios learned by descendants continue deceased grandfathers global connections.'
    },
    {
      id: 'gn21_8',
      title: 'My friend died and her favorite art is mine',
      narrative: [
        'Painting she loved.',
        '',
        'Her family gave to me.',
        '',
        'Hangs in living room.',
        '',
        'Daily reminder.',
        '',
        'I tell art-inheritors: hang.'
      ],
      lesson: 'Inherited art of deceased friends hung in homes provides daily reminder.'
    },
    {
      id: 'gn21_9',
      title: 'My mother died and her songs play in car',
      narrative: [
        'Songs she sang.',
        '',
        'I play them driving.',
        '',
        'Sing along.',
        '',
        'Voice continues.',
        '',
        'I tell singing-mourners: sing along.'
      ],
      lesson: 'Singing along to deceased mothers songs in car continues vocal presence.'
    },
    {
      id: 'gn21_10',
      title: 'My grandfather died and his pocket knife is in my pocket',
      narrative: [
        'Old leatherman.',
        '',
        'Daily carry.',
        '',
        'Use it for tasks.',
        '',
        'His tool, my hand.',
        '',
        'I tell daily-carry inheritors: continuing.'
      ],
      lesson: 'Inherited pocket knives carried daily continue deceased grandfathers daily presence.'
    },
    {
      id: 'gn21_11',
      title: 'My uncle died and his lake is annual visit',
      narrative: [
        'Lake he loved.',
        '',
        'Family visits annually.',
        '',
        'Same dock.',
        '',
        'Continuing summer ritual.',
        '',
        'I tell water-place inheritors: visit yearly.'
      ],
      lesson: 'Annual visits to deceased uncles loved lakes continue summer ritual.'
    },
    {
      id: 'gn21_12',
      title: 'My mother died and her flowers bloom every spring',
      narrative: [
        'Bulbs she planted.',
        '',
        'Daffodils annually.',
        '',
        'Spring announces her.',
        '',
        'Annual visitation.',
        '',
        'I tell bulb-inheritors: spring brings them.'
      ],
      lesson: 'Bulbs planted by deceased mothers announce them annually each spring.'
    },
    {
      id: 'gn21_13',
      title: 'My grandfather died and his birthday is annual reunion',
      narrative: [
        'November 8 annual.',
        '',
        'Family gathers.',
        '',
        'Restaurant he loved.',
        '',
        'Stories shared.',
        '',
        'I tell birthday-reuniters: continue.'
      ],
      lesson: 'Annual family reunions on deceased grandfathers birthdays at favorite places sustain memory.'
    },
    {
      id: 'gn21_14',
      title: 'My friend died and her birthday I light a candle',
      narrative: [
        'On her birthday.',
        '',
        'Candle by her photo.',
        '',
        'Sit with her.',
        '',
        'Annual private ritual.',
        '',
        'I tell candle-lighters: annual sustains.'
      ],
      lesson: 'Annual candle-lighting by deceased friends photos on birthdays sustains private ritual.'
    },
    {
      id: 'gn21_15',
      title: 'My partner died and our anniversary is grief day',
      narrative: [
        'Our wedding anniversary.',
        '',
        'Now grief day.',
        '',
        'Visit our favorite places.',
        '',
        'Wear my ring.',
        '',
        'I tell anniversary-mourners: rituals contain.'
      ],
      lesson: 'Wedding anniversaries after partner loss become annual grief rituals.'
    }
  ];

  var GRIEF_NARRATIVES_22 = [
    {
      id: 'gn22_1',
      title: 'My grandmother died and her sewing room is preserved',
      narrative: [
        'Her sewing room.',
        '',
        'Threads still on table.',
        '',
        'Half-finished projects.',
        '',
        'Preserved.',
        '',
        'I tell space-keepers: sacred.'
      ],
      lesson: 'Preserved sewing rooms of deceased grandmothers hold sacred space of unfinished work.'
    },
    {
      id: 'gn22_2',
      title: 'My uncle died and his beer recipes are mine',
      narrative: [
        'Home brewer.',
        '',
        'Recipe books inherited.',
        '',
        'I brew his recipes.',
        '',
        'Continuing his craft.',
        '',
        'I tell brewer-inheritors: brew his.'
      ],
      lesson: 'Brewing deceased uncle recipes continues craft and shares his taste with family.'
    },
    {
      id: 'gn22_3',
      title: 'My mother died and her makeup is in my drawer',
      narrative: [
        'Old lipsticks.',
        '',
        'Her shade.',
        '',
        'I wear sometimes.',
        '',
        'Color on my lips.',
        '',
        'I tell makeup-keepers: shared shade.'
      ],
      lesson: 'Deceased mothers lipsticks worn sometimes continue their style on living lips.'
    },
    {
      id: 'gn22_4',
      title: 'My grandfather died and his pickup truck is mine',
      narrative: [
        'Old red Ford.',
        '',
        'Inherited.',
        '',
        'Drive on errands.',
        '',
        'Truck continues.',
        '',
        'I tell truck-inheritors: drive.'
      ],
      lesson: 'Inherited pickup trucks driven on errands continue deceased grandfathers truck presence.'
    },
    {
      id: 'gn22_5',
      title: 'My friend died and her birthday hike is annual',
      narrative: [
        'Mountain she loved.',
        '',
        'Annual birthday hike.',
        '',
        'Friend group.',
        '',
        'Continuing tradition.',
        '',
        'I tell hiking-mourners: annual.'
      ],
      lesson: 'Annual birthday hikes on deceased friends favorite mountains continue tradition.'
    },
    {
      id: 'gn22_6',
      title: 'My partner died and his coffee mug is in cabinet',
      narrative: [
        'His coffee mug.',
        '',
        'Cabinet daily.',
        '',
        'Sometimes use.',
        '',
        'Continuing morning ritual.',
        '',
        'I tell mug-keepers: morning presence.'
      ],
      lesson: 'Deceased partners coffee mugs used sometimes continue morning ritual presence.'
    },
    {
      id: 'gn22_7',
      title: 'My grandmother died and her cast iron pans are mine',
      narrative: [
        'Decades of seasoning.',
        '',
        'Inherited pans.',
        '',
        'Cook in them daily.',
        '',
        'Patina continues.',
        '',
        'I tell pan-inheritors: cook daily.'
      ],
      lesson: 'Inherited cast iron pans cooked in daily continue decades of grandmothers seasoning.'
    },
    {
      id: 'gn22_8',
      title: 'My uncle died and his pool table lives',
      narrative: [
        'Inherited his pool table.',
        '',
        'Family plays.',
        '',
        'Continuing his hobby.',
        '',
        'I tell table-inheritors: play together.'
      ],
      lesson: 'Inherited pool tables played by family continue deceased uncle hobby.'
    },
    {
      id: 'gn22_9',
      title: 'My grandfather died and his rocking chair',
      narrative: [
        'On front porch.',
        '',
        'Sit there evenings.',
        '',
        'Continuing his ritual.',
        '',
        'Same rocking.',
        '',
        'I tell chair-mourners: continue rocking.'
      ],
      lesson: 'Sitting in inherited rocking chairs evenings continues grandfathers porch ritual.'
    },
    {
      id: 'gn22_10',
      title: 'My friend died and her favorite words are mine',
      narrative: [
        'Phrases she used.',
        '',
        'I say them now.',
        '',
        'Carrying her language.',
        '',
        'I tell phrase-bearers: continue saying.'
      ],
      lesson: 'Phrases used by deceased friends continued by friends carry their language forward.'
    },
    {
      id: 'gn22_11',
      title: 'My mother died and her songs hum in me',
      narrative: [
        'Tunes she hummed.',
        '',
        'Now I hum them.',
        '',
        'Continuing her music.',
        '',
        'I tell humming-mourners: continue tunes.'
      ],
      lesson: 'Humming deceased mothers tunes continues their music through breath.'
    },
    {
      id: 'gn22_12',
      title: 'My grandfather died and his garden grows',
      narrative: [
        'His vegetable garden.',
        '',
        'Continued by family.',
        '',
        'Annual harvest.',
        '',
        'Continuing.',
        '',
        'I tell garden-continuers: annual harvest.'
      ],
      lesson: 'Continued vegetable gardens of deceased grandfathers provide annual harvest.'
    },
    {
      id: 'gn22_13',
      title: 'My partner died and his sweatshirt is in drawer',
      narrative: [
        'Worn sweatshirt.',
        '',
        'In drawer.',
        '',
        'Wear when cold.',
        '',
        'Wrapped in his body shape.',
        '',
        'I tell sweatshirt-keepers: wear them.'
      ],
      lesson: 'Inherited sweatshirts worn for warmth continue deceased partners bodily presence.'
    },
    {
      id: 'gn22_14',
      title: 'My uncle died and his birthday is family fishing day',
      narrative: [
        'Annual fishing in his honor.',
        '',
        'Same lake he loved.',
        '',
        'Family gathers rods.',
        '',
        'I tell fishing-families: annual ritual.'
      ],
      lesson: 'Annual fishing on deceased uncle birthdays at favorite lakes honor through shared activity.'
    },
    {
      id: 'gn22_15',
      title: 'My grandmother died and her recipes printed for grandkids',
      narrative: [
        'Family cookbook made.',
        '',
        'All her recipes.',
        '',
        'Each grandchild gets copy.',
        '',
        'Generational gift.',
        '',
        'I tell cookbook-makers: gift grandkids.'
      ],
      lesson: 'Family cookbooks of deceased grandmother recipes gifted to grandchildren continue generationally.'
    }
  ];

  var GRIEF_NARRATIVES_23 = [
    {
      id: 'gn23_1',
      title: 'My friend died and her email signature lives',
      narrative: [
        'Her quote in email signature.',
        '',
        'I adopted same quote.',
        '',
        'Continuing her voice.',
        '',
        'Daily reminder.',
        '',
        'I tell signature-mourners: adopt.'
      ],
      lesson: 'Adopting deceased friends email signature quotes continues their voice professionally.'
    },
    {
      id: 'gn23_2',
      title: 'My mother died and her birthday I bake her cake',
      narrative: [
        'Annual cake.',
        '',
        'Her recipe.',
        '',
        'Family eats.',
        '',
        'Continuing.',
        '',
        'I tell cake-bakers: annual.'
      ],
      lesson: 'Annual cake baking on deceased mothers birthdays continues family ritual.'
    },
    {
      id: 'gn23_3',
      title: 'My grandfather died and his birthday is BBQ day',
      narrative: [
        'Annual BBQ.',
        '',
        'Same date.',
        '',
        'Family gathers.',
        '',
        'Honoring through gathering.',
        '',
        'I tell BBQ-mourners: annual.'
      ],
      lesson: 'Annual BBQs on deceased grandfathers birthdays honor through family gathering.'
    },
    {
      id: 'gn23_4',
      title: 'My partner died and his birthday I cook his favorite meal',
      narrative: [
        'Lasagna his favorite.',
        '',
        'Cook on his birthday.',
        '',
        'Solo dinner.',
        '',
        'Annual ritual.',
        '',
        'I tell solo-mourners: cook for them.'
      ],
      lesson: 'Cooking deceased partners favorite meals on their birthdays solo honors annual ritual.'
    },
    {
      id: 'gn23_5',
      title: 'My uncle died and his motorcycle is in garage',
      narrative: [
        'Old Harley.',
        '',
        'Inherited.',
        '',
        'Ride annually.',
        '',
        'Continuing his road.',
        '',
        'I tell bike-inheritors: ride.'
      ],
      lesson: 'Inherited motorcycles ridden annually continue deceased uncle road presence.'
    },
    {
      id: 'gn23_6',
      title: 'My grandmother died and her fabric stash is mine',
      narrative: [
        'Hundreds of fabrics.',
        '',
        'I quilt with them.',
        '',
        'Continuing her work.',
        '',
        'I tell fabric-inheritors: quilt.'
      ],
      lesson: 'Inherited fabric stashes quilted continue deceased grandmother sewing work.'
    },
    {
      id: 'gn23_7',
      title: 'My mother died and her Christmas dishes',
      narrative: [
        'Annual china.',
        '',
        'Now mine.',
        '',
        'Use Christmas Day.',
        '',
        'Continuing meal tradition.',
        '',
        'I tell china-inheritors: holidays.'
      ],
      lesson: 'Inherited Christmas china used annually continue deceased mothers holiday tradition.'
    },
    {
      id: 'gn23_8',
      title: 'My friend died and her favorite music plays daily',
      narrative: [
        'Her favorite albums.',
        '',
        'Play in kitchen daily.',
        '',
        'Voice continues.',
        '',
        'I tell music-mourners: play daily.'
      ],
      lesson: 'Playing deceased friends favorite music daily in kitchen continues their voice.'
    },
    {
      id: 'gn23_9',
      title: 'My grandfather died and his radio plays mornings',
      narrative: [
        'Old transistor radio.',
        '',
        'Inherited.',
        '',
        'NPR mornings same station.',
        '',
        'Continuing his routine.',
        '',
        'I tell radio-inheritors: continue station.'
      ],
      lesson: 'Continued listening on grandfathers radios at same NPR stations continues morning routine.'
    },
    {
      id: 'gn23_10',
      title: 'My partner died and our wedding photo is on mantel',
      narrative: [
        'Wedding day photo.',
        '',
        'On mantel.',
        '',
        'Daily presence.',
        '',
        'I tell photo-keepers: visible.'
      ],
      lesson: 'Wedding photos on mantels after partner death provide daily continuing presence.'
    },
    {
      id: 'gn23_11',
      title: 'My uncle died and his stamp collection inherited',
      narrative: [
        'Decades of stamps.',
        '',
        'Continue collecting.',
        '',
        'Same hobby.',
        '',
        'I tell stamp-collectors: continue.'
      ],
      lesson: 'Inherited stamp collections continued provide ongoing hobby connection.'
    },
    {
      id: 'gn23_12',
      title: 'My grandmother died and her teapot lives',
      narrative: [
        'Decades on her stove.',
        '',
        'Inherited.',
        '',
        'On my stove daily.',
        '',
        'Tea brewing continues.',
        '',
        'I tell teapot-inheritors: daily brew.'
      ],
      lesson: 'Inherited teapots used daily on stoves continue deceased grandmothers tea ritual.'
    },
    {
      id: 'gn23_13',
      title: 'My friend died and her work is in my office',
      narrative: [
        'Her art on my wall.',
        '',
        'Office daily.',
        '',
        'See her workdays.',
        '',
        'I tell art-keepers: office display.'
      ],
      lesson: 'Deceased friends art displayed in offices provides daily workday presence.'
    },
    {
      id: 'gn23_14',
      title: 'My mother died and her chocolate chip cookies bake',
      narrative: [
        'Her recipe.',
        '',
        'Bake when sad.',
        '',
        'House smells like her.',
        '',
        'Comfort baking.',
        '',
        'I tell cookie-mourners: comfort bake.'
      ],
      lesson: 'Baking deceased mothers cookie recipes when sad fills house with comforting scent.'
    },
    {
      id: 'gn23_15',
      title: 'My grief became wisdom over years',
      narrative: [
        'Suffering taught me.',
        '',
        'I see other grievers.',
        '',
        'Help them now.',
        '',
        'Wisdom from wound.',
        '',
        'I tell long-grievers: wisdom is gift.'
      ],
      lesson: 'Long-term grief becomes wisdom; suffering becomes ability to help others.'
    }
  ];

  var GRIEF_NARRATIVES_24 = [
    {
      id: 'gn24_1',
      title: 'My friend died and we made book club in her honor',
      narrative: [
        'She loved books.',
        '',
        'Annual book club her honor.',
        '',
        'Read books she loved.',
        '',
        'Discuss them.',
        '',
        'Continuing reading.',
        '',
        'I tell book-mourners: club honor.'
      ],
      lesson: 'Book clubs founded in deceased friends honor reading their favorite books continue their reading.'
    },
    {
      id: 'gn24_2',
      title: 'My mother died and her hands wash dishes still',
      narrative: [
        'When I wash dishes.',
        '',
        'I see my hands.',
        '',
        'Look like hers.',
        '',
        'She washed dishes too.',
        '',
        'Continuing through repetition.',
        '',
        'I tell handwork-mourners: bodies remember.'
      ],
      lesson: 'Repetitive handwork like dishwashing reveals deceased loved ones bodies in our motions.'
    },
    {
      id: 'gn24_3',
      title: 'My grandfather died and his coffee mug is in my office',
      narrative: [
        'World War II mug.',
        '',
        'Inherited.',
        '',
        'Coffee at work daily.',
        '',
        'Continuing his morning coffee.',
        '',
        'I tell mug-keepers: morning ritual.'
      ],
      lesson: 'Inherited military mugs used daily for coffee continue grandfathers morning ritual.'
    },
    {
      id: 'gn24_4',
      title: 'My partner died and I made memorial photo book',
      narrative: [
        'Album of photos.',
        '',
        'Captions of stories.',
        '',
        'For our children.',
        '',
        'Legacy book.',
        '',
        'I tell memorial-book makers: children inherit.'
      ],
      lesson: 'Memorial photo books with story captions for children create legacy inheritance.'
    },
    {
      id: 'gn24_5',
      title: 'My uncle died and his record collection plays',
      narrative: [
        'Old vinyl.',
        '',
        'Inherited.',
        '',
        'Plays evenings.',
        '',
        'Continuing his music.',
        '',
        'I tell vinyl-inheritors: play evenings.'
      ],
      lesson: 'Inherited vinyl record collections played evenings continue deceased uncle music selection.'
    },
    {
      id: 'gn24_6',
      title: 'My mother died and her advice still guides me',
      narrative: [
        'Her sayings.',
        '',
        'I hear them in my head.',
        '',
        'When making decisions.',
        '',
        'Advice continues.',
        '',
        'I tell advice-keepers: continue listening.'
      ],
      lesson: 'Deceased mothers advice continues guiding decisions through internalized voice.'
    },
    {
      id: 'gn24_7',
      title: 'My grandmother died and her crochet hooks are mine',
      narrative: [
        'Wood crochet hooks.',
        '',
        'Decades of use.',
        '',
        'Now in my hands.',
        '',
        'I crochet with them.',
        '',
        'I tell hook-inheritors: continue craft.'
      ],
      lesson: 'Inherited crochet hooks with decades of use continue grandmothers craft through hands.'
    },
    {
      id: 'gn24_8',
      title: 'My friend died and her favorite tea is in my cabinet',
      narrative: [
        'Earl Grey she loved.',
        '',
        'Same brand.',
        '',
        'Brew sometimes.',
        '',
        'Continuing her tea.',
        '',
        'I tell tea-mourners: same brand.'
      ],
      lesson: 'Brewing deceased friends favorite tea continues their tea ritual through sometimes drinking.'
    },
    {
      id: 'gn24_9',
      title: 'My grandfather died and his hammer is in tool box',
      narrative: [
        'Old wooden handle.',
        '',
        'Inherited.',
        '',
        'Use it for projects.',
        '',
        'Hands fit grip.',
        '',
        'I tell hammer-inheritors: use.'
      ],
      lesson: 'Inherited hammers used for projects fit hands like deceased grandfathers; continuing work.'
    },
    {
      id: 'gn24_10',
      title: 'My partner died and his coffee maker still works',
      narrative: [
        'Same coffee maker.',
        '',
        'Daily morning use.',
        '',
        'Same ritual.',
        '',
        'His coffee tradition.',
        '',
        'I tell coffee-maker keepers: ritual.'
      ],
      lesson: 'Continuing deceased partners coffee maker daily continues morning coffee tradition.'
    },
    {
      id: 'gn24_11',
      title: 'My uncle died and his pipe ash is in tray',
      narrative: [
        'Old ash tray.',
        '',
        'Smell faint still.',
        '',
        'Inherited.',
        '',
        'On bookshelf.',
        '',
        'I tell tray-keepers: scent lasts.'
      ],
      lesson: 'Inherited ash trays of pipe smokers retain faint scent for years; presence preserved.'
    },
    {
      id: 'gn24_12',
      title: 'My grandmother died and her crochet blanket warms me',
      narrative: [
        'Decades of stitches.',
        '',
        'Each one her love.',
        '',
        'Wrapped in warmth.',
        '',
        'Body comfort.',
        '',
        'I tell blanket-inheritors: bodily warmth.'
      ],
      lesson: 'Inherited crochet blankets provide bodily warmth in decades of grandmother stitches.'
    },
    {
      id: 'gn24_13',
      title: 'My mother died and her recipes I share',
      narrative: [
        'Her recipes I share with friends.',
        '',
        'They bake them too.',
        '',
        'Continuing widely.',
        '',
        'Memory spreads.',
        '',
        'I tell recipe-sharers: spread widely.'
      ],
      lesson: 'Sharing deceased mothers recipes widely with friends spreads memory beyond family.'
    },
    {
      id: 'gn24_14',
      title: 'My grandfather died and his fishing photos hang',
      narrative: [
        'Photos of his catches.',
        '',
        'Frame and hang.',
        '',
        'Daily reminder of his hobby.',
        '',
        'I tell photo-display: hobby photos.'
      ],
      lesson: 'Displaying grandfather hobby photos continues daily reminder of their loves.'
    },
    {
      id: 'gn24_15',
      title: 'My friend died and her favorite restaurant is shared memory',
      narrative: [
        'We dined there often.',
        '',
        'I dine alone there sometimes.',
        '',
        'Memorial meal.',
        '',
        'Place holds.',
        '',
        'I tell solo-diners: place memory.'
      ],
      lesson: 'Dining solo at restaurants shared with deceased friends keeps place memory alive.'
    }
  ];

  var GRIEF_NARRATIVES_25 = [
    {
      id: 'gn25_1',
      title: 'My partner died and his contact still in my phone',
      narrative: [
        'Years after.',
        '',
        'Contact remains.',
        '',
        'Cannot delete.',
        '',
        'Phantom in phone.',
        '',
        'I tell phone-keepers: keep it.'
      ],
      lesson: 'Keeping deceased partners contact in phone for years is normal long-term grief.'
    },
    {
      id: 'gn25_2',
      title: 'My mother died and her hands knit in dreams',
      narrative: [
        'Dreams of her knitting.',
        '',
        'I sit watching.',
        '',
        'Wake longing.',
        '',
        'Dream visits continue.',
        '',
        'I tell dream-visited: welcome.'
      ],
      lesson: 'Dream visits of deceased loved ones knitting continue presence in sleep.'
    },
    {
      id: 'gn25_3',
      title: 'My grandfather died and his books fill shelves',
      narrative: [
        'Library inherited.',
        '',
        'Read his books.',
        '',
        'Notes in margins.',
        '',
        'Knew him through reading.',
        '',
        'I tell book-inheritors: read marginalia.'
      ],
      lesson: 'Reading deceased grandfathers books with margin notes reveals their inner life.'
    },
    {
      id: 'gn25_4',
      title: 'My friend died and her favorite poem is in frame',
      narrative: [
        'Rumi poem she loved.',
        '',
        'Framed on my wall.',
        '',
        'Daily reading.',
        '',
        'Her voice through words.',
        '',
        'I tell poem-mourners: frame and read.'
      ],
      lesson: 'Framing deceased friends favorite poems provides daily reading of their preferred words.'
    },
    {
      id: 'gn25_5',
      title: 'My uncle died and his birthday is fishing day',
      narrative: [
        'Annual fishing in his honor.',
        '',
        'Same lake.',
        '',
        'Family rods.',
        '',
        'I tell fishing-families: annual.'
      ],
      lesson: 'Annual fishing on deceased uncle birthdays at favorite lakes sustains family activity.'
    },
    {
      id: 'gn25_6',
      title: 'My grandmother died and her hat box opens',
      narrative: [
        'Hat box of vintage hats.',
        '',
        'Inherited.',
        '',
        'Wear at weddings.',
        '',
        'Continuing her elegance.',
        '',
        'I tell hat-inheritors: special occasions.'
      ],
      lesson: 'Inherited vintage hats worn at special occasions continue deceased grandmother elegance.'
    },
    {
      id: 'gn25_7',
      title: 'My mother died and her birthday cake recipe',
      narrative: [
        'Carrot cake.',
        '',
        'Her birthday recipe.',
        '',
        'Bake annually.',
        '',
        'Family eats.',
        '',
        'I tell cake-recipe: bake annually.'
      ],
      lesson: 'Annual birthday cake recipes of deceased mothers baked continue family tradition.'
    },
    {
      id: 'gn25_8',
      title: 'My grandfather died and his slippers stay by door',
      narrative: [
        'His slippers.',
        '',
        'By his chair.',
        '',
        'Unmoved.',
        '',
        'Symbolic presence.',
        '',
        'I tell shoe-keepers: untouched holds.'
      ],
      lesson: 'Unmoved slippers of deceased grandfathers by chairs hold symbolic continuing presence.'
    },
    {
      id: 'gn25_9',
      title: 'My friend died and her dog still sleeps with me',
      narrative: [
        'Took her dog at death.',
        '',
        'Years later.',
        '',
        'Sleeps on my bed.',
        '',
        'Shared grief animal.',
        '',
        'I tell pet-inheritors: bed shared.'
      ],
      lesson: 'Inherited dogs sleeping on beds become shared grief animal companions.'
    },
    {
      id: 'gn25_10',
      title: 'My partner died and his birthday is foundation day',
      narrative: [
        'On his birthday.',
        '',
        'Donate to his cause.',
        '',
        'Annual gift.',
        '',
        'Continuing his values.',
        '',
        'I tell donation-mourners: annual gift.'
      ],
      lesson: 'Annual donations on deceased partners birthdays to their causes continue values.'
    },
    {
      id: 'gn25_11',
      title: 'My uncle died and his accordion plays',
      narrative: [
        'Old accordion.',
        '',
        'Inherited.',
        '',
        'Learn to play.',
        '',
        'Family parties accordion night.',
        '',
        'I tell instrument-inheritors: learn.'
      ],
      lesson: 'Inherited accordions learned by descendants continue family music nights.'
    },
    {
      id: 'gn25_12',
      title: 'My grandmother died and her tablecloth is in drawer',
      narrative: [
        'Decades old tablecloth.',
        '',
        'Inherited.',
        '',
        'Use for special meals.',
        '',
        'Family gathered around her cloth.',
        '',
        'I tell linen-inheritors: special meals.'
      ],
      lesson: 'Inherited tablecloths used for special meals gather family around deceased grandmother fabric.'
    },
    {
      id: 'gn25_13',
      title: 'My mother died and her perfume lingers',
      narrative: [
        'Bottle in drawer.',
        '',
        'Smell on hard days.',
        '',
        'Faint scent of her.',
        '',
        'Bottle as portable presence.',
        '',
        'I tell perfume-keepers: bottle holds.'
      ],
      lesson: 'Saved perfume bottles of deceased mothers hold faint scent for years; portable presence.'
    },
    {
      id: 'gn25_14',
      title: 'My grandfather died and his birthday is workshop day',
      narrative: [
        'Annual workshop day.',
        '',
        'Build something.',
        '',
        'His birthday.',
        '',
        'Continuing his hands work.',
        '',
        'I tell workshop-mourners: annual building.'
      ],
      lesson: 'Annual workshop days on deceased grandfathers birthdays continue hands work tradition.'
    },
    {
      id: 'gn25_15',
      title: 'My grief deepened my love of life',
      narrative: [
        'After grief.',
        '',
        'Life precious.',
        '',
        'Each moment.',
        '',
        'Loss taught love.',
        '',
        'I tell life-changed: grief teaches preciousness.'
      ],
      lesson: 'Grief deepens love of life; loss teaches preciousness of each moment.'
    }
  ];

  var GRIEF_NARRATIVES_16 = [
    {
      id: 'gn16_1',
      title: 'My father died and his old jokes still make me laugh',
      narrative: [
        'Dad jokes endless.',
        '',
        'Still tell them.',
        '',
        'Family laughs.',
        '',
        'Continuing through humor.',
        '',
        'I tell humor-inheritors: tell their jokes.'
      ],
      lesson: 'Telling deceased loved ones jokes continues their humor at family gatherings.'
    },
    {
      id: 'gn16_2',
      title: 'My grandfather died and his workshop is sacred',
      narrative: [
        'Tools as he left them.',
        '',
        'Sawdust still on bench.',
        '',
        'Did not change anything.',
        '',
        'Sacred space.',
        '',
        'I tell workshop-keepers: leave it.'
      ],
      lesson: 'Workshops left as deceased loved ones had them become sacred grief spaces.'
    },
    {
      id: 'gn16_3',
      title: 'My mother died and I keep her glasses on bedside',
      narrative: [
        'Her reading glasses.',
        '',
        'Beside my bed.',
        '',
        'Daily presence.',
        '',
        'Picked up sometimes.',
        '',
        'I tell glasses-keepers: bedside placement.'
      ],
      lesson: 'Deceased loved ones glasses on bedside provide daily picked-up presence.'
    },
    {
      id: 'gn16_4',
      title: 'My uncle died and his stamp collection is mine',
      narrative: [
        'Inherited boxes.',
        '',
        'Continuing his hobby.',
        '',
        'Stamps tell history.',
        '',
        'I tell collection-inheritors: continue collecting.'
      ],
      lesson: 'Inherited collections continued provide ongoing grief work in collecting.'
    },
    {
      id: 'gn16_5',
      title: 'My partner died and I painted our bedroom',
      narrative: [
        'New color.',
        '',
        'Marked transition.',
        '',
        'Same room, new presence.',
        '',
        'Honored old, allowed new.',
        '',
        'I tell newly-widowed: room transitions help.'
      ],
      lesson: 'Painting shared bedroom in new color after partner loss marks grief transition.'
    },
    {
      id: 'gn16_6',
      title: 'My grandmother died and I keep her aprons',
      narrative: [
        'Hung in kitchen.',
        '',
        'Wear when I cook.',
        '',
        'Continuing kitchen presence.',
        '',
        'I tell apron-keepers: wear them cooking.'
      ],
      lesson: 'Inherited aprons worn while cooking continue deceased loved ones kitchen presence.'
    },
    {
      id: 'gn16_7',
      title: 'My friend died and I keep his handshake style',
      narrative: [
        'Strong handshake he taught.',
        '',
        'I shake hands like him now.',
        '',
        'Bodily continuation.',
        '',
        'I tell gesture-continuers: bodies remember.'
      ],
      lesson: 'Bodily gestures of deceased loved ones continue through learners imitating.'
    },
    {
      id: 'gn16_8',
      title: 'My mother died and her hymns sing in my head',
      narrative: [
        'She hummed hymns daily.',
        '',
        'Now I hum them.',
        '',
        'Continuing her voice.',
        '',
        'I tell humming-mourners: sing along.'
      ],
      lesson: 'Humming deceased loved ones hymns continues their voice through humming.'
    },
    {
      id: 'gn16_9',
      title: 'My grandfather died and his shoes are mine',
      narrative: [
        'Old leather work boots.',
        '',
        'Same size.',
        '',
        'Wear them gardening.',
        '',
        'Walk in his shoes.',
        '',
        'I tell shoe-inheritors: walk in them.'
      ],
      lesson: 'Inherited work boots worn gardening literalize walking in deceased loved ones shoes.'
    },
    {
      id: 'gn16_10',
      title: 'My partner died and our cat watches the door',
      narrative: [
        'Cat waits at door.',
        '',
        'Years later.',
        '',
        'Still expects him.',
        '',
        'Animal grief is patience.',
        '',
        'I tell pet-of-deceased: animals wait.'
      ],
      lesson: 'Pets of deceased partners may wait at doors for years; animal grief is patient.'
    },
    {
      id: 'gn16_11',
      title: 'My grandmother died and her tea is mine to brew',
      narrative: [
        'Her tea blend.',
        '',
        'Same shop.',
        '',
        'Brew it daily.',
        '',
        'Continuing her ritual.',
        '',
        'I tell tea-mourners: continue brewing.'
      ],
      lesson: 'Continuing deceased loved ones tea ritual through same blend continues morning presence.'
    },
    {
      id: 'gn16_12',
      title: 'My uncle died and I learned to play his harmonica',
      narrative: [
        'His harmonica I inherited.',
        '',
        'Self-taught.',
        '',
        'Play at family events.',
        '',
        'His music continues.',
        '',
        'I tell instrument-inheritors: learn to play.'
      ],
      lesson: 'Learning to play deceased uncle harmonicas continues family music tradition.'
    },
    {
      id: 'gn16_13',
      title: 'My friend died and her dog finally settled with me',
      narrative: [
        'Took her dog.',
        '',
        'Searched for her months.',
        '',
        'Slowly settled.',
        '',
        'Now my companion.',
        '',
        'Shared grief animal.',
        '',
        'I tell inherited-pets: months of adjustment.'
      ],
      lesson: 'Inherited pets need months to settle; mutual grief animal companionship eventually forms.'
    },
    {
      id: 'gn16_14',
      title: 'My mother died and I keep her mothers day cards',
      narrative: [
        'Cards I gave her over years.',
        '',
        'She saved every one.',
        '',
        'Found in her things.',
        '',
        'Reading them sobered me.',
        '',
        'I tell card-finders: she kept everything.'
      ],
      lesson: 'Finding cards saved by deceased parents reveals depth of love kept silent.'
    },
    {
      id: 'gn16_15',
      title: 'My grief became part of me but not all of me',
      narrative: [
        'Years out.',
        '',
        'Grief integrated.',
        '',
        'Part of who I am.',
        '',
        'Not who I am whole.',
        '',
        'I am whole and grieving.',
        '',
        'I tell long-grievers: wholeness with grief.'
      ],
      lesson: 'Wholeness includes integrated grief; not all of you, but part.'
    }
  ];

  var GRIEF_NARRATIVES_17 = [
    {
      id: 'gn17_1',
      title: 'My father died and his ties hang in my closet',
      narrative: [
        'Inherited his tie collection.',
        '',
        'Wear them to work.',
        '',
        'Daily reminder.',
        '',
        'I tell tie-inheritors: wear them.'
      ],
      lesson: 'Inherited ties worn to work provide daily continuing presence of fathers.'
    },
    {
      id: 'gn17_2',
      title: 'My mother died and I keep her cookbooks',
      narrative: [
        'Her annotated cookbooks.',
        '',
        'Notes on recipes.',
        '',
        'I cook from them.',
        '',
        'Following her marginalia.',
        '',
        'I tell cookbook-inheritors: cook her notes.'
      ],
      lesson: 'Cooking from deceased loved ones annotated cookbooks following marginalia continues bond.'
    },
    {
      id: 'gn17_3',
      title: 'My grandfather died and his pocket watch is mine',
      narrative: [
        'Old pocket watch.',
        '',
        'Wear it special occasions.',
        '',
        'Time keeping continued.',
        '',
        'I tell watch-inheritors: special occasions.'
      ],
      lesson: 'Pocket watches inherited from grandfathers worn on special occasions continue time keeping.'
    },
    {
      id: 'gn17_4',
      title: 'My partner died and his email account remains active',
      narrative: [
        'Cannot deactivate.',
        '',
        'Forwarding to me.',
        '',
        'Mail still arrives for him.',
        '',
        'Digital ghosts.',
        '',
        'I tell digital-mourners: emails continue.'
      ],
      lesson: 'Email accounts of deceased partners with mail still arriving become digital ghosts.'
    },
    {
      id: 'gn17_5',
      title: 'My friend died and her favorite restaurant is my pilgrimage',
      narrative: [
        'Visit annually.',
        '',
        'Sit at her favorite booth.',
        '',
        'Order her usual.',
        '',
        'Memorial dinner solo.',
        '',
        'I tell pilgrimage-mourners: places hold.'
      ],
      lesson: 'Annual pilgrimages to deceased loved ones favorite restaurants become memorial ritual.'
    },
    {
      id: 'gn17_6',
      title: 'My uncle died and his car collection is sold',
      narrative: [
        'Family decision.',
        '',
        'Could not maintain.',
        '',
        'Loss of objects.',
        '',
        'Then loss of objects again.',
        '',
        'Layered grief.',
        '',
        'I tell collection-sellers: layered loss.'
      ],
      lesson: 'Selling inherited collections creates layered loss; objects of loved ones lost again.'
    },
    {
      id: 'gn17_7',
      title: 'My grandmother died and her photos cover my walls',
      narrative: [
        'Inherited her photos.',
        '',
        'Frame them all.',
        '',
        'Walls of family.',
        '',
        'Daily visual presence.',
        '',
        'I tell photo-inheritors: frame and hang.'
      ],
      lesson: 'Inherited family photos framed and hung on walls provide daily visual presence.'
    },
    {
      id: 'gn17_8',
      title: 'My partner died and his hand-tools are in my garage',
      narrative: [
        'Inherited his tool collection.',
        '',
        'I use them.',
        '',
        'Hands fit his tools.',
        '',
        'Continuing his work.',
        '',
        'I tell tool-inheritors: use them.'
      ],
      lesson: 'Using inherited tools continues deceased partners work through hands fitting their grips.'
    },
    {
      id: 'gn17_9',
      title: 'My mother died and her recipes are family heirlooms',
      narrative: [
        'Printed recipe books.',
        '',
        'Distributed to children.',
        '',
        'Annual gathering recipes.',
        '',
        'Continuing through generations.',
        '',
        'I tell recipe-distributors: print for all.'
      ],
      lesson: 'Printed family recipes distributed to all children continue mothers cooking generationally.'
    },
    {
      id: 'gn17_10',
      title: 'My grandfather died and his hat collection lives',
      narrative: [
        'Many hats.',
        '',
        'Each with story.',
        '',
        'Wear different ones.',
        '',
        'Continuing collection.',
        '',
        'I tell hat-collectors: continue wearing.'
      ],
      lesson: 'Inherited hat collections worn rotationally continue deceased loved ones style.'
    },
    {
      id: 'gn17_11',
      title: 'My friend died and her playlist is in my car',
      narrative: [
        'Spotify playlist she made.',
        '',
        'Play on long drives.',
        '',
        'Her curation continues.',
        '',
        'I tell playlist-mourners: drive with them.'
      ],
      lesson: 'Deceased friends playlists in cars on long drives continue curated voice.'
    },
    {
      id: 'gn17_12',
      title: 'My uncle died and his bowling ball is mine',
      narrative: [
        'Old bowling ball.',
        '',
        'Custom drilled to his hand.',
        '',
        'Same size as mine.',
        '',
        'Bowl with his ball.',
        '',
        'I tell hobby-inheritors: continue.'
      ],
      lesson: 'Inherited hobby equipment continued provides bodily fit and continuing presence.'
    },
    {
      id: 'gn17_13',
      title: 'My grandmother died and her pies live in my oven',
      narrative: [
        'Her pie recipes.',
        '',
        'I bake them.',
        '',
        'Apple, pumpkin, cherry.',
        '',
        'House smells of her.',
        '',
        'I tell pie-bakers: continue.'
      ],
      lesson: 'Baking deceased grandmothers pie recipes fills house with continuing scent presence.'
    },
    {
      id: 'gn17_14',
      title: 'My friend died and her wedding ring is mine',
      narrative: [
        'Her husband gave it to me.',
        '',
        'Wear on right hand.',
        '',
        'Continuing her marriage.',
        '',
        'I tell ring-inheritors: bodily presence.'
      ],
      lesson: 'Wedding rings of deceased friends worn on opposite hand continue their marriage as memory.'
    },
    {
      id: 'gn17_15',
      title: 'My grief and grace coexist',
      narrative: [
        'Both true.',
        '',
        'Grief deep.',
        '',
        'Grace flowing.',
        '',
        'They coexist.',
        '',
        'I tell grace-grieving: both can be true.'
      ],
      lesson: 'Grief and grace coexist; both deep and flowing simultaneously.'
    }
  ];

  var GRIEF_NARRATIVES_18 = [
    {
      id: 'gn18_1',
      title: 'My grief shaped how I love my children',
      narrative: [
        'Hold them tighter.',
        '',
        'Tell them I love them daily.',
        '',
        'Knowing how loss works.',
        '',
        'Grief shapes parenting.',
        '',
        'I tell grieving parents: love stronger.'
      ],
      lesson: 'Grief shapes parenting toward more frequent expressed love; survivors love more openly.'
    },
    {
      id: 'gn18_2',
      title: 'My partner died and I write his story',
      narrative: [
        'Started memoir.',
        '',
        'His life through my eyes.',
        '',
        'Continuing his story.',
        '',
        'For our children.',
        '',
        'I tell memoir-writers: tell their story.'
      ],
      lesson: 'Writing deceased partners memoir continues their story for children and history.'
    },
    {
      id: 'gn18_3',
      title: 'My grandmother died and her piano is in my living room',
      narrative: [
        'Inherited piano.',
        '',
        'Same one she played.',
        '',
        'Children learn on it.',
        '',
        'Generational music.',
        '',
        'I tell piano-inheritors: teach next generation.'
      ],
      lesson: 'Inherited pianos taught to next generation continue music across generations.'
    },
    {
      id: 'gn18_4',
      title: 'My uncle died and his stories live in family',
      narrative: [
        'Family stories of him.',
        '',
        'Repeated at gatherings.',
        '',
        'Larger than life.',
        '',
        'Legend continues.',
        '',
        'I tell legend-keepers: tell stories.'
      ],
      lesson: 'Family stories of deceased uncles continue at gatherings; legends grow.'
    },
    {
      id: 'gn18_5',
      title: 'My mother died and her gardening tools are mine',
      narrative: [
        'Inherited her tools.',
        '',
        'Garden with them.',
        '',
        'Her hands guided mine.',
        '',
        'Continuing her green thumb.',
        '',
        'I tell garden-inheritors: continue.'
      ],
      lesson: 'Gardening with deceased mothers tools continues green thumb through hands.'
    },
    {
      id: 'gn18_6',
      title: 'My grandfather died and his fishing tales live',
      narrative: [
        'Stories of his fishing.',
        '',
        'Told and retold.',
        '',
        'Each generation adds detail.',
        '',
        'Family folklore.',
        '',
        'I tell story-fishers: tell tales.'
      ],
      lesson: 'Fishing tales of deceased grandfathers become family folklore through generations.'
    },
    {
      id: 'gn18_7',
      title: 'My friend died and we toast her annually',
      narrative: [
        'Friend group gathers.',
        '',
        'Raise glasses.',
        '',
        'Toast her name.',
        '',
        'Annual ritual.',
        '',
        'I tell toast-makers: annual sustains.'
      ],
      lesson: 'Annual toast rituals among friends sustain deceased loved ones in chosen family.'
    },
    {
      id: 'gn18_8',
      title: 'My partner died and his desk is preserved',
      narrative: [
        'Office where he worked.',
        '',
        'Left as he had it.',
        '',
        'Sit at his desk sometimes.',
        '',
        'Continuing presence.',
        '',
        'I tell desk-preservers: presence held.'
      ],
      lesson: 'Preserved desks of deceased partners hold continuing presence in workspaces.'
    },
    {
      id: 'gn18_9',
      title: 'My grandmother died and her quilts cover beds',
      narrative: [
        'Quilts she made.',
        '',
        'On family beds.',
        '',
        'Generational warmth.',
        '',
        'Stitches of her love.',
        '',
        'I tell quilt-inheritors: spread love.'
      ],
      lesson: 'Handmade quilts of deceased grandmothers spread on family beds continue love generationally.'
    },
    {
      id: 'gn18_10',
      title: 'My mother died and her birthday is reunion day',
      narrative: [
        'Family gathers her birthday.',
        '',
        'Annual reunion.',
        '',
        'Honors her.',
        '',
        'Brings us together.',
        '',
        'I tell birthday-reuniters: tradition sustains.'
      ],
      lesson: 'Annual reunions on deceased mothers birthdays honor and reunite family.'
    },
    {
      id: 'gn18_11',
      title: 'My friend died and I bake her cookies on death anniversary',
      narrative: [
        'Her chocolate chip recipe.',
        '',
        'Bake annually death day.',
        '',
        'Share with her family.',
        '',
        'Sweet remembrance.',
        '',
        'I tell cookie-bakers: bake annually.'
      ],
      lesson: 'Baking deceased friends cookie recipes on death anniversaries shares sweet remembrance.'
    },
    {
      id: 'gn18_12',
      title: 'My uncle died and his Christmas tree decorations',
      narrative: [
        'His ornaments now hang.',
        '',
        'Our family tree.',
        '',
        'Each one his story.',
        '',
        'Annual ritual.',
        '',
        'I tell ornament-inheritors: hang them.'
      ],
      lesson: 'Inherited Christmas ornaments hung annually carry deceased uncle stories.'
    },
    {
      id: 'gn18_13',
      title: 'My grandfather died and his porch swing is mine',
      narrative: [
        'Inherited his porch swing.',
        '',
        'Sit there evenings.',
        '',
        'Continuing his ritual.',
        '',
        'I tell swing-inheritors: sit evenings.'
      ],
      lesson: 'Inherited porch swings provide place to continue deceased grandfathers evening ritual.'
    },
    {
      id: 'gn18_14',
      title: 'My partner died and his half of the bed is empty',
      narrative: [
        'Cannot sleep on his side.',
        '',
        'Empty space.',
        '',
        'Permanent absence.',
        '',
        'Bed grief.',
        '',
        'I tell widowed: bed grief is real.'
      ],
      lesson: 'Empty side of bed after partner death is permanent grief space; bed grief is real.'
    },
    {
      id: 'gn18_15',
      title: 'My grief shaped my whole life and I am okay',
      narrative: [
        'Decades since loss.',
        '',
        'Whole life shaped.',
        '',
        'Still okay.',
        '',
        'Both true.',
        '',
        'I tell early-loss adults: shaped and okay.'
      ],
      lesson: 'Decades-old grief shapes whole life; living okay alongside is possible.'
    }
  ];

  var GRIEF_NARRATIVES_19 = [
    {
      id: 'gn19_1',
      title: 'My grandmother died and her teacups are precious',
      narrative: [
        'Inherited her teacups.',
        '',
        'Use them daily.',
        '',
        'Risk breaking.',
        '',
        'Worth daily use.',
        '',
        'I tell teacup-keepers: use daily.'
      ],
      lesson: 'Precious teacups of grandmothers worth daily use risk of breaking; presence matters.'
    },
    {
      id: 'gn19_2',
      title: 'My uncle died and his Christmas eve party continues',
      narrative: [
        'Annual party he hosted.',
        '',
        'Family continues.',
        '',
        'Same date.',
        '',
        'New host.',
        '',
        'Tradition unbroken.',
        '',
        'I tell party-continuers: tradition lives.'
      ],
      lesson: 'Annual parties hosted by deceased family members continued by new hosts maintain tradition.'
    },
    {
      id: 'gn19_3',
      title: 'My friend died and her handwriting is on my wall',
      narrative: [
        'Letter she wrote me.',
        '',
        'Framed on wall.',
        '',
        'Her hand visible.',
        '',
        'Daily presence.',
        '',
        'I tell letter-framers: hang them.'
      ],
      lesson: 'Framed letters from deceased friends provide daily continuing handwriting presence.'
    },
    {
      id: 'gn19_4',
      title: 'My mother died and I keep her favorite mug',
      narrative: [
        'Coffee mug she used daily.',
        '',
        'Cracked but whole.',
        '',
        'I use it every morning.',
        '',
        'Continuing morning ritual.',
        '',
        'I tell mug-keepers: use daily.'
      ],
      lesson: 'Daily use of deceased mothers mug continues morning ritual presence.'
    },
    {
      id: 'gn19_5',
      title: 'My grandfather died and his music is in my house',
      narrative: [
        'His vinyl collection.',
        '',
        'Inherited.',
        '',
        'Plays his music nights.',
        '',
        'House filled with his sound.',
        '',
        'I tell vinyl-inheritors: play often.'
      ],
      lesson: 'Inherited vinyl collections play deceased grandfathers music filling house with their sound.'
    },
    {
      id: 'gn19_6',
      title: 'My partner died and I keep our photo album',
      narrative: [
        'Wedding album.',
        '',
        'Vacation albums.',
        '',
        'Childhood of our kids.',
        '',
        'All preserved.',
        '',
        'Pages of life.',
        '',
        'I tell album-keepers: pages hold.'
      ],
      lesson: 'Photo albums of life with deceased partners preserve pages of life together.'
    },
    {
      id: 'gn19_7',
      title: 'My friend died and her dog is mine forever',
      narrative: [
        'Took her dog at her death.',
        '',
        'Years later.',
        '',
        'Dog is my closest companion.',
        '',
        'Continuing bond.',
        '',
        'I tell pet-inheritors: forever bond.'
      ],
      lesson: 'Inherited pets become forever companions; continuing bond through animal.'
    },
    {
      id: 'gn19_8',
      title: 'My uncle died and his birthday is family day',
      narrative: [
        'July 23 annual gathering.',
        '',
        'Family at park.',
        '',
        'BBQ in his honor.',
        '',
        'Annual reunion.',
        '',
        'I tell birthday-reuniters: gather.'
      ],
      lesson: 'Annual family BBQs on deceased uncle birthdays sustain reunion ritual.'
    },
    {
      id: 'gn19_9',
      title: 'My grandmother died and her Christmas dish continues',
      narrative: [
        'Her stuffing recipe.',
        '',
        'Annual Thanksgiving.',
        '',
        'Every year.',
        '',
        'Same dish.',
        '',
        'Continuing.',
        '',
        'I tell recipe-keepers: holiday traditions.'
      ],
      lesson: 'Holiday recipes of deceased grandmothers continued annually sustain family tradition.'
    },
    {
      id: 'gn19_10',
      title: 'My mother died and her chair is empty at Sunday dinner',
      narrative: [
        'Sunday dinners continue.',
        '',
        'Her chair stays empty.',
        '',
        'Acknowledged but not filled.',
        '',
        'Place held.',
        '',
        'I tell chair-keepers: hold the place.'
      ],
      lesson: 'Empty chair held at Sunday dinner acknowledges deceased loved ones place at table.'
    },
    {
      id: 'gn19_11',
      title: 'My grandfather died and his tractor still runs',
      narrative: [
        'Old John Deere.',
        '',
        'Inherited.',
        '',
        'I farm with it.',
        '',
        'His machine continues.',
        '',
        'I tell machine-inheritors: keep running.'
      ],
      lesson: 'Inherited tractors and machines kept running continue deceased grandfathers work.'
    },
    {
      id: 'gn19_12',
      title: 'My friend died and we wear her favorite color annually',
      narrative: [
        'Purple was her color.',
        '',
        'Friends wear purple on her birthday.',
        '',
        'Annual ritual.',
        '',
        'Color memorial.',
        '',
        'I tell color-rememberers: wear together.'
      ],
      lesson: 'Wearing deceased friends favorite color annually together provides color memorial ritual.'
    },
    {
      id: 'gn19_13',
      title: 'My partner died and his shaving kit is still on counter',
      narrative: [
        'Old shaving kit.',
        '',
        'Untouched.',
        '',
        'Bathroom presence.',
        '',
        'Daily reminder.',
        '',
        'I tell bathroom-keepers: untouched holds.'
      ],
      lesson: 'Untouched shaving kits of deceased partners on bathroom counters hold daily presence.'
    },
    {
      id: 'gn19_14',
      title: 'My mother died and her hands are mine now',
      narrative: [
        'Same shape.',
        '',
        'Same fingers.',
        '',
        'My hands look like hers.',
        '',
        'Daily reminder when I look down.',
        '',
        'I tell hand-recognizers: bodies remember.'
      ],
      lesson: 'Hands resembling deceased loved ones provide daily reminder; bodies remember.'
    },
    {
      id: 'gn19_15',
      title: 'My grief is part of my whole life now',
      narrative: [
        'Years out.',
        '',
        'Grief part of identity.',
        '',
        'Not central.',
        '',
        'But always present.',
        '',
        'I tell long-term grievers: integration is destination.'
      ],
      lesson: 'Long-term grief integration is destination; present but not central in identity.'
    }
  ];

  var GRIEF_NARRATIVES_20 = [
    {
      id: 'gn20_1',
      title: 'My father died and I tell my kids about him',
      narrative: [
        'Photos of grandpa.',
        '',
        'Stories told.',
        '',
        'Kids know him.',
        '',
        'Continuing through grandchildren.',
        '',
        'I tell grandparent-deprived parents: tell stories.'
      ],
      lesson: 'Telling children about deceased grandparents continues them through grandchild knowing.'
    },
    {
      id: 'gn20_2',
      title: 'My grandmother died and her birthday is annual gathering',
      narrative: [
        'October 12.',
        '',
        'Family gathers annually.',
        '',
        'Her favorite restaurant.',
        '',
        'Continuing reunion.',
        '',
        'I tell reunion-keepers: tradition sustains.'
      ],
      lesson: 'Annual family gathering on deceased grandmother birthdays sustains reunion ritual.'
    },
    {
      id: 'gn20_3',
      title: 'My partner died and his glasses are on my desk',
      narrative: [
        'His reading glasses.',
        '',
        'Desk drawer.',
        '',
        'I see them daily.',
        '',
        'Daily presence.',
        '',
        'I tell desk-presence keepers: visible.'
      ],
      lesson: 'Desk presence of deceased partners glasses provides daily visible reminder.'
    },
    {
      id: 'gn20_4',
      title: 'My uncle died and his lake house is mine',
      narrative: [
        'Inherited lake house.',
        '',
        'Family vacations there.',
        '',
        'Continuing his summers.',
        '',
        'I tell property-inheritors: continue use.'
      ],
      lesson: 'Inherited family lake houses continued for vacations sustain deceased loved ones summers.'
    },
    {
      id: 'gn20_5',
      title: 'My friend died and her favorite museum is my pilgrimage',
      narrative: [
        'Annual visit.',
        '',
        'Look at her favorite paintings.',
        '',
        'Sit on her favorite bench.',
        '',
        'Museum pilgrimage.',
        '',
        'I tell place-pilgrims: visit annually.'
      ],
      lesson: 'Annual pilgrimages to deceased friends favorite museums sustain place memorial.'
    },
    {
      id: 'gn20_6',
      title: 'My grandmother died and her birthday cake recipe matters',
      narrative: [
        'Bake it annual her birthday.',
        '',
        'Family gathers.',
        '',
        'Each year same cake.',
        '',
        'Annual ritual.',
        '',
        'I tell cake-bakers: annual tradition.'
      ],
      lesson: 'Annual birthday cake bakings of deceased grandmothers sustain family ritual.'
    },
    {
      id: 'gn20_7',
      title: 'My mother died and her old purse is mine',
      narrative: [
        'Brown leather purse.',
        '',
        'Still smells like her.',
        '',
        'Carry it sometimes.',
        '',
        'Continuing presence.',
        '',
        'I tell purse-inheritors: carry sometimes.'
      ],
      lesson: 'Inherited mothers purses carried sometimes continue scent presence on body.'
    },
    {
      id: 'gn20_8',
      title: 'My grandfather died and his hunting jacket is in closet',
      narrative: [
        'Wool hunting jacket.',
        '',
        'Hangs in my closet.',
        '',
        'Wear in fall.',
        '',
        'His weight on shoulders.',
        '',
        'I tell jacket-inheritors: fall wear.'
      ],
      lesson: 'Inherited hunting jackets worn in fall provide deceased grandfathers weight on shoulders.'
    },
    {
      id: 'gn20_9',
      title: 'My uncle died and his bowling shirt I wear sometimes',
      narrative: [
        'Old bowling shirt.',
        '',
        'His name embroidered.',
        '',
        'Wear it bowling sometimes.',
        '',
        'Continuing.',
        '',
        'I tell sports-shirt inheritors: wear bowling.'
      ],
      lesson: 'Inherited sports shirts of deceased uncles worn while playing continue presence in activity.'
    },
    {
      id: 'gn20_10',
      title: 'My partner died and his birthday flower is on table',
      narrative: [
        'Roses on his birthday.',
        '',
        'On dining table.',
        '',
        'Annual ritual.',
        '',
        'Flowers honor.',
        '',
        'I tell flower-keepers: annual table.'
      ],
      lesson: 'Annual flowers on dining table for deceased partners birthdays honor through ritual.'
    },
    {
      id: 'gn20_11',
      title: 'My friend died and her favorite hike is annual',
      narrative: [
        'Mountain she loved.',
        '',
        'Annual hike in her honor.',
        '',
        'Same trail.',
        '',
        'Friends gather.',
        '',
        'I tell hike-mourners: trail ritual.'
      ],
      lesson: 'Annual hikes on deceased friends favorite trails honor through shared physical movement.'
    },
    {
      id: 'gn20_12',
      title: 'My grandmother died and her recipe binder is mine',
      narrative: [
        'Three-ring binder.',
        '',
        'Decades of recipes.',
        '',
        'Inherited.',
        '',
        'I cook from it weekly.',
        '',
        'I tell binder-inheritors: cook weekly.'
      ],
      lesson: 'Inherited recipe binders cooked weekly continue deceased grandmothers kitchen presence.'
    },
    {
      id: 'gn20_13',
      title: 'My uncle died and his birthday is reunion day',
      narrative: [
        'July 14 annual.',
        '',
        'Family gathers.',
        '',
        'BBQ continues.',
        '',
        'Reunion sustains.',
        '',
        'I tell reunion families: birthday day.'
      ],
      lesson: 'Deceased uncles birthdays become annual family reunion days through shared meal.'
    },
    {
      id: 'gn20_14',
      title: 'My mother died and her birthday card I send to dad',
      narrative: [
        'On her birthday.',
        '',
        'Card to my dad.',
        '',
        'Acknowledge his grief.',
        '',
        'Mutual mourning.',
        '',
        'I tell spouse-of-deceased: cards on dates.'
      ],
      lesson: 'Cards sent to widowed parents on deceased parent birthdays acknowledge mutual mourning.'
    },
    {
      id: 'gn20_15',
      title: 'My grief integrated and life is full',
      narrative: [
        'Years of work.',
        '',
        'Grief integrated.',
        '',
        'Life is full.',
        '',
        'Loss present but small.',
        '',
        'Full life possible.',
        '',
        'I tell long-grievers: fullness returns.'
      ],
      lesson: 'Years of grief work integrate loss; fullness of life returns with loss present but small.'
    }
  ];

  var GRIEF_NARRATIVES_11 = [
    {
      id: 'gn11_1',
      title: 'My loss came with relief I could not name',
      narrative: [
        'Caregiver to my mother 8 years.',
        '',
        'When she died I felt relief.',
        '',
        'Shame for the relief.',
        '',
        'Therapist named caregiver grief.',
        '',
        'Relief is exhaustion ended.',
        '',
        'Not betrayal of love.',
        '',
        'I tell caregiver mourners: relief is real.'
      ],
      lesson: 'Caregiver relief at death is exhaustion ending, not betrayal of love.'
    },
    {
      id: 'gn11_2',
      title: 'My friend died and her favorite shoes are mine now',
      narrative: [
        'Her sister gave them to me.',
        '',
        'Same size.',
        '',
        'Same style.',
        '',
        'I walk in her shoes literally.',
        '',
        'Continuing bond through objects.',
        '',
        'I tell shoe-inheritors: walk in them.'
      ],
      lesson: 'Inherited shoes literalize continuing bond; walking in them is grief work.'
    },
    {
      id: 'gn11_3',
      title: 'My mother died and I see her in my children',
      narrative: [
        'My daughter laughs like her.',
        '',
        'Same gesture.',
        '',
        'Generational continuation.',
        '',
        'Grief in seeing her resurface.',
        '',
        'I tell parent-grandparent grievers: kids carry them.'
      ],
      lesson: 'Children carry deceased grandparents through gestures and laughs.'
    },
    {
      id: 'gn11_4',
      title: 'My partner died and friends do not know what to say',
      narrative: [
        'Awkward silences.',
        '',
        'Avoidance.',
        '',
        'I taught them: just say his name.',
        '',
        'Just acknowledge.',
        '',
        'Permission to mention.',
        '',
        'I tell widowed: teach your friends.'
      ],
      lesson: 'Widowed often need to teach friends; permission to say deceased name helps.'
    },
    {
      id: 'gn11_5',
      title: 'My uncle died of suicide and the family stayed silent',
      narrative: [
        'No one talked about it.',
        '',
        'Years passed.',
        '',
        'I broke the silence.',
        '',
        'Family grief surfaced.',
        '',
        'Suicide stigma silence breaks slowly.',
        '',
        'I tell suicide-loss families: silence prolongs.'
      ],
      lesson: 'Family silence after suicide prolongs grief; breaking silence allows healing.'
    },
    {
      id: 'gn11_6',
      title: 'My grandmother died and I planted her garden',
      narrative: [
        'Same plants she grew.',
        '',
        'In my new garden.',
        '',
        'Carrying on her green thumb.',
        '',
        'Annual blooms her annual visit.',
        '',
        'I tell garden inheritors: plant her plants.'
      ],
      lesson: 'Planting deceased loved ones plants in new garden creates living memorial.'
    },
    {
      id: 'gn11_7',
      title: 'My friend died on duty as firefighter',
      narrative: [
        'Line of duty death.',
        '',
        'Firefighter community grief.',
        '',
        'Specialty first responder loss support.',
        '',
        'I tell first responder families: specialty exists.'
      ],
      lesson: 'First responder line of duty deaths have specialty community support.'
    },
    {
      id: 'gn11_8',
      title: 'My friend died and her dog grieves too',
      narrative: [
        'Took her dog.',
        '',
        'Dog searched for her.',
        '',
        'Whined at doors.',
        '',
        'Animal grief is real.',
        '',
        'We grieved together.',
        '',
        'I tell pet-of-deceased: animal grief is real.'
      ],
      lesson: 'Animals grieve their deceased humans; shared mourning happens cross-species.'
    },
    {
      id: 'gn11_9',
      title: 'My mother died and I hate the holidays now',
      narrative: [
        'Holidays were her domain.',
        '',
        'Cooking, decorating, gathering.',
        '',
        'Now empty.',
        '',
        'Holiday grief.',
        '',
        'New traditions built slowly.',
        '',
        'I tell holiday grievers: new traditions help.'
      ],
      lesson: 'Holiday grief eases with building new traditions over years.'
    },
    {
      id: 'gn11_10',
      title: 'My grandfather died and I keep his handkerchiefs',
      narrative: [
        'Embroidered initials.',
        '',
        'Wore them in his pocket.',
        '',
        'Now in mine.',
        '',
        'Daily small carry.',
        '',
        'I tell hanky-inheritors: daily carry helps.'
      ],
      lesson: 'Small daily carried items of deceased create portable continuing presence.'
    },
    {
      id: 'gn11_11',
      title: 'My best friend died in college accident',
      narrative: [
        'Sophomore year.',
        '',
        'Crash on way home break.',
        '',
        'College death community.',
        '',
        'Specialty support on campus.',
        '',
        'Counseling center helped.',
        '',
        'I tell college bereaved: campus support exists.'
      ],
      lesson: 'College student loss has campus counseling support; use it.'
    },
    {
      id: 'gn11_12',
      title: 'My family pet was given away during divorce',
      narrative: [
        'Custody fight.',
        '',
        'Lost the dog.',
        '',
        'Ambiguous loss.',
        '',
        'Pet alive but unreachable.',
        '',
        'Specific divorce-pet grief.',
        '',
        'I tell pet-custody losers: real grief.'
      ],
      lesson: 'Pet custody loss in divorce is ambiguous grief; pet alive but unreachable.'
    },
    {
      id: 'gn11_13',
      title: 'My mother died and I started a memorial scholarship',
      narrative: [
        'In her name.',
        '',
        'For students in her field.',
        '',
        'Annual award.',
        '',
        'Honors her life.',
        '',
        'Continues her impact.',
        '',
        'I tell memorial-fund founders: this sustains.'
      ],
      lesson: 'Memorial scholarships in deceased loved ones names continue their impact annually.'
    },
    {
      id: 'gn11_14',
      title: 'My friend died and I do volunteer work in her honor',
      narrative: [
        'Her cause was animal rescue.',
        '',
        'I volunteer monthly.',
        '',
        'In her name.',
        '',
        'Continuing her values.',
        '',
        'I tell value-continuers: honor through service.'
      ],
      lesson: 'Continuing deceased loved ones values through service is honoring grief work.'
    },
    {
      id: 'gn11_15',
      title: 'My partner died and our song still plays everywhere',
      narrative: [
        'Random plays in stores.',
        '',
        'Cars next to mine.',
        '',
        'Always our song.',
        '',
        'Universe sending him.',
        '',
        'Or coincidence.',
        '',
        'Either way grief moment.',
        '',
        'I tell song-haunted: songs are messengers.'
      ],
      lesson: 'Our songs continue playing after partner loss; coincidence or messenger, grief moments.'
    }
  ];

  var GRIEF_NARRATIVES_12 = [
    {
      id: 'gn12_1',
      title: 'My grandfather died and I have his beard',
      narrative: [
        'Grew beard after he died.',
        '',
        'Same shape.',
        '',
        'See him in mirror.',
        '',
        'Generational beard grief.',
        '',
        'I tell beard-growers: body remembers.'
      ],
      lesson: 'Growing beards like deceased grandfathers continues bodily resemblance grief work.'
    },
    {
      id: 'gn12_2',
      title: 'My mother died and I sleep in her sweater',
      narrative: [
        'Found in her closet.',
        '',
        'Still smelled like her.',
        '',
        'Sleep in it.',
        '',
        'Wrapped in her.',
        '',
        'Bodily comfort.',
        '',
        'I tell sweater-sleepers: continued embrace.'
      ],
      lesson: 'Sleeping in deceased parents clothing provides continued embrace; bodily grief comfort.'
    },
    {
      id: 'gn12_3',
      title: 'My grief was complicated by family conflict',
      narrative: [
        'Brother and I fought during decline.',
        '',
        'Loss layered with rupture.',
        '',
        'Therapy on complicated grief.',
        '',
        'Eventually reconciled.',
        '',
        'Loss healed family.',
        '',
        'I tell sibling-fractured grievers: loss can heal.'
      ],
      lesson: 'Loss can sometimes heal sibling fractures; conflict during decline therapy work.'
    },
    {
      id: 'gn12_4',
      title: 'My mother died and aunts stepped in',
      narrative: [
        'Mother-figures arose.',
        '',
        'Her sisters held me.',
        '',
        'Continuing mother love.',
        '',
        'Extended family is grief safety.',
        '',
        'I tell motherless: aunts can step in.'
      ],
      lesson: 'Aunts can provide continuing mother love after maternal death; extended family safety.'
    },
    {
      id: 'gn12_5',
      title: 'My grandfather died and his workshop is mine',
      narrative: [
        'Inherited his tools.',
        '',
        'Same workshop.',
        '',
        'I build there.',
        '',
        'Generational continuation.',
        '',
        'Hands work like his.',
        '',
        'I tell workshop-inheritors: continuing presence.'
      ],
      lesson: 'Inherited workshops continue presence through hands working like deceased.'
    },
    {
      id: 'gn12_6',
      title: 'My partner died and I learned new hobbies',
      narrative: [
        'Took up hobbies he never shared.',
        '',
        'Painting.',
        '',
        'Hiking.',
        '',
        'New identity built.',
        '',
        'Past respected.',
        '',
        'I tell newly-widowed: new hobbies are okay.'
      ],
      lesson: 'New hobbies after partner death respect past while building new identity.'
    },
    {
      id: 'gn12_7',
      title: 'My friend died and I take care of his grave annually',
      narrative: [
        'Annual visit.',
        '',
        'Clean stone.',
        '',
        'Fresh flowers.',
        '',
        'Stay an hour.',
        '',
        'Tell him news.',
        '',
        'I tell grave-tenders: annual visits sustain.'
      ],
      lesson: 'Annual grave tending visits sustain continuing bond over years.'
    },
    {
      id: 'gn12_8',
      title: 'My mother died and I started therapy at 50',
      narrative: [
        'First therapy at 50.',
        '',
        'Grief forced me.',
        '',
        'Found whole self in therapy.',
        '',
        'Continued past grief.',
        '',
        'I tell grief-led therapy: continue.'
      ],
      lesson: 'Grief-initiated therapy at any age can become life-long self-knowing.'
    },
    {
      id: 'gn12_9',
      title: 'My grandfather died and his stories are mine to tell',
      narrative: [
        'Family stories he told.',
        '',
        'War years.',
        '',
        'Immigration.',
        '',
        'I tell them now.',
        '',
        'To my children.',
        '',
        'Story inheritance.',
        '',
        'I tell story-bearers: tell them.'
      ],
      lesson: 'Inherited family stories must be told to next generation; story bearers continue lineage.'
    },
    {
      id: 'gn12_10',
      title: 'My friend died and grief group became family',
      narrative: [
        'Five years in grief group.',
        '',
        'They are my closest people.',
        '',
        'Chosen family forged in loss.',
        '',
        'I tell grief group members: bonds form.'
      ],
      lesson: 'Long-term grief group bonds become chosen family forged in shared loss.'
    },
    {
      id: 'gn12_11',
      title: 'My mother died and we built a memorial garden',
      narrative: [
        'Family yard memorial.',
        '',
        'Plants she loved.',
        '',
        'Bench for sitting.',
        '',
        'Family gathers there.',
        '',
        'Living memorial.',
        '',
        'I tell memorial-builders: living spaces sustain.'
      ],
      lesson: 'Memorial gardens with deceased loved ones plants and benches sustain family gathering.'
    },
    {
      id: 'gn12_12',
      title: 'My uncle died and I learned family history through eulogy',
      narrative: [
        'Funeral eulogies revealed.',
        '',
        'Lives I never knew.',
        '',
        'Stories from cousins.',
        '',
        'Family larger after death.',
        '',
        'I tell funeral-attenders: listen for stories.'
      ],
      lesson: 'Funeral eulogies reveal family stories; listen to learn deceased fully.'
    },
    {
      id: 'gn12_13',
      title: 'My friend died and her writing fills my shelves',
      narrative: [
        'She was a writer.',
        '',
        'Self-published books.',
        '',
        'All on my shelves.',
        '',
        'Her voice continues.',
        '',
        'I read her annually.',
        '',
        'I tell writer-friend mourners: books are presence.'
      ],
      lesson: 'Books by deceased writer friends are continuing presence; annual reading ritual.'
    },
    {
      id: 'gn12_14',
      title: 'My partner died and I joined hiking group',
      narrative: [
        'Outdoors plus community.',
        '',
        'New friendships in nature.',
        '',
        'Healing through movement.',
        '',
        'I tell widowed seekers: nature groups help.'
      ],
      lesson: 'Hiking and outdoor groups provide healing community for widowed.'
    },
    {
      id: 'gn12_15',
      title: 'My grandmother died and I learned to knit',
      narrative: [
        'Always wanted to.',
        '',
        'After she died, I learned.',
        '',
        'Felt her with me at needles.',
        '',
        'Continuing her craft.',
        '',
        'I tell craft-curious grievers: learn after loss.'
      ],
      lesson: 'Learning crafts deceased loved ones practiced continues their craft as grief work.'
    }
  ];

  var GRIEF_NARRATIVES_13 = [
    {
      id: 'gn13_1',
      title: 'My friend died and I keep his Spotify playlists',
      narrative: [
        'His curated playlists.',
        '',
        'I follow them.',
        '',
        'Listen to his curation.',
        '',
        'Digital legacy.',
        '',
        'I tell digital grievers: playlists continue.'
      ],
      lesson: 'Spotify and digital playlists of deceased loved ones continue their curated voice.'
    },
    {
      id: 'gn13_2',
      title: 'My mother died and I throw her recipes party',
      narrative: [
        'Annual dinner party.',
        '',
        'All her recipes.',
        '',
        'Friends gather.',
        '',
        'Stories shared.',
        '',
        'Mother present in meal.',
        '',
        'I tell recipe-keepers: annual party sustains.'
      ],
      lesson: 'Annual recipe dinner parties of deceased mothers sustain memory through shared meal.'
    },
    {
      id: 'gn13_3',
      title: 'My grandfather died and my dad fell apart',
      narrative: [
        'My dads father died.',
        '',
        'Dad regressed.',
        '',
        'I supported dad through his grief.',
        '',
        'Children of grieving parents.',
        '',
        'Reverse parenting.',
        '',
        'I tell adult children of grievers: parenting parents is real.'
      ],
      lesson: 'Adult children sometimes parent their grieving parents; reverse parenting is real grief work.'
    },
    {
      id: 'gn13_4',
      title: 'My partner died and I joined widow yoga class',
      narrative: [
        'Specialty class for widowed.',
        '',
        'Body grief work together.',
        '',
        'Trauma-informed yoga.',
        '',
        'I tell widowed body-stuck: specialty yoga.'
      ],
      lesson: 'Specialty widowed yoga classes provide body-based grief work in community.'
    },
    {
      id: 'gn13_5',
      title: 'My uncle died and I inherited his trucks',
      narrative: [
        'Two classic trucks.',
        '',
        'Restored them.',
        '',
        'Continuing his hobby.',
        '',
        'Drive them at memorial weekends.',
        '',
        'I tell vehicle-inheritors: drive them.'
      ],
      lesson: 'Inherited vehicles can be restored and driven as continuing presence ritual.'
    },
    {
      id: 'gn13_6',
      title: 'My grandmother died and I took up her craft',
      narrative: [
        'She crocheted.',
        '',
        'I learned after her death.',
        '',
        'Her hooks in my hands.',
        '',
        'Continuing.',
        '',
        'I tell craft-curious: continue their craft.'
      ],
      lesson: 'Taking up deceased loved ones craft continues their hands work.'
    },
    {
      id: 'gn13_7',
      title: 'My friend died and we still group text without her',
      narrative: [
        'Three of us.',
        '',
        'Used to be four.',
        '',
        'Her contact still in thread.',
        '',
        'Phantom limb.',
        '',
        'I tell group-text mourners: phantom space remains.'
      ],
      lesson: 'Group texts retain phantom space of deceased members; phantom limb of friendship.'
    },
    {
      id: 'gn13_8',
      title: 'My mother died and I write daily in her journal',
      narrative: [
        'Her empty pages.',
        '',
        'I fill them now.',
        '',
        'Letters to her.',
        '',
        'Continuing her writing.',
        '',
        'I tell journal-inheritors: continue writing.'
      ],
      lesson: 'Continuing journal writing in deceased loved ones blank pages extends bond.'
    },
    {
      id: 'gn13_9',
      title: 'My grandfather died and I named my son for him',
      narrative: [
        'Middle name his.',
        '',
        'Continuing generational name.',
        '',
        'Carrying him forward.',
        '',
        'I tell naming-after grievers: names continue.'
      ],
      lesson: 'Naming children after deceased loved ones continues names generationally.'
    },
    {
      id: 'gn13_10',
      title: 'My friend died and the gravesite is my refuge',
      narrative: [
        'Visit weekly.',
        '',
        'Sit with him.',
        '',
        'Tell him news.',
        '',
        'Cemetery as refuge.',
        '',
        'I tell cemetery-frequenters: place matters.'
      ],
      lesson: 'Cemetery visits become refuges; place where loved one rests is sacred ground.'
    },
    {
      id: 'gn13_11',
      title: 'My mother died and I learned to bake bread like her',
      narrative: [
        'Her sourdough starter.',
        '',
        'Inherited.',
        '',
        'I feed it weekly.',
        '',
        'Bake her recipe.',
        '',
        'Living starter, living tradition.',
        '',
        'I tell sourdough-inheritors: feed the starter.'
      ],
      lesson: 'Inherited sourdough starters are living tradition; feed them weekly.'
    },
    {
      id: 'gn13_12',
      title: 'My uncle died and I read his obituary still',
      narrative: [
        'Saved newspaper.',
        '',
        'Read it annually.',
        '',
        'Remember his accomplishments.',
        '',
        'Obituary as memorial.',
        '',
        'I tell obituary-keepers: read annually.'
      ],
      lesson: 'Saved obituaries read annually serve as memorial of deceased loved ones lives.'
    },
    {
      id: 'gn13_13',
      title: 'My friend died and his birthday is harder than his death-day',
      narrative: [
        'May 14 his birthday.',
        '',
        'November 3 his death.',
        '',
        'May 14 hits harder.',
        '',
        'Birthday is what he would have lived.',
        '',
        'I tell anniversary mourners: birthdays hurt.'
      ],
      lesson: 'Deceased birthdays often hit harder than death anniversaries; what would have been.'
    },
    {
      id: 'gn13_14',
      title: 'My mother died and I keep her phone',
      narrative: [
        'Her old phone in drawer.',
        '',
        'Photos still on it.',
        '',
        'Voicemails saved.',
        '',
        'Digital artifact.',
        '',
        'I tell phone-keepers: digital artifacts hold.'
      ],
      lesson: 'Saved phones of deceased loved ones hold digital artifacts of life.'
    },
    {
      id: 'gn13_15',
      title: 'My grandfather died and his clock keeps time',
      narrative: [
        'Grandfather clock in my hall.',
        '',
        'Inherited.',
        '',
        'Wind it weekly.',
        '',
        'Continued time keeping.',
        '',
        'I tell clock-inheritors: wind weekly.'
      ],
      lesson: 'Inherited clocks must be wound weekly; continuing time keeping continues presence.'
    }
  ];

  var GRIEF_NARRATIVES_14 = [
    {
      id: 'gn14_1',
      title: 'My family pet died and my kid did her first funeral',
      narrative: [
        'Daughter age 6.',
        '',
        'Cat died.',
        '',
        'We had a backyard service.',
        '',
        'She spoke about cat.',
        '',
        'First grief lesson.',
        '',
        'I tell parents: small funerals teach.'
      ],
      lesson: 'Small backyard pet funerals teach children first grief lessons.'
    },
    {
      id: 'gn14_2',
      title: 'My mother died and her sister now mothers me',
      narrative: [
        'Aunt stepped in.',
        '',
        'Holiday calls.',
        '',
        'Birthday cards.',
        '',
        'Maternal presence.',
        '',
        'Mother sister bond.',
        '',
        'I tell motherless: maternal aunts can step in.'
      ],
      lesson: 'Maternal aunts can step into mother role after mother death; bond fills.'
    },
    {
      id: 'gn14_3',
      title: 'My partner died and I keep our wedding rings',
      narrative: [
        'Both rings now mine.',
        '',
        'Wear them on chain.',
        '',
        'Body memorial.',
        '',
        'I tell ring-keepers: chain holds.'
      ],
      lesson: 'Keeping both wedding rings on body chain continues marriage as body memorial.'
    },
    {
      id: 'gn14_4',
      title: 'My friend died and I cleaned out her apartment',
      narrative: [
        'Family asked me.',
        '',
        'Intimate grief work.',
        '',
        'Touching her things.',
        '',
        'Decisions about each.',
        '',
        'Heavy work but meaningful.',
        '',
        'I tell apartment-clearers: heavy meaningful.'
      ],
      lesson: 'Cleaning out deceased loved ones apartments is heavy meaningful grief work.'
    },
    {
      id: 'gn14_5',
      title: 'My grandmother died and her quilt covers me',
      narrative: [
        'She made it.',
        '',
        'I sleep under it.',
        '',
        'Stitches of her love.',
        '',
        'Body wrapped in her work.',
        '',
        'I tell quilt-inheritors: sleep under them.'
      ],
      lesson: 'Sleeping under handmade quilts of deceased loved ones wraps body in their love.'
    },
    {
      id: 'gn14_6',
      title: 'My uncle died and his garden is mine now',
      narrative: [
        'Inherited his rural property.',
        '',
        'Garden he tended 40 years.',
        '',
        'I continue.',
        '',
        'Soil he worked.',
        '',
        'Continuing presence.',
        '',
        'I tell garden-inheritors: continue.'
      ],
      lesson: 'Inherited gardens of deceased loved ones continue through soil tended generationally.'
    },
    {
      id: 'gn14_7',
      title: 'My mother died and I keep her glasses',
      narrative: [
        'Her reading glasses.',
        '',
        'On my bedside.',
        '',
        'Daily reminder.',
        '',
        'I tell glasses-keepers: daily presence.'
      ],
      lesson: 'Deceased loved ones glasses on bedside provide daily continuing presence.'
    },
    {
      id: 'gn14_8',
      title: 'My grandfather died and his fishing rod is mine',
      narrative: [
        'Fished with him as child.',
        '',
        'Inherited his rod.',
        '',
        'Fish in same spot annually.',
        '',
        'I tell fishing-inheritors: same spot.'
      ],
      lesson: 'Inheriting fishing rods and fishing in same spots continues grandparent bond annually.'
    },
    {
      id: 'gn14_9',
      title: 'My friend died and I edit his unfinished novel',
      narrative: [
        'He was writing a novel.',
        '',
        'Unfinished at death.',
        '',
        'Family asked me to edit.',
        '',
        'Published posthumously.',
        '',
        'I tell unfinished-work-inheritors: complete with love.'
      ],
      lesson: 'Completing unfinished work of deceased writers honors their voice posthumously.'
    },
    {
      id: 'gn14_10',
      title: 'My mother died and I cook her holiday menu',
      narrative: [
        'Thanksgiving her menu.',
        '',
        'Christmas her menu.',
        '',
        'Easter her menu.',
        '',
        'Holiday meals continue.',
        '',
        'I tell menu-keepers: continue the meals.'
      ],
      lesson: 'Holiday menus of deceased mothers continue annual ritual through inherited cooking.'
    },
    {
      id: 'gn14_11',
      title: 'My grandfather died and I learned chess from his teachings',
      narrative: [
        'He taught me chess.',
        '',
        'I teach my children.',
        '',
        'Generational continuation.',
        '',
        'Same opening he taught.',
        '',
        'I tell chess-mentees: continue teaching.'
      ],
      lesson: 'Chess teachings of grandparents continue through teaching next generation.'
    },
    {
      id: 'gn14_12',
      title: 'My uncle died and I keep his trucker hat',
      narrative: [
        'Old hat he wore.',
        '',
        'On my hook by door.',
        '',
        'Sometimes I wear it.',
        '',
        'Continuing presence.',
        '',
        'I tell hat-keepers: wear sometimes.'
      ],
      lesson: 'Deceased loved ones hats worn sometimes provide continuing presence on head.'
    },
    {
      id: 'gn14_13',
      title: 'My grandmother died and I keep her bibles',
      narrative: [
        'Annotated bibles.',
        '',
        'Her notes in margins.',
        '',
        'Read on her birthday.',
        '',
        'Continuing faith.',
        '',
        'I tell bible-inheritors: read annotations.'
      ],
      lesson: 'Annotated bibles of deceased grandmothers continue faith through annotations.'
    },
    {
      id: 'gn14_14',
      title: 'My friend died and his ashes are spread at our spot',
      narrative: [
        'Beach where we surfed.',
        '',
        'Family spread ashes.',
        '',
        'I visit annually.',
        '',
        'Spot is sacred now.',
        '',
        'I tell ash-spread mourners: places hold.'
      ],
      lesson: 'Ash-spread locations become sacred places holding deceased presence.'
    },
    {
      id: 'gn14_15',
      title: 'My mother died and I keep her wedding dress',
      narrative: [
        'In storage box.',
        '',
        'Daughter may wear it someday.',
        '',
        'Generational dress.',
        '',
        'Continuing.',
        '',
        'I tell dress-keepers: store carefully.'
      ],
      lesson: 'Wedding dresses of deceased mothers continue generationally; store carefully.'
    }
  ];

  var GRIEF_NARRATIVES_15 = [
    {
      id: 'gn15_1',
      title: 'My friend died and we have memorial 10K race',
      narrative: [
        'Annual race in her honor.',
        '',
        'Family started it.',
        '',
        '1000 runners now.',
        '',
        'Community memorial.',
        '',
        'I tell memorial-runners: races continue.'
      ],
      lesson: 'Annual memorial races sustain community grief work through shared physical action.'
    },
    {
      id: 'gn15_2',
      title: 'My partner died and our house feels too big',
      narrative: [
        'House we shared 25 years.',
        '',
        'Now too big alone.',
        '',
        'Considering downsizing.',
        '',
        'House grief.',
        '',
        'I tell downsizing widowed: house grief is real.'
      ],
      lesson: 'Houses shared with deceased partners can feel too big; house grief is real.'
    },
    {
      id: 'gn15_3',
      title: 'My grandmother died and the smell of her perfume haunts me',
      narrative: [
        'Catch it in stores sometimes.',
        '',
        'Stop dead.',
        '',
        'Grief in nose.',
        '',
        'I tell scent-haunted: olfactory grief real.'
      ],
      lesson: 'Olfactory grief through familiar scents in public places is real and visceral.'
    },
    {
      id: 'gn15_4',
      title: 'My friend died and I built her memorial scholarship',
      narrative: [
        'Scholarship in her name.',
        '',
        'For her field.',
        '',
        'Annual award.',
        '',
        'Sustains memory.',
        '',
        'I tell scholarship-founders: this lasts.'
      ],
      lesson: 'Memorial scholarships sustain deceased loved ones memory through annual awards.'
    },
    {
      id: 'gn15_5',
      title: 'My partner died and I keep his cologne',
      narrative: [
        'On his dresser.',
        '',
        'I open it sometimes.',
        '',
        'Smell him.',
        '',
        'Bottle preserves him.',
        '',
        'I tell cologne-keepers: bottle preserves.'
      ],
      lesson: 'Preserved cologne bottles of deceased partners hold their scent.'
    },
    {
      id: 'gn15_6',
      title: 'My uncle died and I keep his cassette tapes',
      narrative: [
        'Mix tapes he made.',
        '',
        '1980s music.',
        '',
        'His curation.',
        '',
        'I play them.',
        '',
        'I tell cassette-keepers: play them.'
      ],
      lesson: 'Inherited mix tapes of deceased uncle curators continue voice through music.'
    },
    {
      id: 'gn15_7',
      title: 'My grandfather died and his pipe smells of him',
      narrative: [
        'Old pipe.',
        '',
        'Tobacco residue.',
        '',
        'Smell faint.',
        '',
        'Bring to nose.',
        '',
        'I tell pipe-keepers: scent travels.'
      ],
      lesson: 'Pipes of deceased grandfathers hold tobacco residue scent for years.'
    },
    {
      id: 'gn15_8',
      title: 'My mother died and her recipes feed my family',
      narrative: [
        'Weekly Sunday dinner.',
        '',
        'Her recipe.',
        '',
        'Family gathered.',
        '',
        'She is at table.',
        '',
        'I tell recipe-keepers: weekly ritual.'
      ],
      lesson: 'Weekly Sunday dinners of deceased mothers recipes seat them at family table.'
    },
    {
      id: 'gn15_9',
      title: 'My friend died and I keep her makeup',
      narrative: [
        'Her lipstick.',
        '',
        'I wear it sometimes.',
        '',
        'Her shade on my lips.',
        '',
        'Continuing presence.',
        '',
        'I tell makeup-keepers: shared shade.'
      ],
      lesson: 'Deceased friends makeup worn sometimes continues their style on living body.'
    },
    {
      id: 'gn15_10',
      title: 'My grandfather died and his hat is at my door',
      narrative: [
        'Coat hook by door.',
        '',
        'His old hat.',
        '',
        'Daily reminder.',
        '',
        'I tell hat-keepers: visible reminder.'
      ],
      lesson: 'Visible reminders of deceased loved ones at home doors provide daily grief touchstones.'
    },
    {
      id: 'gn15_11',
      title: 'My friend died and her birthday is harder than her death day',
      narrative: [
        'March 22 her birthday.',
        '',
        'August 14 her death.',
        '',
        'March 22 hits harder.',
        '',
        'Birthday is what was missed.',
        '',
        'I tell anniversary-mourners: birthdays hurt more.'
      ],
      lesson: 'Deceased loved ones birthdays often hurt more than death days; what life was missed.'
    },
    {
      id: 'gn15_12',
      title: 'My mother died and I learned to crochet from her things',
      narrative: [
        'Her crochet hooks.',
        '',
        'Patterns in her hand.',
        '',
        'YouTube taught me technique.',
        '',
        'Her hands guided.',
        '',
        'I tell craft-inheritors: learn the craft.'
      ],
      lesson: 'Inherited craft tools invite learning the craft; continues deceased loved ones hands.'
    },
    {
      id: 'gn15_13',
      title: 'My grandfather died and his garden is mine',
      narrative: [
        'Inherited his garden.',
        '',
        'Same vegetables he grew.',
        '',
        'Same heirloom seeds.',
        '',
        'Annual continuation.',
        '',
        'I tell garden-inheritors: same seeds.'
      ],
      lesson: 'Inherited gardens with same heirloom seeds continue grandparent gardening annually.'
    },
    {
      id: 'gn15_14',
      title: 'My friend died and we have annual memorial dinner',
      narrative: [
        'Friends gather annually.',
        '',
        'Restaurant she loved.',
        '',
        'Same date her death.',
        '',
        'Tell stories.',
        '',
        'Annual ritual.',
        '',
        'I tell memorial-dinners: annual sustains.'
      ],
      lesson: 'Annual memorial dinners at deceased loved ones favorite places sustain friend group grief.'
    },
    {
      id: 'gn15_15',
      title: 'My grief integrated and life continues',
      narrative: [
        'Years out.',
        '',
        'Grief part of me.',
        '',
        'Life continues.',
        '',
        'Both true.',
        '',
        'I tell new grievers: both true forever.'
      ],
      lesson: 'Grief integrates and life continues; both true forever.'
    }
  ];

  var GRIEF_NARRATIVES_4 = [
    {
      id: 'gn4_1',
      title: 'My friend died and I dream of him',
      narrative: [
        'Three years after his death.',
        '',
        'I still dream of my friend.',
        '',
        'Sometimes good dreams.',
        '',
        'Sometimes traumatic ones.',
        '',
        'Grief dreams are real.',
        '',
        'Therapist said: the brain processes through sleep.',
        '',
        'Welcome the visits.',
        '',
        'Even the hard ones.',
        '',
        'I tell dream-visited grievers: dreams are processing.'
      ],
      lesson: 'Grief dreams are real brain processing of loss; welcome them as visits.'
    },
    {
      id: 'gn4_2',
      title: 'My mother died young and I aged past her',
      narrative: [
        'Mom died at 32.',
        '',
        'I just turned 33.',
        '',
        'Now older than she ever was.',
        '',
        'Strange grief.',
        '',
        'Aged past the mother in my memory.',
        '',
        'Grief specialist named it.',
        '',
        'I tell those who outlive parents: this specific grief exists.'
      ],
      lesson: 'Outliving the age a parent died at creates specific grief deserving naming.'
    },
    {
      id: 'gn4_3',
      title: 'My grief came with relief and guilt',
      narrative: [
        'Abusive parent died.',
        '',
        'Felt relief.',
        '',
        'Then guilt for the relief.',
        '',
        'Therapy on complicated grief.',
        '',
        'Both true.',
        '',
        'Relief and grief and complicated love.',
        '',
        'I tell abuse-survivor grievers: complicated grief is real grief.'
      ],
      lesson: 'Grief for abusive parents is complicated; relief and sorrow can coexist.'
    },
    {
      id: 'gn4_4',
      title: 'My grandmother passed her recipes to me',
      narrative: [
        'Before she died, she taught me to cook.',
        '',
        'Every recipe in her hand.',
        '',
        'Now I cook them.',
        '',
        'Tears in the broth.',
        '',
        'But also love.',
        '',
        'Recipes are continuing bond.',
        '',
        'I tell recipe-inheritors: this is love continuing.'
      ],
      lesson: 'Inherited recipes are continuing bonds; cooking them is grief work and love.'
    },
    {
      id: 'gn4_5',
      title: 'My partner died at 35 and I am 37',
      narrative: [
        'Cancer took him in 9 months.',
        '',
        'We had been married 8 years.',
        '',
        'Young widow.',
        '',
        'Few people my age understood.',
        '',
        'Found young widow community.',
        '',
        'Specialty support for chapter-of-life grief.',
        '',
        'I tell young widows: find age-matched community.'
      ],
      lesson: 'Young widows need age-matched community where chapter-of-life grief is shared.'
    },
    {
      id: 'gn4_6',
      title: 'My loss happened during the pandemic',
      narrative: [
        'Mom died May 2020.',
        '',
        'Funeral was 10 people.',
        '',
        'No hugs.',
        '',
        'No gathering.',
        '',
        'Pandemic grief was different.',
        '',
        'Disenfranchised by isolation.',
        '',
        'Two years later we did a memorial.',
        '',
        'I tell pandemic grievers: delayed memorials are still real ritual.'
      ],
      lesson: 'Pandemic grief was disenfranchised; delayed memorials are still real ritual.'
    },
    {
      id: 'gn4_7',
      title: 'My best friend died and I cannot say her name',
      narrative: [
        'Three years still cannot say her name.',
        '',
        'Therapist works on this gradually.',
        '',
        'Saying name brings flood.',
        '',
        'Building tolerance.',
        '',
        'I tell name-stuck grievers: gradual saying is real work.'
      ],
      lesson: 'Inability to say deceased name is grief work; gradual saying builds tolerance.'
    },
    {
      id: 'gn4_8',
      title: 'My dad died and I had to grow up fast',
      narrative: [
        'I was 14.',
        '',
        'Family needed me to step up.',
        '',
        'Parentified.',
        '',
        'Did not grieve until college.',
        '',
        'Delayed grief is real.',
        '',
        'Therapy in my 20s.',
        '',
        'I tell parentified mourners: delayed grief comes eventually.'
      ],
      lesson: 'Parentification delays grief; delayed processing is real and comes eventually.'
    },
    {
      id: 'gn4_9',
      title: 'My cat died and house felt empty',
      narrative: [
        'Lived with him 15 years.',
        '',
        'House felt loud without him.',
        '',
        'Sound of his purr remembered.',
        '',
        'Sound of his nails on floor.',
        '',
        'Grief in absence of small sounds.',
        '',
        'I tell pet grievers: small sounds gone are real grief.'
      ],
      lesson: 'Pet grief includes the absence of small daily sounds; auditory grief is real.'
    },
    {
      id: 'gn4_10',
      title: 'My grandfather died and his hands haunt me',
      narrative: [
        'His hands worked wood.',
        '',
        'Crafted toys for me.',
        '',
        'Now I see his hands in mine.',
        '',
        'Genetic echo.',
        '',
        'Grief in mirror.',
        '',
        'I tell descendants of craftspeople: bodies remember.'
      ],
      lesson: 'Bodies remember inherited traits; grief surfaces in self-recognition.'
    },
    {
      id: 'gn4_11',
      title: 'My friend died and I see him in crowds',
      narrative: [
        'Catch glimpses of him.',
        '',
        'In strangers walking.',
        '',
        'In a certain hair color.',
        '',
        'Heart leaps then sinks.',
        '',
        'Grief in mistaken sightings.',
        '',
        'I tell sighting-experiencers: this is grief, not delusion.'
      ],
      lesson: 'Mistaken sightings in crowds are grief; brain searches for lost loved ones.'
    },
    {
      id: 'gn4_12',
      title: 'My old dog died and I cannot get another',
      narrative: [
        'It has been two years.',
        '',
        'Friends suggest new dog.',
        '',
        'I am not ready.',
        '',
        'Grief is not on others timeline.',
        '',
        'When ready I will know.',
        '',
        'I tell pet grievers: time your readiness alone.'
      ],
      lesson: 'Pet readiness for new pet is personal timeline; do not rush yourself.'
    },
    {
      id: 'gn4_13',
      title: 'My mother died young and I fear my own age',
      narrative: [
        'Mom died at 45 of cancer.',
        '',
        'I turn 45 next year.',
        '',
        'Health anxiety surged.',
        '',
        'Therapy on anticipatory mortality.',
        '',
        'Grief in body that knows family history.',
        '',
        'I tell those approaching parents death age: this anxiety is grief.'
      ],
      lesson: 'Approaching age parent died at brings anticipatory grief and health anxiety.'
    },
    {
      id: 'gn4_14',
      title: 'My friend died and I take care of his grave',
      narrative: [
        'Visit monthly.',
        '',
        'Clean the stone.',
        '',
        'Bring fresh flowers.',
        '',
        'Talk to him.',
        '',
        'Grave tending is grief work.',
        '',
        'Continuing bond ritual.',
        '',
        'I tell grave-tending grievers: this is love continuing.'
      ],
      lesson: 'Grave tending is continuing bond grief ritual; love made visible.'
    },
    {
      id: 'gn4_15',
      title: 'My grandfather died and I lit a yahrzeit candle',
      narrative: [
        'Jewish tradition.',
        '',
        'Annual yahrzeit candle.',
        '',
        '24 hour flame.',
        '',
        'Marks one year.',
        '',
        'Every year I light it.',
        '',
        'Ritual contains grief.',
        '',
        'I tell faith-traditioned: rituals contain.'
      ],
      lesson: 'Religious anniversary rituals contain grief and continue bond annually.'
    }
  ];

  var GRIEF_NARRATIVES_5 = [
    {
      id: 'gn5_1',
      title: 'My uncle was murdered',
      narrative: [
        'Random violence.',
        '',
        'Took my uncle.',
        '',
        'Trauma layered with grief.',
        '',
        'Court process for years.',
        '',
        'Homicide loss specialist therapy.',
        '',
        'Different from natural-causes grief.',
        '',
        'Justice plus grief plus trauma.',
        '',
        'I tell homicide loss families: specialty support exists.'
      ],
      lesson: 'Homicide loss layers grief, trauma, and justice; specialty support exists.'
    },
    {
      id: 'gn5_2',
      title: 'My friend overdosed and was found by me',
      narrative: [
        'Walked in to her apartment.',
        '',
        'Found her gone.',
        '',
        'Witnessing grief.',
        '',
        'Trauma layered with loss.',
        '',
        'Specialty therapy for witnesses.',
        '',
        'I tell discovery witnesses: both trauma and grief.'
      ],
      lesson: 'Discovering loved one creates witness trauma layered with grief.'
    },
    {
      id: 'gn5_3',
      title: 'My family pet died after long illness',
      narrative: [
        'Cancer slowly took our dog.',
        '',
        'Anticipatory grief for months.',
        '',
        'When she went peacefully.',
        '',
        'We had already grieved.',
        '',
        'And were still sad.',
        '',
        'Anticipatory grief plus actual.',
        '',
        'I tell long-illness pet families: both griefs are real.'
      ],
      lesson: 'Long pet illness includes anticipatory plus actual grief; both real.'
    },
    {
      id: 'gn5_4',
      title: 'My great-uncle died and I never met him',
      narrative: [
        'Family talked about him.',
        '',
        'But he died before I was born.',
        '',
        'When my dad died, I grieved them both.',
        '',
        'Ancestral grief surfaced.',
        '',
        'I tell ancestral grievers: this is generational.'
      ],
      lesson: 'Ancestral grief can surface with current losses; generational mourning is real.'
    },
    {
      id: 'gn5_5',
      title: 'My friend died and his music still plays',
      narrative: [
        'Recorded songs before he died.',
        '',
        'I play them on his birthday.',
        '',
        'Voice continues.',
        '',
        'Digital ghosts of beloved.',
        '',
        'Continuing bond through recording.',
        '',
        'I tell musical grievers: recorded voice is gift and pain.'
      ],
      lesson: 'Recorded voice of loved ones is continuing bond gift mixed with pain.'
    },
    {
      id: 'gn5_6',
      title: 'My identity died when my marriage ended',
      narrative: [
        'Married 22 years.',
        '',
        'Divorce after affairs.',
        '',
        'Lost wife identity.',
        '',
        'Grief for marriage.',
        '',
        'Grief for assumed future.',
        '',
        'Identity therapy.',
        '',
        'I tell divorcees: divorce is identity grief too.'
      ],
      lesson: 'Divorce involves identity grief beyond relationship; mourning assumed future.'
    },
    {
      id: 'gn5_7',
      title: 'My mother had dementia and forgot me before she died',
      narrative: [
        'Last 3 years she did not know me.',
        '',
        'Lost her twice.',
        '',
        'Once when she forgot.',
        '',
        'Once when body died.',
        '',
        'Ambiguous loss.',
        '',
        'Then concrete loss.',
        '',
        'I tell dementia families: both losses count.'
      ],
      lesson: 'Dementia involves ambiguous loss before concrete death; both real grief.'
    },
    {
      id: 'gn5_8',
      title: 'My team captain died in summer accident',
      narrative: [
        'Boating accident.',
        '',
        'Captain we loved.',
        '',
        'Team grief.',
        '',
        'Returned to season in fall.',
        '',
        'Wore his number.',
        '',
        'Collective grief work.',
        '',
        'I tell team-grievers: collective ritual heals.'
      ],
      lesson: 'Team loss requires collective grief ritual; shared mourning sustains team.'
    },
    {
      id: 'gn5_9',
      title: 'My job loss felt like a death',
      narrative: [
        'Career of 20 years.',
        '',
        'Layoff at 55.',
        '',
        'Lost identity.',
        '',
        'Lost community.',
        '',
        'Lost income.',
        '',
        'Layered loss.',
        '',
        'Therapy named it grief.',
        '',
        'I tell laid-off mature workers: this is grief.'
      ],
      lesson: 'Job loss is grief; identity, community, future all mourned together.'
    },
    {
      id: 'gn5_10',
      title: 'My family pet of 18 years went peacefully',
      narrative: [
        'Lived a full cat life.',
        '',
        '18 years.',
        '',
        'Went peacefully at home.',
        '',
        'Held him at the end.',
        '',
        'Grief was full but right.',
        '',
        'Long life pet grief.',
        '',
        'I tell long-life pet families: grief is full despite age.'
      ],
      lesson: 'Long-life pet grief is full even at peaceful end; bond was real.'
    },
    {
      id: 'gn5_11',
      title: 'My friend died and I keep his text messages',
      narrative: [
        'Cannot delete them.',
        '',
        'Last text was about lunch.',
        '',
        'Now permanent record.',
        '',
        'Digital legacy.',
        '',
        'Therapist said: keep as long as serves.',
        '',
        'I tell digital grievers: keep the texts.'
      ],
      lesson: 'Keeping deceased text messages is normal digital grief practice.'
    },
    {
      id: 'gn5_12',
      title: 'My mother died and I inherited her cookbook',
      narrative: [
        'Her cookbook in her handwriting.',
        '',
        'Notes in margins.',
        '',
        'Substitutions tested.',
        '',
        'Stains from cooking.',
        '',
        'I cook her recipes.',
        '',
        'Tears with onions.',
        '',
        'I tell recipe-inheritors: handwriting is presence.'
      ],
      lesson: 'Handwritten recipe inheritance is presence; cooking continues bond.'
    },
    {
      id: 'gn5_13',
      title: 'My grandfather died and I read his journal',
      narrative: [
        '40 years of journals.',
        '',
        'Inherited at his death.',
        '',
        'Read slowly over months.',
        '',
        'Knew him as I never had.',
        '',
        'Grief opened to deepen love.',
        '',
        'I tell journal-inheritors: take time.'
      ],
      lesson: 'Inherited journals open deeper knowing of deceased; take time reading.'
    },
    {
      id: 'gn5_14',
      title: 'My friend died and we made a memorial bench',
      narrative: [
        'Park bench in his honor.',
        '',
        'Sat there often.',
        '',
        'Plaque with his name.',
        '',
        'Now visited by strangers.',
        '',
        'Public memorial extends grief.',
        '',
        'I tell memorial-builders: public space helps.'
      ],
      lesson: 'Memorial benches in public space extend grief and continue presence.'
    },
    {
      id: 'gn5_15',
      title: 'My grandmother died at home in her bed',
      narrative: [
        'Hospice cared for her.',
        '',
        'Family bedside.',
        '',
        'She slipped away in night.',
        '',
        'Peaceful death.',
        '',
        'Grief still full.',
        '',
        'Peaceful does not erase loss.',
        '',
        'I tell peaceful-death families: grief is still grief.'
      ],
      lesson: 'Peaceful death does not erase grief; loss is loss regardless of ending.'
    }
  ];

  var GRIEF_NARRATIVES_6 = [
    {
      id: 'gn6_1',
      title: 'My loss came early and shaped my whole life',
      narrative: [
        'Father died when I was 4.',
        '',
        'Shaped everything.',
        '',
        'How I attach.',
        '',
        'How I fear.',
        '',
        'Therapy in my 30s.',
        '',
        'Names the shaping.',
        '',
        'I tell early-loss adults: foundational grief shapes adult life.'
      ],
      lesson: 'Early childhood loss is foundational grief shaping adult attachment.'
    },
    {
      id: 'gn6_2',
      title: 'My grandfather died and I inherited his watch',
      narrative: [
        'Old gold watch.',
        '',
        'Wore for years.',
        '',
        'Felt his time on my wrist.',
        '',
        'Generational artifact.',
        '',
        'Continuing bond.',
        '',
        'I tell watch-inheritors: time on wrist is presence.'
      ],
      lesson: 'Inherited watches and timepieces carry presence; time on wrist is continuing bond.'
    },
    {
      id: 'gn6_3',
      title: 'My mother died and I dream of her cooking',
      narrative: [
        'Dreams of her kitchen.',
        '',
        'Smell of her bread.',
        '',
        'Wake longing.',
        '',
        'Grief dreams continue years.',
        '',
        'Therapist: welcome them.',
        '',
        'I tell dream-visited: dreams are visits.'
      ],
      lesson: 'Grief dreams continue years; welcome them as visits with deceased.'
    },
    {
      id: 'gn6_4',
      title: 'My young friend died and I felt the unfairness',
      narrative: [
        '17 years old.',
        '',
        'Brain tumor.',
        '',
        'Future stolen.',
        '',
        'Anger at unfairness.',
        '',
        'Grief at injustice.',
        '',
        'Young loss carries unfair quality.',
        '',
        'I tell young-loss survivors: unfairness anger is grief.'
      ],
      lesson: 'Young deaths carry injustice; anger is part of young loss grief.'
    },
    {
      id: 'gn6_5',
      title: 'My partner died and I dated again two years later',
      narrative: [
        'Felt guilty dating.',
        '',
        'Therapist: new love does not erase old love.',
        '',
        'Both can coexist.',
        '',
        'I tell remarriage-considering: love is not exclusive across loss.'
      ],
      lesson: 'New love after partner loss does not erase old; both can coexist.'
    },
    {
      id: 'gn6_6',
      title: 'My dog died and I sleep with her bed',
      narrative: [
        'Her dog bed on floor.',
        '',
        'I sleep next to it.',
        '',
        'Still smells of her.',
        '',
        'Comfort object.',
        '',
        'Grief object.',
        '',
        'Both.',
        '',
        'I tell pet grievers: keep the bed.'
      ],
      lesson: 'Pet bed serves as comfort and grief object; keep it.'
    },
    {
      id: 'gn6_7',
      title: 'My grandfather died and I light a candle for him weekly',
      narrative: [
        'Saturday evening ritual.',
        '',
        'Light a candle.',
        '',
        'Say his name.',
        '',
        'Remember a moment.',
        '',
        'Weekly continuing bond.',
        '',
        'I tell ritual-curious: weekly small rituals sustain.'
      ],
      lesson: 'Weekly small rituals like candles sustain grief connection over years.'
    },
    {
      id: 'gn6_8',
      title: 'My mother died at home and I helped wash her body',
      narrative: [
        'Home death.',
        '',
        'Hospice nurse and I prepared her body.',
        '',
        'Family ritual.',
        '',
        'Profound goodbye.',
        '',
        'Bodily grief work.',
        '',
        'I tell death-care families: this is sacred work.'
      ],
      lesson: 'Home death-care preparation is sacred grief work; bodily ritual matters.'
    },
    {
      id: 'gn6_9',
      title: 'My family pet died and the kids grieve too',
      narrative: [
        'Our cat of 12 years died.',
        '',
        'Kids 5 and 8.',
        '',
        'Their first loss.',
        '',
        'Honest age-appropriate words.',
        '',
        'Drawing pictures.',
        '',
        'Memorial garden.',
        '',
        'I tell parents: kid grief deserves real acknowledgment.'
      ],
      lesson: 'Children grieve pets too; age-appropriate acknowledgment and rituals matter.'
    },
    {
      id: 'gn6_10',
      title: 'My best friend died and I keep her last voicemail',
      narrative: [
        'Her voice on a 20-second message.',
        '',
        'About a dinner we never had.',
        '',
        'I listen sometimes.',
        '',
        'Voice continues.',
        '',
        'Digital continuing bond.',
        '',
        'I tell digital grievers: voicemails are presence.'
      ],
      lesson: 'Voicemails of deceased loved ones are continuing bonds in digital form.'
    },
    {
      id: 'gn6_11',
      title: 'My uncle died of COVID isolated',
      narrative: [
        'ICU alone.',
        '',
        'Could not visit.',
        '',
        'Iphone goodbye.',
        '',
        'Pandemic-era loss.',
        '',
        'Disenfranchised by isolation.',
        '',
        'Two years later memorial.',
        '',
        'I tell pandemic isolated grievers: delayed memorial real.'
      ],
      lesson: 'Pandemic isolated death created disenfranchised grief; delayed memorials are real.'
    },
    {
      id: 'gn6_12',
      title: 'My friend died and his birthday hurts each year',
      narrative: [
        'June 3rd every year.',
        '',
        'Would have been 32.',
        '',
        'Still 21 in memory.',
        '',
        'Annual birthday grief.',
        '',
        'I tell birthday-grievers: annual reactions are real.'
      ],
      lesson: 'Birthday anniversaries trigger annual grief for those who died young.'
    },
    {
      id: 'gn6_13',
      title: 'My grandmother died and I wear her ring',
      narrative: [
        'Wedding ring she wore 60 years.',
        '',
        'Now on my finger.',
        '',
        'Generations linked.',
        '',
        'Daily reminder.',
        '',
        'Grief and connection on hand.',
        '',
        'I tell ring-inheritors: bodily presence continues.'
      ],
      lesson: 'Inherited jewelry on body continues bodily presence and grief connection daily.'
    },
    {
      id: 'gn6_14',
      title: 'My friend died and I run his memorial 5K',
      narrative: [
        'Annual race in his memory.',
        '',
        'Family started it.',
        '',
        '500 runners now.',
        '',
        'Community grief work.',
        '',
        'I tell memorial-runners: community ritual extends grief.'
      ],
      lesson: 'Memorial 5K runs are community grief work extending presence in shared action.'
    },
    {
      id: 'gn6_15',
      title: 'My partner died and I changed my hair',
      narrative: [
        'Big haircut after he died.',
        '',
        'Symbol of changed life.',
        '',
        'Old self gone.',
        '',
        'New self emerging.',
        '',
        'Hair as marker.',
        '',
        'I tell newly-widowed: physical marker can help.'
      ],
      lesson: 'Physical changes like haircuts can mark grief transitions and emerging new self.'
    }
  ];

  var GRIEF_NARRATIVES_7 = [
    {
      id: 'gn7_1',
      title: 'My family pet was lost not dead',
      narrative: [
        'Dog ran away.',
        '',
        'Never found.',
        '',
        'Ambiguous loss.',
        '',
        'Worse than known death.',
        '',
        'Always wondering.',
        '',
        'No closure.',
        '',
        'I tell missing-pet families: ambiguous loss is real.'
      ],
      lesson: 'Missing pet ambiguous loss is real grief, often harder than confirmed death.'
    },
    {
      id: 'gn7_2',
      title: 'My grief therapist died in middle of treatment',
      narrative: [
        'Felt abandoned twice.',
        '',
        'My grief.',
        '',
        'Then my therapist gone.',
        '',
        'Therapist loss is real.',
        '',
        'New therapist understood.',
        '',
        'I tell therapist-loss patients: real loss within loss.'
      ],
      lesson: 'Therapist loss during grief treatment is real layered loss; new therapist can help.'
    },
    {
      id: 'gn7_3',
      title: 'My church community died after pastor scandal',
      narrative: [
        'Pastor scandal split church.',
        '',
        'My community of 20 years dissolved.',
        '',
        'Community grief.',
        '',
        'Spiritual home gone.',
        '',
        'Found new church eventually.',
        '',
        'But old grief remained.',
        '',
        'I tell community-loss faithful: real grief.'
      ],
      lesson: 'Community of faith loss is real grief; spiritual home dissolution mourns.'
    },
    {
      id: 'gn7_4',
      title: 'My grandmother died and I forgot her face for a moment',
      narrative: [
        'Six months in.',
        '',
        'Tried to picture her.',
        '',
        'Could not.',
        '',
        'Panic.',
        '',
        'Then she came back.',
        '',
        'Therapist: brain protects sometimes.',
        '',
        'I tell forgot-face grievers: temporary, normal.'
      ],
      lesson: 'Temporarily forgetting deceased face is normal grief; brain protects sometimes.'
    },
    {
      id: 'gn7_5',
      title: 'My pregnancy was ectopic and I lost the baby',
      narrative: [
        'Lost tube too.',
        '',
        'Lost baby.',
        '',
        'Lost fertility potential.',
        '',
        'Layered medical and grief.',
        '',
        'Specialty perinatal support.',
        '',
        'I tell ectopic survivors: layered grief needs specialty.'
      ],
      lesson: 'Ectopic pregnancy carries layered medical and reproductive grief; specialty support helps.'
    },
    {
      id: 'gn7_6',
      title: 'My partner committed suicide and I am rebuilding',
      narrative: [
        'Five years of work.',
        '',
        'Suicide loss specialty therapy.',
        '',
        'Survivor group.',
        '',
        'Eventually love again.',
        '',
        'Rebuilding takes years.',
        '',
        'I tell suicide widowed: rebuilding is real possible.'
      ],
      lesson: 'Suicide widowed rebuilding takes years; specialty support and survivor groups essential.'
    },
    {
      id: 'gn7_7',
      title: 'My friend died young and his parents needed me',
      narrative: [
        'My friend was their only child.',
        '',
        'They asked me to visit.',
        '',
        'Held them as they grieved.',
        '',
        'Both grieving same person.',
        '',
        'Bond formed in grief.',
        '',
        'I tell young friend-loss survivors: parents need you too.'
      ],
      lesson: 'Friend deaths leave parents needing friend-as-connection; mutual grief bonds form.'
    },
    {
      id: 'gn7_8',
      title: 'My pet vet had to be put down',
      narrative: [
        'Behavioral euthanasia.',
        '',
        'Aggression escalated.',
        '',
        'Vet recommended.',
        '',
        'Family decision.',
        '',
        'Guilt heavy.',
        '',
        'I held him at end.',
        '',
        'Pet loss specialist for decision grief.',
        '',
        'I tell euthanasia decision grievers: specialty support.'
      ],
      lesson: 'Behavioral euthanasia decision carries layered grief; specialty pet loss support helps.'
    },
    {
      id: 'gn7_9',
      title: 'My mother died in a fire',
      narrative: [
        'House fire took her.',
        '',
        'Trauma plus grief.',
        '',
        'Could not return to home neighborhood.',
        '',
        'Moved.',
        '',
        'Trauma therapy.',
        '',
        'Grief therapy.',
        '',
        'Years of work.',
        '',
        'I tell traumatic loss survivors: layered care needed.'
      ],
      lesson: 'Traumatic deaths require trauma plus grief care; locations may need leaving.'
    },
    {
      id: 'gn7_10',
      title: 'My brother died of leukemia at 22',
      narrative: [
        'Best friend brother.',
        '',
        'Cancer 18 months.',
        '',
        'Held his hand at end.',
        '',
        'Sibling grief.',
        '',
        'Sibling loss community.',
        '',
        'Specialty sibling support.',
        '',
        'I tell bereaved siblings: specific support exists.'
      ],
      lesson: 'Sibling loss has specific specialty support distinct from parent or partner grief.'
    },
    {
      id: 'gn7_11',
      title: 'My grandfather died and I planted a tree',
      narrative: [
        'Tree at his favorite park.',
        '',
        'Family ritual planting.',
        '',
        'Watching tree grow.',
        '',
        'Living memorial.',
        '',
        'Continuing presence.',
        '',
        'I tell tree-planters: living memorial sustains.'
      ],
      lesson: 'Planting memorial trees creates living continuing presence over decades.'
    },
    {
      id: 'gn7_12',
      title: 'My young niece died of seizure',
      narrative: [
        'Three years old.',
        '',
        'Sudden seizure.',
        '',
        'Unexpected.',
        '',
        'Family devastated.',
        '',
        'Specialty pediatric loss support.',
        '',
        'Compassionate Friends organization.',
        '',
        'I tell child-loss families: TCF saves families.'
      ],
      lesson: 'Compassionate Friends organization supports pediatric loss families specifically.'
    },
    {
      id: 'gn7_13',
      title: 'My partner died and I cried at random songs',
      narrative: [
        'Our song played at store.',
        '',
        'I cried in produce aisle.',
        '',
        'Strangers stared.',
        '',
        'Therapist: grief in public is normal.',
        '',
        'Carried tissues.',
        '',
        'I tell public criers: this is grief.'
      ],
      lesson: 'Public grief reactions to music are normal; carry tissues, allow tears.'
    },
    {
      id: 'gn7_14',
      title: 'My friend died and his dog became mine',
      narrative: [
        'His parents could not keep her.',
        '',
        'I took his dog.',
        '',
        'Continuing love through pet.',
        '',
        'She knew his commands.',
        '',
        'Grief shared with animal.',
        '',
        'I tell inherited-pet grievers: bond doubled.'
      ],
      lesson: 'Inheriting deceased loved ones pet doubles bond; grief shared with animal.'
    },
    {
      id: 'gn7_15',
      title: 'My mother died and I cleaned out her closet',
      narrative: [
        'Took six months to do it.',
        '',
        'Smelled her in her clothes.',
        '',
        'Cried over each piece.',
        '',
        'Kept some.',
        '',
        'Gave some.',
        '',
        'Donated some.',
        '',
        'Closet cleaning is grief work.',
        '',
        'I tell closet-cleaners: take your time.'
      ],
      lesson: 'Closet cleaning after parent death is deep grief work; allow months not days.'
    }
  ];

  var GRIEF_NARRATIVES_8 = [
    {
      id: 'gn8_1',
      title: 'My grandmother died and her birthday cake recipe lives',
      narrative: [
        'I make her chocolate cake.',
        '',
        'Every December.',
        '',
        'On her birthday.',
        '',
        'Family gathered.',
        '',
        'She is in every bite.',
        '',
        'Recipe rituals continue presence.',
        '',
        'I tell recipe-rituals families: continue the tradition.'
      ],
      lesson: 'Annual recipe rituals on deceased birthdays continue presence in shared family meal.'
    },
    {
      id: 'gn8_2',
      title: 'My partner died and I dated again at year 4',
      narrative: [
        'Took 4 years.',
        '',
        'New partner understood widowed grief.',
        '',
        'Did not try to replace.',
        '',
        'Held space for continuing love.',
        '',
        'Both can coexist.',
        '',
        'I tell new partners of widowed: hold space.'
      ],
      lesson: 'New partner of widowed must hold space for continuing love for deceased.'
    },
    {
      id: 'gn8_3',
      title: 'My uncle died and I miss his laugh',
      narrative: [
        'Specific laugh he had.',
        '',
        'I hear it sometimes.',
        '',
        'In other people for a second.',
        '',
        'Then gone.',
        '',
        'Sensory grief.',
        '',
        'I tell auditory grievers: sound memories haunt sweetly.'
      ],
      lesson: 'Auditory memories like laughs surface in others; specific sound grief is real.'
    },
    {
      id: 'gn8_4',
      title: 'My pet died and I got tattoo',
      narrative: [
        'Paw print tattoo.',
        '',
        'Her actual print.',
        '',
        'Got it after she died.',
        '',
        'Body marker.',
        '',
        'Continuing presence.',
        '',
        'I tell pet grievers: tattoos memorialize.'
      ],
      lesson: 'Memorial tattoos can hold continuing presence of pets on body.'
    },
    {
      id: 'gn8_5',
      title: 'My friend died and I keep his guitar',
      narrative: [
        'His parents gave me his guitar.',
        '',
        'I learned to play it.',
        '',
        'Continuing his music.',
        '',
        'Object as continuing bond.',
        '',
        'I tell inherited-instrument: learn to play.'
      ],
      lesson: 'Inherited instruments invite learning; continuing music continues loved one.'
    },
    {
      id: 'gn8_6',
      title: 'My great-grandfather died at 96 and I felt peace',
      narrative: [
        'Long life full.',
        '',
        'Peace in his ending.',
        '',
        'Sadness still real.',
        '',
        'Both coexist.',
        '',
        'Different from sudden grief.',
        '',
        'I tell long-life mourners: peaceful grief is still grief.'
      ],
      lesson: 'Long-life peaceful death grief is still grief; peace and sadness coexist.'
    },
    {
      id: 'gn8_7',
      title: 'My friend died and I wear his sweater',
      narrative: [
        'Found in his things.',
        '',
        'Wore it that winter.',
        '',
        'Still smelled like him.',
        '',
        'Body envelope of continued presence.',
        '',
        'I tell clothing-inheritors: wear them.'
      ],
      lesson: 'Inherited clothing wraps body in continued presence; wear it.'
    },
    {
      id: 'gn8_8',
      title: 'My grandfather died and we sang his favorite hymn',
      narrative: [
        'At his funeral we sang.',
        '',
        'His favorite hymn.',
        '',
        'Whole family voices.',
        '',
        'Collective grief expressed.',
        '',
        'Music holds what words cannot.',
        '',
        'I tell faith families: hymns are grief.'
      ],
      lesson: 'Hymns at funerals hold collective grief beyond words.'
    },
    {
      id: 'gn8_9',
      title: 'My mother died and I see her in mirror sometimes',
      narrative: [
        'Same eyes.',
        '',
        'Same face shape now.',
        '',
        'Aging into her image.',
        '',
        'Grief in mirror.',
        '',
        'I tell mirror-recognizers: bodies remember.'
      ],
      lesson: 'Aging into appearance of deceased parent creates mirror-recognition grief.'
    },
    {
      id: 'gn8_10',
      title: 'My partner died and I joined widow support',
      narrative: [
        'Specialty widowed support.',
        '',
        'Saved my life.',
        '',
        'Others knew shape of grief.',
        '',
        'New widows community.',
        '',
        'I tell newly-widowed: find your specialty community.'
      ],
      lesson: 'Specialty widowed support communities are essential; find them early.'
    },
    {
      id: 'gn8_11',
      title: 'My friend died and I keep his phone number active',
      narrative: [
        'Never deleted.',
        '',
        'Years after.',
        '',
        'Some keep, some delete.',
        '',
        'Both valid.',
        '',
        'I tell phone-keepers: there is no rule.'
      ],
      lesson: 'Keeping deceased phone numbers in contacts is personal choice; both valid.'
    },
    {
      id: 'gn8_12',
      title: 'My young son died of SIDS',
      narrative: [
        '6 months old.',
        '',
        'Found in crib.',
        '',
        'Worst day of life.',
        '',
        'Specialty SIDS support.',
        '',
        'Years of work.',
        '',
        'I tell SIDS parents: First Candle organization exists.'
      ],
      lesson: 'SIDS loss has specialty support like First Candle organization.'
    },
    {
      id: 'gn8_13',
      title: 'My friend was killed by police',
      narrative: [
        'Layered grief.',
        '',
        'Justice plus mourning.',
        '',
        'Activism plus rest.',
        '',
        'Community grief.',
        '',
        'Specialty support for state violence loss.',
        '',
        'I tell community trauma loss: specific support.'
      ],
      lesson: 'State violence loss carries layered grief plus justice; specialty community support exists.'
    },
    {
      id: 'gn8_14',
      title: 'My great-aunt died and I never knew her well',
      narrative: [
        'Far family.',
        '',
        'Few memories.',
        '',
        'But grief still surprised me.',
        '',
        'Family-shape changes.',
        '',
        'Even distant losses count.',
        '',
        'I tell distant family grief: real grief.'
      ],
      lesson: 'Distant family loss can surprise with grief; family shape changes affect even far branches.'
    },
    {
      id: 'gn8_15',
      title: 'My mother died and I dream of her cooking dinner',
      narrative: [
        'Dreams of her in kitchen.',
        '',
        'Cooking dinner for whole family.',
        '',
        'Wake with longing.',
        '',
        'Sometimes the smell lingers from dream.',
        '',
        'Sensory dream grief.',
        '',
        'I tell dream-cooked: sensory dreams are visits.'
      ],
      lesson: 'Sensory dreams of deceased cooking are real visits; allow sensory lingering.'
    }
  ];

  var GRIEF_NARRATIVES_9 = [
    {
      id: 'gn9_1',
      title: 'My grandmother died and I planted her favorite flowers',
      narrative: [
        'Roses she loved.',
        '',
        'Planted at her grave.',
        '',
        'And in my garden.',
        '',
        'Annual bloom is her annual visit.',
        '',
        'Living memorial.',
        '',
        'I tell garden-mourners: flowers sustain.'
      ],
      lesson: 'Planting deceased loved ones favorite flowers creates annual living memorial.'
    },
    {
      id: 'gn9_2',
      title: 'My friend died and I take care of his mother now',
      narrative: [
        'She has no other children.',
        '',
        'I visit weekly.',
        '',
        'Chosen family through grief.',
        '',
        'Both mourning him together.',
        '',
        'I tell friend-loss-mom-care: chosen family forms.'
      ],
      lesson: 'Caring for deceased friends parents creates chosen family through shared mourning.'
    },
    {
      id: 'gn9_3',
      title: 'My uncle died and family fractured',
      narrative: [
        'Will dispute.',
        '',
        'Family fell apart over money.',
        '',
        'Grief plus family rupture.',
        '',
        'Double loss.',
        '',
        'I tell family-fractured: layered grief.'
      ],
      lesson: 'Family ruptures during inheritance disputes double grief through family loss.'
    },
    {
      id: 'gn9_4',
      title: 'My partner died and I learned to live alone',
      narrative: [
        'First time alone in 30 years.',
        '',
        'Cooking for one.',
        '',
        'Going to bed alone.',
        '',
        'Slowly learned alone.',
        '',
        'Solitude is grief work.',
        '',
        'I tell newly-alone: solitude is skill.'
      ],
      lesson: 'Learning solitude after long partnership is grief skill; slowly builds.'
    },
    {
      id: 'gn9_5',
      title: 'My grandfather died and I keep his pipe',
      narrative: [
        'He smoked a pipe.',
        '',
        'Tobacco smell on it.',
        '',
        'Years later still faint.',
        '',
        'Sensory artifact.',
        '',
        'Continuing presence.',
        '',
        'I tell scent-artifact keepers: scent connects.'
      ],
      lesson: 'Scented artifacts of deceased provide sensory continuing bond.'
    },
    {
      id: 'gn9_6',
      title: 'My grandmother died and I wear her perfume',
      narrative: [
        'Found her bottle.',
        '',
        'Wear it on hard days.',
        '',
        'Smell her on my skin.',
        '',
        'Presence portable.',
        '',
        'I tell perfume-wearers: scent travels.'
      ],
      lesson: 'Wearing deceased loved ones perfume carries portable continuing presence.'
    },
    {
      id: 'gn9_7',
      title: 'My friend died and I memorialize him in my writing',
      narrative: [
        'Writer by trade.',
        '',
        'Wrote him into stories.',
        '',
        'Characters carry his traits.',
        '',
        'Continuing through creative work.',
        '',
        'I tell creative-grievers: art memorializes.'
      ],
      lesson: 'Creative work memorializes loved ones; characters carry traits.'
    },
    {
      id: 'gn9_8',
      title: 'My mother died and I keep her handwriting',
      narrative: [
        'Notes she wrote.',
        '',
        'Recipe cards.',
        '',
        'Letters.',
        '',
        'Handwriting is presence.',
        '',
        'Frame some.',
        '',
        'I tell handwriting-inheritors: frame them.'
      ],
      lesson: 'Framed handwriting of deceased loved ones provides daily visual continuing presence.'
    },
    {
      id: 'gn9_9',
      title: 'My partner died and I learned to navigate alone',
      narrative: [
        'Taxes.',
        '',
        'Repairs.',
        '',
        'All the things he handled.',
        '',
        'Forced to learn.',
        '',
        'Grief through skill-building.',
        '',
        'I tell newly-alone: practical learning is grief work.'
      ],
      lesson: 'Practical skill-building after partner death is grief work through forced learning.'
    },
    {
      id: 'gn9_10',
      title: 'My grandfather died and his stories live in me',
      narrative: [
        'Family stories he told.',
        '',
        'I tell them now.',
        '',
        'To my children.',
        '',
        'Generational continuation.',
        '',
        'Story as inheritance.',
        '',
        'I tell story-bearers: telling continues.'
      ],
      lesson: 'Telling deceased family stories to next generation continues bond generationally.'
    },
    {
      id: 'gn9_11',
      title: 'My friend died and I struggle on her birthday',
      narrative: [
        'Every March 14.',
        '',
        'Take the day off work.',
        '',
        'Visit her favorite places.',
        '',
        'Annual birthday ritual.',
        '',
        'I tell birthday-grievers: take the day.'
      ],
      lesson: 'Taking deceased birthdays off for ritual is legitimate grief practice.'
    },
    {
      id: 'gn9_12',
      title: 'My mother died and I cook her birthday dinner',
      narrative: [
        'Same menu each year.',
        '',
        'Family gathered.',
        '',
        'Stories shared.',
        '',
        'Annual ritual contains grief.',
        '',
        'I tell food-ritual families: meal contains.'
      ],
      lesson: 'Annual birthday meal of deceased contains grief through ritual gathering.'
    },
    {
      id: 'gn9_13',
      title: 'My friend died and I joined grief support group',
      narrative: [
        'Strangers who got it.',
        '',
        'Weekly meetings.',
        '',
        'Specialty friend loss group.',
        '',
        'Saved me.',
        '',
        'I tell friend-loss: groups exist.'
      ],
      lesson: 'Specialty friend loss groups exist and provide essential peer understanding.'
    },
    {
      id: 'gn9_14',
      title: 'My grandfather died and I inherited his books',
      narrative: [
        'Library of 2000 books.',
        '',
        'Notes in margins.',
        '',
        'Knew him through annotations.',
        '',
        'Library inheritance is intimate.',
        '',
        'I tell book-inheritors: read the marginalia.'
      ],
      lesson: 'Inherited libraries with marginalia reveal deceased loved ones inner life.'
    },
    {
      id: 'gn9_15',
      title: 'My mother died and time changed shape',
      narrative: [
        'Year felt like a decade.',
        '',
        'Time before her death.',
        '',
        'Time after.',
        '',
        'Two different times.',
        '',
        'Grief warps time.',
        '',
        'I tell new grievers: time will feel different for years.'
      ],
      lesson: 'Grief warps time perception; before and after death feel like different eras.'
    }
  ];

  var GRIEF_NARRATIVES_10 = [
    {
      id: 'gn10_1',
      title: 'My grief eventually softened',
      narrative: [
        'Three years out.',
        '',
        'Still sad.',
        '',
        'But softer.',
        '',
        'Not gone.',
        '',
        'Different now.',
        '',
        'Integrated.',
        '',
        'I tell new grievers: it integrates.'
      ],
      lesson: 'Grief eventually integrates rather than disappears; softer and present.'
    },
    {
      id: 'gn10_2',
      title: 'My friend died and I learned to live with it',
      narrative: [
        'Not over it.',
        '',
        'Living with it.',
        '',
        'Grief alongside me.',
        '',
        'Daily companion.',
        '',
        'I tell new grievers: alongside, not over.'
      ],
      lesson: 'Grief lives alongside us; not something to get over.'
    },
    {
      id: 'gn10_3',
      title: 'My family changed shape and I learned new shape',
      narrative: [
        'Father gone.',
        '',
        'New family configuration.',
        '',
        'Mother stronger.',
        '',
        'Siblings closer.',
        '',
        'New shape emerged.',
        '',
        'I tell post-loss families: new shape forms.'
      ],
      lesson: 'Family loss creates new family shape over time; reconfigured but real.'
    },
    {
      id: 'gn10_4',
      title: 'My partner died and I found new love',
      narrative: [
        'Year 5.',
        '',
        'Met new partner.',
        '',
        'Loves me as widowed.',
        '',
        'Honors continuing love for deceased.',
        '',
        'Both fit.',
        '',
        'I tell new-love widowed: it can fit.'
      ],
      lesson: 'New love after long widowhood can honor continuing bond with deceased.'
    },
    {
      id: 'gn10_5',
      title: 'My grandmother died and I became a grandmother',
      narrative: [
        'Two decades later.',
        '',
        'My granddaughter born.',
        '',
        'Generational grief and joy.',
        '',
        'I am her now.',
        '',
        'Continuing line.',
        '',
        'I tell generational families: lines continue.'
      ],
      lesson: 'Becoming grandmother years after grandmother death creates generational continuity.'
    },
    {
      id: 'gn10_6',
      title: 'My grief made me a more compassionate person',
      narrative: [
        'Suffering taught me.',
        '',
        'Compassion for other grievers.',
        '',
        'Recognize signs.',
        '',
        'Help others now.',
        '',
        'Grief gift.',
        '',
        'I tell long-term grievers: compassion can grow.'
      ],
      lesson: 'Long-term grief work can grow compassion for other sufferers.'
    },
    {
      id: 'gn10_7',
      title: 'My friend died and I became advocate for prevention',
      narrative: [
        'Suicide prevention work.',
        '',
        'In her honor.',
        '',
        'Crisis line volunteer.',
        '',
        'Channel grief into prevention.',
        '',
        'I tell suicide-loss advocates: channel works.'
      ],
      lesson: 'Channeling grief into prevention advocacy honors loved ones and prevents future losses.'
    },
    {
      id: 'gn10_8',
      title: 'My mother died and I write to her still',
      narrative: [
        'Annual letter.',
        '',
        'Tell her everything.',
        '',
        'Wedding, kids, struggles.',
        '',
        'She would want to know.',
        '',
        'Letters continue conversation.',
        '',
        'I tell letter-writers: continued communication helps.'
      ],
      lesson: 'Letters to deceased loved ones continue conversation; useful long-term ritual.'
    },
    {
      id: 'gn10_9',
      title: 'My grief led me to therapy and changed my life',
      narrative: [
        'Never been in therapy.',
        '',
        'Grief forced me.',
        '',
        'Learned about my whole self.',
        '',
        'Therapy continued past grief.',
        '',
        'I tell grief-led therapy: continue past initial reason.'
      ],
      lesson: 'Grief-initiated therapy can become life-long support beyond initial loss.'
    },
    {
      id: 'gn10_10',
      title: 'My partner died and I traveled solo for first time',
      narrative: [
        'We used to travel together.',
        '',
        'After he died, took first solo trip.',
        '',
        'Scary but freeing.',
        '',
        'New chapter.',
        '',
        'I tell widowed: solo travel is grief work.'
      ],
      lesson: 'Solo travel after partner loss is grief work; reclaims independence.'
    },
    {
      id: 'gn10_11',
      title: 'My grandfather died and I built a workshop in his honor',
      narrative: [
        'He taught me to work wood.',
        '',
        'After he died I built my own shop.',
        '',
        'Working there feels like with him.',
        '',
        'Continuing his craft.',
        '',
        'I tell craft-mourners: build the space.'
      ],
      lesson: 'Building workshop spaces in honor of mentors continues craft as grief practice.'
    },
    {
      id: 'gn10_12',
      title: 'My friend died and her painting hangs in my office',
      narrative: [
        'She painted this for me.',
        '',
        'Now memorial daily.',
        '',
        'Look at it through workdays.',
        '',
        'Continuing presence.',
        '',
        'I tell art-inheritors: hang the art.'
      ],
      lesson: 'Hanging deceased loved ones art creates daily continuing presence.'
    },
    {
      id: 'gn10_13',
      title: 'My grief community became my chosen family',
      narrative: [
        'Met them in grief group.',
        '',
        'Now my closest people.',
        '',
        'Grief bonded us.',
        '',
        'Chosen family forged in loss.',
        '',
        'I tell grief group members: bonds can become family.'
      ],
      lesson: 'Grief groups can forge chosen family bonds that extend beyond initial mourning.'
    },
    {
      id: 'gn10_14',
      title: 'My mother died and I became more like her',
      narrative: [
        'Started laughing like her.',
        '',
        'Cooking like her.',
        '',
        'Carrying her gestures.',
        '',
        'Becoming her.',
        '',
        'Continuing through embodiment.',
        '',
        'I tell becomers: bodies remember and continue.'
      ],
      lesson: 'Becoming more like deceased parents through embodied continuation is real grief integration.'
    },
    {
      id: 'gn10_15',
      title: 'My grief integrated with my life',
      narrative: [
        'Five years out.',
        '',
        'Grief is part of me.',
        '',
        'Not all of me.',
        '',
        'Integrated.',
        '',
        'I am whole again.',
        '',
        'Different but whole.',
        '',
        'I tell long-term grievers: wholeness is possible.'
      ],
      lesson: 'Grief integrates into life over years; wholeness with loss is possible.'
    }
  ];

  var GRIEF_NARRATIVES_1 = [
    {
      id: 'gn1_1',
      title: 'When my dad died on a Tuesday',
      narrative: [
        'School called me out of math class.',
        '',
        'I knew before they said it.',
        '',
        'Cancer had been waiting six months.',
        '',
        'But Tuesday is not a day for endings.',
        '',
        'I went home in the school van.',
        '',
        'My mom met me at the door.',
        '',
        'She did not have to say anything.',
        '',
        'Her face said it.',
        '',
        'We sat on the kitchen floor.',
        '',
        'Both of us crying.',
        '',
        'The dog brought us a sock.',
        '',
        'I think she was confused.',
        '',
        'I tell other kids: there is no right day.'
      ],
      lesson: 'There is no right day for loss; ordinary days hold endings.'
    },
    {
      id: 'gn1_2',
      title: 'My grandmother died and I felt relief first',
      narrative: [
        'She had Alzheimers for eight years.',
        '',
        'Did not know me at the end.',
        '',
        'When she died, I felt relief.',
        '',
        'Then guilt for the relief.',
        '',
        'Then sadness underneath both.',
        '',
        'Therapist told me: relief is grief too.',
        '',
        'You can mourn the long goodbye.',
        '',
        'You can be glad the suffering ended.',
        '',
        'Both true at once.',
        '',
        'I tell grandkids of dementia patients: complicated feelings are normal.'
      ],
      lesson: 'Relief after long illness is real grief, not betrayal of love.'
    },
    {
      id: 'gn1_3',
      title: 'My best friend moved across country in 8th grade',
      narrative: [
        'Lily was my person.',
        '',
        'Her dad got a job in Oregon.',
        '',
        'Two weeks of warning.',
        '',
        'I did not eat dinner the night she told me.',
        '',
        'We promised to text every day.',
        '',
        'First month we did.',
        '',
        'Then once a week.',
        '',
        'Then on birthdays.',
        '',
        'It was its own kind of dying.',
        '',
        'Friendship loss is real loss.',
        '',
        'I tell kids whose best friend moves: this is grief.'
      ],
      lesson: 'Best friend moving away is genuine grief deserving acknowledgment.'
    },
    {
      id: 'gn1_4',
      title: 'My parents divorced when I was 12',
      narrative: [
        'Heard them fighting through the wall.',
        '',
        'Did not know it was the end.',
        '',
        'They sat me and my sister down.',
        '',
        'Said adult words like amicable.',
        '',
        'My sister cried.',
        '',
        'I did not cry until later.',
        '',
        'Two houses now.',
        '',
        'Toothbrush at each.',
        '',
        'Holidays divided.',
        '',
        'Both parents lonely in their new places.',
        '',
        'I tell kids of divorce: it is loss even when it is right.'
      ],
      lesson: 'Divorce is family loss even when amicable; children grieve.'
    },
    {
      id: 'gn1_5',
      title: 'My dog died of old age at 14',
      narrative: [
        'Bear was my dog since I was 4.',
        '',
        'He was 14, we knew it was coming.',
        '',
        'Vet came to our house.',
        '',
        'We held him on his bed.',
        '',
        'I told him every good boy story.',
        '',
        'Then he was gone.',
        '',
        'House felt loud without him.',
        '',
        'No clicking nails on the floor.',
        '',
        'No tail thumping when I came home.',
        '',
        'I tell pet owners: this grief is real.'
      ],
      lesson: 'Pet loss is real grief; bond was real, loss is real.'
    },
    {
      id: 'gn1_6',
      title: 'My brother died by suicide at 19',
      narrative: [
        'He was 19, I was 14.',
        '',
        'Note left on his bed.',
        '',
        'Police, ambulance, neighbors.',
        '',
        'My mom screamed in a way I had never heard.',
        '',
        'For two years I could not say the word suicide.',
        '',
        'Then I started saying it.',
        '',
        'Therapy with a suicide loss specialist.',
        '',
        'Survivor group with other siblings.',
        '',
        'Slowly the why questions quieted.',
        '',
        'They never disappeared.',
        '',
        'I tell suicide loss siblings: you will survive this. Please find specialty help.'
      ],
      lesson: 'Sibling suicide loss is its own grief category; specialty support is essential.'
    },
    {
      id: 'gn1_7',
      title: 'My miscarriage at 11 weeks',
      narrative: [
        'Wanted this baby.',
        '',
        'Lost the baby at 11 weeks.',
        '',
        'Some people did not even know I was pregnant.',
        '',
        'They did not know to mourn with me.',
        '',
        'I felt invisible.',
        '',
        'Miscarriage support group helped.',
        '',
        'Others who knew the silent grief.',
        '',
        'My body remembered too.',
        '',
        'Took longer than I thought to heal.',
        '',
        'I tell miscarriage survivors: this is real grief. Find your people.'
      ],
      lesson: 'Miscarriage is real grief often hidden; specialty support breaks silence.'
    },
    {
      id: 'gn1_8',
      title: 'My grandfather died and no one cried at the funeral',
      narrative: [
        'He was 88, lived a full life.',
        '',
        'Funeral was celebratory.',
        '',
        'Stories of his adventures.',
        '',
        'Laughter at his sayings.',
        '',
        'No one cried.',
        '',
        'I felt wrong for being sad.',
        '',
        'Therapist told me: their joy is not your obligation.',
        '',
        'You are allowed your sadness.',
        '',
        'Even at a celebration of life.',
        '',
        'I tell young people at celebratory funerals: your grief is yours.'
      ],
      lesson: 'Celebration of life funerals do not invalidate younger family member grief.'
    },
    {
      id: 'gn1_9',
      title: 'My mom got sick and is dying slowly',
      narrative: [
        'ALS diagnosis 18 months ago.',
        '',
        'Watching her body fail.',
        '',
        'Anticipatory grief.',
        '',
        'Grieving while she is still here.',
        '',
        'Feels like betrayal sometimes.',
        '',
        'Hospice social worker helped name it.',
        '',
        'Anticipatory grief is real grief.',
        '',
        'Allowed to feel it now.',
        '',
        'I tell families with terminal diagnoses: anticipatory grief is real.'
      ],
      lesson: 'Anticipatory grief during terminal illness is real grief deserving validation.'
    },
    {
      id: 'gn1_10',
      title: 'My identity changed when I came out',
      narrative: [
        'Came out as trans at 16.',
        '',
        'Lost my old name.',
        '',
        'Lost some friends.',
        '',
        'Lost the future my parents imagined.',
        '',
        'Even when coming out is right, it is loss.',
        '',
        'I had to grieve who I was supposed to be.',
        '',
        'And who others expected.',
        '',
        'Affirming therapist helped.',
        '',
        'I tell LGBTQ+ youth: identity grief is real even when transition is joy.'
      ],
      lesson: 'Identity transition includes real grief for old self and others expectations.'
    },
    {
      id: 'gn1_11',
      title: 'My cousin died in a car accident at 17',
      narrative: [
        'Sudden loss is different.',
        '',
        'No goodbye possible.',
        '',
        'No preparation.',
        '',
        'Just gone in a moment.',
        '',
        'Funeral 4 days later, I was numb.',
        '',
        'Six months in, the numbness cracked.',
        '',
        'Trauma therapy plus grief therapy.',
        '',
        'Sudden loss has trauma layered with grief.',
        '',
        'I tell sudden loss survivors: trauma plus grief together.'
      ],
      lesson: 'Sudden loss involves trauma plus grief; both need treatment.'
    },
    {
      id: 'gn1_12',
      title: 'My best friend committed suicide and I am angry',
      narrative: [
        'Anger at her.',
        '',
        'For leaving.',
        '',
        'For not telling me how bad it was.',
        '',
        'Then guilt for the anger.',
        '',
        'Therapist said: anger is part of grief.',
        '',
        'Especially in suicide loss.',
        '',
        'Anger does not mean you did not love them.',
        '',
        'Anger is one face of grief.',
        '',
        'I tell suicide survivors: anger is normal. Let it through.'
      ],
      lesson: 'Anger at someone who died by suicide is normal grief response, not failure of love.'
    },
    {
      id: 'gn1_13',
      title: 'My uncle died of overdose',
      narrative: [
        'Family said heart attack.',
        '',
        'I found out it was overdose.',
        '',
        'Stigma made grief harder.',
        '',
        'Hidden cause of death.',
        '',
        'Hidden grief.',
        '',
        'Overdose loss support group online.',
        '',
        'Others knew the layered shame.',
        '',
        'My uncle was sick.',
        '',
        'His death was tragic, not shameful.',
        '',
        'I tell overdose loss survivors: stigma is not your burden to carry.'
      ],
      lesson: 'Overdose loss grief is real grief; stigma is not survivors burden to carry.'
    },
    {
      id: 'gn1_14',
      title: 'My team coach died of cancer',
      narrative: [
        'He was a second father.',
        '',
        'Coached me for 6 years.',
        '',
        'Cancer took him quickly.',
        '',
        'I did not know how to grieve a coach.',
        '',
        'It felt different from family.',
        '',
        'But it was real grief.',
        '',
        'Team did a tribute game.',
        '',
        'We wore his number.',
        '',
        'Grief moved with us on the field.',
        '',
        'I tell athletes who lose coaches: this is family-level grief.'
      ],
      lesson: 'Coach loss is family-level grief; chosen family bonds deserve real grief acknowledgment.'
    },
    {
      id: 'gn1_15',
      title: 'My step parent died and family did not include me',
      narrative: [
        'My step mom raised me from age 6.',
        '',
        'She died at 58.',
        '',
        'Her biological children handled everything.',
        '',
        'I was 24, an adult, but not included.',
        '',
        'Disenfranchised grief.',
        '',
        'My grief did not have a recognized seat at the table.',
        '',
        'Therapy helped me claim it anyway.',
        '',
        'I held my own private rituals.',
        '',
        'I tell step-family grief: your bond is real, your grief is real.'
      ],
      lesson: 'Step-family grief is real grief even when biological family excludes; ritual it privately.'
    }
  ];

  var GRIEF_NARRATIVES_2 = [
    {
      id: 'gn2_1',
      title: 'My mother died of cancer and I was 8',
      narrative: [
        'I was 8 when she died.',
        '',
        'Did not understand death yet.',
        '',
        'Kept waiting for her to come home.',
        '',
        'School counselor used a grief comic book.',
        '',
        'Showed me what death meant.',
        '',
        'Permanent. No going back.',
        '',
        'I cried for three days straight.',
        '',
        'Then slowly came back to life.',
        '',
        'My dad was patient.',
        '',
        'I tell young grieving children: it takes time to understand.'
      ],
      lesson: 'Young children need concrete grief education; concept of death takes time to land.'
    },
    {
      id: 'gn2_2',
      title: 'My uncle died abroad and I could not go to funeral',
      narrative: [
        'He lived in another country.',
        '',
        'Died there suddenly.',
        '',
        'Family could not afford flights for all of us.',
        '',
        'I missed the funeral.',
        '',
        'Felt frozen for months after.',
        '',
        'Did my own private goodbye.',
        '',
        'Lit a candle.',
        '',
        'Wrote him a letter I could not send.',
        '',
        'Missing the funeral did not mean missing the grief.',
        '',
        'I tell distance-grieved: private rituals matter.'
      ],
      lesson: 'When you cannot attend a funeral, private goodbye rituals are essential grief work.'
    },
    {
      id: 'gn2_3',
      title: 'My friend died in a school shooting',
      narrative: [
        'Worst day of my life.',
        '',
        'School locked down.',
        '',
        'Friend in another classroom did not make it.',
        '',
        'Community grief plus trauma.',
        '',
        'Both layered.',
        '',
        'Trauma specialist for years.',
        '',
        'Slowly returned to a school.',
        '',
        'But never fully.',
        '',
        'I tell school shooting survivors: trauma plus grief is long road.'
      ],
      lesson: 'School shooting loss involves layered trauma and grief needing specialty long-term care.'
    },
    {
      id: 'gn2_4',
      title: 'My biological mother gave me up at birth',
      narrative: [
        'Adopted at birth.',
        '',
        'Grew up knowing.',
        '',
        'But in teens grief surfaced.',
        '',
        'For a mother I never met.',
        '',
        'A life I could have had.',
        '',
        'Adoption-aware therapist.',
        '',
        'Primal wound concept.',
        '',
        'Adoptee grief is real.',
        '',
        'I tell adoptees: your grief for biological story is valid.'
      ],
      lesson: 'Adoptee grief for biological story is real grief deserving adoption-competent therapy.'
    },
    {
      id: 'gn2_5',
      title: 'My partner died young of overdose',
      narrative: [
        'We were 23.',
        '',
        'Heroin took him.',
        '',
        'I found him.',
        '',
        'PTSD plus grief.',
        '',
        'Overdose loss support group online.',
        '',
        'Others knew this exact shape of grief.',
        '',
        'Years of work.',
        '',
        'I tell young widowed by overdose: specialty support saved me.'
      ],
      lesson: 'Overdose loss in young partners requires both trauma and overdose-specific specialty support.'
    },
    {
      id: 'gn2_6',
      title: 'My family pet was killed by car',
      narrative: [
        'Saw it happen.',
        '',
        'Could not save him.',
        '',
        'Trauma plus grief.',
        '',
        'Therapy for both.',
        '',
        'Slowly the image faded.',
        '',
        'Grief remained but softened.',
        '',
        'I tell pet trauma loss: both layers need care.'
      ],
      lesson: 'Traumatic pet death requires therapy for both trauma and grief layers.'
    },
    {
      id: 'gn2_7',
      title: 'My grandmother was my caregiver and she died',
      narrative: [
        'Raised me from age 2.',
        '',
        'My parents were absent.',
        '',
        'She died when I was 19.',
        '',
        'Mother figure grief.',
        '',
        'Specialty therapy for kinship grief.',
        '',
        'Different from grandmother grief.',
        '',
        'She was everything.',
        '',
        'I tell kinship-raised: your grief is mother-level even when it is grandmother.'
      ],
      lesson: 'Kinship-raised children grieve at mother-level when caregiver grandparent dies.'
    },
    {
      id: 'gn2_8',
      title: 'My friend died and his parents disappeared',
      narrative: [
        'My friend died at 16.',
        '',
        'His parents moved away within weeks.',
        '',
        'I lost him.',
        '',
        'Then I lost the people who knew him too.',
        '',
        'Second loss in the first.',
        '',
        'Therapist named it.',
        '',
        'Some grief is layered.',
        '',
        'I tell young friends of lost friends: second losses are real.'
      ],
      lesson: 'When grieving family disappears, the second loss compounds the first; name it.'
    },
    {
      id: 'gn2_9',
      title: 'My cat was put down for behavior',
      narrative: [
        'Aggression had escalated.',
        '',
        'Vet recommended.',
        '',
        'Family decided.',
        '',
        'I held her at the end.',
        '',
        'But guilt followed.',
        '',
        'Did we try enough?',
        '',
        'Pet loss specialist helped.',
        '',
        'Decision grief is real grief.',
        '',
        'I tell euthanasia grievers: complicated grief is real grief.'
      ],
      lesson: 'Behavioral euthanasia carries decision grief; specialty support exists.'
    },
    {
      id: 'gn2_10',
      title: 'My great-grandmother lived to 102 and I still cried',
      narrative: [
        'Everyone said: she had a good run.',
        '',
        'Yes she did.',
        '',
        'But she was my person.',
        '',
        '102 does not erase love.',
        '',
        'Sadness was full.',
        '',
        'I tell families of long-lived elders: grief is not diminished by age.'
      ],
      lesson: 'Long life does not diminish grief; bond was bond regardless of length.'
    },
    {
      id: 'gn2_11',
      title: 'My foster sister was moved to another family',
      narrative: [
        'Foster system shuffled her away.',
        '',
        'We had 18 months together.',
        '',
        'I called her sister.',
        '',
        'Then she was gone.',
        '',
        'Foster siblings grief.',
        '',
        'Not officially family.',
        '',
        'Real grief anyway.',
        '',
        'I tell foster siblings: your grief is real even without legal status.'
      ],
      lesson: 'Foster sibling grief is real grief regardless of legal recognition.'
    },
    {
      id: 'gn2_12',
      title: 'My teacher died and the school was awkward',
      narrative: [
        'Mr K had cancer.',
        '',
        'Died over summer break.',
        '',
        'Came back to school in August.',
        '',
        'School felt different.',
        '',
        'Some did not know.',
        '',
        'Some had moved on.',
        '',
        'My grief was raw.',
        '',
        'Counselor helped me find a circle of kids who also missed him.',
        '',
        'I tell teacher-loss students: find your circle.'
      ],
      lesson: 'Teacher loss creates pockets of grief; school counselors can connect grieving students.'
    },
    {
      id: 'gn2_13',
      title: 'My military friend died in deployment',
      narrative: [
        'He was 23.',
        '',
        'I was at home, he was abroad.',
        '',
        'IED took him.',
        '',
        'Military death has specific layers.',
        '',
        'Pride, anger, politics, grief.',
        '',
        'Specialty support exists.',
        '',
        'Gold Star community.',
        '',
        'I tell military loss families: specialty community exists.'
      ],
      lesson: 'Military loss carries specific layers; Gold Star and TAPS communities exist.'
    },
    {
      id: 'gn2_14',
      title: 'My dog died of old age and I sobbed for weeks',
      narrative: [
        'Bella was 16.',
        '',
        'My friend through middle and high school.',
        '',
        'Cancer at the end.',
        '',
        'Vet came to our house.',
        '',
        'I sobbed for weeks.',
        '',
        'Pet loss support helped.',
        '',
        'I tell pet grievers: your grief is real adult grief.'
      ],
      lesson: 'Pet loss is real adult grief deserving support, not minimization.'
    },
    {
      id: 'gn2_15',
      title: 'My pregnancy was lost at 24 weeks',
      narrative: [
        'Baby had a name.',
        '',
        'We had clothes.',
        '',
        'Lost at 24 weeks.',
        '',
        'Stillbirth.',
        '',
        'Held her once.',
        '',
        'Then she was gone forever.',
        '',
        'Perinatal grief specialist.',
        '',
        'Empty cradle organization helped.',
        '',
        'I tell stillbirth families: specialty perinatal support is essential.'
      ],
      lesson: 'Stillbirth requires specialty perinatal grief support; Empty Cradle exists.'
    }
  ];

  var GRIEF_NARRATIVES_3 = [
    {
      id: 'gn3_1',
      title: 'My grief came in waves not stages',
      narrative: [
        'Read about five stages.',
        '',
        'Expected to move through them.',
        '',
        'My grief did not work like that.',
        '',
        'Came in waves.',
        '',
        'Some days fine.',
        '',
        'Some days drowning.',
        '',
        'Triggered by songs, smells, dates.',
        '',
        'Therapist said stages were a myth.',
        '',
        'Grief is non-linear.',
        '',
        'I tell new grievers: waves not stages.'
      ],
      lesson: 'Grief comes in non-linear waves not five neat stages; expect wave patterns.'
    },
    {
      id: 'gn3_2',
      title: 'My anniversary reactions surprise me each year',
      narrative: [
        'Dad died December 12.',
        '',
        'Every December I would crash.',
        '',
        'Did not know why for years.',
        '',
        'Therapist named anniversary reaction.',
        '',
        'Body remembers even when mind forgets.',
        '',
        'Now I plan around it.',
        '',
        'I tell anniversary-affected: body remembers.'
      ],
      lesson: 'Anniversary reactions are real; body remembers loss dates even when mind forgets.'
    },
    {
      id: 'gn3_3',
      title: 'My friend died and I was the last one to see her',
      narrative: [
        'Took her home after dinner.',
        '',
        'She seemed fine.',
        '',
        'Car accident on way back.',
        '',
        'Survivor guilt heavy.',
        '',
        'Why me alive, her dead?',
        '',
        'Survivor guilt therapy.',
        '',
        'I tell last-witnesses: survivor guilt is specific specialty.'
      ],
      lesson: 'Survivor guilt has specialty treatment; being last witness creates particular grief.'
    },
    {
      id: 'gn3_4',
      title: 'My partner died and people stopped calling',
      narrative: [
        'First weeks: meal trains, calls.',
        '',
        'After three months: silence.',
        '',
        'Most disappeared.',
        '',
        'Long-term grief is lonely.',
        '',
        'Found young widow group online.',
        '',
        'Others who still showed up at year 2.',
        '',
        'I tell young widowed: short-term help is real; long-term help needs seeking.'
      ],
      lesson: 'Grief support shrinks after months; long-term groups become essential.'
    },
    {
      id: 'gn3_5',
      title: 'My grandfather died of slow Alzheimers',
      narrative: [
        'Lost him in pieces.',
        '',
        'First his memory.',
        '',
        'Then his recognition of me.',
        '',
        'Then his ability to speak.',
        '',
        'Then his body.',
        '',
        'Ambiguous loss.',
        '',
        'Mourning multiple times before final death.',
        '',
        'I tell dementia families: ambiguous loss is real ongoing grief.'
      ],
      lesson: 'Dementia caregivers experience ambiguous loss with multiple mourning stages.'
    },
    {
      id: 'gn3_6',
      title: 'My friend died and I felt nothing at first',
      narrative: [
        'Initial reaction: numbness.',
        '',
        'Could not feel anything.',
        '',
        'Felt broken for not crying.',
        '',
        'Therapist: shock is protection.',
        '',
        'Numbness is grief.',
        '',
        'Feelings would come.',
        '',
        'They did, eventually.',
        '',
        'I tell numb grievers: numbness is real grief.'
      ],
      lesson: 'Numbness is grief in protective form; feelings emerge in their own time.'
    },
    {
      id: 'gn3_7',
      title: 'My mother died and I had to make all decisions',
      narrative: [
        'Only child, dad gone earlier.',
        '',
        'Funeral choices.',
        '',
        'Estate.',
        '',
        'Possessions to sort.',
        '',
        'Grief while doing logistics.',
        '',
        'Decision fatigue plus grief.',
        '',
        'I tell sole responsible mourners: get a grief companion through logistics.'
      ],
      lesson: 'Sole decision-making during grief compounds; companions through logistics help.'
    },
    {
      id: 'gn3_8',
      title: 'My grandfather was my favorite and he died',
      narrative: [
        'Best memories with him.',
        '',
        'Workshop in his basement.',
        '',
        'Sundays at his house.',
        '',
        'Died when I was 15.',
        '',
        'First major loss.',
        '',
        'Cried for a year on and off.',
        '',
        'I tell first major loss teens: this takes time.'
      ],
      lesson: 'First major loss in adolescence takes long time; do not rush yourself.'
    },
    {
      id: 'gn3_9',
      title: 'My sibling died of childhood cancer',
      narrative: [
        'My sister was 7 when she died.',
        '',
        'I was 11.',
        '',
        'My parents disappeared into their grief.',
        '',
        'I disappeared into mine.',
        '',
        'Camp Kesem for grieving siblings.',
        '',
        'Specialty sibling grief support.',
        '',
        'I tell bereaved siblings: specific camps exist for you.'
      ],
      lesson: 'Bereaved sibling camps like Kesem provide specialty support distinct from parental grief.'
    },
    {
      id: 'gn3_10',
      title: 'My best friend ghosted me after my dad died',
      narrative: [
        'Could not handle my grief.',
        '',
        'Disappeared.',
        '',
        'Second loss inside the first.',
        '',
        'Hurts the same as a death sometimes.',
        '',
        'Therapy helped me see her limit.',
        '',
        'Some people cannot stay during grief.',
        '',
        'Not personal.',
        '',
        'But the loss is real.',
        '',
        'I tell ghosted grievers: this is real loss too.'
      ],
      lesson: 'Friends who ghost during grief create real secondary loss; not personal but real.'
    },
    {
      id: 'gn3_11',
      title: 'My team mascot died and we mourned together',
      narrative: [
        'Our high school had a mascot dog for 12 years.',
        '',
        'She died over summer.',
        '',
        'Came back to school in fall.',
        '',
        'Whole team in mourning.',
        '',
        'Collective grief is real grief.',
        '',
        'We made a memorial garden.',
        '',
        'I tell community mascot losses: collective grief deserves ritual.'
      ],
      lesson: 'Community mascot loss is collective grief deserving shared ritual.'
    },
    {
      id: 'gn3_12',
      title: 'My online friend died and no one in my real life knew her',
      narrative: [
        'Three years of online friendship.',
        '',
        'Discord group of writers.',
        '',
        'She died of leukemia.',
        '',
        'Only her family knew the online community existed.',
        '',
        'My real life friends did not get it.',
        '',
        'Online friend loss is real loss.',
        '',
        'I tell online grievers: this is real friendship.'
      ],
      lesson: 'Online friendship loss is real grief even when real-life friends do not understand.'
    },
    {
      id: 'gn3_13',
      title: 'My grandfather slipped away in the night',
      narrative: [
        'Hospice.',
        '',
        'Family bedside for days.',
        '',
        'I went home to shower.',
        '',
        'He died while I was gone.',
        '',
        'Guilt for not being there.',
        '',
        'Grief therapist said: he chose his moment.',
        '',
        'Some people need solitude to go.',
        '',
        'Not abandonment.',
        '',
        'I tell missed-the-moment grievers: their choice was respected.'
      ],
      lesson: 'Missing the moment of death is not abandonment; some choose solitude.'
    },
    {
      id: 'gn3_14',
      title: 'My friend died and I keep her phone number in my contacts',
      narrative: [
        'Ten years after she died.',
        '',
        'Phone still has her contact.',
        '',
        'Sometimes I scroll past it.',
        '',
        'Sometimes I send her a text into the void.',
        '',
        'Grief therapist said: keep it as long as it serves you.',
        '',
        'No rule about when to delete.',
        '',
        'I tell long-term grievers: keep the contact.'
      ],
      lesson: 'Keeping deceased contacts in phone is normal long-term grief practice.'
    },
    {
      id: 'gn3_15',
      title: 'My parents lost a baby before me',
      narrative: [
        'Found out at 16.',
        '',
        'Sister I never knew.',
        '',
        'Lost at 6 months.',
        '',
        'My parents carried it silently.',
        '',
        'I felt the family-shaped hole.',
        '',
        'Now I understand it.',
        '',
        'Family secret grief affects everyone.',
        '',
        'I tell adults raised in grief households: name it now.'
      ],
      lesson: 'Family secret grief affects all generations; naming it allows healing.'
    }
  ];

  window.SelHub.registerTool('griefLoss', {
    icon: '🕯️',
    label: 'Grief & Loss',
    desc: 'A guided self-companion for grief. Works for death of a person or pet, family changes, friend losses, identity losses, ambiguous loss. Built on Worden\'s Tasks of Mourning and the Dual Process Model. Includes strong pointers to clinical support for severe or complicated grief.',
    color: 'rose',
    category: 'care-of-self',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _griT = (ctx && ctx.theme) || {};
      var _griHC = !!_griT.isContrast, _griL = !_griHC && !_griT.isDark;
      var _gri_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _gri_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#fff':'#000000','#fdf2f8':'#000000'};
      var _gri_FGL = {'#cbd5e1':'#334155','#fda4af':'#9f1239','#94a3b8':'#64748b','#fecaca':'#b91c1c','#e2e8f0':'#1e293b','#a5b4fc':'#3730a3','#fee2e2':'#991b1b','#c7d2fe':'#312e81','#e9d5ff':'#581c87','#c4b5fd':'#5b21b6','#fca5a5':'#991b1b','#fcd34d':'#78350f','#fde68a':'#92400e'}, _gri_FGH = {'#cbd5e1':'#ffff00','#fda4af':'#ffff00','#94a3b8':'#ffff00','#fecaca':'#ffff00','#fecdd3':'#ffff00','#e2e8f0':'#ffff00','#a5b4fc':'#ffff00','#fff':'#ffff00','#bbf7d0':'#ffff00','#dcfce7':'#ffff00','#fee2e2':'#ffff00','#c7d2fe':'#ffff00','#e9d5ff':'#ffff00','#c4b5fd':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00','#fca5a5':'#ffff00','#fcd34d':'#ffff00','#fde68a':'#ffff00'};
      var _gri_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _gri_BDH = {'#334155':'#ffff00','#ef4444':'#ffff00','#1e293b':'#ffff00','#fb7185':'#ffff00','#818cf8':'#ffff00','#6366f1':'#ffff00','#a855f7':'#ffff00','#22c55e':'#ffff00','#475569':'#ffff00','#cbd5e1':'#ffff00','#be123c':'#ffff00','#f59e0b':'#ffff00'};
      var _griBg = function(h){ return _griHC ? (_gri_BGH[h]||h) : (_griL ? (_gri_BGL[h]||h) : h); };
      var _griFg = function(h){ return _griHC ? (_gri_FGH[h]||h) : (_griL ? (_gri_FGL[h]||h) : h); };
      var _griBd = function(h){ return _griHC ? (_gri_BDH[h]||h) : (_griL ? (_gri_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.griefLoss || defaultState();
      function setG(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.griefLoss) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { griefLoss: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setG({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _griFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _griFg('#fda4af'), fontSize: 22, fontWeight: 900 } }, '🕯️ Grief & Loss'),
            h('div', { style: { fontSize: 12, color: _griFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'A guided companion for grief, on your own time.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🕯️' },
          { id: 'name', label: 'Name the loss', icon: '✍️' },
          { id: 'tasks', label: 'The four tasks', icon: '🌊' },
          { id: 'letter', label: 'Letter', icon: '✉️' },
          { id: 'rituals', label: 'Rituals', icon: '🌿' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Grief and Loss sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#fb7185' : '#334155'),
                background: active ? 'rgba(251,113,133,0.18)' : _griBg('#1e293b'),
                color: active ? _griFg('#fecdd3') : _griFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      // Strong safety banner — always visible across all views
      function safetyBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: _griFg('#fecaca'), lineHeight: 1.65 } },
          h('strong', null, '🆘 Please read: '),
          'Grief is not the same as suicidality. But sometimes, in grief, people have thoughts about wanting to be with the person who died. If you\'re having those thoughts, that is a moment for an adult, not for this tool alone. Call 988 (Suicide and Crisis Lifeline), text HOME to 741741, or open the Crisis Companion in this SEL Hub. You deserve company in this. You do not have to carry it alone.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: _griFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This tool is a companion, not therapy. Severe grief, complicated grief, or grief tied to trauma deserves a counselor or grief-trained therapist. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,113,133,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(251,113,133,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _griFg('#fecdd3'), marginBottom: 4 } }, 'Grief is the price of loving.'),
            h('p', { style: { margin: '0 0 8px', color: _griFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'Grief is not a problem to be fixed. It is the natural response to loss. The goal of grief work is not to "get over it" — that\'s a myth. The goal is to carry what has happened in a way that lets you keep living, while staying connected to what you loved.'
            ),
            h('p', { style: { margin: 0, color: _griFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'There is no timeline. There are no stages you must go through in order. There is only the work of letting reality land, feeling what comes, adjusting to a different world, and finding the new place for what you have lost. This tool is a companion for that work.'
            )
          ),

          // Loss types (so students know what counts)
          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _griFg('#fda4af'), marginBottom: 8 } }, '📝 Many things count as loss'),
            h('div', { style: { fontSize: 12, color: _griFg('#94a3b8'), marginBottom: 10, lineHeight: 1.6, fontStyle: 'italic' } }, 'Not all grief comes from death. If your loss is on this list, the work in this tool applies to you.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 } },
              LOSS_TYPES.map(function(lt) {
                return h('div', { key: lt.id, style: { padding: 8, borderRadius: 6, background: _griBg('#1e293b'), borderLeft: '2px solid #fb7185' } },
                  h('div', { style: { fontSize: 12.5, fontWeight: 700, color: _griFg('#e2e8f0'), marginBottom: 2 } }, lt.label),
                  h('div', { style: { fontSize: 11, color: _griFg('#94a3b8'), lineHeight: 1.5 } }, lt.desc)
                );
              })
            )
          ),

          // Dual Process explanation
          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #818cf8', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _griFg('#a5b4fc'), marginBottom: 8 } }, '🌊 You will oscillate. That is normal.'),
            h('p', { style: { margin: 0, color: _griFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'Grief researchers Stroebe and Schut described how grief actually works: people don\'t move in a straight line from "broken" to "healed." They oscillate between LOSS-orientation (sitting with the pain, missing the person) and RESTORATION-orientation (doing daily life, eating, going to school, even laughing). BOTH are part of grief. The oscillation is the work. It is healthy. You are not betraying anyone when you have a good day, and you are not stuck when you have a hard day.'
            )
          ),

          // Roadmap
          stepCard('✍️ Name the loss', 'Optional private space to name what you\'re grieving. Your data stays on this device.', function() { goto('name'); }, '#fb7185'),
          stepCard('🌊 The four tasks', 'Worden\'s tasks: accept reality, process pain, adjust to a changed world, find an enduring connection. Not stages in order; tasks you move between.', function() { goto('tasks'); }, '#0ea5e9'),
          stepCard('✉️ Write a letter', 'A letter to the person, the pet, the place, or to your past self. You don\'t have to send it.', function() { goto('letter'); }, '#a855f7'),
          stepCard('🌿 Rituals', 'Plan anniversary rituals, ongoing ways to stay connected, things you want to do to keep them present.', function() { goto('rituals'); }, '#22c55e'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: _griBg('#0f172a'), cursor: 'pointer', marginBottom: 8, color: _griFg('#e2e8f0') } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _griFg('#94a3b8'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // NAME — describe the loss
      // ═══════════════════════════════════════════════════════════
      function renderName() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', marginBottom: 14, fontSize: 13, color: _griFg('#fecdd3'), lineHeight: 1.65 } },
            h('strong', null, '✍️ Name what you\'re carrying. '),
            'You can name as much or as little as you want. Nothing is shared anywhere. This is just for you to have words for it.'
          ),

          // Type
          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('label', { htmlFor: 'g-type', style: { display: 'block', fontSize: 12, color: _griFg('#fda4af'), fontWeight: 800, marginBottom: 6 } }, 'What kind of loss is this?'),
            h('select', { id: 'g-type', value: d.lossType || '',
              onChange: function(e) { setG({ lossType: e.target.value }); },
              style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _griBg('#1e293b'), color: _griFg('#e2e8f0'), fontSize: 13 } },
              h('option', { value: '' }, '(pick one)'),
              LOSS_TYPES.map(function(lt) { return h('option', { key: lt.id, value: lt.id }, lt.label); })
            )
          ),

          // Who/what
          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('label', { htmlFor: 'g-who', style: { display: 'block', fontSize: 12, color: _griFg('#fda4af'), fontWeight: 800, marginBottom: 6 } }, 'Who or what (a name, a relationship, a place — whatever fits)'),
            h('input', { id: 'g-who', type: 'text', value: d.whoOrWhat || '',
              placeholder: 'e.g. My grandma. My dog Rex. My friend group.',
              onChange: function(e) { setG({ whoOrWhat: e.target.value }); },
              style: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: _griBg('#1e293b'), color: _griFg('#e2e8f0'), fontSize: 14 } })
          ),

          // Description
          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('label', { htmlFor: 'g-desc', style: { display: 'block', fontSize: 12, color: _griFg('#fda4af'), fontWeight: 800, marginBottom: 6 } }, 'What happened?'),
            h('div', { style: { fontSize: 11, color: _griFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'In your own words. As much or as little as feels okay right now.'),
            h('textarea', { id: 'g-desc', value: d.loss || '',
              placeholder: '',
              onChange: function(e) { setG({ loss: e.target.value }); },
              style: { width: '100%', minHeight: 140, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _griBg('#1e293b'), color: _griFg('#e2e8f0'), fontSize: 14, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('tasks'); }, 'aria-label': 'Continue to the four tasks',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: _griFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '→ Continue to the four tasks')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TASKS — Worden's 4 tasks of mourning
      // ═══════════════════════════════════════════════════════════
      function renderTasks() {
        var activeTaskId = d.currentTask || TASKS[0].id;
        var active = TASKS.find(function(t) { return t.id === activeTaskId; }) || TASKS[0];

        function setTaskNotes(taskId, val) {
          var n = Object.assign({}, (d.taskNotes || {}));
          n[taskId] = val;
          setG({ taskNotes: n });
        }

        return h('div', null,
          safetyBanner(),

          // Task selector (4 cards)
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            TASKS.map(function(t) {
              var isActive = t.id === activeTaskId;
              var hasNotes = (d.taskNotes || {})[t.id];
              return h('button', { key: t.id,
                onClick: function() { setG({ currentTask: t.id }); },
                'aria-label': 'Task ' + t.number + ': ' + t.label, 'aria-pressed': isActive,
                style: { textAlign: 'left', padding: 10, borderRadius: 8, border: '2px solid ' + (isActive ? t.color : '#334155'), background: isActive ? t.color + '22' : '#0f172a', cursor: 'pointer', color: _griFg('#e2e8f0') } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                  h('span', { style: { fontSize: 16 } }, t.icon),
                  h('span', { style: { fontSize: 10, color: t.color, fontWeight: 800 } }, 'Task ' + t.number),
                  hasNotes ? h('span', { style: { marginLeft: 'auto', fontSize: 10, color: t.color } }, '✓') : null
                ),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: isActive ? t.color : _griFg('#cbd5e1'), marginTop: 4, lineHeight: 1.4 } }, t.label)
              );
            })
          ),

          // Active task card
          h('div', { style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, ' + active.color + '14 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid ' + active.color + '66', borderLeft: '4px solid ' + active.color, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 36 } }, active.icon),
              h('div', null,
                h('div', { style: { fontSize: 10, color: _griFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Task ' + active.number + ' of 4'),
                h('h3', { style: { margin: '2px 0 0', color: active.color, fontSize: 19, fontWeight: 900 } }, active.label)
              )
            ),
            h('p', { style: { margin: '0 0 14px', color: _griFg('#e2e8f0'), fontSize: 14, lineHeight: 1.75 } }, active.blurb),

            // Prompts
            h('div', { style: { padding: 12, borderRadius: 8, background: _griBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: active.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Reflection prompts'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _griFg('#cbd5e1'), fontSize: 13, lineHeight: 1.8, fontStyle: 'italic' } },
                active.prompts.map(function(p, i) { return h('li', { key: i, style: { marginBottom: 4 } }, p); })
              )
            ),

            // What helps / what hurts
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 12 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' } },
                h('div', { style: { fontSize: 11, color: _griFg('#bbf7d0'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✓ Helps'),
                h('p', { style: { margin: 0, color: _griFg('#dcfce7'), fontSize: 12.5, lineHeight: 1.65 } }, active.whatHelps)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' } },
                h('div', { style: { fontSize: 11, color: _griFg('#fecaca'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✕ Hurts more than it helps'),
                h('p', { style: { margin: 0, color: _griFg('#fee2e2'), fontSize: 12.5, lineHeight: 1.65 } }, active.whatHurts)
              )
            ),

            // Notes
            h('label', { htmlFor: 'g-task-' + active.id, style: { display: 'block', fontSize: 12, color: _griFg('#cbd5e1'), fontWeight: 700, marginBottom: 6 } }, 'Your reflection (optional)'),
            h('textarea', { id: 'g-task-' + active.id, value: (d.taskNotes || {})[active.id] || '',
              placeholder: 'Whatever is on this task right now. You can come back.',
              onChange: function(e) { setTaskNotes(active.id, e.target.value); },
              style: { width: '100%', minHeight: 110, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _griBg('#1e293b'), color: _griFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)', borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', fontSize: 13, color: _griFg('#c7d2fe'), lineHeight: 1.7 } },
            h('strong', null, '🌊 Remember: '),
            'these are TASKS, not STAGES. You move between them, not through them in order. Today might be heavy on Task 2 (the pain) and weeks from now might be more about Task 4 (connection). Both are real.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // LETTER — write a letter
      // ═══════════════════════════════════════════════════════════
      function renderLetter() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: _griFg('#e9d5ff'), lineHeight: 1.7 } },
            h('strong', null, '✉️ Writing a letter you don\'t have to send. '),
            'This is a long-standing grief practice. You can write to the person who died, the pet, the place, the friendship — or to your past self before the loss. Say what you didn\'t get to say. Say what you wish you had said. Say what you would say now. Or just say what is on your mind. No rules.'
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: _griBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _griFg('#94a3b8'), marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' } },
              'Some openings if you don\'t know how to start:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _griFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } },
              h('li', null, '"There\'s something I never told you..."'),
              h('li', null, '"I wish you could see this..."'),
              h('li', null, '"I\'m angry at you for..."'),
              h('li', null, '"I miss you most when..."'),
              h('li', null, '"Here\'s what I\'m carrying that you would understand..."'),
              h('li', null, '"To the version of me from before..."')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7' } },
            h('label', { htmlFor: 'g-letter', style: { display: 'block', fontSize: 12, color: _griFg('#c4b5fd'), fontWeight: 800, marginBottom: 6 } }, 'Your letter'),
            h('textarea', { id: 'g-letter', value: d.letter || '',
              placeholder: 'Dear...',
              onChange: function(e) { setG({ letter: e.target.value }); },
              style: { width: '100%', minHeight: 280, padding: 12, borderRadius: 6, border: '1px solid #334155', background: _griBg('#1e293b'), color: _griFg('#e2e8f0'), fontSize: 14, fontFamily: 'inherit', lineHeight: 1.85, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RITUALS
      // ═══════════════════════════════════════════════════════════
      function renderRituals() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: _griFg('#bbf7d0'), lineHeight: 1.7 } },
            h('strong', null, '🌿 Rituals are how love keeps a place. '),
            'Cultures across human history have developed rituals around loss because they work: they give grief a CONTAINER, so it doesn\'t have to be carried as raw weight all the time. A ritual can be elaborate or it can be a candle on the windowsill once a year. What matters is that you choose it on purpose.'
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: _griBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _griFg('#94a3b8'), marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' } },
              'Some ideas for rituals (pick what fits, ignore the rest):'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _griFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.85 } },
              h('li', null, 'Visit a grave, the ocean, a place that mattered, on a specific date each year.'),
              h('li', null, 'Cook their favorite meal on their birthday.'),
              h('li', null, 'Light a candle on the anniversary, or every Sunday, or any time you need to.'),
              h('li', null, 'Wear something of theirs (a ring, a jacket, a piece of jewelry).'),
              h('li', null, 'Donate or volunteer in their name annually.'),
              h('li', null, 'Tell a specific story about them to a specific person who didn\'t know them.'),
              h('li', null, 'Have a meal with people who also miss them.'),
              h('li', null, 'Write them a letter every year on the anniversary.'),
              h('li', null, 'Plant something, name something, build something, in their memory.'),
              h('li', null, 'Do a thing they always wanted to do but didn\'t get to.')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _griBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e' } },
            h('label', { htmlFor: 'g-rituals', style: { display: 'block', fontSize: 12, color: _griFg('#bbf7d0'), fontWeight: 800, marginBottom: 6 } }, 'My ritual plan'),
            h('div', { style: { fontSize: 11, color: _griFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'What rituals do you want to keep, build, or invent? What dates matter? What objects? What places?'),
            h('textarea', { id: 'g-rituals', value: d.ritualPlan || '',
              placeholder: 'Once a year on...   On their birthday I want to...   I want to carry...',
              onChange: function(e) { setG({ ritualPlan: e.target.value }); },
              style: { width: '100%', minHeight: 180, padding: 12, borderRadius: 6, border: '1px solid #334155', background: _griBg('#1e293b'), color: _griFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _griFg('#fecdd3'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'This is your private work. Print only if you want a paper copy; nothing is shared anywhere.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: _griFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: _griBg('#1e293b'), color: _griFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'grief-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _griBg('#fff'), color: _griFg('#0f172a'), borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#grief-print-region, #grief-print-region * { visibility: visible !important; } ' +
              '#grief-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #be123c' } },
              h('div', { style: { fontSize: 10, color: _griFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Grief & Loss Companion'),
              h('h1', { style: { margin: 0, fontSize: 24, fontWeight: 900 } }, d.whoOrWhat ? 'For ' + d.whoOrWhat : 'My grief work'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _griFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            d.loss ? h('div', { style: { marginBottom: 16, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 11, color: _griFg('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'What happened'),
              h('p', { style: { margin: 0, color: _griFg('#0f172a'), fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, d.loss)
            ) : null,

            // Tasks
            TASKS.map(function(t) {
              var notes = (d.taskNotes || {})[t.id];
              if (!notes || !notes.trim()) return null;
              return h('div', { key: t.id, style: { marginBottom: 14, pageBreakInside: 'avoid' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, marginBottom: 6, background: t.color, color: _griFg('#fff') } },
                  h('span', { style: { fontSize: 16 } }, t.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Task ' + t.number + ': ' + t.label)
                ),
                h('p', { style: { margin: '0 8px', color: _griFg('#0f172a'), fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, notes)
              );
            }),

            d.letter ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 11, color: _griFg('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'My letter'),
              h('p', { style: { margin: 0, color: _griFg('#0f172a'), fontSize: 13, lineHeight: 1.85, whiteSpace: 'pre-wrap', padding: 10, background: _griBg('#fdf2f8'), borderLeft: '3px solid #be123c' } }, d.letter)
            ) : null,

            d.ritualPlan ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 11, color: _griFg('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'Rituals'),
              h('p', { style: { margin: 0, color: _griFg('#0f172a'), fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, d.ritualPlan)
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _griFg('#94a3b8'), textAlign: 'center', lineHeight: 1.5 } },
              'Worden\'s Tasks of Mourning (2018, 4th ed.). Dual Process Model: Stroebe and Schut (1999). ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('griefLoss', h, ctx) : null),

          // Strong safety frame first
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: _griFg('#fca5a5'), fontSize: 16 } }, '🆘 Read this first'),
            h('p', { style: { margin: '0 0 8px', color: _griFg('#fecaca'), fontSize: 13.5, lineHeight: 1.7 } },
              'Grief is a normal response to loss. It is not a mental illness. BUT — sometimes grief gets complicated and crosses into territory that needs a professional:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _griFg('#fecaca'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Thoughts of wanting to die or join the deceased.'),
              h('li', null, 'Inability to function (going to school, eating, sleeping) for weeks.'),
              h('li', null, 'Heavy substance use as the main coping.'),
              h('li', null, 'Persistent guilt that you somehow caused the loss.'),
              h('li', null, 'Disturbing intrusive memories that won\'t stop (signs of trauma layered on grief).'),
              h('li', null, 'Continued severe impairment more than 12 months later (what is now called Prolonged Grief Disorder).')
            ),
            h('p', { style: { margin: '8px 0 0', color: _griFg('#fecaca'), fontSize: 13.5, lineHeight: 1.7 } },
              'For any of these, please get clinical support. Call 988 (Suicide and Crisis Lifeline) or text HOME to 741741 for immediate crisis. For ongoing support, a school psych, counselor, or grief-trained therapist is the right next step.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _griBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _griFg('#fda4af'), fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: _griFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'A structured companion for grief work — a private space to name what was lost, work through the four tasks of mourning, write a letter, and plan rituals. It works for many kinds of loss: death of a person or pet, family transitions, friendship loss, identity loss, ambiguous loss.'
            ),
            h('p', { style: { margin: 0, color: _griFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'It is not a substitute for human company in grief, and it is not therapy. The work of grief is relational, and tools alone do not do it. The tool is here for the moments between conversations, and to give the work some shape.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _griBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _griFg('#fda4af'), fontSize: 16 } }, 'Where the framework comes from'),
            h('p', { style: { margin: '0 0 10px', color: _griFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The Four Tasks of Mourning are from J. William Worden\'s "Grief Counseling and Grief Therapy" (1991, now in its 5th edition 2018). Worden\'s framework replaced the "five stages of grief" (Kübler-Ross) as the dominant clinical model because the tasks language better describes what people actually do in grief: they DO the work, in any order, sometimes multiple times. The stages model is widely misunderstood and has limited clinical utility for grief itself (Kübler-Ross developed it for dying patients, not bereaved survivors).'
            ),
            h('p', { style: { margin: 0, color: _griFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The Dual Process Model is from Margaret Stroebe and Henk Schut (1999) — the empirical finding that grievers oscillate between loss-orientation and restoration-orientation, and that BOTH are necessary. The framework of ambiguous loss is Pauline Boss\'s (1999) — naming loss without closure as a distinct kind of loss with its own dynamics.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _griBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _griFg('#fda4af'), fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Worden, J. W. (2018)', 'Grief Counseling and Grief Therapy: A Handbook for the Mental Health Practitioner (5th ed.), Springer', 'The foundational text. Includes the four tasks framework and clinical guidance.', null),
            sourceCard('Stroebe, M. and Schut, H. (1999)', '"The Dual Process Model of Coping with Bereavement," Death Studies, 23(3), 197-224', 'The empirical paper on grief oscillation.', null),
            sourceCard('Boss, P. (1999)', 'Ambiguous Loss: Learning to Live with Unresolved Grief, Harvard University Press', 'The foundational framework for losses without closure.', null),
            sourceCard('Dougy Center for Grieving Children', 'dougy.org', 'National Center for Grieving Children & Families. Free resources for adolescent and child grief.', 'https://www.dougy.org/'),
            sourceCard('National Alliance for Children\'s Grief', 'childrengrieve.org', 'Resource directory and educational materials for grief support for youth.', 'https://childrengrieve.org/'),
            sourceCard('Worden, J. W. (2018)', 'Children and Grief: When a Parent Dies, Guilford Press', 'Worden\'s adaptation of the tasks for children and adolescents.', null),
            sourceCard('American Psychological Association', 'Prolonged Grief Disorder', 'APA position on persistent grief that may warrant clinical attention.', 'https://www.apa.org/topics/grief')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _griFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _griFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A tool cannot grieve with you. Human company is the core of grief work. Use this tool alongside people, not instead of them.'),
              h('li', null, 'Grief is culturally specific. Different traditions have different timelines, rituals, beliefs about the afterlife, and conventions about expression. This tool draws mostly on Western clinical literature; it should be paired with the practices of your own culture, faith, or family.'),
              h('li', null, 'Pet loss, friendship loss, and ambiguous loss are often minimized by others ("it\'s just a dog," "you\'ll make new friends"). The grief is real even when the loss is dismissed. The tool intentionally includes these.'),
              h('li', null, 'For students who experienced a traumatic loss (suicide, homicide, accident witnessed), the grief is often layered with trauma. Grief work and trauma work are different; trauma-informed grief therapy is the right approach. A clinician matters.'),
              h('li', null, 'Some loss is structural (a child of a deported parent, a child whose community is gentrified, a young person whose climate future has been stolen). These losses are real and the grief is legitimate; AND the structural cause matters and is its own work.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: _griFg('#fecdd3'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'After a death in the school community, do not assume "everyone is fine." Make space for grief in Crew (see the Heavy News Day protocol in Crew Protocols). Use this tool with students individually after offering it. Do not require it. Be especially attentive to students whose grief is being minimized (a friend rather than a family member, a same-sex partner, a beloved pet). For children whose parent has died, work with the Dougy Center model: peer grief groups, sustained contact, integration into school not isolation from it.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _griBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _griFg('#fda4af'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _griFg('#fecdd3'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _griFg('#fecdd3'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _griFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'name') body = renderName();
      else if (view === 'tasks') body = renderTasks();
      else if (view === 'letter') body = renderLetter();
      else if (view === 'rituals') body = renderRituals();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Grief and Loss Companion' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
