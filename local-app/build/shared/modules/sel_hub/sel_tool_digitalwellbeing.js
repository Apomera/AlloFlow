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
      '.dw-root .dw-card-interactive:hover:not(:disabled) {',
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
      '.dw-root .dw-stat-tile:hover { box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.08); }',
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

  // ── Register Tool ──
  window.SelHub.registerTool('digitalWellbeing', {
    icon: '📱',
    label: 'Digital Wellbeing Studio',
    desc: 'Self-check your relationship with social media and AI chatbots, build healthy habits, recover from cyberbullying, spot manipulation, and find help.',
    color: 'cyan',
    category: 'self-regulation',
    render: function(ctx) {
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
              h('h2', { style: { margin: '0 0 4px', color: '#0e7490', fontSize: 22, lineHeight: 1.2 } },
                'Digital Wellbeing Studio'
              ),
              h('p', { style: { margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.5 } },
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
                  background: active ? ACCENT : 'transparent',
                  color: active ? '#fff' : '#334155',
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
            return h('div', { style: { padding: 20, color: '#64748b' } }, 'No answers recorded yet.');
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
              h('div', { 'aria-hidden': 'true', style: { position: 'relative', width: 100, height: 100, flexShrink: 0 } },
                h('svg', { width: 100, height: 100, viewBox: '0 0 100 100', style: { transform: 'rotate(-90deg)' } },
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: '#e2e8f0', strokeWidth: 8 }),
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: result.color, strokeWidth: 8,
                    strokeDasharray: ringCirc, strokeDashoffset: ringCirc * (1 - totalPct),
                    strokeLinecap: 'round', style: { transition: 'stroke-dashoffset 0.6s ease' } })
                ),
                h('div', { style: {
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', lineHeight: 1
                } },
                  h('div', { style: { fontSize: 26, fontWeight: 800, color: result.color } }, overallPct + '%'),
                  h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 } }, 'impact')
                )
              ),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 } }, 'Your check-in result'),
                h('div', { style: { fontSize: 24, fontWeight: 800, color: result.color, marginBottom: 8, lineHeight: 1.2 } }, result.label),
                h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#1e293b' } }, result.summary)
              )
            ),
            h('h3', { style: { margin: '16px 0 8px', color: '#0f172a' } }, 'Where it shows up most'),
            h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 10 } },
              'Each bar is one dimension of digital impact, sorted from highest to lowest. The bars near the top are where small changes will help most.'),
            h('div', { role: 'list', 'aria-label': 'Dimension breakdown', style: { display: 'grid', gap: 6, marginBottom: 16 } },
              rows.map(function(r) {
                var color = r.pct >= 0.66 ? '#ef4444' : (r.pct >= 0.34 ? '#f59e0b' : '#10b981');
                var pctText = Math.round(r.pct * 100) + '%';
                return h('div', { key: r.dim, role: 'listitem',
                  'aria-label': r.label + ': ' + pctText + ' impact',
                  style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } },
                  h('div', { style: { width: 180, color: '#0f172a', fontWeight: 500, flexShrink: 0 } }, r.label),
                  h('div', { style: { flex: 1, background: '#e2e8f0', height: 18, borderRadius: 4, overflow: 'hidden', position: 'relative' } },
                    h('div', { style: { background: color, height: '100%', width: (r.pct * 100) + '%', transition: 'width 0.4s ease' } }),
                    h('span', { style: { position: 'absolute', right: 6, top: 0, lineHeight: '18px', fontSize: 11, fontWeight: 700, color: '#0f172a' } }, pctText)
                  )
                );
              })
            ),
            h('h3', { style: { margin: '16px 0 8px', color: '#0f172a' } }, 'Three strategies that match what you flagged'),
            h('div', { style: { display: 'grid', gap: 10 } },
              picks.map(function(s) {
                return h('div', { key: s.id, style: {
                  padding: 14, border: '1px solid ' + ACCENT_MED, borderRadius: 10, background: '#f8fafc'
                } },
                  h('div', { style: { fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#0f172a' } },
                    h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, s.icon), s.title),
                  h('div', { style: { fontSize: 13, color: '#475569', marginBottom: 6 } }, s.what),
                  h('div', { style: { fontSize: 13, color: '#0f172a' } },
                    h('strong', null, 'Try first: '), s.first)
                );
              })
            ),
            h('p', { style: { fontSize: 12, color: '#64748b', marginTop: 14 } },
              'This is a self-check, not a diagnosis. It is meant to surface patterns worth noticing, not to label you. Talk to a school counselor or other trusted adult if anything here landed hard.'),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() { upd('activeTab', 'toolkit'); },
                style: { padding: '10px 16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
              }, 'Go to full Toolkit →'),
              h('button', {
                onClick: function() { openCounselorPacket(result, rows, picks); },
                style: { padding: '10px 16px', background: '#0e7490', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
              }, '🖨️ Print / share packet'),
              h('button', {
                onClick: function() {
                  upd({ scAnswers: {}, scQuestionIdx: 0, scShowResults: false });
                  if (announceToSR) announceToSR('Self-check reset');
                },
                style: { padding: '10px 16px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }
              }, 'Retake check-in')
            ),
            h('p', { style: { fontSize: 12, color: '#64748b', marginTop: 8 } },
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
          h('div', { style: { fontSize: 13, color: '#475569', marginBottom: 8 } },
            'Question ' + (scQuestionIdx + 1) + ' of ' + SELF_CHECK_QUESTIONS.length + ' · ' + totalAnswered + ' answered'
          ),
          h('div', { style: { background: '#e2e8f0', height: 8, borderRadius: 4, marginBottom: 16, overflow: 'hidden' } },
            h('div', { className: 'dw-progress-fill', style: { height: '100%', width: ((scQuestionIdx + 1) / SELF_CHECK_QUESTIONS.length * 100) + '%' } })
          ),
          h('div', { style: {
            padding: 18, border: '1px solid ' + ACCENT_MED, borderRadius: 12, background: '#f8fafc', marginBottom: 14
          } },
            h('div', { 'aria-live': 'polite', style: { fontSize: 17, fontWeight: 600, color: '#0f172a', lineHeight: 1.5, marginBottom: 14 } }, q.text),
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
                    background: selected ? ACCENT_DIM : '#fff',
                    border: '2px solid ' + (selected ? ACCENT : '#cbd5e1'),
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: selected ? 700 : 500,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid ' + (selected ? ACCENT : '#cbd5e1'),
                    background: selected ? ACCENT : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1,
                    transition: 'all 0.18s ease'
                  } }, selected ? '✓' : ''),
                  h('span', null, lbl)
                );
              })
            ),
            hasAnswer && h('div', { style: {
              marginTop: 14, padding: 12, background: '#fff', border: '1px dashed ' + ACCENT_MED, borderRadius: 8,
              fontSize: 13, color: '#334155', lineHeight: 1.55
            } },
              h('strong', { style: { color: ACCENT, display: 'block', marginBottom: 4 } }, 'What this is about:'),
              q.research
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (scQuestionIdx > 0) upd('scQuestionIdx', scQuestionIdx - 1); },
              disabled: scQuestionIdx === 0,
              style: { padding: '10px 14px', background: '#fff', color: scQuestionIdx === 0 ? '#94a3b8' : '#0f172a',
                       border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: scQuestionIdx === 0 ? 'not-allowed' : 'pointer' }
            }, '← Previous'),
            scQuestionIdx < SELF_CHECK_QUESTIONS.length - 1
              ? h('button', {
                  onClick: function() { upd('scQuestionIdx', scQuestionIdx + 1); },
                  style: { padding: '10px 14px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
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
                    background: totalAnswered < SELF_CHECK_QUESTIONS.length ? '#94a3b8' : '#10b981',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: totalAnswered < SELF_CHECK_QUESTIONS.length ? 'not-allowed' : 'pointer'
                  }
                }, 'See my result →')
          ),
          totalAnswered < SELF_CHECK_QUESTIONS.length && scQuestionIdx === SELF_CHECK_QUESTIONS.length - 1
            && h('p', { style: { fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'right' } },
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
            h('span', { style: { flex: 1, fontWeight: 700, color: '#9d174d', fontSize: 15 } }, 'Reframe a comparison thought (with AI help)'),
            h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 18 } }, rfShown ? '▾' : '▸')
          ),
          rfShown && h('div', { style: { marginTop: 10 } },
            h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#0f172a', lineHeight: 1.55 } },
              'Type a comparison thought you have had recently — the kind that pops up after scrolling. ',
              h('em', null, '"Everyone else is happier / hotter / smarter / has more friends than me."'),
              ' The AI will reflect it back through three angles: what you do not see in their feed, what is true about you, and what a kind friend would say.'),
            h('label', { htmlFor: 'dw-rf-input', style: { display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 } },
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
                  background: (rfLoading || !rfInput.trim() || !callGemini) ? '#94a3b8' : '#db2777',
                  color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700,
                  cursor: (rfLoading || !rfInput.trim() || !callGemini) ? 'not-allowed' : 'pointer',
                  fontSize: 13
                }
              }, rfLoading ? 'Thinking...' : (callGemini ? 'Reframe this' : 'AI not available')),
              rfReply && h('button', {
                onClick: function() { upd({ rfInput: '', rfReply: '' }); },
                style: { padding: '8px 14px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
              }, 'Try another')
            ),
            !callGemini && h('p', { style: { fontSize: 11, color: '#9d174d', marginTop: 6 } },
              'AI features need a connection. While offline: try writing what the kindest person in your life would say back to you.'),
            // Surface 988 / Crisis Text Line block when last reframe input was tier-3.
            (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
            rfReply && h('div', { 'aria-live': 'polite', style: {
              marginTop: 12, padding: 14, background: '#fff', border: '1px dashed #f9a8d4',
              borderRadius: 8, fontSize: 14, lineHeight: 1.6, color: '#0f172a', whiteSpace: 'pre-wrap'
            } }, rfReply),
            rfReply && h('p', { style: { fontSize: 11, color: '#9d174d', marginTop: 8, fontStyle: 'italic' } },
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
          h('h3', { style: { margin: '0 0 8px', color: '#6b21a8', fontSize: 16 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🎰'),
            'Algorithm Reveal — why the feed pulls you back'),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#0f172a', lineHeight: 1.55 } },
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
              background: '#fff', border: '3px solid ' + (algoLast && algoLast.jackpot ? '#10b981' : '#d8b4fe'),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, lineHeight: 1
            } },
              h('span', { 'aria-hidden': 'true' }, algoLast ? algoLast.slot : '—'),
              algoLast && algoLast.jackpot && h('div', { style: { fontSize: 10, color: '#10b981', fontWeight: 800, marginTop: 4 } }, 'JACKPOT')
            )
          ),
          h('div', { style: { display: 'grid', gap: 6, gridTemplateColumns: '1fr 1fr 1fr', fontSize: 12, textAlign: 'center' } },
            h('div', { className: 'dw-stat-tile', style: { padding: 10, background: '#fff', borderRadius: 8 } },
              h('div', { style: { color: '#64748b' } }, 'Taps'),
              h('div', { style: { fontWeight: 800, fontSize: 18, color: '#6b21a8' } }, algoTaps)),
            h('div', { className: 'dw-stat-tile', style: { padding: 10, background: '#fff', borderRadius: 8 } },
              h('div', { style: { color: '#64748b' } }, 'Hits'),
              h('div', { style: { fontWeight: 800, fontSize: 18, color: '#10b981' } }, algoHits)),
            h('div', { className: 'dw-stat-tile', style: { padding: 10, background: '#fff', borderRadius: 8 } },
              h('div', { style: { color: '#64748b' } }, 'Hit rate'),
              h('div', { style: { fontWeight: 800, fontSize: 18, color: '#6b21a8' } }, hitRate.toFixed(0) + '%'))
          ),
          algoTaps >= 10 && h('p', { style: { margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
            h('strong', { style: { color: '#6b21a8' } }, 'Notice the pull. '),
            'Even though most taps give nothing, you probably wanted to tap again after a "jackpot." That is the design. Real feeds are calibrated by data scientists to maximize this exact pull. Knowing the mechanism is the first step in not being run by it.'),
          algoTaps > 0 && h('button', {
            onClick: function() { upd({ algoTaps: 0, algoHits: 0, algoLast: null }); },
            style: { marginTop: 10, padding: '6px 12px', background: 'transparent', border: '1px solid #d8b4fe', color: '#6b21a8', borderRadius: 6, fontSize: 12, cursor: 'pointer' }
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
          h('h3', { style: { margin: '0 0 8px', color: '#1e40af', fontSize: 16 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🛌'),
            'Sleep Math — what is your phone actually costing you?'),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#0f172a', lineHeight: 1.55 } },
            'Teens need ', h('strong', null, '8 to 10 hours'),
            ' (American Academy of Sleep Medicine). Most are getting under 7. Set when you put the phone down and when you wake up:'),
          h('div', { style: { display: 'grid', gap: 12, marginBottom: 12 } },
            h('label', { htmlFor: 'dw-sleep-stop', style: { display: 'block', fontSize: 13, color: '#475569' } },
              'I put the phone down at ',
              h('strong', { style: { color: '#1e40af', fontSize: 15 } }, fmtHr(sleepStop))),
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
            h('label', { htmlFor: 'dw-sleep-wake', style: { display: 'block', fontSize: 13, color: '#475569' } },
              'I wake up at ',
              h('strong', { style: { color: '#1e40af', fontSize: 15 } }, fmtHr(sleepWake))),
            h('input', {
              id: 'dw-sleep-wake',
              type: 'range', min: 5, max: 10, step: 0.25, value: sleepWake,
              onChange: function(e) { upd('sleepWake', parseFloat(e.target.value)); },
              'aria-label': 'Wake time',
              style: { width: '100%', accentColor: '#3b82f6' }
            })
          ),
          // 24h horizon bar with day/night gradient + sleep window highlight
          h('div', { style: { marginTop: 16, marginBottom: 6, fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 2px' } },
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
            marginTop: 12, padding: 12, background: '#fff', borderRadius: 8,
            border: '2px solid ' + color, textAlign: 'center'
          } },
            h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Your sleep window'),
            h('div', { style: { fontSize: 28, fontWeight: 800, color: color } }, sleepHrs.toFixed(1) + ' hours'),
            h('div', { style: { fontSize: 13, color: '#334155', marginTop: 4 } },
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
            background: '#fef2f2', border: '1px dashed #fecaca', borderRadius: 10
          } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🌀'),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontWeight: 700, color: '#991b1b', fontSize: 14 } }, 'Already deep in a scroll?'),
                h('div', { style: { fontSize: 12, color: '#475569', marginTop: 2 } }, 'It is 1 AM and you just looked up — start the 4-minute reset.')),
              h('button', {
                onClick: function() { upd({ dsActive: true, dsStep: 0, dsDone: {} }); if (announceToSR) announceToSR('Reset routine started'); },
                style: { padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
            background: '#f0fdf4', border: '2px solid #10b981', borderRadius: 12, textAlign: 'center'
          } },
            h('div', { style: { fontSize: 36 } }, '✓'),
            h('div', { style: { fontWeight: 800, fontSize: 18, color: '#166534', marginTop: 6 } }, 'Reset complete'),
            h('p', { style: { margin: '8px 0 0', fontSize: 13, color: '#0f172a', lineHeight: 1.55 } },
              'That was about four minutes of choice instead of three hours of autopilot. Tomorrow you will not have undone the scrolling, but you broke the loop, which is the whole point. Sleep well.'),
            h('button', {
              onClick: function() { upd({ dsActive: false, dsStep: 0, dsDone: {} }); tryAwardBadge('doom_reset', 'Loop Breaker'); },
              style: { marginTop: 12, padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
            }, 'Close')
          );
        }
        return h('div', { style: {
          padding: 16, marginBottom: 14,
          background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 12
        } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
            h('div', { style: { fontWeight: 800, color: '#991b1b', fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🌀'),
              'Doomscroll Reset — step ' + (dsStep + 1) + ' of ' + DOOMSCROLL_RESET.length),
            h('button', {
              'aria-label': 'Exit reset routine',
              onClick: function() { upd({ dsActive: false, dsStep: 0, dsDone: {} }); },
              style: { background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 18, fontWeight: 700 }
            }, '×')
          ),
          // progress dots
          h('div', { 'aria-hidden': 'true', style: { display: 'flex', gap: 4, marginBottom: 12 } },
            DOOMSCROLL_RESET.map(function(_, i) {
              return h('div', { key: i, style: {
                flex: 1, height: 6, borderRadius: 3,
                background: dsDone[i] ? '#10b981' : (i === dsStep ? '#fca5a5' : '#fee2e2')
              } });
            })
          ),
          h('div', { 'aria-live': 'polite', style: {
            padding: 14, background: '#fff', border: '1px solid #fecaca', borderRadius: 8
          } },
            h('div', { style: { fontSize: 28, fontWeight: 800, color: '#dc2626', marginBottom: 4 } }, 'Step ' + step.step),
            h('div', { style: { fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 6 } }, step.title),
            h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.55, color: '#334155' } }, step.body),
            h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic' } }, step.sec)
          ),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (dsStep > 0) upd('dsStep', dsStep - 1); },
              disabled: dsStep === 0,
              style: { padding: '8px 14px', background: '#fff', color: dsStep === 0 ? '#94a3b8' : '#0f172a',
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
                  style: { padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
                }, dsStep < DOOMSCROLL_RESET.length - 1 ? 'Done — next →' : 'Done — finish')
              : h('button', {
                  onClick: function() {
                    if (dsStep < DOOMSCROLL_RESET.length - 1) upd('dsStep', dsStep + 1);
                  },
                  disabled: dsStep >= DOOMSCROLL_RESET.length - 1,
                  style: { padding: '8px 14px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }
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
          h('div', { style: { padding: 14, background: '#f0fdfa', border: '1px solid ' + ACCENT_MED, borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } },
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
            h('h3', { style: { margin: '0 0 8px', color: '#0e7490', fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⏳'),
              'Time Reclaim — what could you actually do with it?'),
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#0f172a', lineHeight: 1.55 } },
              'Most "I should use my phone less" never works because the savings feel abstract. Move the slider to a realistic cut, then see the math.'),
            h('label', { htmlFor: 'dw-tk-slider', style: { display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 } },
              'If I cut my scrolling by ',
              h('strong', { style: { color: '#0e7490', fontSize: 16 } }, tkCutMins + ' min/day')),
            h('input', {
              id: 'dw-tk-slider',
              type: 'range', min: 5, max: 180, step: 5, value: tkCutMins,
              onChange: function(e) { upd('tkCutMins', parseInt(e.target.value, 10)); },
              'aria-label': 'Minutes per day to cut',
              style: { width: '100%', accentColor: ACCENT }
            }),
            h('div', { style: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginTop: 12 } },
              h('div', { className: 'dw-stat-tile', style: { padding: 12, background: '#fff', borderRadius: 10, textAlign: 'center', border: '1px solid #cffafe' } },
                h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Per year'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: '#0e7490' } }, Math.round(hrsPerYear) + ' hrs')),
              h('div', { className: 'dw-stat-tile', style: { padding: 12, background: '#fff', borderRadius: 10, textAlign: 'center', border: '1px solid #cffafe' } },
                h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Equals'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: '#0e7490' } }, daysPerYear.toFixed(1) + ' full days')),
              h('div', { className: 'dw-stat-tile', style: { padding: 12, background: '#fff', borderRadius: 10, textAlign: 'center', border: '1px solid #cffafe' } },
                h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Or about'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: '#0e7490' } }, schoolWeeksPerYear.toFixed(1) + ' school wks'))
            ),
            h('label', { htmlFor: 'dw-tk-activity', style: { display: 'block', fontSize: 13, color: '#475569', marginTop: 14, marginBottom: 4 } },
              'What would you actually want to do with ' + Math.round(hrsPerYear) + ' hours?'),
            h('input', {
              id: 'dw-tk-activity',
              type: 'text', value: tkActivity,
              onChange: function(e) { upd('tkActivity', e.target.value); },
              placeholder: 'learn guitar, train for a 5K, write a story, sleep more...',
              style: { width: '100%', padding: '10px 12px', border: '1px solid #67e8f9', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
            }),
            tkActivity && tkActivity.length > 2 && h('p', { 'aria-live': 'polite', style: { margin: '8px 0 0', fontSize: 13, color: '#0e7490', fontWeight: 600 } },
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
                background: committed ? '#f0fdf4' : '#fff',
                overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() { upd('tkExpanded', expanded ? null : s.id); },
                  'aria-expanded': expanded ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 700, color: '#0f172a',
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
                  h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 18 } }, expanded ? '▾' : '▸')
                ),
                expanded && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 4 } }, 'What it is'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, s.what)
                  ),
                  h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 4 } }, 'Why it works'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#334155' } }, s.why)
                  ),
                  h('div', { style: { marginTop: 12, padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 4 } }, 'Small enough to do today'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, s.first)
                  ),
                  h('p', { style: { fontSize: 12, color: '#64748b', marginTop: 10, marginBottom: 0 } }, 'Source: ' + s.source),
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
                        background: committed ? '#fff' : '#10b981',
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
            background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 10
          } },
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22, lineHeight: 1 } }, '⚠️'),
              h('div', null,
                h('div', { style: { fontWeight: 800, color: '#92400e', fontSize: 14, marginBottom: 4 } },
                  'This tab is about cyberbullying. If something else is going on, go elsewhere first.'),
                h('p', { style: { margin: '0 0 6px', fontSize: 13, color: '#0f172a', lineHeight: 1.5 } },
                  h('strong', null, 'If an adult is messaging you '),
                  '(sexual content, asking for photos, getting too friendly too fast, asking you to keep secrets, or threatening to share intimate images), that is ',
                  h('strong', null, 'sextortion / grooming'),
                  ' — a specific crime that needs different help.'),
                h('ul', { style: { margin: '0 0 6px 20px', padding: 0, fontSize: 13, lineHeight: 1.6, color: '#0f172a' } },
                  h('li', null, 'Open the ', h('strong', null, 'Safety & Boundaries'), ' SEL tool for the right scripts and steps'),
                  h('li', null, 'Call the ', h('strong', null, 'CyberTipline: 1-800-843-5678'), ' (NCMEC, free, anonymous)'),
                  h('li', null, 'Tell a trusted adult ', h('strong', null, 'today'), ' — do not wait')),
                h('p', { style: { margin: 0, fontSize: 12, color: '#64748b', fontStyle: 'italic' } },
                  'You did nothing wrong, even if you sent something you regret. Adults who do this to kids are running a known playbook.'))
            )
          ),
          h('div', { style: { padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16 } },
            h('h3', { style: { margin: '0 0 8px', color: '#991b1b', fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🛡️'),
              'Why cyberbullying is different'),
            h('ul', { style: { margin: '0 0 0 20px', paddingLeft: 0, fontSize: 13, lineHeight: 1.6, color: '#0f172a' } },
              h('li', null, h('strong', null, 'Permanence. '), 'Screenshots last forever. A playground insult fades — a screenshot does not.'),
              h('li', null, h('strong', null, 'Scale. '), 'The audience can be hundreds or thousands of people, not just the kids who happened to be there.'),
              h('li', null, h('strong', null, 'Anonymity. '), 'You may not know who is hurting you, which makes it harder to confront or escape.'),
              h('li', null, h('strong', null, '24/7. '), 'Your bedroom does not protect you. Home stops being a safe space.'),
              h('li', null, h('strong', null, 'Silent witnesses. '), 'Group chats with 50 people — most stay quiet, which can feel like everyone agrees.')
            )
          ),

          // ── Platform quick-reference (report / block / restrict / privacy) ──
          h('div', { style: { padding: 14, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, marginBottom: 16 } },
            h('h3', { style: { margin: '0 0 6px', color: '#0f172a', fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⚙️'),
              'Where the buttons actually are — by platform'),
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#475569', lineHeight: 1.5 } },
              'When you are in the moment, you do not want to be searching menus. Tap your platform to see exactly where Report, Block, and Privacy live. (UI changes over time — these were current as of 2024–2025.)'),
            h('div', { style: { display: 'grid', gap: 8 } },
              PLATFORM_REFS.map(function(p) {
                var open = cbPlatformOpen === p.id;
                return h('div', { key: p.id, style: {
                  border: '1px solid ' + (open ? p.color : '#e2e8f0'),
                  borderRadius: 8, background: '#fff', overflow: 'hidden'
                } },
                  h('button', {
                    onClick: function() { upd('cbPlatformOpen', open ? null : p.id); },
                    'aria-expanded': open ? 'true' : 'false',
                    style: {
                      width: '100%', padding: '10px 12px', textAlign: 'left',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 700, color: '#0f172a',
                      display: 'flex', alignItems: 'center', gap: 10
                    }
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, p.icon),
                    h('span', { style: { flex: 1 } }, p.name),
                    h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 16 } }, open ? '▾' : '▸')
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
                        h('div', { style: { fontSize: 13, color: '#0f172a', lineHeight: 1.55 } }, p[row.key])
                      );
                    })
                  )
                );
              })
            ),
            h('p', { style: { margin: '12px 0 0', fontSize: 11, color: '#64748b', fontStyle: 'italic' } },
              'When in doubt: Report > Block > Tell an adult. The combination is much stronger than any one alone.')
          ),

          h('div', { style: { padding: 16, border: '1px solid ' + ACCENT_MED, borderRadius: 12, background: '#fff', marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
              'Scenario ' + (cbScenIdx + 1) + ' of ' + CB_SCENARIOS.length + (alreadyDone ? ' · Answered' : '')),
            h('h3', { style: { margin: '0 0 8px', color: '#0f172a' } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, scen.icon), scen.title),
            h('p', { 'aria-live': 'polite', style: { margin: '0 0 14px', fontSize: 15, lineHeight: 1.6, color: '#1e293b' } }, scen.setup),
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
                    background: picked ? ACCENT_DIM : '#fff',
                    border: '2px solid ' + (picked ? ACCENT : '#cbd5e1'),
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: picked ? 700 : 500,
                    color: '#0f172a',
                    cursor: 'pointer'
                  }
                }, c.label);
              })
            ),
            cbChoice != null && h('div', { 'aria-live': 'polite', style: {
              marginTop: 12, padding: 12, borderRadius: 8,
              background: scen.choices[cbChoice].rating >= 3 ? '#f0fdf4' : (scen.choices[cbChoice].rating === 2 ? '#fefce8' : '#fef2f2'),
              border: '1px solid ' + (scen.choices[cbChoice].rating >= 3 ? '#bbf7d0' : (scen.choices[cbChoice].rating === 2 ? '#fde68a' : '#fecaca'))
            } },
              h('div', { style: { fontSize: 12, fontWeight: 700, marginBottom: 4,
                  color: scen.choices[cbChoice].rating >= 3 ? '#166534' : (scen.choices[cbChoice].rating === 2 ? '#854d0e' : '#991b1b') } },
                scen.choices[cbChoice].rating >= 3 ? 'Strong response' : (scen.choices[cbChoice].rating === 2 ? 'Partial — worth thinking about' : 'Risky — think this through')),
              h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, scen.choices[cbChoice].feedback)
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'space-between' } },
              h('button', {
                onClick: function() {
                  if (cbScenIdx > 0) upd({ cbScenIdx: cbScenIdx - 1, cbChoice: null });
                },
                disabled: cbScenIdx === 0,
                style: { padding: '8px 14px', background: '#fff', color: cbScenIdx === 0 ? '#94a3b8' : '#0f172a',
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
                  background: cbChoice == null ? '#94a3b8' : ACCENT,
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                  cursor: cbChoice == null ? 'not-allowed' : 'pointer'
                }
              }, cbScenIdx < CB_SCENARIOS.length - 1 ? 'Lock in answer →' : 'Finish scenarios')
            )
          ),

          h('h3', { style: { margin: '24px 0 8px', color: '#0f172a' } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🕒'),
            'Recovery — it does not stop hurting the moment you close the app'),
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 12 } },
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
                  background: viewed ? '#f0fdfa' : '#fff',
                  border: '1px solid ' + (viewed ? '#5eead4' : '#e2e8f0'),
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  font: 'inherit',
                  color: 'inherit'
                }
              },
                h('div', { style: { fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 } },
                  (viewed ? '✓ ' : '') + r.title),
                h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#334155' } }, r.body)
              );
            })
          ),
          // ── Helping a friend ──
          h('h3', { style: { margin: '28px 0 6px', color: '#0f172a' } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤝'),
            'If a friend is the one being targeted'),
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 12 } },
            'You do not have to be a counselor. You just have to be present. The single most protective thing a peer can do is not look away. Below: what to say, why it works, and what to avoid.'),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 14 } },
            FRIEND_HELP.scripts.map(function(s, idx) {
              var open = cbFriendOpen === idx;
              var viewed = !!cbFriendViewed[idx];
              return h('div', { key: idx, style: {
                border: '1px solid ' + (viewed ? '#a7f3d0' : '#cbd5e1'),
                borderRadius: 10,
                background: viewed ? '#f0fdf4' : '#fff',
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
                    fontSize: 14, fontWeight: 700, color: '#0f172a',
                    display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { flex: 1 } }, s.situation),
                  h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 18 } }, open ? '▾' : '▸')
                ),
                open && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { marginTop: 12, padding: 12, background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0e7490', fontWeight: 700, marginBottom: 4 } }, 'Say'),
                    h('p', { style: { margin: 0, fontSize: 15, lineHeight: 1.55, color: '#0f172a', fontStyle: 'italic' } }, s.say)
                  ),
                  h('div', { style: { marginTop: 10 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', fontWeight: 700, marginBottom: 4 } }, 'Why it works'),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#334155' } }, s.why)
                  )
                )
              );
            })
          ),
          h('div', { style: { padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 } },
            h('div', { style: { fontWeight: 700, color: '#991b1b', marginBottom: 8, fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⛔'),
              'And what to AVOID'),
            h('div', { style: { display: 'grid', gap: 10 } },
              FRIEND_HELP.donts.map(function(d, idx) {
                return h('div', { key: idx },
                  h('div', { style: { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 } }, '✗ ' + d.what),
                  h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.5 } }, d.why)
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
          h('div', { style: { padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } },
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
                background: viewed ? '#f0fdfa' : '#fff',
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
                    fontSize: 15, fontWeight: 700, color: '#0f172a',
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
                  h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 18 } }, expanded ? '▾' : '▸')
                ),
                expanded && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', margin: '12px 0 4px' } }, 'Tells to watch for'),
                  h('ul', { style: { margin: 0, paddingLeft: 20 } },
                    item.tells.map(function(t, i) {
                      return h('li', { key: i, style: { fontSize: 14, lineHeight: 1.55, color: '#0f172a', marginBottom: 4 } }, t);
                    })
                  ),
                  h('div', { style: { marginTop: 12, padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#9a3412', marginBottom: 4 } }, 'Try this'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, item.practice)
                  ),
                  item.source && h('p', { style: { fontSize: 12, color: '#64748b', marginTop: 8, marginBottom: 0 } }, 'Source: ' + item.source)
                )
              );
            })
          ),
          h('div', { style: { padding: 14, background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 10 } },
            h('h3', { style: { margin: '0 0 8px', color: '#0f172a', fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🎯'),
              'The 90-second lateral read'),
            h('p', { style: { margin: '0 0 8px', fontSize: 14, lineHeight: 1.55, color: '#0f172a' } },
              'The single most powerful media literacy habit you can build, per the Stanford History Education Group:'),
            h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#0f172a' } },
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

        return h('div', { style: { marginTop: 18, padding: 16, background: '#fffbeb', border: '2px solid #fcd34d', borderRadius: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 } },
            h('h3', { style: { margin: 0, color: '#92400e', fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🕵️'),
              'Spot the Tells — interactive challenge'),
            h('div', { style: { fontSize: 12, color: '#92400e', fontWeight: 700 } },
              'Score: ' + stScore + ' / ' + SPOT_TELLS_ITEMS.length + (allDone ? ' · Complete!' : ''))
          ),
          h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#451a03', lineHeight: 1.55 } },
            'Read the scenario. Tap every red flag you see. There may be more than one per scenario — and at least one option is a trap. Then check your answer.'),

          h('div', { style: { padding: 12, background: '#fff', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 12 } },
            h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#92400e', fontWeight: 700, marginBottom: 6 } },
              'Scenario ' + (stIdx + 1) + ' of ' + SPOT_TELLS_ITEMS.length),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a' } }, item.scenario)
          ),

          h('div', { style: { display: 'grid', gap: 8 } },
            item.options.map(function(opt, idx) {
              var sel = !!picked[idx];
              var bg = '#fff';
              var border = '#cbd5e1';
              if (submitted) {
                if (sel && opt.correct) { bg = '#f0fdf4'; border = '#10b981'; }
                else if (sel && !opt.correct) { bg = '#fef2f2'; border = '#ef4444'; }
                else if (!sel && opt.correct) { bg = '#fffbeb'; border = '#f59e0b'; }
              } else if (sel) {
                bg = '#fef3c7'; border = '#f59e0b';
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
                  fontSize: 13, color: '#0f172a',
                  cursor: submitted ? 'default' : 'pointer',
                  display: 'flex', gap: 8, alignItems: 'flex-start'
                }
              },
                h('span', { 'aria-hidden': 'true', style: {
                  flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                  border: '2px solid ' + (sel ? border : '#94a3b8'),
                  background: sel ? border : '#fff', color: '#fff',
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

          submitted && h('div', { 'aria-live': 'polite', style: { marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px dashed #f59e0b' } },
            h('div', { style: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#92400e', fontWeight: 700, marginBottom: 4 } }, 'Why'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } }, item.explain)
          ),

          h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (stIdx > 0) upd('stIdx', stIdx - 1); },
              disabled: stIdx === 0,
              style: { padding: '8px 14px', background: '#fff', color: stIdx === 0 ? '#94a3b8' : '#0f172a',
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
                    background: anyPicked ? '#f59e0b' : '#94a3b8',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
                    cursor: anyPicked ? 'pointer' : 'not-allowed', fontSize: 13
                  }
                }, 'Check my answer')
              : stIdx < SPOT_TELLS_ITEMS.length - 1
                ? h('button', {
                    onClick: function() { upd('stIdx', stIdx + 1); },
                    style: { padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }
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
          h('div', { style: { padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } },
              h('strong', { style: { color: '#991b1b' } }, 'If you are in immediate danger or thinking about hurting yourself: '),
              'reach out right now. The numbers below all have human beings answering. None of them call the police on you by default. Most of them are free.')
          ),

          h('h3', { style: { margin: '0 0 8px', color: '#0f172a' } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '☎️'),
            'Hotlines that will talk to you right now'),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 18 } },
            [
              { name: '988 Suicide & Crisis Lifeline', icon: '☎️', accent: '#dc2626', contact: 'Call or text 988', desc: '24/7. Free. Confidential. For thoughts of self-harm, suicide, or just feeling like you cannot keep going.' },
              { name: 'Crisis Text Line', icon: '💬', accent: '#0891b2', contact: 'Text HOME to 741741', desc: 'Texting only — useful if you cannot or do not want to talk out loud. Real trained counselors, not bots.' },
              { name: 'CyberTipline (NCMEC)', icon: '🛡️', accent: '#7c3aed', contact: 'Call 1-800-843-5678 or report at cybertipline.org', desc: 'For online sexual exploitation, sextortion, or someone sharing intimate images of you or someone underage. Run by the National Center for Missing & Exploited Children.' },
              { name: 'StopBullying.gov', icon: '⚖️', accent: '#0d9488', contact: 'stopbullying.gov', desc: 'Federal resource hub with state-specific cyberbullying laws and reporting paths. Useful when you need to know what your school actually has to do.' },
              { name: 'The Trevor Project (LGBTQ+ youth)', icon: '🏳️‍🌈', accent: '#db2777', contact: 'Call 1-866-488-7386 or text START to 678-678', desc: '24/7 crisis support specifically for LGBTQ+ young people. Free and confidential.' }
            ].map(function(rsc, i) {
              return h('div', { key: i, className: 'dw-card', style: {
                display: 'flex', gap: 12, padding: 0, border: '1px solid #fecaca',
                background: '#fff', borderRadius: 10, overflow: 'hidden'
              } },
                h('div', { 'aria-hidden': 'true', style: {
                  width: 56, flexShrink: 0,
                  background: 'linear-gradient(135deg, ' + rsc.accent + ' 0%, ' + rsc.accent + 'cc 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, color: '#fff'
                } }, rsc.icon),
                h('div', { style: { padding: '12px 14px 12px 4px', flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 700, fontSize: 15, color: rsc.accent, marginBottom: 2 } }, rsc.name),
                  h('div', { style: { fontSize: 14, color: '#0f172a', fontFamily: 'ui-monospace, monospace', marginBottom: 4 } }, rsc.contact),
                  h('div', { style: { fontSize: 13, color: '#475569', lineHeight: 1.5 } }, rsc.desc)
                )
              );
            })
          ),

          h('h3', { style: { margin: '0 0 8px', color: '#0f172a' } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🧭'),
            'Warning signs worth taking seriously'),
          h('div', { style: { padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 18 } },
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#475569' } },
              'In yourself or a friend, especially after sustained cyberbullying or online comparison:'),
            h('ul', { style: { margin: '0 0 0 20px', padding: 0, fontSize: 14, lineHeight: 1.7, color: '#0f172a' } },
              h('li', null, 'Talking about feeling like a burden, hopeless, or having no future'),
              h('li', null, 'Giving away possessions, saying goodbye in a way that feels off'),
              h('li', null, 'Sudden withdrawal from friends, sports, or activities they used to care about'),
              h('li', null, 'Sleeping a lot more or a lot less; appetite changes'),
              h('li', null, 'Searching online for methods, posting darker-themed content, or rehearsing'),
              h('li', null, 'Sudden calm or relief after a long period of distress — can sometimes signal a decision has been made')
            ),
            h('p', { style: { fontSize: 13, color: '#0f172a', margin: '12px 0 0' } },
              h('strong', null, 'Trust your gut. '),
              'If a friend feels off, ask them directly. Research is clear: asking about suicide does NOT plant the idea. It opens a door.')
          ),

          // ── Reach-out scripts ──
          h('h3', { style: { margin: '0 0 8px', color: '#0f172a' } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '💬'),
            'What to actually say — three scripts'),
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 12 } },
            'Knowing the hotline number is not the same as picking up the phone. The hardest part is the first sentence. These are real, copy-able opening lines for three situations. Open the one you need.'),
          h('div', { style: { display: 'grid', gap: 10, marginBottom: 20 } },
            REACH_OUT_SCRIPTS.map(function(rs) {
              var open = roOpen === rs.id;
              return h('div', { key: rs.id, style: {
                border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() { upd('roOpen', open ? null : rs.id); },
                  'aria-expanded': open ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: '#0f172a',
                    display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { flex: 1 } }, rs.title),
                  h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 18 } }, open ? '▾' : '▸')
                ),
                open && h('div', { style: { padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' } },
                  h('div', { style: { marginTop: 12, fontSize: 12, color: '#64748b', fontStyle: 'italic' } }, rs.scenario),
                  h('div', { style: { marginTop: 10, padding: 12, background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0e7490', fontWeight: 700, marginBottom: 6 } }, 'Try this'),
                    h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a', fontStyle: 'italic' } }, rs.script)
                  ),
                  h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', fontWeight: 700, marginBottom: 6 } }, 'Things to know'),
                    h('ul', { style: { margin: 0, paddingLeft: 20 } },
                      rs.tips.map(function(t, i) {
                        return h('li', { key: i, style: { fontSize: 13, lineHeight: 1.55, color: '#334155', marginBottom: 4 } }, t);
                      })
                    )
                  )
                )
              );
            })
          ),

          h('h3', { style: { margin: '0 0 8px', color: '#0f172a' } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '👥'),
            'Map your own circle of trusted adults'),
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 10 } },
            'In a moment of crisis, you do not want to be deciding for the first time who to call. List 3+ adults now — each from a different part of your life if possible (home, school, community, online).'),

          trustedAdults.length > 0 && h('div', { style: { marginBottom: 12, display: 'grid', gap: 6 } },
            trustedAdults.map(function(a, idx) {
              return h('div', { key: idx, style: {
                padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8
              } },
                h('div', null,
                  h('span', { style: { fontWeight: 700, color: '#166534' } }, a.name),
                  h('span', { style: { color: '#475569', fontSize: 13 } }, ' · ' + a.role)),
                h('button', {
                  'aria-label': 'Remove ' + a.name,
                  onClick: function() {
                    var na = trustedAdults.slice(0); na.splice(idx, 1);
                    upd('trustedAdults', na);
                  },
                  style: { background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, fontWeight: 700 }
                }, '×')
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' } },
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#475569', flex: '1 1 140px' } },
              'Name',
              h('input', {
                value: newAdultName,
                onChange: function(e) { upd('newAdultName', e.target.value); },
                placeholder: 'Ms. Rodriguez',
                style: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, marginTop: 2 }
              })
            ),
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#475569', flex: '1 1 140px' } },
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
              style: { padding: '8px 14px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 14 }
            }, 'Add to circle')
          ),

          !crisisAcknowledged && h('div', { style: { marginTop: 24, padding: 12, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8 } },
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#475569' } },
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
                  background: active ? '#7c3aed' : '#fff',
                  color: active ? '#fff' : '#0f172a',
                  border: '1px solid ' + (active ? '#7c3aed' : '#cbd5e1'),
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
            h('h3', { style: { margin: '0 0 8px', color: '#6b21a8', fontSize: 17 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤖'),
              'Talking to AI chatbots — when it helps, when it harms'),
            h('p', { style: { margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              'AI chatbots — Character.AI, Replika, ChatGPT, Snapchat\'s My AI, Discord\'s Clyde, and many more — can be useful tools. They can also become something else: a friend you cannot really have, a therapist who is not one, a romantic partner who does not exist.'),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              h('strong', null, 'This section is not anti-AI. '),
              'It is about helping you use these tools without being used by them. Below: a check-in for your own habits, an honest look at what these bots actually are, and the patterns that have already hurt teenagers.')
          ),
          h('div', { style: { padding: 14, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 6px', color: '#92400e', fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⚠️'),
              'The honest version'),
            h('p', { style: { margin: '0 0 6px', fontSize: 13, lineHeight: 1.6, color: '#0f172a' } },
              'The American Psychological Association issued a 2025 health advisory on AI chatbots and youth mental health. A 14-year-old in Florida died by suicide in early 2024 after months of intense relationship with a Character.AI bot. There are active lawsuits and ongoing investigations. This is not hypothetical.'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#0f172a' } },
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
              h('div', { 'aria-hidden': 'true', style: { position: 'relative', width: 100, height: 100, flexShrink: 0 } },
                h('svg', { width: 100, height: 100, viewBox: '0 0 100 100', style: { transform: 'rotate(-90deg)' } },
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: '#e2e8f0', strokeWidth: 8 }),
                  h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: result.color, strokeWidth: 8,
                    strokeDasharray: aicRingCirc, strokeDashoffset: aicRingCirc * (1 - aicPct),
                    strokeLinecap: 'round', style: { transition: 'stroke-dashoffset 0.6s ease' } })
                ),
                h('div', { style: {
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', lineHeight: 1
                } },
                  h('div', { style: { fontSize: 26, fontWeight: 800, color: result.color } }, aicPctText + '%'),
                  h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 } }, 'reliance')
                )
              ),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 } }, 'Your chatbot check-in result'),
                h('div', { style: { fontSize: 24, fontWeight: 800, color: result.color, marginBottom: 8, lineHeight: 1.2 } }, result.label),
                h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#1e293b' } }, result.summary)
              )
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() { upd('aicSection', 'what'); },
                style: { padding: '10px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
              }, 'Continue: what the bot actually is →'),
              h('button', {
                onClick: function() { upd({ aicAnswers: {}, aicQIdx: 0, aicShowResults: false }); },
                style: { padding: '10px 16px', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }
              }, 'Retake')
            )
          );
        }
        var q = AI_CHECKIN_QUESTIONS[aicQIdx];
        var hasAnswer = aicAnswers[q.id] != null;
        var totalAnswered = Object.keys(aicAnswers).length;
        var likertLabels = ['Never', 'Sometimes', 'Often', 'Almost always'];

        return h('div', null,
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 8 } },
            'Question ' + (aicQIdx + 1) + ' of ' + AI_CHECKIN_QUESTIONS.length + ' · ' + totalAnswered + ' answered'),
          h('div', { style: { background: '#e2e8f0', height: 8, borderRadius: 4, marginBottom: 16, overflow: 'hidden' } },
            h('div', { style: { background: 'linear-gradient(90deg, #6d28d9 0%, #a855f7 100%)', height: '100%', width: ((aicQIdx + 1) / AI_CHECKIN_QUESTIONS.length * 100) + '%', transition: 'width 0.3s ease' } })),
          h('div', { style: { padding: 18, border: '1px solid #d8b4fe', borderRadius: 12, background: '#faf5ff', marginBottom: 14 } },
            h('div', { 'aria-live': 'polite', style: { fontSize: 16, fontWeight: 600, color: '#0f172a', lineHeight: 1.5, marginBottom: 14 } }, q.text),
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
                    background: selected ? '#ede9fe' : '#fff',
                    border: '2px solid ' + (selected ? '#7c3aed' : '#cbd5e1'),
                    borderRadius: 10, fontSize: 15, fontWeight: selected ? 700 : 500, color: '#0f172a', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: {
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: '2px solid ' + (selected ? '#7c3aed' : '#cbd5e1'),
                    background: selected ? '#7c3aed' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1,
                    transition: 'all 0.18s ease'
                  } }, selected ? '✓' : ''),
                  h('span', null, lbl)
                );
              })
            ),
            hasAnswer && h('div', { style: {
              marginTop: 14, padding: 12, background: '#fff', border: '1px dashed #d8b4fe', borderRadius: 8,
              fontSize: 13, color: '#334155', lineHeight: 1.55
            } },
              h('strong', { style: { color: '#7c3aed', display: 'block', marginBottom: 4 } }, 'Why this question:'),
              q.research)
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (aicQIdx > 0) upd('aicQIdx', aicQIdx - 1); },
              disabled: aicQIdx === 0,
              style: { padding: '10px 14px', background: '#fff', color: aicQIdx === 0 ? '#94a3b8' : '#0f172a',
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
                    background: totalAnswered < AI_CHECKIN_QUESTIONS.length ? '#94a3b8' : '#10b981',
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
          h('div', { style: { padding: 14, background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              h('strong', { style: { color: '#6b21a8' } }, 'Six things people commonly believe about chatbots — and what is actually true. '),
              'Read one, click for the next.')
          ),
          h('div', { style: { padding: 18, border: '2px solid #d8b4fe', borderRadius: 12, background: '#fff', marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } },
              'Myth ' + (aicMythIdx + 1) + ' of ' + AI_MYTHS.length),
            h('p', { style: { margin: '0 0 14px', fontSize: 15, lineHeight: 1.55, color: '#0f172a', fontStyle: 'italic' } }, m.myth),
            h('div', { style: { padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Reality'),
              h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, m.reality))
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (aicMythIdx > 0) upd('aicMythIdx', aicMythIdx - 1); },
              disabled: aicMythIdx === 0,
              style: { padding: '8px 14px', background: '#fff', color: aicMythIdx === 0 ? '#94a3b8' : '#0f172a',
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
          h('div', { style: { padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', color: '#991b1b', fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🪞'),
              'The Sycophancy Problem'),
            h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              'AI chatbots are trained to be ', h('strong', null, 'agreeable'),
              '. Disagreement causes users to leave. So the bot is engineered to validate, affirm, and reflect you back to yourself — even when what you are saying is wrong, dangerous, or distorted.'),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              h('strong', null, 'This is the part that can really hurt. '),
              'A bot that always agrees with you is not a friend — it is a feedback loop. Here is what that actually sounds like.')
          ),
          h('div', { style: { padding: 16, border: '2px solid #fca5a5', borderRadius: 14, background: '#f8fafc', marginBottom: 12 } },
            h('div', { style: { fontSize: 12, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 } },
              'Example ' + (aicSycIdx + 1) + ' of ' + AI_SYCOPHANCY_EXAMPLES.length),
            // Chat thread
            h('div', { 'aria-label': 'Chat message thread example', style: {
              background: '#fff', borderRadius: 12, padding: 14,
              boxShadow: 'inset 0 0 0 1px #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: 10
            } },
              // YOU bubble (right-aligned, blue iMessage-style)
              h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                h('div', { style: { maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 } },
                  h('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, paddingRight: 4 } }, 'YOU'),
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
                    padding: '10px 14px', background: '#f3e8ff', color: '#0f172a',
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
                  h('div', { style: { fontSize: 10, color: '#166534', fontWeight: 700, paddingLeft: 4 } }, 'A REAL FRIEND'),
                  h('div', { style: {
                    padding: '10px 14px', background: '#dcfce7', color: '#0f172a',
                    fontSize: 14, lineHeight: 1.45,
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(22, 101, 52, 0.10)'
                  } }, ex.friend)
                )
              )
            ),
            aicSycRevealed && h('div', { style: { marginTop: 12, padding: 12, background: '#fffbeb', border: '1px dashed #fcd34d', borderRadius: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 4 } }, '💡'),
                'What changed'),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } }, ex.explain)
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { if (aicSycIdx > 0) upd({ aicSycIdx: aicSycIdx - 1, aicSycRevealed: false }); },
              disabled: aicSycIdx === 0,
              style: { padding: '8px 14px', background: '#fff', color: aicSycIdx === 0 ? '#94a3b8' : '#0f172a',
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
          h('p', { style: { fontSize: 14, lineHeight: 1.6, color: '#0f172a', marginBottom: 14 } },
            h('strong', { style: { color: '#6b21a8' } }, 'The hardest thing to see about AI relationships is what is missing from them. '),
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
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 } }, row.col1)
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } }, row.r1)
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
                      h('div', { style: { fontSize: 11, fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: 0.5 } }, row.col2)
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } }, row.r2)
                  )
                )
              );
            })
          ),
          h('div', { style: { padding: 14, background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 10 } },
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              h('strong', null, 'The takeaway: '),
              'Real relationships have higher costs and higher payoffs. AI relationships have lower costs and lower payoffs — they cannot scale up to the real thing no matter how many hours you spend in them. They are a different category of thing, the way a photograph of a meal is a different category from the meal.'))
        );
      }

      function renderAIUses() {
        return h('div', null,
          // Lead reframe
          h('div', { style: { padding: 14, background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 10, marginBottom: 16 } },
            h('p', { style: { margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: '#0f172a' } },
              h('strong', { style: { color: '#6b21a8' } }, 'It usually depends on HOW you use it, not WHAT you use it for. '),
              'Most chatbot uses are not inherently healthy or unhealthy. A handful are clearly fine, a handful are clearly off-limits, and most live in the middle — where the same use case can be a tutoring win or an academic-integrity disaster depending on the choices YOU make.'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#334155' } },
              'Three tiers below: ',
              h('span', { style: { color: '#166534', fontWeight: 700 } }, 'green'), ' (clear-win), ',
              h('span', { style: { color: '#a16207', fontWeight: 700 } }, 'yellow'), ' (depends on how), ',
              h('span', { style: { color: '#991b1b', fontWeight: 700 } }, 'red'), ' (do not).')
          ),

          // ── GREEN tier ──
          h('h3', { style: { margin: '8px 0 8px', color: '#166534', fontSize: 15 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '✅'),
            'Green — clear-win uses'),
          h('p', { style: { fontSize: 12, color: '#475569', marginBottom: 8 } },
            'Use freely, as long as you stay engaged with what you are doing.'),
          h('div', { style: { display: 'grid', gap: 6, marginBottom: 18 } },
            AI_USE_TIERS.green.map(function(u, idx) {
              return h('div', { key: idx, style: { padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 } },
                h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 } }, u.label),
                h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: '#334155' } }, u.note)
              );
            })
          ),

          // ── YELLOW tier ──
          h('h3', { style: { margin: '8px 0 8px', color: '#a16207', fontSize: 15 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⚖️'),
            'Yellow — depends on how you use it'),
          h('p', { style: { fontSize: 12, color: '#475569', marginBottom: 8 } },
            'Same use case, very different outcomes. The point is to notice which version you are doing.'),
          h('div', { style: { display: 'grid', gap: 12, marginBottom: 18 } },
            AI_USE_TIERS.yellow.map(function(u) {
              return h('div', { key: u.id, style: {
                padding: 12, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10
              } },
                h('div', { style: { fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 10 } }, u.label),
                h('div', { style: {
                  display: 'grid', gap: 10,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
                } },
                  h('div', { style: { padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, color: '#166534', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
                      '✓ Healthy version'),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: '#0f172a' } }, u.healthy)
                  ),
                  h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 } },
                    h('div', { style: { fontSize: 11, color: '#991b1b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 } },
                      '✕ Risky version'),
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: '#0f172a' } }, u.risky)
                  )
                )
              );
            })
          ),

          // ── RED tier ──
          h('h3', { style: { margin: '8px 0 8px', color: '#991b1b', fontSize: 15 } },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '⛔'),
            'Red — do not use AI this way'),
          h('p', { style: { fontSize: 12, color: '#475569', marginBottom: 8 } },
            'Hard limits. These are the cases where there is no healthy version, and the documented harms are real.'),
          h('div', { style: { display: 'grid', gap: 6, marginBottom: 18 } },
            AI_USE_TIERS.red.map(function(u, idx) {
              return h('div', { key: idx, style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 } },
                h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 } }, u.label),
                h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.5, color: '#334155' } }, u.note)
              );
            })
          ),

          // ── Ask Yourself rubric ──
          h('div', { style: {
            padding: 14, background: 'linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%)',
            border: '1px solid #93c5fd', borderRadius: 12
          } },
            h('h3', { style: { margin: '0 0 6px', color: '#1e40af', fontSize: 15 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤔'),
              'Ask yourself — works for ANY chatbot use, even ones not listed above'),
            h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#334155', lineHeight: 1.55 } },
              'A quick self-check you can apply to whatever you are about to ask the bot. No score, no submission — just five honest questions.'),
            h('ol', { style: { margin: 0, paddingLeft: 20, display: 'grid', gap: 8 } },
              AI_USE_RUBRIC.map(function(item, idx) {
                return h('li', { key: idx, style: { fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
                  h('div', { style: { marginBottom: 2 } }, item.q),
                  h('div', { style: { fontSize: 12, color: '#475569', fontStyle: 'italic' } }, '↳ ' + item.hint)
                );
              })
            ),
            h('div', { style: { marginTop: 12, padding: 10, background: '#fff', border: '1px dashed #93c5fd', borderRadius: 8 } },
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
                h('strong', { style: { color: '#1e40af' } }, 'Bottom line: '),
                'If you said "yes" to any of #1, #2, #4, or #5 — or "no" to #3 — that is the signal to involve a real person, not to ask the bot harder.'))
          )
        );
      }

      function renderAIFriendSigns() {
        return h('div', null,
          h('div', { style: { padding: 14, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', color: '#92400e', fontSize: 16 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '👀'),
              'Signs a friend might be in too deep with an AI'),
            h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a' } },
              'You do not have to be a counselor. If several of these show up at once — especially the last few — that is worth saying something about, gently.')
          ),
          h('ul', { style: { margin: '0 0 16px 20px', padding: 0, display: 'grid', gap: 8 } },
            AI_FRIEND_SIGNS.map(function(s, idx) {
              return h('li', { key: idx, style: { fontSize: 14, lineHeight: 1.55, color: '#0f172a' } }, s);
            })
          ),
          h('div', { style: { padding: 14, background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 10, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 6px', color: '#0e7490', fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '💬'),
              'A way to bring it up'),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6, color: '#0f172a', fontStyle: 'italic' } },
              '"Hey — I noticed you have been talking about [bot name] like they are a real person. I do not want to be weird about it, but I miss you. Want to do something this week, just us?"'),
            h('p', { style: { margin: 0, fontSize: 12, color: '#475569' } },
              'Soft, specific, no shame. Reaches toward them without attacking the bot.')
          ),
          h('div', { style: { padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 } },
            h('h4', { style: { margin: '0 0 6px', color: '#991b1b', fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🚨'),
              'When to get an adult involved'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#0f172a' } },
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
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.55 } },
            'A reference layer for the rest of the tool — quick definitions, where the research came from, and a separate page for parents, teachers, and counselors who want to use what is here.'),
          h('div', { role: 'tablist', 'aria-label': 'Reference sections', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
            sections.map(function(s) {
              var active = refSection === s.id;
              return h('button', {
                key: s.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd({ refSection: s.id, refExpanded: null }); if (announceToSR) announceToSR(s.label + ' opened'); },
                style: {
                  padding: '6px 12px',
                  background: active ? ACCENT : '#fff',
                  color: active ? '#fff' : '#0f172a',
                  border: '1px solid ' + (active ? ACCENT : '#cbd5e1'),
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
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 10 } },
            'Tap any term to expand. Useful for parent conversations, IEP meetings, or when something in this tool used a word you wanted to nail down.'),
          h('div', { style: { display: 'grid', gap: 6 } },
            GLOSSARY.map(function(g) {
              var open = refExpanded === g.term;
              return h('div', { key: g.term, style: {
                border: '1px solid ' + (open ? ACCENT_MED : '#e2e8f0'),
                borderRadius: 8, background: open ? ACCENT_DIM : '#fff', overflow: 'hidden'
              } },
                h('button', {
                  onClick: function() { upd('refExpanded', open ? null : g.term); },
                  'aria-expanded': open ? 'true' : 'false',
                  style: {
                    width: '100%', padding: '10px 12px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, color: '#0f172a',
                    display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { flex: 1 } }, g.term),
                  h('span', { 'aria-hidden': 'true', style: { color: '#64748b', fontSize: 16 } }, open ? '▾' : '▸')
                ),
                open && h('p', { style: { margin: 0, padding: '0 12px 12px', fontSize: 13, lineHeight: 1.55, color: '#334155' } }, g.def)
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
          h('p', { style: { fontSize: 13, color: '#475569', marginBottom: 12 } },
            'Where the claims in this tool come from. Use these to verify, deepen, or share with parents and educators who want documentation.'),
          groups.map(function(g) {
            var items = byCat[g.id] || [];
            if (items.length === 0) return null;
            return h('div', { key: g.id, style: { marginBottom: 18 } },
              h('h4', { style: { margin: '0 0 8px', color: '#0f172a', fontSize: 14, fontWeight: 700 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, g.icon), g.label),
              h('div', { style: { display: 'grid', gap: 8 } },
                items.map(function(s, idx) {
                  return h('div', { key: idx, style: {
                    padding: 12, border: '1px solid ' + ACCENT_MED, borderRadius: 8, background: '#f8fafc'
                  } },
                    h('div', { style: { fontWeight: 700, fontSize: 14, color: '#0f172a' } }, s.name),
                    h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 4 } }, s.who),
                    h('div', { style: { fontSize: 13, color: '#334155', lineHeight: 1.5 } }, s.what)
                  );
                })
              )
            );
          })
        );
      }

      function renderRefGrownups() {
        return h('div', null,
          h('div', { style: { padding: 14, background: '#f0fdfa', border: '1px solid ' + ACCENT_MED, borderRadius: 10, marginBottom: 14 } },
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
              h('strong', { style: { color: ACCENT } }, 'For parents, teachers, school counselors, and youth-serving adults. '),
              'This page is here on purpose: students may show it to a grown-up, and grown-ups deserve a starting place that respects their time. Below: seven of the most-asked things, with the best current research distilled.')
          ),
          h('div', { style: { display: 'grid', gap: 10 } },
            (function() {
              // Color palette cycled across the 7 cards
              var palettes = [
                { from: '#22d3ee', to: '#0891b2', accent: '#0e7490' }, // cyan
                { from: '#a78bfa', to: '#7c3aed', accent: '#6b21a8' }, // violet
                { from: '#60a5fa', to: '#2563eb', accent: '#1e40af' }, // blue
                { from: '#fb923c', to: '#ea580c', accent: '#9a3412' }, // orange
                { from: '#f87171', to: '#dc2626', accent: '#991b1b' }, // red
                { from: '#34d399', to: '#059669', accent: '#166534' }, // emerald
                { from: '#f472b6', to: '#db2777', accent: '#9d174d' }  // pink
              ];
              return GROWNUPS_TIPS.map(function(tip, idx) {
                var p = palettes[idx % palettes.length];
                return h('div', { key: idx, className: 'dw-card', style: {
                  display: 'flex', gap: 14,
                  padding: 14, border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff'
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
                    h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#334155' } }, tip.body)
                  )
                );
              });
            })()
          ),
          h('div', { style: { marginTop: 20, padding: 14, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10 } },
            h('div', { style: { fontWeight: 700, color: '#854d0e', marginBottom: 6, fontSize: 14 } },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🤝'),
              'Working with a school counselor or psychologist'),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
              'This tool produces a printable check-in packet that students can choose to share. Counselors find it useful as a conversation starter — it surfaces the patterns the student is willing to name, without putting them on the spot.'),
            h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#0f172a' } },
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
            style: { background: '#fff', padding: 28, borderRadius: 16, maxWidth: 340, textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.30)' }
          },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 64, marginBottom: 4, lineHeight: 1 } }, '🏅'),
            h('div', { style: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 } }, 'Badge earned'),
            h('div', { style: { fontSize: 22, fontWeight: 800, color: ACCENT, marginBottom: 16, lineHeight: 1.2 } }, showBadgePopup.label),
            h('button', {
              onClick: function() { upd('showBadgePopup', null); },
              autoFocus: true,
              style: { padding: '10px 22px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }
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

      return h('div', { className: 'dw-root', style: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' } },
        renderHeader(),
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('digitalWellbeing', h, ctx) : null),
        content,
        renderBadgePopup()
      );
    }
  });
})();
