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

  
  
  
  // ── Register Tool ──
  // ─── Content libraries wired 2026-09-13 (archived Aug 25 as never-read; each now has a view) ───
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
var SOCIAL_MEDIA_RESEARCH = [
    {
      id: 'smr1',
      finding: 'Heavy use linked to depression',
      research: 'Some studies report a link between heavy social media use and depression, especially for teen girls \u2014 but the size of that link is genuinely disputed (Orben & Przybylski, 2019, put screen time at under 1% of the variation in well-being), and it is not settled which way the causation runs',
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
      var scQuestionIdx = (Number.isInteger(d.scQuestionIdx) && d.scQuestionIdx >= 0 && d.scQuestionIdx < SELF_CHECK_QUESTIONS.length) ? d.scQuestionIdx : 0;
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
              style: {
                width: 90, height: 90, borderRadius: 18,
                background: '#7e22ce', color: '#fff', border: 'none',
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
              style: { marginTop: 12, padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
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
                  committed && h('span', { style: { fontSize: 11, color: '#fff', background: '#047857', fontWeight: 700,
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
                  fontSize: 10, color: '#fff', background: '#047857', fontWeight: 800,
                  padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5, flexShrink: 0
                } }, 'CORRECT'),
                submitted && !opt.correct && sel && h('span', { style: {
                  fontSize: 10, color: '#fff', background: '#b91c1c', fontWeight: 800,
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
                    style: { padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                  }, 'Reset and try again')
          )
        );
      }

      // ─────────────────────────────────────────────
      // Tab 5 — When You're Struggling (Crisis)
      // ─────────────────────────────────────────────
      function addAdult() {
        if (!newAdultName || !newAdultName.trim()) { if (typeof addToast === 'function') addToast('Add a name first, then press the button again.', 'info'); return; }
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
              style: { padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }
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
                  style: { padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
                  style: { padding: '8px 14px', background: '#047857', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
                        background: '#047857', color: '#fff',
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


      // Light-base tool: translate the shared helpers' dark-base hexes to light-base, then map.
      var _DWW_FG = { '#f1f5f9': '#0f172a', '#e2e8f0': '#1e293b', '#cbd5e1': '#334155', '#94a3b8': '#64748b', '#5eead4': '#0e7490' };
      var _DWW_BG = { '#1e293b': '#fff', '#0f172a': '#f8fafc' };
      var _DWW_BD = { '#334155': '#e2e8f0', '#475569': '#cbd5e1' };
      var _dwW_fg = function(hex) { return _dwC(_DWW_FG[hex] || hex); };
      var _dwW_bg = function(hex) { return _dwC(_DWW_BG[hex] || hex); };
      var _dwW_bd = function(hex) { return _dwC(_DWW_BD[hex] || hex); };


      // Light-base tool: translate the shared helpers' dark-base hexes to light-base, then map.
      var _DWW_FG = { '#f1f5f9': '#0f172a', '#e2e8f0': '#1e293b', '#cbd5e1': '#334155', '#94a3b8': '#64748b', '#5eead4': '#0e7490' };
      var _DWW_BG = { '#1e293b': '#fff', '#0f172a': '#f8fafc' };
      var _DWW_BD = { '#334155': '#e2e8f0', '#475569': '#cbd5e1' };
      var _dwW_fg = function(hex) { return _dwC(_DWW_FG[hex] || hex); };
      var _dwW_bg = function(hex) { return _dwC(_DWW_BG[hex] || hex); };
      var _dwW_bd = function(hex) { return _dwC(_DWW_BD[hex] || hex); };

      // ─── Wired-content helpers (2026-09-13) ─────────────────────────────
      // Plain headings, lists and disclosures; buttons carry names and pressed
      // state; every colour goes through the tool's theme mapper; no motion.
      function _dwW_txt(x) { return x && typeof x === 'object' && !Array.isArray(x) ? (x[band] || x.middle || x.elementary || x.high || '') : (x == null ? '' : String(x)); }
      function _dwW_label(k) { return String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function(c) { return c.toUpperCase(); }); }
      function _dwW_panel(key, title, blurb, children, accent) {
        var hid = '_dwW-wired-' + key;
        return h('section', { 'aria-labelledby': hid, style: { margin: '18px 12px 0', padding: 14, borderRadius: 12, background: _dwW_bg('#1e293b'), borderLeft: '4px solid ' + (accent || '#a78bfa') } },
          h('h3', { id: hid, style: { margin: '0 0 4px', fontSize: 15, fontWeight: 900, color: _dwW_fg('#f1f5f9') } }, title),
          blurb ? h('p', { style: { margin: '0 0 10px', fontSize: 12, color: _dwW_fg('#94a3b8'), lineHeight: 1.5 } }, blurb) : null,
          children
        );
      }
      function _dwW_details(summary, body, key) {
        return h('details', { key: key, style: { marginBottom: 6, borderRadius: 8, border: '1px solid ' + _dwW_bd('#334155'), background: _dwW_bg('#0f172a') } },
          h('summary', { style: { cursor: 'pointer', padding: '10px 12px', fontSize: 13, fontWeight: 700, color: _dwW_fg('#e2e8f0'), minHeight: 44, display: 'flex', alignItems: 'center' } }, summary),
          h('div', { style: { padding: '0 12px 12px', fontSize: 12.5, color: _dwW_fg('#cbd5e1'), lineHeight: 1.6 } }, body)
        );
      }
      function _dwW_any(v) {
        if (v == null || v === '') return null;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return h('p', { style: { margin: '2px 0' } }, String(v));
        if (Array.isArray(v)) {
          if (v.every(function(x) { return typeof x === 'string'; })) return h('ul', { style: { margin: '2px 0', paddingLeft: 18 } }, v.map(function(x, i) { return h('li', { key: i }, x); }));
          return h('div', null, v.map(function(x, i) { return h('div', { key: i, style: { marginBottom: 6 } }, _dwW_any(x)); }));
        }
        return h('dl', { style: { margin: '2px 0' } }, Object.keys(v).filter(function(k) { return k !== 'id'; }).map(function(k) {
          return h('div', { key: k, style: { marginBottom: 4 } }, h('dt', { style: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwW_fg('#94a3b8') } }, _dwW_label(k)), h('dd', { style: { margin: 0 } }, _dwW_any(v[k])));
        }));
      }
      function _dwW_kv(label, value, tone) {
        if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
        return h('div', { style: { marginTop: 6 } },
          h('div', { style: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: _dwW_fg(tone || '#94a3b8') } }, label),
          _dwW_any(value)
        );
      }
      // One library entry as a disclosure: the first present title key is the summary,
      // every other field is a labelled block (arrays as lists, nested objects as term lists).
      function _dwW_entry(item, titleKeys, key) {
        var tk = null;
        for (var i = 0; i < titleKeys.length; i++) { if (item[titleKeys[i]]) { tk = titleKeys[i]; break; } }
        var title = tk ? _dwW_txt(item[tk]) : ('Entry ' + (key || ''));
        var body = Object.keys(item).filter(function(k) { return k !== 'id' && k !== tk; }).map(function(k) {
          var v = item[k];
          if (Array.isArray(v) && v.length && typeof v[0] === 'string' && v.every(function(x) { return x === '' || typeof x === 'string'; }) && k === 'narrative') {
            return h('div', { key: k, style: { marginTop: 6 } }, v.filter(Boolean).map(function(line, j) { return h('p', { key: j, style: { margin: '0 0 6px' } }, line); }));
          }
          return h('div', { key: k }, _dwW_kv(_dwW_label(k), v));
        });
        return _dwW_details(title, h('div', null, body), key || title);
      }
      function _dwW_library(list, titleKeys, cap) {
        var arr = Array.isArray(list) ? list : [];
        var seen = {};
        var out = [];
        for (var i = 0; i < arr.length && out.length < (cap || 60); i++) {
          var it = arr[i]; if (!it || typeof it !== 'object') continue;
          var t = ''; for (var j = 0; j < titleKeys.length; j++) { if (it[titleKeys[j]]) { t = _dwW_txt(it[titleKeys[j]]); break; } }
          if (t && seen[t]) continue; seen[t] = true;
          out.push(_dwW_entry(it, titleKeys, it.id || ('e' + i)));
        }
        return out;
      }
      // A single card drawn from a bank, with "Another one". Seed lives in tool data so it survives re-render.
      function _dwW_deck(key, items, mainKey, subKeys, blurb, accent) {
        var arr = (Array.isArray(items) ? items : []).filter(Boolean);
        if (!arr.length) return null;
        var seedKey = 'wiredSeed_' + key;
        var idx = ((d[seedKey] || 0) + Math.floor(Date.now() / 86400000)) % arr.length;
        var it = arr[idx];
        var main = typeof it === 'string' ? it : _dwW_txt(it[mainKey]);
        return h('div', { style: { padding: 12, borderRadius: 10, background: _dwW_bg('#0f172a'), border: '1px solid ' + _dwW_bd('#334155') } },
          blurb ? h('p', { style: { margin: '0 0 6px', fontSize: 11, color: _dwW_fg('#94a3b8') } }, blurb) : null,
          h('p', { style: { margin: '0 0 8px', fontSize: 15, fontStyle: 'italic', color: _dwW_fg('#f1f5f9'), lineHeight: 1.5 } }, '\u201C' + main + '\u201D'),
          typeof it === 'object' ? (subKeys || []).map(function(k) { return it[k] ? h('div', { key: k, style: { fontSize: 12, color: _dwW_fg('#cbd5e1'), marginBottom: 2 } }, h('strong', null, _dwW_label(k) + ': '), _dwW_txt(it[k])) : null; }) : null,
          h('button', { onClick: function() { var patch = {}; patch[seedKey] = (d[seedKey] || 0) + 1; upd(patch); if (typeof announceToSR === 'function') announceToSR('Showing another one'); },
            style: { marginTop: 6, minHeight: 40, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + _dwW_bd('#475569'), background: _dwW_bg('#1e293b'), color: _dwW_fg('#e2e8f0'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, 'Another one')
        );
      }
      function _dwW_chips(key, options, current, onPick, label) {
        return h('div', { role: 'group', 'aria-label': label, style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
          options.map(function(o) {
            var on = current === o;
            return h('button', { key: o, onClick: function() { onPick(o); }, 'aria-pressed': on ? 'true' : 'false',
              style: { minHeight: 36, padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (on ? _dwW_fg('#5eead4') : _dwW_bd('#475569')), background: on ? 'rgba(20,184,166,0.18)' : _dwW_bg('#0f172a'), color: on ? _dwW_fg('#5eead4') : _dwW_fg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, _dwW_label(o));
          })
        );
      }

      var _dwW_h4 = function(t) { return h('h4', { style: { margin: '12px 0 6px', fontSize: 13, color: _dwW_fg('#e2e8f0') } }, t); };
      function _dwW_toolkit() {
        return h('div', null,
          _dwW_panel('habits', 'Habits that hold', 'Small, specific, repeatable. Pick one for this week.',
            h('div', null, _dwW_library(DIGITAL_HEALTHY_HABITS_LIBRARY, ['habit'], 20), _dwW_h4('Daily practices'), _dwW_library(DIGITAL_DAILY_PRACTICES, ['practice'], 20)), '#22c55e'),
          _dwW_panel('prompt', 'A prompt for today', null, _dwW_deck('prompt', [].concat(DAILY_DIGITAL_PROMPTS_EXTENDED, DAILY_DIGITAL_PROMPTS_EXTENDED_2, EXTENDED_DAILY_PROMPTS_DIGITAL), 'prompt', [], 'Notice one thing about your day online.', null), '#a78bfa'));
      }
      function _dwW_cyber() {
        return h('div', null,
          _dwW_panel('situations', 'Situations, and what to do first', 'What you are probably feeling, what to do, what not to do. Screenshots and a trusted adult come before anything clever.',
            h('div', null, _dwW_library(CYBERBULLYING_DEEP_SCENARIOS, ['situation'], 8), _dwW_h4('More situations'), _dwW_library([].concat(COMPREHENSIVE_SCENARIOS_DIGITAL, SOCIAL_MEDIA_SCENARIOS_DEEP), ['title', 'situation'], 20)), '#ef4444'),
          _dwW_panel('recovery', 'Recovering afterwards', 'It has stages. Each one has priorities and things that make it worse.',
            _dwW_library(CYBERBULLYING_RECOVERY_DEEP, ['stage'], 4), '#f59e0b'));
      }
      function _dwW_media() {
        return _dwW_panel('apps', 'How the apps work on you', 'Every tactic here is a design choice someone made to keep you there longer. Knowing the name of the trick is most of the defence.',
          h('div', null, _dwW_library(TECH_MANIPULATION_LITERACY, ['tactic'], 10), _dwW_h4('Platform by platform'), _dwW_library(ALGORITHM_DECONSTRUCTION, ['platform'], 8), _dwW_h4('Algorithm ideas'), _dwW_library(ALGORITHM_LITERACY_DEEP, ['concept'], 8), _dwW_h4('Deepfakes and AI harms'), _dwW_library(DEEPFAKE_AND_AI_HARMS, ['harm'], 5)), '#0ea5e9');
      }
      function _dwW_ai() {
        return _dwW_panel('ai', 'Talking to an AI: when it helps, when it harms', 'Chatbots are built to be agreeable. That is the benefit and the risk in one sentence.',
          h('div', null, _dwW_library(AI_CHATBOT_AWARENESS, ['topic'], 8), _dwW_h4('Situations'), _dwW_library(COMPREHENSIVE_AI_SCENARIOS, ['situation'], 8)), '#a78bfa');
      }
      function _dwW_crisis() {
        return _dwW_panel('voices', 'Voices', null, _dwW_deck('mentor', DIGITAL_MENTOR_QUOTES, 'quote', ['mentor', 'useWhen', 'followup'], 'From someone who has been where you are.', null), '#f59e0b');
      }
      function _dwW_reference() {
        return h('div', null,
          _dwW_panel('stories', 'Stories', 'First-person, written for this tool; composites, not real students.',
            _dwW_library([].concat(DIGITAL_NARRATIVE_LIBRARY, DIGITAL_NARRATIVES_PART2, EXTENDED_NARRATIVES_PART3, EXTENDED_NARRATIVES_PART4, EXTENDED_NARRATIVES_DIGITAL), ['title'], 45), '#ec4899'),
          _dwW_panel('glossary', 'Words', null, _dwW_library(DIGITAL_GLOSSARY_DEEP, ['term'], 50), '#94a3b8'),
          _dwW_panel('research', 'What the research says, with its limits', 'Summaries as authored, not peer-reviewed by this project. Each entry gives the practical takeaway; read the finding before repeating it.',
            h('div', null, _dwW_library(SOCIAL_MEDIA_RESEARCH, ['finding'], 15), _dwW_h4('Mental health ties'), _dwW_library(DIGITAL_MENTAL_HEALTH_TIES, ['topic'], 8)), '#0ea5e9'),
          _dwW_panel('adults', 'For families and educators', 'Written for the adults.',
            h('div', null, _dwW_library([].concat(PARENT_GUIDES_DIGITAL, PARENT_CONVERSATION_GUIDES), ['topic', 'keyMessage'], 16), _dwW_h4('For educators'), _dwW_library(EDUCATOR_GUIDES_DIGITAL, ['topic', 'keyMessage'], 8)), '#22c55e'));
      }

      var content;
      switch (activeTab) {
        case 'selfcheck':     content = renderSelfCheck(); break;
        case 'toolkit':       content = h('div', null, renderToolkit(), _dwW_toolkit()); break;
        case 'cyberbullying': content = h('div', null, renderCyberbullying(), _dwW_cyber()); break;
        case 'medialit':      content = h('div', null, renderMediaLit(), _dwW_media()); break;
        case 'aicompanion':   content = h('div', null, renderAICompanion(), _dwW_ai()); break;
        case 'crisis':        content = h('div', null, renderCrisis(), _dwW_crisis()); break;
        case 'reference':     content = h('div', null, renderReference(), _dwW_reference()); break;
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
