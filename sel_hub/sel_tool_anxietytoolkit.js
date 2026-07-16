// ═══════════════════════════════════════════════════════════════
// sel_tool_anxietytoolkit.js — Anxiety Toolkit
// CBT-based anxiety self-help: psychoeducation (what anxiety
// actually is vs. what it feels like), the worry tree (productive
// vs unproductive worry), scheduled worry time, decatastrophizing,
// grounding skills, and a self-inventory of personal anxiety
// patterns.
// Sources: Beck Institute, AACAP, Anxiety and Depression
// Association of America (ADAA), NICE adolescent anxiety guidance.
// Registered tool ID: "anxietyToolkit"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('anxietyToolkit'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-anxiety')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-anxiety';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  function defaultState() {
    return {
      view: 'triage',
      // Triage gate
      skippedTriage: false,        // remembered: returning users skip the gate
      triageSuicidal: null,        // 'yes' | 'no' | 'prefer-not'
      triageIntensity: 5,          // 1-10 slider
      triageBasicNeeds: null,      // 'yes' | 'somewhat' | 'no'
      // Worry tree state
      worryItem: '',
      worryActionable: null,    // true/false
      worryAction: '',
      worryLetGoNotes: '',
      // Worry time
      parkedWorries: [],        // [{text, date}]
      worryTimeStart: '17:00',  // default 5pm
      worryTimeMinutes: 20,
      // Decatastrophizing
      catastrophe: '',
      worstCase: '',
      bestCase: '',
      mostLikely: '',
      copingPlan: '',
      // Personal patterns
      myTriggers: [],
      myBodySigns: [],
      mySigsThoughts: [],
      myWhatHelps: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // ── Extended Anxiety Content Library ──

  var ANXIETY_DEEP_NARRATIVES_76 = [
    {
      id: 'adn76_1',
      title: 'My final anxiety lesson: recovery is real',
      narrative: [
        'I lived with anxiety from age 7.',
        '',
        'Twenty years of severe daily anxiety.',
        '',
        'Tried everything.',
        '',
        'Medication.',
        '',
        'Therapy.',
        '',
        'Exercise.',
        '',
        'Meditation.',
        '',
        'Sleep hygiene.',
        '',
        'Nutrition.',
        '',
        'Community.',
        '',
        'Faith practice.',
        '',
        'No single intervention worked alone.',
        '',
        'But together, over years, they transformed my life.',
        '',
        'Recovery is real.',
        '',
        'I tell suffering anxiety patients: keep going. It takes years but transformation is real.'
      ],
      lesson: 'Anxiety recovery requires stacked interventions over years; transformation is real.'
    },
    {
      id: 'adn76_2',
      title: 'My lifelong anxiety journey',
      narrative: [
        'Anxious my whole life.',
        '',
        'Lifelong journey of management.',
        '',
        'Not a destination of cure.',
        '',
        'A practice of returning.',
        '',
        'Each day choices.',
        '',
        'Each week practices.',
        '',
        'Each year refinement.',
        '',
        'Decades of small commitments.',
        '',
        'I tell new anxiety patients: this is journey not destination.'
      ],
      lesson: 'Anxiety is lifelong journey of practice and return, not destination of cure.'
    },
    {
      id: 'adn76_3',
      title: 'My anxiety taught me wisdom',
      narrative: [
        'I would not wish anxiety on anyone.',
        '',
        'But it taught me wisdom.',
        '',
        'I understand suffering.',
        '',
        'I understand vulnerability.',
        '',
        'I understand human limits.',
        '',
        'I help others now.',
        '',
        'Anxiety made me human in ways comfort never could.',
        '',
        'I tell sufferers: your anxiety holds wisdom even as you treat it.'
      ],
      lesson: 'Anxiety can teach wisdom about suffering and limits worth holding even during treatment.'
    },
    {
      id: 'adn76_4',
      title: 'My recovery community matters',
      narrative: [
        'Anxiety recovery community.',
        '',
        'Strangers who understood.',
        '',
        'They saved me.',
        '',
        'I save them.',
        '',
        'Recovery is collective.',
        '',
        'I tell newly diagnosed: find your community fast.'
      ],
      lesson: 'Anxiety recovery is collective; finding community is essential treatment.'
    },
    {
      id: 'adn76_5',
      title: 'My anxiety today is manageable',
      narrative: [
        'After 30 years of work.',
        '',
        'My anxiety is manageable now.',
        '',
        'It comes and goes.',
        '',
        'Tools work.',
        '',
        'Practice helps.',
        '',
        'Acceptance unlocks.',
        '',
        'Life is good.',
        '',
        'I tell suffering: this is possible.'
      ],
      lesson: 'Decades of work makes severe anxiety manageable; life can be good.'
    },
    {
      id: 'adn76_6',
      title: 'My anxiety informs my work',
      narrative: [
        'Became therapist because of my anxiety.',
        '',
        'Help others through what I lived.',
        '',
        'Wounded healer paradigm.',
        '',
        'My suffering became my service.',
        '',
        'I tell anxious helpers: your wound can be your calling.'
      ],
      lesson: 'Anxiety experience can become professional calling as wounded healer.'
    },
    {
      id: 'adn76_7',
      title: 'My anxiety yielded to time',
      narrative: [
        'Sometimes time itself heals.',
        '',
        'Not without work.',
        '',
        'But with work plus time.',
        '',
        'Patience is treatment.',
        '',
        'I tell quick-fix-seeking: patience is the medicine.'
      ],
      lesson: 'Time plus consistent work heals anxiety; patience is itself treatment.'
    },
    {
      id: 'adn76_8',
      title: 'My anxiety practice continues',
      narrative: [
        'Practice never ends.',
        '',
        'Every day I choose tools.',
        '',
        'Every week I tend to self.',
        '',
        'Every year I refine.',
        '',
        'Anxiety remains but does not rule.',
        '',
        'I tell graduating from acute treatment: practice continues forever.'
      ],
      lesson: 'Anxiety practice continues forever; daily, weekly, yearly tending sustains recovery.'
    },
    {
      id: 'adn76_9',
      title: 'My anxiety story matters',
      narrative: [
        'Anxiety stories save lives.',
        '',
        'Hidden suffering compounds.',
        '',
        'Shared suffering heals.',
        '',
        'Tell your story.',
        '',
        'Listen to stories.',
        '',
        'I tell anxious humans: your story matters.'
      ],
      lesson: 'Anxiety stories shared and heard save lives by breaking hidden suffering.'
    },
    {
      id: 'adn76_10',
      title: 'My anxiety yielded to belonging',
      narrative: [
        'Belonging healed what no tool could.',
        '',
        'Knowing I mattered to someone.',
        '',
        'Knowing someone mattered to me.',
        '',
        'Mutual belonging.',
        '',
        'Anxiety dissolved in love.',
        '',
        'I tell isolated anxious: belonging is treatment-grade.'
      ],
      lesson: 'Mutual belonging is treatment-grade anxiety care that no tool replaces.'
    },
    {
      id: 'adn76_11',
      title: 'My anxiety yielded to purpose',
      narrative: [
        'Purpose larger than self anxiety.',
        '',
        'Service to others.',
        '',
        'Cause beyond me.',
        '',
        'Anxiety became small.',
        '',
        'Purpose became large.',
        '',
        'I tell self-focused anxious: purpose shifts.'
      ],
      lesson: 'Service-driven purpose shifts focus making self-anxiety small relative to cause.'
    },
    {
      id: 'adn76_12',
      title: 'My anxiety yielded to creativity',
      narrative: [
        'Anxiety drove me to create.',
        '',
        'Art, writing, music.',
        '',
        'Creative output.',
        '',
        'Anxiety energy channeled.',
        '',
        'I tell anxious: channel energy into creation.'
      ],
      lesson: 'Anxiety energy can be channeled into creative output reducing internal pressure.'
    },
    {
      id: 'adn76_13',
      title: 'My anxiety yielded to mentorship',
      narrative: [
        'Found mentor at 35.',
        '',
        'Anxiety mentor.',
        '',
        'Older recovered person.',
        '',
        'Modeled what was possible.',
        '',
        'Mentorship saved years.',
        '',
        'I tell stuck anxious: find a mentor who recovered.'
      ],
      lesson: 'Recovered-anxiety mentor models possibility and shortcuts journey years.'
    },
    {
      id: 'adn76_14',
      title: 'My anxiety yielded to teaching',
      narrative: [
        'Started teaching what I learned.',
        '',
        'Anxiety education workshops.',
        '',
        'Teaching strengthened my own practice.',
        '',
        'And helped others.',
        '',
        'I tell recovered: teaching solidifies.'
      ],
      lesson: 'Teaching anxiety management to others solidifies own recovery practice.'
    },
    {
      id: 'adn76_15',
      title: 'My final word on anxiety',
      narrative: [
        'Anxiety is human.',
        '',
        'All humans have some.',
        '',
        'Question is not whether to have anxiety.',
        '',
        'Question is how to relate to it.',
        '',
        'Fight or accept.',
        '',
        'Hide or share.',
        '',
        'Isolate or connect.',
        '',
        'Stuck or grow.',
        '',
        'I choose growth, sharing, connection, acceptance.',
        '',
        'I tell my anxious self: you are not broken. You are human.'
      ],
      lesson: 'Anxiety is universally human; question is relationship to it - acceptance, sharing, connection, growth.'
    }
  ];

  var ANXIETY_FINAL_PRINCIPLES = [
    {
      id: 'afp_1',
      principle: 'Anxiety is a body and brain pattern, not a character flaw.',
      explanation: 'Treat it as condition to manage, not personal failing.'
    },
    {
      id: 'afp_2',
      principle: 'Acceptance shortens anxiety waves; fighting prolongs them.',
      explanation: 'Welcome the wave; do not resist. Wave passes faster.'
    },
    {
      id: 'afp_3',
      principle: 'Movement is medicine for anxiety, not optional lifestyle.',
      explanation: 'Aerobic exercise three to four times weekly is treatment-grade.'
    },
    {
      id: 'afp_4',
      principle: 'Sleep deficits amplify anxiety; protect bedtime fiercely.',
      explanation: 'Nine hours nightly; phone outside bedroom; consistent schedule.'
    },
    {
      id: 'afp_5',
      principle: 'Community engagement reduces anxiety baseline.',
      explanation: 'Three weekly community contacts substantially reduce isolation anxiety.'
    },
    {
      id: 'afp_6',
      principle: 'News and social media cycles hijack anxiety; limit input.',
      explanation: 'Weekly print summary beats daily video; deletion treatment beats moderation.'
    },
    {
      id: 'afp_7',
      principle: 'Body signals precede anxiety peak; learn to read them.',
      explanation: 'Jaw tension, shoulder tightness, shallow breath - catch early.'
    },
    {
      id: 'afp_8',
      principle: 'Boundaries protect mental health; learn to say no.',
      explanation: 'Boundary therapy is real specialty; practice saying no without guilt.'
    },
    {
      id: 'afp_9',
      principle: 'Identity-first relationship to anxiety: it is part not whole.',
      explanation: 'Anxiety can be part of you without defining you.'
    },
    {
      id: 'afp_10',
      principle: 'Asking for help is harder than receiving it; both transform.',
      explanation: 'Hidden suffering compounds; vulnerability invites support.'
    },
    {
      id: 'afp_11',
      principle: 'Consistency over years is the real magic of anxiety treatment.',
      explanation: 'No single tool, no magic bullet; stacked daily practices over years.'
    },
    {
      id: 'afp_12',
      principle: 'Anxiety can spark real awareness leading to professional care.',
      explanation: 'TikTok can spark, professional diagnosis closes the loop.'
    },
    {
      id: 'afp_13',
      principle: 'Medication is tool not failure; combine with therapy when needed.',
      explanation: 'Medication-resistance to medication is itself worth examining.'
    },
    {
      id: 'afp_14',
      principle: 'Trauma roots often underlie treatment-resistant anxiety.',
      explanation: 'EMDR and trauma therapy specialty exist for past wounds.'
    },
    {
      id: 'afp_15',
      principle: 'Anxiety responds to specific evidence-based treatments.',
      explanation: 'CBT, exposure therapy, mindfulness, medication - all proven.'
    },
    {
      id: 'afp_16',
      principle: 'Hobbies that engage hands and absorb mind are real anxiety treatment.',
      explanation: 'Pottery, woodworking, knitting, sketching - sustained flow states.'
    },
    {
      id: 'afp_17',
      principle: 'Nature and outdoor time reduce baseline anxiety.',
      explanation: 'Forest bathing, garden time, sky watching - research-backed.'
    },
    {
      id: 'afp_18',
      principle: 'Faith communities and spiritual practice can be treatment-grade.',
      explanation: 'For those drawn to it, weekly practice plus community treats anxiety.'
    },
    {
      id: 'afp_19',
      principle: 'Anxiety is treatable at any age; never too late.',
      explanation: 'Late-life anxiety has specialty treatments; recovery exists.'
    },
    {
      id: 'afp_20',
      principle: 'Building tolerance for uncertainty is the lifelong skill.',
      explanation: 'Living with not-knowing reduces anxiety more than resolving it.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_71 = [
    {
      id: 'adn71_1',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation daily.',
        '',
        '20 min cushion.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistency-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transform anxiety baseline.'
    },
    {
      id: 'adn71_2',
      title: 'My anxiety triggered by my own boredom',
      narrative: [
        'Boredom triggered me.',
        '',
        'Sit with boredom practice.',
        '',
        'Tolerance built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boredom-anxious: tolerance practice.'
      ],
      lesson: 'Sitting-with-boredom practice builds tolerance reducing boredom anxiety.'
    },
    {
      id: 'adn71_3',
      title: 'My anxiety yielded to weekly farmers market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh produce neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: market is community.'
      ],
      lesson: 'Weekly farmers market anchors week with produce and neighbor community.'
    },
    {
      id: 'adn71_4',
      title: 'My anxiety with my own retirement',
      narrative: [
        'Retirement identity crisis.',
        '',
        'Retirement therapy.',
        '',
        'New identity built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell newly retired: identity therapy.'
      ],
      lesson: 'Retirement identity therapy builds new self slowly reducing transition anxiety.'
    },
    {
      id: 'adn71_5',
      title: 'My anxiety yielded to dawn light',
      narrative: [
        'Dawn light viewing daily.',
        '',
        'East-facing porch.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell circadian-disrupted: dawn light.'
      ],
      lesson: 'Daily dawn light viewing aligns circadian rhythm reducing anxiety.'
    },
    {
      id: 'adn71_6',
      title: 'My anxiety triggered by my own anger',
      narrative: [
        'Anger triggered anxiety.',
        '',
        'Therapy on anger as signal.',
        '',
        'Anger befriended.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: anger as signal.'
      ],
      lesson: 'Befriending anger as signal rather than enemy reduces anger-driven anxiety.'
    },
    {
      id: 'adn71_7',
      title: 'My anxiety yielded to monthly book swap',
      narrative: [
        'Monthly book swap with friends.',
        '',
        'Books exchanged plus stories.',
        '',
        'Connection ritualized.',
        '',
        'I tell readers: book swap ritual.'
      ],
      lesson: 'Monthly book swap rituals connect readers through exchange and stories.'
    },
    {
      id: 'adn71_8',
      title: 'My anxiety with my own decisions',
      narrative: [
        'Decision paralysis triggered me.',
        '',
        'Decision therapy.',
        '',
        'Tools for choosing.',
        '',
        'Anxiety reduced.',
        '',
        'I tell paralyzed: decision therapy.'
      ],
      lesson: 'Decision therapy provides specific tools for choosing reducing paralysis anxiety.'
    },
    {
      id: 'adn71_9',
      title: 'My anxiety yielded to evening yoga',
      narrative: [
        'Restorative evening yoga.',
        '',
        'Body opened.',
        '',
        'Day softened.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: evening yoga.'
      ],
      lesson: 'Evening restorative yoga opens body for sleep reducing pre-sleep anxiety.'
    },
    {
      id: 'adn71_10',
      title: 'My anxiety triggered by my own success',
      narrative: [
        'Success triggered fear of loss.',
        '',
        'Success acceptance therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: acceptance therapy.'
      ],
      lesson: 'Success acceptance therapy reduces fear-of-loss anxiety after achievement.'
    },
    {
      id: 'adn71_11',
      title: 'My anxiety yielded to monthly potluck',
      narrative: [
        'Monthly potluck friends.',
        '',
        'Food plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: monthly potluck.'
      ],
      lesson: 'Monthly friend potlucks combine food and community for anxiety relief.'
    },
    {
      id: 'adn71_12',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered anxiety.',
        '',
        'Couples therapy years.',
        '',
        'Patterns shifted.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: years therapy.'
      ],
      lesson: 'Years of couples therapy shifts marriage patterns reducing relationship anxiety.'
    },
    {
      id: 'adn71_13',
      title: 'My anxiety yielded to seasonal cleaning',
      narrative: [
        'Seasonal cleaning rituals.',
        '',
        'Spring summer fall winter.',
        '',
        'Home rotated.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-stuck: seasonal cleaning.'
      ],
      lesson: 'Seasonal cleaning rituals rotate home reducing stagnation anxiety.'
    },
    {
      id: 'adn71_14',
      title: 'My anxiety triggered by my own success metrics',
      narrative: [
        'Tracking metrics triggered me.',
        '',
        'Released measurements.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell metric-tracking: release treatment.'
      ],
      lesson: 'Releasing metrics for process focus reduces measurement anxiety.'
    },
    {
      id: 'adn71_15',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day reviewed.',
        '',
        'Surrender ritual.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer.'
      ],
      lesson: 'Evening prayer practice surrenders day for pre-sleep anxiety reduction.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_72 = [
    {
      id: 'adn72_1',
      title: 'My anxiety yielded to gardening journal',
      narrative: [
        'Daily garden journal.',
        '',
        'Plant observations.',
        '',
        'Year-over-year patterns.',
        '',
        'Anxiety dropped.',
        '',
        'I tell gardeners: journal practice.'
      ],
      lesson: 'Daily garden journals build year-over-year pattern awareness reducing anxiety.'
    },
    {
      id: 'adn72_2',
      title: 'My anxiety triggered by my own forgetting',
      narrative: [
        'Forgetting triggered me.',
        '',
        'Memory tools.',
        '',
        'Plus aging acceptance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell forgetting-anxious: tools plus acceptance.'
      ],
      lesson: 'Memory tools plus aging acceptance reduce forgetting-triggered anxiety.'
    },
    {
      id: 'adn72_3',
      title: 'My anxiety yielded to morning coffee porch',
      narrative: [
        'Morning coffee porch ritual.',
        '',
        'Outside all weather.',
        '',
        'Body weather aware.',
        '',
        'I tell home-bound: outdoor morning.'
      ],
      lesson: 'All-weather outdoor morning coffee builds weather awareness for anxiety relief.'
    },
    {
      id: 'adn72_4',
      title: 'My anxiety with my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum approach.',
        '',
        'Phone computer essentials.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum.'
      ],
      lesson: 'Tech minimum approach with essential-only devices reduces tech anxiety.'
    },
    {
      id: 'adn72_5',
      title: 'My anxiety yielded to weekly market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh food neighbors.',
        '',
        'Anchor of week.',
        '',
        'I tell market-curious: weekly ritual.'
      ],
      lesson: 'Weekly Saturday farmers market provides fresh food and neighbor anchor.'
    },
    {
      id: 'adn72_6',
      title: 'My anxiety triggered by my own time pressure',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Built buffer time everywhere.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell pressed-time: buffer treatment.'
      ],
      lesson: 'Building buffer time everywhere substantially reduces time pressure anxiety.'
    },
    {
      id: 'adn72_7',
      title: 'My anxiety yielded to woodland sit',
      narrative: [
        'Weekly woodland sit.',
        '',
        'Same spot.',
        '',
        'Patient observation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: same spot.'
      ],
      lesson: 'Weekly same-spot woodland sits train patient observation reducing anxiety.'
    },
    {
      id: 'adn72_8',
      title: 'My anxiety with my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Released goals entirely.',
        '',
        'Process-only living.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-pressured: release.'
      ],
      lesson: 'Releasing goals entirely for process-only living reduces goal anxiety.'
    },
    {
      id: 'adn72_9',
      title: 'My anxiety yielded to bath ritual',
      narrative: [
        'Bath ritual twice weekly.',
        '',
        'Salts oils candles.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: bath ritual.'
      ],
      lesson: 'Twice-weekly bath rituals with salts oils candles soften body for anxiety.'
    },
    {
      id: 'adn72_10',
      title: 'My anxiety triggered by my own children',
      narrative: [
        'Worry about kids constant.',
        '',
        'Parent therapy.',
        '',
        'Tolerating uncertainty.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty therapy.'
      ],
      lesson: 'Parent therapy on tolerating child uncertainty reduces parental anxiety.'
    },
    {
      id: 'adn72_11',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Evening tea ritual.',
        '',
        'Chamomile or lavender.',
        '',
        'Sleep prep.',
        '',
        'Anxiety eased.',
        '',
        'I tell pre-sleep: tea ritual.'
      ],
      lesson: 'Evening herbal tea ritual prepares sleep through warmth.'
    },
    {
      id: 'adn72_12',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Sabbatical taken.',
        '',
        'Returned with boundaries.',
        '',
        'Anxiety reduced.',
        '',
        'I tell work-anxious: sabbatical.'
      ],
      lesson: 'Sabbatical followed by boundary-protected return reduces work anxiety.'
    },
    {
      id: 'adn72_13',
      title: 'My anxiety yielded to morning bird watching',
      narrative: [
        'Morning bird watching daily.',
        '',
        'Window with feeder.',
        '',
        'Patient observation.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell observation-curious: bird ritual.'
      ],
      lesson: 'Morning bird watching at window feeder reduces baseline anxiety.'
    },
    {
      id: 'adn72_14',
      title: 'My anxiety triggered by my own clothes',
      narrative: [
        'Clothing triggered me.',
        '',
        'Capsule wardrobe.',
        '',
        'Daily decision removed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: capsule.'
      ],
      lesson: 'Capsule wardrobe removes daily clothing decision reducing decision anxiety.'
    },
    {
      id: 'adn72_15',
      title: 'My anxiety yielded to early sleep',
      narrative: [
        '9pm bedtime hard.',
        '',
        '6am wake.',
        '',
        '9 hours daily.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: 9 hours treatment.'
      ],
      lesson: 'Nine hours nightly sleep substantially reduces sleep-deficient anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_73 = [
    {
      id: 'adn73_1',
      title: 'My anxiety yielded to morning sun',
      narrative: [
        'Outside in morning sun.',
        '',
        '10 min daily.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: morning sun.'
      ],
      lesson: 'Ten minutes daily morning sun aligns circadian rhythm reducing anxiety.'
    },
    {
      id: 'adn73_2',
      title: 'My anxiety triggered by my own past',
      narrative: [
        'Past triggered me.',
        '',
        'Memory integration therapy.',
        '',
        'Past befriended.',
        '',
        'Anxiety reduced.',
        '',
        'I tell past-stricken: integration therapy.'
      ],
      lesson: 'Memory integration therapy befriends past reducing past-trigger anxiety.'
    },
    {
      id: 'adn73_3',
      title: 'My anxiety yielded to slow living',
      narrative: [
        'Slow living philosophy.',
        '',
        'Less doing more being.',
        '',
        'Pace reduced.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell pace-frantic: slow living.'
      ],
      lesson: 'Slow living philosophy with less doing more being substantially reduces pace anxiety.'
    },
    {
      id: 'adn73_4',
      title: 'My anxiety with my own self-talk',
      narrative: [
        'Inner critic triggered me.',
        '',
        'Self-compassion therapy.',
        '',
        'Inner voice softened.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-critical: self-compassion.'
      ],
      lesson: 'Self-compassion therapy softens inner critic reducing self-talk anxiety.'
    },
    {
      id: 'adn73_5',
      title: 'My anxiety yielded to ocean visits',
      narrative: [
        'Monthly ocean visits.',
        '',
        'Sound of waves.',
        '',
        'Vastness perspective.',
        '',
        'Anxiety dropped.',
        '',
        'I tell stuck-inland: ocean monthly.'
      ],
      lesson: 'Monthly ocean visits provide wave sound and vastness for inland anxiety relief.'
    },
    {
      id: 'adn73_6',
      title: 'My anxiety triggered by my own social media',
      narrative: [
        'Platforms triggered me.',
        '',
        'Quit all platforms.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-anxious: quit treatment.'
      ],
      lesson: 'Quitting all social media platforms substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn73_7',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly friend potluck.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'I tell isolated: potluck ritual.'
      ],
      lesson: 'Weekly friend potluck rituals anchor week with food and community.'
    },
    {
      id: 'adn73_8',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative pressure triggered me.',
        '',
        'Play over performance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell creative-pressured: play.'
      ],
      lesson: 'Play-over-performance reframe reduces creative pressure anxiety.'
    },
    {
      id: 'adn73_9',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation 20 min.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistency-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transform anxiety baseline.'
    },
    {
      id: 'adn73_10',
      title: 'My anxiety triggered by my own ambition',
      narrative: [
        'Ambition triggered me.',
        '',
        'Ambition right-sized.',
        '',
        'Enough is enough.',
        '',
        'Anxiety dropped.',
        '',
        'I tell ambitious-anxious: right-sizing.'
      ],
      lesson: 'Right-sizing ambition to enough reduces ambition-driven anxiety.'
    },
    {
      id: 'adn73_11',
      title: 'My anxiety yielded to library volunteering',
      narrative: [
        'Library volunteer weekly.',
        '',
        'Quiet service.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell quiet-volunteer-curious: library.'
      ],
      lesson: 'Weekly library volunteering provides quiet service plus community for anxiety.'
    },
    {
      id: 'adn73_12',
      title: 'My anxiety with my own pace',
      narrative: [
        'Pace comparison triggered me.',
        '',
        'Own pace honored.',
        '',
        'Comparison released.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pace-comparing: honor own pace.'
      ],
      lesson: 'Honoring own pace and releasing comparison reduces pace anxiety.'
    },
    {
      id: 'adn73_13',
      title: 'My anxiety yielded to evening walk together',
      narrative: [
        'Daily evening walk with partner.',
        '',
        'No phones.',
        '',
        '30 min connection.',
        '',
        'Anxiety dropped.',
        '',
        'I tell partnered: evening walk ritual.'
      ],
      lesson: 'Daily phone-free evening walks with partner anchor connection for anxiety.'
    },
    {
      id: 'adn73_14',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Present focus practice.',
        '',
        'Today only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today only practice.'
      ],
      lesson: 'Today-only present focus practice reduces future-projection anxiety.'
    },
    {
      id: 'adn73_15',
      title: 'My anxiety yielded to monthly silent retreat',
      narrative: [
        'Monthly silent retreat day.',
        '',
        'Phone off.',
        '',
        'No words.',
        '',
        'Nervous system reset.',
        '',
        'I tell stressed-busy: monthly silent day.'
      ],
      lesson: 'Monthly silent retreat days with phone off reset nervous system for busy stressed.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_74 = [
    {
      id: 'adn74_1',
      title: 'My anxiety yielded to running club',
      narrative: [
        'Weekly running club.',
        '',
        'Body engaged.',
        '',
        'Community formed.',
        '',
        'Race training together.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: running clubs.'
      ],
      lesson: 'Weekly running clubs provide body engagement plus community for anxiety.'
    },
    {
      id: 'adn74_2',
      title: 'My anxiety triggered by my own quiet',
      narrative: [
        'Silence triggered me.',
        '',
        'Background music constant.',
        '',
        'Eased me to silence gradually.',
        '',
        'Anxiety reduced.',
        '',
        'I tell silence-anxious: gradual exposure.'
      ],
      lesson: 'Silence anxiety eases through gradual exposure with background sound bridge.'
    },
    {
      id: 'adn74_3',
      title: 'My anxiety yielded to bird identification',
      narrative: [
        'Bird ID hobby daily.',
        '',
        'Outdoor observation.',
        '',
        'Patient practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: bird ID daily.'
      ],
      lesson: 'Daily bird identification practices patient outdoor observation for anxiety.'
    },
    {
      id: 'adn74_4',
      title: 'My anxiety with my own work hours',
      narrative: [
        'Work hours triggered me.',
        '',
        'Strict 8 hour boundary.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell overworking: strict hours treatment.'
      ],
      lesson: 'Strict 8-hour work boundary substantially reduces overwork anxiety.'
    },
    {
      id: 'adn74_5',
      title: 'My anxiety yielded to journaling pages',
      narrative: [
        '3 morning pages daily.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell journaling-curious: morning pages.'
      ],
      lesson: 'Daily three morning pages consistent over years reduces anxiety baseline.'
    },
    {
      id: 'adn74_6',
      title: 'My anxiety triggered by my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist: good enough treatment.'
      ],
      lesson: 'Good-enough practice reduces perfectionism-driven anxiety.'
    },
    {
      id: 'adn74_7',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly weekend retreat.',
        '',
        'Solo time alone.',
        '',
        'Reading plus walking.',
        '',
        'Anxiety dropped.',
        '',
        'I tell stressed: monthly retreat treatment.'
      ],
      lesson: 'Monthly weekend solo retreats reduce stress-baseline anxiety.'
    },
    {
      id: 'adn74_8',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy.',
        '',
        'Patterns shifted.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: couples therapy.'
      ],
      lesson: 'Couples therapy shifts marriage patterns reducing relationship anxiety.'
    },
    {
      id: 'adn74_9',
      title: 'My anxiety yielded to morning porch',
      narrative: [
        'Porch sitting daily morning.',
        '',
        'Coffee plus weather.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell home-bound: porch morning treatment.'
      ],
      lesson: 'Daily morning porch sitting with coffee and weather grounds anxiety baseline.'
    },
    {
      id: 'adn74_10',
      title: 'My anxiety triggered by my own posture',
      narrative: [
        'Posture triggered me.',
        '',
        'Physical therapy.',
        '',
        'Plus body awareness practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell posture-watchers: PT plus awareness.'
      ],
      lesson: 'Posture-trigger anxiety eases with PT plus body awareness practice.'
    },
    {
      id: 'adn74_11',
      title: 'My anxiety yielded to walking groups',
      narrative: [
        'Walking group weekly.',
        '',
        'Community plus movement.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell solo-walkers: groups treatment.'
      ],
      lesson: 'Weekly walking groups provide community plus movement anchor for anxiety.'
    },
    {
      id: 'adn74_12',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative anxiety chronic.',
        '',
        'Process therapy.',
        '',
        'Play over performance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell creative-anxious: play treatment.'
      ],
      lesson: 'Process therapy with play-over-performance reduces creative anxiety.'
    },
    {
      id: 'adn74_13',
      title: 'My anxiety yielded to dawn walking',
      narrative: [
        'Pre-dawn walks daily.',
        '',
        'Empty streets.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn walks transform.'
      ],
      lesson: 'Daily pre-dawn walks on empty streets transform anxiety baseline through quiet light.'
    },
    {
      id: 'adn74_14',
      title: 'My anxiety triggered by my own metrics',
      narrative: [
        'Tracking metrics triggered me.',
        '',
        'Released measurements.',
        '',
        'Process only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell metric-tracking: release treatment.'
      ],
      lesson: 'Releasing metrics for process-only living reduces measurement anxiety.'
    },
    {
      id: 'adn74_15',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day surrendered.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer treatment.'
      ],
      lesson: 'Evening prayer practice surrenders day reducing pre-sleep anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_75 = [
    {
      id: 'adn75_1',
      title: 'My anxiety yielded final lesson',
      narrative: [
        'Spent decades fighting anxiety.',
        '',
        'Tried medication, therapy, meditation, exercise.',
        '',
        'All helped some.',
        '',
        'But the deepest unlock was acceptance.',
        '',
        'Welcome the wave, do not fight it.',
        '',
        'Sit with anxiety, breathe through it.',
        '',
        'Wave passes faster when not resisted.',
        '',
        'Fighting prolongs.',
        '',
        'Acceptance ends.',
        '',
        'Counterintuitive but true.',
        '',
        'I tell anxiety fighters: acceptance is the long-term unlock.'
      ],
      lesson: 'Anxiety acceptance is the long-term unlock; fighting prolongs waves.'
    },
    {
      id: 'adn75_2',
      title: 'My anxiety yielded to seasonal living',
      narrative: [
        'Aligned life with seasons.',
        '',
        'Each season specific practices.',
        '',
        'Body knew where in year.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell rootless: seasonal living grounds.'
      ],
      lesson: 'Seasonal living aligns body with time grounding rootless anxiety baseline.'
    },
    {
      id: 'adn75_3',
      title: 'My anxiety yielded to walking everywhere',
      narrative: [
        'Sold car.',
        '',
        'Walked everywhere.',
        '',
        'Body daily engaged.',
        '',
        'Pace slowed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell urban: car-free reduces anxiety.'
      ],
      lesson: 'Car-free urban living substantially reduces anxiety through daily movement and slow pace.'
    },
    {
      id: 'adn75_4',
      title: 'My anxiety yielded to community',
      narrative: [
        'Isolation drove anxiety.',
        '',
        'Joined three communities.',
        '',
        'Weekly engagement each.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Community is medicine.',
        '',
        'I tell isolated anxious: multiple communities essential.'
      ],
      lesson: 'Multiple weekly community engagements reduce anxiety meaningfully.'
    },
    {
      id: 'adn75_5',
      title: 'My anxiety yielded to weekly therapy',
      narrative: [
        'Weekly therapy 10 years.',
        '',
        'Consistent processing.',
        '',
        'Layers peeled.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell on-fence: years of weekly therapy transform.'
      ],
      lesson: 'Ten years of weekly therapy with consistent processing transforms anxiety baseline.'
    },
    {
      id: 'adn75_6',
      title: 'My anxiety yielded to movement',
      narrative: [
        'Tried medication.',
        '',
        'Tried therapy.',
        '',
        'But running was missing piece.',
        '',
        'Cardio four times weekly.',
        '',
        'Anxiety dropped significantly.',
        '',
        'Movement is medicine.',
        '',
        'I tell anxious: aerobic exercise treatment-grade.'
      ],
      lesson: 'Aerobic exercise is treatment-grade adjunct for anxiety, not optional lifestyle.'
    },
    {
      id: 'adn75_7',
      title: 'My anxiety yielded to sleep',
      narrative: [
        '9 hours nightly hard rule.',
        '',
        'No exceptions.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: 9 hours treatment.'
      ],
      lesson: 'Nine hours nightly sleep with hard bedtime rule substantially reduces anxiety.'
    },
    {
      id: 'adn75_8',
      title: 'My anxiety yielded to nature',
      narrative: [
        'Forest bathing weekly.',
        '',
        'Hours among trees.',
        '',
        'No phone no goal.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stressed-busy: forest bathing.'
      ],
      lesson: 'Weekly forest bathing among trees with no phone or goal provides nervous system reset.'
    },
    {
      id: 'adn75_9',
      title: 'My anxiety yielded to faith',
      narrative: [
        'Therapy helped some.',
        '',
        'Medication helped some.',
        '',
        'But faith community filled gap.',
        '',
        'Weekly community.',
        '',
        'Prayer practice.',
        '',
        'Spiritual mentor.',
        '',
        'I tell faith-curious: practice treatment-grade.'
      ],
      lesson: 'Faith community and practice can serve as treatment-grade anxiety support.'
    },
    {
      id: 'adn75_10',
      title: 'My anxiety yielded to acceptance ultimate',
      narrative: [
        'Years of fighting anxiety.',
        '',
        'Every wave felt like enemy.',
        '',
        'Therapist suggested welcome the wave.',
        '',
        'Counterintuitive but I tried.',
        '',
        'Sat with anxiety not against.',
        '',
        'Wave passed faster.',
        '',
        'Fighting had prolonged it.',
        '',
        'Acceptance unlock.',
        '',
        'I tell fighters: acceptance is unlock.'
      ],
      lesson: 'Anxiety acceptance shortens waves; fighting prolongs them. Acceptance is the long-term unlock.'
    },
    {
      id: 'adn75_11',
      title: 'My anxiety yielded to asking for help',
      narrative: [
        'Hid anxiety for years.',
        '',
        'Performed perfection.',
        '',
        'Crashed at 38.',
        '',
        'Asked partner for help.',
        '',
        'Asked work for accommodations.',
        '',
        'Asked friends for support.',
        '',
        'Help came.',
        '',
        'World did not collapse.',
        '',
        'Quality of life transformed.',
        '',
        'I tell hidden sufferers: asking is harder but works.'
      ],
      lesson: 'Asking for help with anxiety is harder than receiving it; both transform quality of life.'
    },
    {
      id: 'adn75_12',
      title: 'My anxiety yielded to gratitude',
      narrative: [
        'Daily gratitude journal.',
        '',
        'Three things per day.',
        '',
        'Specific not general.',
        '',
        'Brain shifted over weeks.',
        '',
        'Anxiety dropped.',
        '',
        'Cheap effective tool.',
        '',
        'I tell anxious: specific daily gratitude shifts brain.'
      ],
      lesson: 'Specific daily gratitude practice measurably reduces anxiety.'
    },
    {
      id: 'adn75_13',
      title: 'My anxiety yielded to monthly silent day',
      narrative: [
        'Monthly silent day ritual.',
        '',
        'Phone off, words limited.',
        '',
        'Nervous system reset.',
        '',
        'Effects lasted week.',
        '',
        'I tell stressed-busy: silent day.'
      ],
      lesson: 'Monthly silent day ritual provides nervous system reset lasting a week.'
    },
    {
      id: 'adn75_14',
      title: 'My anxiety yielded to consistent practice',
      narrative: [
        'Single tools helped some.',
        '',
        'But consistency over years transformed.',
        '',
        'Daily practices compounded.',
        '',
        'No magic bullet.',
        '',
        'Many small commitments stacked.',
        '',
        'I tell quick-fix-seeking: consistency is the magic.'
      ],
      lesson: 'Consistency over years with stacked daily practices is the real anxiety transformation.'
    },
    {
      id: 'adn75_15',
      title: 'My anxiety yielded to wholeness',
      narrative: [
        'Anxiety part of me always.',
        '',
        'Not the whole of me.',
        '',
        'Tools managed.',
        '',
        'Acceptance integrated.',
        '',
        'Anxiety remained but did not define.',
        '',
        'I tell anxiety sufferers: anxiety can become smaller part of life.'
      ],
      lesson: 'Anxiety can become smaller part of life through tools, acceptance, and integration.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_68 = [
    {
      id: 'adn68_1',
      title: 'My anxiety yielded to morning meditation cushion',
      narrative: [
        'Morning meditation cushion daily.',
        '',
        '20 min sit.',
        '',
        'Years consistent.',
        '',
        'Brain measurably changed.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistent-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation measurably transform brain and anxiety.'
    },
    {
      id: 'adn68_2',
      title: 'My anxiety triggered by my own paperwork',
      narrative: [
        'Paperwork paralyzed me.',
        '',
        'Hired bookkeeper.',
        '',
        'Plus therapy on avoidance.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell paperwork-paralyzed: bookkeeper plus therapy.'
      ],
      lesson: 'Paperwork paralysis responds to combination of personal bookkeeper and avoidance therapy.'
    },
    {
      id: 'adn68_3',
      title: 'My anxiety yielded to outdoor cooking',
      narrative: [
        'Outdoor grilling weekly.',
        '',
        'Fire smoke air.',
        '',
        'Body engaged.',
        '',
        'Anxiety eased.',
        '',
        'I tell anxiety sufferers: outdoor cooking.'
      ],
      lesson: 'Outdoor cooking grounds nervous system through fire engagement.'
    },
    {
      id: 'adn68_4',
      title: 'My anxiety with my own fender bender',
      narrative: [
        'Minor fender bender.',
        '',
        'Anxiety severe for weeks.',
        '',
        'Backup driver scaffolding.',
        '',
        'Anxiety reduced.',
        '',
        'I tell driving-shaken: backup driver.'
      ],
      lesson: 'Backup driver scaffolds return to solo driving after accident anxiety.'
    },
    {
      id: 'adn68_5',
      title: 'My anxiety yielded to herbal tea',
      narrative: [
        'Daily herbal tea ritual.',
        '',
        'Specific blend specific time.',
        '',
        'Anchor in routine.',
        '',
        'Anxiety dropped.',
        '',
        'I tell ritual-curious: tea ritual.'
      ],
      lesson: 'Daily tea rituals provide anchoring routine for anxiety management.'
    },
    {
      id: 'adn68_6',
      title: 'My anxiety triggered by my own holiday gifts',
      narrative: [
        'Gift giving anxiety severe.',
        '',
        'Therapy on perfectionism.',
        '',
        'Plus structured gift giving.',
        '',
        'Anxiety reduced.',
        '',
        'I tell gift-anxious: structure plus imperfection.'
      ],
      lesson: 'Gift giving anxiety eases with structured approach plus perfectionism therapy.'
    },
    {
      id: 'adn68_7',
      title: 'My anxiety yielded to whittling',
      narrative: [
        'Whittling evenings.',
        '',
        'Small pieces hands busy.',
        '',
        'Mind eased.',
        '',
        'I tell hand-busy curious: whittling.'
      ],
      lesson: 'Evening whittling provides accessible hand-busy craft for anxiety relief.'
    },
    {
      id: 'adn68_8',
      title: 'My anxiety with my own news cycle',
      narrative: [
        'News cycle hijacked me.',
        '',
        'Limited to weekly summary.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print.'
      ],
      lesson: 'Weekly print news summaries substantially reduce news cycle anxiety.'
    },
    {
      id: 'adn68_9',
      title: 'My anxiety yielded to amateur chamber music',
      narrative: [
        'Amateur chamber music weekly.',
        '',
        'Intimate group.',
        '',
        'Music engagement.',
        '',
        'Anxiety dropped.',
        '',
        'I tell musical: chamber group.'
      ],
      lesson: 'Amateur chamber music groups provide intimate music community for anxiety.'
    },
    {
      id: 'adn68_10',
      title: 'My anxiety triggered by my own emotions',
      narrative: [
        'Emotions triggered me.',
        '',
        'Emotion-focused therapy.',
        '',
        'Sit with feelings.',
        '',
        'Anxiety reduced.',
        '',
        'I tell feeling-avoidant: emotion therapy.'
      ],
      lesson: 'Sit-with-feelings emotion-focused therapy reduces avoidance-driven anxiety.'
    },
    {
      id: 'adn68_11',
      title: 'My anxiety yielded to morning bird call ID',
      narrative: [
        'Bird call ID dawn.',
        '',
        'Patient listening.',
        '',
        'Species learned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sound-curious: bird ID.'
      ],
      lesson: 'Dawn bird call identification provides patient listening meditation for anxiety.'
    },
    {
      id: 'adn68_12',
      title: 'My anxiety with my own laughter triggers',
      narrative: [
        'Laughter triggered me oddly.',
        '',
        'Trauma association.',
        '',
        'EMDR for trigger.',
        '',
        'Anxiety reduced.',
        '',
        'I tell odd-triggered: EMDR for triggers.'
      ],
      lesson: 'Odd triggers like laughter can have trauma roots responding to targeted EMDR.'
    },
    {
      id: 'adn68_13',
      title: 'My anxiety yielded to fasting practice',
      narrative: [
        'Daily intermittent fast.',
        '',
        'Body discipline.',
        '',
        'Hunger tolerated.',
        '',
        'Anxiety reduced over months.',
        '',
        'I tell discipline-curious: fasting.'
      ],
      lesson: 'Daily intermittent fasting builds discomfort tolerance reducing baseline anxiety.'
    },
    {
      id: 'adn68_14',
      title: 'My anxiety triggered by my own birthday',
      narrative: [
        'Birthdays triggered me.',
        '',
        'Marking time aging.',
        '',
        'Birthday rituals designed.',
        '',
        'Anxiety contained.',
        '',
        'I tell birthday-anxious: designed rituals.'
      ],
      lesson: 'Designed birthday rituals contain time-marking and aging anxiety.'
    },
    {
      id: 'adn68_15',
      title: 'My anxiety yielded to weekly long friend call',
      narrative: [
        'Weekly long friend call.',
        '',
        'No agenda.',
        '',
        'Free flow.',
        '',
        'Anxiety dropped.',
        '',
        'I tell friendship-craving: long calls.'
      ],
      lesson: 'Weekly agenda-free long friend calls reduce anxiety through depth.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_69 = [
    {
      id: 'adn69_1',
      title: 'My anxiety yielded to child friend conversation',
      narrative: [
        'Child friend triggered me.',
        '',
        'Communication with child.',
        '',
        'Trust building.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parent-friend-anxious: communication.'
      ],
      lesson: 'Parent-child communication about friends reduces parental anxiety more than restriction.'
    },
    {
      id: 'adn69_2',
      title: 'My anxiety triggered by my own laughter',
      narrative: [
        'Laughter triggered.',
        '',
        'Trauma association.',
        '',
        'EMDR.',
        '',
        'Anxiety reduced.',
        '',
        'I tell sound-triggered: EMDR.'
      ],
      lesson: 'Sound-triggered anxiety from trauma responds to targeted EMDR.'
    },
    {
      id: 'adn69_3',
      title: 'My anxiety yielded to silent retreat',
      narrative: [
        'Monthly silent day.',
        '',
        'Phone off limited words.',
        '',
        'Nervous system reset.',
        '',
        'I tell stressed-busy: silent day.'
      ],
      lesson: 'Monthly silent retreat days reset nervous system for stressed-busy anxious.'
    },
    {
      id: 'adn69_4',
      title: 'My anxiety with my own own laughter',
      narrative: [
        'Laughter triggered me oddly.',
        '',
        'Trauma association.',
        '',
        'EMDR.',
        '',
        'Anxiety reduced.',
        '',
        'I tell odd-triggered: EMDR specialty.'
      ],
      lesson: 'Odd specific triggers respond to targeted EMDR therapy.'
    },
    {
      id: 'adn69_5',
      title: 'My anxiety yielded to printmaking',
      narrative: [
        'Block print weekly.',
        '',
        'Carving ink paper.',
        '',
        'Hands engaged.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: printmaking.'
      ],
      lesson: 'Weekly printmaking provides hand-engaged craft for anxiety relief.'
    },
    {
      id: 'adn69_6',
      title: 'My anxiety triggered by my own smartphone',
      narrative: [
        'Smartphone triggered me.',
        '',
        'Switched to dumb phone.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell smartphone-anxious: dumb phone.'
      ],
      lesson: 'Switching to dumb phone substantially reduces smartphone-triggered anxiety.'
    },
    {
      id: 'adn69_7',
      title: 'My anxiety yielded to silk painting',
      narrative: [
        'Silk painting hobby.',
        '',
        'Color spread.',
        '',
        'Anxiety paused.',
        '',
        'I tell visual-curious: silk painting.'
      ],
      lesson: 'Silk painting provides unique medium for visual artist anxiety relief.'
    },
    {
      id: 'adn69_8',
      title: 'My anxiety with my own workplace',
      narrative: [
        'Workplace triggered me.',
        '',
        'Remote work negotiated.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell workplace-anxious: remote work.'
      ],
      lesson: 'Negotiated remote work substantially reduces workplace-triggered anxiety.'
    },
    {
      id: 'adn69_9',
      title: 'My anxiety yielded to hospice volunteer',
      narrative: [
        'Hospice volunteer weekly.',
        '',
        'Presence with dying.',
        '',
        'Perspective shifted.',
        '',
        'I tell perspective-seeking: hospice.'
      ],
      lesson: 'Hospice volunteering shifts life perspective reducing self-focused anxiety.'
    },
    {
      id: 'adn69_10',
      title: 'My anxiety triggered by parking lots',
      narrative: [
        'Parking lots triggered me.',
        '',
        'EMDR for places.',
        '',
        'Anxiety reduced.',
        '',
        'I tell place-triggered: EMDR.'
      ],
      lesson: 'Place-specific anxiety triggers respond to targeted EMDR.'
    },
    {
      id: 'adn69_11',
      title: 'My anxiety yielded to swimming class',
      narrative: [
        'Adult swimming lessons.',
        '',
        'Skill plus body.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell water-anxious: adult lessons.'
      ],
      lesson: 'Adult swimming lessons build skill and body confidence reducing anxiety.'
    },
    {
      id: 'adn69_12',
      title: 'My anxiety with my own family secrets',
      narrative: [
        'Family secrets triggered me.',
        '',
        'Truth-telling therapy.',
        '',
        'Family system shifted.',
        '',
        'I tell secret-keeping: truth-telling.'
      ],
      lesson: 'Truth-telling therapy resolves family secret anxiety through system shift.'
    },
    {
      id: 'adn69_13',
      title: 'My anxiety yielded to creative dance class',
      narrative: [
        'Creative dance class.',
        '',
        'Free movement.',
        '',
        'Body expressed.',
        '',
        'I tell movement-curious: creative dance.'
      ],
      lesson: 'Creative dance class provides free movement expression for anxiety relief.'
    },
    {
      id: 'adn69_14',
      title: 'My anxiety triggered by my own past memories',
      narrative: [
        'Past memories triggered me.',
        '',
        'Trauma therapy.',
        '',
        'Memories integrated.',
        '',
        'I tell memory-stricken: integration.'
      ],
      lesson: 'Past memory integration through trauma therapy reduces memory-trigger anxiety.'
    },
    {
      id: 'adn69_15',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool swim daily.',
        '',
        'Body engaged early.',
        '',
        'Day clear.',
        '',
        'I tell movement-curious: pre-work swim.'
      ],
      lesson: 'Pre-work morning swim engages body early reducing anxiety baseline.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_70 = [
    {
      id: 'adn70_1',
      title: 'My anxiety yielded to weekend reading',
      narrative: [
        'Saturday morning reading hour.',
        '',
        'Book absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell readers: weekend reading.'
      ],
      lesson: 'Saturday morning reading hour rituals absorb mind for anxiety relief.'
    },
    {
      id: 'adn70_2',
      title: 'My anxiety triggered by school events',
      narrative: [
        'Child school events triggered me.',
        '',
        'Pre-event prep.',
        '',
        'Plus support person.',
        '',
        'I tell school-anxious parents: prep plus support.'
      ],
      lesson: 'School event parental anxiety eases with pre-event prep and support person.'
    },
    {
      id: 'adn70_3',
      title: 'My anxiety yielded to home meditation room',
      narrative: [
        'Dedicated meditation room.',
        '',
        'Cushion candle time.',
        '',
        'Sacred space.',
        '',
        'I tell home-meditating: dedicated space.'
      ],
      lesson: 'Dedicated meditation room creates sacred space reducing anxiety on entry.'
    },
    {
      id: 'adn70_4',
      title: 'My anxiety with my own cooking',
      narrative: [
        'Weekend cooking project weekly.',
        '',
        'Multi-hour recipes.',
        '',
        'Mind absorbed.',
        '',
        'I tell weekend-anxious: cooking project.'
      ],
      lesson: 'Weekend multi-hour cooking projects absorb mind for weekend anxiety relief.'
    },
    {
      id: 'adn70_5',
      title: 'My anxiety yielded to historic reading',
      narrative: [
        'Historic fiction weekly.',
        '',
        'Other times absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: history fiction.'
      ],
      lesson: 'Historic fiction transports mind to other times for anxiety relief.'
    },
    {
      id: 'adn70_6',
      title: 'My anxiety triggered by my own child sleep',
      narrative: [
        'Child sleep triggered me.',
        '',
        'Pediatric sleep specialist.',
        '',
        'Plus parent coaching.',
        '',
        'Family slept.',
        '',
        'I tell sleep-deprived: specialty exists.'
      ],
      lesson: 'Pediatric sleep specialty plus parent coaching solves family sleep anxiety.'
    },
    {
      id: 'adn70_7',
      title: 'My anxiety yielded to community drumming',
      narrative: [
        'Drum circle weekly.',
        '',
        'Rhythm shared.',
        '',
        'Body resonated.',
        '',
        'I tell rhythm-curious: drum circles.'
      ],
      lesson: 'Community drum circles provide shared rhythm body resonance for anxiety.'
    },
    {
      id: 'adn70_8',
      title: 'My anxiety with my own breathing pattern',
      narrative: [
        'Breath pattern triggered me.',
        '',
        'Pranayama practice.',
        '',
        'Conscious breath patterns.',
        '',
        'Anxiety reduced.',
        '',
        'I tell breath-anxious: pranayama.'
      ],
      lesson: 'Pranayama conscious breath patterns reduce breath-triggered anxiety.'
    },
    {
      id: 'adn70_9',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool swim daily.',
        '',
        'Quiet pool.',
        '',
        'Body engaged.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: pre-work swim.'
      ],
      lesson: 'Daily pre-work morning pool swim reduces anxiety baseline.'
    },
    {
      id: 'adn70_10',
      title: 'My anxiety triggered by my own posture',
      narrative: [
        'Posture awareness triggered me.',
        '',
        'Physical therapy.',
        '',
        'Plus posture training.',
        '',
        'I tell posture-watchers: PT plus training.'
      ],
      lesson: 'Posture anxiety eases with physical therapy plus formal posture training.'
    },
    {
      id: 'adn70_11',
      title: 'My anxiety yielded to weekly bridge',
      narrative: [
        'Bridge club weekly.',
        '',
        'Strategy plus community.',
        '',
        'Mind absorbed.',
        '',
        'I tell card-curious: bridge clubs.'
      ],
      lesson: 'Weekly bridge clubs combine strategy and community for adult anxiety relief.'
    },
    {
      id: 'adn70_12',
      title: 'My anxiety with my own future',
      narrative: [
        'Future projection triggered me.',
        '',
        'Present focus practice.',
        '',
        'Anxiety reduced.',
        '',
        'I tell future-projecting: present focus.'
      ],
      lesson: 'Present focus practice replaces future projection reducing trigger anxiety.'
    },
    {
      id: 'adn70_13',
      title: 'My anxiety yielded to outdoor cooking',
      narrative: [
        'Weekend outdoor grill.',
        '',
        'Fire food friends.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: outdoor cooking.'
      ],
      lesson: 'Weekend outdoor grilling provides fire-food-friends ritual for anxiety.'
    },
    {
      id: 'adn70_14',
      title: 'My anxiety triggered by certain music',
      narrative: [
        'Specific songs triggered me.',
        '',
        'Trauma association.',
        '',
        'New playlist created.',
        '',
        'Anxiety reduced.',
        '',
        'I tell music-triggered: new playlist.'
      ],
      lesson: 'Curating new playlists while avoiding trauma music reduces music anxiety.'
    },
    {
      id: 'adn70_15',
      title: 'My anxiety yielded to evening lighting',
      narrative: [
        'Dim warm evening light.',
        '',
        'Blue light off.',
        '',
        'Body signaled night.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: lighting matters.'
      ],
      lesson: 'Dim warm evening lighting signals night to body reducing pre-sleep anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_61 = [
    {
      id: 'adn61_1',
      title: 'My anxiety yielded to monthly book club',
      narrative: [
        'Monthly book club.',
        '',
        'Reading plus discussion.',
        '',
        'Anchor of month.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: monthly book club.'
      ],
      lesson: 'Monthly book club anchors month with reading and discussion for anxiety.'
    },
    {
      id: 'adn61_2',
      title: 'My anxiety triggered by my own family',
      narrative: [
        'Family triggered me.',
        '',
        'Family of origin therapy.',
        '',
        'Differentiation built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell family-bound: differentiation.'
      ],
      lesson: 'Family of origin differentiation therapy reduces family-triggered anxiety.'
    },
    {
      id: 'adn61_3',
      title: 'My anxiety yielded to weekly bird walk',
      narrative: [
        'Weekly bird walk group.',
        '',
        'Community plus observation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated-observer: bird group.'
      ],
      lesson: 'Weekly bird walk groups combine community plus patient observation for anxiety.'
    },
    {
      id: 'adn61_4',
      title: 'My anxiety with my own work pace',
      narrative: [
        'Work pace triggered me.',
        '',
        'Slower role found.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade conscious.',
        '',
        'I tell fast-paced: slower role.'
      ],
      lesson: 'Trading pace for income through slower work role is conscious anxiety treatment.'
    },
    {
      id: 'adn61_5',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer 15 min daily.',
        '',
        'Faith plus calm.',
        '',
        'Day grounded.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell faithful: morning prayer.'
      ],
      lesson: 'Daily 15-minute morning prayer grounds day reducing anxiety baseline.'
    },
    {
      id: 'adn61_6',
      title: 'My anxiety triggered by my own grief',
      narrative: [
        'Unprocessed grief triggered me.',
        '',
        'Grief therapy.',
        '',
        'Tears flowed.',
        '',
        'Anxiety lifted as grief processed.',
        '',
        'I tell grief-avoidant: grief therapy.'
      ],
      lesson: 'Grief therapy processes avoided grief lifting anxiety masking unprocessed loss.'
    },
    {
      id: 'adn61_7',
      title: 'My anxiety yielded to wood walking',
      narrative: [
        'Forest walks weekly.',
        '',
        'No goal aimless.',
        '',
        'Wander practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-driven: aimless walks.'
      ],
      lesson: 'Aimless forest wandering counters goal-driven anxiety through directed surrender.'
    },
    {
      id: 'adn61_8',
      title: 'My anxiety with my own social media',
      narrative: [
        'Platforms triggered me.',
        '',
        'All accounts deleted.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-anxious: deletion.'
      ],
      lesson: 'Social media account deletion substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn61_9',
      title: 'My anxiety yielded to morning sun outside',
      narrative: [
        'Morning sun 10 min daily.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: morning sun.'
      ],
      lesson: 'Ten minutes daily morning sun aligns circadian rhythm reducing anxiety.'
    },
    {
      id: 'adn61_10',
      title: 'My anxiety triggered by my own gut',
      narrative: [
        'Gut anxiety severe.',
        '',
        'Gut-brain axis treatment.',
        '',
        'Probiotics plus stress reduction.',
        '',
        'Anxiety reduced.',
        '',
        'I tell gut-anxious: gut-brain treatment.'
      ],
      lesson: 'Gut-brain axis treatment with probiotics plus stress reduction reduces gut anxiety.'
    },
    {
      id: 'adn61_11',
      title: 'My anxiety yielded to weekly therapy',
      narrative: [
        'Weekly therapy years.',
        '',
        'Consistent processing.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell on-fence: years transform.'
      ],
      lesson: 'Years of consistent weekly therapy transform anxiety baseline.'
    },
    {
      id: 'adn61_12',
      title: 'My anxiety with my own self-image',
      narrative: [
        'Self-image triggered me.',
        '',
        'Identity therapy.',
        '',
        'Self-concept solidified.',
        '',
        'Anxiety reduced.',
        '',
        'I tell identity-anxious: identity therapy.'
      ],
      lesson: 'Identity therapy solidifies self-concept reducing self-image anxiety.'
    },
    {
      id: 'adn61_13',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Evening tea ritual.',
        '',
        'Chamomile lavender.',
        '',
        'Sleep prep.',
        '',
        'Anxiety eased.',
        '',
        'I tell pre-sleep: tea ritual.'
      ],
      lesson: 'Evening herbal tea ritual prepares pre-sleep anxiety reduction.'
    },
    {
      id: 'adn61_14',
      title: 'My anxiety triggered by my own income',
      narrative: [
        'Income anxiety chronic.',
        '',
        'Financial therapist plus fund.',
        '',
        'Anxiety reduced.',
        '',
        'I tell income-anxious: therapy plus fund.'
      ],
      lesson: 'Financial therapy plus emergency fund reduces income uncertainty anxiety.'
    },
    {
      id: 'adn61_15',
      title: 'My anxiety yielded to weekly chess',
      narrative: [
        'Weekly chess club.',
        '',
        'Strategy plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell strategy-curious: chess.'
      ],
      lesson: 'Weekly chess clubs combine strategy plus community for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_62 = [
    {
      id: 'adn62_1',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation 20 min daily.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistent-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transforms anxiety baseline.'
    },
    {
      id: 'adn62_2',
      title: 'My anxiety triggered by my own news',
      narrative: [
        'News triggered me.',
        '',
        'Weekly print only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print.'
      ],
      lesson: 'Weekly print news only substantially reduces news-triggered anxiety.'
    },
    {
      id: 'adn62_3',
      title: 'My anxiety yielded to community pottery',
      narrative: [
        'Community pottery weekly.',
        '',
        'Wheel throwing plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: community studios.'
      ],
      lesson: 'Weekly community pottery wheel throwing plus community reduces anxiety.'
    },
    {
      id: 'adn62_4',
      title: 'My anxiety with my own anger',
      narrative: [
        'Anger triggered me.',
        '',
        'Anger therapy.',
        '',
        'Signal not enemy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: signal therapy.'
      ],
      lesson: 'Anger therapy as signal not enemy reduces anger-trigger anxiety.'
    },
    {
      id: 'adn62_5',
      title: 'My anxiety yielded to morning farmers market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh food, neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: market ritual.'
      ],
      lesson: 'Weekly Saturday markets anchor week with fresh food and neighbor community.'
    },
    {
      id: 'adn62_6',
      title: 'My anxiety triggered by my own commute',
      narrative: [
        'Commute triggered me.',
        '',
        'Off-peak shift.',
        '',
        'Plus podcast.',
        '',
        'Anxiety reduced.',
        '',
        'I tell commute-anxious: shift plus content.'
      ],
      lesson: 'Off-peak commute shift with chosen content reduces commute anxiety.'
    },
    {
      id: 'adn62_7',
      title: 'My anxiety yielded to weekly choir',
      narrative: [
        'Community choir weekly.',
        '',
        'Voice plus group.',
        '',
        'Anxiety dropped.',
        '',
        'I tell singing-curious: choir.'
      ],
      lesson: 'Weekly community choir provides voice plus group engagement for anxiety.'
    },
    {
      id: 'adn62_8',
      title: 'My anxiety with my own work emails',
      narrative: [
        'Work email triggered me.',
        '',
        'Three times daily.',
        '',
        'Anxiety dropped.',
        '',
        'I tell email-anxious: three times.'
      ],
      lesson: 'Three-times-daily work email checking reduces work email anxiety.'
    },
    {
      id: 'adn62_9',
      title: 'My anxiety yielded to outdoor coffee',
      narrative: [
        'Morning outdoor coffee daily.',
        '',
        'All weather.',
        '',
        'Body aware.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-bound: outdoor coffee.'
      ],
      lesson: 'All-weather outdoor morning coffee substantially reduces home-bound anxiety.'
    },
    {
      id: 'adn62_10',
      title: 'My anxiety triggered by my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy.',
        '',
        'New dynamic.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: therapy.'
      ],
      lesson: 'Couples therapy builds new dynamic reducing marriage-trigger anxiety.'
    },
    {
      id: 'adn62_11',
      title: 'My anxiety yielded to morning walk',
      narrative: [
        'Daily 30 min morning walk.',
        '',
        'Body engaged early.',
        '',
        'Day grounded.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary mornings: walk.'
      ],
      lesson: 'Daily 30-minute morning walks ground day reducing baseline anxiety.'
    },
    {
      id: 'adn62_12',
      title: 'My anxiety with my own thoughts',
      narrative: [
        'Thought spirals triggered me.',
        '',
        'Mindfulness practice.',
        '',
        'Thoughts as clouds.',
        '',
        'Anxiety reduced.',
        '',
        'I tell spiral-stuck: clouds practice.'
      ],
      lesson: 'Mindfulness thoughts-as-clouds practice reduces spiral-stuck anxiety.'
    },
    {
      id: 'adn62_13',
      title: 'My anxiety yielded to outdoor reading',
      narrative: [
        'Outdoor reading weekly.',
        '',
        'Park bench plus book.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: outdoor reading.'
      ],
      lesson: 'Weekly outdoor park bench reading transforms indoor reader anxiety.'
    },
    {
      id: 'adn62_14',
      title: 'My anxiety triggered by my own work load',
      narrative: [
        'Work load triggered me.',
        '',
        'Negotiated reduction.',
        '',
        'Anxiety dropped.',
        '',
        'I tell overworked: negotiation.'
      ],
      lesson: 'Negotiated work load reduction reduces overwork anxiety.'
    },
    {
      id: 'adn62_15',
      title: 'My anxiety yielded to morning yoga',
      narrative: [
        'Morning yoga 30 min daily.',
        '',
        'Body opened.',
        '',
        'Breath deepened.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: morning yoga.'
      ],
      lesson: 'Daily 30-minute morning yoga opens body deepens breath for anxiety baseline.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_63 = [
    {
      id: 'adn63_1',
      title: 'My anxiety yielded to weekly running',
      narrative: [
        '5K runs three weekly.',
        '',
        'Body processed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck: running treatment.'
      ],
      lesson: 'Three weekly 5K runs substantially process body stress for anxiety.'
    },
    {
      id: 'adn63_2',
      title: 'My anxiety triggered by my own children',
      narrative: [
        'Child worry triggered me.',
        '',
        'Parent therapy.',
        '',
        'Uncertainty tolerated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty therapy.'
      ],
      lesson: 'Parent uncertainty therapy reduces child-worry anxiety.'
    },
    {
      id: 'adn63_3',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike ritual.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement for weekend anxiety relief.'
    },
    {
      id: 'adn63_4',
      title: 'My anxiety with my own home',
      narrative: [
        'Home triggered me.',
        '',
        'Moved.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-triggered: relocation.'
      ],
      lesson: 'Relocation is legitimate treatment when home itself triggers anxiety.'
    },
    {
      id: 'adn63_5',
      title: 'My anxiety yielded to morning porch',
      narrative: [
        'Morning porch daily.',
        '',
        'Coffee plus weather.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell home-bound: porch morning.'
      ],
      lesson: 'Daily morning porch sitting reduces home-bound anxiety baseline.'
    },
    {
      id: 'adn63_6',
      title: 'My anxiety triggered by my own loneliness',
      narrative: [
        'Loneliness triggered me.',
        '',
        'Three weekly contacts.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell lonely: three contacts.'
      ],
      lesson: 'Three weekly social contacts substantially reduce loneliness anxiety.'
    },
    {
      id: 'adn63_7',
      title: 'My anxiety yielded to bath ritual',
      narrative: [
        'Bath ritual twice weekly.',
        '',
        'Salts oils candles.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: bath.'
      ],
      lesson: 'Twice-weekly bath rituals soften body for anxiety relief.'
    },
    {
      id: 'adn63_8',
      title: 'My anxiety with my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist: good enough.'
      ],
      lesson: 'Good-enough practice reduces perfectionism-driven anxiety.'
    },
    {
      id: 'adn63_9',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day surrendered.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer.'
      ],
      lesson: 'Evening prayer practice surrenders day reducing pre-sleep anxiety.'
    },
    {
      id: 'adn63_10',
      title: 'My anxiety triggered by my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum.'
      ],
      lesson: 'Tech minimum approach reduces tech-overwhelmed anxiety.'
    },
    {
      id: 'adn63_11',
      title: 'My anxiety yielded to weekly volunteering',
      narrative: [
        'Weekly food pantry.',
        '',
        'Service plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell purpose-seeking: weekly service.'
      ],
      lesson: 'Weekly food pantry service provides purpose plus community for anxiety.'
    },
    {
      id: 'adn63_12',
      title: 'My anxiety with my own time pressure',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Buffer everywhere.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pressed-time: buffer.'
      ],
      lesson: 'Buffer time everywhere reduces time pressure anxiety.'
    },
    {
      id: 'adn63_13',
      title: 'My anxiety yielded to early bedtime',
      narrative: [
        '9pm bedtime hard.',
        '',
        '9 hours nightly.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: early bedtime.'
      ],
      lesson: 'Hard 9pm bedtime with 9 hours substantially reduces sleep-deficient anxiety.'
    },
    {
      id: 'adn63_14',
      title: 'My anxiety triggered by my own appearance',
      narrative: [
        'Appearance triggered me.',
        '',
        'Body neutrality.',
        '',
        'Function celebrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell appearance-anxious: neutrality.'
      ],
      lesson: 'Body neutrality with function celebration reduces appearance anxiety.'
    },
    {
      id: 'adn63_15',
      title: 'My anxiety yielded to acceptance',
      narrative: [
        'Acceptance unlocked.',
        '',
        'Fighting prolonged.',
        '',
        'Welcoming shortened.',
        '',
        'Counterintuitive truth.',
        '',
        'I tell fighters: acceptance unlock.'
      ],
      lesson: 'Acceptance over fighting anxiety is the long-term unlock.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_64 = [
    {
      id: 'adn64_1',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool daily.',
        '',
        'Quiet pool.',
        '',
        'Body engaged early.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: pre-work swim.'
      ],
      lesson: 'Daily 6am morning pool swim engages body early reducing anxiety baseline.'
    },
    {
      id: 'adn64_2',
      title: 'My anxiety triggered by my own success',
      narrative: [
        'Success imposter.',
        '',
        'Imposter therapy.',
        '',
        'Achievement owned.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy reduces success-triggered imposter anxiety.'
    },
    {
      id: 'adn64_3',
      title: 'My anxiety yielded to weekly book swap',
      narrative: [
        'Monthly book swap friends.',
        '',
        'Books plus stories.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book swap.'
      ],
      lesson: 'Monthly book swap rituals connect readers for anxiety relief.'
    },
    {
      id: 'adn64_4',
      title: 'My anxiety with my own decisions',
      narrative: [
        'Decision paralysis triggered me.',
        '',
        'Decision therapy.',
        '',
        'Tools for choosing.',
        '',
        'Anxiety reduced.',
        '',
        'I tell paralyzed: decision therapy.'
      ],
      lesson: 'Decision therapy with specific choosing tools reduces paralysis anxiety.'
    },
    {
      id: 'adn64_5',
      title: 'My anxiety yielded to evening sketching',
      narrative: [
        'Evening sketch daily.',
        '',
        'Pencil paper.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell evening-anxious: sketch.'
      ],
      lesson: 'Daily evening sketching absorbs mind for pre-sleep anxiety relief.'
    },
    {
      id: 'adn64_6',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Today only practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today.'
      ],
      lesson: 'Today-only present practice reduces future projection anxiety.'
    },
    {
      id: 'adn64_7',
      title: 'My anxiety yielded to morning bird call',
      narrative: [
        'Bird call identification dawn.',
        '',
        'Patient listening.',
        '',
        'Species learned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sound-curious: bird ID.'
      ],
      lesson: 'Dawn bird call identification provides patient listening for anxiety relief.'
    },
    {
      id: 'adn64_8',
      title: 'My anxiety with my own past',
      narrative: [
        'Past triggered me.',
        '',
        'Trauma therapy.',
        '',
        'Memories integrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell past-stricken: trauma therapy.'
      ],
      lesson: 'Trauma therapy integrates past reducing past-trigger anxiety.'
    },
    {
      id: 'adn64_9',
      title: 'My anxiety yielded to weekly bridge',
      narrative: [
        'Weekly bridge club.',
        '',
        'Strategy plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell card-curious: bridge.'
      ],
      lesson: 'Weekly bridge clubs combine strategy plus community for anxiety relief.'
    },
    {
      id: 'adn64_10',
      title: 'My anxiety triggered by my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-pressured: process focus.'
      ],
      lesson: 'Process focus over goal pressure reduces goal-driven anxiety.'
    },
    {
      id: 'adn64_11',
      title: 'My anxiety yielded to morning gratitude',
      narrative: [
        'Three gratitudes morning daily.',
        '',
        'Brain shifted.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell mood-stuck: gratitude.'
      ],
      lesson: 'Daily morning three gratitudes shift brain reducing anxiety baseline.'
    },
    {
      id: 'adn64_12',
      title: 'My anxiety with my own self-talk',
      narrative: [
        'Inner critic triggered me.',
        '',
        'Self-compassion practice.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-critical: compassion.'
      ],
      lesson: 'Self-compassion practice softens inner critic reducing self-talk anxiety.'
    },
    {
      id: 'adn64_13',
      title: 'My anxiety yielded to weekly walking groups',
      narrative: [
        'Walking group weekly.',
        '',
        'Community plus movement.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell solo-walkers: groups treatment.'
      ],
      lesson: 'Weekly walking groups provide community plus movement anchor for anxiety.'
    },
    {
      id: 'adn64_14',
      title: 'My anxiety triggered by my own age',
      narrative: [
        'Aging triggered me.',
        '',
        'Aging acceptance therapy.',
        '',
        'Plus elder mentors.',
        '',
        'Anxiety reduced.',
        '',
        'I tell aging-anxious: acceptance plus mentors.'
      ],
      lesson: 'Aging acceptance therapy plus elder mentor relationships reduce aging anxiety.'
    },
    {
      id: 'adn64_15',
      title: 'My anxiety yielded to seasonal traditions',
      narrative: [
        'Seasonal traditions year round.',
        '',
        'Body aligned with time.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless: traditions ground.'
      ],
      lesson: 'Year-round seasonal traditions ground body in time reducing rootless anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_65 = [
    {
      id: 'adn65_1',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly weekend retreat.',
        '',
        'Solo no service.',
        '',
        'Reading walking.',
        '',
        'Anxiety reset.',
        '',
        'I tell stressed: monthly retreat.'
      ],
      lesson: 'Monthly solo weekend retreats reset anxiety baseline.'
    },
    {
      id: 'adn65_2',
      title: 'My anxiety triggered by my own boundaries',
      narrative: [
        'Boundaries triggered me.',
        '',
        'Boundary therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boundary-difficult: therapy.'
      ],
      lesson: 'Boundary therapy reduces boundary-difficulty anxiety.'
    },
    {
      id: 'adn65_3',
      title: 'My anxiety yielded to dance class',
      narrative: [
        'Weekly creative dance.',
        '',
        'Body free.',
        '',
        'Community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: dance class.'
      ],
      lesson: 'Weekly creative dance class provides free body movement plus community.'
    },
    {
      id: 'adn65_4',
      title: 'My anxiety with my own holidays',
      narrative: [
        'Holidays triggered me.',
        '',
        'New traditions.',
        '',
        'Stress reduced.',
        '',
        'Anxiety reduced.',
        '',
        'I tell holiday-anxious: new traditions.'
      ],
      lesson: 'Building new holiday traditions reduces holiday-triggered anxiety.'
    },
    {
      id: 'adn65_5',
      title: 'My anxiety yielded to woodworking',
      narrative: [
        'Garage workshop evenings.',
        '',
        'Tools wood projects.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell hands-on: workshop.'
      ],
      lesson: 'Garage workshop evenings provide tool-wood-project absorption for anxiety.'
    },
    {
      id: 'adn65_6',
      title: 'My anxiety triggered by my own dating',
      narrative: [
        'Dating triggered me.',
        '',
        'Dating coach plus therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell dating-anxious: coach plus therapy.'
      ],
      lesson: 'Dating coach plus therapy team reduces dating-trigger anxiety.'
    },
    {
      id: 'adn65_7',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly friend potluck.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: potluck ritual.'
      ],
      lesson: 'Weekly friend potluck rituals provide food plus community anchor.'
    },
    {
      id: 'adn65_8',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Career pivot.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade conscious.',
        '',
        'I tell work-stuck: pivot.'
      ],
      lesson: 'Career pivot to lower-pay lower-anxiety role is conscious anxiety treatment.'
    },
    {
      id: 'adn65_9',
      title: 'My anxiety yielded to morning movement',
      narrative: [
        'Morning movement non-negotiable.',
        '',
        '20 min minimum.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary: morning movement.'
      ],
      lesson: 'Non-negotiable 20-minute morning movement reduces sedentary anxiety baseline.'
    },
    {
      id: 'adn65_10',
      title: 'My anxiety triggered by my own memory',
      narrative: [
        'Memory loss triggered me.',
        '',
        'Memory tools plus aging acceptance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell memory-anxious: tools plus acceptance.'
      ],
      lesson: 'Memory tools plus aging acceptance reduce memory-loss anxiety.'
    },
    {
      id: 'adn65_11',
      title: 'My anxiety yielded to fish tank',
      narrative: [
        'Fish tank watching daily.',
        '',
        'Bubbler sound.',
        '',
        'Nervous system softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: aquarium.'
      ],
      lesson: 'Daily fish tank watching softens nervous system for anxiety relief.'
    },
    {
      id: 'adn65_12',
      title: 'My anxiety with my own creative work',
      narrative: [
        'Creative anxiety chronic.',
        '',
        'Process therapy.',
        '',
        'Play over performance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell creative-anxious: play.'
      ],
      lesson: 'Creative process therapy with play reduces creative anxiety.'
    },
    {
      id: 'adn65_13',
      title: 'My anxiety yielded to early dawn walks',
      narrative: [
        'Pre-dawn walks daily.',
        '',
        'Empty streets.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn walks.'
      ],
      lesson: 'Daily pre-dawn walks transform anxiety baseline through empty streets and first light.'
    },
    {
      id: 'adn65_14',
      title: 'My anxiety triggered by my own retirement',
      narrative: [
        'Retirement triggered me.',
        '',
        'Retirement coach plus therapy.',
        '',
        'Plan plus identity.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pre-retirement: coach plus therapy.'
      ],
      lesson: 'Retirement coach plus therapy team builds plan plus identity reducing transition anxiety.'
    },
    {
      id: 'adn65_15',
      title: 'My anxiety yielded to community drumming',
      narrative: [
        'Community drum circle weekly.',
        '',
        'Rhythm shared.',
        '',
        'Body resonated.',
        '',
        'Anxiety dropped.',
        '',
        'I tell rhythm-curious: drum circles.'
      ],
      lesson: 'Community drum circles provide shared rhythm body resonance for anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_66 = [
    {
      id: 'adn66_1',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer 15 min daily.',
        '',
        'Faith plus calm.',
        '',
        'Day grounded.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell faithful: morning prayer.'
      ],
      lesson: 'Daily 15-minute morning prayer grounds day reducing anxiety baseline.'
    },
    {
      id: 'adn66_2',
      title: 'My anxiety triggered by my own scent',
      narrative: [
        'Scent triggered me.',
        '',
        'Body OCD pattern.',
        '',
        'OCD specialist.',
        '',
        'Anxiety reduced.',
        '',
        'I tell scent-anxious: OCD specialty.'
      ],
      lesson: 'Body scent anxiety can be OCD pattern needing specialty treatment.'
    },
    {
      id: 'adn66_3',
      title: 'My anxiety yielded to ironing meditation',
      narrative: [
        'Weekly ironing.',
        '',
        'Repetitive motion.',
        '',
        'Warm steam.',
        '',
        'Anxiety dropped.',
        '',
        'I tell domestic-anxious: ironing.'
      ],
      lesson: 'Weekly ironing provides meditative repetitive motion for anxiety relief.'
    },
    {
      id: 'adn66_4',
      title: 'My anxiety with my own pace',
      narrative: [
        'Pace comparison triggered me.',
        '',
        'Own pace honored.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pace-comparing: own pace.'
      ],
      lesson: 'Honoring own pace over comparison reduces pace anxiety.'
    },
    {
      id: 'adn66_5',
      title: 'My anxiety yielded to climbing gym',
      narrative: [
        'Rock climbing gym weekly.',
        '',
        'Physical plus problem.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell adventurous: climbing.'
      ],
      lesson: 'Rock climbing combines physical and problem solving for anxiety relief.'
    },
    {
      id: 'adn66_6',
      title: 'My anxiety triggered by my own body',
      narrative: [
        'Body image triggered me.',
        '',
        'Body image therapy.',
        '',
        'Neutrality built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell image-anxious: neutrality therapy.'
      ],
      lesson: 'Body image neutrality therapy reduces body-trigger anxiety.'
    },
    {
      id: 'adn66_7',
      title: 'My anxiety yielded to gentle yoga',
      narrative: [
        'Restorative yoga weekly.',
        '',
        'Slow supported gentle.',
        '',
        'Nervous system softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell stuck-anxious: restorative yoga.'
      ],
      lesson: 'Restorative yoga softens nervous system distinct from active yoga for anxiety.'
    },
    {
      id: 'adn66_8',
      title: 'My anxiety with my own elderly home visits',
      narrative: [
        'Visiting parents triggered me.',
        '',
        'Family therapy.',
        '',
        'Plus structured visits.',
        '',
        'Anxiety reduced.',
        '',
        'I tell adult children: family therapy.'
      ],
      lesson: 'Family therapy plus structured visits ease elderly home visit anxiety.'
    },
    {
      id: 'adn66_9',
      title: 'My anxiety yielded to outdoor cycling',
      narrative: [
        'Outdoor cycling weekly.',
        '',
        'Air wind motion.',
        '',
        'Body engaged.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: cycling.'
      ],
      lesson: 'Outdoor cycling combines air wind motion body engagement for anxiety.'
    },
    {
      id: 'adn66_10',
      title: 'My anxiety triggered by my own financial future',
      narrative: [
        'Retirement anxiety severe.',
        '',
        'Financial planner plus therapy.',
        '',
        'Real numbers viewed.',
        '',
        'Anxiety reduced.',
        '',
        'I tell retirement-anxious: numbers plus therapy.'
      ],
      lesson: 'Retirement financial planning plus therapy reduces retirement financial anxiety.'
    },
    {
      id: 'adn66_11',
      title: 'My anxiety yielded to community theater',
      narrative: [
        'Community theater joined.',
        '',
        'Practice plus performance.',
        '',
        'Anxiety transformed.',
        '',
        'I tell performance-curious: theater.'
      ],
      lesson: 'Community theater transforms social anxiety through role practice and performance.'
    },
    {
      id: 'adn66_12',
      title: 'My anxiety with my own thoughts at night',
      narrative: [
        'Night thoughts triggered me.',
        '',
        'Worry parking practice.',
        '',
        'Note for morning.',
        '',
        'Anxiety dropped.',
        '',
        'I tell night-thinkers: worry parking.'
      ],
      lesson: 'Worry parking notes nighttime thoughts for morning enabling return to sleep.'
    },
    {
      id: 'adn66_13',
      title: 'My anxiety yielded to recipe testing',
      narrative: [
        'Recipe testing weekly.',
        '',
        'New cuisine.',
        '',
        'Kitchen experiment.',
        '',
        'Anxiety dropped.',
        '',
        'I tell cook-curious: recipe testing.'
      ],
      lesson: 'Weekly recipe testing provides kitchen experimentation flow for anxiety.'
    },
    {
      id: 'adn66_14',
      title: 'My anxiety triggered by my own reading speed',
      narrative: [
        'Slow reading triggered me.',
        '',
        'Pace acceptance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell slow-readers: pace acceptance.'
      ],
      lesson: 'Reading pace acceptance reduces reader comparison anxiety.'
    },
    {
      id: 'adn66_15',
      title: 'My anxiety yielded to forest walks',
      narrative: [
        'Forest walks weekly.',
        '',
        'No trail map.',
        '',
        'Wander practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-driven: aimless forest.'
      ],
      lesson: 'Aimless forest wandering reduces planning anxiety through directed surrender.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_67 = [
    {
      id: 'adn67_1',
      title: 'My anxiety yielded to morning silence',
      narrative: [
        'No words first hour daily.',
        '',
        'No phone, no podcast.',
        '',
        'Silent presence.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell talky-mornings: silent first hour.'
      ],
      lesson: 'Silent first hour of day reduces anxiety baseline through wordless presence.'
    },
    {
      id: 'adn67_2',
      title: 'My anxiety triggered by my own heating bills',
      narrative: [
        'Heating bills triggered me.',
        '',
        'Smart thermostat plus budgeting.',
        '',
        'Anxiety dropped.',
        '',
        'I tell bill-anxious: tech plus budget.'
      ],
      lesson: 'Smart thermostat plus budgeting reduces utility bill anxiety.'
    },
    {
      id: 'adn67_3',
      title: 'My anxiety yielded to swim laps',
      narrative: [
        'Lap swimming daily.',
        '',
        'Body engaged.',
        '',
        'Breath rhythm.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: lap swim.'
      ],
      lesson: 'Daily lap swimming is transformative cardio anxiety treatment.'
    },
    {
      id: 'adn67_4',
      title: 'My anxiety with my own time perception',
      narrative: [
        'Time anxiety severe.',
        '',
        'Watch removed.',
        '',
        'Trust body rhythms.',
        '',
        'Anxiety dropped.',
        '',
        'I tell time-anxious: watch removal.'
      ],
      lesson: 'Watch removal experiments reveal body-rhythm trust reducing time anxiety.'
    },
    {
      id: 'adn67_5',
      title: 'My anxiety yielded to harmonica',
      narrative: [
        'Harmonica practice daily.',
        '',
        'Breath plus music.',
        '',
        'Anxiety dropped.',
        '',
        'I tell breath-curious: harmonica.'
      ],
      lesson: 'Daily harmonica practice combines breath training with music for anxiety.'
    },
    {
      id: 'adn67_6',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future-focus triggered me.',
        '',
        'Present-moment practice.',
        '',
        'Day at a time.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: present.'
      ],
      lesson: 'Day-at-a-time present focus practice reduces future projection anxiety.'
    },
    {
      id: 'adn67_7',
      title: 'My anxiety yielded to weekend hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Body engaged hours.',
        '',
        'Nature absorbed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement plus nature absorption.'
    },
    {
      id: 'adn67_8',
      title: 'My anxiety with my own parenting',
      narrative: [
        'Parenting anxiety severe.',
        '',
        'Parent therapy specialty.',
        '',
        'Tools for self-talk.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: parent therapy.'
      ],
      lesson: 'Parent therapy specialty distinct from couples for parenting anxiety.'
    },
    {
      id: 'adn67_9',
      title: 'My anxiety yielded to studying',
      narrative: [
        'Returned to school at 45.',
        '',
        'Brain absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell adult-learners: school treats.'
      ],
      lesson: 'Adult continuing education treats anxiety through cognitive absorption.'
    },
    {
      id: 'adn67_10',
      title: 'My anxiety triggered by my own house',
      narrative: [
        'Home triggered me.',
        '',
        'Rearranged furniture.',
        '',
        'New associations built.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-triggered: environmental changes.'
      ],
      lesson: 'Furniture rearrangement builds new home associations reducing anxiety.'
    },
    {
      id: 'adn67_11',
      title: 'My anxiety yielded to museum cafe',
      narrative: [
        'Museum cafe weekly.',
        '',
        'Art plus coffee.',
        '',
        'Quiet beauty.',
        '',
        'Anxiety dropped.',
        '',
        'I tell urban-isolated: museum cafes.'
      ],
      lesson: 'Museum cafes provide third places combining art and gentle social for anxiety.'
    },
    {
      id: 'adn67_12',
      title: 'My anxiety with my own home loan',
      narrative: [
        'Mortgage anxiety severe.',
        '',
        'Financial therapist plus calculator.',
        '',
        'Reality vs fear.',
        '',
        'Anxiety reduced.',
        '',
        'I tell mortgage-anxious: facts plus therapy.'
      ],
      lesson: 'Mortgage anxiety separates from reality through financial therapy and clear calculations.'
    },
    {
      id: 'adn67_13',
      title: 'My anxiety yielded to silent reading',
      narrative: [
        'Silent reading hour daily.',
        '',
        'No phone, no music.',
        '',
        'Book absorbed.',
        '',
        'Mind quieted.',
        '',
        'I tell readers: silent reading.'
      ],
      lesson: 'Silent reading hours without media provide rare deep anxiety relief.'
    },
    {
      id: 'adn67_14',
      title: 'My anxiety triggered by my own pulse',
      narrative: [
        'Pulse awareness triggered me.',
        '',
        'Health anxiety pattern.',
        '',
        'CBT redirect.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pulse-watchers: redirect attention.'
      ],
      lesson: 'Pulse-focused health anxiety eases with CBT attention redirection.'
    },
    {
      id: 'adn67_15',
      title: 'My anxiety yielded to gentle yoga class',
      narrative: [
        'Gentle yoga 3x weekly.',
        '',
        'Body softened.',
        '',
        'Breath deepened.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck-anxious: gentle yoga.'
      ],
      lesson: 'Gentle yoga not power yoga specifically reduces anxiety through softening.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_57 = [
    {
      id: 'adn57_1',
      title: 'My anxiety yielded to walking partner',
      narrative: [
        'Daily walking partner.',
        '',
        '30 min together daily.',
        '',
        'Routine plus connection.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: walking partner.'
      ],
      lesson: 'Daily walking partner provides routine plus connection for isolation anxiety.'
    },
    {
      id: 'adn57_2',
      title: 'My anxiety triggered by my own work emails',
      narrative: [
        'Email triggered me.',
        '',
        'Three check times.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell email-anxious: three times.'
      ],
      lesson: 'Three-times-daily email checking substantially reduces email anxiety.'
    },
    {
      id: 'adn57_3',
      title: 'My anxiety yielded to weekly choir',
      narrative: [
        'Weekly choir community.',
        '',
        'Voice plus group.',
        '',
        'Anxiety dropped.',
        '',
        'I tell singing-curious: choir treatment.'
      ],
      lesson: 'Weekly community choir voice plus group treats anxiety.'
    },
    {
      id: 'adn57_4',
      title: 'My anxiety with my own success',
      narrative: [
        'Success imposter.',
        '',
        'Imposter therapy.',
        '',
        'Achievement owned.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy reduces success-triggered anxiety.'
    },
    {
      id: 'adn57_5',
      title: 'My anxiety yielded to morning porch',
      narrative: [
        'Outdoor coffee daily.',
        '',
        'Body weather aware.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: outdoor morning.'
      ],
      lesson: 'Daily outdoor morning coffee reduces home-bound anxiety.'
    },
    {
      id: 'adn57_6',
      title: 'My anxiety triggered by my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-pressured: process focus.'
      ],
      lesson: 'Process focus over goals reduces goal pressure anxiety.'
    },
    {
      id: 'adn57_7',
      title: 'My anxiety yielded to weekly bridge',
      narrative: [
        'Weekly bridge club.',
        '',
        'Strategy plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell card-curious: bridge club.'
      ],
      lesson: 'Weekly bridge clubs combine strategy plus community for anxiety.'
    },
    {
      id: 'adn57_8',
      title: 'My anxiety with my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist: good enough.'
      ],
      lesson: 'Good-enough practice reduces perfectionism anxiety.'
    },
    {
      id: 'adn57_9',
      title: 'My anxiety yielded to morning movement',
      narrative: [
        'Morning movement non-negotiable.',
        '',
        '20 min minimum.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary: morning movement.'
      ],
      lesson: 'Non-negotiable 20-minute morning movement reduces sedentary anxiety baseline.'
    },
    {
      id: 'adn57_10',
      title: 'My anxiety triggered by my own work load',
      narrative: [
        'Work load triggered me.',
        '',
        'Negotiated reduction.',
        '',
        'Anxiety dropped.',
        '',
        'I tell overworked: negotiation.'
      ],
      lesson: 'Negotiated work load reduction reduces overwork anxiety.'
    },
    {
      id: 'adn57_11',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation daily.',
        '',
        '20 min cushion.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistency-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transform anxiety baseline.'
    },
    {
      id: 'adn57_12',
      title: 'My anxiety with my own grandparenting',
      narrative: [
        'Grandparent role triggered me.',
        '',
        'New identity therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell new grandparents: identity therapy.'
      ],
      lesson: 'New grandparent role identity therapy reduces transition anxiety.'
    },
    {
      id: 'adn57_13',
      title: 'My anxiety yielded to evening walk together',
      narrative: [
        'Evening walk with partner daily.',
        '',
        'No phones.',
        '',
        '30 min connection.',
        '',
        'Anxiety dropped.',
        '',
        'I tell partnered: evening walk.'
      ],
      lesson: 'Daily phone-free evening walks with partner anchor connection for anxiety.'
    },
    {
      id: 'adn57_14',
      title: 'My anxiety triggered by my own home noise',
      narrative: [
        'Home noise triggered me.',
        '',
        'Soundproofing.',
        '',
        'Anxiety dropped.',
        '',
        'I tell noise-sensitive: soundproofing.'
      ],
      lesson: 'Home soundproofing reduces noise-triggered home anxiety.'
    },
    {
      id: 'adn57_15',
      title: 'My anxiety yielded to seasonal hiking',
      narrative: [
        'Seasonal trail walks.',
        '',
        'Year over year same trails.',
        '',
        'Earth time felt.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell outdoor-curious: seasonal trails.'
      ],
      lesson: 'Year-over-year seasonal trail walks build earth-time awareness reducing anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_58 = [
    {
      id: 'adn58_1',
      title: 'My anxiety yielded to evening yoga',
      narrative: [
        'Restorative evening yoga.',
        '',
        'Body softened.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: evening yoga.'
      ],
      lesson: 'Restorative evening yoga softens body preparing sleep reducing anxiety.'
    },
    {
      id: 'adn58_2',
      title: 'My anxiety triggered by my own posture',
      narrative: [
        'Posture triggered me.',
        '',
        'Physical therapy.',
        '',
        'Plus body awareness.',
        '',
        'Anxiety dropped.',
        '',
        'I tell posture-watchers: PT plus awareness.'
      ],
      lesson: 'PT plus body awareness reduces posture-trigger anxiety.'
    },
    {
      id: 'adn58_3',
      title: 'My anxiety yielded to weekly dance class',
      narrative: [
        'Weekly creative dance.',
        '',
        'Body free.',
        '',
        'Community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: dance.'
      ],
      lesson: 'Weekly creative dance class provides free body movement plus community.'
    },
    {
      id: 'adn58_4',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy.',
        '',
        'New dynamic.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: therapy.'
      ],
      lesson: 'Couples therapy builds new dynamic reducing marriage anxiety.'
    },
    {
      id: 'adn58_5',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly weekend retreat.',
        '',
        'Solo alone.',
        '',
        'Anxiety reset monthly.',
        '',
        'I tell stressed: retreat treatment.'
      ],
      lesson: 'Monthly solo weekend retreats reset anxiety baseline.'
    },
    {
      id: 'adn58_6',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Today only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today.'
      ],
      lesson: 'Today-only present focus reduces future projection anxiety.'
    },
    {
      id: 'adn58_7',
      title: 'My anxiety yielded to fish tank',
      narrative: [
        'Fish tank watching daily.',
        '',
        'Bubbler sound.',
        '',
        'Nervous system softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: aquarium.'
      ],
      lesson: 'Daily fish tank watching softens nervous system for anxiety relief.'
    },
    {
      id: 'adn58_8',
      title: 'My anxiety with my own children',
      narrative: [
        'Child worry triggered me.',
        '',
        'Parent therapy.',
        '',
        'Uncertainty tolerance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty practice.'
      ],
      lesson: 'Parent uncertainty therapy reduces child-worry anxiety.'
    },
    {
      id: 'adn58_9',
      title: 'My anxiety yielded to weekly running',
      narrative: [
        '5K runs three weekly.',
        '',
        'Body processed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck: running treatment.'
      ],
      lesson: 'Three weekly 5K runs substantially process body stress for anxiety.'
    },
    {
      id: 'adn58_10',
      title: 'My anxiety triggered by my own age',
      narrative: [
        'Aging triggered me.',
        '',
        'Aging acceptance therapy.',
        '',
        'Plus elder mentors.',
        '',
        'Anxiety reduced.',
        '',
        'I tell aging-anxious: acceptance plus mentors.'
      ],
      lesson: 'Aging acceptance therapy plus elder mentor relationships reduce aging anxiety.'
    },
    {
      id: 'adn58_11',
      title: 'My anxiety yielded to dawn light',
      narrative: [
        'Dawn light daily.',
        '',
        'East porch.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: dawn light.'
      ],
      lesson: 'Daily dawn light viewing aligns circadian for anxiety reduction.'
    },
    {
      id: 'adn58_12',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative pressure triggered me.',
        '',
        'Play over performance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell creative-pressured: play.'
      ],
      lesson: 'Play-over-performance reframe reduces creative pressure anxiety.'
    },
    {
      id: 'adn58_13',
      title: 'My anxiety yielded to morning bird watching',
      narrative: [
        'Morning bird feeder.',
        '',
        'Patient observation.',
        '',
        'Species learned.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell observation-curious: bird ritual.'
      ],
      lesson: 'Morning bird feeder watching builds patient observation for anxiety baseline.'
    },
    {
      id: 'adn58_14',
      title: 'My anxiety triggered by my own appearance',
      narrative: [
        'Appearance triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell appearance-anxious: neutrality.'
      ],
      lesson: 'Body neutrality therapy reduces appearance-triggered anxiety.'
    },
    {
      id: 'adn58_15',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day surrendered.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer.'
      ],
      lesson: 'Evening prayer practice surrenders day reducing pre-sleep anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_59 = [
    {
      id: 'adn59_1',
      title: 'My anxiety yielded to weekly volunteering',
      narrative: [
        'Weekly food pantry volunteer.',
        '',
        'Service plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell purpose-seeking: weekly service.'
      ],
      lesson: 'Weekly food pantry service provides purpose plus community for anxiety.'
    },
    {
      id: 'adn59_2',
      title: 'My anxiety triggered by my own time',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Buffer everywhere.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pressed-time: buffer.'
      ],
      lesson: 'Buffer time everywhere reduces time pressure anxiety.'
    },
    {
      id: 'adn59_3',
      title: 'My anxiety yielded to morning yoga class',
      narrative: [
        'Morning yoga class 6am.',
        '',
        'Community plus body.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: morning class.'
      ],
      lesson: 'Morning 6am yoga class provides community plus body for baseline anxiety.'
    },
    {
      id: 'adn59_4',
      title: 'My anxiety with my own news',
      narrative: [
        'News triggered me.',
        '',
        'Weekly print summary.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print.'
      ],
      lesson: 'Weekly print news summaries substantially reduce news anxiety.'
    },
    {
      id: 'adn59_5',
      title: 'My anxiety yielded to bath ritual',
      narrative: [
        'Bath ritual twice weekly.',
        '',
        'Salts oils candles.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: bath ritual.'
      ],
      lesson: 'Twice-weekly elaborate bath rituals soften body for anxiety.'
    },
    {
      id: 'adn59_6',
      title: 'My anxiety triggered by my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum.'
      ],
      lesson: 'Tech minimum approach reduces tech-overwhelmed anxiety.'
    },
    {
      id: 'adn59_7',
      title: 'My anxiety yielded to community garden',
      narrative: [
        'Community garden plot.',
        '',
        'Weekly work.',
        '',
        'Neighbors known.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell urban-isolated: community gardens.'
      ],
      lesson: 'Community garden plots provide weekly work with neighbor connection.'
    },
    {
      id: 'adn59_8',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Sabbatical.',
        '',
        'Boundaries on return.',
        '',
        'Anxiety reduced.',
        '',
        'I tell work-anxious: sabbatical.'
      ],
      lesson: 'Sabbatical with boundary-protected return reduces work anxiety.'
    },
    {
      id: 'adn59_9',
      title: 'My anxiety yielded to morning porch coffee',
      narrative: [
        'Morning porch coffee daily.',
        '',
        'All weather.',
        '',
        'Body aware.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-bound: outdoor morning.'
      ],
      lesson: 'All-weather outdoor morning porch coffee substantially reduces anxiety.'
    },
    {
      id: 'adn59_10',
      title: 'My anxiety triggered by my own loneliness',
      narrative: [
        'Loneliness triggered me.',
        '',
        'Three weekly contacts.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell lonely: three contacts.'
      ],
      lesson: 'Three weekly social contacts substantially reduce loneliness anxiety.'
    },
    {
      id: 'adn59_11',
      title: 'My anxiety yielded to evening sketching',
      narrative: [
        'Evening sketch daily.',
        '',
        'Pencil paper.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell evening-anxious: sketching.'
      ],
      lesson: 'Daily evening sketching absorbs mind for pre-sleep anxiety relief.'
    },
    {
      id: 'adn59_12',
      title: 'My anxiety with my own health',
      narrative: [
        'Health anxiety chronic.',
        '',
        'CBT for health.',
        '',
        'Single doctor channel.',
        '',
        'Anxiety reduced.',
        '',
        'I tell health-anxious: CBT plus doctor.'
      ],
      lesson: 'Health anxiety CBT plus single trusted doctor channel reduces anxiety.'
    },
    {
      id: 'adn59_13',
      title: 'My anxiety yielded to seasonal cooking',
      narrative: [
        'Seasonal recipes weekly.',
        '',
        'Body aligned with foods.',
        '',
        'Anxiety dropped.',
        '',
        'I tell cooking-curious: seasonal.'
      ],
      lesson: 'Seasonal recipe cooking aligns body with foods reducing seasonal anxiety.'
    },
    {
      id: 'adn59_14',
      title: 'My anxiety triggered by my own success',
      narrative: [
        'Success imposter.',
        '',
        'Imposter therapy.',
        '',
        'Achievement owned.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy reduces success-triggered imposter anxiety.'
    },
    {
      id: 'adn59_15',
      title: 'My anxiety yielded to weekly gallery',
      narrative: [
        'Weekly art gallery.',
        '',
        'Free entry.',
        '',
        'Beauty absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell beauty-craving: free galleries.'
      ],
      lesson: 'Weekly free art gallery visits provide beauty absorption for anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_60 = [
    {
      id: 'adn60_1',
      title: 'My anxiety yielded to early bedtime',
      narrative: [
        '9pm bedtime hard.',
        '',
        '6am wake.',
        '',
        '9 hours nightly.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: early bedtime.'
      ],
      lesson: 'Hard 9pm bedtime with 9 hours nightly substantially reduces sleep-deficient anxiety.'
    },
    {
      id: 'adn60_2',
      title: 'My anxiety triggered by my own deadlines',
      narrative: [
        'Deadlines paralyzed me.',
        '',
        'ADHD coach.',
        '',
        'Deadline tools.',
        '',
        'Anxiety reduced.',
        '',
        'I tell deadline-stuck: ADHD coach.'
      ],
      lesson: 'ADHD coaching tools reduce deadline-paralysis anxiety.'
    },
    {
      id: 'adn60_3',
      title: 'My anxiety yielded to crochet daily',
      narrative: [
        'Crochet daily hour.',
        '',
        'Years of practice.',
        '',
        'Hands plus mind.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell hands-busy: crochet.'
      ],
      lesson: 'Daily crochet hour over years reduces baseline anxiety through hand-mind engagement.'
    },
    {
      id: 'adn60_4',
      title: 'My anxiety with my own elder care',
      narrative: [
        'Elder care triggered me.',
        '',
        'Caregiver therapy.',
        '',
        'Plus respite.',
        '',
        'Anxiety reduced.',
        '',
        'I tell sandwich: caregiver therapy.'
      ],
      lesson: 'Sandwich generation caregiver therapy plus respite reduces elder care anxiety.'
    },
    {
      id: 'adn60_5',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly friend potluck.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: potluck ritual.'
      ],
      lesson: 'Weekly friend potluck rituals provide food plus community anchor.'
    },
    {
      id: 'adn60_6',
      title: 'My anxiety triggered by my own past',
      narrative: [
        'Past triggered me.',
        '',
        'Trauma therapy.',
        '',
        'Memories integrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell past-stricken: trauma therapy.'
      ],
      lesson: 'Trauma therapy integrates past reducing past-trigger anxiety.'
    },
    {
      id: 'adn60_7',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Nature absorbed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike ritual.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement and nature for anxiety.'
    },
    {
      id: 'adn60_8',
      title: 'My anxiety with my own retirement',
      narrative: [
        'Retirement triggered me.',
        '',
        'Retirement coach.',
        '',
        'Plus therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pre-retirement: coach plus therapy.'
      ],
      lesson: 'Retirement coach plus therapy team reduces retirement transition anxiety.'
    },
    {
      id: 'adn60_9',
      title: 'My anxiety yielded to morning bird watching',
      narrative: [
        'Morning bird feeder daily.',
        '',
        'Patient observation.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell observation-curious: bird ritual.'
      ],
      lesson: 'Morning bird feeder watching builds patient observation for anxiety baseline.'
    },
    {
      id: 'adn60_10',
      title: 'My anxiety triggered by my own self-talk',
      narrative: [
        'Inner critic triggered me.',
        '',
        'Self-compassion practice.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-critical: compassion.'
      ],
      lesson: 'Self-compassion practice softens inner critic reducing self-talk anxiety.'
    },
    {
      id: 'adn60_11',
      title: 'My anxiety yielded to weekly bridge',
      narrative: [
        'Weekly bridge club.',
        '',
        'Strategy community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell card-curious: bridge welcomes.'
      ],
      lesson: 'Weekly bridge clubs combine strategy and community for adult anxiety.'
    },
    {
      id: 'adn60_12',
      title: 'My anxiety with my own clothing',
      narrative: [
        'Clothing triggered me.',
        '',
        'Capsule wardrobe.',
        '',
        'Decision removed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: capsule.'
      ],
      lesson: 'Capsule wardrobe removes daily clothing decision anxiety.'
    },
    {
      id: 'adn60_13',
      title: 'My anxiety yielded to morning gratitude',
      narrative: [
        'Three gratitudes morning.',
        '',
        'Brain shifted.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell mood-stuck: gratitude.'
      ],
      lesson: 'Daily morning three gratitudes shift brain reducing anxiety baseline.'
    },
    {
      id: 'adn60_14',
      title: 'My anxiety triggered by my own boundaries',
      narrative: [
        'Boundaries triggered me.',
        '',
        'Boundary therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boundary-difficult: therapy.'
      ],
      lesson: 'Boundary therapy reduces boundary-difficulty anxiety.'
    },
    {
      id: 'adn60_15',
      title: 'My anxiety yielded to acceptance',
      narrative: [
        'Acceptance was the unlock.',
        '',
        'Fighting prolonged waves.',
        '',
        'Welcoming shortened them.',
        '',
        'Counterintuitive truth.',
        '',
        'I tell fighters: acceptance unlocks.'
      ],
      lesson: 'Anxiety acceptance unlocks long-term relief; fighting prolongs waves.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_51 = [
    {
      id: 'adn51_1',
      title: 'My anxiety yielded to morning silence',
      narrative: [
        'No words first hour daily.',
        '',
        'No phone, no podcast.',
        '',
        'Silent presence.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell talky-mornings: silent first hour treatment.'
      ],
      lesson: 'Silent first hour of day reduces anxiety baseline through wordless presence.'
    },
    {
      id: 'adn51_2',
      title: 'My anxiety triggered by my own home alarm',
      narrative: [
        'Alarm system triggered me.',
        '',
        'Removed system.',
        '',
        'Better locks installed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell alarm-anxious: tool reassessment.'
      ],
      lesson: 'Alarm system reassessment with better locks substantially reduces alarm anxiety.'
    },
    {
      id: 'adn51_3',
      title: 'My anxiety yielded to journaling',
      narrative: [
        'Morning pages 3 daily.',
        '',
        'Brain dump format.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell journaling-curious: morning pages classic.'
      ],
      lesson: 'Three morning pages daily over years substantially reduces anxiety baseline.'
    },
    {
      id: 'adn51_4',
      title: 'My anxiety with my own fertility',
      narrative: [
        'Fertility journey triggered me.',
        '',
        'Reproductive psychology.',
        '',
        'Decision support.',
        '',
        'Anxiety managed.',
        '',
        'I tell trying: reproductive psychology specialty.'
      ],
      lesson: 'Fertility journey needs reproductive psychology specialty support throughout.'
    },
    {
      id: 'adn51_5',
      title: 'My anxiety yielded to morning pages',
      narrative: [
        '3 pages handwritten daily.',
        '',
        'Free flow writing.',
        '',
        'Worries externalized.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell journaling-curious: 3 morning pages.'
      ],
      lesson: 'Daily three handwritten morning pages externalize worries reducing anxiety baseline.'
    },
    {
      id: 'adn51_6',
      title: 'My anxiety triggered by my own dating',
      narrative: [
        'Dating triggered me.',
        '',
        'Dating coach plus therapy.',
        '',
        'Skill plus inner work.',
        '',
        'Found partner.',
        '',
        'I tell dating-anxious: coach plus therapy.'
      ],
      lesson: 'Dating anxiety eases with combined coach skill and inner therapy work.'
    },
    {
      id: 'adn51_7',
      title: 'My anxiety yielded to monthly art class',
      narrative: [
        'Monthly art class.',
        '',
        'New techniques.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell creative-curious: monthly art class.'
      ],
      lesson: 'Monthly art classes provide new techniques plus community for anxiety relief.'
    },
    {
      id: 'adn51_8',
      title: 'My anxiety with my own income',
      narrative: [
        'Income anxiety chronic.',
        '',
        'Financial therapist.',
        '',
        'Plus emergency fund.',
        '',
        'Anxiety reduced.',
        '',
        'I tell income-anxious: therapy plus fund.'
      ],
      lesson: 'Financial therapy plus emergency fund reduces income-uncertainty anxiety.'
    },
    {
      id: 'adn51_9',
      title: 'My anxiety yielded to evening sketching',
      narrative: [
        'Evening sketch daily.',
        '',
        'Pencil, paper, mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell evening-anxious: sketching daily.'
      ],
      lesson: 'Daily evening sketching absorbs mind for pre-sleep anxiety relief.'
    },
    {
      id: 'adn51_10',
      title: 'My anxiety triggered by my own commute',
      narrative: [
        'Commute triggered me.',
        '',
        'Off-peak schedule.',
        '',
        'Plus chosen content.',
        '',
        'Anxiety reduced.',
        '',
        'I tell commute-anxious: shift plus content.'
      ],
      lesson: 'Off-peak commute schedule with chosen content reduces commute anxiety.'
    },
    {
      id: 'adn51_11',
      title: 'My anxiety yielded to weekly bridge',
      narrative: [
        'Weekly bridge club.',
        '',
        'Strategy plus community.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell card-curious: bridge welcomes adults.'
      ],
      lesson: 'Weekly bridge clubs combine strategy with community for adult anxiety relief.'
    },
    {
      id: 'adn51_12',
      title: 'My anxiety with my own self-image',
      narrative: [
        'Self-image triggered me.',
        '',
        'Identity therapy.',
        '',
        'Self-concept solidified.',
        '',
        'Anxiety reduced.',
        '',
        'I tell identity-anxious: identity therapy.'
      ],
      lesson: 'Identity therapy solidifies self-concept reducing self-image anxiety.'
    },
    {
      id: 'adn51_13',
      title: 'My anxiety yielded to weekly farmers market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh produce, neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: market ritual.'
      ],
      lesson: 'Weekly Saturday farmers market anchors week for isolated anxiety.'
    },
    {
      id: 'adn51_14',
      title: 'My anxiety triggered by my own house cleaning',
      narrative: [
        'Cleaning triggered me.',
        '',
        'Professional cleaner.',
        '',
        'Plus therapy on perfectionism.',
        '',
        'Anxiety reduced.',
        '',
        'I tell cleaning-anxious: professional plus therapy.'
      ],
      lesson: 'Professional house cleaner plus perfectionism therapy reduces cleaning anxiety.'
    },
    {
      id: 'adn51_15',
      title: 'My anxiety yielded to monthly silent day',
      narrative: [
        'Monthly silent day.',
        '',
        'Phone off, words limited.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell busy-stressed: monthly silent treatment.'
      ],
      lesson: 'Monthly silent days reset nervous system for busy-stressed anxiety baseline.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_52 = [
    {
      id: 'adn52_1',
      title: 'My anxiety yielded to crochet daily',
      narrative: [
        'Crochet evening hour daily.',
        '',
        'Hands busy, mind eased.',
        '',
        'Years of practice.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell hands-busy: crochet treatment.'
      ],
      lesson: 'Daily evening crochet hour over years substantially reduces anxiety baseline.'
    },
    {
      id: 'adn52_2',
      title: 'My anxiety triggered by my own elder care',
      narrative: [
        'Elder care triggered me.',
        '',
        'Caregivers therapy.',
        '',
        'Plus respite care.',
        '',
        'Anxiety reduced.',
        '',
        'I tell sandwich generation: caregiver therapy.'
      ],
      lesson: 'Sandwich generation caregiver therapy plus respite reduces elder care anxiety.'
    },
    {
      id: 'adn52_3',
      title: 'My anxiety yielded to weekly volunteering',
      narrative: [
        'Weekly food pantry volunteer.',
        '',
        'Service plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell purpose-seeking: weekly service.'
      ],
      lesson: 'Weekly food pantry service provides purpose plus community for anxiety relief.'
    },
    {
      id: 'adn52_4',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Sabbatical.',
        '',
        'Returned with boundaries.',
        '',
        'Anxiety reduced.',
        '',
        'I tell work-anxious: sabbatical treatment.'
      ],
      lesson: 'Sabbatical with boundary-protected return reduces work-triggered anxiety.'
    },
    {
      id: 'adn52_5',
      title: 'My anxiety yielded to morning walk',
      narrative: [
        'Morning walk 30 min daily.',
        '',
        'Body engaged early.',
        '',
        'Day grounded.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary mornings: walk treatment.'
      ],
      lesson: 'Daily 30-minute morning walks ground day reducing baseline anxiety.'
    },
    {
      id: 'adn52_6',
      title: 'My anxiety triggered by my own time',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Buffer everywhere.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell time-pressed: buffer treatment.'
      ],
      lesson: 'Buffer time everywhere substantially reduces time pressure anxiety.'
    },
    {
      id: 'adn52_7',
      title: 'My anxiety yielded to bird feeder',
      narrative: [
        'Window bird feeder.',
        '',
        'Daily watching.',
        '',
        'Mind eased.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: bird feeder treatment.'
      ],
      lesson: 'Window bird feeders provide daily watching for home-bound anxiety relief.'
    },
    {
      id: 'adn52_8',
      title: 'My anxiety with my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-pressured: process focus.'
      ],
      lesson: 'Process focus over goal pressure reduces goal-pressure anxiety.'
    },
    {
      id: 'adn52_9',
      title: 'My anxiety yielded to evening yoga',
      narrative: [
        'Restorative evening yoga.',
        '',
        'Body softened.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: yoga sleep prep.'
      ],
      lesson: 'Restorative evening yoga softens body preparing sleep reducing anxiety.'
    },
    {
      id: 'adn52_10',
      title: 'My anxiety triggered by my own success',
      narrative: [
        'Success triggered me.',
        '',
        'Imposter therapy.',
        '',
        'Achievement owned.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy owns achievement reducing success-triggered anxiety.'
    },
    {
      id: 'adn52_11',
      title: 'My anxiety yielded to long walks',
      narrative: [
        'Daily 2 hour walks.',
        '',
        'Same trail.',
        '',
        'Body rhythm.',
        '',
        'Mind sorted.',
        '',
        'Anxiety processed.',
        '',
        'I tell anxiety sufferers: long walks process.'
      ],
      lesson: 'Daily 2-hour walks process anxiety through sustained body rhythm.'
    },
    {
      id: 'adn52_12',
      title: 'My anxiety with my own creative work',
      narrative: [
        'Creative anxiety chronic.',
        '',
        'Process therapy.',
        '',
        'Play over performance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell creative-anxious: play treatment.'
      ],
      lesson: 'Creative process therapy with play-over-performance reduces creative anxiety.'
    },
    {
      id: 'adn52_13',
      title: 'My anxiety yielded to morning coffee porch',
      narrative: [
        'Outdoor coffee daily all weather.',
        '',
        'Body weather aware.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell tech-tethered: outdoor morning.'
      ],
      lesson: 'All-weather outdoor morning coffee builds weather awareness substantially reducing anxiety.'
    },
    {
      id: 'adn52_14',
      title: 'My anxiety triggered by my own news',
      narrative: [
        'News triggered me.',
        '',
        'Weekly print summary.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print.'
      ],
      lesson: 'Weekly print news summaries substantially reduce news anxiety.'
    },
    {
      id: 'adn52_15',
      title: 'My anxiety yielded to community choir',
      narrative: [
        'Weekly choir.',
        '',
        'Voice plus group.',
        '',
        'Anxiety dropped.',
        '',
        'I tell singing-curious: choir treatment.'
      ],
      lesson: 'Weekly community choir provides voice plus group engagement for anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_53 = [
    {
      id: 'adn53_1',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Daily 20 min morning meditation.',
        '',
        'Years consistent.',
        '',
        'Brain measurably changed.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistency-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation measurably transforms anxiety baseline.'
    },
    {
      id: 'adn53_2',
      title: 'My anxiety triggered by my own appearance',
      narrative: [
        'Appearance triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Function celebrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell appearance-anxious: neutrality therapy.'
      ],
      lesson: 'Body neutrality therapy with function celebration reduces appearance anxiety.'
    },
    {
      id: 'adn53_3',
      title: 'My anxiety yielded to weekly therapy',
      narrative: [
        'Weekly therapy years.',
        '',
        'Consistent processing.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell on-fence: years of therapy transform.'
      ],
      lesson: 'Years of consistent weekly therapy transforms anxiety baseline.'
    },
    {
      id: 'adn53_4',
      title: 'My anxiety with my own children',
      narrative: [
        'Child worry triggered me.',
        '',
        'Parent therapy.',
        '',
        'Tolerating uncertainty.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty therapy.'
      ],
      lesson: 'Parent therapy on uncertainty tolerance reduces child-worry anxiety.'
    },
    {
      id: 'adn53_5',
      title: 'My anxiety yielded to weekly running',
      narrative: [
        '5K runs three weekly.',
        '',
        'Body processed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck: running treatment.'
      ],
      lesson: 'Three weekly 5K runs process body stress for substantial anxiety relief.'
    },
    {
      id: 'adn53_6',
      title: 'My anxiety triggered by my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy years.',
        '',
        'New dynamic.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: couples therapy.'
      ],
      lesson: 'Years of couples therapy build new dynamic reducing marriage anxiety.'
    },
    {
      id: 'adn53_7',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Nature absorbed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike treatment.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement plus nature for anxiety.'
    },
    {
      id: 'adn53_8',
      title: 'My anxiety with my own holiday',
      narrative: [
        'Holiday triggered me.',
        '',
        'New traditions.',
        '',
        'Stress reduced.',
        '',
        'Anxiety reduced.',
        '',
        'I tell holiday-anxious: new traditions.'
      ],
      lesson: 'Building new holiday traditions reduces holiday-triggered anxiety.'
    },
    {
      id: 'adn53_9',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool daily.',
        '',
        'Quiet pool.',
        '',
        'Body engaged early.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: pre-work swim.'
      ],
      lesson: 'Pre-work 6am pool engages body early reducing anxiety baseline.'
    },
    {
      id: 'adn53_10',
      title: 'My anxiety triggered by my own loneliness',
      narrative: [
        'Loneliness triggered me.',
        '',
        'Three weekly contacts.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell lonely: three contacts treatment.'
      ],
      lesson: 'Three weekly social contacts substantially reduce loneliness anxiety.'
    },
    {
      id: 'adn53_11',
      title: 'My anxiety yielded to morning porch',
      narrative: [
        'Morning porch sitting daily.',
        '',
        'Coffee plus weather.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell home-bound: porch morning.'
      ],
      lesson: 'Daily morning porch sitting with coffee and weather reduces anxiety baseline.'
    },
    {
      id: 'adn53_12',
      title: 'My anxiety with my own work load',
      narrative: [
        'Work load triggered me.',
        '',
        'Negotiated reduction.',
        '',
        'Anxiety dropped.',
        '',
        'I tell overworked: negotiation treatment.'
      ],
      lesson: 'Negotiated work load reduction reduces overwork-load anxiety.'
    },
    {
      id: 'adn53_13',
      title: 'My anxiety yielded to weekly book club',
      narrative: [
        'Monthly book club.',
        '',
        'Reading anchor.',
        '',
        'Community discussion.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book club treatment.'
      ],
      lesson: 'Monthly book club combines reading anchor with community discussion for anxiety.'
    },
    {
      id: 'adn53_14',
      title: 'My anxiety triggered by my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum treatment.'
      ],
      lesson: 'Tech minimum approach reduces tech-overwhelmed anxiety.'
    },
    {
      id: 'adn53_15',
      title: 'My anxiety yielded to dawn light',
      narrative: [
        'Dawn light daily.',
        '',
        'East porch.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell circadian-disrupted: dawn light.'
      ],
      lesson: 'Daily dawn light viewing aligns circadian for anxiety reduction.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_54 = [
    {
      id: 'adn54_1',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly solo weekend retreat.',
        '',
        'Cabin no service.',
        '',
        'Reading walking.',
        '',
        'Anxiety reset monthly.',
        '',
        'I tell stressed: monthly retreat.'
      ],
      lesson: 'Monthly solo weekend retreats reset anxiety baseline for stressed.'
    },
    {
      id: 'adn54_2',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Today only practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today practice.'
      ],
      lesson: 'Today-only practice reduces future-projection anxiety.'
    },
    {
      id: 'adn54_3',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly potluck friends.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: potluck ritual.'
      ],
      lesson: 'Weekly friend potluck rituals provide food plus community anchor for anxiety.'
    },
    {
      id: 'adn54_4',
      title: 'My anxiety with my own pace',
      narrative: [
        'Pace comparison triggered me.',
        '',
        'Own pace honored.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pace-comparing: own pace.'
      ],
      lesson: 'Honoring own pace over comparison reduces pace anxiety.'
    },
    {
      id: 'adn54_5',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Evening tea ritual.',
        '',
        'Chamomile or lavender.',
        '',
        'Sleep prep.',
        '',
        'I tell pre-sleep: tea ritual.'
      ],
      lesson: 'Evening tea ritual prepares pre-sleep anxiety reduction.'
    },
    {
      id: 'adn54_6',
      title: 'My anxiety triggered by my own deadlines',
      narrative: [
        'Deadlines paralyzed me.',
        '',
        'ADHD coach.',
        '',
        'Tools for deadlines.',
        '',
        'Anxiety reduced.',
        '',
        'I tell deadline-stuck: ADHD coach.'
      ],
      lesson: 'ADHD coaching tools reduce deadline-paralysis anxiety.'
    },
    {
      id: 'adn54_7',
      title: 'My anxiety yielded to morning yoga',
      narrative: [
        'Daily morning yoga.',
        '',
        'Body opened.',
        '',
        'Breath deepened.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: morning yoga.'
      ],
      lesson: 'Daily morning yoga opens body and deepens breath for anxiety baseline.'
    },
    {
      id: 'adn54_8',
      title: 'My anxiety with my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist: good enough.'
      ],
      lesson: 'Good-enough practice reduces perfectionism-driven anxiety.'
    },
    {
      id: 'adn54_9',
      title: 'My anxiety yielded to weekly running club',
      narrative: [
        'Weekly running club.',
        '',
        'Body engaged plus community.',
        '',
        'Race training together.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell solo-runners: club treatment.'
      ],
      lesson: 'Weekly running clubs combine body engagement and community for anxiety.'
    },
    {
      id: 'adn54_10',
      title: 'My anxiety triggered by my own home',
      narrative: [
        'Home triggered me.',
        '',
        'Moved.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-triggered: relocation treatment.'
      ],
      lesson: 'Relocation is legitimate anxiety treatment when home itself triggers.'
    },
    {
      id: 'adn54_11',
      title: 'My anxiety yielded to seasonal traditions',
      narrative: [
        'Seasonal traditions year round.',
        '',
        'Body aligned with time.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless: traditions ground.'
      ],
      lesson: 'Year-round seasonal traditions ground body in time reducing rootless anxiety.'
    },
    {
      id: 'adn54_12',
      title: 'My anxiety with my own self-talk',
      narrative: [
        'Inner critic triggered me.',
        '',
        'Self-compassion practice.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-critical: compassion practice.'
      ],
      lesson: 'Self-compassion practice softens inner critic reducing self-talk anxiety.'
    },
    {
      id: 'adn54_13',
      title: 'My anxiety yielded to morning gratitude',
      narrative: [
        'Three gratitudes morning daily.',
        '',
        'Brain shifted.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell mood-stuck: gratitude practice.'
      ],
      lesson: 'Daily morning three gratitudes shift brain reducing anxiety baseline.'
    },
    {
      id: 'adn54_14',
      title: 'My anxiety triggered by my own health',
      narrative: [
        'Health anxiety chronic.',
        '',
        'CBT for health anxiety.',
        '',
        'Single doctor channel.',
        '',
        'Anxiety reduced.',
        '',
        'I tell health-anxious: CBT plus single doctor.'
      ],
      lesson: 'Health anxiety responds to CBT specifically plus single trusted doctor channel.'
    },
    {
      id: 'adn54_15',
      title: 'My anxiety yielded to acceptance',
      narrative: [
        'Fought anxiety for years.',
        '',
        'Therapist: welcome the wave.',
        '',
        'Acceptance opened path.',
        '',
        'Wave passed faster.',
        '',
        'I tell fighters: acceptance unlock.'
      ],
      lesson: 'Acceptance over fighting anxiety shortens waves and unlocks long-term relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_55 = [
    {
      id: 'adn55_1',
      title: 'My anxiety yielded to weekly chess',
      narrative: [
        'Weekly chess club.',
        '',
        'Strategy plus community.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell strategy-curious: chess clubs.'
      ],
      lesson: 'Weekly chess clubs combine strategy plus community for anxiety relief.'
    },
    {
      id: 'adn55_2',
      title: 'My anxiety triggered by my own work email',
      narrative: [
        'Work email triggered me.',
        '',
        'Three check times daily.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell email-anxious workers: three times.'
      ],
      lesson: 'Three-times-daily work email checking substantially reduces email anxiety.'
    },
    {
      id: 'adn55_3',
      title: 'My anxiety yielded to community pottery',
      narrative: [
        'Community pottery studio weekly.',
        '',
        'Wheel throwing plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: community studios.'
      ],
      lesson: 'Weekly community pottery studios combine wheel throwing and community for anxiety.'
    },
    {
      id: 'adn55_4',
      title: 'My anxiety with my own work pace',
      narrative: [
        'Work pace triggered me.',
        '',
        'Slower role found.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade conscious.',
        '',
        'I tell fast-paced: slower role.'
      ],
      lesson: 'Trading pace for income through slower work role can be conscious anxiety treatment.'
    },
    {
      id: 'adn55_5',
      title: 'My anxiety yielded to woodworking',
      narrative: [
        'Garage workshop evenings.',
        '',
        'Tools wood projects.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell hands-on: workshop treatment.'
      ],
      lesson: 'Garage workshop evenings provide tool-wood-project absorption for anxiety.'
    },
    {
      id: 'adn55_6',
      title: 'My anxiety triggered by my own social media',
      narrative: [
        'Platforms triggered me.',
        '',
        'All accounts deleted.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-anxious: deletion.'
      ],
      lesson: 'Social media account deletion substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn55_7',
      title: 'My anxiety yielded to weekly market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh food neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: market ritual.'
      ],
      lesson: 'Weekly Saturday markets anchor week with fresh food and neighbor community.'
    },
    {
      id: 'adn55_8',
      title: 'My anxiety with my own anger',
      narrative: [
        'Anger triggered me.',
        '',
        'Anger therapy.',
        '',
        'Signal not enemy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: signal therapy.'
      ],
      lesson: 'Anger as signal therapy reduces anger-trigger anxiety.'
    },
    {
      id: 'adn55_9',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer 15 min daily.',
        '',
        'Faith plus calm.',
        '',
        'Day grounded.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell faithful: morning prayer.'
      ],
      lesson: 'Daily 15-minute morning prayer grounds day reducing anxiety baseline.'
    },
    {
      id: 'adn55_10',
      title: 'My anxiety triggered by my own memory',
      narrative: [
        'Memory loss triggered me.',
        '',
        'Memory tools.',
        '',
        'Plus aging acceptance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell memory-anxious: tools acceptance.'
      ],
      lesson: 'Memory tools plus aging acceptance reduce memory-loss anxiety.'
    },
    {
      id: 'adn55_11',
      title: 'My anxiety yielded to morning sun',
      narrative: [
        'Morning sun 10 min outside daily.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: morning sun.'
      ],
      lesson: 'Ten minutes daily outdoor morning sun aligns circadian reducing anxiety.'
    },
    {
      id: 'adn55_12',
      title: 'My anxiety with my own income',
      narrative: [
        'Income anxiety chronic.',
        '',
        'Financial therapist plus fund.',
        '',
        'Anxiety reduced.',
        '',
        'I tell income-anxious: therapy plus fund.'
      ],
      lesson: 'Financial therapy plus emergency fund reduces income uncertainty anxiety.'
    },
    {
      id: 'adn55_13',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike ritual.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement for weekend anxiety relief.'
    },
    {
      id: 'adn55_14',
      title: 'My anxiety triggered by my own boundaries',
      narrative: [
        'Boundaries triggered me.',
        '',
        'Boundary therapy.',
        '',
        'Practiced no.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boundary-difficult: therapy.'
      ],
      lesson: 'Boundary therapy practices saying no reducing boundary-difficulty anxiety.'
    },
    {
      id: 'adn55_15',
      title: 'My anxiety yielded to early bedtime',
      narrative: [
        '9pm bedtime hard.',
        '',
        '6am wake.',
        '',
        '9 hours nightly.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: early bedtime.'
      ],
      lesson: 'Hard 9pm bedtime with 9 hours nightly substantially reduces sleep-deficient anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_56 = [
    {
      id: 'adn56_1',
      title: 'My anxiety yielded to weekly therapy',
      narrative: [
        'Weekly therapy for 5 years.',
        '',
        'Consistent processing.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell on-fence: years of therapy.'
      ],
      lesson: 'Five years of weekly therapy consistent processing transforms anxiety baseline.'
    },
    {
      id: 'adn56_2',
      title: 'My anxiety triggered by my own clothing',
      narrative: [
        'Clothing decisions triggered me.',
        '',
        'Capsule wardrobe.',
        '',
        'Decision removed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: capsule.'
      ],
      lesson: 'Capsule wardrobe removes daily clothing decisions reducing decision anxiety.'
    },
    {
      id: 'adn56_3',
      title: 'My anxiety yielded to weekly bird walk',
      narrative: [
        'Weekly bird walk group.',
        '',
        'Community plus observation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: bird group.'
      ],
      lesson: 'Weekly bird walk groups combine community plus patient observation for anxiety.'
    },
    {
      id: 'adn56_4',
      title: 'My anxiety with my own retirement',
      narrative: [
        'Retirement triggered me.',
        '',
        'Retirement coach plus therapy.',
        '',
        'Plan plus identity built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pre-retirement: coach plus therapy.'
      ],
      lesson: 'Retirement coach plus therapy team builds plan plus identity reducing anxiety.'
    },
    {
      id: 'adn56_5',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        'Daily 6am swim.',
        '',
        'Body engaged early.',
        '',
        'Day clear.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: pre-work swim.'
      ],
      lesson: 'Daily 6am morning swim engages body early reducing anxiety baseline.'
    },
    {
      id: 'adn56_6',
      title: 'My anxiety triggered by my own thoughts',
      narrative: [
        'Thought spirals triggered me.',
        '',
        'Mindfulness practice.',
        '',
        'Thoughts as clouds.',
        '',
        'Anxiety reduced.',
        '',
        'I tell spiral-stuck: clouds practice.'
      ],
      lesson: 'Mindfulness thoughts-as-clouds practice reduces spiral-stuck anxiety.'
    },
    {
      id: 'adn56_7',
      title: 'My anxiety yielded to monthly book swap',
      narrative: [
        'Monthly book swap friends.',
        '',
        'Books plus stories.',
        '',
        'Connection ritualized.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book swap ritual.'
      ],
      lesson: 'Monthly book swap rituals connect readers through book and story exchange.'
    },
    {
      id: 'adn56_8',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative blocks triggered me.',
        '',
        'Therapy on creative anxiety.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell creative-blocked: process therapy.'
      ],
      lesson: 'Creative process therapy reduces block-related creative anxiety.'
    },
    {
      id: 'adn56_9',
      title: 'My anxiety yielded to early morning walk',
      narrative: [
        '5am walks daily.',
        '',
        'Empty streets.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn walks.'
      ],
      lesson: 'Daily 5am walks transform anxiety baseline through empty streets and first light.'
    },
    {
      id: 'adn56_10',
      title: 'My anxiety triggered by my own self-image',
      narrative: [
        'Self-image triggered me.',
        '',
        'Identity therapy.',
        '',
        'Self-concept solidified.',
        '',
        'Anxiety reduced.',
        '',
        'I tell identity-anxious: identity therapy.'
      ],
      lesson: 'Identity therapy solidifies self-concept reducing self-image anxiety.'
    },
    {
      id: 'adn56_11',
      title: 'My anxiety yielded to bird identification',
      narrative: [
        'Bird ID hobby daily.',
        '',
        'Outdoor observation.',
        '',
        'Patient practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: bird ID.'
      ],
      lesson: 'Daily bird identification practices patient outdoor observation for anxiety.'
    },
    {
      id: 'adn56_12',
      title: 'My anxiety with my own present',
      narrative: [
        'Present focus triggered me initially.',
        '',
        'Awareness of moment.',
        '',
        'Practice built tolerance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell present-anxious: tolerance practice.'
      ],
      lesson: 'Present-moment awareness practice builds tolerance reducing present-focus anxiety.'
    },
    {
      id: 'adn56_13',
      title: 'My anxiety yielded to morning farmers market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh produce neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell rooted-needing: market ritual.'
      ],
      lesson: 'Weekly Saturday farmers market anchors week with produce plus neighbors.'
    },
    {
      id: 'adn56_14',
      title: 'My anxiety triggered by my own dating',
      narrative: [
        'Dating triggered me.',
        '',
        'Dating coach plus therapy.',
        '',
        'Found partner.',
        '',
        'I tell dating-anxious: coach plus therapy.'
      ],
      lesson: 'Dating coach plus therapy team eases dating anxiety toward finding partner.'
    },
    {
      id: 'adn56_15',
      title: 'My anxiety yielded to bath ritual',
      narrative: [
        'Bath ritual twice weekly.',
        '',
        'Salts oils candles.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: bath ritual.'
      ],
      lesson: 'Twice-weekly elaborate bath rituals soften body for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_43_HIST = [
    {
      id: 'adn43h_1',
      title: 'My anxiety yielded to candle making',
      narrative: [
        'Candle making weekly.',
        '',
        'Wax, wicks, scents.',
        '',
        'Hands engaged.',
        '',
        'Anxiety paused.',
        '',
        'I tell craft-curious: candle making accessible.'
      ],
      lesson: 'Weekly candle making provides accessible hand-engagement for anxiety relief.'
    },
    {
      id: 'adn43_2',
      title: 'My anxiety triggered by my own apartment',
      narrative: [
        'Apartment triggered me.',
        '',
        'Moved to quieter unit.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell apartment-stuck: relocation treatment.'
      ],
      lesson: 'Relocating to quieter apartment substantially reduces apartment-triggered anxiety.'
    },
    {
      id: 'adn43_3',
      title: 'My anxiety yielded to weekly bike ride',
      narrative: [
        'Weekend bike ride weekly.',
        '',
        'Body engaged outside.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: cycling treatment.'
      ],
      lesson: 'Weekend cycling rides combine outdoor movement and body engagement for anxiety.'
    },
    {
      id: 'adn43_4',
      title: 'My anxiety with my own thoughts',
      narrative: [
        'Thought spirals triggered me.',
        '',
        'Mindfulness practice.',
        '',
        'Thoughts as clouds.',
        '',
        'Anxiety reduced.',
        '',
        'I tell ruminators: clouds practice.'
      ],
      lesson: 'Mindfulness with thoughts-as-clouds practice reduces rumination anxiety.'
    },
    {
      id: 'adn43_5',
      title: 'My anxiety yielded to seasonal cooking',
      narrative: [
        'Seasonal recipes weekly.',
        '',
        'Body aligned with foods.',
        '',
        'Anxiety dropped.',
        '',
        'I tell cooking-curious: seasonal recipes treatment.'
      ],
      lesson: 'Seasonal recipe cooking aligns body with foods reducing seasonal anxiety.'
    },
    {
      id: 'adn43_6',
      title: 'My anxiety triggered by my own deadlines',
      narrative: [
        'Deadlines paralyzed me.',
        '',
        'ADHD coach.',
        '',
        'Tools for deadline management.',
        '',
        'Anxiety reduced.',
        '',
        'I tell deadline-stuck: ADHD coach treatment.'
      ],
      lesson: 'ADHD coaching provides specific tools for deadline-paralyzed anxiety.'
    },
    {
      id: 'adn43_7',
      title: 'My anxiety yielded to weekly volunteering',
      narrative: [
        'Weekly food pantry volunteer.',
        '',
        'Service plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell purpose-seeking: weekly service treatment.'
      ],
      lesson: 'Weekly food pantry service provides purpose plus community for anxiety relief.'
    },
    {
      id: 'adn43_8',
      title: 'My anxiety with my own body changes',
      narrative: [
        'Aging body triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Function celebrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell body-changing: neutrality therapy.'
      ],
      lesson: 'Body neutrality with function celebration reduces aging body anxiety.'
    },
    {
      id: 'adn43_9',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool swim daily.',
        '',
        'Quiet pool.',
        '',
        'Body engaged early.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: pre-work swim treatment.'
      ],
      lesson: 'Pre-work 6am pool swim engages body early reducing anxiety baseline.'
    },
    {
      id: 'adn43_10',
      title: 'My anxiety triggered by my own social media',
      narrative: [
        'Social media triggered me.',
        '',
        'Deleted accounts.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-anxious: account deletion treatment.'
      ],
      lesson: 'Social media account deletion substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn43_11',
      title: 'My anxiety yielded to bookbinding',
      narrative: [
        'Hand bookbinding hobby.',
        '',
        'Detail work hours.',
        '',
        'Anxiety paused.',
        '',
        'I tell craft-curious: bookbinding deep focus.'
      ],
      lesson: 'Hand bookbinding provides hours of detail work for deep focus anxiety relief.'
    },
    {
      id: 'adn43_12',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy years.',
        '',
        'New dynamic built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: years of therapy.'
      ],
      lesson: 'Years of couples therapy build new dynamic reducing marriage anxiety.'
    },
    {
      id: 'adn43_13',
      title: 'My anxiety yielded to weekly retreat',
      narrative: [
        'Weekly half-day retreat.',
        '',
        'Phone off.',
        '',
        'Silence.',
        '',
        'Anxiety reset weekly.',
        '',
        'I tell tech-tethered: weekly silent retreat.'
      ],
      lesson: 'Weekly half-day silent retreats reset anxiety for tech-tethered.'
    },
    {
      id: 'adn43_14',
      title: 'My anxiety triggered by my own family',
      narrative: [
        'Family triggered me.',
        '',
        'Family of origin therapy.',
        '',
        'Differentiation built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell family-bound: differentiation therapy.'
      ],
      lesson: 'Family of origin differentiation therapy reduces family-triggered anxiety.'
    },
    {
      id: 'adn43_15',
      title: 'My anxiety yielded to outdoor reading',
      narrative: [
        'Outdoor reading weekly.',
        '',
        'Park bench, air, book.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: outdoor reading transforms.'
      ],
      lesson: 'Weekly outdoor reading on park benches transforms indoor reader anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_44 = [
    {
      id: 'adn44_1',
      title: 'My anxiety yielded to wood stove fires',
      narrative: [
        'Wood stove fires daily winter.',
        '',
        'Fire tending ritual.',
        '',
        'Body warmed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell winter-stuck: fire tending treatment.'
      ],
      lesson: 'Daily winter wood stove fire tending provides ritual and warmth for anxiety.'
    },
    {
      id: 'adn44_2',
      title: 'My anxiety triggered by my own holidays',
      narrative: [
        'Holidays triggered me.',
        '',
        'New traditions built.',
        '',
        'Stress reduced.',
        '',
        'Anxiety reduced.',
        '',
        'I tell holiday-anxious: new traditions treatment.'
      ],
      lesson: 'Building new holiday traditions reduces holiday-triggered anxiety.'
    },
    {
      id: 'adn44_3',
      title: 'My anxiety yielded to weekly church',
      narrative: [
        'Weekly church attendance.',
        '',
        'Community plus faith.',
        '',
        'Anxiety dropped.',
        '',
        'I tell faithful: weekly attendance treatment.'
      ],
      lesson: 'Weekly church attendance provides community plus faith for anxiety relief.'
    },
    {
      id: 'adn44_4',
      title: 'My anxiety with my own boundaries',
      narrative: [
        'Boundaries triggered me.',
        '',
        'Boundary therapy.',
        '',
        'Practiced saying no.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boundary-difficult: boundary therapy.'
      ],
      lesson: 'Boundary therapy practices saying no reducing boundary-difficulty anxiety.'
    },
    {
      id: 'adn44_5',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer 15 min daily.',
        '',
        'Faith grounded day.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell faithful: morning prayer treatment.'
      ],
      lesson: 'Daily 15-minute morning prayer grounds day reducing baseline anxiety.'
    },
    {
      id: 'adn44_6',
      title: 'My anxiety triggered by my own children leaving',
      narrative: [
        'Empty nest looming.',
        '',
        'Pre-empty therapy.',
        '',
        'New identity built.',
        '',
        'Anxiety contained.',
        '',
        'I tell pre-empty-nest: anticipatory therapy.'
      ],
      lesson: 'Anticipatory empty nest therapy builds identity reducing transition anxiety.'
    },
    {
      id: 'adn44_7',
      title: 'My anxiety yielded to community center',
      narrative: [
        'Community center daily.',
        '',
        'Classes, lunch, library.',
        '',
        'Anchor of day.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated retired: community center treatment.'
      ],
      lesson: 'Daily community center attendance provides class, lunch, library anchor.'
    },
    {
      id: 'adn44_8',
      title: 'My anxiety with my own health',
      narrative: [
        'Health anxiety chronic.',
        '',
        'CBT specifically for health.',
        '',
        'Plus single doctor channel.',
        '',
        'Anxiety reduced.',
        '',
        'I tell health-anxious: CBT plus single doctor.'
      ],
      lesson: 'Health anxiety responds to CBT specifically plus single trusted doctor channel.'
    },
    {
      id: 'adn44_9',
      title: 'My anxiety yielded to weekly running',
      narrative: [
        '5K runs three weekly.',
        '',
        'Body processed stress.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stress-stuck: running treatment.'
      ],
      lesson: 'Three weekly 5K runs process stress through cardiovascular movement.'
    },
    {
      id: 'adn44_10',
      title: 'My anxiety triggered by my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist-stuck: good enough treatment.'
      ],
      lesson: 'Good-enough practice reduces perfectionism-driven anxiety patterns.'
    },
    {
      id: 'adn44_11',
      title: 'My anxiety yielded to bird walk weekly',
      narrative: [
        'Weekly bird walk group.',
        '',
        'Community plus observation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated-observer: bird walks group.'
      ],
      lesson: 'Weekly bird walk groups combine community and patient observation for anxiety.'
    },
    {
      id: 'adn44_12',
      title: 'My anxiety with my own past',
      narrative: [
        'Past triggered me.',
        '',
        'Trauma therapy.',
        '',
        'Memories integrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell past-stricken: trauma therapy.'
      ],
      lesson: 'Trauma therapy integrates past memories reducing past-trigger anxiety.'
    },
    {
      id: 'adn44_13',
      title: 'My anxiety yielded to morning bird identification',
      narrative: [
        'Bird call ID dawn.',
        '',
        'Patient listening.',
        '',
        'Species learned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sound-curious: bird ID meditation.'
      ],
      lesson: 'Dawn bird call identification provides patient listening meditation.'
    },
    {
      id: 'adn44_14',
      title: 'My anxiety triggered by my own pace',
      narrative: [
        'Pace pressure triggered me.',
        '',
        'Own pace honored.',
        '',
        'Comparison released.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pace-pressured: own pace treatment.'
      ],
      lesson: 'Honoring own pace and releasing comparison reduces pace pressure anxiety.'
    },
    {
      id: 'adn44_15',
      title: 'My anxiety yielded to bath ritual',
      narrative: [
        'Bath ritual twice weekly.',
        '',
        'Salts, oils, time.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: bath ritual treatment.'
      ],
      lesson: 'Twice-weekly elaborate bath rituals soften body for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_45 = [
    {
      id: 'adn45_1',
      title: 'My anxiety yielded to morning yoga',
      narrative: [
        'Morning yoga 30 min daily.',
        '',
        'Body opened.',
        '',
        'Breath deepened.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: morning yoga treatment.'
      ],
      lesson: 'Daily 30-minute morning yoga opens body and deepens breath for anxiety baseline.'
    },
    {
      id: 'adn45_2',
      title: 'My anxiety triggered by my own work load',
      narrative: [
        'Work load triggered me.',
        '',
        'Negotiated reduction.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell overworked: negotiated reduction treatment.'
      ],
      lesson: 'Negotiated work load reduction substantially reduces overwork anxiety.'
    },
    {
      id: 'adn45_3',
      title: 'My anxiety yielded to home pottery',
      narrative: [
        'Home pottery wheel.',
        '',
        'Daily throwing.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell craft-curious: home pottery treatment.'
      ],
      lesson: 'Home pottery wheel daily throwing absorbs mind for anxiety relief.'
    },
    {
      id: 'adn45_4',
      title: 'My anxiety with my own retirement plans',
      narrative: [
        'Retirement triggered me.',
        '',
        'Retirement coach plus therapist.',
        '',
        'Plan plus identity built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pre-retirement: coach plus therapist team.'
      ],
      lesson: 'Pre-retirement coach plus therapist team builds plan plus identity reducing anxiety.'
    },
    {
      id: 'adn45_5',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly potluck friends.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: weekly potluck ritual.'
      ],
      lesson: 'Weekly friend potlucks anchor week with food and community.'
    },
    {
      id: 'adn45_6',
      title: 'My anxiety triggered by my own emails',
      narrative: [
        'Personal email triggered me.',
        '',
        'Once daily check only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell email-anxious: once daily treatment.'
      ],
      lesson: 'Once-daily personal email checking reduces email-triggered anxiety.'
    },
    {
      id: 'adn45_7',
      title: 'My anxiety yielded to weekly farmers market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh food, neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell rooted-needing: weekly market.'
      ],
      lesson: 'Weekly Saturday farmers market provides fresh food and neighbor week anchor.'
    },
    {
      id: 'adn45_8',
      title: 'My anxiety with my own success',
      narrative: [
        'Success triggered me.',
        '',
        'Imposter therapy.',
        '',
        'Achievement internalized.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy internalizes achievement reducing success-triggered anxiety.'
    },
    {
      id: 'adn45_9',
      title: 'My anxiety yielded to dawn light',
      narrative: [
        'Dawn light viewing daily.',
        '',
        'East porch.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell circadian-disrupted: dawn light.'
      ],
      lesson: 'Daily east porch dawn light viewing aligns circadian rhythm for anxiety.'
    },
    {
      id: 'adn45_10',
      title: 'My anxiety triggered by my own news',
      narrative: [
        'News triggered me.',
        '',
        'Weekly print summary only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print treatment.'
      ],
      lesson: 'Weekly print news summaries substantially reduce news-triggered anxiety.'
    },
    {
      id: 'adn45_11',
      title: 'My anxiety yielded to morning movement',
      narrative: [
        'Morning movement non-negotiable.',
        '',
        '20 min minimum.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary: morning movement treatment.'
      ],
      lesson: 'Non-negotiable 20-minute morning movement substantially reduces anxiety baseline.'
    },
    {
      id: 'adn45_12',
      title: 'My anxiety with my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough therapy.',
        '',
        'Imperfection tolerated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell perfectionist: good enough treatment.'
      ],
      lesson: 'Good-enough therapy tolerates imperfection reducing perfectionism anxiety.'
    },
    {
      id: 'adn45_13',
      title: 'My anxiety yielded to weekly book club',
      narrative: [
        'Monthly book club ritual.',
        '',
        'Reading plus discussion.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book club treatment.'
      ],
      lesson: 'Monthly book club ritual combines reading and discussion for anxiety relief.'
    },
    {
      id: 'adn45_14',
      title: 'My anxiety triggered by my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum approach.',
        '',
        'Essential only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum treatment.'
      ],
      lesson: 'Tech minimum approach with essential devices only reduces tech anxiety.'
    },
    {
      id: 'adn45_15',
      title: 'My anxiety yielded to seasonal traditions',
      narrative: [
        'Seasonal traditions year round.',
        '',
        'Apple picking fall.',
        '',
        'Ice skating winter.',
        '',
        'Planting spring.',
        '',
        'Beach summer.',
        '',
        'Body aligned with time.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless-feeling: traditions ground.'
      ],
      lesson: 'Year-round seasonal traditions align body with time grounding rootless anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_46 = [
    {
      id: 'adn46_1',
      title: 'My anxiety yielded to oil pastels',
      narrative: [
        'Oil pastel art weekly.',
        '',
        'Hands plus color.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell visual-curious: oil pastels accessible.'
      ],
      lesson: 'Weekly oil pastel art provides accessible hand-color absorption for anxiety.'
    },
    {
      id: 'adn46_2',
      title: 'My anxiety triggered by my own phone',
      narrative: [
        'Phone triggered me.',
        '',
        'Phone in drawer hours.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell phone-anxious: drawer hours treatment.'
      ],
      lesson: 'Phone-in-drawer hours substantially reduce phone-triggered anxiety.'
    },
    {
      id: 'adn46_3',
      title: 'My anxiety yielded to morning gratitude',
      narrative: [
        'Three gratitudes morning daily.',
        '',
        'Brain shifted.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell mood-stuck: gratitude practice.'
      ],
      lesson: 'Daily morning three gratitudes shifts brain reducing anxiety baseline.'
    },
    {
      id: 'adn46_4',
      title: 'My anxiety with my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Goals released.',
        '',
        'Process living.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-driven: release treatment.'
      ],
      lesson: 'Goal release for process living reduces goal pressure anxiety.'
    },
    {
      id: 'adn46_5',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Nature absorbed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike ritual.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement and nature absorption.'
    },
    {
      id: 'adn46_6',
      title: 'My anxiety triggered by my own anger',
      narrative: [
        'Anger triggered me.',
        '',
        'Anger therapy.',
        '',
        'Anger as signal.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: anger therapy.'
      ],
      lesson: 'Anger therapy treats anger as signal reducing anger-trigger anxiety.'
    },
    {
      id: 'adn46_7',
      title: 'My anxiety yielded to evening walk',
      narrative: [
        'Daily evening walk 30 min.',
        '',
        'Body shifted.',
        '',
        'Day ended.',
        '',
        'Anxiety dropped.',
        '',
        'I tell evening-anxious: walk treatment.'
      ],
      lesson: 'Daily 30-minute evening walks shift body and end day reducing anxiety.'
    },
    {
      id: 'adn46_8',
      title: 'My anxiety with my own self-talk',
      narrative: [
        'Inner critic triggered me.',
        '',
        'Self-compassion practice.',
        '',
        'Inner voice softened.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-critical: compassion practice.'
      ],
      lesson: 'Self-compassion practice softens inner critic reducing self-talk anxiety.'
    },
    {
      id: 'adn46_9',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation 20 min daily.',
        '',
        'Years consistent.',
        '',
        'Anxiety transformed.',
        '',
        'I tell consistency-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transforms anxiety.'
    },
    {
      id: 'adn46_10',
      title: 'My anxiety triggered by my own children',
      narrative: [
        'Children worry triggered me.',
        '',
        'Parent therapy.',
        '',
        'Uncertainty tolerance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty therapy.'
      ],
      lesson: 'Parent uncertainty therapy reduces child-worry anxiety.'
    },
    {
      id: 'adn46_11',
      title: 'My anxiety yielded to weekly therapy',
      narrative: [
        'Weekly therapy years.',
        '',
        'Consistent processing.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell on-fence: years of therapy transform.'
      ],
      lesson: 'Years of consistent weekly therapy transforms anxiety baseline.'
    },
    {
      id: 'adn46_12',
      title: 'My anxiety with my own time',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Buffer built everywhere.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell pressed-time: buffer treatment.'
      ],
      lesson: 'Building buffer time everywhere substantially reduces time pressure anxiety.'
    },
    {
      id: 'adn46_13',
      title: 'My anxiety yielded to early bedtime',
      narrative: [
        '9pm bedtime hard.',
        '',
        '6am wake.',
        '',
        '9 hours nightly.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: early bedtime treatment.'
      ],
      lesson: 'Hard 9pm bedtime with 9 hours nightly substantially reduces sleep-deficient anxiety.'
    },
    {
      id: 'adn46_14',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Today only practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today practice.'
      ],
      lesson: 'Today-only present practice reduces future-projection anxiety.'
    },
    {
      id: 'adn46_15',
      title: 'My anxiety yielded to monthly silent day',
      narrative: [
        'Monthly silent day.',
        '',
        'Phone off, words limited.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell stressed-busy: monthly silent treatment.'
      ],
      lesson: 'Monthly silent days with phone off reset nervous system for busy-stressed anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_47 = [
    {
      id: 'adn47_1',
      title: 'My anxiety yielded to weekly chess',
      narrative: [
        'Weekly chess club.',
        '',
        'Strategy plus community.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell strategy-curious: chess clubs welcome.'
      ],
      lesson: 'Weekly chess clubs combine strategy and community for anxiety relief.'
    },
    {
      id: 'adn47_2',
      title: 'My anxiety triggered by my own work email',
      narrative: [
        'Work email triggered me.',
        '',
        'Three check times daily.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell email-anxious workers: three times daily.'
      ],
      lesson: 'Three-times-daily work email checking substantially reduces email anxiety.'
    },
    {
      id: 'adn47_3',
      title: 'My anxiety yielded to community pottery',
      narrative: [
        'Community pottery studio weekly.',
        '',
        'Wheel throwing plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: community studios.'
      ],
      lesson: 'Weekly community pottery studios combine wheel throwing and community for anxiety.'
    },
    {
      id: 'adn47_4',
      title: 'My anxiety with my own pace',
      narrative: [
        'Pace comparison triggered me.',
        '',
        'Own pace honored.',
        '',
        'Comparison released.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pace-comparing: own pace treatment.'
      ],
      lesson: 'Honoring own pace and releasing comparison reduces pace comparison anxiety.'
    },
    {
      id: 'adn47_5',
      title: 'My anxiety yielded to morning porch',
      narrative: [
        'Morning porch sitting daily.',
        '',
        'Coffee plus weather.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell home-bound: porch morning treatment.'
      ],
      lesson: 'Daily morning porch sitting with coffee and weather grounds anxiety baseline.'
    },
    {
      id: 'adn47_6',
      title: 'My anxiety triggered by my own work pace',
      narrative: [
        'Work pace triggered me.',
        '',
        'Slower role found.',
        '',
        'Anxiety reduced.',
        '',
        'I tell fast-paced: slower role treatment.'
      ],
      lesson: 'Slower work role found reduces fast-pace work anxiety.'
    },
    {
      id: 'adn47_7',
      title: 'My anxiety yielded to woodworking',
      narrative: [
        'Garage workshop daily evenings.',
        '',
        'Tools, wood, projects.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell hands-on: workshop treatment.'
      ],
      lesson: 'Daily evening garage workshop provides tool-wood-project absorption for anxiety.'
    },
    {
      id: 'adn47_8',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Sabbatical taken.',
        '',
        'Returned with boundaries.',
        '',
        'Anxiety reduced.',
        '',
        'I tell work-anxious: sabbatical treatment.'
      ],
      lesson: 'Sabbatical followed by boundary-protected return reduces work anxiety.'
    },
    {
      id: 'adn47_9',
      title: 'My anxiety yielded to weekly volunteering',
      narrative: [
        'Weekly volunteer service.',
        '',
        'Purpose plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell purpose-seeking: weekly service.'
      ],
      lesson: 'Weekly volunteer service provides purpose plus community for anxiety relief.'
    },
    {
      id: 'adn47_10',
      title: 'My anxiety triggered by my own memory',
      narrative: [
        'Memory loss triggered me.',
        '',
        'Memory tools plus aging acceptance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell memory-anxious: tools plus acceptance.'
      ],
      lesson: 'Memory tools plus aging acceptance reduce memory-loss anxiety.'
    },
    {
      id: 'adn47_11',
      title: 'My anxiety yielded to weekly bath',
      narrative: [
        'Weekly bath ritual.',
        '',
        'Salts plus oils plus time.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: weekly bath treatment.'
      ],
      lesson: 'Weekly elaborate bath rituals soften body for anxiety relief.'
    },
    {
      id: 'adn47_12',
      title: 'My anxiety with my own thoughts',
      narrative: [
        'Thought spirals triggered me.',
        '',
        'Mindfulness practice.',
        '',
        'Thoughts as clouds.',
        '',
        'Anxiety reduced.',
        '',
        'I tell spiral-stuck: clouds practice.'
      ],
      lesson: 'Thoughts-as-clouds mindfulness reduces thought spiral anxiety.'
    },
    {
      id: 'adn47_13',
      title: 'My anxiety yielded to dawn walks',
      narrative: [
        'Pre-dawn walks daily.',
        '',
        'Empty streets.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn transform.'
      ],
      lesson: 'Daily pre-dawn walks transform anxiety baseline through empty streets and first light.'
    },
    {
      id: 'adn47_14',
      title: 'My anxiety triggered by my own loneliness',
      narrative: [
        'Loneliness triggered me.',
        '',
        'Three weekly social contacts.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell lonely: three contacts treatment.'
      ],
      lesson: 'Three weekly social contacts substantially reduce loneliness anxiety.'
    },
    {
      id: 'adn47_15',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Evening tea ritual.',
        '',
        'Chamomile, lavender.',
        '',
        'Sleep prep.',
        '',
        'Anxiety eased.',
        '',
        'I tell pre-sleep: evening tea.'
      ],
      lesson: 'Evening herbal tea ritual prepares sleep through warmth and time.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_48 = [
    {
      id: 'adn48_1',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly solo weekend retreat.',
        '',
        'Cabin, no service.',
        '',
        'Reading plus walking.',
        '',
        'Anxiety reset monthly.',
        '',
        'I tell stressed: monthly retreat treatment.'
      ],
      lesson: 'Monthly solo weekend retreats without service reset anxiety baseline.'
    },
    {
      id: 'adn48_2',
      title: 'My anxiety triggered by my own deadlines',
      narrative: [
        'Deadlines paralyzed me.',
        '',
        'ADHD coach.',
        '',
        'Plus deadline tools.',
        '',
        'Anxiety reduced.',
        '',
        'I tell deadline-stuck: ADHD coach treatment.'
      ],
      lesson: 'ADHD coaching with deadline tools reduces deadline-paralysis anxiety.'
    },
    {
      id: 'adn48_3',
      title: 'My anxiety yielded to community choir',
      narrative: [
        'Community choir weekly.',
        '',
        'Voice plus group.',
        '',
        'Performance year-end.',
        '',
        'Anxiety dropped.',
        '',
        'I tell singing-curious: choir treatment.'
      ],
      lesson: 'Weekly community choir provides voice plus group with year-end performance anchor.'
    },
    {
      id: 'adn48_4',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy years.',
        '',
        'New dynamic.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: couples therapy.'
      ],
      lesson: 'Years of couples therapy build new dynamic reducing marriage anxiety.'
    },
    {
      id: 'adn48_5',
      title: 'My anxiety yielded to fish tank',
      narrative: [
        'Fish tank daily watching.',
        '',
        'Bubbler sound.',
        '',
        'Nervous system softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: aquarium treatment.'
      ],
      lesson: 'Daily fish tank watching with bubbler sound softens nervous system for anxiety.'
    },
    {
      id: 'adn48_6',
      title: 'My anxiety triggered by my own social media',
      narrative: [
        'Platforms triggered me.',
        '',
        'All accounts deleted.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-anxious: deletion treatment.'
      ],
      lesson: 'All social media account deletion substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn48_7',
      title: 'My anxiety yielded to weekly running',
      narrative: [
        '5K runs three weekly.',
        '',
        'Body processed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck: running treatment.'
      ],
      lesson: 'Three weekly 5K runs process body stress for anxiety relief.'
    },
    {
      id: 'adn48_8',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative pressure triggered me.',
        '',
        'Play over performance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell creative-pressured: play treatment.'
      ],
      lesson: 'Play-over-performance creative reframe reduces creative pressure anxiety.'
    },
    {
      id: 'adn48_9',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool swim daily.',
        '',
        'Body engaged early.',
        '',
        'Day started clear.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: pre-work swim.'
      ],
      lesson: 'Pre-work 6am pool swim engages body early reducing anxiety baseline.'
    },
    {
      id: 'adn48_10',
      title: 'My anxiety triggered by my own appearance',
      narrative: [
        'Appearance triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell appearance-anxious: neutrality therapy.'
      ],
      lesson: 'Body neutrality therapy reduces appearance-triggered anxiety.'
    },
    {
      id: 'adn48_11',
      title: 'My anxiety yielded to weekly book club',
      narrative: [
        'Monthly book club.',
        '',
        'Reading plus discussion.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book club treatment.'
      ],
      lesson: 'Monthly book clubs combine reading and discussion for reader anxiety relief.'
    },
    {
      id: 'adn48_12',
      title: 'My anxiety with my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Imperfection tolerated.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist: good enough treatment.'
      ],
      lesson: 'Good-enough practice with tolerated imperfection reduces perfectionism anxiety.'
    },
    {
      id: 'adn48_13',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer 15 min daily.',
        '',
        'Faith grounded day.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell faithful: morning prayer treatment.'
      ],
      lesson: 'Daily 15-minute morning prayer grounds day in faith reducing anxiety baseline.'
    },
    {
      id: 'adn48_14',
      title: 'My anxiety triggered by my own boundaries',
      narrative: [
        'Boundaries triggered me.',
        '',
        'Boundary therapy.',
        '',
        'Practiced no.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boundary-difficult: therapy treatment.'
      ],
      lesson: 'Boundary therapy practices saying no reducing boundary-difficulty anxiety.'
    },
    {
      id: 'adn48_15',
      title: 'My anxiety yielded to weekly chess',
      narrative: [
        'Weekly chess club.',
        '',
        'Strategy plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell strategy-curious: chess club.'
      ],
      lesson: 'Weekly chess clubs combine strategy and community for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_49 = [
    {
      id: 'adn49_1',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation 20 min daily.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistent-curious: years transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transform anxiety baseline.'
    },
    {
      id: 'adn49_2',
      title: 'My anxiety triggered by my own news',
      narrative: [
        'News triggered me.',
        '',
        'Weekly print only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print treatment.'
      ],
      lesson: 'Weekly print news only substantially reduces news-triggered anxiety.'
    },
    {
      id: 'adn49_3',
      title: 'My anxiety yielded to weekly running club',
      narrative: [
        'Running club weekly.',
        '',
        'Body engaged.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell solo-runners: club treatment.'
      ],
      lesson: 'Weekly running clubs build community plus body engagement for anxiety.'
    },
    {
      id: 'adn49_4',
      title: 'My anxiety with my own time pressure',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Buffer time everywhere.',
        '',
        'Anxiety dropped.',
        '',
        'I tell time-pressed: buffer treatment.'
      ],
      lesson: 'Building buffer time everywhere reduces time pressure anxiety.'
    },
    {
      id: 'adn49_5',
      title: 'My anxiety yielded to morning sun',
      narrative: [
        'Morning sun 10 min outside daily.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell circadian-disrupted: morning sun.'
      ],
      lesson: 'Ten minutes daily morning sun aligns circadian rhythm reducing anxiety.'
    },
    {
      id: 'adn49_6',
      title: 'My anxiety triggered by my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Career pivot to slower.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'I tell work-anxious: pivot treatment.'
      ],
      lesson: 'Career pivot to slower lower-pay role is conscious anxiety treatment trade.'
    },
    {
      id: 'adn49_7',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly potluck friends.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: potluck ritual.'
      ],
      lesson: 'Weekly friend potlucks anchor week with food and community for isolation anxiety.'
    },
    {
      id: 'adn49_8',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy.',
        '',
        'Patterns shifted.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: couples therapy.'
      ],
      lesson: 'Couples therapy shifts patterns reducing marriage-triggered anxiety.'
    },
    {
      id: 'adn49_9',
      title: 'My anxiety yielded to morning movement',
      narrative: [
        'Morning movement non-negotiable.',
        '',
        '20 min minimum.',
        '',
        'Walk, stretch, yoga.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary: morning movement.'
      ],
      lesson: 'Non-negotiable 20-minute morning movement reduces sedentary anxiety baseline.'
    },
    {
      id: 'adn49_10',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Today only practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today practice.'
      ],
      lesson: 'Today-only present practice reduces future-projection anxiety.'
    },
    {
      id: 'adn49_11',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day surrendered.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer.'
      ],
      lesson: 'Evening prayer surrenders day reducing pre-sleep anxiety.'
    },
    {
      id: 'adn49_12',
      title: 'My anxiety with my own children',
      narrative: [
        'Children worry triggered me.',
        '',
        'Parent therapy.',
        '',
        'Uncertainty tolerated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty therapy.'
      ],
      lesson: 'Parent uncertainty therapy reduces child-worry anxiety.'
    },
    {
      id: 'adn49_13',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Nature absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell weekend-anxious: hike treatment.'
      ],
      lesson: 'Weekend hiking provides hours of body engagement for weekend anxiety relief.'
    },
    {
      id: 'adn49_14',
      title: 'My anxiety triggered by my own past',
      narrative: [
        'Past triggered me.',
        '',
        'Trauma therapy.',
        '',
        'Memories integrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell past-stricken: trauma therapy.'
      ],
      lesson: 'Trauma therapy integrates past memories reducing past-trigger anxiety.'
    },
    {
      id: 'adn49_15',
      title: 'My anxiety yielded to seasonal rituals',
      narrative: [
        'Seasonal rituals year round.',
        '',
        'Body aligned with time.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless: seasonal rituals ground.'
      ],
      lesson: 'Year-round seasonal rituals align body with time grounding rootless anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_50 = [
    {
      id: 'adn50_1',
      title: 'My anxiety yielded to library volunteering',
      narrative: [
        'Library volunteer weekly.',
        '',
        'Quiet service.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell quiet-volunteer: library treatment.'
      ],
      lesson: 'Weekly library volunteering provides quiet service plus community for anxiety.'
    },
    {
      id: 'adn50_2',
      title: 'My anxiety triggered by my own emails',
      narrative: [
        'Email triggered me.',
        '',
        'Once daily check only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell email-anxious: once daily treatment.'
      ],
      lesson: 'Once-daily email checking reduces email-triggered anxiety.'
    },
    {
      id: 'adn50_3',
      title: 'My anxiety yielded to weekly gallery',
      narrative: [
        'Weekly art gallery visit.',
        '',
        'Free entry.',
        '',
        'Beauty absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell beauty-craving: free galleries.'
      ],
      lesson: 'Weekly free art gallery visits provide beauty absorption for anxiety.'
    },
    {
      id: 'adn50_4',
      title: 'My anxiety with my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum.',
        '',
        'Essential only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum treatment.'
      ],
      lesson: 'Tech minimum approach reduces tech-overwhelmed anxiety.'
    },
    {
      id: 'adn50_5',
      title: 'My anxiety yielded to weekly dance class',
      narrative: [
        'Weekly creative dance class.',
        '',
        'Body free.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: dance class.'
      ],
      lesson: 'Weekly creative dance class provides free body movement and community for anxiety.'
    },
    {
      id: 'adn50_6',
      title: 'My anxiety triggered by my own holidays',
      narrative: [
        'Holidays triggered me.',
        '',
        'New traditions built.',
        '',
        'Stress reduced.',
        '',
        'Anxiety reduced.',
        '',
        'I tell holiday-anxious: new traditions.'
      ],
      lesson: 'Building new holiday traditions reduces holiday-triggered anxiety.'
    },
    {
      id: 'adn50_7',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Evening tea ritual.',
        '',
        'Chamomile or lavender.',
        '',
        'Sleep prep.',
        '',
        'Anxiety eased.',
        '',
        'I tell pre-sleep: tea ritual.'
      ],
      lesson: 'Evening herbal tea ritual prepares pre-sleep anxiety reduction.'
    },
    {
      id: 'adn50_8',
      title: 'My anxiety with my own work hours',
      narrative: [
        'Work hours triggered me.',
        '',
        'Strict 8 hour boundary.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell overworking: strict hours.'
      ],
      lesson: 'Strict 8-hour work boundary substantially reduces overwork anxiety.'
    },
    {
      id: 'adn50_9',
      title: 'My anxiety yielded to weekly market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh food, neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: market ritual.'
      ],
      lesson: 'Weekly Saturday market anchors week with fresh food and neighbor community.'
    },
    {
      id: 'adn50_10',
      title: 'My anxiety triggered by my own anger',
      narrative: [
        'Anger triggered me.',
        '',
        'Anger therapy.',
        '',
        'Signal not enemy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: signal therapy.'
      ],
      lesson: 'Anger therapy treats anger as signal not enemy reducing anger anxiety.'
    },
    {
      id: 'adn50_11',
      title: 'My anxiety yielded to morning bird watching',
      narrative: [
        'Morning bird feeder watching.',
        '',
        'Patient observation.',
        '',
        'Species learned.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell observation-curious: bird ritual.'
      ],
      lesson: 'Morning bird feeder watching provides patient observation for anxiety baseline.'
    },
    {
      id: 'adn50_12',
      title: 'My anxiety with my own success',
      narrative: [
        'Success triggered imposter.',
        '',
        'Imposter therapy.',
        '',
        'Achievement internalized.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy internalizes achievement reducing success-triggered anxiety.'
    },
    {
      id: 'adn50_13',
      title: 'My anxiety yielded to morning gratitude',
      narrative: [
        'Three gratitudes daily morning.',
        '',
        'Brain shifted.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell mood-stuck: gratitude practice.'
      ],
      lesson: 'Daily morning three gratitudes shifts brain reducing anxiety baseline.'
    },
    {
      id: 'adn50_14',
      title: 'My anxiety triggered by my own clothing',
      narrative: [
        'Clothing decisions triggered me.',
        '',
        'Capsule wardrobe.',
        '',
        'Decision removed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: capsule treatment.'
      ],
      lesson: 'Capsule wardrobe removes daily clothing decision reducing decision anxiety.'
    },
    {
      id: 'adn50_15',
      title: 'My anxiety yielded to acceptance',
      narrative: [
        'Years of fighting anxiety.',
        '',
        'Therapist: welcome the wave.',
        '',
        'Sat with anxiety not against.',
        '',
        'Wave passed faster.',
        '',
        'Acceptance was the unlock.',
        '',
        'I tell fighters: acceptance is the unlock.'
      ],
      lesson: 'Acceptance over fighting anxiety shortens waves and is the long-term unlock.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_43 = [
    {
      id: 'adn35_1',
      title: 'My anxiety yielded to crow watching',
      narrative: [
        'Crows in my yard daily.',
        '',
        'Personalities recognized.',
        '',
        'Patient observation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell yard-having: crow watching is treatment.'
      ],
      lesson: 'Crow watching builds patient personality recognition for anxiety relief.'
    },
    {
      id: 'adn35_2',
      title: 'My anxiety triggered by my own breathing',
      narrative: [
        'Breath awareness triggered panic.',
        '',
        'Redirected to other senses.',
        '',
        'Sight, touch, sound.',
        '',
        'Anxiety reduced.',
        '',
        'I tell breath-watching: sense redirection.'
      ],
      lesson: 'Sensory redirection from breath to sight/touch/sound reduces breath-panic.'
    },
    {
      id: 'adn35_3',
      title: 'My anxiety yielded to weekly meal prep',
      narrative: [
        'Sunday meal prep three hours.',
        '',
        'Cooking music meditation.',
        '',
        'Week food planned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell weekday-frantic: weekend prep treatment.'
      ],
      lesson: 'Sunday three-hour meal prep with music meditates weekday food anxiety.'
    },
    {
      id: 'adn35_4',
      title: 'My anxiety with my own gut',
      narrative: [
        'Gut anxiety severe.',
        '',
        'Gut-brain axis treatment.',
        '',
        'Probiotics plus stress reduction.',
        '',
        'Both eased.',
        '',
        'I tell gut-anxious: gut-brain treatment.'
      ],
      lesson: 'Gut-brain axis treatment combines probiotics and stress reduction for anxiety.'
    },
    {
      id: 'adn35_5',
      title: 'My anxiety yielded to outdoor jazz',
      narrative: [
        'Summer outdoor jazz nights.',
        '',
        'Music plus air.',
        '',
        'Community gathered.',
        '',
        'Anxiety dropped.',
        '',
        'I tell music-curious: outdoor jazz treatment.'
      ],
      lesson: 'Summer outdoor jazz combines music and open air for community-based anxiety relief.'
    },
    {
      id: 'adn35_6',
      title: 'My anxiety triggered by my work email',
      narrative: [
        'Email triggered chronic anxiety.',
        '',
        'Three check times daily.',
        '',
        'No after-hours.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell email-anxious workers: three times daily.'
      ],
      lesson: 'Three-times-daily email checking with no after-hours reduces email anxiety.'
    },
    {
      id: 'adn35_7',
      title: 'My anxiety yielded to book club',
      narrative: [
        'Monthly book club.',
        '',
        'Reading anchor.',
        '',
        'Community discussion.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book clubs welcome.'
      ],
      lesson: 'Monthly book clubs anchor reading with community discussion for anxiety relief.'
    },
    {
      id: 'adn35_8',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Career pivot.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade conscious.',
        '',
        'I tell work-stuck: pivot is treatment.'
      ],
      lesson: 'Career pivot to lower-pay lower-anxiety role is conscious treatment trade.'
    },
    {
      id: 'adn35_9',
      title: 'My anxiety yielded to volunteer hospital',
      narrative: [
        'Hospital volunteer weekly.',
        '',
        'Service plus presence.',
        '',
        'Anxiety dropped.',
        '',
        'I tell purpose-seeking: hospital volunteer treatment.'
      ],
      lesson: 'Weekly hospital volunteering provides service and presence for anxiety relief.'
    },
    {
      id: 'adn35_10',
      title: 'My anxiety triggered by certain colors',
      narrative: [
        'Specific colors triggered me.',
        '',
        'Trauma association.',
        '',
        'EMDR for visual triggers.',
        '',
        'Anxiety reduced.',
        '',
        'I tell color-triggered: visual EMDR treatment.'
      ],
      lesson: 'Visual color triggers from trauma respond to targeted EMDR.'
    },
    {
      id: 'adn35_11',
      title: 'My anxiety yielded to walking meditation',
      narrative: [
        'Walking meditation daily.',
        '',
        '20 min slow.',
        '',
        'Foot focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sitting-stuck: walking meditation accessible.'
      ],
      lesson: 'Daily 20-minute walking meditation with foot focus provides accessible anxiety relief.'
    },
    {
      id: 'adn35_12',
      title: 'My anxiety with my own anger',
      narrative: [
        'Anger triggered anxiety.',
        '',
        'Both addressed in therapy.',
        '',
        'Anger as signal.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: both addressed.'
      ],
      lesson: 'Anger and anxiety often interconnected; both addressed in therapy together.'
    },
    {
      id: 'adn35_13',
      title: 'My anxiety yielded to outdoor reading',
      narrative: [
        'Park bench reading weekly.',
        '',
        'Air plus book.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: outdoor reading transforms.'
      ],
      lesson: 'Outdoor park bench reading transforms indoor reading anxiety through air.'
    },
    {
      id: 'adn35_14',
      title: 'My anxiety triggered by certain people sounds',
      narrative: [
        'Specific voice tones triggered me.',
        '',
        'Trauma association.',
        '',
        'EMDR for auditory.',
        '',
        'Anxiety reduced.',
        '',
        'I tell voice-triggered: auditory EMDR.'
      ],
      lesson: 'Voice tone triggers from trauma respond to auditory EMDR.'
    },
    {
      id: 'adn35_15',
      title: 'My anxiety yielded to weekly volunteering',
      narrative: [
        'Weekly soup kitchen volunteer.',
        '',
        'Service plus community.',
        '',
        'Perspective shifted.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-focused: weekly volunteer service.'
      ],
      lesson: 'Weekly soup kitchen volunteering shifts perspective and reduces self-focused anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_36 = [
    {
      id: 'adn36_1',
      title: 'My anxiety yielded to lego building',
      narrative: [
        'Adult Lego sets weekly.',
        '',
        'Detail work absorbing.',
        '',
        'Hours flow.',
        '',
        'Anxiety paused.',
        '',
        'I tell adults: Lego is therapy.'
      ],
      lesson: 'Adult Lego building provides hours of detailed absorbing flow state.'
    },
    {
      id: 'adn36_2',
      title: 'My anxiety triggered by my own bills',
      narrative: [
        'Bill paying triggered me.',
        '',
        'Auto-pay set up.',
        '',
        'Monthly review only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell bill-anxious: auto-pay reduces friction.'
      ],
      lesson: 'Auto-pay with monthly review reduces bill anxiety through removed friction.'
    },
    {
      id: 'adn36_3',
      title: 'My anxiety yielded to community theater',
      narrative: [
        'Joined community theater.',
        '',
        'Practice plus performance.',
        '',
        'Anxiety transformed by role.',
        '',
        'I tell performance-curious: community theater welcomes.'
      ],
      lesson: 'Community theater transforms social anxiety through role practice and performance.'
    },
    {
      id: 'adn36_4',
      title: 'My anxiety with my own children',
      narrative: [
        'Worried about kids constantly.',
        '',
        'Parent therapy.',
        '',
        'Worked on tolerating uncertainty.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: tolerating uncertainty treatment.'
      ],
      lesson: 'Parent anxiety eases through therapy on tolerating child-related uncertainty.'
    },
    {
      id: 'adn36_5',
      title: 'My anxiety yielded to morning yoga class',
      narrative: [
        'Morning yoga class 6am.',
        '',
        'Community plus body.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: morning class transforms.'
      ],
      lesson: 'Morning 6am yoga class provides community plus body for anxiety baseline reduction.'
    },
    {
      id: 'adn36_6',
      title: 'My anxiety triggered by my own clothing',
      narrative: [
        'Clothing decisions triggered me.',
        '',
        'Capsule wardrobe.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell decision-anxious: capsule wardrobe treatment.'
      ],
      lesson: 'Capsule wardrobe substantially reduces clothing decision anxiety.'
    },
    {
      id: 'adn36_7',
      title: 'My anxiety yielded to family game night',
      narrative: [
        'Weekly family game night.',
        '',
        'Board games together.',
        '',
        'Connection plus fun.',
        '',
        'Anxiety dropped.',
        '',
        'I tell family-distant: game night ritual.'
      ],
      lesson: 'Weekly family board game nights ritualize connection for family anxiety.'
    },
    {
      id: 'adn36_8',
      title: 'My anxiety with my own success',
      narrative: [
        'Success triggered me.',
        '',
        'Imposter therapy.',
        '',
        'Internalize achievement.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy treatment.'
      ],
      lesson: 'Success-triggered imposter syndrome responds to specialty internalization therapy.'
    },
    {
      id: 'adn36_9',
      title: 'My anxiety yielded to evening rituals',
      narrative: [
        'Same evening ritual nightly.',
        '',
        'Bath, book, bed.',
        '',
        'Predictable.',
        '',
        'Anxiety eased.',
        '',
        'I tell sleep-anxious: ritualized evening treatment.'
      ],
      lesson: 'Ritualized predictable evening (bath, book, bed) reduces pre-sleep anxiety.'
    },
    {
      id: 'adn36_10',
      title: 'My anxiety triggered by my own breathing too deep',
      narrative: [
        'Deep breathing triggered panic.',
        '',
        'Counterintuitive.',
        '',
        'Therapist adjusted: shallow normal.',
        '',
        'Anxiety reduced.',
        '',
        'I tell breath-paradox: normal breath sometimes treatment.'
      ],
      lesson: 'Counterintuitive normal-breath is treatment for those panicked by deep breathing.'
    },
    {
      id: 'adn36_11',
      title: 'My anxiety yielded to forest bathing',
      narrative: [
        'Weekly forest bathing.',
        '',
        'Slow nature immersion.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell tried-everything: forest bathing specific.'
      ],
      lesson: 'Weekly forest bathing immersion provides specific nervous system reset.'
    },
    {
      id: 'adn36_12',
      title: 'My anxiety with my own time',
      narrative: [
        'Time scarcity triggered me.',
        '',
        'Time abundance reframe.',
        '',
        'I have enough time.',
        '',
        'Anxiety dropped.',
        '',
        'I tell time-scarce: abundance reframe treatment.'
      ],
      lesson: 'Time abundance reframing reduces time-scarcity anxiety.'
    },
    {
      id: 'adn36_13',
      title: 'My anxiety yielded to weekly hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Hours body engaged.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike ritual.'
      ],
      lesson: 'Weekend hiking ritual provides hours of body engagement for anxiety relief.'
    },
    {
      id: 'adn36_14',
      title: 'My anxiety triggered by my home noise',
      narrative: [
        'Home noise triggered me.',
        '',
        'Sound proofing improved.',
        '',
        'Anxiety dropped.',
        '',
        'I tell noise-sensitive: physical treatment plus therapy.'
      ],
      lesson: 'Home sound proofing provides physical anxiety treatment alongside therapy.'
    },
    {
      id: 'adn36_15',
      title: 'My anxiety yielded to evening swim',
      narrative: [
        'Evening pool swim daily.',
        '',
        'Body engaged late.',
        '',
        'Sleep arrived.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: evening swim sleep prep.'
      ],
      lesson: 'Evening pool swim engages body late, preparing sleep and reducing anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_37 = [
    {
      id: 'adn37_1',
      title: 'My anxiety yielded to acoustic guitar',
      narrative: [
        'Daily guitar practice.',
        '',
        'Hands plus chord patterns.',
        '',
        'Anxiety dropped.',
        '',
        'I tell musical-curious: daily guitar treatment.'
      ],
      lesson: 'Daily guitar practice provides hand-chord pattern engagement for anxiety.'
    },
    {
      id: 'adn37_2',
      title: 'My anxiety triggered by my own social media',
      narrative: [
        'Social media triggered me.',
        '',
        'Deleted accounts.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-stuck: account deletion treatment.'
      ],
      lesson: 'Social media account deletion substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn37_3',
      title: 'My anxiety yielded to walking partner',
      narrative: [
        'Daily walk with neighbor.',
        '',
        '30 min, 7 days a week.',
        '',
        'Routine plus connection.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: walking partner daily.'
      ],
      lesson: 'Daily 30-minute walking partner provides routine plus connection for anxiety.'
    },
    {
      id: 'adn37_4',
      title: 'My anxiety with my own grandparenting',
      narrative: [
        'Grandparent role triggered me.',
        '',
        'New identity therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell new grandparents: identity therapy treatment.'
      ],
      lesson: 'New grandparent role transitions benefit from identity therapy.'
    },
    {
      id: 'adn37_5',
      title: 'My anxiety yielded to bird feeder window',
      narrative: [
        'Window bird feeder.',
        '',
        'Daily watching.',
        '',
        'Mind eased.',
        '',
        'I tell home-bound: window bird feeder treatment.'
      ],
      lesson: 'Window bird feeders provide daily watching for home-bound anxiety relief.'
    },
    {
      id: 'adn37_6',
      title: 'My anxiety triggered by my voicemail',
      narrative: [
        'Voicemail icon triggered me.',
        '',
        'Check at set times.',
        '',
        'Plus pre-check breathing.',
        '',
        'Anxiety reduced.',
        '',
        'I tell voicemail-anxious: scheduled checking plus breath.'
      ],
      lesson: 'Scheduled voicemail checking with pre-check breathing reduces voicemail anxiety.'
    },
    {
      id: 'adn37_7',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly weekend retreat alone.',
        '',
        'Cabin no service.',
        '',
        'Reading plus walking.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell stressed: monthly retreat treatment.'
      ],
      lesson: 'Monthly weekend solo retreats without service reduce stress-baseline anxiety.'
    },
    {
      id: 'adn37_8',
      title: 'My anxiety with my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Process focus over outcome.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-driven: process focus treatment.'
      ],
      lesson: 'Process-over-outcome focus reduces goal-pressure anxiety.'
    },
    {
      id: 'adn37_9',
      title: 'My anxiety yielded to walking with podcast',
      narrative: [
        'Daily walk plus podcast.',
        '',
        'Movement plus learning.',
        '',
        'Anxiety dropped.',
        '',
        'I tell solo walkers: podcast companion.'
      ],
      lesson: 'Daily walking with educational podcast combines movement and learning for anxiety.'
    },
    {
      id: 'adn37_10',
      title: 'My anxiety triggered by my own appearance',
      narrative: [
        'Mirror triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Anxiety dropped.',
        '',
        'I tell mirror-triggered: neutrality therapy.'
      ],
      lesson: 'Mirror-triggered appearance anxiety responds to body neutrality therapy.'
    },
    {
      id: 'adn37_11',
      title: 'My anxiety yielded to seasonal hiking',
      narrative: [
        'Different trails each season.',
        '',
        'Same trails year over year.',
        '',
        'Earth time felt.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell outdoor-curious: seasonal trail repetition.'
      ],
      lesson: 'Seasonal trail repetition over years builds earth-time awareness reducing anxiety.'
    },
    {
      id: 'adn37_12',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative blocks triggered me.',
        '',
        'Therapy on creative anxiety.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell creative-blocked: process therapy.'
      ],
      lesson: 'Creative process therapy reduces block-related anxiety in creative work.'
    },
    {
      id: 'adn37_13',
      title: 'My anxiety yielded to silent meal',
      narrative: [
        'Solo silent meals.',
        '',
        'No phone, no book.',
        '',
        'Taste fully.',
        '',
        'Anxiety dropped.',
        '',
        'I tell distracted-eaters: silent meals treatment.'
      ],
      lesson: 'Solo silent meals without distraction provide full taste presence for anxiety.'
    },
    {
      id: 'adn37_14',
      title: 'My anxiety triggered by my own loneliness',
      narrative: [
        'Loneliness triggered me.',
        '',
        'Built three weekly contacts.',
        '',
        'Anxiety reduced substantially.',
        '',
        'I tell lonely: three weekly contacts treatment.'
      ],
      lesson: 'Building three weekly social contacts substantially reduces loneliness anxiety.'
    },
    {
      id: 'adn37_15',
      title: 'My anxiety yielded to community choir',
      narrative: [
        'Community choir weekly.',
        '',
        'Voice plus group.',
        '',
        'Performance once yearly.',
        '',
        'Anxiety dropped.',
        '',
        'I tell singing-curious: community choir.'
      ],
      lesson: 'Weekly community choir provides voice plus group with performance anchor for anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_38 = [
    {
      id: 'adn38_1',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation daily.',
        '',
        '20 min cushion.',
        '',
        'Years of practice.',
        '',
        'Anxiety baseline dropped substantially.',
        '',
        'I tell consistent-curious: years of daily practice transform.'
      ],
      lesson: 'Years of daily 20-minute morning meditation substantially transforms anxiety baseline.'
    },
    {
      id: 'adn38_2',
      title: 'My anxiety triggered by my own boredom',
      narrative: [
        'Boredom triggered me.',
        '',
        'Sit with boredom practice.',
        '',
        'Tolerance built.',
        '',
        'Anxiety reduced.',
        '',
        'I tell boredom-anxious: tolerance practice.'
      ],
      lesson: 'Sitting-with-boredom practice builds tolerance reducing boredom anxiety.'
    },
    {
      id: 'adn38_3',
      title: 'My anxiety yielded to weekly farmers market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh produce, neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: market is community.'
      ],
      lesson: 'Weekly farmers market anchors week with produce and neighbor community.'
    },
    {
      id: 'adn38_4',
      title: 'My anxiety with my own retirement',
      narrative: [
        'Retirement triggered identity crisis.',
        '',
        'Retirement therapy.',
        '',
        'New identity built slowly.',
        '',
        'Anxiety reduced.',
        '',
        'I tell newly retired: identity therapy.'
      ],
      lesson: 'Retirement identity therapy builds new self slowly reducing transition anxiety.'
    },
    {
      id: 'adn38_5',
      title: 'My anxiety yielded to dawn light',
      narrative: [
        'Dawn light viewing daily.',
        '',
        'East-facing porch.',
        '',
        'First light eyes.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell circadian-disrupted: dawn light treatment.'
      ],
      lesson: 'Daily dawn light viewing aligns circadian rhythm and reduces anxiety.'
    },
    {
      id: 'adn38_6',
      title: 'My anxiety triggered by my own anger',
      narrative: [
        'Anger triggered anxiety.',
        '',
        'Therapy on anger as signal.',
        '',
        'Anger befriended.',
        '',
        'Anxiety reduced.',
        '',
        'I tell anger-anxious: anger as signal.'
      ],
      lesson: 'Befriending anger as signal rather than enemy reduces anger-driven anxiety.'
    },
    {
      id: 'adn38_7',
      title: 'My anxiety yielded to monthly book swap',
      narrative: [
        'Monthly book swap with friends.',
        '',
        'Books exchanged plus stories.',
        '',
        'Connection ritualized.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: book swap ritual.'
      ],
      lesson: 'Monthly book swap rituals connect readers through book exchange and stories.'
    },
    {
      id: 'adn38_8',
      title: 'My anxiety with my own decisions',
      narrative: [
        'Decision paralysis triggered me.',
        '',
        'Decision therapy.',
        '',
        'Tools for choosing.',
        '',
        'Anxiety reduced.',
        '',
        'I tell paralyzed: decision therapy treatment.'
      ],
      lesson: 'Decision therapy provides specific tools for choosing reducing paralysis anxiety.'
    },
    {
      id: 'adn38_9',
      title: 'My anxiety yielded to evening yoga',
      narrative: [
        'Restorative evening yoga.',
        '',
        'Body opened.',
        '',
        'Day softened.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: evening yoga sleep prep.'
      ],
      lesson: 'Evening restorative yoga opens body for sleep, reducing pre-sleep anxiety.'
    },
    {
      id: 'adn38_10',
      title: 'My anxiety triggered by my own success',
      narrative: [
        'Success triggered fear of loss.',
        '',
        'Therapy on success acceptance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: acceptance therapy.'
      ],
      lesson: 'Success acceptance therapy reduces fear-of-loss anxiety after achievement.'
    },
    {
      id: 'adn38_11',
      title: 'My anxiety yielded to monthly potluck',
      narrative: [
        'Monthly potluck with friends.',
        '',
        'Food plus community.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: monthly potluck ritual.'
      ],
      lesson: 'Monthly friend potlucks combine food and community for anxiety relief.'
    },
    {
      id: 'adn38_12',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered anxiety.',
        '',
        'Couples therapy years.',
        '',
        'Patterns shifted.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: years of therapy.'
      ],
      lesson: 'Years of couples therapy shifts marriage patterns reducing relationship anxiety.'
    },
    {
      id: 'adn38_13',
      title: 'My anxiety yielded to seasonal cleaning',
      narrative: [
        'Seasonal cleaning rituals.',
        '',
        'Spring, summer, fall, winter.',
        '',
        'Home rotated.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-stuck: seasonal cleaning ritual.'
      ],
      lesson: 'Seasonal cleaning rituals rotate home environment reducing stagnation anxiety.'
    },
    {
      id: 'adn38_14',
      title: 'My anxiety triggered by my own success metrics',
      narrative: [
        'Tracking metrics triggered me.',
        '',
        'Released measurements.',
        '',
        'Process focus.',
        '',
        'Anxiety dropped.',
        '',
        'I tell metric-tracking: release treatment.'
      ],
      lesson: 'Releasing metric tracking in favor of process focus reduces measurement anxiety.'
    },
    {
      id: 'adn38_15',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day reviewed.',
        '',
        'Surrender ritual.',
        '',
        'Anxiety eased.',
        '',
        'I tell faithful: evening prayer treatment.'
      ],
      lesson: 'Evening prayer practice surrenders day reviewing for pre-sleep anxiety reduction.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_39 = [
    {
      id: 'adn39_1',
      title: 'My anxiety yielded to gardening journal',
      narrative: [
        'Daily garden journal.',
        '',
        'Plant observations.',
        '',
        'Year-over-year patterns.',
        '',
        'Anxiety dropped.',
        '',
        'I tell gardeners: journal practice transforms.'
      ],
      lesson: 'Daily garden journals build year-over-year pattern awareness reducing anxiety.'
    },
    {
      id: 'adn39_2',
      title: 'My anxiety triggered by my own forgetting',
      narrative: [
        'Forgetting triggered me.',
        '',
        'Memory tools.',
        '',
        'Plus aging acceptance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell forgetting-anxious: tools plus acceptance.'
      ],
      lesson: 'Memory tools plus aging acceptance reduce forgetting-triggered anxiety.'
    },
    {
      id: 'adn39_3',
      title: 'My anxiety yielded to morning coffee porch',
      narrative: [
        'Morning coffee porch ritual.',
        '',
        'Outside all weather.',
        '',
        'Body weather aware.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-bound: outdoor morning treatment.'
      ],
      lesson: 'All-weather outdoor morning coffee builds weather awareness for anxiety relief.'
    },
    {
      id: 'adn39_4',
      title: 'My anxiety with my own technology',
      narrative: [
        'Tech triggered me.',
        '',
        'Tech minimum approach.',
        '',
        'Phone, computer for essentials.',
        '',
        'Anxiety dropped.',
        '',
        'I tell tech-overwhelmed: minimum approach.'
      ],
      lesson: 'Tech minimum approach with essential-only devices reduces tech anxiety.'
    },
    {
      id: 'adn39_5',
      title: 'My anxiety yielded to weekly market',
      narrative: [
        'Saturday market weekly.',
        '',
        'Fresh food, neighbors.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell market-curious: weekly ritual.'
      ],
      lesson: 'Weekly Saturday farmers market provides fresh food and neighbor anchor.'
    },
    {
      id: 'adn39_6',
      title: 'My anxiety triggered by my own time pressure',
      narrative: [
        'Time pressure triggered me.',
        '',
        'Built buffer time everywhere.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell pressed-time: buffer everywhere treatment.'
      ],
      lesson: 'Building buffer time everywhere substantially reduces time pressure anxiety.'
    },
    {
      id: 'adn39_7',
      title: 'My anxiety yielded to woodland sit',
      narrative: [
        'Weekly woodland sit.',
        '',
        'Same spot.',
        '',
        'Patient observation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: same spot weekly.'
      ],
      lesson: 'Weekly same-spot woodland sits train patient observation reducing anxiety.'
    },
    {
      id: 'adn39_8',
      title: 'My anxiety with my own goals',
      narrative: [
        'Goal pressure triggered me.',
        '',
        'Released goals entirely.',
        '',
        'Process-only living.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-pressured: release treatment.'
      ],
      lesson: 'Releasing goals entirely for process-only living reduces goal anxiety.'
    },
    {
      id: 'adn39_9',
      title: 'My anxiety yielded to bath ritual',
      narrative: [
        'Bath ritual twice weekly.',
        '',
        'Salts, oils, candles.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: bath ritual treatment.'
      ],
      lesson: 'Twice-weekly bath rituals with salts, oils, candles soften body for anxiety.'
    },
    {
      id: 'adn39_10',
      title: 'My anxiety triggered by my own children',
      narrative: [
        'Worry about kids constant.',
        '',
        'Parent therapy.',
        '',
        'Tolerating uncertainty.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty therapy.'
      ],
      lesson: 'Parent therapy on tolerating child uncertainty reduces parental anxiety.'
    },
    {
      id: 'adn39_11',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Evening tea ritual.',
        '',
        'Chamomile or lavender.',
        '',
        'Sleep prep.',
        '',
        'Anxiety eased.',
        '',
        'I tell pre-sleep anxious: tea ritual.'
      ],
      lesson: 'Evening herbal tea ritual prepares sleep through warmth.'
    },
    {
      id: 'adn39_12',
      title: 'My anxiety with my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Sabbatical taken.',
        '',
        'Returned with boundaries.',
        '',
        'Anxiety reduced.',
        '',
        'I tell work-anxious: sabbatical plus boundaries.'
      ],
      lesson: 'Sabbatical followed by boundary-protected return reduces work anxiety.'
    },
    {
      id: 'adn39_13',
      title: 'My anxiety yielded to morning bird watching',
      narrative: [
        'Morning bird watching daily.',
        '',
        'Window with feeder.',
        '',
        'Patient observation.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell observation-curious: morning bird ritual.'
      ],
      lesson: 'Morning bird watching at window feeder reduces baseline anxiety through patient observation.'
    },
    {
      id: 'adn39_14',
      title: 'My anxiety triggered by my own clothes',
      narrative: [
        'Clothing triggered me.',
        '',
        'Capsule wardrobe.',
        '',
        'Daily decision removed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: capsule treatment.'
      ],
      lesson: 'Capsule wardrobe removes daily clothing decision reducing decision anxiety.'
    },
    {
      id: 'adn39_15',
      title: 'My anxiety yielded to early sleep',
      narrative: [
        '9pm bedtime hard.',
        '',
        '6am wake.',
        '',
        '9 hours daily.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-deficient: 9 hours treatment.'
      ],
      lesson: 'Nine hours nightly sleep substantially reduces sleep-deficient anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_40 = [
    {
      id: 'adn40_1',
      title: 'My anxiety yielded to morning sun',
      narrative: [
        'Outside in morning sun.',
        '',
        '10 min daily.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: morning sun treatment.'
      ],
      lesson: 'Ten minutes daily morning sun aligns circadian rhythm reducing anxiety.'
    },
    {
      id: 'adn40_2',
      title: 'My anxiety triggered by my own past',
      narrative: [
        'Past triggered me.',
        '',
        'Memory integration therapy.',
        '',
        'Past befriended.',
        '',
        'Anxiety reduced.',
        '',
        'I tell past-stricken: integration therapy.'
      ],
      lesson: 'Memory integration therapy befriends past reducing past-trigger anxiety.'
    },
    {
      id: 'adn40_3',
      title: 'My anxiety yielded to slow living',
      narrative: [
        'Slow living philosophy.',
        '',
        'Less doing, more being.',
        '',
        'Pace reduced.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell pace-frantic: slow living treatment.'
      ],
      lesson: 'Slow living philosophy with less doing more being substantially reduces pace anxiety.'
    },
    {
      id: 'adn40_4',
      title: 'My anxiety with my own self-talk',
      narrative: [
        'Inner critic triggered me.',
        '',
        'Self-compassion therapy.',
        '',
        'Inner voice softened.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-critical: self-compassion treatment.'
      ],
      lesson: 'Self-compassion therapy softens inner critic reducing self-talk anxiety.'
    },
    {
      id: 'adn40_5',
      title: 'My anxiety yielded to ocean visits',
      narrative: [
        'Monthly ocean visits.',
        '',
        'Sound of waves.',
        '',
        'Vastness perspective.',
        '',
        'Anxiety dropped.',
        '',
        'I tell stuck-inland: ocean monthly treatment.'
      ],
      lesson: 'Monthly ocean visits provide wave sound and vastness for inland anxiety relief.'
    },
    {
      id: 'adn40_6',
      title: 'My anxiety triggered by my own social media',
      narrative: [
        'Platforms triggered me.',
        '',
        'Quit all platforms.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-anxious: quit treatment.'
      ],
      lesson: 'Quitting all social media platforms substantially reduces platform-triggered anxiety.'
    },
    {
      id: 'adn40_7',
      title: 'My anxiety yielded to weekly potluck',
      narrative: [
        'Weekly friend potluck.',
        '',
        'Food plus community.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: weekly potluck ritual.'
      ],
      lesson: 'Weekly friend potlucks anchor week with food and community.'
    },
    {
      id: 'adn40_8',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative pressure triggered me.',
        '',
        'Play over performance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell creative-pressured: play treatment.'
      ],
      lesson: 'Play-over-performance reframe reduces creative pressure anxiety.'
    },
    {
      id: 'adn40_9',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        'Morning meditation 20 min.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline transformed.',
        '',
        'I tell consistency-curious: years of practice transform.'
      ],
      lesson: 'Years of consistent 20-minute morning meditation transform anxiety baseline.'
    },
    {
      id: 'adn40_10',
      title: 'My anxiety triggered by my own ambition',
      narrative: [
        'Ambition triggered me.',
        '',
        'Ambition right-sized.',
        '',
        'Enough is enough.',
        '',
        'Anxiety dropped.',
        '',
        'I tell ambitious-anxious: right-sizing treatment.'
      ],
      lesson: 'Right-sizing ambition to enough reduces ambition-driven anxiety.'
    },
    {
      id: 'adn40_11',
      title: 'My anxiety yielded to library volunteering',
      narrative: [
        'Library volunteer weekly.',
        '',
        'Quiet service.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell quiet-volunteer-curious: library treatment.'
      ],
      lesson: 'Weekly library volunteering provides quiet service plus community for anxiety.'
    },
    {
      id: 'adn40_12',
      title: 'My anxiety with my own pace',
      narrative: [
        'Pace comparison triggered me.',
        '',
        'Own pace honored.',
        '',
        'Comparison released.',
        '',
        'Anxiety dropped.',
        '',
        'I tell pace-comparing: honor own pace.'
      ],
      lesson: 'Honoring own pace and releasing comparison reduces pace anxiety.'
    },
    {
      id: 'adn40_13',
      title: 'My anxiety yielded to evening walk together',
      narrative: [
        'Daily evening walk with partner.',
        '',
        'No phones.',
        '',
        '30 min connection.',
        '',
        'Anxiety dropped.',
        '',
        'I tell partnered: evening walk ritual.'
      ],
      lesson: 'Daily phone-free evening walks with partner anchor connection for anxiety.'
    },
    {
      id: 'adn40_14',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Present focus practice.',
        '',
        'Today only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: today only practice.'
      ],
      lesson: 'Today-only present focus practice reduces future-projection anxiety.'
    },
    {
      id: 'adn40_15',
      title: 'My anxiety yielded to monthly silent retreat',
      narrative: [
        'Monthly silent retreat day.',
        '',
        'Phone off.',
        '',
        'No words.',
        '',
        'Nervous system reset.',
        '',
        'I tell stressed-busy: monthly silent day.'
      ],
      lesson: 'Monthly silent retreat days with phone off reset nervous system for busy stressed.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_41 = [
    {
      id: 'adn41_1',
      title: 'My anxiety yielded to running club',
      narrative: [
        'Weekly running club.',
        '',
        'Body engaged.',
        '',
        'Community formed.',
        '',
        'Race training together.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: running clubs welcome.'
      ],
      lesson: 'Weekly running clubs provide body engagement plus community for anxiety.'
    },
    {
      id: 'adn41_2',
      title: 'My anxiety triggered by my own quiet',
      narrative: [
        'Silence triggered me.',
        '',
        'Background music constant.',
        '',
        'Eased me to silence gradually.',
        '',
        'Anxiety reduced.',
        '',
        'I tell silence-anxious: gradual exposure.'
      ],
      lesson: 'Silence anxiety eases through gradual exposure with background sound bridge.'
    },
    {
      id: 'adn41_3',
      title: 'My anxiety yielded to bird identification',
      narrative: [
        'Bird ID hobby daily.',
        '',
        'Outdoor observation.',
        '',
        'Patient practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: bird ID daily.'
      ],
      lesson: 'Daily bird identification practices patient outdoor observation for anxiety.'
    },
    {
      id: 'adn41_4',
      title: 'My anxiety with my own work hours',
      narrative: [
        'Work hours triggered me.',
        '',
        'Strict 8 hour boundary.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell overworking: strict hours treatment.'
      ],
      lesson: 'Strict 8-hour work boundary substantially reduces overwork anxiety.'
    },
    {
      id: 'adn41_5',
      title: 'My anxiety yielded to journaling pages',
      narrative: [
        '3 morning pages daily.',
        '',
        'Years consistent.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell journaling-curious: morning pages.'
      ],
      lesson: 'Daily three morning pages consistent over years reduces anxiety baseline.'
    },
    {
      id: 'adn41_6',
      title: 'My anxiety triggered by my own perfectionism',
      narrative: [
        'Perfectionism triggered me.',
        '',
        'Good enough practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionist: good enough treatment.'
      ],
      lesson: 'Good-enough practice reduces perfectionism-driven anxiety.'
    },
    {
      id: 'adn41_7',
      title: 'My anxiety yielded to monthly retreat',
      narrative: [
        'Monthly weekend retreat.',
        '',
        'Solo time alone.',
        '',
        'Reading plus walking.',
        '',
        'Anxiety dropped.',
        '',
        'I tell stressed: monthly retreat treatment.'
      ],
      lesson: 'Monthly weekend solo retreats reduce stress-baseline anxiety.'
    },
    {
      id: 'adn41_8',
      title: 'My anxiety with my own marriage',
      narrative: [
        'Marriage triggered me.',
        '',
        'Couples therapy.',
        '',
        'Patterns shifted.',
        '',
        'Anxiety reduced.',
        '',
        'I tell marriage-anxious: couples therapy.'
      ],
      lesson: 'Couples therapy shifts marriage patterns reducing relationship anxiety.'
    },
    {
      id: 'adn41_9',
      title: 'My anxiety yielded to morning porch',
      narrative: [
        'Porch sitting daily morning.',
        '',
        'Coffee plus weather.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell home-bound: porch morning treatment.'
      ],
      lesson: 'Daily morning porch sitting with coffee and weather grounds anxiety baseline.'
    },
    {
      id: 'adn41_10',
      title: 'My anxiety triggered by my own posture',
      narrative: [
        'Posture triggered me.',
        '',
        'Physical therapy.',
        '',
        'Plus body awareness practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell posture-watchers: PT plus awareness.'
      ],
      lesson: 'Posture-trigger anxiety eases with PT plus body awareness practice.'
    },
    {
      id: 'adn41_11',
      title: 'My anxiety yielded to walking groups',
      narrative: [
        'Walking group weekly.',
        '',
        'Community plus movement.',
        '',
        'Anchor of week.',
        '',
        'Anxiety dropped.',
        '',
        'I tell solo-walkers: groups treatment.'
      ],
      lesson: 'Weekly walking groups provide community plus movement anchor for anxiety.'
    },
    {
      id: 'adn41_12',
      title: 'My anxiety with my own creativity',
      narrative: [
        'Creative anxiety chronic.',
        '',
        'Process therapy.',
        '',
        'Play over performance.',
        '',
        'Anxiety reduced.',
        '',
        'I tell creative-anxious: play treatment.'
      ],
      lesson: 'Process therapy with play-over-performance reduces creative anxiety.'
    },
    {
      id: 'adn41_13',
      title: 'My anxiety yielded to dawn walking',
      narrative: [
        'Pre-dawn walks daily.',
        '',
        'Empty streets.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn walks transform.'
      ],
      lesson: 'Daily pre-dawn walks on empty streets transform anxiety baseline through quiet light.'
    },
    {
      id: 'adn41_14',
      title: 'My anxiety triggered by my own metrics',
      narrative: [
        'Tracking metrics triggered me.',
        '',
        'Released measurements.',
        '',
        'Process only.',
        '',
        'Anxiety dropped.',
        '',
        'I tell metric-tracking: release treatment.'
      ],
      lesson: 'Releasing metrics for process-only living reduces measurement anxiety.'
    },
    {
      id: 'adn41_15',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer practice.',
        '',
        'Day surrendered.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer treatment.'
      ],
      lesson: 'Evening prayer practice surrenders day reducing pre-sleep anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_42 = [
    {
      id: 'adn42_1',
      title: 'My anxiety yielded to garden weekly',
      narrative: [
        'Weekly garden time.',
        '',
        'Plants tended.',
        '',
        'Earth touched.',
        '',
        'Anxiety dropped.',
        '',
        'I tell gardeners: weekly time treatment.'
      ],
      lesson: 'Weekly garden time with plant tending and earth touch reduces anxiety.'
    },
    {
      id: 'adn42_2',
      title: 'My anxiety triggered by my own news',
      narrative: [
        'News triggered me.',
        '',
        'Weekly print summary only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print treatment.'
      ],
      lesson: 'Weekly print news summaries replace daily video reducing news anxiety.'
    },
    {
      id: 'adn42_3',
      title: 'My anxiety yielded to wood walking',
      narrative: [
        'Forest walks weekly.',
        '',
        'Same trail seasons.',
        '',
        'Earth time felt.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell outdoor-curious: seasonal trails treatment.'
      ],
      lesson: 'Same-trail seasonal forest walks build earth-time awareness reducing anxiety.'
    },
    {
      id: 'adn42_4',
      title: 'My anxiety with my own children',
      narrative: [
        'Worry about kids chronic.',
        '',
        'Parent therapy.',
        '',
        'Tolerating uncertainty.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: uncertainty practice.'
      ],
      lesson: 'Parent therapy on tolerating child uncertainty reduces parental worry anxiety.'
    },
    {
      id: 'adn42_5',
      title: 'My anxiety yielded to morning movement',
      narrative: [
        'Morning movement non-negotiable.',
        '',
        'Walk, stretch, yoga.',
        '',
        '20 min minimum.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary: morning movement treatment.'
      ],
      lesson: 'Non-negotiable 20-minute morning movement reduces sedentary anxiety baseline.'
    },
    {
      id: 'adn42_6',
      title: 'My anxiety triggered by my own work email',
      narrative: [
        'Email triggered me.',
        '',
        'Three check times daily.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell email-anxious: three times treatment.'
      ],
      lesson: 'Three-times-daily email checking substantially reduces email-triggered anxiety.'
    },
    {
      id: 'adn42_7',
      title: 'My anxiety yielded to weekly therapy',
      narrative: [
        'Weekly therapy years.',
        '',
        'Consistent processing.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell on-fence: years of weekly therapy transform.'
      ],
      lesson: 'Years of consistent weekly therapy transform anxiety baseline.'
    },
    {
      id: 'adn42_8',
      title: 'My anxiety with my own appearance',
      narrative: [
        'Appearance triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Function over form.',
        '',
        'Anxiety reduced.',
        '',
        'I tell image-anxious: neutrality therapy.'
      ],
      lesson: 'Body neutrality with function-over-form focus reduces appearance anxiety.'
    },
    {
      id: 'adn42_9',
      title: 'My anxiety yielded to early bedtime',
      narrative: [
        '9pm bedtime hard.',
        '',
        '6am wake.',
        '',
        '9 hours nightly.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-anxious: hard bedtime treatment.'
      ],
      lesson: 'Hard 9pm bedtime with 9 hours nightly substantially reduces sleep-anxious patterns.'
    },
    {
      id: 'adn42_10',
      title: 'My anxiety triggered by my own future',
      narrative: [
        'Future triggered me.',
        '',
        'Present focus practice.',
        '',
        'Day at a time.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: present treatment.'
      ],
      lesson: 'Day-at-a-time present focus practice reduces future-projection anxiety.'
    },
    {
      id: 'adn42_11',
      title: 'My anxiety yielded to community garden',
      narrative: [
        'Community garden plot.',
        '',
        'Weekly work.',
        '',
        'Neighbors known.',
        '',
        'Anxiety dropped.',
        '',
        'I tell urban-isolated: community gardens treatment.'
      ],
      lesson: 'Community garden plots provide weekly work with neighbor connection.'
    },
    {
      id: 'adn42_12',
      title: 'My anxiety with my own success',
      narrative: [
        'Success triggered imposter.',
        '',
        'Imposter therapy.',
        '',
        'Achievement internalized.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful: imposter therapy.'
      ],
      lesson: 'Imposter therapy internalizes achievement reducing success-triggered anxiety.'
    },
    {
      id: 'adn42_13',
      title: 'My anxiety yielded to walking meditation',
      narrative: [
        'Walking meditation daily.',
        '',
        'Foot focus practice.',
        '',
        'Mind quieted.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sitting-stuck: walking treatment.'
      ],
      lesson: 'Daily walking meditation with foot focus practice quiets mind for anxiety.'
    },
    {
      id: 'adn42_14',
      title: 'My anxiety triggered by my own work',
      narrative: [
        'Work triggered me.',
        '',
        'Career pivot.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade conscious.',
        '',
        'I tell work-stuck: pivot treatment.'
      ],
      lesson: 'Career pivot to lower-pay lower-anxiety role is conscious anxiety treatment.'
    },
    {
      id: 'adn42_15',
      title: 'My anxiety yielded to seasonal traditions',
      narrative: [
        'Seasonal traditions year round.',
        '',
        'Body aligned with time.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless: seasonal traditions ground.'
      ],
      lesson: 'Year-round seasonal traditions align body with time reducing rootless anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_29 = [
    {
      id: 'adn29_1',
      title: 'My anxiety yielded to camping trips',
      narrative: [
        'Solo camping monthly.',
        '',
        'Tent, fire, stars.',
        '',
        'No service.',
        '',
        'Nervous system reset.',
        '',
        'I tell tech-tethered: solo camping monthly resets.'
      ],
      lesson: 'Monthly solo camping trips with no service provide deep nervous system reset.'
    },
    {
      id: 'adn29_2',
      title: 'My anxiety triggered by deadlines',
      narrative: [
        'Deadline panic chronic.',
        '',
        'ADHD coach plus therapy.',
        '',
        'Strategy plus tools.',
        '',
        'Anxiety reduced.',
        '',
        'I tell deadline-anxious: ADHD coach plus therapy.'
      ],
      lesson: 'Deadline anxiety often connects to executive function needing ADHD coach plus therapy.'
    },
    {
      id: 'adn29_3',
      title: 'My anxiety yielded to historic walks',
      narrative: [
        'Historic neighborhood walks weekly.',
        '',
        'Stories absorbed.',
        '',
        'Mind engaged.',
        '',
        'Anxiety dropped.',
        '',
        'I tell history-curious: historic walks combine learning and walking.'
      ],
      lesson: 'Historic neighborhood walks combine learning and walking for anxiety relief.'
    },
    {
      id: 'adn29_4',
      title: 'My anxiety with my fertility',
      narrative: [
        'Fertility journey anxiety severe.',
        '',
        'Reproductive psychology specialty.',
        '',
        'Decision support throughout.',
        '',
        'Anxiety managed.',
        '',
        'I tell trying-couples: specialty reproductive psychology essential.'
      ],
      lesson: 'Fertility journey anxiety needs reproductive psychology specialty support throughout.'
    },
    {
      id: 'adn29_5',
      title: 'My anxiety yielded to morning farmers market',
      narrative: [
        'Saturday farmers market.',
        '',
        'Fresh produce, neighbors.',
        '',
        'Weekly anchor.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated-anxious: farmers market is community.'
      ],
      lesson: 'Weekly farmers market provides community anchor for anxiety reduction.'
    },
    {
      id: 'adn29_6',
      title: 'My anxiety triggered by my body weight scale',
      narrative: [
        'Scale triggered me.',
        '',
        'Removed scale.',
        '',
        'Body neutrality practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell scale-watchers: removal treatment.'
      ],
      lesson: 'Removing bathroom scale reduces body weight anxiety substantially.'
    },
    {
      id: 'adn29_7',
      title: 'My anxiety yielded to bookkeeping practice',
      narrative: [
        'Daily 10 min bookkeeping.',
        '',
        'Numbers managed daily.',
        '',
        'Anxiety reduced.',
        '',
        'I tell finance-anxious: daily small dose treatment.'
      ],
      lesson: 'Daily 10-minute bookkeeping reduces financial anxiety through small consistent exposure.'
    },
    {
      id: 'adn29_8',
      title: 'My anxiety with my body image',
      narrative: [
        'Body image triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Function over form.',
        '',
        'Anxiety reduced.',
        '',
        'I tell image-anxious: function focus treatment.'
      ],
      lesson: 'Body neutrality with function-over-form focus reduces body image anxiety.'
    },
    {
      id: 'adn29_9',
      title: 'My anxiety yielded to early morning walk',
      narrative: [
        '5am walks daily.',
        '',
        'Pre-traffic quiet.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn walks transformative.'
      ],
      lesson: 'Pre-dawn daily walks before traffic provide transformative anxiety relief.'
    },
    {
      id: 'adn29_10',
      title: 'My anxiety triggered by mailman',
      narrative: [
        'Mail delivery triggered me.',
        '',
        'Anticipation of bad news.',
        '',
        'PO box switched delivery.',
        '',
        'Anxiety dropped.',
        '',
        'I tell mail-anxious: PO box treatment.'
      ],
      lesson: 'PO box switch reduces mail delivery anxiety from anticipation triggers.'
    },
    {
      id: 'adn29_11',
      title: 'My anxiety yielded to neighborhood walks',
      narrative: [
        'Daily neighborhood walk same route.',
        '',
        'Neighbors known.',
        '',
        'Routine plus mild social.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated: neighborhood walks treatment.'
      ],
      lesson: 'Daily same-route neighborhood walks build neighbor recognition and reduce isolation anxiety.'
    },
    {
      id: 'adn29_12',
      title: 'My anxiety with my online presence',
      narrative: [
        'Online presence triggered me.',
        '',
        'Reduced platforms to one.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell multiply-platformed: platform reduction treatment.'
      ],
      lesson: 'Reducing online platforms to one substantially reduces presence anxiety.'
    },
    {
      id: 'adn29_13',
      title: 'My anxiety yielded to slow cooking',
      narrative: [
        'Sunday slow cook.',
        '',
        'Soups, stews simmering.',
        '',
        'House warm.',
        '',
        'Anxiety eased.',
        '',
        'I tell weekend-anxious: slow cook ritual.'
      ],
      lesson: 'Sunday slow cooking creates warm house ritual reducing weekend anxiety.'
    },
    {
      id: 'adn29_14',
      title: 'My anxiety triggered by my own hands',
      narrative: [
        'Hand shaking triggered me.',
        '',
        'Body-focused OCD pattern.',
        '',
        'CBT specialist.',
        '',
        'Anxiety reduced.',
        '',
        'I tell hand-watchers: pattern is treatable.'
      ],
      lesson: 'Hand shaking attention is body-focused OCD pattern responding to CBT.'
    },
    {
      id: 'adn29_15',
      title: 'My anxiety yielded to monthly haircut',
      narrative: [
        'Monthly haircut ritual.',
        '',
        'Same barber.',
        '',
        'Conversation, care.',
        '',
        'Anxiety eased.',
        '',
        'I tell grooming-curious: monthly ritual treatment.'
      ],
      lesson: 'Monthly haircut ritual with same barber provides conversation and care for anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_30 = [
    {
      id: 'adn30_1',
      title: 'My anxiety yielded to dawn yoga',
      narrative: [
        'Dawn yoga practice daily.',
        '',
        'Body opened with light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell movement-curious: dawn yoga timing specific.'
      ],
      lesson: 'Dawn yoga timing aligns body movement with first light for anxiety baseline reduction.'
    },
    {
      id: 'adn30_2',
      title: 'My anxiety triggered by my children growing',
      narrative: [
        'Watching children grow triggered grief.',
        '',
        'Anticipatory loss.',
        '',
        'Parent loss therapy.',
        '',
        'Anxiety managed.',
        '',
        'I tell parents: anticipatory grief is real.'
      ],
      lesson: 'Parent anticipatory grief about children growing is real and treatable.'
    },
    {
      id: 'adn30_3',
      title: 'My anxiety yielded to elder volunteering',
      narrative: [
        'Reading to elders weekly.',
        '',
        'Patience plus presence.',
        '',
        'Anxiety dropped during visits.',
        '',
        'I tell purpose-curious: elder reading treatment.'
      ],
      lesson: 'Weekly elder reading volunteer provides patience and presence for anxiety relief.'
    },
    {
      id: 'adn30_4',
      title: 'My anxiety with my own pace',
      narrative: [
        'Comparing pace triggered me.',
        '',
        'Therapy on comparison.',
        '',
        'Own pace honored.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pace-comparing: own pace honor treatment.'
      ],
      lesson: 'Honoring own pace over comparison reduces anxiety from external benchmarking.'
    },
    {
      id: 'adn30_5',
      title: 'My anxiety yielded to early evening tea',
      narrative: [
        'Tea at 4pm ritual.',
        '',
        'Stops day pace.',
        '',
        'Transition to evening.',
        '',
        'Anxiety eased.',
        '',
        'I tell pace-anxious: afternoon tea ritual.'
      ],
      lesson: 'Afternoon tea ritual transitions from work to evening reducing pace anxiety.'
    },
    {
      id: 'adn30_6',
      title: 'My anxiety triggered by my home loan',
      narrative: [
        'Mortgage triggered me.',
        '',
        'Refinance for lower payment.',
        '',
        'Anxiety reduced.',
        '',
        'I tell mortgage-anxious: refinance reduces anxiety.'
      ],
      lesson: 'Mortgage refinancing for lower payment can reduce home loan anxiety.'
    },
    {
      id: 'adn30_7',
      title: 'My anxiety yielded to flower arranging',
      narrative: [
        'Weekly flower arranging.',
        '',
        'Color, form, balance.',
        '',
        'Anxiety paused.',
        '',
        'I tell visual-curious: flower arranging meditation.'
      ],
      lesson: 'Weekly flower arranging provides color, form, balance meditation for anxiety.'
    },
    {
      id: 'adn30_8',
      title: 'My anxiety with my work pace',
      narrative: [
        'Work pace triggered me.',
        '',
        'Slower role found.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade made consciously.',
        '',
        'I tell fast-paced: slower role is treatment.'
      ],
      lesson: 'Trading pace for income through slower work role can be anxiety treatment.'
    },
    {
      id: 'adn30_9',
      title: 'My anxiety yielded to wood whittling',
      narrative: [
        'Whittling evenings.',
        '',
        'Small pieces, hands busy.',
        '',
        'Mind eased.',
        '',
        'I tell hand-busy curious: whittling accessible craft.'
      ],
      lesson: 'Evening whittling provides accessible hand-busy craft for anxiety relief.'
    },
    {
      id: 'adn30_10',
      title: 'My anxiety triggered by news cycle',
      narrative: [
        'News cycle triggered me.',
        '',
        'Weekly print summary only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print treatment.'
      ],
      lesson: 'Weekly print news summaries substantially reduce daily news cycle anxiety.'
    },
    {
      id: 'adn30_11',
      title: 'My anxiety yielded to chamber music',
      narrative: [
        'Joined amateur chamber group.',
        '',
        'Weekly rehearsals.',
        '',
        'Music intimate.',
        '',
        'Anxiety dropped.',
        '',
        'I tell musical-curious: chamber music intimate community.'
      ],
      lesson: 'Amateur chamber music groups provide intimate musical community for anxiety.'
    },
    {
      id: 'adn30_12',
      title: 'My anxiety with my own emotions',
      narrative: [
        'Emotions triggered me.',
        '',
        'Emotion-focused therapy.',
        '',
        'Sit with feelings practice.',
        '',
        'Anxiety reduced.',
        '',
        'I tell feeling-avoidant: emotion-focused therapy.'
      ],
      lesson: 'Sit-with-feelings emotion-focused therapy reduces avoidance-driven anxiety.'
    },
    {
      id: 'adn30_13',
      title: 'My anxiety yielded to morning bird identification',
      narrative: [
        'Bird call ID at dawn.',
        '',
        'Patient listening.',
        '',
        'Species learned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sound-curious: bird call ID is meditation.'
      ],
      lesson: 'Bird call identification at dawn provides patient listening meditation.'
    },
    {
      id: 'adn30_14',
      title: 'My anxiety triggered by my own success',
      narrative: [
        'Success triggered imposter anxiety.',
        '',
        'Imposter therapy specialty.',
        '',
        'Internalize achievements.',
        '',
        'Anxiety reduced.',
        '',
        'I tell successful-anxious: imposter therapy specialty.'
      ],
      lesson: 'Success-triggered imposter anxiety has specialty therapy for internalizing achievements.'
    },
    {
      id: 'adn30_15',
      title: 'My anxiety yielded to silent dinner',
      narrative: [
        'Once weekly silent dinner.',
        '',
        'With family or alone.',
        '',
        'No phones, no talking.',
        '',
        'Anxiety eased through quiet.',
        '',
        'I tell talk-heavy: silent meal ritual.'
      ],
      lesson: 'Weekly silent dinner ritual reduces talk-heavy daily anxiety through quiet.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_31 = [
    {
      id: 'adn31_1',
      title: 'My anxiety yielded to oil painting',
      narrative: [
        'Oil painting weekly.',
        '',
        'Slow medium.',
        '',
        'Hours absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell visual-curious: oil painting deep absorption.'
      ],
      lesson: 'Oil painting weekly provides deep absorption through slow medium for anxiety.'
    },
    {
      id: 'adn31_2',
      title: 'My anxiety triggered by my morning rush',
      narrative: [
        'Rushed mornings triggered me.',
        '',
        'Wake 90 min earlier.',
        '',
        'Slow morning protected.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell rushed-mornings: wake earlier protect morning.'
      ],
      lesson: 'Waking 90 minutes earlier protects slow morning and reduces rush anxiety.'
    },
    {
      id: 'adn31_3',
      title: 'My anxiety yielded to letter writing',
      narrative: [
        'Hand letters monthly.',
        '',
        'Pen, paper, time.',
        '',
        'Slow connection.',
        '',
        'I tell connection-craving: hand letters revive slow connection.'
      ],
      lesson: 'Monthly hand letters revive slow connection counter to instant communication anxiety.'
    },
    {
      id: 'adn31_4',
      title: 'My anxiety with my own death',
      narrative: [
        'Death anxiety paralyzed me.',
        '',
        'Existential therapy.',
        '',
        'Death acceptance practice.',
        '',
        'Living more fully.',
        '',
        'I tell death-anxious: existential therapy specific.'
      ],
      lesson: 'Death anxiety responds to existential therapy with acceptance practice.'
    },
    {
      id: 'adn31_5',
      title: 'My anxiety yielded to morning radio',
      narrative: [
        'Classical music morning radio.',
        '',
        'Coffee plus music.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell media-curious: classical morning is treatment.'
      ],
      lesson: 'Classical morning radio with coffee reduces anxiety baseline through calming media.'
    },
    {
      id: 'adn31_6',
      title: 'My anxiety triggered by my children leaving',
      narrative: [
        'Empty nest looming.',
        '',
        'Pre-empty therapy.',
        '',
        'New identity prepared.',
        '',
        'Transition softened.',
        '',
        'I tell pre-empty-nest: anticipatory therapy works.'
      ],
      lesson: 'Anticipatory empty nest therapy softens transition through pre-built identity.'
    },
    {
      id: 'adn31_7',
      title: 'My anxiety yielded to wilderness silence',
      narrative: [
        'Weekend wilderness alone.',
        '',
        'No phone signal.',
        '',
        'Silence absorbed.',
        '',
        'Anxiety reset.',
        '',
        'I tell tech-tethered: wilderness silence treatment.'
      ],
      lesson: 'Weekend wilderness silence without signal provides anxiety reset.'
    },
    {
      id: 'adn31_8',
      title: 'My anxiety with my partners health',
      narrative: [
        'Partners health triggered me.',
        '',
        'Caregiver therapy.',
        '',
        'Plus my own health focus.',
        '',
        'Both managed.',
        '',
        'I tell caregivers: own health protects caregiving.'
      ],
      lesson: 'Caregiver own health protection prevents anxiety from partner illness.'
    },
    {
      id: 'adn31_9',
      title: 'My anxiety yielded to weekly art viewing',
      narrative: [
        'Museum visit weekly.',
        '',
        'One piece deeply.',
        '',
        'Slow attention.',
        '',
        'Anxiety paused.',
        '',
        'I tell visual-curious: one piece deep practice.'
      ],
      lesson: 'Weekly one-piece deep museum viewing practices slow attention for anxiety.'
    },
    {
      id: 'adn31_10',
      title: 'My anxiety triggered by birthdays',
      narrative: [
        'Birthdays triggered me.',
        '',
        'Marking time, aging.',
        '',
        'Birthday rituals designed.',
        '',
        'Anxiety contained.',
        '',
        'I tell birthday-anxious: designed rituals contain.'
      ],
      lesson: 'Designed birthday rituals contain time-marking and aging anxiety.'
    },
    {
      id: 'adn31_11',
      title: 'My anxiety yielded to friend phone call',
      narrative: [
        'Weekly long friend call.',
        '',
        'No agenda.',
        '',
        'Catch up free flow.',
        '',
        'Anxiety dropped.',
        '',
        'I tell friendship-craving: weekly long calls treatment.'
      ],
      lesson: 'Weekly agenda-free long friend phone calls reduce anxiety through depth.'
    },
    {
      id: 'adn31_12',
      title: 'My anxiety with my child friend',
      narrative: [
        'Child friends triggered me.',
        '',
        'Communication with child.',
        '',
        'Trust building.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parent-friend-anxious: communication treatment.'
      ],
      lesson: 'Parent-child communication about friends reduces parental anxiety more than restriction.'
    },
    {
      id: 'adn31_13',
      title: 'My anxiety yielded to silent retreat',
      narrative: [
        'Monthly silent day.',
        '',
        'Phone off, words limited.',
        '',
        'Nervous system reset.',
        '',
        'I tell stressed-busy: monthly silent day treatment.'
      ],
      lesson: 'Monthly silent day with phone off resets nervous system for stressed-busy.'
    },
    {
      id: 'adn31_14',
      title: 'My anxiety triggered by my own laughter',
      narrative: [
        'Laughter triggered me oddly.',
        '',
        'Trauma association.',
        '',
        'EMDR for laughter trigger.',
        '',
        'Anxiety reduced.',
        '',
        'I tell odd-triggered: EMDR for specific triggers.'
      ],
      lesson: 'Odd triggers like laughter can have trauma roots responding to EMDR.'
    },
    {
      id: 'adn31_15',
      title: 'My anxiety yielded to fasting practice',
      narrative: [
        'Daily intermittent fast.',
        '',
        'Body discipline.',
        '',
        'Hunger tolerated.',
        '',
        'Anxiety reduced over months.',
        '',
        'I tell discipline-curious: fasting builds tolerance.'
      ],
      lesson: 'Daily intermittent fasting builds discomfort tolerance reducing baseline anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_32 = [
    {
      id: 'adn32_1',
      title: 'My anxiety yielded to printmaking',
      narrative: [
        'Block print weekly.',
        '',
        'Carving, ink, paper.',
        '',
        'Hands engaged.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: printmaking is treatment.'
      ],
      lesson: 'Weekly printmaking provides hand-engaged craft anxiety relief.'
    },
    {
      id: 'adn32_2',
      title: 'My anxiety triggered by my smartphone',
      narrative: [
        'Smartphone triggered me.',
        '',
        'Switched to dumb phone.',
        '',
        'Calls and texts only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell smartphone-anxious: dumb phone treatment.'
      ],
      lesson: 'Switching to dumb phone substantially reduces smartphone-triggered anxiety.'
    },
    {
      id: 'adn32_3',
      title: 'My anxiety yielded to silk painting',
      narrative: [
        'Silk painting hobby.',
        '',
        'Color spread on fabric.',
        '',
        'Anxiety paused during work.',
        '',
        'I tell visual-curious: silk painting unique medium.'
      ],
      lesson: 'Silk painting provides unique medium for visual artist anxiety relief.'
    },
    {
      id: 'adn32_4',
      title: 'My anxiety with my workplace',
      narrative: [
        'Workplace triggered me.',
        '',
        'Remote work negotiated.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell workplace-anxious: remote work treatment.'
      ],
      lesson: 'Negotiated remote work substantially reduces workplace-triggered anxiety.'
    },
    {
      id: 'adn32_5',
      title: 'My anxiety yielded to volunteering hospice',
      narrative: [
        'Hospice volunteer weekly.',
        '',
        'Presence with dying.',
        '',
        'Perspective shifted.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perspective-seeking: hospice volunteering treatment.'
      ],
      lesson: 'Hospice volunteering shifts life perspective and reduces anxiety through service.'
    },
    {
      id: 'adn32_6',
      title: 'My anxiety triggered by parking lots',
      narrative: [
        'Parking lots triggered me.',
        '',
        'Trauma association.',
        '',
        'EMDR for parking lots.',
        '',
        'Anxiety reduced.',
        '',
        'I tell place-triggered: EMDR for places.'
      ],
      lesson: 'Place-specific anxiety triggers respond to targeted EMDR.'
    },
    {
      id: 'adn32_7',
      title: 'My anxiety yielded to swimming class',
      narrative: [
        'Adult swimming lessons.',
        '',
        'Skill plus body.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell water-anxious: adult lessons welcome.'
      ],
      lesson: 'Adult swimming lessons build skill and body confidence reducing anxiety.'
    },
    {
      id: 'adn32_8',
      title: 'My anxiety with my family secrets',
      narrative: [
        'Family secrets triggered me.',
        '',
        'Truth-telling therapy.',
        '',
        'Family system shifted.',
        '',
        'Anxiety reduced.',
        '',
        'I tell secret-keeping: truth-telling treatment.'
      ],
      lesson: 'Truth-telling therapy resolves family secret anxiety through system shift.'
    },
    {
      id: 'adn32_9',
      title: 'My anxiety yielded to creative dance',
      narrative: [
        'Creative dance class.',
        '',
        'Free movement.',
        '',
        'Body expressed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: creative dance free.'
      ],
      lesson: 'Creative dance class provides free movement expression for anxiety relief.'
    },
    {
      id: 'adn32_10',
      title: 'My anxiety triggered by my own past',
      narrative: [
        'Past memories triggered me.',
        '',
        'Trauma therapy.',
        '',
        'Memories integrated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell memory-stricken: integration through therapy.'
      ],
      lesson: 'Past memory integration through trauma therapy reduces memory-triggered anxiety.'
    },
    {
      id: 'adn32_11',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool swim daily.',
        '',
        'Body engaged early.',
        '',
        'Day started clear.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: pre-work swim treatment.'
      ],
      lesson: 'Pre-work morning swim provides body engagement starting day clear.'
    },
    {
      id: 'adn32_12',
      title: 'My anxiety with my own appearance',
      narrative: [
        'Appearance triggered me.',
        '',
        'Limited mirror exposure.',
        '',
        'Plus body neutrality.',
        '',
        'Anxiety dropped.',
        '',
        'I tell mirror-triggered: limit plus neutrality.'
      ],
      lesson: 'Limited mirror exposure plus body neutrality reduces appearance anxiety.'
    },
    {
      id: 'adn32_13',
      title: 'My anxiety yielded to weekend reading',
      narrative: [
        'Saturday morning reading hour.',
        '',
        'Book absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell readers: weekend reading ritual.'
      ],
      lesson: 'Saturday morning reading hour rituals absorb mind for anxiety relief.'
    },
    {
      id: 'adn32_14',
      title: 'My anxiety triggered by school events',
      narrative: [
        'Child school events triggered me.',
        '',
        'Pre-event prep.',
        '',
        'Plus support person.',
        '',
        'Anxiety reduced.',
        '',
        'I tell school-anxious parents: prep plus support.'
      ],
      lesson: 'School event parental anxiety eases with pre-event prep and support person.'
    },
    {
      id: 'adn32_15',
      title: 'My anxiety yielded to home meditation room',
      narrative: [
        'Dedicated meditation room.',
        '',
        'Cushion, candle, time.',
        '',
        'Sacred space.',
        '',
        'Anxiety lower in room.',
        '',
        'I tell home-meditating: dedicated space helps.'
      ],
      lesson: 'Dedicated meditation room creates sacred space that reduces anxiety on entry.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_33 = [
    {
      id: 'adn33_1',
      title: 'My anxiety yielded to weekend cooking project',
      narrative: [
        'Weekend cooking project.',
        '',
        'Multi-hour recipes.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell weekend-anxious: cooking project treatment.'
      ],
      lesson: 'Weekend multi-hour cooking projects absorb mind for weekend anxiety relief.'
    },
    {
      id: 'adn33_2',
      title: 'My anxiety triggered by my hair loss',
      narrative: [
        'Hair loss triggered me.',
        '',
        'Body image therapy.',
        '',
        'Identity beyond hair.',
        '',
        'Anxiety reduced.',
        '',
        'I tell hair-losing: identity therapy treatment.'
      ],
      lesson: 'Hair loss anxiety eases through body image therapy beyond appearance.'
    },
    {
      id: 'adn33_3',
      title: 'My anxiety yielded to historic reading',
      narrative: [
        'Historic fiction weekly.',
        '',
        'Other times absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: history fiction transports.'
      ],
      lesson: 'Historic fiction transports mind to other times for anxiety relief.'
    },
    {
      id: 'adn33_4',
      title: 'My anxiety with my child sleep',
      narrative: [
        'Child sleep triggered me.',
        '',
        'Pediatric sleep specialist.',
        '',
        'Plus parent sleep coaching.',
        '',
        'Family slept.',
        '',
        'I tell sleep-deprived parents: specialty exists.'
      ],
      lesson: 'Pediatric sleep specialty plus parent sleep coaching solves family sleep anxiety.'
    },
    {
      id: 'adn33_5',
      title: 'My anxiety yielded to community drumming',
      narrative: [
        'Community drum circle weekly.',
        '',
        'Rhythm shared.',
        '',
        'Body resonated.',
        '',
        'Anxiety dropped.',
        '',
        'I tell rhythm-curious: drum circles welcome.'
      ],
      lesson: 'Community drum circles provide shared rhythm body resonance for anxiety.'
    },
    {
      id: 'adn33_6',
      title: 'My anxiety triggered by my own breathing pattern',
      narrative: [
        'Breath pattern triggered me.',
        '',
        'Pranayama practice.',
        '',
        'Conscious breath patterns.',
        '',
        'Anxiety reduced.',
        '',
        'I tell breath-anxious: pranayama specific.'
      ],
      lesson: 'Pranayama conscious breath patterns reduce breath-triggered anxiety.'
    },
    {
      id: 'adn33_7',
      title: 'My anxiety yielded to evening walk',
      narrative: [
        'Evening walk with partner.',
        '',
        'Daily ritual.',
        '',
        'Connection plus movement.',
        '',
        'Anxiety dropped.',
        '',
        'I tell partnered: evening walk ritual.'
      ],
      lesson: 'Daily evening walks with partner combine connection and movement for anxiety.'
    },
    {
      id: 'adn33_8',
      title: 'My anxiety with my workplace politics',
      narrative: [
        'Office politics triggered me.',
        '',
        'Therapy on boundaries.',
        '',
        'Plus mentor for navigation.',
        '',
        'Anxiety reduced.',
        '',
        'I tell politics-anxious: boundaries plus mentor.'
      ],
      lesson: 'Office politics anxiety eases with boundary therapy plus workplace mentor.'
    },
    {
      id: 'adn33_9',
      title: 'My anxiety yielded to morning swim',
      narrative: [
        '6am pool swim daily.',
        '',
        'Quiet pool.',
        '',
        'Body engaged.',
        '',
        'Day started clear.',
        '',
        'I tell movement-curious: early swim transformative.'
      ],
      lesson: 'Early morning swim in quiet pool transforms day through clear body engagement.'
    },
    {
      id: 'adn33_10',
      title: 'My anxiety triggered by my own posture',
      narrative: [
        'Posture awareness triggered me.',
        '',
        'Physical therapy.',
        '',
        'Plus posture training.',
        '',
        'Anxiety reduced.',
        '',
        'I tell posture-watchers: PT plus training treatment.'
      ],
      lesson: 'Posture anxiety eases with physical therapy plus formal posture training.'
    },
    {
      id: 'adn33_11',
      title: 'My anxiety yielded to weekly bridge',
      narrative: [
        'Bridge club weekly.',
        '',
        'Strategy plus community.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell card-curious: bridge clubs welcome adults.'
      ],
      lesson: 'Weekly bridge clubs combine strategy and community for adult anxiety relief.'
    },
    {
      id: 'adn33_12',
      title: 'My anxiety with my own future',
      narrative: [
        'Future projection triggered me.',
        '',
        'Present focus practice.',
        '',
        'One day at a time.',
        '',
        'Anxiety reduced.',
        '',
        'I tell future-projecting: present focus treatment.'
      ],
      lesson: 'Present focus practice replaces future projection reducing future-trigger anxiety.'
    },
    {
      id: 'adn33_13',
      title: 'My anxiety yielded to outdoor cooking',
      narrative: [
        'Weekend outdoor grill.',
        '',
        'Fire, food, friends.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: outdoor cooking ritual.'
      ],
      lesson: 'Weekend outdoor grilling provides fire-food-friends ritual for anxiety relief.'
    },
    {
      id: 'adn33_14',
      title: 'My anxiety triggered by certain music',
      narrative: [
        'Specific songs triggered me.',
        '',
        'Trauma association.',
        '',
        'Created new playlist.',
        '',
        'Old songs avoided.',
        '',
        'Anxiety reduced.',
        '',
        'I tell music-triggered: new playlist treatment.'
      ],
      lesson: 'Curating new playlists while avoiding trauma-associated music reduces anxiety.'
    },
    {
      id: 'adn33_15',
      title: 'My anxiety yielded to evening lighting',
      narrative: [
        'Dim warm light evenings.',
        '',
        'Blue light off.',
        '',
        'Body signaled night.',
        '',
        'Sleep arrived.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: lighting matters.'
      ],
      lesson: 'Dim warm evening lighting signals night to body, reducing pre-sleep anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_34 = [
    {
      id: 'adn34_1',
      title: 'My anxiety yielded to public library',
      narrative: [
        'Daily library visit.',
        '',
        'Quiet, free, welcoming.',
        '',
        'Reading sanctuary.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated readers: public library is third place.'
      ],
      lesson: 'Public libraries provide free, quiet, welcoming third place for anxiety relief.'
    },
    {
      id: 'adn34_2',
      title: 'My anxiety triggered by my own voice',
      narrative: [
        'Hearing my voice recorded triggered me.',
        '',
        'Self-criticism pattern.',
        '',
        'Self-compassion therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell voice-uncomfortable: self-compassion treatment.'
      ],
      lesson: 'Recorded voice discomfort reflects self-criticism patterns responding to self-compassion.'
    },
    {
      id: 'adn34_3',
      title: 'My anxiety yielded to gallery visits',
      narrative: [
        'Weekly art gallery visits.',
        '',
        'Free entry.',
        '',
        'Beauty absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell beauty-craving: free galleries available.'
      ],
      lesson: 'Free weekly gallery visits provide beauty absorption for anxiety relief.'
    },
    {
      id: 'adn34_4',
      title: 'My anxiety with my work performance',
      narrative: [
        'Performance anxiety chronic.',
        '',
        'Coaching plus therapy.',
        '',
        'Skill plus inner work.',
        '',
        'Anxiety reduced.',
        '',
        'I tell performance-anxious: skill plus inner work.'
      ],
      lesson: 'Workplace performance anxiety needs both external skill coaching and internal therapy.'
    },
    {
      id: 'adn34_5',
      title: 'My anxiety yielded to wood walking',
      narrative: [
        'Forest walks weekly.',
        '',
        'No goal.',
        '',
        'Wander practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell goal-driven: aimless forest walks treatment.'
      ],
      lesson: 'Aimless forest wandering counters goal-driven anxiety through directed surrender.'
    },
    {
      id: 'adn34_6',
      title: 'My anxiety triggered by my mailbox',
      narrative: [
        'Mailbox triggered me.',
        '',
        'PO box switched.',
        '',
        'Pick up at intervals.',
        '',
        'Anxiety dropped.',
        '',
        'I tell mail-anxious: PO box and intervals.'
      ],
      lesson: 'PO box switch with interval pickup reduces mailbox-triggered anxiety.'
    },
    {
      id: 'adn34_7',
      title: 'My anxiety yielded to bird walks',
      narrative: [
        'Bird walks weekly group.',
        '',
        'Patient observation.',
        '',
        'Community plus nature.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell observation-curious: bird walks group.'
      ],
      lesson: 'Weekly group bird walks combine patient observation with community for anxiety.'
    },
    {
      id: 'adn34_8',
      title: 'My anxiety with my own thoughts loop',
      narrative: [
        'Thought loops triggered me.',
        '',
        'CBT for rumination.',
        '',
        'Plus mindfulness practice.',
        '',
        'Loops broken.',
        '',
        'I tell ruminators: CBT plus mindfulness.'
      ],
      lesson: 'Rumination thought loops respond to combined CBT and mindfulness practice.'
    },
    {
      id: 'adn34_9',
      title: 'My anxiety yielded to evening prayer',
      narrative: [
        'Evening prayer 10 min.',
        '',
        'Day reviewed in faith.',
        '',
        'Surrender practice.',
        '',
        'Sleep arrived.',
        '',
        'I tell faithful: evening prayer treatment.'
      ],
      lesson: 'Evening prayer provides faith-based day surrender for pre-sleep anxiety.'
    },
    {
      id: 'adn34_10',
      title: 'My anxiety triggered by hospital sounds',
      narrative: [
        'Hospital sounds triggered me.',
        '',
        'EMDR for sounds.',
        '',
        'Anxiety reduced.',
        '',
        'I tell sound-traumatized: EMDR for sounds.'
      ],
      lesson: 'Sound-trauma triggers respond to targeted EMDR therapy.'
    },
    {
      id: 'adn34_11',
      title: 'My anxiety yielded to community pottery',
      narrative: [
        'Community pottery studio weekly.',
        '',
        'Wheel throwing.',
        '',
        'Other potters.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: community studios welcome.'
      ],
      lesson: 'Community pottery studios welcome members for craft and community anxiety relief.'
    },
    {
      id: 'adn34_12',
      title: 'My anxiety with my family identity',
      narrative: [
        'Family identity triggered me.',
        '',
        'Family of origin therapy.',
        '',
        'Differentiation practice.',
        '',
        'Anxiety reduced.',
        '',
        'I tell family-bound: differentiation therapy.'
      ],
      lesson: 'Family of origin differentiation therapy reduces family-identity anxiety.'
    },
    {
      id: 'adn34_13',
      title: 'My anxiety yielded to morning sketch',
      narrative: [
        'Morning sketch ritual.',
        '',
        '15 min daily.',
        '',
        'Visual journal.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell visual-curious: morning sketch ritual.'
      ],
      lesson: 'Daily 15-minute morning sketch ritual provides visual journal for anxiety baseline.'
    },
    {
      id: 'adn34_14',
      title: 'My anxiety triggered by certain seasons',
      narrative: [
        'Specific season triggered me.',
        '',
        'Seasonal pattern named.',
        '',
        'Season-specific tools.',
        '',
        'Anxiety prepared.',
        '',
        'I tell season-affected: pattern recognition treatment.'
      ],
      lesson: 'Seasonal anxiety patterns benefit from recognition and season-specific tool preparation.'
    },
    {
      id: 'adn34_15',
      title: 'My anxiety yielded to morning movement',
      narrative: [
        'Morning movement non-negotiable.',
        '',
        'Walk, stretch, or yoga.',
        '',
        '20 min minimum.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell sedentary: morning movement treatment.'
      ],
      lesson: 'Twenty-minute morning movement of any kind is non-negotiable anxiety treatment.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_23 = [
    {
      id: 'adn23_1',
      title: 'My anxiety yielded to weight lifting',
      narrative: [
        'Strength training 3x weekly.',
        '',
        'Body engaged powerfully.',
        '',
        'Stress released.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck anxious: strength training is treatment.'
      ],
      lesson: 'Strength training three times weekly is treatment-grade anxiety relief.'
    },
    {
      id: 'adn23_2',
      title: 'My anxiety triggered by my child crying',
      narrative: [
        'Baby cries triggered me.',
        '',
        'Postpartum sensory.',
        '',
        'Earplugs reduced acuity.',
        '',
        'Plus therapy on parent anxiety.',
        '',
        'Tolerance built.',
        '',
        'I tell sensitive parents: tools plus therapy together.'
      ],
      lesson: 'Sound-sensitive postpartum anxiety eases with practical earplugs plus therapy.'
    },
    {
      id: 'adn23_3',
      title: 'My anxiety yielded to vegetable garden',
      narrative: [
        'Backyard vegetable garden.',
        '',
        'Daily tending.',
        '',
        'Harvest weekly.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-owners: vegetable garden treatment.'
      ],
      lesson: 'Backyard vegetable gardens provide daily tending and harvest rhythm for anxiety.'
    },
    {
      id: 'adn23_4',
      title: 'My anxiety with my IRA',
      narrative: [
        'Retirement account anxiety.',
        '',
        'Could not check balance.',
        '',
        'Quarterly checks only.',
        '',
        'Plus financial advisor reassurance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell investment-anxious: limit checking is treatment.'
      ],
      lesson: 'Limiting investment account checking to quarterly reduces investment anxiety.'
    },
    {
      id: 'adn23_5',
      title: 'My anxiety yielded to spinning',
      narrative: [
        'Spin class three times weekly.',
        '',
        'Music plus movement.',
        '',
        'Cardio release.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: spin class accessible.'
      ],
      lesson: 'Spin class combines music and cardio for accessible anxiety relief.'
    },
    {
      id: 'adn23_6',
      title: 'My anxiety triggered by mens shame',
      narrative: [
        'Men do not discuss anxiety.',
        '',
        'Cultural script triggered shame.',
        '',
        'Mens therapy specialty.',
        '',
        'Plus mens group.',
        '',
        'Anxiety addressed openly.',
        '',
        'I tell ashamed men: mens specialty therapy exists.'
      ],
      lesson: 'Mens shame around anxiety responds to specialty mens therapy plus group.'
    },
    {
      id: 'adn23_7',
      title: 'My anxiety yielded to swim team',
      narrative: [
        'Adult masters swim team.',
        '',
        'Weekly practices, community, races.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: adult swim teams welcome.'
      ],
      lesson: 'Adult masters swim teams combine routine practice with community for anxiety.'
    },
    {
      id: 'adn23_8',
      title: 'My anxiety with my dating life',
      narrative: [
        'Dating anxiety chronic.',
        '',
        'Therapy plus dating coach team.',
        '',
        'Practice plus skill.',
        '',
        'Found partner eventually.',
        '',
        'I tell dating-anxious: team approach works.'
      ],
      lesson: 'Dating anxiety responds to combined therapy plus dating coach team.'
    },
    {
      id: 'adn23_9',
      title: 'My anxiety yielded to summer camp',
      narrative: [
        'Adult summer camp week.',
        '',
        'Activities, community, nature.',
        '',
        'Camp reset perspective.',
        '',
        'I tell stuck-adults: adult camps exist for this.'
      ],
      lesson: 'Adult summer camps provide week-long reset of anxiety perspective.'
    },
    {
      id: 'adn23_10',
      title: 'My anxiety triggered by social media notifications',
      narrative: [
        'Notification sounds triggered me.',
        '',
        'Turned off all notifications.',
        '',
        'Apps removed from phone home screen.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell phone-anxious: notification audit transforms.'
      ],
      lesson: 'Disabling notifications and home-screen apps transforms phone-related anxiety.'
    },
    {
      id: 'adn23_11',
      title: 'My anxiety yielded to home repair',
      narrative: [
        'Home repair projects weekly.',
        '',
        'Tools, problem, solution.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell home-owners: weekend repairs are treatment.'
      ],
      lesson: 'Home repair projects provide weekend cognitive absorption for anxiety relief.'
    },
    {
      id: 'adn23_12',
      title: 'My anxiety with my children growing',
      narrative: [
        'Empty nest looming.',
        '',
        'Anticipated anxiety.',
        '',
        'Pre-emptive therapy.',
        '',
        'New identity built before kids left.',
        '',
        'Transition manageable.',
        '',
        'I tell pre-empty-nest: anticipatory therapy works.'
      ],
      lesson: 'Anticipatory empty nest therapy builds identity before transition reduces anxiety.'
    },
    {
      id: 'adn23_13',
      title: 'My anxiety yielded to creative writing class',
      narrative: [
        'Weekly creative writing class.',
        '',
        'Voice developed.',
        '',
        'Workshop feedback.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell writers: classes structure practice.'
      ],
      lesson: 'Creative writing classes structure practice and community for writer anxiety.'
    },
    {
      id: 'adn23_14',
      title: 'My anxiety triggered by parent illness',
      narrative: [
        'Mothers diagnosis triggered me.',
        '',
        'Adult child caregivers therapy.',
        '',
        'Plus elder care coordinator.',
        '',
        'Managed care plus self.',
        '',
        'I tell adult children: caregiver therapy plus coordinator.'
      ],
      lesson: 'Parent illness anxiety in adult children needs caregiver therapy plus care coordinator.'
    },
    {
      id: 'adn23_15',
      title: 'My anxiety yielded to museum visits',
      narrative: [
        'Weekly museum visits.',
        '',
        'Slow attention.',
        '',
        'Beauty plus thought.',
        '',
        'Anxiety paused.',
        '',
        'I tell urban-living: museums are sanctuary.'
      ],
      lesson: 'Weekly museum visits provide urban sanctuary through slow attention and beauty.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_24 = [
    {
      id: 'adn24_1',
      title: 'My anxiety yielded to letter writing',
      narrative: [
        'Hand-written letters monthly.',
        '',
        'Pen, paper, time.',
        '',
        'Slow communication.',
        '',
        'Anxiety eased during writing.',
        '',
        'I tell connection-craving: hand letters revive.'
      ],
      lesson: 'Hand-written letter practice revives slow connection and reduces anxiety.'
    },
    {
      id: 'adn24_2',
      title: 'My anxiety triggered by online dating',
      narrative: [
        'App overwhelm severe.',
        '',
        'Set limits: 15 min daily.',
        '',
        'Three substantive conversations only.',
        '',
        'Anxiety reduced.',
        '',
        'I tell app-overwhelmed: strict limits transform.'
      ],
      lesson: 'Strict daily limits on dating apps transform overwhelming experience.'
    },
    {
      id: 'adn24_3',
      title: 'My anxiety yielded to running',
      narrative: [
        '5K runs three times weekly.',
        '',
        'Body processed.',
        '',
        'Mind cleared.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell exercise-curious: 5K beginnings work.'
      ],
      lesson: 'Three 5K runs weekly process anxiety through cardiovascular release.'
    },
    {
      id: 'adn24_4',
      title: 'My anxiety with my own attention',
      narrative: [
        'Cannot focus, anxiety surged.',
        '',
        'ADHD evaluation revealed.',
        '',
        'Treatment changed everything.',
        '',
        'Anxiety reduced as focus returned.',
        '',
        'I tell focus-anxious: rule out ADHD.'
      ],
      lesson: 'Anxiety from focus problems may reflect untreated ADHD needing evaluation.'
    },
    {
      id: 'adn24_5',
      title: 'My anxiety yielded to outdoor coffee',
      narrative: [
        'Morning coffee outside.',
        '',
        'All seasons.',
        '',
        'Air, light, sound.',
        '',
        'Day grounded.',
        '',
        'I tell ritual-curious: outdoor morning ritual is treatment.'
      ],
      lesson: 'Outdoor morning coffee in all seasons grounds nervous system for anxiety.'
    },
    {
      id: 'adn24_6',
      title: 'My anxiety triggered by family group chats',
      narrative: [
        'Family chat triggered me.',
        '',
        'Set notification times.',
        '',
        'Limited engagement.',
        '',
        'Anxiety reduced.',
        '',
        'I tell family-chat-anxious: structured engagement.'
      ],
      lesson: 'Family group chat anxiety eases with structured engagement times.'
    },
    {
      id: 'adn24_7',
      title: 'My anxiety yielded to candle making',
      narrative: [
        'Candle making weekly.',
        '',
        'Wax, wicks, scents.',
        '',
        'Hands engaged.',
        '',
        'Anxiety paused.',
        '',
        'I tell craft-curious: candle making accessible.'
      ],
      lesson: 'Candle making provides accessible craft engagement for anxiety relief.'
    },
    {
      id: 'adn24_8',
      title: 'My anxiety with my appearance aging',
      narrative: [
        'Aging appearance triggered me.',
        '',
        'Body neutrality therapy.',
        '',
        'Plus self-compassion practice.',
        '',
        'Aging accepted gradually.',
        '',
        'I tell appearance-aging: neutrality plus compassion.'
      ],
      lesson: 'Aging appearance anxiety eases through body neutrality plus self-compassion.'
    },
    {
      id: 'adn24_9',
      title: 'My anxiety yielded to morning coffee with partner',
      narrative: [
        'Daily morning coffee together.',
        '',
        'No phones.',
        '',
        '20 minutes.',
        '',
        'Anxiety lower throughout day.',
        '',
        'I tell partnered: daily ritual together.'
      ],
      lesson: 'Daily phone-free morning ritual with partner reduces relationship-anchored anxiety.'
    },
    {
      id: 'adn24_10',
      title: 'My anxiety triggered by my therapy',
      narrative: [
        'Therapy ending triggered me.',
        '',
        'Termination therapy.',
        '',
        'Process planned.',
        '',
        'Anxiety contained.',
        '',
        'I tell therapy-ending: termination work intentional.'
      ],
      lesson: 'Therapy termination is intentional process containing transition anxiety.'
    },
    {
      id: 'adn24_11',
      title: 'My anxiety yielded to morning journaling',
      narrative: [
        'Daily morning journaling.',
        '',
        '5 min minimum.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell journaling-curious: 5 min daily enough.'
      ],
      lesson: 'Five minutes daily morning journaling is sufficient to reduce anxiety baseline.'
    },
    {
      id: 'adn24_12',
      title: 'My anxiety with my body sounds',
      narrative: [
        'Heart sound, breath sound triggered.',
        '',
        'Health anxiety hyper-focus.',
        '',
        'CBT plus exposure to body sounds.',
        '',
        'Anxiety dropped.',
        '',
        'I tell body-sound-watchers: CBT redirects.'
      ],
      lesson: 'Body sound hyper-focus responds to CBT attention redirection.'
    },
    {
      id: 'adn24_13',
      title: 'My anxiety yielded to evening reading',
      narrative: [
        'Evening reading hour.',
        '',
        'No screens.',
        '',
        'Book absorbed.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: evening reading is sleep prep.'
      ],
      lesson: 'Evening reading hour without screens prepares mind for sleep.'
    },
    {
      id: 'adn24_14',
      title: 'My anxiety triggered by my phone calls',
      narrative: [
        'Phone calls triggered me.',
        '',
        'Switch to text by default.',
        '',
        'Calls scheduled in advance.',
        '',
        'Anxiety dropped.',
        '',
        'I tell phone-anxious: text-first default.'
      ],
      lesson: 'Text-first communication with scheduled calls reduces phone anxiety.'
    },
    {
      id: 'adn24_15',
      title: 'My anxiety yielded to early morning walk',
      narrative: [
        '5am walk daily.',
        '',
        'Empty streets.',
        '',
        'First light.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-dawn walks transform.'
      ],
      lesson: 'Pre-dawn daily walks transform anxiety baseline through quiet first light.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_25 = [
    {
      id: 'adn25_1',
      title: 'My anxiety yielded to neighborhood council',
      narrative: [
        'Joined neighborhood council.',
        '',
        'Local civic engagement.',
        '',
        'Purpose plus community.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell civically-curious: local engagement is treatment.'
      ],
      lesson: 'Local neighborhood civic engagement provides purpose plus community for anxiety.'
    },
    {
      id: 'adn25_2',
      title: 'My anxiety triggered by performance reviews',
      narrative: [
        'Annual reviews triggered me.',
        '',
        'Pre-review prep with mentor.',
        '',
        'Plus calming techniques.',
        '',
        'Anxiety reduced.',
        '',
        'I tell review-anxious: mentor prep plus calming.'
      ],
      lesson: 'Performance review anxiety eases with mentor preparation plus calming techniques.'
    },
    {
      id: 'adn25_3',
      title: 'My anxiety yielded to morning stretches',
      narrative: [
        'Morning stretches 20 min.',
        '',
        'Body opened.',
        '',
        'Breath deepened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell stiff-bodied: morning stretches treatment grade.'
      ],
      lesson: 'Twenty-minute morning stretches are treatment-grade for body-held anxiety.'
    },
    {
      id: 'adn25_4',
      title: 'My anxiety with my work emails',
      narrative: [
        'Work emails triggered me.',
        '',
        'Auto-responder during deep work.',
        '',
        'Set times for email.',
        '',
        'Anxiety dropped.',
        '',
        'I tell email-anxious workers: auto-responder plus times.'
      ],
      lesson: 'Work email anxiety eases with auto-responders and scheduled checking times.'
    },
    {
      id: 'adn25_5',
      title: 'My anxiety yielded to morning bird call',
      narrative: [
        'Window open morning.',
        '',
        'Bird calls heard.',
        '',
        'Awareness expanded.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sound-curious: morning bird sounds free.'
      ],
      lesson: 'Open windows for morning bird calls provide free anxiety reduction.'
    },
    {
      id: 'adn25_6',
      title: 'My anxiety triggered by my work commute',
      narrative: [
        'Commute triggered daily anxiety.',
        '',
        'Adjusted schedule for off-peak.',
        '',
        'Podcasts plus podcasts.',
        '',
        'Anxiety reduced.',
        '',
        'I tell commute-anxious: time shift plus content.'
      ],
      lesson: 'Commute anxiety eases with off-peak scheduling plus chosen content.'
    },
    {
      id: 'adn25_7',
      title: 'My anxiety yielded to potted plants',
      narrative: [
        'Indoor potted plants 20.',
        '',
        'Daily watering, tending.',
        '',
        'Anxiety dropped.',
        '',
        'I tell plant-curious: indoor plant care daily ritual.'
      ],
      lesson: 'Indoor plant care provides daily ritual for anxiety reduction.'
    },
    {
      id: 'adn25_8',
      title: 'My anxiety with my child therapy',
      narrative: [
        'Child in therapy triggered parent anxiety.',
        '',
        'Parent therapy alongside.',
        '',
        'Both treated.',
        '',
        'Family healed together.',
        '',
        'I tell child-therapy parents: parent therapy alongside essential.'
      ],
      lesson: 'Parent therapy alongside child therapy is essential for family healing.'
    },
    {
      id: 'adn25_9',
      title: 'My anxiety yielded to dawn meditation',
      narrative: [
        'Dawn meditation 20 min.',
        '',
        'First light.',
        '',
        'Body opened.',
        '',
        'Day grounded.',
        '',
        'I tell meditation-curious: dawn time specific.'
      ],
      lesson: 'Dawn meditation timing aligns with body cortisol for anxiety baseline reduction.'
    },
    {
      id: 'adn25_10',
      title: 'My anxiety triggered by my own breath',
      narrative: [
        'Breath awareness triggered panic.',
        '',
        'Therapist had me focus elsewhere.',
        '',
        'Body sensations grounding.',
        '',
        'Anxiety reduced.',
        '',
        'I tell breath-watching panic: redirect to other body sense.'
      ],
      lesson: 'Breath-watching panic eases by redirecting to other body grounding senses.'
    },
    {
      id: 'adn25_11',
      title: 'My anxiety yielded to fishing',
      narrative: [
        'Weekly fishing trips.',
        '',
        'Patient waiting.',
        '',
        'Water meditation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell patient-curious: fishing trains tolerance.'
      ],
      lesson: 'Weekly fishing trips train patience tolerance reducing anxiety.'
    },
    {
      id: 'adn25_12',
      title: 'My anxiety with my health',
      narrative: [
        'Health anxiety chronic.',
        '',
        'CBT specifically for health anxiety.',
        '',
        'Plus designated doctor for concerns.',
        '',
        'Anxiety dropped.',
        '',
        'I tell health-anxious: CBT specialty plus single doctor.'
      ],
      lesson: 'Health anxiety responds to CBT specialty plus single trusted doctor channel.'
    },
    {
      id: 'adn25_13',
      title: 'My anxiety yielded to family dinner',
      narrative: [
        'Sunday family dinner ritual.',
        '',
        'Cook plus eat together.',
        '',
        'Anchor of week.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless: weekly family meal ritual.'
      ],
      lesson: 'Weekly family meal ritual anchors week and reduces anxiety baseline.'
    },
    {
      id: 'adn25_14',
      title: 'My anxiety triggered by chairs',
      narrative: [
        'Specific chair triggered me.',
        '',
        'Trauma association.',
        '',
        'Removed chair.',
        '',
        'Anxiety dropped.',
        '',
        'I tell furniture-triggered: removal is treatment.'
      ],
      lesson: 'Furniture removal is legitimate treatment when objects trigger trauma anxiety.'
    },
    {
      id: 'adn25_15',
      title: 'My anxiety yielded to candle ritual',
      narrative: [
        'Light candle each evening.',
        '',
        'Mark transition to night.',
        '',
        'Ritual repeats daily.',
        '',
        'Anxiety eased.',
        '',
        'I tell ritual-curious: candle ritual is treatment.'
      ],
      lesson: 'Daily evening candle ritual marks transition and reduces nighttime anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_26 = [
    {
      id: 'adn26_1',
      title: 'My anxiety yielded to body scan practice',
      narrative: [
        'Body scan 10 min daily.',
        '',
        'Awareness without judgment.',
        '',
        'Body familiar over weeks.',
        '',
        'Anxiety reduced.',
        '',
        'I tell body-disconnected: body scan reconnects.'
      ],
      lesson: 'Daily body scan practice reconnects body awareness and reduces anxiety.'
    },
    {
      id: 'adn26_2',
      title: 'My anxiety triggered by my phone screen',
      narrative: [
        'Phone screen blue light triggered.',
        '',
        'Grayscale enabled.',
        '',
        'Plus blue light filter.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell phone-screen-affected: grayscale plus filter.'
      ],
      lesson: 'Grayscale plus blue light filter reduces phone screen anxiety triggers.'
    },
    {
      id: 'adn26_3',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Daily morning prayer 15 min.',
        '',
        'Faith plus calm.',
        '',
        'Day grounded.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell faithful: morning prayer practice essential.'
      ],
      lesson: 'Daily morning prayer practice grounds day and reduces anxiety substantially.'
    },
    {
      id: 'adn26_4',
      title: 'My anxiety with my reading list',
      narrative: [
        'Reading list grew, anxiety grew.',
        '',
        'Could not start books.',
        '',
        'Therapist: read one book.',
        '',
        'Finish before next.',
        '',
        'Anxiety dropped.',
        '',
        'I tell readers: one book rule treatment.'
      ],
      lesson: 'One-book-at-a-time rule reduces reader anxiety from overwhelming lists.'
    },
    {
      id: 'adn26_5',
      title: 'My anxiety yielded to coffee shop morning',
      narrative: [
        'Morning coffee shop ritual.',
        '',
        'Same place, same time.',
        '',
        'Mild social contact.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated-anxious: third place ritual.'
      ],
      lesson: 'Morning coffee shop ritual provides third place anchor for anxiety reduction.'
    },
    {
      id: 'adn26_6',
      title: 'My anxiety triggered by my house',
      narrative: [
        'House triggered me.',
        '',
        'Trauma association.',
        '',
        'Moved homes.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-trapped: relocation is treatment.'
      ],
      lesson: 'Relocation from trauma-associated home is legitimate anxiety treatment.'
    },
    {
      id: 'adn26_7',
      title: 'My anxiety yielded to embroidery',
      narrative: [
        'Embroidery daily evenings.',
        '',
        'Stitches focus.',
        '',
        'Hands busy.',
        '',
        'Anxiety paused.',
        '',
        'I tell evening-anxious: needlework is treatment.'
      ],
      lesson: 'Embroidery and needlework provide evening hand-focus for anxiety relief.'
    },
    {
      id: 'adn26_8',
      title: 'My anxiety with my work calls',
      narrative: [
        'Work calls triggered me.',
        '',
        'Pre-call breathing.',
        '',
        'Standing during calls.',
        '',
        'Anxiety reduced.',
        '',
        'I tell call-anxious workers: pre-call ritual.'
      ],
      lesson: 'Work call anxiety eases with pre-call breathing ritual and standing.'
    },
    {
      id: 'adn26_9',
      title: 'My anxiety yielded to bird identification',
      narrative: [
        'Bird ID hobby.',
        '',
        'Outdoor focus.',
        '',
        'Slow attention practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell observation-curious: bird ID trains slow.'
      ],
      lesson: 'Bird identification hobby trains slow observational attention for anxiety.'
    },
    {
      id: 'adn26_10',
      title: 'My anxiety triggered by my hair',
      narrative: [
        'Hair appearance triggered me.',
        '',
        'Salon dependence anxiety.',
        '',
        'Cut short, simple.',
        '',
        'Daily decision removed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell hair-anxious: simplification treatment.'
      ],
      lesson: 'Hair simplification removes daily decision anxiety.'
    },
    {
      id: 'adn26_11',
      title: 'My anxiety yielded to evening tea',
      narrative: [
        'Tea ritual evening.',
        '',
        'Chamomile or herbal.',
        '',
        'Cup, warmth, time.',
        '',
        'Anxiety eased.',
        '',
        'I tell evening-anxious: tea ritual treatment.'
      ],
      lesson: 'Evening herbal tea ritual eases pre-sleep anxiety through warmth and time.'
    },
    {
      id: 'adn26_12',
      title: 'My anxiety with my work hours',
      narrative: [
        'Work hours triggered me.',
        '',
        'Strict 9-5 boundary.',
        '',
        'No work after hours.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell overworking: strict hours treatment.'
      ],
      lesson: 'Strict work hour boundaries substantially reduce overwork-related anxiety.'
    },
    {
      id: 'adn26_13',
      title: 'My anxiety yielded to walking meditation',
      narrative: [
        'Walking meditation daily.',
        '',
        '30 min slow pace.',
        '',
        'Attention to feet.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sitting-stuck: walking meditation alternative.'
      ],
      lesson: 'Walking meditation provides alternative to sitting for anxiety reduction.'
    },
    {
      id: 'adn26_14',
      title: 'My anxiety triggered by my dog',
      narrative: [
        'Dog anxiety from owner.',
        '',
        'Dog reflected my state.',
        '',
        'Both treated together.',
        '',
        'Family system shifted.',
        '',
        'I tell anxious-dog-owners: treat both ends.'
      ],
      lesson: 'Anxious dogs often reflect anxious owners; treating both improves family system.'
    },
    {
      id: 'adn26_15',
      title: 'My anxiety yielded to weekly chess',
      narrative: [
        'Weekly chess club.',
        '',
        'Strategy plus community.',
        '',
        'Mind engaged.',
        '',
        'Anxiety dropped.',
        '',
        'I tell strategy-curious: chess clubs welcome.'
      ],
      lesson: 'Weekly chess clubs combine strategy and community for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_27 = [
    {
      id: 'adn27_1',
      title: 'My anxiety yielded to crocheting socks',
      narrative: [
        'Sock crochet weekly.',
        '',
        'Detail work absorbing.',
        '',
        'Practical output.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: useful crochet treatment.'
      ],
      lesson: 'Useful crochet projects like socks provide absorbing detailed anxiety relief.'
    },
    {
      id: 'adn27_2',
      title: 'My anxiety triggered by my own thoughts at night',
      narrative: [
        'Nighttime racing thoughts.',
        '',
        'Worry parking practice.',
        '',
        'Note for morning, return to sleep.',
        '',
        'Anxiety dropped.',
        '',
        'I tell nighttime-thinkers: worry parking treatment.'
      ],
      lesson: 'Worry parking practice notes nighttime thoughts for morning, allowing return to sleep.'
    },
    {
      id: 'adn27_3',
      title: 'My anxiety yielded to recipe testing',
      narrative: [
        'Recipe testing weekly.',
        '',
        'New cuisine.',
        '',
        'Kitchen experimentation.',
        '',
        'Anxiety dropped.',
        '',
        'I tell cook-curious: recipe testing is treatment.'
      ],
      lesson: 'Weekly recipe testing provides kitchen experimentation flow for anxiety.'
    },
    {
      id: 'adn27_4',
      title: 'My anxiety with my reading speed',
      narrative: [
        'Reading slowly triggered me.',
        '',
        'Acceptance of own pace.',
        '',
        'Therapist: slow is fine.',
        '',
        'Anxiety dropped.',
        '',
        'I tell slow-readers: pace acceptance treatment.'
      ],
      lesson: 'Reading pace acceptance reduces reader-comparison anxiety.'
    },
    {
      id: 'adn27_5',
      title: 'My anxiety yielded to wood walking',
      narrative: [
        'Forest walks weekly.',
        '',
        'No trail map.',
        '',
        'Wander practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell wandering-anxious: untracked wandering treatment.'
      ],
      lesson: 'Untracked forest wandering reduces planning-anxiety through directed surrender.'
    },
    {
      id: 'adn27_6',
      title: 'My anxiety triggered by my home heating',
      narrative: [
        'Heating bill anxiety severe.',
        '',
        'Smart thermostat plus budgeting.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell bill-anxious: tech plus budget.'
      ],
      lesson: 'Smart home tech plus budgeting reduces utility bill anxiety.'
    },
    {
      id: 'adn27_7',
      title: 'My anxiety yielded to swim laps',
      narrative: [
        'Lap swimming daily.',
        '',
        'Body engaged.',
        '',
        'Breath rhythm.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: lap swim transformative.'
      ],
      lesson: 'Daily lap swimming is transformative cardio anxiety treatment.'
    },
    {
      id: 'adn27_8',
      title: 'My anxiety with my time perception',
      narrative: [
        'Time anxiety severe.',
        '',
        'Watch removed.',
        '',
        'Trust body rhythms.',
        '',
        'Anxiety dropped.',
        '',
        'I tell time-anxious: watch removal experiment.'
      ],
      lesson: 'Watch removal experiments reveal body-rhythm trust reducing time anxiety.'
    },
    {
      id: 'adn27_9',
      title: 'My anxiety yielded to harmonica',
      narrative: [
        'Harmonica practice daily.',
        '',
        'Breath plus music.',
        '',
        'Anxiety dropped.',
        '',
        'I tell breath-curious: harmonica accessible.'
      ],
      lesson: 'Daily harmonica practice combines breath training with musical engagement.'
    },
    {
      id: 'adn27_10',
      title: 'My anxiety triggered by my future',
      narrative: [
        'Future-focus triggered me.',
        '',
        'Present-moment practice.',
        '',
        'Day at a time.',
        '',
        'Anxiety dropped.',
        '',
        'I tell future-anxious: present-focus treatment.'
      ],
      lesson: 'Present-focus practice reduces future-projection anxiety.'
    },
    {
      id: 'adn27_11',
      title: 'My anxiety yielded to weekend hike',
      narrative: [
        'Weekend hike weekly.',
        '',
        'Body engaged hours.',
        '',
        'Nature absorbed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell weekend-anxious: hike ritual treatment.'
      ],
      lesson: 'Weekend hiking rituals provide deep body engagement and nature anxiety relief.'
    },
    {
      id: 'adn27_12',
      title: 'My anxiety with my parenting',
      narrative: [
        'Parenting anxiety severe.',
        '',
        'Parent therapy specialty.',
        '',
        'Tools for parent self-talk.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parents: parent therapy distinct from couples.'
      ],
      lesson: 'Parent therapy specialty is distinct from couples therapy for parenting anxiety.'
    },
    {
      id: 'adn27_13',
      title: 'My anxiety yielded to studying',
      narrative: [
        'Returned to school at 45.',
        '',
        'Brain absorbed in learning.',
        '',
        'Anxiety paused during study.',
        '',
        'I tell adult-learners: school treats anxiety.'
      ],
      lesson: 'Adult continuing education treats anxiety through cognitive absorption.'
    },
    {
      id: 'adn27_14',
      title: 'My anxiety triggered by my own house',
      narrative: [
        'Home triggered me.',
        '',
        'Rearranged furniture.',
        '',
        'Paint colors changed.',
        '',
        'New associations built.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-triggered: environmental changes work.'
      ],
      lesson: 'Furniture rearrangement and color changes build new home associations reducing anxiety.'
    },
    {
      id: 'adn27_15',
      title: 'My anxiety yielded to museum cafe',
      narrative: [
        'Museum cafe weekly.',
        '',
        'Art plus coffee.',
        '',
        'Quiet beauty.',
        '',
        'Anxiety dropped.',
        '',
        'I tell urban-isolated: museum cafes are third places.'
      ],
      lesson: 'Museum cafes provide third places combining art and gentle social for anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_28 = [
    {
      id: 'adn28_1',
      title: 'My anxiety yielded to mountain biking',
      narrative: [
        'Mountain bike weekly.',
        '',
        'Body engaged.',
        '',
        'Trail focus.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell adventure-curious: mountain biking treatment.'
      ],
      lesson: 'Mountain biking combines body engagement with trail focus for anxiety relief.'
    },
    {
      id: 'adn28_2',
      title: 'My anxiety triggered by my own scent',
      narrative: [
        'Worried about my own smell.',
        '',
        'Body-image OCD pattern.',
        '',
        'OCD specialist.',
        '',
        'Treatment over months.',
        '',
        'Anxiety reduced.',
        '',
        'I tell scent-anxious: OCD pattern possible.'
      ],
      lesson: 'Body scent anxiety can be OCD pattern needing specialty treatment.'
    },
    {
      id: 'adn28_3',
      title: 'My anxiety yielded to ironing',
      narrative: [
        'Weekly ironing meditation.',
        '',
        'Repetitive motion.',
        '',
        'Warm steam.',
        '',
        'Anxiety dropped.',
        '',
        'I tell domestic-anxious: ironing is meditative.'
      ],
      lesson: 'Weekly ironing provides meditative repetitive motion for anxiety relief.'
    },
    {
      id: 'adn28_4',
      title: 'My anxiety with my online identity',
      narrative: [
        'Online identity anxiety.',
        '',
        'Curation pressure.',
        '',
        'Reduced posting.',
        '',
        'Stayed authentic.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell platform-pressured: reduce post curate authentic.'
      ],
      lesson: 'Reduced posting plus authentic curation eases online identity anxiety.'
    },
    {
      id: 'adn28_5',
      title: 'My anxiety yielded to rowing',
      narrative: [
        'Rowing club weekly.',
        '',
        'Coordinated movement.',
        '',
        'Crew bonding.',
        '',
        'Anxiety dropped.',
        '',
        'I tell water-curious: rowing builds community.'
      ],
      lesson: 'Rowing club provides coordinated movement and crew community for anxiety.'
    },
    {
      id: 'adn28_6',
      title: 'My anxiety triggered by my dentist',
      narrative: [
        'Dentist trigger from childhood.',
        '',
        'Trauma-informed dentist.',
        '',
        'Communication of every step.',
        '',
        'Anxiety reduced.',
        '',
        'I tell dental-traumatized: trauma-informed practitioner.'
      ],
      lesson: 'Trauma-informed dentists communicate every step reducing dental anxiety.'
    },
    {
      id: 'adn28_7',
      title: 'My anxiety yielded to skiing',
      narrative: [
        'Skiing weekly winters.',
        '',
        'Body engaged.',
        '',
        'Cold air.',
        '',
        'Mountains absorbed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell winter-curious: skiing combines elements.'
      ],
      lesson: 'Winter skiing combines body engagement, cold air, and mountain absorption.'
    },
    {
      id: 'adn28_8',
      title: 'My anxiety with my own grief',
      narrative: [
        'Grief triggered anxiety.',
        '',
        'Could not face grief.',
        '',
        'Grief therapy.',
        '',
        'Sit with grief instead of around.',
        '',
        'Anxiety dropped as grief processed.',
        '',
        'I tell grief-avoidant: grief therapy treats anxiety.'
      ],
      lesson: 'Avoided grief processes through therapy, reducing anxiety masking unprocessed loss.'
    },
    {
      id: 'adn28_9',
      title: 'My anxiety yielded to evening art',
      narrative: [
        'Evening sketching daily.',
        '',
        'Mind absorbed.',
        '',
        'Hands busy.',
        '',
        'Anxiety paused.',
        '',
        'I tell evening-anxious: art practice transformative.'
      ],
      lesson: 'Daily evening sketching transforms pre-sleep anxiety through art focus.'
    },
    {
      id: 'adn28_10',
      title: 'My anxiety triggered by my child friend',
      narrative: [
        'Child friend triggered me.',
        '',
        'Suspected influence.',
        '',
        'Open conversation with child.',
        '',
        'Anxiety reduced through communication.',
        '',
        'I tell parent-friend-anxious: communication beats restriction.'
      ],
      lesson: 'Parental anxiety about child friends eases through open communication over restriction.'
    },
    {
      id: 'adn28_11',
      title: 'My anxiety yielded to gym class',
      narrative: [
        'Group fitness class three weekly.',
        '',
        'Body engaged.',
        '',
        'Instructor encouragement.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell exercise-curious: group classes encouraging.'
      ],
      lesson: 'Group fitness classes provide encouraging body engagement for anxiety.'
    },
    {
      id: 'adn28_12',
      title: 'My anxiety with my sons screen time',
      narrative: [
        'Son screen use triggered me.',
        '',
        'Family screen agreement.',
        '',
        'Together negotiation.',
        '',
        'Anxiety reduced.',
        '',
        'I tell screen-anxious parents: family agreement is treatment.'
      ],
      lesson: 'Family screen time agreements through negotiation reduce parental screen anxiety.'
    },
    {
      id: 'adn28_13',
      title: 'My anxiety yielded to early morning quiet',
      narrative: [
        'Hour before world wakes.',
        '',
        'Coffee plus silence.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell early-rising: pre-world hour is treatment.'
      ],
      lesson: 'Pre-world quiet morning hour substantially reduces baseline anxiety.'
    },
    {
      id: 'adn28_14',
      title: 'My anxiety triggered by my work title',
      narrative: [
        'Work title triggered identity anxiety.',
        '',
        'Separated identity from role.',
        '',
        'Personal therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell title-attached: separate self from role.'
      ],
      lesson: 'Separating self from work role reduces identity-attached anxiety.'
    },
    {
      id: 'adn28_15',
      title: 'My anxiety yielded to morning coffee outside',
      narrative: [
        'Coffee outside every morning.',
        '',
        'All weather.',
        '',
        'Body aware of seasons.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell home-stuck: outside coffee daily.'
      ],
      lesson: 'Daily outdoor morning coffee in all weather grounds nervous system year-round.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_17 = [
    {
      id: 'adn17_1',
      title: 'My anxiety yielded to homemade bread',
      narrative: [
        'Baked bread weekly.',
        '',
        'Kneading rhythmic.',
        '',
        'Smell soothed home.',
        '',
        'Anxiety eased during baking.',
        '',
        'I tell home-bound anxious: bread baking is somatic plus aromatic therapy.'
      ],
      lesson: 'Weekly bread baking combines somatic kneading and aromatic comfort for anxiety.'
    },
    {
      id: 'adn17_2',
      title: 'My anxiety triggered by ambulance sirens',
      narrative: [
        'PTSD trigger from ambulance ride.',
        '',
        'Sirens froze me.',
        '',
        'EMDR for emergency response trauma.',
        '',
        'Healed over months.',
        '',
        'I tell sound-triggered: EMDR for specific auditory triggers.'
      ],
      lesson: 'Specific auditory PTSD triggers like sirens respond to targeted EMDR.'
    },
    {
      id: 'adn17_3',
      title: 'My anxiety yielded to long walks',
      narrative: [
        'Daily 2 hour walks.',
        '',
        'Same trail.',
        '',
        'Body rhythm.',
        '',
        'Mind sorted.',
        '',
        'Anxiety processed in walking.',
        '',
        'I tell anxiety sufferers: long walks process what therapy starts.'
      ],
      lesson: 'Long daily walks process emotional content that talk therapy initiates.'
    },
    {
      id: 'adn17_4',
      title: 'My anxiety after veterinary euthanasia',
      narrative: [
        'Put down beloved pet.',
        '',
        'Anxiety severe afterward.',
        '',
        'Pet loss specialist.',
        '',
        'Decision support therapy.',
        '',
        'Healed slowly.',
        '',
        'I tell pet euthanasia survivors: decision grief is real.'
      ],
      lesson: 'Pet euthanasia decision grief is real and treatable through pet loss specialists.'
    },
    {
      id: 'adn17_5',
      title: 'My anxiety yielded to indoor garden',
      narrative: [
        'Indoor plants throughout home.',
        '',
        'Daily care ritual.',
        '',
        'Living things to tend.',
        '',
        'Anxiety eased.',
        '',
        'I tell apartment-dwellers: indoor garden is real anxiety tool.'
      ],
      lesson: 'Indoor plant gardens provide daily care ritual that eases apartment-dweller anxiety.'
    },
    {
      id: 'adn17_6',
      title: 'My anxiety triggered by financial uncertainty',
      narrative: [
        'Self-employed irregular income.',
        '',
        'Financial anxiety severe.',
        '',
        'Financial therapist specialty.',
        '',
        'Plus emergency fund discipline.',
        '',
        'Anxiety reduced.',
        '',
        'I tell self-employed: financial therapy specialty plus discipline.'
      ],
      lesson: 'Self-employed financial anxiety needs financial-therapy specialty plus disciplined buffers.'
    },
    {
      id: 'adn17_7',
      title: 'My anxiety yielded to opera',
      narrative: [
        'Opera subscription.',
        '',
        'Monthly performances.',
        '',
        'Emotion expressed in voice.',
        '',
        'Cathartic.',
        '',
        'Anxiety eased.',
        '',
        'I tell expressive-curious: opera releases held emotion.'
      ],
      lesson: 'Opera attendance provides cathartic emotional release for held anxiety.'
    },
    {
      id: 'adn17_8',
      title: 'My anxiety in dating apps',
      narrative: [
        'Dating apps overwhelmed me.',
        '',
        'Decision fatigue plus rejection.',
        '',
        'Dating coach.',
        '',
        'Plus therapy.',
        '',
        'Limited app use.',
        '',
        'Met partner.',
        '',
        'I tell app-anxious: limit time, dating coach helps.'
      ],
      lesson: 'Dating app anxiety eases with time limits and dating coach support.'
    },
    {
      id: 'adn17_9',
      title: 'My anxiety yielded to morning gratitude call',
      narrative: [
        'Daily call with friend.',
        '',
        'Three gratitudes each.',
        '',
        '5 min, same time.',
        '',
        'Anchored mornings.',
        '',
        'Anxiety dropped.',
        '',
        'I tell friend-anxious: daily ritual calls work.'
      ],
      lesson: 'Daily ritualized gratitude calls with friend anchor mornings and reduce anxiety.'
    },
    {
      id: 'adn17_10',
      title: 'My anxiety with my mother',
      narrative: [
        'Mother triggered me.',
        '',
        'Decades of pattern.',
        '',
        'Family therapy together.',
        '',
        'Patterns named.',
        '',
        'New dynamic over years.',
        '',
        'I tell mother-triggered: family therapy works slowly.'
      ],
      lesson: 'Mother-triggered anxiety responds to multi-year family therapy work.'
    },
    {
      id: 'adn17_11',
      title: 'My anxiety yielded to pencil drawing',
      narrative: [
        'Pencil drawing daily.',
        '',
        'Sketchbook always near.',
        '',
        'Mind absorbed in line.',
        '',
        'Anxiety paused.',
        '',
        'I tell visual-curious: pencil drawing accessible and effective.'
      ],
      lesson: 'Daily pencil drawing provides accessible and effective anxiety relief.'
    },
    {
      id: 'adn17_12',
      title: 'My anxiety triggered by stillness',
      narrative: [
        'Could not sit still.',
        '',
        'Stillness triggered.',
        '',
        'Walking meditation alternative.',
        '',
        'Eventually built sitting tolerance.',
        '',
        'I tell stillness-anxious: walking meditation as on-ramp.'
      ],
      lesson: 'Stillness anxiety eases with walking meditation as on-ramp to sitting practice.'
    },
    {
      id: 'adn17_13',
      title: 'My anxiety yielded to weather watching',
      narrative: [
        'Sky watching daily.',
        '',
        'Clouds, light, weather.',
        '',
        'Awareness expanded.',
        '',
        'Anxiety eased.',
        '',
        'I tell window-having: sky watching is free meditation.'
      ],
      lesson: 'Daily sky watching expands awareness and reduces anxiety as free meditation.'
    },
    {
      id: 'adn17_14',
      title: 'My anxiety after my child diagnosis',
      narrative: [
        'Child diagnosed with chronic condition.',
        '',
        'Parental anxiety severe.',
        '',
        'Specialty pediatric mental health.',
        '',
        'Parent and child treated.',
        '',
        'Family adjusted.',
        '',
        'I tell newly diagnosed families: specialty mental health for parents too.'
      ],
      lesson: 'Pediatric chronic illness diagnoses require parent mental health specialty alongside child.'
    },
    {
      id: 'adn17_15',
      title: 'My anxiety yielded to early dinner',
      narrative: [
        'Dinner by 6pm hard.',
        '',
        'No late eating.',
        '',
        'Body settles by bed.',
        '',
        'Sleep improved.',
        '',
        'Anxiety eased.',
        '',
        'I tell digestion-anxious: early dinner is treatment.'
      ],
      lesson: 'Early dinner by 6pm improves digestion-related sleep and anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_18 = [
    {
      id: 'adn18_1',
      title: 'My anxiety yielded to live music',
      narrative: [
        'Local live music weekly.',
        '',
        'Body responded to rhythm.',
        '',
        'Community engaged.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell isolated music-lovers: live music is treatment.'
      ],
      lesson: 'Live music attendance engages body rhythm and community for anxiety relief.'
    },
    {
      id: 'adn18_2',
      title: 'My anxiety triggered by ringing phone',
      narrative: [
        'Ringing phone triggered me.',
        '',
        'Set phone to silent.',
        '',
        'Check voicemail at intervals.',
        '',
        'Anxiety dropped.',
        '',
        'I tell phone-anxious: silent mode is treatment.'
      ],
      lesson: 'Silent phone mode with interval voicemail checking reduces ring-triggered anxiety.'
    },
    {
      id: 'adn18_3',
      title: 'My anxiety yielded to dawn light',
      narrative: [
        'Watch dawn from porch daily.',
        '',
        'Sun rise practice.',
        '',
        'Circadian aligned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell morning-curious: dawn watching is treatment.'
      ],
      lesson: 'Daily dawn watching from porch aligns circadian rhythm and reduces anxiety.'
    },
    {
      id: 'adn18_4',
      title: 'My anxiety after caregiving ended',
      narrative: [
        'Cared for mother till death.',
        '',
        'After: identity crisis plus anxiety.',
        '',
        'Caregiver-after therapy specialty.',
        '',
        'New identity built.',
        '',
        'Anxiety eased.',
        '',
        'I tell ex-caregivers: post-caregiver therapy real.'
      ],
      lesson: 'Post-caregiver identity transition anxiety has specialty therapy support.'
    },
    {
      id: 'adn18_5',
      title: 'My anxiety yielded to tai chi',
      narrative: [
        'Tai chi in park weekly.',
        '',
        'Slow movement.',
        '',
        'Energy balanced.',
        '',
        'Anxiety dropped.',
        '',
        'I tell slow-movement curious: tai chi specifically calms.'
      ],
      lesson: 'Tai chi specifically calms nervous system through slow integrated movement.'
    },
    {
      id: 'adn18_6',
      title: 'My anxiety with my home loan',
      narrative: [
        'Mortgage anxiety severe.',
        '',
        'Financial therapist plus calculator.',
        '',
        'Reality vs fear separated.',
        '',
        'Anxiety reduced.',
        '',
        'I tell home-loan-anxious: facts plus therapy work.'
      ],
      lesson: 'Mortgage anxiety separates from reality through financial therapy and clear calculations.'
    },
    {
      id: 'adn18_7',
      title: 'My anxiety yielded to silent reading',
      narrative: [
        'Silent reading hour daily.',
        '',
        'No phone, no music.',
        '',
        'Book absorbed.',
        '',
        'Mind quieted.',
        '',
        'Anxiety eased.',
        '',
        'I tell readers: silent reading is rare and powerful.'
      ],
      lesson: 'Silent reading hours without media provide rare deep anxiety relief.'
    },
    {
      id: 'adn18_8',
      title: 'My anxiety triggered by waiting',
      narrative: [
        'Could not tolerate waiting.',
        '',
        'Built waiting tools.',
        '',
        'Books, music, breathing.',
        '',
        'Anxiety in waiting reduced.',
        '',
        'I tell waiting-anxious: portable tools transform waits.'
      ],
      lesson: 'Waiting anxiety eases with curated portable tools (books, music, breathing).'
    },
    {
      id: 'adn18_9',
      title: 'My anxiety yielded to early retirement',
      narrative: [
        'Retired at 58.',
        '',
        'Lower income, lower stress.',
        '',
        'Anxiety dropped substantially.',
        '',
        'Trade I chose.',
        '',
        'I tell financially-tied: lifestyle reduction is treatment.'
      ],
      lesson: 'Lifestyle reduction enabling early retirement can substantially reduce anxiety.'
    },
    {
      id: 'adn18_10',
      title: 'My anxiety after combat tour',
      narrative: [
        'Combat veteran.',
        '',
        'Anxiety from PTSD.',
        '',
        'VA specialty care.',
        '',
        'Plus peer support.',
        '',
        'Healed over years.',
        '',
        'I tell veterans: VA specialty plus peers essential.'
      ],
      lesson: 'Combat PTSD anxiety requires VA specialty care plus peer support over years.'
    },
    {
      id: 'adn18_11',
      title: 'My anxiety yielded to potting plants',
      narrative: [
        'Hours potting plants.',
        '',
        'Hands in soil.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell anxiety sufferers: plant care is somatic therapy.'
      ],
      lesson: 'Plant potting and care provide somatic anxiety therapy through earth contact.'
    },
    {
      id: 'adn18_12',
      title: 'My anxiety triggered by mirror',
      narrative: [
        'Mirror triggered me.',
        '',
        'Body dysmorphia therapy.',
        '',
        'Limited mirror exposure.',
        '',
        'Mirrored only necessary.',
        '',
        'Anxiety reduced.',
        '',
        'I tell mirror-anxious: limit exposure plus therapy.'
      ],
      lesson: 'Mirror-triggered anxiety eases with limited exposure plus body dysmorphia therapy.'
    },
    {
      id: 'adn18_13',
      title: 'My anxiety yielded to library volunteering',
      narrative: [
        'Library volunteer weekly.',
        '',
        'Quiet purposeful work.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell quiet anxious: library volunteer roles match.'
      ],
      lesson: 'Library volunteer roles match quiet introverted anxious people for community.'
    },
    {
      id: 'adn18_14',
      title: 'My anxiety with my older self',
      narrative: [
        'Anxious about aging.',
        '',
        'Body changes, life changes.',
        '',
        'Aging therapy specialty.',
        '',
        'Plus elder mentors.',
        '',
        'Anxiety reduced.',
        '',
        'I tell aging-anxious: specialty therapy plus elder role models.'
      ],
      lesson: 'Aging anxiety responds to specialty therapy plus elder mentor relationships.'
    },
    {
      id: 'adn18_15',
      title: 'My anxiety yielded to evening walk',
      narrative: [
        'Evening walk before bed.',
        '',
        '20 min, slow pace.',
        '',
        'Body shifted.',
        '',
        'Sleep arrived easier.',
        '',
        'I tell sleep-anxious: evening walk as sleep prep.'
      ],
      lesson: 'Evening slow walks serve as sleep preparation reducing pre-sleep anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_19 = [
    {
      id: 'adn19_1',
      title: 'My anxiety yielded to ice fishing',
      narrative: [
        'Ice fishing winters.',
        '',
        'Hours sitting in shanty.',
        '',
        'Quiet absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell winter-stuck: ice fishing is solitary meditation.'
      ],
      lesson: 'Ice fishing provides solitary winter meditation reducing anxiety.'
    },
    {
      id: 'adn19_2',
      title: 'My anxiety triggered by my email',
      narrative: [
        'Email triggered constant anxiety.',
        '',
        'Set check times: 9am, 1pm, 4pm only.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell email-anxious: scheduled checking is treatment.'
      ],
      lesson: 'Scheduled email checking three times daily reduces email-related anxiety.'
    },
    {
      id: 'adn19_3',
      title: 'My anxiety yielded to bird feeding',
      narrative: [
        'Bird feeder at window.',
        '',
        'Daily watching.',
        '',
        'Identification practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: bird feeder is treatment-grade.'
      ],
      lesson: 'Window bird feeders provide treatment-grade anxiety relief through daily observation.'
    },
    {
      id: 'adn19_4',
      title: 'My anxiety after partner suicide',
      narrative: [
        'Partner died by suicide.',
        '',
        'Survivor anxiety severe.',
        '',
        'Suicide loss specialty therapy.',
        '',
        'Plus survivor support group.',
        '',
        'Recovery slow but real.',
        '',
        'I tell suicide-bereaved: specialty support essential.'
      ],
      lesson: 'Suicide loss survivor anxiety needs specialty therapy plus survivor groups.'
    },
    {
      id: 'adn19_5',
      title: 'My anxiety yielded to community garden',
      narrative: [
        'Community garden plot.',
        '',
        'Weekly work.',
        '',
        'Vegetables grown.',
        '',
        'Neighbors known.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell isolated urban: community gardens transform.'
      ],
      lesson: 'Community gardens transform urban isolation through earth contact and neighbor bonds.'
    },
    {
      id: 'adn19_6',
      title: 'My anxiety triggered by aging body',
      narrative: [
        'Body changes triggered me.',
        '',
        'Aches, slower, gray hair.',
        '',
        'Aging acceptance therapy.',
        '',
        'Body neutrality plus realistic exercise.',
        '',
        'Anxiety reduced.',
        '',
        'I tell aging-bodied: acceptance therapy works.'
      ],
      lesson: 'Aging body changes respond to acceptance therapy plus realistic activity.'
    },
    {
      id: 'adn19_7',
      title: 'My anxiety yielded to chess online',
      narrative: [
        'Online chess daily.',
        '',
        'Strategic absorption.',
        '',
        'Anxiety paused during play.',
        '',
        'I tell strategy-curious: online chess accessible anxiety relief.'
      ],
      lesson: 'Online chess provides accessible strategic absorption for anxiety relief.'
    },
    {
      id: 'adn19_8',
      title: 'My anxiety with my marriage',
      narrative: [
        'Marriage triggered anxiety.',
        '',
        'Couples therapy years.',
        '',
        'Patterns shifted.',
        '',
        'Or eventual choice to part.',
        '',
        'Either path valid.',
        '',
        'I tell marriage-anxious: therapy clarifies the path.'
      ],
      lesson: 'Marriage anxiety responds to therapy that clarifies whether to repair or part.'
    },
    {
      id: 'adn19_9',
      title: 'My anxiety yielded to cottage life',
      narrative: [
        'Weekend cottage 2 hours away.',
        '',
        'No service.',
        '',
        'Manual labor.',
        '',
        'Body engaged.',
        '',
        'Anxiety dropped each weekend.',
        '',
        'I tell urban-stuck: rural weekend reset.'
      ],
      lesson: 'Rural weekend retreats provide nervous system reset for urban-stuck anxious.'
    },
    {
      id: 'adn19_10',
      title: 'My anxiety triggered by big purchases',
      narrative: [
        'Big purchases triggered decision anxiety.',
        '',
        'Therapist taught: 24 hour rule.',
        '',
        'Sleep on decisions over $100.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: 24 hour rule classical.'
      ],
      lesson: 'Twenty-four hour rule on purchases over threshold reduces decision anxiety.'
    },
    {
      id: 'adn19_11',
      title: 'My anxiety yielded to walking dog',
      narrative: [
        'Daily dog walks four times.',
        '',
        'Body engaged repeatedly.',
        '',
        'Outside multiple times.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell pet-owners: dogs force routine.'
      ],
      lesson: 'Dog ownership forces daily outdoor movement routine reducing anxiety.'
    },
    {
      id: 'adn19_12',
      title: 'My anxiety with my body weight',
      narrative: [
        'Weight anxiety severe.',
        '',
        'Scale daily.',
        '',
        'Therapist: stop weighing.',
        '',
        'Removed scale.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell scale-anxious: removal is treatment.'
      ],
      lesson: 'Removing daily scale weighing reduces body anxiety substantially.'
    },
    {
      id: 'adn19_13',
      title: 'My anxiety yielded to woodland walks',
      narrative: [
        'Forest walks weekly.',
        '',
        'Same trail.',
        '',
        'Seasonal changes noticed.',
        '',
        'Body engaged.',
        '',
        'Anxiety eased.',
        '',
        'I tell nature-curious: same trail repeated builds attention.'
      ],
      lesson: 'Repeated same-trail forest walks build seasonal attention and reduce anxiety.'
    },
    {
      id: 'adn19_14',
      title: 'My anxiety triggered by my own pulse',
      narrative: [
        'Pulse awareness triggered panic.',
        '',
        'Health anxiety pattern.',
        '',
        'CBT for pulse focus.',
        '',
        'Attention redirected.',
        '',
        'Anxiety reduced.',
        '',
        'I tell pulse-watchers: redirect attention pattern.'
      ],
      lesson: 'Pulse-focused health anxiety eases with CBT attention redirection.'
    },
    {
      id: 'adn19_15',
      title: 'My anxiety yielded to gentle yoga class',
      narrative: [
        'Gentle yoga 3x weekly.',
        '',
        'Body softened.',
        '',
        'Breath deepened.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell stuck anxious: gentle yoga not power yoga.'
      ],
      lesson: 'Gentle yoga (not power yoga) specifically reduces anxiety through softening practice.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_20 = [
    {
      id: 'adn20_1',
      title: 'My anxiety yielded to model airplane building',
      narrative: [
        'Hours building model airplanes.',
        '',
        'Detail work absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell detail-oriented anxious: model building is flow.'
      ],
      lesson: 'Model airplane building provides sustained flow state through detailed work.'
    },
    {
      id: 'adn20_2',
      title: 'My anxiety triggered by my voice mail',
      narrative: [
        'Voicemail triggered me.',
        '',
        'Could not check.',
        '',
        'Exposure therapy.',
        '',
        'Check at specific times.',
        '',
        'Anxiety reduced.',
        '',
        'I tell voicemail-avoidant: scheduled checking helps.'
      ],
      lesson: 'Voicemail avoidance eases with scheduled checking exposure.'
    },
    {
      id: 'adn20_3',
      title: 'My anxiety yielded to art class',
      narrative: [
        'Weekly art class adults.',
        '',
        'Instruction plus practice.',
        '',
        'Mind absorbed.',
        '',
        'Community formed.',
        '',
        'Anxiety eased.',
        '',
        'I tell creative-curious: adult art classes welcome.'
      ],
      lesson: 'Adult art classes provide instruction, practice, and community for anxiety.'
    },
    {
      id: 'adn20_4',
      title: 'My anxiety after my divorce',
      narrative: [
        'Divorce anxiety severe.',
        '',
        'Identity rebuilt.',
        '',
        'Divorce recovery specialist.',
        '',
        'New life over years.',
        '',
        'Anxiety eased.',
        '',
        'I tell newly-divorced: divorce specialty therapy.'
      ],
      lesson: 'Divorce recovery anxiety has specialty therapy support over years.'
    },
    {
      id: 'adn20_5',
      title: 'My anxiety yielded to writing groups',
      narrative: [
        'Weekly writing group.',
        '',
        'Prompts and feedback.',
        '',
        'Voice developed.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell isolated writers: writing groups treatment.'
      ],
      lesson: 'Writing groups develop voice and community as anxiety treatment.'
    },
    {
      id: 'adn20_6',
      title: 'My anxiety triggered by clinical settings',
      narrative: [
        'Doctor offices triggered me.',
        '',
        'White coat hypertension.',
        '',
        'Patient advocate accompanied.',
        '',
        'Communication of anxiety upfront.',
        '',
        'Care improved.',
        '',
        'I tell medical-anxious: bring advocate, disclose anxiety.'
      ],
      lesson: 'Medical setting anxiety eases with patient advocate accompaniment and disclosure.'
    },
    {
      id: 'adn20_7',
      title: 'My anxiety yielded to outdoor cycling',
      narrative: [
        'Outdoor cycling weekly.',
        '',
        'Air, wind, motion.',
        '',
        'Body engaged.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: outdoor cycling combines elements.'
      ],
      lesson: 'Outdoor cycling combines air, motion, and body engagement for anxiety relief.'
    },
    {
      id: 'adn20_8',
      title: 'My anxiety with my financial future',
      narrative: [
        'Retirement anxiety severe.',
        '',
        'Financial planner plus therapist.',
        '',
        'Real numbers viewed.',
        '',
        'Realistic plan made.',
        '',
        'Anxiety reduced.',
        '',
        'I tell retirement-anxious: numbers plus therapy.'
      ],
      lesson: 'Retirement anxiety eases through facing real numbers with planner plus therapist.'
    },
    {
      id: 'adn20_9',
      title: 'My anxiety yielded to community theater',
      narrative: [
        'Joined community theater.',
        '',
        'Roles in plays.',
        '',
        'Practice plus performance.',
        '',
        'Anxiety transformed by stage.',
        '',
        'I tell performance-curious: community theater welcomes.'
      ],
      lesson: 'Community theater transforms social anxiety through structured role practice.'
    },
    {
      id: 'adn20_10',
      title: 'My anxiety triggered by parents anniversary',
      narrative: [
        'Parents anniversary triggered me.',
        '',
        'Grief plus anxiety.',
        '',
        'Anniversary ritual designed.',
        '',
        'Honored memory plus self.',
        '',
        'Anxiety manageable.',
        '',
        'I tell anniversary-stricken: designed rituals contain.'
      ],
      lesson: 'Designed rituals contain anniversary-triggered grief and anxiety.'
    },
    {
      id: 'adn20_11',
      title: 'My anxiety yielded to bookbinding',
      narrative: [
        'Hand bookbinding hobby.',
        '',
        'Hours of detailed work.',
        '',
        'Anxiety paused.',
        '',
        'Beautiful objects produced.',
        '',
        'I tell craft-curious: bookbinding sustained focus.'
      ],
      lesson: 'Hand bookbinding provides sustained detailed focus for anxiety relief.'
    },
    {
      id: 'adn20_12',
      title: 'My anxiety triggered by elderly home',
      narrative: [
        'Parents in assisted living.',
        '',
        'Visits triggered me.',
        '',
        'Assisted living family therapy.',
        '',
        'Plus structured visits.',
        '',
        'Anxiety reduced.',
        '',
        'I tell adult children: family therapy plus structure.'
      ],
      lesson: 'Assisted living visit anxiety eases with family therapy plus structured visits.'
    },
    {
      id: 'adn20_13',
      title: 'My anxiety yielded to coffee shop work',
      narrative: [
        'Worked at coffee shop daily.',
        '',
        'Background hum.',
        '',
        'Mild people presence.',
        '',
        'Anxiety dropped.',
        '',
        'I tell isolated workers: coffee shop ambient social.'
      ],
      lesson: 'Coffee shop work provides ambient social background that reduces isolation anxiety.'
    },
    {
      id: 'adn20_14',
      title: 'My anxiety with my partner',
      narrative: [
        'Partner triggered anxiety.',
        '',
        'Couples therapy.',
        '',
        'Patterns named.',
        '',
        'New dynamic built.',
        '',
        'Or eventually parted.',
        '',
        'I tell relationship-anxious: therapy clarifies.'
      ],
      lesson: 'Relationship-triggered anxiety in couples therapy clarifies repair or part decision.'
    },
    {
      id: 'adn20_15',
      title: 'My anxiety yielded to early morning swim',
      narrative: [
        'Pre-dawn swim daily.',
        '',
        'Quiet, alone, focused.',
        '',
        'Day started clear.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: pre-dawn solo swim transforms.'
      ],
      lesson: 'Pre-dawn solo swimming transforms day through quiet focused movement.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_21 = [
    {
      id: 'adn21_1',
      title: 'My anxiety yielded to phone-free Sundays',
      narrative: [
        'No phone Sundays.',
        '',
        'Books, walks, family.',
        '',
        'Nervous system reset weekly.',
        '',
        'I tell tech-tethered: weekly phone fast is treatment.'
      ],
      lesson: 'Weekly phone-free Sundays provide nervous system reset for tech-tethered anxious.'
    },
    {
      id: 'adn21_2',
      title: 'My anxiety triggered by recovery support',
      narrative: [
        'AA meetings triggered initial anxiety.',
        '',
        'Pushed through.',
        '',
        'Found home group.',
        '',
        'Anxiety eased over months.',
        '',
        'I tell newly recovering: first meetings hardest.'
      ],
      lesson: 'First recovery meeting anxiety eases with persistence to find home group.'
    },
    {
      id: 'adn21_3',
      title: 'My anxiety yielded to ceramics',
      narrative: [
        'Ceramics class weekly.',
        '',
        'Wheel throwing absorbing.',
        '',
        'Mind quieted.',
        '',
        'Anxiety paused.',
        '',
        'I tell hands-on anxious: wheel pottery is meditative.'
      ],
      lesson: 'Wheel pottery throwing provides meditative anxiety relief through hand-eye focus.'
    },
    {
      id: 'adn21_4',
      title: 'My anxiety in graduate school',
      narrative: [
        'Grad school anxiety severe.',
        '',
        'Imposter syndrome.',
        '',
        'Pressure constant.',
        '',
        'Counseling center plus medication.',
        '',
        'Graduated.',
        '',
        'I tell grad students: combine support modes.'
      ],
      lesson: 'Graduate school anxiety responds to combined counseling, medication, and peer support.'
    },
    {
      id: 'adn21_5',
      title: 'My anxiety yielded to seasonal traditions',
      narrative: [
        'Specific traditions each season.',
        '',
        'Apple picking fall.',
        '',
        'Ice skating winter.',
        '',
        'Garden planting spring.',
        '',
        'Beach summer.',
        '',
        'Body and mind aligned with time.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rootless-feeling: seasonal traditions ground.'
      ],
      lesson: 'Seasonal tradition rituals ground anxiety baseline through time alignment.'
    },
    {
      id: 'adn21_6',
      title: 'My anxiety triggered by leaving job',
      narrative: [
        'Quitting toxic job triggered me.',
        '',
        'Financial fear.',
        '',
        'Identity loss.',
        '',
        'Career transition therapy.',
        '',
        'Plus emergency fund.',
        '',
        'Survived gap.',
        '',
        'I tell quitters: therapy plus financial buffer.'
      ],
      lesson: 'Quitting toxic jobs requires combined transition therapy and financial buffer.'
    },
    {
      id: 'adn21_7',
      title: 'My anxiety yielded to long baths',
      narrative: [
        'Hour-long baths twice weekly.',
        '',
        'Salts, oils, candles.',
        '',
        'Body softened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell self-denying: long baths treatment grade.'
      ],
      lesson: 'Hour-long ritualized baths twice weekly are treatment-grade anxiety care.'
    },
    {
      id: 'adn21_8',
      title: 'My anxiety with my dating profile',
      narrative: [
        'Profile creation triggered anxiety.',
        '',
        'Dating coach helped.',
        '',
        'Authentic representation.',
        '',
        'Anxiety reduced.',
        '',
        'I tell profile-anxious: coach helps with authenticity.'
      ],
      lesson: 'Dating profile creation anxiety eases with coach support for authentic representation.'
    },
    {
      id: 'adn21_9',
      title: 'My anxiety yielded to community singing',
      narrative: [
        'Community choir weekly.',
        '',
        'Breath, body, group.',
        '',
        'Performance year end.',
        '',
        'Anxiety dropped.',
        '',
        'I tell musical-curious: community choirs welcome.'
      ],
      lesson: 'Community choirs combine breath, body, and group for anxiety relief.'
    },
    {
      id: 'adn21_10',
      title: 'My anxiety triggered by intimate moments',
      narrative: [
        'Intimacy triggered anxiety.',
        '',
        'Trauma background.',
        '',
        'Sex therapist specialty.',
        '',
        'Healing slow.',
        '',
        'Partner patient.',
        '',
        'I tell trauma-survivors: sex therapy specialty exists.'
      ],
      lesson: 'Sex therapy specialty supports trauma survivors with intimacy anxiety.'
    },
    {
      id: 'adn21_11',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer 15 min.',
        '',
        'Faith plus contemplation.',
        '',
        'Day grounded.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell faithful: morning prayer treatment grade.'
      ],
      lesson: 'Daily morning prayer is treatment-grade anxiety baseline reduction.'
    },
    {
      id: 'adn21_12',
      title: 'My anxiety with my own thoughts',
      narrative: [
        'Intrusive thoughts triggered me.',
        '',
        'OCD specialist.',
        '',
        'Thoughts are not actions.',
        '',
        'Tolerance built.',
        '',
        'I tell intrusive-thought-stricken: OCD specialty exists.'
      ],
      lesson: 'Intrusive thoughts are OCD pattern; specialty treatment builds tolerance.'
    },
    {
      id: 'adn21_13',
      title: 'My anxiety yielded to small farms',
      narrative: [
        'Volunteered weekly at small farm.',
        '',
        'Manual labor outdoors.',
        '',
        'Animals plus plants.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell urban-stuck: farm volunteering treatment.'
      ],
      lesson: 'Small farm volunteering provides outdoor manual work as anxiety treatment.'
    },
    {
      id: 'adn21_14',
      title: 'My anxiety triggered by my appearance',
      narrative: [
        'Appearance anxiety severe.',
        '',
        'Limited social.',
        '',
        'Body neutrality therapy.',
        '',
        'Exposure to mirrors.',
        '',
        'Anxiety reduced.',
        '',
        'I tell appearance-anxious: body neutrality plus exposure.'
      ],
      lesson: 'Appearance anxiety responds to body neutrality therapy plus mirror exposure.'
    },
    {
      id: 'adn21_15',
      title: 'My anxiety yielded to elder mentor',
      narrative: [
        'Found elder mentor.',
        '',
        'Weekly conversations.',
        '',
        'Perspective from age.',
        '',
        'Anxiety reduced.',
        '',
        'I tell stuck anxious: elder mentor gives perspective.'
      ],
      lesson: 'Elder mentors provide age-based perspective that reduces anxious self-focus.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_22 = [
    {
      id: 'adn22_1',
      title: 'My anxiety yielded to dance practice',
      narrative: [
        'Solo dance daily.',
        '',
        '20 min living room.',
        '',
        'Body moved freely.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-private: solo dance accessible.'
      ],
      lesson: 'Solo daily dance practice is accessible private anxiety relief.'
    },
    {
      id: 'adn22_2',
      title: 'My anxiety triggered by my hair',
      narrative: [
        'Hair triggered anxiety.',
        '',
        'Cut it short.',
        '',
        'Decision daily simplified.',
        '',
        'Anxiety reduced.',
        '',
        'I tell hair-anxious: simplification is treatment.'
      ],
      lesson: 'Hair simplification reduces appearance-related decision anxiety.'
    },
    {
      id: 'adn22_3',
      title: 'My anxiety yielded to garage workshop',
      narrative: [
        'Garage workshop.',
        '',
        'Tools, wood, projects.',
        '',
        'Hours absorbed.',
        '',
        'Anxiety paused.',
        '',
        'I tell hands-on anxious: workshop is sanctuary.'
      ],
      lesson: 'Garage workshops provide hands-on sanctuary for anxiety relief.'
    },
    {
      id: 'adn22_4',
      title: 'My anxiety after assault recovery',
      narrative: [
        'Recovery from assault years.',
        '',
        'Trauma therapy plus group.',
        '',
        'Body work plus talk.',
        '',
        'Slow healing.',
        '',
        'I tell survivors: comprehensive treatment works.'
      ],
      lesson: 'Assault recovery requires comprehensive trauma treatment over years.'
    },
    {
      id: 'adn22_5',
      title: 'My anxiety yielded to canoe trips',
      narrative: [
        'Annual canoe trip remote.',
        '',
        'No service.',
        '',
        'Body engaged.',
        '',
        'Nature absorbing.',
        '',
        'Anxiety dropped.',
        '',
        'I tell adventurous anxious: wilderness trips reset.'
      ],
      lesson: 'Wilderness canoe trips provide deep nervous system reset.'
    },
    {
      id: 'adn22_6',
      title: 'My anxiety triggered by financial paperwork',
      narrative: [
        'Tax season triggered me.',
        '',
        'Accountant took over.',
        '',
        'Anxiety reduced substantially.',
        '',
        'Money well spent.',
        '',
        'I tell paperwork-paralyzed: outsource is treatment.'
      ],
      lesson: 'Outsourcing financial paperwork is treatment for paperwork paralysis.'
    },
    {
      id: 'adn22_7',
      title: 'My anxiety yielded to woodworking class',
      narrative: [
        'Adult education woodworking.',
        '',
        'Skills built.',
        '',
        'Pieces produced.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell craft-curious: adult ed classes welcome.'
      ],
      lesson: 'Adult education woodworking classes build skills and community for anxiety.'
    },
    {
      id: 'adn22_8',
      title: 'My anxiety with my career path',
      narrative: [
        'Career anxiety severe.',
        '',
        'Career coach plus therapist.',
        '',
        'Clarified values.',
        '',
        'Path emerged.',
        '',
        'Anxiety reduced.',
        '',
        'I tell career-confused: values clarification therapy.'
      ],
      lesson: 'Career anxiety responds to combined values clarification and coaching work.'
    },
    {
      id: 'adn22_9',
      title: 'My anxiety yielded to baking sourdough',
      narrative: [
        'Sourdough starter named Doris.',
        '',
        'Daily feeding ritual.',
        '',
        'Weekly bakes.',
        '',
        'Anxiety dropped.',
        '',
        'I tell home-bound: sourdough is companion plus craft.'
      ],
      lesson: 'Sourdough baking provides daily ritual companion plus craft for anxiety.'
    },
    {
      id: 'adn22_10',
      title: 'My anxiety triggered by group meetings',
      narrative: [
        'Group meetings triggered me.',
        '',
        'Pre-meeting prep.',
        '',
        'Plus during-meeting tools.',
        '',
        'Anxiety reduced.',
        '',
        'I tell group-anxious: pre-prep plus tools essential.'
      ],
      lesson: 'Group meeting anxiety eases with pre-prep plus during-meeting calming tools.'
    },
    {
      id: 'adn22_11',
      title: 'My anxiety yielded to nature photography',
      narrative: [
        'Nature photography weekly.',
        '',
        'Camera plus walks.',
        '',
        'Attention practice.',
        '',
        'Anxiety paused during shoots.',
        '',
        'I tell visual-curious: nature photography slows attention.'
      ],
      lesson: 'Nature photography combines walking and slow attention training for anxiety.'
    },
    {
      id: 'adn22_12',
      title: 'My anxiety with my retirement',
      narrative: [
        'Retirement triggered identity crisis.',
        '',
        'Plus financial anxiety.',
        '',
        'Retirement coach plus therapist.',
        '',
        'Slowly built new life.',
        '',
        'Anxiety eased.',
        '',
        'I tell newly retired: combined support needed.'
      ],
      lesson: 'Retirement transition needs combined retirement coach plus therapist support.'
    },
    {
      id: 'adn22_13',
      title: 'My anxiety yielded to martial arts',
      narrative: [
        'Karate twice weekly.',
        '',
        'Body engaged.',
        '',
        'Focus practiced.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell physical-curious: martial arts treatment grade.'
      ],
      lesson: 'Martial arts practice is treatment-grade anxiety relief through body and focus.'
    },
    {
      id: 'adn22_14',
      title: 'My anxiety triggered by certain memories',
      narrative: [
        'Specific memories triggered me.',
        '',
        'EMDR specifically for memories.',
        '',
        'Reprocessed over months.',
        '',
        'Memories present but not paralyzing.',
        '',
        'I tell memory-stricken: EMDR for specific memories.'
      ],
      lesson: 'EMDR reprocesses specific triggering memories into manageable form.'
    },
    {
      id: 'adn22_15',
      title: 'My anxiety yielded to morning pages',
      narrative: [
        '3 morning pages daily.',
        '',
        '5 years consistent.',
        '',
        'Anxiety baseline dropped.',
        '',
        'Brain shifted.',
        '',
        'I tell journaling-curious: morning pages classic.'
      ],
      lesson: 'Five years of consistent morning pages substantially reduces anxiety baseline.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_11 = [
    {
      id: 'adn11_1',
      title: 'My anxiety yielded to morning sunlight',
      narrative: [
        'Read about morning sunlight and circadian rhythm.',
        '',
        '10 min outside in morning.',
        '',
        'Tried for two weeks.',
        '',
        'Sleep improved.',
        '',
        'Morning anxiety dropped.',
        '',
        'Simple powerful intervention.',
        '',
        'I tell sleep-anxious: morning sunlight regulates circadian and anxiety.'
      ],
      lesson: 'Morning sunlight regulates circadian rhythm and reduces morning anxiety.'
    },
    {
      id: 'adn11_2',
      title: 'My anxiety triggered by my home',
      narrative: [
        'Home where trauma occurred.',
        '',
        'Trigger every day.',
        '',
        'Could not stay.',
        '',
        'Moved with savings.',
        '',
        'Environment matters.',
        '',
        'New home felt safe.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell trauma-home-stuck: moving is legitimate treatment.'
      ],
      lesson: 'Moving from trauma location is legitimate treatment when financially possible.'
    },
    {
      id: 'adn11_3',
      title: 'My anxiety yielded to coffee group',
      narrative: [
        'Weekly coffee with neighbors.',
        '',
        'Tuesday mornings.',
        '',
        'Regular, predictable, warm.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell isolated: weekly anchor social plus warmth.'
      ],
      lesson: 'Weekly anchor social events with warmth provide consistent anxiety relief.'
    },
    {
      id: 'adn11_4',
      title: 'My anxiety with my doctor',
      narrative: [
        'Doctor dismissive of anxiety.',
        '',
        'Switched doctors.',
        '',
        'New doctor took anxiety seriously.',
        '',
        'Felt heard.',
        '',
        'Treatment improved.',
        '',
        'I tell dismissed patients: switch doctors when not heard.'
      ],
      lesson: 'Doctor switching is appropriate response to dismissive medical care.'
    },
    {
      id: 'adn11_5',
      title: 'My anxiety yielded to weighted vest',
      narrative: [
        'Weighted vest 20 percent body weight.',
        '',
        'Wore during stressful tasks.',
        '',
        'Deep pressure all day.',
        '',
        'Anxiety dropped.',
        '',
        'I tell weighted-blanket fans: weighted vest extends benefit.'
      ],
      lesson: 'Weighted vests extend weighted-blanket benefit to daily anxiety management.'
    },
    {
      id: 'adn11_6',
      title: 'My anxiety after sibling death',
      narrative: [
        'Sibling died at 30.',
        '',
        'Sibling grief unique form.',
        '',
        'Sibling loss support group.',
        '',
        'Different from parent or partner loss.',
        '',
        'Healed slowly.',
        '',
        'I tell bereaved siblings: sibling loss is its own grief.'
      ],
      lesson: 'Sibling loss has unique grief profile and specific support groups.'
    },
    {
      id: 'adn11_7',
      title: 'My anxiety yielded to crocheting at appointments',
      narrative: [
        'Brought crochet to medical appointments.',
        '',
        'Hands busy in waiting room.',
        '',
        'Anxiety lower in clinic.',
        '',
        'I tell waiting-room anxious: portable craft as distraction.'
      ],
      lesson: 'Portable crafts provide effective waiting-room anxiety distraction.'
    },
    {
      id: 'adn11_8',
      title: 'My anxiety as autistic adult',
      narrative: [
        'Anxious my whole life.',
        '',
        'Diagnosed autistic at 38.',
        '',
        'Anxiety from masking and sensory mismatch.',
        '',
        'Autism-affirming therapist.',
        '',
        'Sensory accommodations.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell late-diagnosed autistic: anxiety is symptom of mismatch, not character.'
      ],
      lesson: 'Late-diagnosed autism reveals anxiety as masking and sensory mismatch symptom.'
    },
    {
      id: 'adn11_9',
      title: 'My anxiety yielded to ocean swim',
      narrative: [
        'Daily ocean swim in summer.',
        '',
        'Cold water immersion.',
        '',
        'Beauty plus sensory.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell coastal: ocean swimming is treatment.'
      ],
      lesson: 'Ocean swimming combines cold water benefits with beauty for anxiety treatment.'
    },
    {
      id: 'adn11_10',
      title: 'My anxiety in dating',
      narrative: [
        'First dates terrified me.',
        '',
        'Dating anxiety specialist.',
        '',
        'Exposure plus reframe.',
        '',
        'Dating became practice not threat.',
        '',
        'Found partner eventually.',
        '',
        'I tell dating-anxious: dating itself is exposure work.'
      ],
      lesson: 'Dating anxiety eases when reframed as exposure practice with low stakes.'
    },
    {
      id: 'adn11_11',
      title: 'My anxiety triggered by deadlines',
      narrative: [
        'Deadlines paralyzed me.',
        '',
        'Procrastinated until panic.',
        '',
        'ADHD coach helped.',
        '',
        'Plus therapy for anxiety.',
        '',
        'Tools for deadline management.',
        '',
        'I tell deadline-anxious: ADHD coach plus anxiety therapy works.'
      ],
      lesson: 'Deadline anxiety often connects to ADHD; coach plus therapy addresses both.'
    },
    {
      id: 'adn11_12',
      title: 'My anxiety yielded to bird watching',
      narrative: [
        'Started bird watching at 50.',
        '',
        'Outdoor focus, slow attention.',
        '',
        'Anxiety dropped during sessions.',
        '',
        'Patience practiced.',
        '',
        'I tell anxiety sufferers: bird watching trains slow attention.'
      ],
      lesson: 'Bird watching trains slow attention and reduces anxiety through patient observation.'
    },
    {
      id: 'adn11_13',
      title: 'My anxiety in apartment hunting',
      narrative: [
        'Apartment hunting anxiety.',
        '',
        'Time pressure plus decisions.',
        '',
        'Realtor patient with anxiety.',
        '',
        'Pre-tour relaxation.',
        '',
        'Found apartment.',
        '',
        'I tell home-hunting anxious: tell realtor about anxiety.'
      ],
      lesson: 'Apartment hunting anxiety eases with realtor who understands and pre-tour relaxation.'
    },
    {
      id: 'adn11_14',
      title: 'My anxiety yielded to music practice',
      narrative: [
        'Played piano as kid.',
        '',
        'Returned at 45.',
        '',
        'Daily practice 30 min.',
        '',
        'Mind absorbed in music.',
        '',
        'Anxiety paused.',
        '',
        'I tell instrument-curious: daily practice provides flow.'
      ],
      lesson: 'Daily music practice provides flow-state anxiety relief.'
    },
    {
      id: 'adn11_15',
      title: 'My anxiety triggered by aging parents',
      narrative: [
        'Anxiety about parents declining.',
        '',
        'Anticipatory grief.',
        '',
        'Pre-loss therapy.',
        '',
        'Plus elder care coordinator.',
        '',
        'Practical plus emotional.',
        '',
        'I tell adult children: pre-loss therapy eases anticipatory anxiety.'
      ],
      lesson: 'Anticipatory grief about aging parents responds to pre-loss therapy.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_12 = [
    {
      id: 'adn12_1',
      title: 'My anxiety yielded to pottery class',
      narrative: [
        'Pottery weekly.',
        '',
        'Hands in clay.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'Made pieces for family.',
        '',
        'I tell anxiety sufferers: pottery is somatic and meaningful.'
      ],
      lesson: 'Pottery combines somatic engagement with meaningful production for anxiety relief.'
    },
    {
      id: 'adn12_2',
      title: 'My anxiety triggered by alone time',
      narrative: [
        'Could not be alone.',
        '',
        'Anxiety surged.',
        '',
        'Worked on tolerating own company.',
        '',
        'Gradually built solitude practice.',
        '',
        'Anxiety dropped.',
        '',
        'I tell alone-anxious: graduated solitude practice helps.'
      ],
      lesson: 'Alone-time anxiety responds to graduated solitude practice building tolerance.'
    },
    {
      id: 'adn12_3',
      title: 'My anxiety yielded to chess club',
      narrative: [
        'Weekly chess club.',
        '',
        'Played strangers.',
        '',
        'Mind absorbed.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped.',
        '',
        'I tell strategy-minded anxious: chess club combines focus and connection.'
      ],
      lesson: 'Chess clubs combine cognitive absorption and social connection for anxiety.'
    },
    {
      id: 'adn12_4',
      title: 'My anxiety after car accident driving daughter',
      narrative: [
        'Minor accident with daughter in car.',
        '',
        'Both unhurt.',
        '',
        'Anxiety severe.',
        '',
        'Could not drive her again.',
        '',
        'Family therapy plus driving therapy.',
        '',
        'Healed over months.',
        '',
        'I tell post-accident parents: parent driving anxiety specific.'
      ],
      lesson: 'Parent driving anxiety after accident with child needs specific family therapy approach.'
    },
    {
      id: 'adn12_5',
      title: 'My anxiety yielded to journaling rituals',
      narrative: [
        'Morning pages 3 pages daily.',
        '',
        'Brain dump format.',
        '',
        'Years of practice.',
        '',
        'Anxiety lower throughout day.',
        '',
        'Free practice, deep impact.',
        '',
        'I tell journaling-curious: 3 morning pages classical practice.'
      ],
      lesson: 'Morning pages (3 daily) is classical journaling practice reducing baseline anxiety.'
    },
    {
      id: 'adn12_6',
      title: 'My anxiety triggered by family events',
      narrative: [
        'Family gatherings hard.',
        '',
        'Pre-event therapy.',
        '',
        'Plus exit plan.',
        '',
        'Plus support person.',
        '',
        'Managed events.',
        '',
        'I tell family-anxious: stack interventions per event.'
      ],
      lesson: 'Family event anxiety eases with stacked interventions per gathering.'
    },
    {
      id: 'adn12_7',
      title: 'My anxiety yielded to climbing gym',
      narrative: [
        'Rock climbing gym weekly.',
        '',
        'Physical challenge plus problem solving.',
        '',
        'Mind absorbed during climbs.',
        '',
        'Anxiety dropped substantially.',
        '',
        'Community formed.',
        '',
        'I tell adventurous anxious: climbing combines body and mind.'
      ],
      lesson: 'Rock climbing combines physical challenge and problem solving for anxiety relief.'
    },
    {
      id: 'adn12_8',
      title: 'My anxiety with my body',
      narrative: [
        'Body image anxiety severe.',
        '',
        'Triggered by mirrors, photos, clothes.',
        '',
        'Body image therapy specialty.',
        '',
        'Slowly built body neutrality.',
        '',
        'Anxiety reduced.',
        '',
        'I tell body-anxious: body image therapy specialty exists.'
      ],
      lesson: 'Body image anxiety has specialty therapy building neutrality over time.'
    },
    {
      id: 'adn12_9',
      title: 'My anxiety yielded to gentle yoga',
      narrative: [
        'Restorative yoga weekly.',
        '',
        'Slow, supported, gentle.',
        '',
        'Nervous system softened.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell stuck anxious: restorative yoga different from active.'
      ],
      lesson: 'Restorative yoga softens nervous system distinct from active yoga for anxiety.'
    },
    {
      id: 'adn12_10',
      title: 'My anxiety triggered by school dropoff',
      narrative: [
        'Dropoff at school triggered me.',
        '',
        'Worried about safety all day.',
        '',
        'Worked on tolerating separation.',
        '',
        'Set check-in protocol with school.',
        '',
        'Anxiety reduced.',
        '',
        'I tell separation-anxious parents: protocols ease worry.'
      ],
      lesson: 'School dropoff anxiety in parents eases with school check-in protocols.'
    },
    {
      id: 'adn12_11',
      title: 'My anxiety yielded to learning to cook',
      narrative: [
        'Learning to cook reduced anxiety.',
        '',
        'Recipe steps clear.',
        '',
        'Body engaged.',
        '',
        'Outcome predictable.',
        '',
        'Daily practice.',
        '',
        'I tell anxiety-prone: cooking is daily focused engagement.'
      ],
      lesson: 'Learning to cook provides daily focused engagement that reduces anxiety.'
    },
    {
      id: 'adn12_12',
      title: 'My anxiety after panic in store',
      narrative: [
        'Panic at Target.',
        '',
        'Mortified.',
        '',
        'Avoided stores for months.',
        '',
        'Exposure therapy.',
        '',
        'Returned to Target as first exposure.',
        '',
        'Anxiety dropped over weeks.',
        '',
        'I tell store-traumatized: return to scene works.'
      ],
      lesson: 'Returning to panic scene as exposure reverses store-avoidance pattern.'
    },
    {
      id: 'adn12_13',
      title: 'My anxiety yielded to volunteering with animals',
      narrative: [
        'Volunteer at animal shelter weekly.',
        '',
        'Cats and dogs grounded me.',
        '',
        'Anxiety dropped during shifts.',
        '',
        'Purpose plus connection.',
        '',
        'I tell isolated anxious: animal volunteering offers both.'
      ],
      lesson: 'Animal shelter volunteering combines purpose and presence for anxiety relief.'
    },
    {
      id: 'adn12_14',
      title: 'My anxiety triggered by anniversary of loss',
      narrative: [
        'Anniversary of mothers death.',
        '',
        'Anxiety surged annually.',
        '',
        'Therapist named anniversary reaction.',
        '',
        'Plan rituals each year.',
        '',
        'Anxiety predictable, manageable.',
        '',
        'I tell anniversary-stricken: ritual contains the wave.'
      ],
      lesson: 'Anniversary anxiety reactions are predictable; ritual containment helps.'
    },
    {
      id: 'adn12_15',
      title: 'My anxiety yielded to early bedtime',
      narrative: [
        '10pm bedtime hard rule.',
        '',
        'No exceptions for weeks.',
        '',
        'Sleep restored.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sleep-anxious: rigid bedtime is treatment.'
      ],
      lesson: 'Strictly enforced early bedtime is anxiety treatment through sleep restoration.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_13 = [
    {
      id: 'adn13_1',
      title: 'My anxiety yielded to fish tank',
      narrative: [
        'Got a fish tank.',
        '',
        'Watching fish daily.',
        '',
        'Sound of bubbler.',
        '',
        'Nervous system softened.',
        '',
        'Daily small ritual.',
        '',
        'I tell anxiety sufferers: aquarium has research base.'
      ],
      lesson: 'Aquarium watching has research backing as anxiety reduction tool.'
    },
    {
      id: 'adn13_2',
      title: 'My anxiety triggered by paperwork',
      narrative: [
        'Paperwork paralyzed me.',
        '',
        'Bills, taxes, forms.',
        '',
        'Hired bookkeeper for personal finances.',
        '',
        'Plus therapy on avoidance.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell paperwork-paralyzed: bookkeeper plus therapy.'
      ],
      lesson: 'Paperwork paralysis responds to combination of personal bookkeeper and avoidance therapy.'
    },
    {
      id: 'adn13_3',
      title: 'My anxiety yielded to outdoor cooking',
      narrative: [
        'Outdoor grilling weekly.',
        '',
        'Fire, smoke, air.',
        '',
        'Body engaged.',
        '',
        'Mind quiet.',
        '',
        'Anxiety eased.',
        '',
        'I tell anxiety sufferers: outdoor cooking grounding.'
      ],
      lesson: 'Outdoor cooking grounds nervous system through fire engagement.'
    },
    {
      id: 'adn13_4',
      title: 'My anxiety after fender bender',
      narrative: [
        'Minor fender bender.',
        '',
        'Anxiety severe for weeks.',
        '',
        'Drove with backup driver.',
        '',
        'Gradually solo again.',
        '',
        'Anxiety reduced.',
        '',
        'I tell driving-shaken: backup driver as scaffolding.'
      ],
      lesson: 'Backup driver scaffolds return to solo driving after accident anxiety.'
    },
    {
      id: 'adn13_5',
      title: 'My anxiety yielded to herbal tea',
      narrative: [
        'Daily herbal tea ritual.',
        '',
        'Specific blend at specific time.',
        '',
        'Anchor in routine.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell ritual-curious: tea ritual is treatment-grade routine.'
      ],
      lesson: 'Daily tea rituals provide anchoring routine for anxiety management.'
    },
    {
      id: 'adn13_6',
      title: 'My anxiety triggered by holiday gifts',
      narrative: [
        'Gift giving anxiety severe.',
        '',
        'Fear of wrong gift.',
        '',
        'Therapy on perfectionism.',
        '',
        'Plus structured gift giving with categories.',
        '',
        'Anxiety reduced.',
        '',
        'I tell gift-anxious: structure plus permission to be imperfect.'
      ],
      lesson: 'Gift giving anxiety eases with structured approach plus perfectionism therapy.'
    },
    {
      id: 'adn13_7',
      title: 'My anxiety yielded to wood working',
      narrative: [
        'Woodworking shop in garage.',
        '',
        'Hours of focused craft.',
        '',
        'Anxiety paused during work.',
        '',
        'Pieces I love resulted.',
        '',
        'I tell hands-on anxious: woodworking is flow state.'
      ],
      lesson: 'Woodworking provides hours of flow state through focused craft.'
    },
    {
      id: 'adn13_8',
      title: 'My anxiety after partners diagnosis',
      narrative: [
        'Partner diagnosed serious illness.',
        '',
        'My anxiety surged.',
        '',
        'Caregivers therapy.',
        '',
        'Plus support group.',
        '',
        'Managed my anxiety while caring.',
        '',
        'I tell new caregivers: own anxiety care first or with care.'
      ],
      lesson: 'New caregivers must address own anxiety to sustain care for partner.'
    },
    {
      id: 'adn13_9',
      title: 'My anxiety yielded to dance company',
      narrative: [
        'Joined amateur dance company at 50.',
        '',
        'Weekly rehearsals.',
        '',
        'Performance at year end.',
        '',
        'Body engaged.',
        '',
        'Community formed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell movement-curious: dance company combines structure and creativity.'
      ],
      lesson: 'Amateur dance companies combine structure, community, and creative expression.'
    },
    {
      id: 'adn13_10',
      title: 'My anxiety triggered by storms',
      narrative: [
        'Storm phobia from hurricane experience.',
        '',
        'Trauma therapy specific to weather.',
        '',
        'Plus practical preparedness.',
        '',
        'Felt safe both psychologically and physically.',
        '',
        'I tell weather-traumatized: dual approach essential.'
      ],
      lesson: 'Weather trauma needs both psychological therapy and practical preparedness.'
    },
    {
      id: 'adn13_11',
      title: 'My anxiety yielded to porch sitting',
      narrative: [
        'Evening porch sit ritual.',
        '',
        '30 min, no phone.',
        '',
        'Watch sunset.',
        '',
        'Nervous system shifted.',
        '',
        'Anxiety eased before bed.',
        '',
        'I tell evening-anxious: outdoor sit ritual.'
      ],
      lesson: 'Evening outdoor sit ritual reduces pre-sleep anxiety.'
    },
    {
      id: 'adn13_12',
      title: 'My anxiety with my online presence',
      narrative: [
        'Posted online, anxiety surged.',
        '',
        'Checked likes constantly.',
        '',
        'Therapist worked on validation source.',
        '',
        'Reduced posting.',
        '',
        'Anxiety dropped.',
        '',
        'I tell social-media-anxious: validation source matters.'
      ],
      lesson: 'Anxious online posting reflects external validation source needing therapy work.'
    },
    {
      id: 'adn13_13',
      title: 'My anxiety yielded to harmonica',
      narrative: [
        'Harmonica practice daily.',
        '',
        'Breath plus music.',
        '',
        'Lung exercises.',
        '',
        'Anxiety paused.',
        '',
        'I tell breath-curious: harmonica trains diaphragm.'
      ],
      lesson: 'Harmonica practice trains diaphragmatic breath while engaging with music.'
    },
    {
      id: 'adn13_14',
      title: 'My anxiety triggered by checkbook',
      narrative: [
        'Could not balance checkbook.',
        '',
        'Numbers triggered.',
        '',
        'Online banking simplified.',
        '',
        'Automatic categorization.',
        '',
        'Anxiety dropped.',
        '',
        'I tell math-anxious: tech can simplify finance anxiety.'
      ],
      lesson: 'Modern online banking automation reduces math-related finance anxiety.'
    },
    {
      id: 'adn13_15',
      title: 'My anxiety yielded to amateur radio',
      narrative: [
        'Got amateur radio license.',
        '',
        'Operated weekly.',
        '',
        'Tech focus, community.',
        '',
        'Anxiety dropped during sessions.',
        '',
        'I tell tech-minded anxious: hobby radio combines learning and community.'
      ],
      lesson: 'Amateur radio combines technical learning and community for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_14 = [
    {
      id: 'adn14_1',
      title: 'My anxiety yielded to bookstore visits',
      narrative: [
        'Weekly indie bookstore visits.',
        '',
        'Slow browsing.',
        '',
        'Smell of books.',
        '',
        'Anxiety dropped during visits.',
        '',
        'I tell book-lovers: bookstore browsing as meditation.'
      ],
      lesson: 'Indie bookstore browsing serves as gentle meditation reducing anxiety.'
    },
    {
      id: 'adn14_2',
      title: 'My anxiety triggered by my office',
      narrative: [
        'Office environment triggered me.',
        '',
        'Lighting, sound, chair.',
        '',
        'Workplace ergonomics consultant.',
        '',
        'Plus mental health day rights.',
        '',
        'Office redesigned.',
        '',
        'Anxiety dropped.',
        '',
        'I tell office-anxious: ergonomics and accommodations matter.'
      ],
      lesson: 'Office environment ergonomics and accommodations significantly affect workplace anxiety.'
    },
    {
      id: 'adn14_3',
      title: 'My anxiety yielded to mountain weekend',
      narrative: [
        'Monthly mountain weekend.',
        '',
        'Cabin, no service.',
        '',
        'Hiking, reading, cooking.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety lower for weeks after.',
        '',
        'I tell tech-tethered: regular off-grid time treats anxiety.'
      ],
      lesson: 'Regular off-grid weekends provide deep nervous system reset for anxiety.'
    },
    {
      id: 'adn14_4',
      title: 'My anxiety after losing pet',
      narrative: [
        'Cat died at 18.',
        '',
        'Companion of decades.',
        '',
        'Pet loss specialist.',
        '',
        'Validated my anxiety alongside grief.',
        '',
        'Healed over months.',
        '',
        'I tell pet grievers: pet loss specialists exist.'
      ],
      lesson: 'Pet loss specialists support grief and anxiety after long-term companion death.'
    },
    {
      id: 'adn14_5',
      title: 'My anxiety yielded to early supper',
      narrative: [
        '5pm supper, no late eating.',
        '',
        'Digestion completed before bed.',
        '',
        'Sleep improved.',
        '',
        'Anxiety reduced.',
        '',
        'I tell sleep-anxious: early supper for digestion.'
      ],
      lesson: 'Early supper times improve sleep through complete digestion before bed.'
    },
    {
      id: 'adn14_6',
      title: 'My anxiety triggered by court',
      narrative: [
        'Court appearance terrified me.',
        '',
        'Witness coach prepared me.',
        '',
        'Plus pre-court therapy.',
        '',
        'Got through appearance.',
        '',
        'I tell court-anxious: witness coaching specialty exists.'
      ],
      lesson: 'Witness coaching plus therapy supports court appearance anxiety.'
    },
    {
      id: 'adn14_7',
      title: 'My anxiety yielded to quilting',
      narrative: [
        'Joined quilt circle.',
        '',
        'Weekly meetings.',
        '',
        'Hands working fabric.',
        '',
        'Stories shared.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell isolated craft-curious: quilt circles offer community.'
      ],
      lesson: 'Quilt circles combine craft, story sharing, and community for anxiety relief.'
    },
    {
      id: 'adn14_8',
      title: 'My anxiety with my dentist',
      narrative: [
        'Dentist trigger from childhood pain.',
        '',
        'New trauma-informed dentist.',
        '',
        'Communicates every step.',
        '',
        'Anxiety manageable.',
        '',
        'Dental care continued.',
        '',
        'I tell dental-traumatized: trauma-informed dentists exist.'
      ],
      lesson: 'Trauma-informed dentistry communicates every step, reducing dental anxiety.'
    },
    {
      id: 'adn14_9',
      title: 'My anxiety yielded to senior center',
      narrative: [
        'Joined senior center at 65.',
        '',
        'Daily programs, lunch, activities.',
        '',
        'Built community.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell retired isolated: senior centers built for this.'
      ],
      lesson: 'Senior centers offer structured social programs that reduce retirement anxiety.'
    },
    {
      id: 'adn14_10',
      title: 'My anxiety triggered by hospital visits',
      narrative: [
        'Hospital trigger from childhood surgery.',
        '',
        'Hospital phobia limited care.',
        '',
        'Trauma therapy with medical focus.',
        '',
        'Plus patient advocate support.',
        '',
        'Healed enough for needed care.',
        '',
        'I tell hospital-phobic: medical trauma therapy plus advocate.'
      ],
      lesson: 'Medical trauma therapy plus patient advocates support hospital phobia recovery.'
    },
    {
      id: 'adn14_11',
      title: 'My anxiety yielded to film club',
      narrative: [
        'Weekly film club.',
        '',
        'Watch and discuss.',
        '',
        'Mental absorption plus conversation.',
        '',
        'Anxiety eased.',
        '',
        'I tell isolated cultural: film clubs activate brain and connect.'
      ],
      lesson: 'Film clubs activate brain and build connection through shared analysis.'
    },
    {
      id: 'adn14_12',
      title: 'My anxiety with my voice',
      narrative: [
        'Voice phobia after public mocking.',
        '',
        'Avoided phone calls.',
        '',
        'Voice therapy plus exposure.',
        '',
        'Slowly regained confidence.',
        '',
        'I tell voice-shamed: voice therapy specialty exists.'
      ],
      lesson: 'Voice therapy specialty supports recovery from voice-related shame and anxiety.'
    },
    {
      id: 'adn14_13',
      title: 'My anxiety yielded to model railroad',
      narrative: [
        'Model railroad layout.',
        '',
        'Hours of detailed work.',
        '',
        'Anxiety paused.',
        '',
        'Years of project.',
        '',
        'I tell detail-oriented anxious: model building is sustained flow.'
      ],
      lesson: 'Model railroad building provides sustained flow state through detailed work.'
    },
    {
      id: 'adn14_14',
      title: 'My anxiety triggered by clothing decisions',
      narrative: [
        'Could not decide what to wear.',
        '',
        'Anxiety daily.',
        '',
        'Therapist asked: capsule wardrobe?',
        '',
        'Reduced options.',
        '',
        'Decision fatigue eased.',
        '',
        'Anxiety dropped.',
        '',
        'I tell decision-anxious: capsule wardrobe removes daily stress.'
      ],
      lesson: 'Capsule wardrobes reduce daily decision fatigue and clothing anxiety.'
    },
    {
      id: 'adn14_15',
      title: 'My anxiety yielded to barbershop chat',
      narrative: [
        'Weekly barbershop visits.',
        '',
        'Same barber years.',
        '',
        'Conversation, grooming, ritual.',
        '',
        'Anxiety eased.',
        '',
        'I tell isolated men: barbershop community real.'
      ],
      lesson: 'Regular barbershop relationships provide community and grooming ritual for men anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_15 = [
    {
      id: 'adn15_1',
      title: 'My anxiety yielded to monastery retreat',
      narrative: [
        'Weeklong silent retreat.',
        '',
        'No phone, no schedule.',
        '',
        'Walking, sitting, eating in silence.',
        '',
        'Nervous system deep reset.',
        '',
        'Effects lasted months.',
        '',
        'I tell tried-everything anxious: silent retreats deep reset.'
      ],
      lesson: 'Silent monastery retreats provide deep nervous system reset lasting months.'
    },
    {
      id: 'adn15_2',
      title: 'My anxiety triggered by parents visits',
      narrative: [
        'Parents visits triggered anxiety.',
        '',
        'Critical family dynamics.',
        '',
        'Therapy plus structured visits.',
        '',
        'Short visits, in restaurants only.',
        '',
        'Boundaries maintained.',
        '',
        'Anxiety reduced.',
        '',
        'I tell visit-anxious: structure plus boundaries.'
      ],
      lesson: 'Parent visit anxiety eases with structured short visits in neutral spaces.'
    },
    {
      id: 'adn15_3',
      title: 'My anxiety yielded to walking labyrinth',
      narrative: [
        'Local labyrinth weekly walks.',
        '',
        'Walking meditation.',
        '',
        'Slow path traced.',
        '',
        'Mind eased.',
        '',
        'I tell meditation-curious: walking labyrinth different from sitting.'
      ],
      lesson: 'Walking labyrinths provide moving meditation distinct from sitting practice.'
    },
    {
      id: 'adn15_4',
      title: 'My anxiety after hospital ICU',
      narrative: [
        'ICU stay 2 weeks.',
        '',
        'Post-ICU anxiety severe.',
        '',
        'Post-ICU syndrome specialist.',
        '',
        'Medical trauma plus PTSD treatment.',
        '',
        'Recovery over year.',
        '',
        'I tell ICU survivors: post-ICU syndrome is real diagnosis.'
      ],
      lesson: 'Post-ICU syndrome is recognized diagnosis with specialty mental health support.'
    },
    {
      id: 'adn15_5',
      title: 'My anxiety yielded to morning meditation',
      narrative: [
        '20 min morning meditation.',
        '',
        '5 years consistent.',
        '',
        'Anxiety baseline dropped substantially.',
        '',
        'Brain measurably changed.',
        '',
        'I tell consistency-curious: years of meditation transform.'
      ],
      lesson: 'Multi-year consistent meditation practice produces measurable brain changes.'
    },
    {
      id: 'adn15_6',
      title: 'My anxiety triggered by relationships',
      narrative: [
        'Attachment anxiety severe.',
        '',
        'Drove partners away.',
        '',
        'Attachment-focused therapy.',
        '',
        'Earned secure attachment over years.',
        '',
        'I tell attachment-anxious: attachment can be changed.'
      ],
      lesson: 'Attachment anxiety responds to attachment-focused therapy over years to earn security.'
    },
    {
      id: 'adn15_7',
      title: 'My anxiety yielded to amateur orchestra',
      narrative: [
        'Joined community orchestra at 50.',
        '',
        'Weekly rehearsals.',
        '',
        'Music plus group focus.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell musical anxious: amateur orchestras welcome adults.'
      ],
      lesson: 'Amateur orchestras welcome adult musicians combining music and group focus.'
    },
    {
      id: 'adn15_8',
      title: 'My anxiety with my body changing',
      narrative: [
        'Aging body triggered anxiety.',
        '',
        'Mirror became enemy.',
        '',
        'Body neutrality therapy.',
        '',
        'Acceptance practiced.',
        '',
        'Anxiety reduced.',
        '',
        'I tell aging-anxious: body neutrality framework helps.'
      ],
      lesson: 'Aging body anxiety responds to body neutrality framework over body positivity.'
    },
    {
      id: 'adn15_9',
      title: 'My anxiety yielded to slow morning',
      narrative: [
        'Slow morning hour.',
        '',
        'No rushing.',
        '',
        'Coffee, sit, read.',
        '',
        'Anxiety baseline dropped.',
        '',
        'I tell rushed-mornings: slow morning hour transforms day.'
      ],
      lesson: 'Protected slow morning hour transforms daily anxiety baseline.'
    },
    {
      id: 'adn15_10',
      title: 'My anxiety triggered by clutter',
      narrative: [
        'Clutter accumulated, anxiety grew.',
        '',
        'Decluttering coach.',
        '',
        'Small daily clearing.',
        '',
        'Home and mind eased.',
        '',
        'I tell cluttered: outside help and small steps.'
      ],
      lesson: 'Clutter-related anxiety responds to decluttering coach with small daily action steps.'
    },
    {
      id: 'adn15_11',
      title: 'My anxiety yielded to local cafe',
      narrative: [
        'Daily cafe visit.',
        '',
        'Same place, same time.',
        '',
        'Routine plus mild social.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell anxiety sufferers: third place anchors day.'
      ],
      lesson: 'Daily third-place anchor with mild social presence reduces anxiety.'
    },
    {
      id: 'adn15_12',
      title: 'My anxiety with my parents care',
      narrative: [
        'Caring for aging parents.',
        '',
        'Anxiety severe.',
        '',
        'Sandwich generation specialist.',
        '',
        'Plus respite care.',
        '',
        'Survived caregiving years.',
        '',
        'I tell sandwich generation: specialty support exists.'
      ],
      lesson: 'Sandwich generation caregiving has specialty mental health support.'
    },
    {
      id: 'adn15_13',
      title: 'My anxiety yielded to walking everywhere',
      narrative: [
        'Sold car, walked everywhere.',
        '',
        'Body daily engaged.',
        '',
        'Pace slowed.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell urban-livers: car-free reduces anxiety.'
      ],
      lesson: 'Car-free urban living reduces anxiety through daily movement and slower pace.'
    },
    {
      id: 'adn15_14',
      title: 'My anxiety triggered by holidays',
      narrative: [
        'Holiday anxiety severe.',
        '',
        'Multiple triggers stacked.',
        '',
        'Holiday plan with therapist.',
        '',
        'Each event scoped, support arranged.',
        '',
        'Holidays manageable.',
        '',
        'I tell holiday-stricken: holiday plan with therapist.'
      ],
      lesson: 'Detailed holiday planning with therapist makes overwhelming season manageable.'
    },
    {
      id: 'adn15_15',
      title: 'My anxiety yielded to outdoor swimming',
      narrative: [
        'Outdoor pool weekly.',
        '',
        'Lap swimming.',
        '',
        'Sun on water.',
        '',
        'Mind quiet.',
        '',
        'Anxiety dropped.',
        '',
        'I tell movement-curious: outdoor swimming combines sun and exercise.'
      ],
      lesson: 'Outdoor swimming combines sun exposure and exercise for anxiety relief.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_16 = [
    {
      id: 'adn16_1',
      title: 'My anxiety yielded to ham radio operator',
      narrative: [
        'Late life hobby.',
        '',
        'Connect with strangers globally.',
        '',
        'Technical focus.',
        '',
        'Community formed.',
        '',
        'Anxiety eased.',
        '',
        'I tell tech-curious: ham radio combines learning and community.'
      ],
      lesson: 'Amateur ham radio provides technical learning and global community connection.'
    },
    {
      id: 'adn16_2',
      title: 'My anxiety triggered by stairs',
      narrative: [
        'Open staircases triggered me.',
        '',
        'Heights phobia.',
        '',
        'Exposure with hand on wall.',
        '',
        'Gradually less support.',
        '',
        'Stairs accessible.',
        '',
        'I tell heights-phobic: incremental support helps.'
      ],
      lesson: 'Heights phobia eases with incrementally less physical support during exposure.'
    },
    {
      id: 'adn16_3',
      title: 'My anxiety yielded to seasonal calendar',
      narrative: [
        'Followed seasonal rhythms.',
        '',
        'Different rituals each season.',
        '',
        'Body aligned with nature.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell modern-living: seasonal alignment reduces anxiety.'
      ],
      lesson: 'Seasonal ritual alignment with natural rhythms reduces baseline anxiety.'
    },
    {
      id: 'adn16_4',
      title: 'My anxiety after layoff at 45',
      narrative: [
        'Mid career layoff.',
        '',
        'Mortgage, kids, fears.',
        '',
        'Career coach plus therapist.',
        '',
        'Side gig while searching.',
        '',
        'Eight months: new job.',
        '',
        'I tell laid-off: combined coach plus therapist plus action.'
      ],
      lesson: 'Mid-career layoff needs combined coach, therapist, and active side income.'
    },
    {
      id: 'adn16_5',
      title: 'My anxiety yielded to bedtime story',
      narrative: [
        'Read bedtime story to self at 40.',
        '',
        'Audiobook child stories.',
        '',
        'Inner child soothed.',
        '',
        'Sleep arrived.',
        '',
        'I tell sleep-anxious: child bedtime stories work for adults.'
      ],
      lesson: 'Adult bedtime stories via audiobooks soothe inner child and ease sleep anxiety.'
    },
    {
      id: 'adn16_6',
      title: 'My anxiety triggered by Sundays',
      narrative: [
        'Sunday anxiety severe.',
        '',
        'Anticipation of Monday.',
        '',
        'Therapist named Sunday scaries.',
        '',
        'Sunday afternoon ritual designed.',
        '',
        'Anxiety reduced.',
        '',
        'I tell Sunday-anxious: design specific Sunday rituals.'
      ],
      lesson: 'Sunday scaries respond to designed Sunday afternoon ritual interventions.'
    },
    {
      id: 'adn16_7',
      title: 'My anxiety yielded to early swim',
      narrative: [
        '5am pool swim daily.',
        '',
        'Quiet, alone, focused.',
        '',
        'Anxiety processed in water.',
        '',
        'Day started clear.',
        '',
        'I tell movement-curious: early swim resets nervous system.'
      ],
      lesson: 'Early morning swim resets nervous system for entire day.'
    },
    {
      id: 'adn16_8',
      title: 'My anxiety with my children',
      narrative: [
        'Children triggered anxiety.',
        '',
        'Worried for them constantly.',
        '',
        'Parent therapy.',
        '',
        'Worked on tolerating uncertainty.',
        '',
        'Children flourished.',
        '',
        'I tell anxious parents: your fears can limit them.'
      ],
      lesson: 'Anxious parents must address own fears that limit children growth.'
    },
    {
      id: 'adn16_9',
      title: 'My anxiety yielded to weekly massage',
      narrative: [
        'Weekly massage 4 years.',
        '',
        'Body released chronic tension.',
        '',
        'Anxiety dropped substantially.',
        '',
        'Expensive but worth it.',
        '',
        'I tell budget-permitting: weekly bodywork is treatment.'
      ],
      lesson: 'Weekly massage releases chronic body tension that contributes to anxiety.'
    },
    {
      id: 'adn16_10',
      title: 'My anxiety triggered by Christmas',
      narrative: [
        'Christmas anxiety severe.',
        '',
        'Lost loved one at holidays.',
        '',
        'Holiday grief therapy.',
        '',
        'Plus new rituals.',
        '',
        'Christmas slowly bearable.',
        '',
        'I tell holiday-grieving: new rituals plus therapy.'
      ],
      lesson: 'Holiday grief responds to new ritual creation plus grief-focused therapy.'
    },
    {
      id: 'adn16_11',
      title: 'My anxiety yielded to gentle morning routine',
      narrative: [
        'Morning routine 90 min.',
        '',
        'No phone first hour.',
        '',
        'Stretch, coffee, read, write.',
        '',
        'Anxiety baseline dropped substantially.',
        '',
        'I tell mornings-rushed: 90 min gentle morning transforms.'
      ],
      lesson: 'Ninety-minute gentle morning routines substantially reduce baseline anxiety.'
    },
    {
      id: 'adn16_12',
      title: 'My anxiety with my work',
      narrative: [
        'Work was anxiety source.',
        '',
        'Therapy could not change job.',
        '',
        'Eventually switched careers.',
        '',
        'Lower pay, lower anxiety.',
        '',
        'Trade I made consciously.',
        '',
        'I tell trapped-by-job: sometimes change is treatment.'
      ],
      lesson: 'Job-driven anxiety sometimes requires career change as treatment.'
    },
    {
      id: 'adn16_13',
      title: 'My anxiety yielded to outdoor sleeping',
      narrative: [
        'Summer outdoor sleeping.',
        '',
        'Screened porch.',
        '',
        'Night air, sounds, stars.',
        '',
        'Sleep deepened.',
        '',
        'Anxiety dropped.',
        '',
        'I tell sleep-anxious: outdoor sleeping in summer.'
      ],
      lesson: 'Outdoor sleeping in summer months deepens sleep and reduces anxiety.'
    },
    {
      id: 'adn16_14',
      title: 'My anxiety triggered by news anniversary',
      narrative: [
        'Disaster anniversaries triggered me.',
        '',
        '9/11, school shooting anniversaries.',
        '',
        'Limited news around dates.',
        '',
        'Predictable trigger preparation.',
        '',
        'Anxiety manageable.',
        '',
        'I tell disaster-witnesses: anniversary preparation eases impact.'
      ],
      lesson: 'Anniversary preparation for disaster-witnessed events eases triggered anxiety.'
    },
    {
      id: 'adn16_15',
      title: 'My anxiety yielded to bicycle',
      narrative: [
        'Bicycle everywhere at 35.',
        '',
        'Body active daily.',
        '',
        'Pace slow.',
        '',
        'Air, weather, world.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell car-dependent: cycling commute changes life.'
      ],
      lesson: 'Bicycle commuting reduces anxiety through daily activity and slower pace.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_5 = [
    {
      id: 'adn5_1',
      title: 'My anxiety with food I overcame',
      narrative: [
        'ARFID style anxiety around new foods.',
        '',
        'Limited diet for years.',
        '',
        'Nutritionist plus exposure therapist team.',
        '',
        'One new food per week.',
        '',
        'Tiny portions, no pressure.',
        '',
        'Diet expanded.',
        '',
        'Social eating possible.',
        '',
        'I tell food-restrictive: ARFID treatment exists.'
      ],
      lesson: 'ARFID food anxiety responds to graduated exposure with nutritionist team.'
    },
    {
      id: 'adn5_2',
      title: 'My anxiety after my child was sick',
      narrative: [
        'Child hospitalized with serious illness at 6.',
        '',
        'Recovered fully.',
        '',
        'My anxiety continued for years.',
        '',
        'Every cough triggered panic.',
        '',
        'Medical trauma therapy.',
        '',
        'Specific protocols for parental medical trauma.',
        '',
        'Healed over time.',
        '',
        'I tell parents of recovered kids: parental medical trauma is real.'
      ],
      lesson: 'Parental medical trauma persists after child recovery; specific therapy needed.'
    },
    {
      id: 'adn5_3',
      title: 'My anxiety yielding to chess',
      narrative: [
        'Discovered chess at 30.',
        '',
        'Total focus on board.',
        '',
        'Anxiety melted during games.',
        '',
        'Mind absorbed in problem.',
        '',
        'Flow state achievable.',
        '',
        'Chess became weekly practice.',
        '',
        'Lifelong anxiety hobby.',
        '',
        'I tell anxiety-prone: chess provides flow state therapy.'
      ],
      lesson: 'Chess and similar absorbing strategy games provide flow-state anxiety relief.'
    },
    {
      id: 'adn5_4',
      title: 'My anxiety I treated with cold plunge',
      narrative: [
        'Read about cold therapy.',
        '',
        'Skeptical.',
        '',
        'Tried morning cold showers.',
        '',
        'Then ice bath weekly.',
        '',
        'Vagus nerve stimulation real.',
        '',
        'Anxiety lower throughout day.',
        '',
        'Not replacement for therapy.',
        '',
        'But useful adjunct.',
        '',
        'I tell adjunct-curious: cold therapy is research-backed anxiety tool.'
      ],
      lesson: 'Cold therapy via vagus nerve stimulation is research-backed anxiety adjunct.'
    },
    {
      id: 'adn5_5',
      title: 'My anxiety yielded to weighted blanket',
      narrative: [
        'Skeptical of weighted blanket.',
        '',
        'Tried 15 lb blanket.',
        '',
        'Slept better immediately.',
        '',
        'Deep pressure stimulation calming.',
        '',
        'Nightly use.',
        '',
        'Anxiety chronic improvement.',
        '',
        'Simple intervention helped.',
        '',
        'I tell sleep-anxious: weighted blankets are real treatment.'
      ],
      lesson: 'Weighted blankets provide deep-pressure stimulation that eases nighttime anxiety.'
    },
    {
      id: 'adn5_6',
      title: 'My anxiety after pet died',
      narrative: [
        'Lost dog of 14 years.',
        '',
        'Anxiety surged.',
        '',
        'Pet was anchor.',
        '',
        'Therapist validated pet grief.',
        '',
        'Specialized pet loss support.',
        '',
        'Eventually adopted again.',
        '',
        'New dog helped healing.',
        '',
        'I tell pet grievers: pet loss anxiety is legitimate grief.'
      ],
      lesson: 'Pet loss creates legitimate grief and anxiety; specialized support exists.'
    },
    {
      id: 'adn5_7',
      title: 'My anxiety in groups I addressed',
      narrative: [
        'Group settings terrified me.',
        '',
        'Joined anxiety group ironically.',
        '',
        'Treatment included being in group.',
        '',
        'Exposure plus skill practice.',
        '',
        'Hardest treatment but best.',
        '',
        'Group anxiety gradually reduced.',
        '',
        'I tell group-anxious: group therapy itself is treatment.'
      ],
      lesson: 'Group anxiety responds to group therapy as exposure-and-skill format.'
    },
    {
      id: 'adn5_8',
      title: 'My anxiety I named ADHD',
      narrative: [
        'Treatment for anxiety partial.',
        '',
        'Psychiatrist screened for ADHD.',
        '',
        'Diagnosed comorbid ADHD.',
        '',
        'ADHD treatment alongside anxiety.',
        '',
        'Both improved.',
        '',
        'Anxiety often masks ADHD or vice versa.',
        '',
        'I tell partially-treated: screen for comorbid ADHD.'
      ],
      lesson: 'Comorbid ADHD with anxiety common; treating both improves both.'
    },
    {
      id: 'adn5_9',
      title: 'My anxiety after big move',
      narrative: [
        'Moved cross country at 45.',
        '',
        'Anxiety surged.',
        '',
        'New everything.',
        '',
        'Therapist offered telehealth from old state.',
        '',
        'Continuity helped.',
        '',
        'Built new local network slowly.',
        '',
        'Anxiety stabilized over months.',
        '',
        'I tell relocators: telehealth continuity matters during transitions.'
      ],
      lesson: 'Cross-country moves require telehealth continuity to stabilize anxiety during transitions.'
    },
    {
      id: 'adn5_10',
      title: 'My anxiety in elevators yielded to friend',
      narrative: [
        'Best friend with me each elevator ride.',
        '',
        'Then with phone call.',
        '',
        'Then alone with calming app.',
        '',
        'Social scaffolding plus tools.',
        '',
        'Gradual transition.',
        '',
        'I tell phobia sufferers: trusted friend accelerates exposure.'
      ],
      lesson: 'Trusted friend as scaffold accelerates phobia exposure work.'
    },
    {
      id: 'adn5_11',
      title: 'My anxiety after seeing crime',
      narrative: [
        'Witnessed assault.',
        '',
        'Did not know I had vicarious trauma.',
        '',
        'Anxiety symptoms developed.',
        '',
        'Therapist named it.',
        '',
        'Vicarious trauma treatment.',
        '',
        'Healed over months.',
        '',
        'I tell witnesses: vicarious trauma is real diagnosis.'
      ],
      lesson: 'Vicarious trauma from witnessing violence is real and treatable.'
    },
    {
      id: 'adn5_12',
      title: 'My anxiety yielded to walking partner',
      narrative: [
        'Daily walk with neighbor.',
        '',
        '30 min, every day.',
        '',
        'Walking and talking.',
        '',
        'Movement plus connection.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Two birds, one walk.',
        '',
        'I tell anxiety sufferers: walking partner is treatment.'
      ],
      lesson: 'Daily walking partnerships combine movement and connection for anxiety relief.'
    },
    {
      id: 'adn5_13',
      title: 'My anxiety triggered by parents call',
      narrative: [
        'Parents calls triggered anxiety.',
        '',
        'Did not know why for years.',
        '',
        'Therapy revealed: childhood criticism patterns.',
        '',
        'Worked on boundary setting.',
        '',
        'Calls less frequent, shorter.',
        '',
        'Anxiety reduced.',
        '',
        'I tell parent-anxious adult children: boundaries reduce anxiety.'
      ],
      lesson: 'Parent-triggered anxiety in adults yields to boundary-setting work.'
    },
    {
      id: 'adn5_14',
      title: 'My anxiety after losing job at 55',
      narrative: [
        'Laid off at 55, age-anxiety.',
        '',
        'Ageism real.',
        '',
        'Found mature workers support group.',
        '',
        'Anxiety treatment plus advocacy.',
        '',
        'New job at 56.',
        '',
        'Anxiety gradually eased.',
        '',
        'I tell laid-off mature workers: ageism anxiety is real and specific.'
      ],
      lesson: 'Job loss at older age combines ageism with anxiety; specific support needed.'
    },
    {
      id: 'adn5_15',
      title: 'My anxiety eased by service dog',
      narrative: [
        'Service dog trained for anxiety.',
        '',
        'Deep pressure on chest during attacks.',
        '',
        'Alert to rising heart rate.',
        '',
        'Provided structure.',
        '',
        'Public access transformed life.',
        '',
        'I tell severely anxious: service dogs for anxiety exist.'
      ],
      lesson: 'Service dogs trained for anxiety provide somatic intervention and structure.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_6 = [
    {
      id: 'adn6_1',
      title: 'My anxiety after divorce',
      narrative: [
        'Divorce at 45.',
        '',
        'Anxiety surged.',
        '',
        'Future uncertain.',
        '',
        'Therapy plus divorce support group.',
        '',
        'Slowly rebuilt.',
        '',
        'New self emerged.',
        '',
        'Anxiety eased over two years.',
        '',
        'I tell divorcees: combined therapy plus group works.'
      ],
      lesson: 'Divorce anxiety responds to combined individual therapy and support groups.'
    },
    {
      id: 'adn6_2',
      title: 'My anxiety with cooking I treated',
      narrative: [
        'Could not cook from anxiety.',
        '',
        'Felt judged by family.',
        '',
        'Tried meal kit subscription.',
        '',
        'Instructions removed judgment.',
        '',
        'Built skills slowly.',
        '',
        'Cooked Thanksgiving for family at 35.',
        '',
        'Anxiety yielded to skill.',
        '',
        'I tell kitchen-anxious: meal kits scaffold cooking confidence.'
      ],
      lesson: 'Kitchen anxiety yields to meal-kit scaffolding that removes recipe judgment.'
    },
    {
      id: 'adn6_3',
      title: 'My anxiety attack at fathers funeral',
      narrative: [
        'Funeral attendance critical.',
        '',
        'Anxiety attacked.',
        '',
        'Could not walk to casket.',
        '',
        'Sister supported me.',
        '',
        'Sat in pew, breathed.',
        '',
        'Eventually approached casket.',
        '',
        'Said goodbye.',
        '',
        'Grief plus anxiety together.',
        '',
        'I tell mourners: bring support person, expect anxiety, give self grace.'
      ],
      lesson: 'Funeral anxiety amplifies grief; support person and self-grace needed.'
    },
    {
      id: 'adn6_4',
      title: 'My anxiety yielded to bathing routine',
      narrative: [
        'Therapist recommended elaborate bath ritual.',
        '',
        'Felt indulgent.',
        '',
        'Tried weekly.',
        '',
        'Bath salts, candles, music.',
        '',
        'Nervous system reset.',
        '',
        'Weekly anxiety dropped.',
        '',
        'Treatment-grade self-care.',
        '',
        'I tell self-denying: bath rituals are real treatment.'
      ],
      lesson: 'Elaborate weekly bath rituals provide nervous system reset for anxiety.'
    },
    {
      id: 'adn6_5',
      title: 'My anxiety triggered by phone calls',
      narrative: [
        'Could not answer phone.',
        '',
        'Texts felt safe, calls did not.',
        '',
        'Therapist did graduated exposure.',
        '',
        'Recorded voicemail to self first.',
        '',
        'Then calls with trusted friend.',
        '',
        'Then calls to businesses.',
        '',
        'Anxiety gradually reduced.',
        '',
        'I tell phone-anxious: graduated exposure treats it.'
      ],
      lesson: 'Phone call anxiety responds to graduated exposure from voicemails to live calls.'
    },
    {
      id: 'adn6_6',
      title: 'My anxiety in college dorm',
      narrative: [
        'First semester anxiety crisis.',
        '',
        'Counseling center visited daily.',
        '',
        'Considered dropping out.',
        '',
        'Counselor helped me stay.',
        '',
        'Medications adjusted.',
        '',
        'Sleep restored.',
        '',
        'Made it through year.',
        '',
        'Graduated four years later.',
        '',
        'I tell college students: counseling center is for crises like this.'
      ],
      lesson: 'College counseling centers support students through crisis to graduation.'
    },
    {
      id: 'adn6_7',
      title: 'My anxiety lifted with hobby community',
      narrative: [
        'Joined knitting group.',
        '',
        'Weekly meetings, gentle conversation.',
        '',
        'Hands occupied, mind eased.',
        '',
        'Community supportive.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell isolated anxious: hobby communities provide gentle social.'
      ],
      lesson: 'Hobby communities with gentle social structure ease anxiety meaningfully.'
    },
    {
      id: 'adn6_8',
      title: 'My anxiety at family holidays',
      narrative: [
        'Holidays triggered anxiety.',
        '',
        'Family dynamics fraught.',
        '',
        'Pre-holiday therapy session.',
        '',
        'Plus mid-holiday calling therapist option.',
        '',
        'Boundaries planned.',
        '',
        'Exit strategy ready.',
        '',
        'Holidays manageable.',
        '',
        'I tell holiday-anxious: pre and mid-holiday therapy access.'
      ],
      lesson: 'Family holiday anxiety eases with pre-event planning and mid-event therapy access.'
    },
    {
      id: 'adn6_9',
      title: 'My anxiety relapse during pandemic',
      narrative: [
        'Recovered for years.',
        '',
        'Pandemic relapsed me.',
        '',
        'Telehealth therapy resumed.',
        '',
        'Medication adjusted.',
        '',
        'Stabilized over months.',
        '',
        'Major life events can trigger relapse.',
        '',
        'I tell recovered: relapse not personal failure.'
      ],
      lesson: 'Major life events like pandemics trigger anxiety relapse; not personal failure.'
    },
    {
      id: 'adn6_10',
      title: 'My anxiety yielded to choir',
      narrative: [
        'Joined community choir.',
        '',
        'Singing as group.',
        '',
        'Body engaged.',
        '',
        'Breath regulated.',
        '',
        'Community formed.',
        '',
        'Anxiety eased weekly.',
        '',
        'I tell stuck sufferers: choir is real treatment.'
      ],
      lesson: 'Community choir engages breath, body, and group cohesion as anxiety treatment.'
    },
    {
      id: 'adn6_11',
      title: 'My anxiety after stroke',
      narrative: [
        'Mild stroke at 65.',
        '',
        'Anxiety about another stroke.',
        '',
        'Therapy plus medical reassurance.',
        '',
        'Health behavior changes.',
        '',
        'Worked with stroke psychologist.',
        '',
        'Anxiety reduced over months.',
        '',
        'I tell stroke survivors: post-stroke anxiety is treatable specialty.'
      ],
      lesson: 'Post-stroke anxiety responds to specialized stroke psychology treatment.'
    },
    {
      id: 'adn6_12',
      title: 'My anxiety triggered by political news',
      narrative: [
        'Constant political anxiety.',
        '',
        'News cycle 24/7.',
        '',
        'Therapist suggested news boundaries.',
        '',
        'One trusted source, once daily.',
        '',
        'No social media news.',
        '',
        'Voted, donated, organized.',
        '',
        'But limited input.',
        '',
        'Anxiety reduced significantly.',
        '',
        'I tell politically-anxious: limit input, increase action.'
      ],
      lesson: 'Political anxiety eases by limiting news input and channeling concern into action.'
    },
    {
      id: 'adn6_13',
      title: 'My anxiety in body I learned to read',
      narrative: [
        'Body signals taught me anxiety patterns.',
        '',
        'Jaw clenching, shoulder tension, shallow breath.',
        '',
        'Caught anxiety early before peak.',
        '',
        'Used skills proactively.',
        '',
        'Body literacy.',
        '',
        'I tell anxiety sufferers: body signs precede thoughts.'
      ],
      lesson: 'Body signals precede anxiety peak; body literacy enables early intervention.'
    },
    {
      id: 'adn6_14',
      title: 'My anxiety yielded to puzzles',
      narrative: [
        'Jigsaw puzzles weekly.',
        '',
        '1000 piece, focused, quiet.',
        '',
        'Mind absorbed.',
        '',
        'Anxiety paused.',
        '',
        'Cheap therapy.',
        '',
        'I tell hobby-curious: jigsaw puzzles provide flow.'
      ],
      lesson: 'Jigsaw puzzles provide affordable flow-state anxiety relief.'
    },
    {
      id: 'adn6_15',
      title: 'My anxiety after surviving disaster',
      narrative: [
        'House lost in flood.',
        '',
        'PTSD plus anxiety.',
        '',
        'Disaster mental health services.',
        '',
        'Community recovery program.',
        '',
        'Years of rebuilding.',
        '',
        'I tell disaster survivors: disaster mental health is specialty.'
      ],
      lesson: 'Post-disaster anxiety needs specialty disaster mental health services.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_7 = [
    {
      id: 'adn7_1',
      title: 'My anxiety lessened with martial arts',
      narrative: [
        'Started Brazilian jiu jitsu at 40.',
        '',
        'Physical engagement, controlled stress.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Sparring built tolerance.',
        '',
        'Community formed.',
        '',
        'I tell anxious adults: martial arts treats anxiety physically.'
      ],
      lesson: 'Martial arts provide controlled stress exposure that builds anxiety tolerance.'
    },
    {
      id: 'adn7_2',
      title: 'My anxiety yielded to therapy dog visit',
      narrative: [
        'Hospital had therapy dog program.',
        '',
        'Weekly visits during recovery.',
        '',
        'Dog calmed nervous system.',
        '',
        'Anxiety dropped during visits.',
        '',
        'Lingering effect for hours.',
        '',
        'I tell hospitalized: ask about therapy dog programs.'
      ],
      lesson: 'Therapy dog visits provide measurable anxiety reduction during hospitalization.'
    },
    {
      id: 'adn7_3',
      title: 'My anxiety I treated with grief work',
      narrative: [
        'Anxiety masked unprocessed grief.',
        '',
        'Mother died years before.',
        '',
        'Never grieved properly.',
        '',
        'Grief therapy.',
        '',
        'Tears, sorrow, healing.',
        '',
        'Anxiety lifted as grief processed.',
        '',
        'I tell anxious with old loss: process grief first.'
      ],
      lesson: 'Unprocessed grief can present as anxiety; grief work resolves both.'
    },
    {
      id: 'adn7_4',
      title: 'My anxiety after winning',
      narrative: [
        'Won big promotion.',
        '',
        'Anxiety increased.',
        '',
        'Imposter syndrome.',
        '',
        'Pressure of new role.',
        '',
        'Coaching plus therapy.',
        '',
        'Anxiety stabilized over 6 months.',
        '',
        'Earned my role.',
        '',
        'I tell promoted: success-anxiety is real and treatable.'
      ],
      lesson: 'Success anxiety and imposter syndrome are real; combined coaching plus therapy helps.'
    },
    {
      id: 'adn7_5',
      title: 'My anxiety yielded to swim',
      narrative: [
        'Daily swim.',
        '',
        'Water muffled world.',
        '',
        'Body engaged in rhythm.',
        '',
        'Anxiety paused.',
        '',
        'Lifelong practice.',
        '',
        'I tell anxiety sufferers: swimming has unique sensory properties.'
      ],
      lesson: 'Swimming provides unique sensory anxiety relief through water envelope and rhythm.'
    },
    {
      id: 'adn7_6',
      title: 'My anxiety dropped with phone-free hours',
      narrative: [
        'Tried phone-free 9pm to 8am.',
        '',
        'Hard first week.',
        '',
        'Then sleep improved.',
        '',
        'Morning anxiety dropped.',
        '',
        'Evenings calmer.',
        '',
        'Single intervention worked.',
        '',
        'I tell device-tethered: phone-free hours measurably reduce anxiety.'
      ],
      lesson: 'Phone-free hours from 9pm to 8am measurably reduce anxiety.'
    },
    {
      id: 'adn7_7',
      title: 'My anxiety as sensitive person',
      narrative: [
        'Always more sensitive than others.',
        '',
        'Felt broken.',
        '',
        'Discovered Highly Sensitive Person concept.',
        '',
        'Not pathology, trait.',
        '',
        'Built life around HSP needs.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell sensitive sufferers: HSP framework helps.'
      ],
      lesson: 'Highly Sensitive Person framework reframes sensitivity as trait not pathology.'
    },
    {
      id: 'adn7_8',
      title: 'My anxiety triggered by certain people',
      narrative: [
        'Some people triggered anxiety.',
        '',
        'Did not know why.',
        '',
        'Therapy revealed: similar to childhood abuser.',
        '',
        'Avoidance with awareness.',
        '',
        'When unavoidable, prep and tools.',
        '',
        'Anxiety manageable.',
        '',
        'I tell person-triggered: trauma history can explain.'
      ],
      lesson: 'Person-triggered anxiety often connects to trauma history; awareness enables strategy.'
    },
    {
      id: 'adn7_9',
      title: 'My anxiety yielded to medication change',
      narrative: [
        'First SSRI did not work.',
        '',
        'Did not give up.',
        '',
        'Tried second medication.',
        '',
        'Then third.',
        '',
        'Fourth was the match.',
        '',
        'Took two years to find.',
        '',
        'Worth it.',
        '',
        'I tell medication-resistant: persistence finds match.'
      ],
      lesson: 'Anxiety medication matching may take multiple trials; persistence essential.'
    },
    {
      id: 'adn7_10',
      title: 'My anxiety related to perfectionism',
      narrative: [
        'Perfectionism drove anxiety.',
        '',
        'Could not finish tasks.',
        '',
        'Therapy on perfectionism core.',
        '',
        'Practice imperfect output.',
        '',
        'Tolerate good enough.',
        '',
        'Anxiety dropped.',
        '',
        'I tell perfectionists: anxiety lives in your standards.'
      ],
      lesson: 'Perfectionism drives anxiety; tolerating good-enough output reduces both.'
    },
    {
      id: 'adn7_11',
      title: 'My anxiety in checkup waiting room',
      narrative: [
        'Medical appointments triggered me.',
        '',
        'White coat hypertension.',
        '',
        'Prep routine before appointments.',
        '',
        'Breathing, distraction, support person.',
        '',
        'Doctor patient with anxiety.',
        '',
        'Manageable now.',
        '',
        'I tell medical-anxious: prep routine plus understanding doctor.'
      ],
      lesson: 'Medical appointment anxiety eases with prep routine and patient doctor.'
    },
    {
      id: 'adn7_12',
      title: 'My anxiety yielded to journaling',
      narrative: [
        'Skeptical of journaling.',
        '',
        'Tried 10 min daily.',
        '',
        'Brain dump format.',
        '',
        'Worries went on paper.',
        '',
        'Mind quieter.',
        '',
        'Sleep improved.',
        '',
        'I tell skeptics: brain dump journaling tested anxiety relief.'
      ],
      lesson: 'Brain-dump journaling reliably reduces evening anxiety and improves sleep.'
    },
    {
      id: 'adn7_13',
      title: 'My anxiety with money meetings',
      narrative: [
        'Couldnt discuss money with partner.',
        '',
        'Anxiety blocked conversation.',
        '',
        'Couples therapy with financial coach.',
        '',
        'Scheduled monthly money meetings.',
        '',
        'Tools for anxiety during.',
        '',
        'Communication improved.',
        '',
        'I tell money-anxious couples: scheduled meetings with tools.'
      ],
      lesson: 'Money conversation anxiety in couples responds to scheduled meetings with structure.'
    },
    {
      id: 'adn7_14',
      title: 'My anxiety after surgery for daughter',
      narrative: [
        'Daughter major surgery.',
        '',
        'My anxiety severe before, during, after.',
        '',
        'Parent support coordinator in hospital.',
        '',
        'Mental health resources available.',
        '',
        'Helped me support her.',
        '',
        'I tell parent caregivers: ask for parent mental health support in hospital.'
      ],
      lesson: 'Hospitals offer parent mental health support during child surgery; ask.'
    },
    {
      id: 'adn7_15',
      title: 'My anxiety I named menopause',
      narrative: [
        'New anxiety at 50.',
        '',
        'Did not fit pattern.',
        '',
        'OB-GYN screened: perimenopause.',
        '',
        'Hormone adjustment helped.',
        '',
        'Plus therapy.',
        '',
        'Anxiety reduced.',
        '',
        'I tell midlife women: new anxiety could be hormonal.'
      ],
      lesson: 'New mid-life anxiety in women may be perimenopause hormonal shift.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_8 = [
    {
      id: 'adn8_1',
      title: 'My anxiety yielded to morning routine',
      narrative: [
        'Chaotic mornings worsened anxiety.',
        '',
        'Built tight routine.',
        '',
        'Same wake time.',
        '',
        'Water, stretch, breakfast.',
        '',
        'Specific order.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell anxious mornings: predictable routine is treatment.'
      ],
      lesson: 'Predictable morning routines substantially reduce morning anxiety.'
    },
    {
      id: 'adn8_2',
      title: 'My anxiety after partners infidelity',
      narrative: [
        'Discovered affair.',
        '',
        'Anxiety severe for months.',
        '',
        'Sleep destroyed.',
        '',
        'Could not eat.',
        '',
        'Therapy plus support group.',
        '',
        'Decided to stay or leave separately from anxiety treatment.',
        '',
        'Healed slowly.',
        '',
        'I tell betrayed: trauma anxiety after affair needs specific care.'
      ],
      lesson: 'Affair betrayal creates trauma anxiety needing specific care, separate from relationship decision.'
    },
    {
      id: 'adn8_3',
      title: 'My anxiety with stage performance',
      narrative: [
        'Loved acting, hated stage anxiety.',
        '',
        'Performance coach plus therapist team.',
        '',
        'Pre-show ritual developed.',
        '',
        'Anxiety became tool not enemy.',
        '',
        'Channel energy into performance.',
        '',
        'I tell performers: stage anxiety reframable as energy.'
      ],
      lesson: 'Stage anxiety reframes as performance energy through coaching and ritual.'
    },
    {
      id: 'adn8_4',
      title: 'My anxiety yielded to gratitude practice',
      narrative: [
        'Daily gratitude journal.',
        '',
        'Three things per day.',
        '',
        'Specific not general.',
        '',
        'Brain shifted over weeks.',
        '',
        'Anxiety dropped.',
        '',
        'Cheap effective tool.',
        '',
        'I tell anxiety sufferers: specific daily gratitude shifts brain.'
      ],
      lesson: 'Specific daily gratitude practice measurably reduces anxiety.'
    },
    {
      id: 'adn8_5',
      title: 'My anxiety triggered by social media',
      narrative: [
        'Anxiety worse after scrolling.',
        '',
        'Tested: deleted apps for week.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Reinstalled with strict limits.',
        '',
        'Or stayed off.',
        '',
        'I tell social-media-anxious: causation testing reveals impact.'
      ],
      lesson: 'Social media causation testing via deletion reveals anxiety contribution clearly.'
    },
    {
      id: 'adn8_6',
      title: 'My anxiety with public speaking',
      narrative: [
        'Toastmasters for years.',
        '',
        'Plus individual coaching.',
        '',
        'Plus visualization.',
        '',
        'Plus breathing.',
        '',
        'Plus medication for big talks.',
        '',
        'All together transformative.',
        '',
        'Now I keynote.',
        '',
        'I tell speaking-anxious: stack interventions.'
      ],
      lesson: 'Public speaking anxiety responds to stacked interventions including occasional medication.'
    },
    {
      id: 'adn8_7',
      title: 'My anxiety yielded to acupuncture',
      narrative: [
        'Tried acupuncture skeptically.',
        '',
        'Weekly sessions.',
        '',
        'Nervous system shifted.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Adjunct not replacement.',
        '',
        'I tell skeptics: acupuncture has research base for anxiety.'
      ],
      lesson: 'Acupuncture has research base for anxiety as adjunct treatment.'
    },
    {
      id: 'adn8_8',
      title: 'My anxiety after partner death',
      narrative: [
        'Partner died at 55.',
        '',
        'Anxiety overwhelmed grief.',
        '',
        'Bereavement specialist.',
        '',
        'Anxiety treatment alongside grief.',
        '',
        'Slowly rebuilt.',
        '',
        'I tell widowed: bereavement anxiety distinct from grief.'
      ],
      lesson: 'Widowhood anxiety is distinct from grief and needs separate treatment.'
    },
    {
      id: 'adn8_9',
      title: 'My anxiety yielded to family of origin work',
      narrative: [
        'Anxiety roots in family of origin.',
        '',
        'Therapy on early patterns.',
        '',
        'Took years.',
        '',
        'But layers peeled.',
        '',
        'Adult anxiety related to childhood survival.',
        '',
        'I tell deep workers: family of origin work eases adult anxiety.'
      ],
      lesson: 'Family of origin therapy reduces adult anxiety connected to childhood patterns.'
    },
    {
      id: 'adn8_10',
      title: 'My anxiety in subway',
      narrative: [
        'Subway phobia.',
        '',
        'Career limited.',
        '',
        'Exposure therapy.',
        '',
        'Empty subway off-peak first.',
        '',
        'Then rush hour with therapist.',
        '',
        'Then alone.',
        '',
        'Anxiety reduced over months.',
        '',
        'I tell transit-phobic: graduated exposure works.'
      ],
      lesson: 'Subway phobia limits careers; graduated exposure restores access.'
    },
    {
      id: 'adn8_11',
      title: 'My anxiety after ambulance ride',
      narrative: [
        'Medical emergency required ambulance.',
        '',
        'Anxiety formed around ambulances.',
        '',
        'Even sirens triggered.',
        '',
        'Trauma therapy specifically for emergency response.',
        '',
        'Eased over months.',
        '',
        'I tell post-emergency: medical event PTSD is real.'
      ],
      lesson: 'Medical emergency PTSD with ambulance association needs specific trauma therapy.'
    },
    {
      id: 'adn8_12',
      title: 'My anxiety yielded to mens group',
      narrative: [
        'Men do not share anxiety often.',
        '',
        'Found mens emotional support group.',
        '',
        'Vulnerability practiced.',
        '',
        'Anxiety eased through shared experience.',
        '',
        'I tell isolated men: mens emotional support groups exist.'
      ],
      lesson: 'Mens emotional support groups offer anxiety relief through shared vulnerability.'
    },
    {
      id: 'adn8_13',
      title: 'My anxiety triggered by certain foods',
      narrative: [
        'Caffeine, sugar, alcohol all triggered.',
        '',
        'Tracked diet vs anxiety.',
        '',
        'Pattern clear.',
        '',
        'Adjusted diet.',
        '',
        'Anxiety dropped.',
        '',
        'I tell anxiety sufferers: food triggers real.'
      ],
      lesson: 'Diet tracking reveals food triggers for anxiety; adjustment reduces symptoms.'
    },
    {
      id: 'adn8_14',
      title: 'My anxiety after car wreck of friend',
      narrative: [
        'Friend died in car accident.',
        '',
        'Vicarious anxiety took hold.',
        '',
        'Could not drive.',
        '',
        'Driving therapy plus grief therapy.',
        '',
        'Both together.',
        '',
        'Healed over year.',
        '',
        'I tell grief-driving-anxious: combined therapy works.'
      ],
      lesson: 'Combined grief and driving therapy heals vicarious accident anxiety.'
    },
    {
      id: 'adn8_15',
      title: 'My anxiety after winning lottery',
      narrative: [
        'Won lottery at 45.',
        '',
        'Anxiety surged.',
        '',
        'Family demands.',
        '',
        'Trust no one.',
        '',
        'Financial trauma specialist.',
        '',
        'Therapist for sudden wealth syndrome.',
        '',
        'Anxiety managed over years.',
        '',
        'I tell lottery winners: sudden wealth anxiety is real specialty.'
      ],
      lesson: 'Sudden wealth syndrome creates real anxiety needing specialized therapy.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_9 = [
    {
      id: 'adn9_1',
      title: 'My anxiety yielded to community',
      narrative: [
        'Isolation drove anxiety.',
        '',
        'Joined three communities.',
        '',
        'Weekly engagement.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Community is medicine.',
        '',
        'I tell isolated anxious: multiple weekly communities essential.'
      ],
      lesson: 'Multiple weekly community engagements reduce anxiety meaningfully.'
    },
    {
      id: 'adn9_2',
      title: 'My anxiety as trans person',
      narrative: [
        'Anxiety from minority stress.',
        '',
        'Plus dysphoria.',
        '',
        'Trans-affirming therapist.',
        '',
        'Identity work plus anxiety treatment.',
        '',
        'Anxiety reduced as I lived more authentically.',
        '',
        'I tell trans anxiety sufferers: affirming care reduces anxiety.'
      ],
      lesson: 'Trans-affirming care plus identity-authentic living reduces minority-stress anxiety.'
    },
    {
      id: 'adn9_3',
      title: 'My anxiety yielded to laughter yoga',
      narrative: [
        'Laughter yoga sounded ridiculous.',
        '',
        'Tried weekly class.',
        '',
        'Forced laughter became real.',
        '',
        'Group dynamic worked.',
        '',
        'Anxiety lighter after class.',
        '',
        'Lasted through week.',
        '',
        'I tell skeptics: laughter yoga has research base.'
      ],
      lesson: 'Laughter yoga has research base as group-based anxiety intervention.'
    },
    {
      id: 'adn9_4',
      title: 'My anxiety triggered by adult bullying at work',
      narrative: [
        'Coworker bullying triggered anxiety.',
        '',
        'HR slow to act.',
        '',
        'Therapy plus workplace advocate.',
        '',
        'Eventually transferred department.',
        '',
        'Anxiety dropped.',
        '',
        'I tell workplace-bullied: anxiety treatment plus systemic action.'
      ],
      lesson: 'Workplace bullying anxiety requires both individual treatment and systemic action.'
    },
    {
      id: 'adn9_5',
      title: 'My anxiety yielded to floating',
      narrative: [
        'Float tank weekly.',
        '',
        'Sensory deprivation.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety dropped substantially.',
        '',
        'Expensive but worth it.',
        '',
        'I tell tried-everything: floating offers unique reset.'
      ],
      lesson: 'Sensory deprivation floating provides unique nervous system reset for anxiety.'
    },
    {
      id: 'adn9_6',
      title: 'My anxiety after natural disaster',
      narrative: [
        'Hurricane destroyed house.',
        '',
        'Anxiety severe for years.',
        '',
        'Disaster mental health.',
        '',
        'Rebuilding community.',
        '',
        'Slow healing.',
        '',
        'I tell disaster survivors: long-term anxiety is normal.'
      ],
      lesson: 'Post-disaster anxiety is long-term and needs sustained mental health support.'
    },
    {
      id: 'adn9_7',
      title: 'My anxiety eased by gardening community',
      narrative: [
        'Community garden membership.',
        '',
        'Weekly hours in plot.',
        '',
        'Neighbors became friends.',
        '',
        'Anxiety dropped through earth and connection.',
        '',
        'I tell isolated anxious: community gardens offer both.'
      ],
      lesson: 'Community gardens combine earth contact and social bonds for anxiety relief.'
    },
    {
      id: 'adn9_8',
      title: 'My anxiety with custody battle',
      narrative: [
        'Custody battle triggered anxiety.',
        '',
        'Court dates, accusations, lawyers.',
        '',
        'Family law therapist specialty.',
        '',
        'Plus mediation when possible.',
        '',
        'Survived process.',
        '',
        'I tell custody-battling: family law therapy specialty exists.'
      ],
      lesson: 'Custody battle anxiety has family-law-therapy specialty support.'
    },
    {
      id: 'adn9_9',
      title: 'My anxiety yielded to running club',
      narrative: [
        'Running alone helped some.',
        '',
        'Running club helped more.',
        '',
        'Accountability plus social.',
        '',
        'Trained for marathon together.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell solo runners: club enhances anxiety benefits.'
      ],
      lesson: 'Running clubs add accountability and social to solo running anxiety benefits.'
    },
    {
      id: 'adn9_10',
      title: 'My anxiety as caregiver',
      narrative: [
        'Caring for mother with dementia.',
        '',
        'Anxiety severe.',
        '',
        'Respite care arranged.',
        '',
        'Caregiver therapy specialty.',
        '',
        'Tools for caregiver overwhelm.',
        '',
        'Anxiety managed.',
        '',
        'I tell caregivers: respite plus therapy essential.'
      ],
      lesson: 'Dementia caregiver anxiety requires respite care plus caregiver-specialty therapy.'
    },
    {
      id: 'adn9_11',
      title: 'My anxiety with phobic spiders',
      narrative: [
        'Arachnophobia severe.',
        '',
        'Could not enter basement.',
        '',
        'Exposure therapy.',
        '',
        'Plastic spider first.',
        '',
        'Photo of spider.',
        '',
        'Video of spider.',
        '',
        'Dead spider.',
        '',
        'Live spider distant.',
        '',
        'Live spider close.',
        '',
        'Months of work.',
        '',
        'Basement accessible.',
        '',
        'I tell phobic: graduated exposure works.'
      ],
      lesson: 'Specific phobias like arachnophobia respond to months of graduated exposure.'
    },
    {
      id: 'adn9_12',
      title: 'My anxiety yielded to learning new language',
      narrative: [
        'Started Spanish at 50.',
        '',
        'Brain absorbed in learning.',
        '',
        'Anxiety paused during study.',
        '',
        'Skill building counters helplessness.',
        '',
        'I tell stuck sufferers: new learning shifts anxiety.'
      ],
      lesson: 'Learning a new language counters anxiety through absorption and skill building.'
    },
    {
      id: 'adn9_13',
      title: 'My anxiety triggered by news',
      narrative: [
        'News cycle hijacked anxiety.',
        '',
        'Limited to weekly summary.',
        '',
        'Print not video.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell news-anxious: weekly print summaries beat daily video.'
      ],
      lesson: 'Weekly print news summaries reduce anxiety more than daily video consumption.'
    },
    {
      id: 'adn9_14',
      title: 'My anxiety after assault recovery',
      narrative: [
        'Assault years ago.',
        '',
        'Anxiety persistent.',
        '',
        'Trauma therapy.',
        '',
        'EMDR plus cognitive processing.',
        '',
        'Both modalities together.',
        '',
        'Healed over two years.',
        '',
        'I tell survivors: trauma modalities combine well.'
      ],
      lesson: 'Combining EMDR and cognitive processing therapy heals assault anxiety effectively.'
    },
    {
      id: 'adn9_15',
      title: 'My anxiety yielded to puppy',
      narrative: [
        'Adopted puppy.',
        '',
        'Daily routine forced.',
        '',
        'Walks twice daily.',
        '',
        'Love and presence.',
        '',
        'Anxiety dropped substantially.',
        '',
        'I tell isolated anxious: dog adoption changes everything.'
      ],
      lesson: 'Dog adoption provides daily routine, presence, and meaning that reduces anxiety.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_10 = [
    {
      id: 'adn10_1',
      title: 'My anxiety with crowds I addressed',
      narrative: [
        'Crowds triggered me.',
        '',
        'Concerts, sports, festivals all off limits.',
        '',
        'Exposure therapy with anchor person.',
        '',
        'Quieter events first.',
        '',
        'Standing near exit.',
        '',
        'Then mid-crowd.',
        '',
        'Anxiety reduced over months.',
        '',
        'I tell crowd-anxious: anchor person plus exit awareness.'
      ],
      lesson: 'Crowd anxiety responds to graduated exposure with trusted anchor person and exit awareness.'
    },
    {
      id: 'adn10_2',
      title: 'My anxiety triggered by clutter',
      narrative: [
        'Cluttered home worsened anxiety.',
        '',
        'Could not declutter alone.',
        '',
        'Professional organizer plus therapist team.',
        '',
        'Decluttering with emotional support.',
        '',
        'Home became calm space.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell cluttered anxious: organizer plus therapist team.'
      ],
      lesson: 'Cluttered homes can worsen anxiety; team approach with organizer and therapist heals both.'
    },
    {
      id: 'adn10_3',
      title: 'My anxiety yielded to morning prayer',
      narrative: [
        'Morning prayer routine for years.',
        '',
        'Spiritual practice plus calming function.',
        '',
        'Anxiety dropped within weeks.',
        '',
        'Continued for life.',
        '',
        'I tell faithful: prayer is both spiritual and treatment.'
      ],
      lesson: 'Morning prayer serves both spiritual and treatment functions for anxiety.'
    },
    {
      id: 'adn10_4',
      title: 'My anxiety in airports I treated',
      narrative: [
        'Airports overwhelming.',
        '',
        'Sounds, crowds, time pressure.',
        '',
        'Pre-flight strategy: arrive early, quiet space, headphones.',
        '',
        'Identified sensory triggers.',
        '',
        'Adjusted approach.',
        '',
        'Travel possible.',
        '',
        'I tell airport-anxious: sensory strategy essential.'
      ],
      lesson: 'Airport anxiety eases with sensory-aware pre-flight strategy.'
    },
    {
      id: 'adn10_5',
      title: 'My anxiety yielded to writing letters',
      narrative: [
        'Letters to people who hurt me, never sent.',
        '',
        'Letters to dead loved ones.',
        '',
        'Letters to future self.',
        '',
        'Unsent letters processed anxiety.',
        '',
        'Therapy tool became lifelong practice.',
        '',
        'I tell stuck anxious: unsent letters externalize.'
      ],
      lesson: 'Unsent letters as therapy tool externalize anxiety and process unfinished business.'
    },
    {
      id: 'adn10_6',
      title: 'My anxiety triggered by infertility',
      narrative: [
        'Infertility journey years long.',
        '',
        'Anxiety severe.',
        '',
        'Reproductive psychologist.',
        '',
        'Couples therapy.',
        '',
        'Decision points clarified.',
        '',
        'Anxiety managed throughout process.',
        '',
        'I tell trying couples: reproductive psychology specialty exists.'
      ],
      lesson: 'Infertility anxiety has reproductive psychology specialty support during long journeys.'
    },
    {
      id: 'adn10_7',
      title: 'My anxiety yielded to chiropractor',
      narrative: [
        'Tension held in spine.',
        '',
        'Chiropractor weekly.',
        '',
        'Body released.',
        '',
        'Anxiety dropped.',
        '',
        'Bodywork as adjunct.',
        '',
        'I tell body-tense anxious: bodywork helps.'
      ],
      lesson: 'Bodywork like chiropractic care eases somatic tension contributing to anxiety.'
    },
    {
      id: 'adn10_8',
      title: 'My anxiety with food in public',
      narrative: [
        'Eating in public triggered anxiety.',
        '',
        'Restaurants impossible.',
        '',
        'Eating disorder specialist.',
        '',
        'Treatment specific to eating anxiety.',
        '',
        'Slowly built tolerance.',
        '',
        'Now I dine out.',
        '',
        'I tell public-eating-anxious: specialty exists.'
      ],
      lesson: 'Public eating anxiety has eating-disorder specialty treatment.'
    },
    {
      id: 'adn10_9',
      title: 'My anxiety yielded to nature',
      narrative: [
        'Forest bathing weekly.',
        '',
        'Hours in trees.',
        '',
        'No phone, no goal.',
        '',
        'Nervous system reset.',
        '',
        'Anxiety dropped substantially.',
        '',
        'Research-backed.',
        '',
        'I tell anxious: forest bathing measurable benefit.'
      ],
      lesson: 'Forest bathing has research backing as measurable anxiety intervention.'
    },
    {
      id: 'adn10_10',
      title: 'My anxiety after kids left for college',
      narrative: [
        'Empty nest crashed me.',
        '',
        'Anxiety severe.',
        '',
        'Empty nest support group online.',
        '',
        'Therapy for identity transition.',
        '',
        'New hobbies, new community.',
        '',
        'Anxiety eased over year.',
        '',
        'I tell empty nesters: identity transition therapy essential.'
      ],
      lesson: 'Empty nest anxiety responds to identity transition therapy and rebuilding community.'
    },
    {
      id: 'adn10_11',
      title: 'My anxiety triggered by job interview',
      narrative: [
        'Interview anxiety severe.',
        '',
        'Interview coach.',
        '',
        'Practice with video review.',
        '',
        'Skill plus exposure.',
        '',
        'Anxiety reduced.',
        '',
        'Got job.',
        '',
        'I tell interview-anxious: coaching builds confidence.'
      ],
      lesson: 'Interview anxiety responds to interview coaching with video practice.'
    },
    {
      id: 'adn10_12',
      title: 'My anxiety yielded to meditation app',
      narrative: [
        'Daily 10 min on meditation app.',
        '',
        'Six months consistent.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'Brain measurably changed.',
        '',
        'I tell tech-comfortable: meditation apps work with consistency.'
      ],
      lesson: 'Consistent meditation app use over months measurably reduces anxiety.'
    },
    {
      id: 'adn10_13',
      title: 'My anxiety as ADHD masking',
      narrative: [
        'Spent decades hiding ADHD.',
        '',
        'Anxiety from masking.',
        '',
        'Diagnosed at 40.',
        '',
        'Treatment plus unmasking.',
        '',
        'Anxiety reduced as I lived authentically.',
        '',
        'I tell late-diagnosed: masking causes anxiety; unmasking eases it.'
      ],
      lesson: 'ADHD masking causes anxiety; treatment plus unmasking reduces both.'
    },
    {
      id: 'adn10_14',
      title: 'My anxiety triggered by therapy',
      narrative: [
        'Therapy itself triggered me.',
        '',
        'Old trauma material.',
        '',
        'Tried different modalities.',
        '',
        'EMDR helped where talk did not.',
        '',
        'Tailored treatment.',
        '',
        'I tell stuck in therapy: modality matters.'
      ],
      lesson: 'Therapy modality matters; switch when stuck or triggered without progress.'
    },
    {
      id: 'adn10_15',
      title: 'My anxiety yielded to crochet',
      narrative: [
        'Took up crochet at 45.',
        '',
        'Repetitive hand motion soothed.',
        '',
        'Could do while watching TV.',
        '',
        'Anxiety paused during craft.',
        '',
        'Years of crochet.',
        '',
        'I tell hands-busy anxious: crochet provides somatic regulation.'
      ],
      lesson: 'Crochet provides somatic anxiety regulation through repetitive hand motion.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_3 = [
    {
      id: 'adn3_1',
      title: 'My GAD diagnosis at 28 named the lifetime pattern',
      narrative: [
        'Worried since childhood.',
        '',
        'Never knew it had a name.',
        '',
        'Therapist said: generalized anxiety disorder.',
        '',
        'Lifetime pattern of free-floating worry.',
        '',
        'Diagnosis itself was relief.',
        '',
        'Not a character flaw.',
        '',
        'A condition to treat.',
        '',
        'Combined SSRI and CBT.',
        '',
        'Worry dropped from constant to occasional.',
        '',
        'I tell lifelong worriers: get evaluated. GAD is treatable.'
      ],
      lesson: 'GAD diagnosis names lifelong worry patterns as treatable condition, not flaw.'
    },
    {
      id: 'adn3_2',
      title: 'My panic attack in airplane bathroom',
      narrative: [
        'Locked door triggered claustrophobia.',
        '',
        'Could not breathe.',
        '',
        'Banged on door for help.',
        '',
        'Flight attendant opened from outside.',
        '',
        'Embarrassed but alive.',
        '',
        'Started fear-of-flying program.',
        '',
        'Bathroom strategy: door slightly open, use end-of-flight only.',
        '',
        'Workarounds plus treatment.',
        '',
        'Now I fly internationally.',
        '',
        'I tell claustrophobic flyers: workarounds plus treatment together.'
      ],
      lesson: 'Claustrophobic flight panic responds to workarounds plus treatment.'
    },
    {
      id: 'adn3_3',
      title: 'My evening anxiety pattern I tracked',
      narrative: [
        'Always worse 7-9pm.',
        '',
        'Did not know why.',
        '',
        'Started anxiety diary.',
        '',
        'Pattern emerged: tired, less structured, news scrolling.',
        '',
        'Changed routine.',
        '',
        'No news after 6pm.',
        '',
        'Walking instead.',
        '',
        'Cooking with podcast.',
        '',
        'Evening anxiety improved 80 percent.',
        '',
        'I tell pattern-seekers: anxiety diary reveals triggers.'
      ],
      lesson: 'Anxiety diaries reveal time-of-day triggers that responds to routine changes.'
    },
    {
      id: 'adn3_4',
      title: 'My anxiety lifted with breakup that needed to happen',
      narrative: [
        'Constant anxiety with partner.',
        '',
        'Therapist gently asked: what does your body know?',
        '',
        'My body knew before my mind.',
        '',
        'Relationship was wrong.',
        '',
        'Broke up.',
        '',
        'Anxiety dropped within weeks.',
        '',
        'Sometimes anxiety is signal not symptom.',
        '',
        'I tell relationship-anxious: ask what your body is telling you.'
      ],
      lesson: 'Anxiety in wrong relationship is signal not pathology; body knows first.'
    },
    {
      id: 'adn3_5',
      title: 'My anxiety yielding to gardening',
      narrative: [
        'Therapist suggested gardening.',
        '',
        'Sounded silly.',
        '',
        'Tried it anyway.',
        '',
        'Hours of soil work calmed me.',
        '',
        'Body engaged, mind quiet.',
        '',
        'Now I garden daily.',
        '',
        'Sometimes the simplest treatment works.',
        '',
        'I tell anxiety sufferers: physical hands-in-soil work is medicine.'
      ],
      lesson: 'Gardening is somatic anxiety treatment through body engagement and earth contact.'
    },
    {
      id: 'adn3_6',
      title: 'My anxiety made me overprepare for everything',
      narrative: [
        'Overprepared for meetings.',
        '',
        'Overprepared for trips.',
        '',
        'Overprepared for casual dinners.',
        '',
        'Spent hours managing what-ifs.',
        '',
        'Exhausting.',
        '',
        'Therapist taught: good-enough preparation.',
        '',
        'Sit with imperfection.',
        '',
        'Time freed up.',
        '',
        'Quality of life improved.',
        '',
        'I tell over-preparers: imperfect preparation is enough.'
      ],
      lesson: 'Over-preparation as anxiety symptom yields to tolerating imperfect readiness.'
    },
    {
      id: 'adn3_7',
      title: 'My anxiety in dental chair I addressed',
      narrative: [
        'Avoided dentist for 10 years.',
        '',
        'Teeth deteriorated.',
        '',
        'Pain forced visit.',
        '',
        'Sedation dentistry available.',
        '',
        'Started slowly, built trust.',
        '',
        'Eventually no sedation needed.',
        '',
        'Dental care back on track.',
        '',
        'I tell dental-anxious: sedation dentistry exists for exposure ramp.'
      ],
      lesson: 'Dental anxiety yields to sedation dentistry as gradual exposure ramp.'
    },
    {
      id: 'adn3_8',
      title: 'My anxiety from undiagnosed thyroid',
      narrative: [
        'Years of treatment-resistant anxiety.',
        '',
        'Therapist suggested medical workup.',
        '',
        'Thyroid panel revealed hyperthyroidism.',
        '',
        'Treated thyroid.',
        '',
        'Anxiety lifted dramatically.',
        '',
        'I tell treatment-resistant: rule out medical causes thoroughly.'
      ],
      lesson: 'Treatment-resistant anxiety can have medical causes; thorough workup essential.'
    },
    {
      id: 'adn3_9',
      title: 'My anxiety relapse after 5 years stable',
      narrative: [
        'Five years stable.',
        '',
        'Stopped treatment.',
        '',
        'Six months later: anxiety returned harder.',
        '',
        'Felt like starting over.',
        '',
        'Therapist reframed: not starting over, refreshing tools.',
        '',
        'Back on treatment.',
        '',
        'Recovery faster this time.',
        '',
        'I tell relapsers: relapse is part of journey not failure.'
      ],
      lesson: 'Anxiety relapse is common journey feature, not personal failure.'
    },
    {
      id: 'adn3_10',
      title: 'My anxiety yielded to faith community',
      narrative: [
        'Therapy helped some.',
        '',
        'Medication helped some.',
        '',
        'But faith community filled the gap.',
        '',
        'Weekly community.',
        '',
        'Prayer practice.',
        '',
        'Spiritual mentor.',
        '',
        'Anxiety lifted further.',
        '',
        'I tell faith-curious: spiritual practice can be treatment-grade.'
      ],
      lesson: 'Faith community and practice can serve as treatment-grade anxiety support.'
    },
    {
      id: 'adn3_11',
      title: 'My anxiety in elevators I conquered',
      narrative: [
        'Elevator phobia.',
        '',
        'Took stairs always.',
        '',
        'Could not work in high-rise.',
        '',
        'Limited careers.',
        '',
        'Exposure therapy.',
        '',
        'First: stand near elevator.',
        '',
        'Then ride one floor with therapist.',
        '',
        'Then multiple floors.',
        '',
        'Then alone.',
        '',
        'Career options expanded.',
        '',
        'I tell elevator-phobic: phobia is treatable.'
      ],
      lesson: 'Elevator phobia limits careers; specific treatment opens possibilities.'
    },
    {
      id: 'adn3_12',
      title: 'My anxiety about my anxiety in pregnancy',
      narrative: [
        'Pregnant with anxiety history.',
        '',
        'Worried medication would harm baby.',
        '',
        'Worried untreated anxiety would harm baby.',
        '',
        'Reproductive psychiatrist consulted.',
        '',
        'Balanced risks.',
        '',
        'Specific medication safer in pregnancy.',
        '',
        'Continued treatment with monitoring.',
        '',
        'Healthy baby born.',
        '',
        'I tell pregnant anxious: reproductive psychiatry specialty exists.'
      ],
      lesson: 'Pregnancy anxiety management requires reproductive psychiatrist specialty consultation.'
    },
    {
      id: 'adn3_13',
      title: 'My anxiety about my children',
      narrative: [
        'Worried constantly about kids safety.',
        '',
        'Drove them everywhere.',
        '',
        'Did not let them sleep over at friends.',
        '',
        'Therapist asked: who else has this fear at this level?',
        '',
        'Realized I was overreacting from my own anxiety.',
        '',
        'Worked on tolerating their normal autonomy.',
        '',
        'Slowly let kids do age-appropriate things.',
        '',
        'They flourished.',
        '',
        'My anxiety stabilized.',
        '',
        'I tell anxious parents: your fears can limit your kids growth.'
      ],
      lesson: 'Parental anxiety can limit children growth; address parental fear directly.'
    },
    {
      id: 'adn3_14',
      title: 'My anxiety about death I came to terms with',
      narrative: [
        'Death anxiety paralyzed me.',
        '',
        'Could not stop thinking about it.',
        '',
        'Existential therapist helped.',
        '',
        'Acceptance therapy plus values clarification.',
        '',
        'Came to peace with mortality.',
        '',
        'Lived more fully.',
        '',
        'I tell death-anxious: existential therapy is real and helpful.'
      ],
      lesson: 'Death anxiety responds to existential therapy and values clarification.'
    },
    {
      id: 'adn3_15',
      title: 'My anxiety improved when I asked for help',
      narrative: [
        'Hid anxiety for years.',
        '',
        'Performed perfection.',
        '',
        'Crashed at 38.',
        '',
        'Asked partner for help.',
        '',
        'Asked work for accommodations.',
        '',
        'Asked friends for support.',
        '',
        'Help came.',
        '',
        'World did not collapse from my needs.',
        '',
        'Quality of life transformed.',
        '',
        'I tell hidden sufferers: asking is harder than helping but it works.'
      ],
      lesson: 'Asking for help with anxiety is harder than receiving help; both transform quality of life.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_4 = [
    {
      id: 'adn4_1',
      title: 'My PTSD masquerading as anxiety',
      narrative: [
        'Diagnosed with anxiety for years.',
        '',
        'Treatment partial.',
        '',
        'New therapist screened for trauma.',
        '',
        'PTSD from childhood revealed.',
        '',
        'Trauma-specific treatment.',
        '',
        'EMDR over months.',
        '',
        'Anxiety dropped substantially.',
        '',
        'PTSD treatment was the missing piece.',
        '',
        'I tell anxiety treatment-resistant: rule out PTSD with trauma specialist.'
      ],
      lesson: 'Treatment-resistant anxiety may be unrecognized PTSD; trauma specialist needed.'
    },
    {
      id: 'adn4_2',
      title: 'My anxiety in social settings I named',
      narrative: [
        'Avoided parties.',
        '',
        'Said I was introvert.',
        '',
        'Therapist asked: do you want to go?',
        '',
        'Yes, but anxiety stops me.',
        '',
        'Not introversion: social anxiety.',
        '',
        'Specific treatment.',
        '',
        'CBT plus exposure.',
        '',
        'Now I attend most events.',
        '',
        'Still need recovery time but enjoy it.',
        '',
        'I tell self-described introverts: check if it is anxiety not preference.'
      ],
      lesson: 'Social anxiety often confused with introversion; the desire to attend distinguishes them.'
    },
    {
      id: 'adn4_3',
      title: 'My anxiety after sexual assault',
      narrative: [
        'Assaulted at 22.',
        '',
        'Anxiety took over my body.',
        '',
        'Could not be near men.',
        '',
        'Could not sleep alone.',
        '',
        'Could not work.',
        '',
        'Trauma therapist specialized.',
        '',
        'Years of patient work.',
        '',
        'Recovery slow but real.',
        '',
        'Now I have life again.',
        '',
        'I tell survivors: trauma-specific therapy makes recovery possible.'
      ],
      lesson: 'Post-assault anxiety needs specialized trauma therapy; recovery is possible.'
    },
    {
      id: 'adn4_4',
      title: 'My anxiety from sleep deprivation',
      narrative: [
        'Newborn baby.',
        '',
        'Sleep destroyed.',
        '',
        'Anxiety worsened.',
        '',
        'Each fed the other.',
        '',
        'Postpartum specialist helped.',
        '',
        'Sleep strategy plus anxiety treatment.',
        '',
        'Both addressed together.',
        '',
        'Recovery slow.',
        '',
        'Sleep returned, anxiety eased.',
        '',
        'I tell new parents: sleep and anxiety must be treated together.'
      ],
      lesson: 'Sleep deprivation and postpartum anxiety must be treated together.'
    },
    {
      id: 'adn4_5',
      title: 'My anxiety yielded to dance class',
      narrative: [
        'Dance class started as exercise.',
        '',
        'Became therapy.',
        '',
        'Body in motion calmed mind.',
        '',
        'Group provided community.',
        '',
        'Instructor compassionate.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell stuck sufferers: try movement classes for embodied healing.'
      ],
      lesson: 'Dance class can provide embodied anxiety healing through movement and community.'
    },
    {
      id: 'adn4_6',
      title: 'My anxiety about my anxiety in relationship',
      narrative: [
        'Worried partner would leave because of my anxiety.',
        '',
        'Anxiety about being too anxious.',
        '',
        'Discussed openly.',
        '',
        'Partner reassured.',
        '',
        'But the loop continued internally.',
        '',
        'Couples therapy plus individual.',
        '',
        'Learned: my anxiety is not the threat I imagine.',
        '',
        'Relationship stronger.',
        '',
        'I tell relationship-anxious: open communication breaks shame loops.'
      ],
      lesson: 'Relationship anxiety about being too anxious yields to open communication and couples therapy.'
    },
    {
      id: 'adn4_7',
      title: 'My anxiety triggered by perfumes',
      narrative: [
        'Certain perfumes triggered panic.',
        '',
        'Did not understand why.',
        '',
        'Realized: smelled like abusive grandmother.',
        '',
        'Trauma memory in scent.',
        '',
        'Therapist used EMDR.',
        '',
        'Scent trigger reduced.',
        '',
        'I tell unexplained-triggered: scent can carry trauma; EMDR helps.'
      ],
      lesson: 'Scent-triggered anxiety is real trauma response; EMDR can treat it.'
    },
    {
      id: 'adn4_8',
      title: 'My anxiety from financial scarcity',
      narrative: [
        'Grew up poor.',
        '',
        'Anxiety about money never resolved.',
        '',
        'Therapist named: scarcity trauma.',
        '',
        'Different from current financial reality.',
        '',
        'Worked on tolerating having enough.',
        '',
        'Took years.',
        '',
        'Finally enjoying my financial stability.',
        '',
        'I tell first-gen middle class: scarcity trauma is real.'
      ],
      lesson: 'Childhood poverty creates scarcity trauma that persists past financial stability.'
    },
    {
      id: 'adn4_9',
      title: 'My anxiety yielded to art therapy',
      narrative: [
        'Talk therapy partial.',
        '',
        'Could not access full feelings.',
        '',
        'Tried art therapy.',
        '',
        'Body knew what mind could not say.',
        '',
        'Drawings revealed.',
        '',
        'Healing accelerated.',
        '',
        'I tell stuck verbalizers: art therapy bypasses words.'
      ],
      lesson: 'Art therapy bypasses verbal limits and accesses anxiety through body and image.'
    },
    {
      id: 'adn4_10',
      title: 'My anxiety in airport security',
      narrative: [
        'Always anxious in security.',
        '',
        'Felt watched, judged.',
        '',
        'Beeped randomly.',
        '',
        'Got patted down.',
        '',
        'Triggers stayed for hours.',
        '',
        'TSA Precheck reduced exposure.',
        '',
        'Plus pre-flight calming routine.',
        '',
        'Travel feasible.',
        '',
        'I tell travel-anxious: TSA Pre cuts exposure significantly.'
      ],
      lesson: 'TSA Precheck plus calming routine eases airport security anxiety.'
    },
    {
      id: 'adn4_11',
      title: 'My anxiety in IEP meetings for my child',
      narrative: [
        'Special needs son.',
        '',
        'IEP meetings triggered me.',
        '',
        'Too many adults, too many decisions, too much advocacy.',
        '',
        'Pre-meeting therapy.',
        '',
        'Brought advocate to meetings.',
        '',
        'Plus calming techniques during.',
        '',
        'Got better outcomes for son.',
        '',
        'I tell anxious special needs parents: pre-meeting therapy plus advocate.'
      ],
      lesson: 'IEP meeting anxiety eased by pre-meeting therapy and bringing advocate.'
    },
    {
      id: 'adn4_12',
      title: 'My anxiety yielded to volunteering',
      narrative: [
        'Self-focus increased anxiety.',
        '',
        'Therapist suggested service.',
        '',
        'Started volunteering at shelter.',
        '',
        'Focus shifted outward.',
        '',
        'Anxiety dropped meaningfully.',
        '',
        'I tell self-focused anxious: service shifts attention.'
      ],
      lesson: 'Volunteer service shifts anxious self-focus outward and reduces symptoms.'
    },
    {
      id: 'adn4_13',
      title: 'My anxiety about not being anxious',
      narrative: [
        'Recovery felt unsafe.',
        '',
        'Worried I would miss danger.',
        '',
        'Vigilance had been my safety.',
        '',
        'Therapist gently named this.',
        '',
        'Worked on tolerating calm.',
        '',
        'Calm became safe over months.',
        '',
        'I tell vigilance survivors: calm can feel dangerous until it does not.'
      ],
      lesson: 'Recovery from chronic anxiety includes tolerating the unfamiliar safety of calm.'
    },
    {
      id: 'adn4_14',
      title: 'My anxiety after surgery',
      narrative: [
        'Major surgery at 40.',
        '',
        'Recovery anxiety severe.',
        '',
        'Felt body had betrayed me.',
        '',
        'Health psychologist helped.',
        '',
        'Trauma reprocessing for medical events.',
        '',
        'Trust in body restored slowly.',
        '',
        'I tell post-surgical: medical trauma is real; health psychology helps.'
      ],
      lesson: 'Post-surgical anxiety responds to medical-trauma reprocessing by health psychologist.'
    },
    {
      id: 'adn4_15',
      title: 'My anxiety transformed by accepting it',
      narrative: [
        'Fought anxiety for years.',
        '',
        'Every wave felt like enemy.',
        '',
        'Therapist suggested: welcome the wave.',
        '',
        'Counterintuitive but I tried.',
        '',
        'Sat with anxiety without fighting.',
        '',
        'Wave passed faster.',
        '',
        'Fighting had prolonged it.',
        '',
        'Acceptance was the unlock.',
        '',
        'I tell fighters: acceptance is the unlock.'
      ],
      lesson: 'Anxiety acceptance shortens waves; fighting prolongs them.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_1 = [
    {
      id: 'adn1_1',
      title: 'My first panic attack at Walmart at 35',
      narrative: [
        'Was buying laundry detergent.',
        '',
        'Heart started racing.',
        '',
        'Vision tunneled.',
        '',
        'Could not breathe.',
        '',
        'Thought I was dying.',
        '',
        'Ambulance came.',
        '',
        'ER ran tests, all normal.',
        '',
        'Doctor said: panic attack.',
        '',
        'I had never heard the term.',
        '',
        'Started therapy.',
        '',
        'Learned my body was overreacting to nothing.',
        '',
        'Took two years to manage.',
        '',
        'Now I have tools.',
        '',
        'I tell new panic sufferers: it feels like dying. It is not. There is a path through.'
      ],
      lesson: 'First panic attack often mistaken for medical emergency; learning the pattern is the first treatment step.'
    },
    {
      id: 'adn1_2',
      title: 'My school refusal at age 9',
      narrative: [
        'Stomach hurt every morning before school.',
        '',
        'Mom thought I was faking.',
        '',
        'Then I started crying at the door.',
        '',
        'Then refusing to leave the car.',
        '',
        'Then refusing to get in the car.',
        '',
        'School counselor identified anxiety.',
        '',
        'CBT therapist worked with me.',
        '',
        'Small steps back to school.',
        '',
        'Took a semester.',
        '',
        'Twenty years later I am a school counselor myself.',
        '',
        'I tell parents: stomach aches before school are real signals. Not faking.'
      ],
      lesson: 'School refusal is anxiety in body; stomach pain is real physical signal.'
    },
    {
      id: 'adn1_3',
      title: 'My presentation anxiety I outgrew slowly',
      narrative: [
        'Vomited before presentations in high school.',
        '',
        'Skipped college courses with presentations.',
        '',
        'In job, could not avoid.',
        '',
        'Exposure therapy with Toastmasters.',
        '',
        'Every week, small group, present something.',
        '',
        'Year one: still terrified.',
        '',
        'Year two: hands shook but voice steady.',
        '',
        'Year three: actually enjoyed it.',
        '',
        'Now I give keynote talks.',
        '',
        'Exposure works but takes years.',
        '',
        'I tell new fearful presenters: weekly small exposure beats waiting to feel ready.'
      ],
      lesson: 'Presentation anxiety yields to consistent weekly exposure over years.'
    },
    {
      id: 'adn1_4',
      title: 'My health anxiety after googling symptoms',
      narrative: [
        'Felt a lump.',
        '',
        'Googled.',
        '',
        'Spiraled into cancer scenarios.',
        '',
        'Could not sleep for a week.',
        '',
        'Went to doctor.',
        '',
        'Lipoma. Benign.',
        '',
        'But pattern continued for years.',
        '',
        'Every symptom became disaster online.',
        '',
        'Therapist named it: cyberchondria.',
        '',
        'Rule: one doctor visit per concern, no Google.',
        '',
        'Hard rule but it works.',
        '',
        'I tell health-anxious: trust your doctor, not the algorithm.'
      ],
      lesson: 'Health anxiety amplified by symptom googling; trust the doctor not the algorithm.'
    },
    {
      id: 'adn1_5',
      title: 'My social anxiety in elementary school',
      narrative: [
        'Wanted friends.',
        '',
        'Could not make first move.',
        '',
        'Sat alone at lunch.',
        '',
        'Teacher noticed.',
        '',
        'Paired me with friendly classmate.',
        '',
        'Slowly built one friendship.',
        '',
        'That friendship gave me confidence.',
        '',
        'By middle school I had three close friends.',
        '',
        'By high school more.',
        '',
        'Social anxiety yielded to one good friend at a time.',
        '',
        'I tell shy kids: one friend opens the door to more.'
      ],
      lesson: 'Childhood social anxiety eases through one carefully-paired friendship at a time.'
    },
    {
      id: 'adn1_6',
      title: 'My test anxiety nearly cost me college',
      narrative: [
        'Knew the material.',
        '',
        'But during tests, mind blanked.',
        '',
        'Failed two finals freshman year.',
        '',
        'Dean called me in.',
        '',
        'Suggested counseling.',
        '',
        'CBT plus test accommodations.',
        '',
        'Extended time, quiet room.',
        '',
        'Grades improved.',
        '',
        'Graduated with honors.',
        '',
        'I tell anxious students: accommodations are not cheating. They are access.'
      ],
      lesson: 'Test anxiety responds to CBT plus formal accommodations.'
    },
    {
      id: 'adn1_7',
      title: 'My driving anxiety after accident',
      narrative: [
        'T-boned at intersection.',
        '',
        'Not my fault.',
        '',
        'Two months in cast.',
        '',
        'Could not drive after.',
        '',
        'Every intersection felt deadly.',
        '',
        'Therapist did graduated exposure.',
        '',
        'Empty parking lot first.',
        '',
        'Quiet street next.',
        '',
        'Then daytime errands.',
        '',
        'Then highway.',
        '',
        'Took a year.',
        '',
        'Driving fully again.',
        '',
        'I tell accident survivors: driving anxiety after trauma is normal and treatable.'
      ],
      lesson: 'Post-accident driving anxiety responds to graduated exposure over months.'
    },
    {
      id: 'adn1_8',
      title: 'My anxiety pretending to be physical',
      narrative: [
        'Years of chest pain.',
        '',
        'Cardiologist, GI doc, neurologist.',
        '',
        'All clear.',
        '',
        'Finally psychiatrist.',
        '',
        'Anxiety somatized as chest pain.',
        '',
        'Treatment helped.',
        '',
        'Pain decreased significantly.',
        '',
        'But I had spent five years and thousands on physical workup.',
        '',
        'I tell unexplained pain sufferers: ask about anxiety after physical clearance.'
      ],
      lesson: 'Unexplained physical pain may be somatized anxiety; psychiatric consult after physical clearance.'
    },
    {
      id: 'adn1_9',
      title: 'My anxiety about my anxiety',
      narrative: [
        'Worried I would have panic attack in public.',
        '',
        'That worry caused panic attacks.',
        '',
        'Feedback loop.',
        '',
        'Therapist taught: anxiety about anxiety is common.',
        '',
        'Accept the wave instead of fighting it.',
        '',
        'Acceptance reduced waves.',
        '',
        'Counterintuitive but true.',
        '',
        'I tell loop sufferers: fighting the wave makes it bigger.'
      ],
      lesson: 'Anxiety about anxiety creates feedback loops; acceptance breaks them.'
    },
    {
      id: 'adn1_10',
      title: 'My daughters separation anxiety at preschool',
      narrative: [
        'Daughter age 3 screamed at preschool dropoff.',
        '',
        'Every day for two months.',
        '',
        'Teacher said: normal. Will pass.',
        '',
        'But each morning I felt awful leaving her.',
        '',
        'We did calm goodbye ritual.',
        '',
        'Specific words.',
        '',
        'Same hug each time.',
        '',
        'Quick departure.',
        '',
        'Predictable pickup time.',
        '',
        'After 8 weeks she walked in calmly.',
        '',
        'I tell parents of separating kids: ritual plus consistency beats long goodbyes.'
      ],
      lesson: 'Preschool separation anxiety yields to consistent calm ritual goodbye plus quick departure.'
    },
    {
      id: 'adn1_11',
      title: 'My night anxiety as a child',
      narrative: [
        'Could not sleep without parent in room.',
        '',
        'Until age 10.',
        '',
        'Family doctor recommended gradual independence.',
        '',
        'Parent in doorway.',
        '',
        'Parent in hallway.',
        '',
        'Parent in own bedroom but checks every 10 min.',
        '',
        'Check intervals lengthened.',
        '',
        'Eventually I slept alone.',
        '',
        'Anxiety yielded to graduated separation.',
        '',
        'I tell parents of fearful sleepers: lengthen distance gradually.'
      ],
      lesson: 'Childhood night anxiety yields to graduated parental distance over weeks.'
    },
    {
      id: 'adn1_12',
      title: 'My OCD-like worry rituals',
      narrative: [
        'Had to tap doorways three times.',
        '',
        'Had to check stove four times before leaving.',
        '',
        'Felt I would cause disaster if I did not.',
        '',
        'Therapist diagnosed OCD anxiety.',
        '',
        'Exposure with response prevention.',
        '',
        'Hardest treatment of my life.',
        '',
        'Sit with discomfort instead of doing ritual.',
        '',
        'After months: ritual urge faded.',
        '',
        'I tell ritual-bound: ERP is brutal but works.'
      ],
      lesson: 'OCD anxiety rituals respond to exposure and response prevention therapy.'
    },
    {
      id: 'adn1_13',
      title: 'My sons performance anxiety in soccer',
      narrative: [
        'Son age 12 froze in soccer games.',
        '',
        'Skilled in practice.',
        '',
        'Paralyzed in games.',
        '',
        'Sports psychologist helped.',
        '',
        'Visualization, breathing, focus cues.',
        '',
        'Took a season.',
        '',
        'But he gradually played freely.',
        '',
        'Now plays varsity high school.',
        '',
        'I tell parents of frozen athletes: sports psychology is real and accessible.'
      ],
      lesson: 'Youth performance anxiety responds to sports psychology techniques.'
    },
    {
      id: 'adn1_14',
      title: 'My financial anxiety paralyzed my budget',
      narrative: [
        'Could not look at bank account.',
        '',
        'Could not open mail.',
        '',
        'Avoidance made everything worse.',
        '',
        'Financial therapist (real specialty).',
        '',
        'Tiny daily exposure.',
        '',
        'Five minutes looking at finances daily.',
        '',
        'No decisions, just looking.',
        '',
        'Tolerance built over weeks.',
        '',
        'Now I budget monthly.',
        '',
        'I tell financially anxious: tiny exposure builds tolerance.'
      ],
      lesson: 'Financial anxiety paralysis responds to tiny daily exposure without decisions.'
    },
    {
      id: 'adn1_15',
      title: 'My anxiety yielded to medication after years of therapy',
      narrative: [
        'Did therapy for 10 years.',
        '',
        'Improved but still struggled.',
        '',
        'Resisted medication.',
        '',
        'Felt like failure.',
        '',
        'Tried SSRI at age 35.',
        '',
        'Within 6 weeks: lifted.',
        '',
        'Therapy plus medication worked where therapy alone could not.',
        '',
        'I tell medication-resistant: medication is tool not failure.'
      ],
      lesson: 'Medication can be essential adjunct when therapy alone is insufficient.'
    }
  ];

  var ANXIETY_DEEP_NARRATIVES_2 = [
    {
      id: 'adn2_1',
      title: 'My agoraphobia recovery journey',
      narrative: [
        'House-bound for two years.',
        '',
        'Could not even check mail.',
        '',
        'Therapist did home visits first.',
        '',
        'Then walks to mailbox.',
        '',
        'Then around block.',
        '',
        'Then to coffee shop.',
        '',
        'Then to store.',
        '',
        'Five years of incremental work.',
        '',
        'Now I travel internationally.',
        '',
        'Agoraphobia is treatable.',
        '',
        'I tell house-bound: home visits exist. Recovery exists.'
      ],
      lesson: 'Agoraphobia recovery often requires home-visit therapy and years of incremental exposure.'
    },
    {
      id: 'adn2_2',
      title: 'My anxiety masked as anger',
      narrative: [
        'Snapped at family constantly.',
        '',
        'Thought I had anger problem.',
        '',
        'Anger management class helped little.',
        '',
        'Therapist redirected: this is anxiety.',
        '',
        'Anxiety treatment changed everything.',
        '',
        'Anger was symptom not cause.',
        '',
        'I tell angry partners: anxiety can mask as anger.'
      ],
      lesson: 'Anxiety can present as anger; treating root anxiety eases anger.'
    },
    {
      id: 'adn2_3',
      title: 'My pregnancy anxiety after miscarriage',
      narrative: [
        'Miscarried first pregnancy.',
        '',
        'Second pregnancy: constant fear.',
        '',
        'Every twinge meant disaster.',
        '',
        'Perinatal therapist specialized.',
        '',
        'Validated fear as reasonable response.',
        '',
        'But taught tolerance of uncertainty.',
        '',
        'Healthy baby born.',
        '',
        'Anxiety continued postpartum.',
        '',
        'Treatment continued.',
        '',
        'I tell pregnant after loss: perinatal anxiety specialists exist.'
      ],
      lesson: 'Pregnancy after miscarriage anxiety needs perinatal specialist support.'
    },
    {
      id: 'adn2_4',
      title: 'My elderly mothers late-life anxiety onset',
      narrative: [
        'Mom never anxious before.',
        '',
        'Age 80, anxiety appeared.',
        '',
        'Constant worry.',
        '',
        'Doctor screened for dementia.',
        '',
        'Not dementia, late-onset anxiety.',
        '',
        'SSRI plus weekly therapy.',
        '',
        'Within months: calmer.',
        '',
        'Elderly anxiety is treatable.',
        '',
        'I tell families with anxious elders: do not assume it is dementia or personality.'
      ],
      lesson: 'Late-life anxiety onset is treatable and distinct from dementia.'
    },
    {
      id: 'adn2_5',
      title: 'My anxiety from chronic illness diagnosis',
      narrative: [
        'Diagnosed with lupus at 30.',
        '',
        'Future uncertain.',
        '',
        'Anxiety amplified by every symptom.',
        '',
        'Joined lupus anxiety group online.',
        '',
        'Met therapist who specialized in chronic illness anxiety.',
        '',
        'Learned: live with uncertainty without resolving it.',
        '',
        'Hardest skill to learn.',
        '',
        'But essential.',
        '',
        'I tell chronically ill: anxiety about uncertainty is treatable specifically.'
      ],
      lesson: 'Chronic illness anxiety responds to specialized therapy on living with uncertainty.'
    },
    {
      id: 'adn2_6',
      title: 'My anxiety after layoff at 50',
      narrative: [
        'Worked 25 years at same company.',
        '',
        'Laid off in restructure.',
        '',
        'Anxiety paralyzed me.',
        '',
        'Could not job hunt.',
        '',
        'Could not sleep.',
        '',
        'Career counselor and therapist team.',
        '',
        'Anxiety treatment plus practical action steps.',
        '',
        'Six months: new job.',
        '',
        'Different field, similar pay.',
        '',
        'I tell mid-career laid off: anxiety treatment plus action coaching together.'
      ],
      lesson: 'Mid-career layoff anxiety responds to combined therapy and career coaching.'
    },
    {
      id: 'adn2_7',
      title: 'My daughters needle phobia we addressed',
      narrative: [
        'Daughter age 8 terrified of shots.',
        '',
        'Avoided vaccines.',
        '',
        'Behavioral psychologist did graduated exposure.',
        '',
        'Pictures of needles first.',
        '',
        'Videos of injections.',
        '',
        'Visit doctor for fake shot.',
        '',
        'Then real shot with distraction techniques.',
        '',
        'Six months: routine vaccines without panic.',
        '',
        'I tell parents of needle-phobic kids: phobias have specific treatment.'
      ],
      lesson: 'Needle phobia in children responds to graduated exposure with distraction.'
    },
    {
      id: 'adn2_8',
      title: 'My anxiety during cancer treatment',
      narrative: [
        'Cancer diagnosis.',
        '',
        'Treatment anxiety overwhelmed me.',
        '',
        'Could not face scans.',
        '',
        'Oncology social worker helped.',
        '',
        'Same-day scan-result protocols.',
        '',
        'Therapy for medical trauma.',
        '',
        'Cancer support group.',
        '',
        'Survived cancer and the anxiety.',
        '',
        'Five years remission, still managing scan anxiety.',
        '',
        'I tell cancer patients: anxiety care is part of cancer care.'
      ],
      lesson: 'Cancer treatment anxiety is treatable through oncology social work and specialized therapy.'
    },
    {
      id: 'adn2_9',
      title: 'My anxiety attack in plane mid-flight',
      narrative: [
        'Calm flyer for years.',
        '',
        'Random turbulence triggered first attack.',
        '',
        'Could not breathe.',
        '',
        'Flight attendant kind.',
        '',
        'Used paper bag, grounding.',
        '',
        'Made it through.',
        '',
        'But fear of flying took over.',
        '',
        'Avoided flights for two years.',
        '',
        'Fear of flying program at airport.',
        '',
        'Two weekends of intensive treatment.',
        '',
        'Flying again.',
        '',
        'I tell flight-fearful: intensive fear-of-flying programs work.'
      ],
      lesson: 'Fear of flying responds to intensive specialized programs offered at airports.'
    },
    {
      id: 'adn2_10',
      title: 'My anxiety about my partners health',
      narrative: [
        'Partner has chronic condition.',
        '',
        'I worried constantly.',
        '',
        'Smothered them.',
        '',
        'They asked for space.',
        '',
        'Realized: my anxiety was my burden, not theirs.',
        '',
        'Therapy for caregivers.',
        '',
        'Worked on tolerating their autonomy.',
        '',
        'Relationship improved.',
        '',
        'They felt trusted again.',
        '',
        'I tell partners of chronically ill: your anxiety is yours to manage.'
      ],
      lesson: 'Anxiety about partners health is the partners own burden to manage in therapy.'
    },
    {
      id: 'adn2_11',
      title: 'My anxiety as immigrant first year',
      narrative: [
        'New country at 25.',
        '',
        'No family nearby.',
        '',
        'Language barriers.',
        '',
        'Visa stress.',
        '',
        'Anxiety overwhelmed me.',
        '',
        'Found culturally competent therapist.',
        '',
        'Same culture, fluent language.',
        '',
        'Validated immigrant experience.',
        '',
        'Anxiety reduced over months.',
        '',
        'I tell immigrants: culturally competent therapy is essential.'
      ],
      lesson: 'Immigrant anxiety responds to culturally competent therapy in native language.'
    },
    {
      id: 'adn2_12',
      title: 'My sons school anxiety after pandemic return',
      narrative: [
        'Son age 10 returned to school after lockdown.',
        '',
        'Forgot how to be in groups.',
        '',
        'Anxiety attacks at school.',
        '',
        'School counselor created safe space.',
        '',
        'Gradual reintegration with breaks.',
        '',
        'CBT skills practiced.',
        '',
        'Six months later: thriving.',
        '',
        'Pandemic anxiety in kids is real.',
        '',
        'I tell parents: school reintegration anxiety is widespread post-pandemic.'
      ],
      lesson: 'Post-pandemic school reintegration anxiety widespread; responds to gradual reintegration.'
    },
    {
      id: 'adn2_13',
      title: 'My anxiety symptoms I confused with caffeine',
      narrative: [
        'Heart racing, sweating, jitters.',
        '',
        'Blamed coffee.',
        '',
        'Quit caffeine entirely.',
        '',
        'Symptoms continued.',
        '',
        'Realized: anxiety.',
        '',
        'Caffeine had been small contributor.',
        '',
        'Anxiety had been main cause.',
        '',
        'Treatment changed everything.',
        '',
        'I tell symptom-blamers: rule out anxiety as cause.'
      ],
      lesson: 'Physical anxiety symptoms often misattributed to caffeine; rule out anxiety.'
    },
    {
      id: 'adn2_14',
      title: 'My anxiety after car accident driving',
      narrative: [
        'Accident at 35.',
        '',
        'Walked away physically.',
        '',
        'But could not drive after.',
        '',
        'EMDR therapy for trauma.',
        '',
        'Plus graduated exposure to driving.',
        '',
        'Both together.',
        '',
        'Took a year.',
        '',
        'Drive freely now.',
        '',
        'I tell accident survivors: EMDR plus exposure for full recovery.'
      ],
      lesson: 'Post-accident driving anxiety responds to EMDR plus graduated exposure.'
    },
    {
      id: 'adn2_15',
      title: 'My anxiety yielding to running practice',
      narrative: [
        'Tried medication.',
        '',
        'Tried therapy.',
        '',
        'Both helped some.',
        '',
        'But running was the missing piece.',
        '',
        '30 min cardio four times weekly.',
        '',
        'Anxiety dropped significantly.',
        '',
        'Sleep improved.',
        '',
        'Mood stabilized.',
        '',
        'Movement is medicine.',
        '',
        'I tell anxious: running is treatment-grade. Not optional.'
      ],
      lesson: 'Aerobic exercise is treatment-grade adjunct for anxiety, not optional lifestyle.'
    }
  ];

  window.SelHub.registerTool('anxietyToolkit', {
    icon: '🫧',
    label: 'Anxiety Toolkit',
    desc: 'CBT-based tools for working with anxiety: psychoeducation (what it is, what it is not), the worry tree (productive vs unproductive worry), scheduled worry time, decatastrophizing, grounding skills, and a personal pattern inventory. From Beck Institute, AACAP, ADAA. Pairs with Window of Tolerance and Stress Bucket.',
    color: 'cyan',
    category: 'self-regulation',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _anxT = (ctx && ctx.theme) || {};
      var _anxHC = !!_anxT.isContrast, _anxL = !_anxHC && !_anxT.isDark;
      var _anx_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _anx_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#b45309':'#000000','#fff':'#000000','#ef4444':'#000000','#a855f7':'#000000','#15803d':'#000000','#7c3aed':'#000000','#0ea5e9':'#000000'};
      var _anx_FGL = {'#cbd5e1':'#334155','#67e8f9':'#155e75','#94a3b8':'#64748b','#e2e8f0':'#1e293b','#7dd3fc':'#075985','#fecaca':'#b91c1c','#fde68a':'#92400e','#e9d5ff':'#581c87','#fee2e2':'#991b1b','#c4b5fd':'#5b21b6','#fca5a5':'#991b1b','#fbcfe8':'#9d174d','#fcd34d':'#78350f'}, _anx_FGH = {'#cbd5e1':'#ffff00','#67e8f9':'#ffff00','#94a3b8':'#ffff00','#bae6fd':'#ffff00','#e2e8f0':'#ffff00','#7dd3fc':'#ffff00','#fecaca':'#ffff00','#fde68a':'#ffff00','#e9d5ff':'#ffff00','#fee2e2':'#ffff00','#fef2f2':'#ffff00','#fff':'#ffff00','#fef3c7':'#ffff00','#bbf7d0':'#ffff00','#a5f3fc':'#ffff00','#c4b5fd':'#ffff00','#fca5a5':'#ffff00','#fbcfe8':'#ffff00','#fcd34d':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00'};
      var _anx_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _anx_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#ef4444':'#ffff00','#f59e0b':'#ffff00','#a855f7':'#ffff00','#fca5a5':'#ffff00','#475569':'#ffff00','#fcd34d':'#ffff00','#06b6d4':'#ffff00','#22c55e':'#ffff00','#0ea5e9':'#ffff00','#ec4899':'#ffff00','#cbd5e1':'#ffff00','#0891b2':'#ffff00'};
      var _anxBg = function(h){ return _anxHC ? (_anx_BGH[h]||h) : (_anxL ? (_anx_BGL[h]||h) : h); };
      var _anxFg = function(h){ return _anxHC ? (_anx_FGH[h]||h) : (_anxL ? (_anx_FGL[h]||h) : h); };
      var _anxBd = function(h){ return _anxHC ? (_anx_BDH[h]||h) : (_anxL ? (_anx_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.anxietyToolkit || defaultState();
      function setA(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.anxietyToolkit) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { anxietyToolkit: next });
        });
      }
      // Triage gate: first-time visitors land on 'triage'; returning users (who explicitly
      // skipped or completed it) go to their last view or 'home'. Persisted d.skippedTriage
      // ensures returning users are never re-gated.
      var initialView = d.view || (d.skippedTriage ? 'home' : 'triage');
      var view = initialView;
      function goto(v) { setA({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: _anxFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _anxFg('#67e8f9'), fontSize: 22, fontWeight: 900 } }, '🫧 Anxiety Toolkit'),
            h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'CBT-based skills for working with anxiety.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'What is anxiety', icon: '🫧' },
          { id: 'tree', label: 'Worry tree', icon: '🌳' },
          { id: 'parking', label: 'Worry time', icon: '🅿️' },
          { id: 'decat', label: 'Decatastrophize', icon: '🪜' },
          { id: 'ground', label: 'Grounding', icon: '🌍' },
          { id: 'patterns', label: 'My patterns', icon: '🔍' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Anxiety Toolkit sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#06b6d4' : '#334155'),
                background: active ? 'rgba(6,182,212,0.18)' : _anxBg('#1e293b'),
                color: active ? _anxFg('#a5f3fc') : _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: _anxFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Anxiety that significantly interferes with school, sleep, eating, or relationships for more than a few weeks deserves a clinician. This tool is a companion, not therapy. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TRIAGE — clinical safety gate (NOT an assessment)
      // ═══════════════════════════════════════════════════════════
      function anxietyMetric(label, value, hint, color) {
        return h('div', {
          style: {
            minHeight: 76,
            padding: 12,
            borderRadius: 10,
            background: _anxBg('#0f172a'),
            borderTop: '1px solid #1e293b',
            borderRight: '1px solid #1e293b',
            borderBottom: '1px solid #1e293b',
            borderLeft: '4px solid ' + color
          }
        },
          h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 } }, label),
          h('div', { style: { fontSize: 20, color: color, fontWeight: 900, lineHeight: 1.1 } }, value),
          h('div', { style: { fontSize: 11, color: _anxFg('#cbd5e1'), marginTop: 5, lineHeight: 1.35 } }, hint)
        );
      }

      function anxietyRouteCard(title, blurb, actionLabel, onClick, color) {
        return h('button', {
          onClick: onClick,
          'aria-label': actionLabel + ': ' + title,
          style: {
            minHeight: 128,
            padding: 14,
            borderRadius: 12,
            borderTop: '1px solid #1e293b',
            borderRight: '1px solid #1e293b',
            borderBottom: '1px solid #1e293b',
            borderLeft: '4px solid ' + color,
            background: _anxBg('#0f172a'),
            color: _anxFg('#e2e8f0'),
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }
        },
          h('div', { style: { fontSize: 14, fontWeight: 900, color: color, lineHeight: 1.2 } }, title),
          h('div', { style: { flex: 1, fontSize: 12, color: _anxFg('#cbd5e1'), lineHeight: 1.5 } }, blurb),
          h('div', { style: { fontSize: 11, fontWeight: 900, color: color, textTransform: 'uppercase' } }, actionLabel)
        );
      }

      function anxietyCommandPanel() {
        var parkedCount = (d.parkedWorries || []).length;
        var patternCount = (d.myTriggers || []).length + (d.myBodySigns || []).length + (d.mySigsThoughts || []).length + (d.myWhatHelps || []).length;
        var intensity = (typeof d.triageIntensity === 'number') ? d.triageIntensity : 5;
        var planStatus = d.copingPlan ? 'Ready' : (d.catastrophe || d.worstCase || d.mostLikely ? 'In progress' : 'Not started');
        return h('section', {
          role: 'region',
          'aria-label': 'Anxiety Toolkit quick start dashboard',
          style: {
            marginBottom: 16,
            padding: 14,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(8,145,178,0.14) 0%, rgba(15,23,42,0.42) 100%)',
            border: '1px solid rgba(6,182,212,0.35)'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 } },
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { margin: 0, color: _anxFg('#a5f3fc'), fontSize: 16, fontWeight: 900 } }, 'Choose the next useful move'),
              h('p', { style: { margin: '4px 0 0', color: _anxFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.55 } },
                'Start with the part that matches this moment: body alarm, worry loop, future worry, or personal patterns.')
            ),
            h('button', {
              onClick: function() { goto('print'); },
              'aria-label': 'Open printable anxiety toolkit summary',
              style: { padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 800 }
            }, 'Print summary')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, marginBottom: 12 } },
            anxietyMetric('Intensity', intensity + '/10', intensity >= 8 ? 'Use body-first support.' : 'Use the skill that fits.', '#06b6d4'),
            anxietyMetric('Parked', String(parkedCount), parkedCount ? 'Saved for worry time.' : 'No worries parked yet.', '#f59e0b'),
            anxietyMetric('Plan', planStatus, 'Decatastrophizing progress.', '#a855f7'),
            anxietyMetric('Patterns', String(patternCount), patternCount ? 'Personal map started.' : 'Build your map.', '#ec4899')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
            anxietyRouteCard('Calm the body first', 'Use grounding when the alarm is already loud and thinking is hard.', 'Open grounding', function() { goto('ground'); }, '#0ea5e9'),
            anxietyRouteCard('Sort the worry', 'Separate solvable worries from loops so the next step is clearer.', 'Open worry tree', function() { goto('tree'); }, '#22c55e'),
            anxietyRouteCard('Park it for later', 'Contain repeat worries in a scheduled worry window.', 'Open worry time', function() { goto('parking'); }, '#f59e0b'),
            anxietyRouteCard('Map my patterns', 'Save triggers, body signs, thoughts, and what actually helps.', 'Open patterns', function() { goto('patterns'); }, '#ec4899')
          )
        );
      }

      // This is a "you might need more than this tool" gate, shown
      // before users drop into interactive anxiety content. It is
      // skippable, and the choice is remembered (d.skippedTriage)
      // so returning users are never re-gated.
      // ═══════════════════════════════════════════════════════════
      function renderTriage() {
        var suicidal = d.triageSuicidal;
        var intensity = (typeof d.triageIntensity === 'number') ? d.triageIntensity : 5;
        var basicNeeds = d.triageBasicNeeds;

        // Determine which routing card to show. Only show after enough
        // is answered to avoid premature/false-positive routing.
        var answeredEnough = suicidal !== null && basicNeeds !== null;
        var crisisRoute = suicidal === 'yes';
        var softRoute = !crisisRoute && answeredEnough && (intensity >= 8 || basicNeeds === 'no');

        function continueToToolkit() {
          // Mark triage as completed/skipped so the user is never re-gated,
          // then route to the psychoeducation home view.
          setA({ skippedTriage: true, view: 'home' });
        }

        function skipTriage() {
          setA({ skippedTriage: true, view: 'home' });
        }

        function openCrisisCompanion() {
          // Persist skip so they don't see triage again next time they return.
          setA({ skippedTriage: true });
          if (setSelHubTool) setSelHubTool('crisiscompanion');
        }

        function openTipp() {
          setA({ skippedTriage: true });
          if (setSelHubTool) setSelHubTool('tipp');
        }

        // Yes/No/Prefer button — accessible, high-contrast
        function choiceBtn(label, value, current, onPick, color) {
          var active = current === value;
          return h('button', {
            key: value,
            onClick: function() { onPick(value); },
            'aria-pressed': active,
            'aria-label': label,
            style: {
              flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 8,
              border: '2px solid ' + (active ? color : _anxFg('#475569')),
              background: active ? 'rgba(255,255,255,0.06)' : _anxBg('#1e293b'),
              color: active ? '#f1f5f9' : _anxFg('#cbd5e1'),
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              boxShadow: active ? ('0 0 0 1px ' + color + ' inset') : 'none'
            }
          }, label);
        }

        return h('div', null,
          // Intro — gentle, non-alarming framing
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(14,165,233,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 20, fontWeight: 900, color: _anxFg('#bae6fd'), marginBottom: 6 } }, 'Before we start — a quick check-in.'),
            h('p', { style: { margin: 0, color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Three questions, takes about 30 seconds. This is not an assessment — it just helps us point you to the right place. If you have used this tool before, you can ',
              h('button', {
                onClick: skipTriage,
                'aria-label': 'Skip triage — I have used this tool before',
                style: { background: 'none', border: 'none', padding: 0, color: _anxFg('#7dd3fc'), textDecoration: 'underline', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit' }
              }, 'skip this'),
              '.'
            )
          ),

          // Q1 — suicidality
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { id: 'triage-q1', style: { fontSize: 14, fontWeight: 800, color: _anxFg('#fecaca'), marginBottom: 10, lineHeight: 1.5 } },
              '1. Are you having thoughts of suicide or hurting yourself right now?'),
            h('div', { role: 'group', 'aria-labelledby': 'triage-q1', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              choiceBtn('Yes', 'yes', suicidal, function(v) { setA({ triageSuicidal: v }); }, _anxBg('#ef4444')),
              choiceBtn('No', 'no', suicidal, function(v) { setA({ triageSuicidal: v }); }, '#22c55e'),
              choiceBtn('Prefer not to say', 'prefer-not', suicidal, function(v) { setA({ triageSuicidal: v }); }, _anxFg('#64748b'))
            )
          ),

          // Q2 — intensity 1-10
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('label', { htmlFor: 'triage-intensity', style: { display: 'block', fontSize: 14, fontWeight: 800, color: _anxFg('#fde68a'), marginBottom: 10, lineHeight: 1.5 } },
              '2. On a scale of 1-10, how intense is your anxiety right now?'),
            h('input', {
              id: 'triage-intensity',
              type: 'range', min: 1, max: 10, step: 1, value: intensity,
              'aria-valuemin': 1, 'aria-valuemax': 10, 'aria-valuenow': intensity,
              onChange: function(e) { setA({ triageIntensity: parseInt(e.target.value, 10) }); },
              style: { width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: _anxFg('#94a3b8'), marginTop: 4 } },
              h('span', null, '1 — calm'),
              h('span', { style: { color: _anxFg('#fde68a'), fontWeight: 800, fontSize: 14 } }, String(intensity)),
              h('span', null, '10 — overwhelming')
            )
          ),

          // Q3 — basic needs
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 14 } },
            h('div', { id: 'triage-q3', style: { fontSize: 14, fontWeight: 800, color: _anxFg('#e9d5ff'), marginBottom: 10, lineHeight: 1.5 } },
              '3. Have you been able to sleep, eat, and care for basic needs this week?'),
            h('div', { role: 'group', 'aria-labelledby': 'triage-q3', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              choiceBtn('Yes', 'yes', basicNeeds, function(v) { setA({ triageBasicNeeds: v }); }, '#22c55e'),
              choiceBtn('Somewhat', 'somewhat', basicNeeds, function(v) { setA({ triageBasicNeeds: v }); }, '#f59e0b'),
              choiceBtn('No', 'no', basicNeeds, function(v) { setA({ triageBasicNeeds: v }); }, _anxBg('#ef4444'))
            )
          ),

          // Routing card — CRISIS (Q1 = yes)
          crisisRoute ? h('div', { role: 'alert',
            style: { padding: 18, borderRadius: 12, background: 'linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(15,23,42,0.5) 70%)', border: '2px solid #ef4444', marginBottom: 12 }
          },
            h('div', { style: { fontSize: 18, fontWeight: 900, color: _anxFg('#fecaca'), marginBottom: 8 } }, 'What you are feeling matters.'),
            h('p', { style: { margin: '0 0 10px', color: _anxFg('#fee2e2'), fontSize: 14, lineHeight: 1.7 } },
              'Please reach out NOW. You do not have to be in a "bad enough" place to call — these lines are for exactly this moment.'),
            h('ul', { style: { margin: '0 0 12px', padding: '0 0 0 22px', color: _anxFg('#fef2f2'), fontSize: 14, lineHeight: 1.9 } },
              h('li', null, h('strong', null, '988'), ' — call or text (Suicide & Crisis Lifeline, US)'),
              h('li', null, 'Text ', h('strong', null, 'HOME'), ' to ', h('strong', null, '741741'), ' (Crisis Text Line)')
            ),
            h('p', { style: { margin: '0 0 12px', color: _anxFg('#fee2e2'), fontSize: 13, lineHeight: 1.65 } },
              'Opening the Crisis Companion tool in this app is also a good step — it has a safety plan template and grounding skills designed for right now.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: openCrisisCompanion, 'aria-label': 'Open Crisis Companion tool',
                style: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: _anxFg('#fff'), cursor: 'pointer', fontSize: 14, fontWeight: 800 } },
                'Open Crisis Companion'),
              h('button', { onClick: openTipp, 'aria-label': 'Open TIPP tool',
                style: { padding: '10px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: 'rgba(239,68,68,0.18)', color: _anxFg('#fee2e2'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } },
                'Open TIPP'),
              h('button', { onClick: continueToToolkit, 'aria-label': 'I am not in crisis — continue to toolkit',
                style: { padding: '10px 16px', borderRadius: 8, border: '1px solid #475569', background: _anxBg('#1e293b'), color: _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 13, fontWeight: 700 } },
                'I am not in crisis — continue to toolkit')
            )
          ) : null,

          // Routing card — SOFT (high intensity or basic needs unmet)
          softRoute ? h('div', { role: 'status',
            style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.5)', marginBottom: 12 }
          },
            h('div', { style: { fontSize: 16, fontWeight: 900, color: _anxFg('#fde68a'), marginBottom: 6 } }, 'It sounds like you are carrying a lot.'),
            h('p', { style: { margin: '0 0 12px', color: _anxFg('#fef3c7'), fontSize: 13.5, lineHeight: 1.7 } },
              'This toolkit can help, AND it is worth thinking about getting human support too — a counselor, a trusted adult, or one of the lines above. You do not have to handle this alone.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: openCrisisCompanion, 'aria-label': 'Open Crisis Companion tool',
                style: { padding: '10px 16px', borderRadius: 8, border: '1px solid #fcd34d', background: 'rgba(245,158,11,0.22)', color: _anxFg('#fef3c7'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } },
                'Open Crisis Companion'),
              h('button', { onClick: continueToToolkit, 'aria-label': 'Continue to toolkit',
                style: { padding: '10px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', color: _anxFg('#fff'), cursor: 'pointer', fontSize: 14, fontWeight: 800 } },
                'Continue to toolkit')
            )
          ) : null,

          // Default continue — once enough answered and no routing card shown
          (answeredEnough && !crisisRoute && !softRoute) ? h('div', {
            style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.4)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }
          },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 13, color: _anxFg('#bbf7d0'), lineHeight: 1.6 } },
              'Thanks for the check-in. The toolkit is a good fit for what you described.'),
            h('button', { onClick: continueToToolkit, 'aria-label': 'Continue to toolkit',
              style: { padding: '10px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', color: _anxFg('#fff'), cursor: 'pointer', fontSize: 14, fontWeight: 800 } },
              'Continue to toolkit →')
          ) : null,

          // Always-visible skip link at bottom for users who don't want to answer
          h('div', { style: { marginTop: 6, textAlign: 'center' } },
            h('button', {
              onClick: skipTriage,
              'aria-label': 'Skip triage — I have used this tool before',
              style: { background: 'none', border: 'none', color: _anxFg('#94a3b8'), textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }
            }, 'Skip — I have used this tool before')
          )
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — psychoeducation
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(6,182,212,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(6,182,212,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _anxFg('#a5f3fc'), marginBottom: 4 } }, 'Anxiety is a body, not a flaw.'),
            h('p', { style: { margin: 0, color: _anxFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'Anxiety is your alarm system — a body response designed by millions of years of evolution to keep you alive. It is supposed to fire when something matters. The problem is not that the alarm fires; the problem is that for some people, the alarm fires more loudly than the situation warrants, or stays on after the situation has passed, or fires at things that are not actually threats.'
            )
          ),

          anxietyCommandPanel(),

          // What anxiety actually is
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #06b6d4', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _anxFg('#67e8f9'), marginBottom: 10 } }, '🧠 The fight-flight-freeze response, in plain English'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'When your brain perceives a threat, it sends a signal that prepares your body to either FIGHT (face the threat), FLEE (escape the threat), or FREEZE (play dead, hope it passes). This happens before you can think.'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'What you feel as "anxiety" is actually the BODY part of that response: heart racing, breathing fast, muscles tight, stomach churning, sweating, vision narrowing, mind racing. These are not signs something is wrong with you. They are signs your body is doing what it was built to do.'),
            h('p', { style: { margin: 0, color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'The trick is: the body cannot tell the difference between a real tiger and a math test. The same response fires for both. CBT and the tools in this kit help you work with the response, not against it.')
          ),

          // Worry vs Anxiety vs Fear
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _anxFg('#c4b5fd'), marginBottom: 10 } }, '🔍 These three are not the same thing'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _anxFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: _anxFg('#c4b5fd') } }, 'Fear'), ' is the response to something present and real. A growling dog. A car coming at you. The response is appropriate.'),
              h('li', null, h('strong', { style: { color: _anxFg('#c4b5fd') } }, 'Anxiety'), ' is the response to something IMAGINED. The test next week. What might happen at the party. The kid you don\'t like seeing you in the hallway. Your body responds AS IF the thing is happening now.'),
              h('li', null, h('strong', { style: { color: _anxFg('#c4b5fd') } }, 'Worry'), ' is the THINKING part: the mental loop of "what if, what if, what if." Worry can be useful (planning) or unhelpful (going in circles).')
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Skills in this toolkit'),
          stepCard('🌳 The worry tree', 'Is this worry productive (something I can act on) or unproductive (going in circles)? Different worries need different moves.', function() { goto('tree'); }, '#22c55e'),
          stepCard('🅿️ Worry time (parking lot)', 'Park your worries to a scheduled 15-20 minutes per day. Frees the rest of your day from running mental loops.', function() { goto('parking'); }, '#f59e0b'),
          stepCard('🪜 Decatastrophize', 'When the worry is "what if the worst happens?" — walk down the ladder: worst case, best case, MOST LIKELY case, and what you would actually do.', function() { goto('decat'); }, _anxBg('#a855f7')),
          stepCard('🌍 Grounding skills', 'When anxiety has already taken over, body-based skills (5-4-3-2-1, paced breathing, cold water) bring you back.', function() { goto('ground'); }, _anxBg('#0ea5e9')),
          stepCard('🔍 My patterns', 'Identify YOUR triggers, body signs, common worry thoughts, and what actually helps you. The kit becomes personalized.', function() { goto('patterns'); }, '#ec4899'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: _anxBg('#0f172a'), cursor: 'pointer', marginBottom: 8, color: _anxFg('#e2e8f0') } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // WORRY TREE
      // ═══════════════════════════════════════════════════════════
      function renderTree() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: _anxFg('#bbf7d0'), lineHeight: 1.7 } },
            h('strong', null, '🌳 The Worry Tree '),
            'is one of the most useful CBT tools for adolescent anxiety. The basic question: is this worry SOLVABLE right now, or am I just spinning? If it is solvable, make a plan. If it is not solvable right now, the worry is not doing useful work — that\'s when other skills kick in.'
          ),

          // The worry
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'a-worry', style: { display: 'block', fontSize: 12, color: _anxFg('#bbf7d0'), fontWeight: 800, marginBottom: 6 } }, 'What is the worry?'),
            h('textarea', { id: 'a-worry', value: d.worryItem || '',
              placeholder: 'Be specific. Not "school," but "the math test on Tuesday."',
              onChange: function(e) { setA({ worryItem: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          d.worryItem ? h('div', null,
            // The fork
            h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, color: _anxFg('#bbf7d0'), fontWeight: 800, marginBottom: 10 } }, 'Is there something I can DO about this right now (today or this week)?'),
              h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() { setA({ worryActionable: true }); }, 'aria-label': 'Yes, actionable', 'aria-pressed': d.worryActionable === true,
                  style: { flex: 1, minWidth: 140, padding: 12, borderRadius: 8, border: '2px solid ' + (d.worryActionable === true ? '#22c55e' : _anxFg('#475569')), background: d.worryActionable === true ? 'rgba(34,197,94,0.18)' : _anxBg('#1e293b'), color: d.worryActionable === true ? _anxFg('#bbf7d0') : _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } }, '✓ Yes — there is something I can do'),
                h('button', { onClick: function() { setA({ worryActionable: false }); }, 'aria-label': 'No, not actionable', 'aria-pressed': d.worryActionable === false,
                  style: { flex: 1, minWidth: 140, padding: 12, borderRadius: 8, border: '2px solid ' + (d.worryActionable === false ? _anxBg('#a855f7') : _anxFg('#475569')), background: d.worryActionable === false ? 'rgba(168,85,247,0.18)' : _anxBg('#1e293b'), color: d.worryActionable === false ? _anxFg('#e9d5ff') : _anxFg('#cbd5e1'), cursor: 'pointer', fontSize: 14, fontWeight: 700 } }, '✕ No — nothing I can do right now')
              )
            ),

            // Branch: actionable
            d.worryActionable === true ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
              h('label', { htmlFor: 'a-worry-action', style: { display: 'block', fontSize: 13, fontWeight: 800, color: _anxFg('#bbf7d0'), marginBottom: 8 } }, '✓ Make a plan'),
              h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.55 } }, 'What is the next concrete step? Not "study more"; "spend 20 minutes on practice problems #5-10 after dinner tonight."'),
              h('textarea', { id: 'a-worry-action', value: d.worryAction || '',
                placeholder: 'The next concrete step is...',
                onChange: function(e) { setA({ worryAction: e.target.value }); },
                style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } }),
              d.worryAction ? h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(34,197,94,0.18)', marginTop: 8, fontSize: 12.5, color: _anxFg('#bbf7d0'), lineHeight: 1.6 } },
                h('strong', null, '🎯 The CBT move: '),
                'Once you\'ve made the plan, the worry has done its job. If the same worry comes back, your move is to remind yourself "I have a plan; I will execute it at [time]" — and then redirect attention. The worry is not allowed to keep working when the action is already scheduled.'
              ) : null
            ) : null,

            // Branch: not actionable
            d.worryActionable === false ? h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
              h('label', { htmlFor: 'a-worry-redirect', style: { display: 'block', fontSize: 13, fontWeight: 800, color: _anxFg('#e9d5ff'), marginBottom: 8 } }, '⤴ Let it go (for now)'),
              h('div', { style: { fontSize: 12, color: _anxFg('#94a3b8'), marginBottom: 8, fontStyle: 'italic', lineHeight: 1.55 } }, 'If there is nothing you can do RIGHT NOW, more worrying will not make you safer or smarter; it will just make you exhausted. The move is to redirect. Park it for worry time later (if you want), or use a grounding skill.'),
              h('textarea', { id: 'a-worry-redirect', value: d.worryLetGoNotes || '',
                placeholder: 'What will you redirect to? A specific activity, a coping skill, a person to text.',
                onChange: function(e) { setA({ worryLetGoNotes: e.target.value }); },
                style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } }),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
                h('button', { onClick: function() {
                  if (d.worryItem) {
                    var parked = (d.parkedWorries || []).concat([{ text: d.worryItem, date: todayISO() }]);
                    setA({ parkedWorries: parked });
                    if (addToast) addToast('Worry parked. Use worry time later.', 'info');
                  }
                }, 'aria-label': 'Park this worry for worry time',
                  style: { padding: '6px 14px', borderRadius: 6, border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.18)', color: _anxFg('#fde68a'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '🅿️ Park it for worry time'),
                h('button', { onClick: function() { goto('ground'); }, 'aria-label': 'Use a grounding skill',
                  style: { padding: '6px 14px', borderRadius: 6, border: '1px solid #0ea5e9', background: 'rgba(14,165,233,0.18)', color: _anxFg('#bae6fd'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '🌍 Use a grounding skill')
              )
            ) : null
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // WORRY TIME (PARKING)
      // ═══════════════════════════════════════════════════════════
      function renderParking() {
        function parkInput() {
          var el = document.getElementById('a-park-input');
          if (!el || !el.value.trim()) return;
          var parked = (d.parkedWorries || []).concat([{ text: el.value.trim(), date: todayISO() }]);
          setA({ parkedWorries: parked });
          el.value = '';
          if (announceToSR) announceToSR('Worry parked.');
        }
        function removeWorry(i) {
          var w = (d.parkedWorries || []).slice();
          w.splice(i, 1);
          setA({ parkedWorries: w });
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: _anxFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '🅿️ Scheduled worry time '),
            'is a counterintuitive CBT technique. You set aside 15-20 minutes a day (often before dinner) to deliberately worry. The rest of the day, when a worry pops up, you "park" it — write it down, knowing you will get to it later. This DOES NOT make worries go away. It contains them so they stop running all day.'
          ),

          // Settings
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, 'My worry time'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 } },
              h('div', null,
                h('label', { htmlFor: 'a-worry-time', style: { display: 'block', fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'When'),
                h('input', { id: 'a-worry-time', type: 'time', value: d.worryTimeStart || '17:00',
                  onChange: function(e) { setA({ worryTimeStart: e.target.value }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'a-worry-mins', style: { display: 'block', fontSize: 11, color: _anxFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'How many minutes'),
                h('input', { id: 'a-worry-mins', type: 'number', min: 5, max: 60, value: d.worryTimeMinutes || 20,
                  onChange: function(e) { setA({ worryTimeMinutes: parseInt(e.target.value, 10) }); },
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } })
              )
            )
          ),

          // Park new
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, '+ Park a worry'),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'a-park-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Park a worry'),
              h('input', { id: 'a-park-input', type: 'text', placeholder: 'The thing my brain wants to keep thinking about...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); parkInput(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: parkInput, 'aria-label': 'Park worry',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: _anxBg('#b45309'), color: _anxFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Park')
            )
          ),

          // Parked worries
          (d.parkedWorries || []).length > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, 'Parked (' + d.parkedWorries.length + ')'),
            d.parkedWorries.map(function(w, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: _anxBg('#1e293b'), marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 10, color: _anxFg('#94a3b8'), fontFamily: 'ui-monospace, monospace', minWidth: 75 } }, w.date),
                h('span', { style: { flex: 1, fontSize: 13, color: _anxFg('#e2e8f0') } }, w.text),
                h('button', { onClick: function() { removeWorry(i); }, 'aria-label': 'Remove worry: ' + w.text,
                  style: { minWidth: 24, minHeight: 24, background: 'transparent', border: '1px solid #475569', color: _anxFg('#94a3b8'), borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          // How to do worry time
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 10, fontSize: 12.5, color: _anxFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '🕔 How to do worry time:'),
            h('ol', { style: { margin: '6px 0 0', padding: '0 0 0 22px' } },
              h('li', null, 'Sit somewhere private with your parked list.'),
              h('li', null, 'Set a timer for your chosen minutes.'),
              h('li', null, 'For each worry: ask "is this productive (run it through the worry tree) or unproductive (acknowledge, let it sit)?"'),
              h('li', null, 'When the timer goes off, you STOP worrying — even if you didn\'t finish. Worry time is OVER for today.'),
              h('li', null, 'Move into something else: a walk, a meal, a show, time with someone.')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // DECATASTROPHIZE
      // ═══════════════════════════════════════════════════════════
      function renderDecat() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: _anxFg('#e9d5ff'), lineHeight: 1.7 } },
            h('strong', null, '🪜 Decatastrophizing '),
            'is a CBT skill for when the worry is "what if the WORST happens?" The technique walks the worst case down the ladder so it becomes manageable. NOTE: this is NOT "stop being negative." It is taking the catastrophe seriously enough to think it through.'
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('label', { htmlFor: 'a-catastrophe', style: { display: 'block', fontSize: 12, color: _anxFg('#c4b5fd'), fontWeight: 800, marginBottom: 6 } }, 'The worry'),
            h('textarea', { id: 'a-catastrophe', value: d.catastrophe || '',
              placeholder: 'What is the catastrophe you are worried about?',
              onChange: function(e) { setA({ catastrophe: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('label', { htmlFor: 'a-worst', style: { display: 'block', fontSize: 12, color: _anxFg('#fca5a5'), fontWeight: 800, marginBottom: 6 } }, '⬇ Worst case: if EVERYTHING went wrong'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Be specific. Often the "worst case" in your head is vague; spelling it out actually makes it less scary.'),
            h('textarea', { id: 'a-worst', value: d.worstCase || '',
              placeholder: 'If everything went wrong, what would specifically happen?',
              onChange: function(e) { setA({ worstCase: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('label', { htmlFor: 'a-best', style: { display: 'block', fontSize: 12, color: _anxFg('#bbf7d0'), fontWeight: 800, marginBottom: 6 } }, '⬆ Best case: if it went GREAT'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Useful to consider for balance. The mind has been stuck on worst-case; expanding the range helps.'),
            h('textarea', { id: 'a-best', value: d.bestCase || '',
              placeholder: 'If it went great, what would happen?',
              onChange: function(e) { setA({ bestCase: e.target.value }); },
              style: { width: '100%', minHeight: 60, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('label', { htmlFor: 'a-likely', style: { display: 'block', fontSize: 12, color: _anxFg('#7dd3fc'), fontWeight: 800, marginBottom: 6 } }, '➡ MOST LIKELY: realistic, honest'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'This is the key one. Most of the time, the most-likely outcome is somewhere in the messy middle — not great, not terrible, manageable.'),
            h('textarea', { id: 'a-likely', value: d.mostLikely || '',
              placeholder: 'Realistically, what is most likely to actually happen?',
              onChange: function(e) { setA({ mostLikely: e.target.value }); },
              style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('label', { htmlFor: 'a-cope', style: { display: 'block', fontSize: 12, color: _anxFg('#fde68a'), fontWeight: 800, marginBottom: 6 } }, '🛠 If the worst case did happen — what would I actually DO?'),
            h('div', { style: { fontSize: 11, color: _anxFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'The most powerful question in decatastrophizing. The brain catastrophizes by imagining the bad thing — and stopping there. The work is to keep going: if it happened, what would I do next?'),
            h('textarea', { id: 'a-cope', value: d.copingPlan || '',
              placeholder: 'If the worst case happened, my next steps would be...',
              onChange: function(e) { setA({ copingPlan: e.target.value }); },
              style: { width: '100%', minHeight: 100, padding: 10, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // GROUNDING
      // ═══════════════════════════════════════════════════════════
      function renderGround() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: _anxFg('#bae6fd'), lineHeight: 1.7 } },
            h('strong', null, '🌍 Grounding skills '),
            'are body-first techniques for when anxiety has already taken over and thinking is hard. They work by pulling your attention out of the mental loop and into the physical present moment. They take 30 seconds to 5 minutes.'
          ),

          // 5-4-3-2-1
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '👀 5-4-3-2-1 Senses'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } }, 'Look around and name:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _anxFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, '5 things you can SEE'),
              h('li', null, '4 things you can HEAR'),
              h('li', null, '3 things you can TOUCH'),
              h('li', null, '2 things you can SMELL'),
              h('li', null, '1 thing you can TASTE')
            )
          ),

          // Paced breathing
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '🫁 Paced breathing'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Breathe in for 4 counts, hold for 4, out for 6-8, repeat for 1-2 minutes. The LONGER EXHALE is the active ingredient — it activates your parasympathetic system (the "calm down" branch).'),
            h('p', { style: { margin: 0, color: _anxFg('#94a3b8'), fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } },
              'See the TIPP tool in this SEL Hub for the full version.')
          ),

          // Cold
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '❄ Cold water'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Splash cold water on your face, hold a cold pack on your eyes for 15-30 seconds, or hold ice cubes in your hands. Cold on the face triggers the mammalian dive reflex, which physiologically slows your heart rate.'),
            h('p', { style: { margin: 0, color: _anxFg('#94a3b8'), fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } },
              'AVOID if you have a heart condition or eating disorder. See TIPP for cautions.')
          ),

          // Body scan
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '👟 Feet on floor'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Press your feet firmly into the floor. Notice the contact. Feel the weight of your body in the chair, the temperature of the room, the texture of what you\'re wearing. The point is to come back into your body.')
          ),

          // The cube
          h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: _anxFg('#7dd3fc'), marginBottom: 8 } }, '🔢 The cube (categories)'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.65 } },
              'Name 5 things in a category that occupies your thinking. 5 colors. 5 capitals. 5 favorite songs. 5 dog breeds. The point is to occupy the verbal part of your brain with something neutral.')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PATTERNS — personalized inventory
      // ═══════════════════════════════════════════════════════════
      function renderPatterns() {
        var TRIGGER_STARTERS = ['Tests and grades', 'Social situations', 'Family arguments', 'Health worries', 'Future / college / career', 'Sleep deprivation', 'Caffeine', 'Phone notifications', 'News / world events', 'Money', 'Specific person'];
        var BODY_STARTERS = ['Heart racing', 'Tight chest', 'Shallow breathing', 'Stomach churning', 'Sweating', 'Cold hands', 'Headache', 'Muscle tension', 'Restless / pacing', 'Lightheaded'];
        var THOUGHT_STARTERS = ['What if...', 'I cannot handle this', 'Everyone is judging me', 'Something bad is going to happen', 'I am going to fail', 'I am letting people down', 'It is my fault'];
        var HELP_STARTERS = ['Paced breathing', 'Movement / walk', 'Talking to a specific person', 'Cold water', 'My music', 'A specific show', 'Time with my pet', 'Writing', 'Calling a specific number', 'A specific routine'];

        function listEditor(key, title, color, starters, blurb) {
          var items = d[key] || [];
          function addItem(value) {
            if (!value || !value.trim()) return;
            var list = items.slice();
            if (list.indexOf(value.trim()) === -1) list.push(value.trim());
            var patch = {}; patch[key] = list;
            setA(patch);
          }
          function removeItem(i) {
            var list = items.slice();
            list.splice(i, 1);
            var patch = {}; patch[key] = list;
            setA(patch);
          }
          var inputId = 'a-pat-' + key;
          function submit() {
            var el = document.getElementById(inputId);
            if (!el || !el.value.trim()) return;
            addItem(el.value);
            el.value = '';
          }

          return h('div', { style: { padding: 14, borderRadius: 10, background: _anxBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
            h('div', { style: { fontSize: 13, color: color, fontWeight: 800, marginBottom: 6 } }, title),
            h('div', { style: { fontSize: 11.5, color: _anxFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, blurb),

            items.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              items.map(function(s, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 14, background: _anxBg('#1e293b'), border: '1px solid ' + color + '44', fontSize: 12, color: _anxFg('#e2e8f0') } },
                  h('span', null, s),
                  h('button', { onClick: function() { removeItem(i); }, 'aria-label': 'Remove grounding item: ' + s,
                    style: { minWidth: 24, minHeight: 24, background: 'transparent', border: 'none', color: _anxFg('#94a3b8'), cursor: 'pointer', fontSize: 11 } }, '✕')
                );
              })
            ) : null,

            h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' } },
              h('input', { id: inputId, type: 'text', placeholder: 'Type and Enter to add...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } },
                style: { flex: 1, minWidth: 180, padding: 8, borderRadius: 6, border: '1px solid #334155', background: _anxBg('#1e293b'), color: _anxFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { onClick: submit, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: color, color: _anxFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            ),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', fontSize: 11, color: _anxFg('#94a3b8') } }, 'Need ideas? Tap a starter'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                starters.map(function(s, si) {
                  var already = items.indexOf(s) !== -1;
                  return h('button', { key: si, onClick: function() { addItem(s); }, disabled: already, 'aria-label': 'Add starter: ' + s,
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + color + '66', background: already ? _anxBg('#1e293b') : 'rgba(15,23,42,0.6)', color: already ? _anxFg('#64748b') : _anxFg('#cbd5e1'), cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                    (already ? '✓ ' : '+ ') + s);
                })
              )
            )
          );
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', borderTop: '1px solid rgba(236,72,153,0.3)', borderRight: '1px solid rgba(236,72,153,0.3)', borderBottom: '1px solid rgba(236,72,153,0.3)', borderLeft: '3px solid #ec4899', marginBottom: 14, fontSize: 12.5, color: _anxFg('#fbcfe8'), lineHeight: 1.65 } },
            h('strong', null, '🔍 Your anxiety has patterns. '),
            'The more you know YOUR specific triggers, body signs, common thoughts, and what helps YOU, the faster you can intervene next time. This inventory is private to this device.'
          ),

          listEditor('myTriggers', '⚡ My common triggers', '#f59e0b', TRIGGER_STARTERS,
            'What tends to set off your anxiety? Specific situations, people, times of day.'),
          listEditor('myBodySigns', '🫀 How anxiety shows up in MY body', _anxBg('#ef4444'), BODY_STARTERS,
            'Your specific physical signs. Knowing these helps you catch anxiety earlier.'),
          listEditor('mySigsThoughts', '💭 My common anxious thoughts', _anxBg('#a855f7'), THOUGHT_STARTERS,
            'The specific thoughts that loop when you\'re anxious. Naming them weakens their grip.'),
          listEditor('myWhatHelps', '🛟 What ACTUALLY helps me', '#22c55e', HELP_STARTERS,
            'Not what should help; what really does. Be honest with yourself.'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('anxietyToolkit', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#67e8f9'), fontSize: 16 } }, 'What this toolkit is'),
            h('p', { style: { margin: '0 0 10px', color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'A collection of evidence-based CBT skills for working with anxiety, designed to be used outside of therapy. The skills are well-documented and widely taught in cognitive-behavioral therapy for anxiety disorders, including for adolescents.'
            ),
            h('p', { style: { margin: 0, color: _anxFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Anxiety is the most common adolescent mental health concern. Roughly 1 in 3 US adolescents will meet criteria for an anxiety disorder before age 18. Most students never get clinical treatment. These tools are not a substitute for treatment when treatment is warranted, but they are real skills that work.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#67e8f9'), fontSize: 16 } }, 'When anxiety needs a clinician'),
            h('p', { style: { margin: '0 0 8px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } }, 'Signs that self-help is not enough:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _anxFg('#cbd5e1'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Anxiety significantly interferes with school, sleep, eating, or relationships for more than a few weeks.'),
              h('li', null, 'You\'re avoiding things that matter to you because of anxiety (school, friends, activities).'),
              h('li', null, 'Panic attacks (sudden intense anxiety with strong body symptoms — racing heart, hyperventilation, feeling like you\'re dying or going crazy).'),
              h('li', null, 'Anxiety + significant depression or substance use.'),
              h('li', null, 'Specific intense fears (heights, social situations, contamination) that disrupt life.'),
              h('li', null, 'Anxiety that started after a traumatic event (likely trauma-layered, needs trauma-informed therapy).')
            ),
            h('p', { style: { margin: '8px 0 0', color: _anxFg('#fde68a'), fontSize: 13, lineHeight: 1.7 } },
              h('strong', null, 'The good news: '),
              'evidence-based therapy (especially CBT and CBT with exposure) is very effective for adolescent anxiety. Most teens who get good treatment improve substantially within 12-16 sessions. It works.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _anxBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#67e8f9'), fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Beck, A. T., Emery, G., and Greenberg, R. L. (2005)', 'Anxiety Disorders and Phobias: A Cognitive Perspective, Basic Books', 'Foundational CBT-for-anxiety text.', null),
            sourceCard('AACAP (American Academy of Child & Adolescent Psychiatry)', 'aacap.org / Anxiety Disorders Resource Center', 'Evidence-based clinical guidance for adolescent anxiety.', 'https://www.aacap.org/AACAP/Families_and_Youth/Resource_Centers/Anxiety_Disorders_Resource_Center/Home.aspx'),
            sourceCard('Anxiety and Depression Association of America', 'adaa.org', 'Patient-facing resource hub. Free guides and clinician finder.', 'https://adaa.org/'),
            sourceCard('Walkup, J. T. et al. (2008)', '"Cognitive Behavioral Therapy, Sertraline, or a Combination in Childhood Anxiety," New England Journal of Medicine, 359, 2753-2766', 'Major RCT showing CBT effectiveness for adolescent anxiety.', null),
            sourceCard('Greenberger, D. and Padesky, C. A. (2015)', 'Mind Over Mood: Change How You Feel by Changing the Way You Think (2nd ed.), Guilford Press', 'The most-used CBT self-help workbook; includes worry skills.', null),
            sourceCard('Tolin, D. F. (2012)', 'Face Your Fears: A Proven Plan to Beat Anxiety, Panic, Phobias, and Obsessions, Wiley', 'Accessible CBT-for-anxiety workbook including exposure-based approaches.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _anxFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _anxFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'These skills help with everyday anxiety and mild-to-moderate anxious symptoms. For diagnosable anxiety disorders, they work BEST as part of treatment with a clinician, not instead of one.'),
              h('li', null, 'Exposure therapy is the gold-standard CBT technique for specific phobias and social anxiety. This toolkit does NOT include exposure work because it requires careful clinical structuring — for that, a CBT therapist is the right move.'),
              h('li', null, 'Anxiety that is actually a SIGNAL about an unsafe environment is not a thinking problem. If your anxiety is appropriate to the situation (an actually unsafe home, an actually unjust school, real medical concerns), the work is on the situation, not on your thoughts.'),
              h('li', null, 'For students with significant trauma history, some of these tools (especially exposure-adjacent thinking) can backfire. Pair with a trauma-informed clinician.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(6,182,212,0.10)', borderTop: '1px solid rgba(6,182,212,0.3)', borderRight: '1px solid rgba(6,182,212,0.3)', borderBottom: '1px solid rgba(6,182,212,0.3)', borderLeft: '3px solid #06b6d4', fontSize: 12.5, color: _anxFg('#a5f3fc'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Anxiety Toolkit pairs naturally with Window of Tolerance, Stress Bucket, and the CBT Thought Record. For school psych practice: the patterns inventory is useful intake data; the worry tree is teachable in one session; worry time is a 1-2 week practice. For Crew: walk students through the worry tree on a low-stakes worry as a first lesson.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _anxBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _anxFg('#67e8f9'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _anxFg('#a5f3fc'), fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _anxFg('#a5f3fc'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _anxFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — patterns + decatastrophizing + parked worries
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var parked = d.parkedWorries || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(6,182,212,0.10)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _anxFg('#a5f3fc'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Patterns + decatastrophizing + parked worries — useful for a therapist or counselor conversation.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', color: _anxFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: _anxBg('#1e293b'), color: _anxFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'anxiety-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _anxBg('#fff'), color: _anxFg('#0f172a'), borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#anxiety-print-region, #anxiety-print-region * { visibility: visible !important; } ' +
              '#anxiety-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #0891b2' } },
              h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Anxiety Toolkit · My Patterns'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My anxiety patterns'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _anxFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // My patterns
            (d.myTriggers || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#b45309'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '⚡ My common triggers'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myTriggers.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myBodySigns || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#ef4444'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🫀 How anxiety shows up in my body'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myBodySigns.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.mySigsThoughts || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#a855f7'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '💭 My common anxious thoughts'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.mySigsThoughts.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            (d.myWhatHelps || []).length > 0 ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#15803d'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🛟 What actually helps me'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                d.myWhatHelps.map(function(t, i) { return h('li', { key: i }, t); })
              )
            ) : null,

            // Recent decatastrophizing work
            (d.catastrophe || d.worstCase || d.mostLikely || d.copingPlan) ? h('div', { style: { marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _anxBg('#7c3aed'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🪜 Recent decatastrophizing work'),
              d.catastrophe ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'The worry'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.catastrophe)
              ) : null,
              d.worstCase ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Worst case'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.worstCase)
              ) : null,
              d.mostLikely ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Most likely (realistic)'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.mostLikely)
              ) : null,
              d.copingPlan ? h('div', { style: { marginBottom: 6, padding: '4px 12px' } },
                h('div', { style: { fontSize: 10, color: _anxFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'If the worst happened, I would'),
                h('div', { style: { fontSize: 12.5, color: _anxFg('#0f172a'), lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.copingPlan)
              ) : null
            ) : null,

            // Parked worries
            parked.length > 0 ? h('div', { style: { marginBottom: 12 } },
              h('div', { style: { background: _anxBg('#0ea5e9'), color: _anxFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🅿️ Recent parked worries (' + parked.length + ')'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _anxFg('#0f172a'), fontSize: 12, lineHeight: 1.75 } },
                parked.slice(-10).map(function(w, i) { return h('li', { key: i }, h('span', { style: { color: _anxFg('#64748b'), fontFamily: 'ui-monospace, monospace', fontSize: 10 } }, w.date + '  '), w.text); })
              )
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: _anxFg('#94a3b8'), textAlign: 'center', lineHeight: 1.5 } },
              'CBT-for-anxiety: Beck Institute · Padesky · AACAP. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'triage') body = renderTriage();
      else if (view === 'tree') body = renderTree();
      else if (view === 'parking') body = renderParking();
      else if (view === 'decat') body = renderDecat();
      else if (view === 'ground') body = renderGround();
      else if (view === 'patterns') body = renderPatterns();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      // Hide section nav tabs while the user is on the triage gate — the gate
      // is a focused, single-purpose screen and the tabs would let users bypass
      // it sideways before they have made a choice.
      var showNav = view !== 'triage';

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Anxiety Toolkit' },
        header(),
        showNav ? navTabs() : null,
        body
      );
    }
  });

})();
}
