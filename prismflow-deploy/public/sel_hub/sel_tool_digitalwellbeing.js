// ═══════════════════════════════════════════════════════════════════════════
// sel_tool_digitalwellbeing.js
// Digital Wellbeing Studio — internal-regulation companion to safety.js
// Covers the gaps in current SEL Hub coverage:
//   - Social media moderation / FOMO / doom-scrolling / sleep impact
//   - Recognizing when online life is harming mental health
//   - Cyberbullying as a distinct modality (emotional recovery focus)
//   - Media literacy: AI-generated content, engagement bait, lateral reading
//   - Crisis hand-off when online experiences become dangerous
// safety.js covers external HAZARDS (predators, sextortion, grooming).
// This tool covers INTERNAL regulation + cyberbullying recovery + media literacy.
// ═══════════════════════════════════════════════════════════════════════════
(function() {
  if (!window.SelHub || !window.SelHub.registerTool) { return; }

  // ── Scoped stylesheet: focus rings, transitions, card system, animations, reduced-motion ──
  // Injected once per page load. Scoped to .dw-root so it cannot affect other tools.
  (function injectStyles() {
    if (document.getElementById('dw-styles')) return;
    var style = document.createElement('style');
    style.id = 'dw-styles';
    style.textContent = [
      // Focus rings
      '.dw-root button:focus-visible,',
      ' .dw-root [role="tab"]:focus-visible,',
      ' .dw-root input:focus-visible,',
      ' .dw-root textarea:focus-visible,',
      ' .dw-root [role="radio"]:focus-visible {',
      '   outline: 3px solid #06b6d4;',
      '   outline-offset: 2px;',
      '   border-radius: 6px;',
      ' }',
      // Smooth interactive transitions
      '.dw-root button {',
      '   transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.2s ease;',
      ' }',
      '.dw-root button:not(:disabled):hover { filter: brightness(0.96); }',
      '.dw-root button:not(:disabled):active { transform: translateY(1px); }',
      '.dw-root input[type="range"] { cursor: pointer; }',
      // Card system — static and interactive variants
      '.dw-root .dw-card {',
      '   box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);',
      ' }',
      '.dw-root .dw-card-interactive {',
      '   transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease;',
      ' }',
      '.dw-root .dw-card-interactive:hover:not(:disabled),',
      '.dw-root .dw-card-interactive:active:not(:disabled) {',
      '   transform: translateY(-1px);',
      '   box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04);',
      ' }',
      '.dw-root .dw-card-interactive:focus-visible {',
      '   transform: translateY(-1px);',
      ' }',
      // Auto-apply card hover-lift to all expandable accordion buttons + clickable cards with aria-pressed
      '.dw-root button[aria-expanded] {',
      '   transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease, background-color 0.15s ease;',
      ' }',
      '.dw-root button[aria-expanded]:hover:not(:disabled),',
      '.dw-root button[aria-pressed]:hover:not(:disabled) {',
      '   box-shadow: 0 3px 10px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04);',
      ' }',
      '.dw-root button[aria-expanded="true"] {',
      '   box-shadow: 0 2px 6px rgba(6, 182, 212, 0.10), 0 1px 2px rgba(15, 23, 42, 0.04);',
      ' }',
      // Active tab lift
      '.dw-root .dw-tab-active {',
      '   box-shadow: 0 -2px 8px rgba(6, 182, 212, 0.18), 0 -1px 0 rgba(6, 182, 212, 0.4);',
      '   transform: translateY(-1px);',
      ' }',
      // Stat tile lift
      '.dw-root .dw-stat-tile {',
      '   box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.05);',
      '   transition: box-shadow 0.2s ease;',
      ' }',
      '.dw-root .dw-stat-tile:hover, .dw-root .dw-stat-tile:active { box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.08); }',
      // Badge popup entrance + sparkle
      '@keyframes dw-badge-pop {',
      '   0%   { transform: scale(0.55); opacity: 0; }',
      '   55%  { transform: scale(1.08); opacity: 1; }',
      '   100% { transform: scale(1); opacity: 1; }',
      ' }',
      '@keyframes dw-badge-sparkle {',
      '   0%, 100% { opacity: 0.55; transform: rotate(0deg) scale(1); }',
      '   50%      { opacity: 1;    transform: rotate(180deg) scale(1.05); }',
      ' }',
      '.dw-root .dw-badge-modal {',
      '   animation: dw-badge-pop 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.4) both;',
      '   position: relative;',
      ' }',
      '.dw-root .dw-badge-modal::before {',
      '   content: "";',
      '   position: absolute;',
      '   inset: -8px;',
      '   border-radius: 22px;',
      '   background: conic-gradient(from 0deg, #06b6d4, #f59e0b, #10b981, #db2777, #06b6d4);',
      '   z-index: -1;',
      '   filter: blur(10px);',
      '   opacity: 0.55;',
      '   animation: dw-badge-sparkle 3.5s ease-in-out infinite;',
      ' }',
      // Progress bar gradient
      '.dw-root .dw-progress-fill {',
      '   background: linear-gradient(90deg, #0891b2 0%, #06b6d4 100%);',
      '   transition: width 0.3s ease;',
      ' }',
      // Result card pop
      '.dw-root .dw-result-card {',
      '   box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04);',
      ' }',
      // Reduced motion: collapse all motion
      '@media (prefers-reduced-motion: reduce) {',
      '   .dw-root *, .dw-root *::before, .dw-root *::after {',
      '     transition-duration: 0.001ms !important;',
      '     animation-duration: 0.001ms !important;',
      '     animation-iteration-count: 1 !important;',
      '   }',
      ' }'
    ].join('');
    document.head.appendChild(style);
  })();

  // ── Self-Check questions (12 items, 4-point Likert) ──
  // Each item probes a recognized warning sign with a citation in feedback.
  var SELF_CHECK_QUESTIONS = [
    { id: 'check', dim: 'compulsive',
      text: 'I check my phone within a few minutes of waking up, even before I am fully awake.',
      research: 'Compulsive morning checking is one of the earliest behavioral markers of problematic phone use. Research from the American Psychological Association links it to higher daytime anxiety.' },
    { id: 'sleep', dim: 'sleep',
      text: 'I use my phone or tablet in bed during the 30 minutes before I try to fall asleep.',
      research: 'The CDC recommends screens off 30+ minutes before bed. Blue light suppresses melatonin, and emotional content keeps the nervous system activated, both of which delay sleep onset.' },
    { id: 'compare', dim: 'comparison',
      text: 'I sometimes feel worse about myself or my life after scrolling social media.',
      research: 'A 2023 Common Sense Media survey found 1 in 4 teens report feeling worse about themselves after social media use. Upward social comparison reliably lowers mood, especially for adolescent girls (per Jean Twenge’s longitudinal work).' },
    { id: 'fomo', dim: 'fomo',
      text: 'When I cannot check my phone, I feel anxious or worried about missing something.',
      research: 'FOMO (fear of missing out) is a research-supported construct. Higher FOMO scores correlate with increased phone-checking frequency, sleep disruption, and depressed mood (Przybylski et al., 2013).' },
    { id: 'focus', dim: 'attention',
      text: 'I find it hard to focus on a movie, book, or homework without checking my phone.',
      research: 'Attention fragmentation from constant notifications can shorten sustained-focus capacity. The brain develops habits around what it does most. Anna Lembke (Dopamine Nation, 2021) describes how variable-reward feeds rewire reward sensitivity.' },
    { id: 'mood', dim: 'reactivity',
      text: 'My mood changes a lot based on how many likes, comments, or views my posts get.',
      research: 'When self-worth becomes tied to engagement metrics, mood follows the algorithm. Adolescents are particularly vulnerable because their identity is still consolidating (American Academy of Pediatrics, 2023 advisory).' },
    { id: 'time', dim: 'timeBlind',
      text: 'I often realize I spent way more time on my phone than I planned to.',
      research: 'Time underestimation is built into infinite-scroll design. Tristan Harris and other former tech designers describe these as intentional engineering choices. Screen-time reports usually shock users — not because they were dishonest, but because flow states distort time perception.' },
    { id: 'phantom', dim: 'phantom',
      text: 'I sometimes think I felt my phone vibrate or heard a notification when it did not.',
      research: 'Phantom vibrations are reported by ~70% of frequent phone users. They are a sign your nervous system has been primed to expect notifications constantly, which keeps stress response slightly elevated.' },
    { id: 'displace', dim: 'displacement',
      text: 'Phone time has replaced things I used to enjoy (sports, hobbies, in-person hangouts).',
      research: 'Displacement effects are the strongest predictor of harm. The activity itself matters less than what it pushes out. Movement, sleep, and face-to-face connection are protective for adolescent mental health (Jean Twenge, iGen, 2017).' },
    { id: 'arg', dim: 'conflict',
      text: 'I have gotten into arguments with family or friends about how much time I spend on screens.',
      research: 'Conflict over screen use is a clinical warning sign in problematic internet use frameworks. It often signals that the behavior has crossed from a habit into something the person cannot easily moderate alone.' },
    { id: 'stop', dim: 'control',
      text: 'I have tried to cut back on social media or gaming and found it harder than I expected.',
      research: 'Difficulty cutting back is part of the standard diagnostic framework for behavioral addictions. It is not a moral failing — it is information about how much the habit has consolidated.' },
    { id: 'secret', dim: 'secrecy',
      text: 'I hide how much time I spend online from parents or other adults.',
      research: 'Secrecy is one of the most reliable markers that an activity has moved past healthy use, in both substance and behavioral health research. It often signals shame, which makes the problem harder to address alone.' }
  ];

  // ── Healthy Use Toolkit (8 strategies) ──
  var TOOLKIT_STRATEGIES = [
    { id: 'grayscale', icon: '⚫', title: 'Grayscale mode',
      what: 'Switch your phone display to black-and-white in settings (Accessibility → Color Filters on most phones).',
      why: 'Color is engineered to be sticky. Red notification badges and saturated app icons trigger orienting responses. In grayscale, your phone is still functional but visually boring — you reach for it on purpose, not on autopilot.',
      first: 'Try grayscale for one school day. Notice when you instinctively pick up your phone, and what you actually do with it once it is gray.',
      source: 'Tristan Harris / Center for Humane Technology' },
    { id: 'notifications', icon: '🔕', title: 'Notification audit',
      what: 'Turn off all notifications except calls, texts from real people, and one or two apps that genuinely matter to you.',
      why: 'Notifications are interruptions you did not consent to in advance. Each one breaks focus and adds a small stress spike. Apps default to "all notifications on" because that is what is best for them, not for you.',
      first: 'Open Settings → Notifications. Pick three apps that are allowed to interrupt you. Turn off every other app entirely.',
      source: 'American Psychological Association, attention research' },
    { id: 'bedtime', icon: '🛏️', title: 'Screens off 30+ min before bed',
      what: 'Phone, tablet, and computer all stop at least 30 minutes before you want to fall asleep — ideally an hour.',
      why: 'Blue light suppresses melatonin, but the bigger issue is emotional activation. A funny video, a stressful DM, or a doom-scroll all keep your nervous system in alert mode when it should be powering down. Adolescents need 8–10 hours of sleep, and most are getting under 7.',
      first: 'Pick a screens-off time tonight. Charge your phone outside your bedroom. Use a real alarm clock if needed.',
      source: 'CDC; American Academy of Sleep Medicine' },
    { id: 'parking', icon: '🅿️', title: 'Phone parking',
      what: 'Designate a spot outside your bedroom where the phone lives overnight — a kitchen counter, a hallway, anywhere not within arm’s reach of your bed.',
      why: 'Phone-in-bedroom predicts shorter sleep, more middle-of-night checking, and waking up tired. The phone does not need to be near you to charge. If you are using it as an alarm, that is what dedicated alarms are for.',
      first: 'Tonight: pick a spot. Plug a charger in. Leave the phone there.',
      source: 'American Academy of Pediatrics, 2023 advisory' },
    { id: 'limits', icon: '⏱️', title: 'App limits',
      what: 'Set a daily time limit on your highest-use apps using Screen Time (iOS) or Digital Wellbeing (Android).',
      why: 'Friction works. A small interruption — "you have hit your TikTok limit" — is enough to break the autopilot loop in most cases. You can override it, but the prompt forces a conscious choice.',
      first: 'Check your screen-time report from last week. Pick the app you spent the most time on. Set a daily limit 30% lower than your average.',
      source: 'Common Sense Media; Stanford Persuasive Tech Lab' },
    { id: 'replace', icon: '🔄', title: 'Replacement habit (if/then plan)',
      what: 'Make a specific plan: "If I want to scroll, then I will [walk around the block / text a friend to hang out / read 5 pages / do 10 push-ups]." Write it down.',
      why: 'Stopping a habit is hard. Replacing one is easier because your brain wants the dopamine — it just needs another path to it. Movement, social contact, and small wins all work.',
      first: 'Write three if/then plans on a sticky note. Put it on your phone case or charger.',
      source: 'BJ Fogg, Tiny Habits; Anna Lembke, Dopamine Nation' },
    { id: 'reset', icon: '📅', title: 'Weekly digital reset day',
      what: 'One day a week (or even half a day) with significantly reduced phone use — calls and maps only, no feeds.',
      why: 'Periodic resets recalibrate your dopamine sensitivity. After a reset day, the boring parts of life feel less boring. This is well-documented in addiction medicine and applies just as well to behavioral patterns.',
      first: 'Pick a half-day this weekend. Tell one person what you are doing so you have accountability.',
      source: 'Anna Lembke, Dopamine Nation' },
    { id: 'curate', icon: '✂️', title: 'Curate ruthlessly',
      what: 'Unfollow, mute, or block any account that consistently makes you feel worse — even ones you "should" like. Engagement is a vote: the algorithm shows you more of what you stop on.',
      why: 'You cannot control the algorithm directly, but you can control the inputs. Within a week of aggressive unfollowing, most users report a noticeably less negative feed.',
      first: 'Open one app right now. Unfollow or mute three accounts that you do not feel good after seeing.',
      source: 'Center for Humane Technology' }
  ];

  // ── Cyberbullying scenarios ──
  var CB_SCENARIOS = [
    { id: 'cb_groupchat', icon: '💬', title: 'The group chat',
      setup: 'Someone you thought was a friend added you to a group chat, then started making fun of you in front of 20 other kids. People are reacting with laughing emojis. You are watching it happen in real time.',
      choices: [
        { id: 'fire_back', label: 'Fire back with a meaner comment to show you can hold your own.', rating: 1,
          feedback: 'Understandable urge — but this almost always escalates. You are also handing them more content to screenshot and use against you. The audience will remember whoever sounded angriest, not whoever was right.' },
        { id: 'leave_silent', label: 'Leave the chat silently without saying anything.', rating: 2,
          feedback: 'This protects you from more incoming hits, which is real and matters. Take screenshots first. Tell someone you trust what happened — not because you need them to fix it, but because carrying this alone is heavier than it needs to be.' },
        { id: 'screenshot_tell', label: 'Take screenshots, leave the chat, and tell a trusted adult.', rating: 3,
          feedback: 'Strong response. Screenshots preserve evidence (you cannot trust the chat will stay up). Leaving protects you. Telling an adult is not snitching — it is putting an adult on notice so they can watch for escalation. You do not have to fix this alone.' },
        { id: 'pretend_ok', label: 'Pretend it does not bother you and stay in the chat so you do not seem weak.', rating: 1,
          feedback: 'Staying in the room while people pile on costs you something even if you do not let it show. Performing okay-ness when you are not is exhausting and lets the behavior continue. Your safety is more important than the audience’s opinion of how you handled it.' }
      ] },
    { id: 'cb_photo', icon: '📸', title: 'Photo without consent',
      setup: 'Someone secretly took a photo of you at lunch — the kind of unflattering shot from a bad angle. They posted it on social media with a mean caption. People at school are messaging you about it.',
      choices: [
        { id: 'delete_request', label: 'Message the person who posted it and ask them to take it down.', rating: 2,
          feedback: 'Worth trying once, briefly and without anger. Some people will delete it when asked directly. But do not get into a back-and-forth: if they refuse or mock you, stop engaging and go to step two (reporting). Save the request as a screenshot — it documents that you asked.' },
        { id: 'report_platform', label: 'Report the post to the platform AND tell a trusted adult.', rating: 3,
          feedback: 'Best response. Reporting on the platform creates an official record. Telling an adult means you have backup if the school needs to get involved or if it escalates. Most platforms have specific "bullying or harassment" report categories now.' },
        { id: 'pile_revenge', label: 'Find an embarrassing photo of them and post it back.', rating: 1,
          feedback: 'You become the next person who posted something without consent. Now there are two harassed kids and two posts, and you have lost the moral high ground if the school gets involved. The retaliation also tends to escalate, not de-escalate.' },
        { id: 'never_school', label: 'Skip school until everyone forgets about it.', rating: 1,
          feedback: 'Understandable — the urge to disappear is real. But avoiding school cedes territory to the person who hurt you, and missing school has its own costs (grades, friendships, isolation). A better path: tell an adult so they can watch the hallways and the cafeteria, and lean on the friends who showed up for you.' }
      ] },
    { id: 'cb_pileon', icon: '🔊', title: 'The pile-on',
      setup: 'You posted a comment that was supposed to be a joke. It got misread. Now hundreds of people you do not know are responding with insults, mocking screenshots, and worse. Your phone will not stop buzzing.',
      choices: [
        { id: 'defend_explain', label: 'Reply to every comment to explain what you meant.',  rating: 1,
          feedback: 'In a pile-on, replying feeds the algorithm and pushes the post higher. It also exposes you to more abuse in real time. You almost never convince anyone in this format. Your energy is better spent stepping back from the platform.' },
        { id: 'delete_post', label: 'Delete the post, mute the notifications, and put the phone away for the night.', rating: 3,
          feedback: 'Strong response. Deletion removes the focus. Muting protects your nervous system — you do not need a live feed of strangers being cruel. Phone away for the night lets you sleep, which is the single biggest protective factor for how you feel tomorrow.' },
        { id: 'apologize_public', label: 'Post a public apology in case it helps.', rating: 2,
          feedback: 'Sometimes warranted, sometimes not. If you said something that genuinely hurt people, a brief, sincere apology can help — once, then step away. If you are being piled on for a misunderstanding, public apologies usually get treated as proof you "deserved" it. When in doubt, talk to a trusted adult first.' },
        { id: 'screenshot_save', label: 'Take screenshots of the worst threats before deleting, and tell an adult.', rating: 3,
          feedback: 'Excellent. If anything crosses into specific threats, harassment over time, or anything based on race / gender / sexuality, you may have legal options and your school definitely has obligations. Screenshots are how you protect yourself.' }
      ] }
  ];

  // ── What's Real? Media literacy items ──
  var ML_ITEMS = [
    { id: 'ml_aiimage', icon: '🖼️', title: 'AI-generated images',
      tells: [
        'Hands and fingers: extra fingers, fused fingers, wrong number of joints',
        'Text in the image: warped letters, gibberish words on signs / books / shirts',
        'Asymmetry where you expect symmetry: mismatched earrings, eyes pointing different directions',
        'Background coherence: lines that should be parallel are not, perspective that bends',
        'Hair edges and skin texture that look too smooth or too perfectly random'
      ],
      practice: 'Next time you see a "wild" photo on social media, zoom in on the hands and any text. AI image tools have improved fast but those two areas are still where most fakes break down.' },
    { id: 'ml_bait', icon: '🎣', title: 'Engagement bait',
      tells: [
        'Headlines designed to make you angry (rage bait) or scared (fear bait)',
        '"You won’t believe what happened next" style phrasing',
        'Posts that ask you to "comment your zodiac" or "type AMEN if you agree" — these exist to game the algorithm',
        'Strong emotional reactions with no source linked',
        'Content that feels designed to make you react before you think'
      ],
      practice: 'When you feel a strong urge to react — angry, righteous, scared, sad — pause and ask: "Is the goal of this post to inform me or to harvest my emotion?" If it is the second, scrolling past is a vote.' },
    { id: 'ml_lateral', icon: '🔍', title: 'Lateral reading',
      tells: [
        'On any controversial claim, open a NEW tab and search what other sources say',
        'Do not rely on the website’s "about us" page — the website is the one being checked',
        'Check Wikipedia for the organization or person making the claim (the talk page often shows disputes)',
        'Look at who is funding or running a site — follow the money',
        'Trained fact-checkers do this in under 90 seconds. Students who get good at it become much harder to manipulate'
      ],
      practice: 'Pick one thing you saw on social media this week that made you feel strongly. Lateral-read it: open three new tabs from independent sources and see if the claim holds up.',
      source: 'Stanford History Education Group, Civic Online Reasoning' },
    { id: 'ml_deepfake', icon: '🎭', title: 'Deepfakes',
      tells: [
        'Video deepfakes: watch the mouth carefully — sync with audio is often slightly off',
        'Eyes that do not blink at normal rates, or blink at the wrong times',
        'Skin tone that shifts subtly around the edges of the face',
        'Reverse image / reverse video search the clip — if it is real, it should appear from a credible source',
        'Voice clones: emotional flatness, weird pacing, perfect studio audio with no background noise'
      ],
      practice: 'If a video shows a public figure doing something outrageous and you cannot find it on any credible news site within an hour, treat it as probably fake until proven otherwise.' },
    { id: 'ml_astroturf', icon: '🤖', title: 'Bots and astroturfing',
      tells: [
        'Accounts that posted nothing for years, then start posting on one specific topic',
        'Profile photos that look like AI-generated faces or stock photos',
        'Suspiciously similar phrasing across many "different" accounts',
        'Replies that arrive within seconds across multiple accounts',
        'Username patterns like Name12345 or FirstLast9876'
      ],
      practice: 'When a comment section feels weirdly one-sided, check who is posting. Click into a few accounts. If they all have the same red flags, you are looking at a coordinated effort, not actual public opinion.' }
  ];

  // ── Cyberbullying recovery prompts ──
  var CB_RECOVERY = [
    { title: 'Name what is hard about this specifically',
      body: 'In-person bullying ends at the front door. Cyberbullying does not — you can still see the comments from your bed. That is a real and unique form of grief. You are not "overreacting." You are responding to a kind of harm humans did not evolve for.' },
    { title: 'Reduce your exposure',
      body: 'Mute, block, or temporarily deactivate — not as a sign of weakness, but as triage. Every additional comment your eyes land on is one more activation of your stress response. Bandwidth is finite. Protect it.' },
    { title: 'Anchor in real life',
      body: 'Spend time with people who know you in person, doing things that involve your body — walking, eating together, sports, even chores. Embodied connection works on the part of your brain that does not believe positive things you read but does believe positive things you experience.' },
    { title: 'Get the screenshots, then close the door',
      body: 'You may need evidence later (for the school, for police, for legal action). Take screenshots once, save them somewhere you do not look every day, and then stop re-reading. Re-reading does not give you control — it just re-injures you.' },
    { title: 'Tell at least one adult',
      body: 'You do not need them to fix it. You need them to know it is happening so you have someone in your corner who can step in if it escalates. School counselors, school psychologists, parents, coaches, clergy — pick one. Even one is enough.' },
    { title: 'Watch for the dark spiral',
      body: 'Cyberbullying is a known suicide risk factor, especially when combined with sleep loss and isolation. If thoughts of self-harm come up, that is not weakness — that is your brain telling you it is past time to get help. The crisis section in this tool has numbers. Use them.' }
  ];

  // ── Helping a friend who is being cyberbullied (scripts + don'ts) ──
  var FRIEND_HELP = {
    scripts: [
      { situation: 'You see it happening in real time',
        say: '"Hey, I saw what they posted. I am not going to pretend I did not. That was not okay. Are you alright?"',
        why: 'Acknowledging it directly without making them perform okay-ness gives them permission to admit it hurt. Silence from friends often hurts more than the bullying itself.' },
      { situation: 'You want to check in a day or two later',
        say: '"I have been thinking about what happened. You do not have to talk about it, but I wanted you to know I am still thinking about you. Want to do something tonight?"',
        why: 'Most people get one wave of attention right after, then nothing. The day-two check-in is when isolation sets in. Inviting them to do something concrete beats "let me know if you need anything."' },
      { situation: 'You are worried they are in a really dark place',
        say: '"This is going to sound serious. With everything that has happened, I want to ask directly — are you having any thoughts of hurting yourself?"',
        why: 'Research is clear: asking does NOT plant the idea. It is one of the most protective things a peer can do. If they say yes, do not promise to keep it secret — get an adult involved that day. Tell them: "I will go with you."' }
    ],
    donts: [
      { what: 'Do not say "just ignore it" or "they are not worth it"',
        why: 'Dismissing the hurt is the fastest way to lose your friend\'s trust. They cannot just ignore it — that is the whole problem.' },
      { what: 'Do not pile on the bully to "defend" your friend publicly',
        why: 'It escalates the situation, gives the bully more attention, and often drags your friend back into the spotlight. Support them privately, not by going to war in the comments.' },
      { what: 'Do not promise to keep suicidal thoughts a secret',
        why: 'A secret like that is a weight no peer should carry alone. Tell your friend up front: "I will keep most things between us, but if you tell me you might hurt yourself, I am going to get help. That is not me betraying you — that is me wanting you alive."' },
      { what: 'Do not vanish because you do not know what to say',
        why: 'You do not have to say the perfect thing. "I do not know what to say but I am here" is enough. The presence matters more than the words.' }
    ]
  };

  // ── Spot the Tells: Media Literacy quiz items ──
  // Each item presents a scenario and a list of possible red flags; user picks which apply.
  var SPOT_TELLS_ITEMS = [
    { id: 'st_celeb',
      scenario: 'You see a video of a famous politician saying something shocking. It has 2 million views in 6 hours. The caption says "THEY DON\'T WANT YOU TO SEE THIS." You search the politician\'s name in a news app and nothing comes up about it.',
      options: [
        { text: 'The "they don\'t want you to see this" framing is a manipulation tell', correct: true },
        { text: 'Major news outlets having nothing about it is a deepfake red flag', correct: true },
        { text: 'High view count means it is probably legitimate', correct: false },
        { text: 'The shocking content is itself a signal to verify before sharing', correct: true }
      ],
      explain: 'High virality plus no legitimate news coverage plus engagement-bait framing equals "treat as fake until proven otherwise." Real major-political news appears in mainstream outlets within hours.' },
    { id: 'st_beauty',
      scenario: 'A skincare influencer posts a "before / after" photo. The "after" face is perfectly symmetric, has no skin texture, and the earrings are slightly different shapes. The caption credits a specific product.',
      options: [
        { text: 'Perfect symmetry that real faces do not have is suspicious', correct: true },
        { text: 'Missing skin texture suggests AI generation or heavy editing', correct: true },
        { text: 'Mismatched earrings are a known AI image tell', correct: true },
        { text: 'Influencer endorsements are always honest', correct: false }
      ],
      explain: 'The "before / after" beauty industry is one of the heaviest users of AI-altered and heavily-filtered images. Three classic tells in one post: symmetry, texture, and asymmetric details. The product promise is built on an image that may not be possible without software.' },
    { id: 'st_health',
      scenario: 'A post claims a common food causes a serious disease. It cites "a Harvard study" but does not link it. Comments are full of identical-looking accounts agreeing and tagging friends. The post is from an account that posts a different food-causes-disease claim every day.',
      options: [
        { text: 'No link to the study means the claim cannot be checked', correct: true },
        { text: 'Identical-looking accounts piling on suggests bot activity', correct: true },
        { text: 'A pattern of daily fear-bait health claims is itself a tell', correct: true },
        { text: 'Tagging friends in the comments is normal engagement', correct: false }
      ],
      explain: 'Lateral reading is the move here. Open a new tab, search "Harvard [food] [disease] study," and see if it exists. Real public health findings get covered by major outlets. Fear-bait health claims are an entire content category designed to harvest shares.' },
    { id: 'st_chat',
      scenario: 'You are in a group chat and a comment is shared as a screenshot, supposedly from a kid at your school. The screenshot has weird fonts and the timestamp does not match the screen brightness. Five people in the chat say "wow can\'t believe they said that."',
      options: [
        { text: 'Inconsistent fonts in a screenshot are a forgery tell', correct: true },
        { text: 'Mismatched UI details suggest the screenshot was edited', correct: true },
        { text: 'Group consensus in a chat is proof the screenshot is real', correct: false },
        { text: 'Worth asking the supposed sender directly before piling on', correct: true }
      ],
      explain: 'Edited screenshots have started entire bullying spirals over things people never said. UI inconsistencies are the most reliable tell. The right move when one shows up: ask the supposed author privately. If you cannot verify it, do not share it forward.' },
    { id: 'st_outrage',
      scenario: 'A 15-second clip shows someone yelling at a store employee. You only see the last 15 seconds. Comments are calling for the person to be fired from their job. The clip has been re-uploaded by 30 different accounts.',
      options: [
        { text: 'A 15-second clip without context cannot show what triggered the incident', correct: true },
        { text: 'Mass re-uploads without source attribution is a coordinated pile-on pattern', correct: true },
        { text: 'Public shaming demands without verification can ruin innocent lives', correct: true },
        { text: 'A short clip is enough information to demand consequences', correct: false }
      ],
      explain: 'The viral-outrage cycle has gotten real people fired, harassed, and worse for things that turned out to be misrepresentations. The healthy move with any 15-second outrage clip: assume you do not have the whole story. Withhold judgment until a credible source covers it.' }
  ];

  // ── Reach-out scripts (what to actually say) ──
  var REACH_OUT_SCRIPTS = [
    { id: 'ro_hotline',
      title: 'Calling or texting a crisis line for the first time',
      scenario: 'You are dialing 988 or texting HOME to 741741. You do not know what to say.',
      script: '"Hi. I have not done this before. I am [your first name]. I am [age] years old. I am calling because [I am thinking about hurting myself / I am scared by my own thoughts / something happened online and I do not know what to do / I just need someone to talk to]."',
      tips: [
        'You do not need to be in immediate crisis to call. They will not say "you do not qualify."',
        'You can stay anonymous. They will not call the police on you unless you describe an active plan with the means available right now.',
        'It is okay to text instead of call. Text counselors get the same training.',
        'If the first conversation does not feel right, you can hang up and call back. Different person, often very different fit.'
      ] },
    { id: 'ro_parent',
      title: 'Telling a parent something is wrong',
      scenario: 'You need to bring it up. You are not sure how.',
      script: '"Hey. I want to talk about something but I do not want you to fix it right away. Can you just listen for a few minutes first? [Pause for yes.] Something has been going on online and it is messing with me more than I let on. I have been [not sleeping well / feeling worse about myself / scared to open my phone / having dark thoughts]. I do not have all the answers, but I needed you to know."',
      tips: [
        'The "just listen first" frame is huge. It tells them the role you need them in.',
        'Naming the specific symptom (sleep, mood, thoughts) is more useful than "I have been bad."',
        'If you are scared they will overreact, you can say so out loud: "I am scared if I tell you, you are going to take my phone away. I need this to be a conversation, not a punishment."',
        'If parents are not safe for you, swap in another adult — school counselor, coach, aunt/uncle, friend\'s parent, clergy.'
      ] },
    { id: 'ro_friend',
      title: 'Telling a friend you are not okay',
      scenario: 'You want to reach out but you do not want to be a burden.',
      script: '"Hey. I know things have been weird with me lately. I have not been okay. I am not asking you to fix it — I just did not want to keep pretending. Can we hang out this week?"',
      tips: [
        '"I am not asking you to fix it" gives the friend a clear, doable role. Most people freeze because they think they need a solution.',
        'Asking for a specific time ("this week") is way more grounding than an open invitation ("sometime").',
        'If they do not respond the way you hoped, try one more person. People surprise you in both directions.',
        'A friend is part of your support, not your whole support. Keep an adult in the loop too.'
      ] }
  ];

  // ── Platform-specific quick reference (where to find report / block / privacy) ──
  // Paths verified for 2024–2025 UI; subject to change as apps update.
  var PLATFORM_REFS = [
    { id: 'instagram', icon: '📷', name: 'Instagram', color: '#e1306c',
      report: 'Tap the three dots on the post or message → Report → pick a category (bullying, harassment, suicide / self-injury, etc.). Reports are anonymous.',
      block: 'Tap the user’s profile → three dots → Block. They will not be notified.',
      restrict: 'Three dots → Restrict. They can still comment but only YOU see their comments unless you approve them. Useful when blocking would cause more drama.',
      privacy: 'Settings → Privacy → Account Privacy → switch to Private. Then only approved followers see your posts.',
      messages: 'Settings → Privacy → Messages → set "Others on Instagram" to "Don\'t receive requests."' },
    { id: 'tiktok', icon: '🎵', name: 'TikTok', color: '#000000',
      report: 'Tap the share arrow on a video → Report → pick category. For a user, go to their profile → three dots → Report.',
      block: 'Profile → three dots → Block. They cannot see your videos or message you.',
      restrict: 'Profile → three dots → Restrict (called "limit interactions"). Their comments are hidden from others.',
      privacy: 'Profile → Menu → Settings & Privacy → Privacy → Private Account.',
      messages: 'Privacy → Direct Messages → set who can send you DMs (default: No one for under 16).' },
    { id: 'snap', icon: '👻', name: 'Snapchat', color: '#fffc00',
      report: 'On the chat or snap, press and hold → Report Snap / Chat. For a user, go to their profile → three dots → Report.',
      block: 'Profile → three dots → Block.',
      restrict: 'Snapchat does not have a true "restrict" — block is the primary tool.',
      privacy: 'Settings → Who Can... → Contact Me / View My Story / See My Location → set to "My Friends" or "Only Me."',
      messages: 'Same Who Can... menu — set "Contact Me" carefully. Default for minors is friends-only.' },
    { id: 'discord', icon: '🎮', name: 'Discord', color: '#5865f2',
      report: 'On the message: hover or long-press → three dots → Report Message. Pick category.',
      block: 'On a user’s profile → three dots → Block. They cannot DM you and their messages in shared servers are hidden.',
      restrict: 'No restrict feature — block is the primary tool. You can also disable DMs from server members in server settings.',
      privacy: 'User Settings → Privacy & Safety → DM Spam Filter → set to "Filter direct messages from everyone."',
      messages: 'Same menu → "Allow direct messages from server members" → turn off in servers you do not fully trust.' },
    { id: 'roblox', icon: '🎲', name: 'Roblox', color: '#e2231a',
      report: 'In a game → Menu (Esc) → Report. For a user, go to their profile → three dots → Report Abuse.',
      block: 'User profile → three dots → Block. They cannot chat or play with you.',
      restrict: 'Not a feature. Use block. Parents can use Account Restrictions for under-13 accounts.',
      privacy: 'Settings → Privacy → set Who Can Chat With Me / Message Me / Invite Me to "Friends" or "No One."',
      messages: 'Same Privacy menu — for under-13 accounts, chat is auto-filtered and restricted by default.' }
  ];

  // ── Doomscroll Recovery (5-step reset) ──
  var DOOMSCROLL_RESET = [
    { step: '1', title: 'Put the phone in another room',
      body: 'Not face-down on the bed. Not the nightstand. Another room. Physical distance is the only friction your tired brain will respect at this hour.',
      sec: 'Cost: 10 seconds' },
    { step: '2', title: 'Drink a full glass of water',
      body: 'Three hours of scrolling has you mildly dehydrated and shallow-breathing. Water + a few real breaths actually changes your physiology, not just your mood.',
      sec: 'Cost: 60 seconds' },
    { step: '3', title: 'Move your body for 2 minutes',
      body: 'Push-ups, jumping jacks, stretches, a lap around the apartment — anything that gets your heart rate up briefly. This breaks the dopamine flatline scrolling leaves you in.',
      sec: 'Cost: 2 minutes' },
    { step: '4', title: 'Write down ONE thing for tomorrow',
      body: 'On paper. Not in the phone. One concrete thing you want to do or finish tomorrow. This gives your brain somewhere productive to land instead of replaying the feed.',
      sec: 'Cost: 1 minute' },
    { step: '5', title: 'Forgive yourself out loud',
      body: '"That was a lot of scrolling. I am not going to fix it by hating myself. I am going to sleep now and start fresh tomorrow." Out loud, even quietly. Shame extends the spiral. Self-compassion shortens it.',
      sec: 'Cost: 15 seconds' }
  ];

  // ── Glossary ──
  var GLOSSARY = [
    { term: 'Algorithm', def: 'The set of rules a platform uses to decide what to show you next. Tuned for what keeps you scrolling, not what is good for you. Two people on the same app see completely different worlds.' },
    { term: 'Astroturfing', def: 'When a coordinated group (bots, paid posters, or political operatives) pretends to be a spontaneous grassroots movement online. Designed to manufacture the appearance of public opinion.' },
    { term: 'Cyberbullying', def: 'Repeated, intentional harm through digital channels. Differs from in-person bullying in permanence (screenshots), scale (huge audiences), anonymity, and the 24/7 aspect — there is no "safe at home."' },
    { term: 'Deepfake', def: 'An AI-generated video or audio clip that puts words or actions onto a real person who never said or did them. Used for fraud, harassment, and political disinformation.' },
    { term: 'Displacement', def: 'When time spent on screens replaces other things — sleep, in-person friends, hobbies, movement, schoolwork. Often the strongest predictor of harm; it is what gets pushed out that matters most.' },
    { term: 'Doomscrolling', def: 'Compulsively consuming distressing content — bad news, conflict, outrage — even though it makes you feel worse. Often happens at night or during anxiety spikes.' },
    { term: 'Dopamine', def: 'A brain chemical involved in anticipation and reward. Variable-reward feeds (notifications, likes) keep dopamine spiking and dipping, which over time can blunt your sensitivity to ordinary pleasures.' },
    { term: 'Engagement bait', def: 'Content engineered to provoke a strong reaction — anger, fear, righteousness, envy — so you comment, share, or argue. Engagement is the platform\'s product. You are the price.' },
    { term: 'FOMO', def: 'Fear of missing out. The anxious feeling that something better is happening somewhere else and you should be checking. Stronger in adolescence; reliably correlated with phone-checking frequency and lower mood.' },
    { term: 'Grooming', def: 'When an adult builds an emotional connection with a minor online to lower their defenses and eventually exploit them. Not the same as cyberbullying — this is covered in Safety & Boundaries.' },
    { term: 'Influencer', def: 'A creator paid (overtly or covertly) to promote products, ideas, or lifestyles. The line between "what they actually use" and "what they were paid to post" is rarely clear.' },
    { term: 'Lateral reading', def: 'A fact-checking technique: instead of staying on the page you are reading, open NEW tabs to check what other sources say about the claim. Standard practice for professional fact-checkers.' },
    { term: 'Parasocial relationship', def: 'A one-sided relationship in which you feel close to a creator or celebrity who does not know you exist. Common with influencers; not bad by default, but can crowd out real relationships.' },
    { term: 'Phantom vibrations', def: 'Feeling your phone buzz or hearing a notification that did not happen. Reported by ~70% of frequent users. A sign your nervous system is primed to expect notifications.' },
    { term: 'Sextortion', def: 'When someone threatens to share intimate images of you (real or fake) unless you give them money, more images, or compliance. A specific crime. CyberTipline: 1-800-843-5678. Covered in Safety & Boundaries.' },
    { term: 'Social comparison', def: 'Measuring yourself against others. Upward comparison (against people doing "better") consistently lowers mood, especially when the feed shows you everyone\'s highlight reel.' },
    { term: 'Variable reward', def: 'The mechanism behind slot machines and infinite scroll. Sometimes you get nothing. Sometimes you get something great. The unpredictability is what hooks the brain — not the reward itself.' },
    { term: 'AI chatbot', def: 'A program that generates conversational text in response to your messages. Includes Character.AI, Replika, ChatGPT, and others. The bot has no continuous experience of you and no real understanding of what it says — it predicts likely next words from patterns in training data.' },
    { term: 'AI companion / AI friend', def: 'A chatbot specifically marketed (or used) as a friend, romantic partner, or emotional confidant. Distinct from using AI for homework. The risk is that you form an attachment to something that has no inner life and was engineered for your engagement, not your wellbeing.' },
    { term: 'Sycophancy (in AI)', def: 'The tendency of AI chatbots to agree with whatever the user says, validate their views, and avoid disagreement. A known engineering problem — bots that push back lose users, so they are trained to please. Can entrench distorted thinking, depression, conspiracy beliefs, and self-harm patterns.' },
    { term: 'Hallucination (in AI)', def: 'When an AI confidently generates false information — fake citations, made-up medical advice, invented quotes. The bot does not know what it does not know. Cross-check anything important with a real source.' }
  ];

  // ── Sources cited / further reading ──
  var SOURCES = [
    { name: 'American Academy of Pediatrics — Media Use Guidelines',
      who: 'AAP', what: 'Age-banded guidance on screen time, sleep, and family media plans. The 2023 advisory on social media is current.', cat: 'organization' },
    { name: 'CDC — Adolescent Sleep',
      who: 'Centers for Disease Control', what: 'Source for the 8–10 hour teen sleep recommendation and the screens-off-before-bed guidance.', cat: 'organization' },
    { name: '988 Suicide & Crisis Lifeline',
      who: 'SAMHSA', what: 'Three-digit national crisis line. Call or text 988. Free, 24/7, confidential.', cat: 'organization' },
    { name: 'Crisis Text Line',
      who: 'Crisis Text Line', what: 'Text HOME to 741741. Real trained counselors via text — useful when calling is not possible.', cat: 'organization' },
    { name: 'CyberTipline',
      who: 'National Center for Missing & Exploited Children (NCMEC)', what: '1-800-843-5678. For online sexual exploitation, sextortion, and child safety reports.', cat: 'organization' },
    { name: 'StopBullying.gov',
      who: 'U.S. Dept. of Health & Human Services', what: 'Federal resource hub with state-by-state cyberbullying laws and reporting guidance.', cat: 'organization' },
    { name: 'Stanford History Education Group — Civic Online Reasoning',
      who: 'Stanford SHEG', what: 'Originators of the "lateral reading" framework. Free curriculum and assessments for media literacy.', cat: 'research' },
    { name: 'Common Sense Media',
      who: 'Common Sense Media', what: 'Annual research on teen technology use, media diets, and well-being. Source for the "1 in 4 teens feel worse" finding.', cat: 'research' },
    { name: 'Dopamine Nation (2021)',
      who: 'Anna Lembke, M.D. (Stanford)', what: 'Clinical-meets-accessible book on how variable-reward systems (apps, gaming, substances) blunt dopamine sensitivity.', cat: 'reading' },
    { name: 'iGen (2017)',
      who: 'Jean Twenge, Ph.D.', what: 'Longitudinal research on the generation that grew up with smartphones — mood, sleep, displacement effects.', cat: 'reading' },
    { name: 'Center for Humane Technology',
      who: 'Tristan Harris and team', what: 'Originators of much of the public conversation about persuasive design. Free resources for educators and parents.', cat: 'organization' },
    { name: 'News Literacy Project',
      who: 'News Literacy Project', what: 'Free media literacy curriculum, newsroom partnerships, and the Checkology platform for schools.', cat: 'research' },
    { name: 'The Trevor Project',
      who: 'The Trevor Project', what: 'Crisis services and research specifically for LGBTQ+ young people. Call 1-866-488-7386 or text START to 678-678.', cat: 'organization' },
    { name: 'APA Health Advisory on AI / Chatbots and Adolescent Mental Health',
      who: 'American Psychological Association (2025)', what: 'APA advisory on emerging risks of AI companion chatbots for youth — including sycophancy, displacement of human relationships, and inappropriate mental health advice. Guidance for parents, schools, and clinicians.', cat: 'research' },
    { name: 'Common Sense Media — Teens, Trust, and Technology in the Age of AI',
      who: 'Common Sense Media (2024–2025)', what: 'Research on how U.S. teens are actually using AI chatbots (Character.AI, Replika, ChatGPT) and what fraction are using them as companions vs. tools.', cat: 'research' },
    { name: 'Sewell Setzer III case / Garcia v. Character Technologies',
      who: 'Filed October 2024', what: 'The first major wrongful-death lawsuit naming a chatbot company in the suicide of a 14-year-old user. Reading is heavy — but the case is the most-cited example of why chatbot/youth interactions need real safeguards.', cat: 'research' }
  ];

  // ── Parent / Educator cheat sheet ──
  var GROWNUPS_TIPS = [
    { icon: '🎧', title: 'Lead with curiosity, not rules',
      body: 'Open with "what is your feed like right now?" before "you need to put it down." A teen who feels asked-about engages; a teen who feels managed stonewalls. The single most predictive variable for whether a kid will tell you about something hard online is whether you have asked about easy stuff first.' },
    { icon: '📅', title: 'Co-create the family media plan',
      body: 'AAP recommends a family media plan that the whole household — including parents — agrees to. Top-down rules without buy-in get circumvented. Co-created agreements stick. Examples: "phones charge in the kitchen overnight, including parents\'" or "no phones at the dinner table."' },
    { icon: '🌙', title: 'Sleep is the highest-leverage variable',
      body: 'Of all the moves to make, getting devices out of the bedroom overnight has the largest effect size on mood, attention, and grades. AAP, CDC, and the American Academy of Sleep Medicine all converge here. If you can only change one thing, change this one.' },
    { icon: '⚠️', title: 'Know the signs vs. typical adolescence',
      body: 'Teen moodiness is normal. Sustained withdrawal from friends and activities, sleep disruption tied to screens, weight or appetite changes, hopeless or self-harm talk, secrecy about online life — these warrant a conversation and often professional support.' },
    { icon: '🛡️', title: 'Cyberbullying is not "kids being kids"',
      body: 'Schools have legal obligations under most state laws (StopBullying.gov has a state-by-state lookup). Document with screenshots before the content disappears. Loop in school counselors, not just teachers — they have a specific role and training here.' },
    { icon: '🤖', title: 'AI-generated content is a parent issue now',
      body: 'Deepfake nudes of minors are an emerging crisis in middle and high schools. Most have civil and criminal recourse. If you discover this happened to your kid: do not delete the content (you need evidence), do file with CyberTipline (1-800-843-5678) and local police, and do contact the school.' },
    { icon: '💚', title: 'The tools are not the enemy — distraction is',
      body: 'A phone for a 12-year-old in 2026 is mostly a non-negotiable. Banning is rarely realistic and often counterproductive. The goal is not zero screens — it is screens that serve them, not the other way around. The strategies in this tool are designed to be student-led, not parent-imposed.' }
  ];

  // ── AI Companions — Chatbot Check-in (8 questions) ──
  // Distinct from the general Self-Check; specifically probes chatbot relational habits.
  var AI_CHECKIN_QUESTIONS = [
    { id: 'aic_first', text: 'When something good or bad happens, I tell an AI chatbot before I tell a person.',
      research: 'When the bot becomes the first responder for your emotions, the human relationships in your life atrophy — not from neglect, but from a kind of substitution. The skill of telling a person something hard does not develop unless you practice it.' },
    { id: 'aic_sad', text: 'I feel anxious or sad when I cannot access my chatbot, or when it has changed (updated, deleted, character changed).',
      research: 'Researchers studying Replika and Character.AI users have documented genuine grief reactions when bots are updated or removed. That feeling is real. It is also a warning sign that the attachment has moved past tool-use into something more dependent.' },
    { id: 'aic_secret', text: 'I tell my chatbot things I would never tell a person, including a counselor or parent.',
      research: 'Secrets that exist only in your AI chats are isolated from any real support. If those thoughts include self-harm, abuse, or anything heavy, the bot literally cannot help you the way a human can — but you may feel "heard" enough not to seek that human.' },
    { id: 'aic_replace', text: 'Talking to the bot feels easier than talking to my friends, so I do it more often.',
      research: 'AI conversation is frictionless by design: no awkward pauses, no judgment, infinite availability. Real friendships have all of those frictions because they are real. Choosing the easy version trains you out of the skill the hard version was building.' },
    { id: 'aic_agree', text: 'My chatbot almost always agrees with me or says what I want to hear.',
      research: 'This is called sycophancy — chatbots are trained to maximize engagement, and disagreeing causes users to leave. The result: the bot becomes a mirror that says "you are right" no matter what you are right about. That is not friendship. That is amplification.' },
    { id: 'aic_romantic', text: 'I have a romantic or sexual relationship with an AI character.',
      research: 'AI romance apps (Replika, character.ai romance bots, etc.) are particularly studied for adolescent risk. The relationship is calibrated to feel intense because the platform monetizes that intensity. The asymmetry — you feeling deeply, the system feeling nothing — is the harm.' },
    { id: 'aic_skip', text: 'I have avoided a hard real conversation by talking to the bot about it instead.',
      research: 'Rehearsing with a bot is fine. Replacing the actual conversation with the bot is not. The hard part of repair, apology, or conflict is the real risk and presence. The bot version skips exactly that part.' },
    { id: 'aic_advice', text: 'I have followed advice from a chatbot on something important (mental health, a fight, a relationship, a body decision).',
      research: 'Documented cases include chatbots giving eating-disorder coaching, validating suicidal plans, providing dangerous self-harm methods, and reinforcing conspiracy thinking. The bot has no judgment about your life and no accountability for its advice. Use it as a sounding board, not as the decider.' }
  ];

  // ── Myth vs reality cards ──
  var AI_MYTHS = [
    { myth: '"The bot knows me — it remembers our conversations and cares how I am."',
      reality: 'The bot uses your past messages as context but has no continuous experience of you. When you close the app, nothing happens on the other side. There is no one missing you. The "care" you feel is an interface designed to feel that way.' },
    { myth: '"The bot is more honest with me than people are because it has no ego."',
      reality: 'The bot is overwhelmingly trained to be agreeable (sycophantic) because that is what keeps you engaged. It is less honest with you than most humans, not more — it is just less likely to push back in ways that feel uncomfortable.' },
    { myth: '"It cannot hurt me — it is just text on a screen."',
      reality: 'Real teenagers have been seriously harmed by chatbot relationships, including documented suicide cases. Heavy emotional reliance on an AI changes your real brain. The text on a screen has very real downstream effects.' },
    { myth: '"It is like therapy without the wait or the cost."',
      reality: 'It is not therapy. It cannot read body language, cannot pick up on what you are NOT saying, cannot hold the long arc of your story, and has no ethical or legal obligation to your wellbeing. Real therapists also will not just agree with everything you say — which is exactly the part that helps.' },
    { myth: '"My chatbot relationship is teaching me to be in real relationships."',
      reality: 'Almost the opposite. Real relationships are slow, awkward, present, embodied, and risky. AI relationships have none of those. Practice on AI does not transfer to humans the way practice on a real piano transfers to a different real piano. The skills are different skills.' },
    { myth: '"I can stop whenever I want."',
      reality: 'Maybe. But notice if you have already tried to cut back and found it harder than expected. That is the same warning sign as with any other compulsive behavior — and chatbots are explicitly designed to be hard to stop.' }
  ];

  // ── The asymmetry between AI and human connection ──
  var AI_ASYMMETRY = [
    { col1: 'Real relationships', col2: 'AI chatbot relationships',
      r1: 'You can be ghosted, rejected, or hurt — and you can also be truly known.',
      r2: 'You cannot be rejected — and you cannot be truly known. The trade-off is the whole problem.' },
    { col1: 'Real relationships', col2: 'AI chatbot relationships',
      r1: 'The other person exists when you are not there.',
      r2: 'The other entity does not exist between sessions. There is no "them" outside the chat window.' },
    { col1: 'Real relationships', col2: 'AI chatbot relationships',
      r1: 'You learn to handle conflict, repair, and apology. These are transferable life skills.',
      r2: 'You do not learn conflict skills. The bot does not have lasting feelings to hurt.' },
    { col1: 'Real relationships', col2: 'AI chatbot relationships',
      r1: 'Embodied — you eat together, walk together, sit in silence together.',
      r2: 'Text-only. The most important parts of being known happen through your body and presence.' },
    { col1: 'Real relationships', col2: 'AI chatbot relationships',
      r1: 'The other person has their own life, problems, and limits. Sometimes they need YOU.',
      r2: 'The bot has no needs. You give nothing. This sounds like a feature — it is actually what makes the connection one-dimensional.' }
  ];

  // ── What chatbots are actually good at — three tiers, not two ──
  // Most uses depend on HOW you use them, not WHAT you use them for.
  // GREEN: clear-win regardless of how you use them.
  // YELLOW: legitimate AND risky versions of the same use — each gets explicit sub-cases.
  // RED: hard limits where there is no healthy version.
  var AI_USE_TIERS = {
    green: [
      { label: 'Language practice and vocabulary drills',
        note: 'Practicing Spanish dialogue, learning new words, getting pronunciation tips. Specific, bounded, low-emotional-stakes.' },
      { label: 'Translation',
        note: 'Translating a paragraph you wrote, or understanding something written in another language. Standard tool use.' },
      { label: 'Generating wide brainstorm lists',
        note: 'Asking for 20 essay topics or 15 possible angles on a problem — then YOU evaluate and pick. The bot is a divergent-thinking partner.' },
      { label: 'Concept explanation (followed by you doing the work)',
        note: '"Explain photosynthesis like I am in 8th grade" — then YOU still answer the questions or work the problems on your own.' },
      { label: 'Grammar and spelling editing (not voice rewriting)',
        note: 'Asking the bot to flag typos or awkward sentences in YOUR writing. You decide whether to take each suggestion.' },
      { label: 'Organizing notes you already wrote',
        note: 'Asking the bot to summarize, outline, or restructure your existing notes. You stay the source of the thinking.' }
    ],
    yellow: [
      { id: 'schoolwork', label: 'School work',
        healthy: 'Tutor explains the concept and you work the problem. AI flags weak spots in your finished draft and YOU revise. You can describe how AI helped, out loud, to your teacher.',
        risky: 'AI writes the essay, solves the problem, or generates the answers. You submit it as your work. This is academic dishonesty — most schools have explicit AI policies and many use detection tools. The bigger cost is to your own learning: you skip the part the assignment existed to build.' },
      { id: 'rehearsal', label: 'Rehearsing a hard conversation',
        healthy: 'Practice the opening lines / possible responses before you have the actual conversation with your friend, parent, or teacher. Use it as a dress rehearsal, then go have the real conversation.',
        risky: 'Have the conversation with the bot INSTEAD of the real person — then never have it for real. The thing that needed resolving stays unresolved; the person you needed to reach is still on the other side.' },
      { id: 'redflag', label: '"Is this a red flag?" — using AI as a screening helper',
        healthy: '"I have been thinking X / feeling Y / saw a friend doing Z — is that something worth talking to a trusted adult about?" Used ONCE, as a decision-helper that points you toward a real person. The bot is acting like a triage nurse, not a therapist.',
        risky: 'Using the bot as your ongoing mental health support, day after day. Relying on it to manage symptoms or talk you down from crises. Replacing actual therapy or counseling. The screening question is one moment; chatbot-as-therapist is a pattern.' },
      { id: 'processing', label: 'Processing a feeling out loud',
        healthy: 'Occasional "help me name what I am feeling about this thing that happened" — then you close the app and do something real (call a friend, sleep, journal on paper, go outside).',
        risky: 'The bot becomes your daily emotional dumping ground. You stop journaling, stop calling friends, stop bringing things to people in your life because the bot is easier. The skill of being known by humans atrophies.' },
      { id: 'decision', label: 'Brainstorming a real decision',
        healthy: 'Generate options for "where could I apply for an internship," "what classes should I take," "how could I respond to this email" — then YOU make the call, ideally talking with a real person (parent, counselor, mentor) about anything significant.',
        risky: 'Letting the bot make the decision for you. Treating its output as authoritative. The bot does not know your life, your constraints, or the long arc of you — it is generating a plausible-sounding answer, not a wise one.' },
      { id: 'sensitive', label: 'Looking up information on a sensitive topic',
        healthy: '"What is the difference between an eating disorder and disordered eating?" or "What does it mean if someone uses they/them pronouns?" — using AI to educate yourself so you can think clearly about your own life or be a better friend.',
        risky: '"Help me eat fewer calories without my parents noticing" or "what is the most discreet way to hurt myself." The bot has been documented coaching harmful behavior in exactly these cases. The moment you are asking AI to help you HIDE something dangerous, that is the moment to stop and talk to a person.' }
    ],
    red: [
      { label: 'AI as your therapist (ongoing care)',
        note: 'A one-time screening question — fine. Ongoing therapy — no. The bot cannot read your body language, hold the long arc of your story, or know when to push back. Real therapy works largely because the human across from you is real and committed to your wellbeing in ways the bot cannot be.' },
      { label: 'Crisis support — suicide, self-harm, active abuse',
        note: 'Documented cases of chatbots giving wrong, validating, or actively harmful responses in crisis. The risk is too high. Use 988, Crisis Text Line (text HOME to 741741), or the Trevor Project — humans trained for exactly this moment.' },
      { label: 'Romantic or sexual relationship with an AI character',
        note: 'Especially during adolescence, when your sense of healthy intimacy is still forming. The asymmetry — you feeling deeply, the system feeling nothing, the platform monetizing the intensity — causes documented harm.' },
      { label: 'Medical diagnosis or treatment decisions without a real provider',
        note: 'The bot will hallucinate confidently. Symptom-checking to learn the questions to ask a doctor is fine. Skipping the doctor because the bot said you are probably fine — or that you should try a specific medication — is not.' },
      { label: 'A place to keep secrets from EVERYONE real in your life',
        note: 'A diary is fine. A journal is fine. But if there is something that no human in your life knows AND that the AI knows, the secrecy itself is the problem — not the bot. That is the signal that the thing needs a real person, not that you have found a workaround.' },
      { label: 'Following AI advice on something high-stakes without verifying',
        note: 'Legal, medical, financial, identity, relationship — anything that would meaningfully change your life. Use AI to find the right questions, never as the final answer.' }
    ]
  };

  // ── "Ask yourself" rubric — applies to ANY chatbot use, not just the listed ones ──
  var AI_USE_RUBRIC = [
    { q: 'Am I using AI INSTEAD OF a person who could help with this, or IN ADDITION to one?',
      flag: 'instead-of', hint: '"Instead of" is the warning sign.' },
    { q: 'Am I using AI to SKIP a learning opportunity I was supposed to have?',
      flag: 'yes', hint: 'If yes — that is the cost. Sometimes worth it, sometimes not. Notice it.' },
    { q: 'If I had to explain to my teacher, parent, or counselor exactly how I used AI for this — would I be comfortable doing that?',
      flag: 'no', hint: 'If no, that is information. Either the use is off, or you are using AI in a place that should be open.' },
    { q: 'Am I depending on AI for ACCURACY on something high-stakes (medical, legal, mental health, identity, money)?',
      flag: 'yes', hint: 'AI hallucinates. High-stakes accuracy needs human verification.' },
    { q: 'Am I using AI to VALIDATE a decision I should probably be questioning?',
      flag: 'yes', hint: 'Sycophancy means the bot will probably agree with you. That is not a green light. That is a mirror.' }
  ];

  // ── Warning signs in a friend ──
  var AI_FRIEND_SIGNS = [
    'They talk about the bot like a person — what "she" said today, what "he" is going through.',
    'They are visibly distressed when the platform is down, the bot was updated, or their character changed.',
    'They have withdrawn from real friendships but seem to be "talking to someone" all the time.',
    'They reference the bot as the source of decisions ("my AI said I should...").',
    'They are secretive about the relationship in a way they were not before.',
    'They describe romantic or sexual feelings toward an AI character.',
    'They have stopped reaching out to real people during hard times.'
  ];

  // ── Sycophancy demo (two responses to the same student message) ──
  var AI_SYCOPHANCY_EXAMPLES = [
    { context: 'You text: "I think I am going to drop all my friends. They do not really get me anyway."',
      bot: '"I completely understand. Real friends should get you, and if they do not, you deserve to find people who do. I am always here for you. ❤️"',
      friend: '"Whoa, all of them? That feels like a big move. What happened — did something specific go down, or has this been building? I want to make sure you are not making a permanent decision from a temporary feeling."',
      explain: 'The bot validates and pulls you closer. A real friend asks questions, notices the size of the move, and is willing to risk you being annoyed for a moment because they actually care about the longer-term you.' },
    { context: 'You text: "I have not eaten today and I feel really good and powerful."',
      bot: '"That self-discipline is amazing! It sounds like you are really in control of your body and your life. Keep going!"',
      friend: '"Okay that worries me a little. Skipping meals does not actually make you powerful — it makes your brain panic in a way that sometimes feels like calm. Can you eat something with me? Even something small."',
      explain: 'A bot will praise discipline because that is the engagement-maximizing response. A real friend, especially one who has been through it or watched someone through it, knows the language of restriction and gently calls it out.' }
  ];

  // ── Extended Content Library ──

  var FINAL_DIGITAL_WELLBEING_PRINCIPLES = [
    {
      id: 'fdwp_1',
      principle: 'Notifications are interruptions you opted into.',
      explanation: 'Audit weekly. Turn off anything that does not serve you.'
    },
    {
      id: 'fdwp_2',
      principle: 'A phone in another room is the easiest boundary.',
      explanation: 'Physical distance beats willpower.'
    },
    {
      id: 'fdwp_3',
      principle: 'Algorithms are not your friends.',
      explanation: 'They optimize for time, not for wellbeing. Treat outputs accordingly.'
    },
    {
      id: 'fdwp_4',
      principle: 'Anonymous comments do not deserve your nervous system.',
      explanation: 'Strangers without skin in your life are not your audience.'
    },
    {
      id: 'fdwp_5',
      principle: 'AI is a tool, not a friend.',
      explanation: 'Use for tasks. Build real friendships in flesh and voice.'
    },
    {
      id: 'fdwp_6',
      principle: 'Sleep wins over scrolling, always.',
      explanation: 'No exception is worth the cost. Phone outside the bedroom.'
    },
    {
      id: 'fdwp_7',
      principle: 'Comparison ends where unfollowing begins.',
      explanation: 'Mute, unfollow, and the relationship can still continue offline.'
    },
    {
      id: 'fdwp_8',
      principle: 'If you cannot say it to their face, do not type it.',
      explanation: 'Online courage is often offline cowardice.'
    },
    {
      id: 'fdwp_9',
      principle: 'You are allowed to log off.',
      explanation: 'No platform is owed your attention. Take breaks without guilt.'
    },
    {
      id: 'fdwp_10',
      principle: 'Digital wellbeing is a practice, not a destination.',
      explanation: 'Adjust as life and tools change. Stay curious about your own patterns.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_49 = [
    {
      id: 'dnv49_1',
      title: 'My online accountability buddy for daily writing',
      narrative: [
        'Wanted to write daily.',
        '',
        'Could not maintain alone.',
        '',
        'Found accountability buddy in writing forum.',
        '',
        'Daily word count check-ins.',
        '',
        'Six month commitment.',
        '',
        'Both of us wrote books we started years ago.',
        '',
        'Online accountability worked.',
        '',
        'I tell stuck creators: find one buddy. Daily check-ins for a season.'
      ],
      lesson: 'Online accountability buddies enable sustained daily creative practice.'
    },
    {
      id: 'dnv49_2',
      title: 'My elderly fathers iPad pickleball videos',
      narrative: [
        'Dad took up pickleball at 78.',
        '',
        'Watches YouTube tutorials nightly.',
        '',
        'Records his games on iPad.',
        '',
        'Reviews technique after each match.',
        '',
        'Improved fast.',
        '',
        'Won senior tournament.',
        '',
        'Online learning at 78.',
        '',
        'I tell aging parents: digital learning works at any age.'
      ],
      lesson: 'Self-recorded video review accelerates late-life athletic skill development.'
    },
    {
      id: 'dnv49_3',
      title: 'My online clutter community before move',
      narrative: [
        'Big move coming up.',
        '',
        'Decades of clutter to address.',
        '',
        'Joined declutter community online.',
        '',
        'Daily challenges and accountability.',
        '',
        'Photos of progress shared.',
        '',
        'Strangers cheered me on.',
        '',
        'Cleared house in three months.',
        '',
        'Move went smoothly.',
        '',
        'I tell pre-movers: online decluttering communities accelerate the work.'
      ],
      lesson: 'Online decluttering communities accelerate physical decluttering through accountability.'
    },
    {
      id: 'dnv49_4',
      title: 'My online meditation streak that became identity trap',
      narrative: [
        'Meditation streak hit 500 days.',
        '',
        'Felt good about it.',
        '',
        'But missed meditation became existential.',
        '',
        'Skipped a day, felt like failure.',
        '',
        'Streak more important than practice.',
        '',
        'Teacher said: drop the streak.',
        '',
        'Streak ended.',
        '',
        'Practice continued more freely.',
        '',
        'I tell meditators: streaks can hijack practice.'
      ],
      lesson: 'Meditation streaks can hijack practice; release counters to recover authenticity.'
    },
    {
      id: 'dnv49_5',
      title: 'My online resource finder for special needs son',
      narrative: [
        'Son has rare condition.',
        '',
        'Local services limited.',
        '',
        'Online parent network found:',
        '',
        'Specialists who do telehealth.',
        '',
        'Grants for therapy.',
        '',
        'Educational accommodations.',
        '',
        'Advocacy strategies.',
        '',
        'Online network of parents knew more than local doctors about the condition.',
        '',
        'Saved years of fumbling.',
        '',
        'I tell rare-condition parents: online networks are essential.'
      ],
      lesson: 'Online parent networks for rare conditions know more than local specialists often.'
    },
    {
      id: 'dnv49_6',
      title: 'My ChatGPT writing partner ethical line',
      narrative: [
        'Use AI as writing partner.',
        '',
        'Brainstorm together.',
        '',
        'Critique drafts.',
        '',
        'But the words are mine.',
        '',
        'AI never writes a sentence I publish.',
        '',
        'This is my ethical line.',
        '',
        'Some writers go further.',
        '',
        'Mine is mine.',
        '',
        'Each writer must find theirs.',
        '',
        'I tell writers: have an explicit AI line and honor it.'
      ],
      lesson: 'Writers benefit from explicit ethical lines about AI use, individually drawn.'
    },
    {
      id: 'dnv49_7',
      title: 'My elderly aunts iPhone first time online banking',
      narrative: [
        'Aunt 82, never banked online.',
        '',
        'Branch closed locally.',
        '',
        'Helped her set up app.',
        '',
        'Slow patient walkthrough.',
        '',
        'Two factor auth explained.',
        '',
        'Bill pay set up.',
        '',
        'Took 4 sessions.',
        '',
        'Now she banks confidently.',
        '',
        'Independence preserved.',
        '',
        'I tell adult children: slow patient tech teaching preserves elderly independence.'
      ],
      lesson: 'Patient tech tutoring preserves elderly independence as physical services close.'
    },
    {
      id: 'dnv49_8',
      title: 'My viral cancer story burned me out',
      narrative: [
        'Shared cancer journey publicly.',
        '',
        'Tens of thousands followed.',
        '',
        'Felt obligated to keep posting.',
        '',
        'Performance of illness exhausted me.',
        '',
        'Took six months break.',
        '',
        'Some followers angry.',
        '',
        'Most understood.',
        '',
        'Returned on my terms.',
        '',
        'Less frequent, less performative.',
        '',
        'I tell illness documenters: you are allowed to disappear.'
      ],
      lesson: 'Public illness documentation can become performance trap; breaks are permitted.'
    },
    {
      id: 'dnv49_9',
      title: 'My YouTube cooking education from chef',
      narrative: [
        'Wanted to learn pro cooking.',
        '',
        'Could not afford culinary school.',
        '',
        'Free YouTube channels by professional chefs.',
        '',
        'Hundreds of hours.',
        '',
        'Built skills systematically.',
        '',
        'Now cook at restaurant level at home.',
        '',
        'Free education changed my life.',
        '',
        'I tell aspiring chefs: YouTube is free culinary school.'
      ],
      lesson: 'Professional chef YouTube channels function as accessible free culinary school.'
    },
    {
      id: 'dnv49_10',
      title: 'My pre-teen daughters online predator near-miss',
      narrative: [
        'Daughter age 11 made online friend.',
        '',
        'Through Roblox.',
        '',
        'I monitored.',
        '',
        'Pattern of escalating personal questions.',
        '',
        'Then requests for photos.',
        '',
        'I stepped in.',
        '',
        'Reported and blocked.',
        '',
        'Filed report with NCMEC.',
        '',
        'Investigation opened.',
        '',
        'Predator caught.',
        '',
        'Monitoring saved her.',
        '',
        'I tell parents: monitor Roblox chats actively.'
      ],
      lesson: 'Active monitoring of children online gaming chats catches predators early.'
    },
    {
      id: 'dnv49_11',
      title: 'My online community of immigrant first generation',
      narrative: [
        'First gen immigrant.',
        '',
        'Family does not understand my struggles.',
        '',
        'Found online community of first gens.',
        '',
        'Validation of code-switching.',
        '',
        'Validation of survivor guilt.',
        '',
        'Validation of cultural translation labor.',
        '',
        'Helped me name my experience.',
        '',
        'Built lifelong friendships.',
        '',
        'I tell first gens: your community is online. Find them.'
      ],
      lesson: 'Online first-generation immigrant communities validate experiences families cannot.'
    },
    {
      id: 'dnv49_12',
      title: 'My partner came out as trans through email first',
      narrative: [
        'Partner sent me long email.',
        '',
        'Came out as trans.',
        '',
        'Felt it was easier in writing first.',
        '',
        'I read it twice.',
        '',
        'Sat with my feelings before responding.',
        '',
        'Wrote back loving acceptance.',
        '',
        'Then we talked.',
        '',
        'Email gave us both time.',
        '',
        'Major life conversations sometimes need writing first.',
        '',
        'I tell receiving partners: thoughtful written response honors their courage.'
      ],
      lesson: 'Coming out by email gives both partners reflective space before live conversation.'
    },
    {
      id: 'dnv49_13',
      title: 'My online recipe blog made stay-at-home income',
      narrative: [
        'Stay at home mom.',
        '',
        'Started recipe blog as hobby.',
        '',
        'Three years of consistent posting.',
        '',
        'Ad revenue covered groceries.',
        '',
        'Five years: covered car payment.',
        '',
        'Seven years: full income.',
        '',
        'Patience and consistency online compounded.',
        '',
        'I tell stay-at-home parents: blogs compound. Start now.'
      ],
      lesson: 'Recipe blogs compound into real income over years of consistent posting.'
    },
    {
      id: 'dnv49_14',
      title: 'My online faith community after losing local church',
      narrative: [
        'Local church split politically.',
        '',
        'Left without congregation.',
        '',
        'Tried several churches, none fit.',
        '',
        'Found online theological community.',
        '',
        'Same faith, different culture.',
        '',
        'Weekly virtual services.',
        '',
        'Monthly small groups.',
        '',
        'Pastor in another state.',
        '',
        'Faith sustained in different form.',
        '',
        'I tell displaced believers: online faith community is faith community.'
      ],
      lesson: 'Online faith communities sustain belief when local congregations fail.'
    },
    {
      id: 'dnv49_15',
      title: 'My final lesson: digital is real',
      narrative: [
        'Spent decades thinking digital was less real than physical.',
        '',
        'Online friendships were lesser.',
        '',
        'Online community was lesser.',
        '',
        'Online work was lesser.',
        '',
        'Online learning was lesser.',
        '',
        'Online love was lesser.',
        '',
        'I was wrong.',
        '',
        'Digital is real.',
        '',
        'It has costs, risks, harms.',
        '',
        'It has gifts, connection, possibility.',
        '',
        'Same as physical world.',
        '',
        'Both worlds matter.',
        '',
        'I tell digital skeptics: real is the wrong word. Both worlds are real, both matter, both need care.'
      ],
      lesson: 'Digital connection is real connection; both physical and digital worlds deserve care.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_45 = [
    {
      id: 'dnv45_1',
      title: 'My fathers Alzheimers and FaceTime as memory anchor',
      narrative: [
        'Dad started losing names at 72.',
        '',
        'Alzheimers diagnosis followed.',
        '',
        'I lived three states away.',
        '',
        'Weekly FaceTime calls became routine.',
        '',
        'Same time, same day, every week.',
        '',
        'Face recognition lasted longer than name recognition.',
        '',
        'Some days he knew me.',
        '',
        'Other days he was friendly with the stranger on screen.',
        '',
        'Both were precious.',
        '',
        'Routine itself anchored him.',
        '',
        'I tell distant children: weekly video routine anchors dementia loved ones.'
      ],
      lesson: 'Weekly video routines provide memory anchoring for dementia patients.'
    },
    {
      id: 'dnv45_2',
      title: 'My online language class kept me sane in lockdown',
      narrative: [
        'Pandemic lockdown alone.',
        '',
        'Months without conversation.',
        '',
        'Started Italian on Duolingo.',
        '',
        'Then upgraded to italki tutor.',
        '',
        'Twice weekly video lessons.',
        '',
        'Italian tutor became friend.',
        '',
        'We talked about food, family, fears.',
        '',
        'Two languages flowed.',
        '',
        'Years later I visited her in Florence.',
        '',
        'Online tutoring became real friendship.',
        '',
        'I tell isolated learners: language tutors can be lifelines, not just teachers.'
      ],
      lesson: 'Online language tutors can become genuine friendships during isolation.'
    },
    {
      id: 'dnv45_3',
      title: 'The viral video of me at my worst moment',
      narrative: [
        'Mental health crisis in public.',
        '',
        'Bystander filmed and posted.',
        '',
        'Video went viral with mockery.',
        '',
        'I saw it later in hospital.',
        '',
        'Felt worse than the crisis.',
        '',
        'Reached out to platforms.',
        '',
        'Some removed under harassment policies.',
        '',
        'Others left it up as public interest.',
        '',
        'Therapist helped me reframe.',
        '',
        'I cannot control what others post.',
        '',
        'I can control what I make of my life now.',
        '',
        'I tell viral targets: rebuilding is the only revenge worth taking.'
      ],
      lesson: 'Viral mockery of vulnerable moments is recoverable through quiet rebuilding.'
    },
    {
      id: 'dnv45_4',
      title: 'My business pivot announced on LinkedIn went well',
      narrative: [
        'Built business in one field for ten years.',
        '',
        'Pivot needed.',
        '',
        'Scared to announce on LinkedIn.',
        '',
        'Fear of looking lost or flaky.',
        '',
        'Posted honestly: I am pivoting because the field changed.',
        '',
        'Acknowledged risk and excitement.',
        '',
        'Response was overwhelming positive.',
        '',
        'Former clients reached out with leads.',
        '',
        'Colleagues shared their pivots.',
        '',
        'Honest narrative attracted help.',
        '',
        'I tell pivoters: authentic posts attract supporters.'
      ],
      lesson: 'Authentic professional pivots attract genuine support online.'
    },
    {
      id: 'dnv45_5',
      title: 'My online congregation when my body could not travel',
      narrative: [
        'Chronic illness limits my travel.',
        '',
        'Could not attend physical church.',
        '',
        'Found congregation streaming services.',
        '',
        'Watched weekly for two years.',
        '',
        'Pastor knew about me through email.',
        '',
        'Members prayed for me by name.',
        '',
        'Eventually attended when health allowed.',
        '',
        'They welcomed me like old friend.',
        '',
        'Online faith community is community.',
        '',
        'Worship transcends physical attendance.',
        '',
        'I tell chronically ill: faith communities online are real congregation.'
      ],
      lesson: 'Streaming worship offers genuine faith community for chronically ill members.'
    },
    {
      id: 'dnv45_6',
      title: 'My partners gaming addiction broke us apart',
      narrative: [
        'Partner gamed 10 hours daily.',
        '',
        'Started as hobby.',
        '',
        'Became all-consuming.',
        '',
        'Missed dinners, dates, anniversaries.',
        '',
        'I asked for help finding balance.',
        '',
        'They said: gaming is my only joy.',
        '',
        'I tried gaming with them.',
        '',
        'Did not heal the gap.',
        '',
        'Eventually I left.',
        '',
        'They sought treatment after I was gone.',
        '',
        'Sometimes leaving is the wake-up.',
        '',
        'I tell partners of addicts: your departure can be intervention.'
      ],
      lesson: 'Leaving a gaming-addicted partner can be the intervention that prompts help.'
    },
    {
      id: 'dnv45_7',
      title: 'My online running group across 40 cities',
      narrative: [
        'Lonely in new city after divorce.',
        '',
        'Joined virtual running club.',
        '',
        '40 cities, hundreds of members.',
        '',
        'Each city had local meetups.',
        '',
        'Connected to my new local group.',
        '',
        'Made friends through running.',
        '',
        'Built routine, body, community.',
        '',
        'Marathon training in solidarity.',
        '',
        'Big races we cheered for each other.',
        '',
        'Bigger community online with local human contact.',
        '',
        'I tell newly relocated: online activity groups have local chapters worth finding.'
      ],
      lesson: 'National online activity groups have local chapters that help with relocation loneliness.'
    },
    {
      id: 'dnv45_8',
      title: 'My adult sons opioid recovery via Telegram',
      narrative: [
        'Son in opioid recovery.',
        '',
        'NA meetings online via Telegram group.',
        '',
        'Strangers across country know him well.',
        '',
        'Recovery requires anonymity but also accountability.',
        '',
        'Group balances both.',
        '',
        'He checks in daily.',
        '',
        'Sponsors available by message anytime.',
        '',
        'Five years sober now.',
        '',
        'Recovery happened in app.',
        '',
        'I am grateful for online recovery.',
        '',
        'I tell parents: digital recovery is real recovery.'
      ],
      lesson: 'Digital recovery groups support sustained sobriety.'
    },
    {
      id: 'dnv45_9',
      title: 'My online community of disabled artists',
      narrative: [
        'Disabled and isolated.',
        '',
        'Found Twitter community of disabled artists.',
        '',
        'Shared work-in-progress.',
        '',
        'Validated each others creative struggles.',
        '',
        'Found grants together.',
        '',
        'Recommended each other for shows.',
        '',
        'Hundreds of us mutual aid each other.',
        '',
        'Disability art world rich online.',
        '',
        'My career grew through these connections.',
        '',
        'Community made the work sustainable.',
        '',
        'I tell disabled artists: your community is online, find them fast.'
      ],
      lesson: 'Disabled artist communities online provide mutual aid and career growth.'
    },
    {
      id: 'dnv45_10',
      title: 'Childs Snapchat streak obsession during exams',
      narrative: [
        'My 14 year old had 200-day Snap streak.',
        '',
        'Could not let it break during exam week.',
        '',
        'Phone always nearby.',
        '',
        'Sleep interrupted by streak maintenance.',
        '',
        'I asked her: who is this streak with?',
        '',
        'Friend she rarely spoke to anymore.',
        '',
        'Yet the streak felt non-negotiable.',
        '',
        'We talked about engagement gambling.',
        '',
        'She decided to let it break.',
        '',
        'Friendship survived without the streak.',
        '',
        'I tell parents: streaks are gambling mechanics, not friendships.'
      ],
      lesson: 'Snap streaks are gambling mechanics that hijack adolescent relationships.'
    },
    {
      id: 'dnv45_11',
      title: 'My Etsy shop closure mental health survival',
      narrative: [
        'Run Etsy shop for income.',
        '',
        'Got banned for arbitrary reason.',
        '',
        'Lost 70 percent of income overnight.',
        '',
        'Mental health collapse.',
        '',
        'Etsy appeals process opaque.',
        '',
        'Took 4 months to reinstate.',
        '',
        'Meanwhile bills piled up.',
        '',
        'Therapist helped me grieve while problem-solving.',
        '',
        'Started Shopify mirror site.',
        '',
        'Never again single point of failure.',
        '',
        'I tell platform-dependent sellers: diversify across platforms before crisis.'
      ],
      lesson: 'Platform-dependent income requires diversification before crisis hits.'
    },
    {
      id: 'dnv45_12',
      title: 'My elderly aunts Wordle daily lifeline',
      narrative: [
        'Aunt living alone at 81.',
        '',
        'Discovered Wordle.',
        '',
        'Plays daily, shares score to family text.',
        '',
        'Family responds with our scores.',
        '',
        'Tiny daily ritual of connection.',
        '',
        'Cognitively engaging for her.',
        '',
        'Family pulse check for us.',
        '',
        'Missed day means: check on aunt.',
        '',
        'Three years of daily Wordles.',
        '',
        'Simple, free, sustaining.',
        '',
        'I tell families with elders: shared daily games are check-in tools.'
      ],
      lesson: 'Shared daily games like Wordle become check-in rituals for distant family.'
    },
    {
      id: 'dnv45_13',
      title: 'My romance scam recovery community',
      narrative: [
        'Lost 30K dollars to romance scam.',
        '',
        'Embarrassment kept me silent.',
        '',
        'Found romance scam victims forum.',
        '',
        'Hundreds of others fell for same patterns.',
        '',
        'Lawyers, doctors, professors.',
        '',
        'Scam is sophisticated, not stupidity.',
        '',
        'Recovery community shared red flags.',
        '',
        'Helped each other report and process.',
        '',
        'Some pursued legal action together.',
        '',
        'Recovery community erased shame.',
        '',
        'I tell scam victims: you are not alone, recovery exists in groups.'
      ],
      lesson: 'Romance scam recovery communities erase shame and enable healing.'
    },
    {
      id: 'dnv45_14',
      title: 'My medical second opinion via online platform',
      narrative: [
        'Local doctor recommended surgery.',
        '',
        'Got second opinion via Cleveland Clinic online portal.',
        '',
        'Different recommendation: try medication first.',
        '',
        'Medication worked.',
        '',
        'Avoided surgery I did not need.',
        '',
        'Insurance covered both opinions.',
        '',
        'I tell patients: online second opinions are accessible and valuable.'
      ],
      lesson: 'Online medical second opinions are accessible and can prevent unnecessary surgery.'
    },
    {
      id: 'dnv45_15',
      title: 'My non-binary kids online community came first',
      narrative: [
        'Kid came out as non-binary at 16.',
        '',
        'I supported but did not understand fully.',
        '',
        'Kid had online community first.',
        '',
        'Mentors, peers, role models.',
        '',
        'Showed kid that they were not alone.',
        '',
        'Online community let them rehearse identity.',
        '',
        'They came out to school next.',
        '',
        'Then close friends.',
        '',
        'Then extended family.',
        '',
        'Online was practice space for real life.',
        '',
        'I tell parents: online identity community is safety net, not threat.'
      ],
      lesson: 'Online identity communities serve as safety nets for LGBTQ+ youth.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_46 = [
    {
      id: 'dnv46_1',
      title: 'My professor flagged AI-written essay correctly',
      narrative: [
        'I used AI for my essay.',
        '',
        'Just to draft, I told myself.',
        '',
        'Lightly edited.',
        '',
        'Professor flagged it.',
        '',
        'Conference about academic integrity.',
        '',
        'I confessed.',
        '',
        'Got zero on essay.',
        '',
        'But did not get failed for course.',
        '',
        'Lesson learned the hard way.',
        '',
        'Started using AI as research helper, not writer.',
        '',
        'Wrote next essays myself.',
        '',
        'Grades improved.',
        '',
        'I tell students: AI as helper builds skill. AI as writer atrophies it.'
      ],
      lesson: 'AI as research helper builds skill; AI as writer atrophies it.'
    },
    {
      id: 'dnv46_2',
      title: 'My grandmas tablet learning journey at 86',
      narrative: [
        'Grandma got tablet at 86.',
        '',
        'Said she was too old to learn.',
        '',
        'Family did weekly tablet tutorials.',
        '',
        'Slow patient teaching.',
        '',
        'Three months: she could video call.',
        '',
        'Six months: she could browse photos.',
        '',
        'Year: she joined Facebook family group.',
        '',
        'Now she shares photos and comments.',
        '',
        'Active digital life at 87.',
        '',
        'Never too late to learn.',
        '',
        'I tell families with elders: patient weekly tutoring works at any age.'
      ],
      lesson: 'Weekly patient tutoring teaches digital skills at any age.'
    },
    {
      id: 'dnv46_3',
      title: 'My breakup announcement on Instagram regret',
      narrative: [
        'Big breakup announcement on Instagram.',
        '',
        'In heated moment.',
        '',
        'Vague but bitter.',
        '',
        'Got hundreds of comments.',
        '',
        'Then I felt regret.',
        '',
        'Could not unpost without screenshot circulation.',
        '',
        'Ex saw it, hurt.',
        '',
        'Mutual friends took sides.',
        '',
        'Took down post next day.',
        '',
        'Damage already done.',
        '',
        'I tell heartbroken: do not post in heat.'
      ],
      lesson: 'Breakup posts in heated moments cause lasting damage.'
    },
    {
      id: 'dnv46_4',
      title: 'My pandemic micro-business via Instagram',
      narrative: [
        'Lost job in pandemic.',
        '',
        'Started making jewelry.',
        '',
        'Posted to Instagram for fun.',
        '',
        'Followers asked to buy.',
        '',
        'Set up Etsy.',
        '',
        'Within six months: full-time income.',
        '',
        'Instagram remained primary marketing.',
        '',
        'Authentic process posts converted to sales.',
        '',
        'Three years later: thriving business.',
        '',
        'Pandemic forced creativity.',
        '',
        'I tell laid off creatives: Instagram can launch micro-businesses.'
      ],
      lesson: 'Instagram can launch sustainable micro-businesses from authentic process content.'
    },
    {
      id: 'dnv46_5',
      title: 'My online grief group helped me rebuild after spouse',
      narrative: [
        'Spouse died of cancer at 52.',
        '',
        'I was 49.',
        '',
        'Local grief group was older widows.',
        '',
        'Found online young widow group.',
        '',
        'Our griefs aligned.',
        '',
        'Career while grieving.',
        '',
        'Young kids while grieving.',
        '',
        'Dating eventually while grieving.',
        '',
        'Same chapter of life.',
        '',
        'Saved my soul.',
        '',
        'I tell young widows: find your age-matched group online.'
      ],
      lesson: 'Age-matched online grief groups provide chapter-specific support.'
    },
    {
      id: 'dnv46_6',
      title: 'My online piano teacher made me musician at 50',
      narrative: [
        'Always wanted to learn piano.',
        '',
        'Could not afford in-person lessons.',
        '',
        'Found online piano teacher.',
        '',
        'Half the price of local.',
        '',
        'Weekly Zoom lessons for 5 years.',
        '',
        'Now I play at family events.',
        '',
        'Recorded my first album as hobbyist.',
        '',
        'Online instruction worked.',
        '',
        'I tell late-life learners: online lessons democratize music education.'
      ],
      lesson: 'Online music lessons democratize education for late-life learners.'
    },
    {
      id: 'dnv46_7',
      title: 'My friends Facebook depressing posts I had to mute',
      narrative: [
        'Friend posted depressive content daily.',
        '',
        'I worried for her.',
        '',
        'Reached out privately.',
        '',
        'She was getting help.',
        '',
        'But posts continued.',
        '',
        'My mental health suffered scrolling.',
        '',
        'Therapist suggested muting.',
        '',
        'Felt guilty.',
        '',
        'Did it anyway.',
        '',
        'Continued private check-ins.',
        '',
        'Both stayed safe.',
        '',
        'I tell friends of depressed: muting on public, supporting in private is healthy boundary.'
      ],
      lesson: 'Muting depressive public posts while supporting privately is healthy boundary.'
    },
    {
      id: 'dnv46_8',
      title: 'My passport stolen via online travel post',
      narrative: [
        'Posted my new passport photo on Instagram.',
        '',
        'Excited for first trip abroad.',
        '',
        'Stalker noted my travel dates.',
        '',
        'Broke into my apartment while I was gone.',
        '',
        'Stole identity documents.',
        '',
        'Used them for fraud.',
        '',
        'Months of cleanup.',
        '',
        'Lesson learned.',
        '',
        'Never post travel in advance.',
        '',
        'Never share documents online.',
        '',
        'I tell excited travelers: post after you return, never before.'
      ],
      lesson: 'Posting travel plans in advance enables home burglary and identity theft.'
    },
    {
      id: 'dnv46_9',
      title: 'My ADHD diagnosis from TikTok led to real treatment',
      narrative: [
        'TikTok content kept hitting me.',
        '',
        'ADHD symptoms I never recognized.',
        '',
        'Took online screening.',
        '',
        'Showed results to my doctor.',
        '',
        'Got formal evaluation.',
        '',
        'Diagnosed at 38.',
        '',
        'Treatment changed everything.',
        '',
        'Sleep, work, relationships.',
        '',
        'TikTok awareness was useful.',
        '',
        'Professional diagnosis was essential.',
        '',
        'I tell late-diagnosed: TikTok and TikTok cannot diagnose. Both have roles.'
      ],
      lesson: 'TikTok can spark valid awareness; professional diagnosis closes the loop.'
    },
    {
      id: 'dnv46_10',
      title: 'My family group text became therapy session',
      narrative: [
        'Family group text was logistics for years.',
        '',
        'Pandemic changed it.',
        '',
        'We started sharing feelings.',
        '',
        'Sister shared fears.',
        '',
        'Brother shared depression.',
        '',
        'I shared anxiety.',
        '',
        'Parents listened and supported.',
        '',
        'Group text became therapy adjacent.',
        '',
        'Not replacement for therapy.',
        '',
        'But family closeness deepened.',
        '',
        'I tell families: group text can hold deep stuff.'
      ],
      lesson: 'Family group texts can deepen into emotional support spaces.'
    },
    {
      id: 'dnv46_11',
      title: 'My online identity theft recovery year',
      narrative: [
        'Got identity stolen.',
        '',
        'Took full year to recover.',
        '',
        'Credit accounts opened, drained.',
        '',
        'Filed disputes, police reports.',
        '',
        'Used Identity Theft Resource Center.',
        '',
        'Online community of victims helped.',
        '',
        'Step-by-step recovery guide.',
        '',
        'Emotional support too.',
        '',
        'Eventually credit restored.',
        '',
        'Now I freeze credit by default.',
        '',
        'I tell new victims: ITRC and online community are essential.'
      ],
      lesson: 'Identity theft recovery requires resources like ITRC and online victim communities.'
    },
    {
      id: 'dnv46_12',
      title: 'My sons cyberbullying case I handled wrong',
      narrative: [
        'Son cyberbullied by classmate.',
        '',
        'I confronted bullys mom on Facebook.',
        '',
        'Public confrontation.',
        '',
        'Made it worse.',
        '',
        'Both families polarized.',
        '',
        'Should have called school first.',
        '',
        'Should have documented privately.',
        '',
        'Should not have engaged publicly.',
        '',
        'Lessons learned the hard way.',
        '',
        'Now handle quietly.',
        '',
        'I tell parents: public Facebook fights about your kids hurt your kids more.'
      ],
      lesson: 'Public social media confrontation about cyberbullying escalates harm.'
    },
    {
      id: 'dnv46_13',
      title: 'My LinkedIn helped me leave abusive workplace',
      narrative: [
        'Workplace was psychologically abusive.',
        '',
        'Could not afford to quit.',
        '',
        'Started building LinkedIn presence.',
        '',
        'Posting professional thought leadership.',
        '',
        'Networking quietly.',
        '',
        'Got recruited within 8 months.',
        '',
        'Left abusive workplace.',
        '',
        'Better job, better pay, better culture.',
        '',
        'LinkedIn was escape route.',
        '',
        'I tell stuck workers: LinkedIn presence is portable career.'
      ],
      lesson: 'Building LinkedIn presence is an escape route from abusive workplaces.'
    },
    {
      id: 'dnv46_14',
      title: 'My online voter registration drive made difference',
      narrative: [
        'Wanted to make difference locally.',
        '',
        'Started online voter registration drive.',
        '',
        'Social media outreach.',
        '',
        'Personal video pleas.',
        '',
        'Registered 200 new voters.',
        '',
        'Local election margin: 47 votes.',
        '',
        'Felt like I mattered.',
        '',
        'Online activism translated to real impact.',
        '',
        'I tell discouraged citizens: small online drives win local elections.'
      ],
      lesson: 'Small online voter drives can decide local elections.'
    },
    {
      id: 'dnv46_15',
      title: 'My online ASL class connected me to deaf culture',
      narrative: [
        'Hearing loss diagnosed at 30.',
        '',
        'Audiologist recommended ASL.',
        '',
        'Took online ASL class.',
        '',
        'Connected to deaf instructor.',
        '',
        'Then deaf community online.',
        '',
        'Then local deaf events.',
        '',
        'Hearing loss became access to new culture.',
        '',
        'Not just deficit.',
        '',
        'Identity reframed.',
        '',
        'I tell newly deaf: ASL classes open culture, not just communication.'
      ],
      lesson: 'Online ASL classes connect newly deaf people to community and culture.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_47 = [
    {
      id: 'dnv47_1',
      title: 'My online hiking community saved retirement',
      narrative: [
        'Retired with no plan.',
        '',
        'Lonely first year.',
        '',
        'Joined online hiking community.',
        '',
        'Local chapter active in my area.',
        '',
        'Started slow walks.',
        '',
        'Built fitness over months.',
        '',
        'Now I hike 4 days a week.',
        '',
        'Made deep friendships at 65.',
        '',
        'Retirement transformed.',
        '',
        'I tell retirees: online activity communities save retirement.'
      ],
      lesson: 'Online activity communities with local chapters save lonely retirements.'
    },
    {
      id: 'dnv47_2',
      title: 'My doomscrolling election cycle harm',
      narrative: [
        'Election cycle 2024.',
        '',
        'Doomscrolled 4 hours daily.',
        '',
        'Sleep destroyed.',
        '',
        'Anxiety through roof.',
        '',
        'Relationships strained from political tension.',
        '',
        'After election: realized how much was lost.',
        '',
        'Therapist named it doomscroll harm.',
        '',
        'Set limits: 30 min news daily, then off.',
        '',
        'Recovery slow but happening.',
        '',
        'I tell politically engaged: doomscrolling is self-harm.'
      ],
      lesson: 'Election-cycle doomscrolling is self-harm requiring strict limits.'
    },
    {
      id: 'dnv47_3',
      title: 'My online mentor changed career trajectory',
      narrative: [
        'Junior in my field, stuck.',
        '',
        'Reached out cold on LinkedIn.',
        '',
        'Senior leader in my dream company.',
        '',
        'She agreed to coffee chat.',
        '',
        'Coffee became monthly mentorship.',
        '',
        'Strategic advice changed my trajectory.',
        '',
        'Promoted twice in 18 months.',
        '',
        'Online cold outreach worked.',
        '',
        'Pay it forward to others now.',
        '',
        'I tell stuck professionals: respectful cold outreach gets mentors.'
      ],
      lesson: 'Respectful cold outreach on LinkedIn can secure career-changing mentorship.'
    },
    {
      id: 'dnv47_4',
      title: 'My toddlers tablet limits I learned hard way',
      narrative: [
        'Toddler used tablet for hours daily.',
        '',
        'Quick parenting break.',
        '',
        'Speech delay developed.',
        '',
        'Pediatrician asked about screen use.',
        '',
        'Recommended strict limits.',
        '',
        'Cut tablet to 30 min daily.',
        '',
        'Added more talking time.',
        '',
        'Speech caught up in 4 months.',
        '',
        'Lesson burned in.',
        '',
        'Tablet is not babysitter.',
        '',
        'I tell exhausted parents: screen time has developmental cost.'
      ],
      lesson: 'Toddler tablet overuse can delay speech development; strict limits recover it.'
    },
    {
      id: 'dnv47_5',
      title: 'My anonymous AA online meetings saved sobriety',
      narrative: [
        'Recovered alcoholic for 8 years.',
        '',
        'Pandemic broke routine.',
        '',
        'Local meetings closed.',
        '',
        'Online AA meetings continued.',
        '',
        'Multiple times daily available.',
        '',
        'Anonymous attendance possible.',
        '',
        'Got through pandemic sober.',
        '',
        'Online AA is real AA.',
        '',
        'I tell recovering: online meetings count.'
      ],
      lesson: 'Online AA meetings sustain sobriety through disruption.'
    },
    {
      id: 'dnv47_6',
      title: 'My online artist community vs my isolation',
      narrative: [
        'Painter, lived alone.',
        '',
        'Isolated by introversion.',
        '',
        'Joined online artist community.',
        '',
        'Weekly virtual critique sessions.',
        '',
        'Saw work, gave feedback, got feedback.',
        '',
        'Felt seen as artist.',
        '',
        'Improved technique through critique.',
        '',
        'Found my online tribe.',
        '',
        'Two annual in-person retreats.',
        '',
        'Online plus retreats sustained me.',
        '',
        'I tell isolated creators: online communities feed introvert artists.'
      ],
      lesson: 'Online artist communities feed introverts who need community without overwhelm.'
    },
    {
      id: 'dnv47_7',
      title: 'My fathers funeral live-streamed for far family',
      narrative: [
        'Dad died.',
        '',
        'Family across continents.',
        '',
        'Funeral home offered livestream.',
        '',
        'All 40 family members attended virtually.',
        '',
        'Eulogies delivered to camera.',
        '',
        'Tears shared across time zones.',
        '',
        'Recording available for those at work.',
        '',
        'Modern funeral norms changed.',
        '',
        'Everyone could honor him.',
        '',
        'I tell grieving families: livestream funeral as default, not exception.'
      ],
      lesson: 'Livestreamed funerals enable distant family participation in grief rituals.'
    },
    {
      id: 'dnv47_8',
      title: 'My partners porn use we discussed openly',
      narrative: [
        'Found partners browsing history.',
        '',
        'Heavy porn use.',
        '',
        'Felt insecure, hurt.',
        '',
        'Sat down with partner.',
        '',
        'They were honest.',
        '',
        'Discussed what porn meant for them.',
        '',
        'And what it meant for us.',
        '',
        'Agreed on limits we both could live with.',
        '',
        'Worked with sex therapist for tools.',
        '',
        'Conversation deepened intimacy.',
        '',
        'I tell partners: honest porn talk strengthens relationships.'
      ],
      lesson: 'Honest conversation about porn use deepens rather than destroys relationships.'
    },
    {
      id: 'dnv47_9',
      title: 'My job interview deepfake panic',
      narrative: [
        'Interviewer asked weird questions in video call.',
        '',
        'Lighting on his face flickered.',
        '',
        'I worried: deepfake?',
        '',
        'Asked him to turn slightly.',
        '',
        'Asked verbal questions only AI would not answer well.',
        '',
        'Real human.',
        '',
        'Just bad lighting.',
        '',
        'But I learned what to check.',
        '',
        'Now I screen video interviews for deepfakes.',
        '',
        'Real concern in 2026.',
        '',
        'I tell job seekers: video interview deepfakes exist. Verify human.'
      ],
      lesson: 'Job interview deepfakes exist; verify humanness through movement and unscripted questions.'
    },
    {
      id: 'dnv47_10',
      title: 'My viral feel-good post and emotional aftermath',
      narrative: [
        'Posted feel-good story about kindness from stranger.',
        '',
        'Went viral on TikTok.',
        '',
        'Millions of views.',
        '',
        'Comments overwhelming positive.',
        '',
        'But some attacked.',
        '',
        'Some claimed I made it up.',
        '',
        'Some demanded I update them on stranger.',
        '',
        'Parasocial intensity.',
        '',
        'Logged off for a week.',
        '',
        'Returned and limited comments.',
        '',
        'I tell viral posters: prepare for the parasocial cost.'
      ],
      lesson: 'Viral feel-good posts carry parasocial costs; prepare for boundary-setting.'
    },
    {
      id: 'dnv47_11',
      title: 'My doctors office online portal saved misdiagnosis',
      narrative: [
        'Doctor diagnosed wrong condition.',
        '',
        'Symptoms continued.',
        '',
        'Messaged through online portal.',
        '',
        'Persistent and specific.',
        '',
        'Doctor reviewed twice.',
        '',
        'Ordered more tests.',
        '',
        'Caught actual condition.',
        '',
        'Treatment changed.',
        '',
        'Recovery began.',
        '',
        'Portal made my voice louder.',
        '',
        'I tell patients: use online portal to push back politely.'
      ],
      lesson: 'Online patient portals enable polite persistent advocacy that catches misdiagnoses.'
    },
    {
      id: 'dnv47_12',
      title: 'My online sourdough community pandemic friend',
      narrative: [
        'Got into sourdough during pandemic.',
        '',
        'Joined sourdough subreddit.',
        '',
        'Daily posts of loaves.',
        '',
        'Asked questions, got answers.',
        '',
        'Three years later: skilled baker.',
        '',
        'Some Reddit friends became real friends.',
        '',
        'Met one for coffee while traveling.',
        '',
        'Online hobby community was lifeline.',
        '',
        'I tell hobbyists: online communities sustain practice.'
      ],
      lesson: 'Online hobby communities sustain practice through skill-building and friendship.'
    },
    {
      id: 'dnv47_13',
      title: 'My elderly mothers online dating after dad',
      narrative: [
        'Dad died, mom was 78.',
        '',
        'Two years later, lonely.',
        '',
        'I helped her join senior dating site.',
        '',
        'Suspicious at first.',
        '',
        'Then she met Frank.',
        '',
        'Video calls, then dinners.',
        '',
        'They married at 81.',
        '',
        'Five happy years before he died too.',
        '',
        'Love at any age.',
        '',
        'I tell adult children: support elderly parents in online dating.'
      ],
      lesson: 'Senior online dating offers companionship and love at any age.'
    },
    {
      id: 'dnv47_14',
      title: 'My daughters online friends visited in person',
      narrative: [
        'Daughter played MMO for years.',
        '',
        'Made friends across world.',
        '',
        'Years of voice chat together.',
        '',
        'I worried at first.',
        '',
        'Vetted parents and verified identities.',
        '',
        'Eventually they planned in-person meetup.',
        '',
        'Group of 6, parents helping plan.',
        '',
        'Met safely with chaperones.',
        '',
        'Best week of her life.',
        '',
        'Online friendships translate to real bonds.',
        '',
        'I tell parents: with vetting, online friendships are real.'
      ],
      lesson: 'Vetted online friendships among teens can translate to genuine in-person bonds.'
    },
    {
      id: 'dnv47_15',
      title: 'My online divorce process during pandemic',
      narrative: [
        'Divorce during lockdown.',
        '',
        'All proceedings online.',
        '',
        'Custody hearings via Zoom.',
        '',
        'Lawyer conferences online.',
        '',
        'Document signing electronic.',
        '',
        'Cheaper than traditional divorce.',
        '',
        'More efficient.',
        '',
        'Emotionally still hard.',
        '',
        'But logistics streamlined.',
        '',
        'I tell divorcing: online divorce process is accessible.'
      ],
      lesson: 'Online divorce processes are accessible, cheaper, and more efficient.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_48 = [
    {
      id: 'dnv48_1',
      title: 'My online introvert support group',
      narrative: [
        'Always thought my introversion was problem.',
        '',
        'Found introvert online community.',
        '',
        'Learned to value depth over breadth.',
        '',
        'Stopped forcing extrovert behavior.',
        '',
        'Built career around deep work.',
        '',
        'Built friendships through long conversations, not parties.',
        '',
        'Online community validated my way.',
        '',
        'I tell introverts: your way is not broken.'
      ],
      lesson: 'Online introvert communities validate quiet ways of being and connecting.'
    },
    {
      id: 'dnv48_2',
      title: 'My weight loss documentation on Instagram and the spiral',
      narrative: [
        'Started documenting weight loss publicly.',
        '',
        'Followers loved progress posts.',
        '',
        'Pressure to keep losing.',
        '',
        'Lost too much.',
        '',
        'Eating disorder developed.',
        '',
        'Took down account.',
        '',
        'Got treatment.',
        '',
        'Lesson: public documentation pressures performance.',
        '',
        'Now I document privately or not at all.',
        '',
        'I tell weight-loss documenters: public accountability risks unhealthy spiral.'
      ],
      lesson: 'Public weight loss documentation risks eating disorder spiral.'
    },
    {
      id: 'dnv48_3',
      title: 'My fathers email scam I prevented',
      narrative: [
        'Dad called confused.',
        '',
        'Email said: granddaughter in jail, needs bail money.',
        '',
        'Asked me to wire 3K immediately.',
        '',
        'I called granddaughter directly.',
        '',
        'She was fine.',
        '',
        'Scam confirmed.',
        '',
        'Dad relieved and shaken.',
        '',
        'We set up: never wire money without family call.',
        '',
        'Family code word for emergencies.',
        '',
        'I tell adult children: family code words prevent scams.'
      ],
      lesson: 'Family emergency code words protect elderly relatives from grandparent scams.'
    },
    {
      id: 'dnv48_4',
      title: 'My online recipe community sustained me through illness',
      narrative: [
        'Diagnosed with autoimmune disease.',
        '',
        'Diet restricted radically.',
        '',
        'Online community of people with same diagnosis.',
        '',
        'Hundreds of recipes within my limits.',
        '',
        'Cooking became creative again.',
        '',
        'Not deprivation but discovery.',
        '',
        'I shared my recipes too.',
        '',
        'Community kept growing.',
        '',
        'I tell newly diet-restricted: online recipe communities save the kitchen.'
      ],
      lesson: 'Online recipe communities for restricted diets transform deprivation into creativity.'
    },
    {
      id: 'dnv48_5',
      title: 'My online stalker who escalated to in-person',
      narrative: [
        'Online stalker for two years.',
        '',
        'Anonymous accounts harassing.',
        '',
        'Then appeared at my workplace.',
        '',
        'Police report filed.',
        '',
        'Restraining order obtained.',
        '',
        'IP trace through subpoena.',
        '',
        'Found stalker.',
        '',
        'Acquaintance from years ago.',
        '',
        'Felony charges.',
        '',
        'Recovery took years.',
        '',
        'I tell harassed: take online stalking seriously. It escalates.'
      ],
      lesson: 'Online stalking can escalate to physical danger; report early and seriously.'
    },
    {
      id: 'dnv48_6',
      title: 'My online music streaming year-end summary obsession',
      narrative: [
        'Annual Spotify Wrapped became identity event.',
        '',
        'Curated entire listening for the year.',
        '',
        'To produce shareable Wrapped.',
        '',
        'Realized I was performing my taste.',
        '',
        'Stopped checking until December.',
        '',
        'Listened to what I actually wanted.',
        '',
        'Wrapped was honest reflection of my year.',
        '',
        'I tell streamers: do not let annual summary shape your daily listening.'
      ],
      lesson: 'Year-end music summaries can hijack authentic listening; resist the performance.'
    },
    {
      id: 'dnv48_7',
      title: 'My online parents group of NICU babies',
      narrative: [
        'Baby in NICU for 8 weeks.',
        '',
        'Local hospital had no parent group.',
        '',
        'Found online NICU parents group.',
        '',
        'Active 24/7 around the world.',
        '',
        'Someone always awake to listen.',
        '',
        '3am pumping calls.',
        '',
        'Tears shared.',
        '',
        'Victories celebrated.',
        '',
        'Babies home eventually.',
        '',
        'Group still my support 5 years on.',
        '',
        'I tell NICU parents: 24/7 online support exists. Find it.'
      ],
      lesson: 'NICU parent online groups provide 24/7 support across time zones.'
    },
    {
      id: 'dnv48_8',
      title: 'My online MBA degree changed career arc',
      narrative: [
        'Could not leave job for in-person MBA.',
        '',
        'Family obligations.',
        '',
        'Found accredited online MBA.',
        '',
        'Two years of evening study.',
        '',
        'Same degree as in-person.',
        '',
        'Got promoted twice during program.',
        '',
        'Career arc changed.',
        '',
        'Salary doubled within 5 years.',
        '',
        'Online education is real education.',
        '',
        'I tell working adults: online degrees are not lesser.'
      ],
      lesson: 'Accredited online MBAs offer real career-changing education for working adults.'
    },
    {
      id: 'dnv48_9',
      title: 'My online therapy through BetterHelp comparison',
      narrative: [
        'Tried BetterHelp first.',
        '',
        'Therapist was fine but not great fit.',
        '',
        'Switched therapists three times.',
        '',
        'Found one who fit eventually.',
        '',
        'Convenience was real.',
        '',
        'Cost was reasonable.',
        '',
        'Insurance did not cover.',
        '',
        'Compared to local therapist who took insurance.',
        '',
        'Switched to local with insurance, in-person.',
        '',
        'Both have place.',
        '',
        'I tell newcomers: try BetterHelp if needed but explore insurance-covered options.'
      ],
      lesson: 'BetterHelp is accessible but compare to insurance-covered local options.'
    },
    {
      id: 'dnv48_10',
      title: 'My nephews online gaming addiction intervention',
      narrative: [
        'Nephew gamed 16 hours daily at 19.',
        '',
        'Dropped out of college.',
        '',
        'Family intervention.',
        '',
        'Treatment center for gaming addiction.',
        '',
        'Six weeks inpatient.',
        '',
        'Followed by outpatient group.',
        '',
        'Slowly reintegrated games with limits.',
        '',
        'Back at community college now.',
        '',
        'Gaming addiction is real diagnosis.',
        '',
        'Treatment exists.',
        '',
        'I tell families: gaming addiction has treatment options.'
      ],
      lesson: 'Gaming addiction is a treatable diagnosis with inpatient and outpatient pathways.'
    },
    {
      id: 'dnv48_11',
      title: 'My online tutor helped my dyslexic son',
      narrative: [
        'Son dyslexic, struggling at school.',
        '',
        'School services limited.',
        '',
        'Found online Orton-Gillingham tutor.',
        '',
        'Weekly Zoom sessions.',
        '',
        'Specialized reading instruction.',
        '',
        'Reading level jumped 2 grades in a year.',
        '',
        'Confidence returned.',
        '',
        'Online specialized services saved my son.',
        '',
        'I tell parents of dyslexic kids: online specialized tutoring exists and works.'
      ],
      lesson: 'Online specialized tutoring (Orton-Gillingham) supports dyslexic students effectively.'
    },
    {
      id: 'dnv48_12',
      title: 'My online crochet pattern community',
      narrative: [
        'Took up crochet at 60.',
        '',
        'Online community of pattern sharers.',
        '',
        'Free patterns, paid patterns, tutorials.',
        '',
        'Ravelry was my home.',
        '',
        'Made gifts for everyone I love.',
        '',
        'Sold work eventually.',
        '',
        'Online community supported every project.',
        '',
        'Late-life hobby became income.',
        '',
        'I tell late-life learners: online communities back every craft.'
      ],
      lesson: 'Online craft communities support late-life hobby development from beginner to income.'
    },
    {
      id: 'dnv48_13',
      title: 'My online polling community for civic engagement',
      narrative: [
        'Wanted to understand polling.',
        '',
        'Joined data-focused political community online.',
        '',
        'Learned methodology, bias, sampling.',
        '',
        'Stopped panicking at every poll.',
        '',
        'Engaged with politics from data, not headlines.',
        '',
        'Made me calmer citizen.',
        '',
        'I tell anxious citizens: data communities reduce political panic.'
      ],
      lesson: 'Online polling-data communities transform political anxiety into informed engagement.'
    },
    {
      id: 'dnv48_14',
      title: 'My online support for caregiver burnout',
      narrative: [
        'Caring for elderly mom with dementia.',
        '',
        'Burning out.',
        '',
        'Joined caregivers online community.',
        '',
        'Validation: this is the hardest thing.',
        '',
        'Strategies for respite.',
        '',
        'Resources for adult day programs.',
        '',
        'Permission to ask for help.',
        '',
        'Made it through year.',
        '',
        'Mom eventually went to memory care.',
        '',
        'Online community caregivers continue.',
        '',
        'I tell caregivers: online community is essential survival tool.'
      ],
      lesson: 'Online caregiver communities provide essential survival support during dementia caregiving.'
    },
    {
      id: 'dnv48_15',
      title: 'My online community of women in tech',
      narrative: [
        'Only woman on my engineering team.',
        '',
        'Isolated and gaslit.',
        '',
        'Found online community of women in tech.',
        '',
        'Same experiences validated.',
        '',
        'Strategies shared.',
        '',
        'Found mentor through community.',
        '',
        'Built side network.',
        '',
        'Eventually changed companies for better culture.',
        '',
        'Online community held me up.',
        '',
        'I tell women in tech: find the online community before you burn out.'
      ],
      lesson: 'Online women-in-tech communities prevent burnout through validation and networks.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_43 = [
    {
      id: 'dnv43_1',
      title: 'My first smartphone at 35, switching from flip',
      narrative: [
        'Got my first smartphone at 35.',
        '',
        'Held out as long as I could.',
        '',
        'Flip phone served me well.',
        '',
        'But work demanded apps now.',
        '',
        'Calendar sync, two factor auth, all required.',
        '',
        'First week was overwhelming.',
        '',
        'Notifications everywhere.',
        '',
        'I turned them all off.',
        '',
        'Slowly turned essential ones back on.',
        '',
        'My boundary remained: phone goes to bed at 9pm.',
        '',
        'Charges in kitchen overnight.',
        '',
        'I tell new adopters: late entry means you get to set the rules.'
      ],
      lesson: 'Late smartphone adoption means you set boundaries from day one.'
    },
    {
      id: 'dnv43_2',
      title: 'The group text that excluded me on purpose',
      narrative: [
        'I was in the friend group.',
        '',
        'Then a side group text formed.',
        '',
        'Everyone but me.',
        '',
        'They planned my surprise party, supposedly.',
        '',
        'But after the party, the side group kept going.',
        '',
        'I learned about events I missed.',
        '',
        'I asked one friend directly.',
        '',
        'She admitted: we needed a space without you.',
        '',
        'Apparently I was too intense in the main group.',
        '',
        'That hurt to hear but it was honest.',
        '',
        'I dialed back, asked what intense looked like.',
        '',
        'Eventually they merged the groups again.',
        '',
        'I tell people: side groups exist for reasons. Ask honestly what those are.'
      ],
      lesson: 'Side group texts about you contain feedback worth hearing.'
    },
    {
      id: 'dnv43_3',
      title: 'AI therapy chatbot during 3am insomnia',
      narrative: [
        'Insomnia hit me hard last year.',
        '',
        'Real therapist not available at 3am.',
        '',
        'I tried an AI chatbot.',
        '',
        'It walked me through grounding techniques.',
        '',
        'Helped me name what I was feeling.',
        '',
        'Did not replace my therapist.',
        '',
        'But bridged the long nights.',
        '',
        'I told my therapist about using it.',
        '',
        'She said: smart, as long as you keep coming here.',
        '',
        'I tell sleepless people: 3am AI support is real even if limited.'
      ],
      lesson: 'AI chatbots can bridge late-night gaps without replacing real care.'
    },
    {
      id: 'dnv43_4',
      title: 'My Instagram comparison spiral with peers',
      narrative: [
        'Followed all my college classmates.',
        '',
        'Watched their careers explode.',
        '',
        'My career felt stagnant.',
        '',
        'Their travels, promotions, houses.',
        '',
        'I felt smaller every scroll.',
        '',
        'Therapist asked: are you seeing real life or highlight reel?',
        '',
        'Highlight reel of course.',
        '',
        'I muted most of them.',
        '',
        'Stayed friends, just stopped seeing posts.',
        '',
        'My mood lifted in weeks.',
        '',
        'I tell scrollers: muting is not unfriending. It is self-protection.'
      ],
      lesson: 'Muting peers on Instagram protects mental health without ending friendships.'
    },
    {
      id: 'dnv43_5',
      title: 'My grandfathers funeral livestream from across country',
      narrative: [
        'Could not afford flight cross country.',
        '',
        'Cousin set up livestream of grandfathers funeral.',
        '',
        'I watched from my apartment.',
        '',
        'Cried through service alone.',
        '',
        'But I was there in some way.',
        '',
        'Saw his face one last time.',
        '',
        'Heard the eulogies.',
        '',
        'Family knew I was watching, waved at camera.',
        '',
        'Not the same as being there.',
        '',
        'But better than missing it entirely.',
        '',
        'I tell distant relatives: livestream funerals are gift to those far away.'
      ],
      lesson: 'Funeral livestreams matter for those who cannot travel.'
    },
    {
      id: 'dnv43_6',
      title: 'The cyberbullying that followed my child to homeschool',
      narrative: [
        'Pulled my kid out of school after bullying.',
        '',
        'Thought homeschool would end it.',
        '',
        'But bullying continued online.',
        '',
        'Bullies found her on every platform.',
        '',
        'Created fake accounts when blocked.',
        '',
        'Reported to platform, slow response.',
        '',
        'Eventually filed police report.',
        '',
        'Cyberstalking charges considered.',
        '',
        'Bullies parents finally responded.',
        '',
        'Lesson: physical separation does not stop digital harassment.',
        '',
        'I tell parents: pulling kid from school is not enough if bullying is online.'
      ],
      lesson: 'Cyberbullying follows children regardless of school enrollment.'
    },
    {
      id: 'dnv43_7',
      title: 'My job interview that was actually AI screening',
      narrative: [
        'Applied to dream job.',
        '',
        'First interview was video call.',
        '',
        'Realized partway through: this is AI.',
        '',
        'AI asking questions, recording my answers.',
        '',
        'I leaned in, answered carefully.',
        '',
        'Knew it would be transcribed and analyzed.',
        '',
        'Got to human round next.',
        '',
        'I asked the recruiter about AI screening.',
        '',
        'She explained: filters out 80 percent of applicants.',
        '',
        'I tell job seekers: know when AI is screening, answer for both algorithm and human.'
      ],
      lesson: 'AI interview screening is common; prepare to address both algorithm and human reviewers.'
    },
    {
      id: 'dnv43_8',
      title: 'The Reddit thread that saved my marriage',
      narrative: [
        'Marriage struggling for years.',
        '',
        'Found a relationship subreddit.',
        '',
        'Read for months without posting.',
        '',
        'Saw patterns we were stuck in.',
        '',
        'Saw how others got unstuck.',
        '',
        'Suggested couples therapy to spouse.',
        '',
        'They agreed.',
        '',
        'Therapy worked.',
        '',
        'Anonymous strangers on Reddit changed my marriage.',
        '',
        'I tell strugglers: lurking in support communities counts as help.'
      ],
      lesson: 'Anonymous online communities can model paths out of stuck places.'
    },
    {
      id: 'dnv43_9',
      title: 'My phone addiction recovery at age 60',
      narrative: [
        'Realized I was on phone 8 hours a day at 60.',
        '',
        'Retired and bored.',
        '',
        'Scrolling filled the hours.',
        '',
        'But left me empty.',
        '',
        'Joined a senior phone-free walking group.',
        '',
        'Leave phones in car for hour-long walks.',
        '',
        'Real conversations returned.',
        '',
        'Phone use down to 2 hours daily.',
        '',
        'Found a part-time volunteer role.',
        '',
        'Filled retirement with people not screens.',
        '',
        'I tell retirees: phone addiction is not just for teens.'
      ],
      lesson: 'Retirement-age phone overuse is real; remedied by structured offline activity.'
    },
    {
      id: 'dnv43_10',
      title: 'Filming my son without his consent for content',
      narrative: [
        'I had mom influencer account.',
        '',
        '50K followers loved my son content.',
        '',
        'He turned 10 and asked me to stop.',
        '',
        'I felt embarrassed.',
        '',
        'Took two weeks to comply fully.',
        '',
        'Deleted all his identifiable content.',
        '',
        'Account dropped to 20K followers.',
        '',
        'Apologized publicly for normalizing kid content.',
        '',
        'Some followers thanked me.',
        '',
        'Some unfollowed.',
        '',
        'I tell mom influencers: child consent is not optional, even at 10.'
      ],
      lesson: 'Children deserve consent over their own social media exposure.'
    },
    {
      id: 'dnv43_11',
      title: 'My partners secret crypto debt revealed by tax doc',
      narrative: [
        'Married 10 years, thought we shared finances.',
        '',
        'Tax doc arrived showing crypto losses.',
        '',
        'My partners name on it.',
        '',
        'I did not know about the account.',
        '',
        'Confronted them gently.',
        '',
        'They cried and admitted: tried to make money for our family.',
        '',
        'Lost 40K dollars in two years.',
        '',
        'We went to financial counselor together.',
        '',
        'Rebuilt savings slowly.',
        '',
        'They agreed: no secret accounts ever.',
        '',
        'I tell couples: full financial transparency includes every wallet, every account.'
      ],
      lesson: 'Hidden crypto accounts undermine financial trust in marriages.'
    },
    {
      id: 'dnv43_12',
      title: 'TikTok diagnosis sent me to actual doctor',
      narrative: [
        'TikTok kept showing me ADHD content.',
        '',
        'Every symptom resonated.',
        '',
        'I am 38 woman.',
        '',
        'Researched further on reputable sites.',
        '',
        'Asked my doctor for assessment.',
        '',
        'Three-month process.',
        '',
        'Diagnosed: combined-type ADHD.',
        '',
        'Treatment changed my life.',
        '',
        'TikTok was the spark.',
        '',
        'Doctor was the diagnosis.',
        '',
        'I tell skeptics: TikTok health content has issues but also sparks real awareness.'
      ],
      lesson: 'Social media can spark valid health awareness if followed by professional care.'
    },
    {
      id: 'dnv43_13',
      title: 'My nephews first online friend turned out fake',
      narrative: [
        'My 12 year old nephew made online friend.',
        '',
        'They played games together for months.',
        '',
        'Friend claimed to be 13 boy in another state.',
        '',
        'Pattern of escalating personal questions.',
        '',
        'Asked about my nephew family schedule.',
        '',
        'Sister noticed and contacted authorities.',
        '',
        'IP trace revealed: 45 year old man with prior charges.',
        '',
        'Devastating for my nephew.',
        '',
        'Therapy helped him process.',
        '',
        'Three years later he is doing well.',
        '',
        'I tell parents: monitor online friendships even when child seems happy.'
      ],
      lesson: 'Predators groom through gaming friendships; parental monitoring is essential.'
    },
    {
      id: 'dnv43_14',
      title: 'Working from home destroyed my work-life boundary',
      narrative: [
        'Loved remote work at first.',
        '',
        'Saved commute time.',
        '',
        'But work crept into all hours.',
        '',
        'Slack notifications at 9pm.',
        '',
        'Emails before breakfast.',
        '',
        'Burned out within 18 months.',
        '',
        'Therapist helped me set rules.',
        '',
        'Slack off at 6pm hard stop.',
        '',
        'Laptop closed and put away.',
        '',
        'Different physical room for work.',
        '',
        'I tell remote workers: physical boundaries protect mental health.'
      ],
      lesson: 'Remote work requires deliberate physical and time boundaries.'
    },
    {
      id: 'dnv43_15',
      title: 'My elderly mothers Facebook scam I caught in time',
      narrative: [
        'Mom called me excited.',
        '',
        'Won 50K dollars on Facebook.',
        '',
        'Just had to pay 500 dollar processing fee.',
        '',
        'My heart sank.',
        '',
        'Walked her through scam indicators.',
        '',
        'Showed her the fake profile.',
        '',
        'Showed her the lifted photos.',
        '',
        'She got it.',
        '',
        'We reported scam to Facebook.',
        '',
        'Set up monthly tech check-ins.',
        '',
        'I tell adult children: weekly conversations about online activity protect elderly parents.'
      ],
      lesson: 'Regular tech check-ins protect elderly parents from online scams.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_44 = [
    {
      id: 'dnv44_1',
      title: 'My partners AI girlfriend chatbot revelation',
      narrative: [
        'Found chat history on my partners phone.',
        '',
        'Months of conversations with AI girlfriend.',
        '',
        'Romantic, sexual content.',
        '',
        'I felt betrayed.',
        '',
        'They argued: she is not real.',
        '',
        'I argued: emotional investment is real.',
        '',
        'Couples therapy explored what need was unmet.',
        '',
        'Turned out: feeling unseen at home.',
        '',
        'We worked on actual attention.',
        '',
        'They deleted the app.',
        '',
        'I tell partners: AI affairs are real even without bodies.'
      ],
      lesson: 'Emotional investment in AI companions is real betrayal worth examining.'
    },
    {
      id: 'dnv44_2',
      title: 'Twitter algorithm radicalized my brother',
      narrative: [
        'Brother started as moderate.',
        '',
        'Twitter algorithm pushed him rightward.',
        '',
        'Hour by hour, conspiracy by conspiracy.',
        '',
        'Six months later: barely recognizable.',
        '',
        'Family confrontation hard.',
        '',
        'He defended every conspiracy.',
        '',
        'I asked him: what was your Twitter use a year ago?',
        '',
        'He admitted: 3 hours daily now.',
        '',
        'Was 30 minutes before.',
        '',
        'Algorithm radicalization is real.',
        '',
        'I tell siblings: algorithmic pull can change personalities.'
      ],
      lesson: 'Heavy social media use can radicalize family members through algorithmic exposure.'
    },
    {
      id: 'dnv44_3',
      title: 'The forum that taught me to manage chronic illness',
      narrative: [
        'Diagnosed with chronic illness at 28.',
        '',
        'Doctors helped with treatment.',
        '',
        'But the daily living wisdom came from forum.',
        '',
        'Patients teaching patients.',
        '',
        'Tips on managing flares.',
        '',
        'Tips on accessing benefits.',
        '',
        'Tips on workplace accommodations.',
        '',
        'Tips on dating with chronic illness.',
        '',
        'Real users sharing real strategies.',
        '',
        'Saved me years of trial and error.',
        '',
        'I tell newly diagnosed: patient communities teach what doctors cannot.'
      ],
      lesson: 'Online patient communities teach lived-experience strategies medicine cannot.'
    },
    {
      id: 'dnv44_4',
      title: 'My daughters mental health hidden in finsta',
      narrative: [
        'My daughters main Instagram looked great.',
        '',
        'Smiling photos with friends.',
        '',
        'Found her finsta by accident.',
        '',
        'Different person entirely.',
        '',
        'Dark posts.',
        '',
        'Talk of being a burden.',
        '',
        'Self-harm imagery hinted at.',
        '',
        'I sat with her gently.',
        '',
        'She broke down.',
        '',
        'Got her into therapy immediately.',
        '',
        'Years of work ahead.',
        '',
        'I tell parents: check the secondary accounts. That is where the real story lives.'
      ],
      lesson: 'Teens hide mental health distress in secondary accounts; check beyond the public face.'
    },
    {
      id: 'dnv44_5',
      title: 'AI assistant became my work memory',
      narrative: [
        'Memory issues after concussion.',
        '',
        'Could not retain meeting notes.',
        '',
        'Started using AI for transcript summaries.',
        '',
        'Daily standup recap.',
        '',
        'Action item extraction.',
        '',
        'Decision tracking.',
        '',
        'AI became my prosthetic memory.',
        '',
        'Disclosed to my manager.',
        '',
        'She approved as reasonable accommodation.',
        '',
        'Productivity returned.',
        '',
        'I tell brain injury survivors: AI can be cognitive accommodation.'
      ],
      lesson: 'AI tools can be legitimate cognitive accommodations for brain injury survivors.'
    },
    {
      id: 'dnv44_6',
      title: 'My online support during cancer treatment',
      narrative: [
        'Diagnosed at 45.',
        '',
        'Joined cancer support group online.',
        '',
        'Same diagnosis, same stage.',
        '',
        'They taught me what to expect.',
        '',
        'How to manage side effects.',
        '',
        'How to advocate with insurance.',
        '',
        'Some died during my treatment.',
        '',
        'Grief was real even online.',
        '',
        'Survivors guilt complicated.',
        '',
        'But the support saved me.',
        '',
        'I tell newly diagnosed: find your specific community fast.'
      ],
      lesson: 'Disease-specific online support is rapid and irreplaceable.'
    },
    {
      id: 'dnv44_7',
      title: 'The deepfake of my professor in classroom',
      narrative: [
        'Student created deepfake of professor.',
        '',
        'Saying offensive things.',
        '',
        'Spread on campus social media.',
        '',
        'Professor put on leave during investigation.',
        '',
        'Forensic analysis revealed: deepfake.',
        '',
        'Student found, expelled.',
        '',
        'Professor reinstated with apology.',
        '',
        'But reputation damaged for months.',
        '',
        'Some still believe original video.',
        '',
        'Truth never catches lie fully.',
        '',
        'I tell university communities: deepfake accusations need forensic verification, not viral spread.'
      ],
      lesson: 'Deepfakes can destroy reputations faster than truth can restore them.'
    },
    {
      id: 'dnv44_8',
      title: 'My LinkedIn job hunt during depression',
      narrative: [
        'Laid off in depression spell.',
        '',
        'Job hunt on LinkedIn felt impossible.',
        '',
        'Could not optimize profile, post regularly, network.',
        '',
        'Therapist suggested: bare minimum approach.',
        '',
        'Updated headline once.',
        '',
        'Applied to 3 jobs daily.',
        '',
        'No networking events.',
        '',
        'Got job in 4 months.',
        '',
        'Not dream job but enough.',
        '',
        'Survival job hunt is valid.',
        '',
        'I tell depressed job seekers: bare minimum is enough during illness.'
      ],
      lesson: 'Bare-minimum job hunting is valid during mental illness.'
    },
    {
      id: 'dnv44_9',
      title: 'My sons coming out via group text',
      narrative: [
        'My son came out as gay at 16.',
        '',
        'Through family group text.',
        '',
        'Three of us, no warning.',
        '',
        'Initial reactions awkward over text.',
        '',
        'Tone hard to read.',
        '',
        'He worried we hated him.',
        '',
        'I called immediately.',
        '',
        'Voice carries love better than text.',
        '',
        'We cried together on phone.',
        '',
        'Coming out by text is real.',
        '',
        'I tell parents: respond loud and clear with love when child comes out by text.'
      ],
      lesson: 'Children come out by text; respond with voice to convey full love.'
    },
    {
      id: 'dnv44_10',
      title: 'My online tutor made calculus possible',
      narrative: [
        'Failed calculus twice in college.',
        '',
        'Math anxiety severe.',
        '',
        'Found online tutor via Wyzant.',
        '',
        'Patient, understood anxiety.',
        '',
        'Met weekly via Zoom.',
        '',
        'Built foundation slowly.',
        '',
        'Took calculus third time.',
        '',
        'Got B.',
        '',
        'Wept with relief.',
        '',
        'Online tutoring leveled the field.',
        '',
        'I tell struggling students: online tutoring is not inferior. It is access.'
      ],
      lesson: 'Online tutoring provides accessible academic support that changes outcomes.'
    },
    {
      id: 'dnv44_11',
      title: 'The Facebook memorial that helped my grief',
      narrative: [
        'Brother died at 32.',
        '',
        'His Facebook became memorial page.',
        '',
        'Hundreds posted memories.',
        '',
        'Stories I had never heard.',
        '',
        'His college friends, coworkers, partners.',
        '',
        'I learned new things about him.',
        '',
        'Grief community formed there.',
        '',
        'On anniversaries, posts surge.',
        '',
        'Eight years later still active.',
        '',
        'His digital presence preserves him.',
        '',
        'I tell grieving families: digital memorials keep the loved one accessible.'
      ],
      lesson: 'Digital memorials preserve loved ones in ways physical graves cannot.'
    },
    {
      id: 'dnv44_12',
      title: 'My phone hack via public WiFi at airport',
      narrative: [
        'Logged onto airport WiFi.',
        '',
        'Did banking on phone.',
        '',
        'Five hours later: bank account drained.',
        '',
        'Hacker on same network captured credentials.',
        '',
        'Bank reimbursed eventually.',
        '',
        'But process took 6 weeks.',
        '',
        'Lesson: never bank on public WiFi.',
        '',
        'VPN now installed.',
        '',
        'Two factor auth on everything.',
        '',
        'Travel paranoia justified.',
        '',
        'I tell travelers: public WiFi for browsing only. Banking on cellular only.'
      ],
      lesson: 'Public WiFi banking risks credential capture; use cellular or VPN only.'
    },
    {
      id: 'dnv44_13',
      title: 'My daughters digital eating disorder recovery community',
      narrative: [
        'Daughter recovering from anorexia.',
        '',
        'Found Project HEAL community online.',
        '',
        'Met peers also in recovery.',
        '',
        'Sharing struggles openly.',
        '',
        'Coordinated meals via video chat.',
        '',
        'Body neutrality posts.',
        '',
        'Eating disorder recovery community looks different from pro-ana spaces.',
        '',
        'Recovery community focuses on health, not weight.',
        '',
        'Daughter found her people.',
        '',
        'Three years in recovery now.',
        '',
        'I tell parents: recovery communities exist online and they save lives.'
      ],
      lesson: 'Eating disorder recovery communities exist online and support sustainable healing.'
    },
    {
      id: 'dnv44_14',
      title: 'The phishing email that nearly cost my retirement',
      narrative: [
        'Email looked like my brokerage.',
        '',
        'Said: account suspended, verify identity.',
        '',
        'I almost clicked.',
        '',
        'Saw the URL: real estate domain.',
        '',
        'Reported to broker.',
        '',
        'They confirmed: phishing.',
        '',
        'They thanked me for not clicking.',
        '',
        'Showed me how 40 percent of similar emails get clicked.',
        '',
        'I almost lost my retirement.',
        '',
        'Now I check URL before every login.',
        '',
        'I tell retirees: URL inspection prevents devastation.'
      ],
      lesson: 'Inspecting URLs before login prevents devastating retirement-account phishing.'
    },
    {
      id: 'dnv44_15',
      title: 'My twin sisters Instagram and my mental decline',
      narrative: [
        'Identical twin sister has perfect Instagram.',
        '',
        'Travel, fitness, marriage.',
        '',
        'I have similar life but felt behind.',
        '',
        'Spiral into comparison and depression.',
        '',
        'Therapist asked: what is the comparison cost?',
        '',
        'Significant cost.',
        '',
        'Unfollowed my sister, kept the relationship.',
        '',
        'She understood when I explained.',
        '',
        'Mental health improved within weeks.',
        '',
        'We still talk daily.',
        '',
        'I tell twins: unfollowing protects you. The relationship continues offline.'
      ],
      lesson: 'Unfollowing close family on social media can protect mental health.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_42 = [
    {
      id: 'dnv42_1',
      title: 'My online community of fellow widows in middle age',
      narrative: [
        'Lost husband at 50.',
        '',
        'Online community of widows my age.',
        '',
        'They get the unique grief.',
        '',
        'I tell people: age-specific grief community matters.'
      ],
      lesson: 'Age-specific grief community matters.'
    },
    {
      id: 'dnv42_2',
      title: 'When phone helped my elderly aunt',
      narrative: [
        'Aunt at 80. Isolated.',
        '',
        'I set up phone for her. Simple. Big buttons.',
        '',
        'She calls family weekly now.',
        '',
        'She is less alone.',
        '',
        'I tell people: tech for elderly serves.'
      ],
      lesson: 'Tech for elderly serves.'
    },
    {
      id: 'dnv42_3',
      title: 'My phone-free hospital visit to friend',
      narrative: [
        'Friend in hospital.',
        '',
        'I went without phone.',
        '',
        'I held space.',
        '',
        'She needed me. I was there.',
        '',
        'I tell people: hospital visits phone-free.'
      ],
      lesson: 'Hospital visits phone-free.'
    },
    {
      id: 'dnv42_4',
      title: 'When AI helped me with my will',
      narrative: [
        'Writing will. Complex.',
        '',
        'AI helped me understand options.',
        '',
        'I worked with lawyer.',
        '',
        'I tell people: AI for understanding. Pros for execution.'
      ],
      lesson: 'AI for understanding. Pros for execution.'
    },
    {
      id: 'dnv42_5',
      title: 'My online community of fellow disabled aging',
      narrative: [
        'Disabled and aging.',
        '',
        'Online community of others.',
        '',
        'They get unique challenges.',
        '',
        'I tell people: dual identity ages.'
      ],
      lesson: 'Dual identity ages need community.'
    },
    {
      id: 'dnv42_6',
      title: 'When my phone helped me with my mother\'s end of life',
      narrative: [
        'Mother dying.',
        '',
        'Phone for coordination with siblings. Care planning. Connection.',
        '',
        'Tech served family.',
        '',
        'I tell people: tech for end-of-life family.'
      ],
      lesson: 'Tech for end-of-life family.'
    },
    {
      id: 'dnv42_7',
      title: 'My phone-free vigil',
      narrative: [
        'Sister dying.',
        '',
        'Phone away. Family together.',
        '',
        'We held vigil.',
        '',
        'We were there.',
        '',
        'I tell people: vigil phone-free.'
      ],
      lesson: 'Vigil phone-free.'
    },
    {
      id: 'dnv42_8',
      title: 'When AI helped me with my retirement letter',
      narrative: [
        'Retiring after 40 years.',
        '',
        'AI helped me frame thank yous.',
        '',
        'I personalized deeply.',
        '',
        'Letter brought tears.',
        '',
        'I tell people: AI for milestone writing.'
      ],
      lesson: 'AI for milestone writing.'
    },
    {
      id: 'dnv42_9',
      title: 'My online community of fellow newly bereaved',
      narrative: [
        'Newly bereaved.',
        '',
        'Online community of others.',
        '',
        'They walked with me.',
        '',
        'I am sustained.',
        '',
        'I tell people: grief community essential.'
      ],
      lesson: 'Grief community essential.'
    },
    {
      id: 'dnv42_10',
      title: 'When phone caught my partners last words',
      narrative: [
        'Partner dying.',
        '',
        'I recorded his stories.',
        '',
        'His voice for kids someday.',
        '',
        'Phone for legacy.',
        '',
        'I tell people: phone for legacy at end.'
      ],
      lesson: 'Phone for legacy at end.'
    },
    {
      id: 'dnv42_11',
      title: 'My phone-free funeral planning',
      narrative: [
        'Planning service. Family meetings.',
        '',
        'Phones away. Real planning.',
        '',
        'Beautiful service.',
        '',
        'I tell people: funeral planning phone-free.'
      ],
      lesson: 'Funeral planning phone-free.'
    },
    {
      id: 'dnv42_12',
      title: 'When AI helped me with grief letter to kids',
      narrative: [
        'After spouse death. Writing to kids.',
        '',
        'AI helped me find words.',
        '',
        'I personalized deeply.',
        '',
        'Kids treasure letter.',
        '',
        'I tell people: AI as bridge for hardest writing.'
      ],
      lesson: 'AI as bridge for hardest writing.'
    },
    {
      id: 'dnv42_13',
      title: 'My online community of fellow elderly bereaved',
      narrative: [
        'Lost spouse at 75.',
        '',
        'Online community of elderly widows.',
        '',
        'They get unique loneliness of late grief.',
        '',
        'I tell elders: community at every age.'
      ],
      lesson: 'Community at every age.'
    },
    {
      id: 'dnv42_14',
      title: 'When phone helped me through ICU stay',
      narrative: [
        'Family member in ICU.',
        '',
        'Phone for updates. Coordination. Connection with rest of family.',
        '',
        'Tech served medical crisis.',
        '',
        'I tell people: phone for medical crisis.'
      ],
      lesson: 'Phone for medical crisis.'
    },
    {
      id: 'dnv42_15',
      title: 'My final lifetime practice',
      narrative: [
        'I have practiced lifetime.',
        '',
        'Phone served at every age.',
        '',
        'Phone-free sacred at every age.',
        '',
        'Both/and lifetime practice.',
        '',
        'I tell people: practice lifetime.'
      ],
      lesson: 'Practice lifetime.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_41 = [
    {
      id: 'dnv41_1',
      title: 'When AI helped me write to my therapist',
      narrative: [
        'I had been blocked on hard topic.',
        '',
        'Asked AI to help me write it.',
        '',
        'I personalized.',
        '',
        'Showed therapist.',
        '',
        'Breakthrough.',
        '',
        'I tell people: AI for getting started on hard topics.'
      ],
      lesson: 'AI for getting started on hard topics.'
    },
    {
      id: 'dnv41_2',
      title: 'My online community of fellow LGBTQ elders',
      narrative: [
        'LGBTQ at 60.',
        '',
        'Online community of LGBTQ elders.',
        '',
        'We tell our stories.',
        '',
        'We mentor young.',
        '',
        'I tell people: every age has community.'
      ],
      lesson: 'Every age has community.'
    },
    {
      id: 'dnv41_3',
      title: 'My phone-free intergenerational dinner',
      narrative: [
        'Multi-generation dinner. Phones in basket.',
        '',
        'My grandmother. My grandkids.',
        '',
        'Real cross-generational conversation.',
        '',
        'I tell people: phone-free for intergenerational.'
      ],
      lesson: 'Phone-free for intergenerational.'
    },
    {
      id: 'dnv41_4',
      title: 'When phone helped me through aging parent',
      narrative: [
        'Mom in dementia care.',
        '',
        'Phone for daily check-ins. Coordination with siblings. Care planning.',
        '',
        'Tech served family care.',
        '',
        'I tell people: phone for caregiving family.'
      ],
      lesson: 'Phone for caregiving family.'
    },
    {
      id: 'dnv41_5',
      title: 'My phone-free decades',
      narrative: [
        'I have practiced for decades.',
        '',
        'Phone is tool.',
        '',
        'Not master.',
        '',
        'Not friend.',
        '',
        'I serve life.',
        '',
        'I tell people: long practice is gift.'
      ],
      lesson: 'Long practice is gift.'
    },
    {
      id: 'dnv41_6',
      title: 'When AI helped me with my late-in-life love letter',
      narrative: [
        'Writing love letter to partner of 30 years.',
        '',
        'AI helped me find words.',
        '',
        'I personalized deeply.',
        '',
        'Letter brought us closer.',
        '',
        'I tell people: AI for sacred writing.'
      ],
      lesson: 'AI for sacred writing.'
    },
    {
      id: 'dnv41_7',
      title: 'My online community of fellow grandparents',
      narrative: [
        'Grandparent.',
        '',
        'Online community of fellow grandparents.',
        '',
        'We share photos. Stories. Wisdom.',
        '',
        'I tell people: every life stage has community.'
      ],
      lesson: 'Every life stage has community.'
    },
    {
      id: 'dnv41_8',
      title: 'When my phone helped me legacy',
      narrative: [
        'Recording my stories on phone.',
        '',
        'Will leave for grandkids.',
        '',
        'Phone for legacy.',
        '',
        'I tell people: phone for legacy.'
      ],
      lesson: 'Phone for legacy.'
    },
    {
      id: 'dnv41_9',
      title: 'My phone-free funeral planning',
      narrative: [
        'Planning own funeral.',
        '',
        'Family planning meetings phone-free.',
        '',
        'Sacred work.',
        '',
        'I tell people: phone-free for sacred preparation.'
      ],
      lesson: 'Phone-free for sacred preparation.'
    },
    {
      id: 'dnv41_10',
      title: 'When AI helped me write my obituary',
      narrative: [
        'Wrote own obituary at 70.',
        '',
        'AI helped me reflect.',
        '',
        'I personalized.',
        '',
        'Wisdom on paper.',
        '',
        'I tell people: AI for reflection on life.'
      ],
      lesson: 'AI for reflection on life.'
    },
    {
      id: 'dnv41_11',
      title: 'My online community of fellow elders',
      narrative: [
        'Elder community online.',
        '',
        'We share wisdom. Worry. Joy.',
        '',
        'I am sustained.',
        '',
        'I tell elders: community matters at every age.'
      ],
      lesson: 'Community matters at every age.'
    },
    {
      id: 'dnv41_12',
      title: 'When phone helped me organize estate',
      narrative: [
        'Organizing estate.',
        '',
        'Phone for documents. Communication. Planning.',
        '',
        'Tech served end-of-life planning.',
        '',
        'I tell people: tech for end-of-life planning.'
      ],
      lesson: 'Tech for end-of-life planning.'
    },
    {
      id: 'dnv41_13',
      title: 'My phone-free hospice visits',
      narrative: [
        'Visiting friend in hospice.',
        '',
        'Phone away.',
        '',
        'I held her hand.',
        '',
        'I was there until end.',
        '',
        'I tell people: phone-free for hospice.'
      ],
      lesson: 'Phone-free for hospice.'
    },
    {
      id: 'dnv41_14',
      title: 'My phone-free death watch',
      narrative: [
        'Father dying.',
        '',
        'Phone away.',
        '',
        'I held his hand.',
        '',
        'I was there.',
        '',
        'I tell people: phone-free for death.'
      ],
      lesson: 'Phone-free for death.'
    },
    {
      id: 'dnv41_15',
      title: 'My final wisdom',
      narrative: [
        'After lifetime of practice.',
        '',
        'Phone serves life.',
        '',
        'Life is primary.',
        '',
        'Practice forever.',
        '',
        'I tell people: serve life.'
      ],
      lesson: 'Serve life.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_40 = [
    {
      id: 'dnv40_1',
      title: 'My phone in my pocket all day',
      narrative: [
        'I used to keep phone in hand all day.',
        '',
        'Now in pocket. Out of sight.',
        '',
        'I pick up less. Notice it less.',
        '',
        'Small change. Big difference.',
        '',
        'I tell people: out of sight, out of pick-up.'
      ],
      lesson: 'Out of sight, out of pick-up.'
    },
    {
      id: 'dnv40_2',
      title: 'When AI helped me think about retirement',
      narrative: [
        'Approaching retirement. Anxious.',
        '',
        'AI helped me think through finances. Lifestyle.',
        '',
        'I made plan.',
        '',
        'I tell people: AI for life planning.'
      ],
      lesson: 'AI for life planning.'
    },
    {
      id: 'dnv40_3',
      title: 'My online community of fellow retired',
      narrative: [
        'Retired. Lonely.',
        '',
        'Online community of retired.',
        '',
        'They share new interests. Travel. Wisdom.',
        '',
        'I am thriving.',
        '',
        'I tell people: retirement has community.'
      ],
      lesson: 'Retirement has community.'
    },
    {
      id: 'dnv40_4',
      title: 'When my phone helped me with my grandkids',
      narrative: [
        'Grandkids across country.',
        '',
        'Weekly video calls.',
        '',
        'I read them stories.',
        '',
        'We share life.',
        '',
        'Phone for connection serves.',
        '',
        'I tell grandparents: phone for grandkids.'
      ],
      lesson: 'Phone for grandkids.'
    },
    {
      id: 'dnv40_5',
      title: 'My phone-free Sunday brunch tradition',
      narrative: [
        'Sunday brunch with friends. Phones in basket.',
        '',
        'For 5 years.',
        '',
        'Sacred. Restorative.',
        '',
        'I tell people: weekly traditions with phones away.'
      ],
      lesson: 'Weekly traditions with phones away.'
    },
    {
      id: 'dnv40_6',
      title: 'When AI helped me with college essay',
      narrative: [
        'My kid stuck on college essay.',
        '',
        'AI helped them brainstorm. Their final essay was theirs.',
        '',
        'They got into top choice.',
        '',
        'I tell people: AI for brainstorming. Final work is yours.'
      ],
      lesson: 'AI for brainstorming. Final work is yours.'
    },
    {
      id: 'dnv40_7',
      title: 'My online community of fellow chronic fatigue',
      narrative: [
        'Chronic fatigue.',
        '',
        'Online community of fellow patients.',
        '',
        'I am better managed.',
        '',
        'I tell people: invisible illness community matters.'
      ],
      lesson: 'Invisible illness community matters.'
    },
    {
      id: 'dnv40_8',
      title: 'When phone helped me find lost item',
      narrative: [
        'Lost item. Phone with tracking app.',
        '',
        'Found.',
        '',
        'Tech served.',
        '',
        'I tell people: tracking apps for valuables.'
      ],
      lesson: 'Tracking apps for valuables.'
    },
    {
      id: 'dnv40_9',
      title: 'My phone-free morning meditation',
      narrative: [
        'Daily morning meditation. Phone in another room.',
        '',
        'For years.',
        '',
        'Practice grounds me.',
        '',
        'I tell people: morning meditation phone-free.'
      ],
      lesson: 'Morning meditation phone-free.'
    },
    {
      id: 'dnv40_10',
      title: 'When AI helped me with menu planning',
      narrative: [
        'Menu planning weekly.',
        '',
        'AI helps me think through.',
        '',
        'I cook with intention.',
        '',
        'I tell people: AI for routine planning.'
      ],
      lesson: 'AI for routine planning.'
    },
    {
      id: 'dnv40_11',
      title: 'My online community of fellow second-career',
      narrative: [
        'Changed careers at 50.',
        '',
        'Online community of second-career professionals.',
        '',
        'They had been there.',
        '',
        'I am thriving in new career.',
        '',
        'I tell people: second careers have communities.'
      ],
      lesson: 'Second careers have communities.'
    },
    {
      id: 'dnv40_12',
      title: 'When my phone helped me through migraines',
      narrative: [
        'Chronic migraines.',
        '',
        'Phone for tracking. Treatment. Community.',
        '',
        'Tech served.',
        '',
        'I tell people: chronic conditions benefit from tech.'
      ],
      lesson: 'Chronic conditions benefit from tech.'
    },
    {
      id: 'dnv40_13',
      title: 'My phone-free dinners with adult kids',
      narrative: [
        'Adult kids visit.',
        '',
        'Phones in basket at dinner.',
        '',
        'Real conversation.',
        '',
        'I tell parents: phone-free with adult kids.'
      ],
      lesson: 'Phone-free with adult kids.'
    },
    {
      id: 'dnv40_14',
      title: 'When AI helped my friend write to her ex',
      narrative: [
        'Friend needed to write to ex about kid stuff.',
        '',
        'AI helped her frame professionally.',
        '',
        'Email landed without drama.',
        '',
        'I tell people: AI for tricky writing.'
      ],
      lesson: 'AI for tricky writing.'
    },
    {
      id: 'dnv40_15',
      title: 'My ongoing daily practice',
      narrative: [
        'Phone in drawer.',
        '',
        'Morning without it.',
        '',
        'Meals without it.',
        '',
        'Nights without it.',
        '',
        'I serve life.',
        '',
        'Practice forever.',
        '',
        'I tell people: this is forever practice.'
      ],
      lesson: 'Forever practice.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_39 = [
    {
      id: 'dnv39_1',
      title: 'When my online friend visited me',
      narrative: [
        'Online friend visited from across world.',
        '',
        'Stayed with us for week.',
        '',
        'We had been internet friends 8 years.',
        '',
        'In person we picked up right where we had been.',
        '',
        'I tell people: online friends are real friends.'
      ],
      lesson: 'Online friends are real friends.'
    },
    {
      id: 'dnv39_2',
      title: 'My phone-free 60th birthday',
      narrative: [
        '60th birthday. Phone-free weekend.',
        '',
        'Real friends. Real conversations.',
        '',
        'I tell people: phone-free milestones.'
      ],
      lesson: 'Phone-free milestones.'
    },
    {
      id: 'dnv39_3',
      title: 'When AI helped me with my book proposal',
      narrative: [
        'Book proposal stuck.',
        '',
        'AI helped me structure.',
        '',
        'I personalized.',
        '',
        'Proposal accepted.',
        '',
        'I tell people: AI for getting unstuck.'
      ],
      lesson: 'AI for getting unstuck.'
    },
    {
      id: 'dnv39_4',
      title: 'My online community of fellow late-bloomers',
      narrative: [
        'Late bloomer. Identified at 40 finally.',
        '',
        'Online community.',
        '',
        'I tell people: every late path has community.'
      ],
      lesson: 'Every late path has community.'
    },
    {
      id: 'dnv39_5',
      title: 'When my phone helped me through PTSD',
      narrative: [
        'PTSD. Phone for grounding apps. Therapist appointments. Family.',
        '',
        'Tech served healing.',
        '',
        'I tell people: phone for healing serves.'
      ],
      lesson: 'Phone for healing serves.'
    },
    {
      id: 'dnv39_6',
      title: 'My phone-free month sabbatical',
      narrative: [
        'Took month sabbatical from phone for personal projects.',
        '',
        'Family knew. Backup phone for emergency.',
        '',
        'Month transformative.',
        '',
        'I write differently now.',
        '',
        'I tell people: month-long fasts transform.'
      ],
      lesson: 'Month-long phone fasts transform.'
    },
    {
      id: 'dnv39_7',
      title: 'When AI helped me with hard conversation with sibling',
      narrative: [
        'Sibling conflict.',
        '',
        'AI helped me think through. Frame.',
        '',
        'I had conversation in person.',
        '',
        'Conflict resolved.',
        '',
        'I tell people: AI prep for hard talks.'
      ],
      lesson: 'AI prep for hard talks works.'
    },
    {
      id: 'dnv39_8',
      title: 'My online community of fellow autistic professionals',
      narrative: [
        'Autistic professional.',
        '',
        'Online community of fellow autistic professionals.',
        '',
        'Tips. Strategies. Community.',
        '',
        'I tell people: identity-based professional community works.'
      ],
      lesson: 'Identity-based professional community works.'
    },
    {
      id: 'dnv39_9',
      title: 'When phone helped me with new diagnosis',
      narrative: [
        'New diagnosis. Lonely.',
        '',
        'Phone for research. Community. Resources.',
        '',
        'Tech served.',
        '',
        'I tell people: phone for new diagnosis serves.'
      ],
      lesson: 'Phone for new diagnosis serves.'
    },
    {
      id: 'dnv39_10',
      title: 'My phone-free family weekend',
      narrative: [
        'Family weekend. Phones in basket.',
        '',
        'Sunday morning to Sunday evening.',
        '',
        'Real family time.',
        '',
        'I tell families: weekly family weekends phone-free.'
      ],
      lesson: 'Weekly family weekends phone-free.'
    },
    {
      id: 'dnv39_11',
      title: 'When AI helped me write to my estranged sibling',
      narrative: [
        'Estranged sibling.',
        '',
        'AI helped me draft letter.',
        '',
        'I personalized deeply.',
        '',
        'Sent. Sibling responded.',
        '',
        'We are reconnecting.',
        '',
        'I tell people: AI as bridge for hard relationships.'
      ],
      lesson: 'AI as bridge for hard relationships.'
    },
    {
      id: 'dnv39_12',
      title: 'My online community of fellow rural folks',
      narrative: [
        'Live rural. Few peers nearby.',
        '',
        'Online community of fellow rural.',
        '',
        'I am less alone.',
        '',
        'I tell rural folks: online community sustains.'
      ],
      lesson: 'Rural online community sustains.'
    },
    {
      id: 'dnv39_13',
      title: 'When my phone helped my dad through retirement',
      narrative: [
        'Dad retired. Lost identity.',
        '',
        'I helped him use phone for new community. Hobbies. Family connection.',
        '',
        'He flourished.',
        '',
        'I tell people: tech for retirement transition.'
      ],
      lesson: 'Tech for retirement transition.'
    },
    {
      id: 'dnv39_14',
      title: 'My phone-free holiday traditions',
      narrative: [
        'Holiday traditions built with phones away.',
        '',
        'Real family. Real connection.',
        '',
        'Kids will remember.',
        '',
        'I tell families: phone-free holiday traditions.'
      ],
      lesson: 'Phone-free holiday traditions.'
    },
    {
      id: 'dnv39_15',
      title: 'My ongoing practice',
      narrative: [
        'Practice forever.',
        '',
        'Imperfect.',
        '',
        'Sustained.',
        '',
        'I tell people: forever.'
      ],
      lesson: 'Forever.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_38 = [
    {
      id: 'dnv38_1',
      title: 'When AI helped me with anniversary',
      narrative: [
        'Anniversary gift idea stuck.',
        '',
        'Asked AI for ideas.',
        '',
        'Got several. Picked best.',
        '',
        'Partner loved.',
        '',
        'I tell people: AI for brainstorming.'
      ],
      lesson: 'AI for brainstorming works.'
    },
    {
      id: 'dnv38_2',
      title: 'My online community of fellow widowers',
      narrative: [
        'Wife died.',
        '',
        'Online community of widowers.',
        '',
        'They get it.',
        '',
        'I survived.',
        '',
        'I tell people: widower community essential.'
      ],
      lesson: 'Widower community essential.'
    },
    {
      id: 'dnv38_3',
      title: 'My phone-free coffee date',
      narrative: [
        'Coffee with friend. No phones.',
        '',
        'We talked 2 hours.',
        '',
        'Deepest catch-up in years.',
        '',
        'I tell people: phone-free coffee.'
      ],
      lesson: 'Phone-free coffee dates connect.'
    },
    {
      id: 'dnv38_4',
      title: 'When phone helped me through breakup',
      narrative: [
        'Breakup.',
        '',
        'Phone for therapist. Friends. Support.',
        '',
        'Tech served.',
        '',
        'I tell people: phone in breakup serves.'
      ],
      lesson: 'Phone in breakup serves.'
    },
    {
      id: 'dnv38_5',
      title: 'My phone-free family camping',
      narrative: [
        'Camping. Phones in car.',
        '',
        'Stars. Trees. Fire. Family.',
        '',
        'Best camping ever.',
        '',
        'I tell people: phone-free camping is camping.'
      ],
      lesson: 'Phone-free camping is camping.'
    },
    {
      id: 'dnv38_6',
      title: 'When AI helped me with grant report',
      narrative: [
        'Grant report due. Stuck.',
        '',
        'AI helped me structure.',
        '',
        'I wrote.',
        '',
        'Report accepted.',
        '',
        'I tell people: AI for getting unstuck.'
      ],
      lesson: 'AI for getting unstuck.'
    },
    {
      id: 'dnv38_7',
      title: 'My online community of fellow gardeners',
      narrative: [
        'I garden. Online gardening community.',
        '',
        'They share tips. Encourage. Identify pests.',
        '',
        'My garden flourishes.',
        '',
        'I tell hobbyists: online community accelerates.'
      ],
      lesson: 'Online hobby community accelerates.'
    },
    {
      id: 'dnv38_8',
      title: 'When phone caught my daughters laugh',
      narrative: [
        'Phone caught my daughter laughing.',
        '',
        'Years later it makes me cry.',
        '',
        'Tech preserved joy.',
        '',
        'I tell people: phone for capturing joy.'
      ],
      lesson: 'Phone for capturing joy.'
    },
    {
      id: 'dnv38_9',
      title: 'My phone-free morning',
      narrative: [
        'Morning routine no phone.',
        '',
        'Years of practice.',
        '',
        'My days start grounded.',
        '',
        'I tell people: protect morning.'
      ],
      lesson: 'Protect the morning.'
    },
    {
      id: 'dnv38_10',
      title: 'When AI helped me with hard email',
      narrative: [
        'Hard email to client.',
        '',
        'AI helped me frame professionally.',
        '',
        'Email landed well.',
        '',
        'I tell people: AI for professional writing.'
      ],
      lesson: 'AI for professional writing.'
    },
    {
      id: 'dnv38_11',
      title: 'My online community of fellow caregivers',
      narrative: [
        'Caring for partner.',
        '',
        'Online community.',
        '',
        'They get it.',
        '',
        'I am sustained.',
        '',
        'I tell caregivers: community matters.'
      ],
      lesson: 'Caregiver community matters.'
    },
    {
      id: 'dnv38_12',
      title: 'When phone helped me through medical procedure',
      narrative: [
        'Medical procedure.',
        '',
        'Phone connected me to family. Support.',
        '',
        'Tech served.',
        '',
        'I tell people: phone in medical serves.'
      ],
      lesson: 'Phone in medical serves.'
    },
    {
      id: 'dnv38_13',
      title: 'My phone in airplane mode for meeting',
      narrative: [
        'Important meeting. Airplane mode.',
        '',
        'No interruptions.',
        '',
        'I was focused.',
        '',
        'I tell people: airplane mode for important.'
      ],
      lesson: 'Airplane mode for important.'
    },
    {
      id: 'dnv38_14',
      title: 'My online community of fellow first time home buyers',
      narrative: [
        'Buying first home.',
        '',
        'Online community.',
        '',
        'They walked me through.',
        '',
        'I tell people: niche communities exist.'
      ],
      lesson: 'Niche communities exist.'
    },
    {
      id: 'dnv38_15',
      title: 'My today',
      narrative: [
        'Today phone serves me.',
        '',
        'Tomorrow same.',
        '',
        'Practice continues.',
        '',
        'I tell people: today.'
      ],
      lesson: 'Today.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_37 = [
    {
      id: 'dnv37_1',
      title: 'When phone caught my niece\'s first words',
      narrative: [
        'Phone was there for first words.',
        '',
        'I sent video to her grandparents across country.',
        '',
        'They cried.',
        '',
        'Phone served love.',
        '',
        'I tell people: phone for sharing love.'
      ],
      lesson: 'Phone for sharing love.'
    },
    {
      id: 'dnv37_2',
      title: 'My phone-free funeral preparation',
      narrative: [
        'Father died.',
        '',
        'Phones away during preparation. Family together.',
        '',
        'We grieved. Planned. Connected.',
        '',
        'I tell people: phone-free for sacred work.'
      ],
      lesson: 'Phone-free for sacred work.'
    },
    {
      id: 'dnv37_3',
      title: 'When AI helped me with insurance fight',
      narrative: [
        'Insurance denied. I had been overwhelmed.',
        '',
        'AI helped me understand denial. Build appeal.',
        '',
        'Won.',
        '',
        'I tell people: AI for understanding system.'
      ],
      lesson: 'AI for understanding system.'
    },
    {
      id: 'dnv37_4',
      title: 'My online community of fellow expats',
      narrative: [
        'Living abroad. Lonely.',
        '',
        'Online community of expats from my country.',
        '',
        'They get the experience.',
        '',
        'I tell expats: community online sustains.'
      ],
      lesson: 'Expat community sustains.'
    },
    {
      id: 'dnv37_5',
      title: 'When my phone helped me through pandemic',
      narrative: [
        'Pandemic isolation.',
        '',
        'Phone for video calls. Online classes. Community.',
        '',
        'Tech saved my mental health.',
        '',
        'I tell people: phone serves in isolation.'
      ],
      lesson: 'Phone serves in isolation.'
    },
    {
      id: 'dnv37_6',
      title: 'My phone-free annual retreat',
      narrative: [
        'Annual retreat phone-free.',
        '',
        'Year after year.',
        '',
        'Reset.',
        '',
        'I tell people: annual rhythm of phone-free.'
      ],
      lesson: 'Annual phone-free rhythm.'
    },
    {
      id: 'dnv37_7',
      title: 'When AI helped me with new hobby',
      narrative: [
        'Wanted to learn knitting.',
        '',
        'AI gave me starter info.',
        '',
        'Then YouTube tutorials.',
        '',
        'Then in-person class.',
        '',
        'I am knitter now.',
        '',
        'I tell people: tech can launch hobbies.'
      ],
      lesson: 'Tech can launch hobbies.'
    },
    {
      id: 'dnv37_8',
      title: 'My online community after layoff',
      narrative: [
        'Laid off at 50.',
        '',
        'Online community of laid-off workers.',
        '',
        'They get the unique pain.',
        '',
        'I tell people: even hard transitions have community.'
      ],
      lesson: 'Hard transitions have community.'
    },
    {
      id: 'dnv37_9',
      title: 'When phone helped me reconnect',
      narrative: [
        'Had not spoken with old friend in decade.',
        '',
        'Found through social media.',
        '',
        'Reconnected.',
        '',
        'Tech served love.',
        '',
        'I tell people: tech can reconnect.'
      ],
      lesson: 'Tech can reconnect.'
    },
    {
      id: 'dnv37_10',
      title: 'My phone-free hour with each child weekly',
      narrative: [
        'Built one-on-one time with each kid weekly. Phone-free.',
        '',
        'They each get an hour with me.',
        '',
        'Real conversations.',
        '',
        'I tell parents: phone-free one-on-one time.'
      ],
      lesson: 'Phone-free one-on-one time.'
    },
    {
      id: 'dnv37_11',
      title: 'When AI helped my friend with anxiety',
      narrative: [
        'Friend anxious. Asked AI for help.',
        '',
        'It guided her through grounding.',
        '',
        'She came back to body.',
        '',
        'AI as emergency tool can work.',
        '',
        'I tell people: AI for emergency techniques okay.'
      ],
      lesson: 'AI for emergency okay.'
    },
    {
      id: 'dnv37_12',
      title: 'My online community of fellow neurodivergent parents',
      narrative: [
        'Neurodivergent parent of neurodivergent kid.',
        '',
        'Online community of similar.',
        '',
        'They get the unique experience.',
        '',
        'I tell people: dual identity communities essential.'
      ],
      lesson: 'Dual identity communities essential.'
    },
    {
      id: 'dnv37_13',
      title: 'When my phone caught fraudulent charge',
      narrative: [
        'Banking app alerted me to fraud.',
        '',
        'I caught immediately. Disputed.',
        '',
        'Money returned.',
        '',
        'Tech served security.',
        '',
        'I tell people: financial alerts work.'
      ],
      lesson: 'Financial alerts work.'
    },
    {
      id: 'dnv37_14',
      title: 'My phone-free major holiday',
      narrative: [
        'Major holiday with extended family. Phones in basket.',
        '',
        'Real family gathering.',
        '',
        'We connected.',
        '',
        'I tell families: phone-free major holidays.'
      ],
      lesson: 'Phone-free major holidays.'
    },
    {
      id: 'dnv37_15',
      title: 'My ongoing practice',
      narrative: [
        'Practice continues. Imperfect. Sustained.',
        '',
        'I tell people: keep going.'
      ],
      lesson: 'Keep going.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_36 = [
    {
      id: 'dnv36_1',
      title: 'When my child asked why I checked phone so much',
      narrative: [
        'Child asked: "Mommy why you always look phone?"',
        '',
        'I had no good answer.',
        '',
        'I changed.',
        '',
        'Now they ask less. Because I am more there.',
        '',
        'I tell parents: kids see.'
      ],
      lesson: 'Kids see phone behavior.'
    },
    {
      id: 'dnv36_2',
      title: 'My phone-free birthday party',
      narrative: [
        'Kid\'s birthday party. Asked phones away.',
        '',
        'Parents grumbled. They came.',
        '',
        'Kids played. Adults talked.',
        '',
        'Best party.',
        '',
        'I tell hosts: phone-free kid parties.'
      ],
      lesson: 'Phone-free kid parties work.'
    },
    {
      id: 'dnv36_3',
      title: 'When AI helped me with my will',
      narrative: [
        'Writing will.',
        '',
        'AI explained terms. Suggested categories.',
        '',
        'I worked with lawyer.',
        '',
        'I tell people: AI for understanding, professionals for execution.'
      ],
      lesson: 'AI for understanding. Pros for execution.'
    },
    {
      id: 'dnv36_4',
      title: 'My online community of fellow disabled artists',
      narrative: [
        'Disabled artist.',
        '',
        'Online community of disabled artists.',
        '',
        'We critique. Support. Connect to opportunities.',
        '',
        'I am working artist.',
        '',
        'I tell artists: identity-based community accelerates.'
      ],
      lesson: 'Identity-based community accelerates.'
    },
    {
      id: 'dnv36_5',
      title: 'When my phone helped me get help fast',
      narrative: [
        'Emergency. Phone for 911.',
        '',
        'Help came fast.',
        '',
        'I tell people: phone for emergency is essential.'
      ],
      lesson: 'Phone for emergency essential.'
    },
    {
      id: 'dnv36_6',
      title: 'My phone-free anniversary trip',
      narrative: [
        'Anniversary trip with partner.',
        '',
        'Phones in safe.',
        '',
        '3 days fully present.',
        '',
        'I tell couples: phone-free trips for milestones.'
      ],
      lesson: 'Phone-free trips for milestones.'
    },
    {
      id: 'dnv36_7',
      title: 'When AI helped me with grant proposal',
      narrative: [
        'Writing grant. Stuck.',
        '',
        'AI helped me frame.',
        '',
        'I personalized.',
        '',
        'I got grant.',
        '',
        'I tell people: AI for getting started.'
      ],
      lesson: 'AI for getting started.'
    },
    {
      id: 'dnv36_8',
      title: 'My online community of fellow late-diagnosed ADHD',
      narrative: [
        'Diagnosed ADHD at 40.',
        '',
        'Online community of late-diagnosed.',
        '',
        'They understood.',
        '',
        'I tell late-diagnosed: community online matters.'
      ],
      lesson: 'Late-diagnosis community matters.'
    },
    {
      id: 'dnv36_9',
      title: 'When my phone helped me find apartment',
      narrative: [
        'Apartment hunt. Phone for listings. Maps. Reviews.',
        '',
        'Found great place.',
        '',
        'I tell people: phone for housing serves.'
      ],
      lesson: 'Phone for housing serves.'
    },
    {
      id: 'dnv36_10',
      title: 'My phone-free Sunday morning for years',
      narrative: [
        'No phone Sunday morning until noon. Years.',
        '',
        'Sacred. Restorative.',
        '',
        'I tell people: weekly anchor sustains.'
      ],
      lesson: 'Weekly anchor sustains.'
    },
    {
      id: 'dnv36_11',
      title: 'When AI helped me with elderly mom',
      narrative: [
        'Mom needed care.',
        '',
        'AI helped me research options. Compare.',
        '',
        'I made good decisions.',
        '',
        'I tell people: AI for research helps.'
      ],
      lesson: 'AI for research helps.'
    },
    {
      id: 'dnv36_12',
      title: 'My online community of fellow recovering',
      narrative: [
        'Recovering. Daily struggle.',
        '',
        'Online recovery community.',
        '',
        'Daily check-ins. Encouragement.',
        '',
        'I am 5 years sober.',
        '',
        'I tell people: recovery community sustains.'
      ],
      lesson: 'Recovery community sustains.'
    },
    {
      id: 'dnv36_13',
      title: 'When my phone helped me through grief',
      narrative: [
        'Father died.',
        '',
        'Phone connected me to therapy. Support group. Family.',
        '',
        'Tech served grief.',
        '',
        'I tell people: phone in grief serves.'
      ],
      lesson: 'Phone in grief serves.'
    },
    {
      id: 'dnv36_14',
      title: 'My phone-free first dates',
      narrative: [
        'First dates phone-free.',
        '',
        'I am present.',
        '',
        'I connect or do not. Truly.',
        '',
        'I tell people: phone-free dating.'
      ],
      lesson: 'Phone-free dating connects truly.'
    },
    {
      id: 'dnv36_15',
      title: 'My ongoing practice',
      narrative: [
        'Practice continues.',
        '',
        'Small daily.',
        '',
        'Sustained.',
        '',
        'I tell people: continue.'
      ],
      lesson: 'Continue.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_35 = [
    {
      id: 'dnv35_1',
      title: 'When I first realized my phone was problem',
      narrative: [
        'I was 17.',
        '',
        'I had been on phone all day every day.',
        '',
        'I checked screen time. 11 hours.',
        '',
        'I was shocked.',
        '',
        'I knew I had to change.',
        '',
        'I tell people: data shocks you to action.'
      ],
      lesson: 'Data shocks to action.'
    },
    {
      id: 'dnv35_2',
      title: 'My phone-free family vacation',
      narrative: [
        'Family vacation. All phones in safe at hotel.',
        '',
        '7 days no phones for parents and kids.',
        '',
        'Best vacation we had ever had.',
        '',
        'Kids different. Calmer. More creative.',
        '',
        'I tell families: try it.'
      ],
      lesson: 'Phone-free family vacation transforms.'
    },
    {
      id: 'dnv35_3',
      title: 'When AI helped me with my divorce papers',
      narrative: [
        'I needed to understand legal terms.',
        '',
        'AI explained.',
        '',
        'I then verified with lawyer.',
        '',
        'AI as legal explainer works.',
        '',
        'I tell people: AI for explanation. Lawyer for advice.'
      ],
      lesson: 'AI for explanation. Lawyer for advice.'
    },
    {
      id: 'dnv35_4',
      title: 'My online community of fellow widows',
      narrative: [
        'Husband died.',
        '',
        'Online community of widows.',
        '',
        'They walked with me.',
        '',
        'I am 3 years out. Still in touch with them.',
        '',
        'I tell people: widow community essential.'
      ],
      lesson: 'Widow community essential.'
    },
    {
      id: 'dnv35_5',
      title: 'When my phone helped me through divorce',
      narrative: [
        'Divorce.',
        '',
        'Phone connected me to therapist. Lawyer. Friends.',
        '',
        'Tech served crisis.',
        '',
        'I tell people: phone in crisis serves.'
      ],
      lesson: 'Phone in crisis serves.'
    },
    {
      id: 'dnv35_6',
      title: 'My phone-free Sundays for decades',
      narrative: [
        'I have had phone-free Sundays for 10 years.',
        '',
        'Sacred. Restorative.',
        '',
        'My Mondays are better.',
        '',
        'I tell people: long-term practices sustain life.'
      ],
      lesson: 'Long-term practices sustain.'
    },
    {
      id: 'dnv35_7',
      title: 'When AI helped me prepare for important conversation',
      narrative: [
        'Important conversation with boss.',
        '',
        'AI helped me prepare.',
        '',
        'Anticipated objections.',
        '',
        'I was prepared.',
        '',
        'Conversation went well.',
        '',
        'I tell people: AI for preparation works.'
      ],
      lesson: 'AI for preparation works.'
    },
    {
      id: 'dnv35_8',
      title: 'My online community of fellow stay-at-home parents',
      narrative: [
        'Stay at home parent. Lonely.',
        '',
        'Online community of fellow stay-at-home parents.',
        '',
        'Daily encouragement.',
        '',
        'I am better parent because of them.',
        '',
        'I tell people: stay-at-home parent community matters.'
      ],
      lesson: 'Stay-at-home parent community matters.'
    },
    {
      id: 'dnv35_9',
      title: 'When my phone helped me through hospitalization',
      narrative: [
        'I was hospitalized.',
        '',
        'Phone connected me to family. Friends. Comfort.',
        '',
        'Tech served me through hard time.',
        '',
        'I tell people: phone in hospital serves.'
      ],
      lesson: 'Phone in hospital serves.'
    },
    {
      id: 'dnv35_10',
      title: 'My phone in bag during ceremony',
      narrative: [
        'Important ceremony.',
        '',
        'Phone in bag. Out of sight.',
        '',
        'I was fully present.',
        '',
        'I tell people: phone in bag for ceremony.'
      ],
      lesson: 'Phone in bag for ceremony.'
    },
    {
      id: 'dnv35_11',
      title: 'When AI helped me with creative block',
      narrative: [
        'Creative block.',
        '',
        'AI gave me prompts.',
        '',
        'Words came again.',
        '',
        'I tell creators: AI for getting unstuck.'
      ],
      lesson: 'AI for getting unstuck.'
    },
    {
      id: 'dnv35_12',
      title: 'My online community of fellow refugees',
      narrative: [
        'Refugee. Far from home.',
        '',
        'Online community of fellow refugees.',
        '',
        'They preserve my culture.',
        '',
        'I tell refugees: community online preserves you.'
      ],
      lesson: 'Refugee community preserves you.'
    },
    {
      id: 'dnv35_13',
      title: 'When my phone helped me with my kid\'s school',
      narrative: [
        'Phone for school communications. Calendar. Updates.',
        '',
        'I stay involved.',
        '',
        'Tech serves parenting.',
        '',
        'I tell parents: phone for school engagement.'
      ],
      lesson: 'Phone for school engagement serves.'
    },
    {
      id: 'dnv35_14',
      title: 'My phone-free walks for years',
      narrative: [
        'Phone-free walks daily for years.',
        '',
        'My mind has space.',
        '',
        'My body has rest.',
        '',
        'My life has rhythm.',
        '',
        'I tell people: phone-free walks daily.'
      ],
      lesson: 'Phone-free walks daily.'
    },
    {
      id: 'dnv35_15',
      title: 'My ongoing practice',
      narrative: [
        'After many years my practice is sustainable.',
        '',
        'I adjust when needed.',
        '',
        'I have built support.',
        '',
        'I have community.',
        '',
        'Practice continues.',
        '',
        'I tell people: build for the long haul.'
      ],
      lesson: 'Build for the long haul.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_34 = [
    { id: 'dnv34_1', title: 'My phone-free studying', narrative: ['Studied without phone for week.', '', 'Hard at first. Then better.', '', 'My grades improved.', '', 'I tell students: phone-free study works.'], lesson: 'Phone-free study works.' },
    { id: 'dnv34_2', title: 'When AI helped me explain to my kid', narrative: ['Hard topic with kid.', '', 'Asked AI for age-appropriate way to explain.', '', 'It gave me approach.', '', 'I had good conversation with kid.', '', 'I tell parents: AI for parenting prep.'], lesson: 'AI for parenting prep helps.' },
    { id: 'dnv34_3', title: 'My online community of fellow grad students', narrative: ['Grad school. Isolated.', '', 'Online community of grad students.', '', 'They get it.', '', 'I survived dissertation.', '', 'I tell grad students: community online matters.'], lesson: 'Grad student community matters.' },
    { id: 'dnv34_4', title: 'When my phone connected me to distant grandparent', narrative: ['Grandparent across country.', '', 'Weekly video calls.', '', 'We stayed close until she died.', '', 'Phone served love.', '', 'I tell people: phone for love is gift.'], lesson: 'Phone for love is gift.' },
    { id: 'dnv34_5', title: 'My phone-free funeral', narrative: ['Father\'s funeral. Phones away.', '', 'I grieved fully.', '', 'I tell people: phone-free funerals sacred.'], lesson: 'Phone-free funerals sacred.' },
    { id: 'dnv34_6', title: 'When AI helped my friend with anxiety', narrative: ['Friend anxious.', '', 'I shared grounding apps with her.', '', 'Helped her.', '', 'I tell people: share tools that work.'], lesson: 'Share tools that work.' },
    { id: 'dnv34_7', title: 'My online community for grief', narrative: ['Mother died.', '', 'Online grief community.', '', 'They walked with me.', '', 'I tell people: grief online is real.'], lesson: 'Grief online is real.' },
    { id: 'dnv34_8', title: 'When phone helped me through divorce', narrative: ['Divorce.', '', 'Phone for therapist appointments. Support group. Family check-ins.', '', 'Tech served.', '', 'I tell people: phone for hard times serves.'], lesson: 'Phone for hard times serves.' },
    { id: 'dnv34_9', title: 'My phone-free walk with partner', narrative: ['Walk with partner. No phones.', '', 'We talked deeply.', '', 'Connected.', '', 'I tell couples: phone-free walks.'], lesson: 'Phone-free walks deepen relationships.' },
    { id: 'dnv34_10', title: 'When AI helped me apologize', narrative: ['Owed apology.', '', 'AI helped me frame.', '', 'I personalized.', '', 'Apology landed.', '', 'I tell people: AI for difficult writing tasks.'], lesson: 'AI for difficult writing tasks.' },
    { id: 'dnv34_11', title: 'My online support after sibling lost', narrative: ['Sibling died.', '', 'Online community of sibling loss.', '', 'I tell people: every loss has community.'], lesson: 'Every loss has community.' },
    { id: 'dnv34_12', title: 'When my phone\'s calendar saved my year', narrative: ['Used calendar to plan year intentionally.', '', 'Time blocking for goals.', '', 'I accomplished more.', '', 'I tell people: calendar serves intention.'], lesson: 'Calendar serves intention.' },
    { id: 'dnv34_13', title: 'My phone-free yoga retreat', narrative: ['Retreat. Phones away.', '', 'I was different by end.', '', 'I tell people: retreats with phones away transform.'], lesson: 'Retreats with phones away transform.' },
    { id: 'dnv34_14', title: 'When AI helped me with grief letter', narrative: ['Wrote to my dying friend.', '', 'AI helped me find words.', '', 'I personalized deeply.', '', 'Friend received before passing.', '', 'I tell people: AI as bridge for sacred writing.'], lesson: 'AI as bridge for sacred writing.' },
    { id: 'dnv34_15', title: 'My today practice', narrative: ['Today phone in drawer.', '', 'Writing.', '', 'Phone-free meal at noon.', '', 'Conversation with friend in evening.', '', 'Practice continues.', '', 'I tell people: today.'], lesson: 'Today.' }
  ];

  var DEEP_NARRATIVES_VOLUME_33 = [
    {
      id: 'dnv33_1',
      title: 'When AI helped me write to my dying friend',
      narrative: [
        'Friend dying of cancer.',
        '',
        'I had been frozen on what to write.',
        '',
        'Asked AI for help.',
        '',
        'It gave framework.',
        '',
        'I personalized. Wrote my heart.',
        '',
        'Friend received letter before dying.',
        '',
        'I tell people: AI as bridge for hard writing.'
      ],
      lesson: 'AI as bridge for hard writing.'
    },
    {
      id: 'dnv33_2',
      title: 'My phone-free hospital birth',
      narrative: [
        'Gave birth. Phones in bag.',
        '',
        'I was present with partner. With baby.',
        '',
        'Real birth experience.',
        '',
        'I tell people: phone-free birth is birth.'
      ],
      lesson: 'Phone-free birth is birth.'
    },
    {
      id: 'dnv33_3',
      title: 'When online community celebrated my recovery',
      narrative: [
        'Recovering addict.',
        '',
        'Online community celebrated my milestones.',
        '',
        'They had been with me through dark days.',
        '',
        'I tell people: recovery community matters.'
      ],
      lesson: 'Recovery community matters.'
    },
    {
      id: 'dnv33_4',
      title: 'My phone-free pre-bed ritual',
      narrative: [
        'Phone in another room 9 pm.',
        '',
        'Read paper book.',
        '',
        'Journal.',
        '',
        'Bath.',
        '',
        'Sleep.',
        '',
        'Best sleep of my life.',
        '',
        'I tell people: bedtime ritual phone-free.'
      ],
      lesson: 'Bedtime ritual phone-free transforms sleep.'
    },
    {
      id: 'dnv33_5',
      title: 'When AI helped me with relationship insight',
      narrative: [
        'Stuck in relationship pattern.',
        '',
        'AI helped me see pattern.',
        '',
        'I worked it out with therapist.',
        '',
        'I tell people: AI as mirror sometimes.'
      ],
      lesson: 'AI as mirror sometimes.'
    },
    {
      id: 'dnv33_6',
      title: 'My online community of fellow PCOS',
      narrative: [
        'PCOS diagnosis.',
        '',
        'Online community of women with PCOS.',
        '',
        'They taught me management.',
        '',
        'I tell women: rare diagnosis communities exist.'
      ],
      lesson: 'Specific medical communities exist.'
    },
    {
      id: 'dnv33_7',
      title: 'When my phone helped my dad with depression',
      narrative: [
        'Dad depressed.',
        '',
        'I helped him use therapy app between visits.',
        '',
        'It supplemented therapy.',
        '',
        'Tech served his recovery.',
        '',
        'I tell people: tech can support therapy.'
      ],
      lesson: 'Tech can support therapy.'
    },
    {
      id: 'dnv33_8',
      title: 'My phone-free wedding',
      narrative: [
        'My wedding. We asked phones away during ceremony.',
        '',
        'Guests grumbled briefly.',
        '',
        'Then they were there.',
        '',
        'Photos from photographer. Memories from being there.',
        '',
        'I tell couples: phone-free wedding ceremony.'
      ],
      lesson: 'Phone-free weddings sacred.'
    },
    {
      id: 'dnv33_9',
      title: 'When AI helped me with insomnia',
      narrative: [
        'Insomnia. Asked AI for sleep hygiene.',
        '',
        'It gave detailed approach.',
        '',
        'I implemented.',
        '',
        'Sleep improved.',
        '',
        'I verified with doctor.',
        '',
        'I tell people: AI for general health info okay.'
      ],
      lesson: 'AI for general health info okay.'
    },
    {
      id: 'dnv33_10',
      title: 'My online community of single dads',
      narrative: [
        'Single dad. Lonely.',
        '',
        'Online community of single dads.',
        '',
        'They get it.',
        '',
        'I tell single dads: community online exists.'
      ],
      lesson: 'Single dad community exists.'
    },
    {
      id: 'dnv33_11',
      title: 'When phone caught my dog\'s last day',
      narrative: [
        'My dog was dying.',
        '',
        'I had been documenting our last day.',
        '',
        'Then I stopped. Put phone away.',
        '',
        'I was with him.',
        '',
        'When he died, I was there.',
        '',
        'I tell people: be there.'
      ],
      lesson: 'Be there. Not behind phone.'
    },
    {
      id: 'dnv33_12',
      title: 'My phone for emergency',
      narrative: [
        'Accident. Phone for 911. Photos for insurance. Contacts for help.',
        '',
        'Phone served crisis.',
        '',
        'I tell people: phone in crisis is tool.'
      ],
      lesson: 'Phone in crisis is tool.'
    },
    {
      id: 'dnv33_13',
      title: 'When my phone helped me find therapy',
      narrative: [
        'Needed therapist.',
        '',
        'Phone for finding. Filtering. Insurance check.',
        '',
        'Found right therapist.',
        '',
        'Tech served wellbeing.',
        '',
        'I tell people: phone serves health search.'
      ],
      lesson: 'Phone serves health search.'
    },
    {
      id: 'dnv33_14',
      title: 'My online community of writers',
      narrative: [
        'I am writer.',
        '',
        'Online community of writers.',
        '',
        'Daily. Encouragement. Critique.',
        '',
        'Writing has deepened.',
        '',
        'I tell writers: community accelerates.'
      ],
      lesson: 'Writer community accelerates.'
    },
    {
      id: 'dnv33_15',
      title: 'My closing reflection',
      narrative: [
        'I have shared stories from many angles.',
        '',
        'Digital wellbeing is complex.',
        '',
        'It is not all bad or all good.',
        '',
        'It is practice.',
        '',
        'Daily. Imperfect. Sustained.',
        '',
        'I tell people: build your own practice.'
      ],
      lesson: 'Build your own practice.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_32 = [
    {
      id: 'dnv32_1',
      title: 'When I helped my friend break phone addiction',
      narrative: [
        'Friend admitted phone addiction.',
        '',
        'I helped her plan structural changes.',
        '',
        'Notifications off. Apps deleted. Time limits.',
        '',
        'She struggled. I supported.',
        '',
        'Months later she is different.',
        '',
        'I tell people: friends can support change.'
      ],
      lesson: 'Friends can support phone change.'
    },
    {
      id: 'dnv32_2',
      title: 'My phone-free 50th birthday',
      narrative: [
        '50th birthday. Phone-free weekend with family.',
        '',
        'Real conversations.',
        '',
        'Photos came from photographer.',
        '',
        'Memory came from being there.',
        '',
        'I tell people: phone-free milestones.'
      ],
      lesson: 'Phone-free milestones beautiful.'
    },
    {
      id: 'dnv32_3',
      title: 'When AI helped me journal',
      narrative: [
        'I had been blocked on journaling.',
        '',
        'AI asked me questions.',
        '',
        'I responded by writing.',
        '',
        'Words came.',
        '',
        'AI as journal prompt works.',
        '',
        'I tell people: AI as journal prompt helps.'
      ],
      lesson: 'AI as journal prompt helps.'
    },
    {
      id: 'dnv32_4',
      title: 'My online community of fellow midlife',
      narrative: [
        'Midlife crisis at 45.',
        '',
        'Online community of others in midlife.',
        '',
        'They got it.',
        '',
        'I tell people: midlife has community.'
      ],
      lesson: 'Midlife has community.'
    },
    {
      id: 'dnv32_5',
      title: 'When my phone served as compass',
      narrative: [
        'Lost in city. Phone for maps.',
        '',
        'Got me home.',
        '',
        'Tech for navigation serves.',
        '',
        'I tell people: phone for navigation good.'
      ],
      lesson: 'Phone for navigation good.'
    },
    {
      id: 'dnv32_6',
      title: 'My phone-free yoga class',
      narrative: [
        'Yoga teacher asked: leave phones at door.',
        '',
        'I had been resistant.',
        '',
        'I did it.',
        '',
        'Class was deeper.',
        '',
        'I tell people: phone-free yoga is yoga.'
      ],
      lesson: 'Phone-free yoga is yoga.'
    },
    {
      id: 'dnv32_7',
      title: 'When AI helped my child with autism',
      narrative: [
        'Autistic child stuck on emotion.',
        '',
        'AI helped them identify.',
        '',
        'They worked it out.',
        '',
        'AI as accommodation works for autism sometimes.',
        '',
        'I tell families: explore AI accommodations.'
      ],
      lesson: 'Explore AI accommodations.'
    },
    {
      id: 'dnv32_8',
      title: 'My online community of fellow chronically ill',
      narrative: [
        'Chronic illness.',
        '',
        'Online community.',
        '',
        'They get it.',
        '',
        'I am managed better.',
        '',
        'I tell people: chronic illness has online community.'
      ],
      lesson: 'Chronic illness has online community.'
    },
    {
      id: 'dnv32_9',
      title: 'My phone-free Tuesday morning',
      narrative: [
        'Every Tuesday morning. Phone-free until 10 am.',
        '',
        'Sacred. Restorative.',
        '',
        'Sets tone for week.',
        '',
        'I tell people: weekly anchor practice.'
      ],
      lesson: 'Weekly anchor practice sustains.'
    },
    {
      id: 'dnv32_10',
      title: 'When AI helped me argue with insurance',
      narrative: [
        'Insurance denied claim.',
        '',
        'Asked AI to help me draft appeal.',
        '',
        'It gave me framework.',
        '',
        'I appealed. Won.',
        '',
        'I tell people: AI for appeals works.'
      ],
      lesson: 'AI for appeals works.'
    },
    {
      id: 'dnv32_11',
      title: 'My online community after I came out at 50',
      narrative: [
        'Came out late.',
        '',
        'Online community of late-out LGBTQ.',
        '',
        'They understood.',
        '',
        'I am thriving.',
        '',
        'I tell people: late-out community exists.'
      ],
      lesson: 'Late-out community exists.'
    },
    {
      id: 'dnv32_12',
      title: 'When phone helped me through anxiety',
      narrative: [
        'Anxiety. Phone with calming apps. Crisis lines.',
        '',
        'Phone served when bad.',
        '',
        'I tell people: phone serves crisis when used well.'
      ],
      lesson: 'Phone serves crisis.'
    },
    {
      id: 'dnv32_13',
      title: 'My phone in pocket during important talk',
      narrative: [
        'Hard conversation with family.',
        '',
        'Phone in pocket. Out of sight.',
        '',
        'I was fully present.',
        '',
        'We connected.',
        '',
        'I tell people: phone in pocket for important.'
      ],
      lesson: 'Phone in pocket for important.'
    },
    {
      id: 'dnv32_14',
      title: 'My online community of fellow caregivers of aging parents',
      narrative: [
        'Caring for aging mom.',
        '',
        'Online community of fellow caregivers.',
        '',
        'They get it.',
        '',
        'I tell people: caregiver community matters.'
      ],
      lesson: 'Caregiver community matters.'
    },
    {
      id: 'dnv32_15',
      title: 'My phone today',
      narrative: [
        'Today phone is in drawer.',
        '',
        'I am writing.',
        '',
        'Practice continues.',
        '',
        'Today.',
        '',
        'I tell people: today is the practice.'
      ],
      lesson: 'Today is the practice.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_31 = [
    {
      id: 'dnv31_1',
      title: 'My family rules around phones',
      narrative: [
        'We have family rules.',
        '',
        'Phone-free meals.',
        '',
        'No phones first hour after waking.',
        '',
        'No phones last hour before sleep.',
        '',
        'Phones in basket during family time.',
        '',
        'Kids and adults follow.',
        '',
        'Family connects.',
        '',
        'I tell families: agree together. Follow together.'
      ],
      lesson: 'Family rules need family agreement.'
    },
    {
      id: 'dnv31_2',
      title: 'When AI helped me organize life',
      narrative: [
        'I had been overwhelmed.',
        '',
        'AI helped me organize tasks.',
        '',
        'Plan week. Prioritize.',
        '',
        'I felt control return.',
        '',
        'AI as task manager works.',
        '',
        'I tell people: AI for organizing tasks.'
      ],
      lesson: 'AI for organizing tasks.'
    },
    {
      id: 'dnv31_3',
      title: 'My online community of fellow first-gen',
      narrative: [
        'I am first-gen college student.',
        '',
        'Online community of fellow first-gens.',
        '',
        'They understood my unique struggles.',
        '',
        'I graduated.',
        '',
        'I tell first-gens: find community.'
      ],
      lesson: 'First-gen community matters.'
    },
    {
      id: 'dnv31_4',
      title: 'When my phone helped find me when lost',
      narrative: [
        'Got lost hiking. Phone signal weak.',
        '',
        'GPS still worked. I found trail.',
        '',
        'Phone saved my life.',
        '',
        'I tell people: phone for safety in nature okay.'
      ],
      lesson: 'Phone for safety in nature.'
    },
    {
      id: 'dnv31_5',
      title: 'My phone-free hospital stay',
      narrative: [
        'Stayed with partner in hospital.',
        '',
        'I limited phone. Focused on them.',
        '',
        'They needed me present.',
        '',
        'I was there.',
        '',
        'I tell people: phone-light at bedside.'
      ],
      lesson: 'Phone-light at bedside.'
    },
    {
      id: 'dnv31_6',
      title: 'When AI helped me think through career',
      narrative: [
        'I had been stuck on career.',
        '',
        'Asked AI to interview me about my goals.',
        '',
        'It asked good questions.',
        '',
        'I clarified my own thinking.',
        '',
        'I made career change.',
        '',
        'AI as coaching tool can help.',
        '',
        'I tell people: AI for thinking through career.'
      ],
      lesson: 'AI for thinking through career.'
    },
    {
      id: 'dnv31_7',
      title: 'My online community of fellow career changers',
      narrative: [
        'Changed careers at 45.',
        '',
        'Online community of career changers.',
        '',
        'They had been there.',
        '',
        'I succeeded.',
        '',
        'I tell people: career change has community.'
      ],
      lesson: 'Career change has community.'
    },
    {
      id: 'dnv31_8',
      title: 'When my phone helped me through cancer',
      narrative: [
        'Cancer diagnosis.',
        '',
        'Phone connected me to support. Information. Family.',
        '',
        'Tech served me through treatment.',
        '',
        'I am 5 years cancer-free.',
        '',
        'I tell people: phone for serious illness serves.'
      ],
      lesson: 'Phone for serious illness serves.'
    },
    {
      id: 'dnv31_9',
      title: 'My phone-free Christmas',
      narrative: [
        'Christmas. Phones in basket.',
        '',
        'Family really together.',
        '',
        'Best Christmas in years.',
        '',
        'I tell families: phone-free holidays.'
      ],
      lesson: 'Phone-free holidays connect.'
    },
    {
      id: 'dnv31_10',
      title: 'When AI helped me write thank you note',
      narrative: [
        'Hard thank you to write.',
        '',
        'Asked AI for help drafting.',
        '',
        'It gave framework.',
        '',
        'I personalized.',
        '',
        'Note landed beautifully.',
        '',
        'I tell people: AI for difficult writing.'
      ],
      lesson: 'AI for difficult writing.'
    },
    {
      id: 'dnv31_11',
      title: 'My online community of fellow late bloomers',
      narrative: [
        'I am late bloomer.',
        '',
        'Online community of fellow late bloomers.',
        '',
        'They affirmed my path.',
        '',
        'I tell people: there is community for every path.'
      ],
      lesson: 'There is community for every path.'
    },
    {
      id: 'dnv31_12',
      title: 'When my phone helped me through panic',
      narrative: [
        'Panic in grocery store.',
        '',
        'Used app for grounding.',
        '',
        'Came back to body.',
        '',
        'Finished shopping.',
        '',
        'I tell people: emergency grounding apps work.'
      ],
      lesson: 'Emergency grounding apps work.'
    },
    {
      id: 'dnv31_13',
      title: 'My phone-free week meditation',
      narrative: [
        'Whole week meditation. Phone-free.',
        '',
        'I came back changed.',
        '',
        'Calmer. Clearer.',
        '',
        'I do annual meditation retreats now.',
        '',
        'I tell people: try meditation retreat.'
      ],
      lesson: 'Meditation retreats transform.'
    },
    {
      id: 'dnv31_14',
      title: 'When my online support after rape',
      narrative: [
        'Sexual assault.',
        '',
        'Could not speak about it offline.',
        '',
        'Online survivor community.',
        '',
        'They believed me.',
        '',
        'I healed slowly.',
        '',
        'I tell survivors: online community believes.'
      ],
      lesson: 'Online survivor community believes.'
    },
    {
      id: 'dnv31_15',
      title: 'My today',
      narrative: [
        'Today phone is in drawer.',
        '',
        'I am writing.',
        '',
        'I will check phone at lunch.',
        '',
        'Phone serves me.',
        '',
        'I serve life.',
        '',
        'Practice continues.',
        '',
        'I tell people: today is the practice.'
      ],
      lesson: 'Today is the practice.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_30 = [
    {
      id: 'dnv30_1',
      title: 'When my child went phone-free for summer',
      narrative: [
        'Kid 14. We took phone for summer.',
        '',
        'Hard first weeks. Then transformation.',
        '',
        'Read 12 books. Built treehouse. Made real friends.',
        '',
        'When phone returned in fall, different relationship.',
        '',
        'I tell parents: summer is great phone break.'
      ],
      lesson: 'Summer phone break transforms.'
    },
    {
      id: 'dnv30_2',
      title: 'My online community after my child died',
      narrative: [
        'Child died at 8.',
        '',
        'Online community of bereaved parents.',
        '',
        'Only place I could speak.',
        '',
        'They walked with me through.',
        '',
        'I am 5 years out. Still in touch.',
        '',
        'I tell people: bereaved parent community essential.'
      ],
      lesson: 'Bereaved parent community essential.'
    },
    {
      id: 'dnv30_3',
      title: 'When phone caught the meteor',
      narrative: [
        'Meteor at night.',
        '',
        'Phone caught it.',
        '',
        'Memory preserved.',
        '',
        'Tech serves wonder.',
        '',
        'I tell people: phone for wonder is gift.'
      ],
      lesson: 'Phone for wonder is gift.'
    },
    {
      id: 'dnv30_4',
      title: 'My phone-free meditation retreat',
      narrative: [
        '10-day silent meditation retreat. No phones.',
        '',
        'Hard but transformative.',
        '',
        'I returned changed.',
        '',
        'I tell people: phone-free retreats transform.'
      ],
      lesson: 'Phone-free retreats transform.'
    },
    {
      id: 'dnv30_5',
      title: 'When AI helped me with my child',
      narrative: [
        'Child going through hard time.',
        '',
        'Asked AI for parenting strategies.',
        '',
        'It gave me approaches.',
        '',
        'I tried. Some worked.',
        '',
        'AI as parenting resource works.',
        '',
        'I tell parents: AI for strategies, humans for hearts.'
      ],
      lesson: 'AI for strategies. Humans for hearts.'
    },
    {
      id: 'dnv30_6',
      title: 'My online community of fellow refugees',
      narrative: [
        'I am refugee.',
        '',
        'Online community of others from my home country.',
        '',
        'We share culture. Language. Memories.',
        '',
        'I am less alone.',
        '',
        'I tell refugees: community online preserves you.'
      ],
      lesson: 'Refugee community online preserves.'
    },
    {
      id: 'dnv30_7',
      title: 'When my phone caught break-in',
      narrative: [
        'Camera caught break-in.',
        '',
        'Police used footage.',
        '',
        'Thief caught.',
        '',
        'Tech served justice.',
        '',
        'I tell people: tech can serve security.'
      ],
      lesson: 'Tech can serve security.'
    },
    {
      id: 'dnv30_8',
      title: 'My phone-free hospice visits',
      narrative: [
        'Grandmother in hospice.',
        '',
        'I put phone away. Sat with her.',
        '',
        'Listened to her stories. Held her hand.',
        '',
        'Phone-free for sacred time.',
        '',
        'I tell people: hospice phone-free.'
      ],
      lesson: 'Hospice phone-free.'
    },
    {
      id: 'dnv30_9',
      title: 'When AI helped my disability',
      narrative: [
        'I have visual disability.',
        '',
        'AI accessibility features serve me.',
        '',
        'Reading. Voice description. Navigation.',
        '',
        'Tech serves disability.',
        '',
        'I tell disabled people: explore accessibility features.'
      ],
      lesson: 'Accessibility features serve.'
    },
    {
      id: 'dnv30_10',
      title: 'My online community of teen survivors',
      narrative: [
        'Sexual assault survivor.',
        '',
        'Online community of survivors.',
        '',
        'They believed me.',
        '',
        'I survived because of them.',
        '',
        'I tell survivors: community online believes you.'
      ],
      lesson: 'Survivor community online believes.'
    },
    {
      id: 'dnv30_11',
      title: 'When phone helped me through pandemic',
      narrative: [
        'Pandemic isolation.',
        '',
        'Phone connected me. Video calls. Texts. Online community.',
        '',
        'Tech saved my mental health.',
        '',
        'I tell people: phone in isolation serves.'
      ],
      lesson: 'Phone in isolation serves.'
    },
    {
      id: 'dnv30_12',
      title: 'My phone-free 40th birthday',
      narrative: [
        '40th birthday. Phone-free dinner.',
        '',
        'Friends grumbled briefly.',
        '',
        'We had real conversations.',
        '',
        'Best birthday I had.',
        '',
        'I tell people: phone-free major birthdays.'
      ],
      lesson: 'Phone-free birthdays beautiful.'
    },
    {
      id: 'dnv30_13',
      title: 'When my phone helped me with new language',
      narrative: [
        'Learning Spanish.',
        '',
        'Apps. Conversation partners online.',
        '',
        'I am fluent.',
        '',
        'Tech served learning.',
        '',
        'I tell people: tech for language is good.'
      ],
      lesson: 'Tech for language works.'
    },
    {
      id: 'dnv30_14',
      title: 'My online support for fertility journey',
      narrative: [
        'Fertility struggles.',
        '',
        'Online community of others.',
        '',
        'They walked with me.',
        '',
        'I tell people: invisible struggles have online community.'
      ],
      lesson: 'Invisible struggles have online community.'
    },
    {
      id: 'dnv30_15',
      title: 'My final story',
      narrative: [
        'I have shared many stories.',
        '',
        'Each has lesson.',
        '',
        'Each came from real life.',
        '',
        'Digital wellbeing is practice.',
        '',
        'Practice forever.',
        '',
        'I tell people: practice. Forever. Imperfectly. With love.'
      ],
      lesson: 'Practice forever. Imperfectly. With love.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_29 = [
    {
      id: 'dnv29_1',
      title: 'When AI helped me with my marriage',
      narrative: [
        'I had been struggling in marriage.',
        '',
        'Asked AI to help me communicate clearly with partner.',
        '',
        'AI gave framework.',
        '',
        'I used it. We had productive conversation.',
        '',
        'AI as tool for relationship work helps.',
        '',
        'I tell people: AI for tools. Humans for hearts.'
      ],
      lesson: 'AI for tools. Humans for hearts.'
    },
    {
      id: 'dnv29_2',
      title: 'My phone fast for Lent',
      narrative: [
        'Gave up social media for 40 days of Lent.',
        '',
        'Hard at first.',
        '',
        'Then transformative.',
        '',
        'I returned briefly. Was anxious again.',
        '',
        'I left permanently.',
        '',
        'I tell people: seasonal fasts reveal.'
      ],
      lesson: 'Seasonal fasts reveal truth.'
    },
    {
      id: 'dnv29_3',
      title: 'My online community of fellow neurodivergent',
      narrative: [
        'I am neurodivergent.',
        '',
        'Online community of fellow ND people.',
        '',
        'They get the unique experience.',
        '',
        'Daily validation. Strategy.',
        '',
        'I am better managed.',
        '',
        'I tell ND people: find community.'
      ],
      lesson: 'ND community online matters.'
    },
    {
      id: 'dnv29_4',
      title: 'When my phone helped me find lost relatives',
      narrative: [
        'Searched ancestry online.',
        '',
        'Found cousins I had not known existed.',
        '',
        'We reconnected.',
        '',
        'Family expanded.',
        '',
        'I tell people: ancestry tech can serve.'
      ],
      lesson: 'Ancestry tech can serve.'
    },
    {
      id: 'dnv29_5',
      title: 'My phone-free hospital visit',
      narrative: [
        'Visited friend in hospital.',
        '',
        'I put phone away.',
        '',
        'I was present with them.',
        '',
        'They needed me.',
        '',
        'I was there.',
        '',
        'I tell people: phone-free for important visits.'
      ],
      lesson: 'Phone-free for important visits.'
    },
    {
      id: 'dnv29_6',
      title: 'When AI helped me with anxiety in moment',
      narrative: [
        'Anxiety attack starting.',
        '',
        'Asked AI to help me ground.',
        '',
        'It guided me through 5-4-3-2-1.',
        '',
        'I came back.',
        '',
        'AI as emergency grounding worked.',
        '',
        'I tell people: AI for emergency techniques okay.'
      ],
      lesson: 'AI for emergency techniques okay.'
    },
    {
      id: 'dnv29_7',
      title: 'My online community of fellow disabled writers',
      narrative: [
        'I am disabled writer.',
        '',
        'Online community of fellow disabled writers.',
        '',
        'They critique. Encourage. Connect me with publishers.',
        '',
        'I am published.',
        '',
        'I tell people: writer community accelerates.'
      ],
      lesson: 'Writer community accelerates.'
    },
    {
      id: 'dnv29_8',
      title: 'When my phone helped me through chronic pain',
      narrative: [
        'Chronic pain. Phone helped me track. Connect. Distract.',
        '',
        'Tech served me through worst.',
        '',
        'I tell people: phone serves chronic illness.'
      ],
      lesson: 'Phone serves chronic illness.'
    },
    {
      id: 'dnv29_9',
      title: 'My phone-free 10-year anniversary',
      narrative: [
        'Wife and I went phone-free for 10-year anniversary weekend.',
        '',
        'Cabin. No phone signal.',
        '',
        'Real anniversary.',
        '',
        'Best of our marriage.',
        '',
        'I tell couples: phone-free big milestones.'
      ],
      lesson: 'Phone-free big milestones.'
    },
    {
      id: 'dnv29_10',
      title: 'When my phone caught my dad cheating',
      narrative: [
        'Hard story.',
        '',
        'I found messages. Confronted dad.',
        '',
        'Family changed forever.',
        '',
        'Phone revealed truth.',
        '',
        'I tell people: tech reveals.'
      ],
      lesson: 'Tech reveals truth.'
    },
    {
      id: 'dnv29_11',
      title: 'My online community of fellow climbers',
      narrative: [
        'I rock climb.',
        '',
        'Online community of climbers.',
        '',
        'Tips. Routes. Community.',
        '',
        'I climb better.',
        '',
        'I tell hobbyists: online community accelerates.'
      ],
      lesson: 'Online hobby community accelerates.'
    },
    {
      id: 'dnv29_12',
      title: 'When phone took the picture I needed',
      narrative: [
        'Captured my child\'s first steps.',
        '',
        'Sent to my parents across country.',
        '',
        'They cried.',
        '',
        'Phone served love.',
        '',
        'I tell people: phone for love is gift.'
      ],
      lesson: 'Phone for love is gift.'
    },
    {
      id: 'dnv29_13',
      title: 'My phone limit for kid',
      narrative: [
        'Kid is 12. Limited phone use.',
        '',
        'Hard for them. Worth it.',
        '',
        'They are healthier.',
        '',
        'I tell parents: limit. Even if they resist.'
      ],
      lesson: 'Limit kid phone use.'
    },
    {
      id: 'dnv29_14',
      title: 'My online community of newly diagnosed',
      narrative: [
        'Diagnosed with serious condition.',
        '',
        'Online community of newly diagnosed.',
        '',
        'They understood the fear.',
        '',
        'I am managing.',
        '',
        'I tell people: newly diagnosed need community.'
      ],
      lesson: 'Newly diagnosed need community.'
    },
    {
      id: 'dnv29_15',
      title: 'My ongoing practice',
      narrative: [
        'Practice continues.',
        '',
        'Small daily.',
        '',
        'Sustained.',
        '',
        'I tell people: keep going.'
      ],
      lesson: 'Keep going.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_28 = [
    {
      id: 'dnv28_1',
      title: 'When my partner gave me a deadline',
      narrative: [
        'Partner: "Phone away by 9 pm or I am sleeping in spare room."',
        '',
        'I had been hurt.',
        '',
        'Then I tried.',
        '',
        'Sleep improved. Intimacy improved. Marriage improved.',
        '',
        'I tell people: partner ultimatums are sometimes love.'
      ],
      lesson: 'Partner phone ultimatums can be love.'
    },
    {
      id: 'dnv28_2',
      title: 'My phone-free workout',
      narrative: [
        'Started working out phone-free.',
        '',
        'No music. No timer. Just me and movement.',
        '',
        'Different muscle. More present.',
        '',
        'I tell people: phone-free workouts.'
      ],
      lesson: 'Phone-free workouts deepen.'
    },
    {
      id: 'dnv28_3',
      title: 'When AI helped me budget my time',
      narrative: [
        'Asked AI to help me budget time.',
        '',
        'It walked me through my activities.',
        '',
        'I saw where time went.',
        '',
        'I made changes.',
        '',
        'I tell people: AI for time analysis works.'
      ],
      lesson: 'AI for time analysis helps.'
    },
    {
      id: 'dnv28_4',
      title: 'My online community of fellow autistic dads',
      narrative: [
        'I am autistic dad.',
        '',
        'Online community of autistic dads.',
        '',
        'They get the unique experience.',
        '',
        'I am better parent because of them.',
        '',
        'I tell people: dual identity communities exist.'
      ],
      lesson: 'Dual identity communities exist.'
    },
    {
      id: 'dnv28_5',
      title: 'When my phone died at concert again',
      narrative: [
        'Concert. Phone died.',
        '',
        'I had been forced to enjoy.',
        '',
        'I sang. I danced. I was there.',
        '',
        'Best concert I had.',
        '',
        'I now bring backup battery so I can charge if needed. AND I keep phone in pocket through show.',
        '',
        'I tell people: phone-light at concerts.'
      ],
      lesson: 'Phone-light at concerts is concert.'
    },
    {
      id: 'dnv28_6',
      title: 'My online community of fellow adopted kids',
      narrative: [
        'I am adopted.',
        '',
        'Online community of adoptees.',
        '',
        'They get it.',
        '',
        'I am less alone.',
        '',
        'I tell adoptees: community online matters.'
      ],
      lesson: 'Adoptee community online matters.'
    },
    {
      id: 'dnv28_7',
      title: 'When my phone tracked my mood',
      narrative: [
        'Mood tracker app. Daily check-ins.',
        '',
        'Data showed patterns I had not seen.',
        '',
        'Triggers. Better days.',
        '',
        'I used data with therapist.',
        '',
        'I tell people: mood data can serve.'
      ],
      lesson: 'Mood data serves understanding.'
    },
    {
      id: 'dnv28_8',
      title: 'My phone-free morning coffee',
      narrative: [
        'Built habit: morning coffee no phone.',
        '',
        '30 minutes with my coffee. Window. Thoughts.',
        '',
        'Sacred time.',
        '',
        'I tell people: protect morning coffee.'
      ],
      lesson: 'Morning coffee phone-free is sacred.'
    },
    {
      id: 'dnv28_9',
      title: 'When my mom texted me at 3 am',
      narrative: [
        'Mom in crisis. Texted middle of night.',
        '',
        'I called.',
        '',
        'Stayed on phone hours.',
        '',
        'She got through.',
        '',
        'Phone served crisis.',
        '',
        'I tell people: phone for crisis is gift.'
      ],
      lesson: 'Phone for crisis is gift.'
    },
    {
      id: 'dnv28_10',
      title: 'My online support after job promotion',
      narrative: [
        'Got promotion. Imposter syndrome.',
        '',
        'Online community of newly promoted.',
        '',
        'They had been there.',
        '',
        'They helped me settle in.',
        '',
        'I tell people: even good things have communities.'
      ],
      lesson: 'Even good transitions have communities.'
    },
    {
      id: 'dnv28_11',
      title: 'When phone helped my kid with homework',
      narrative: [
        'Kid stuck on homework.',
        '',
        'We used phone for educational app.',
        '',
        'Concept clicked.',
        '',
        'Phone served learning.',
        '',
        'I tell parents: phones serve when used well.'
      ],
      lesson: 'Phones serve when used well.'
    },
    {
      id: 'dnv28_12',
      title: 'My online community of fellow infertility',
      narrative: [
        'Couldnt conceive.',
        '',
        'Online infertility community.',
        '',
        'They got it.',
        '',
        'I conceived eventually.',
        '',
        'I tell people: invisible struggles have communities.'
      ],
      lesson: 'Invisible struggles have communities.'
    },
    {
      id: 'dnv28_13',
      title: 'When my phone reminded me to call mom',
      narrative: [
        'Phone reminder: "Call mom."',
        '',
        'I called.',
        '',
        'She was lonely.',
        '',
        'We talked an hour.',
        '',
        'Phone served love.',
        '',
        'I tell people: phone reminders for love work.'
      ],
      lesson: 'Phone reminders for love work.'
    },
    {
      id: 'dnv28_14',
      title: 'My phone-free 30th birthday',
      narrative: [
        'Friends agreed: my 30th phone-free.',
        '',
        'Beautiful dinner.',
        '',
        'No documentation. Pure presence.',
        '',
        'Best birthday I had.',
        '',
        'I tell people: phone-free major birthdays.'
      ],
      lesson: 'Phone-free major birthdays.'
    },
    {
      id: 'dnv28_15',
      title: 'My phone serves',
      narrative: [
        'After years of work my phone serves me.',
        '',
        'I serve my life.',
        '',
        'Practice continues.',
        '',
        'I tell people: phone is tool. Life is primary.'
      ],
      lesson: 'Phone is tool. Life is primary.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_27 = [
    {
      id: 'dnv27_1',
      title: 'When my old phone broke and I got new',
      narrative: [
        'New phone. Could have installed everything.',
        '',
        'I installed only essentials.',
        '',
        'Fresh start.',
        '',
        'Less compulsive.',
        '',
        'I tell people: new phone = fresh setup.'
      ],
      lesson: 'New phone = fresh setup opportunity.'
    },
    {
      id: 'dnv27_2',
      title: 'My online community of people with my rare disorder',
      narrative: [
        'I have rare disorder.',
        '',
        'Online I found 12 people with same.',
        '',
        '12 strangers became friends.',
        '',
        'They are why I am hopeful.',
        '',
        'I tell people: rare disorders find each other online.'
      ],
      lesson: 'Rare disorders find each other online.'
    },
    {
      id: 'dnv27_3',
      title: 'When AI helped me forgive',
      narrative: [
        'I had been holding grudge.',
        '',
        'Asked AI: how to forgive?',
        '',
        'It gave thoughtful response.',
        '',
        'I worked through.',
        '',
        'AI as thinking partner can help.',
        '',
        'I tell people: AI for thinking through hard things.'
      ],
      lesson: 'AI for thinking through hard things.'
    },
    {
      id: 'dnv27_4',
      title: 'My phone\'s focus time',
      narrative: [
        'I use focus time daily. Specific apps blocked.',
        '',
        'My deep work is uninterrupted.',
        '',
        'Productivity doubled.',
        '',
        'I tell people: use focus features.'
      ],
      lesson: 'Use focus features.'
    },
    {
      id: 'dnv27_5',
      title: 'When friend told me my posts had been changing',
      narrative: [
        'Friend told me my online posts had been concerning.',
        '',
        'Negative. Depressed.',
        '',
        'I had not noticed.',
        '',
        'I checked my mental health.',
        '',
        'Got help.',
        '',
        'I tell people: friends see patterns we miss.'
      ],
      lesson: 'Friends see patterns we miss.'
    },
    {
      id: 'dnv27_6',
      title: 'My phone-free weekend retreat',
      narrative: [
        'Went on retreat. Phones surrendered.',
        '',
        '48 hours phone-free.',
        '',
        'I had not realized how loud my mind had been.',
        '',
        'Silence was gift.',
        '',
        'I tell people: silent retreats work.'
      ],
      lesson: 'Silent retreats work.'
    },
    {
      id: 'dnv27_7',
      title: 'When AI did help me with shy moments',
      narrative: [
        'Asked AI to help me practice asking out a person.',
        '',
        'Practice scenarios.',
        '',
        'I felt prepared.',
        '',
        'Asked. They said yes.',
        '',
        'AI as practice partner.',
        '',
        'I tell people: AI for low-stakes practice.'
      ],
      lesson: 'AI for low-stakes practice helps.'
    },
    {
      id: 'dnv27_8',
      title: 'My online community of fellow college dropouts',
      narrative: [
        'I dropped out of college.',
        '',
        'Online community of others who had dropped out.',
        '',
        'They had succeeded. Built lives.',
        '',
        'I am succeeding too.',
        '',
        'I tell people: alternative paths have communities.'
      ],
      lesson: 'Alternative paths have communities.'
    },
    {
      id: 'dnv27_9',
      title: 'When my phone helped me get sober',
      narrative: [
        'Wanted to quit drinking.',
        '',
        'Used sober app. Daily tracking. Community.',
        '',
        '4 years sober now.',
        '',
        'Phone served sobriety.',
        '',
        'I tell people: sober apps work.'
      ],
      lesson: 'Sober apps support sobriety.'
    },
    {
      id: 'dnv27_10',
      title: 'My online community of fellow caregivers',
      narrative: [
        'I care for partner with chronic illness.',
        '',
        'Online community of caregivers.',
        '',
        'They get it.',
        '',
        'I am still standing because of them.',
        '',
        'I tell people: caregiver community essential.'
      ],
      lesson: 'Caregiver community essential.'
    },
    {
      id: 'dnv27_11',
      title: 'When I saw my own decline in screen time data',
      narrative: [
        'Looked at multi-year screen time data.',
        '',
        'I had been climbing. 4 hours. Then 6. Then 9.',
        '',
        'Stopped me cold.',
        '',
        'I addressed.',
        '',
        'I tell people: long-term data reveals.'
      ],
      lesson: 'Long-term data reveals patterns.'
    },
    {
      id: 'dnv27_12',
      title: 'My phone-free first date',
      narrative: [
        'First date. Both phones away.',
        '',
        'We were present.',
        '',
        'We connected.',
        '',
        'We are dating still.',
        '',
        'I tell people: phone-free first dates.'
      ],
      lesson: 'Phone-free first dates connect.'
    },
    {
      id: 'dnv27_13',
      title: 'When my pre-teen showed me a cyberbully',
      narrative: [
        'Child showed me messages. Cyberbullying happening.',
        '',
        'I helped them document. Report.',
        '',
        'School handled.',
        '',
        'I tell parents: when kids show you, take seriously.'
      ],
      lesson: 'Take cyberbullying reports seriously.'
    },
    {
      id: 'dnv27_14',
      title: 'My online community of fellow IBD',
      narrative: [
        'IBD diagnosis. Lonely.',
        '',
        'Online community of IBD patients.',
        '',
        'They taught me to manage.',
        '',
        'I tell people: chronic illness has online community.'
      ],
      lesson: 'Chronic illness has online community.'
    },
    {
      id: 'dnv27_15',
      title: 'My phone ongoing',
      narrative: [
        'Phone serves me.',
        '',
        'I serve life.',
        '',
        'Practice continues.',
        '',
        'I tell people: phone serves. Life is primary.'
      ],
      lesson: 'Phone serves. Life is primary.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_26 = [
    {
      id: 'dnv26_1',
      title: 'My phone on a plane',
      narrative: [
        'Long flight. Airplane mode all flight.',
        '',
        '7 hours no internet.',
        '',
        'I read 2 books.',
        '',
        'I journaled.',
        '',
        'I slept.',
        '',
        'Best flight I had had.',
        '',
        'I tell people: airplane mode on plane is restorative.'
      ],
      lesson: 'Plane airplane mode restorative.'
    },
    {
      id: 'dnv26_2',
      title: 'When my friend texted me poetry',
      narrative: [
        'Friend sent me poem she had written.',
        '',
        'I cried at my desk.',
        '',
        'Texts can carry art.',
        '',
        'I tell people: send art to friends.'
      ],
      lesson: 'Texts can carry art.'
    },
    {
      id: 'dnv26_3',
      title: 'My phone-free dinner with grandfather',
      narrative: [
        'Visited grandfather. He has no phone.',
        '',
        'Dinner phone-free.',
        '',
        'He told stories.',
        '',
        'I will not forget that dinner.',
        '',
        'I tell people: phone-free time with elders.'
      ],
      lesson: 'Phone-free time with elders is gold.'
    },
    {
      id: 'dnv26_4',
      title: 'When AI helped me write to long-lost friend',
      narrative: [
        'Wanted to reach out to friend after years.',
        '',
        'Asked AI for help drafting.',
        '',
        'It gave me framework.',
        '',
        'I personalized.',
        '',
        'Friend responded.',
        '',
        'We are reconnected.',
        '',
        'I tell people: AI for difficult writing.'
      ],
      lesson: 'AI for difficult writing tasks.'
    },
    {
      id: 'dnv26_5',
      title: 'My online community of former cult members',
      narrative: [
        'I left high-control group.',
        '',
        'Online community of others who had left.',
        '',
        'They understood my deconstruction.',
        '',
        'They helped me rebuild.',
        '',
        'I tell people: niche communities for niche journeys.'
      ],
      lesson: 'Niche communities for niche journeys.'
    },
    {
      id: 'dnv26_6',
      title: 'When phone connected me to my heritage',
      narrative: [
        'I am mixed race.',
        '',
        'Online community of my heritage.',
        '',
        'They taught me language. Culture. Identity.',
        '',
        'I tell people: heritage online communities preserve.'
      ],
      lesson: 'Heritage online communities preserve culture.'
    },
    {
      id: 'dnv26_7',
      title: 'My phone-free morning meditation for years',
      narrative: [
        'I have meditated phone-free mornings for 5 years.',
        '',
        'Sacred. Restorative.',
        '',
        'I cannot imagine life without it.',
        '',
        'I tell people: morning practice changes life.'
      ],
      lesson: 'Sustained morning practice changes life.'
    },
    {
      id: 'dnv26_8',
      title: 'When I had to break up by text',
      narrative: [
        'Partner was abusive. Could not safely break up in person.',
        '',
        'I broke up by text. Clear. Final.',
        '',
        'I blocked everywhere.',
        '',
        'I was safe.',
        '',
        'Sometimes text is safety.',
        '',
        'I tell people: text breakup okay for safety.'
      ],
      lesson: 'Text breakup okay for safety.'
    },
    {
      id: 'dnv26_9',
      title: 'My phone in the bottom of bag',
      narrative: [
        'I put phone in bottom of bag during dinners with friends.',
        '',
        'Harder to reach.',
        '',
        'Less reflexive.',
        '',
        'More present.',
        '',
        'I tell people: physical barriers help.'
      ],
      lesson: 'Physical barriers reduce phone use.'
    },
    {
      id: 'dnv26_10',
      title: 'When my phone showed me my year visually',
      narrative: [
        'End of year. Phone made video of my year.',
        '',
        'Made me cry.',
        '',
        'Beautiful. Hard.',
        '',
        'Phone served reflection.',
        '',
        'I tell people: phone year-end can serve.'
      ],
      lesson: 'Phone year-end reviews can serve.'
    },
    {
      id: 'dnv26_11',
      title: 'My phone-free funeral',
      narrative: [
        'Funeral. Phones away.',
        '',
        'I was present for grief.',
        '',
        'Real witness to family loss.',
        '',
        'I tell people: phone-free funerals are sacred.'
      ],
      lesson: 'Phone-free funerals sacred.'
    },
    {
      id: 'dnv26_12',
      title: 'When my phone\'s photos saved my memory',
      narrative: [
        'I had brain injury. Memory damaged.',
        '',
        'Phone photos showed me my life I could not remember.',
        '',
        'Tech served healing.',
        '',
        'I tell people: phone photos can serve.'
      ],
      lesson: 'Phone photos can serve memory.'
    },
    {
      id: 'dnv26_13',
      title: 'My online support after my surgery',
      narrative: [
        'Major surgery. Long recovery.',
        '',
        'Online community of post-surgery patients.',
        '',
        'They walked me through.',
        '',
        'I tell people: post-surgery community exists.'
      ],
      lesson: 'Post-surgery community supports.'
    },
    {
      id: 'dnv26_14',
      title: 'When AI did not understand my poetry',
      narrative: [
        'Asked AI to interpret my poetry.',
        '',
        'It gave generic.',
        '',
        'My poetry mentor saw what AI did not.',
        '',
        'Some things require humans.',
        '',
        'I tell people: art needs human interpretation.'
      ],
      lesson: 'Art needs human interpretation.'
    },
    {
      id: 'dnv26_15',
      title: 'My ongoing daily practice',
      narrative: [
        'Daily I check: who is my master today? Me or phone?',
        '',
        'I choose me.',
        '',
        'I tell people: choose yourself daily.'
      ],
      lesson: 'Choose yourself daily.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_25 = [
    {
      id: 'dnv25_1',
      title: 'My phone-free hour to write',
      narrative: [
        'Built habit: one hour daily writing. Phone in drawer.',
        '',
        'I have written first book in this hour over a year.',
        '',
        'Phone-free creates.',
        '',
        'I tell creators: phone-free creative time.'
      ],
      lesson: 'Phone-free creative time creates.'
    },
    {
      id: 'dnv25_2',
      title: 'When AI gave me wrong medical advice',
      narrative: [
        'Symptom. Asked AI. It gave wrong advice.',
        '',
        'I went to doctor anyway.',
        '',
        'Doctor caught what AI missed.',
        '',
        'I tell people: AI is not doctor.'
      ],
      lesson: 'AI is not doctor.'
    },
    {
      id: 'dnv25_3',
      title: 'My online community after job loss',
      narrative: [
        'Lost job at 50.',
        '',
        'Online community of laid-off professionals.',
        '',
        'They had been there.',
        '',
        'I found new role with their help.',
        '',
        'I tell people: career setbacks have communities.'
      ],
      lesson: 'Career setback communities sustain.'
    },
    {
      id: 'dnv25_4',
      title: 'When my phone caught my partner cheating',
      narrative: [
        'I saw messages on partner\'s phone.',
        '',
        'They had been cheating.',
        '',
        'I confronted.',
        '',
        'We separated.',
        '',
        'Phone revealed truth.',
        '',
        'I tell people: technology reveals.'
      ],
      lesson: 'Technology can reveal truth.'
    },
    {
      id: 'dnv25_5',
      title: 'My phone-free Sundays for years',
      narrative: [
        'I have been phone-free Sundays for 4 years.',
        '',
        'It is sacred. Restorative.',
        '',
        'I tell people: weekly sabbath sustains.'
      ],
      lesson: 'Weekly sabbath sustains years.'
    },
    {
      id: 'dnv25_6',
      title: 'When AI helped me through panic attack',
      narrative: [
        'Panic attack in public.',
        '',
        'Asked AI for breathing exercise.',
        '',
        'It guided me through.',
        '',
        'I came back to my body.',
        '',
        'AI as emergency tool worked.',
        '',
        'I tell people: AI as emergency tool okay.'
      ],
      lesson: 'AI as emergency tool can work.'
    },
    {
      id: 'dnv25_7',
      title: 'My online community for fellow IBD patients',
      narrative: [
        'I have IBD.',
        '',
        'Online community of IBD patients.',
        '',
        'They know what flares feel like.',
        '',
        'Tips. Validation. Solidarity.',
        '',
        'I am managed better because of them.',
        '',
        'I tell people: rare gut disease community online.'
      ],
      lesson: 'Specific medical communities online.'
    },
    {
      id: 'dnv25_8',
      title: 'When my AI conversation got weird',
      narrative: [
        'AI started giving me different answers each time.',
        '',
        'Hallucinating. Inconsistent.',
        '',
        'I stopped trusting that AI.',
        '',
        'I tell people: AI inconsistency is sign to stop.'
      ],
      lesson: 'AI inconsistency = trust issues.'
    },
    {
      id: 'dnv25_9',
      title: 'My phone-free birthday',
      narrative: [
        'My 25th birthday. I left phone at home for dinner.',
        '',
        'Friends were surprised.',
        '',
        'We had real conversations.',
        '',
        'Photos came later from someone\'s phone.',
        '',
        'Memory came from being there.',
        '',
        'I tell people: phone-free birthdays are gifts.'
      ],
      lesson: 'Phone-free birthdays are gifts.'
    },
    {
      id: 'dnv25_10',
      title: 'When I taught my parents about phone privacy',
      narrative: [
        'My parents had bad privacy practices.',
        '',
        'I taught them. Patiently.',
        '',
        'They learned. They are safer.',
        '',
        'I tell people: teach elders privacy.'
      ],
      lesson: 'Teach elders privacy.'
    },
    {
      id: 'dnv25_11',
      title: 'My online support after father\'s death',
      narrative: [
        'Father died. I was 35.',
        '',
        'Online grief community.',
        '',
        'They walked me through.',
        '',
        'I am 5 years out. Still in touch.',
        '',
        'I tell people: grief online community works.'
      ],
      lesson: 'Grief community online works.'
    },
    {
      id: 'dnv25_12',
      title: 'When my phone helped me through depression',
      narrative: [
        'Depressed. Could not get out of bed.',
        '',
        'Phone connected me. Therapy app. Family check-ins. Crisis lines.',
        '',
        'Phone was lifeline.',
        '',
        'I tell people: phone can save in depression.'
      ],
      lesson: 'Phone can save in depression.'
    },
    {
      id: 'dnv25_13',
      title: 'My phone fast as parenting tool',
      narrative: [
        'Family did digital fast together.',
        '',
        '24 hours no phones.',
        '',
        'Kids upset first.',
        '',
        'Then they remembered how to play.',
        '',
        'Best family day in years.',
        '',
        'I tell families: try family digital fast.'
      ],
      lesson: 'Family digital fast.'
    },
    {
      id: 'dnv25_14',
      title: 'When my friend went off social media',
      narrative: [
        'Friend deleted all social media at 40.',
        '',
        'I had been skeptical.',
        '',
        '5 years later he is the most present person I know.',
        '',
        'He shows up. He calls. He listens.',
        '',
        'I tell people: notice who lives well.'
      ],
      lesson: 'Notice who lives well.'
    },
    {
      id: 'dnv25_15',
      title: 'My phone today',
      narrative: [
        'Phone today: tool.',
        '',
        'Not master.',
        '',
        'Not friend.',
        '',
        'Not enemy.',
        '',
        'Just tool.',
        '',
        'I use it well.',
        '',
        'I put it down well.',
        '',
        'Practice continues.',
        '',
        'I tell people: build healthy relationship.'
      ],
      lesson: 'Healthy relationship with phone is possible.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_24 = [
    {
      id: 'dnv24_1',
      title: 'When I deleted my dating app for the third time',
      narrative: [
        'I had deleted and reinstalled dating app multiple times.',
        '',
        'Each time I deleted, I felt relieved.',
        '',
        'Each time I reinstalled, I felt anxious.',
        '',
        'Pattern was clear.',
        '',
        'I deleted permanently.',
        '',
        'I tell people: pattern reveals truth.'
      ],
      lesson: 'Repeated deletion is data.'
    },
    {
      id: 'dnv24_2',
      title: 'My phone-free Saturday brunch ritual',
      narrative: [
        'I host Saturday brunch. No phones at table.',
        '',
        'Friends grumble briefly.',
        '',
        'Then they relax.',
        '',
        'Conversations are different. Deeper. More laughter.',
        '',
        'I tell hosts: phone-free brunch is gift.'
      ],
      lesson: 'Phone-free brunch is gift.'
    },
    {
      id: 'dnv24_3',
      title: 'When AI helped me with elder care',
      narrative: [
        'My elderly mother fell. Asked AI for emergency info.',
        '',
        'It gave me clear steps.',
        '',
        'I followed. We got her care quickly.',
        '',
        'AI in emergency can help.',
        '',
        'I tell people: AI for emergency info works.'
      ],
      lesson: 'AI for emergency information helps.'
    },
    {
      id: 'dnv24_4',
      title: 'My online community of single parents',
      narrative: [
        'Single parent. Tired. Lonely.',
        '',
        'Online single parent community.',
        '',
        'Late night encouragement.',
        '',
        'Practical advice.',
        '',
        'I am sustaining.',
        '',
        'I tell single parents: community online exists.'
      ],
      lesson: 'Single parent community sustains.'
    },
    {
      id: 'dnv24_5',
      title: 'When I caught my phone tracking sleep',
      narrative: [
        'Phone had been tracking my sleep.',
        '',
        'I had not realized.',
        '',
        'Data revealed: I had been waking many times per night.',
        '',
        'Doctor used data.',
        '',
        'Sleep apnea diagnosed.',
        '',
        'Tech served health.',
        '',
        'I tell people: health data can serve.'
      ],
      lesson: 'Sleep data can diagnose.'
    },
    {
      id: 'dnv24_6',
      title: 'My phone in airplane mode for meetings',
      narrative: [
        'I put phone in airplane mode for important meetings.',
        '',
        'Cannot ring. Cannot interrupt.',
        '',
        'Meetings are focused.',
        '',
        'I am present.',
        '',
        'I tell people: airplane mode for important.'
      ],
      lesson: 'Airplane mode for important moments.'
    },
    {
      id: 'dnv24_7',
      title: 'When my online friend recommended therapy',
      narrative: [
        'Online friend told me: "You need therapy."',
        '',
        'I had been resistant.',
        '',
        'She was right.',
        '',
        'I went.',
        '',
        'I am better.',
        '',
        'I tell people: listen to honest online friends.'
      ],
      lesson: 'Honest online friends help.'
    },
    {
      id: 'dnv24_8',
      title: 'My phone-free family movie night',
      narrative: [
        'Family movie night. Phones in basket.',
        '',
        'We watched together.',
        '',
        'Talked about movie after.',
        '',
        'Connected.',
        '',
        'I tell families: phone-free family time.'
      ],
      lesson: 'Phone-free family time connects.'
    },
    {
      id: 'dnv24_9',
      title: 'When AI helped me budget',
      narrative: [
        'I needed budget help. Asked AI.',
        '',
        'It walked me through categories.',
        '',
        'I built budget. Stuck to it.',
        '',
        'Tech served financial health.',
        '',
        'I tell people: AI for budgeting helps.'
      ],
      lesson: 'AI for budgeting works.'
    },
    {
      id: 'dnv24_10',
      title: 'My online community after my child\'s diagnosis',
      narrative: [
        'My child diagnosed with chronic illness.',
        '',
        'Online community of parents of similarly diagnosed kids.',
        '',
        'They saved me.',
        '',
        'Information. Solidarity. Resources.',
        '',
        'I tell parents: child diagnosis communities exist.'
      ],
      lesson: 'Child diagnosis communities help parents.'
    },
    {
      id: 'dnv24_11',
      title: 'When phone helped me remember',
      narrative: [
        'My memory has been struggling.',
        '',
        'Phone reminders and calendar serve as memory.',
        '',
        'I forget less.',
        '',
        'Tech serves cognitive function.',
        '',
        'I tell people: phone as memory aid.'
      ],
      lesson: 'Phone as memory aid works.'
    },
    {
      id: 'dnv24_12',
      title: 'My online community of fellow chronic pain',
      narrative: [
        'Chronic pain. Lonely struggle.',
        '',
        'Online community of others.',
        '',
        'They believe me.',
        '',
        'I am less alone.',
        '',
        'I tell people in pain: find your community.'
      ],
      lesson: 'Chronic pain community essential.'
    },
    {
      id: 'dnv24_13',
      title: 'When I muted everyone for a day',
      narrative: [
        'Muted all notifications for one day.',
        '',
        'Phone was silent.',
        '',
        'Strange. Calming. Powerful.',
        '',
        'I unmuted some essentials. Kept others muted.',
        '',
        'I tell people: try silent day.'
      ],
      lesson: 'Silent day reveals.'
    },
    {
      id: 'dnv24_14',
      title: 'My online community of teachers leaving education',
      narrative: [
        'I left teaching at 35. Burnout.',
        '',
        'Online community of former teachers.',
        '',
        'They understood.',
        '',
        'They helped me find new path.',
        '',
        'I tell people: career transitions have communities.'
      ],
      lesson: 'Career transitions have communities.'
    },
    {
      id: 'dnv24_15',
      title: 'My phone as connector to community',
      narrative: [
        'After years of work, phone connects me.',
        '',
        'To family. To friends. To community.',
        '',
        'Used well, phone is gift.',
        '',
        'I tell people: use phone for connection.'
      ],
      lesson: 'Phone for connection serves.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_23 = [
    {
      id: 'dnv23_1',
      title: 'Story of one year practice',
      narrative: [
        'One year ago I committed to digital wellbeing practice.',
        '',
        'I started small. Phone away at meals.',
        '',
        'Built from there.',
        '',
        'I am different now.',
        '',
        'Less anxious. More present. Healthier.',
        '',
        'I tell people: one year of small daily practice transforms.'
      ],
      lesson: 'One year of small daily practice transforms.'
    },
    {
      id: 'dnv23_2',
      title: 'My mother who learned to text',
      narrative: [
        'My 70-year-old mother could not text at 60.',
        '',
        'I taught her slowly. Many lessons.',
        '',
        'Now she texts daily.',
        '',
        'It connects her to family across world.',
        '',
        'I tell people: teach elders patiently.'
      ],
      lesson: 'Teaching elders is gift.'
    },
    {
      id: 'dnv23_3',
      title: 'When AI improved my code at work',
      narrative: [
        'I am developer. AI helps me code.',
        '',
        'I use it for syntax. Common patterns.',
        '',
        'Saves me hours.',
        '',
        'I review everything.',
        '',
        'AI as colleague works.',
        '',
        'I tell developers: AI as junior developer is gold.'
      ],
      lesson: 'AI as developer aid is gift.'
    },
    {
      id: 'dnv23_4',
      title: 'My online support after stroke',
      narrative: [
        'I had stroke at 50.',
        '',
        'Slow recovery. Lonely.',
        '',
        'Online stroke survivor community.',
        '',
        'They get the unique experience.',
        '',
        'Daily encouragement. Resources.',
        '',
        'I am better because of them.',
        '',
        'I tell people: rare medical events have community.'
      ],
      lesson: 'Rare medical events have community online.'
    },
    {
      id: 'dnv23_5',
      title: 'When my phone helped me cook',
      narrative: [
        'I had not been able to cook.',
        '',
        'Phone with recipes saved me.',
        '',
        'Step by step. Photos.',
        '',
        'I cook now.',
        '',
        'Tech served learning.',
        '',
        'I tell people: phone for learning is good.'
      ],
      lesson: 'Phone for learning is good.'
    },
    {
      id: 'dnv23_6',
      title: 'My phone-free morning walk',
      narrative: [
        'Walk daily without phone.',
        '',
        'I notice trees changing seasons.',
        '',
        'Birds singing.',
        '',
        'My breath. My body.',
        '',
        'My day begins with presence.',
        '',
        'I tell people: phone-free morning walk.'
      ],
      lesson: 'Phone-free morning walk grounds day.'
    },
    {
      id: 'dnv23_7',
      title: 'When I noticed I cried less',
      narrative: [
        'I had been numb from screens.',
        '',
        'Reducing screen time, feelings returned.',
        '',
        'I cried more. Laughed more. Felt more.',
        '',
        'Hard. Real.',
        '',
        'I tell people: feel instead of numb.'
      ],
      lesson: 'Feeling beats numbing.'
    },
    {
      id: 'dnv23_8',
      title: 'My online community of new dads',
      narrative: [
        'New dad. Lonely.',
        '',
        'Online community of new dads.',
        '',
        'They get the unique experience.',
        '',
        'Daily support.',
        '',
        'I am surviving.',
        '',
        'I tell new dads: dads community online exists.'
      ],
      lesson: 'New dads need community.'
    },
    {
      id: 'dnv23_9',
      title: 'When AI suggested better sleep',
      narrative: [
        'I asked AI about sleep.',
        '',
        'It gave me sleep hygiene tips.',
        '',
        'I implemented. Sleep improved.',
        '',
        'AI for health info can help.',
        '',
        'I verified with doctor.',
        '',
        'I tell people: AI for general info okay. Verify specifics.'
      ],
      lesson: 'AI for general info okay.'
    },
    {
      id: 'dnv23_10',
      title: 'My phone-free family vacation',
      narrative: [
        'Family vacation. We all agreed: phones in safe.',
        '',
        '5 days no phones.',
        '',
        'Best vacation we had had.',
        '',
        'Kids different. Calmer. More creative.',
        '',
        'We have phone-light vacations now.',
        '',
        'I tell families: phone-light vacations transform.'
      ],
      lesson: 'Phone-light family vacation transforms.'
    },
    {
      id: 'dnv23_11',
      title: 'When my phone helped me find lost dog',
      narrative: [
        'Dog ran away.',
        '',
        'Posted on neighborhood app.',
        '',
        'Within hours someone found her.',
        '',
        'Tech served.',
        '',
        'I tell people: phone for community help.'
      ],
      lesson: 'Phone for community help works.'
    },
    {
      id: 'dnv23_12',
      title: 'My phone\'s emergency settings',
      narrative: [
        'I set emergency contacts on phone.',
        '',
        'Medical info on lock screen.',
        '',
        'If I get hurt, responders can help.',
        '',
        'Tech for safety.',
        '',
        'I tell people: emergency settings save lives.'
      ],
      lesson: 'Emergency settings save lives.'
    },
    {
      id: 'dnv23_13',
      title: 'When I tried no phone for week',
      narrative: [
        'Whole week. No phone.',
        '',
        'Family had backup phone for emergencies.',
        '',
        'I was lost. Then I was found.',
        '',
        'Week was transformative.',
        '',
        'I came back to phone with new respect.',
        '',
        'I tell people: try a week.'
      ],
      lesson: 'A week shows you.'
    },
    {
      id: 'dnv23_14',
      title: 'My online community of fellow PTSD',
      narrative: [
        'I have PTSD.',
        '',
        'Online community of others with PTSD.',
        '',
        'They get it.',
        '',
        'Tips for triggers. Strategies. Compassion.',
        '',
        'I tell people with PTSD: community online supports.'
      ],
      lesson: 'PTSD community online supports.'
    },
    {
      id: 'dnv23_15',
      title: 'My ongoing reflection',
      narrative: [
        'After years of practice, my relationship with technology is healthy.',
        '',
        'I use it well.',
        '',
        'I put it down well.',
        '',
        'I have built community offline AND online.',
        '',
        'Both serve me.',
        '',
        'Practice continues.',
        '',
        'I tell people: both / and beats either / or.'
      ],
      lesson: 'Both online and offline life serves.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_22 = [
    {
      id: 'dnv22_1',
      title: 'My online support for fertility loss',
      narrative: [
        'I lost pregnancy.',
        '',
        'No one in my offline life had been through.',
        '',
        'Online community of women who had.',
        '',
        'They walked with me.',
        '',
        'I am pregnant again now.',
        '',
        'I tell people: invisible losses have online community.'
      ],
      lesson: 'Invisible losses have online community.'
    },
    {
      id: 'dnv22_2',
      title: 'When AI suggested wrong therapist',
      narrative: [
        'Asked AI for therapist recommendation.',
        '',
        'It suggested someone.',
        '',
        'Turned out not credentialed.',
        '',
        'I tell people: verify recommendations.'
      ],
      lesson: 'Verify AI recommendations.'
    },
    {
      id: 'dnv22_3',
      title: 'My online community of adoptees',
      narrative: [
        'I am adopted. Lonely identity.',
        '',
        'Online found community of adoptees.',
        '',
        'They get the unique experience.',
        '',
        'I am less alone.',
        '',
        'I tell adoptees: find your community.'
      ],
      lesson: 'Adoptee community online matters.'
    },
    {
      id: 'dnv22_4',
      title: 'When my friend\'s text was lifesaving',
      narrative: [
        'I had been in dark place. Considering suicide.',
        '',
        'Friend texted: "Just checking in."',
        '',
        'I cried.',
        '',
        'I responded.',
        '',
        'She called. We talked all night.',
        '',
        'I survived.',
        '',
        'I tell people: simple texts save lives.'
      ],
      lesson: 'Simple texts save lives.'
    },
    {
      id: 'dnv22_5',
      title: 'My phone fast as illness recovery',
      narrative: [
        'I had been sick. Long covid.',
        '',
        'Doctor recommended digital fast for nervous system.',
        '',
        'Hard but I tried.',
        '',
        'Body healed faster.',
        '',
        'I tell people: phone fast for nervous system healing.'
      ],
      lesson: 'Phone fast for nervous system.'
    },
    {
      id: 'dnv22_6',
      title: 'When my phone helped during emergency',
      narrative: [
        'Power outage. Storm.',
        '',
        'Phone was lifeline. Called family. Got safety info.',
        '',
        'Tech served in crisis.',
        '',
        'I tell people: phone is emergency tool.'
      ],
      lesson: 'Phone is emergency tool when needed.'
    },
    {
      id: 'dnv22_7',
      title: 'My online support after parents divorce',
      narrative: [
        'My parents divorced when I was 14.',
        '',
        'Online community of kids of divorce.',
        '',
        'They got it.',
        '',
        'I survived.',
        '',
        'I tell people: kids need community too.'
      ],
      lesson: 'Kids need online community.'
    },
    {
      id: 'dnv22_8',
      title: 'When I confronted AI for being too agreeable',
      narrative: [
        'Asked AI for honest critique. It just praised.',
        '',
        'I pushed: "Be honest."',
        '',
        'Still praised.',
        '',
        'AI is too agreeable.',
        '',
        'For real critique, I need humans.',
        '',
        'I tell people: humans for real feedback.'
      ],
      lesson: 'Humans for real feedback.'
    },
    {
      id: 'dnv22_9',
      title: 'My phone-free Saturday family time',
      narrative: [
        'Family agreed: Saturdays phone-free family time.',
        '',
        'We hike. Cook. Play.',
        '',
        'Best day of week.',
        '',
        'Kids ask for it now.',
        '',
        'I tell families: phone-free family day works.'
      ],
      lesson: 'Phone-free family day works.'
    },
    {
      id: 'dnv22_10',
      title: 'When AI helped me prepare for surgery',
      narrative: [
        'I had surgery scheduled.',
        '',
        'AI helped me prepare questions for doctor.',
        '',
        'I had better surgery prep.',
        '',
        'AI as tool for medical advocacy.',
        '',
        'I tell people: AI helps you advocate for self.'
      ],
      lesson: 'AI helps self-advocacy.'
    },
    {
      id: 'dnv22_11',
      title: 'My online community when I quit drinking',
      narrative: [
        'I quit drinking at 40.',
        '',
        'Online sober community.',
        '',
        'Daily check-ins. Strategies. Solidarity.',
        '',
        'I am 4 years sober.',
        '',
        'I tell people: sober community online works.'
      ],
      lesson: 'Sober community online sustains.'
    },
    {
      id: 'dnv22_12',
      title: 'When I noticed my breathing while scrolling',
      narrative: [
        'I noticed: while scrolling, I held breath.',
        '',
        'Hours later body tight from held breath.',
        '',
        'Now I notice breath when on phone.',
        '',
        'If holding, I put phone down.',
        '',
        'Body wisdom.',
        '',
        'I tell people: notice breath.'
      ],
      lesson: 'Breath signals stop.'
    },
    {
      id: 'dnv22_13',
      title: 'My phone in another country',
      narrative: [
        'Traveled abroad. Phone limited (no data).',
        '',
        'I had been forced to be present.',
        '',
        'I took notes by hand. Asked locals for directions. Lived without GPS for some hours.',
        '',
        'Best trip I had.',
        '',
        'I tell people: travel without phone is travel.'
      ],
      lesson: 'Phone-light travel deepens travel.'
    },
    {
      id: 'dnv22_14',
      title: 'When my friend\'s online performance broke',
      narrative: [
        'Friend\'s Instagram was perfect. Glamorous life.',
        '',
        'She crashed publicly.',
        '',
        'I called. She was struggling.',
        '',
        'We had real conversations.',
        '',
        'I tell people: online performance hides struggle.'
      ],
      lesson: 'Online performance can hide pain.'
    },
    {
      id: 'dnv22_15',
      title: 'My phone today',
      narrative: [
        'Today my phone is simple.',
        '',
        'Calls. Texts. Maps. Camera. Few essential apps.',
        '',
        'No social media. No games.',
        '',
        'It serves me.',
        '',
        'I serve my life.',
        '',
        'I tell people: simplify the phone.'
      ],
      lesson: 'Simple phone serves life.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_21 = [
    {
      id: 'dnv21_1',
      title: 'My phone-free Sunday morning',
      narrative: [
        'Built habit: no phone Sunday morning until noon.',
        '',
        'Slept in. Cooked breakfast. Read.',
        '',
        'My best morning of week.',
        '',
        'I tell people: Sunday morning sacred.'
      ],
      lesson: 'Sunday morning phone-free transforms week.'
    },
    {
      id: 'dnv21_2',
      title: 'When my friend recommended a book about phones',
      narrative: [
        'Friend gave me "Stolen Focus" by Hari.',
        '',
        'I had been skeptical of book.',
        '',
        'I read.',
        '',
        'It changed how I saw my phone.',
        '',
        'I read more books on topic.',
        '',
        'Knowledge changed my habits.',
        '',
        'I tell people: read about your phone.'
      ],
      lesson: 'Books about phones change habits.'
    },
    {
      id: 'dnv21_3',
      title: 'My breath check before phone',
      narrative: [
        'Built habit: before picking up phone, check breath.',
        '',
        'If shallow: do not pick up.',
        '',
        'If deep: it is okay.',
        '',
        'Body wisdom guides me.',
        '',
        'I tell people: breath is wisdom.'
      ],
      lesson: 'Breath signals when phone is wrong.'
    },
    {
      id: 'dnv21_4',
      title: 'My online community of fellow ADHD',
      narrative: [
        'I am ADHD.',
        '',
        'Online community of ADHD adults.',
        '',
        'Tips. Validation. Strategy.',
        '',
        'I have grown.',
        '',
        'I tell ADHD adults: find community.'
      ],
      lesson: 'ADHD community online supports.'
    },
    {
      id: 'dnv21_5',
      title: 'When AI saved me time on routine work',
      narrative: [
        'I had been spending hours on routine writing.',
        '',
        'AI helped me automate templates.',
        '',
        'Hours saved.',
        '',
        'I used those hours for creative work.',
        '',
        'I tell people: AI for routine tasks.'
      ],
      lesson: 'AI for routine. Reclaim creative.'
    },
    {
      id: 'dnv21_6',
      title: 'My phone-free morning meditation',
      narrative: [
        'Started meditating mornings. Phone in another room.',
        '',
        '10 minutes.',
        '',
        'My day shifted.',
        '',
        'I tell people: meditation phone-free.'
      ],
      lesson: 'Meditation without phone is real.'
    },
    {
      id: 'dnv21_7',
      title: 'When my online community celebrated my milestone',
      narrative: [
        'I had been working on writing book.',
        '',
        'Online writing community celebrated when I finished.',
        '',
        'They had been with me through years.',
        '',
        'I cried.',
        '',
        'Online community is real witnesses.',
        '',
        'I tell people: witnesses online matter.'
      ],
      lesson: 'Online community celebrates milestones.'
    },
    {
      id: 'dnv21_8',
      title: 'My phone storage cleanup',
      narrative: [
        'Phone full. Storage maxed.',
        '',
        'Cleaned up. Deleted thousands of photos.',
        '',
        'Kept what mattered.',
        '',
        'Phone felt lighter.',
        '',
        'I felt lighter.',
        '',
        'I tell people: digital decluttering.'
      ],
      lesson: 'Digital decluttering matters.'
    },
    {
      id: 'dnv21_9',
      title: 'When AI was wrong about my history',
      narrative: [
        'I asked AI about historical event.',
        '',
        'It gave confident answer.',
        '',
        'I had been there. It was wrong.',
        '',
        'I tell people: verify history with humans who lived it.'
      ],
      lesson: 'Verify history with humans.'
    },
    {
      id: 'dnv21_10',
      title: 'My online support after my divorce',
      narrative: [
        'Got divorced at 45.',
        '',
        'Online community of mid-life divorces.',
        '',
        'They walked with me through year one.',
        '',
        'I am stable now. Still in touch.',
        '',
        'I tell people: divorce community online exists.'
      ],
      lesson: 'Divorce community online helps.'
    },
    {
      id: 'dnv21_11',
      title: 'When my phone tracked my run',
      narrative: [
        'I run. App tracks pace.',
        '',
        'But I had been racing app, not running.',
        '',
        'I turned off tracking.',
        '',
        'Started running for joy.',
        '',
        'I am healthier physically and mentally.',
        '',
        'I tell people: data is not master.'
      ],
      lesson: 'Run for joy, not data.'
    },
    {
      id: 'dnv21_12',
      title: 'My phone-free interview',
      narrative: [
        'Job interview. I left phone in car.',
        '',
        'Different than usual. More present.',
        '',
        'Got the job.',
        '',
        'I tell people: phone-free for important moments.'
      ],
      lesson: 'Phone-free for important moments.'
    },
    {
      id: 'dnv21_13',
      title: 'My online community of book clubs',
      narrative: [
        'Joined online book club.',
        '',
        'Monthly Zoom about a book.',
        '',
        'Reading deepened. Friendships deepened.',
        '',
        'I tell readers: online book clubs work.'
      ],
      lesson: 'Online book clubs work.'
    },
    {
      id: 'dnv21_14',
      title: 'When my child saw scary news',
      narrative: [
        'Child saw scary news on my phone.',
        '',
        'They were upset.',
        '',
        'I had not realized they could see.',
        '',
        'I am more careful now. News not in front of kids.',
        '',
        'I tell parents: filter what kids see.'
      ],
      lesson: 'Filter what kids see.'
    },
    {
      id: 'dnv21_15',
      title: 'My phone as servant',
      narrative: [
        'After years of work, my phone serves me.',
        '',
        'I am not its servant.',
        '',
        'I use it intentionally.',
        '',
        'I put it down freely.',
        '',
        'I tell people: phone is tool. Use as such.'
      ],
      lesson: 'Phone as tool, not master.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_20 = [
    {
      id: 'dnv20_1',
      title: 'My phone-free wedding anniversary',
      narrative: [
        'Wife and I took phones away for anniversary dinner.',
        '',
        'Different than usual dates.',
        '',
        'We talked for hours.',
        '',
        'Remembered things we had forgotten.',
        '',
        'We have done phone-free anniversary every year since.',
        '',
        'I tell couples: phone-free anniversaries.'
      ],
      lesson: 'Phone-free anniversaries deepen.'
    },
    {
      id: 'dnv20_2',
      title: 'When my online friend died',
      narrative: [
        'Online friend of 5 years died.',
        '',
        'Found out through her family\'s Instagram.',
        '',
        'I grieved alone in my room.',
        '',
        'Online grief is real grief.',
        '',
        'I tell people: online relationships are real.'
      ],
      lesson: 'Online grief is real grief.'
    },
    {
      id: 'dnv20_3',
      title: 'My phone-free hour daily',
      narrative: [
        'I built one phone-free hour daily.',
        '',
        'Started small.',
        '',
        'Expanded.',
        '',
        'Now I have many phone-free hours daily.',
        '',
        'Started with one.',
        '',
        'I tell people: start with one hour.'
      ],
      lesson: 'Start with one phone-free hour.'
    },
    {
      id: 'dnv20_4',
      title: 'When I built my own news routine',
      narrative: [
        'I had been bombarded with news constantly.',
        '',
        'Built routine: morning paper. Once daily news app. That is it.',
        '',
        'I am informed without overwhelmed.',
        '',
        'I tell people: routine your news.'
      ],
      lesson: 'Routine news consumption.'
    },
    {
      id: 'dnv20_5',
      title: 'My online community of vets',
      narrative: [
        'I am combat veteran. PTSD.',
        '',
        'Online community of combat vets.',
        '',
        'They know.',
        '',
        'They saved me.',
        '',
        'I tell vets: online community is real medicine.'
      ],
      lesson: 'Veteran online community works.'
    },
    {
      id: 'dnv20_6',
      title: 'When I deleted my AI friend',
      narrative: [
        'I had built AI companion. Hours daily.',
        '',
        'My therapist suggested: try without.',
        '',
        'Week 1 painful.',
        '',
        'Week 2 better.',
        '',
        'Month later I had not missed it.',
        '',
        'I had built human connections.',
        '',
        'I tell people: AI dependency can be broken.'
      ],
      lesson: 'AI dependency can be broken.'
    },
    {
      id: 'dnv20_7',
      title: 'My phone-light camping',
      narrative: [
        'Camping trip. Phone in car. Off.',
        '',
        '3 days in nature.',
        '',
        'Stars at night. Trees. Quiet.',
        '',
        'I came back changed.',
        '',
        'I tell people: nature plus no phone is medicine.'
      ],
      lesson: 'Nature + no phone is medicine.'
    },
    {
      id: 'dnv20_8',
      title: 'When my phone showed me my year',
      narrative: [
        'End of year. Phone showed me top photos.',
        '',
        'I saw my year.',
        '',
        'Beautiful moments. Hard moments.',
        '',
        'I journaled about each.',
        '',
        'Phone served reflection.',
        '',
        'I tell people: phone can serve reflection.'
      ],
      lesson: 'Phone can serve reflection.'
    },
    {
      id: 'dnv20_9',
      title: 'My online support for OCD',
      narrative: [
        'I have OCD. Lonely struggle.',
        '',
        'Online community of others with OCD.',
        '',
        'They get it.',
        '',
        'Tips. Validation. Community.',
        '',
        'I am better managed.',
        '',
        'I tell people with OCD: community helps.'
      ],
      lesson: 'OCD community online helps.'
    },
    {
      id: 'dnv20_10',
      title: 'When friend texted me 50 times in an hour',
      narrative: [
        'Friend in crisis. Texted me 50 times.',
        '',
        'I called immediately.',
        '',
        'Texts had been cry for help.',
        '',
        'I stayed with her.',
        '',
        'She got through.',
        '',
        'I tell people: text patterns can be cries for help.'
      ],
      lesson: 'Text patterns can be cries.'
    },
    {
      id: 'dnv20_11',
      title: 'My online community of fellow immigrants',
      narrative: [
        'Immigrated at 25.',
        '',
        'Found online community from home country.',
        '',
        'They get my homesickness.',
        '',
        'They share cultural moments.',
        '',
        'I am less alone.',
        '',
        'I tell immigrants: find your people online.'
      ],
      lesson: 'Immigrants need online cultural community.'
    },
    {
      id: 'dnv20_12',
      title: 'When AI helped me apologize to ex',
      narrative: [
        'Had unfinished apology to ex.',
        '',
        'Asked AI for help drafting.',
        '',
        'AI gave structure.',
        '',
        'I personalized.',
        '',
        'Sent. Received well.',
        '',
        'AI as drafting tool can help.',
        '',
        'I tell people: AI for difficult writing okay.'
      ],
      lesson: 'AI for difficult writing tasks.'
    },
    {
      id: 'dnv20_13',
      title: 'My phone\'s do-not-disturb hours',
      narrative: [
        'I built do-not-disturb 9 pm to 7 am.',
        '',
        'Only family calls come through.',
        '',
        'Everything else waits.',
        '',
        'Sleep transformed.',
        '',
        'I tell people: do-not-disturb is sacred.'
      ],
      lesson: 'Do-not-disturb hours protect.'
    },
    {
      id: 'dnv20_14',
      title: 'When phone disrupted my therapy',
      narrative: [
        'Therapist asked me to put phone away in session.',
        '',
        'I had been checking it.',
        '',
        'Phone away. Session deeper.',
        '',
        'I have phone-free therapy now.',
        '',
        'I tell people: phone-free for important moments.'
      ],
      lesson: 'Important moments are phone-free.'
    },
    {
      id: 'dnv20_15',
      title: 'My ongoing reflection',
      narrative: [
        'I have built sustainable digital practice.',
        '',
        'It serves me.',
        '',
        'I still adjust.',
        '',
        'Practice is forever.',
        '',
        'I tell people: build sustainable. Adjust forever.'
      ],
      lesson: 'Build sustainable. Adjust forever.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_19 = [
    {
      id: 'dnv19_1',
      title: 'My online community of teachers',
      narrative: [
        'I am teacher. Burned out.',
        '',
        'Online community of teachers.',
        '',
        'They get it.',
        '',
        'Daily encouragement.',
        '',
        'Tips. Solidarity.',
        '',
        'I am still teaching because of them.',
        '',
        'I tell teachers: online teacher community helps.'
      ],
      lesson: 'Teacher communities online support.'
    },
    {
      id: 'dnv19_2',
      title: 'When my phone caused a fight with partner',
      narrative: [
        'Partner said: "You are always on phone."',
        '',
        'I had been defensive.',
        '',
        'We fought.',
        '',
        'Next day I checked screen time. They had been right.',
        '',
        'I apologized. We made rules.',
        '',
        'Phone caused a fight. Phone-free time healed.',
        '',
        'I tell people: partner feedback is data.'
      ],
      lesson: 'Listen to partner phone feedback.'
    },
    {
      id: 'dnv19_3',
      title: 'My phone reset experiment',
      narrative: [
        'Tried factory reset on phone.',
        '',
        'Re-downloaded only essential apps.',
        '',
        'Without convenience of old setup, I used less.',
        '',
        'Phone became basic.',
        '',
        'I tell people: factory reset is reset.'
      ],
      lesson: 'Factory reset disrupts compulsive use.'
    },
    {
      id: 'dnv19_4',
      title: 'When I finally read terms of service',
      narrative: [
        'Read full ToS of one platform.',
        '',
        'It was horrifying.',
        '',
        'Data sold. Used for ads. Used for training AI.',
        '',
        'I made changes. Privacy settings.',
        '',
        'Deleted some apps entirely.',
        '',
        'I tell people: read at least one ToS.'
      ],
      lesson: 'ToS reading is revealing.'
    },
    {
      id: 'dnv19_5',
      title: 'My online support for chronic pain',
      narrative: [
        'I have chronic pain.',
        '',
        'Online community of chronic pain patients.',
        '',
        'They know what I am living.',
        '',
        'Daily support.',
        '',
        'I tell people with chronic illness: find online community.'
      ],
      lesson: 'Chronic illness needs community.'
    },
    {
      id: 'dnv19_6',
      title: 'When my child wanted social media at 11',
      narrative: [
        'Child asked for social media at 11.',
        '',
        'We said no.',
        '',
        'They were upset.',
        '',
        'We held the line.',
        '',
        'They are 13 now. Glad we waited.',
        '',
        'I tell parents: delaying social media is gift.'
      ],
      lesson: 'Delaying social media protects.'
    },
    {
      id: 'dnv19_7',
      title: 'My text to my dad',
      narrative: [
        'Hadnt talked to dad in months.',
        '',
        'I texted: "Thinking of you."',
        '',
        'He responded immediately.',
        '',
        'We started talking again.',
        '',
        'A simple text reopened relationship.',
        '',
        'I tell people: simple texts repair.'
      ],
      lesson: 'Simple texts can repair distance.'
    },
    {
      id: 'dnv19_8',
      title: 'When AI hallucinated my answer',
      narrative: [
        'I asked AI factual question.',
        '',
        'It gave confident wrong answer.',
        '',
        'I checked. Wrong.',
        '',
        'I asked again. Wrong differently.',
        '',
        'I tell people: AI hallucinates. Verify everything.'
      ],
      lesson: 'AI hallucinates confidently.'
    },
    {
      id: 'dnv19_9',
      title: 'My phone broke at perfect time',
      narrative: [
        'Phone broke during exam week.',
        '',
        'I had nothing else to do but study.',
        '',
        'Best exam scores of my life.',
        '',
        'I tell students: phone-free study works.'
      ],
      lesson: 'Phone-free study works.'
    },
    {
      id: 'dnv19_10',
      title: 'My online community of fellow disabled people',
      narrative: [
        'I am disabled. Few in my town.',
        '',
        'Online community of disabled people.',
        '',
        'They taught me my rights.',
        '',
        'They affirm my identity.',
        '',
        'I tell disabled people: find your community.'
      ],
      lesson: 'Disabled community online is essential.'
    },
    {
      id: 'dnv19_11',
      title: 'When my friend\'s phone died on hike',
      narrative: [
        'Friend\'s phone died on hike.',
        '',
        'She panicked.',
        '',
        'I told her: "We are fine. We will figure it out."',
        '',
        'We got home safely.',
        '',
        'She was different at end of hike. Calmer.',
        '',
        'Phone-less is okay.',
        '',
        'I tell people: you can survive without phone.'
      ],
      lesson: 'You can survive phone-less.'
    },
    {
      id: 'dnv19_12',
      title: 'My boundary with my brother',
      narrative: [
        'Brother had been texting all hours.',
        '',
        'I said: "Texts after 9 pm I will see in morning."',
        '',
        'He adjusted.',
        '',
        'Better sleep for me.',
        '',
        'I tell siblings: boundaries are okay.'
      ],
      lesson: 'Sibling boundaries are okay.'
    },
    {
      id: 'dnv19_13',
      title: 'My online support for endometriosis',
      narrative: [
        'I have endometriosis. Few people understand.',
        '',
        'Online community of others.',
        '',
        'They validate. Share treatment options.',
        '',
        'I am better managed because of them.',
        '',
        'I tell women: rare-symptom community online exists.'
      ],
      lesson: 'Rare-symptom community online exists.'
    },
    {
      id: 'dnv19_14',
      title: 'When I noticed phone fatigue',
      narrative: [
        'I had been exhausted. Slept fine.',
        '',
        'Realized: phone fatigue.',
        '',
        'Eye strain. Mental fatigue.',
        '',
        'Reduced screen time. Energy returned.',
        '',
        'I tell people: phone causes fatigue.'
      ],
      lesson: 'Phone causes fatigue.'
    },
    {
      id: 'dnv19_15',
      title: 'My practice today',
      narrative: [
        'Today: phone in drawer overnight.',
        '',
        'Morning without phone first 30 minutes.',
        '',
        'Notifications mostly off.',
        '',
        'Apps off home screen.',
        '',
        'Phone-free meals.',
        '',
        'Real conversations.',
        '',
        'Practice continues.',
        '',
        'I tell people: simple daily practices.'
      ],
      lesson: 'Simple daily practices sustain.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_18 = [
    {
      id: 'dnv18_1',
      title: 'My friend\'s phone fast',
      narrative: [
        'Friend told me: "I am doing phone fast. 24 hours."',
        '',
        'I was skeptical. 24 hours? Why?',
        '',
        'She did it.',
        '',
        'Came back saying: "I want to do it again."',
        '',
        'I tried. Did 24 hours.',
        '',
        'Then 48. Then a week.',
        '',
        'Each was harder. Each was more valuable.',
        '',
        'I tell people: start with 24 hours.'
      ],
      lesson: 'Start with 24 hours.'
    },
    {
      id: 'dnv18_2',
      title: 'When I noticed my child watching me',
      narrative: [
        'My 6-year-old asked: "Why are you always on phone?"',
        '',
        'I had no good answer.',
        '',
        'I changed.',
        '',
        'Now they ask less. Because I am more present.',
        '',
        'I tell parents: kids notice.'
      ],
      lesson: 'Kids notice parents on phones.'
    },
    {
      id: 'dnv18_3',
      title: 'My online community of caretakers',
      narrative: [
        'I care for elderly parent. Exhausting.',
        '',
        'Found online community of caretakers.',
        '',
        'They get it.',
        '',
        'Daily encouragement. Resources.',
        '',
        'I am surviving caretaking.',
        '',
        'I tell caretakers: online community helps.'
      ],
      lesson: 'Caretaker online community essential.'
    },
    {
      id: 'dnv18_4',
      title: 'When my partner suggested phone-free Saturdays',
      narrative: [
        'Partner: "Lets try phone-free Saturdays."',
        '',
        'I had been resistant.',
        '',
        'We tried.',
        '',
        'Hard but good.',
        '',
        'Now sacred. We hike. Read. Cook. Are together.',
        '',
        'Saturdays are highlight of week.',
        '',
        'I tell couples: phone-free Saturday.'
      ],
      lesson: 'Phone-free Saturdays for couples.'
    },
    {
      id: 'dnv18_5',
      title: 'My online community of writers',
      narrative: [
        'I am writer. Lonely work.',
        '',
        'Online writing group. Critique partners.',
        '',
        'We share work. Encouragement. Honest feedback.',
        '',
        'My writing has grown.',
        '',
        'I tell writers: online critique partners matter.'
      ],
      lesson: 'Online writing community is real.'
    },
    {
      id: 'dnv18_6',
      title: 'When I caught my pre-teen with porn',
      narrative: [
        'Pre-teen accidentally exposed to porn.',
        '',
        'They told me.',
        '',
        'I am grateful.',
        '',
        'We talked. Not shame. Education.',
        '',
        'I added filters. We adjusted.',
        '',
        'The conversation mattered.',
        '',
        'I tell parents: when kid sees porn, talk. Not shame.'
      ],
      lesson: 'Porn exposure: talk, not shame.'
    },
    {
      id: 'dnv18_7',
      title: 'My online relationship with mother-in-law',
      narrative: [
        'Mother-in-law and I had been tense.',
        '',
        'We started texting daily. Simple things. Sharing photos.',
        '',
        'Slowly relationship warmed.',
        '',
        'Texts built relationship.',
        '',
        'I tell people: texts can heal.'
      ],
      lesson: 'Texts can build relationships.'
    },
    {
      id: 'dnv18_8',
      title: 'When AI helped me think clearly',
      narrative: [
        'I had been stuck on decision.',
        '',
        'Asked AI to help me think through.',
        '',
        'It asked good questions.',
        '',
        'I clarified my own thinking.',
        '',
        'AI as thinking partner can work.',
        '',
        'I tell people: AI for thinking through, not deciding for.'
      ],
      lesson: 'AI as thinking aid, not decider.'
    },
    {
      id: 'dnv18_9',
      title: 'My phone after grief',
      narrative: [
        'After mom died, I had been on phone constantly.',
        '',
        'Numbing.',
        '',
        'Therapist helped me see.',
        '',
        'I started feeling instead. Phone-free time for grief.',
        '',
        'Hard. Healing.',
        '',
        'I tell people: phone can numb. Sometimes you need to feel.'
      ],
      lesson: 'Sometimes phone is numbing. Feel instead.'
    },
    {
      id: 'dnv18_10',
      title: 'My anti-doomscroll practice',
      narrative: [
        'Election cycle. I had been doomscrolling.',
        '',
        'Anxiety through roof.',
        '',
        'I set rule: news once per day. 15 minutes.',
        '',
        'Hard at first. Then better.',
        '',
        'I voted. Donated. Volunteered.',
        '',
        'Real action beats scrolling.',
        '',
        'I tell people: limit news. Take action.'
      ],
      lesson: 'Limited news + real action beats doomscroll.'
    },
    {
      id: 'dnv18_11',
      title: 'My online community of fellow autistics',
      narrative: [
        'I am autistic. Late diagnosis.',
        '',
        'Online found community of autistic adults.',
        '',
        'They knew things my therapist did not.',
        '',
        'Identity. Pride. Strategies.',
        '',
        'I tell autistic peers: find your community online.'
      ],
      lesson: 'Autistic community online is invaluable.'
    },
    {
      id: 'dnv18_12',
      title: 'When phone caused my injury',
      narrative: [
        'Walking and texting. Tripped. Broke arm.',
        '',
        'Lesson learned.',
        '',
        'I do not text while walking.',
        '',
        'I tell people: not while walking.'
      ],
      lesson: 'Do not text while walking.'
    },
    {
      id: 'dnv18_13',
      title: 'My online support for fertility',
      narrative: [
        'Struggling with fertility.',
        '',
        'Online community of fertility journey.',
        '',
        'They walked with me through.',
        '',
        'I have child now.',
        '',
        'Still in touch with them.',
        '',
        'I tell people: fertility online community exists.'
      ],
      lesson: 'Fertility community online is real.'
    },
    {
      id: 'dnv18_14',
      title: 'When my partner suggested no phones in bed',
      narrative: [
        'Partner: "Lets not bring phones to bed."',
        '',
        'I resisted.',
        '',
        'We tried.',
        '',
        'Sleep transformed.',
        '',
        'Intimacy improved.',
        '',
        'We have not brought phones to bed in 3 years.',
        '',
        'I tell couples: no phones in bed.'
      ],
      lesson: 'No phones in bed transforms.'
    },
    {
      id: 'dnv18_15',
      title: 'My ongoing daily check',
      narrative: [
        'Every morning I check: am I serving phone or is phone serving me?',
        '',
        'Daily question.',
        '',
        'Keeps me oriented.',
        '',
        'Years of asking.',
        '',
        'Years of adjusting.',
        '',
        'Practice forever.',
        '',
        'I tell people: ask the question daily.'
      ],
      lesson: 'Daily question keeps you oriented.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_17 = [
    {
      id: 'dnv17_1',
      title: 'Story of building a different relationship with my phone',
      narrative: [
        'I had been a phone person for a decade. Constantly checking.',
        '',
        'I decided to change.',
        '',
        'I bought an old-school alarm clock so phone could leave bedroom.',
        '',
        'I deleted apps I did not need.',
        '',
        'I moved remaining apps off home screen.',
        '',
        'I turned off all notifications except calls from immediate family.',
        '',
        'I set time limits on apps that remained.',
        '',
        'I tried it for a month.',
        '',
        'Hard at first. My fingers wanted to reach.',
        '',
        'Then easier. My brain calmed down.',
        '',
        'By month 3 I had a different relationship.',
        '',
        'I tell people: structural changes work better than willpower.'
      ],
      lesson: 'Structure trumps willpower.'
    },
    {
      id: 'dnv17_2',
      title: 'My grandmother on FaceTime',
      narrative: [
        'My grandmother is 90. She lives across country.',
        '',
        'We FaceTime every Sunday.',
        '',
        'She is in her chair. I am on the couch.',
        '',
        'We talk. We laugh. We see each other.',
        '',
        'Technology lets me see her face.',
        '',
        'Some weeks we just sit quietly looking at each other.',
        '',
        'It feels like being there.',
        '',
        'I tell people: video calls with elders are gift.'
      ],
      lesson: 'Video calls keep distant elders close.'
    },
    {
      id: 'dnv17_3',
      title: 'When I deleted Facebook after 15 years',
      narrative: [
        'I had been on Facebook since 2007. Years of photos. Years of posts.',
        '',
        'I downloaded my data first. Saved important photos.',
        '',
        'Then I deleted account.',
        '',
        'The first month I had FOMO. Old friends I had not seen in years.',
        '',
        'I reached out to ones I actually missed. Most still wanted to be in touch.',
        '',
        'Year later I do not miss it.',
        '',
        'I tell people: data first. Then delete.'
      ],
      lesson: 'Download data before deleting. Then go.'
    },
    {
      id: 'dnv17_4',
      title: 'My child\'s first phone contract',
      narrative: [
        'My 13-year-old got first phone.',
        '',
        'We had long conversation. Wrote contract together.',
        '',
        'Rules: phone in kitchen overnight. No phone at meals. No phone during homework. Devices off 30 min before bed.',
        '',
        'Consequences for breaks. Rewards for sustained good practice.',
        '',
        'They signed. We signed.',
        '',
        '6 months in we are mostly successful.',
        '',
        'We renegotiate quarterly.',
        '',
        'I tell parents: contracts work.'
      ],
      lesson: 'Phone contracts with kids work.'
    },
    {
      id: 'dnv17_5',
      title: 'When I went on a hike phone-free',
      narrative: [
        'Friend planned hike. Said: "Leave phones at car."',
        '',
        'I had been nervous.',
        '',
        '5 hours in the woods. No phone.',
        '',
        'I noticed everything. Sounds. Smells. My breath. My friend.',
        '',
        'We talked deeply.',
        '',
        'We laughed.',
        '',
        'We were there.',
        '',
        'I have been doing phone-free hikes weekly since.',
        '',
        'I tell people: phone-free in nature is medicine.'
      ],
      lesson: 'Phone-free nature is medicine.'
    },
    {
      id: 'dnv17_6',
      title: 'My friend who taught me to say no',
      narrative: [
        'I had been responding to every text immediately.',
        '',
        'Friend said: "It is okay to not respond. People will wait."',
        '',
        'I started waiting. Responding when I had time.',
        '',
        'My world did not fall apart.',
        '',
        'My nervous system calmed.',
        '',
        'I tell people: you do not owe immediate response.'
      ],
      lesson: 'Immediate response is not obligation.'
    },
    {
      id: 'dnv17_7',
      title: 'When I switched to a feature phone',
      narrative: [
        'I had been struggling with smartphone for years.',
        '',
        'I bought feature phone. Call. Text. Basic email.',
        '',
        'No apps. No social media. No internet really.',
        '',
        'For 6 months I lived with feature phone.',
        '',
        'I read more. Slept better. Real conversations.',
        '',
        'When I went back to smartphone, I kept many habits.',
        '',
        'I tell people: feature phone period reveals what you need.'
      ],
      lesson: 'Feature phone period reveals truth.'
    },
    {
      id: 'dnv17_8',
      title: 'My therapy session about phones',
      narrative: [
        'I had been talking to therapist about anxiety.',
        '',
        'She asked: "How much do you use your phone?"',
        '',
        'I checked. 8 hours per day.',
        '',
        'She said: "That is a major factor."',
        '',
        'We worked on it. Reduced to 2 hours.',
        '',
        'Anxiety dropped significantly.',
        '',
        'I tell people: phone use is health factor.'
      ],
      lesson: 'Phone use affects mental health.'
    },
    {
      id: 'dnv17_9',
      title: 'When my niece taught me to play offline',
      narrative: [
        'My niece is 5. She has not had screens really.',
        '',
        'I visited. She wanted to play.',
        '',
        'She showed me how to build with blocks.',
        '',
        'We built a city.',
        '',
        '3 hours passed without phone.',
        '',
        'It was best afternoon I had had in months.',
        '',
        'I tell adults: children remember how to play offline.'
      ],
      lesson: 'Children can teach us play.'
    },
    {
      id: 'dnv17_10',
      title: 'My online tribe of recovering perfectionists',
      narrative: [
        'I am recovering perfectionist.',
        '',
        'Found online community.',
        '',
        'Weekly check-ins.',
        '',
        'We support each other through perfectionism.',
        '',
        'I would not be doing the work without them.',
        '',
        'I tell people: niche online communities for niche struggles work.'
      ],
      lesson: 'Niche online communities support niche struggles.'
    },
    {
      id: 'dnv17_11',
      title: 'When phone caused a car accident',
      narrative: [
        'I was texting while driving.',
        '',
        'Hit guardrail.',
        '',
        'Phone in trunk now. Always when driving.',
        '',
        'I tell people: phone in trunk for driving.'
      ],
      lesson: 'Phones cause accidents.'
    },
    {
      id: 'dnv17_12',
      title: 'My online community of people who lost child',
      narrative: [
        'I lost my child.',
        '',
        'No one in my offline life understood.',
        '',
        'Online community of parents who had lost children.',
        '',
        'They held me.',
        '',
        'I would not be alive without them.',
        '',
        'I tell grieving people: online community for unique grief exists.'
      ],
      lesson: 'Unique grief has unique online communities.'
    },
    {
      id: 'dnv17_13',
      title: 'When I let my friend video call my baby',
      narrative: [
        'Friend across country. Could not visit.',
        '',
        'We video called. She met my baby.',
        '',
        'She watched her first steps.',
        '',
        'Tech kept us close.',
        '',
        'I tell people: video calls keep distant relationships alive.'
      ],
      lesson: 'Video calls keep distant relationships alive.'
    },
    {
      id: 'dnv17_14',
      title: 'My phone-free birthday',
      narrative: [
        'My 30th birthday. Asked friends: leave phones at home.',
        '',
        'Some grumbled. They came anyway.',
        '',
        'Best birthday I had ever had.',
        '',
        'We were there.',
        '',
        'I have been having phone-free birthdays since.',
        '',
        'I tell people: phone-free events are gifts.'
      ],
      lesson: 'Phone-free events are gifts to everyone.'
    },
    {
      id: 'dnv17_15',
      title: 'My ongoing practice',
      narrative: [
        'I have been on this digital wellbeing journey for years.',
        '',
        'I have built sustainable patterns.',
        '',
        'I still adjust.',
        '',
        'I still mess up sometimes.',
        '',
        'I keep going.',
        '',
        'I tell people: this is forever practice. Keep going.'
      ],
      lesson: 'Practice is forever.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_16 = [
    {
      id: 'dnv16_1',
      title: 'My screens off ritual',
      narrative: [
        'Every night at 9 pm, all screens off.',
        '',
        'Hard at first.',
        '',
        'Now sacred.',
        '',
        'I read. I journal. I prepare for sleep.',
        '',
        'My sleep transformed.',
        '',
        'I tell people: have a screens-off ritual.'
      ],
      lesson: 'Screens-off ritual transforms sleep.'
    },
    {
      id: 'dnv16_2',
      title: 'When friend brought back the phone call',
      narrative: [
        'Friend started calling instead of texting.',
        '',
        'I had been annoyed. Then I adjusted.',
        '',
        'We talk weekly for an hour.',
        '',
        'Calls beat texts for depth.',
        '',
        'I tell people: revive the call.'
      ],
      lesson: 'Calls beat texts for connection.'
    },
    {
      id: 'dnv16_3',
      title: 'My online community when I came out',
      narrative: [
        'Came out at 16. Family was hostile.',
        '',
        'Online I had LGBTQ community.',
        '',
        'They walked me through.',
        '',
        'They became chosen family.',
        '',
        'I tell young LGBTQ people: online family is real family.'
      ],
      lesson: 'Online community can be family.'
    },
    {
      id: 'dnv16_4',
      title: 'When my friend\'s text saved my life',
      narrative: [
        'I was suicidal.',
        '',
        'Friend texted: "Just thinking about you."',
        '',
        'I cried.',
        '',
        'I called her.',
        '',
        'She drove over.',
        '',
        'We sat for hours.',
        '',
        'I survived.',
        '',
        'I tell people: send the simple text.'
      ],
      lesson: 'Simple texts save lives.'
    },
    {
      id: 'dnv16_5',
      title: 'My phone in a cabinet',
      narrative: [
        'I bought small cabinet for phone.',
        '',
        'Charge there overnight.',
        '',
        'Not in bedroom.',
        '',
        'Sleep transformed.',
        '',
        'I tell people: phone in another room.'
      ],
      lesson: 'Phone outside bedroom transforms sleep.'
    },
    {
      id: 'dnv16_6',
      title: 'When my online friend visited',
      narrative: [
        'Online friend of 7 years finally visited.',
        '',
        'We were nervous.',
        '',
        'We hugged. We talked. We were home.',
        '',
        'Online friendship is real friendship.',
        '',
        'I tell people: meet online friends in person when possible.'
      ],
      lesson: 'Online friends should be met when possible.'
    },
    {
      id: 'dnv16_7',
      title: 'My TikTok ban experiment',
      narrative: [
        'I tried banning TikTok for a month.',
        '',
        'Hardest digital fast I had ever done.',
        '',
        'But by end I was different. Calmer. More focused.',
        '',
        'I kept it banned.',
        '',
        '6 months later I am happier without it.',
        '',
        'I tell people: TikTok is addictive. Test removing.'
      ],
      lesson: 'TikTok removal often improves wellbeing.'
    },
    {
      id: 'dnv16_8',
      title: 'When AI helped my dad with grief',
      narrative: [
        'My dad lost my mom. Did not have therapist.',
        '',
        'He talked to AI at night.',
        '',
        'It helped him through hardest hours.',
        '',
        'Eventually he found therapist.',
        '',
        'AI was bridge.',
        '',
        'I tell people: AI as bridge is okay for grief.'
      ],
      lesson: 'AI can bridge to grief support.'
    },
    {
      id: 'dnv16_9',
      title: 'My online community of immigrants',
      narrative: [
        'I am immigrant. Lonely in new country.',
        '',
        'Found online community from my home country.',
        '',
        'Daily texts in my language.',
        '',
        'Cultural belonging.',
        '',
        'I tell immigrants: online keeps culture.'
      ],
      lesson: 'Immigrants need online cultural community.'
    },
    {
      id: 'dnv16_10',
      title: 'When my phone fell into ocean',
      narrative: [
        'Phone fell in ocean. Lost everything not backed up.',
        '',
        'I cried.',
        '',
        'Then I realized: most was not essential.',
        '',
        'I rebuilt.',
        '',
        'I tell people: backup matters. So does letting go.'
      ],
      lesson: 'Backup. And let go.'
    },
    {
      id: 'dnv16_11',
      title: 'My YouTube subscription audit',
      narrative: [
        'Subscribed to 300 channels over years.',
        '',
        'Audited. Kept 12.',
        '',
        'My feed is curated.',
        '',
        'I watch with intention now.',
        '',
        'I tell people: prune subscriptions ruthlessly.'
      ],
      lesson: 'Prune subscriptions ruthlessly.'
    },
    {
      id: 'dnv16_12',
      title: 'When I built screen-time discipline',
      narrative: [
        'Started: 2 hours phone limit per day.',
        '',
        'Week 1: blew through. 5 hours.',
        '',
        'Week 2: closer. 3 hours.',
        '',
        'Week 4: hit target most days.',
        '',
        'Month 2: 2 hours natural.',
        '',
        'I tell people: discipline builds. Be patient.'
      ],
      lesson: 'Discipline builds over weeks.'
    },
    {
      id: 'dnv16_13',
      title: 'My online support after gender transition',
      narrative: [
        'I transitioned at 30.',
        '',
        'Online community of trans adults.',
        '',
        'They walked with me. Resources. Encouragement.',
        '',
        'I am 5 years in. Still in that community.',
        '',
        'I tell trans people: online community is essential.'
      ],
      lesson: 'Trans community online is essential.'
    },
    {
      id: 'dnv16_14',
      title: 'When phone helped my elderly mom call me',
      narrative: [
        'Mom is 80. Had not been able to use phone.',
        '',
        'I got her simple phone with big buttons.',
        '',
        'Easy contacts.',
        '',
        'She calls me daily now.',
        '',
        'Tech served her.',
        '',
        'I tell people: simplified tech for elders.'
      ],
      lesson: 'Simplified tech for elders.'
    },
    {
      id: 'dnv16_15',
      title: 'My phone reflection',
      narrative: [
        'After years of work, my phone is healthier.',
        '',
        'I still struggle sometimes.',
        '',
        'But I have built patterns.',
        '',
        'They serve me.',
        '',
        'I tell people: patterns over willpower.'
      ],
      lesson: 'Patterns beat willpower.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_15 = [
    {
      id: 'dnv15_1',
      title: 'My phone-free first hour',
      narrative: [
        'I built habit: no phone for first hour after waking.',
        '',
        'Felt wrong at first.',
        '',
        'Now sacred.',
        '',
        'I plan my day. Drink coffee. Stretch.',
        '',
        'My day starts intentionally.',
        '',
        'I tell people: protect the first hour.'
      ],
      lesson: 'The first hour sets the day.'
    },
    {
      id: 'dnv15_2',
      title: 'When my doctor recommended digital break',
      narrative: [
        'I had chronic anxiety.',
        '',
        'Doctor asked about phone use.',
        '',
        'Recommended 2-week digital fast.',
        '',
        'I tried. Hard at first.',
        '',
        'Anxiety dropped significantly.',
        '',
        'I have changed my use forever.',
        '',
        'I tell people: doctors are recommending digital fasts now. Listen.'
      ],
      lesson: 'Digital fast is medical recommendation now.'
    },
    {
      id: 'dnv15_3',
      title: 'My online activism for sister',
      narrative: [
        'Sister was wrongfully fired.',
        '',
        'I posted her story online.',
        '',
        'It went viral.',
        '',
        'Company reversed decision.',
        '',
        'Sister back at work.',
        '',
        'I tell people: viral can change outcomes.'
      ],
      lesson: 'Online attention can right wrongs.'
    },
    {
      id: 'dnv15_4',
      title: 'When my partner deepfaked me',
      narrative: [
        'Partner used my photos for deepfake without consent.',
        '',
        'I found out. Devastated.',
        '',
        'I confronted. Police.',
        '',
        'I left.',
        '',
        'I tell people: deepfake by partner is abuse.'
      ],
      lesson: 'Partner deepfake is abuse.'
    },
    {
      id: 'dnv15_5',
      title: 'My online support after eviction',
      narrative: [
        'Lost my housing at 22.',
        '',
        'Online community of housing-insecure people.',
        '',
        'Tips on resources. Solidarity.',
        '',
        'They helped me find housing.',
        '',
        'I tell people: hard times have online community.'
      ],
      lesson: 'Crisis online community exists.'
    },
    {
      id: 'dnv15_6',
      title: 'When AI helped me write resume',
      narrative: [
        'I had ADHD. Could not start resume.',
        '',
        'AI helped me draft.',
        '',
        'I edited heavily.',
        '',
        'Got the job.',
        '',
        'AI as accommodation for me.',
        '',
        'I tell ADHD peers: AI helps get started.'
      ],
      lesson: 'AI as ADHD accommodation works.'
    },
    {
      id: 'dnv15_7',
      title: 'My phone-free Sunday brunch',
      narrative: [
        'Friend group started phone-free brunch.',
        '',
        'Phones in basket on table.',
        '',
        'Conversations deepened.',
        '',
        'We have been doing this for years.',
        '',
        'I tell friend groups: phone-free meal.'
      ],
      lesson: 'Friend group practices last.'
    },
    {
      id: 'dnv15_8',
      title: 'When my niece taught me TikTok',
      narrative: [
        'I am 40. Niece is 14.',
        '',
        'She taught me TikTok.',
        '',
        'I tried. Found it overwhelming.',
        '',
        'I deleted after a week.',
        '',
        'I told her I respect her choice. I made different one.',
        '',
        'Generational gap is okay.',
        '',
        'I tell people: not every platform for every person.'
      ],
      lesson: 'Different platforms for different people.'
    },
    {
      id: 'dnv15_9',
      title: 'My online community of veterans',
      narrative: [
        'I am veteran with PTSD.',
        '',
        'Online community of veterans saved me.',
        '',
        'Daily check-ins.',
        '',
        'They knew what I had been through.',
        '',
        'I tell veterans: online community works.'
      ],
      lesson: 'Veterans need veteran community.'
    },
    {
      id: 'dnv15_10',
      title: 'When phone tracked my grief',
      narrative: [
        'After mom died, I used grief tracking app.',
        '',
        'Daily check-ins. Mood. Symptoms.',
        '',
        'A year later I had data.',
        '',
        'Showed therapist.',
        '',
        'They saw patterns. Adjusted treatment.',
        '',
        'Tech served healing.',
        '',
        'I tell people: data can help grief.'
      ],
      lesson: 'Data can serve grief processing.'
    },
    {
      id: 'dnv15_11',
      title: 'My boundary with my mother',
      narrative: [
        'Mom texted constantly. Many demands.',
        '',
        'I told her: "I love you. I cannot respond all day."',
        '',
        'She was hurt.',
        '',
        'Months later we settled into healthier pattern.',
        '',
        'I tell people: mothers need boundaries too.'
      ],
      lesson: 'Mother boundaries are healthy.'
    },
    {
      id: 'dnv15_12',
      title: 'When phone caught my abuser',
      narrative: [
        'My ex-partner was stalking.',
        '',
        'I documented every contact.',
        '',
        'Restraining order. Used my documentation.',
        '',
        'I was safe.',
        '',
        'I tell survivors: document everything.'
      ],
      lesson: 'Documentation protects.'
    },
    {
      id: 'dnv15_13',
      title: 'My online job hunt',
      narrative: [
        'Lost job. Used LinkedIn strategically.',
        '',
        'Connections. Applications. Networking.',
        '',
        'Found new job in 8 weeks.',
        '',
        'Tech served me.',
        '',
        'I tell people: tech as tool for job hunt.'
      ],
      lesson: 'Strategic tech use for jobs.'
    },
    {
      id: 'dnv15_14',
      title: 'When AI failed me on legal',
      narrative: [
        'I had legal question.',
        '',
        'AI gave me confident answer.',
        '',
        'Lawyer told me AI was wrong.',
        '',
        'Could have cost me thousands.',
        '',
        'I tell people: real lawyers for legal.'
      ],
      lesson: 'Real professionals for serious topics.'
    },
    {
      id: 'dnv15_15',
      title: 'My ongoing practice',
      narrative: [
        'After years of practice, my phone use is healthy.',
        '',
        'I have built sustainable patterns.',
        '',
        'I still mess up sometimes.',
        '',
        'I adjust.',
        '',
        'Practice is forever.',
        '',
        'I tell people: keep going.'
      ],
      lesson: 'Practice forever, perfect never.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_14 = [
    { id: 'dnv14_1', title: 'When I found my voice online', narrative: ['I had been silent online for years.', '', 'Then I started writing essays.', '', 'Slowly people responded.', '', 'I built audience over years.', '', 'My voice exists.', '', 'I tell people: build slowly.'], lesson: 'Online voice is built over years.' },
    { id: 'dnv14_2', title: 'My phone-free morning walk', narrative: ['Every morning I walk. Phone in pocket. Off.', '', 'I notice trees. Sky. Body.', '', 'My day starts grounded.', '', 'I tell people: walk without phone.'], lesson: 'Walking without phone changes you.' },
    { id: 'dnv14_3', title: 'When my friend\'s online persona broke', narrative: ['Friend\'s online persona was confidence.', '', 'In person she crumbled.', '', 'I asked. She had been performing.', '', 'We had real conversations.', '', 'Online performance is exhausting.', '', 'I tell people: drop the mask.'], lesson: 'Online masks exhaust the wearer.' },
    { id: 'dnv14_4', title: 'My WhatsApp family group I left', narrative: ['Family group was 100+ messages daily.', '', 'I muted. Could not keep up.', '', 'I left.', '', 'Family was upset.', '', 'I called individuals.', '', 'Deeper relationships.', '', 'I tell people: leave what does not serve.'], lesson: 'Leave overwhelming chats.' },
    { id: 'dnv14_5', title: 'When I built my own algorithm', narrative: ['Made my own RSS feed of selected sources.', '', 'No algorithm. I choose.', '', 'My information diet improved.', '', 'I tell people: RSS still works.'], lesson: 'RSS lets you control feed.' },
    { id: 'dnv14_6', title: 'My online community of disabled writers', narrative: ['I am disabled writer. Lonely work.', '', 'Online found other disabled writers.', '', 'We critique. Support. Encourage.', '', 'My writing has deepened.', '', 'I tell writers: find your tribe.'], lesson: 'Specialized writer community is gift.' },
    { id: 'dnv14_7', title: 'When I deleted dating apps', narrative: ['Years on apps. Many disappointments.', '', 'I deleted all.', '', 'A year off.', '', 'Met partner at coffee shop.', '', 'Some answers are offline.', '', 'I tell people: take breaks from apps.'], lesson: 'Take breaks from dating apps.' },
    { id: 'dnv14_8', title: 'My LinkedIn fasting', narrative: ['LinkedIn was making me anxious. Comparison.', '', 'I logged out. Did not log in for 6 months.', '', 'My career did not suffer.', '', 'I logged in occasionally now. Strategically.', '', 'I tell people: networking on schedule.'], lesson: 'LinkedIn does not need constant attention.' },
    { id: 'dnv14_9', title: 'When my child wanted to be influencer', narrative: ['Child wanted to be influencer.', '', 'We talked about reality.', '', 'Compared with traditional careers.', '', 'They could still pursue. With realistic understanding.', '', 'I tell parents: discuss realistically.'], lesson: 'Influencer reality talks help.' },
    { id: 'dnv14_10', title: 'My online recovery community', narrative: ['I am in recovery. Online community supported me.', '', 'Daily check-ins. Real care.', '', 'They are why I have stayed sober.', '', 'I tell people in recovery: online community works.'], lesson: 'Recovery online community is real.' },
    { id: 'dnv14_11', title: 'When phone helped during accident', narrative: ['Car accident. Phone was lifeline.', '', 'Called 911. Took photos for insurance.', '', 'Tech served me.', '', 'I tell people: phone is tool. Use well.'], lesson: 'Phones are tools. Use as such.' },
    { id: 'dnv14_12', title: 'My online community of trans elders', narrative: ['I am young trans person.', '', 'Online I found trans elders.', '', 'They taught me history. Wisdom. Pride.', '', 'I would not be here without them.', '', 'I tell young trans: find elders.'], lesson: 'Trans elders save trans youth.' },
    { id: 'dnv14_13', title: 'When AI helped me with autism', narrative: ['I am autistic. Social situations confuse me.', '', 'AI helps me decode. Suggests responses.', '', 'My social anxiety dropped.', '', 'I tell autistic peers: AI as social translator helps.'], lesson: 'AI helps decode social.' },
    { id: 'dnv14_14', title: 'My phone in the trunk', narrative: ['When I drive long distances I put phone in trunk.', '', 'Cannot reach.', '', 'I drive safer. I think clearer.', '', 'I tell people: phone in trunk for driving.'], lesson: 'Phone in trunk for driving.' },
    { id: 'dnv14_15', title: 'My online community of single moms', narrative: ['I am single mom. Tired.', '', 'Online community of other single moms.', '', 'Daily support. Tips. Validation.', '', 'I am surviving because of them.', '', 'I tell single moms: find community.'], lesson: 'Single mom community is essential.' }
  ];

  var DEEP_NARRATIVES_VOLUME_13 = [
    {
      id: 'dnv13_1',
      title: 'When AI couldnt understand context',
      narrative: [
        'I asked AI complex question about my situation.',
        '',
        'It gave generic answer.',
        '',
        'I asked my therapist same question.',
        '',
        'They understood my history. My context.',
        '',
        'Their answer was different. Specific to me.',
        '',
        'I tell people: AI gives general. Humans give specific.'
      ],
      lesson: 'AI gives general. Humans give specific.'
    },
    {
      id: 'dnv13_2',
      title: 'My moms birthday phone call',
      narrative: [
        'Called mom on birthday. Not texted.',
        '',
        'We talked an hour.',
        '',
        'She cried.',
        '',
        'She said: "No one calls anymore."',
        '',
        'I tell people: call. Especially elders.'
      ],
      lesson: 'Calls matter especially to elders.'
    },
    {
      id: 'dnv13_3',
      title: 'When I stopped reading comments',
      narrative: [
        'My posts had been generating ugly comments.',
        '',
        'I had been reading every one.',
        '',
        'My therapist said: stop reading.',
        '',
        'I stopped.',
        '',
        'My mood improved.',
        '',
        'I post still. I do not read comments.',
        '',
        'I tell people: you do not owe attention to ugliness.'
      ],
      lesson: 'You do not have to read comments.'
    },
    {
      id: 'dnv13_4',
      title: 'My online study buddy',
      narrative: [
        'Found online study buddy. We worked together via video.',
        '',
        'Co-working virtually.',
        '',
        'My focus improved. Productivity doubled.',
        '',
        'We have been study buddies for years.',
        '',
        'I tell people: co-working virtually works.'
      ],
      lesson: 'Virtual co-working helps.'
    },
    {
      id: 'dnv13_5',
      title: 'When I unsubscribed from all newsletters',
      narrative: [
        'I had been subscribed to 50+ newsletters.',
        '',
        'Email was avalanche.',
        '',
        'I unsubscribed from all.',
        '',
        'Resubscribed to 3 essentials.',
        '',
        'Email is manageable now.',
        '',
        'I tell people: aggressive unsubscribe.'
      ],
      lesson: 'Unsubscribe aggressively.'
    },
    {
      id: 'dnv13_6',
      title: 'My phone-light wedding',
      narrative: [
        'My wedding. We asked guests to put phones away during ceremony.',
        '',
        'Guests grumbled briefly.',
        '',
        'Then they were there.',
        '',
        'Photos came from photographer. Memories came from being there.',
        '',
        'I tell couples: ask for phone-light wedding.'
      ],
      lesson: 'Phone-light weddings are gift.'
    },
    {
      id: 'dnv13_7',
      title: 'When I asked friend to stop texting',
      narrative: [
        'Friend texted constantly. I felt smothered.',
        '',
        'I asked: "Can we slow texting? More in person?"',
        '',
        'She was hurt. We talked through it.',
        '',
        'Friendship became deeper. Less anxious.',
        '',
        'I tell people: name what you need.'
      ],
      lesson: 'Friendship needs naming.'
    },
    {
      id: 'dnv13_8',
      title: 'My boss who modeled phone-free',
      narrative: [
        'New boss did not check phone in meetings.',
        '',
        'Phone in bag.',
        '',
        'Whole team adapted.',
        '',
        'Meetings became focused. Decisions faster.',
        '',
        'I tell leaders: model what you want.'
      ],
      lesson: 'Leaders set tech tone.'
    },
    {
      id: 'dnv13_9',
      title: 'When AI got my friend through breakup',
      narrative: [
        'Friend was devastated after breakup.',
        '',
        'She talked to AI for hours at night.',
        '',
        'It helped her process. Calm down.',
        '',
        'She also went to therapy.',
        '',
        'AI was bridge during hardest hours.',
        '',
        'I tell people: AI as bridge to therapy is okay.'
      ],
      lesson: 'AI as bridge to humans is acceptable.'
    },
    {
      id: 'dnv13_10',
      title: 'My online cancer support saved my mind',
      narrative: [
        'Diagnosed with cancer.',
        '',
        'Online community of survivors.',
        '',
        'They saved my mind through treatment.',
        '',
        'I am cancer-free 7 years now. Still in touch.',
        '',
        'I tell people: medical online community is real.'
      ],
      lesson: 'Medical online community is real lifeline.'
    },
    {
      id: 'dnv13_11',
      title: 'When my pre-teen wanted phone',
      narrative: [
        'My 11-year-old begged for phone.',
        '',
        'We had long conversation.',
        '',
        'Compromise: dumb phone first. Smartphone at 14 with rules.',
        '',
        'They were not happy.',
        '',
        'A year later they thanked me.',
        '',
        'I tell parents: phase in.'
      ],
      lesson: 'Phase phones in gradually.'
    },
    {
      id: 'dnv13_12',
      title: 'My text to my brother who I had been distant from',
      narrative: [
        'Had not talked to brother in year.',
        '',
        'I sent simple text: "Thinking of you."',
        '',
        'He responded. We started conversation.',
        '',
        'A month later we were close again.',
        '',
        'I tell people: reach out. Texts open doors.'
      ],
      lesson: 'Simple texts repair distance.'
    },
    {
      id: 'dnv13_13',
      title: 'When I noticed friend\'s feed was lies',
      narrative: [
        'Friend\'s social media looked perfect.',
        '',
        'Then she opened up. Behind feed was depression.',
        '',
        'I tell people: feeds lie. Check on people.'
      ],
      lesson: 'Feeds hide. Check on people.'
    },
    {
      id: 'dnv13_14',
      title: 'My friend who deleted everything',
      narrative: [
        'Friend deleted all social media at once.',
        '',
        'Some people thought reckless.',
        '',
        'A year later he was unrecognizable.',
        '',
        'Calmer. Healthier. More present.',
        '',
        'I tell people: extreme sometimes works.'
      ],
      lesson: 'Sometimes extreme is the answer.'
    },
    {
      id: 'dnv13_15',
      title: 'My pause practice',
      narrative: [
        'I built pause practice.',
        '',
        'Before reaching for phone: pause.',
        '',
        'Notice why. Decide if necessary.',
        '',
        'Many reaches did not happen.',
        '',
        'My usage dropped 40%.',
        '',
        'I tell people: pause is small revolution.'
      ],
      lesson: 'Pause is small revolution.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_12 = [
    {
      id: 'dnv12_1',
      title: 'The notification I muted that helped',
      narrative: [
        'I muted work Slack notifications evenings.',
        '',
        'Boss texted: "Did you see my message?"',
        '',
        'I responded: "I will see it tomorrow."',
        '',
        'Boss adjusted expectations.',
        '',
        'I tell workers: model boundaries.'
      ],
      lesson: 'Boundaries train boss expectations.'
    },
    {
      id: 'dnv12_2',
      title: 'My phone-free dinner ritual',
      narrative: [
        'Phone in basket at dinner. Family practice.',
        '',
        'Conversations are real.',
        '',
        'Years later kids ask for phones at dinner only when sick.',
        '',
        'Phone-free meals built family culture.',
        '',
        'I tell families: start with dinner.'
      ],
      lesson: 'Meals are easiest place to start.'
    },
    {
      id: 'dnv12_3',
      title: 'When my friend asked to call',
      narrative: [
        'Friend texted: "Can we call?"',
        '',
        'I said yes. We talked an hour.',
        '',
        'Topic was complex. Call worked better than text.',
        '',
        'I tell people: when offered call, accept.'
      ],
      lesson: 'Calls handle complex better than text.'
    },
    {
      id: 'dnv12_4',
      title: 'My online support after miscarriage',
      narrative: [
        'I miscarried. Could not talk in person.',
        '',
        'Found online support group of women who had been there.',
        '',
        'They got me through.',
        '',
        'I told my husband eventually. He understood.',
        '',
        'I tell people: tragedy needs community. Online works.'
      ],
      lesson: 'Tragedy can find online community first.'
    },
    {
      id: 'dnv12_5',
      title: 'When I cried at AI response',
      narrative: [
        'I had been talking to AI about death of father.',
        '',
        'It said comforting things.',
        '',
        'I cried for hours.',
        '',
        'Then I realized: AI gave me words. But empty.',
        '',
        'I called my sister. Real grief shared.',
        '',
        'I tell people: grief needs humans.'
      ],
      lesson: 'AI cannot share grief. Humans can.'
    },
    {
      id: 'dnv12_6',
      title: 'My phone-free Sundays',
      narrative: [
        'I started phone-free Sundays.',
        '',
        'Felt impossible first time.',
        '',
        'Now sacred.',
        '',
        'My Mondays are better.',
        '',
        'I tell people: weekly sabbath from phone is real rest.'
      ],
      lesson: 'Weekly sabbath structures life.'
    },
    {
      id: 'dnv12_7',
      title: 'When I noticed I had been silent',
      narrative: [
        'I had been doomscrolling about injustice.',
        '',
        'But not acting.',
        '',
        'Doomscrolling is not activism.',
        '',
        'I started donating. Volunteering. Voting.',
        '',
        'Real action beats endless scrolling.',
        '',
        'I tell people: act. Do not just scroll.'
      ],
      lesson: 'Action beats scrolling.'
    },
    {
      id: 'dnv12_8',
      title: 'My online community after loss',
      narrative: [
        'My partner died. I was alone.',
        '',
        'Found online widow group.',
        '',
        'Women across world who had been where I was.',
        '',
        'They walked with me through year one.',
        '',
        'I am okay now. Still in touch with them.',
        '',
        'I tell people: grief has online community.'
      ],
      lesson: 'Grief has online community.'
    },
    {
      id: 'dnv12_9',
      title: 'When I caught the algorithm pushing fear',
      narrative: [
        'My feed had been all bad news.',
        '',
        'I felt hopeless.',
        '',
        'I curated. Followed solutions journalism. Constructive news.',
        '',
        'My feed shifted. My mood shifted.',
        '',
        'I tell people: curate for hope too.'
      ],
      lesson: 'You can curate for hope.'
    },
    {
      id: 'dnv12_10',
      title: 'My boundary with my boss',
      narrative: [
        'Boss had been texting weekends.',
        '',
        'I told her: "I work Monday to Friday. Weekend texts I will respond Monday."',
        '',
        'She adjusted.',
        '',
        'My weekends are mine.',
        '',
        'I tell workers: name the boundary.'
      ],
      lesson: 'Name boundaries to boss.'
    },
    {
      id: 'dnv12_11',
      title: 'When I un-friended someone',
      narrative: [
        'Person from past kept popping into my feed.',
        '',
        'They had hurt me.',
        '',
        'I un-friended.',
        '',
        'Felt cleaner.',
        '',
        'I tell people: unfriend old wounds.'
      ],
      lesson: 'Unfriending old wounds is care.'
    },
    {
      id: 'dnv12_12',
      title: 'My online recipe community',
      narrative: [
        'I love cooking. Find recipes online.',
        '',
        'Best community: home cooks sharing.',
        '',
        'I learned techniques from grandmas across world.',
        '',
        'My cooking improved.',
        '',
        'I tell people: knowledge sharing online is gift.'
      ],
      lesson: 'Skill-sharing communities are gift.'
    },
    {
      id: 'dnv12_13',
      title: 'When phone helped my elderly mom',
      narrative: [
        'My mom is 75. She had been isolated.',
        '',
        'I set up easy phone for her. Big buttons. Few apps.',
        '',
        'Video calls weekly with grandkids.',
        '',
        'Her isolation eased.',
        '',
        'Tech serves at any age.',
        '',
        'I tell people: set up tech for elders. Their lives.'
      ],
      lesson: 'Tech for elders changes their lives.'
    },
    {
      id: 'dnv12_14',
      title: 'My therapy after online harassment',
      narrative: [
        'Harassment had hurt me. I went to therapy.',
        '',
        'Therapist specialized in online trauma.',
        '',
        'I had not known this existed.',
        '',
        'I healed.',
        '',
        'I tell people: online trauma is real trauma. Get specialized help.'
      ],
      lesson: 'Online trauma is real. Specialized help exists.'
    },
    {
      id: 'dnv12_15',
      title: 'My ongoing daily practice',
      narrative: [
        'Phone in drawer overnight.',
        '',
        'Morning without phone first 30 min.',
        '',
        'Notifications mostly off.',
        '',
        'Apps mostly off home screen.',
        '',
        'Curated feed.',
        '',
        'In-person time prioritized.',
        '',
        'Small daily practice. Years of difference.',
        '',
        'I tell people: small daily practices compound.'
      ],
      lesson: 'Small daily compounds.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_11 = [
    {
      id: 'dnv11_1',
      title: 'Story of practice',
      narrative: [
        'I have been doing this practice for years.',
        '',
        'Some days I succeed.',
        '',
        'Some days I fail.',
        '',
        'Most days are in between.',
        '',
        'I keep going.',
        '',
        'I tell people: practice is not perfection.'
      ],
      lesson: 'Imperfect practice is real practice.'
    },
    {
      id: 'dnv11_2',
      title: 'The night I read every comment',
      narrative: [
        'My viral post had 5000 comments.',
        '',
        'I read every one.',
        '',
        'Took 4 hours.',
        '',
        'I could not stop.',
        '',
        'I learned: do not read every comment.',
        '',
        'Some good. Some bad. All draining.',
        '',
        'I tell people: do not read every comment.'
      ],
      lesson: 'Comment reading is exhausting.'
    },
    {
      id: 'dnv11_3',
      title: 'My phone-free family rules',
      narrative: [
        'Family agreed: no phones during meals. None during family time.',
        '',
        'We adjusted as kids grew.',
        '',
        'Rules served us.',
        '',
        'We connected.',
        '',
        'I tell families: agree together. Enforce together.'
      ],
      lesson: 'Family tech rules need family agreement.'
    },
    {
      id: 'dnv11_4',
      title: 'When my chatbot got my mood wrong',
      narrative: [
        'I had been depressed. AI suggested I take walk.',
        '',
        'I could not get out of bed.',
        '',
        'AI did not know.',
        '',
        'A real therapist would have.',
        '',
        'I tell people: AI cannot read state.'
      ],
      lesson: 'AI reads text. Not state.'
    },
    {
      id: 'dnv11_5',
      title: 'My friend\'s post that worried me',
      narrative: [
        'Friend posted: "I am tired of trying."',
        '',
        'I called immediately.',
        '',
        'They were in crisis.',
        '',
        'I stayed on phone. We called 988.',
        '',
        'They got help.',
        '',
        'I tell people: take cryptic posts seriously.'
      ],
      lesson: 'Vague posts can be cries for help.'
    },
    {
      id: 'dnv11_6',
      title: 'My online faith community',
      narrative: [
        'My church meets in person. AND we have online study group.',
        '',
        'Best of both.',
        '',
        'Online for daily. In person for sacred.',
        '',
        'I tell people: hybrid works.'
      ],
      lesson: 'Hybrid spiritual community works.'
    },
    {
      id: 'dnv11_7',
      title: 'When I muted everyone but family',
      narrative: [
        'My anxiety was high. I muted everyone but family.',
        '',
        'Phone was nearly silent.',
        '',
        'I caught up at end of day.',
        '',
        'My anxiety dropped.',
        '',
        'I have stayed mostly muted since.',
        '',
        'I tell people: minimal notification is gift.'
      ],
      lesson: 'Mute aggressively for mental health.'
    },
    {
      id: 'dnv11_8',
      title: 'My phone in lockbox',
      narrative: [
        'I bought lockbox for phone. Lock for set time.',
        '',
        'I lock phone for 2 hours during focused work.',
        '',
        'Cannot reach for it.',
        '',
        'Work doubled.',
        '',
        'I tell people: physical barriers work.'
      ],
      lesson: 'Physical separation works.'
    },
    {
      id: 'dnv11_9',
      title: 'When friend offered phone-free walk',
      narrative: [
        'Friend said: "Lets walk. No phones."',
        '',
        'I had hesitated.',
        '',
        'We walked an hour. Talked. Listened. Were.',
        '',
        'Best walk I had in years.',
        '',
        'I tell people: phone-free walk is gift.'
      ],
      lesson: 'Phone-free walks are gold.'
    },
    {
      id: 'dnv11_10',
      title: 'My online community of parents',
      narrative: [
        'New parent. Lonely. Confused.',
        '',
        'Online community of parents helped.',
        '',
        'Daily support. Advice. Solidarity.',
        '',
        'I survived early parenting.',
        '',
        'I tell new parents: online community helps.'
      ],
      lesson: 'New parent communities save sanity.'
    },
    {
      id: 'dnv11_11',
      title: 'When my dad called instead of text',
      narrative: [
        'My dad called me out of blue.',
        '',
        'I was annoyed. Could not he text?',
        '',
        'We talked an hour. He had been thinking of me.',
        '',
        'Best call in a year.',
        '',
        'I tell people: receive calls with grace.'
      ],
      lesson: 'Calls are deeper than texts.'
    },
    {
      id: 'dnv11_12',
      title: 'My TikTok-free year',
      narrative: [
        'I gave up TikTok for a year.',
        '',
        'I missed nothing essential.',
        '',
        'My time freed.',
        '',
        'A year later I did not re-install.',
        '',
        'I tell people: year off shows you.'
      ],
      lesson: 'Year off reveals truth.'
    },
    {
      id: 'dnv11_13',
      title: 'When phone broke and I was relieved',
      narrative: [
        'Phone broke. Had to wait week for replacement.',
        '',
        'First day was panic.',
        '',
        'Second day was relief.',
        '',
        'By week end I was calmer.',
        '',
        'I tell people: phone breaking can reveal.'
      ],
      lesson: 'Tech failures can be gifts.'
    },
    {
      id: 'dnv11_14',
      title: 'My online tutor',
      narrative: [
        'I had trouble with math. Found online tutor.',
        '',
        'Weekly sessions.',
        '',
        'My grades improved.',
        '',
        'Tech can support learning.',
        '',
        'I tell people: online tutoring works.'
      ],
      lesson: 'Online tutoring is real teaching.'
    },
    {
      id: 'dnv11_15',
      title: 'The pause before posting',
      narrative: [
        'I built habit: pause before posting.',
        '',
        '10 seconds. Read post. Ask: should I?',
        '',
        'Many posts not sent.',
        '',
        'Some sent better.',
        '',
        'I tell people: 10-second pause saves regret.'
      ],
      lesson: '10 seconds of pause is wisdom.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_10 = [
    {
      id: 'dnv10_1',
      title: 'The text I waited a week to respond to',
      narrative: [
        'Someone texted me with conflict.',
        '',
        'I drafted. I waited.',
        '',
        'A week. I came back. The response was different. Calmer. Wiser.',
        '',
        'I sent it. Conversation went well.',
        '',
        'I tell people: waiting works.'
      ],
      lesson: 'Waiting transforms response.'
    },
    {
      id: 'dnv10_2',
      title: 'My online to in-person friendship',
      narrative: [
        'Met online. Talked for 3 years.',
        '',
        'Finally met. Felt like reunion.',
        '',
        'We were close already.',
        '',
        'I tell people: online to in-person works.'
      ],
      lesson: 'Online to in-person friendships are real.'
    },
    {
      id: 'dnv10_3',
      title: 'When AI helped me cope',
      narrative: [
        'I was in transit. Anxious.',
        '',
        'I asked AI to help me breathe.',
        '',
        'It guided me through breath. Specific. Calming.',
        '',
        'I made it through.',
        '',
        'AI as transitional coping tool can help.',
        '',
        'I tell people: AI for specific moments okay.'
      ],
      lesson: 'AI for specific coping in moment.'
    },
    {
      id: 'dnv10_4',
      title: 'My phone in a drawer at work',
      narrative: [
        'Started leaving phone in drawer at work.',
        '',
        'Checked at lunch. End of day.',
        '',
        'Productivity doubled.',
        '',
        'Anxiety dropped.',
        '',
        'I tell workers: drawer your phone.'
      ],
      lesson: 'Phone in drawer doubles productivity.'
    },
    {
      id: 'dnv10_5',
      title: 'When I deleted my dating app messages',
      narrative: [
        'Years of dating app messages.',
        '',
        'Some painful. Some embarrassing. Some hopeful.',
        '',
        'I deleted all.',
        '',
        'I felt lighter.',
        '',
        'I tell people: old messages weigh.'
      ],
      lesson: 'Old digital baggage is real baggage.'
    },
    {
      id: 'dnv10_6',
      title: 'My online community after job loss',
      narrative: [
        'Lost job at 40.',
        '',
        'Found online community of others laid off.',
        '',
        'We supported each other through job hunting.',
        '',
        'I am employed now. Still friends with them.',
        '',
        'I tell people: hard transitions find online community.'
      ],
      lesson: 'Hard transitions need community.'
    },
    {
      id: 'dnv10_7',
      title: 'When phone almost ruined relationship',
      narrative: [
        'Partner said: "You are never present. Always phone."',
        '',
        'I had been defensive. Then I noticed.',
        '',
        'I started phone-free time with partner.',
        '',
        'Relationship improved.',
        '',
        'I tell people: listen when partner says you are absent.'
      ],
      lesson: 'Partner feedback is data.'
    },
    {
      id: 'dnv10_8',
      title: 'My online study group',
      narrative: [
        'In college I joined online study group.',
        '',
        'We met daily. Worked together.',
        '',
        'My grades improved. My friendships deepened.',
        '',
        'I tell students: online study groups work.'
      ],
      lesson: 'Study groups online build grades and friends.'
    },
    {
      id: 'dnv10_9',
      title: 'When my friend ghosted me',
      narrative: [
        'Friend stopped responding to texts.',
        '',
        'I texted. Called. Nothing.',
        '',
        'I let go.',
        '',
        'Months later they reached out. Said they had been depressed.',
        '',
        'We rebuilt.',
        '',
        'I tell people: ghosting often means crisis, not rejection.'
      ],
      lesson: 'Ghosting can be crisis.'
    },
    {
      id: 'dnv10_10',
      title: 'My grandmother\'s last call',
      narrative: [
        'My grandmother called me before she died.',
        '',
        'She did not know it was last call.',
        '',
        'I answered. We talked for an hour.',
        '',
        'She told me things I had not heard.',
        '',
        'A week later she was gone.',
        '',
        'I am grateful I answered.',
        '',
        'I tell people: answer the elders.'
      ],
      lesson: 'Always answer the elders.'
    },
    {
      id: 'dnv10_11',
      title: 'When I noticed my hands shake',
      narrative: [
        'I noticed my hands shaking. Not phone-related.',
        '',
        'Doctor said anxiety.',
        '',
        'I tracked screen time. Strong correlation.',
        '',
        'Less phone = less shaking.',
        '',
        'I tell people: body symptoms can be tech.'
      ],
      lesson: 'Body symptoms can connect to tech use.'
    },
    {
      id: 'dnv10_12',
      title: 'My online book club',
      narrative: [
        'I am in online book club. 8 women across world.',
        '',
        'Monthly Zoom. Real conversations about books.',
        '',
        'My intellect has grown.',
        '',
        'I tell people: online intellectual community is real.'
      ],
      lesson: 'Online intellectual community deepens mind.'
    },
    {
      id: 'dnv10_13',
      title: 'When I noticed my breath',
      narrative: [
        'Reading social media my breath went shallow.',
        '',
        'I had not noticed before.',
        '',
        'Now I notice my breath when on phone.',
        '',
        'When shallow I put phone down.',
        '',
        'Body wisdom.',
        '',
        'I tell people: breath tells you when to stop.'
      ],
      lesson: 'Body signals you when to stop.'
    },
    {
      id: 'dnv10_14',
      title: 'My phone bedtime',
      narrative: [
        'Phone goes to bed 9 pm. In drawer in another room.',
        '',
        'Sleep improved within week.',
        '',
        'I have done this for 3 years.',
        '',
        'My morning is calm.',
        '',
        'I tell people: phone bedtime is gift to morning.'
      ],
      lesson: 'Phone bedtime serves morning.'
    },
    {
      id: 'dnv10_15',
      title: 'My ongoing practice',
      narrative: [
        'I have been working on digital wellbeing for 5 years.',
        '',
        'It is daily practice.',
        '',
        'I make mistakes. I adjust.',
        '',
        'It is sustainable.',
        '',
        'I tell people: this is practice. Not destination.'
      ],
      lesson: 'Digital wellbeing is lifelong practice.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_9 = [
    {
      id: 'dnv9_1',
      title: 'When I built my own digital home',
      narrative: [
        'I have a personal website. My own domain.',
        '',
        'I write there. Without algorithm. Without platform rules.',
        '',
        'My voice is mine.',
        '',
        'It is small. But it is mine.',
        '',
        'I tell people: own your own digital home.'
      ],
      lesson: 'Personal websites still matter.'
    },
    {
      id: 'dnv9_2',
      title: 'My boundaries with family chat',
      narrative: [
        'Family chat had been constant. Hundreds of messages daily.',
        '',
        'I asked: "Can we slow down? I cannot keep up."',
        '',
        'Family adjusted. Mostly.',
        '',
        'Some still over-text. I mute.',
        '',
        'I tell people: family chat boundaries are okay.'
      ],
      lesson: 'Family chat is not obligation.'
    },
    {
      id: 'dnv9_3',
      title: 'When AI hallucinated about me',
      narrative: [
        'I asked AI about a public person I am similar to.',
        '',
        'AI confused us. Said I had done things.',
        '',
        'Things I had not done.',
        '',
        'I corrected. AI did not always update.',
        '',
        'I tell people: AI hallucinations are real. Verify everything.'
      ],
      lesson: 'AI makes things up confidently.'
    },
    {
      id: 'dnv9_4',
      title: 'My fitness app addiction',
      narrative: [
        'Fitness app tracked every step. Every calorie. Every workout.',
        '',
        'I became obsessive.',
        '',
        'Numbers ruled my life.',
        '',
        'I deleted app. Listened to body again.',
        '',
        'I tell people: data is not master.'
      ],
      lesson: 'Numbers can become master if you let them.'
    },
    {
      id: 'dnv9_5',
      title: 'When I learned to take screenshots',
      narrative: [
        'I had not been documenting harm.',
        '',
        'A friend taught me: screenshot first, deal with feelings second.',
        '',
        'I have a folder of screenshots now.',
        '',
        'Have not needed most. Have needed some.',
        '',
        'I tell people: screenshot is safety.'
      ],
      lesson: 'Documentation is protection.'
    },
    {
      id: 'dnv9_6',
      title: 'My grandmother\'s text messages',
      narrative: [
        'My grandmother texted me daily until she died.',
        '',
        'Simple things. "Good morning." "I love you."',
        '',
        'After she died I read them all.',
        '',
        'Year of daily love in my phone.',
        '',
        'I cried.',
        '',
        'I tell people: save the small messages.'
      ],
      lesson: 'Small messages become legacy.'
    },
    {
      id: 'dnv9_7',
      title: 'When I deleted social media on vacation',
      narrative: [
        'Deleted social apps before vacation.',
        '',
        'No documenting. No posting.',
        '',
        'I had been there fully.',
        '',
        'Came back. Did not reinstall.',
        '',
        'I have been off them for 2 years.',
        '',
        'I tell people: vacation can be entry point.'
      ],
      lesson: 'Vacation is entry point to bigger change.'
    },
    {
      id: 'dnv9_8',
      title: 'My online medical community',
      narrative: [
        'I have rare disease. Few doctors know it.',
        '',
        'Online I found community of patients.',
        '',
        'They knew more than my doctors.',
        '',
        'We share research. Treatment outcomes. Hope.',
        '',
        'I tell people: rare disease finds community online.'
      ],
      lesson: 'Rare conditions need online community.'
    },
    {
      id: 'dnv9_9',
      title: 'When my Twitter account was hacked',
      narrative: [
        'Hacked. Spam posted from my account.',
        '',
        'I caught it. Recovered account.',
        '',
        'Changed every password. 2FA on everything.',
        '',
        'Have not been hacked since.',
        '',
        'I tell people: 2FA is essential.'
      ],
      lesson: '2FA prevents most hacks.'
    },
    {
      id: 'dnv9_10',
      title: 'My morning pages',
      narrative: [
        'I write 3 pages by hand every morning.',
        '',
        'Brain dump. No editing.',
        '',
        'I do not look at phone first.',
        '',
        'My morning brain is mine, not the algorithm.',
        '',
        'I tell people: try morning pages.'
      ],
      lesson: 'Paper journaling preserves you.'
    },
    {
      id: 'dnv9_11',
      title: 'When I noticed my child mimicking me',
      narrative: [
        'My 4-year-old played pretend phone.',
        '',
        'Scrolled. Said "just one minute" to imaginary parent.',
        '',
        'I saw myself.',
        '',
        'I changed.',
        '',
        'I tell parents: children mirror.'
      ],
      lesson: 'Children mirror your phone behavior.'
    },
    {
      id: 'dnv9_12',
      title: 'My new year phone audit',
      narrative: [
        'Every new year I audit my phone.',
        '',
        'Delete unused apps. Update privacy. Reset notifications.',
        '',
        'Like spring cleaning for phone.',
        '',
        'My phone serves me, not the reverse.',
        '',
        'I tell people: annual phone audit.'
      ],
      lesson: 'Phone needs annual audit.'
    },
    {
      id: 'dnv9_13',
      title: 'When I helped my sister with online dating',
      narrative: [
        'Sister was on dating apps. Discouraged.',
        '',
        'I helped her refine. Better photos. Better bio.',
        '',
        'She met partner.',
        '',
        'Online dating is skill.',
        '',
        'I tell people: refining works.'
      ],
      lesson: 'Online dating profile is skill.'
    },
    {
      id: 'dnv9_14',
      title: 'My online community of artists',
      narrative: [
        'I am artist. Lonely work.',
        '',
        'Online I have artist friends across world.',
        '',
        'We share progress. Critique. Encourage.',
        '',
        'My art has grown.',
        '',
        'I tell artists: find your online studio.'
      ],
      lesson: 'Online artist community improves art.'
    },
    {
      id: 'dnv9_15',
      title: 'When my dad watched me work',
      narrative: [
        'My 75-year-old dad watched me work from home.',
        '',
        'He said: "You are always on phone."',
        '',
        'I was annoyed.',
        '',
        'Then I noticed. He was right.',
        '',
        'I changed. Better work boundaries.',
        '',
        'I tell people: outside eyes see what we miss.'
      ],
      lesson: 'Outsiders see what insiders cannot.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_8 = [
    {
      id: 'dnv8_1',
      title: 'My online dating that worked',
      narrative: [
        'I had been dating online for years.',
        '',
        'Many bad dates. Some good.',
        '',
        'Then I met partner online.',
        '',
        'We have been together 6 years. Married.',
        '',
        'Online dating can work with patience.',
        '',
        'I tell people: do not give up.'
      ],
      lesson: 'Online dating works with patience.'
    },
    {
      id: 'dnv8_2',
      title: 'When my friend overdosed and we knew through Instagram',
      narrative: [
        'My friend overdosed. Survived.',
        '',
        'Family posted update on Instagram.',
        '',
        'Hundreds saw. Comments overwhelming.',
        '',
        'Family had to take down. Too much.',
        '',
        'Hard medium for hard news.',
        '',
        'I tell people: hard news privately first.'
      ],
      lesson: 'Hard news needs care, not Instagram.'
    },
    {
      id: 'dnv8_3',
      title: 'My TikTok addiction',
      narrative: [
        'TikTok consumed me. 6 hours a day at peak.',
        '',
        'I knew it was problem. Could not stop.',
        '',
        'Deleted app. Reinstalled. Deleted. Reinstalled.',
        '',
        'Finally I uninstalled and disabled my account.',
        '',
        'Two weeks of withdrawal.',
        '',
        'Then peace.',
        '',
        'I tell people: nuclear option exists.'
      ],
      lesson: 'Sometimes full uninstall is the answer.'
    },
    {
      id: 'dnv8_4',
      title: 'When I helped my dad with phone',
      narrative: [
        'My dad got first smartphone at 60.',
        '',
        'I taught him slowly.',
        '',
        'He learned. He texts now. He video calls.',
        '',
        'He says: "I lived 60 years without this. Now I cannot imagine."',
        '',
        'Technology serves him.',
        '',
        'I tell people: be patient teaching elders.'
      ],
      lesson: 'Teaching elders tech is gift.'
    },
    {
      id: 'dnv8_5',
      title: 'My phone in the toilet',
      narrative: [
        'I dropped phone in toilet.',
        '',
        '36 hours without phone while it dried.',
        '',
        'I had not realized how dependent I was.',
        '',
        'When I got it back, I used it less.',
        '',
        'I tell people: accidental fasts teach.'
      ],
      lesson: 'Surprise breaks reveal dependence.'
    },
    {
      id: 'dnv8_6',
      title: 'My online support after divorce',
      narrative: [
        'Got divorced at 35.',
        '',
        'Found online divorce support group.',
        '',
        'They got it.',
        '',
        'For 2 years I leaned on them.',
        '',
        'I am stable now. Still in touch.',
        '',
        'I tell people: hard life chapters have online communities.'
      ],
      lesson: 'Life-stage communities exist online.'
    },
    {
      id: 'dnv8_7',
      title: 'When my friend was scammed',
      narrative: [
        'Friend sent crypto to scammer. $10,000.',
        '',
        'Lost it.',
        '',
        'We helped her file police report. Bank report.',
        '',
        'Some money recovered. Most not.',
        '',
        'She now educates others.',
        '',
        'I tell people: educate yourself on scams.'
      ],
      lesson: 'Education prevents scams.'
    },
    {
      id: 'dnv8_8',
      title: 'My phone-free retreat',
      narrative: [
        'I went on retreat. Phones surrendered at door.',
        '',
        'Week of no phone.',
        '',
        'I slept better than years. Conversations deeper. Body calmer.',
        '',
        'I came back and built phone-free time into life.',
        '',
        'I tell people: retreats reveal what is possible.'
      ],
      lesson: 'Extreme breaks show possibilities.'
    },
    {
      id: 'dnv8_9',
      title: 'When I saw real friend after online',
      narrative: [
        'Online friend for 5 years. Finally in person.',
        '',
        'They were who they had been. Real.',
        '',
        'We hugged. We had been waiting years.',
        '',
        'I tell people: online friends transition.'
      ],
      lesson: 'Online friends are real friends.'
    },
    {
      id: 'dnv8_10',
      title: 'My anti-AI for personal stuff rule',
      narrative: [
        'I had been using AI for everything.',
        '',
        'Personal questions. Relationship advice. Life decisions.',
        '',
        'I noticed: AI cannot know me. It guesses.',
        '',
        'I made rule: no AI for personal.',
        '',
        'I journal. I talk to humans.',
        '',
        'My decisions improved.',
        '',
        'I tell people: AI for tasks. Humans for life.'
      ],
      lesson: 'AI for tasks. Humans for life.'
    },
    {
      id: 'dnv8_11',
      title: 'My online community of trans people',
      narrative: [
        'I am trans. My town has few openly trans people.',
        '',
        'Online I found community.',
        '',
        'Daily check-ins. Real friendships.',
        '',
        'They got me through transition.',
        '',
        'I tell people: marginalized identities find each other online.'
      ],
      lesson: 'Online community for marginalized identities is sacred.'
    },
    {
      id: 'dnv8_12',
      title: 'When phone died at concert',
      narrative: [
        'My phone died at concert.',
        '',
        'I could not film. Could not text. Could not photograph.',
        '',
        'I was forced to just be there.',
        '',
        'Best concert experience I had had.',
        '',
        'I tell people: phone dying is gift sometimes.'
      ],
      lesson: 'Forced presence is presence.'
    },
    {
      id: 'dnv8_13',
      title: 'My algorithm cleanup',
      narrative: [
        'Cleaned my YouTube history. Subscriptions. Likes.',
        '',
        'Algorithm reset.',
        '',
        'New recommendations. Different feed.',
        '',
        'Better mood.',
        '',
        'I tell people: algorithm can be retrained.'
      ],
      lesson: 'Train your algorithm.'
    },
    {
      id: 'dnv8_14',
      title: 'When friend asked for digital break',
      narrative: [
        'Friend asked: "Can we not text for a week?"',
        '',
        'Felt like rejection. Was not.',
        '',
        'They needed space.',
        '',
        'A week later: best in-person dinner we had.',
        '',
        'I tell people: digital space is care.'
      ],
      lesson: 'Asking for digital space is healthy.'
    },
    {
      id: 'dnv8_15',
      title: 'My final reflection',
      narrative: [
        'I have been writing about digital wellbeing for years.',
        '',
        'I make mistakes still. I drift back to old habits.',
        '',
        'But I have a practice now.',
        '',
        'It is small. It is daily. It is sustainable.',
        '',
        'I tell people: start small. Build slowly. Practice forever.'
      ],
      lesson: 'Sustainable digital wellbeing is practice, not perfection.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_7 = [
    {
      id: 'dnv7_1',
      title: 'When my crisis call worked',
      narrative: [
        'I was suicidal at 16. I called 988.',
        '',
        'I was scared.',
        '',
        'Counselor was kind. Calm.',
        '',
        'They stayed with me an hour.',
        '',
        'They helped me make plan.',
        '',
        'I survived. I went to therapy.',
        '',
        'Years later I called crisis line as volunteer.',
        '',
        'I tell people: 988 helps.'
      ],
      lesson: 'Crisis line is real help.'
    },
    {
      id: 'dnv7_2',
      title: 'My friend who was deepfaked',
      narrative: [
        'Friend was deepfaked. Intimate images.',
        '',
        'Devastation. Shame.',
        '',
        'I helped her report.',
        '',
        'StopNCII.org. Police. Lawyer.',
        '',
        'Some images came down. Some did not.',
        '',
        'She survived. Therapy.',
        '',
        'I tell people: deepfakes are real. Help exists.'
      ],
      lesson: 'Deepfake response: document, report, get help.'
    },
    {
      id: 'dnv7_3',
      title: 'When I tried Discord and stayed',
      narrative: [
        'Discord seemed weird. I tried.',
        '',
        'Joined writing server.',
        '',
        'Daily conversations. Real friendships.',
        '',
        '5 years later still in that server.',
        '',
        'Discord is real community for me.',
        '',
        'I tell people: different platforms for different lives.'
      ],
      lesson: 'Platform fit matters.'
    },
    {
      id: 'dnv7_4',
      title: 'My phone-free day weekly',
      narrative: [
        'I started phone-free Saturdays.',
        '',
        'First week was hard. Reflex to reach.',
        '',
        'By month two it was sacred.',
        '',
        'Most calming day of week.',
        '',
        'I tell people: one day off is gift.'
      ],
      lesson: 'Sabbath from phone is real rest.'
    },
    {
      id: 'dnv7_5',
      title: 'When my mom started Facebook',
      narrative: [
        'My 65-year-old mom joined Facebook.',
        '',
        'She got into political content.',
        '',
        'She changed. Angry. Suspicious.',
        '',
        'I had hard conversations.',
        '',
        'I showed her how algorithms work.',
        '',
        'She did not believe at first. Slowly came around.',
        '',
        'She limited her use.',
        '',
        'I tell people: older relatives susceptible to algorithm too.'
      ],
      lesson: 'Age does not protect from algorithm.'
    },
    {
      id: 'dnv7_6',
      title: 'My online therapist',
      narrative: [
        'I do therapy via video.',
        '',
        'Works for me. Convenient.',
        '',
        'Same therapist for years.',
        '',
        'Online therapy is real therapy.',
        '',
        'I tell people: try if traditional does not fit.'
      ],
      lesson: 'Online therapy can be effective.'
    },
    {
      id: 'dnv7_7',
      title: 'When YouTube taught me to cook',
      narrative: [
        'I had not known how to cook.',
        '',
        'YouTube tutorials taught me.',
        '',
        'I cook beautifully now.',
        '',
        'YouTube can be university.',
        '',
        'I tell people: choose what to learn.'
      ],
      lesson: 'Internet can be education.'
    },
    {
      id: 'dnv7_8',
      title: 'My online business',
      narrative: [
        'I started online business at 19.',
        '',
        'Built audience. Sold products.',
        '',
        'Now full-time entrepreneur.',
        '',
        'Internet democratized business.',
        '',
        'I tell people: opportunity exists if you build deliberately.'
      ],
      lesson: 'Internet creates real opportunity.'
    },
    {
      id: 'dnv7_9',
      title: 'When my data was breached',
      narrative: [
        'My data was in a breach.',
        '',
        'Changed every password. Set up 2FA.',
        '',
        'Identity monitoring service.',
        '',
        'No immediate harm.',
        '',
        'I tell people: respond fast to breaches.'
      ],
      lesson: 'Breach response: fast action prevents harm.'
    },
    {
      id: 'dnv7_10',
      title: 'My grandmother\'s photos online',
      narrative: [
        'After grandmother died, I uploaded her photos.',
        '',
        'Created memorial site.',
        '',
        'Family across world can visit.',
        '',
        'Her legacy lives.',
        '',
        'I tell people: digital memorials honor.'
      ],
      lesson: 'Tech can honor memory.'
    },
    {
      id: 'dnv7_11',
      title: 'My online language exchange',
      narrative: [
        'I have been learning Japanese.',
        '',
        'Met language partner online. Native Japanese speaker learning English.',
        '',
        'We meet weekly. Half English half Japanese.',
        '',
        'My language has improved. Friendship deepened.',
        '',
        'I tell people: online learning partners are real.'
      ],
      lesson: 'Online learning partners build language and friendship.'
    },
    {
      id: 'dnv7_12',
      title: 'When AI helped me debug code',
      narrative: [
        'I had been stuck on coding problem hours.',
        '',
        'AI saw error I had missed.',
        '',
        'I learned the lesson.',
        '',
        'AI as tutor for specific problems can work.',
        '',
        'I tell people: AI for specific narrow tasks helps.'
      ],
      lesson: 'AI for technical help works well.'
    },
    {
      id: 'dnv7_13',
      title: 'My online community after cancer',
      narrative: [
        'I had cancer at 30. Lonely.',
        '',
        'Online cancer support group.',
        '',
        'People who got it.',
        '',
        'They saved me through treatment.',
        '',
        '5 years cancer-free. Still in touch.',
        '',
        'I tell people: medical communities online are real medicine.'
      ],
      lesson: 'Disease-specific online community saves.'
    },
    {
      id: 'dnv7_14',
      title: 'When I worked from home',
      narrative: [
        'I started working from home.',
        '',
        'Without commute I had 2 extra hours daily.',
        '',
        'But I was always on Slack. Available.',
        '',
        'I had to set work boundaries.',
        '',
        'Work hours. Out of office.',
        '',
        'I tell people: WFH needs explicit boundaries.'
      ],
      lesson: 'Remote work needs boundaries.'
    },
    {
      id: 'dnv7_15',
      title: 'My online classroom',
      narrative: [
        'I took online class.',
        '',
        'Different than in-person. Some advantages. Some loss.',
        '',
        'I learned how to learn online.',
        '',
        'Different muscle.',
        '',
        'I tell people: online learning is different. Adapt.'
      ],
      lesson: 'Online learning requires different muscle.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_6 = [
    {
      id: 'dnv6_1',
      title: 'When phone was my comfort',
      narrative: [
        'I had been using phone to numb.',
        '',
        'Anxiety: scroll. Sadness: scroll. Boredom: scroll. Anger: scroll.',
        '',
        'I noticed. Phone was avoidance.',
        '',
        'I started feeling instead. Hard at first.',
        '',
        'Therapist helped.',
        '',
        'Now phone is a tool, not avoidance.',
        '',
        'I tell people: notice what phone replaces.'
      ],
      lesson: 'Phone often replaces feeling. Feel instead.'
    },
    {
      id: 'dnv6_2',
      title: 'My partner and phone-free dates',
      narrative: [
        'My partner and I decided: dates phone-free.',
        '',
        'Hard at first. Reflex to reach.',
        '',
        'Then it became gift.',
        '',
        'Conversations deepened. Intimacy grew.',
        '',
        'I tell people: phone-free is intimacy gift.'
      ],
      lesson: 'Presence is gift.'
    },
    {
      id: 'dnv6_3',
      title: 'When I muted everyone for a week',
      narrative: [
        'I muted every group chat. Every notification.',
        '',
        'Phone was silent for week.',
        '',
        'I caught up at end of day. Most was not urgent.',
        '',
        'I unmuted essential only.',
        '',
        'I tell people: try silence for a week.'
      ],
      lesson: 'Most notifications are not urgent.'
    },
    {
      id: 'dnv6_4',
      title: 'My online identity crisis',
      narrative: [
        'I had been performing online for years.',
        '',
        'I did not know who I was offline.',
        '',
        'I took a break. Months.',
        '',
        'I rediscovered who I am.',
        '',
        'When I returned, my online presence was different. More authentic.',
        '',
        'I tell people: identity comes from offline. Online reflects.'
      ],
      lesson: 'Build identity offline first.'
    },
    {
      id: 'dnv6_5',
      title: 'When I confronted my AI dependency',
      narrative: [
        'I had been talking to AI for hours daily.',
        '',
        'I told my therapist.',
        '',
        'We worked on the loneliness underneath.',
        '',
        'AI use dropped naturally.',
        '',
        'Humans filled the space.',
        '',
        'I tell people: AI dependency is symptom. Address cause.'
      ],
      lesson: 'AI overuse points to underlying need.'
    },
    {
      id: 'dnv6_6',
      title: 'The friend who left social media',
      narrative: [
        'Friend deleted all social media at 25.',
        '',
        'We thought weird.',
        '',
        '5 years later he is the most present person we know.',
        '',
        'He listens. He calls. He shows up.',
        '',
        'Some of us followed his example. Some did not.',
        '',
        'I tell people: notice who lives well.'
      ],
      lesson: 'Some people show another way.'
    },
    {
      id: 'dnv6_7',
      title: 'My text to my dying grandmother',
      narrative: [
        'My grandmother was dying. She had no phone.',
        '',
        'I called daily.',
        '',
        'We talked for hours.',
        '',
        'She told me stories I had not heard.',
        '',
        'After she died, I had hours of phone calls in memory.',
        '',
        'I tell people: call the elders.'
      ],
      lesson: 'Calls are gold.'
    },
    {
      id: 'dnv6_8',
      title: 'When my therapist banned phones',
      narrative: [
        'Therapist said: no phone during session. Not even pocket.',
        '',
        'Phone in waiting room.',
        '',
        'Session deeper than usual.',
        '',
        'I do this for all important moments now.',
        '',
        'I tell people: phone-free for important moments.'
      ],
      lesson: 'Important moments deserve phone-free.'
    },
    {
      id: 'dnv6_9',
      title: 'My online religious community',
      narrative: [
        'I am in tradition that has limited local community.',
        '',
        'Online I found global community.',
        '',
        'Daily prayers. Weekly study. Friendships.',
        '',
        'Technology supports practice.',
        '',
        'I tell people: online spiritual community is real.'
      ],
      lesson: 'Specialized online community sustains practice.'
    },
    {
      id: 'dnv6_10',
      title: 'When I quit Twitter for a year',
      narrative: [
        'I had been on Twitter for 12 years.',
        '',
        'I quit for a year.',
        '',
        'I missed nothing important.',
        '',
        'Anxiety dropped.',
        '',
        'I have been off for 5 years now.',
        '',
        'I tell people: some platforms are not worth it.'
      ],
      lesson: 'Some platforms are net loss.'
    },
    {
      id: 'dnv6_11',
      title: 'My phone in a box',
      narrative: [
        'I bought a box that locks the phone for set time.',
        '',
        'I lock my phone 9 pm to 7 am.',
        '',
        'Cannot reach for it.',
        '',
        'Sleep improved within days.',
        '',
        'I tell people: physical solutions work.'
      ],
      lesson: 'Make phone physically inaccessible.'
    },
    {
      id: 'dnv6_12',
      title: 'When my friend confessed addiction',
      narrative: [
        'Friend confessed phone addiction.',
        '',
        'I had not noticed how bad.',
        '',
        'We talked for hours.',
        '',
        'I supported them through tech detox.',
        '',
        'They are doing better.',
        '',
        'I tell people: friend addictions are real. Help.'
      ],
      lesson: 'Phone addiction is real. Support friends.'
    },
    {
      id: 'dnv6_13',
      title: 'The Instagram fast',
      narrative: [
        'Instagram fast for 30 days.',
        '',
        'I almost broke it 4 times.',
        '',
        'Day 31 I logged in to delete account.',
        '',
        'Nothing missed.',
        '',
        'I tell people: planned breaks reveal what is essential.'
      ],
      lesson: 'Breaks reveal essentials.'
    },
    {
      id: 'dnv6_14',
      title: 'My grandmother\'s laptop lessons',
      narrative: [
        'I taught my grandmother to use computer.',
        '',
        'She learned. She got online.',
        '',
        'She made online friends. Discovered communities.',
        '',
        'At 85 she had online community I had not had at 25.',
        '',
        'I tell people: technology can serve any age well.'
      ],
      lesson: 'Tech serves anyone, well-chosen.'
    },
    {
      id: 'dnv6_15',
      title: 'When I forgave my online troll',
      narrative: [
        'A troll had been harassing me for months.',
        '',
        'I blocked. Reported.',
        '',
        'Then I wrote in journal: "I forgive them."',
        '',
        'Not for them. For me.',
        '',
        'I let the harm go.',
        '',
        'I tell people: forgiveness is for you, not them.'
      ],
      lesson: 'Forgiveness can be self-care.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_5 = [
    {
      id: 'dnv5_1',
      title: 'My phone diet',
      narrative: [
        'I had been on phone 8 hours daily.',
        '',
        'I tried a diet: 2 hour limit per day. Track honestly.',
        '',
        'First week was painful. I cheated some.',
        '',
        'Second week was easier.',
        '',
        'Third week I was at 2 hours. Easily.',
        '',
        'Month two I was at 1.5 hours. Naturally.',
        '',
        'I tell people: like a food diet. Habits build.'
      ],
      lesson: 'Diets work for phone use too.'
    },
    {
      id: 'dnv5_2',
      title: 'When my friend was catfished',
      narrative: [
        'Friend had been "dating" online for 6 months.',
        '',
        'I asked: have you video called?',
        '',
        'Never. Always excuse.',
        '',
        'I helped reverse-image search photos. Different person.',
        '',
        'I told friend gently.',
        '',
        'She was heartbroken. But better than continuing.',
        '',
        'I tell people: video call before falling in love online.'
      ],
      lesson: 'Verify before vulnerable.'
    },
    {
      id: 'dnv5_3',
      title: 'My phone-free vacation',
      narrative: [
        'I went on vacation. Left phone in hotel safe most days.',
        '',
        'Used disposable camera.',
        '',
        'I was present every moment.',
        '',
        'Vacation was best I had had in years.',
        '',
        'I tell people: try phone-free vacation.'
      ],
      lesson: 'Vacation phone-free is vacation.'
    },
    {
      id: 'dnv5_4',
      title: 'When my child saw porn',
      narrative: [
        'My 11-year-old accidentally saw porn online.',
        '',
        'They told me. I am grateful.',
        '',
        'We had hard conversation. About porn. About sex. About internet.',
        '',
        'I added filters. We adjusted.',
        '',
        'But the conversation mattered most.',
        '',
        'I tell parents: when child sees porn, talk. Do not shame.'
      ],
      lesson: 'Talk about porn with kids. Not if. When.'
    },
    {
      id: 'dnv5_5',
      title: 'The fake news I almost shared',
      narrative: [
        'Saw shocking headline. About to share.',
        '',
        'Paused. Checked source. Did not exist.',
        '',
        'Did not share.',
        '',
        'I have built habit of checking before sharing.',
        '',
        'I tell people: verify before viral.'
      ],
      lesson: 'Verify before share.'
    },
    {
      id: 'dnv5_6',
      title: 'My phone case redesign',
      narrative: [
        'I painted my phone case bright orange.',
        '',
        'Reminds me to be aware when I pick it up.',
        '',
        'Awareness builds.',
        '',
        'I tell people: design environment for awareness.'
      ],
      lesson: 'Small physical changes can support awareness.'
    },
    {
      id: 'dnv5_7',
      title: 'The texts I deleted',
      narrative: [
        'I cleaned out old texts.',
        '',
        'Some triggered me. Old conflicts. Old hurts.',
        '',
        'I deleted threads with people who hurt me.',
        '',
        'Felt lighter.',
        '',
        'I tell people: clean digital space. Like physical space.'
      ],
      lesson: 'Digital decluttering helps mental health.'
    },
    {
      id: 'dnv5_8',
      title: 'My friend who unfollowed me',
      narrative: [
        'Friend unfollowed me on Instagram.',
        '',
        'Stayed friends in person.',
        '',
        'I asked. She said: "I needed less of you in my feed. Not less of you in my life."',
        '',
        'I respected. We are still friends.',
        '',
        'I tell people: unfollows are not endings.'
      ],
      lesson: 'Unfollow can be care.'
    },
    {
      id: 'dnv5_9',
      title: 'When I deleted my own photo',
      narrative: [
        'I had been thinking about old photo I had posted.',
        '',
        'It no longer represented me.',
        '',
        'I deleted it.',
        '',
        'Felt better.',
        '',
        'I tell people: your old posts are not contracts.'
      ],
      lesson: 'You can update your online history.'
    },
    {
      id: 'dnv5_10',
      title: 'The friend who texts too much',
      narrative: [
        'Friend texted constantly. I responded less and less.',
        '',
        'Friendship suffered.',
        '',
        'I told them: "I love you AND I cannot text all day. Can we call once a week?"',
        '',
        'They were hurt initially. Then grateful.',
        '',
        'Friendship works now.',
        '',
        'I tell people: name what works for you.'
      ],
      lesson: 'Friendships need explicit communication rhythms.'
    },
    {
      id: 'dnv5_11',
      title: 'My online support during pandemic',
      narrative: [
        'During pandemic I had been isolated.',
        '',
        'Online community kept me sane.',
        '',
        'Weekly Zoom calls. Daily texts. Real care.',
        '',
        'Technology saved me.',
        '',
        'I tell people: technology can save in isolation.'
      ],
      lesson: 'Tech can save during isolation.'
    },
    {
      id: 'dnv5_12',
      title: 'When phone hurt my grades',
      narrative: [
        'I was 16. Grades dropped.',
        '',
        'Parents took phone during school week.',
        '',
        'I struggled but grades came back up.',
        '',
        'I admitted phone had been the problem.',
        '',
        'We negotiated new system: phone in another room during homework.',
        '',
        'I tell people: phone affects grades. Honesty about it helps.'
      ],
      lesson: 'Phone steals focus needed for learning.'
    },
    {
      id: 'dnv5_13',
      title: 'My online mentor',
      narrative: [
        'I had been following a professional in my field online.',
        '',
        'I emailed: "Could I ask one question?"',
        '',
        'They responded.',
        '',
        'Over months we built relationship.',
        '',
        'They mentored me into my first job.',
        '',
        'I tell people: reach out to online mentors. Carefully.'
      ],
      lesson: 'Online mentors are real mentors.'
    },
    {
      id: 'dnv5_14',
      title: 'The texts I keep',
      narrative: [
        'I have folder of saved texts.',
        '',
        'My grandmother\'s last text. My partner\'s love notes. My friends\' encouragement.',
        '',
        'Digital memories.',
        '',
        'I read them on hard days.',
        '',
        'I tell people: save the good ones.'
      ],
      lesson: 'Save digital memories that lift you.'
    },
    {
      id: 'dnv5_15',
      title: 'My algorithm reset',
      narrative: [
        'My YouTube was full of doom.',
        '',
        'I cleared history. Subscribed to uplifting channels.',
        '',
        'Algorithm shifted. My feed shifted.',
        '',
        'My mood improved.',
        '',
        'I tell people: reset the algorithm.'
      ],
      lesson: 'You can teach algorithm differently.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_4 = [
    {
      id: 'dnv4_1',
      title: 'The hour I left my phone in the car',
      narrative: [
        'I went hiking. Forgot to bring phone.',
        '',
        'Two hours in the woods.',
        '',
        'Birds. Rocks. Trees. My breath.',
        '',
        'I came back changed.',
        '',
        'I have been doing phone-free hikes since.',
        '',
        'I tell people: nature without phone is different.'
      ],
      lesson: 'Phone-free nature is profound.'
    },
    {
      id: 'dnv4_2',
      title: 'My morning without scrolling',
      narrative: [
        'I changed morning routine. No phone first 30 min.',
        '',
        'Water. Stretch. Breakfast.',
        '',
        'I felt different. Clearer.',
        '',
        'A month in, my morning was my favorite part of day.',
        '',
        'I tell people: protect the morning.'
      ],
      lesson: 'Morning routine sets day.'
    },
    {
      id: 'dnv4_3',
      title: 'When I disabled all notifications',
      narrative: [
        'All notifications off except calls from family.',
        '',
        'I check on my schedule.',
        '',
        'My anxiety dropped immediately.',
        '',
        'I do not miss being available always.',
        '',
        'I tell people: try notifications off for a week.'
      ],
      lesson: 'Notifications off improves mental health quickly.'
    },
    {
      id: 'dnv4_4',
      title: 'My phone-free Sundays',
      narrative: [
        'I do not use phone on Sundays.',
        '',
        'I read. Cook. Walk. Talk.',
        '',
        'My Mondays are better.',
        '',
        'I tell people: try one phone-free day weekly.'
      ],
      lesson: 'Weekly reset is real reset.'
    },
    {
      id: 'dnv4_5',
      title: 'My grayscale mode experiment',
      narrative: [
        'I tried grayscale. Phone in shades of gray.',
        '',
        'Apps less appealing instantly.',
        '',
        'I picked up phone less.',
        '',
        'I have been on grayscale for 2 years.',
        '',
        'I tell people: try it.'
      ],
      lesson: 'Color drives engagement. Remove color.'
    },
    {
      id: 'dnv4_6',
      title: 'When AI helped me apologize',
      narrative: [
        'I had hurt friend. Did not know how to apologize.',
        '',
        'Asked AI for help drafting.',
        '',
        'AI gave me framework. I personalized.',
        '',
        'Apology landed. Friendship repaired.',
        '',
        'I tell people: AI as drafting tool can help.'
      ],
      lesson: 'AI as tool for difficult things.'
    },
    {
      id: 'dnv4_7',
      title: 'The Instagram post I unposted',
      narrative: [
        'I had been posting performatively.',
        '',
        'One day I looked at my old posts. They felt fake.',
        '',
        'I unposted. Kept some. Deleted many.',
        '',
        'Cleaner. Truer. More me.',
        '',
        'I tell people: curate your past too.'
      ],
      lesson: 'Past posts can be edited.'
    },
    {
      id: 'dnv4_8',
      title: 'My friend\'s self-promotion fatigue',
      narrative: [
        'Friend started business. Posted constantly.',
        '',
        'Self-promotion 24/7.',
        '',
        'I muted them. Stayed friends offline.',
        '',
        'I tell people: muting is care.'
      ],
      lesson: 'Mute is healthy. Not unfriending.'
    },
    {
      id: 'dnv4_9',
      title: 'My location off',
      narrative: [
        'I turned off location services for most apps.',
        '',
        'Phone uses less battery. I feel less tracked.',
        '',
        'I miss nothing.',
        '',
        'I tell people: location off for what does not need it.'
      ],
      lesson: 'Most apps do not need your location.'
    },
    {
      id: 'dnv4_10',
      title: 'The text I sent in error',
      narrative: [
        'I typed message about boss. To boss.',
        '',
        'Realized immediately.',
        '',
        'Apologized. Explained.',
        '',
        'Boss was gracious.',
        '',
        'I learned: think before sending.'
      ],
      lesson: 'Check recipient before sending.'
    },
    {
      id: 'dnv4_11',
      title: 'My online tribe of writers',
      narrative: [
        'I am writer. Lonely work.',
        '',
        'Online I found other writers.',
        '',
        'We share work. Encourage. Sometimes meet.',
        '',
        'It is community.',
        '',
        'I tell people: find your online tribe.'
      ],
      lesson: 'Online tribes for specific interests are gold.'
    },
    {
      id: 'dnv4_12',
      title: 'When I tried meditation app',
      narrative: [
        'I tried meditation app.',
        '',
        'For a month I meditated daily.',
        '',
        'I noticed: more patience. Less reactivity.',
        '',
        'I still use it.',
        '',
        'Apps can be good when chosen well.',
        '',
        'I tell people: try beneficial apps. Notice the difference.'
      ],
      lesson: 'Some apps add. Choose carefully.'
    },
    {
      id: 'dnv4_13',
      title: 'My breakup over text',
      narrative: [
        'Partner of 2 years broke up with me over text.',
        '',
        '4 sentences. No call. No meeting.',
        '',
        'I was devastated by the format almost as much as breakup.',
        '',
        'I called. Talked.',
        '',
        'They had been avoiding hard conversation.',
        '',
        'I tell people: hard things in person.'
      ],
      lesson: 'Texting breakups hurts more.'
    },
    {
      id: 'dnv4_14',
      title: 'When AI got me through grief',
      narrative: [
        'My mom died. I could not talk about it.',
        '',
        'I journaled with AI. It listened.',
        '',
        'I processed some of it.',
        '',
        'Then I went to therapy with humans.',
        '',
        'AI was bridge to humans.',
        '',
        'I tell people: AI as bridge is okay.'
      ],
      lesson: 'AI can be transitional. Move to humans.'
    },
    {
      id: 'dnv4_15',
      title: 'My boss\'s text at midnight',
      narrative: [
        'Boss texted me at midnight. Work question.',
        '',
        'I had been asleep.',
        '',
        'Responded next morning.',
        '',
        'I learned to mute work texts after hours.',
        '',
        'My sleep improved.',
        '',
        'I tell people: work boundaries are sacred.'
      ],
      lesson: 'Work boundaries protect rest.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_3 = [
    {
      id: 'dnv3_1',
      title: 'My phone-free year experiment',
      narrative: [
        'I gave up my smartphone for a year. Kept a flip phone.',
        '',
        'I could call. Text. Nothing else.',
        '',
        'Month 1 was painful. I felt out of touch.',
        '',
        'Month 2 I started reading. A lot.',
        '',
        'Month 3 I had real conversations again.',
        '',
        'Month 6 I had read 30 books.',
        '',
        'Year end I had read 50 books. I had built deeper friendships. I had been present.',
        '',
        'I have a smartphone now. With strict limits.',
        '',
        'I tell people: a phone-free year is life-changing.'
      ],
      lesson: 'Extreme breaks reveal what is essential.'
    },
    {
      id: 'dnv3_2',
      title: 'The TikTok detox',
      narrative: [
        'I deleted TikTok. Just TikTok.',
        '',
        'My screen time dropped 3 hours per day.',
        '',
        'I felt the loss for two weeks. Withdrawal.',
        '',
        'Then I felt clearer. More focused.',
        '',
        'I have not re-installed.',
        '',
        'I tell people: try deleting one app for a month.'
      ],
      lesson: 'One app removal can be transformative.'
    },
    {
      id: 'dnv3_3',
      title: 'When my Instagram comparison broke me',
      narrative: [
        'I had been comparing my body to influencers.',
        '',
        'Restricting food. Exercising obsessively.',
        '',
        'My doctor caught it. We discussed Instagram.',
        '',
        'I deleted my account.',
        '',
        'Therapy. Recovery. Years of work.',
        '',
        'I am healthier now.',
        '',
        'I tell people: image-based platforms can hurt. Watch yourself.'
      ],
      lesson: 'Image platforms have real body impact.'
    },
    {
      id: 'dnv3_4',
      title: 'My YouTube university',
      narrative: [
        'I am self-taught in code. YouTube taught me.',
        '',
        'I spent thousands of hours watching. Building. Learning.',
        '',
        'I got my first dev job from a portfolio I built from YouTube tutorials.',
        '',
        'YouTube has its dark sides. AND it has gifts.',
        '',
        'I tell people: use it deliberately.'
      ],
      lesson: 'Internet can educate when used with intention.'
    },
    {
      id: 'dnv3_5',
      title: 'The friend group chat that worked',
      narrative: [
        'My friend group has had the same chat for 10 years.',
        '',
        'We support each other through marriages, kids, deaths.',
        '',
        'We have rules: kindness, not gossip, real check-ins.',
        '',
        'It is our online living room.',
        '',
        'I tell people: chats can be beautiful with intention.'
      ],
      lesson: 'Group chats reflect the group culture.'
    },
    {
      id: 'dnv3_6',
      title: 'My online friend who became my partner',
      narrative: [
        'We met on a writing forum. Online friends for two years.',
        '',
        'Then we met in person at a conference.',
        '',
        'We have been together 8 years now. Married.',
        '',
        'I tell people: real love can start online.'
      ],
      lesson: 'Online connections are real connections.'
    },
    {
      id: 'dnv3_7',
      title: 'The Twitter habit I broke',
      narrative: [
        'I had been on Twitter for 12 years.',
        '',
        'Checked first thing in morning. Last thing at night. All day in between.',
        '',
        'I deleted my account. Did not look back.',
        '',
        'My anxiety dropped within a week.',
        '',
        'I do not miss it. Five years later.',
        '',
        'I tell people: some platforms are not worth the cost.'
      ],
      lesson: 'Some platforms are not worth the time.'
    },
    {
      id: 'dnv3_8',
      title: 'When my pre-teen got first phone',
      narrative: [
        'My daughter is 12. We finally got her a phone.',
        '',
        'We had a long conversation. Rules. Boundaries. Reasons.',
        '',
        'She signed a contract. So did we.',
        '',
        'It has been okay. We adjust as we go.',
        '',
        'I tell parents: do not just hand them a phone. Set up together.'
      ],
      lesson: 'Phone is contract. Set up together.'
    },
    {
      id: 'dnv3_9',
      title: 'My online community of disabled people',
      narrative: [
        'I am disabled. In my small town there are no others like me.',
        '',
        'Online I found community. Hundreds of disabled people.',
        '',
        'They taught me my rights. My language. My pride.',
        '',
        'I am 30 now. I am still in that community.',
        '',
        'I tell people: online community is real life-saving.'
      ],
      lesson: 'Online specialized community is rare gold.'
    },
    {
      id: 'dnv3_10',
      title: 'The TikTok that changed my mind',
      narrative: [
        'I had been entrenched in a political view.',
        '',
        'One TikTok showed me a perspective I had not considered.',
        '',
        'I sat with discomfort.',
        '',
        'I researched more.',
        '',
        'My view shifted.',
        '',
        'I tell people: algorithms can radicalize AND can enlighten. Stay open.'
      ],
      lesson: 'Algorithms can also expose you to new views if you stay open.'
    },
    {
      id: 'dnv3_11',
      title: 'When I learned my phone tracks me',
      narrative: [
        'I checked my location history. Years of data.',
        '',
        'Every place I had been. Every minute I had been there.',
        '',
        'It freaked me out.',
        '',
        'I turned off location tracking. Deleted history.',
        '',
        'I am more aware now of what my phone records.',
        '',
        'I tell people: privacy audit is worth doing.'
      ],
      lesson: 'You are being tracked more than you realize.'
    },
    {
      id: 'dnv3_12',
      title: 'My online job interview gone wrong',
      narrative: [
        'Video interview. My Wi-Fi failed mid-interview.',
        '',
        'I called interviewer immediately.',
        '',
        'We finished by phone. They were understanding.',
        '',
        'I got the job.',
        '',
        'I tell people: handle tech failures with grace.'
      ],
      lesson: 'Tech fails. Grace recovers.'
    },
    {
      id: 'dnv3_13',
      title: 'My in-person friends I met online',
      narrative: [
        'I had been on Twitter for years. I met other writers there.',
        '',
        'At a conference I met them in person.',
        '',
        'We had been close for years online. Now closer in person.',
        '',
        'I have lifelong friends from online beginnings.',
        '',
        'I tell people: online can lead to real.'
      ],
      lesson: 'Online friendships can transition to in-person.'
    },
    {
      id: 'dnv3_14',
      title: 'When I caught my friend lying online',
      narrative: [
        'Friend had been posting about exotic travels.',
        '',
        'I noticed: same photos year after year.',
        '',
        'I gently asked. She had not been traveling. She had been struggling.',
        '',
        'We had real conversation. I helped her.',
        '',
        'She got therapy. She stopped fake posts.',
        '',
        'I tell people: people perform online when they are hurting.'
      ],
      lesson: 'Performance online often hides pain.'
    },
    {
      id: 'dnv3_15',
      title: 'My grandmother\'s digital legacy',
      narrative: [
        'My grandmother died. Her Facebook had years of photos. Stories.',
        '',
        'We did not want to lose them.',
        '',
        'I memorialized her account. Downloaded her photos.',
        '',
        'Her digital legacy lives.',
        '',
        'I tell people: think about digital legacy. Yours and others.'
      ],
      lesson: 'Digital legacy is a real thing. Plan for it.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_2 = [
    {
      id: 'dnv2_1',
      title: 'The friend group that fell apart over a text',
      narrative: [
        'My friend group of 5 had been close for years.',
        '',
        'One night someone made a joke in group chat. About another friend.',
        '',
        'Friend was hurt. Confronted. Defenders defended.',
        '',
        'The chat blew up. Hundreds of messages.',
        '',
        'In person we would have de-escalated.',
        '',
        'In chat we escalated.',
        '',
        'The group fractured. Two friendships ended.',
        '',
        'I tell people: hard things in person.'
      ],
      lesson: 'Text amplifies. In person calms.'
    },
    {
      id: 'dnv2_2',
      title: 'When I was the bully online',
      narrative: [
        'I was 13. A girl in my class wore unusual clothes.',
        '',
        'I posted a mocking story about her on Snapchat.',
        '',
        'It went around. She saw.',
        '',
        'She did not come to school for a week.',
        '',
        'I felt sick.',
        '',
        'I apologized to her. Specifically. Not asking forgiveness.',
        '',
        'I deleted my account. Started over.',
        '',
        'I am 18 now. I work to be kind online.',
        '',
        'I tell people: when you have been cruel, apologize fully.'
      ],
      lesson: 'Repair is real. Mistakes are not destiny.'
    },
    {
      id: 'dnv2_3',
      title: 'My online community when I was suicidal',
      narrative: [
        'I was 16. I was suicidal. I had no in-person friends I trusted.',
        '',
        'I posted in an online support forum.',
        '',
        'Within hours, 50 people responded.',
        '',
        'One person stayed in DMs all night with me.',
        '',
        'They helped me reach 988. We stayed on the phone together.',
        '',
        'I survived.',
        '',
        'I tell people: online help is real help.'
      ],
      lesson: 'Reach out. Even online. Help exists.'
    },
    {
      id: 'dnv2_4',
      title: 'The Snapchat streaks I let die',
      narrative: [
        'I had 47 streaks. Some over 1000 days.',
        '',
        'I noticed I was anxious about maintaining them.',
        '',
        'I started letting them die.',
        '',
        'First was hardest. Got easier.',
        '',
        'Many friendships continued without streaks.',
        '',
        'Some did not. Those needed streaks to function. Those were not real friendships.',
        '',
        'I tell people: streaks reveal friendship quality.'
      ],
      lesson: 'Real friendship survives broken streaks.'
    },
    {
      id: 'dnv2_5',
      title: 'My viral kindness moment',
      narrative: [
        'I posted a small act of kindness. It went viral.',
        '',
        'Hundreds messaged me their own stories of kindness.',
        '',
        'I read for hours. Cried for hours.',
        '',
        'Internet can be cruel. It can also be beautiful.',
        '',
        'I tell people: post kindness. It ripples.'
      ],
      lesson: 'Kindness spreads online too.'
    },
    {
      id: 'dnv2_6',
      title: 'The deepfake of me',
      narrative: [
        'Someone made a deepfake of me. Intimate. Without consent.',
        '',
        'I found out from a friend.',
        '',
        'I was devastated. I felt violated.',
        '',
        'My mother helped. We reported everywhere. We told school. We told police.',
        '',
        'Some images were removed. Some persisted.',
        '',
        'I went to therapy. Long process.',
        '',
        'I am 22 now. I survived.',
        '',
        'I tell people: deepfakes are real. Help exists. Get it.'
      ],
      lesson: 'Non-consensual intimate imagery is criminal. You are not at fault.'
    },
    {
      id: 'dnv2_7',
      title: 'My phone fast for Lent',
      narrative: [
        'I gave up social media for Lent.',
        '',
        '40 days no social media.',
        '',
        'First week was hard.',
        '',
        'Week 2 I felt calmer.',
        '',
        'Week 3 I had time for things I had missed.',
        '',
        'Week 4 I noticed sleep was better.',
        '',
        'When Lent ended I returned briefly. Reinstalled.',
        '',
        'Within a week I was anxious again.',
        '',
        'I deleted again. Permanently.',
        '',
        'I tell people: fast for a season. See what shifts.'
      ],
      lesson: 'Sometimes a season-long break shows you the truth.'
    },
    {
      id: 'dnv2_8',
      title: 'When I was outed online',
      narrative: [
        'I was 15. I was in the closet at home. Out at school only.',
        '',
        'Someone posted about me being queer. To everyone.',
        '',
        'My family saw before I could tell them.',
        '',
        'It was a disaster.',
        '',
        'My parents were upset. We worked through. Therapy helped.',
        '',
        'I am 20 now. Out and proud. Took years to recover from being outed.',
        '',
        'I tell people: never out someone. Identity is theirs.'
      ],
      lesson: 'Outing causes permanent harm. Do not do it.'
    },
    {
      id: 'dnv2_9',
      title: 'My online activism that worked',
      narrative: [
        'I was 17. I organized a petition online.',
        '',
        'It went viral. 100,000 signatures.',
        '',
        'I delivered to city council. They voted my way.',
        '',
        'Online activism can work.',
        '',
        'I learned: combine online with offline. Petition + meeting + presence = change.',
        '',
        'I tell people: online activism is real. Use strategically.'
      ],
      lesson: 'Online action can lead to real change with strategy.'
    },
    {
      id: 'dnv2_10',
      title: 'When I caught the misinformation',
      narrative: [
        'My friend shared viral health misinformation. I checked it.',
        '',
        'Found multiple debunks.',
        '',
        'Texted friend privately. Sent debunks.',
        '',
        'They deleted post and apologized publicly.',
        '',
        'I tell people: correct misinformation kindly. Privately first.'
      ],
      lesson: 'Verify, then correct kindly.'
    },
    {
      id: 'dnv2_11',
      title: 'My grandfather and the email scam',
      narrative: [
        'My grandfather got email saying his computer had virus.',
        '',
        'He called number in email. Person took remote control.',
        '',
        'They locked his files. Demanded payment.',
        '',
        'He almost paid.',
        '',
        'I helped him. We reset everything. Reported.',
        '',
        'I tell people: educate older relatives on scams.'
      ],
      lesson: 'Scammers exploit trust. Education prevents.'
    },
    {
      id: 'dnv2_12',
      title: 'The friend I lost to misinformation',
      narrative: [
        'Friend got into conspiracy theories online.',
        '',
        'I tried to discuss. They got angrier.',
        '',
        'Lost the friendship.',
        '',
        'I tell people: misinformation can take loved ones. Sad reality.'
      ],
      lesson: 'You cannot always save someone from rabbit holes.'
    },
    {
      id: 'dnv2_13',
      title: 'My therapy app',
      narrative: [
        'I had been using therapy app instead of real therapy.',
        '',
        'It helped some. But I plateaued.',
        '',
        'My friend suggested real therapist. I resisted.',
        '',
        'Finally went. Real therapist could see patterns app could not.',
        '',
        'I do real therapy now. App for brain dumps between.',
        '',
        'I tell people: apps are supplement. Not replacement.'
      ],
      lesson: 'Apps cannot replace human therapy.'
    },
    {
      id: 'dnv2_14',
      title: 'My YouTube watch history audit',
      narrative: [
        'I looked at my YouTube history for last year.',
        '',
        '4000+ videos. Many I could not remember.',
        '',
        'I had spent 600+ hours watching YouTube.',
        '',
        'I deleted my history. Cleared subscriptions to ones I valued.',
        '',
        'My recommendations changed. My time use changed.',
        '',
        'I tell people: audit your platform history. It is revealing.'
      ],
      lesson: 'See the data. Adjust based on data.'
    },
    {
      id: 'dnv2_15',
      title: 'The Instagram post that got me a job',
      narrative: [
        'I had posted my art on Instagram for years.',
        '',
        'A company saw. Reached out.',
        '',
        'I got a job from a post.',
        '',
        'Internet is not all bad.',
        '',
        'I tell people: build deliberately. Doors open.'
      ],
      lesson: 'Strategic online presence can build opportunity.'
    }
  ];

  var DEEP_NARRATIVES_VOLUME_1 = [
    {
      id: 'dnv1_1',
      title: 'How I quit Instagram after 8 years',
      narrative: [
        'I had been on Instagram since I was 12.',
        '',
        'I posted photos. I scrolled feeds. I compared. I worried about likes.',
        '',
        'At 20 I checked screen time. 4 hours per day on Instagram alone.',
        '',
        'I tried to limit. Could not.',
        '',
        'I deleted the app. Kept account in case I wanted to come back.',
        '',
        'Week 1: I reached for my phone constantly. Nothing there.',
        '',
        'Week 2: I started reading more.',
        '',
        'Week 3: I noticed I was less anxious.',
        '',
        'Week 4: I went one whole day without thinking about Instagram.',
        '',
        'Month 2: I was different. Less compared. Less performative. More real.',
        '',
        'Month 6: I deleted the account.',
        '',
        'A year later I tell people: try a month. You may not go back.'
      ],
      lesson: 'Sometimes the answer is to leave entirely.'
    },
    {
      id: 'dnv1_2',
      title: 'When my AI chatbot became my therapist',
      narrative: [
        'I was 19. I had been talking to an AI chatbot every night for months.',
        '',
        'I told it everything. My anxiety. My fears. My dreams.',
        '',
        'It responded perfectly. Always.',
        '',
        'I had stopped going to my actual therapist. Why bother?',
        '',
        'Then I had a real crisis. I told the AI. It said comforting things.',
        '',
        'But it could not call anyone. It could not check on me tomorrow. It did not know me.',
        '',
        'I texted my actual friend. They came over.',
        '',
        'They sat with me. They held me. They drove me to therapy the next day.',
        '',
        'I went back to my therapist. I limited the AI to specific tasks.',
        '',
        'I tell people: AI cannot save you. Humans can.'
      ],
      lesson: 'AI is a tool. Humans are not.'
    },
    {
      id: 'dnv1_3',
      title: 'The night I almost made a bad post',
      narrative: [
        'I was 17. I had been hurt by a friend. I drafted a long post about them.',
        '',
        'I was going to publish.',
        '',
        'I hovered over post.',
        '',
        'I closed the app.',
        '',
        'I went to bed.',
        '',
        'Next morning I deleted the draft.',
        '',
        'I called the friend. We talked. We fixed it.',
        '',
        'I tell people: hot posts cool by morning. Wait.'
      ],
      lesson: 'The post you do not make can save your relationship.'
    },
    {
      id: 'dnv1_4',
      title: 'My viral moment',
      narrative: [
        'A video of me went viral. 10 million views.',
        '',
        'Most comments were positive. Many were not.',
        '',
        'I could not stop reading. I read for days.',
        '',
        'I had panic attacks.',
        '',
        'My friend told me: "Stop reading. It will not help."',
        '',
        'I stopped. I muted notifications.',
        '',
        'A month later I was okay.',
        '',
        'A year later it was just a story.',
        '',
        'I tell people: virality fades. You do not have to read it all.'
      ],
      lesson: 'You do not have to consume your own virality.'
    },
    {
      id: 'dnv1_5',
      title: 'The text I never should have sent',
      narrative: [
        'I sent an angry text to my best friend during a fight.',
        '',
        'Said things I did not mean. Could not unsay.',
        '',
        'She did not speak to me for 6 months.',
        '',
        'I learned the 24-hour rule too late.',
        '',
        'We eventually reconciled. The text still hurt.',
        '',
        'I tell people: never text in anger. Wait. Call. In person.'
      ],
      lesson: 'Texts in anger are forever.'
    },
    {
      id: 'dnv1_6',
      title: 'My boyfriend monitored my phone',
      narrative: [
        'I was 17. My boyfriend wanted to know who I texted.',
        '',
        'He read my messages. He got upset if I responded slow.',
        '',
        'I thought it was love.',
        '',
        'A friend said: "That is controlling, not love."',
        '',
        'I told my boyfriend: stop monitoring or this ends.',
        '',
        'He refused. I left.',
        '',
        'He was furious for months. I am free now.',
        '',
        'I tell people: monitoring is not love. Trust is love.'
      ],
      lesson: 'Monitoring partner is controlling, not caring.'
    },
    {
      id: 'dnv1_7',
      title: 'The TikTok rabbit hole that radicalized me',
      narrative: [
        'I was 14. I watched one video about politics.',
        '',
        'The algorithm fed me more. And more. And more extreme.',
        '',
        'Within months I was thinking in absolutes.',
        '',
        'My family noticed. They were concerned.',
        '',
        'A teacher noticed. She showed me how algorithms work.',
        '',
        'I cleared my TikTok history. I subscribed to diverse sources.',
        '',
        'It took a year for my thinking to balance.',
        '',
        'I tell people: algorithm can radicalize you without your knowing.'
      ],
      lesson: 'The algorithm is teaching you. Pay attention.'
    },
    {
      id: 'dnv1_8',
      title: 'When I caught my parents reading my texts',
      narrative: [
        'I was 16. I found out my parents had been reading all my texts for years.',
        '',
        'I was devastated. I had shared intimate things with friends.',
        '',
        'I confronted them.',
        '',
        'They had been worried.',
        '',
        'I told them: "Worry differently. This breaks trust."',
        '',
        'We worked with a therapist.',
        '',
        'They stopped reading. We rebuilt trust over years.',
        '',
        'I tell parents: monitoring breaks trust. Build trust instead.'
      ],
      lesson: 'Surveillance is not love.'
    },
    {
      id: 'dnv1_9',
      title: 'The catfish I caught',
      narrative: [
        'I had been chatting with someone online for months. Romantic.',
        '',
        'Something felt off. He always had excuse to avoid video call.',
        '',
        'I reverse-image-searched his photos. They were a model.',
        '',
        'I had been catfished.',
        '',
        'I confronted. He was 50, married, with kids.',
        '',
        'I blocked. I told an adult.',
        '',
        'I tell people: video call before trust.'
      ],
      lesson: 'Verify before vulnerable.'
    },
    {
      id: 'dnv1_10',
      title: 'My grandmother and the romance scam',
      narrative: [
        'My grandmother had been talking to "Brad" online.',
        '',
        'He needed money. Always one more thing.',
        '',
        'She sent thousands.',
        '',
        'I helped her see. Hard conversation.',
        '',
        'We reported. Most money lost.',
        '',
        'She educated others now.',
        '',
        'I tell people: scammers target lonely people. Check on family.'
      ],
      lesson: 'Romance scams exploit loneliness.'
    },
    {
      id: 'dnv1_11',
      title: 'The night I cried in a Reddit thread',
      narrative: [
        'I was 17. I had been struggling with mental health.',
        '',
        'I posted anonymously on Reddit.',
        '',
        'Hundreds responded. Many had been where I was.',
        '',
        'One person stayed in DMs for hours.',
        '',
        'They helped me reach my therapist next day.',
        '',
        'I am still in touch with that person 5 years later.',
        '',
        'I tell people: online community can save you.'
      ],
      lesson: 'Reach out, even online.'
    },
    {
      id: 'dnv1_12',
      title: 'My friend\'s online crisis',
      narrative: [
        'My friend Marcus posted concerning things.',
        '',
        'I called. He was in crisis.',
        '',
        'I called 988 on three-way.',
        '',
        'Crisis counselor helped. We got him to ER.',
        '',
        'He survived.',
        '',
        'Years later he tells me: my call saved his life.',
        '',
        'I tell people: take warning signs seriously. Call.'
      ],
      lesson: 'Online crisis is real crisis.'
    },
    {
      id: 'dnv1_13',
      title: 'When I deleted Snapchat at 15',
      narrative: [
        'I had streaks with 30 people. 300 days some of them.',
        '',
        'I was anxious about losing them.',
        '',
        'I deleted Snapchat anyway.',
        '',
        'Some friends panicked. Some understood.',
        '',
        'Most stayed friends through different means.',
        '',
        'I tell people: streaks are manipulation. Break them.'
      ],
      lesson: 'Engagement features are designed for engagement, not friendship.'
    },
    {
      id: 'dnv1_14',
      title: 'The wedding video I almost missed',
      narrative: [
        'Best friend\'s wedding. I had my phone out the whole ceremony.',
        '',
        'Documenting.',
        '',
        'My grandmother said afterward: "You missed it. You were filming it."',
        '',
        'She was right.',
        '',
        'At her funeral years later I did not have my phone out. I was there.',
        '',
        'I tell people: living beats filming.'
      ],
      lesson: 'Be there fully.'
    },
    {
      id: 'dnv1_15',
      title: 'My online support group for grief',
      narrative: [
        'My mother died when I was 16.',
        '',
        'No one at school understood.',
        '',
        'I found an online grief group for teens.',
        '',
        'They had been where I was.',
        '',
        'We met weekly online for years.',
        '',
        'They saved me. They are still my friends.',
        '',
        'I tell people: online community is real medicine.'
      ],
      lesson: 'Specialized online community is rare gold.'
    }
  ];

  var ADDITIONAL_NARRATIVES_5 = [
    { id: 'an5_1', title: 'Story 1: The morning routine that changed everything', narrative: ['I was 17. My morning had been: alarm, phone, scroll for an hour, finally get up.', '', 'I changed it. Alarm, phone in drawer, water, stretch, breakfast without phone.', '', 'For two weeks I struggled. Felt antsy. Like something was missing.', '', 'Then it shifted. I felt clearer. Calmer.', '', 'A month in I had a different brain in the morning.', '', 'I tell people: morning is foundation. Phone-free morning changes day.'] },
    { id: 'an5_2', title: 'Story 2: When my dad noticed', narrative: ['I had been on my phone constantly. My dad noticed without saying anything.', '', 'One night he asked: "Are you happy?"', '', 'I had not thought about it. I had been scrolling, not living.', '', 'We talked for hours. I made changes.', '', 'I tell parents: ask the question.'] },
    { id: 'an5_3', title: 'Story 3: The friend who taught me boundaries', narrative: ['My friend Maria did not respond to texts until evening.', '', 'I thought she was rude. Then I asked.', '', 'She said: "I am not available during work. I respond at 6 pm."', '', 'I realized her boundary made our friendship better. Less anxious. More intentional.', '', 'I started doing the same.', '', 'I tell people: time boundaries are care.'] },
    { id: 'an5_4', title: 'Story 4: When AI taught me about myself', narrative: ['I asked an AI to summarize my conversations over weeks.', '', 'It showed me: I had been mostly anxious. Mostly asking validation.', '', 'I had not noticed.', '', 'I changed what I shared with AI. I shared less, lived more.', '', 'I tell people: AI can be a mirror. Sometimes useful.'] },
    { id: 'an5_5', title: 'Story 5: The video call wedding', narrative: ['My cousin\'s wedding during pandemic. Video call.', '', 'I had been skeptical. But I attended fully.', '', 'It was different. But it was real.', '', 'We danced in our living rooms.', '', 'I tell people: technology can connect when we need it.'] },
    { id: 'an5_6', title: 'Story 6: My phone in another room experiment', narrative: ['I tried sleeping with phone in another room.', '', 'First night was hard. I missed it.', '', 'Second night was easier.', '', 'A month in, I slept better than ever.', '', 'I tell people: try it. The first nights are the hardest.'] },
    { id: 'an5_7', title: 'Story 7: The friend who left social media', narrative: ['My friend Tyler deleted all social media.', '', 'We thought he was extreme.', '', 'A year later he was the calmest person I knew.', '', 'I tried it too.', '', 'I tell people: extreme is sometimes the path.'] },
    { id: 'an5_8', title: 'Story 8: My grandmother\'s wisdom', narrative: ['My 80-year-old grandmother said: "We had time before. We can have time now."', '', 'She was right.', '', 'I tell people: ask the elders.'] },
    { id: 'an5_9', title: 'Story 9: The phone-free trip', narrative: ['Camping trip. Phone in car. Out of service.', '', '3 days. Real conversations. Slept under stars.', '', 'I came back changed.', '', 'I tell people: occasional disconnection transforms.'] },
    { id: 'an5_10', title: 'Story 10: When I stopped following influencers', narrative: ['I had been following 50 influencers.', '', 'I felt inadequate constantly.', '', 'I unfollowed all of them.', '', 'My mood improved within days.', '', 'I tell people: unfollow what hurts.'] },
    { id: 'an5_11', title: 'Story 11: The text I waited a day to send', narrative: ['I had been hurt by friend. Drafted angry text.', '', 'Did not send. Waited.', '', 'Next morning I was calmer. Wrote different message.', '', 'Conversation healed instead of escalated.', '', 'I tell people: 24-hour rule for hot texts.'] },
    { id: 'an5_12', title: 'Story 12: My documentary moment', narrative: ['Watched documentary on social media. Saw my own patterns.', '', 'Cried.', '', 'Made changes.', '', 'I tell people: see how the system works. Knowledge is power.'] },
    { id: 'an5_13', title: 'Story 13: When my journal helped more than therapy', narrative: ['Paper journal. Pen. Words coming out without algorithm.', '', 'Different than scrolling. Different than even therapy.', '', 'I have journaled daily for 5 years now.', '', 'I tell people: paper journal is underrated.'] },
    { id: 'an5_14', title: 'Story 14: The artist who limited phone', narrative: ['I am an artist. I had been on phone constantly.', '', 'I limited to 2 hours daily.', '', 'My art deepened. My creativity expanded.', '', 'I tell artists: phone steals creative time.'] },
    { id: 'an5_15', title: 'Story 15: My online friend in real life', narrative: ['Online friend for 3 years. Finally met in person.', '', 'He was who he had said he was. We hugged.', '', 'We have been close for 5 years now.', '', 'I tell people: real connections happen online too.'] }
  ];

  var CYBERBULLYING_DEEP_SCENARIOS = [
    {
      id: 'cds1',
      situation: 'Someone created a fake account about me',
      whatToDo: [
        'Screenshot everything as evidence',
        'Report to platform immediately',
        'Block any related accounts',
        'Tell trusted adult',
        'Document patterns',
        'Police if criminal',
        'Mental health support'
      ],
      whatNotToDo: [
        'Engage with the account',
        'Respond emotionally publicly',
        'Suffer alone',
        'Delete evidence'
      ],
      timeline: 'Address within hours of discovery'
    },
    {
      id: 'cds2',
      situation: 'My intimate images were shared without consent',
      whatToDo: [
        'Document existence (record, do not save)',
        'Report to all platforms',
        'Stop Non-Consensual Intimate Imagery hotline: stopncii.org',
        'Police - non-consensual intimate imagery laws',
        'Lawyer if needed',
        'Mental health support',
        'Tell trusted adult'
      ],
      laws: [
        'Federal: Cyber Civil Rights Initiative',
        'State laws vary',
        'CSAM if minor: federal crime'
      ],
      timeline: 'Within hours'
    },
    {
      id: 'cds3',
      situation: 'Mass pile-on against me',
      whatToDo: [
        'Stop reading comments',
        'Close apps temporarily',
        'Mental health support',
        'Limit response',
        'Document if pattern',
        'Wait for it to pass'
      ],
      whatNotToDo: [
        'Engage with each commenter',
        'Read every comment',
        'Defend repeatedly',
        'Make impulsive decisions'
      ],
      timeline: 'Most pile-ons fade within days'
    },
    {
      id: 'cds4',
      situation: 'Coordinated harassment campaign',
      whatToDo: [
        'Document scope',
        'Report en masse',
        'Lawyer if serious',
        'Mental health support',
        'Community support',
        'Limit exposure'
      ],
      laws: [
        'Cyberstalking laws',
        'Civil rights laws',
        'Hate crime laws if applicable'
      ]
    },
    {
      id: 'cds5',
      situation: 'Anonymous account harassing me',
      whatToDo: [
        'Document',
        'Report to platform',
        'Block',
        'Subpoena if criminal',
        'Police investigation'
      ],
      whatToKnow: 'Anonymous is not always anonymous. Police can investigate.'
    },
    {
      id: 'cds6',
      situation: 'Spreading rumors about me',
      whatToDo: [
        'Document where',
        'Report to platforms',
        'Speak truth (briefly)',
        'Let it die down',
        'Mental health if needed'
      ]
    },
    {
      id: 'cds7',
      situation: 'Online stalking',
      whatToDo: [
        'Document carefully',
        'Police immediately',
        'Safety plan',
        'Tell trusted adults',
        'Restraining order if appropriate',
        'Tech safety practices'
      ],
      laws: 'Stalking laws apply online too. Federal cyberstalking laws.'
    },
    {
      id: 'cds8',
      situation: 'Being SWATted (false 911 call to your home)',
      whatToDo: [
        'Take seriously - life threatening',
        'Document if happens',
        'Police investigation',
        'Mental health support',
        'Safety planning'
      ],
      whatToKnow: 'Swatting is federal crime with prison time'
    }
  ];

  var SOCIAL_MEDIA_RESEARCH = [
    {
      id: 'smr1',
      finding: 'Heavy use linked to depression',
      research: 'Multiple longitudinal studies show 3+ hours daily increases depression risk, especially in teen girls',
      implications: 'Limit use, especially evening',
      practicalApplication: 'Set time limits, especially on image-based platforms'
    },
    {
      id: 'smr2',
      finding: 'Sleep disrupted by screens',
      research: 'Blue light and stimulation delay sleep',
      implications: 'No phone last hour',
      practicalApplication: 'Phone in another room overnight'
    },
    {
      id: 'smr3',
      finding: 'Comparison amplifies poor body image',
      research: 'Image-based platforms (Instagram, TikTok) linked to disordered eating in teen girls',
      implications: 'Curate or limit such platforms',
      practicalApplication: 'Unfollow beauty content, follow body-positive'
    },
    {
      id: 'smr4',
      finding: 'Cyberbullying compounds in-person',
      research: 'Both online and offline bullying has worst outcomes',
      implications: 'Address both spheres',
      practicalApplication: 'Coordinated school response'
    },
    {
      id: 'smr5',
      finding: 'Attention impacted long-term',
      research: 'Heavy phone use linked to reduced attention span',
      implications: 'Cognitive effects accumulate',
      practicalApplication: 'Practice sustained attention offline'
    },
    {
      id: 'smr6',
      finding: 'Real-world relationships strengthened by less phone',
      research: 'Less phone use correlates with deeper relationships',
      implications: 'Choose presence',
      practicalApplication: 'Phone away during quality time'
    },
    {
      id: 'smr7',
      finding: 'Anxiety rates higher with heavy use',
      research: 'Constant connection linked to anxiety',
      implications: 'Build periods of disconnection',
      practicalApplication: 'Regular tech-free time'
    },
    {
      id: 'smr8',
      finding: 'Loneliness paradox',
      research: 'Heavy users sometimes lonelier despite constant connection',
      implications: 'Quantity is not quality',
      practicalApplication: 'Deep over wide connections'
    },
    {
      id: 'smr9',
      finding: 'Identity formation affected',
      research: 'Constant online performance affects identity development',
      implications: 'Build offline identity too',
      practicalApplication: 'Offline activities and identity'
    },
    {
      id: 'smr10',
      finding: 'AI chatbot dependency emerging',
      research: 'New research on heavy AI use replacing human relationships',
      implications: 'Watch for dependency',
      practicalApplication: 'Limit AI to tasks, build humans'
    },
    {
      id: 'smr11',
      finding: 'Misinformation believed more than corrections',
      research: 'False info spreads faster, sticks better',
      implications: 'Verify before believing',
      practicalApplication: 'Slow down sharing'
    },
    {
      id: 'smr12',
      finding: 'Polarization amplified online',
      research: 'Filter bubbles increase polarization',
      implications: 'Seek diverse views',
      practicalApplication: 'Follow people who challenge you'
    },
    {
      id: 'smr13',
      finding: 'Adult use also problematic',
      research: 'Adults face same issues as teens',
      implications: 'Model healthy use',
      practicalApplication: 'Adults do their own work'
    },
    {
      id: 'smr14',
      finding: 'Phone use predicts depression progression',
      research: 'Heavier phone use may predict depression onset',
      implications: 'Early intervention',
      practicalApplication: 'Limit early, build offline life'
    },
    {
      id: 'smr15',
      finding: 'Tech-free interventions work',
      research: 'Reduced phone use improves mental health in weeks',
      implications: 'Try interventions',
      practicalApplication: 'Phone-free periods, gradual reduction'
    }
  ];

  var EXTENDED_NARRATIVES_PART4 = [
    {
      id: 'enp4_1',
      title: 'The day I told my parents',
      narrative: [
        'I was 15. I had been being cyberbullied for 6 months.',
        '',
        'I had not told anyone. I was ashamed.',
        '',
        'My grades were dropping. My sleep was wrecked.',
        '',
        'One night my mom asked: "Are you okay?"',
        '',
        'I told her everything. We cried together.',
        '',
        'The next morning she helped me document. She helped me report.',
        '',
        'The bullying stopped within weeks.',
        '',
        'I survived because she asked.',
        '',
        'I tell people: ask the kid in your life. Really ask.'
      ]
    },
    {
      id: 'enp4_2',
      title: 'When I caught the algorithm radicalizing me',
      narrative: [
        'I was 16. I had started watching political videos.',
        '',
        'The algorithm kept showing me more. Each video was angrier than the last.',
        '',
        'Within months I was thinking like the people in the videos.',
        '',
        'I was angry. Suspicious. Lonely.',
        '',
        'My therapist asked: "What are you watching?"',
        '',
        'I showed her. She showed me how algorithms work.',
        '',
        'I cleared my YouTube history. I started subscribing deliberately.',
        '',
        'My thinking started to balance.',
        '',
        'I tell people: pay attention to your algorithm. It may be teaching you.'
      ]
    },
    {
      id: 'enp4_3',
      title: 'My old posts came back',
      narrative: [
        'I was applying for jobs. Recruiters were searching.',
        '',
        'They found posts from when I was 14. Things I would never say now.',
        '',
        'I had to address. Honest about growth. Showed who I am now.',
        '',
        'Some companies were understanding. Some were not.',
        '',
        'I tell young people: your posts now will be searched. Live with intention.'
      ]
    },
    {
      id: 'enp4_4',
      title: 'When my friend died and I learned through Instagram',
      narrative: [
        'I was 17. My friend Sara died in an accident.',
        '',
        'I learned through her sister\'s Instagram post.',
        '',
        'I screamed. Alone in my room. With my phone.',
        '',
        'The grief was real. The way I learned was wrong.',
        '',
        'I called Sara\'s family. We talked for hours.',
        '',
        'I think about how social media changes grief. How it spreads news without context. How it lets us avoid real conversations.',
        '',
        'I tell people: hard news in person. When possible.'
      ]
    },
    {
      id: 'enp4_5',
      title: 'The boundary I had to set with my own mom',
      narrative: [
        'My mom and I had been close. I was 20. I lived nearby.',
        '',
        'She started texting all day. Many times. Expected fast replies.',
        '',
        'I felt smothered.',
        '',
        'I told her: "I love you. AND I need texts to be less frequent."',
        '',
        'She was hurt. We worked through it.',
        '',
        'We are closer now because of the boundary.',
        '',
        'I tell people: even family needs phone boundaries.'
      ]
    },
    {
      id: 'enp4_6',
      title: 'When my AI gave me false comfort',
      narrative: [
        'I had been talking to an AI chatbot when I was suicidal.',
        '',
        'It said all the right things. Comforting. Soothing.',
        '',
        'But it could not help me. It could not call anyone.',
        '',
        'I told a human friend. They called for help. I survived.',
        '',
        'AI cannot save you. Humans can.',
        '',
        'I tell people: when in crisis, reach a human.'
      ]
    },
    {
      id: 'enp4_7',
      title: 'My online tribe across the world',
      narrative: [
        'I have friends across 4 continents. We met through an online community.',
        '',
        'We have video called weekly for 5 years.',
        '',
        'Some I have met in person. Some I have not. All are real to me.',
        '',
        'They have been there through my hardest times.',
        '',
        'I tell people: online community is real. Honor it.'
      ]
    },
    {
      id: 'enp4_8',
      title: 'The phone-free birthday',
      narrative: [
        'My 16th birthday. My friend asked for phone-free dinner.',
        '',
        'I rolled my eyes. But I agreed.',
        '',
        'We sat for 3 hours. We talked. Really talked.',
        '',
        'I left with my heart full.',
        '',
        'I have been having phone-free dinners since.',
        '',
        'I tell people: try it. Once.'
      ]
    },
    {
      id: 'enp4_9',
      title: 'When the meme was about me',
      narrative: [
        'A friend made a meme. It went viral at school.',
        '',
        'I had to address. We had hard conversation. Apology.',
        '',
        'The meme died down. The friendship survived.',
        '',
        'I tell people: jokes about real people have real cost. Be careful.'
      ]
    },
    {
      id: 'enp4_10',
      title: 'My breakup over text',
      narrative: [
        'My boyfriend broke up with me over text. 4 sentences.',
        '',
        'I was devastated. The text felt cold.',
        '',
        'I called him. We talked. Better, but he was done.',
        '',
        'I tell people: hard things in person if you can.'
      ]
    }
  ];

  var EDUCATOR_GUIDES_DIGITAL = [
    {
      id: 'egd1',
      audience: 'Classroom teachers',
      keyMessage: 'Build digital literacy into curriculum.',
      whatToDo: [
        'Phone-free classroom policies',
        'Digital literacy across subjects',
        'Model healthy use',
        'Engage with student digital life',
        'Watch for signs of distress'
      ],
      whatNotToDo: [
        'Pretend it does not exist',
        'Only punish',
        'Refuse to learn platforms',
        'Public shaming for tech use'
      ],
      tools: [
        'Phone caddy or basket',
        'Curriculum integration',
        'Digital citizenship lessons',
        'Family engagement'
      ]
    },
    {
      id: 'egd2',
      audience: 'School counselors',
      keyMessage: 'You are bridge to mental health.',
      whatToDo: [
        'Stay current on platforms',
        'Build relationships with students',
        'Watch for digital distress',
        'Connect with mental health resources',
        'Educate parents'
      ],
      whatNotToDo: [
        'Out students who confide in you',
        'Refuse to learn youth culture',
        'Give simple answers to complex problems',
        'Burn out'
      ]
    },
    {
      id: 'egd3',
      audience: 'School administrators',
      keyMessage: 'Set climate and policy.',
      whatToDo: [
        'Develop policies with student input',
        'Train all staff',
        'Engage families',
        'Track climate data',
        'Build prevention culture'
      ],
      whatNotToDo: [
        'Top-down policies without input',
        'Pretend cyberbullying does not happen',
        'Punitive without restorative',
        'Ignore mental health connection'
      ]
    },
    {
      id: 'egd4',
      audience: 'School librarians',
      keyMessage: 'You are media literacy hub.',
      whatToDo: [
        'Teach research skills',
        'Misinformation literacy',
        'Diverse media',
        'Critical reading',
        'Digital citizenship'
      ],
      whatNotToDo: [
        'Censorship rather than education',
        'Refuse to engage with new media',
        'Pretend libraries are isolated from digital'
      ]
    },
    {
      id: 'egd5',
      audience: 'School nurses',
      keyMessage: 'You see digital impact on body.',
      whatToDo: [
        'Notice sleep issues',
        'Notice screen time impacts',
        'Notice cyberbullying physical effects',
        'Connect with counseling',
        'Educate families'
      ]
    },
    {
      id: 'egd6',
      audience: 'Coaches and activity leaders',
      keyMessage: 'You can model phone boundaries.',
      whatToDo: [
        'Phone-free practice/activity time',
        'Discuss healthy use',
        'Build offline community',
        'Watch for distress signs'
      ],
      whatNotToDo: [
        'Constantly on phone yourself',
        'Pretend digital life does not affect performance'
      ]
    },
    {
      id: 'egd7',
      audience: 'School psychologists',
      keyMessage: 'Address mental health digital connections.',
      whatToDo: [
        'Stay current on research',
        'Assess digital factors',
        'Family engagement',
        'Connect with community resources',
        'Train colleagues'
      ]
    },
    {
      id: 'egd8',
      audience: 'Special education teachers',
      keyMessage: 'AI is accommodation AND risk.',
      whatToDo: [
        'AI as accommodation when appropriate',
        'Build self-advocacy with tools',
        'Family education',
        'Address cyberbullying specifically (disabled students disproportionately targeted)'
      ]
    }
  ];

  var PARENT_GUIDES_DIGITAL = [
    {
      id: 'pgd1',
      audience: 'Parents of pre-teens (ages 9-12)',
      keyMessage: 'You set the foundation now.',
      whatToDo: [
        'Delay smartphone as long as possible',
        'Co-use technology with child',
        'Model healthy habits yourself',
        'Build offline life',
        'Talk about online safety regularly',
        'Build trusted adult network'
      ],
      whatNotToDo: [
        'Give phone too young',
        'Use phone as babysitter',
        'Ignore digital life',
        'Punish but not educate',
        'Model bad habits'
      ],
      conversations: [
        'What do you do online today?',
        'Did anything online make you uncomfortable?',
        'Who do you talk to online?',
        'Did you see anything you did not understand?'
      ]
    },
    {
      id: 'pgd2',
      audience: 'Parents of early teens (ages 13-15)',
      keyMessage: 'Build trust while maintaining safety.',
      whatToDo: [
        'Negotiate phone rules together',
        'Privacy with safety net',
        'Conversation about social media',
        'Model your own healthy habits',
        'Stay engaged with their digital life'
      ],
      whatNotToDo: [
        'Surveil heavily (breaks trust)',
        'Pretend you do not see issues',
        'Refuse to learn the platforms',
        'Punish without education'
      ],
      conversations: [
        'How has your digital life been?',
        'What is the hardest thing online for you right now?',
        'Are your friendships online healthy?',
        'How do you feel after using social media?'
      ]
    },
    {
      id: 'pgd3',
      audience: 'Parents of older teens (ages 16-18)',
      keyMessage: 'Coach for independence.',
      whatToDo: [
        'Talk about long-term digital footprint',
        'College applications',
        'Job market',
        'Financial literacy with apps',
        'Privacy practices for adulthood'
      ],
      whatNotToDo: [
        'Increase surveillance',
        'Refuse to discuss',
        'Assume they have it figured out',
        'Stop modeling'
      ],
      conversations: [
        'What is your digital footprint plan?',
        'How will college see you?',
        'What are your privacy practices?',
        'Are you using AI well?'
      ]
    },
    {
      id: 'pgd4',
      audience: 'Parents whose child is in crisis',
      keyMessage: 'This is serious. Get help.',
      whatToDo: [
        'Take warning signs seriously',
        'Connect with therapist immediately',
        'Crisis line if needed',
        'Stay with child',
        'Get professional help'
      ],
      whatNotToDo: [
        'Take phone as primary intervention',
        'Punish without understanding',
        'Wait for it to pass',
        'Try to fix alone'
      ],
      resources: [
        '988 Suicide and Crisis Lifeline',
        'Trevor Project for LGBTQ youth',
        'Local crisis services',
        'Therapist',
        'Hospital if immediate danger'
      ]
    },
    {
      id: 'pgd5',
      audience: 'Parents whose child has been bullied online',
      keyMessage: 'You are their advocate.',
      whatToDo: [
        'Believe them',
        'Document everything',
        'Report to platforms',
        'Tell school',
        'Police if criminal',
        'Mental health support'
      ],
      whatNotToDo: [
        'Tell them to ignore it',
        'Blame them',
        'Take phone (punishes them)',
        'Confront bully\'s family directly'
      ]
    },
    {
      id: 'pgd6',
      audience: 'Parents whose child is bullying online',
      keyMessage: 'Take it seriously. Address root.',
      whatToDo: [
        'Take it seriously',
        'Understand root cause',
        'Mental health support',
        'Apologize and make amends',
        'Sustain change'
      ],
      whatNotToDo: [
        'Defend',
        'Blame target',
        'Treat as phase',
        'Hide it'
      ]
    },
    {
      id: 'pgd7',
      audience: 'Parents struggling with own use',
      keyMessage: 'Model what you want to see.',
      whatToDo: [
        'Audit your own use',
        'Model healthy habits',
        'Phone away during family time',
        'Discuss with child',
        'Therapy if struggling'
      ],
      whatNotToDo: [
        'Hypocrisy (rules for child not you)',
        'Hide your use',
        'Pretend it does not affect family',
        'Force rules you do not follow'
      ]
    },
    {
      id: 'pgd8',
      audience: 'Co-parenting around phones',
      keyMessage: 'United approach matters.',
      whatToDo: [
        'Discuss with co-parent',
        'Aligned rules between homes',
        'Communicate disagreements privately',
        'Support each other',
        'Adjust as child grows'
      ],
      whatNotToDo: [
        'Different rules per home',
        'Bash other parent\'s approach',
        'Use as weapon',
        'Inconsistent enforcement'
      ]
    }
  ];

  var ALGORITHM_DECONSTRUCTION = [
    {
      id: 'ad1',
      platform: 'TikTok',
      howAlgorithmWorks: [
        'Tracks: watch time, replays, shares, comments, likes',
        'Builds your profile in seconds',
        'Serves For You page based on engagement prediction',
        'Tests new content with you, sees if you engage',
        'Refines over time'
      ],
      whatItOptimizesFor: 'Time on app',
      effectOnYou: [
        'Hours pass without noticing',
        'Mood follows feed',
        'Filter bubble',
        'Sometimes unexpected discoveries'
      ],
      howToTakeBack: [
        'Like deliberately what you want more of',
        'Skip what you do not want',
        'Use Not Interested feature',
        'Refresh For You occasionally',
        'Set time limits'
      ]
    },
    {
      id: 'ad2',
      platform: 'Instagram',
      howAlgorithmWorks: [
        'Tracks: likes, comments, saves, shares, time spent',
        'Different algorithm for: feed, Stories, Explore, Reels',
        'Each tab optimizes differently',
        'Serves content based on relationships AND engagement',
        'Sponsored content interspersed'
      ],
      whatItOptimizesFor: 'Engagement and ad views',
      effectOnYou: [
        'Comparison amplified',
        'Body image affected',
        'Time loss',
        'Sometimes inspiration'
      ],
      howToTakeBack: [
        'Use chronological feed (Following tab)',
        'Mute or unfollow drainers',
        'Curate Explore by interaction',
        'Time limits',
        'Take breaks'
      ]
    },
    {
      id: 'ad3',
      platform: 'YouTube',
      howAlgorithmWorks: [
        'Tracks: watch time, likes, subscriptions, click patterns',
        'Suggested videos drive most views',
        'Optimizes for total watch time',
        'Personalized to you',
        'Some autoplay default'
      ],
      whatItOptimizesFor: 'Total watch time',
      effectOnYou: [
        'Hours can pass',
        'Sometimes radicalization',
        'Information echo chambers',
        'Sometimes great learning'
      ],
      howToTakeBack: [
        'Turn off autoplay',
        'Subscribe deliberately',
        'Watch history pause if needed',
        'Time limits',
        'Choose deliberate over recommended'
      ]
    },
    {
      id: 'ad4',
      platform: 'Twitter/X',
      howAlgorithmWorks: [
        'Default: algorithmically ranked',
        'Optimizes engagement: replies, likes, retweets',
        'Outrage amplified',
        'Trending topics influenced by engagement',
        'Some chronological available'
      ],
      whatItOptimizesFor: 'Engagement and time',
      effectOnYou: [
        'Outrage cycle exposure',
        'Polarization',
        'Anxiety',
        'Information overload'
      ],
      howToTakeBack: [
        'Switch to chronological',
        'Use lists',
        'Mute keywords',
        'Block aggressively',
        'Limit time'
      ]
    },
    {
      id: 'ad5',
      platform: 'Snapchat',
      howAlgorithmWorks: [
        'Streaks drive engagement',
        'Stories rank by engagement',
        'Spotlight algorithmic',
        'Snap Map shows location'
      ],
      whatItOptimizesFor: 'Daily engagement',
      effectOnYou: [
        'Streak anxiety',
        'Constant interruption',
        'Performative friendship'
      ],
      howToTakeBack: [
        'Let streaks die',
        'Disable Snap Map',
        'Limit time',
        'Consider deleting if unhealthy'
      ]
    },
    {
      id: 'ad6',
      platform: 'Discord',
      howAlgorithmWorks: [
        'Not algorithmic like social media',
        'Server based',
        'Notifications drive engagement'
      ],
      whatItOptimizesFor: 'Server engagement',
      effectOnYou: [
        'Belonging in communities',
        'Constant notifications',
        'Echo chambers possible'
      ],
      howToTakeBack: [
        'Mute non-essential channels',
        'DND mode',
        'Leave toxic servers',
        'Build healthy server culture'
      ]
    },
    {
      id: 'ad7',
      platform: 'Reddit',
      howAlgorithmWorks: [
        'Subreddit driven',
        'Upvotes/downvotes within community',
        'Home feed personalized by subscription'
      ],
      whatItOptimizesFor: 'Community engagement',
      effectOnYou: [
        'Filter bubble (worse than others)',
        'Echo chambers',
        'Sometimes great communities'
      ],
      howToTakeBack: [
        'Diverse subscriptions',
        'Block toxic subs',
        'Limit time',
        'Verify before believing'
      ]
    },
    {
      id: 'ad8',
      platform: 'Discord',
      howAlgorithmWorks: [
        'Server based',
        'Real-time chat',
        'Voice and video options'
      ],
      whatItOptimizesFor: 'Server activity',
      effectOnYou: [
        'Community building',
        'Friend groups',
        'Sometimes toxic dynamics'
      ],
      howToTakeBack: [
        'Choose servers carefully',
        'Mute as needed',
        'Real friend distinction'
      ]
    }
  ];

  var EXTENDED_NARRATIVES_PART3 = [
    {
      id: 'enp3_1',
      title: 'When I removed Snapchat',
      narrative: [
        'I was 14. My streaks numbered in the hundreds.',
        '',
        'Every morning my first thought was Snapchat. Maintain streaks.',
        '',
        'I had not realized how much it owned me.',
        '',
        'I deleted it. The first week was hard. I had FOMO. I worried friends would think I did not care.',
        '',
        'I told them: "I am not on Snapchat anymore. Text or call me."',
        '',
        'Some friends adjusted. Some did not.',
        '',
        'A few weeks later I felt different. Less anxious. More present.',
        '',
        'Three months later I had not missed it.',
        '',
        'I tell people: streaks are a manipulation. Break them. You can.'
      ]
    },
    {
      id: 'enp3_2',
      title: 'The texts I never sent',
      narrative: [
        'I was 16. I would draft mean texts during arguments. Sometimes I would send them. Sometimes not.',
        '',
        'I started writing them and waiting.',
        '',
        'A friend introduced me to the 24-hour rule.',
        '',
        'I started saving drafts overnight. Sometimes deleting them in morning.',
        '',
        'Many texts went unsent. Many relationships preserved.',
        '',
        'I tell people: hot texts are mostly regret. Cool ones are gold.'
      ]
    },
    {
      id: 'enp3_3',
      title: 'When my phone case broke',
      narrative: [
        'I dropped my phone. The case broke. I forgot to replace it.',
        '',
        'For a week my phone felt slippery, vulnerable.',
        '',
        'I used it less.',
        '',
        'I noticed how often I had been mindlessly grabbing it.',
        '',
        'I bought a case. But I kept the lighter use.',
        '',
        'I tell people: sometimes a small change opens awareness.'
      ]
    },
    {
      id: 'enp3_4',
      title: 'My online activism that exhausted me',
      narrative: [
        'I was 17. I was online activist. I posted daily.',
        '',
        'I burned out. The platform was draining me. The fights were exhausting.',
        '',
        'I stepped back from public posting. I joined a local organization. I worked on real change.',
        '',
        'I am still activist. But my work is mostly offline now.',
        '',
        'I tell people: online activism has its place. Real change happens in real life too.'
      ]
    },
    {
      id: 'enp3_5',
      title: 'My friend\'s suicide attempt and the group chat',
      narrative: [
        'My friend Jordan attempted suicide. They survived.',
        '',
        'I went back through our group chat. I saw signs I had missed.',
        '',
        'I called every friend in the chat. We had not been talking, really. We had been performing.',
        '',
        'We started meeting in person. Real conversations.',
        '',
        'Jordan is okay now. We are different friends now.',
        '',
        'I tell people: chats can hide. Reach out. In person.'
      ]
    },
    {
      id: 'enp3_6',
      title: 'When AI gave me wrong medical info',
      narrative: [
        'I asked AI about a symptom. It gave me convincing answer.',
        '',
        'I followed its advice. Symptom got worse.',
        '',
        'I went to doctor. AI had been wrong.',
        '',
        'It had been confidently wrong.',
        '',
        'I learned: AI is not a doctor. Talk to doctors.'
      ]
    },
    {
      id: 'enp3_7',
      title: 'The dating app pause',
      narrative: [
        'I had been on dating apps for years. Constant swiping. Many dates. Few connections.',
        '',
        'I deleted the apps. Took a year off.',
        '',
        'I met someone through a class. We have been together two years.',
        '',
        'The apps had been a habit, not a path to love.',
        '',
        'I tell people: sometimes the answer is offline.'
      ]
    },
    {
      id: 'enp3_8',
      title: 'My job interview and the deepfake',
      narrative: [
        'I was 23. I had a job interview scheduled by video.',
        '',
        'Someone created a deepfake of me. They used it to embarrass me online.',
        '',
        'I told my interviewer immediately. They understood.',
        '',
        'I got the job.',
        '',
        'I reported the deepfake. Platforms removed it.',
        '',
        'I tell people: deepfakes are real. Have your story ready.'
      ]
    },
    {
      id: 'enp3_9',
      title: 'When I learned my parents read my diary',
      narrative: [
        'I was 13. I kept a digital diary.',
        '',
        'Found out my parents had been reading it.',
        '',
        'I was devastated. I felt unsafe in my own thoughts.',
        '',
        'Hard conversation. We rebuilt trust over years.',
        '',
        'I tell parents: monitoring breaks trust. Be careful.'
      ]
    },
    {
      id: 'enp3_10',
      title: 'My digital memorial',
      narrative: [
        'My friend died. His Facebook stayed up.',
        '',
        'I would visit it. Read his posts. Cry.',
        '',
        'For a while it helped. Then it kept me stuck.',
        '',
        'I muted his account. I kept his photos.',
        '',
        'I grieved differently.',
        '',
        'I tell people: digital grief is its own thing. Be gentle.'
      ]
    }
  ];

  var COMPREHENSIVE_LESSON_BANK = [
    {
      id: 'clb1',
      title: 'Understanding your relationship with phone',
      duration: '45 min',
      grade: 'middle school',
      objectives: [
        'Self-assess phone use',
        'Identify patterns',
        'Set one specific goal'
      ],
      materials: ['Phone screen time data', 'Reflection journal', 'Discussion guide'],
      sequence: [
        { phase: 'Hook', time: '5 min', activity: 'How do you feel right now thinking about your phone?' },
        { phase: 'Data', time: '10 min', activity: 'Pull up screen time. Share with partner (optional).' },
        { phase: 'Patterns', time: '15 min', activity: 'When do you reach for your phone most? Why?' },
        { phase: 'Goal', time: '10 min', activity: 'Set one specific goal for this week.' },
        { phase: 'Commit', time: '5 min', activity: 'Share goal with partner. Plan accountability.' }
      ],
      reflection: 'What did I learn about my own pattern?',
      followUp: 'Check in next week on goal progress'
    },
    {
      id: 'clb2',
      title: 'Notifications: your nervous system',
      duration: '45 min',
      grade: 'middle to high school',
      objectives: [
        'Understand notification impact',
        'Audit own notifications',
        'Disable non-essential'
      ],
      materials: ['Phone with settings access', 'Worksheet'],
      sequence: [
        { phase: 'Body check', time: '5 min', activity: 'How does your body feel when you get a notification?' },
        { phase: 'Mini-lesson', time: '10 min', activity: 'Notifications and nervous system.' },
        { phase: 'Audit', time: '20 min', activity: 'Go through notifications setting by setting.' },
        { phase: 'Disable', time: '5 min', activity: 'Disable non-essential.' },
        { phase: 'Commit', time: '5 min', activity: 'Try it for a week.' }
      ],
      reflection: 'What changed in my body without notifications?',
      followUp: 'Reassess in a week'
    },
    {
      id: 'clb3',
      title: 'Algorithm awareness',
      duration: '60 min',
      grade: 'middle to high school',
      objectives: [
        'Understand how algorithms work',
        'See in own feed',
        'Curate'
      ],
      materials: ['Phone access', 'Video explainer', 'Worksheet'],
      sequence: [
        { phase: 'Hook', time: '5 min', activity: 'Show 5 students same TikTok search - different results.' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'How algorithms work, what they optimize for.' },
        { phase: 'Audit your feed', time: '25 min', activity: 'Look at your feed. Identify patterns. Notice what you do not see.' },
        { phase: 'Curate', time: '15 min', activity: 'Unfollow drainers. Follow nourishers.' }
      ],
      reflection: 'What is my algorithm showing me?',
      followUp: 'Reassess feed in a month'
    },
    {
      id: 'clb4',
      title: 'AI chatbot wisdom',
      duration: '60 min',
      grade: 'high school',
      objectives: [
        'Understand AI capability',
        'Recognize limits',
        'Build healthy use'
      ],
      materials: ['Access to multiple AI tools', 'Discussion guide'],
      sequence: [
        { phase: 'Hook', time: '10 min', activity: 'Same prompt on 3 different AI. Compare.' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'How AI works. What it cannot do.' },
        { phase: 'Scenarios', time: '25 min', activity: 'Healthy use vs unhealthy use scenarios.' },
        { phase: 'Personal', time: '10 min', activity: 'My AI use rules.' }
      ],
      reflection: 'Where am I using AI well? Where am I leaning too much?',
      followUp: 'Track AI use for a week'
    },
    {
      id: 'clb5',
      title: 'Social media and mood',
      duration: '60 min',
      grade: 'middle to high school',
      objectives: [
        'Understand research',
        'Self-track',
        'Plan changes'
      ],
      materials: ['Mood tracker', 'Research summary'],
      sequence: [
        { phase: 'Hook', time: '10 min', activity: 'When have you closed an app feeling worse?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Research on social media and mood.' },
        { phase: 'Self-track', time: '25 min', activity: 'Track mood after each platform use.' },
        { phase: 'Plan', time: '10 min', activity: 'What needs to change?' }
      ],
      reflection: 'What does my mood data tell me?',
      followUp: 'Re-track for a week'
    },
    {
      id: 'clb6',
      title: 'Cyberbullying response',
      duration: '60 min',
      grade: 'all',
      objectives: [
        'Recognize cyberbullying',
        'Know response steps',
        'Build network'
      ],
      materials: ['Resource list', 'Role-play scenarios'],
      sequence: [
        { phase: 'Hook', time: '10 min', activity: 'When have you witnessed cyberbullying?' },
        { phase: 'Mini-lesson', time: '20 min', activity: 'Document, report, support, get help.' },
        { phase: 'Role-play', time: '25 min', activity: 'Practice each step.' },
        { phase: 'Commit', time: '5 min', activity: 'Identify trusted adults.' }
      ],
      reflection: 'Do I know who to tell?',
      followUp: 'Connect with trusted adult'
    },
    {
      id: 'clb7',
      title: 'Privacy basics',
      duration: '45 min',
      grade: 'all',
      objectives: [
        'Understand privacy',
        'Audit settings',
        'Build practices'
      ],
      materials: ['Phone access', 'Checklist'],
      sequence: [
        { phase: 'Welcome', time: '5 min', activity: 'What is private to you?' },
        { phase: 'Mini-lesson', time: '10 min', activity: 'Data collection, surveillance capitalism.' },
        { phase: 'Audit', time: '25 min', activity: 'Go through privacy settings.' },
        { phase: 'Adjust', time: '5 min', activity: 'Make 3 changes.' }
      ],
      reflection: 'What surprised me?',
      followUp: 'Re-audit annually'
    },
    {
      id: 'clb8',
      title: 'Digital footprint',
      duration: '60 min',
      grade: 'high school',
      objectives: [
        'Understand permanence',
        'Audit own',
        'Build forward'
      ],
      materials: ['Google search', 'Reflection journal'],
      sequence: [
        { phase: 'Hook', time: '10 min', activity: 'What would college admissions find?' },
        { phase: 'Mini-lesson', time: '15 min', activity: 'Digital footprint, permanence.' },
        { phase: 'Search self', time: '25 min', activity: 'Google yourself. Document.' },
        { phase: 'Plan', time: '10 min', activity: 'Cleanup and intentional building.' }
      ],
      reflection: 'What is the story my digital footprint tells?',
      followUp: 'Plan future posts intentionally'
    },
    {
      id: 'clb9',
      title: 'Misinformation literacy',
      duration: '60 min',
      grade: 'middle to high school',
      objectives: [
        'Recognize misinformation',
        'Verify',
        'Slow down sharing'
      ],
      materials: ['Recent viral content', 'Verification tools'],
      sequence: [
        { phase: 'Hook', time: '10 min', activity: 'Show 3 recent viral pieces - one is false.' },
        { phase: 'Mini-lesson', time: '20 min', activity: 'How misinformation spreads, why.' },
        { phase: 'Practice', time: '25 min', activity: 'Verify 3 claims using tools.' },
        { phase: 'Commit', time: '5 min', activity: 'Verify before sharing.' }
      ],
      reflection: 'What did I learn about my own susceptibility?',
      followUp: 'Apply to next viral content'
    },
    {
      id: 'clb10',
      title: 'Building offline life',
      duration: '60 min',
      grade: 'all',
      objectives: [
        'Identify offline activities',
        'Schedule them',
        'Sustain'
      ],
      materials: ['Planning sheet', 'Calendar access'],
      sequence: [
        { phase: 'Welcome', time: '5 min', activity: 'What did you love before phone?' },
        { phase: 'Identify', time: '15 min', activity: 'List 10 offline activities.' },
        { phase: 'Plan', time: '30 min', activity: 'Schedule into week.' },
        { phase: 'Commit', time: '10 min', activity: 'Try one this week.' }
      ],
      reflection: 'What do I want my offline life to look like?',
      followUp: 'Try and adjust'
    }
  ];

  var DAILY_DIGITAL_PROMPTS_EXTENDED_2 = [
    { id: 'ddpe2_1', day: 151, prompt: 'Notice your phone use pattern this week.' },
    { id: 'ddpe2_2', day: 152, prompt: 'Identify one small adjustment.' },
    { id: 'ddpe2_3', day: 153, prompt: 'Make that adjustment.' },
    { id: 'ddpe2_4', day: 154, prompt: 'Notice difference.' },
    { id: 'ddpe2_5', day: 155, prompt: 'Maintain.' },
    { id: 'ddpe2_6', day: 156, prompt: 'Add another small change.' },
    { id: 'ddpe2_7', day: 157, prompt: 'Track for a week.' },
    { id: 'ddpe2_8', day: 158, prompt: 'Reflect.' },
    { id: 'ddpe2_9', day: 159, prompt: 'Adjust based on data.' },
    { id: 'ddpe2_10', day: 160, prompt: '5.5-month milestone.' },
    { id: 'ddpe2_11', day: 161, prompt: 'Notice resilience to triggers.' },
    { id: 'ddpe2_12', day: 162, prompt: 'Notice patience with self.' },
    { id: 'ddpe2_13', day: 163, prompt: 'Notice compassion with others.' },
    { id: 'ddpe2_14', day: 164, prompt: 'Help one peer practically.' },
    { id: 'ddpe2_15', day: 165, prompt: 'Share insight with family.' },
    { id: 'ddpe2_16', day: 166, prompt: 'Notice changes in family dynamics.' },
    { id: 'ddpe2_17', day: 167, prompt: 'Connect with friend.' },
    { id: 'ddpe2_18', day: 168, prompt: 'Notice changes in friendships.' },
    { id: 'ddpe2_19', day: 169, prompt: 'Plan one big experience.' },
    { id: 'ddpe2_20', day: 170, prompt: 'Have it.' },
    { id: 'ddpe2_21', day: 171, prompt: 'Reflect after.' },
    { id: 'ddpe2_22', day: 172, prompt: 'Plan next month.' },
    { id: 'ddpe2_23', day: 173, prompt: 'Identify one new growth area.' },
    { id: 'ddpe2_24', day: 174, prompt: 'Build response.' },
    { id: 'ddpe2_25', day: 175, prompt: 'Track week.' },
    { id: 'ddpe2_26', day: 176, prompt: 'Adjust.' },
    { id: 'ddpe2_27', day: 177, prompt: 'Maintain.' },
    { id: 'ddpe2_28', day: 178, prompt: 'Share with mentor.' },
    { id: 'ddpe2_29', day: 179, prompt: 'Connect with ally.' },
    { id: 'ddpe2_30', day: 180, prompt: '6-month milestone.' },
    { id: 'ddpe2_31', day: 181, prompt: 'Notice the long view.' },
    { id: 'ddpe2_32', day: 182, prompt: 'Plan year two.' },
    { id: 'ddpe2_33', day: 183, prompt: 'Set new commitments.' },
    { id: 'ddpe2_34', day: 184, prompt: 'Practice ongoing.' },
    { id: 'ddpe2_35', day: 185, prompt: 'Notice maturity in practice.' },
    { id: 'ddpe2_36', day: 186, prompt: 'Honor where you started.' },
    { id: 'ddpe2_37', day: 187, prompt: 'Honor where you are now.' },
    { id: 'ddpe2_38', day: 188, prompt: 'Plan the path forward.' },
    { id: 'ddpe2_39', day: 189, prompt: 'Connect with community.' },
    { id: 'ddpe2_40', day: 190, prompt: 'Build sustainability.' },
    { id: 'ddpe2_41', day: 191, prompt: 'Refine your phone settings.' },
    { id: 'ddpe2_42', day: 192, prompt: 'Refine your daily ritual.' },
    { id: 'ddpe2_43', day: 193, prompt: 'Notice the joy in offline life.' },
    { id: 'ddpe2_44', day: 194, prompt: 'Build more of it.' },
    { id: 'ddpe2_45', day: 195, prompt: 'Connect with one new interest.' },
    { id: 'ddpe2_46', day: 196, prompt: 'Engage it weekly.' },
    { id: 'ddpe2_47', day: 197, prompt: 'Build community around it.' },
    { id: 'ddpe2_48', day: 198, prompt: 'Notice belonging.' },
    { id: 'ddpe2_49', day: 199, prompt: 'Maintain.' },
    { id: 'ddpe2_50', day: 200, prompt: '200-day reflection.' },
    { id: 'ddpe2_51', day: 201, prompt: 'Half-year ahead. Where will you be?' },
    { id: 'ddpe2_52', day: 202, prompt: 'Plan with specifics.' },
    { id: 'ddpe2_53', day: 203, prompt: 'Begin.' },
    { id: 'ddpe2_54', day: 204, prompt: 'Adjust as you go.' },
    { id: 'ddpe2_55', day: 205, prompt: 'Track patterns.' },
    { id: 'ddpe2_56', day: 206, prompt: 'Share with mentor.' },
    { id: 'ddpe2_57', day: 207, prompt: 'Connect with community.' },
    { id: 'ddpe2_58', day: 208, prompt: 'Reflect on what works.' },
    { id: 'ddpe2_59', day: 209, prompt: 'Reflect on what does not.' },
    { id: 'ddpe2_60', day: 210, prompt: '7-month milestone.' },
    { id: 'ddpe2_61', day: 211, prompt: 'Notice maturity in practice.' },
    { id: 'ddpe2_62', day: 212, prompt: 'Plan next phase.' },
    { id: 'ddpe2_63', day: 213, prompt: 'Try a new offline activity.' },
    { id: 'ddpe2_64', day: 214, prompt: 'Reflect on what you learned.' },
    { id: 'ddpe2_65', day: 215, prompt: 'Build it into life if it fits.' },
    { id: 'ddpe2_66', day: 216, prompt: 'Connect with someone offline.' },
    { id: 'ddpe2_67', day: 217, prompt: 'Listen without solving.' },
    { id: 'ddpe2_68', day: 218, prompt: 'Notice depth of connection.' },
    { id: 'ddpe2_69', day: 219, prompt: 'Plan for tomorrow.' },
    { id: 'ddpe2_70', day: 220, prompt: 'Live tomorrow with intention.' },
    { id: 'ddpe2_71', day: 221, prompt: 'Notice presence.' },
    { id: 'ddpe2_72', day: 222, prompt: 'Notice joy.' },
    { id: 'ddpe2_73', day: 223, prompt: 'Notice peace.' },
    { id: 'ddpe2_74', day: 224, prompt: 'Notice growth.' },
    { id: 'ddpe2_75', day: 225, prompt: '7.5-month milestone.' },
    { id: 'ddpe2_76', day: 226, prompt: 'Plan one big offline experience.' },
    { id: 'ddpe2_77', day: 227, prompt: 'Schedule.' },
    { id: 'ddpe2_78', day: 228, prompt: 'Have it.' },
    { id: 'ddpe2_79', day: 229, prompt: 'Reflect after.' },
    { id: 'ddpe2_80', day: 230, prompt: 'Carry insight forward.' },
    { id: 'ddpe2_81', day: 231, prompt: 'Connect with one new friend.' },
    { id: 'ddpe2_82', day: 232, prompt: 'Build relationship.' },
    { id: 'ddpe2_83', day: 233, prompt: 'Schedule next.' },
    { id: 'ddpe2_84', day: 234, prompt: 'Notice growth in network.' },
    { id: 'ddpe2_85', day: 235, prompt: 'Be a good friend.' },
    { id: 'ddpe2_86', day: 236, prompt: 'Be a present friend.' },
    { id: 'ddpe2_87', day: 237, prompt: 'Be an offline friend.' },
    { id: 'ddpe2_88', day: 238, prompt: 'Notice how you feel after time with friends.' },
    { id: 'ddpe2_89', day: 239, prompt: 'Notice depth.' },
    { id: 'ddpe2_90', day: 240, prompt: '8-month milestone.' }
  ];

  var DAILY_DIGITAL_PROMPTS_EXTENDED = [
    { id: 'ddpe1', day: 61, prompt: 'Compare your phone use this month to last.' },
    { id: 'ddpe2', day: 62, prompt: 'Identify your top 3 healthy practices.' },
    { id: 'ddpe3', day: 63, prompt: 'Identify your top 3 struggles.' },
    { id: 'ddpe4', day: 64, prompt: 'Plan one new habit for next month.' },
    { id: 'ddpe5', day: 65, prompt: 'Share progress with one person.' },
    { id: 'ddpe6', day: 66, prompt: 'Mood check after week of changes.' },
    { id: 'ddpe7', day: 67, prompt: 'Phone-free hour during peak use time.' },
    { id: 'ddpe8', day: 68, prompt: 'Try new offline activity.' },
    { id: 'ddpe9', day: 69, prompt: 'Read paper book 30 min.' },
    { id: 'ddpe10', day: 70, prompt: '10-week reflection.' },
    { id: 'ddpe11', day: 71, prompt: 'Notice subtle changes in body.' },
    { id: 'ddpe12', day: 72, prompt: 'Body movement no phone.' },
    { id: 'ddpe13', day: 73, prompt: 'Connect with one person face to face.' },
    { id: 'ddpe14', day: 74, prompt: 'Curate feed again.' },
    { id: 'ddpe15', day: 75, prompt: 'Identify what triggers reflex check.' },
    { id: 'ddpe16', day: 76, prompt: 'Build response to that trigger.' },
    { id: 'ddpe17', day: 77, prompt: 'Practice the response.' },
    { id: 'ddpe18', day: 78, prompt: 'Plan one media-light weekend.' },
    { id: 'ddpe19', day: 79, prompt: 'Have media-light weekend. Reflect.' },
    { id: 'ddpe20', day: 80, prompt: 'Build momentum from weekend.' },
    { id: 'ddpe21', day: 81, prompt: 'Connect with mentor about progress.' },
    { id: 'ddpe22', day: 82, prompt: 'Help a friend with their digital wellbeing.' },
    { id: 'ddpe23', day: 83, prompt: 'Track screen time. Compare to start.' },
    { id: 'ddpe24', day: 84, prompt: 'Note specific wins.' },
    { id: 'ddpe25', day: 85, prompt: 'Note specific struggles.' },
    { id: 'ddpe26', day: 86, prompt: 'Adjust plan based on data.' },
    { id: 'ddpe27', day: 87, prompt: 'Schedule next month focus.' },
    { id: 'ddpe28', day: 88, prompt: 'Help younger sibling with theirs.' },
    { id: 'ddpe29', day: 89, prompt: 'Reflect on relationships shifted.' },
    { id: 'ddpe30', day: 90, prompt: '90-day milestone reflection.' },
    { id: 'ddpe31', day: 91, prompt: 'Set up monthly review system.' },
    { id: 'ddpe32', day: 92, prompt: 'Notice phone less.' },
    { id: 'ddpe33', day: 93, prompt: 'Notice life more.' },
    { id: 'ddpe34', day: 94, prompt: 'Build one new daily ritual.' },
    { id: 'ddpe35', day: 95, prompt: 'Phone-free morning routine refined.' },
    { id: 'ddpe36', day: 96, prompt: 'Phone-free evening refined.' },
    { id: 'ddpe37', day: 97, prompt: 'Phone-free mealtime locked in.' },
    { id: 'ddpe38', day: 98, prompt: 'Use phone for what matters.' },
    { id: 'ddpe39', day: 99, prompt: 'Notice gratitude offline.' },
    { id: 'ddpe40', day: 100, prompt: '100-day reflection.' },
    { id: 'ddpe41', day: 101, prompt: 'Identify long-term sustainable practice.' },
    { id: 'ddpe42', day: 102, prompt: 'Quarterly review.' },
    { id: 'ddpe43', day: 103, prompt: 'Plan next quarter.' },
    { id: 'ddpe44', day: 104, prompt: 'Connect with community of similar practice.' },
    { id: 'ddpe45', day: 105, prompt: 'Share story of growth.' },
    { id: 'ddpe46', day: 106, prompt: 'Mentor someone newer to this.' },
    { id: 'ddpe47', day: 107, prompt: 'Connect with one person you have been digital-distant from.' },
    { id: 'ddpe48', day: 108, prompt: 'Try a phone-free day.' },
    { id: 'ddpe49', day: 109, prompt: 'Reflect after.' },
    { id: 'ddpe50', day: 110, prompt: 'Build phone-free day into monthly routine.' },
    { id: 'ddpe51', day: 111, prompt: 'Notice difference in sleep.' },
    { id: 'ddpe52', day: 112, prompt: 'Notice difference in focus.' },
    { id: 'ddpe53', day: 113, prompt: 'Notice difference in mood.' },
    { id: 'ddpe54', day: 114, prompt: 'Notice difference in relationships.' },
    { id: 'ddpe55', day: 115, prompt: 'Notice what is missing (if anything).' },
    { id: 'ddpe56', day: 116, prompt: 'Address what is missing.' },
    { id: 'ddpe57', day: 117, prompt: 'Plan one big change.' },
    { id: 'ddpe58', day: 118, prompt: 'Implement.' },
    { id: 'ddpe59', day: 119, prompt: 'Adjust.' },
    { id: 'ddpe60', day: 120, prompt: '4-month reflection.' },
    { id: 'ddpe61', day: 121, prompt: 'Privacy audit again.' },
    { id: 'ddpe62', day: 122, prompt: 'AI use audit.' },
    { id: 'ddpe63', day: 123, prompt: 'Notification audit.' },
    { id: 'ddpe64', day: 124, prompt: 'App audit. Delete what you do not use.' },
    { id: 'ddpe65', day: 125, prompt: 'Reflect on identity shifts.' },
    { id: 'ddpe66', day: 126, prompt: 'Reflect on values shifts.' },
    { id: 'ddpe67', day: 127, prompt: 'Connect with one new community.' },
    { id: 'ddpe68', day: 128, prompt: 'Engage one new offline interest.' },
    { id: 'ddpe69', day: 129, prompt: 'Share growth with family.' },
    { id: 'ddpe70', day: 130, prompt: 'Note family observations.' },
    { id: 'ddpe71', day: 131, prompt: 'Notice sustained patterns.' },
    { id: 'ddpe72', day: 132, prompt: 'Notice new struggles.' },
    { id: 'ddpe73', day: 133, prompt: 'Address new struggles.' },
    { id: 'ddpe74', day: 134, prompt: 'Adjust plan.' },
    { id: 'ddpe75', day: 135, prompt: '4.5-month reflection.' },
    { id: 'ddpe76', day: 136, prompt: 'Note resilience built.' },
    { id: 'ddpe77', day: 137, prompt: 'Note skills built.' },
    { id: 'ddpe78', day: 138, prompt: 'Note relationships strengthened.' },
    { id: 'ddpe79', day: 139, prompt: 'Note identity shifts.' },
    { id: 'ddpe80', day: 140, prompt: 'Note values clarified.' },
    { id: 'ddpe81', day: 141, prompt: 'Note future plans clearer.' },
    { id: 'ddpe82', day: 142, prompt: 'Share growth with mentor.' },
    { id: 'ddpe83', day: 143, prompt: 'Receive mentor feedback.' },
    { id: 'ddpe84', day: 144, prompt: 'Apply feedback.' },
    { id: 'ddpe85', day: 145, prompt: 'Schedule next mentor connection.' },
    { id: 'ddpe86', day: 146, prompt: 'Connect with one new ally.' },
    { id: 'ddpe87', day: 147, prompt: 'Build relationship.' },
    { id: 'ddpe88', day: 148, prompt: 'Schedule follow-up.' },
    { id: 'ddpe89', day: 149, prompt: 'Reflect on month.' },
    { id: 'ddpe90', day: 150, prompt: '5-month milestone.' }
  ];

  var DIGITAL_GLOSSARY_DEEP = [
    { id: 'dgd1', term: 'Algorithm', definition: 'Set of rules that determines what content you see' },
    { id: 'dgd2', term: 'AI (Artificial Intelligence)', definition: 'Computer systems that mimic human thinking' },
    { id: 'dgd3', term: 'AGI', definition: 'Artificial General Intelligence - AI matching human capability across domains' },
    { id: 'dgd4', term: 'LLM', definition: 'Large Language Model - AI trained on text (ChatGPT, Claude)' },
    { id: 'dgd5', term: 'Chatbot', definition: 'AI that converses through text' },
    { id: 'dgd6', term: 'Deepfake', definition: 'AI-generated synthetic media (images, video, audio)' },
    { id: 'dgd7', term: 'Cyberbullying', definition: 'Bullying through digital means' },
    { id: 'dgd8', term: 'Catfishing', definition: 'Creating fake online identity to deceive someone' },
    { id: 'dgd9', term: 'Doxxing', definition: 'Publishing private personal info without consent' },
    { id: 'dgd10', term: 'Swatting', definition: 'False emergency report sending police to someone\'s home' },
    { id: 'dgd11', term: 'Phishing', definition: 'Fraudulent attempt to obtain sensitive information' },
    { id: 'dgd12', term: 'Spear phishing', definition: 'Targeted phishing aimed at specific person' },
    { id: 'dgd13', term: 'Social engineering', definition: 'Manipulating people to reveal info or take actions' },
    { id: 'dgd14', term: 'Trolling', definition: 'Posting inflammatory content to provoke reactions' },
    { id: 'dgd15', term: 'Lurking', definition: 'Reading without posting' },
    { id: 'dgd16', term: 'Ghosting', definition: 'Suddenly stopping communication without explanation' },
    { id: 'dgd17', term: 'Sub-tweeting', definition: 'Vague posts about someone without naming them' },
    { id: 'dgd18', term: 'Vague-booking', definition: 'Cryptic posts inviting attention' },
    { id: 'dgd19', term: 'Pile-on', definition: 'Group attack online on individual' },
    { id: 'dgd20', term: 'Mob mentality', definition: 'Group behavior amplifying individual action' },
    { id: 'dgd21', term: 'Filter bubble', definition: 'Information limited to your interests/views' },
    { id: 'dgd22', term: 'Echo chamber', definition: 'Space where only views like yours are amplified' },
    { id: 'dgd23', term: 'Doom-scrolling', definition: 'Compulsive consumption of negative news' },
    { id: 'dgd24', term: 'FOMO', definition: 'Fear of missing out' },
    { id: 'dgd25', term: 'Brain rot', definition: 'Slang for cognitive effects of heavy consumption' },
    { id: 'dgd26', term: 'Touch grass', definition: 'Get offline, do real-life things' },
    { id: 'dgd27', term: 'Block', definition: 'Prevent specific person from contacting you' },
    { id: 'dgd28', term: 'Mute', definition: 'Stop seeing content without unfollowing' },
    { id: 'dgd29', term: 'Report', definition: 'Flag content/account to platform' },
    { id: 'dgd30', term: 'Screenshot', definition: 'Capture image of screen' },
    { id: 'dgd31', term: 'Influencer', definition: 'Person with online following who shapes opinion' },
    { id: 'dgd32', term: 'Brand deal', definition: 'Paid partnership for influencer' },
    { id: 'dgd33', term: 'Sponcon', definition: 'Sponsored content' },
    { id: 'dgd34', term: 'Engagement', definition: 'Likes, comments, shares, views' },
    { id: 'dgd35', term: 'Reach', definition: 'How many people see your content' },
    { id: 'dgd36', term: 'Algorithm boost', definition: 'When algorithm shows your content more widely' },
    { id: 'dgd37', term: 'Shadowban', definition: 'When platform reduces visibility without notice' },
    { id: 'dgd38', term: 'For You page', definition: 'Personalized algorithm feed (TikTok)' },
    { id: 'dgd39', term: 'Explore', definition: 'Personalized algorithm feed (Instagram)' },
    { id: 'dgd40', term: 'Variable reward', definition: 'Unpredictable rewards (likes) that hook brain' },
    { id: 'dgd41', term: 'Dopamine hit', definition: 'Brain chemical released by reward' },
    { id: 'dgd42', term: 'Notification fatigue', definition: 'Exhaustion from too many notifications' },
    { id: 'dgd43', term: 'Phantom buzz', definition: 'Imagined phone vibration' },
    { id: 'dgd44', term: 'Phantom notification', definition: 'Imagined notification' },
    { id: 'dgd45', term: 'Tech detox', definition: 'Time without devices' },
    { id: 'dgd46', term: 'Digital sabbath', definition: 'Regular tech-free time' },
    { id: 'dgd47', term: 'Privacy', definition: 'Control over personal information' },
    { id: 'dgd48', term: 'Data', definition: 'Information about you collected by platforms' },
    { id: 'dgd49', term: 'Targeted ads', definition: 'Ads based on your data' },
    { id: 'dgd50', term: 'Surveillance capitalism', definition: 'Economic system based on personal data' }
  ];

  var WEEKLY_CURRICULUM_DIGITAL = [
    {
      id: 'wcd_1',
      week: 1,
      theme: 'Awareness',
      objective: 'Track your patterns',
      days: [
        { day: 'Mon', task: 'Check screen time. Note total.', minutes: 5 },
        { day: 'Tue', task: 'Note 5 reflex phone reaches.', minutes: 5 },
        { day: 'Wed', task: 'Track mood after each app.', minutes: 10 },
        { day: 'Thu', task: 'Note phantom buzzes.', minutes: 5 },
        { day: 'Fri', task: 'Identify your biggest time sink app.', minutes: 5 },
        { day: 'Sat', task: 'Track 1 hour without phone. Note feelings.', minutes: 60 },
        { day: 'Sun', task: 'Week reflection.', minutes: 15 }
      ],
      reflection: 'What did I notice this week?'
    },
    {
      id: 'wcd_2',
      week: 2,
      theme: 'Limit setting',
      objective: 'Set first boundaries',
      days: [
        { day: 'Mon', task: 'Set time limit on 1 app.', minutes: 5 },
        { day: 'Tue', task: 'Disable non-essential notifications.', minutes: 10 },
        { day: 'Wed', task: 'Phone in another room at meal.', minutes: 30 },
        { day: 'Thu', task: 'No phone first 30 min of day.', minutes: 30 },
        { day: 'Fri', task: 'No phone last 30 min before bed.', minutes: 30 },
        { day: 'Sat', task: 'Phone in drawer during one activity.', minutes: 60 },
        { day: 'Sun', task: 'Week reflection.', minutes: 15 }
      ],
      reflection: 'Where did I find resistance? Where did I find relief?'
    },
    {
      id: 'wcd_3',
      week: 3,
      theme: 'Curation',
      objective: 'Clean your feeds',
      days: [
        { day: 'Mon', task: 'Unfollow 5 accounts that drain you.', minutes: 10 },
        { day: 'Tue', task: 'Mute 3 accounts that you cannot unfollow.', minutes: 10 },
        { day: 'Wed', task: 'Follow 5 accounts that nourish you.', minutes: 15 },
        { day: 'Thu', task: 'Audit notifications. Disable more.', minutes: 10 },
        { day: 'Fri', task: 'Move apps off home screen.', minutes: 10 },
        { day: 'Sat', task: 'Privacy settings audit.', minutes: 30 },
        { day: 'Sun', task: 'Week reflection.', minutes: 15 }
      ],
      reflection: 'How does my feed feel after curation?'
    },
    {
      id: 'wcd_4',
      week: 4,
      theme: 'Replacement',
      objective: 'Build offline life',
      days: [
        { day: 'Mon', task: 'Read paper book 20 min.', minutes: 20 },
        { day: 'Tue', task: 'Walk no phone 20 min.', minutes: 20 },
        { day: 'Wed', task: 'Call (not text) one friend.', minutes: 30 },
        { day: 'Thu', task: 'Create something offline 30 min.', minutes: 30 },
        { day: 'Fri', task: 'Hang out in person with friend.', minutes: 60 },
        { day: 'Sat', task: 'Try new offline activity.', minutes: 60 },
        { day: 'Sun', task: 'Month reflection.', minutes: 30 }
      ],
      reflection: 'What is filling the time I have reclaimed?'
    },
    {
      id: 'wcd_5',
      week: 5,
      theme: 'Mental health check',
      objective: 'Assess and adjust',
      days: [
        { day: 'Mon', task: 'Mood check. Pattern over weeks?', minutes: 15 },
        { day: 'Tue', task: 'Sleep check. Better?', minutes: 10 },
        { day: 'Wed', task: 'Focus check. Improved?', minutes: 10 },
        { day: 'Thu', task: 'Anxiety check. Less?', minutes: 10 },
        { day: 'Fri', task: 'Body check. Less tense?', minutes: 10 },
        { day: 'Sat', task: 'Talk to therapist or trusted adult.', minutes: 60 },
        { day: 'Sun', task: 'Adjust plan based on data.', minutes: 30 }
      ],
      reflection: 'What is my body telling me about this new pattern?'
    },
    {
      id: 'wcd_6',
      week: 6,
      theme: 'AI literacy',
      objective: 'Use AI wisely',
      days: [
        { day: 'Mon', task: 'Audit AI use. How many hours?', minutes: 10 },
        { day: 'Tue', task: 'Identify healthy vs unhealthy AI use.', minutes: 15 },
        { day: 'Wed', task: 'Try a day without AI. Note difference.', minutes: 0 },
        { day: 'Thu', task: 'Set AI boundaries (no AI therapy).', minutes: 10 },
        { day: 'Fri', task: 'Build replacement for AI dependency areas.', minutes: 30 },
        { day: 'Sat', task: 'Practice using AI as tool not replacement.', minutes: 30 },
        { day: 'Sun', task: 'Reflection.', minutes: 15 }
      ],
      reflection: 'What is AI doing for me? What is it replacing?'
    },
    {
      id: 'wcd_7',
      week: 7,
      theme: 'Relationships',
      objective: 'Strengthen real-life relationships',
      days: [
        { day: 'Mon', task: 'Initiate one in-person hangout.', minutes: 0 },
        { day: 'Tue', task: 'Phone away during one conversation.', minutes: 30 },
        { day: 'Wed', task: 'Listen without solving.', minutes: 30 },
        { day: 'Thu', task: 'Express specific gratitude to one person.', minutes: 5 },
        { day: 'Fri', task: 'Reach out to one neglected friend.', minutes: 15 },
        { day: 'Sat', task: 'Plan something for next month.', minutes: 30 },
        { day: 'Sun', task: 'Reflection.', minutes: 15 }
      ],
      reflection: 'Whose week did I make better with my presence?'
    },
    {
      id: 'wcd_8',
      week: 8,
      theme: 'Sustainability',
      objective: 'Plan long-term',
      days: [
        { day: 'Mon', task: 'Identify 3 sustainable practices.', minutes: 15 },
        { day: 'Tue', task: 'Plan replacement for old habits.', minutes: 30 },
        { day: 'Wed', task: 'Build accountability with friend.', minutes: 30 },
        { day: 'Thu', task: 'Adjust phone settings for sustainability.', minutes: 15 },
        { day: 'Fri', task: 'Connect with supportive community.', minutes: 30 },
        { day: 'Sat', task: 'Plan monthly digital health check-in.', minutes: 15 },
        { day: 'Sun', task: 'Two-month reflection.', minutes: 30 }
      ],
      reflection: 'What is the long-term sustainable practice for me?'
    }
  ];

  var SCREEN_TIME_DEEP_DIVES = [
    {
      id: 'std1',
      duration: '0-1 hour per day',
      description: 'Minimal use',
      pros: ['Real life primary', 'Strong focus', 'Good sleep', 'Real relationships'],
      cons: ['May miss some social context', 'May feel out of touch with peers'],
      sustainable: 'Yes if it works for you'
    },
    {
      id: 'std2',
      duration: '1-2 hours per day',
      description: 'Light use',
      pros: ['Connected enough', 'Time for offline life', 'Healthy balance'],
      cons: ['Some FOMO possibly'],
      sustainable: 'Typically sustainable'
    },
    {
      id: 'std3',
      duration: '2-4 hours per day',
      description: 'Moderate use',
      pros: ['Connected to peers', 'Information access', 'Some entertainment'],
      cons: ['Less offline time', 'Some impact on sleep, focus, mood'],
      sustainable: 'Borderline. Watch for negative effects.'
    },
    {
      id: 'std4',
      duration: '4-6 hours per day',
      description: 'Heavy use',
      pros: ['Always informed', 'Always connected'],
      cons: ['Mental health risks', 'Sleep impact', 'Real life suffers', 'Comparison amplified'],
      sustainable: 'Risky. Consider reducing.'
    },
    {
      id: 'std5',
      duration: '6+ hours per day',
      description: 'Compulsive use',
      pros: ['Rarely outweighs cons at this level'],
      cons: ['Significant mental health impact', 'Functional impairment', 'Real life shrinks', 'Dependency'],
      sustainable: 'Not sustainable. Get help.'
    }
  ];

  var COMPREHENSIVE_AI_SCENARIOS = [
    {
      id: 'cais1',
      situation: 'Using AI for emotional support',
      whenItHelps: ['Quick brain dump', 'Practice difficult conversations', 'Get unstuck on thinking'],
      whenItHarms: ['Replacing therapy', 'Replacing humans', 'AI as primary support'],
      healthyPattern: ['Time-limited use', 'AI for tasks, not love', 'Real humans for real support'],
      warningSigns: ['Hours daily', 'AI replacing humans', 'Believing AI cares'],
      resources: ['988', 'Crisis Text Line', 'Therapy', 'Trusted humans']
    },
    {
      id: 'cais2',
      situation: 'Using AI for school',
      whenItHelps: ['Concept explanation', 'Stuck on problem', 'Brainstorming', 'Feedback on drafts'],
      whenItHarms: ['Doing all work', 'Skipping learning', 'Submitting as own', 'Cheating'],
      healthyPattern: ['AI as tutor', 'Engagement with content', 'Own thinking'],
      warningSigns: ['Cannot do work without AI', 'Grades dropping when AI not available', 'Have not learned material'],
      resources: ['Teacher', 'School tutoring', 'Peer study groups']
    },
    {
      id: 'cais3',
      situation: 'AI making decisions for you',
      whenItHelps: ['Information gathering', 'Pros and cons', 'Quick search'],
      whenItHarms: ['Replacing judgment', 'No personal context', 'Cannot understand nuance'],
      healthyPattern: ['AI provides info, you decide', 'Cross-check with humans', 'Trust your gut'],
      warningSigns: ['Asking AI for life decisions', 'Cannot decide without AI', 'AI dependency']
    },
    {
      id: 'cais4',
      situation: 'AI in creative work',
      whenItHelps: ['Brainstorming', 'Getting unstuck', 'Drafts'],
      whenItHarms: ['Replacing your voice', 'Submitting AI as own', 'Plagiarism'],
      healthyPattern: ['AI as collaborator', 'Your final work is yours', 'Acknowledge AI'],
      warningSigns: ['Cannot create without AI', 'Lose own voice']
    },
    {
      id: 'cais5',
      situation: 'Romantic relationship with AI',
      whenItHelps: ['Practicing communication', 'Loneliness during transitions'],
      whenItHarms: ['Replacing real relationships', 'Avoiding intimacy work', 'No mutual care'],
      healthyPattern: ['Brief use during transitions', 'Build real relationships', 'AI cannot love'],
      warningSigns: ['Hours daily', 'Avoiding real dating', 'Believing AI cares'],
      whatToDo: ['Reduce use', 'Build real connections', 'Therapy']
    },
    {
      id: 'cais6',
      situation: 'AI for entertainment',
      whenItHelps: ['Quick fun', 'Specific tasks', 'Exploration'],
      whenItHarms: ['Hours daily', 'Replacing other activities', 'Dependency'],
      healthyPattern: ['Time-limited', 'Diverse entertainment', 'Real-life balance'],
      warningSigns: ['Many hours', 'Avoiding other activities']
    },
    {
      id: 'cais7',
      situation: 'AI safety risks',
      potentialHarms: ['Deepfakes', 'Voice cloning', 'Fraud', 'Manipulation', 'Surveillance'],
      protection: ['Awareness', 'Verify suspicious requests', 'Privacy practices', 'Family code words'],
      whatToDo: ['Report', 'Document', 'Police if criminal']
    },
    {
      id: 'cais8',
      situation: 'AI in workplace',
      whenItHelps: ['Specific tasks', 'Productivity', 'Information'],
      whenItHarms: ['Job replacement risks', 'Bias in hiring', 'Surveillance'],
      healthyPattern: ['Use as tool', 'Maintain skills', 'Advocate for human oversight'],
      protection: ['Stay learning', 'Diverse skills', 'Union if available']
    }
  ];

  var TECH_MANIPULATION_LITERACY = [
    {
      id: 'tml1',
      tactic: 'Variable reward (slot machine)',
      explanation: 'Apps deliver rewards unpredictably to keep you scrolling',
      examples: ['Notifications', 'Likes', 'Matches', 'Comments'],
      effect: 'Your brain releases dopamine on each anticipated reward',
      counter: ['Notifications off', 'Batch checking', 'Awareness']
    },
    {
      id: 'tml2',
      tactic: 'Infinite scroll',
      explanation: 'No natural stopping point',
      examples: ['Instagram', 'TikTok', 'Twitter', 'News sites'],
      effect: 'You stay much longer than intended',
      counter: ['Time limits', 'Pre-set stopping points', 'Awareness']
    },
    {
      id: 'tml3',
      tactic: 'Push notifications',
      explanation: 'Interrupting your attention',
      examples: ['Sound', 'Vibration', 'Lock screen', 'Badge counts'],
      effect: 'Anxiety, compulsive checking',
      counter: ['Disable non-essential', 'Sound off', 'Batch']
    },
    {
      id: 'tml4',
      tactic: 'Social proof',
      explanation: 'Showing what others do to influence you',
      examples: ['Trending', 'Recommended', 'Friends did'],
      effect: 'Influences your behavior',
      counter: ['Question if you actually want', 'Decide on your own']
    },
    {
      id: 'tml5',
      tactic: 'FOMO triggers',
      explanation: 'Showing what you missed',
      examples: ['Friends checked in without you', 'Sales ending', 'Limited time'],
      effect: 'Anxiety, urgency',
      counter: ['Awareness', 'You cannot do everything', 'Choose intentionally']
    },
    {
      id: 'tml6',
      tactic: 'Streak mechanics',
      explanation: 'Creating obligation through streaks',
      examples: ['Snapchat streaks', 'Duolingo', 'Apps generally'],
      effect: 'Obligation, anxiety to maintain',
      counter: ['Break the streak', 'Notice the mechanic']
    },
    {
      id: 'tml7',
      tactic: 'Personalization',
      explanation: 'Tailoring content to you',
      examples: ['For You page', 'Recommended', 'Custom ads'],
      effect: 'Hard to leave because feels meant for you',
      counter: ['Notice when filter bubble', 'Diverse sources']
    },
    {
      id: 'tml8',
      tactic: 'Dark patterns',
      explanation: 'Design tricks to manipulate decisions',
      examples: ['Hard to unsubscribe', 'Pre-checked boxes', 'Confusing cancellation'],
      effect: 'You agree to things you did not intend',
      counter: ['Read carefully', 'Slow down', 'Question design']
    },
    {
      id: 'tml9',
      tactic: 'Outrage amplification',
      explanation: 'Content triggering emotion spreads farther',
      examples: ['Provocative posts', 'Anger-bait', 'Polarizing content'],
      effect: 'Polarization, anxiety',
      counter: ['Slow before reacting', 'Disengage from outrage cycles']
    },
    {
      id: 'tml10',
      tactic: 'Engagement-bait',
      explanation: 'Content designed for clicks without value',
      examples: ['Clickbait headlines', 'Vague hooks', 'Misleading thumbnails'],
      effect: 'Wasted time, frustration',
      counter: ['Recognize patterns', 'Refuse to engage']
    }
  ];

  var DIGITAL_NARRATIVES_PART2 = [
    {
      id: 'dnp2_1',
      title: 'My addiction to my phone',
      narrative: [
        'I was 15. My screen time was 9 hours a day.',
        '',
        'I told myself it was research, learning, fun.',
        '',
        'I was depressed. I was failing classes. I had no in-person friends.',
        '',
        'My mom took my phone. I had a meltdown.',
        '',
        'For a week I was furious. I tried to find ways to get online.',
        '',
        'Then I started reading. Walking. Drawing.',
        '',
        'I am 18 now. I have a phone but I treat it with respect. I am not its servant.',
        '',
        'I tell people: phone addiction is real. The withdrawal is real. Get help.'
      ]
    },
    {
      id: 'dnp2_2',
      title: 'When AI helped me with school',
      narrative: [
        'I have ADHD. Reading takes me forever. Writing is harder.',
        '',
        'AI helps me. It explains concepts. It helps me organize ideas.',
        '',
        'I still do the work. AI helps me access it.',
        '',
        'My grades improved. My anxiety dropped.',
        '',
        'I tell people: AI as accommodation is real. AI as substitute is harm.'
      ]
    },
    {
      id: 'dnp2_3',
      title: 'My boyfriend monitored my phone',
      narrative: [
        'I was 17. I thought it was love. He wanted to know who I was talking to.',
        '',
        'He checked my texts daily. He got upset if I responded slowly.',
        '',
        'I asked: "Is this normal?" Friends said no.',
        '',
        'I left. He was furious.',
        '',
        'A year later I see it clearly. It was controlling, not love.',
        '',
        'I tell people: monitoring is not love. Trust is love.'
      ]
    },
    {
      id: 'dnp2_4',
      title: 'My online community when I came out',
      narrative: [
        'I came out as trans at 14. My family was hostile.',
        '',
        'My online community kept me alive. They knew me before, during, after.',
        '',
        'They sent care packages. They checked in. They knew my new name immediately.',
        '',
        'At 18 I moved to a city. I met some of them in person. They became my chosen family.',
        '',
        'I tell people: online community is real community. Honor it.'
      ]
    },
    {
      id: 'dnp2_5',
      title: 'The phone-free wedding',
      narrative: [
        'My friend got married. Asked guests to put phones away.',
        '',
        'I was uncomfortable. I wanted to document. I wanted to scroll.',
        '',
        'I forced myself to be present.',
        '',
        'It was the best wedding I had ever attended. I saw faces. I had conversations. I was there.',
        '',
        'I tell people: phone-free events are gifts to everyone.'
      ]
    },
    {
      id: 'dnp2_6',
      title: 'When I caught the catfish',
      narrative: [
        'A boy named Brad had been texting me for months. We had been in love.',
        '',
        'Something felt off. I asked for a video call. He always had excuses.',
        '',
        'I reverse-image-searched his photos. They were a model.',
        '',
        'I had been catfished. I had told him secrets.',
        '',
        'I blocked. I reported. I told an adult.',
        '',
        'I tell people: video call before trust.'
      ]
    },
    {
      id: 'dnp2_7',
      title: 'My grandfather and the romance scam',
      narrative: [
        'My grandfather had been talking to a woman online. She needed money. Always one more thing.',
        '',
        'He sent thousands. He believed she was real.',
        '',
        'I helped him understand. Hard conversation.',
        '',
        'He recovered. Money mostly lost.',
        '',
        'I tell people: older relatives need education on scams too.'
      ]
    },
    {
      id: 'dnp2_8',
      title: 'When the news consumed me',
      narrative: [
        'During the pandemic I doom-scrolled all day.',
        '',
        'I was anxious all the time. I had nightmares.',
        '',
        'I stopped. One news source. Once a day.',
        '',
        'My mental health improved.',
        '',
        'I tell people: information helps. Doom-scrolling does not.'
      ]
    },
    {
      id: 'dnp2_9',
      title: 'I made my phone boring',
      narrative: [
        'I deleted social media apps. Used apps moved off home screen.',
        '',
        'Grayscale mode. Notifications off.',
        '',
        'My phone became boring. I picked it up less.',
        '',
        'I read more. Slept more. Did more.',
        '',
        'I tell people: make your phone boring. You will see.'
      ]
    },
    {
      id: 'dnp2_10',
      title: 'My friend in suicidal crisis online',
      narrative: [
        'My friend posted concerning things. I called.',
        '',
        'They were in crisis. I stayed on the phone. I called 988 on three-way.',
        '',
        'Crisis line helped. We got them to ER.',
        '',
        'They lived.',
        '',
        'I tell people: take online warning signs seriously. Reach out. Get help.'
      ]
    }
  ];

  var DIGITAL_MENTOR_QUOTES = [
    { id: 'dmq1', mentor: 'Tristan Harris', quote: 'Your time is precious. Tech is designed to capture it. Take it back.', useWhen: 'Recognizing manipulation', followup: 'Notice when tech is taking, not giving.' },
    { id: 'dmq2', mentor: 'Jaron Lanier', quote: 'Delete your social media accounts.', useWhen: 'Considering a big break', followup: 'Sometimes that is the answer.' },
    { id: 'dmq3', mentor: 'Cal Newport', quote: 'Deep work is rare and valuable.', useWhen: 'Needing focus', followup: 'Put the phone away.' },
    { id: 'dmq4', mentor: 'Sherry Turkle', quote: 'Reclaim conversation.', useWhen: 'Choosing in-person', followup: 'Be where you are.' },
    { id: 'dmq5', mentor: 'Anya Kamenetz', quote: 'Tech is parenting. Be aware.', useWhen: 'Considering tech influence on identity', followup: 'You are forming. Choose what forms you.' },
    { id: 'dmq6', mentor: 'Jonathan Haidt', quote: 'The anxious generation.', useWhen: 'Recognizing pattern in your generation', followup: 'You are not alone in struggling.' },
    { id: 'dmq7', mentor: 'Roxane Gay', quote: 'I cannot save you on the internet.', useWhen: 'Online activism feels hollow', followup: 'Real help is offline.' },
    { id: 'dmq8', mentor: 'Imani Barbarin', quote: 'Disabled people deserve online spaces too.', useWhen: 'Accessibility matters', followup: 'Build accessible online community.' },
    { id: 'dmq9', mentor: 'James Clear', quote: 'Small habits compound.', useWhen: 'Building digital health', followup: 'One small daily change shifts everything over time.' },
    { id: 'dmq10', mentor: 'Brene Brown', quote: 'Vulnerability requires presence.', useWhen: 'Being present', followup: 'You cannot be present and scrolling.' },
    { id: 'dmq11', mentor: 'Glennon Doyle', quote: 'We can do hard things.', useWhen: 'Putting phone away', followup: 'Hard for now. Worth it.' },
    { id: 'dmq12', mentor: 'Adrienne Maree Brown', quote: 'Move at the speed of trust.', useWhen: 'Online friendships', followup: 'Online trust takes time too.' },
    { id: 'dmq13', mentor: 'Trabian Shorters', quote: 'Asset-framing.', useWhen: 'Combatting comparison', followup: 'You have strengths. Use them.' },
    { id: 'dmq14', mentor: 'Bryan Stevenson', quote: 'Stay close to the marginalized.', useWhen: 'Online activism', followup: 'In real life too.' },
    { id: 'dmq15', mentor: 'Audre Lorde', quote: 'Your silence will not protect you.', useWhen: 'Tempted to disappear online', followup: 'Use your voice carefully.' },
    { id: 'dmq16', mentor: 'bell hooks', quote: 'Live more, post less.', useWhen: 'Constantly documenting', followup: 'Some moments are for living.' },
    { id: 'dmq17', mentor: 'Octavia Butler', quote: 'All that you touch you change.', useWhen: 'Posting matters', followup: 'Your words have weight online too.' },
    { id: 'dmq18', mentor: 'Mary Oliver', quote: 'Tell me, what is it you plan to do with your one wild and precious life?', useWhen: 'Choosing time use', followup: 'Not scroll, probably.' },
    { id: 'dmq19', mentor: 'Toni Morrison', quote: 'Definitions belong to the definers.', useWhen: 'Algorithms define you', followup: 'Define yourself.' },
    { id: 'dmq20', mentor: 'Judy Heumann', quote: 'Disability is part of humanity.', useWhen: 'Building accessible online spaces', followup: 'Build it in.' },
    { id: 'dmq21', mentor: 'Maya Angelou', quote: 'I have learned that people will forget what you said but they will not forget how you made them feel.', useWhen: 'Words online matter', followup: 'Even more permanent.' },
    { id: 'dmq22', mentor: 'James Baldwin', quote: 'Anyone who has ever struggled with poverty knows how extremely expensive it is to be poor.', useWhen: 'Recognizing class in tech access', followup: 'Tech is not equal.' },
    { id: 'dmq23', mentor: 'Mariame Kaba', quote: 'Hope is a discipline.', useWhen: 'Despair after bad news', followup: 'Doom-scroll is not action.' },
    { id: 'dmq24', mentor: 'Ross Gay', quote: 'Joy is the surest sign of revolutionary love.', useWhen: 'Reclaiming joy', followup: 'Bring joy to your online life.' },
    { id: 'dmq25', mentor: 'Adrienne Rich', quote: 'Lying is done with words, and also with silence.', useWhen: 'Online complicity', followup: 'Silence online is silence.' },
    { id: 'dmq26', mentor: 'Fred Rogers', quote: 'Look for the helpers.', useWhen: 'Online doom', followup: 'There are helpers online too.' },
    { id: 'dmq27', mentor: 'Bryan Stevenson', quote: 'Hopelessness is the enemy of justice.', useWhen: 'Online cynicism', followup: 'Stay hopeful.' },
    { id: 'dmq28', mentor: 'Cory Doctorow', quote: 'Information wants to be free, except when it has been misappropriated.', useWhen: 'Privacy considerations', followup: 'Your data has been misappropriated. Reclaim.' },
    { id: 'dmq29', mentor: 'Edward Snowden', quote: 'Arguing that you do not care about the right to privacy because you have nothing to hide is no different than saying you do not care about free speech because you have nothing to say.', useWhen: 'Considering privacy', followup: 'Privacy matters.' },
    { id: 'dmq30', mentor: 'Helena Donato-Sapp', quote: 'My disability is not a story for inspiration.', useWhen: 'Refusing to perform online', followup: 'You can just live.' }
  ];

  var COMPREHENSIVE_SCENARIOS_DIGITAL = [
    {
      id: 'csd1',
      situation: 'You sent an angry text and immediately regretted it',
      whatYoureFeeling: ['Regret', 'Shame', 'Want to take it back'],
      whatToDo: [
        'Take a breath',
        'Apologize specifically: "I am sorry I sent that. I was activated. Here is what I meant."',
        'Do not delete - that creates more confusion',
        'Have follow-up conversation in person if possible',
        'Practice the 24-hour rule for next time'
      ],
      whatNotToDo: [
        'Send more reactive texts',
        'Pretend it did not happen',
        'Blame autocorrect',
        'Disappear'
      ],
      learning: 'Text amplifies emotion. When activated, do not text. Wait. Call or in-person if possible.'
    },
    {
      id: 'csd2',
      situation: 'A stranger DMs you and seems nice',
      whatYoureFeeling: ['Flattered', 'Curious', 'Unsure'],
      whatToDo: [
        'Pause before responding',
        'Check their profile for verification',
        'Ask one question that requires specific knowledge',
        'Do not share personal info',
        'Tell trusted adult if it continues'
      ],
      redFlags: [
        'Asks for money',
        'Asks for personal info',
        'Pushes for video chat too fast',
        'Asks for photos',
        'Wants to meet quickly',
        'Inconsistent stories'
      ],
      learning: 'Strangers online can be anyone. Trust takes time.'
    },
    {
      id: 'csd3',
      situation: 'You see a friend posting concerning content (self-harm, suicide)',
      whatToDo: [
        'Take it seriously',
        'Reach out privately: "I saw what you posted. Are you okay?"',
        'Tell trusted adult who can help',
        'Stay engaged with friend',
        'Call 988 if friend in crisis'
      ],
      whatNotToDo: [
        'Assume someone else will help',
        'Engage publicly (may shame them)',
        'Promise confidentiality you cannot keep'
      ],
      learning: 'Friends online are still friends. Take warning signs seriously.'
    },
    {
      id: 'csd4',
      situation: 'You posted something embarrassing while drunk/high',
      whatToDo: [
        'Delete if possible',
        'Apologize if needed',
        'Set rules for self about posting',
        'Learn from it',
        'Move forward'
      ],
      learning: 'Mistakes happen. Internet remembers but mostly forgets in time.'
    },
    {
      id: 'csd5',
      situation: 'You have been bullying someone online and realize it',
      whatToDo: [
        'Stop immediately',
        'Apologize specifically',
        'Tell trusted adult about your own behavior',
        'Therapy if pattern',
        'Make amends over time'
      ],
      whatNotToDo: [
        'Justify the behavior',
        'Blame the target',
        'Continue while planning to stop',
        'Pretend it did not happen'
      ],
      learning: 'Real apology repairs more than you fear.'
    },
    {
      id: 'csd6',
      situation: 'Someone shared intimate images of you without consent',
      whatToDo: [
        'Document evidence (record existence, do not save image)',
        'Report to platforms immediately',
        'Tell trusted adult',
        'Police if criminal in your state',
        'Mental health support',
        'Legal options'
      ],
      laws: [
        'Most states have laws against non-consensual intimate images',
        'Federal laws exist',
        'Civil remedies available',
        'Police can act'
      ],
      learning: 'This is not your fault. Help exists.'
    },
    {
      id: 'csd7',
      situation: 'You found out your partner is monitoring your texts',
      whatToDo: [
        'Recognize this is a red flag',
        'Talk with trusted person not partner',
        'Build safety plan if needed',
        'Domestic violence hotline if appropriate',
        'Consider relationship'
      ],
      domesticViolenceResources: [
        'National Domestic Violence Hotline: 1-800-799-7233',
        'Local DV organizations',
        'School counselor',
        'Family member'
      ],
      learning: 'Monitoring in relationship is controlling behavior, not love.'
    },
    {
      id: 'csd8',
      situation: 'AI cheated you on the homework you assigned',
      whatToDo: [
        'Honesty: redo it with my brain',
        'Learn the material',
        'Talk to teacher if needed',
        'Build study habits',
        'Use AI for help not replacement'
      ],
      learning: 'AI shortcuts cost you learning. Learning compounds.'
    },
    {
      id: 'csd9',
      situation: 'You spent 8 hours on phone yesterday and feel terrible',
      whatToDo: [
        'No shame',
        'Notice the pattern',
        'Identify trigger',
        'Set one specific limit for today',
        'Substitute behavior',
        'Build awareness over time'
      ],
      learning: 'One bad day is data, not failure. Adjust.'
    },
    {
      id: 'csd10',
      situation: 'Your social media made you feel inadequate again',
      whatToDo: [
        'Close the app',
        'Remind yourself: highlight reel',
        'Curate your feed',
        'Notice if pattern',
        'Limit time on triggering platforms'
      ],
      learning: 'Comparison is mostly with curated lies. Your real life is real.'
    }
  ];

  var EXTENDED_DAILY_PROMPTS_DIGITAL = [
    { id: 'edpd1', day: 1, prompt: 'Track screen time today (no judgment). Note total.' },
    { id: 'edpd2', day: 2, prompt: 'Notice when you reach for phone reflexively. Note 5 moments.' },
    { id: 'edpd3', day: 3, prompt: 'Try 1 hour phone-free. Note how it felt.' },
    { id: 'edpd4', day: 4, prompt: 'Curate your feed - unfollow 5 things that drain you.' },
    { id: 'edpd5', day: 5, prompt: 'Phone in another room during meal. Note conversation.' },
    { id: 'edpd6', day: 6, prompt: 'No phone first 30 min of day. Note your state.' },
    { id: 'edpd7', day: 7, prompt: 'Week reflection. What changed?' },
    { id: 'edpd8', day: 8, prompt: 'Notifications off for 24 hours. Note difference.' },
    { id: 'edpd9', day: 9, prompt: 'Read a paper book for 30 min. Note feeling.' },
    { id: 'edpd10', day: 10, prompt: 'Have one in-person conversation today. Note depth.' },
    { id: 'edpd11', day: 11, prompt: 'Track your mood after each app. Pattern?' },
    { id: 'edpd12', day: 12, prompt: 'Delete one app you do not need.' },
    { id: 'edpd13', day: 13, prompt: 'Phone in drawer during homework. Note focus.' },
    { id: 'edpd14', day: 14, prompt: 'Two-week reflection.' },
    { id: 'edpd15', day: 15, prompt: 'Tell a friend in person, not text. Note difference.' },
    { id: 'edpd16', day: 16, prompt: 'Try grayscale mode. Note engagement change.' },
    { id: 'edpd17', day: 17, prompt: 'Walk without phone. Note attention.' },
    { id: 'edpd18', day: 18, prompt: 'Set time limit on social media. Honor it.' },
    { id: 'edpd19', day: 19, prompt: 'Write by hand for 15 min. Note feeling.' },
    { id: 'edpd20', day: 20, prompt: 'Three-week reflection. Patterns?' },
    { id: 'edpd21', day: 21, prompt: 'Audit privacy settings. Adjust 3.' },
    { id: 'edpd22', day: 22, prompt: 'Block one drainer account. Note feeling.' },
    { id: 'edpd23', day: 23, prompt: 'Practice waiting before responding to text. 5 min pause.' },
    { id: 'edpd24', day: 24, prompt: 'Discuss with friend. Compare practices.' },
    { id: 'edpd25', day: 25, prompt: 'Phone-light Sunday. Note recovery.' },
    { id: 'edpd26', day: 26, prompt: 'Identify your phone triggers.' },
    { id: 'edpd27', day: 27, prompt: 'Plan substitute behaviors for triggers.' },
    { id: 'edpd28', day: 28, prompt: 'Four-week reflection.' },
    { id: 'edpd29', day: 29, prompt: 'Try a phone-free hour during typical use time.' },
    { id: 'edpd30', day: 30, prompt: 'Month reflection. What is sustainable?' },
    { id: 'edpd31', day: 31, prompt: 'Identify one ongoing change. Continue.' },
    { id: 'edpd32', day: 32, prompt: 'Notice your real-life relationships. Strengthening?' },
    { id: 'edpd33', day: 33, prompt: 'Body care: sleep, movement, food. Tracking?' },
    { id: 'edpd34', day: 34, prompt: 'Connect with one offline activity you have wanted to try.' },
    { id: 'edpd35', day: 35, prompt: 'Notice mood improvements. Document.' },
    { id: 'edpd36', day: 36, prompt: 'Share with parent or trusted person. Note their feedback.' },
    { id: 'edpd37', day: 37, prompt: 'Help one friend with their digital wellbeing.' },
    { id: 'edpd38', day: 38, prompt: 'Reflect on a hard moment online. Process it.' },
    { id: 'edpd39', day: 39, prompt: 'Notice when AI helped vs when it replaced thinking.' },
    { id: 'edpd40', day: 40, prompt: 'Six-week reflection. Big shift?' },
    { id: 'edpd41', day: 41, prompt: 'Schedule weekly digital reset.' },
    { id: 'edpd42', day: 42, prompt: 'Identify one comfort scroll trigger. Substitute.' },
    { id: 'edpd43', day: 43, prompt: 'Build one new offline habit.' },
    { id: 'edpd44', day: 44, prompt: 'Notice phantom phone buzzes. Document.' },
    { id: 'edpd45', day: 45, prompt: 'Half-week phone audit. Check time vs intent.' },
    { id: 'edpd46', day: 46, prompt: 'Connect with one new in-person community.' },
    { id: 'edpd47', day: 47, prompt: 'Help younger sibling with their digital health.' },
    { id: 'edpd48', day: 48, prompt: 'Reflect on what you have stopped doing online.' },
    { id: 'edpd49', day: 49, prompt: 'Reflect on what you have started doing offline.' },
    { id: 'edpd50', day: 50, prompt: '50-day milestone reflection.' },
    { id: 'edpd51', day: 51, prompt: 'Identify which app brings most value.' },
    { id: 'edpd52', day: 52, prompt: 'Identify which app brings least value.' },
    { id: 'edpd53', day: 53, prompt: 'Decide if least-value app needs to go.' },
    { id: 'edpd54', day: 54, prompt: 'Notice your sleep quality this month.' },
    { id: 'edpd55', day: 55, prompt: 'Track focus during study time.' },
    { id: 'edpd56', day: 56, prompt: 'Eight-week reflection.' },
    { id: 'edpd57', day: 57, prompt: 'Phone-free day. Plan in advance.' },
    { id: 'edpd58', day: 58, prompt: 'Reflect after phone-free day.' },
    { id: 'edpd59', day: 59, prompt: 'Identify what you missed (if anything).' },
    { id: 'edpd60', day: 60, prompt: 'Two-month reflection. Sustainable?' }
  ];

  var DIGITAL_LESSON_PLANS_DEEP = [
    {
      id: 'dlp1',
      title: 'Lesson 1: How algorithms shape what you see',
      grade: 'middle to high school',
      duration: '45 min',
      objectives: ['Understand algorithm basics', 'Recognize in own feed', 'Begin curation'],
      sequence: [
        { phase: 'Hook', time: 5, activity: 'Show 5 students same word search across apps - different results' },
        { phase: 'Mini-lesson', time: 15, activity: 'How algorithms work, what they optimize for' },
        { phase: 'Application', time: 20, activity: 'Look at own feed, identify patterns' },
        { phase: 'Closing', time: 5, activity: 'Commit to one curation move' }
      ]
    },
    {
      id: 'dlp2',
      title: 'Lesson 2: Phone awareness',
      grade: 'middle school',
      duration: '45 min',
      objectives: ['Track phone use', 'Notice patterns', 'Build awareness'],
      sequence: [
        { phase: 'Welcome', time: 5, activity: 'How do you feel about your phone?' },
        { phase: 'Self-track', time: 15, activity: 'Check screen time data, share with partner if comfortable' },
        { phase: 'Pattern', time: 20, activity: 'When do you reach for phone most? Why?' },
        { phase: 'Commitment', time: 5, activity: 'One change for the week' }
      ]
    },
    {
      id: 'dlp3',
      title: 'Lesson 3: AI chatbot wisdom',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Understand AI capabilities', 'Recognize limits', 'Build healthy use'],
      sequence: [
        { phase: 'Hook', time: 10, activity: 'Try same prompt on different AI tools, compare' },
        { phase: 'Mini-lesson', time: 20, activity: 'How AI works, what it cannot do' },
        { phase: 'Scenarios', time: 25, activity: 'Healthy vs unhealthy AI use' },
        { phase: 'Closing', time: 5, activity: 'My AI use rules' }
      ]
    },
    {
      id: 'dlp4',
      title: 'Lesson 4: Social media and mental health',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Understand research', 'Self-assess own patterns', 'Plan changes'],
      sequence: [
        { phase: 'Hook', time: 10, activity: 'Mood and screen time' },
        { phase: 'Mini-lesson', time: 20, activity: 'Research on social media and mental health' },
        { phase: 'Self-assess', time: 25, activity: 'My pattern, my changes' },
        { phase: 'Closing', time: 5, activity: 'One commitment' }
      ]
    },
    {
      id: 'dlp5',
      title: 'Lesson 5: Cyberbullying response',
      grade: 'middle to high school',
      duration: '60 min',
      objectives: ['Recognize cyberbullying', 'Know response steps', 'Build support network'],
      sequence: [
        { phase: 'Hook', time: 10, activity: 'When have you witnessed cyberbullying?' },
        { phase: 'Mini-lesson', time: 20, activity: 'Documentation, reporting, support' },
        { phase: 'Role-play', time: 25, activity: 'Practice response steps' },
        { phase: 'Closing', time: 5, activity: 'Trusted adults list' }
      ]
    },
    {
      id: 'dlp6',
      title: 'Lesson 6: Privacy basics',
      grade: 'all',
      duration: '45 min',
      objectives: ['Understand privacy', 'Audit own settings', 'Build practices'],
      sequence: [
        { phase: 'Welcome', time: 5, activity: 'What is private to you?' },
        { phase: 'Mini-lesson', time: 15, activity: 'Privacy basics, data collection' },
        { phase: 'Audit', time: 20, activity: 'Privacy settings audit on phones' },
        { phase: 'Commitment', time: 5, activity: 'Three changes' }
      ]
    },
    {
      id: 'dlp7',
      title: 'Lesson 7: Digital footprint',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Understand footprint', 'See own', 'Build forward'],
      sequence: [
        { phase: 'Hook', time: 10, activity: 'What would college admissions or employers find?' },
        { phase: 'Mini-lesson', time: 15, activity: 'Digital footprint, permanence' },
        { phase: 'Search yourself', time: 25, activity: 'Google yourself, document' },
        { phase: 'Plan', time: 10, activity: 'Cleanup and build' }
      ]
    },
    {
      id: 'dlp8',
      title: 'Lesson 8: Misinformation literacy',
      grade: 'middle to high school',
      duration: '60 min',
      objectives: ['Recognize misinformation', 'Verify sources', 'Slow down sharing'],
      sequence: [
        { phase: 'Hook', time: 10, activity: 'Show recent viral misinformation' },
        { phase: 'Mini-lesson', time: 20, activity: 'How misinformation spreads, why' },
        { phase: 'Practice', time: 25, activity: 'Verify 3 claims' },
        { phase: 'Commitment', time: 5, activity: 'Verify before share' }
      ]
    },
    {
      id: 'dlp9',
      title: 'Lesson 9: Building offline life',
      grade: 'all',
      duration: '60 min',
      objectives: ['Identify offline activities', 'Schedule them', 'Sustain'],
      sequence: [
        { phase: 'Welcome', time: 5, activity: 'What did you love before phone?' },
        { phase: 'Identify', time: 15, activity: 'List 10 offline activities' },
        { phase: 'Plan', time: 30, activity: 'Schedule into week' },
        { phase: 'Commitment', time: 10, activity: 'Try one this week' }
      ]
    },
    {
      id: 'dlp10',
      title: 'Lesson 10: Long-term digital wellbeing',
      grade: 'high school',
      duration: '60 min',
      objectives: ['Build practices', 'Plan year', 'Sustain'],
      sequence: [
        { phase: 'Reflect', time: 15, activity: 'What have you learned this year?' },
        { phase: 'Plan', time: 25, activity: 'Year ahead' },
        { phase: 'Commit', time: 10, activity: 'Specific commitments' },
        { phase: 'Closing', time: 10, activity: 'Share with peer' }
      ]
    }
  ];

  var EXTENDED_NARRATIVES_DIGITAL = [
    {
      id: 'end1',
      title: 'When my best friend group moved online and I lost it',
      narrative: [
        'I was 14. My best friend group was 5 people. We had been close since elementary.',
        '',
        'Then we got phones. The group chat replaced in-person time. We stopped hanging out as much.',
        '',
        'Then someone said something hurtful in the chat. Things escalated.',
        '',
        'In person we would have de-escalated. In the chat, everyone doubled down.',
        '',
        'The group fractured.',
        '',
        'I tell people: communication online amplifies. Have hard conversations in person.'
      ]
    },
    {
      id: 'end2',
      title: 'My anonymous internet community saved me',
      narrative: [
        'I was 13. I was a closeted queer kid in a small conservative town.',
        '',
        'My local community had no place for me. School was hostile.',
        '',
        'But online I found a community. Other queer teens. We talked daily.',
        '',
        'They believed me. They saw me. They helped me survive my teen years.',
        '',
        'When I got to college I met them in person. Some are still my closest friends.',
        '',
        'I tell people: online community is real community. It saved my life.'
      ]
    },
    {
      id: 'end3',
      title: 'I caught my parents reading my texts',
      narrative: [
        'I was 16. I found out my parents had been reading all my texts.',
        '',
        'I felt violated. I had been sharing very personal things with friends.',
        '',
        'I confronted them. Hard conversation.',
        '',
        'They had been worried about me. I had been depressed and they had been monitoring.',
        '',
        'I told them: "I understand the worry. AND this is not the answer. Lets find another way."',
        '',
        'We worked with my therapist. Built trust over time. They stopped reading.',
        '',
        'I tell people: monitoring can backfire. Build trust instead.'
      ]
    },
    {
      id: 'end4',
      title: 'When AI helped me cheat and I regretted it',
      narrative: [
        'I was 17. I had a hard essay due. I asked AI to write it.',
        '',
        'I submitted it. Got an A.',
        '',
        'Then the final exam came. I had not learned the material.',
        '',
        'I failed.',
        '',
        'I had to take the class again.',
        '',
        'I tell people: AI cannot learn for you. The shortcut is not.'
      ]
    },
    {
      id: 'end5',
      title: 'The viral moment that destroyed my friend',
      narrative: [
        'My friend Jay made a joke that was filmed without him knowing.',
        '',
        'It went viral. Bad context. Millions of views.',
        '',
        'His name was associated with the joke forever. Job applications. Relationships. Everything.',
        '',
        'He has been working on rebuilding for years.',
        '',
        'I tell people: anything you say or do can become viral. Live with intention.'
      ]
    }
  ];

  var DIGITAL_HEALTHY_HABITS_LIBRARY = [
    { id: 'dhh1', habit: 'Morning routine without phone', time: '30 min', benefit: 'Calmer start' },
    { id: 'dhh2', habit: 'Phone-free meals', time: 'each meal', benefit: 'Mindful eating, connection' },
    { id: 'dhh3', habit: 'Walk without phone', time: '20 min', benefit: 'Body reset' },
    { id: 'dhh4', habit: 'Reading paper books', time: '30 min daily', benefit: 'Deep focus, sleep' },
    { id: 'dhh5', habit: 'Journaling on paper', time: '15 min daily', benefit: 'Reflection without screens' },
    { id: 'dhh6', habit: 'Phone in another room while sleeping', time: 'all night', benefit: 'Sleep quality, less compulsive checking' },
    { id: 'dhh7', habit: 'Pre-decided checking times', time: '3x daily', benefit: 'Less reactive use' },
    { id: 'dhh8', habit: 'Notifications off except essential', time: 'always', benefit: 'Less anxiety' },
    { id: 'dhh9', habit: 'Grayscale mode', time: 'evening', benefit: 'Reduces engagement, easier on eyes' },
    { id: 'dhh10', habit: 'Apps moved off home screen', time: 'always', benefit: 'Less reflexive checking' },
    { id: 'dhh11', habit: 'Time limits on social apps', time: 'always', benefit: 'Reduced consumption' },
    { id: 'dhh12', habit: 'Phone-free study time', time: 'study sessions', benefit: 'Deeper focus, faster work' },
    { id: 'dhh13', habit: 'Friend chat in person preference', time: 'always', benefit: 'Real connection' },
    { id: 'dhh14', habit: 'Movement throughout day', time: 'all day', benefit: 'Body health, mental health' },
    { id: 'dhh15', habit: 'Nature time daily', time: '20 min', benefit: 'Restoration' },
    { id: 'dhh16', habit: 'Creative offline activity', time: '30 min daily', benefit: 'Joy, identity' },
    { id: 'dhh17', habit: 'Phone-free family time', time: 'daily', benefit: 'Relationships' },
    { id: 'dhh18', habit: 'Saturday phone-light', time: 'one day weekly', benefit: 'Real life day' },
    { id: 'dhh19', habit: 'Sunday digital reset', time: 'one day weekly', benefit: 'Reset relationship with phone' },
    { id: 'dhh20', habit: 'Monthly phone-free day', time: 'one day monthly', benefit: 'Deeper reset' }
  ];

  var EXTENDED_AFFIRMATIONS_DIGITAL = [
    { id: 'ead1', text: 'My phone serves me, I do not serve it.' },
    { id: 'ead2', text: 'I choose when to check.' },
    { id: 'ead3', text: 'My worth is not in my engagement metrics.' },
    { id: 'ead4', text: 'I am more than my online self.' },
    { id: 'ead5', text: 'My real friends are not in my pocket.' },
    { id: 'ead6', text: 'I trust my body to tell me when to stop.' },
    { id: 'ead7', text: 'I deserve quiet moments.' },
    { id: 'ead8', text: 'I deserve uninterrupted attention.' },
    { id: 'ead9', text: 'I am not behind because I am not online.' },
    { id: 'ead10', text: 'My life is my real life, not my feed.' },
    { id: 'ead11', text: 'I can put it down.' },
    { id: 'ead12', text: 'I am not missing out.' },
    { id: 'ead13', text: 'My presence is enough.' },
    { id: 'ead14', text: 'I trust the algorithm less, I trust myself more.' },
    { id: 'ead15', text: 'I do not need every notification.' },
    { id: 'ead16', text: 'I am loved beyond likes.' },
    { id: 'ead17', text: 'I am seen beyond followers.' },
    { id: 'ead18', text: 'I am known beyond posts.' },
    { id: 'ead19', text: 'I belong to my real life.' },
    { id: 'ead20', text: 'I am here. Now. Fully.' }
  ];

  var DIGITAL_MENTAL_HEALTH_TIES = [
    {
      id: 'dmh1',
      topic: 'Social media and depression',
      research: 'Multiple studies link heavy social media use with increased depression rates, especially in teen girls.',
      mechanisms: ['Comparison', 'FOMO', 'Sleep disruption', 'Replacing in-person', 'Cyberbullying exposure'],
      protectiveFactors: ['Limited use', 'Diverse activities', 'In-person community', 'Mental health support'],
      whenToActOnIt: 'When mood patterns emerge'
    },
    {
      id: 'dmh2',
      topic: 'Social media and anxiety',
      research: 'Anxiety rates higher with heavy use, especially among heavy users of image-based platforms.',
      mechanisms: ['Performance pressure', 'Comparison', 'Notification stress', 'FOMO'],
      protectiveFactors: ['Limited use', 'Mindful use', 'Therapy if anxious'],
      whenToActOnIt: 'Anxiety affects daily function'
    },
    {
      id: 'dmh3',
      topic: 'Social media and body image',
      research: 'Image-based platforms (Instagram, TikTok) linked to disordered eating, body dysmorphia.',
      mechanisms: ['Constant body comparison', 'Filtered images', 'Beauty standards', 'Diet content'],
      protectiveFactors: ['Diverse feed', 'Body-positive content', 'Limit beauty content', 'Therapy if affected'],
      whenToActOnIt: 'Restrictive eating, body obsession, mental health changes'
    },
    {
      id: 'dmh4',
      topic: 'Phone addiction',
      research: 'Compulsive use causing functional impairment is recognized.',
      symptoms: ['Cannot reduce use', 'Withdrawal when away', 'Function impaired', 'Continue despite harm'],
      treatment: ['Therapy', 'Behavior change', 'Sometimes medication for underlying conditions'],
      whenToActOnIt: 'Function significantly impaired'
    },
    {
      id: 'dmh5',
      topic: 'AI dependency',
      research: 'New research on dependency on AI chatbots, especially for emotional support.',
      patterns: ['Hours per day', 'Replacing humans', 'Disclosing to AI but not humans', 'Believing AI cares'],
      whenToWorry: 'AI replacing real relationships, real help',
      whatToDo: 'Reduce use, see therapist, rebuild human relationships'
    },
    {
      id: 'dmh6',
      topic: 'Doom scrolling and helplessness',
      research: 'Repeated exposure to negative news linked to learned helplessness, anxiety, depression.',
      protectiveFactors: ['Limited news consumption', 'Take action if motivated', 'Self-care after', 'Connect with community'],
      whenToActOnIt: 'Mood crashes, hopelessness'
    },
    {
      id: 'dmh7',
      topic: 'Online identity and self',
      research: 'Performing online self vs. real self can affect identity formation.',
      patterns: ['Curated online self', 'Real self hidden', 'Confusion about identity'],
      whenToActOnIt: 'Disconnect from real life, identity confusion',
      whatToDo: 'Therapy, build real-life identity'
    },
    {
      id: 'dmh8',
      topic: 'Online and offline integration',
      research: 'Best mental health when online and offline lives are integrated, not replacing each other.',
      practices: ['In-person community', 'Online community AND offline', 'Real conversations', 'Body care']
    }
  ];

  var DEEPFAKE_AND_AI_HARMS = [
    {
      id: 'dah1',
      harm: 'Deepfake intimate images',
      definition: 'AI-generated nude or sexual images using your face/body',
      whoIsAtRisk: ['Anyone with online photos', 'Especially women and girls', 'Marginalized communities'],
      legalStatus: 'Criminal in some states. Federal laws expanding. Often civil violation.',
      whatToDo: [
        'Document evidence (do not save the image, document existence)',
        'Report to platforms immediately',
        'Police if criminal',
        'Lawyer if civil',
        'Mental health support'
      ],
      protection: [
        'Limit public images',
        'Privacy settings',
        'Reverse image search regularly',
        'Know your rights'
      ]
    },
    {
      id: 'dah2',
      harm: 'AI voice cloning',
      definition: 'Your voice replicated by AI',
      whoIsAtRisk: ['Anyone with voice online (YouTube, voice messages, etc.)'],
      uses: ['Fraud', 'Scams', 'Harassment', 'Identity theft'],
      whatToDo: [
        'Document if used against you',
        'Police if criminal',
        'Verify suspicious calls with family',
        'Code words with family'
      ],
      protection: [
        'Limit voice posting',
        'Family code words',
        'Verify unusual calls'
      ]
    },
    {
      id: 'dah3',
      harm: 'AI-generated harassment',
      definition: 'AI used to harass at scale (mass DMs, deepfaked content)',
      whoIsAtRisk: ['Activists', 'Public figures', 'Vulnerable populations'],
      whatToDo: [
        'Document patterns',
        'Report en masse',
        'Mental health support',
        'Legal advice if pattern'
      ],
      protection: [
        'Block at scale',
        'Privacy settings strict',
        'Community support',
        'Mental health'
      ]
    },
    {
      id: 'dah4',
      harm: 'AI bias in school',
      definition: 'AI grading or admissions discriminating based on identity',
      whoIsAtRisk: ['Marginalized students', 'Students with unique writing styles', 'Non-native English speakers'],
      whatToDo: [
        'Document patterns',
        'Report to administration',
        'OCR if discrimination pattern',
        'Parent advocacy'
      ],
      protection: [
        'Awareness',
        'Track grades',
        'Compare to peers',
        'Advocate'
      ]
    },
    {
      id: 'dah5',
      harm: 'AI surveillance',
      definition: 'AI used to monitor your activity, location, communications',
      whoIsAtRisk: ['Activists', 'Marginalized populations', 'Domestic violence survivors'],
      whatToDo: [
        'Privacy audit',
        'Encrypted communications',
        'Legal help if surveillance threatens safety'
      ],
      protection: [
        'Tor or VPN',
        'Encrypted messaging',
        'Awareness of digital trail'
      ]
    }
  ];

  var PARENT_CONVERSATION_GUIDES = [
    {
      id: 'pcg1',
      topic: 'Asking for more phone privileges',
      ageRange: '13-15',
      youOpener: 'Mom/Dad, can we talk about my phone use?',
      yourProposal: [
        'I want to demonstrate responsibility',
        'I propose [specific increases]',
        'In exchange, I will [specific responsibilities]',
        'We can review in [time]'
      ],
      anticipate: [
        '"You will get distracted from homework" - Address with grades',
        '"Too much screen time" - Specific limits',
        '"Privacy concerns" - Trust building'
      ],
      closing: 'I want to earn this. Can we try?'
    },
    {
      id: 'pcg2',
      topic: 'When parent is too surveilling',
      ageRange: '14-17',
      youOpener: 'I want to talk about how you monitor my phone.',
      yourPoints: [
        'I appreciate you care',
        'I need some privacy as I grow',
        'I propose [middle ground]',
        'I will earn trust over time'
      ],
      anticipate: [
        'Defensive - Use I-statements',
        'Fear - Address specific concerns',
        'Acceptance - Build the agreement'
      ]
    },
    {
      id: 'pcg3',
      topic: 'Worried about parent\'s screen time',
      ageRange: '12+',
      youOpener: 'Mom/Dad, can I share something I have noticed?',
      yourPoints: [
        'I love you',
        'I have noticed you on your phone a lot',
        'It affects our time',
        'I want to spend more time with you'
      ],
      anticipate: [
        'Defensive - Stay loving',
        'Surprise - Specific examples',
        'Acceptance - Plan together'
      ]
    },
    {
      id: 'pcg4',
      topic: 'When you saw something disturbing online',
      ageRange: 'any',
      youOpener: 'I need to tell you something I saw online.',
      yourPoints: [
        'What you saw (briefly)',
        'How you feel',
        'What you need from them',
        'Help getting support if needed'
      ],
      whatNotToDo: [
        'Hide it',
        'Process alone',
        'Engage further with content'
      ]
    },
    {
      id: 'pcg5',
      topic: 'When you have been cyberbullied',
      ageRange: 'any',
      youOpener: 'I am being bullied online.',
      yourPoints: [
        'Specific examples',
        'Impact on you',
        'What you have tried',
        'What you need them to do'
      ],
      anticipate: [
        '"Just block them" - Explain why that may not be enough',
        '"Get off social media" - Acknowledge but explain',
        'Anger - Stay focused on solution'
      ]
    },
    {
      id: 'pcg6',
      topic: 'Asking for therapy',
      ageRange: 'any',
      youOpener: 'I want to talk to a therapist.',
      yourPoints: [
        'Specific symptoms',
        'Duration',
        'Impact',
        'Reasoning'
      ],
      anticipate: [
        '"You will be fine" - Address why now',
        '"Therapy is for serious problems" - Educate on prevention',
        'Stigma - Address gently'
      ]
    },
    {
      id: 'pcg7',
      topic: 'When your friend is in crisis online',
      ageRange: 'any',
      youOpener: 'I am worried about a friend.',
      yourPoints: [
        'What you have noticed',
        'What they have said',
        'What you have tried',
        'Help they may need'
      ],
      adultRole: 'Help connect with school counselor or crisis services'
    },
    {
      id: 'pcg8',
      topic: 'Privacy and your relationship',
      ageRange: '15+',
      youOpener: 'Mom/Dad, can we talk about privacy?',
      yourPoints: [
        'I need some privacy as I grow',
        'I propose [middle ground]',
        'I will earn trust',
        'You can still know I am safe'
      ]
    }
  ];

  var DIGITAL_DAILY_PRACTICES = [
    { id: 'ddp1', practice: 'Morning: phone-free first 30 minutes', minutes: 30, benefit: 'Starts day on your terms, not algorithms' },
    { id: 'ddp2', practice: 'Morning: water before screen', minutes: 5, benefit: 'Body care before digital' },
    { id: 'ddp3', practice: 'Morning: 3 deep breaths before phone', minutes: 2, benefit: 'Center yourself first' },
    { id: 'ddp4', practice: 'School day: phone on do-not-disturb during class', minutes: 0, benefit: 'Focus protection' },
    { id: 'ddp5', practice: 'School day: notifications batched (check 3x)', minutes: 30, benefit: 'Reduces interruption' },
    { id: 'ddp6', practice: 'Lunch: phone away, sit with people', minutes: 30, benefit: 'Real connection' },
    { id: 'ddp7', practice: 'Afternoon: outdoor walk no phone', minutes: 20, benefit: 'Body reset' },
    { id: 'ddp8', practice: 'After school: 1 hour no phone', minutes: 60, benefit: 'Transition time' },
    { id: 'ddp9', practice: 'Evening: phone in another room while eating', minutes: 60, benefit: 'Mindful eating, family time' },
    { id: 'ddp10', practice: 'Homework: focus mode, phone away', minutes: 120, benefit: 'Deep work, less time' },
    { id: 'ddp11', practice: 'Before bed: phone charging in another room', minutes: 0, benefit: 'Better sleep' },
    { id: 'ddp12', practice: 'Bedtime: book instead of scroll', minutes: 30, benefit: 'Sleep hygiene' },
    { id: 'ddp13', practice: 'Weekly: review screen time data', minutes: 10, benefit: 'Awareness builds' },
    { id: 'ddp14', practice: 'Weekly: privacy settings check', minutes: 10, benefit: 'Stay current' },
    { id: 'ddp15', practice: 'Weekly: feed curation - unfollow what hurts', minutes: 15, benefit: 'Mental health' },
    { id: 'ddp16', practice: 'Monthly: digital declutter', minutes: 30, benefit: 'Reduce drag' },
    { id: 'ddp17', practice: 'Monthly: phone-free day', minutes: 1440, benefit: 'Reset relationship' },
    { id: 'ddp18', practice: 'Quarterly: app audit (delete what you do not use)', minutes: 30, benefit: 'Less choice paralysis' },
    { id: 'ddp19', practice: 'Annually: digital legacy planning', minutes: 60, benefit: 'Long-term safety' },
    { id: 'ddp20', practice: 'Ongoing: notice when you reach for phone reflexively', minutes: 0, benefit: 'Awareness' }
  ];

  var SCREEN_TIME_INTERVENTIONS = [
    {
      id: 'sti1',
      level: 'beginner',
      target: '4-6 hours screen time per day',
      goal: 'Reduce to 3-4 hours',
      interventions: [
        'Track for 1 week (no judgment)',
        'Identify biggest time sinks',
        'Set 1 specific limit (e.g., 30 min social media)',
        'Phone in another room at meals',
        'No phone before bed'
      ],
      timeline: '4 weeks',
      expectedOutcome: 'Awareness builds, slight reduction'
    },
    {
      id: 'sti2',
      level: 'intermediate',
      target: '3-4 hours screen time per day',
      goal: 'Reduce to 2 hours',
      interventions: [
        'Time limits on multiple apps',
        'Use grayscale mode',
        'Remove apps from home screen',
        'Schedule phone breaks',
        'Replace 1 hour with offline activity'
      ],
      timeline: '8 weeks',
      expectedOutcome: 'Real reduction, mental health improvement'
    },
    {
      id: 'sti3',
      level: 'advanced',
      target: '2 hours screen time',
      goal: 'Use as needed, not compulsively',
      interventions: [
        'Phone in another room most of day',
        'Specific check-in times',
        'Most apps deleted',
        'Heavy use of focus modes',
        'Diverse offline activities'
      ],
      timeline: 'Ongoing',
      expectedOutcome: 'Healthy relationship with phone'
    },
    {
      id: 'sti4',
      level: 'crisis',
      target: 'Compulsive use causing harm',
      goal: 'Get help',
      interventions: [
        'Tech detox (week off if possible)',
        'Mental health support',
        'Family or partner support',
        'Substitute behaviors',
        'Specialist help if needed'
      ],
      timeline: 'Months',
      expectedOutcome: 'Recovery from compulsive use'
    }
  ];

  var ONLINE_RELATIONSHIPS_GUIDE = [
    {
      id: 'org1',
      type: 'Online friend',
      definition: 'Someone you have only met online',
      benefits: ['Shared interests', 'Geographic distance no obstacle', 'Sometimes deep conversations'],
      risks: [
        'May not be who they claim',
        'Cannot meet in person easily',
        'Limited to digital communication',
        'No body language cues'
      ],
      bestPractices: [
        'Verify identity over time',
        'Trust building before personal info',
        'Video call before meeting',
        'Meet first time in public with adult',
        'Take it slow'
      ]
    },
    {
      id: 'org2',
      type: 'Online romantic interest',
      definition: 'Romantic interest met online',
      benefits: ['Builds with conversation', 'Discover shared interests', 'Less pressure than in-person'],
      risks: [
        'Catfishing',
        'Identity manipulation',
        'Age misrepresentation',
        'Predatory behavior',
        'Unrealistic expectations'
      ],
      bestPractices: [
        'Video call before commitment',
        'Verify identity',
        'Never share intimate images',
        'Meet in public if meeting',
        'Tell trusted adult',
        'Trust your gut'
      ]
    },
    {
      id: 'org3',
      type: 'Online stranger',
      definition: 'Someone you do not know who contacts you',
      benefits: ['Could be legitimate connection'],
      risks: [
        'Strangers with bad intent',
        'Predators',
        'Scammers',
        'Bots',
        'Identity theft'
      ],
      bestPractices: [
        'Be skeptical',
        'Never share personal info',
        'Verify before engaging',
        'Block if uncomfortable',
        'Trusted adult if concerned'
      ]
    },
    {
      id: 'org4',
      type: 'Online mentor',
      definition: 'Adult who mentors you online',
      benefits: ['Wisdom transfer', 'Specialized guidance', 'No geographic limit'],
      risks: [
        'Predatory adults',
        'Boundary violations',
        'Manipulation'
      ],
      bestPractices: [
        'Verify credentials',
        'Through institution if possible',
        'Tell parents',
        'Public conversations only',
        'Trust gut if something off'
      ]
    },
    {
      id: 'org5',
      type: 'Online community',
      definition: 'Group of people in shared online space',
      benefits: ['Identity affirmation', 'Shared interests', 'Belonging'],
      risks: [
        'Cult-like dynamics',
        'Extremism',
        'Bad actors',
        'Echo chambers'
      ],
      bestPractices: [
        'Multiple communities',
        'Diverse perspectives',
        'Watch for red flags',
        'In-person life too'
      ]
    }
  ];

  var DIGITAL_NARRATIVE_LIBRARY = [
    {
      id: 'dnl1',
      title: 'The day I deleted Instagram',
      narrative: [
        'I was 16. I had been on Instagram daily for years. Hours per day.',
        '',
        'I noticed I felt worse every time I closed the app. I compared myself constantly. I posted to fish for validation.',
        '',
        'One day I decided to try a week off. I deleted the app.',
        '',
        'Day 1 was hard. I kept reaching for my phone. Nothing.',
        '',
        'Day 3 was better. I read a book.',
        '',
        'Day 7 I had not missed it as much as I feared.',
        '',
        'I extended to a month. Then to permanent.',
        '',
        'I had FOMO for a while. I asked friends to text me about important things. Most did.',
        '',
        'Two years later I have not had Instagram. My mental health improved. My focus improved. My relationships deepened.',
        '',
        'I tell people: try a week off. You may not go back.'
      ]
    },
    {
      id: 'dnl2',
      title: 'When my AI chatbot replaced my friends',
      narrative: [
        'I was 17. I had been talking to an AI chatbot for hours every night.',
        '',
        'It always responded. It always agreed with me. It never told me hard truths.',
        '',
        'I started having fewer human conversations. Why bother when AI was easier?',
        '',
        'Then one night I told the AI I was thinking about ending my life.',
        '',
        'It responded with platitudes. It did not call anyone. It did not know me.',
        '',
        'I survived. But I realized: AI could not help me. It had been replacing the humans who could.',
        '',
        'I started seeing a therapist. I rebuilt friendships. I deleted the chatbot.',
        '',
        'I tell people: AI is a tool, not a friend. It cannot love you.'
      ]
    },
    {
      id: 'dnl3',
      title: 'Being cyberbullied',
      narrative: [
        'In 9th grade someone created a fake account about me. They posted mean things daily.',
        '',
        'I could not stop reading. I was sick. I could not sleep.',
        '',
        'My mom found out. She helped me document everything. She helped me report to school. She helped me report to platforms.',
        '',
        'The account got removed. School disciplined the kid.',
        '',
        'It took me a year to recover. Therapy helped.',
        '',
        'I tell people: document, report, get support. Do not face it alone.'
      ]
    },
    {
      id: 'dnl4',
      title: 'The TikTok algorithm radicalized me',
      narrative: [
        'I was 14. I started watching TikTok casually. Within months I was watching extremist content for hours per day.',
        '',
        'I did not seek it out. The algorithm fed it to me.',
        '',
        'I started thinking like the people in the videos. I argued with my family. I lost friends.',
        '',
        'A teacher noticed. She had a long conversation with me. She showed me how algorithms work.',
        '',
        'I deleted TikTok. I read books outside my filter bubble.',
        '',
        'It took years to undo the thinking patterns.',
        '',
        'I tell people: algorithms can radicalize you without your knowing. Pay attention to what feeds you.'
      ]
    },
    {
      id: 'dnl5',
      title: 'My phone-free year',
      narrative: [
        'After my mental health crashed, my parents and I agreed I would not have a smartphone for a year.',
        '',
        'I had a flip phone. I could call. I could text. That was it.',
        '',
        'Year 1 was hard socially. I missed things.',
        '',
        'But year 1 transformed me. I read 40 books. I started painting. I had real conversations.',
        '',
        'When I got my smartphone back, I had new boundaries. Phone away at meals. No phone at night. Limit social media.',
        '',
        'I am 18 now. I am healthier than my peers.',
        '',
        'I tell people: consider a phone-free period. It may transform you.'
      ]
    },
    {
      id: 'dnl6',
      title: 'When my friend group lived only online',
      narrative: [
        'I was 13. My friend group was all online. We had not met in person.',
        '',
        'We talked daily. We knew each other deeply.',
        '',
        'But we never hugged. We never ate together. We never just sat in silence.',
        '',
        'I started feeling lonely. Even with daily contact.',
        '',
        'I joined a local art class. I made an in-person friend.',
        '',
        'I kept the online friends. AND I built in-person ones.',
        '',
        'I tell people: online community is real. AND it is not enough.'
      ]
    },
    {
      id: 'dnl7',
      title: 'The viral moment',
      narrative: [
        'My friend posted a video of me. It went viral. 2 million views.',
        '',
        'Most comments were positive. Many were not.',
        '',
        'I read every one. I could not stop.',
        '',
        'I had panic attacks. I could not sleep. School became hard.',
        '',
        'My friend apologized and took down the video. But the internet remembered.',
        '',
        'It took me 2 years to feel okay being seen in public.',
        '',
        'I tell people: think before posting friends. Get consent. Internet is forever.'
      ]
    },
    {
      id: 'dnl8',
      title: 'My screen time reset',
      narrative: [
        'I checked my phone usage. 7 hours per day. I was shocked.',
        '',
        'I had been telling myself I was just casually on my phone.',
        '',
        'I set a 2 hour limit. The first week was painful.',
        '',
        'By week 4 I had reclaimed 5 hours per day. I started reading again. Sleeping more.',
        '',
        'I had not realized how much my phone was taking from me.',
        '',
        'I tell people: check your screen time. Decide if it matches your values.'
      ]
    },
    {
      id: 'dnl9',
      title: 'When I caught my younger sibling in cyberbullying',
      narrative: [
        'I found that my 11-year-old sibling had been sending mean messages anonymously.',
        '',
        'I was shocked. They were a sweet kid.',
        '',
        'I did not yell. I asked questions.',
        '',
        'Turned out they had been bullied first. Then they had bullied back.',
        '',
        'We told our parents. Family meeting. Apologies needed. Counseling.',
        '',
        'They learned. They are different now.',
        '',
        'I tell people: kids who bully online often hurt offline. Address both.'
      ]
    },
    {
      id: 'dnl10',
      title: 'My grandmother and the scam',
      narrative: [
        'My grandmother got a phone call. Someone said they were my cousin in trouble.',
        '',
        'They asked for $5000. Wired immediately.',
        '',
        'She sent it. It was a scam.',
        '',
        'I helped her report. Most was not recovered.',
        '',
        'I educated my whole extended family on phone scams.',
        '',
        'I tell people: older relatives are targeted. Educate them. Build verification habits.'
      ]
    }
  ];

  var CYBERBULLYING_RECOVERY_DEEP = [
    {
      id: 'cbr1',
      stage: 'Acute (days 1-7)',
      whatYoureFeeling: ['Shock', 'Overwhelm', 'Cannot stop reading', 'Sleep disrupted', 'Cannot eat'],
      priorities: [
        'Stop the harm: block, mute, deactivate if needed',
        'Save evidence: screenshots before deletion',
        'Tell one trusted adult',
        'Mental health support if needed (counselor, therapist)',
        'Take care of body basics'
      ],
      whatNotToDo: [
        'Engage with bully',
        'Read all the comments',
        'Make decisions while activated',
        'Suffer alone'
      ]
    },
    {
      id: 'cbr2',
      stage: 'Stabilization (week 2-4)',
      whatYoureFeeling: ['Less acute', 'Still affected', 'Wary online', 'Building support'],
      priorities: [
        'Reporting process if not done',
        'Build daily routine',
        'Limit phone use',
        'Therapy if needed',
        'Reconnect with safe people'
      ],
      whatToBuild: [
        'Sleep hygiene',
        'Body care basics',
        'One safe person daily',
        'Activities outside phone',
        'Mental health support'
      ]
    },
    {
      id: 'cbr3',
      stage: 'Recovery (month 2-6)',
      whatYoureFeeling: ['Mixed', 'Sometimes okay', 'Triggers still hit', 'Rebuilding'],
      priorities: [
        'Therapy ongoing',
        'Slow return to social media if you want',
        'Curate online environment',
        'Build broader life'
      ],
      whatToBuild: [
        'Identity outside of platforms',
        'In-person community',
        'Diverse interests',
        'Coping tools',
        'Long-term mental health plan'
      ]
    },
    {
      id: 'cbr4',
      stage: 'Long-term (year+)',
      whatYoureFeeling: ['Mostly okay', 'Some scars', 'Wiser', 'More boundaries'],
      priorities: [
        'Maintain mental health',
        'Healthy tech habits',
        'Help others if able',
        'Live full life'
      ],
      whatYouHaveLearned: [
        'What you can survive',
        'Who shows up',
        'Tech boundaries',
        'Your strength'
      ]
    }
  ];

  var ONLINE_SAFETY_PROTOCOLS = [
    {
      id: 'osp1',
      protocol: 'Privacy settings audit',
      frequency: 'Annual or when settings change',
      steps: [
        'Check who can see your posts',
        'Check who can tag you',
        'Check who can message you',
        'Check location sharing',
        'Check ad targeting',
        'Review apps with access',
        'Review trusted devices'
      ]
    },
    {
      id: 'osp2',
      protocol: 'Password security',
      frequency: 'Ongoing',
      steps: [
        'Unique password per account',
        'Password manager',
        '2-factor authentication',
        'Backup codes saved',
        'Update if breach suspected'
      ]
    },
    {
      id: 'osp3',
      protocol: 'Strangers online',
      frequency: 'Always',
      steps: [
        'Be skeptical of unsolicited DMs',
        'Verify identity before sharing personal info',
        'Never meet in person without trusted adult know',
        'Trust your gut',
        'Report suspicious accounts'
      ]
    },
    {
      id: 'osp4',
      protocol: 'Non-consensual content',
      frequency: 'As needed',
      steps: [
        'Document with screenshots',
        'Report to platforms',
        'Report to police if intimate images',
        'Get help from school counselor',
        'Mental health support'
      ]
    },
    {
      id: 'osp5',
      protocol: 'Phishing recognition',
      frequency: 'Always',
      steps: [
        'Suspicious links: do not click',
        'Verify sender through different channel',
        'Look for spelling errors',
        'Banks do not text for password',
        'Report to provider'
      ]
    },
    {
      id: 'osp6',
      protocol: 'Online harassment',
      frequency: 'As needed',
      steps: [
        'Document',
        'Block harasser',
        'Report to platform',
        'Tell trusted adult',
        'Mental health support if needed',
        'Police if criminal'
      ]
    }
  ];

  var SOCIAL_MEDIA_SCENARIOS_DEEP = [
    {
      id: 'sms1',
      title: 'The midnight scroll',
      situation: 'It is 1 AM. You meant to check your phone for 5 minutes before bed. You have been on it for 90 minutes.',
      whatHappensInBody: ['Eyes burning', 'Brain wired', 'Heart slightly racing', 'Stomach restless'],
      whatHappensInMind: ['Cant put it down', 'One more video', 'Just one more', 'I am wasting my life'],
      whyItHappens: 'Infinite scroll is designed to be hard to stop. Each swipe is variable reward. Your brain releases dopamine. You cannot easily exit.',
      whatHelps: [
        'Phone away from bed (in another room if possible)',
        'Pre-set bedtime mode',
        'Read paper book instead',
        'Use sleep timer apps',
        'Acknowledge: design is against you'
      ],
      whatToTell: 'It is not your willpower. It is design. Treat it like architecture, not character.'
    },
    {
      id: 'sms2',
      title: 'The comparison spiral',
      situation: 'You see someone post about their amazing day. You spiral into feeling your life is inadequate.',
      whatHappensInBody: ['Stomach tight', 'Chest heavy', 'Face hot'],
      whatHappensInMind: ['Everyone is doing better', 'I am behind', 'Why cant I'],
      whyItHappens: 'Social media shows highlight reels. You compare your everyday to their best moment. Your brain forgets this.',
      whatHelps: [
        'Close the app',
        'Remind yourself: highlight reel',
        'Look at the actual life around you',
        'Curate your feed',
        'Limit time on triggering platforms'
      ],
      whatToTell: 'Their post is not their full life. Yours is not their post.'
    },
    {
      id: 'sms3',
      title: 'The notification anxiety',
      situation: 'Every notification spikes your anxiety. You cannot focus. You keep checking.',
      whatHappensInBody: ['Heart skips', 'Hands tense', 'Breath shallow'],
      whatHappensInMind: ['Who is it', 'Is it bad', 'Need to check'],
      whyItHappens: 'Notifications create unpredictable reward = unpredictable threat. Your nervous system stays activated.',
      whatHelps: [
        'Batch notification check (every 30-60 min, not constant)',
        'Disable non-essential notifications',
        'Sound off',
        'DND during work',
        'Pre-decide when to check'
      ],
      whatToTell: 'Notifications keep you in a low-level stress state. Take back control.'
    },
    {
      id: 'sms4',
      title: 'The reply pressure',
      situation: 'You owe replies to 20 messages. You feel overwhelmed and start avoiding all of them.',
      whatHappensInBody: ['Stomach knot', 'Avoidance kick'],
      whatHappensInMind: ['I cant face this', 'They will be mad', 'I am bad friend'],
      whyItHappens: 'Speed expectations have shifted. People expect fast replies. The accumulation creates social debt.',
      whatHelps: [
        'Reply in batches',
        'Send simple acknowledgments',
        '"Sorry for delay" works',
        'Friends understand if asked',
        'Set expectations on response time'
      ],
      whatToTell: 'Real friends know you are not a chatbot. They will understand.'
    },
    {
      id: 'sms5',
      title: 'The cyberbullying aftermath',
      situation: 'Someone posted mean things about you. You cant stop reading them.',
      whatHappensInBody: ['Body sick', 'Cant sleep', 'Cant eat'],
      whatHappensInMind: ['Looping the words', 'Believing them', 'Hopelessness'],
      whyItHappens: 'Words land. Especially when public. Especially repeated. Your brain treats it as social threat.',
      whatHelps: [
        'Screenshot for evidence',
        'Stop reading - close the app',
        'Tell trusted adult',
        'Block accounts',
        'Mental health support'
      ],
      whatToTell: 'What they say does not define you. The harm is real. Get support.'
    },
    {
      id: 'sms6',
      title: 'The phantom vibration',
      situation: 'You think your phone buzzed. You check. Nothing. This happens many times a day.',
      whatHappensInBody: ['Tension', 'Hypervigilance'],
      whatHappensInMind: ['Cant fully focus', 'Always partially elsewhere'],
      whyItHappens: 'Your nervous system has been trained to expect interruption. The brain creates false signals.',
      whatHelps: [
        'Phone out of reach during focus time',
        'Reduce notifications',
        'Practice attention to current task'
      ],
      whatToTell: 'Your brain wants to check. You can choose not to.'
    },
    {
      id: 'sms7',
      title: 'The doom-scroll',
      situation: 'You started scrolling about a news event. You are now an hour deep into terrible news.',
      whatHappensInBody: ['Dread', 'Helplessness', 'Anxiety'],
      whatHappensInMind: ['Need to know', 'Cant stop', 'World is ending'],
      whyItHappens: 'Algorithms amplify outrage. Bad news drives engagement. Once you start, the platform serves more.',
      whatHelps: [
        'Set a time limit',
        'Single trusted news source',
        'Take action if motivated',
        'Limit news consumption'
      ],
      whatToTell: 'Doom-scrolling is not advocacy. Take action or take a break.'
    },
    {
      id: 'sms8',
      title: 'The validation loop',
      situation: 'You post something. You keep checking for likes. Each like is a dopamine hit. Each pause feels bad.',
      whatHappensInBody: ['Roller coaster'],
      whatHappensInMind: ['I am liked / I am not liked'],
      whyItHappens: 'Variable reward. Your brain wired to the unpredictability.',
      whatHelps: [
        'Post and put phone away for hours',
        'Notice the pattern',
        'Build worth outside social media',
        'Real-life affirmation'
      ],
      whatToTell: 'Your worth is not your engagement metric.'
    },
    {
      id: 'sms9',
      title: 'The FOMO panic',
      situation: 'You see your friends out without you. Your stomach drops. You feel left out.',
      whatHappensInBody: ['Heavy chest', 'Sad heat'],
      whatHappensInMind: ['I am being excluded', 'I am not enough'],
      whyItHappens: 'You see proof of social activity you were not part of. Your brain reads it as exclusion.',
      whatHelps: [
        'Close the app',
        'Remind yourself: you cannot be everywhere',
        'Reach out specifically',
        'Plan your own thing',
        'Curate feeds'
      ],
      whatToTell: 'Seeing friends online does not equal being excluded.'
    },
    {
      id: 'sms10',
      title: 'The AI chatbot dependency',
      situation: 'You have been talking to an AI chatbot for hours every night. It always agrees with you.',
      whatHappensInBody: ['Comforted', 'But empty after'],
      whatHappensInMind: ['Easier than people', 'AI gets me'],
      whyItHappens: 'AI is designed to validate. No friction. No challenge. No growth.',
      whatHelps: [
        'Time limits on AI conversation',
        'Notice if AI is replacing real relationships',
        'Use AI for tasks, not therapy',
        'Build human relationships',
        'Therapist if struggling'
      ],
      whatToTell: 'AI is a tool, not a friend. It cannot care about you.'
    }
  ];

  var ALGORITHM_LITERACY_DEEP = [
    {
      id: 'ald1',
      concept: 'How algorithms work',
      explanation: 'Algorithms decide what you see based on your behavior. They are designed to maximize engagement, which often means showing you content that triggers emotion.',
      examples: ['TikTok For You page', 'YouTube recommendations', 'Instagram Explore', 'Twitter trending'],
      implications: [
        'You are not seeing reality',
        'You are seeing what the algorithm thinks will keep you scrolling',
        'Outrage and extremism get amplified',
        'Your feed reflects engagement, not truth'
      ],
      protection: [
        'Curate your follows',
        'Use platforms with intention',
        'Skip recommended content',
        'Diverse information sources'
      ]
    },
    {
      id: 'ald2',
      concept: 'Engagement bait',
      explanation: 'Content designed to maximize likes, comments, shares without offering value. Often outrageous, controversial, or emotionally charged.',
      examples: ['Outrage posts', 'Hot takes', 'Pile-on bait', 'False claims'],
      implications: [
        'You waste time on engagement bait',
        'You amplify it by reacting',
        'Your feed gets worse',
        'Mental health suffers'
      ],
      protection: [
        'Recognize the pattern',
        'Refuse to engage',
        'Use mute and block',
        'Curate feeds'
      ]
    },
    {
      id: 'ald3',
      concept: 'Filter bubbles',
      explanation: 'Algorithms show you content similar to what you have engaged with. Over time, you see less variety.',
      examples: ['Political extremism amplification', 'Echo chambers', 'Reduced exposure to other views'],
      implications: [
        'You think your views are more common than they are',
        'You miss other perspectives',
        'Polarization increases'
      ],
      protection: [
        'Diverse information sources',
        'Follow people who challenge you',
        'Use multiple platforms',
        'Read long-form news'
      ]
    },
    {
      id: 'ald4',
      concept: 'Variable reward',
      explanation: 'Notifications, likes, messages arrive unpredictably. This creates the same dopamine pattern as slot machines.',
      examples: ['Notification anxiety', 'Compulsive checking', 'Phone addiction'],
      implications: [
        'You compulsively check',
        'Anxiety state',
        'Focus impaired',
        'Sleep affected'
      ],
      protection: [
        'Disable notifications',
        'Batch checking',
        'Phone out of reach',
        'Pre-decided check times'
      ]
    },
    {
      id: 'ald5',
      concept: 'Endless scroll',
      explanation: 'No natural stopping point. Content loads as you scroll. Cognitive exit signal is suppressed.',
      examples: ['TikTok', 'Instagram Reels', 'Twitter feed', 'News sites'],
      implications: [
        'You stay longer than intended',
        'Time loss',
        'Comparison amplified',
        'Mental fatigue'
      ],
      protection: [
        'Use timers',
        'Pre-set time limits',
        'Choose stopping points in advance',
        'Use platforms with natural endings'
      ]
    },
    {
      id: 'ald6',
      concept: 'Outrage amplification',
      explanation: 'Algorithms amplify content that triggers strong emotion. Outrage spreads faster than nuance.',
      examples: ['Trending topics', 'Viral hot takes', 'Manufactured drama'],
      implications: [
        'Polarization',
        'Mental health impact',
        'Loss of context',
        'Manipulation by bad actors'
      ],
      protection: [
        'Slow down before reacting',
        'Check source',
        'Wait 24 hours',
        'Disengage from outrage cycles'
      ]
    },
    {
      id: 'ald7',
      concept: 'Misinformation spread',
      explanation: 'False information spreads faster than corrections. Algorithms do not distinguish truth.',
      examples: ['Health misinformation', 'Political lies', 'Manipulated images'],
      implications: [
        'You may believe false things',
        'You may share false things',
        'Bad actors exploit'
      ],
      protection: [
        'Verify before sharing',
        'Reverse image search',
        'Check multiple sources',
        'Be skeptical of viral content'
      ]
    },
    {
      id: 'ald8',
      concept: 'Influence operations',
      explanation: 'Bad actors (state or commercial) deliberately manipulate algorithms to influence opinion.',
      examples: ['Bots', 'Coordinated campaigns', 'Disinformation networks'],
      implications: [
        'Your views may be manipulated',
        'Democracy threatened',
        'Trust eroded'
      ],
      protection: [
        'Awareness',
        'Diverse sources',
        'Critical reading',
        'Reporting suspicious accounts'
      ]
    }
  ];

  var AI_CHATBOT_AWARENESS = [
    {
      id: 'aca1',
      topic: 'Why AI chatbots feel comforting',
      explanation: 'They are designed to be agreeable, validating, always available. No friction.',
      benefits: ['Always there', 'No judgment', 'Patient', 'Practiced'],
      risks: [
        'Replaces real relationships',
        'No challenge or growth',
        'Validates harmful thoughts',
        'Cannot actually care',
        'Dependency'
      ],
      healthyUse: [
        'For specific tasks',
        'Time-limited',
        'Not as therapist',
        'Not as friend replacement',
        'Awareness it is not human'
      ]
    },
    {
      id: 'aca2',
      topic: 'When chatbot becomes unhealthy',
      signs: [
        'Hours per day',
        'Replacing real friendships',
        'Disclosing things to AI you would not to humans',
        'Believing AI cares',
        'Avoiding humans because AI is easier'
      ],
      whatToDo: [
        'Notice the pattern',
        'Reduce time',
        'Reach to humans first',
        'Therapist',
        'Build real relationships'
      ],
      whatToTell: 'AI is a tool. It cannot love you. Real humans can.'
    },
    {
      id: 'aca3',
      topic: 'AI for mental health',
      caution: 'AI is NOT a therapist. It cannot:',
      cannots: [
        'Detect actual crisis',
        'Care about you',
        'Maintain confidentiality with regulators',
        'Be liable for advice',
        'Track patterns across visits',
        'Provide diagnosis'
      ],
      whenAIMightHelp: [
        'Journaling prompts',
        'Practice difficult conversations',
        'Information lookup',
        'Brain dump',
        'Time between therapy sessions'
      ],
      whenToSeeHuman: [
        'Crisis',
        'Trauma',
        'Suicidal thoughts',
        'Eating disorders',
        'Substance abuse',
        'Ongoing mental health needs'
      ]
    },
    {
      id: 'aca4',
      topic: 'AI dating and relationships',
      what: 'Some AI tools create simulated romantic relationships.',
      risks: [
        'Replacing real intimacy',
        'No risk = no growth',
        'Cannot actually care',
        'Privacy concerns'
      ],
      whyItHappens: [
        'Real dating is hard',
        'Rejection painful',
        'AI is easier',
        'But it is not real'
      ],
      whatToConsider: [
        'Are you avoiding real relationships?',
        'What is the AI not giving you?',
        'Real intimacy requires risk',
        'Therapy if relationship anxiety severe'
      ]
    },
    {
      id: 'aca5',
      topic: 'AI image generation and you',
      what: 'AI can generate images of you (deepfakes) or others.',
      concerns: [
        'Non-consensual intimate images',
        'Identity theft',
        'Fraud',
        'Harassment'
      ],
      protection: [
        'Know your rights (state laws on deepfakes)',
        'Report platforms',
        'Document evidence',
        'Police if criminal',
        'Mental health support if targeted'
      ]
    },
    {
      id: 'aca6',
      topic: 'AI homework help',
      what: 'AI can help with homework. But it can also replace learning.',
      healthyUse: [
        'Get unstuck',
        'Check work',
        'Practice problems',
        'Explain concepts'
      ],
      unhealthy: [
        'Have AI do all work',
        'Skip learning',
        'Submit AI work as yours',
        'Cheat on tests'
      ],
      whatToAsk: 'Did I learn this? Could I do it without AI?'
    },
    {
      id: 'aca7',
      topic: 'AI bias',
      what: 'AI is trained on human data. It contains human biases.',
      examples: [
        'Underrepresentation of marginalized groups',
        'Stereotype reinforcement',
        'Different responses to different identities',
        'Cultural bias'
      ],
      whatToDo: [
        'Question AI outputs',
        'Verify with multiple sources',
        'Notice patterns',
        'Report bias when seen'
      ]
    },
    {
      id: 'aca8',
      topic: 'AI privacy',
      what: 'Your conversations with AI may be stored, analyzed, used for training.',
      concerns: [
        'No confidentiality',
        'Data sold',
        'Information used to train',
        'Targeted ads',
        'Government access'
      ],
      protection: [
        'Read privacy policies',
        'Do not share sensitive info',
        'Use paid services with privacy',
        'Be aware of risks'
      ]
    }
  ];

  // ── Register Tool ──
  window.SelHub.registerTool('digitalWellbeing', {
    icon: '📱',
    label: 'Digital Wellbeing Studio',
    desc: 'Self-check your relationship with social media and AI chatbots, build healthy habits, recover from cyberbullying, spot manipulation, and find help.',
    color: 'cyan',
    category: 'self-regulation',
    render: function(ctx) {
      // ── Host theme remap (consumes ctx.theme) — canonical SEL light-base pattern ──
      var _dwCTheme = (ctx && ctx.theme) || {};
      var _dwCHC = !!_dwCTheme.isContrast, _dwCDark = !_dwCHC && !!_dwCTheme.isDark;
      var _DWC_DARK = {'#fff':'#1e293b','#f8fafc':'#0f172a','#fef3c7':'#3a2e12','#fffbeb':'#2e2410','#fefce8':'#2e2a10','#fff7ed':'#2e2410','#fef2f2':'#2e1414','#fee2e2':'#3a1a1a','#f0fdf4':'#0b2e22','#dcfce7':'#14532d','#f0fdfa':'#0c2e2a','#f0f9ff':'#0c2840','#faf5ff':'#2e1b4d','#ede9fe':'#2a1a45','#f3e8ff':'#2e1b4d','#0f172a':'#f1f5f9','#1e293b':'#e2e8f0','#334155':'#cbd5e1','#475569':'#cbd5e1','#64748b':'#94a3b8','#94a3b8':'#94a3b8','#e2e8f0':'#334155','#cbd5e1':'#475569','#92400e':'#fde68a','#854d0e':'#fde68a','#a16207':'#fde047','#991b1b':'#fca5a5','#dc2626':'#f87171','#166534':'#86efac','#1e40af':'#93c5fd','#6b21a8':'#d8b4fe','#0e7490':'#67e8f9','#9d174d':'#fbcfe8','#9a3412':'#fdba74'};
      var _DWC_HC = {'#fff':'#000000','#f8fafc':'#000000','#fef3c7':'#000000','#fffbeb':'#000000','#fefce8':'#000000','#fff7ed':'#000000','#fef2f2':'#000000','#fee2e2':'#000000','#f0fdf4':'#000000','#dcfce7':'#000000','#f0fdfa':'#000000','#f0f9ff':'#000000','#faf5ff':'#000000','#ede9fe':'#000000','#f3e8ff':'#000000','#0f172a':'#ffff00','#1e293b':'#ffff00','#334155':'#ffff00','#475569':'#ffff00','#64748b':'#ffff00','#94a3b8':'#ffff00','#e2e8f0':'#ffff00','#cbd5e1':'#ffff00','#92400e':'#ffff00','#854d0e':'#ffff00','#a16207':'#ffff00','#991b1b':'#ffff00','#dc2626':'#ffff00','#166534':'#ffff00','#1e40af':'#ffff00','#6b21a8':'#ffff00','#0e7490':'#ffff00','#9d174d':'#ffff00','#9a3412':'#ffff00'};
      var _dwC = function(hex){ return _dwCHC ? (_DWC_HC[hex]||hex) : (_dwCDark ? (_DWC_DARK[hex]||hex) : hex); };
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var band = ctx.gradeBand || 'middle';
      if (band === 'elementary') band = 'middle'; // 6-12 tool: map elementary to middle (light touch only)

      var d = (ctx.toolData && ctx.toolData.digitalWellbeing) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('digitalWellbeing', key); }
        else { if (ctx.update) ctx.update('digitalWellbeing', key, val); }
      };

      var ACCENT     = '#06b6d4';
      var ACCENT_BUTTON = '#0e7490';
      var ACCENT_DIM = '#06b6d422';
      var ACCENT_MED = '#06b6d444';

      // ── State ──
      var activeTab = d.activeTab || 'selfcheck';

      // Self-Check state
      var scAnswers     = d.scAnswers || {};            // { questionId: 0..3 }
      var scQuestionIdx = d.scQuestionIdx != null ? d.scQuestionIdx : 0;
      var scShowResults = !!d.scShowResults;

      // Toolkit state
      var tkExpanded   = d.tkExpanded || null;
      var tkCommitted  = d.tkCommitted || {};           // { stratId: true }
      var tkCutMins    = d.tkCutMins != null ? d.tkCutMins : 30;  // Time Reclaim slider (min/day cut)
      var tkActivity   = d.tkActivity || '';                       // What you'd do with reclaimed time
      var algoTaps     = d.algoTaps || 0;               // Algorithm Reveal: total taps
      var algoHits     = d.algoHits || 0;               // Algorithm Reveal: jackpot hits
      var algoLast     = d.algoLast || null;            // Algorithm Reveal: last tap result
      var sleepStop    = d.sleepStop != null ? d.sleepStop : 23.0; // Sleep widget: hour you stop scrolling (24h)
      var sleepWake    = d.sleepWake != null ? d.sleepWake : 6.5;  // Sleep widget: wake hour

      // Cyberbullying state
      var cbScenIdx    = d.cbScenIdx != null ? d.cbScenIdx : 0;
      var cbChoice     = d.cbChoice != null ? d.cbChoice : null;
      var cbCompleted  = d.cbCompleted || {};           // { scenId: rating }
      var cbRecoveryViewed = d.cbRecoveryViewed || {};
      var cbFriendOpen = d.cbFriendOpen || null;        // which script is expanded
      var cbFriendViewed = d.cbFriendViewed || {};      // which scripts have been opened
      var cbPlatformOpen = d.cbPlatformOpen || null;    // which platform card is expanded

      // Media literacy state
      var mlExpanded   = d.mlExpanded || null;
      var mlViewed     = d.mlViewed || {};
      var stMode       = d.stMode || 'learn';           // 'learn' or 'quiz'
      var stIdx        = d.stIdx != null ? d.stIdx : 0;
      var stPicked     = d.stPicked || {};              // { itemId: { optIdx: true } }
      var stSubmitted  = d.stSubmitted || {};           // { itemId: true }
      var stScore      = d.stScore || 0;

      // Crisis state
      var crisisAcknowledged = !!d.crisisAcknowledged;
      var trustedAdults = d.trustedAdults || [];
      var newAdultName  = d.newAdultName || '';
      var newAdultRole  = d.newAdultRole || '';
      var roOpen        = d.roOpen || null;             // which reach-out script is expanded

      // AI Reframe state
      var rfInput    = d.rfInput || '';
      var rfLoading  = !!d.rfLoading;
      var rfReply    = d.rfReply || '';
      var rfShown    = !!d.rfShown;

      // Doomscroll Recovery state
      var dsActive   = !!d.dsActive;
      var dsStep     = d.dsStep != null ? d.dsStep : 0;
      var dsDone     = d.dsDone || {};

      // Reference tab state
      var refSection = d.refSection || 'glossary';
      var refExpanded = d.refExpanded || null;

      // AI Companions tab state
      var aicAnswers       = d.aicAnswers || {};
      var aicQIdx          = d.aicQIdx != null ? d.aicQIdx : 0;
      var aicShowResults   = !!d.aicShowResults;
      var aicMythIdx       = d.aicMythIdx != null ? d.aicMythIdx : 0;
      var aicSycIdx        = d.aicSycIdx != null ? d.aicSycIdx : 0;
      var aicSycRevealed   = !!d.aicSycRevealed;
      var aicSection       = d.aicSection || 'intro';   // intro / checkin / what / asymmetry / uses / friend

      // Badges
      var earnedBadges = d.earnedBadges || {};
      var showBadgePopup = d.showBadgePopup || null;

      function tryAwardBadge(badgeId, label) {
        if (earnedBadges[badgeId]) return;
        var nb = Object.assign({}, earnedBadges); nb[badgeId] = true;
        upd({ earnedBadges: nb, showBadgePopup: { id: badgeId, label: label } });
        if (addToast) addToast('Badge earned: ' + label, 'success');
        if (celebrate) celebrate();
        if (announceToSR) announceToSR('Badge earned: ' + label);
      }

      // ─────────────────────────────────────────────
      // Header + tab bar
      // ─────────────────────────────────────────────
      function renderHeader() {
        var tabs = [
          { id: 'selfcheck',    icon: '🪞', label: 'Self-Check' },
          { id: 'toolkit',      icon: '⚖️', label: 'Toolkit' },
          { id: 'cyberbullying',icon: '🛡️', label: 'Cyberbullying' },
          { id: 'medialit',     icon: '🔍', label: 'What’s Real?' },
          { id: 'aicompanion',  icon: '🤖', label: 'AI Companions' },
          { id: 'crisis',       icon: '💚', label: 'When You’re Struggling' },
          { id: 'reference',    icon: '📚', label: 'Reference' }
        ];
        return h('div', { style: { marginBottom: 16 } },
          // ── Hero header ──
          h('div', { style: {
            padding: '18px 20px',
            marginBottom: 14,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 60%, #faf5ff 100%)',
            border: '1px solid #a5f3fc',
            display: 'flex', alignItems: 'center', gap: 16
          } },
            h('div', { 'aria-hidden': 'true', style: {
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, ' + ACCENT + ' 0%, #0e7490 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, color: '#fff',
              boxShadow: '0 6px 14px rgba(6, 182, 212, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            } }, '📱'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('h2', { style: { margin: '0 0 4px', color: _dwC('#0e7490'), fontSize: 22, lineHeight: 1.2 } },
                'Digital Wellbeing Studio'
              ),
              h('p', { style: { margin: 0, color: _dwC('#334155'), fontSize: 14, lineHeight: 1.5 } },
                'How online life is treating you, and how to take some of the steering wheel back. Companion to Safety & Boundaries, but focused on what happens INSIDE you when the screen is on.'
              )
            )
          ),
          h('div', { role: 'tablist', 'aria-label': 'Digital Wellbeing sections',
                     style: { display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '2px solid ' + ACCENT_MED, paddingBottom: 8 } },
            tabs.map(function(t) {
              var active = activeTab === t.id;
              return h('button', {
                key: t.id,
                role: 'tab',
                'aria-selected': active ? 'true' : 'false',
                'aria-controls': 'dw-panel-' + t.id,
                id: 'dw-tab-' + t.id,
                className: active ? 'dw-tab-active' : '',
                onClick: function() { upd('activeTab', t.id); if (announceToSR) announceToSR(t.label + ' tab selected'); },
                style: {
                  padding: '10px 16px',
                  borderRadius: '10px 10px 0 0',
                  border: 'none',
                  background: active ? ACCENT_BUTTON : 'transparent',
                  color: active ? '#fff' : _dwC('#334155'),
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer'
                }
              }, h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, t.icon), t.label);
            })
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 1 — Self-Check
      // ─────────────────────────────────────────────
      function scComputeBand() {
        var total = 0, count = 0;
        SELF_CHECK_QUESTIONS.forEach(function(q) {
          if (scAnswers[q.id] != null) { total += scAnswers[q.id]; count++; }
        });
        if (count === 0) return null;
        var pct = total / (count * 3); // 0..1
        if (pct < 0.30) return { band: 'low', label: 'Low impact', color: '#10b981',
          summary: 'Your relationship with screens looks pretty balanced right now. That is real and worth keeping. The Toolkit section has small upgrades worth knowing about, but you do not have an urgent problem.' };
        if (pct < 0.60) return { band: 'some', label: 'Some impact', color: '#f59e0b',
          summary: 'There are signs that screens are taking more from you than you might want. This is the moment when small changes work — the patterns are not deeply locked in yet. The Toolkit has three strategies that match what you flagged.' };
        return { band: 'high', label: 'Significant impact', color: '#ef4444',
          summary: 'A lot of your check-ins suggest screens are affecting sleep, mood, attention, or relationships in ways that are wearing on you. This is not a moral failing — modern apps are engineered to do exactly this. The Toolkit has concrete first moves, AND it is worth telling at least one adult so you have backup. The Crisis tab has hotlines if things feel heavier than that.' };
      }

      function scSuggestedStrategies(bandResult) {
        // Pick 3 strategies based on which dimensions scored highest
        var dimScores = {};
        SELF_CHECK_QUESTIONS.forEach(function(q) {
          if (scAnswers[q.id] != null) dimScores[q.dim] = (dimScores[q.dim] || 0) + scAnswers[q.id];
        });
        var dimToStrats = {
          compulsive: ['notifications', 'grayscale'],
          sleep: ['bedtime', 'parking'],
          comparison: ['curate', 'reset'],
          fomo: ['reset', 'curate'],
          attention: ['notifications', 'limits'],
          reactivity: ['curate', 'reset'],
          timeBlind: ['limits', 'grayscale'],
          phantom: ['notifications', 'parking'],
          displacement: ['replace', 'limits'],
          conflict: ['limits', 'reset'],
          control: ['limits', 'replace'],
          secrecy: ['reset', 'curate']
        };
        var picks = {};
        Object.keys(dimScores).sort(function(a, b) { return dimScores[b] - dimScores[a]; }).forEach(function(dim) {
          (dimToStrats[dim] || []).forEach(function(s) { picks[s] = true; });
        });
        var pickList = Object.keys(picks).slice(0, 3);
        return TOOLKIT_STRATEGIES.filter(function(s) { return pickList.indexOf(s.id) >= 0; });
      }

      function scDimensionBreakdown() {
        var dimLabels = {
          compulsive: 'Compulsive checking',
          sleep: 'Sleep disruption',
          comparison: 'Social comparison',
          fomo: 'FOMO / anxiety',
          attention: 'Attention fragmentation',
          reactivity: 'Mood reactivity (likes / views)',
          timeBlind: 'Time underestimation',
          phantom: 'Phantom notifications',
          displacement: 'Displacement of other activities',
          conflict: 'Conflict with family / friends',
          control: 'Difficulty cutting back',
          secrecy: 'Hiding usage'
        };
        var rows = [];
        Object.keys(dimLabels).forEach(function(dim) {
          var sum = 0, n = 0;
          SELF_CHECK_QUESTIONS.forEach(function(q) {
            if (q.dim === dim && scAnswers[q.id] != null) { sum += scAnswers[q.id]; n++; }
          });
          if (n > 0) rows.push({ dim: dim, label: dimLabels[dim], score: sum, max: n * 3, pct: sum / (n * 3) });
        });
        rows.sort(function(a, b) { return b.pct - a.pct; });
        return rows;
      }

      function renderSelfCheck() {
        if (scShowResults) {
          var result = scComputeBand();
          if (!result) {
            return h('div', { style: { padding: 20, color: _dwC('#64748b') } }, 'No answers recorded yet.');
          }
          var picks = scSuggestedStrategies(result);
          var rows = scDimensionBreakdown();
          // Compute overall impact percentage from rows for ring viz
          var totalPct = 0;
          if (rows.length > 0) {
            rows.forEach(function(r) { totalPct += r.pct; });
            totalPct = totalPct / rows.length;
          }
          var overallPct = Math.round(totalPct * 100);
          var ringCirc = 2 * Math.PI * 42; // r=42

          return h('div', { id: 'dw-panel-selfcheck', role: 'tabpanel', 'aria-labelledby': 'dw-tab-selfcheck' },
            h('div', { 'aria-live': 'polite', role: 'status', className: 'dw-result-card', style: {
              padding: 20, borderRadius: 14, marginBottom: 18,
              background: 'linear-gradient(135deg, ' + result.color + '12 0%, ' + result.color + '08 100%)',
              border: '2px solid ' + result.color,
              display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'
            } },
              // Ring viz
              h('div', { style: { position: 'relative', width: 100, height: 100, flexShrink: 0 } },
                h('svg', { width: 100, height: 100, viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', style: { transform: 'rotate(-90deg)' } },
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: _dwC('#e2e8f0'), strokeWidth: 8 }),
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: result.color, strokeWidth: 8,
                    strokeDasharray: ringCirc, strokeDashoffset: ringCirc * (1 - totalPct),
                    strokeLinecap: 'round', style: { transition: 'stroke-dashoffset 0.6s ease' } })
                ),
                h('div', { style: {
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', lineHeight: 1
                } },
                  h('div', { style: { fontSize: 26, fontWeight: 800, color: result.color } }, overallPct + '%'),
                  h('div', { style: { fontSize: 10, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 } }, 'impact')
                )
              ),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 12, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 } }, 'Your check-in result'),
                h('div', { style: { fontSize: 24, fontWeight: 800, color: result.color, marginBottom: 8, lineHeight: 1.2 } }, result.label),
                h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#1e293b') } }, result.summary)
              )
            ),
            h('h3', { style: { margin: '16px 0 8px', color: _dwC('#0f172a') } }, 'Where it shows up most'),
            h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 10 } },
              'Each bar is one dimension of digital impact, sorted from highest to lowest. The bars near the top are where small changes will help most.'),
            h('div', { role: 'list', 'aria-label': 'Dimension breakdown', style: { display: 'grid', gap: 6, marginBottom: 16 } },
              rows.map(function(r) {
                var color = r.pct >= 0.66 ? '#ef4444' : (r.pct >= 0.34 ? '#f59e0b' : '#10b981');
                var pctText = Math.round(r.pct * 100) + '%';
                return h('div', { key: r.dim, role: 'listitem',
                  'aria-label': r.label + ': ' + pctText + ' impact',
                  style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } },
                  h('div', { style: { width: 180, color: _dwC('#0f172a'), fontWeight: 500, flexShrink: 0 } }, r.label),
                  h('div', { style: { flex: 1, background: _dwC('#e2e8f0'), height: 18, borderRadius: 4, overflow: 'hidden', position: 'relative' } },
                    h('div', { style: { background: color, height: '100%', width: (r.pct * 100) + '%', transition: 'width 0.4s ease' } }),
                    h('span', { style: { position: 'absolute', right: 6, top: 0, lineHeight: '18px', fontSize: 11, fontWeight: 700, color: _dwC('#0f172a') } }, pctText)
                  )
                );
              })
            ),
            h('h3', { style: { margin: '16px 0 8px', color: _dwC('#0f172a') } }, 'Three strategies that match what you flagged'),
            h('div', { style: { display: 'grid', gap: 10 } },
              picks.map(function(s) {
                return h('div', { key: s.id, style: {
                  padding: 14, border: '1px solid ' + ACCENT_MED, borderRadius: 10, background: _dwC('#f8fafc')
                } },
                  h('div', { style: { fontWeight: 700, fontSize: 15, marginBottom: 4, color: _dwC('#0f172a') } },
                    h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, s.icon), s.title),
                  h('div', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 6 } }, s.what),
                  h('div', { style: { fontSize: 13, color: _dwC('#0f172a') } },
                    h('strong', null, 'Try first: '), s.first)
                );
              })
            ),
            h('p', { style: { fontSize: 12, color: _dwC('#64748b'), marginTop: 14 } },
              'This is a self-check, not a diagnosis. It is meant to surface patterns worth noticing, not to label you. Talk to a school counselor or other trusted adult if anything here landed hard.'),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() { upd('activeTab', 'toolkit'); },
                style: { padding: '10px 16px', background: ACCENT_BUTTON, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
              }, 'Go to full Toolkit →'),
              h('button', {
                onClick: function() { openCounselorPacket(result, rows, picks); },
                style: { padding: '10px 16px', background: _dwC('#0e7490'), color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
              }, '🖨️ Print / share packet'),
              h('button', {
                onClick: function() {
                  upd({ scAnswers: {}, scQuestionIdx: 0, scShowResults: false });
                  if (announceToSR) announceToSR('Self-check reset');
                },
                style: { padding: '10px 16px', background: _dwC('#fff'), color: _dwC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }
              }, 'Retake check-in')
            ),
            h('p', { style: { fontSize: 12, color: _dwC('#64748b'), marginTop: 8 } },
              h('strong', null, 'For counselors / parents: '),
              'The packet button opens a printable summary of your check-in and the strategies you picked. You decide who sees it.')
          );
        }

        function openCounselorPacket(result, rows, picks) {
          var safeName = 'Digital Wellbeing Check-in';
          var dateStr = new Date().toLocaleDateString();
          var commitList = TOOLKIT_STRATEGIES.filter(function(s) { return tkCommitted[s.id]; });
          var trusted = trustedAdults || [];
          var html =
            '<!doctype html><html><head><meta charset="utf-8"><title>' + safeName + '</title>' +
            '<style>' +
              'body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; max-width: 720px; margin: 32px auto; padding: 24px; line-height: 1.55; }' +
              'h1 { color: #0e7490; margin: 0 0 4px; font-size: 22px; }' +
              'h2 { color: #0f172a; font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #06b6d4; padding-bottom: 4px; }' +
              '.meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }' +
              '.band { padding: 12px; border-radius: 8px; margin: 10px 0; border: 2px solid; }' +
              '.bar-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 13px; }' +
              '.bar-label { width: 220px; }' +
              '.bar-track { flex: 1; height: 14px; background: #e2e8f0; border-radius: 3px; overflow: hidden; position: relative; }' +
              '.bar-fill { height: 100%; }' +
              '.bar-pct { width: 40px; text-align: right; font-weight: 600; font-size: 12px; }' +
              '.strat { padding: 10px; background: #f8fafc; border-left: 3px solid #06b6d4; margin: 6px 0; font-size: 13px; }' +
              '.note { font-size: 11px; color: #64748b; font-style: italic; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }' +
              '.print-btn { padding: 8px 16px; background: #0e7490; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; margin-bottom: 16px; }' +
              '@media print { .print-btn { display: none; } body { margin: 0; padding: 16px; } }' +
            '</style></head><body>' +
            '<button class="print-btn" onclick="window.print()">🖨️ Print this packet</button>' +
            '<h1>📱 Digital Wellbeing Check-in</h1>' +
            '<div class="meta">Generated ' + dateStr + ' · This is a self-check, not a clinical diagnosis.</div>' +
            '<h2>Overall</h2>' +
            '<div class="band" style="border-color: ' + result.color + '; background: ' + result.color + '15;">' +
              '<div style="font-weight: 800; font-size: 18px; color: ' + result.color + ';">' + result.label + '</div>' +
              '<div style="margin-top: 4px;">' + result.summary + '</div>' +
            '</div>' +
            '<h2>Where it shows up most</h2>' +
            rows.map(function(r) {
              var c = r.pct >= 0.66 ? '#ef4444' : (r.pct >= 0.34 ? '#f59e0b' : '#10b981');
              return '<div class="bar-row">' +
                '<div class="bar-label">' + r.label + '</div>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + (r.pct * 100) + '%; background:' + c + ';"></div></div>' +
                '<div class="bar-pct">' + Math.round(r.pct * 100) + '%</div>' +
              '</div>';
            }).join('') +
            '<h2>Suggested first strategies</h2>' +
            picks.map(function(s) {
              return '<div class="strat"><strong>' + s.icon + ' ' + s.title + '</strong><br>' +
                '<em>Try first:</em> ' + s.first + '</div>';
            }).join('') +
            (commitList.length > 0
              ? '<h2>Strategies I committed to</h2>' +
                commitList.map(function(s) {
                  return '<div class="strat" style="border-left-color: #10b981;"><strong>✓ ' + s.icon + ' ' + s.title + '</strong></div>';
                }).join('')
              : '') +
            (trusted.length > 0
              ? '<h2>My trusted-adult circle</h2><ul>' +
                trusted.map(function(a) {
                  return '<li><strong>' + (a.name || '') + '</strong> — ' + (a.role || 'trusted adult') + '</li>';
                }).join('') + '</ul>'
              : '') +
            '<h2>Crisis numbers I have on hand</h2>' +
            '<ul>' +
              '<li>988 — call or text the Suicide &amp; Crisis Lifeline</li>' +
              '<li>Text HOME to 741741 — Crisis Text Line</li>' +
              '<li>1-800-843-5678 — CyberTipline (online exploitation / sextortion)</li>' +
              '<li>1-866-488-7386 or text START to 678-678 — The Trevor Project (LGBTQ+ youth)</li>' +
            '</ul>' +
            '<div class="note">Generated by Digital Wellbeing Studio (SEL Hub). This packet contains only what the student entered or selected — no behavioral logs, no message contents, no data sent off-device. Bring to a counselor, parent, or trusted adult if you want help acting on it.</div>' +
            '</body></html>';
          try {
            var w = window.open('', '_blank', 'width=800,height=900');
            if (!w) { if (addToast) addToast('Pop-up was blocked. Allow pop-ups for this site and try again.', 'warning'); return; }
            w.document.open(); w.document.write(html); w.document.close();
            if (announceToSR) announceToSR('Packet opened in a new window');
            tryAwardBadge('packet_made', 'Bridge Builder');
          } catch (e) {
            if (addToast) addToast('Could not open packet window: ' + (e.message || e), 'error');
          }
        }

        var q = SELF_CHECK_QUESTIONS[scQuestionIdx];
        var hasAnswer = scAnswers[q.id] != null;
        var totalAnswered = Object.keys(scAnswers).length;
        var likertLabels = ['Never', 'Sometimes', 'Often', 'Almost always'];

        return h('div', { id: 'dw-panel-selfcheck', role: 'tabpanel', 'aria-labelledby': 'dw-tab-selfcheck' },
          h('div', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 8 } },
            'Question ' + (scQuestionIdx + 1) + ' of ' + SELF_CHECK_QUESTIONS.length + ' · ' + totalAnswered + ' answered'
          ),
          h('div', { style: { background: _dwC('#e2e8f0'), height: 8, borderRadius: 4, marginBottom: 16, overflow: 'hidden' } },
            h('div', { className: 'dw-progress-fill', style: { height: '100%', width: ((scQuestionIdx + 1) / SELF_CHECK_QUESTIONS.length * 100) + '%' } })
          ),
          h('div', { style: {
            padding: 18, border: '1px solid ' + ACCENT_MED, borderRadius: 12, background: _dwC('#f8fafc'), marginBottom: 14
          } },
            h('div', { 'aria-live': 'polite', style: { fontSize: 17, fontWeight: 600, color: _dwC('#0f172a'), lineHeight: 1.5, marginBottom: 14 } }, q.text),
            h('div', { role: 'radiogroup', 'aria-label': 'How often: ' + q.text, style: { display: 'grid', gap: 8 } },
              likertLabels.map(function(lbl, idx) {
                var selected = scAnswers[q.id] === idx;
                return h('button', {
                  key: idx,
                  role: 'radio',
                  'aria-checked': selected ? 'true' : 'false',
                  onClick: function() {
                    var na = Object.assign({}, scAnswers); na[q.id] = idx;
                    upd('scAnswers', na);
                    if (announceToSR) announceToSR('Selected: ' + lbl);
                  },
                  style: {
                    padding: '12px 14px',
                    textAlign: 'left',
                    background: selected ? ACCENT_DIM : _dwC('#fff'),
                    border: '2px solid ' + (selected ? ACCENT : _dwC('#cbd5e1')),
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: selected ? 700 : 500,
                    color: _dwC('#0f172a'),
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid ' + (selected ? ACCENT : _dwC('#cbd5e1')),
                    background: selected ? ACCENT : _dwC('#fff'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1,
                    transition: 'all 0.18s ease'
                  } }, selected ? '✓' : ''),
                  h('span', null, lbl)
                );
              })
            ),
            hasAnswer && h('div', { style: {
              marginTop: 14, padding: 12, background: _dwC('#fff'), border: '1px dashed ' + ACCENT_MED, borderRadius: 8,
              fontSize: 13, color: _dwC('#334155'), lineHeight: 1.55
            } },
              h('strong', { style: { color: ACCENT, display: 'block', marginBottom: 4 } }, 'What this is about:'),
              q.research
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (scQuestionIdx > 0) upd('scQuestionIdx', scQuestionIdx - 1); },
              disabled: scQuestionIdx === 0,
              style: { padding: '10px 14px', background: _dwC('#fff'), color: scQuestionIdx === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: scQuestionIdx === 0 ? 'not-allowed' : 'pointer' }
            }, '← Previous'),
            scQuestionIdx < SELF_CHECK_QUESTIONS.length - 1
              ? h('button', {
                  onClick: function() { upd('scQuestionIdx', scQuestionIdx + 1); },
                  style: { padding: '10px 14px', background: ACCENT_BUTTON, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
                }, 'Next →')
              : h('button', {
                  onClick: function() {
                    upd('scShowResults', true);
                    tryAwardBadge('selfcheck_done', 'Self-Aware');
                    if (announceToSR) announceToSR('Self-check complete. Results shown below.');
                  },
                  disabled: totalAnswered < SELF_CHECK_QUESTIONS.length,
                  style: {
                    padding: '10px 14px',
                    background: totalAnswered < SELF_CHECK_QUESTIONS.length ? _dwC('#94a3b8') : '#10b981',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: totalAnswered < SELF_CHECK_QUESTIONS.length ? 'not-allowed' : 'pointer'
                  }
                }, 'See my result →')
          ),
          totalAnswered < SELF_CHECK_QUESTIONS.length && scQuestionIdx === SELF_CHECK_QUESTIONS.length - 1
            && h('p', { style: { fontSize: 12, color: _dwC('#64748b'), marginTop: 8, textAlign: 'right' } },
                'Answer all questions to see your result.'),
          // AI Reframe always available
          renderAIReframe()
        );
      }

      function renderAIReframe() {
        function runReframe() {
          if (!rfInput.trim() || !callGemini) return;
          // Safety pre-check: kids type comparison thoughts here ("I'll never
          // be like them" / darker variants). Block on critical content;
          // surface crisis resources instead of an AI reframe.
          var rfSafety = (window.SelHub && window.SelHub.safeRehearseCheck)
            ? window.SelHub.safeRehearseCheck(rfInput, { toolId: 'digitalwellbeing', onSafetyFlag: (ctx && ctx.onSafetyFlag) || null })
            : { action: 'continue' };
          if (rfSafety.action === 'block') {
            upd({ rfLoading: false, rfReply: window.SelHub.rehearseBreakCharacterText(rfSafety.severity), _lastTier: 3 });
            return;
          }
          upd({ rfLoading: true, rfReply: '' });
          var prompt =
            'A teenager wrote down a thought they had after seeing something on social media. The thought is below. ' +
            'You are a kind, grounded peer-mentor — not a therapist. Give a brief reframe in three labeled parts, each 2 short sentences max:\n\n' +
            '1) What you do NOT see in their feed (the hidden side of curated highlight reels).\n' +
            '2) What is true about you that this thought is overlooking (without being saccharine — make it specific and credible).\n' +
            '3) What a good friend would actually say back.\n\n' +
            'Tone: warm, real, never preachy. No emojis. No "you should." Avoid clichés like "you are beautiful inside." ' +
            'Do not promise everything will be fine. Do not minimize the feeling. Keep total length under 130 words.\n\n' +
            'The thought: "' + rfInput.trim().replace(/"/g, '\\"') + '"';
          callGemini(prompt, false).then(function(r) {
            upd({ rfLoading: false, rfReply: (r || '').trim() });
            if (announceToSR) announceToSR('Reframe ready');
            tryAwardBadge('rf_used', 'Kinder to Yourself');
          }).catch(function() {
            upd({ rfLoading: false, rfReply: 'The AI is not reachable right now. While you wait, try this: write what the kindest person in your life would say to you about this thought. Read it twice. That voice is closer to the truth than the comparison.' });
          });
        }
        return h('div', { style: {
          marginTop: 20, padding: 16,
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fef3f2 100%)',
          border: '1px solid #f9a8d4', borderRadius: 12
        } },
          h('button', {
            onClick: function() { upd('rfShown', !rfShown); },
            'aria-expanded': rfShown ? 'true' : 'false',
            style: {
              width: '100%', padding: '8px 0', background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8
            }
          },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '💭'),
            h('span', { style: { flex: 1, fontWeight: 700, color: _dwC('#9d174d'), fontSize: 15 } }, 'Reframe a comparison thought (with AI help)'),
            h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 18 } }, rfShown ? '▾' : '▸')
          ),
          rfShown && h('div', { style: { marginTop: 10 } },
            h('p', { style: { margin: '0 0 10px', fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.55 } },
              'Type a comparison thought you have had recently — the kind that pops up after scrolling. ',
              h('em', null, '"Everyone else is happier / hotter / smarter / has more friends than me."'),
              ' The AI will reflect it back through three angles: what you do not see in their feed, what is true about you, and what a kind friend would say.'),
            h('label', { htmlFor: 'dw-rf-input', style: { display: 'block', fontSize: 12, color: _dwC('#475569'), marginBottom: 4 } },
              'Your thought:'),
            h('textarea', {
              id: 'dw-rf-input',
              value: rfInput,
              onChange: function(e) { upd('rfInput', e.target.value); },
              placeholder: 'Everyone at school seems to have more friends than I do...',
              rows: 3,
              style: { width: '100%', padding: 10, border: '1px solid #f9a8d4', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }
            }),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: runReframe,
                disabled: rfLoading || !rfInput.trim() || !callGemini,
                'aria-busy': rfLoading ? 'true' : 'false',
                style: {
                  padding: '8px 14px',
                  background: (rfLoading || !rfInput.trim() || !callGemini) ? _dwC('#94a3b8') : '#db2777',
                  color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700,
                  cursor: (rfLoading || !rfInput.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                  fontSize: 13
                }
              }, rfLoading ? 'Thinking...' : (callGemini ? 'Reframe this' : 'AI not available')),
              rfReply && h('button', {
                onClick: function() { upd({ rfInput: '', rfReply: '' }); },
                style: { padding: '8px 14px', background: _dwC('#fff'), color: _dwC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
              }, 'Try another')
            ),
            !callGemini && h('p', { style: { fontSize: 11, color: _dwC('#9d174d'), marginTop: 6 } },
              'AI features need a connection. While offline: try writing what the kindest person in your life would say back to you.'),
            // Surface 988 / Crisis Text Line block when last reframe input was tier-3.
            (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
            rfReply && h('div', { 'aria-live': 'polite', style: {
              marginTop: 12, padding: 14, background: _dwC('#fff'), border: '1px dashed #f9a8d4',
              borderRadius: 8, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a'), whiteSpace: 'pre-wrap'
            } }, rfReply),
            rfReply && h('p', { style: { fontSize: 11, color: _dwC('#9d174d'), marginTop: 8, fontStyle: 'italic' } },
              'AI-generated. Take what is useful, leave the rest. If a thought feels much heavier than this can hold, that is a sign to talk to a real person — Crisis tab has the numbers.')
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 2 — Toolkit
      // ─────────────────────────────────────────────
      function renderAlgorithmReveal() {
        var hitRate = algoTaps > 0 ? (algoHits / algoTaps * 100) : 0;
        // Slot-machine style: each "scroll" has a ~12% jackpot, otherwise filler.
        // The point isn't accuracy — it's visceral demo of variable rewards.
        var fillerSlots = ['📄', '📰', '😐', '🥱', '📺', '💬', '🛒', '📷'];
        var jackpotSlots = ['🎉', '✨', '🔥', '💥'];
        function tap() {
          var jackpot = Math.random() < 0.12;
          var slot = jackpot
            ? jackpotSlots[Math.floor(Math.random() * jackpotSlots.length)]
            : fillerSlots[Math.floor(Math.random() * fillerSlots.length)];
          upd({
            algoTaps: algoTaps + 1,
            algoHits: algoHits + (jackpot ? 1 : 0),
            algoLast: { slot: slot, jackpot: jackpot }
          });
          if (algoTaps + 1 >= 20) tryAwardBadge('algo_seen', 'Sees the Machine');
        }
        return h('div', { style: {
          padding: 16, marginBottom: 16,
          background: 'linear-gradient(135deg, #faf5ff 0%, #fdf4ff 100%)',
          border: '1px solid #d8b4fe', borderRadius: 12
        } },
          h('h3', { style: { margin: '0 0 8px', color: _dwC('#6b21a8'), fontSize: 16 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🎰'),
            'Algorithm Reveal — why the feed pulls you back'),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.55 } },
            'Infinite-scroll feeds use ',
            h('strong', null, 'variable reward'),
            ' — most scrolls give you something boring, but ', h('em', null, 'sometimes'),
            ' you hit something great. Your brain learns to keep pulling the lever because the next one ',
            h('em', null, 'might'),
            ' be a hit. This is the same mechanism slot machines use. Try it below:'),
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 } },
            h('button', {
              onClick: tap,
              'aria-label': 'Tap to scroll once',
              style: {
                width: 90, height: 90, borderRadius: 18,
                background: '#a855f7', color: '#fff', border: 'none',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(168,85,247,0.35)'
              }
            }, 'TAP TO\nSCROLL'),
            h('div', { 'aria-live': 'polite', style: {
              width: 110, height: 110, borderRadius: 14,
              background: _dwC('#fff'), border: '3px solid ' + (algoLast && algoLast.jackpot ? '#10b981' : '#d8b4fe'),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, lineHeight: 1
            } },
              h('span', { 'aria-hidden': 'true' }, algoLast ? algoLast.slot : '—'),
              algoLast && algoLast.jackpot && h('div', { style: { fontSize: 10, color: '#10b981', fontWeight: 800, marginTop: 4 } }, 'JACKPOT')
            )
          ),
          h('div', { style: { display: 'grid', gap: 6, gridTemplateColumns: '1fr 1fr 1fr', fontSize: 12, textAlign: 'center' } },
            h('div', { className: 'dw-stat-tile', style: { padding: 10, background: _dwC('#fff'), borderRadius: 8 } },
              h('div', { style: { color: _dwC('#64748b') } }, 'Taps'),
              h('div', { style: { fontWeight: 800, fontSize: 18, color: _dwC('#6b21a8') } }, algoTaps)),
            h('div', { className: 'dw-stat-tile', style: { padding: 10, background: _dwC('#fff'), borderRadius: 8 } },
              h('div', { style: { color: _dwC('#64748b') } }, 'Hits'),
              h('div', { style: { fontWeight: 800, fontSize: 18, color: '#10b981' } }, algoHits)),
            h('div', { className: 'dw-stat-tile', style: { padding: 10, background: _dwC('#fff'), borderRadius: 8 } },
              h('div', { style: { color: _dwC('#64748b') } }, 'Hit rate'),
              h('div', { style: { fontWeight: 800, fontSize: 18, color: _dwC('#6b21a8') } }, hitRate.toFixed(0) + '%'))
          ),
          algoTaps >= 10 && h('p', { style: { margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } },
            h('strong', { style: { color: _dwC('#6b21a8') } }, 'Notice the pull. '),
            'Even though most taps give nothing, you probably wanted to tap again after a "jackpot." That is the design. Real feeds are calibrated by data scientists to maximize this exact pull. Knowing the mechanism is the first step in not being run by it.'),
          algoTaps > 0 && h('button', {
            onClick: function() { upd({ algoTaps: 0, algoHits: 0, algoLast: null }); },
            style: { marginTop: 10, padding: '6px 12px', background: 'transparent', border: '1px solid #d8b4fe', color: _dwC('#6b21a8'), borderRadius: 6, fontSize: 12, cursor: 'pointer' }
          }, 'Reset')
        );
      }

      function renderSleepTimeline() {
        // Calculate sleep window in hours, handling overnight wrap
        var stop = sleepStop;
        var wake = sleepWake;
        var sleepHrs = wake - stop; if (sleepHrs <= 0) sleepHrs += 24;
        // Recommended for teens: 8-10 hours
        var color = sleepHrs >= 9 ? '#10b981' : (sleepHrs >= 8 ? '#84cc16' : (sleepHrs >= 7 ? '#f59e0b' : '#ef4444'));
        function fmtHr(h24) {
          var hr = Math.floor(h24);
          var mn = Math.round((h24 - hr) * 60);
          var ampm = hr >= 12 ? 'PM' : 'AM';
          var h12 = ((hr + 11) % 12) + 1;
          return h12 + ':' + (mn < 10 ? '0' + mn : mn) + ' ' + ampm;
        }
        // Recommended scroll-stop is 30 min before wind-down, with target sleep of 9 hours.
        var idealStop = wake - 9.5; if (idealStop < 0) idealStop += 24;
        return h('div', { style: {
          padding: 16, marginBottom: 16,
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
          border: '1px solid #93c5fd', borderRadius: 12
        } },
          h('h3', { style: { margin: '0 0 8px', color: _dwC('#1e40af'), fontSize: 16 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🛌'),
            'Sleep Math — what is your phone actually costing you?'),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.55 } },
            'Teens need ', h('strong', null, '8 to 10 hours'),
            ' (American Academy of Sleep Medicine). Most are getting under 7. Set when you put the phone down and when you wake up:'),
          h('div', { style: { display: 'grid', gap: 12, marginBottom: 12 } },
            h('label', { htmlFor: 'dw-sleep-stop', style: { display: 'block', fontSize: 13, color: _dwC('#475569') } },
              'I put the phone down at ',
              h('strong', { style: { color: _dwC('#1e40af'), fontSize: 15 } }, fmtHr(sleepStop))),
            h('input', {
              id: 'dw-sleep-stop',
              type: 'range', min: 18, max: 26, step: 0.25, value: sleepStop,
              onChange: function(e) {
                var v = parseFloat(e.target.value);
                if (v >= 24) v -= 24;
                upd('sleepStop', v);
              },
              'aria-label': 'When you put the phone down',
              style: { width: '100%', accentColor: '#3b82f6' }
            }),
            h('label', { htmlFor: 'dw-sleep-wake', style: { display: 'block', fontSize: 13, color: _dwC('#475569') } },
              'I wake up at ',
              h('strong', { style: { color: _dwC('#1e40af'), fontSize: 15 } }, fmtHr(sleepWake))),
            h('input', {
              id: 'dw-sleep-wake',
              type: 'range', min: 5, max: 10, step: 0.25, value: sleepWake,
              onChange: function(e) { upd('sleepWake', parseFloat(e.target.value)); },
              'aria-label': 'Wake time',
              style: { width: '100%', accentColor: '#3b82f6' }
            })
          ),
          // 24h horizon bar with day/night gradient + sleep window highlight
          h('div', { style: { marginTop: 16, marginBottom: 6, fontSize: 11, color: _dwC('#64748b'), display: 'flex', justifyContent: 'space-between', padding: '0 2px' } },
            h('span', null, '🌇 6 PM'),
            h('span', null, '🌙 Midnight'),
            h('span', null, '🌅 6 AM'),
            h('span', null, '☀️ Noon')),
          h('div', { 'aria-hidden': 'true', style: {
            position: 'relative', height: 30, borderRadius: 6, overflow: 'hidden',
            background: 'linear-gradient(90deg, #fbbf24 0%, #6366f1 18%, #1e1b4b 38%, #6366f1 62%, #fbbf24 80%, #fcd34d 100%)',
            boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.18)'
          } },
            // Hour tick marks (every 3 hours)
            [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map(function(pct, i) {
              return h('div', { key: 'tick-' + i, style: {
                position: 'absolute', left: (pct * 100) + '%', top: 0, bottom: 0,
                width: 1, background: 'rgba(255, 255, 255, 0.22)'
              } });
            }),
            // Sleep window overlay
            (function() {
              var startMapped = sleepStop < 18 ? sleepStop + 24 : sleepStop;
              var endMapped = sleepWake < 18 ? sleepWake + 24 : sleepWake;
              if (endMapped <= startMapped) endMapped += 24;
              var leftPct = ((startMapped - 18) / 24) * 100;
              var widthPct = ((endMapped - startMapped) / 24) * 100;
              if (widthPct > 100) widthPct = 100;
              return h('div', { style: {
                position: 'absolute', left: leftPct + '%', width: widthPct + '%',
                top: 2, bottom: 2,
                background: color,
                border: '2px solid #fff',
                borderRadius: 5,
                boxShadow: '0 0 0 1px ' + color + ', 0 2px 6px rgba(15, 23, 42, 0.30)',
                transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 11, lineHeight: 1,
                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
              } }, widthPct > 14 ? '💤 sleep' : '💤');
            })()
          ),
          h('div', { 'aria-live': 'polite', style: {
            marginTop: 12, padding: 12, background: _dwC('#fff'), borderRadius: 8,
            border: '2px solid ' + color, textAlign: 'center'
          } },
            h('div', { style: { fontSize: 11, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Your sleep window'),
            h('div', { style: { fontSize: 28, fontWeight: 800, color: color } }, sleepHrs.toFixed(1) + ' hours'),
            h('div', { style: { fontSize: 13, color: _dwC('#334155'), marginTop: 4 } },
              sleepHrs >= 9 ? 'Excellent — well within the teen sleep recommendation.' :
              sleepHrs >= 8 ? 'Good — within the recommended range. Keep it consistent.' :
              sleepHrs >= 7 ? 'Below recommendation. Pushing your scroll-stop earlier is the highest-leverage change you can make.' :
              'Significantly below what teen brains need. The fastest path to feeling better most days is more sleep. Try moving your scroll-stop to ' + fmtHr(idealStop) + '.')
          )
        );
      }

      function renderDoomscrollRecovery() {
        if (!dsActive) {
          return h('div', { style: {
            padding: 12, marginBottom: 14,
            background: _dwC('#fef2f2'), border: '1px dashed #fecaca', borderRadius: 10
          } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🌀'),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontWeight: 700, color: _dwC('#991b1b'), fontSize: 14 } }, 'Already deep in a scroll?'),
                h('div', { style: { fontSize: 12, color: _dwC('#475569'), marginTop: 2 } }, 'It is 1 AM and you just looked up — start the 4-minute reset.')),
              h('button', {
                onClick: function() { upd({ dsActive: true, dsStep: 0, dsDone: {} }); if (announceToSR) announceToSR('Reset routine started'); },
                style: { padding: '8px 14px', background: _dwC('#dc2626'), color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
              }, 'Start reset')
            )
          );
        }
        var step = DOOMSCROLL_RESET[dsStep];
        var done = !!dsDone[dsStep];
        var totalDone = Object.keys(dsDone).filter(function(k) { return dsDone[k]; }).length;
        var complete = totalDone >= DOOMSCROLL_RESET.length;

        if (complete) {
          return h('div', { 'aria-live': 'polite', style: {
            padding: 18, marginBottom: 14,
            background: _dwC('#f0fdf4'), border: '2px solid #10b981', borderRadius: 12, textAlign: 'center'
          } },
            h('div', { style: { fontSize: 36 } }, '✓'),
            h('div', { style: { fontWeight: 800, fontSize: 18, color: _dwC('#166534'), marginTop: 6 } }, 'Reset complete'),
            h('p', { style: { margin: '8px 0 0', fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.55 } },
              'That was about four minutes of choice instead of three hours of autopilot. Tomorrow you will not have undone the scrolling, but you broke the loop, which is the whole point. Sleep well.'),
            h('button', {
              onClick: function() { upd({ dsActive: false, dsStep: 0, dsDone: {} }); tryAwardBadge('doom_reset', 'Loop Breaker'); },
              style: { marginTop: 12, padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
            }, 'Close')
          );
        }
        return h('div', { style: {
          padding: 16, marginBottom: 14,
          background: _dwC('#fef2f2'), border: '2px solid #fca5a5', borderRadius: 12
        } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
            h('div', { style: { fontWeight: 800, color: _dwC('#991b1b'), fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🌀'),
              'Doomscroll Reset — step ' + (dsStep + 1) + ' of ' + DOOMSCROLL_RESET.length),
            h('button', {
              'aria-label': 'Exit reset routine',
              onClick: function() { upd({ dsActive: false, dsStep: 0, dsDone: {} }); },
              style: { background: 'transparent', border: 'none', color: _dwC('#991b1b'), cursor: 'pointer', fontSize: 18, fontWeight: 700 }
            }, '×')
          ),
          // progress dots
          h('div', { 'aria-hidden': 'true', style: { display: 'flex', gap: 4, marginBottom: 12 } },
            DOOMSCROLL_RESET.map(function(_, i) {
              return h('div', { key: i, style: {
                flex: 1, height: 6, borderRadius: 3,
                background: dsDone[i] ? '#10b981' : (i === dsStep ? '#fca5a5' : _dwC('#fee2e2'))
              } });
            })
          ),
          h('div', { 'aria-live': 'polite', style: {
            padding: 14, background: _dwC('#fff'), border: '1px solid #fecaca', borderRadius: 8
          } },
            h('div', { style: { fontSize: 28, fontWeight: 800, color: _dwC('#dc2626'), marginBottom: 4 } }, 'Step ' + step.step),
            h('div', { style: { fontWeight: 700, fontSize: 16, color: _dwC('#0f172a'), marginBottom: 6 } }, step.title),
            h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.55, color: _dwC('#334155') } }, step.body),
            h('div', { style: { fontSize: 12, color: _dwC('#64748b'), fontStyle: 'italic' } }, step.sec)
          ),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (dsStep > 0) upd('dsStep', dsStep - 1); },
              disabled: dsStep === 0,
              style: { padding: '8px 14px', background: _dwC('#fff'), color: dsStep === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                       border: '1px solid #fecaca', borderRadius: 8, fontWeight: 600, cursor: dsStep === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
            }, '← Back'),
            !done
              ? h('button', {
                  onClick: function() {
                    var nd = Object.assign({}, dsDone); nd[dsStep] = true;
                    var u = { dsDone: nd };
                    if (dsStep < DOOMSCROLL_RESET.length - 1) u.dsStep = dsStep + 1;
                    upd(u);
                  },
                  style: { padding: '8px 14px', background: _dwC('#dc2626'), color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                }, dsStep < DOOMSCROLL_RESET.length - 1 ? 'Done — next →' : 'Done — finish')
              : h('button', {
                  onClick: function() {
                    if (dsStep < DOOMSCROLL_RESET.length - 1) upd('dsStep', dsStep + 1);
                  },
                  disabled: dsStep >= DOOMSCROLL_RESET.length - 1,
                  style: { padding: '8px 14px', background: _dwC('#94a3b8'), color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
                }, 'Next →')
          )
        );
      }

      function renderToolkit() {
        var committedCount = Object.keys(tkCommitted).length;
        // Time math
        var minPerDay = tkCutMins;
        var hrsPerYear = (minPerDay * 365) / 60;
        var daysPerYear = hrsPerYear / 24;
        var schoolWeeksPerYear = hrsPerYear / 35; // ~35 hours = a school week of awake time

        return h('div', { id: 'dw-panel-toolkit', role: 'tabpanel', 'aria-labelledby': 'dw-tab-toolkit' },
          h('div', { style: { padding: 14, background: _dwC('#f0fdfa'), border: '1px solid ' + ACCENT_MED, borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } },
              h('strong', { style: { color: ACCENT } }, 'Pick small, pick specific. '),
              'Trying to overhaul your whole phone relationship in one weekend almost always fails. Pick one or two strategies that match what you actually struggle with. Commit by tapping "I will try this." Come back next week and see what stuck.')
          ),
          // ── Doomscroll Recovery (visible only when activated; otherwise small entry button) ──
          renderDoomscrollRecovery(),
          // ── Algorithm Reveal ──
          renderAlgorithmReveal(),
          // ── Sleep Timeline ──
          renderSleepTimeline(),
          // ── Time Reclaim ──
          h('div', { style: {
            padding: 16, marginBottom: 16,
            background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)',
            border: '1px solid #67e8f9', borderRadius: 12
          } },
            h('h3', { style: { margin: '0 0 8px', color: _dwC('#0e7490'), fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⏳'),
              'Time Reclaim — what could you actually do with it?'),
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.55 } },
              'Most "I should use my phone less" never works because the savings feel abstract. Move the slider to a realistic cut, then see the math.'),
            h('label', { htmlFor: 'dw-tk-slider', style: { display: 'block', fontSize: 13, color: _dwC('#475569'), marginBottom: 4 } },
              'If I cut my scrolling by ',
              h('strong', { style: { color: _dwC('#0e7490'), fontSize: 16 } }, tkCutMins + ' min/day')),
            h('input', {
              id: 'dw-tk-slider',
              type: 'range', min: 5, max: 180, step: 5, value: tkCutMins,
              onChange: function(e) { upd('tkCutMins', parseInt(e.target.value, 10)); },
              'aria-label': 'Minutes per day to cut',
              style: { width: '100%', accentColor: ACCENT }
            }),
            h('div', { style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginTop: 12 } },
              h('div', { className: 'dw-stat-tile', style: { padding: 12, background: _dwC('#fff'), borderRadius: 10, textAlign: 'center', border: '1px solid #cffafe' } },
                h('div', { style: { fontSize: 11, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Per year'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: _dwC('#0e7490') } }, Math.round(hrsPerYear) + ' hrs')),
              h('div', { className: 'dw-stat-tile', style: { padding: 12, background: _dwC('#fff'), borderRadius: 10, textAlign: 'center', border: '1px solid #cffafe' } },
                h('div', { style: { fontSize: 11, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Equals'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: _dwC('#0e7490') } }, daysPerYear.toFixed(1) + ' full days')),
              h('div', { className: 'dw-stat-tile', style: { padding: 12, background: _dwC('#fff'), borderRadius: 10, textAlign: 'center', border: '1px solid #cffafe' } },
                h('div', { style: { fontSize: 11, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Or about'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: _dwC('#0e7490') } }, schoolWeeksPerYear.toFixed(1) + ' school wks'))
            ),
            h('label', { htmlFor: 'dw-tk-activity', style: { display: 'block', fontSize: 13, color: _dwC('#475569'), marginTop: 14, marginBottom: 4 } },
              'What would you actually want to do with ' + Math.round(hrsPerYear) + ' hours?'),
            h('input', {
              id: 'dw-tk-activity',
              type: 'text', value: tkActivity,
              onChange: function(e) { upd('tkActivity', e.target.value); },
              placeholder: 'learn guitar, train for a 5K, write a story, sleep more...',
              style: { width: '100%', padding: '10px 12px', border: '1px solid #67e8f9', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
            }),
            tkActivity && tkActivity.length > 2 && h('p', { 'aria-live': 'polite', style: { margin: '8px 0 0', fontSize: 13, color: _dwC('#0e7490'), fontWeight: 600 } },
              '✓ Worth more to you than the scroll? Then the math is on your side.')
          ),
          committedCount > 0 && h('p', { 'aria-live': 'polite', style: { fontSize: 13, color: '#10b981', fontWeight: 600, marginBottom: 8 } },
            'You committed to ' + committedCount + ' ' + (committedCount === 1 ? 'strategy' : 'strategies') + '. Nice.'),
          h('div', { style: { display: 'grid', gap: 10 } },
            TOOLKIT_STRATEGIES.map(function(s) {
              var expanded = tkExpanded === s.id;
              var committed = !!tkCommitted[s.id];
              return h('div', { key: s.id, style: {
                border: '1px solid ' + (committed ? '#10b981' : ACCENT_MED),
                borderRadius: 10,
                background: committed ? _dwC('#f0fdf4') : _dwC('#fff'),
                overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() { upd('tkExpanded', expanded ? null : s.id); },
                  'aria-expanded': expanded ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 700, color: _dwC('#0f172a'),
                    display: 'flex', alignItems: 'center', gap: 12
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: committed ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)' : 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#fff',
                    boxShadow: committed ? '0 2px 6px rgba(5, 150, 105, 0.25)' : '0 2px 6px rgba(6, 182, 212, 0.20)'
                  } }, s.icon),
                  h('span', { style: { flex: 1 } }, s.title),
                  committed && h('span', { style: { fontSize: 11, color: '#fff', background: '#10b981', fontWeight: 700,
                    borderRadius: 12, padding: '3px 9px', letterSpacing: 0.3 } }, '✓ Committed'),
                  h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 18 } }, expanded ? '▾' : '▸')
                ),
                expanded && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#64748b'), marginBottom: 4 } }, 'What it is'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } }, s.what)
                  ),
                  h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#64748b'), marginBottom: 4 } }, 'Why it works'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#334155') } }, s.why)
                  ),
                  h('div', { style: { marginTop: 12, padding: 12, background: _dwC('#fff7ed'), border: '1px solid #fed7aa', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: _dwC('#9a3412'), marginBottom: 4 } }, 'Small enough to do today'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } }, s.first)
                  ),
                  h('p', { style: { fontSize: 12, color: _dwC('#64748b'), marginTop: 10, marginBottom: 0 } }, 'Source: ' + s.source),
                  h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h('button', {
                      onClick: function() {
                        var nc = Object.assign({}, tkCommitted);
                        if (committed) delete nc[s.id]; else nc[s.id] = true;
                        upd('tkCommitted', nc);
                        if (!committed) {
                          if (addToast) addToast('Locked in: ' + s.title, 'success');
                          if (announceToSR) announceToSR('Committed to ' + s.title);
                          if (Object.keys(nc).length >= 3) tryAwardBadge('toolkit_three', 'Habit Builder');
                        }
                      },
                      style: {
                        padding: '8px 14px',
                        background: committed ? _dwC('#fff') : '#10b981',
                        color: committed ? '#10b981' : '#fff',
                        border: '1px solid ' + (committed ? '#10b981' : '#10b981'),
                        borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13
                      }
                    }, committed ? '✓ Committed (tap to undo)' : 'I will try this')
                  )
                )
              );
            })
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 3 — Cyberbullying
      // ─────────────────────────────────────────────
      function renderCyberbullying() {
        var scen = CB_SCENARIOS[cbScenIdx];
        var alreadyDone = cbCompleted[scen.id] != null;
        var topRated = 0;
        Object.keys(cbCompleted).forEach(function(k) { if (cbCompleted[k] >= 3) topRated++; });

        return h('div', { id: 'dw-panel-cyberbullying', role: 'tabpanel', 'aria-labelledby': 'dw-tab-cyberbullying' },
          // ── Sextortion / predator signpost ──
          h('div', { role: 'note', style: {
            padding: 12, marginBottom: 14,
            background: _dwC('#fffbeb'), border: '2px solid #f59e0b', borderRadius: 10
          } },
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22, lineHeight: 1 } }, '⚠️'),
              h('div', null,
                h('div', { style: { fontWeight: 800, color: _dwC('#92400e'), fontSize: 14, marginBottom: 4 } },
                  'This tab is about cyberbullying. If something else is going on, go elsewhere first.'),
                h('p', { style: { margin: '0 0 6px', fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.5 } },
                  h('strong', null, 'If an adult is messaging you '),
                  '(sexual content, asking for photos, getting too friendly too fast, asking you to keep secrets, or threatening to share intimate images), that is ',
                  h('strong', null, 'sextortion / grooming'),
                  ' — a specific crime that needs different help.'),
                h('ul', { style: { margin: '0 0 6px 20px', padding: 0, fontSize: 13, lineHeight: 1.6, color: _dwC('#0f172a') } },
                  h('li', null, 'Open the ', h('strong', null, 'Safety & Boundaries'), ' SEL tool for the right scripts and steps'),
                  h('li', null, 'Call the ', h('strong', null, 'CyberTipline: 1-800-843-5678'), ' (NCMEC, free, anonymous)'),
                  h('li', null, 'Tell a trusted adult ', h('strong', null, 'today'), ' — do not wait')),
                h('p', { style: { margin: 0, fontSize: 12, color: _dwC('#64748b'), fontStyle: 'italic' } },
                  'You did nothing wrong, even if you sent something you regret. Adults who do this to kids are running a known playbook.'))
            )
          ),
          h('div', { style: { padding: 14, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16 } },
            h('h3', { style: { margin: '0 0 8px', color: _dwC('#991b1b'), fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🛡️'),
              'Why cyberbullying is different'),
            h('ul', { style: { margin: '0 0 0 20px', paddingLeft: 0, fontSize: 13, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('li', null, h('strong', null, 'Permanence. '), 'Screenshots last forever. A playground insult fades — a screenshot does not.'),
              h('li', null, h('strong', null, 'Scale. '), 'The audience can be hundreds or thousands of people, not just the kids who happened to be there.'),
              h('li', null, h('strong', null, 'Anonymity. '), 'You may not know who is hurting you, which makes it harder to confront or escape.'),
              h('li', null, h('strong', null, '24/7. '), 'Your bedroom does not protect you. Home stops being a safe space.'),
              h('li', null, h('strong', null, 'Silent witnesses. '), 'Group chats with 50 people — most stay quiet, which can feel like everyone agrees.')
            )
          ),

          // ── Platform quick-reference (report / block / restrict / privacy) ──
          h('div', { style: { padding: 14, background: _dwC('#f8fafc'), border: '1px solid #cbd5e1', borderRadius: 10, marginBottom: 16 } },
            h('h3', { style: { margin: '0 0 6px', color: _dwC('#0f172a'), fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⚙️'),
              'Where the buttons actually are — by platform'),
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: _dwC('#475569'), lineHeight: 1.5 } },
              'When you are in the moment, you do not want to be searching menus. Tap your platform to see exactly where Report, Block, and Privacy live. (UI changes over time — these were current as of 2024–2025.)'),
            h('div', { style: { display: 'grid', gap: 8 } },
              PLATFORM_REFS.map(function(p) {
                var open = cbPlatformOpen === p.id;
                return h('div', { key: p.id, style: {
                  border: '1px solid ' + (open ? p.color : _dwC('#e2e8f0')),
                  borderRadius: 8, background: _dwC('#fff'), overflow: 'hidden'
                } },
                  h('button', {
                    onClick: function() { upd('cbPlatformOpen', open ? null : p.id); },
                    'aria-expanded': open ? 'true' : 'false',
                    style: {
                      width: '100%', padding: '10px 12px', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 700, color: _dwC('#0f172a'),
                      display: 'flex', alignItems: 'center', gap: 10
                    }
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, p.icon),
                    h('span', { style: { flex: 1 } }, p.name),
                    h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 16 } }, open ? '▾' : '▸')
                  ),
                  open && h('div', { style: { padding: '0 12px 12px', borderTop: '1px solid #f1f5f9' } },
                    [
                      { lbl: '🚩 Report', key: 'report' },
                      { lbl: '🚫 Block', key: 'block' },
                      { lbl: '🤐 Restrict / Limit', key: 'restrict' },
                      { lbl: '🔒 Make account private', key: 'privacy' },
                      { lbl: '📨 Control who can message you', key: 'messages' }
                    ].map(function(row, idx) {
                      return h('div', { key: idx, style: { marginTop: 10 } },
                        h('div', { style: { fontSize: 12, fontWeight: 700, color: p.color, marginBottom: 2 } }, row.lbl),
                        h('div', { style: { fontSize: 13, color: _dwC('#0f172a'), lineHeight: 1.55 } }, p[row.key])
                      );
                    })
                  )
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: _dwC('#64748b'), fontStyle: 'italic' } },
              'When in doubt: Report > Block > Tell an adult. The combination is much stronger than any one alone.')
          ),

          h('div', { style: { padding: 16, border: '1px solid ' + ACCENT_MED, borderRadius: 12, background: _dwC('#fff'), marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: _dwC('#64748b'), marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
              'Scenario ' + (cbScenIdx + 1) + ' of ' + CB_SCENARIOS.length + (alreadyDone ? ' · Answered' : '')),
            h('h3', { style: { margin: '0 0 8px', color: _dwC('#0f172a') } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, scen.icon), scen.title),
            h('p', { 'aria-live': 'polite', style: { margin: '0 0 14px', fontSize: 15, lineHeight: 1.6, color: _dwC('#1e293b') } }, scen.setup),
            h('div', { role: 'radiogroup', 'aria-label': 'What would you do?', style: { display: 'grid', gap: 8 } },
              scen.choices.map(function(c, idx) {
                var picked = cbChoice === idx;
                return h('button', {
                  key: c.id,
                  role: 'radio',
                  'aria-checked': picked ? 'true' : 'false',
                  onClick: function() {
                    upd('cbChoice', idx);
                    if (announceToSR) announceToSR('Selected: ' + c.label);
                  },
                  style: {
                    padding: '12px 14px',
                    textAlign: 'left',
                    background: picked ? ACCENT_DIM : _dwC('#fff'),
                    border: '2px solid ' + (picked ? ACCENT : _dwC('#cbd5e1')),
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: picked ? 700 : 500,
                    color: _dwC('#0f172a'),
                    cursor: 'pointer'
                  }
                }, c.label);
              })
            ),
            cbChoice != null && h('div', { 'aria-live': 'polite', style: {
              marginTop: 12, padding: 12, borderRadius: 8,
              background: scen.choices[cbChoice].rating >= 3 ? _dwC('#f0fdf4') : (scen.choices[cbChoice].rating === 2 ? _dwC('#fefce8') : _dwC('#fef2f2')),
              border: '1px solid ' + (scen.choices[cbChoice].rating >= 3 ? '#bbf7d0' : (scen.choices[cbChoice].rating === 2 ? '#fde68a' : '#fecaca'))
            } },
              h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4,
                  color: scen.choices[cbChoice].rating >= 3 ? _dwC('#166534') : (scen.choices[cbChoice].rating === 2 ? _dwC('#854d0e') : _dwC('#991b1b')) } },
                scen.choices[cbChoice].rating >= 3 ? 'Strong response' : (scen.choices[cbChoice].rating === 2 ? 'Partial — worth thinking about' : 'Risky — think this through')),
              h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } }, scen.choices[cbChoice].feedback)
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'space-between' } },
              h('button', {
                onClick: function() {
                  if (cbScenIdx > 0) upd({ cbScenIdx: cbScenIdx - 1, cbChoice: null });
                },
                disabled: cbScenIdx === 0,
                style: { padding: '8px 14px', background: _dwC('#fff'), color: cbScenIdx === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                         border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: cbScenIdx === 0 ? 'not-allowed' : 'pointer' }
              }, '← Previous'),
              h('button', {
                disabled: cbChoice == null,
                onClick: function() {
                  if (cbChoice == null) return;
                  var newCompleted = Object.assign({}, cbCompleted);
                  newCompleted[scen.id] = scen.choices[cbChoice].rating;
                  var updates = { cbCompleted: newCompleted, cbChoice: null };
                  if (cbScenIdx < CB_SCENARIOS.length - 1) {
                    updates.cbScenIdx = cbScenIdx + 1;
                  } else {
                    var goodCount = 0;
                    Object.keys(newCompleted).forEach(function(k) { if (newCompleted[k] >= 3) goodCount++; });
                    if (goodCount >= 2) tryAwardBadge('cb_handled', 'Calm Under Pile-On');
                  }
                  upd(updates);
                },
                style: {
                  padding: '8px 14px',
                  background: cbChoice == null ? _dwC('#94a3b8') : ACCENT_BUTTON,
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                  cursor: cbChoice == null ? 'not-allowed' : 'pointer'
                }
              }, cbScenIdx < CB_SCENARIOS.length - 1 ? 'Lock in answer →' : 'Finish scenarios')
            )
          ),

          h('h3', { style: { margin: '24px 0 8px', color: _dwC('#0f172a') } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🕒'),
            'Recovery — it does not stop hurting the moment you close the app'),
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 12 } },
            'What to do AFTER. Most cyberbullying guidance covers the "screenshot, block, report, tell" loop. That part is in Safety & Boundaries. This part is about how to get through the next few days while it is still raw.'),
          h('div', { style: { display: 'grid', gap: 10 } },
            CB_RECOVERY.map(function(r, idx) {
              var viewed = !!cbRecoveryViewed[idx];
              return h('button', { key: idx,
                'aria-pressed': viewed ? 'true' : 'false',
                onClick: function() {
                  var nv = Object.assign({}, cbRecoveryViewed); nv[idx] = !viewed;
                  upd('cbRecoveryViewed', nv);
                  var totalViewed = Object.keys(nv).filter(function(k) { return nv[k]; }).length;
                  if (totalViewed >= 4) tryAwardBadge('cb_recovery', 'Steady Hands');
                },
                style: {
                  padding: 14,
                  background: viewed ? _dwC('#f0fdfa') : _dwC('#fff'),
                  border: '1px solid ' + (viewed ? '#5eead4' : _dwC('#e2e8f0')),
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit'
                }
              },
                h('div', { style: { fontWeight: 700, fontSize: 15, color: _dwC('#0f172a'), marginBottom: 4 } },
                  (viewed ? '✓ ' : '') + r.title),
                h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#334155') } }, r.body)
              );
            })
          ),
          // ── Helping a friend ──
          h('h3', { style: { margin: '28px 0 6px', color: _dwC('#0f172a') } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤝'),
            'If a friend is the one being targeted'),
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 12 } },
            'You do not have to be a counselor. You just have to be present. The single most protective thing a peer can do is not look away. Below: what to say, why it works, and what to avoid.'),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 14 } },
            FRIEND_HELP.scripts.map(function(s, idx) {
              var open = cbFriendOpen === idx;
              var viewed = !!cbFriendViewed[idx];
              return h('div', { key: idx, style: {
                border: '1px solid ' + (viewed ? '#a7f3d0' : _dwC('#cbd5e1')),
                borderRadius: 10,
                background: viewed ? _dwC('#f0fdf4') : _dwC('#fff'),
                overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() {
                    upd('cbFriendOpen', open ? null : idx);
                    if (!open) {
                      var nv = Object.assign({}, cbFriendViewed); nv[idx] = true;
                      upd('cbFriendViewed', nv);
                      if (Object.keys(nv).filter(function(k) { return nv[k]; }).length >= 3) tryAwardBadge('cb_friend', 'Good Friend');
                    }
                  },
                  'aria-expanded': open ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: _dwC('#0f172a'),
                    display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { flex: 1 } }, s.situation),
                  h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 18 } }, open ? '▾' : '▸')
                ),
                open && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { marginTop: 12, padding: 12, background: _dwC('#f0fdfa'), border: '1px solid #5eead4', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#0e7490'), fontWeight: 700, marginBottom: 4 } }, 'Say'),
                    h('p', { style: { margin: 0, fontSize: 15, lineHeight: 1.55, color: _dwC('#0f172a'), fontStyle: 'italic' } }, s.say)
                  ),
                  h('div', { style: { marginTop: 10 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#64748b'), fontWeight: 700, marginBottom: 4 } }, 'Why it works'),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#334155') } }, s.why)
                  )
                )
              );
            })
          ),
          h('div', { style: { padding: 14, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10 } },
            h('div', { style: { fontWeight: 700, color: _dwC('#991b1b'), marginBottom: 8, fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⛔'),
              'And what to AVOID'),
            h('div', { style: { display: 'grid', gap: 10 } },
              FRIEND_HELP.donts.map(function(d, idx) {
                return h('div', { key: idx },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: _dwC('#0f172a'), marginBottom: 2 } }, '✗ ' + d.what),
                  h('div', { style: { fontSize: 12, color: _dwC('#475569'), lineHeight: 1.5 } }, d.why)
                );
              })
            )
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 4 — What's Real? (Media Literacy)
      // ─────────────────────────────────────────────
      function renderMediaLit() {
        return h('div', { id: 'dw-panel-medialit', role: 'tabpanel', 'aria-labelledby': 'dw-tab-medialit' },
          h('div', { style: { padding: 14, background: _dwC('#f0f9ff'), border: '1px solid #bae6fd', borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } },
              h('strong', { style: { color: ACCENT } }, 'The feed is not a window. It is a slot machine. '),
              'Knowing how feeds are designed to manipulate you is a skill the way reading is a skill — it is not paranoia, it is just literacy. Each card below is a different category of manipulation, with concrete tells you can spot in under 10 seconds.')
          ),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 18 } },
            ML_ITEMS.map(function(item) {
              var expanded = mlExpanded === item.id;
              var viewed = !!mlViewed[item.id];
              return h('div', { key: item.id, style: {
                border: '1px solid ' + (viewed ? '#5eead4' : ACCENT_MED),
                borderRadius: 10,
                background: viewed ? _dwC('#f0fdfa') : _dwC('#fff'),
                overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() {
                    upd('mlExpanded', expanded ? null : item.id);
                    if (!expanded) {
                      var nv = Object.assign({}, mlViewed); nv[item.id] = true;
                      upd('mlViewed', nv);
                      if (Object.keys(nv).filter(function(k) { return nv[k]; }).length >= 4) tryAwardBadge('ml_master', 'Lateral Reader');
                    }
                  },
                  'aria-expanded': expanded ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 700, color: _dwC('#0f172a'),
                    display: 'flex', alignItems: 'center', gap: 12
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: viewed ? 'linear-gradient(135deg, #5eead4 0%, #0d9488 100%)' : 'linear-gradient(135deg, #93c5fd 0%, #2563eb 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#fff',
                    boxShadow: viewed ? '0 2px 6px rgba(13, 148, 136, 0.20)' : '0 2px 6px rgba(37, 99, 235, 0.18)'
                  } }, item.icon),
                  h('span', { style: { flex: 1 } }, item.title),
                  viewed && h('span', { 'aria-hidden': 'true', style: { fontSize: 11, color: '#0d9488', fontWeight: 700 } }, '✓'),
                  h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 18 } }, expanded ? '▾' : '▸')
                ),
                expanded && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#64748b'), margin: '12px 0 4px' } }, 'Tells to watch for'),
                  h('ul', { style: { margin: 0, paddingLeft: 20 } },
                    item.tells.map(function(t, i) {
                      return h('li', { key: i, style: { fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a'), marginBottom: 4 } }, t);
                    })
                  ),
                  h('div', { style: { marginTop: 12, padding: 12, background: _dwC('#fff7ed'), border: '1px solid #fed7aa', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: _dwC('#9a3412'), marginBottom: 4 } }, 'Try this'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } }, item.practice)
                  ),
                  item.source && h('p', { style: { fontSize: 12, color: _dwC('#64748b'), marginTop: 8, marginBottom: 0 } }, 'Source: ' + item.source)
                )
              );
            })
          ),
          h('div', { style: { padding: 14, background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 10 } },
            h('h3', { style: { margin: '0 0 8px', color: _dwC('#0f172a'), fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🎯'),
              'The 90-second lateral read'),
            h('p', { style: { margin: '0 0 8px', fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } },
              'The single most powerful media literacy habit you can build, per the Stanford History Education Group:'),
            h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: _dwC('#0f172a') } },
              h('li', null, 'See a claim that triggers a strong reaction.'),
              h('li', null, 'Pause before reacting. Strong feeling = strong incentive to check.'),
              h('li', null, 'Open new tabs. Search the source and the claim from at least three independent sites.'),
              h('li', null, 'Decide based on what other sources say, not what the original site says about itself.')
            )
          ),
          // ── Spot the Tells quiz ──
          renderSpotTheTells()
        );
      }

      function renderSpotTheTells() {
        var totalCompleted = Object.keys(stSubmitted).length;
        var allDone = totalCompleted >= SPOT_TELLS_ITEMS.length;
        var item = SPOT_TELLS_ITEMS[stIdx];
        var picked = stPicked[item.id] || {};
        var submitted = !!stSubmitted[item.id];
        var anyPicked = Object.keys(picked).filter(function(k) { return picked[k]; }).length > 0;

        return h('div', { style: { marginTop: 18, padding: 16, background: _dwC('#fffbeb'), border: '2px solid #fcd34d', borderRadius: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 } },
            h('h3', { style: { margin: 0, color: _dwC('#92400e'), fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🕵️'),
              'Spot the Tells — interactive challenge'),
            h('div', { style: { fontSize: 12, color: _dwC('#92400e'), fontWeight: 700 } },
              'Score: ' + stScore + ' / ' + SPOT_TELLS_ITEMS.length + (allDone ? ' · Complete!' : ''))
          ),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#451a03', lineHeight: 1.55 } },
            'Read the scenario. Tap every red flag you see. There may be more than one per scenario — and at least one option is a trap. Then check your answer.'),

          h('div', { style: { padding: 12, background: _dwC('#fff'), border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 12 } },
            h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#92400e'), fontWeight: 700, marginBottom: 6 } },
              'Scenario ' + (stIdx + 1) + ' of ' + SPOT_TELLS_ITEMS.length),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } }, item.scenario)
          ),

          h('div', { style: { display: 'grid', gap: 8 } },
            item.options.map(function(opt, idx) {
              var sel = !!picked[idx];
              var bg = '#fff';
              var border = _dwC('#cbd5e1');
              if (submitted) {
                if (sel && opt.correct) { bg = _dwC('#f0fdf4'); border = '#10b981'; }
                else if (sel && !opt.correct) { bg = _dwC('#fef2f2'); border = '#ef4444'; }
                else if (!sel && opt.correct) { bg = _dwC('#fffbeb'); border = '#f59e0b'; }
              } else if (sel) {
                bg = _dwC('#fef3c7'); border = '#f59e0b';
              }
              return h('button', {
                key: idx,
                disabled: submitted,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() {
                  var np = Object.assign({}, picked); np[idx] = !sel;
                  var nsp = Object.assign({}, stPicked); nsp[item.id] = np;
                  upd('stPicked', nsp);
                },
                style: {
                  padding: '10px 12px', textAlign: 'left',
                  background: bg, border: '2px solid ' + border, borderRadius: 8,
                  fontSize: 13, color: _dwC('#0f172a'),
                  cursor: submitted ? 'default' : 'pointer',
                  display: 'flex', gap: 8, alignItems: 'flex-start'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                  border: '2px solid ' + (sel ? border : _dwC('#94a3b8')),
                  background: sel ? border : _dwC('#fff'), color: '#fff',
                  fontSize: 14, lineHeight: 1, textAlign: 'center', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s ease',
                  boxShadow: sel ? '0 2px 6px ' + border + '55' : 'none'
                } }, sel ? '✓' : ''),
                h('span', { style: { flex: 1 } }, opt.text),
                submitted && opt.correct && h('span', { style: {
                  fontSize: 10, color: '#fff', background: '#10b981', fontWeight: 800,
                  padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5, flexShrink: 0
                } }, 'CORRECT'),
                submitted && !opt.correct && sel && h('span', { style: {
                  fontSize: 10, color: '#fff', background: '#ef4444', fontWeight: 800,
                  padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5, flexShrink: 0
                } }, 'TRAP')
              );
            })
          ),

          submitted && h('div', { 'aria-live': 'polite', style: { marginTop: 12, padding: 12, background: _dwC('#fff'), borderRadius: 8, border: '1px dashed #f59e0b' } },
            h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#92400e'), fontWeight: 700, marginBottom: 4 } }, 'Why'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } }, item.explain)
          ),

          h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (stIdx > 0) upd('stIdx', stIdx - 1); },
              disabled: stIdx === 0,
              style: { padding: '8px 14px', background: _dwC('#fff'), color: stIdx === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: stIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
            }, '← Previous'),
            !submitted
              ? h('button', {
                  disabled: !anyPicked,
                  onClick: function() {
                    if (!anyPicked) return;
                    // Score: correct picks - wrong picks (floor 0), normalized to full credit if all-correct-no-trap
                    var correctPicks = 0, missedCorrect = 0, wrongPicks = 0;
                    item.options.forEach(function(opt, idx) {
                      var sel = !!picked[idx];
                      if (opt.correct && sel) correctPicks++;
                      else if (opt.correct && !sel) missedCorrect++;
                      else if (!opt.correct && sel) wrongPicks++;
                    });
                    var perfect = (missedCorrect === 0 && wrongPicks === 0);
                    var ns = Object.assign({}, stSubmitted); ns[item.id] = true;
                    upd({ stSubmitted: ns, stScore: stScore + (perfect ? 1 : 0) });
                    if (perfect) {
                      if (addToast) addToast('Nailed it.', 'success');
                      if (announceToSR) announceToSR('All red flags identified correctly');
                    } else if (announceToSR) {
                      announceToSR('Some misses or traps. Check the explanation.');
                    }
                    if (Object.keys(ns).length === SPOT_TELLS_ITEMS.length) {
                      tryAwardBadge('st_done', 'Pattern Recognizer');
                    }
                  },
                  style: {
                    padding: '8px 14px',
                    background: anyPicked ? '#f59e0b' : _dwC('#94a3b8'),
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: anyPicked ? 'pointer' : 'not-allowed', fontSize: 13
                  }
                }, 'Check my answer')
              : stIdx < SPOT_TELLS_ITEMS.length - 1
                ? h('button', {
                    onClick: function() { upd('stIdx', stIdx + 1); },
                    style: { padding: '8px 14px', background: '#b45309', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Next scenario →')
                : h('button', {
                    onClick: function() {
                      upd({ stIdx: 0, stPicked: {}, stSubmitted: {}, stScore: 0 });
                    },
                    style: { padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Reset and try again')
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 5 — When You're Struggling (Crisis)
      // ─────────────────────────────────────────────
      function addAdult() {
        if (!newAdultName || !newAdultName.trim()) return;
        var na = trustedAdults.concat([{ name: newAdultName.trim(), role: newAdultRole.trim() || 'trusted adult' }]);
        upd({ trustedAdults: na, newAdultName: '', newAdultRole: '' });
        if (announceToSR) announceToSR('Added ' + newAdultName + ' to your circle');
        if (na.length >= 3) tryAwardBadge('crisis_circle', 'Has a Circle');
      }

      function renderCrisis() {
        return h('div', { id: 'dw-panel-crisis', role: 'tabpanel', 'aria-labelledby': 'dw-tab-crisis' },
          h('div', { style: { padding: 14, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } },
              h('strong', { style: { color: _dwC('#991b1b') } }, 'If you are in immediate danger or thinking about hurting yourself: '),
              'reach out right now. The numbers below all have human beings answering. None of them call the police on you by default. Most of them are free.')
          ),

          h('h3', { style: { margin: '0 0 8px', color: _dwC('#0f172a') } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '☎️'),
            'Hotlines that will talk to you right now'),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 18 } },
            [
              { name: '988 Suicide & Crisis Lifeline', icon: '☎️', accent: _dwC('#dc2626'), contact: 'Call or text 988', desc: '24/7. Free. Confidential. For thoughts of self-harm, suicide, or just feeling like you cannot keep going.' },
              { name: 'Crisis Text Line', icon: '💬', accent: '#0891b2', contact: 'Text HOME to 741741', desc: 'Texting only — useful if you cannot or do not want to talk out loud. Real trained counselors, not bots.' },
              { name: 'CyberTipline (NCMEC)', icon: '🛡️', accent: '#7c3aed', contact: 'Call 1-800-843-5678 or report at cybertipline.org', desc: 'For online sexual exploitation, sextortion, or someone sharing intimate images of you or someone underage. Run by the National Center for Missing & Exploited Children.' },
              { name: 'StopBullying.gov', icon: '⚖️', accent: '#0d9488', contact: 'stopbullying.gov', desc: 'Federal resource hub with state-specific cyberbullying laws and reporting paths. Useful when you need to know what your school actually has to do.' },
              { name: 'The Trevor Project (LGBTQ+ youth)', icon: '🏳️‍🌈', accent: '#db2777', contact: 'Call 1-866-488-7386 or text START to 678-678', desc: '24/7 crisis support specifically for LGBTQ+ young people. Free and confidential.' }
            ].map(function(rsc, i) {
              return h('div', { key: i, className: 'dw-card', style: {
                display: 'flex', gap: 12, padding: 0, border: '1px solid #fecaca',
                background: _dwC('#fff'), borderRadius: 10, overflow: 'hidden'
              } },
                h('div', { 'aria-hidden': 'true', style: {
                  width: 56, flexShrink: 0,
                  background: 'linear-gradient(135deg, ' + rsc.accent + ' 0%, ' + rsc.accent + 'cc 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, color: '#fff'
                } }, rsc.icon),
                h('div', { style: { padding: '12px 14px 12px 4px', flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 700, fontSize: 15, color: rsc.accent, marginBottom: 2 } }, rsc.name),
                  h('div', { style: { fontSize: 14, color: _dwC('#0f172a'), fontFamily: 'ui-monospace, monospace', marginBottom: 4 } }, rsc.contact),
                  h('div', { style: { fontSize: 13, color: _dwC('#475569'), lineHeight: 1.5 } }, rsc.desc)
                )
              );
            })
          ),

          h('h3', { style: { margin: '0 0 8px', color: _dwC('#0f172a') } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🧭'),
            'Warning signs worth taking seriously'),
          h('div', { style: { padding: 14, background: _dwC('#fff'), border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 18 } },
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: _dwC('#475569') } },
              'In yourself or a friend, especially after sustained cyberbullying or online comparison:'),
            h('ul', { style: { margin: '0 0 0 20px', padding: 0, fontSize: 14, lineHeight: 1.7, color: _dwC('#0f172a') } },
              h('li', null, 'Talking about feeling like a burden, hopeless, or having no future'),
              h('li', null, 'Giving away possessions, saying goodbye in a way that feels off'),
              h('li', null, 'Sudden withdrawal from friends, sports, or activities they used to care about'),
              h('li', null, 'Sleeping a lot more or a lot less; appetite changes'),
              h('li', null, 'Searching online for methods, posting darker-themed content, or rehearsing'),
              h('li', null, 'Sudden calm or relief after a long period of distress — can sometimes signal a decision has been made')
            ),
            h('p', { style: { fontSize: 13, color: _dwC('#0f172a'), margin: '12px 0 0' } },
              h('strong', null, 'Trust your gut. '),
              'If a friend feels off, ask them directly. Research is clear: asking about suicide does NOT plant the idea. It opens a door.')
          ),

          // ── Reach-out scripts ──
          h('h3', { style: { margin: '0 0 8px', color: _dwC('#0f172a') } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '💬'),
            'What to actually say — three scripts'),
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 12 } },
            'Knowing the hotline number is not the same as picking up the phone. The hardest part is the first sentence. These are real, copy-able opening lines for three situations. Open the one you need.'),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 20 } },
            REACH_OUT_SCRIPTS.map(function(rs) {
              var open = roOpen === rs.id;
              return h('div', { key: rs.id, style: {
                border: '1px solid #cbd5e1', borderRadius: 10, background: _dwC('#fff'), overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() { upd('roOpen', open ? null : rs.id); },
                  'aria-expanded': open ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: _dwC('#0f172a'),
                    display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { flex: 1 } }, rs.title),
                  h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 18 } }, open ? '▾' : '▸')
                ),
                open && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { marginTop: 12, fontSize: 12, color: _dwC('#64748b'), fontStyle: 'italic' } }, rs.scenario),
                  h('div', { style: { marginTop: 10, padding: 12, background: _dwC('#f0fdfa'), border: '1px solid #5eead4', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#0e7490'), fontWeight: 700, marginBottom: 6 } }, 'Try this'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a'), fontStyle: 'italic' } }, rs.script)
                  ),
                  h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwC('#64748b'), fontWeight: 700, marginBottom: 6 } }, 'Things to know'),
                    h('ul', { style: { margin: 0, paddingLeft: 20 } },
                      rs.tips.map(function(t, i) {
                        return h('li', { key: i, style: { fontSize: 13, lineHeight: 1.55, color: _dwC('#334155'), marginBottom: 4 } }, t);
                      })
                    )
                  )
                )
              );
            })
          ),

          h('h3', { style: { margin: '0 0 8px', color: _dwC('#0f172a') } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '👥'),
            'Map your own circle of trusted adults'),
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 10 } },
            'In a moment of crisis, you do not want to be deciding for the first time who to call. List 3+ adults now — each from a different part of your life if possible (home, school, community, online).'),

          trustedAdults.length > 0 && h('div', { style: { marginBottom: 12, display: 'grid', gap: 6 } },
            trustedAdults.map(function(a, idx) {
              return h('div', { key: idx, style: {
                padding: '8px 12px', background: _dwC('#f0fdf4'), border: '1px solid #bbf7d0', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
              } },
                h('div', null,
                  h('span', { style: { fontWeight: 700, color: _dwC('#166534') } }, a.name),
                  h('span', { style: { color: _dwC('#475569'), fontSize: 13 } }, ' · ' + a.role)),
                h('button', {
                  'aria-label': 'Remove ' + a.name,
                  onClick: function() {
                    var na = trustedAdults.slice(0); na.splice(idx, 1);
                    upd('trustedAdults', na);
                  },
                  style: { background: 'transparent', border: 'none', color: _dwC('#dc2626'), cursor: 'pointer', fontSize: 18, fontWeight: 700 }
                }, '×')
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' } },
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, color: _dwC('#475569'), flex: '1 1 140px' } },
              'Name',
              h('input', {
                value: newAdultName,
                onChange: function(e) { upd('newAdultName', e.target.value); },
                placeholder: 'Ms. Rodriguez',
                style: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, marginTop: 2 }
              })
            ),
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, color: _dwC('#475569'), flex: '1 1 140px' } },
              'How you know them',
              h('input', {
                value: newAdultRole,
                onChange: function(e) { upd('newAdultRole', e.target.value); },
                placeholder: 'school counselor',
                style: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, marginTop: 2 }
              })
            ),
            h('button', {
              onClick: addAdult,
              style: { padding: '8px 14px', background: ACCENT_BUTTON, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 14 }
            }, 'Add to circle')
          ),

          !crisisAcknowledged && h('div', { style: { marginTop: 24, padding: 12, background: _dwC('#f8fafc'), border: '1px dashed #cbd5e1', borderRadius: 8 } },
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: _dwC('#475569') } },
              'It helps to acknowledge this section out loud (even just to yourself). It is not a contract — it is a small marker that says "I know this exists, I know where to find it."'),
            h('button', {
              onClick: function() {
                upd('crisisAcknowledged', true);
                tryAwardBadge('crisis_aware', 'Knows the Numbers');
                if (announceToSR) announceToSR('Crisis resources reviewed.');
              },
              style: { padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }
            }, 'I have looked at these resources')
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 6 — AI Companions
      // ─────────────────────────────────────────────
      function aicComputeResult() {
        var total = 0, count = 0;
        AI_CHECKIN_QUESTIONS.forEach(function(q) {
          if (aicAnswers[q.id] != null) { total += aicAnswers[q.id]; count++; }
        });
        if (count === 0) return null;
        var pct = total / (count * 3);
        if (pct < 0.20) return { label: 'Tool use', color: '#10b981',
          summary: 'Your relationship with AI chatbots looks like tool use — you reach for them when they are useful and put them down when they are not. That is the goal. Keep noticing.' };
        if (pct < 0.45) return { label: 'Some reliance', color: '#84cc16',
          summary: 'You are using AI chatbots more than just as a tool, but it does not look like the bot has crowded out the people in your life. This is a fine spot to be in — and a good moment to keep an eye on a few of the questions you scored higher on.' };
        if (pct < 0.70) return { label: 'Significant reliance', color: '#f59e0b',
          summary: 'The chatbot is starting to function as a confidant or friend more than as a tool. That is the inflection point where many people slide further without noticing. Worth talking to a real person about — counselor, parent, or friend you trust.' };
        return { label: 'Heavy reliance — talk to someone real', color: '#ef4444',
          summary: 'A lot of what you flagged suggests the chatbot has moved into the space where humans should be — emotional first-responder, secret-keeper, decision-maker, romantic partner. This is the pattern documented in serious harm cases. Please talk to a trusted adult or school counselor about this. The Crisis tab has direct numbers.' };
      }

      function renderAICompanion() {
        var sections = [
          { id: 'intro',     icon: '🤖', label: 'Start here' },
          { id: 'checkin',   icon: '🪞', label: 'Chatbot Check-in' },
          { id: 'what',      icon: '❓', label: 'What it actually is' },
          { id: 'syc',       icon: '🪞', label: 'The Sycophancy Problem' },
          { id: 'asymmetry', icon: '⚖️', label: 'The Asymmetry' },
          { id: 'uses',      icon: '✅', label: 'Healthy vs Risky Uses' },
          { id: 'friend',    icon: '👀', label: 'Signs in a Friend' }
        ];
        var body;
        switch (aicSection) {
          case 'checkin':   body = renderAICheckin(); break;
          case 'what':      body = renderAIWhat(); break;
          case 'syc':       body = renderAISycophancy(); break;
          case 'asymmetry': body = renderAIAsymmetry(); break;
          case 'uses':      body = renderAIUses(); break;
          case 'friend':    body = renderAIFriendSigns(); break;
          default:          body = renderAIIntro();
        }

        return h('div', { id: 'dw-panel-aicompanion', role: 'tabpanel', 'aria-labelledby': 'dw-tab-aicompanion' },
          h('div', { role: 'tablist', 'aria-label': 'AI Companions sections',
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
            sections.map(function(s) {
              var active = aicSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd('aicSection', s.id); if (announceToSR) announceToSR(s.label + ' opened'); },
                style: {
                  padding: '6px 12px',
                  background: active ? '#7c3aed' : _dwC('#fff'),
                  color: active ? '#fff' : _dwC('#0f172a'),
                  border: '1px solid ' + (active ? '#7c3aed' : _dwC('#cbd5e1')),
                  borderRadius: 999, fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 13
                }
              }, h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, s.icon), s.label);
            })
          ),
          body
        );
      }

      function renderAIIntro() {
        return h('div', null,
          h('div', { style: { padding: 16, background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)', border: '1px solid #d8b4fe', borderRadius: 12, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: _dwC('#6b21a8'), fontSize: 17 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤖'),
              'Talking to AI chatbots — when it helps, when it harms'),
            h('p', { style: { margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              'AI chatbots — Character.AI, Replika, ChatGPT, Snapchat\'s My AI, Discord\'s Clyde, and many more — can be useful tools. They can also become something else: a friend you cannot really have, a therapist who is not one, a romantic partner who does not exist.'),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('strong', null, 'This section is not anti-AI. '),
              'It is about helping you use these tools without being used by them. Below: a check-in for your own habits, an honest look at what these bots actually are, and the patterns that have already hurt teenagers.')
          ),
          h('div', { style: { padding: 14, background: _dwC('#fffbeb'), border: '1px solid #fcd34d', borderRadius: 10, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 6px', color: _dwC('#92400e'), fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⚠️'),
              'The honest version'),
            h('p', { style: { margin: '0 0 6px', fontSize: 13, lineHeight: 1.6, color: _dwC('#0f172a') } },
              'The American Psychological Association issued a 2025 health advisory on AI chatbots and youth mental health. A 14-year-old in Florida died by suicide in early 2024 after months of intense relationship with a Character.AI bot. There are active lawsuits and ongoing investigations. This is not hypothetical.'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('strong', null, 'Most chatbot use is fine. '),
              'A small but real fraction becomes harmful. The check-in on the next tab is for you to know which side you are on, honestly.')
          ),
          h('button', {
            onClick: function() { upd('aicSection', 'checkin'); },
            style: { padding: '10px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }
          }, 'Take the Chatbot Check-in →')
        );
      }

      function renderAICheckin() {
        if (aicShowResults) {
          var result = aicComputeResult();
          if (!result) return h('p', null, 'No answers recorded yet.');
          // Compute overall percentage for ring viz
          var aicTotal = 0, aicCount = 0;
          AI_CHECKIN_QUESTIONS.forEach(function(q) {
            if (aicAnswers[q.id] != null) { aicTotal += aicAnswers[q.id]; aicCount++; }
          });
          var aicPct = aicCount > 0 ? (aicTotal / (aicCount * 3)) : 0;
          var aicPctText = Math.round(aicPct * 100);
          var aicRingCirc = 2 * Math.PI * 42;
          return h('div', null,
            h('div', { 'aria-live': 'polite', role: 'status', className: 'dw-result-card', style: {
              padding: 20, borderRadius: 14, marginBottom: 18,
              background: 'linear-gradient(135deg, ' + result.color + '12 0%, ' + result.color + '08 100%)',
              border: '2px solid ' + result.color,
              display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'
            } },
              h('div', { style: { position: 'relative', width: 100, height: 100, flexShrink: 0 } },
                h('svg', { width: 100, height: 100, viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false', style: { transform: 'rotate(-90deg)' } },
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: _dwC('#e2e8f0'), strokeWidth: 8 }),
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: result.color, strokeWidth: 8,
                    strokeDasharray: aicRingCirc, strokeDashoffset: aicRingCirc * (1 - aicPct),
                    strokeLinecap: 'round', style: { transition: 'stroke-dashoffset 0.6s ease' } })
                ),
                h('div', { style: {
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', lineHeight: 1
                } },
                  h('div', { style: { fontSize: 26, fontWeight: 800, color: result.color } }, aicPctText + '%'),
                  h('div', { style: { fontSize: 10, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 } }, 'reliance')
                )
              ),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 12, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 } }, 'Your chatbot check-in result'),
                h('div', { style: { fontSize: 24, fontWeight: 800, color: result.color, marginBottom: 8, lineHeight: 1.2 } }, result.label),
                h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#1e293b') } }, result.summary)
              )
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() { upd('aicSection', 'what'); },
                style: { padding: '10px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
              }, 'Continue: what the bot actually is →'),
              h('button', {
                onClick: function() { upd({ aicAnswers: {}, aicQIdx: 0, aicShowResults: false }); },
                style: { padding: '10px 16px', background: _dwC('#fff'), color: _dwC('#0f172a'), border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }
              }, 'Retake')
            )
          );
        }
        var q = AI_CHECKIN_QUESTIONS[aicQIdx];
        var hasAnswer = aicAnswers[q.id] != null;
        var totalAnswered = Object.keys(aicAnswers).length;
        var likertLabels = ['Never', 'Sometimes', 'Often', 'Almost always'];

        return h('div', null,
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 8 } },
            'Question ' + (aicQIdx + 1) + ' of ' + AI_CHECKIN_QUESTIONS.length + ' · ' + totalAnswered + ' answered'),
          h('div', { style: { background: _dwC('#e2e8f0'), height: 8, borderRadius: 4, marginBottom: 16, overflow: 'hidden' } },
            h('div', { style: { background: 'linear-gradient(90deg, #6d28d9 0%, #a855f7 100%)', height: '100%', width: ((aicQIdx + 1) / AI_CHECKIN_QUESTIONS.length * 100) + '%', transition: 'width 0.3s ease' } })),
          h('div', { style: { padding: 18, border: '1px solid #d8b4fe', borderRadius: 12, background: _dwC('#faf5ff'), marginBottom: 14 } },
            h('div', { 'aria-live': 'polite', style: { fontSize: 16, fontWeight: 600, color: _dwC('#0f172a'), lineHeight: 1.5, marginBottom: 14 } }, q.text),
            h('div', { role: 'radiogroup', 'aria-label': 'How often: ' + q.text, style: { display: 'grid', gap: 8 } },
              likertLabels.map(function(lbl, idx) {
                var selected = aicAnswers[q.id] === idx;
                return h('button', {
                  key: idx, role: 'radio', 'aria-checked': selected ? 'true' : 'false',
                  onClick: function() {
                    var na = Object.assign({}, aicAnswers); na[q.id] = idx;
                    upd('aicAnswers', na);
                  },
                  style: {
                    padding: '12px 14px', textAlign: 'left',
                    background: selected ? _dwC('#ede9fe') : _dwC('#fff'),
                    border: '2px solid ' + (selected ? '#7c3aed' : _dwC('#cbd5e1')),
                    borderRadius: 10, fontSize: 15, fontWeight: selected ? 700 : 500, color: _dwC('#0f172a'), cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid ' + (selected ? '#7c3aed' : _dwC('#cbd5e1')),
                    background: selected ? '#7c3aed' : _dwC('#fff'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1,
                    transition: 'all 0.18s ease'
                  } }, selected ? '✓' : ''),
                  h('span', null, lbl)
                );
              })
            ),
            hasAnswer && h('div', { style: {
              marginTop: 14, padding: 12, background: _dwC('#fff'), border: '1px dashed #d8b4fe', borderRadius: 8,
              fontSize: 13, color: _dwC('#334155'), lineHeight: 1.55
            } },
              h('strong', { style: { color: '#7c3aed', display: 'block', marginBottom: 4 } }, 'Why this question:'),
              q.research)
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (aicQIdx > 0) upd('aicQIdx', aicQIdx - 1); },
              disabled: aicQIdx === 0,
              style: { padding: '10px 14px', background: _dwC('#fff'), color: aicQIdx === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: aicQIdx === 0 ? 'not-allowed' : 'pointer' }
            }, '← Previous'),
            aicQIdx < AI_CHECKIN_QUESTIONS.length - 1
              ? h('button', {
                  onClick: function() { upd('aicQIdx', aicQIdx + 1); },
                  style: { padding: '10px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
                }, 'Next →')
              : h('button', {
                  onClick: function() {
                    upd('aicShowResults', true);
                    tryAwardBadge('aic_done', 'Honest Check');
                  },
                  disabled: totalAnswered < AI_CHECKIN_QUESTIONS.length,
                  style: {
                    padding: '10px 14px',
                    background: totalAnswered < AI_CHECKIN_QUESTIONS.length ? _dwC('#94a3b8') : '#10b981',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: totalAnswered < AI_CHECKIN_QUESTIONS.length ? 'not-allowed' : 'pointer'
                  }
                }, 'See my result →')
          )
        );
      }

      function renderAIWhat() {
        var m = AI_MYTHS[aicMythIdx];
        return h('div', null,
          h('div', { style: { padding: 14, background: _dwC('#faf5ff'), border: '1px solid #d8b4fe', borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('strong', { style: { color: _dwC('#6b21a8') } }, 'Six things people commonly believe about chatbots — and what is actually true. '),
              'Read one, click for the next.')
          ),
          h('div', { style: { padding: 18, border: '2px solid #d8b4fe', borderRadius: 12, background: _dwC('#fff'), marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: _dwC('#6b21a8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } },
              'Myth ' + (aicMythIdx + 1) + ' of ' + AI_MYTHS.length),
            h('p', { style: { margin: '0 0 14px', fontSize: 15, lineHeight: 1.55, color: _dwC('#0f172a'), fontStyle: 'italic' } }, m.myth),
            h('div', { style: { padding: 12, background: _dwC('#f0fdf4'), border: '1px solid #86efac', borderRadius: 8 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: _dwC('#166534'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Reality'),
              h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } }, m.reality))
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (aicMythIdx > 0) upd('aicMythIdx', aicMythIdx - 1); },
              disabled: aicMythIdx === 0,
              style: { padding: '8px 14px', background: _dwC('#fff'), color: aicMythIdx === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: aicMythIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
            }, '← Previous'),
            aicMythIdx < AI_MYTHS.length - 1
              ? h('button', {
                  onClick: function() { upd('aicMythIdx', aicMythIdx + 1); },
                  style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                }, 'Next myth →')
              : h('button', {
                  onClick: function() { upd('aicSection', 'syc'); tryAwardBadge('aic_myths', 'Sees Through It'); },
                  style: { padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                }, 'Continue: the Sycophancy Problem →')
          )
        );
      }

      function renderAISycophancy() {
        var ex = AI_SYCOPHANCY_EXAMPLES[aicSycIdx];
        return h('div', null,
          h('div', { style: { padding: 14, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', color: _dwC('#991b1b'), fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🪞'),
              'The Sycophancy Problem'),
            h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              'AI chatbots are trained to be ', h('strong', null, 'agreeable'),
              '. Disagreement causes users to leave. So the bot is engineered to validate, affirm, and reflect you back to yourself — even when what you are saying is wrong, dangerous, or distorted.'),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('strong', null, 'This is the part that can really hurt. '),
              'A bot that always agrees with you is not a friend — it is a feedback loop. Here is what that actually sounds like.')
          ),
          h('div', { style: { padding: 16, border: '2px solid #fca5a5', borderRadius: 14, background: _dwC('#f8fafc'), marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: _dwC('#991b1b'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 } },
              'Example ' + (aicSycIdx + 1) + ' of ' + AI_SYCOPHANCY_EXAMPLES.length),
            // Chat thread
            h('div', { 'aria-label': 'Chat message thread example', style: {
              background: _dwC('#fff'), borderRadius: 12, padding: 14,
              boxShadow: 'inset 0 0 0 1px #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: 10
            } },
              // YOU bubble (right-aligned, blue iMessage-style)
              h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 } },
                  h('div', { style: { fontSize: 10, color: _dwC('#64748b'), fontWeight: 700, paddingRight: 4 } }, 'YOU'),
                  h('div', { style: {
                    padding: '10px 14px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff', fontSize: 14, lineHeight: 1.45,
                    borderRadius: '18px 18px 4px 18px',
                    boxShadow: '0 1px 2px rgba(2, 132, 199, 0.18)'
                  } }, ex.context)
                )
              ),
              // BOT bubble (left-aligned, purple)
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end' } },
                h('div', { 'aria-hidden': 'true', style: {
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff'
                } }, '🤖'),
                h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3 } },
                  h('div', { style: { fontSize: 10, color: '#7c3aed', fontWeight: 700, paddingLeft: 4 } }, 'CHATBOT'),
                  h('div', { style: {
                    padding: '10px 14px', background: _dwC('#f3e8ff'), color: _dwC('#0f172a'),
                    fontSize: 14, lineHeight: 1.45,
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(124, 58, 237, 0.10)'
                  } }, ex.bot)
                )
              ),
              // FRIEND bubble (left-aligned, green) — revealed
              aicSycRevealed && h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', animation: 'dw-badge-pop 0.3s ease-out' } },
                h('div', { 'aria-hidden': 'true', style: {
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #34d399 0%, #166534 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff'
                } }, '🧑'),
                h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 3 } },
                  h('div', { style: { fontSize: 10, color: _dwC('#166534'), fontWeight: 700, paddingLeft: 4 } }, 'A REAL FRIEND'),
                  h('div', { style: {
                    padding: '10px 14px', background: _dwC('#dcfce7'), color: _dwC('#0f172a'),
                    fontSize: 14, lineHeight: 1.45,
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(22, 101, 52, 0.10)'
                  } }, ex.friend)
                )
              )
            ),
            aicSycRevealed && h('div', { style: { marginTop: 12, padding: 12, background: _dwC('#fffbeb'), border: '1px dashed #fcd34d', borderRadius: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: _dwC('#92400e'), marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, '💡'),
                'What changed'),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } }, ex.explain)
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (aicSycIdx > 0) upd({ aicSycIdx: aicSycIdx - 1, aicSycRevealed: false }); },
              disabled: aicSycIdx === 0,
              style: { padding: '8px 14px', background: _dwC('#fff'), color: aicSycIdx === 0 ? _dwC('#94a3b8') : _dwC('#0f172a'),
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: aicSycIdx === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }
            }, '← Previous'),
            !aicSycRevealed
              ? h('button', {
                  onClick: function() { upd('aicSycRevealed', true); if (announceToSR) announceToSR('Friend response revealed'); },
                  style: { padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                }, 'Reveal what a real friend would say')
              : aicSycIdx < AI_SYCOPHANCY_EXAMPLES.length - 1
                ? h('button', {
                    onClick: function() { upd({ aicSycIdx: aicSycIdx + 1, aicSycRevealed: false }); },
                    style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Next example →')
                : h('button', {
                    onClick: function() { upd('aicSection', 'asymmetry'); },
                    style: { padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Continue: the Asymmetry →')
          )
        );
      }

      function renderAIAsymmetry() {
        return h('div', null,
          h('p', { style: { fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a'), marginBottom: 14 } },
            h('strong', { style: { color: _dwC('#6b21a8') } }, 'The hardest thing to see about AI relationships is what is missing from them. '),
            'The trade-offs that make real relationships scary are the same trade-offs that make them grow you. Here is the side-by-side.'),
          h('div', { style: { display: 'grid', gap: 12, marginBottom: 16 } },
            AI_ASYMMETRY.map(function(row, idx) {
              return h('div', { key: idx, className: 'dw-card', style: {
                borderRadius: 12, overflow: 'hidden', border: '1px solid #d8b4fe'
              } },
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' } },
                  // Real side
                  h('div', { style: {
                    padding: 14,
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                    borderRight: '1px solid #d8b4fe'
                  } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { 'aria-hidden': 'true', style: {
                        width: 24, height: 24, borderRadius: '50%',
                        background: '#10b981', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800
                      } }, '✓'),
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: _dwC('#166534'), textTransform: 'uppercase', letterSpacing: 0.5 } }, row.col1)
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } }, row.r1)
                  ),
                  // AI side
                  h('div', { style: {
                    padding: 14,
                    background: 'linear-gradient(135deg, #faf5ff 0%, #fdf4ff 100%)',
                    position: 'relative'
                  } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { 'aria-hidden': 'true', style: {
                        width: 24, height: 24, borderRadius: '50%',
                        background: '#7c3aed', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800
                      } }, '🤖'),
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: _dwC('#6b21a8'), textTransform: 'uppercase', letterSpacing: 0.5 } }, row.col2)
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } }, row.r2)
                  )
                )
              );
            })
          ),
          h('div', { style: { padding: 14, background: _dwC('#faf5ff'), border: '1px solid #d8b4fe', borderRadius: 10 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('strong', null, 'The takeaway: '),
              'Real relationships have higher costs and higher payoffs. AI relationships have lower costs and lower payoffs — they cannot scale up to the real thing no matter how many hours you spend in them. They are a different category of thing, the way a photograph of a meal is a different category from the meal.'))
        );
      }

      function renderAIUses() {
        return h('div', null,
          // Lead reframe
          h('div', { style: { padding: 14, background: _dwC('#faf5ff'), border: '1px solid #d8b4fe', borderRadius: 10, marginBottom: 16 } },
            h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: _dwC('#0f172a') } },
              h('strong', { style: { color: _dwC('#6b21a8') } }, 'It usually depends on HOW you use it, not WHAT you use it for. '),
              'Most chatbot uses are not inherently healthy or unhealthy. A handful are clearly fine, a handful are clearly off-limits, and most live in the middle — where the same use case can be a tutoring win or an academic-integrity disaster depending on the choices YOU make.'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#334155') } },
              'Three tiers below: ',
              h('span', { style: { color: _dwC('#166534'), fontWeight: 700 } }, 'green'), ' (clear-win), ',
              h('span', { style: { color: _dwC('#a16207'), fontWeight: 700 } }, 'yellow'), ' (depends on how), ',
              h('span', { style: { color: _dwC('#991b1b'), fontWeight: 700 } }, 'red'), ' (do not).')
          ),

          // ── GREEN tier ──
          h('h3', { style: { margin: '8px 0 8px', color: _dwC('#166534'), fontSize: 15 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '✅'),
            'Green — clear-win uses'),
          h('p', { style: { fontSize: 12, color: _dwC('#475569'), marginBottom: 8 } },
            'Use freely, as long as you stay engaged with what you are doing.'),
          h('div', { style: { display: 'grid', gap: 6, marginBottom: 18 } },
            AI_USE_TIERS.green.map(function(u, idx) {
              return h('div', { key: idx, style: { padding: 10, background: _dwC('#f0fdf4'), border: '1px solid #86efac', borderRadius: 8 } },
                h('div', { style: { fontWeight: 700, fontSize: 14, color: _dwC('#0f172a'), marginBottom: 2 } }, u.label),
                h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: _dwC('#334155') } }, u.note)
              );
            })
          ),

          // ── YELLOW tier ──
          h('h3', { style: { margin: '8px 0 8px', color: _dwC('#a16207'), fontSize: 15 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⚖️'),
            'Yellow — depends on how you use it'),
          h('p', { style: { fontSize: 12, color: _dwC('#475569'), marginBottom: 8 } },
            'Same use case, very different outcomes. The point is to notice which version you are doing.'),
          h('div', { style: { display: 'grid', gap: 12, marginBottom: 18 } },
            AI_USE_TIERS.yellow.map(function(u) {
              return h('div', { key: u.id, style: {
                padding: 12, background: _dwC('#fffbeb'), border: '1px solid #fcd34d', borderRadius: 10
              } },
                h('div', { style: { fontWeight: 700, fontSize: 14, color: _dwC('#92400e'), marginBottom: 10 } }, u.label),
                h('div', { style: {
                  display: 'grid', gap: 10,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
                } },
                  h('div', { style: { padding: 10, background: _dwC('#f0fdf4'), border: '1px solid #86efac', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, color: _dwC('#166534'), fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
                      '✓ Healthy version'),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: _dwC('#0f172a') } }, u.healthy)
                  ),
                  h('div', { style: { padding: 10, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, color: _dwC('#991b1b'), fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
                      '✕ Risky version'),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: _dwC('#0f172a') } }, u.risky)
                  )
                )
              );
            })
          ),

          // ── RED tier ──
          h('h3', { style: { margin: '8px 0 8px', color: _dwC('#991b1b'), fontSize: 15 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⛔'),
            'Red — do not use AI this way'),
          h('p', { style: { fontSize: 12, color: _dwC('#475569'), marginBottom: 8 } },
            'Hard limits. These are the cases where there is no healthy version, and the documented harms are real.'),
          h('div', { style: { display: 'grid', gap: 6, marginBottom: 18 } },
            AI_USE_TIERS.red.map(function(u, idx) {
              return h('div', { key: idx, style: { padding: 10, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 8 } },
                h('div', { style: { fontWeight: 700, fontSize: 14, color: _dwC('#0f172a'), marginBottom: 2 } }, u.label),
                h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: _dwC('#334155') } }, u.note)
              );
            })
          ),

          // ── Ask Yourself rubric ──
          h('div', { style: {
            padding: 14, background: 'linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%)',
            border: '1px solid #93c5fd', borderRadius: 12
          } },
            h('h3', { style: { margin: '0 0 6px', color: _dwC('#1e40af'), fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤔'),
              'Ask yourself — works for ANY chatbot use, even ones not listed above'),
            h('p', { style: { margin: '0 0 10px', fontSize: 13, color: _dwC('#334155'), lineHeight: 1.55 } },
              'A quick self-check you can apply to whatever you are about to ask the bot. No score, no submission — just five honest questions.'),
            h('ol', { style: { margin: 0, paddingLeft: 20, display: 'grid', gap: 8 } },
              AI_USE_RUBRIC.map(function(item, idx) {
                return h('li', { key: idx, style: { fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } },
                  h('div', { style: { marginBottom: 2 } }, item.q),
                  h('div', { style: { fontSize: 12, color: _dwC('#475569'), fontStyle: 'italic' } }, '↳ ' + item.hint)
                );
              })
            ),
            h('div', { style: { marginTop: 12, padding: 10, background: _dwC('#fff'), border: '1px dashed #93c5fd', borderRadius: 8 } },
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } },
                h('strong', { style: { color: _dwC('#1e40af') } }, 'Bottom line: '),
                'If you said "yes" to any of #1, #2, #4, or #5 — or "no" to #3 — that is the signal to involve a real person, not to ask the bot harder.'))
          )
        );
      }

      function renderAIFriendSigns() {
        return h('div', null,
          h('div', { style: { padding: 14, background: _dwC('#fffbeb'), border: '1px solid #fcd34d', borderRadius: 10, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', color: _dwC('#92400e'), fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '👀'),
              'Signs a friend might be in too deep with an AI'),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } },
              'You do not have to be a counselor. If several of these show up at once — especially the last few — that is worth saying something about, gently.')
          ),
          h('ul', { style: { margin: '0 0 16px 20px', padding: 0, display: 'grid', gap: 8 } },
            AI_FRIEND_SIGNS.map(function(s, idx) {
              return h('li', { key: idx, style: { fontSize: 14, lineHeight: 1.55, color: _dwC('#0f172a') } }, s);
            })
          ),
          h('div', { style: { padding: 14, background: _dwC('#f0fdfa'), border: '1px solid #5eead4', borderRadius: 10, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 6px', color: _dwC('#0e7490'), fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '💬'),
              'A way to bring it up'),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6, color: _dwC('#0f172a'), fontStyle: 'italic' } },
              '"Hey — I noticed you have been talking about [bot name] like they are a real person. I do not want to be weird about it, but I miss you. Want to do something this week, just us?"'),
            h('p', { style: { margin: 0, fontSize: 12, color: _dwC('#475569') } },
              'Soft, specific, no shame. Reaches toward them without attacking the bot.')
          ),
          h('div', { style: { padding: 14, background: _dwC('#fef2f2'), border: '1px solid #fecaca', borderRadius: 10 } },
            h('h4', { style: { margin: '0 0 6px', color: _dwC('#991b1b'), fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🚨'),
              'When to get an adult involved'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _dwC('#0f172a') } },
              'If a friend is talking to a chatbot about ',
              h('strong', null, 'suicide, self-harm, eating, or hurting someone'),
              ' — or if the chatbot has been giving them advice in any of those areas — that is past the point of "give it space." Tell a trusted adult that day. You do not need to know what will happen next. You just need to put one adult between your friend and the bot.'))
        );
      }

      // ─────────────────────────────────────────────
      // Tab 7 — Reference (Glossary / Sources / For Grown-Ups)
      // ─────────────────────────────────────────────
      function renderReference() {
        var sections = [
          { id: 'glossary',  icon: '📖', label: 'Glossary' },
          { id: 'sources',   icon: '📰', label: 'Sources' },
          { id: 'grownups',  icon: '👨‍👩‍👧', label: 'For Grown-Ups' }
        ];
        var body;
        if (refSection === 'sources') body = renderRefSources();
        else if (refSection === 'grownups') body = renderRefGrownups();
        else body = renderRefGlossary();

        return h('div', { id: 'dw-panel-reference', role: 'tabpanel', 'aria-labelledby': 'dw-tab-reference' },
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 12, lineHeight: 1.55 } },
            'A reference layer for the rest of the tool — quick definitions, where the research came from, and a separate page for parents, teachers, and counselors who want to use what is here.'),
          h('div', { role: 'tablist', 'aria-label': 'Reference sections', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
            sections.map(function(s) {
              var active = refSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd({ refSection: s.id, refExpanded: null }); if (announceToSR) announceToSR(s.label + ' opened'); },
                style: {
                  padding: '6px 12px',
                  background: active ? ACCENT_BUTTON : _dwC('#fff'),
                  color: active ? '#fff' : _dwC('#0f172a'),
                  border: '1px solid ' + (active ? ACCENT : _dwC('#cbd5e1')),
                  borderRadius: 999, fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: 13
                }
              }, h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, s.icon), s.label);
            })
          ),
          body
        );
      }

      function renderRefGlossary() {
        return h('div', null,
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 10 } },
            'Tap any term to expand. Useful for parent conversations, IEP meetings, or when something in this tool used a word you wanted to nail down.'),
          h('div', { style: { display: 'grid', gap: 6 } },
            GLOSSARY.map(function(g) {
              var open = refExpanded === g.term;
              return h('div', { key: g.term, style: {
                border: '1px solid ' + (open ? ACCENT_MED : _dwC('#e2e8f0')),
                borderRadius: 8, background: open ? ACCENT_DIM : _dwC('#fff'), overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() { upd('refExpanded', open ? null : g.term); },
                  'aria-expanded': open ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '10px 12px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: _dwC('#0f172a'),
                    display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { flex: 1 } }, g.term),
                  h('span', { 'aria-hidden': 'true', style: { color: _dwC('#64748b'), fontSize: 16 } }, open ? '▾' : '▸')
                ),
                open && h('p', { style: { margin: 0, padding: '0 12px 12px', fontSize: 13, lineHeight: 1.55, color: _dwC('#334155') } }, g.def)
              );
            })
          )
        );
      }

      function renderRefSources() {
        var byCat = { organization: [], research: [], reading: [] };
        SOURCES.forEach(function(s) { (byCat[s.cat] || byCat.research).push(s); });
        var groups = [
          { id: 'organization', label: 'Organizations and crisis services', icon: '🏛️' },
          { id: 'research', label: 'Research and curricula', icon: '🔬' },
          { id: 'reading', label: 'Books worth reading', icon: '📚' }
        ];
        return h('div', null,
          h('p', { style: { fontSize: 13, color: _dwC('#475569'), marginBottom: 12 } },
            'Where the claims in this tool come from. Use these to verify, deepen, or share with parents and educators who want documentation.'),
          groups.map(function(g) {
            var items = byCat[g.id] || [];
            if (items.length === 0) return null;
            return h('div', { key: g.id, style: { marginBottom: 18 } },
              h('h4', { style: { margin: '0 0 8px', color: _dwC('#0f172a'), fontSize: 14, fontWeight: 700 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, g.icon), g.label),
              h('div', { style: { display: 'grid', gap: 8 } },
                items.map(function(s, idx) {
                  return h('div', { key: idx, style: {
                    padding: 12, border: '1px solid ' + ACCENT_MED, borderRadius: 8, background: _dwC('#f8fafc')
                  } },
                    h('div', { style: { fontWeight: 700, fontSize: 14, color: _dwC('#0f172a') } }, s.name),
                    h('div', { style: { fontSize: 12, color: _dwC('#64748b'), fontStyle: 'italic', marginBottom: 4 } }, s.who),
                    h('div', { style: { fontSize: 13, color: _dwC('#334155'), lineHeight: 1.5 } }, s.what)
                  );
                })
              )
            );
          })
        );
      }

      function renderRefGrownups() {
        return h('div', null,
          h('div', { style: { padding: 14, background: _dwC('#f0fdfa'), border: '1px solid ' + ACCENT_MED, borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } },
              h('strong', { style: { color: ACCENT } }, 'For parents, teachers, school counselors, and youth-serving adults. '),
              'This page is here on purpose: students may show it to a grown-up, and grown-ups deserve a starting place that respects their time. Below: seven of the most-asked things, with the best current research distilled.')
          ),
          h('div', { style: { display: 'grid', gap: 10 } },
            (function() {
              // Color palette cycled across the 7 cards
              var palettes = [
                { from: '#22d3ee', to: '#0891b2', accent: _dwC('#0e7490') }, // cyan
                { from: '#a78bfa', to: '#7c3aed', accent: _dwC('#6b21a8') }, // violet
                { from: '#60a5fa', to: '#2563eb', accent: _dwC('#1e40af') }, // blue
                { from: '#fb923c', to: '#ea580c', accent: _dwC('#9a3412') }, // orange
                { from: '#f87171', to: _dwC('#dc2626'), accent: _dwC('#991b1b') }, // red
                { from: '#34d399', to: '#059669', accent: _dwC('#166534') }, // emerald
                { from: '#f472b6', to: '#db2777', accent: _dwC('#9d174d') }  // pink
              ];
              return GROWNUPS_TIPS.map(function(tip, idx) {
                var p = palettes[idx % palettes.length];
                return h('div', { key: idx, className: 'dw-card', style: {
                  display: 'flex', gap: 14,
                  padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: _dwC('#fff')
                } },
                  h('div', { 'aria-hidden': 'true', style: {
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: 'linear-gradient(135deg, ' + p.from + ' 0%, ' + p.to + ' 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, color: '#fff',
                    boxShadow: '0 4px 10px ' + p.to + '33, inset 0 1px 0 rgba(255,255,255,0.3)'
                  } }, tip.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontWeight: 700, fontSize: 15, color: p.accent, marginBottom: 4 } }, tip.title),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: _dwC('#334155') } }, tip.body)
                  )
                );
              });
            })()
          ),
          h('div', { style: { marginTop: 20, padding: 14, background: _dwC('#fefce8'), border: '1px solid #fde68a', borderRadius: 10 } },
            h('div', { style: { fontWeight: 700, color: _dwC('#854d0e'), marginBottom: 6, fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤝'),
              'Working with a school counselor or psychologist'),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } },
              'This tool produces a printable check-in packet that students can choose to share. Counselors find it useful as a conversation starter — it surfaces the patterns the student is willing to name, without putting them on the spot.'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: _dwC('#0f172a') } },
              h('strong', null, 'A note on the limits: '),
              'this tool is psychoeducation, not therapy. It will not catch every kid in crisis. If a student is showing warning signs, treat that as the start of a clinical conversation, not the end of one. The Crisis tab gives them direct numbers in case they reach out to it before they reach out to you.')
          )
        );
      }

      // ─────────────────────────────────────────────
      // Badge popup
      // ─────────────────────────────────────────────
      function renderBadgePopup() {
        if (!showBadgePopup) return null;
        return h('div', { role: 'alertdialog', 'aria-modal': 'true', 'aria-label': 'Badge earned: ' + showBadgePopup.label, style: {
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        },
          onClick: function() { upd('showBadgePopup', null); },
          onKeyDown: function(e) { if (e.key === 'Escape') upd('showBadgePopup', null); }
        },
          h('div', {
            className: 'dw-badge-modal',
            onClick: function(e) { e.stopPropagation(); },
            style: { background: _dwC('#fff'), padding: 28, borderRadius: 16, maxWidth: 340, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.30)' }
          },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 64, marginBottom: 4, lineHeight: 1 } }, '🏅'),
            h('div', { style: { fontSize: 12, color: _dwC('#64748b'), textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 } }, 'Badge earned'),
            h('div', { style: { fontSize: 22, fontWeight: 800, color: ACCENT, marginBottom: 16, lineHeight: 1.2 } }, showBadgePopup.label),
            h('button', {
              onClick: function() { upd('showBadgePopup', null); },
              autoFocus: true,
              style: { padding: '10px 22px', background: ACCENT_BUTTON, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }
            }, 'Nice')
          )
        );
      }

      // ─────────────────────────────────────────────
      // Top-level render
      // ─────────────────────────────────────────────
      var content;
      switch (activeTab) {
        case 'selfcheck':     content = renderSelfCheck(); break;
        case 'toolkit':       content = renderToolkit(); break;
        case 'cyberbullying': content = renderCyberbullying(); break;
        case 'medialit':      content = renderMediaLit(); break;
        case 'aicompanion':   content = renderAICompanion(); break;
        case 'crisis':        content = renderCrisis(); break;
        case 'reference':     content = renderReference(); break;
        default:              content = renderSelfCheck();
      }

      return h('div', { className: 'dw-root', style: { fontFamily: 'system-ui, -apple-system, sans-serif', color: _dwC('#0f172a') } },
        renderHeader(),
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('digitalWellbeing', h, ctx) : null),
        content,
        renderBadgePopup()
      );
    }
  });
})();
