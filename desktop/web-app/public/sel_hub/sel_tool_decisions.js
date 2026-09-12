// ═══════════════════════════════════════════════════════════════
// sel_tool_decisions.js — Decision Workshop Plugin (v1.0)
// Structured decision-making, ethical dilemmas, consequence
// mapping, cognitive bias awareness, and AI decision advisor.
// Registered tool ID: "decisions"
// Category: responsible-decision-making
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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-decisions')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-decisions';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ── WCAG 2.3.3: Reduced-motion guard ──
  (function() {
    if (document.getElementById('allo-decisions-rm-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-decisions-rm-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
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
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxReveal() { playTone(392, 0.1, 'sine', 0.06); setTimeout(function() { playTone(494, 0.1, 'sine', 0.06); }, 80); setTimeout(function() { playTone(588, 0.15, 'sine', 0.08); }, 160); }
  function sfxThink() { playTone(330, 0.12, 'sine', 0.05); setTimeout(function() { playTone(440, 0.12, 'sine', 0.05); }, 100); setTimeout(function() { playTone(330, 0.15, 'sine', 0.06); }, 220); }

  // ══════════════════════════════════════════════════════════════
  // ── Decision Tree Scenarios ──
  // Guided step-by-step decision-making process
  // ══════════════════════════════════════════════════════════════
  var DECISION_SCENARIOS = {
    elementary: [
      { id: 'dt1', title: 'The Found Money', situation: 'You find a $5 bill on the classroom floor. Nobody saw you pick it up.', values: ['honesty', 'fairness'], options: ['Keep it', 'Turn it in to the teacher', 'Ask if anyone lost money'] },
      { id: 'dt2', title: 'The Playground Choice', situation: 'Two friends both want you to play with them at recess, but they don\'t want to play together.', values: ['loyalty', 'inclusion'], options: ['Play with Friend A', 'Play with Friend B', 'Try to get them to play together', 'Alternate days'] },
      { id: 'dt3', title: 'The Test Peek', situation: 'During a test, you accidentally see the smart kid\'s answer. Your answer is different.', values: ['honesty', 'self-reliance'], options: ['Change your answer', 'Keep your original answer', 'Cover your eyes and focus on your own work'] },
      { id: 'dt4', title: 'The Broken Vase', situation: 'You accidentally break your mom\'s favorite vase while playing ball inside. She hasn\'t noticed yet.', values: ['honesty', 'courage', 'responsibility'], options: ['Tell her right away', 'Try to fix it secretly', 'Hide the pieces', 'Blame the pet'] },
      { id: 'dt5', title: 'The Candy Split', situation: 'You get a bag of 10 pieces of candy. Your friend helped you win the game that earned it. They expect you to share.', values: ['fairness', 'generosity', 'gratitude'], options: ['Keep it all', 'Split 50/50', 'Give them a few pieces', 'Let them choose first'] },
      { id: 'dt6', title: 'The Sick Day Lie', situation: 'You don\'t feel like going to school. You\'re not sick, but you could pretend to be. There\'s a math test today.', values: ['honesty', 'responsibility', 'courage'], options: ['Pretend to be sick', 'Go to school and take the test', 'Tell your parent you\'re scared about the test', 'Ask to study more tonight and take it tomorrow'] },
      { id: 'dt6b', title: 'The Library Book', situation: 'You accidentally spilled juice on a library book. The stain is noticeable. You could return it and pretend nothing happened, or tell the librarian.', values: ['honesty', 'responsibility', 'courage'], options: ['Return it and say nothing', 'Tell the librarian what happened', 'Try to clean the stain first, then tell if it doesn\'t work', 'Hide it in your room and say you lost it'] },
      { id: 'dt6c', title: 'The Neighbor\'s Garden', situation: 'While playing catch, your ball lands in the neighbor\'s garden and breaks a flower. Nobody saw it happen. The neighbor is very proud of their flowers.', values: ['honesty', 'respect', 'courage'], options: ['Grab the ball and pretend nothing happened', 'Ring the doorbell and tell them', 'Leave a sorry note', 'Try to fix the flower and hope they don\'t notice'] },
      { id: 'dt6d', title: 'The Class Pet', situation: 'It\'s your turn to feed the class hamster over the weekend. Your family wants to go on a fun trip. Nobody else can do it.', values: ['responsibility', 'commitment', 'care'], options: ['Go on the trip and hope the hamster is fine', 'Stay home and feed the hamster', 'Ask a neighbor to check on it', 'Bring the hamster home for the weekend'] },
      { id: 'dt6e', title: 'The Mean Game', situation: 'Your friends invented a game where they rate other kids\' outfits. Everyone is laughing and having fun, but some kids look hurt when they hear their "score."', values: ['kindness', 'courage', 'belonging'], options: ['Join in to fit in', 'Refuse to play but don\'t say anything', 'Tell them the game is mean and suggest something else', 'Walk away and play with someone else'] }
    ],
    middle: [
      { id: 'dt7', title: 'The Social Media Post', situation: 'You took a funny photo of your friend doing something embarrassing. They don\'t know you took it. It would get tons of likes.', values: ['respect', 'consent', 'friendship'], options: ['Post it without asking', 'Ask permission first', 'Show them privately and decide together', 'Delete it'] },
      { id: 'dt8', title: 'The Cheating Ring', situation: 'Several popular kids have a system for sharing test answers. They invite you to join. If you don\'t, they might exclude you socially.', values: ['integrity', 'belonging', 'fairness'], options: ['Join the group', 'Politely decline', 'Report it to the teacher', 'Decline and tell no one'] },
      { id: 'dt9', title: 'The Environmental Choice', situation: 'Your school is selling cheap plastic water bottles as a fundraiser. You know single-use plastics harm the environment, but the money goes to a good cause.', values: ['environmental responsibility', 'community', 'practicality'], options: ['Buy and sell the bottles', 'Refuse and suggest alternatives', 'Buy but bring your own reusable bottle', 'Start a competing eco-friendly fundraiser'] },
      { id: 'dt10', title: 'The Gossip Circle', situation: 'Your friends are spreading a rumor about a classmate. The rumor might actually be true. They want you to confirm it because you know the person.', values: ['loyalty', 'privacy', 'kindness'], options: ['Confirm the rumor', 'Deny it even if true', 'Say "It\'s not my story to tell"', 'Change the subject'] },
      { id: 'dt11', title: 'The Lab Partner', situation: 'You\'re assigned a lab partner who has a learning disability. Your friends joke that you\'ll have to "do all the work." The partner seems nervous.', values: ['respect', 'patience', 'equity'], options: ['Ask the teacher for a different partner', 'Work together and divide tasks by strengths', 'Do the work yourself to get a good grade', 'Make an effort to include them meaningfully'] },
      { id: 'dt12', title: 'The Sleepover Dare', situation: 'At a sleepover, someone dares you to prank-call a classmate everyone thinks is annoying. Everyone is watching you.', values: ['kindness', 'courage', 'peer resistance'], options: ['Do the dare', 'Refuse and suggest something else', 'Laugh it off and change the subject', 'Say "That\'s not cool" directly'] },
      { id: 'dt12b', title: 'The Anonymous Account', situation: 'Your friends created an anonymous social media account to post "honest opinions" about teachers and students. They want you to contribute. Some posts are funny, some are cruel.', values: ['accountability', 'kindness', 'courage'], options: ['Contribute to keep your friends happy', 'Decline but don\'t report it', 'Tell them it could really hurt people', 'Report the account to the school'] },
      { id: 'dt12c', title: 'The Inclusion Dilemma', situation: 'Your friend group is planning a weekend hangout. Someone suggests not inviting a classmate who is "kind of weird" but has been trying to hang out with your group.', values: ['inclusion', 'kindness', 'social comfort'], options: ['Go along with excluding them', 'Suggest inviting them anyway', 'Invite them separately on your own', 'Talk to the group about how exclusion feels'] },
      { id: 'dt12d', title: 'The Favor Chain', situation: 'An older student asks you to hold their vape pen during a locker check. They say they\'ll "owe you one" and that nothing will happen because it\'s just for a few minutes.', values: ['safety', 'self-respect', 'peer pressure'], options: ['Hold it as a favor', 'Refuse and walk away', 'Refuse and explain why', 'Tell a teacher what they asked'] },
      { id: 'dt12e', title: 'The Credit Question', situation: 'You and a partner did a project together. You did most of the work, but your partner is telling everyone it was a team effort. The teacher assumes you contributed equally.', values: ['fairness', 'honesty', 'conflict avoidance'], options: ['Stay quiet to keep the peace', 'Talk to your partner privately', 'Tell the teacher what really happened', 'Agree publicly but resolve to set boundaries next time'] }
    ],
    high: [
      { id: 'dt13', title: 'The Plagiarism Pressure', situation: 'You have three AP exams, a part-time job, and a 10-page paper due tomorrow. You find a perfect essay online. Nobody would know.', values: ['integrity', 'self-care', 'academic honesty'], options: ['Submit the online essay', 'Turn in what you can write tonight', 'Ask the teacher for an extension', 'Pull an all-nighter for a mediocre but honest paper'] },
      { id: 'dt14', title: 'The Scholarship Dilemma', situation: 'You discover your scholarship application essay was stronger because you slightly exaggerated a hardship. You got the scholarship. Another student who didn\'t get it actually had the hardship you described.', values: ['honesty', 'fairness', 'self-interest'], options: ['Keep the scholarship quietly', 'Come clean to the committee', 'Find a way to help the other student', 'Donate part of the money'] },
      { id: 'dt15', title: 'The Witness', situation: 'You see a teammate shoplifting at a store. They notice you saw. Later they say, "We\'re teammates. You wouldn\'t snitch."', values: ['loyalty', 'integrity', 'accountability'], options: ['Stay silent out of loyalty', 'Talk to them privately', 'Tell the coach', 'Tell them they need to return it or you\'ll have to speak up'] },
      { id: 'dt16', title: 'The Vote', situation: 'Student council is voting on prom venue. The accessible venue costs more and is less "cool." A student in a wheelchair is on the council. Most students prefer the cheaper, inaccessible option.', values: ['inclusion', 'equity', 'democracy'], options: ['Vote for the popular option', 'Vote for the accessible option', 'Propose a fundraiser to cover the cost difference', 'Argue publicly for accessibility'] },
      { id: 'dt17', title: 'The Family Business', situation: 'Your parent wants you to take over the family business after high school. You\'ve been accepted to college for something completely different. They say the business won\'t survive without you.', values: ['family obligation', 'personal growth', 'independence', 'gratitude'], options: ['Skip college for the family', 'Go to college as planned', 'Propose a compromise (gap year, part-time)', 'Have an honest conversation about a transition plan'] },
      { id: 'dt18', title: 'The Anonymous Tip', situation: 'You learn through social media that a student at your school is planning to bring a weapon. You\'re not 100% sure if it\'s a joke or real. Reporting it could ruin someone\'s life if it\'s fake.', values: ['safety', 'caution', 'responsibility'], options: ['Report it immediately', 'Try to verify first', 'DM the person to check', 'Tell a trusted adult and let them decide'] },
      { id: 'dt18b', title: 'The Recommendation Letter', situation: 'A teacher asks if you can write a peer recommendation for a classmate\'s college app. You know this person cheated on multiple assignments. The teacher thinks highly of them.', values: ['honesty', 'loyalty', 'consequences'], options: ['Write a glowing recommendation', 'Politely decline without explanation', 'Write an honest one that omits the cheating', 'Tell the teacher what you know and let them decide'] },
      { id: 'dt18c', title: 'The Side Hustle', situation: 'You\'re selling test prep notes to other students. It\'s technically allowed but some students who can\'t afford them are at a disadvantage. A teacher notices the income gap in test scores.', values: ['entrepreneurship', 'equity', 'fairness'], options: ['Keep selling — it\'s legal', 'Offer a sliding scale or free copies', 'Stop selling and share freely', 'Create a study group instead that\'s open to everyone'] },
      { id: 'dt18d', title: 'The Political Post', situation: 'You strongly support a political cause and want to post about it. Your post would include calling out classmates who disagree. Some of them are close friends.', values: ['advocacy', 'respect', 'relationships'], options: ['Post it as planned', 'Post about the cause without calling out individuals', 'Have private conversations instead', 'Share educational resources without personal attacks'] },
      { id: 'dt18e', title: 'The Inheritance', situation: 'Your grandparent left you money for college. Your sibling, who also needs college money, got nothing due to a family feud they weren\'t part of. Your parents say "it\'s yours, keep it."', values: ['fairness', 'family', 'generosity', 'self-interest'], options: ['Keep all of it — it was given to you', 'Split it with your sibling', 'Offer to help your sibling with some of it', 'Talk to your parents about the unfairness'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Ethical Dilemmas ──
  // No clear right answer — students weigh competing values
  // ══════════════════════════════════════════════════════════════
  var ETHICAL_DILEMMAS = {
    elementary: [
      { id: 'ed1', title: 'The Promise', dilemma: 'You promised your friend you\'d go to their birthday party. Then your grandma, who you rarely see, surprises you with a visit on the same day. You can\'t do both.', valueA: 'Keeping your promise', valueB: 'Family time', thinkAbout: 'Are some promises more flexible than others? How would each person feel if you chose the other?' },
      { id: 'ed2', title: 'The Pet Rescue', dilemma: 'You find a stray kitten that looks hungry and cold. Your family already has a dog and your parents said "no more pets." If you don\'t take it home, it might not survive the night.', valueA: 'Compassion for the kitten', valueB: 'Respecting your parents\' rules', thinkAbout: 'Is there a way to honor both values? What does "responsible" look like here?' },
      { id: 'ed3', title: 'The Tattle', dilemma: 'Your friend takes an extra cookie from the jar when your mom said one each. Your friend asks you not to tell. Your mom asks if everyone followed the rule.', valueA: 'Honesty with your mom', valueB: 'Loyalty to your friend', thinkAbout: 'Is there a difference between "tattling" and "being honest"? Does the size of the rule matter?' },
      { id: 'ed4', title: 'The Winning Goal', dilemma: 'In the final game, you score the winning goal — but you know the ball touched your hand, which is against the rules. The referee didn\'t see it. Your team is celebrating.', valueA: 'Honest sportsmanship', valueB: 'Team happiness and victory', thinkAbout: 'Would the win feel the same if you stayed quiet? What would you want the other team to do?' },
      { id: 'ed5', title: 'The Leftover Lunch', dilemma: 'At lunch, you have extra food and a kid who sometimes doesn\'t have enough is nearby. But last time you offered, they seemed embarrassed and said "I\'m fine."', valueA: 'Helping someone in need', valueB: 'Respecting their dignity', thinkAbout: 'How can you help without making someone feel small? Is there a way to share that preserves pride?' },
      { id: 'ed6', title: 'The Art Contest', dilemma: 'You and your best friend both entered the art contest. You won, but you secretly think your friend\'s art was actually better. The judges chose yours. Your friend is sad.', valueA: 'Being proud of your win', valueB: 'Your friend\'s feelings and fairness', thinkAbout: 'Can you celebrate and still be empathetic? What would you want your friend to do if the roles were reversed?' },
      { id: 'ed6b', title: 'The Class Hamster', dilemma: 'The class hamster is old and sick. The vet says it can be treated, but it will cost a lot and the hamster might still not get better. Some kids want to try. Others say it\'s time to let it go peacefully.', valueA: 'Trying everything to save a life', valueB: 'Preventing unnecessary suffering', thinkAbout: 'Is it more loving to fight or to let go? Who gets to make that decision — and what makes their choice "right"?' },
      { id: 'ed6c', title: 'The Snow Day Secret', dilemma: 'School is closed for snow. You see your neighbor, an elderly person, struggling to shovel their driveway. But your friends just texted to meet at the sledding hill. If you help your neighbor, you\'ll miss the fun.', valueA: 'Helping someone in need', valueB: 'Enjoying your childhood', thinkAbout: 'Does seeing a need create an obligation? Is it okay to choose fun when someone else needs help?' },
      { id: 'ed6d', title: 'The Talent Show Choice', dilemma: 'Your friend is practicing a talent show act that you can tell won\'t go well. They\'re really excited and have been practicing for weeks. The show is tomorrow.', valueA: 'Protecting them from embarrassment', valueB: 'Respecting their excitement and autonomy', thinkAbout: 'Is it your job to protect someone from possible failure? What if they succeed and you talked them out of it?' },
      { id: 'ed6e', title: 'The Test Answers', dilemma: 'After a test, your friend tells you some of the answers. You have the same test next period. You didn\'t ask for the answers, but now you know them.', valueA: 'Using information you already have', valueB: 'Fairness to other students', thinkAbout: 'Does it matter that you didn\'t ASK for the answers? Is knowing something you shouldn\'t the same as cheating?' }
    ],
    middle: [
      { id: 'ed7', title: 'The Inherited Opinion', dilemma: 'Your parents openly dislike a particular religious group. You\'ve become friends with someone from that group and they\'re one of the kindest people you know. Your parents don\'t know about the friendship.', valueA: 'Family loyalty and values', valueB: 'Your own moral compass and friendship', thinkAbout: 'At what age do your values become your own? Can you love your parents and disagree with them?' },
      { id: 'ed8', title: 'The Grade or the Truth', dilemma: 'A teacher makes a factual error during a lecture. You know the correct information because you researched it. Correcting them might embarrass them in front of the class. Not correcting them means everyone learns wrong information.', valueA: 'Accuracy and truth', valueB: 'Respecting authority and avoiding embarrassment', thinkAbout: 'Does it matter HOW you correct someone? Is the method as important as the message?' },
      { id: 'ed9', title: 'The Cancel Question', dilemma: 'A YouTuber you enjoy watching made an offensive comment five years ago. They\'ve apologized and changed. Your friends want you to join a campaign to get them "canceled."', valueA: 'Accountability for harmful speech', valueB: 'Growth, forgiveness, and second chances', thinkAbout: 'How long should someone be held accountable for past mistakes? Does genuine change matter?' },
      { id: 'ed10', title: 'The Charity Dilemma', dilemma: 'Your school is raising money for a charity. You discover the charity has some questionable practices — high executive salaries, only 40% of donations reach the cause. The fundraiser is already in motion.', valueA: 'Supporting the cause despite flaws', valueB: 'Accountability and finding better alternatives', thinkAbout: 'Is imperfect help better than no help? What responsibility do we have to research before we donate?' },
      { id: 'ed11', title: 'The Privacy vs. Safety', dilemma: 'You read your younger sibling\'s diary and discover they\'re being bullied badly at school. They never told anyone. Reading the diary was a violation of privacy, but now you know something important.', valueA: 'Protecting your sibling from bullying', valueB: 'Respecting their privacy and trust', thinkAbout: 'Can you use information you shouldn\'t have for good? Does the end justify the means here?' },
      { id: 'ed12', title: 'The Honest Review', dilemma: 'Your friend started a small business selling handmade jewelry. They ask for your honest opinion. The quality isn\'t great and the prices are too high. They\'ve invested their savings.', valueA: 'Honest feedback that could help them improve', valueB: 'Protecting their feelings and confidence', thinkAbout: 'What does "being a good friend" actually require? Is comfortable dishonesty better than uncomfortable truth?' },
      { id: 'ed12b', title: 'The Sick Friend', dilemma: 'Your friend asks you to cover for them so they can skip class. You later find out they went to a mental health appointment they were embarrassed about. They lied to you about why.', valueA: 'Being upset about the lie', valueB: 'Understanding their need for privacy about mental health', thinkAbout: 'Does the reason behind a lie change how wrong it is? When does compassion outweigh your right to the truth?' },
      { id: 'ed12c', title: 'The Donation Dilemma', dilemma: 'A classmate\'s family lost their home in a fire. The school is collecting donations. You have money saved for a gaming console you\'ve wanted for a year. Your parents say it\'s your choice.', valueA: 'Generosity and community responsibility', valueB: 'Your right to your own savings and goals', thinkAbout: 'How much are we obligated to give? Is it selfish to keep what you earned for yourself when others have less?' },
      { id: 'ed12d', title: 'The AI Tutor', dilemma: 'You discover that a struggling student has been using AI to complete all their assignments. Their grades went from failing to A\'s. Their parents are thrilled. But the student still can\'t do the work independently.', valueA: 'Short-term grades and parental relief', valueB: 'Genuine learning and long-term competence', thinkAbout: 'Is getting good grades the same as learning? Whose responsibility is it to ensure real learning happens?' },
      { id: 'ed12e', title: 'The Cultural Clash', dilemma: 'Your family has a cultural tradition that involves an animal practice that many of your American friends consider cruel. You understand both perspectives. A friend directly asks, "How can your family do that?"', valueA: 'Cultural pride and family heritage', valueB: 'Evolving ethical standards and animal welfare', thinkAbout: 'Who gets to define what\'s ethical — your culture, your generation, or you as an individual? Can you honor your heritage and still question parts of it?' }
    ],
    high: [
      { id: 'ed13', title: 'The Trolley Problem (Real Version)', dilemma: 'You\'re on the hiring committee for a summer job program. You have 10 spots and 12 qualified applicants. Two of the applicants are from underrepresented groups with slightly lower scores. Choosing them means cutting two candidates with marginally better scores.', valueA: 'Merit-based selection (highest scores)', valueB: 'Equity and representation', thinkAbout: 'Is "merit" ever truly objective? What systemic factors might have affected the scores? What does "fair" really mean?' },
      { id: 'ed14', title: 'The Whistleblower\'s Cost', dilemma: 'You discover your employer (where you intern) is dumping waste illegally. Reporting it means the company — which employs half your town — might shut down. Your family works there too.', valueA: 'Environmental justice and law', valueB: 'Economic survival for your community', thinkAbout: 'When personal cost is high, does the moral obligation change? Who bears the consequences of doing the right thing?' },
      { id: 'ed15', title: 'The AI Ethics Question', dilemma: 'A company offers you a well-paying job building AI that will automate customer service jobs. The technology is impressive. It will also eliminate hundreds of positions held by working-class people.', valueA: 'Technological progress and personal opportunity', valueB: 'Workers\' livelihoods and economic disruption', thinkAbout: 'Does participating in progress make you responsible for its consequences? Can innovation be both exciting and harmful?' },
      { id: 'ed16', title: 'The Speech Boundary', dilemma: 'A student group invites a controversial speaker to campus. Their views are offensive to many students, but they\'re not calling for violence. Some students want the event canceled; others defend free speech.', valueA: 'Free expression and open debate', valueB: 'Community safety and emotional well-being', thinkAbout: 'Where is the line between ideas that should be debated and ideas that cause harm by being platformed? Who decides?' },
      { id: 'ed17', title: 'The Genetic Information', dilemma: 'A genetic test reveals you carry a gene for a serious hereditary condition. You\'re not sick, but future children could be. Your partner wants kids and doesn\'t know. Telling them could end the relationship.', valueA: 'Honesty and informed consent', valueB: 'Privacy and the right to your own medical information', thinkAbout: 'At what point does personal information become someone else\'s right to know? Does the severity of the consequence change the ethics?' },
      { id: 'ed18', title: 'The Humanitarian vs. The Law', dilemma: 'You work at a shelter and a family that is undocumented seeks help. Reporting them is legally required. Not reporting means they get food and safety tonight. Their child is sick.', valueA: 'Legal compliance and rule of law', valueB: 'Humanitarian compassion and immediate need', thinkAbout: 'When laws and morality conflict, which takes precedence? Can a law be legal and still unjust? What does your conscience say?' },
      { id: 'ed18b', title: 'The Data Dilemma', dilemma: 'You\'re interning at a tech company and discover the app collects user location data that\'s sold to advertisers. The privacy policy technically allows it, but users clearly don\'t realize it. The company provides free services to millions.', valueA: 'User privacy and informed consent', valueB: 'Free services funded by data monetization', thinkAbout: 'Is something ethical just because it\'s legal and disclosed in fine print? At what point does "technically allowed" become exploitation?' },
      { id: 'ed18c', title: 'The Legacy Admission', dilemma: 'You got into your dream college partly because your parent is an alumnus and donor. You\'re qualified, but so were hundreds of rejected applicants without family connections. A friend didn\'t get in.', valueA: 'Accepting opportunities you\'re given', valueB: 'Questioning systems that create unfair advantages', thinkAbout: 'Is it wrong to benefit from a system you didn\'t create? What\'s the difference between accepting privilege and endorsing it?' },
      { id: 'ed18d', title: 'The Climate Calculation', dilemma: 'You\'re offered a fully funded study abroad opportunity in Australia. It\'s the chance of a lifetime. The carbon footprint of the flights is enormous, and you\'ve been vocal about climate action.', valueA: 'Living your values consistently', valueB: 'Personal growth and once-in-a-lifetime opportunity', thinkAbout: 'Does personal action matter when systemic change is what\'s needed? Is it hypocritical to fly while advocating for the climate, or is nuance allowed?' },
      { id: 'ed18e', title: 'The Deepfake Discovery', dilemma: 'You find a deepfake explicit image of a classmate being shared online. You could report it and help them, but getting involved means admitting you saw it in a group chat you probably shouldn\'t be in.', valueA: 'Protecting the victim', valueB: 'Self-preservation and social risk', thinkAbout: 'When witnessing harm, does protecting yourself justify inaction? What would you want someone to do if it were YOUR image?' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Consequence Mapping Scenarios ──
  // Students trace short-term and long-term consequences
  // ══════════════════════════════════════════════════════════════
  var CONSEQUENCE_SCENARIOS = {
  "elementary": [
    {
      "id": "cs1",
      "title": "Explaining unfinished homework",
      "action": "In a fictional case, you invent a reason for unfinished homework instead of saying you forgot.",
      "affectedPeople": [
        "you",
        "your teacher",
        "someone who helps with schoolwork"
      ],
      "benefit": "The explanation might postpone an uncomfortable conversation.",
      "cost": "It could hide the actual support or planning problem and create a need to correct the story.",
      "depends": "The teacher's response and the reason the work was difficult are not yet known.",
      "adjustment": "Describe what happened and ask about one manageable next step, with support if needed.",
      "change": "What if several students misunderstood the instructions?",
      "review": "Check whether the instructions and next step are clear; do not judge the plan only by whether a consequence is avoided."
    },
    {
      "id": "cs2",
      "title": "Supporting someone at the bus stop",
      "action": "Someone is being targeted at a fictional bus stop. You consider telling the others to stop.",
      "affectedPeople": [
        "you",
        "the targeted student",
        "other students",
        "the supervising adult"
      ],
      "benefit": "An interruption might show support and stop the immediate comment.",
      "cost": "A direct challenge could escalate the situation or draw more attention to the targeted student.",
      "depends": "Power differences, nearby adult support, and what feels safe affect the options.",
      "adjustment": "Get a supervising adult, move toward safety, or offer private support rather than requiring a confrontation.",
      "change": "What if the targeting continued after an interruption?",
      "review": "Check whether trusted support has helped stop the behavior. Do not make the targeted student organize a mediation."
    },
    {
      "id": "cs3",
      "title": "A sustainable lunch plan",
      "action": "You notice a fictional classmate has no lunch and consider sharing yours every day.",
      "affectedPeople": [
        "you",
        "your classmate",
        "school meal staff"
      ],
      "benefit": "Sharing may help in the moment if it is safe and welcome.",
      "cost": "Daily sharing could leave you short of food, conflict with food needs, or leave the underlying access problem unresolved.",
      "depends": "You do not know why lunch is missing or what school meal support is available.",
      "adjustment": "Ask a trusted adult or meal staff for a private, dependable support route without demanding family details.",
      "change": "What if the classmate did not want their situation discussed with other students?",
      "review": "Check whether both students can access enough suitable food without making one child responsible for another's meals."
    },
    {
      "id": "cs4",
      "title": "A place at the table",
      "action": "In a fictional case, you say a lunch table is full when there is space because you do not want a new classmate to sit there.",
      "affectedPeople": [
        "you",
        "the new classmate",
        "the table group"
      ],
      "benefit": "You might avoid an interaction you feel unsure about.",
      "cost": "The untrue explanation may communicate exclusion and make later interactions harder.",
      "depends": "You cannot know how the classmate feels or what seating choices they prefer.",
      "adjustment": "Correct the explanation and offer an optional place without demanding friendship or conversation.",
      "change": "What if they preferred another table after the correction?",
      "review": "Check whether the choice was real and the untrue exclusion stopped, rather than requiring acceptance of the invitation."
    },
    {
      "id": "cs5",
      "title": "Repair after an accident",
      "action": "You accidentally break a fictional friend's toy and offer to help repair it.",
      "affectedPeople": [
        "you",
        "your friend",
        "an adult who can help with the toy"
      ],
      "benefit": "Acknowledging the damage may make a practical repair possible.",
      "cost": "A repair attempt without permission could make damage worse; an apology does not guarantee forgiveness.",
      "depends": "The type of damage and your friend's preferred next step matter.",
      "adjustment": "Ask before touching the toy and get adult help for repairs beyond your ability.",
      "change": "What if the friend wanted space and did not want you to fix it?",
      "review": "Check whether you respected the request and followed through on an agreed action, not whether the friendship immediately felt the same."
    },
    {
      "id": "cs6",
      "title": "Getting help with the work",
      "action": "You copy a fictional friend's homework because you do not understand the task.",
      "affectedPeople": [
        "you",
        "your friend",
        "your teacher"
      ],
      "benefit": "Copying might produce a finished page quickly.",
      "cost": "It may conceal the learning difficulty and put pressure on the friend without improving understanding.",
      "depends": "The unclear step, available explanations, and assignment expectations are not yet known.",
      "adjustment": "Identify one confusing step and ask for an example or another explanation.",
      "change": "What if the example used a format you could not access?",
      "review": "Check whether you can explain or demonstrate a step with suitable support, rather than just count completed pages."
    },
    {
      "id": "cs6b",
      "title": "Inviting without pressure",
      "action": "You regularly invite a fictional classmate who plays alone to join a group.",
      "affectedPeople": [
        "you",
        "the classmate",
        "the group"
      ],
      "benefit": "An invitation can open a choice that was not obvious.",
      "cost": "Repeated invitations can become pressure if the classmate has asked for solitude.",
      "depends": "Playing alone does not tell you whether someone wants company.",
      "adjustment": "Offer a brief invitation with a real way to decline and respect the response.",
      "change": "What if they said they wanted quiet today but might join tomorrow?",
      "review": "Check whether the invitation respected their preference. Joining the group is not the only successful outcome."
    },
    {
      "id": "cs6c",
      "title": "Taking space after disagreement",
      "action": "After a fictional disagreement, you stop responding to a friend and have not explained what you need.",
      "affectedPeople": [
        "you",
        "your friend",
        "a trusted support person"
      ],
      "benefit": "Time apart may help you feel ready to think or maintain a needed boundary.",
      "cost": "Unexplained silence can create uncertainty; repeated requests for an explanation can also become pressure.",
      "depends": "Whether contact is safe and welcome is not given in the story.",
      "adjustment": "If safe, consider a brief boundary statement. Private reflection or trusted support may fit better when contact is not appropriate.",
      "change": "What if the friend kept messaging after a clear request for space?",
      "review": "Check whether the boundary is being respected and whether additional support is needed. Do not measure success by renewed contact."
    },
    {
      "id": "cs6d",
      "title": "A practice routine that can change",
      "action": "You plan a short piano practice every day in a fictional week.",
      "affectedPeople": [
        "you",
        "people sharing the space",
        "your teacher or practice partner"
      ],
      "benefit": "Regular opportunities may help you become familiar with a skill.",
      "cost": "A rigid routine could conflict with rest, access, enjoyment, or other people's use of the space.",
      "depends": "The goal, available time, instrument access, and feedback affect what practice can do.",
      "adjustment": "Choose a manageable trial and allow breaks, different methods, or a quieter time.",
      "change": "What if the practice time stopped fitting the household schedule?",
      "review": "Review what you learned and what support helped; missing a day does not prove no effort or lost learning."
    },
    {
      "id": "cs6e",
      "title": "Deciding when to ask for help",
      "action": "You tell a teacher whenever you notice a fictional classmate breaking a rule.",
      "affectedPeople": [
        "you",
        "your classmates",
        "the teacher"
      ],
      "benefit": "An adult may be able to help with harm, confusion, or access to the task.",
      "cost": "Reporting every minor difference without context may interrupt learning or mistake an allowed support for a broken rule.",
      "depends": "You may not know someone's arrangement or whether anyone is at risk.",
      "adjustment": "Describe what you observed and ask for help when needed, without using labels or investigating private information.",
      "change": "What if there were a safety concern rather than a minor classroom difference?",
      "review": "Get trusted help for safety concerns promptly. Review what information was useful without discouraging future help-seeking."
    }
  ],
  "middle": [
    {
      "id": "cs7",
      "title": "Raising a concern publicly",
      "action": "You consider posting a public complaint naming a fictional teacher after a grading disagreement.",
      "affectedPeople": [
        "you",
        "the teacher",
        "other students"
      ],
      "benefit": "Public discussion might bring attention to a concern that has not been addressed.",
      "cost": "A post could spread incomplete claims or private details, and its audience may become hard to control.",
      "depends": "What evidence exists and which support routes have already been tried are not yet known.",
      "adjustment": "Separate observations from interpretations and consider a supported, factual request through an appropriate channel.",
      "change": "What if a private request had already failed and several students described a pattern?",
      "review": "Review whether the concern was documented and reached someone able to respond; attention alone does not show a fair resolution."
    },
    {
      "id": "cs8",
      "title": "Discussing a difficult grade",
      "action": "In a fictional case, you consider telling a caregiver about a grade that disappointed you.",
      "affectedPeople": [
        "you",
        "your caregiver",
        "a trusted school adult"
      ],
      "benefit": "An honest conversation may make useful support possible.",
      "cost": "You cannot guarantee a supportive response, and a conversation could focus on blame rather than the barrier.",
      "depends": "The relationship, safety, task demands, and available support affect the next step.",
      "adjustment": "Describe one difficulty and a support request; involve a trusted adult if you fear an unsafe response.",
      "change": "What if the grade reflected inaccessible instructions rather than lack of study?",
      "review": "Check whether the actual barrier is addressed and whether the plan is manageable. The grade alone does not describe effort or ability."
    },
    {
      "id": "cs9",
      "title": "Asking to change a school rule",
      "action": "You start a fictional petition about phone use at lunch.",
      "affectedPeople": [
        "you",
        "students with different access needs",
        "teachers",
        "school leaders"
      ],
      "benefit": "A petition may gather experiences and show that a rule has effects worth discussing.",
      "cost": "A simple vote might overlook privacy, safety, or access needs held by a smaller group.",
      "depends": "The reasons for the rule and the range of student needs need investigation.",
      "adjustment": "Gather perspectives without collecting private details and propose a limited trial with clear review criteria.",
      "change": "What if some students needed devices for communication or other access support?",
      "review": "Review participation, access, and practical effects rather than treating the number of signatures as the whole decision."
    },
    {
      "id": "cs10",
      "title": "Responding to a friend who is struggling",
      "action": "A fictional friend says they have been feeling down. You say they will be fine and change the subject.",
      "affectedPeople": [
        "you",
        "your friend",
        "a trusted support person"
      ],
      "benefit": "You might intend to offer reassurance or reduce an awkward moment.",
      "cost": "The reply may close off an opportunity to listen or help the friend reach appropriate support.",
      "depends": "You do not know what kind of support they want or the full situation.",
      "adjustment": "Offer to listen without promising to solve it. Seek trusted help for safety concerns rather than promising secrecy.",
      "change": "What if the friend did not want to talk to you but wanted help finding an adult?",
      "review": "Check whether you respected the request and offered an appropriate support route; do not treat a better mood as your responsibility."
    },
    {
      "id": "cs11",
      "title": "Support after a presentation",
      "action": "Other students mock a fictional classmate's presentation. You consider offering public encouragement.",
      "affectedPeople": [
        "you",
        "the presenter",
        "other students",
        "the teacher"
      ],
      "benefit": "Encouragement may interrupt the mocking and show that it is not accepted by everyone.",
      "cost": "A spotlight on the presenter may be unwanted, and praise alone may not stop repeated targeting.",
      "depends": "The presenter's preferences and the teacher's response matter.",
      "adjustment": "Consider a brief interruption, private support, or adult help instead of making the presenter answer publicly.",
      "change": "What if the mocking continued the next day?",
      "review": "Check whether the behavior stopped and support is available, not whether the presenter appeared grateful."
    },
    {
      "id": "cs12",
      "title": "Leaving a team",
      "action": "In a fictional case, you consider leaving a team because the role and time commitment no longer fit.",
      "affectedPeople": [
        "you",
        "the coach",
        "teammates",
        "people who help with transport"
      ],
      "benefit": "Leaving could make room for rest, another interest, or a better fit.",
      "cost": "A sudden change may disrupt arrangements or close an opportunity you still value.",
      "depends": "Your reasons, alternatives, safety, and whether the role can change are not fully known.",
      "adjustment": "Discuss options if safe, including a changed role or planned departure; staying is not automatically the responsible choice.",
      "change": "What if an injury, inaccessible practice, or unsafe treatment were involved?",
      "review": "Review wellbeing, access, and practical arrangements without using continued participation as a measure of character."
    },
    {
      "id": "cs12b",
      "title": "Sending an apology",
      "action": "You write a long apology to a fictional friend after a disagreement and consider sending it.",
      "affectedPeople": [
        "you",
        "your friend"
      ],
      "benefit": "It may acknowledge an action and offer a concrete repair.",
      "cost": "Length and sincerity do not guarantee that contact is welcome or that the message will be accepted.",
      "depends": "The friend's contact preferences and what repair is possible matter.",
      "adjustment": "Check boundaries and consider a brief message, changed behavior, or private practice instead.",
      "change": "What if the friend had already asked for no contact?",
      "review": "Respect that request. Check your follow-through rather than counting replies or forgiveness."
    },
    {
      "id": "cs12c",
      "title": "Choosing a course that fits",
      "action": "You consider changing math courses in a fictional school because the current workload is difficult to sustain.",
      "affectedPeople": [
        "you",
        "teachers",
        "an advisor",
        "people supporting your schedule"
      ],
      "benefit": "A different course may offer a more workable pace or room for other priorities.",
      "cost": "A change might affect prerequisites or remove a challenge you value; staying may also have costs.",
      "depends": "Actual course content, support, workload, and future requirements need checking.",
      "adjustment": "Ask an advisor about supports, course expectations, and whether a trial or later change is possible.",
      "change": "What if a support change made the current course accessible without increasing total workload?",
      "review": "Review access, learning, workload, and future options. A course label alone does not measure ambition or ability."
    },
    {
      "id": "cs12d",
      "title": "Witnessing hallway targeting",
      "action": "You see a fictional student being targeted and consider recording the incident.",
      "affectedPeople": [
        "you",
        "the targeted student",
        "other witnesses",
        "a supervising adult"
      ],
      "benefit": "You may hope a record helps explain what happened.",
      "cost": "Filming or sharing can delay help, increase risk, or amplify humiliation. A recording is not required before seeking support.",
      "depends": "Immediate safety, school procedures, and what an adult can do are not fully known.",
      "adjustment": "Prioritize safety and get an adult; do not investigate, circulate a clip, or require the targeted student to confront the group.",
      "change": "What if the incident was still happening while others were filming?",
      "review": "Seek prompt help. Review whether the targeting stopped and support followed, not the reach or popularity of a video."
    },
    {
      "id": "cs12e",
      "title": "A sustainable volunteer commitment",
      "action": "You consider volunteering every Saturday at a fictional animal shelter.",
      "affectedPeople": [
        "you",
        "shelter staff",
        "other volunteers",
        "people supporting transport"
      ],
      "benefit": "A regular role may let you contribute and learn useful tasks.",
      "cost": "The commitment may exceed available time, transport, or energy, and unreliable coverage can affect the shelter.",
      "depends": "Training, age requirements, task access, and scheduling flexibility need checking.",
      "adjustment": "Ask about a realistic trial or less frequent role before promising every week.",
      "change": "What if transport became unavailable for part of the month?",
      "review": "Review the agreed responsibilities and supports, and communicate changes early. Frequency alone does not measure care."
    }
  ],
  "high": [
    {
      "id": "cs13",
      "title": "AI assistance and authorship",
      "action": "You consider using AI-generated text in a fictional application essay.",
      "affectedPeople": [
        "you",
        "application reviewers",
        "other applicants"
      ],
      "benefit": "A tool might help organize ideas or lower a writing barrier if the rules allow that use.",
      "cost": "Generated text may misrepresent your experiences, contain errors, or violate the specific application rules.",
      "depends": "Allowed assistance, disclosure requirements, and what work must be your own need checking.",
      "adjustment": "Read the actual rules and seek permitted support; keep claims accurate and avoid entering private information unnecessarily.",
      "change": "What if brainstorming was allowed but generated personal statements were not?",
      "review": "Check the final work against the rules and your actual experience, not whether it sounds impressive or receives an offer."
    },
    {
      "id": "cs14",
      "title": "Documenting an unfair pattern",
      "action": "You consider writing a fictional school-paper article about differences you observed in disciplinary treatment.",
      "affectedPeople": [
        "you",
        "affected students",
        "school staff",
        "readers"
      ],
      "benefit": "A careful account may make a pattern visible and support a request for change.",
      "cost": "An incomplete account could misstate a pattern or expose students who do not want their experiences published.",
      "depends": "Evidence, missing perspectives, consent, and risks from the power difference need attention.",
      "adjustment": "Distinguish observations from conclusions, protect identities, and seek editorial or trusted support.",
      "change": "What if students supported the concern but did not consent to being named?",
      "review": "Review accuracy, privacy, and whether the concern reached a process able to respond; publicity alone does not show change."
    },
    {
      "id": "cs15",
      "title": "Ending a difficult friendship",
      "action": "You consider ending a fictional friendship after repeated pressure to ignore your boundaries.",
      "affectedPeople": [
        "you",
        "the friend",
        "mutual friends",
        "a trusted support person"
      ],
      "benefit": "Ending contact may protect a boundary and create space.",
      "cost": "Mutual relationships or practical arrangements may become difficult; explaining in person could be unsafe or unwanted.",
      "depends": "Safety, contact preferences, and shared responsibilities affect the next step.",
      "adjustment": "Choose a safe boundary and appropriate support. A face-to-face explanation is not required.",
      "change": "What if the person kept contacting you after being asked to stop?",
      "review": "Review whether the boundary is respected and support is sufficient, rather than judging the choice by reconciliation."
    },
    {
      "id": "cs16",
      "title": "Comparing paid work and an internship",
      "action": "You compare a paid job with a lower-paid internship tied to an interest in a fictional case.",
      "affectedPeople": [
        "you",
        "people relying on your time or income",
        "coworkers or supervisors"
      ],
      "benefit": "The paid role may support essential costs and offer useful experience.",
      "cost": "Either option may limit time, access, or a learning opportunity you value.",
      "depends": "Actual costs, work conditions, learning opportunities, and responsibilities matter more than labels about purpose.",
      "adjustment": "Compare the real conditions and ask about flexibility or another way to explore the interest.",
      "change": "What if the internship gained reliable funding or the paid job offered mentoring?",
      "review": "Review needs, conditions, and options using updated information. Choosing income does not mean abandoning values."
    },
    {
      "id": "cs17",
      "title": "Planning a year before college",
      "action": "You consider a fictional year of work or other activity before starting college.",
      "affectedPeople": [
        "you",
        "family or supporters",
        "advisors",
        "people involved in the plan"
      ],
      "benefit": "A planned year may offer income, rest, exploration, or experience.",
      "cost": "Deadlines, funding, housing, or re-entry requirements could create constraints that are hard to undo.",
      "depends": "Actual deferral rules, costs, supports, and what the year would involve need verification.",
      "adjustment": "Check requirements with the relevant institutions and identify a feasible plan and backup before committing.",
      "change": "What if a funding offer could not be deferred?",
      "review": "Revisit the plan before deadlines using confirmed information; neither immediate enrollment nor a gap is automatically superior."
    },
    {
      "id": "cs18",
      "title": "Seeking help about a safety concern",
      "action": "You have a concern about a fictional friend distributing an unknown substance at school and consider telling a trusted adult.",
      "affectedPeople": [
        "you",
        "your friend",
        "other students",
        "a trusted adult"
      ],
      "benefit": "Appropriate adult support may help address a safety concern.",
      "cost": "You cannot control every response, and spreading accusations could add harm.",
      "depends": "You may have incomplete information; uncertainty is a reason to describe what you know, not to investigate personally.",
      "adjustment": "Seek trusted support, share relevant observations privately, and avoid confrontation or promises of secrecy.",
      "change": "What if someone appeared to need urgent help right now?",
      "review": "Prioritize immediate help through local emergency or school procedures. Later, review whether appropriate support followed; do not delay help to finish this exercise."
    },
    {
      "id": "cs18b",
      "title": "Choosing what to share in an essay",
      "action": "You consider describing a fictional family difficulty in an application essay.",
      "affectedPeople": [
        "you",
        "family members",
        "application readers"
      ],
      "benefit": "A personal example may express something you choose to communicate.",
      "cost": "It may disclose information about you or others that cannot be made private again. Painful disclosure is not required to be authentic.",
      "depends": "Your comfort, other people's privacy, the prompt, and the audience matter.",
      "adjustment": "Consider another topic, fewer identifying details, or a private draft before deciding what to share.",
      "change": "What if a family member did not consent to identifiable details?",
      "review": "Review what you actually want readers to know. An acceptance or rejection cannot establish whether disclosure was a good choice for you."
    },
    {
      "id": "cs18c",
      "title": "Requesting a fair grading review",
      "action": "You consider telling a fictional teacher that similar work appears to receive different feedback.",
      "affectedPeople": [
        "you",
        "the teacher",
        "affected classmates",
        "a support person"
      ],
      "benefit": "A factual request may clarify criteria or lead to a fairer process.",
      "cost": "A direct conversation can carry risk when the teacher controls grades, and private student work should not be shared without permission.",
      "depends": "Criteria, evidence, missing context, and available support routes need checking.",
      "adjustment": "Use specific observations and a supported review route; do not require affected students to confront the teacher alone.",
      "change": "What if an earlier request was dismissed or you feared retaliation?",
      "review": "Consider another trusted support route. Review whether consistent criteria and a fair process were provided, not just whether the meeting felt friendly."
    },
    {
      "id": "cs18d",
      "title": "Changing social-media use",
      "action": "You consider removing social-media apps for a month in a fictional case.",
      "affectedPeople": [
        "you",
        "online friends",
        "people relying on those channels"
      ],
      "benefit": "A change may reduce interruptions or create time for something else.",
      "cost": "It could also interrupt meaningful relationships, community access, or practical communication.",
      "depends": "How you use each service and which functions you rely on matter.",
      "adjustment": "Try a selective or reversible change and arrange another contact route where needed.",
      "change": "What if one app was your main accessible connection to a community?",
      "review": "Review actual effects on time, access, and connection. A complete break is not the only useful option."
    },
    {
      "id": "cs18e",
      "title": "Supporting a sibling without taking their blame",
      "action": "A fictional younger sibling breaks something valuable. You consider saying you did it because you fear they will be treated harshly.",
      "affectedPeople": [
        "you",
        "your sibling",
        "caregivers",
        "a trusted support person"
      ],
      "benefit": "Taking blame might seem to protect the sibling in the moment.",
      "cost": "It can obscure what happened, transfer consequences to you, and leave fear of harsh treatment unresolved.",
      "depends": "The level of risk and who can help safely are not clear.",
      "adjustment": "Seek trusted support if harm is feared. You can support the sibling without being required to accept blame for their action.",
      "change": "What if either sibling feared being hurt rather than receiving a routine consequence?",
      "review": "Prioritize safety and appropriate help; do not turn honesty or accountability into a demand for unsafe disclosure."
    }
  ]
};

  // ══════════════════════════════════════════════════════════════
  // ── Cognitive Biases ──
  // Students learn to recognize thinking traps
  // ══════════════════════════════════════════════════════════════
  var BIAS_DATA = {
  "elementary": [
    {
      "id": "b1",
      "name": "The Bandwagon Effect",
      "simple": "Following the crowd",
      "icon": "🚌",
      "desc": "A group opinion can influence what we say or choose, even before we check whether it fits.",
      "example": "Friends all choose a game. One learner says it is their favorite before trying it, because they want to join in.",
      "question": "What does the learner know about the game, and what are they guessing?",
      "antidote": "Try a small part if it is comfortable, or ask what the game is like. The learner can enjoy being with friends and have a different preference.",
      "limits": "Agreeing with friends is not automatically a mistake. Pressure or exclusion needs adult support, not just a stronger opinion."
    },
    {
      "id": "b2",
      "name": "Black-and-White Thinking",
      "simple": "All or nothing",
      "icon": "⚫",
      "desc": "One result can turn into a much bigger claim, such as being unable to do anything in a subject.",
      "example": "After one difficult puzzle, a learner says, \"I cannot do puzzles.\" They solved part of it but got stuck on a new step.",
      "question": "What happened in this puzzle, and what does it not tell us yet?",
      "antidote": "Name the step that was difficult and ask for a clue, an example or another way to try it.",
      "limits": "A real difficulty should not be brushed away with positive words. The learner may need different teaching, access or more support."
    },
    {
      "id": "b3",
      "name": "Halo effect",
      "simple": "One detail becomes the whole picture",
      "icon": "😇",
      "desc": "An impression about one feature can spill over into judgments about unrelated qualities.",
      "example": "A learner sees a classmate make a beautiful drawing and assumes they will also be good at explaining game rules.",
      "question": "What does the drawing show, and what would need a separate check?",
      "antidote": "Ask who wants to explain the game and whether a model or shared explanation would help.",
      "limits": "One skill does not prove another. A first impression is a starting guess, not a complete account of a person."
    },
    {
      "id": "b4",
      "name": "Wishful Thinking",
      "simple": "Hope and evidence",
      "icon": "⭐",
      "desc": "Wanting an outcome can make it harder to notice what still needs preparation or checking.",
      "example": "A group hopes its paper bridge will hold a toy. It has not tested the middle section yet.",
      "question": "What is the group hoping, and what has it checked?",
      "antidote": "Try a small, suitable test with available materials and notice where support is needed.",
      "limits": "Hope can motivate a project. Testing may also require adult help, materials or a smaller plan."
    },
    {
      "id": "b5",
      "name": "Responsibility and blame",
      "simple": "Sorting out responsibility",
      "icon": "👈",
      "desc": "An explanation can leave out our own action, or put too much responsibility on someone who had little control.",
      "example": "Two learners talk during directions. One says the other started it. The teacher also needs to check whether the directions were accessible.",
      "question": "Which actions are known, and who could change each part?",
      "antidote": "Describe what each person did, what support was missing and one next step within the learner's control.",
      "limits": "Taking responsibility does not mean accepting blame for someone else's harm. Adults remain responsible for safety and appropriate support."
    },
    {
      "id": "b6",
      "name": "The Spotlight Effect",
      "simple": "Guessing how much others noticed",
      "icon": "🔦",
      "desc": "We can overestimate how much attention other people give to a mistake, but we cannot know their thoughts from a guess.",
      "example": "A learner drops their pencil case and worries everyone will keep thinking about it. They heard a noise but do not know who noticed.",
      "question": "What did the learner actually observe, and what remains unknown?",
      "antidote": "Ask for help gathering the pencils and choose whether a trusted adult could help with the worry.",
      "limits": "Do not promise that nobody noticed. If there is teasing or repeated targeting, take it seriously and seek adult support."
    },
    {
      "id": "b6b",
      "name": "The Recency Effect",
      "simple": "The latest event gets extra weight",
      "icon": "🔝",
      "desc": "A recent event can take up more space in our judgment than earlier relevant information.",
      "example": "After a team loses its latest game, a learner says the team never works together, although earlier games included good cooperation.",
      "question": "Which examples would help describe the team fairly?",
      "antidote": "Look at specific cooperation in more than one game and identify a part that needs work now.",
      "limits": "Recent evidence can matter a lot if something has changed. Older good moments do not cancel a current harmful pattern."
    },
    {
      "id": "b6c",
      "name": "Fairness and equal treatment",
      "simple": "Fair does not always mean identical",
      "icon": "⚖️",
      "desc": "Giving everyone the same thing may not give everyone a usable way to participate. Different arrangements still need a fair reason.",
      "example": "One student uses larger picture cards to join a game. Another asks why the cards are not all the same size.",
      "question": "What helps each person use the game?",
      "antidote": "Ask an adult to explain the purpose of access supports without sharing private details about a student.",
      "limits": "A concern about fairness deserves a hearing. Do not assume every difference is justified, or require someone to disclose a diagnosis."
    }
  ],
  "middle": [
    {
      "id": "b7",
      "name": "Confirmation Bias",
      "simple": "Testing what I expect",
      "icon": "🔍",
      "desc": "Existing beliefs can influence which evidence we seek, notice or interpret as convincing.",
      "example": "A group believes its poster is already clear. It asks only friends who helped make it and overlooks a reader who cannot find the event time.",
      "question": "What specific evidence would support or challenge the clarity claim?",
      "antidote": "Ask a willing reader to find the event time without prompting. Compare the result with the group's expectation and revise if useful.",
      "limits": "Disagreement alone is not better evidence. Use relevant, credible observations; reports of unfair treatment should be examined, not dismissed as bias."
    },
    {
      "id": "b8",
      "name": "Sunk Cost Fallacy",
      "simple": "Past effort and the next choice",
      "icon": "💸",
      "desc": "Time or resources already spent can pull us toward continuing, even when the next steps no longer serve the purpose.",
      "example": "A group has decorated a model that does not fit the assignment. It wants to keep the design only because it took so long.",
      "question": "What would continuing, adapting or stopping each require from this point?",
      "antidote": "Check the actual requirements and compare future effort, useful parts and switching costs. Ask for help choosing a workable scope.",
      "limits": "Past work can leave skills or reusable materials. Continuing can be reasonable; the check is not an automatic instruction to quit."
    },
    {
      "id": "b9",
      "name": "False Consensus Effect",
      "simple": "Checking whose view is represented",
      "icon": "👥",
      "desc": "We may assume our own preferences are more widely shared than the available evidence shows.",
      "example": "A class representative says everyone wants music during work because their closest friends do. Other classmates have not been asked.",
      "question": "Whose views are included and whose are missing?",
      "antidote": "Offer an accessible way to give input, including privately, and consider options such as quiet space as well as a majority preference.",
      "limits": "A poll can miss people or hide access needs. Popularity does not settle consent, safety or participation barriers."
    },
    {
      "id": "b10",
      "name": "Anchoring Bias",
      "simple": "The first number or idea holds us",
      "icon": "⚓",
      "desc": "An early suggestion can influence later estimates or judgments more than its relevance warrants.",
      "example": "The first group member says a display will take ten minutes. Others repeat that estimate before listing the actual tasks.",
      "question": "Where did the first estimate come from?",
      "antidote": "Estimate the tasks from comparable work and available resources before comparing with the first suggestion.",
      "limits": "The first estimate may be useful if it has a sound basis. A second unsupported guess is not automatically more reliable."
    },
    {
      "id": "b11",
      "name": "Just-World Fallacy",
      "simple": "Outcomes do not prove deservingness",
      "icon": "⚖️",
      "desc": "A wish for the world to be fair can lead us to assume that people caused or deserved their misfortune.",
      "example": "A student misses a trip because transport fell through. A classmate assumes they did not care enough to organize it.",
      "question": "What is known about the transport, and what has been inferred about the person?",
      "antidote": "Avoid judging character from the outcome. Ask what practical support is wanted and who can help.",
      "limits": "Understanding circumstances does not require private disclosure. A bad outcome alone is not evidence of bad character."
    },
    {
      "id": "b12",
      "name": "In-Group Bias",
      "simple": "Checking double standards",
      "icon": "🛡️",
      "desc": "Group membership can influence whose behavior we excuse or criticize.",
      "example": "Two teams interrupt a speaker in the same way. A learner excuses their own team and calls the other team disrespectful.",
      "question": "Would the same description and standard apply if the team names changed?",
      "antidote": "Compare the actual behavior and relevant context, then apply a consistent standard with needed supports.",
      "limits": "Context can justify different responses. Consistency is not an excuse to ignore power, access needs or unequal harm."
    },
    {
      "id": "b12b",
      "name": "Negativity Bias",
      "simple": "When a negative moment dominates",
      "icon": "➖",
      "desc": "Unpleasant information can receive strong attention and influence how we remember an experience.",
      "example": "After useful project feedback and one dismissive comment, a learner remembers only the comment and decides the whole project was worthless.",
      "question": "What information helps judge the project, and what support is needed for the comment?",
      "antidote": "Separate specific feedback from a hurtful remark. Review the work against its purpose and decide whether to seek support.",
      "limits": "Positive moments do not erase harm. There is no required ratio of positive to negative thoughts, and upsetting feelings need not be replaced."
    },
    {
      "id": "b12c",
      "name": "The Planning Fallacy",
      "simple": "Estimating with evidence",
      "icon": "⏰",
      "desc": "Plans can underestimate time or obstacles when they focus on an ideal sequence and miss past experience.",
      "example": "A group budgets one lesson for a presentation, leaving out research, accessible materials and rehearsal.",
      "question": "Which steps, dependencies and possible delays are missing?",
      "antidote": "Compare with similar tasks, break down the work, include a realistic buffer and set a point to revise the estimate.",
      "limits": "There is no universal multiplier that fixes an estimate. Workload, resources and support may need changing as well as the schedule."
    }
  ],
  "high": [
    {
      "id": "b13",
      "name": "Fundamental Attribution Error",
      "simple": "Behavior and circumstances",
      "icon": "🎭",
      "desc": "We can give too much weight to personal qualities and too little to the situation when explaining someone's behavior.",
      "example": "A partner arrives late and is called unreliable before anyone checks the changed bus timetable.",
      "question": "What behavior was observed, and which explanation is still a hypothesis?",
      "antidote": "Consider plausible circumstances, ask a respectful question if appropriate and agree how to handle the immediate task.",
      "limits": "Circumstances do not automatically excuse harm. Keep boundaries and accountability while avoiding unsupported character judgments."
    },
    {
      "id": "b14",
      "name": "Availability Heuristic",
      "simple": "Memorable is not the same as frequent",
      "icon": "📰",
      "desc": "Examples that come easily to mind can influence estimates of how often something happens.",
      "example": "After seeing several reposts of one stolen-bike report, a student assumes theft has risen sharply at school.",
      "question": "Are these independent events, repeated reports, or evidence of a wider pattern?",
      "antidote": "Check the original report and relevant information over a comparable time period. Separate the count of posts from the count of events.",
      "limits": "A vivid report may describe a real risk. Sensible precautions need not wait for perfect data; frequency still needs relevant evidence."
    },
    {
      "id": "b15",
      "name": "Confidence calibration (Dunning-Kruger)",
      "simple": "Checking confidence against performance",
      "icon": "📈",
      "desc": "Self-assessment can differ from demonstrated performance on a particular task. Limited skill can make some errors harder to recognize.",
      "example": "After one tutorial, a student feels certain their spreadsheet formula is correct but has not checked it with known examples.",
      "question": "What task-specific test or feedback could show whether the formula works?",
      "antidote": "Try known inputs, inspect errors and ask someone with relevant expertise to review the reasoning. Adjust confidence to the evidence.",
      "limits": "Confidence alone does not reveal skill. The Dunning-Kruger effect is not a label for a person you disagree with, and experts are not always underconfident."
    },
    {
      "id": "b16",
      "name": "Status Quo Bias",
      "simple": "Checking the familiar option",
      "icon": "🟢",
      "desc": "A familiar arrangement can get an advantage simply because it is already in place, rather than because its current benefits outweigh its costs.",
      "example": "A club keeps a signup process that some members cannot use because changing it would be unfamiliar.",
      "question": "What are the current barriers and the real costs of an alternative?",
      "antidote": "Compare the existing process with an accessible alternative, including transition support and a review point.",
      "limits": "Familiar routines can provide predictability and access. Change is not automatically better; compare actual needs and risks."
    },
    {
      "id": "b17",
      "name": "Moral Licensing",
      "simple": "Past good actions are not permission",
      "icon": "🎖️",
      "desc": "A positive view of our earlier actions can become a reason to overlook harm in a new choice.",
      "example": "After helping organize an event, a student says they have earned the right to mock a teammate's mistake.",
      "question": "What does the new action do, regardless of earlier help?",
      "antidote": "Address the mocking behavior, stop it and consider appropriate repair. Keep appreciation for earlier help separate from permission to harm.",
      "limits": "A person is more than one action, but praise should not prevent accountability. Repair does not require forgiveness or renewed contact."
    },
    {
      "id": "b18",
      "name": "Narrative Fallacy",
      "simple": "A tidy story may leave things out",
      "icon": "📚",
      "desc": "A compelling explanation can make complex or uncertain events seem to have a single clear cause.",
      "example": "An article credits one study habit for a student's exam result without discussing teaching, prior knowledge, resources or other students who used it.",
      "question": "Which causes are supported, and which alternatives or comparison cases are missing?",
      "antidote": "Check what the source actually shows and consider other relevant factors before recommending the habit as a guarantee.",
      "limits": "Stories can convey meaningful experience. A useful account of one person does not by itself establish a general cause."
    },
    {
      "id": "b18b",
      "name": "Assumed preferences",
      "simple": "Ask about another person's preferences",
      "icon": "😶",
      "desc": "Our own preferences can become a shortcut for guessing what someone else wants.",
      "example": "A student likes surprise plans and changes a group meeting time without asking whether the others can adapt.",
      "question": "What was agreed, and whose preference or constraint has not been checked?",
      "antidote": "Ask about timing and needed notice before changing the plan. Offer a way to decline or suggest an alternative.",
      "limits": "This is a practice example about assumed preferences, not a diagnosis or proof of what another person feels."
    },
    {
      "id": "b18c",
      "name": "The Empathy Gap",
      "simple": "Needs can change with context",
      "icon": "🌡️",
      "desc": "Our current state can make it difficult to anticipate how needs and choices may differ in another state or situation.",
      "example": "During a quiet planning session, a group schedules hours of work without breaks. During the busy event, some members need a pause or help.",
      "question": "What demands were hard to imagine during planning?",
      "antidote": "Plan flexible breaks, backup roles and a way to ask for support. Review the arrangement with the people using it.",
      "limits": "Do not infer someone's emotional state or excuse harmful behavior. Ask what is needed and keep boundaries in place."
    }
  ]
};

  // ══════════════════════════════════════════════════════════════
  // Authored fictional practice; priorities are contextual, not a personality assessment.
  var VALUES_PRACTICE = {
  "vs1": {
    "situation": "A friend wants to play the same game again. Another friend has not had a turn choosing.",
    "tension": "Loyalty can mean staying with a friend and helping the group make room for others. Fun and fairness may fit together.",
    "change": "One friend says the new game has rules they cannot follow yet.",
    "model": "Ask what would make the game easier to join. Try teaching a short round before taking turns choosing; check that everyone has a real way to participate."
  },
  "vs2": {
    "situation": "A student has worked hard on a puzzle but is stuck. A partner offers an answer without explaining it.",
    "tension": "Effort does not have to mean working alone. Curiosity and honest help can support learning together.",
    "change": "The student understands spoken steps better than the printed instructions.",
    "model": "Ask the partner or teacher to explain one step aloud, then try the next step. Check understanding instead of judging how much struggle counts as effort."
  },
  "vs3": {
    "situation": "A child promised to help tidy a shared space but feels worn out after school.",
    "tension": "Responsibility can include asking for help or a different time. Caring for family does not mean having no limits.",
    "change": "A grown-up says the space must be clear for someone to walk safely.",
    "model": "Tell the grown-up about being tired. Ask to clear a small safe path together now and agree on a manageable time for the rest."
  },
  "vs4": {
    "situation": "A team keeps giving one player the ball because they score most often. Another player wants a chance.",
    "tension": "Trying to win and including teammates both matter. Equal turns alone may not give everyone the support they need.",
    "change": "The quieter player says a shorter pass would help them take part.",
    "model": "Try shorter passes and shared roles in the next round. Ask whether players got a meaningful chance, rather than only counting the score."
  },
  "vs5": {
    "situation": "Friends choose a group name that makes fun of someone. A child wants to belong but feels uneasy.",
    "tension": "Belonging matters; it does not make hurtful treatment acceptable. Courage can include getting support instead of speaking alone.",
    "change": "A second friend quietly says they also dislike the name.",
    "model": "Suggest a different name together or ask a trusted adult for help. Check that the person targeted is supported without making them explain their feelings to the group."
  },
  "vs6": {
    "situation": "A class wants to reduce lunch waste. Some students need individually wrapped food.",
    "tension": "Care for the planet and care for classmates belong in the same plan. A rule can affect people differently.",
    "change": "The teacher can ask for a food-scrap bin and reusable supplies.",
    "model": "Choose changes the class can actually use, with exceptions for food needs. Count what the class reduces without blaming students for packaging they need."
  },
  "vs6b": {
    "situation": "A child sees repeated teasing near the playground. They want to help but worry about becoming a target.",
    "tension": "Helping does not require putting yourself in danger. Safety, kindness and getting adult support can work together.",
    "change": "The teasing continues after a student asks for it to stop.",
    "model": "Move toward a safe adult and report what happened. Offer company to the targeted child if they want it. Check that an adult follows up; stopping repeated harm is not a child's job alone."
  },
  "vs6c": {
    "situation": "A child accidentally damages a borrowed book and worries that telling the owner will upset them.",
    "tension": "Honesty and kindness can shape how the child explains what happened. Repair needs the owner's input.",
    "change": "The owner says the book was a special gift and cannot simply be replaced.",
    "model": "Explain the damage without excuses, listen, and ask a grown-up to help discuss repair. The owner may still feel upset; an apology does not require immediate forgiveness."
  },
  "vs7": {
    "situation": "A friend asks why you did not answer a private message. You want to rebuild trust but do not want to share a personal family detail.",
    "tension": "Honesty does not require full disclosure. Consistency and a clear boundary can support trust without unwanted vulnerability.",
    "change": "Your friend says they mainly need to know whether tomorrow's plan is still happening.",
    "model": "Confirm the plan and say you were unavailable without sharing private details. Agree on a practical way to confirm plans; check whether the expectation is manageable for both people."
  },
  "vs8": {
    "situation": "Students want a club to offer an accessible meeting space. One student is asked to tell their personal story publicly to persuade the group.",
    "tension": "Solidarity means supporting access while respecting who chooses to speak. Someone else should not set the level of risk a student must accept.",
    "change": "The student wants the room changed but does not want to be named.",
    "model": "Ask the adviser to review meeting access without naming the student. Share responsibility for follow-up and check that the new space actually works for participants."
  },
  "vs9": {
    "situation": "A group wants to post a funny video from a trip. One person in the clip has not agreed to have it shared.",
    "tension": "Self-expression and connection do not replace another person's choice about appearing online. Silence is not agreement.",
    "change": "The person says no, but the group has a version showing only the scenery.",
    "model": "Use the scenery version if everyone shown has agreed. Keep the original private and check the post before sharing. A popular response would not erase the consent issue."
  },
  "vs10": {
    "situation": "Friends plan a challenge that feels unsafe to one student. They say backing out means not being part of the group.",
    "tension": "Belonging is a real need, but a demand to accept harm is pressure. Independence can include choosing an ally or adult support.",
    "change": "One friend offers to leave with the student and do something else.",
    "model": "Leave together for a safer activity. If the challenge could hurt someone, seek adult help. Later, consider which friendships allow a no without punishment."
  },
  "vs11": {
    "situation": "A club leader must choose speaking roles. Their closest friends expect the biggest parts.",
    "tension": "Fairness involves a clear process and support to participate. Being decisive does not mean ignoring concerns about that process.",
    "change": "A member wants a role but needs to use recorded audio instead of speaking live.",
    "model": "Agree on role criteria and include a recorded contribution where workable. Explain the process without disclosing private needs, then check whether members had a meaningful choice."
  },
  "vs12": {
    "situation": "A student has a group deadline, a family commitment and little time to rest. They cannot do everything as originally planned.",
    "tension": "Responsibility includes making realistic commitments. Rest is a need, and support or changed expectations may be necessary.",
    "change": "A teacher offers a deadline extension if the group agrees on a revised plan.",
    "model": "Discuss a smaller task and the extension with the group. Communicate what can be done and when. Review whether the plan leaves enough rest instead of measuring success by doing everything."
  },
  "vs12b": {
    "situation": "Someone who spread a rumor apologizes and asks to become close friends again immediately.",
    "tension": "Repair, forgiveness and renewed trust are different choices. Empathy does not require dropping boundaries.",
    "change": "The person has corrected the rumor but keeps asking for an immediate answer.",
    "model": "Acknowledge the correction if you wish, while asking for time and space. If pressure continues, seek support. Look for consistent respect for boundaries before deciding about closeness."
  },
  "vs12c": {
    "situation": "A group wants to use an app that would upload classmates' voices to make a project more entertaining.",
    "tension": "Convenience and creativity need to be considered alongside permission and privacy. Being able to upload a recording is not permission to do so.",
    "change": "The teacher offers a version that uses invented dialogue and no recordings.",
    "model": "Use the invented dialogue or ask for another approved approach. Check the project for identifying details and explain the creative choices without uploading classmates' voices."
  },
  "vs13": {
    "situation": "A student is choosing between a paid local opportunity and an unpaid program connected to a favorite field. Transport and household income matter.",
    "tension": "Passion and financial security are not measures of moral worth. Access, costs and other responsibilities change which options are realistic.",
    "change": "The unpaid program offers a small travel grant but still requires many unpaid hours.",
    "model": "Calculate the remaining costs and time with a trusted adviser. Ask about paid or shorter alternatives. Revisit the choice if support changes instead of treating sacrifice as proof of commitment."
  },
  "vs14": {
    "situation": "A student is offered recognition for a successful project but the nomination leaves out the group's contributions.",
    "tension": "Achievement and integrity can reinforce each other through accurate credit. Kindness does not mean leaving an unfair account unchallenged.",
    "change": "The organizer says the nomination can be revised before publication.",
    "model": "Request a factual correction and ask teammates how they want to be credited. Check the revised text; accepting recognition can still be reasonable when contributions are represented accurately."
  },
  "vs15": {
    "situation": "Students learn that a school opportunity requires fees some families cannot afford. They are asked to share personal financial stories to support a change.",
    "tension": "Justice and solidarity include changing access without requiring disclosure. Students affected by a barrier should not carry all the work of removing it.",
    "change": "The school can review fee waivers, but the current process publicly identifies recipients.",
    "model": "Request a confidential access process and a review of the fees themselves. Invite voluntary feedback through a trusted staff member, then check who can participate after the change."
  },
  "vs16": {
    "situation": "A teammate asks a student to leave an inconvenient result out of a report so the team looks successful.",
    "tension": "Loyalty can include protecting the team from a misleading claim. Honesty may require support when challenging someone with more influence.",
    "change": "The teacher offers a private way to raise concerns before submission.",
    "model": "Use the private route if needed and propose including the result with its limits. Check that the final report is accurate and that no student is left to manage retaliation alone."
  },
  "vs17": {
    "situation": "A student feels pulled between a demanding activity, time with people they care about and unstructured rest.",
    "tension": "Purpose can come from relationships, enjoyment and contribution as well as achievement. A meaningful life need not have one fixed priority order.",
    "change": "The activity offers a smaller role for the next month.",
    "model": "Try the smaller role and reserve time for connection and rest. Set a review point to notice what is workable; changing a commitment is not automatically giving up on a value."
  },
  "vs18": {
    "situation": "A group has a rule against late entries, but a participant could not use the submission system with their access tools.",
    "tension": "Consistency matters, yet applying the same process can preserve an access barrier. Compassion should not depend on a public personal disclosure.",
    "change": "The organizer confirms the system failed and can reopen submissions fairly.",
    "model": "Correct the access problem and provide a clear revised process. Explain the procedural change without naming private details. Check that affected participants can use it before enforcing the new deadline."
  },
  "vs18b": {
    "situation": "A student with easy access to a school leader is asked to raise a concern affecting peers. They do not know what those peers want shared.",
    "tension": "Action and humility can work together. Having access does not give someone authority to speak for everyone or reveal another person's story.",
    "change": "Peers agree on a specific request but ask to stay unnamed.",
    "model": "Present the agreed request without identifying stories and be clear about whose permission you have. Report back on the response and let peers choose whether the next step fits their aims."
  },
  "vs18c": {
    "situation": "A student cares about a cause but is being pressed to join an action that could put their housing or job at risk.",
    "tension": "Conviction does not require equal exposure to consequences. Community action can include different roles and protect people with fewer options.",
    "change": "Organizers offer a lower-risk support role with a clear time limit.",
    "model": "Assess the actual demands and choose a role, another contribution or a pause. Clarify limits in advance and review if the risk changes; respect others' decisions about their own participation."
  }
};

  // ── Values Sort Contexts ──
  // Context words retained from the earlier sort; learners now consider their roles together.
  // ══════════════════════════════════════════════════════════════
  var VALUES_SORT = {
    elementary: [
      { id: 'vs1', context: 'Caring for a friendship', values: ['honesty', 'kindness', 'loyalty', 'fairness', 'fun', 'sharing'] },
      { id: 'vs2', context: 'Learning with support', values: ['hard work', 'curiosity', 'honesty', 'respect', 'helpfulness', 'courage'] },
      { id: 'vs3', context: 'Sharing family responsibilities', values: ['love', 'responsibility', 'patience', 'helping out', 'honesty', 'forgiveness'] },
      { id: 'vs4', context: 'Including teammates', values: ['fairness', 'encouragement', 'effort', 'sportsmanship', 'teamwork', 'respect'] },
      { id: 'vs5', context: 'Choosing what\'s right vs. what\'s popular', values: ['courage', 'kindness', 'honesty', 'belonging', 'self-respect', 'peer approval'] },
      { id: 'vs6', context: 'Taking care of the planet', values: ['responsibility', 'care', 'sacrifice', 'creativity', 'teamwork', 'hope'] },
      { id: 'vs6b', context: 'Helping someone who is being bullied', values: ['courage', 'safety', 'kindness', 'loyalty', 'justice', 'self-protection'] },
      { id: 'vs6c', context: 'Making a hard choice about telling the truth', values: ['honesty', 'kindness', 'courage', 'loyalty', 'trust', 'consequences'] }
    ],
    middle: [
      { id: 'vs7', context: 'Building trust in a relationship', values: ['honesty', 'vulnerability', 'consistency', 'boundaries', 'forgiveness', 'communication'] },
      { id: 'vs8', context: 'Standing up against injustice', values: ['courage', 'safety', 'justice', 'solidarity', 'risk', 'empathy'] },
      { id: 'vs9', context: 'Navigating social media responsibly', values: ['authenticity', 'privacy', 'kindness', 'self-expression', 'consent', 'mental health'] },
      { id: 'vs10', context: 'Dealing with peer pressure', values: ['self-respect', 'belonging', 'independence', 'courage', 'identity', 'safety'] },
      { id: 'vs11', context: 'Being a leader vs. being liked', values: ['fairness', 'popularity', 'accountability', 'empathy', 'decisiveness', 'humility'] },
      { id: 'vs12', context: 'Balancing school, friends, and family', values: ['responsibility', 'fun', 'health', 'ambition', 'relationships', 'self-care'] },
      { id: 'vs12b', context: 'Responding to someone who hurt you', values: ['forgiveness', 'justice', 'self-respect', 'empathy', 'boundaries', 'growth'] },
      { id: 'vs12c', context: 'Using technology ethically', values: ['privacy', 'honesty', 'convenience', 'creativity', 'consent', 'responsibility'] }
    ],
    high: [
      { id: 'vs13', context: 'Choosing a career path', values: ['passion', 'financial security', 'impact', 'work-life balance', 'prestige', 'autonomy'] },
      { id: 'vs14', context: 'Deciding what kind of person you want to be', values: ['integrity', 'success', 'kindness', 'ambition', 'authenticity', 'resilience'] },
      { id: 'vs15', context: 'Responding to systemic inequality', values: ['justice', 'personal comfort', 'solidarity', 'pragmatism', 'sacrifice', 'hope'] },
      { id: 'vs16', context: 'Maintaining integrity under pressure', values: ['honesty', 'self-preservation', 'courage', 'loyalty', 'principle', 'pragmatism'] },
      { id: 'vs17', context: 'Building a meaningful life', values: ['purpose', 'pleasure', 'connection', 'achievement', 'freedom', 'contribution'] },
      { id: 'vs18', context: 'Navigating moral gray areas', values: ['compassion', 'justice', 'nuance', 'consistency', 'context', 'humility'] },
      { id: 'vs18b', context: 'Using your privilege to create change', values: ['responsibility', 'humility', 'action', 'solidarity', 'self-awareness', 'risk'] },
      { id: 'vs18c', context: 'Deciding what to sacrifice for your beliefs', values: ['conviction', 'pragmatism', 'courage', 'community', 'self-preservation', 'legacy'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Real-World Decisions ──
  // Famous decisions from history/current events for analysis
  // ══════════════════════════════════════════════════════════════
  var REAL_WORLD = {
    elementary: [
      { id: 'rw1', title: 'Rosa Parks\' Seat', year: '1955', summary: 'Rosa Parks refused to give up her bus seat to a white passenger in Montgomery, Alabama, even though she could be arrested.', decision: 'She chose to stay seated.', valuesTested: 'justice vs. personal safety', impact: 'Her arrest sparked the Montgomery Bus Boycott, which lasted 381 days and helped end segregated buses. Sometimes one small act of courage changes everything.', question: 'What made Rosa Parks\' "small" decision so powerful? Could you risk punishment for something you believe is right?' },
      { id: 'rw2', title: 'Malala\'s Blog', year: '2009', summary: 'Malala Yousafzai, at age 11, started writing a blog about girls\' right to education in Pakistan, even though the Taliban had banned girls from attending school.', decision: 'She chose to speak publicly despite threats.', valuesTested: 'education vs. personal safety', impact: 'She was shot by the Taliban in 2012 but survived and became the youngest Nobel Peace Prize winner. Her Foundation has helped millions of girls access education.', question: 'Malala said "One child, one teacher, one pen, and one book can change the world." Do you believe small actions can make big change?' },
      { id: 'rw3', title: 'Ruby Bridges\' Walk', year: '1960', summary: 'Six-year-old Ruby Bridges was the first Black child to attend an all-white elementary school in the South. Angry crowds screamed at her every day.', decision: 'She chose to keep going to school every day.', valuesTested: 'education and equality vs. fear', impact: 'Ruby walked through those crowds for an entire year. She proved that a child\'s courage could crack a system of hatred. She\'s still alive and advocates for tolerance.', question: 'Ruby was YOUR age. Could you keep walking through angry crowds every day for something you believed in?' },
      { id: 'rw4', title: 'The Kindertransport Decision', year: '1938', summary: 'British families agreed to take in 10,000 Jewish children from Nazi Germany, even though they were strangers from another country who spoke a different language.', decision: 'Ordinary families chose to welcome children they\'d never met.', valuesTested: 'compassion vs. comfort and resources', impact: 'Those 10,000 children survived the Holocaust because strangers opened their homes. Many of the children\'s parents did not survive.', question: 'Would you welcome a stranger into your home if their life depended on it? What would make that decision hard?' },
      { id: 'rw4b', title: 'Harriet Tubman\'s Return', year: '1850', summary: 'After escaping slavery, Harriet Tubman was free in the North. Instead of staying safe, she went back to the South THIRTEEN TIMES to rescue others through the Underground Railroad.', decision: 'She chose to risk recapture to free others.', valuesTested: 'personal safety vs. liberating others', impact: 'She rescued about 70 people, including family and strangers. She was never caught, and later served as a scout and spy during the Civil War.', question: 'She was already free. Why go back into danger? What kind of courage does it take to risk freedom you\'ve already earned?' },
      { id: 'rw4c', title: 'The White Helmets', year: '2013', summary: 'During the Syrian civil war, ordinary people — teachers, bakers, tailors — volunteered to rescue victims from bombed buildings. They ran TOWARD explosions while everyone else ran away.', decision: 'Everyday civilians chose to become rescue workers in a war zone.', valuesTested: 'duty to help vs. personal survival', impact: 'The White Helmets have saved over 100,000 lives. Many volunteers died in the process. They were nominated for the Nobel Peace Prize.', question: 'These weren\'t soldiers or firefighters — they were regular people. What makes someone run toward danger to help a stranger?' }
    ],
    middle: [
      { id: 'rw5', title: 'Greta Thunberg\'s Strike', year: '2018', summary: 'At 15, Greta Thunberg skipped school every Friday to sit outside the Swedish parliament with a sign demanding climate action. Adults said she should be in school.', decision: 'She chose to protest instead of attending class.', valuesTested: 'environmental urgency vs. following rules', impact: 'Her solo protest grew into a global movement with millions of students striking worldwide. She addressed the UN and challenged world leaders.', question: 'Was skipping school the "wrong" way to make a point? Does breaking a small rule for a big cause make it okay?' },
      { id: 'rw6', title: 'The Tuskegee Whistleblower', year: '1972', summary: 'Peter Buxtun, a public health worker, discovered the U.S. government was conducting unethical medical experiments on Black men without their consent. He reported it internally for 6 years before going to the press.', decision: 'He chose to expose the truth even when his employer wanted silence.', valuesTested: 'truth and justice vs. career and institutional loyalty', impact: 'The exposure led to new ethical standards for medical research and laws protecting research subjects. But the damage to the men and their families was already done.', question: 'Why did it take 6 years of internal reporting before Buxtun went public? What does that say about how institutions handle uncomfortable truths?' },
      { id: 'rw7', title: 'The Japanese American Resisters', year: '1942', summary: 'When the U.S. government forced Japanese Americans into internment camps during WWII, some young men refused to be drafted into the military while their families were imprisoned.', decision: 'They chose to resist the draft as a protest against injustice.', valuesTested: 'patriotism vs. protesting injustice', impact: 'They were imprisoned for refusing the draft. Decades later, the government admitted the internment was wrong and officially apologized. The resisters are now seen as civil rights heroes.', question: 'Can you love your country and refuse to fight for it at the same time? What does loyalty really require?' },
      { id: 'rw8', title: 'Aaron Swartz and Open Access', year: '2010', summary: 'Aaron Swartz, a tech prodigy, downloaded millions of academic articles from JSTOR to make them freely available. He believed publicly funded research should be free to the public. He was charged with federal crimes.', decision: 'He chose to challenge a system he believed was unjust, using methods that were illegal.', valuesTested: 'access to knowledge vs. copyright law', impact: 'His case sparked a global movement for open access to research. Many journals now offer free access. But he faced up to 35 years in prison and tragically took his own life.', question: 'If research is funded by taxpayers, should it be free? Does the rightness of a cause justify breaking the law?' },
      { id: 'rw8b', title: 'The Little Rock Nine', year: '1957', summary: 'Nine Black teenagers chose to integrate Little Rock Central High School in Arkansas. They faced mobs, death threats, and needed military escorts. Every day was a battle to simply sit in a classroom.', decision: 'They chose education over safety, dignity over comfort.', valuesTested: 'equality and education vs. physical and emotional safety', impact: 'Their courage forced the nation to confront segregation. The image of Elizabeth Eckford walking through a screaming mob changed public opinion. All nine graduated or earned GEDs despite the trauma.', question: 'These were teenagers YOUR AGE. They went to school knowing they\'d be screamed at. What would have to be worth that much to you?' },
      { id: 'rw8c', title: 'Emmett Till\'s Mother\'s Choice', year: '1955', summary: 'After 14-year-old Emmett Till was murdered in Mississippi, his mother Mamie Till-Mobley made a shocking decision: she demanded an open-casket funeral so the world could see what racism had done to her son.', decision: 'She chose to make her private grief public to expose injustice.', valuesTested: 'privacy and dignity vs. exposing truth to create change', impact: 'The photographs were published in Jet magazine and seen by millions. Historians call it a catalyst for the Civil Rights Movement. Her pain became the nation\'s conscience.', question: 'She turned her worst moment into a tool for justice. What does it cost to transform personal pain into public purpose?' }
    ],
    high: [
      { id: 'rw9', title: 'Snowden\'s Leak', year: '2013', summary: 'Edward Snowden, an NSA contractor, leaked classified documents revealing that the U.S. government was conducting mass surveillance on its own citizens. He fled the country and lives in exile.', decision: 'He chose to expose government surveillance at the cost of his freedom.', valuesTested: 'national security vs. civil liberties and transparency', impact: 'The revelations led to reforms in surveillance laws and a global debate about privacy. Snowden remains in exile, unable to return home.', question: 'Is Snowden a hero or a traitor? Can both be true simultaneously? What price should truth-telling cost?' },
      { id: 'rw10', title: 'The Oppenheimer Dilemma', year: '1945', summary: 'J. Robert Oppenheimer led the team that created the atomic bomb. He believed it would end WWII and save lives by preventing a land invasion of Japan. After seeing the devastation, he said, "I am become death, the destroyer of worlds."', decision: 'He chose to build the bomb, then spent the rest of his life trying to prevent nuclear war.', valuesTested: 'ending a war vs. creating ultimate destruction', impact: 'The bombs killed over 200,000 people. The war ended. Nuclear deterrence may have prevented WWIII — or may have brought humanity closer to extinction.', question: 'If you could end a terrible war but the cost was creating a weapon that could destroy civilization, would you? Can a decision be both right and unforgivable?' },
      { id: 'rw11', title: 'The Facebook Papers', year: '2021', summary: 'Frances Haugen, a Facebook data scientist, leaked internal documents showing the company knew its products harmed teen mental health but prioritized profit. She testified before Congress.', decision: 'She chose to sacrifice her career to expose harm to young people.', valuesTested: 'corporate loyalty vs. public welfare', impact: 'The leaks led to congressional hearings, increased scrutiny of social media, and growing regulation efforts. Instagram added new safety features for teens.', question: 'At what point does an employee\'s loyalty to their employer end and their responsibility to the public begin?' },
      { id: 'rw12', title: 'Desmond Tutu\'s Reconciliation', year: '1996', summary: 'After apartheid ended in South Africa, Archbishop Desmond Tutu led the Truth and Reconciliation Commission. Instead of prosecuting all perpetrators of racial violence, the commission offered amnesty to those who fully confessed their crimes.', decision: 'He chose forgiveness and truth over punishment and justice.', valuesTested: 'restorative justice vs. retributive justice', impact: 'The process allowed South Africa to transition without civil war. Some victims felt heard. Others felt justice was denied. The debate about forgiveness vs. accountability continues.', question: 'Is forgiveness ever owed to someone who harmed you? Can a society heal without punishment? What does justice actually require — suffering or understanding?' },
      { id: 'rw12b', title: 'The Pentagon Papers', year: '1971', summary: 'Daniel Ellsberg, a military analyst, leaked classified documents showing the U.S. government had systematically lied about the Vietnam War. He faced 115 years in prison for espionage and theft.', decision: 'He chose to risk his freedom to give the public truth about a war.', valuesTested: 'national security vs. democratic accountability', impact: 'The revelations accelerated opposition to the war. The Supreme Court ruled for press freedom. Ellsberg\'s charges were dismissed due to government misconduct. The case reshaped the relationship between government secrecy and democracy.', question: 'Ellsberg had access to truth that could save lives but was classified. When does keeping a secret become complicity?' },
      { id: 'rw12c', title: 'Bryan Stevenson\'s Choice', year: '1989', summary: 'Harvard Law graduate Bryan Stevenson turned down lucrative corporate law firms to represent death row inmates in Alabama for almost no pay. Many of his clients were innocent, mentally ill, or had been children when convicted.', decision: 'He chose purpose over prestige, using his privilege to serve the most powerless.', valuesTested: 'career success vs. justice for the marginalized', impact: 'He\'s won reversals for over 140 wrongly condemned prisoners and argued before the Supreme Court to ban life sentences without parole for children. His book "Just Mercy" became a movement.', question: 'What does it mean to be "proximate to suffering"? How does choosing to witness injustice change what you\'re obligated to do about it?' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // Case-based reasoning uses multiple questions without assigning a learner profile.
  var MORAL_REASONING_CASES = {
  "elementary": [
    {
      "id": "materials",
      "title": "One set of materials",
      "situation": "Two groups want the same large drawing tools. One group arrived first; another says the smaller tools are hard for a member to use. The teacher has not heard the request yet.",
      "options": "The groups could ask about suitable tools, plan a turn with support, or change the activity together. Arriving first is one consideration; being able to take part also matters.",
      "lenses": {
        "outcomes": "Taking turns might let both groups work, but waiting could leave too little time. Check how long each group needs and what other tools are usable.",
        "rights": "Everyone needs a usable way to participate. A student does not need to explain private health details to classmates to ask for a tool.",
        "care": "Ask what would help without deciding for the other student. The teacher can arrange support so children do not have to solve the access problem alone.",
        "commitments": "A fair turn-taking plan should also work for someone who needs a particular tool. Ask the teacher to help adapt the plan and explain the next step."
      },
      "change": "The teacher finds another usable set, but preparing it will take a few minutes. Both groups can start planning their pictures while they wait.",
      "model": "The groups could keep planning and ask the teacher to arrange the second set. Check that it really works for the student and that both groups still have enough making time."
    },
    {
      "id": "promise",
      "title": "A promise and a changed need",
      "situation": "A student promised to help tidy the classroom display. Just before cleanup, they learn that their ride is leaving early. Another student worries about doing all the work.",
      "options": "The student could tell the teacher, ask to do a smaller part now, or help plan another way to finish. Leaving without explanation and missing the ride have different costs.",
      "lenses": {
        "outcomes": "Staying might finish the display but miss the ride. Leaving the whole task to a classmate adds work. An adult may be able to arrange a smaller task or another helper.",
        "rights": "The student needs a safe way home, and the classmate deserves a chance to explain the extra workload. The teacher can help with both needs.",
        "care": "Listen to the classmate without making one child responsible for fixing transport or adult schedules. A brief explanation can be enough.",
        "commitments": "Being responsible can mean saying that a promise needs to change and arranging a realistic next step. A promise does not require ignoring a changed need."
      },
      "change": "The teacher says the display can wait until tomorrow, but loose materials must be put somewhere safe before everyone leaves.",
      "model": "Ask the teacher for a quick, shared way to put loose materials away and agree what can wait. Check that the plan fits the ride time and does not quietly leave the whole job to one classmate."
    }
  ],
  "middle": [
    {
      "id": "photo",
      "title": "A photo for the class project",
      "situation": "A group wants to use a funny rehearsal photo in its class presentation. One person pictured says they do not want that image shown. The group likes the photo and has little time left.",
      "options": "The group could use a different image, redesign the slide, or ask the teacher for a brief extension. A majority vote does not settle the pictured person's boundary.",
      "lenses": {
        "outcomes": "Keeping the photo saves editing time but could damage trust and expose someone to unwanted attention. Replacing it costs time; check whether the slide needs a photo at all.",
        "rights": "Respect the person's stated boundary about this image. Permission for a rehearsal photo is not automatically permission to present or post it.",
        "care": "Ask privately what alternative, if any, is comfortable. Do not require a personal explanation or make classmates argue about whether the concern is serious enough.",
        "commitments": "The group committed to a presentation and to working respectfully. A practical redesign can support both; ask the teacher for help if the deadline creates pressure."
      },
      "change": "A teammate finds a photo of the stage with no people in it. It fits the topic, but replacing the slide means changing one sentence in the script.",
      "model": "Use the stage image if it is appropriate for the project and revise the sentence. Confirm that the unwanted image is removed from the presentation; do not pressure the person to approve it to save time."
    },
    {
      "id": "deadline",
      "title": "The unfinished group section",
      "situation": "A group project is due tomorrow. One member has not submitted their section and has stopped replying. Others are frustrated. The group does not know why the section is missing.",
      "options": "They could send one clear check-in, ask the teacher for a workable plan, or redistribute a limited amount of work with agreement. Guessing someone's motive may lead to an unfair response.",
      "lenses": {
        "outcomes": "Redistributing everything might meet the deadline but overload others. Waiting indefinitely also has costs. Check what is essential and what support or extension is possible.",
        "rights": "Describe the missing work accurately without publicly labeling the student lazy. Others can set limits on taking extra work, and credit should reflect contributions fairly.",
        "care": "Offer a private route to explain what support is needed without demanding personal details. The teacher can help when the group cannot contact the member.",
        "commitments": "A shared task needs reliable communication and a fair process for revising roles. Separate the immediate submission plan from a later conversation about what happened."
      },
      "change": "The member replies that they lost access to their device. They have handwritten notes and can share them with the teacher, but cannot type tonight.",
      "model": "Ask whether the notes can be submitted or incorporated with agreed help. Keep credit accurate, check the workload with everyone and ask the teacher to coordinate access rather than assuming classmates must absorb all the work."
    }
  ],
  "high": [
    {
      "id": "event",
      "title": "An event that not everyone can attend",
      "situation": "A student committee has nearly finished planning a low-cost evening event. A member points out that the venue entrance and last bus times may exclude some students. No booking is final yet.",
      "options": "The committee could verify access and transport, compare another venue or time, or revise the event format. Keeping the plan unchanged is also a decision with costs for particular people.",
      "lenses": {
        "outcomes": "Compare who benefits and who carries travel, time or access costs. An attractive attendance estimate can hide exclusion; confirm the details before predicting outcomes.",
        "rights": "A majority preference does not remove the need to address participation barriers. Ask about access needs without requiring students to disclose diagnoses to the committee.",
        "care": "Consult affected students in a way they can choose to use, and include their suggestions without making them responsible for all the planning work.",
        "commitments": "The committee promised a welcoming event and has budget limits. Explain the tradeoff openly, ask staff about available support and set a checkpoint before committing funds."
      },
      "change": "Staff confirm that a different school space is accessible and free earlier in the day, but the planned performer is unavailable then.",
      "model": "Compare whether the event's purpose can be met with a different activity or performer at the accessible time. Seek affected students' input and verify remaining barriers before treating the alternative as inclusive."
    },
    {
      "id": "sponsor",
      "title": "Support with strings attached",
      "situation": "A club is offered supplies for a student exhibition. The sponsor asks for all exhibitors' contact details and personal stories for publicity. Some students want the supplies but are uncomfortable sharing those details.",
      "options": "The club could request different terms, find a smaller plan using available supplies, or decline the offer. Students can distinguish accepting resources from agreeing to publicity.",
      "lenses": {
        "outcomes": "The supplies could improve the exhibition, while unwanted publicity may have lasting effects. Consider a smaller event and check what the sponsor would collect, share and retain.",
        "rights": "Do not trade someone else's personal information for a group benefit. A student should be able to decline publicity without pressure; ask the school to review the proposed arrangement.",
        "care": "Listen privately to concerns and avoid making students justify why disclosure is uncomfortable. Share the work of finding an alternative rather than blaming those who object.",
        "commitments": "Consider honesty with the sponsor, stewardship of resources and the club's responsibility to participants. Staff can help negotiate an arrangement that fits school expectations and student choices."
      },
      "change": "The sponsor agrees to provide fewer supplies in return for a simple acknowledgment on the event sign, with no student information requested.",
      "model": "Ask staff to confirm the revised terms and compare whether the smaller supply amount still supports a worthwhile exhibition. Check that no participant information is collected through another route and communicate the agreed acknowledgment clearly."
    }
  ]
};

  // ── Moral Compass Statements ──
  // Quick-fire agree/disagree to reveal ethical framework
  // Tags: U=utilitarian, D=deontological, V=virtue, C=care
  // ══════════════════════════════════════════════════════════════
  var COMPASS_STATEMENTS = {
    elementary: [
      { id: 'mc1', text: 'It\'s okay to break a rule if it helps someone.', tag: 'U' },
      { id: 'mc2', text: 'You should always tell the truth, even if it hurts someone\'s feelings.', tag: 'D' },
      { id: 'mc3', text: 'A good person does the right thing even when nobody is watching.', tag: 'V' },
      { id: 'mc4', text: 'The most important thing is making sure nobody gets hurt.', tag: 'C' },
      { id: 'mc5', text: 'It\'s okay to take a bigger share if you did more work.', tag: 'U' },
      { id: 'mc6', text: 'Rules should be the same for everyone, no exceptions.', tag: 'D' },
      { id: 'mc7', text: 'Being brave is more important than being safe.', tag: 'V' },
      { id: 'mc8', text: 'You should forgive people even if they don\'t say sorry.', tag: 'C' },
      { id: 'mc9', text: 'It\'s better to help 10 strangers than to help 1 friend.', tag: 'U' },
      { id: 'mc10', text: 'Promises should never be broken, no matter what.', tag: 'D' },
      { id: 'mc11', text: 'The best way to be a good person is to practice being kind every day.', tag: 'V' },
      { id: 'mc12', text: 'Taking care of the people close to you matters more than helping everyone equally.', tag: 'C' }
    ],
    middle: [
      { id: 'mc13', text: 'The right decision is the one that produces the most good for the most people.', tag: 'U' },
      { id: 'mc14', text: 'Some actions are wrong no matter how good the outcome.', tag: 'D' },
      { id: 'mc15', text: 'Character matters more than consequences.', tag: 'V' },
      { id: 'mc16', text: 'We have a stronger obligation to people we\'re connected to than to strangers.', tag: 'C' },
      { id: 'mc17', text: 'If breaking one person\'s trust saves five people from harm, it\'s the right call.', tag: 'U' },
      { id: 'mc18', text: 'You should follow your conscience even if it means a worse outcome.', tag: 'D' },
      { id: 'mc19', text: 'What matters most is what kind of person your choices make you.', tag: 'V' },
      { id: 'mc20', text: 'Empathy should guide decisions more than logic.', tag: 'C' },
      { id: 'mc21', text: 'A small lie that prevents a lot of suffering is morally okay.', tag: 'U' },
      { id: 'mc22', text: 'Justice means treating everyone the same way regardless of context.', tag: 'D' },
      { id: 'mc23', text: 'The goal of ethics is to become a better person, not just to do the right thing.', tag: 'V' },
      { id: 'mc24', text: 'The worst thing you can do to someone is abandon them when they need you.', tag: 'C' }
    ],
    high: [
      { id: 'mc25', text: 'The morality of an action is determined entirely by its consequences.', tag: 'U' },
      { id: 'mc26', text: 'There are moral absolutes that hold regardless of circumstances.', tag: 'D' },
      { id: 'mc27', text: 'Ethics is about cultivating wisdom, courage, and temperance — not following rules.', tag: 'V' },
      { id: 'mc28', text: 'Moral reasoning that ignores relationships and context is incomplete.', tag: 'C' },
      { id: 'mc29', text: 'One innocent person\'s suffering is acceptable if it prevents greater suffering.', tag: 'U' },
      { id: 'mc30', text: 'You should never use a person merely as a means to an end.', tag: 'D' },
      { id: 'mc31', text: 'A society of virtuous people needs fewer laws than a society of rule-followers.', tag: 'V' },
      { id: 'mc32', text: 'Power creates special moral obligations — the strong owe more to the vulnerable.', tag: 'C' },
      { id: 'mc33', text: 'The trolley problem has an objectively correct answer.', tag: 'U' },
      { id: 'mc34', text: 'Human dignity is inviolable, even when violating it would save lives.', tag: 'D' },
      { id: 'mc35', text: 'Who you are matters more than what you do in any single moment.', tag: 'V' },
      { id: 'mc36', text: 'Abstract principles matter less than the actual suffering of real people.', tag: 'C' }
    ]
  };

  var COMPASS_FRAMEWORKS = {
    U: { name: 'Consequentialist', icon: '\uD83D\uDCCA', color: '#3b82f6', desc: 'You tend to evaluate decisions by their outcomes. The right choice is the one that produces the most good. You\'re drawn to practical thinking and ask "What will actually happen?" Philosophers like John Stuart Mill thought this way.' },
    D: { name: 'Principled / Rule-Based', icon: '\uD83D\uDCDC', color: '#8b5cf6', desc: 'You believe in moral rules and principles that hold regardless of outcomes. Some things are right or wrong no matter what. You value consistency and fairness. Immanuel Kant is the most famous thinker in this tradition.' },
    V: { name: 'Character-Focused', icon: '\uD83C\uDFAD', color: '#22c55e', desc: 'You focus on who you become through your choices rather than specific rules or outcomes. Being a good person — brave, wise, kind, honest — is the goal. Aristotle and many ancient traditions emphasized this.' },
    C: { name: 'Care-Centered', icon: '\uD83D\uDC9C', color: '#ec4899', desc: 'You center relationships, empathy, and responsibility to others in your moral thinking. Context matters. The people involved matter. Caring for others — especially the vulnerable — is at the heart of ethics for you. Carol Gilligan pioneered this framework.' }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_decision',    icon: '\u2696\uFE0F', name: 'Decision Maker',       desc: 'Complete your first decision tree' },
    { id: 'decision_5',        icon: '\uD83E\uDDE0', name: 'Thoughtful Thinker',   desc: 'Complete 5 decision trees' },
    { id: 'first_dilemma',     icon: '\uD83E\uDD14', name: 'Moral Explorer',       desc: 'Engage with your first ethical dilemma' },
    { id: 'dilemma_5',         icon: '\uD83D\uDCA1', name: 'Ethics Scholar',       desc: 'Engage with 5 ethical dilemmas' },
    { id: 'first_consequence', icon: '\uD83D\uDD17', name: 'Consequence Tracker',  desc: 'Complete your first consequence map' },
    { id: 'consequence_3',     icon: '\uD83C\uDF10', name: 'Ripple Effect Master', desc: 'Complete 3 consequence maps' },
    { id: 'first_bias',        icon: '\uD83D\uDD0D', name: 'Bias Spotter',         desc: 'Historical award for revealing an earlier bias card' },
    { id: 'bias_all',          icon: '\uD83E\uDDD0', name: 'Clear Thinker',        desc: 'Historical award based on earlier card reveals; not evidence of bias-free thinking' },
    { id: 'ai_advisor',        icon: '\u2728',        name: 'Wisdom Seeker',        desc: 'Use the AI decision advisor' },
    { id: 'total_10',          icon: '\uD83C\uDFC6', name: 'Master Decider',       desc: 'Complete 10 activities across all tabs' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Decision Streak',      desc: 'Practice 3 days in a row' },
    { id: 'values_explorer',   icon: '\uD83D\uDC9C', name: 'Values Explorer',      desc: 'Consider 3+ different values in one decision' },
    { id: 'first_sort',        icon: '\uD83C\uDCCF', name: 'Priority Setter',      desc: 'Earlier activity: completed a values sort' },
    { id: 'sort_3',            icon: '\uD83C\uDFAF', name: 'Values Architect',     desc: 'Earlier activity: completed 3 values sorts' },
    { id: 'first_realworld',   icon: '\uD83C\uDF0D', name: 'History Student',      desc: 'Analyze your first real-world decision' },
    { id: 'realworld_all',     icon: '\uD83C\uDFDB\uFE0F', name: 'Moral Historian', desc: 'Study all real-world decisions in your grade band' },
    { id: 'compass_done',      icon: '\uD83E\uDDED', name: 'Moral Compass',     desc: 'Historical award from the earlier Moral Compass quiz' },
    { id: 'compass_balanced',  icon: '\u2696\uFE0F', name: 'Balanced Thinker',  desc: 'Historical award from earlier quiz scores; not a measure of reasoning quality' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('decisions', {
    icon: '\u2696\uFE0F',
    label: 'Decision Workshop',
    desc: 'Practice structured decision-making, explore ethical dilemmas, map consequences, and spot cognitive biases.',
    color: 'amber',
    category: 'responsible-decision-making',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _decT = (ctx && ctx.theme) || {};
      var _decHC = !!_decT.isContrast, _decL = !_decHC && !_decT.isDark;
      var _dec_BGL = {'#1e293b':'#ffffff','#0f172a':'#f8fafc','#334155':'#e2e8f0'}, _dec_BGH = {'#1e293b':'#000000','#0f172a':'#000000','#15803d':'#000000','#334155':'#000000','#ffffff':'#000000','#fffbeb':'#000000','#f1f5f9':'#000000'};
      var _dec_FGL = {'#94a3b8':'#64748b','#cbd5e1':'#334155','#f1f5f9':'#0f172a','#e2e8f0':'#1e293b','#818cf8':'#4338ca','#f87171':'#b91c1c','#fbbf24':'#854d0e'}, _dec_FGH = {'#94a3b8':'#ffff00','#0f172a':'#ffff00','#cbd5e1':'#ffff00','#f1f5f9':'#ffff00','#e2e8f0':'#ffff00','#fff':'#ffff00','#818cf8':'#ffff00','#60a5fa':'#ffff00','#f87171':'#ffff00','#fbbf24':'#ffff00','#fb923c':'#ffff00','#22c55e':'#ffff00','#f59e0b':'#ffff00','#8b5cf6':'#ffff00','#ef4444':'#ffff00','#3b82f6':'#ffff00','#78350f':'#ffff00','#475569':'#ffff00'};
      var _dec_FGD = {'#94a3b8':'#cbd5e1'}, _dec_BDL = {'#334155':'#e2e8f0','#0f172a':'#cbd5e1'}, _dec_BDH = {'#334155':'#ffff00','#f59e0b':'#ffff00','#e2e8f0':'#ffff00','#0f172a':'#ffff00','#fcd34d':'#ffff00','#cbd5e1':'#ffff00'};
      var _decBg = function(h){ return _decHC ? (_dec_BGH[h]||h) : (_decL ? (_dec_BGL[h]||h) : h); };
      var _decFg = function(h){ return _decHC ? (_dec_FGH[h]||h) : (_decL ? (_dec_FGL[h]||h) : (_dec_FGD[h]||h)); };
      var _decBd = function(h){ return _decHC ? (_dec_BDH[h]||h) : (_decL ? (_dec_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var band = ctx.gradeBand || 'elementary';
      var onSafetyFlag = ctx.onSafetyFlag || null;

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.decisions) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('decisions', key); }
        else { if (ctx.update) ctx.update('decisions', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'consequence';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Decision Tree state
      var dtIdx          = d.dtIdx || 0;
      var dtStep         = d.dtStep || 0; // 0=read, 1=values, 2=options, 3=choose, 4=reflect
      var dtValues       = d.dtValues || [];
      var dtChoice       = d.dtChoice || null;
      var dtReflection   = d.dtReflection || '';
      var dtAiResp       = d.dtAiResp || null;
      var _decisionsTier = d._decisionsTier || 0;
      var dtAiLoad       = d.dtAiLoad || false;
      var dtCompleted    = d.dtCompleted || 0;

      // Ethical Dilemma state
      var edIdx          = d.edIdx || 0;
      var edSideA        = d.edSideA || '';
      var edSideB        = d.edSideB || '';
      var edVerdict      = d.edVerdict || '';
      var edAiResp       = d.edAiResp || null;
      var edAiLoad       = d.edAiLoad || false;
      var edCompleted    = d.edCompleted || 0;

      // Consequence Mapper state
      var csIdx          = d.csIdx || 0;
      var csShort        = d.csShort || '';
      var csMid          = d.csMid || '';
      var csLong         = d.csLong || '';
      var csSaved        = d.csSaved || false;
      var csCompleted    = d.csCompleted || 0;

      // Bias Check state
      var biasIdx        = d.biasIdx || 0;
      var biasRevealed   = d.biasRevealed || false;
      var biasReflection = d.biasReflection || '';
      var biasViewed     = d.biasViewed || 0;

      // AI Advisor state
      var advPrompt      = d.advPrompt || '';
      var advResponse    = d.advResponse || null;
      var advLoading     = d.advLoading || false;

      // Values Sort state
      var vsIdx          = d.vsIdx || 0;
      var vsRanking      = d.vsRanking || [];
      var vsCompleted    = d.vsCompleted || 0;

      // Moral Compass state
      var mcAnswers      = d.mcAnswers || {};  // { mc1: 'agree', mc2: 'disagree', ... }
      var mcDone         = d.mcDone || false;
      var mcAiResp       = d.mcAiResp || null;
      var mcAiLoad       = d.mcAiLoad || false;

      // Real-World Decisions state
      var rwIdx          = d.rwIdx || 0;
      var rwReflection   = d.rwReflection || '';
      var rwAiResp       = d.rwAiResp || null;
      var rwAiLoad       = d.rwAiLoad || false;
      var rwCompleted    = d.rwCompleted || 0;

      // Practice log & badges
      var practiceLog    = d.practiceLog || [];
      var earnedBadges   = d.earnedBadges || {};
      var showBadgePopup = d.showBadgePopup || null;
      var showBadgesPanel = d.showBadgesPanel || false;
      var decisionBadgeDialogRef = React.useRef(null);
      var decisionBadgeDialogOpenerRef = React.useRef(null);
      var decisionBadgeDialogOpen = !!showBadgePopup || !!showBadgesPanel;

      function closeDecisionBadgeDialogs() {
        upd('showBadgePopup', null);
        upd('showBadgesPanel', false);
      }

      React.useEffect(function() {
        if (!decisionBadgeDialogOpen) return undefined;
        var opener = document.activeElement;
        if (opener && typeof opener.focus === 'function') decisionBadgeDialogOpenerRef.current = opener;

        function getDecisionDialogFocusable(dialog) {
          if (!dialog) return [];
          return Array.prototype.filter.call(
            dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
            function(el) { return !el.hidden && el.getAttribute('aria-hidden') !== 'true'; }
          );
        }

        function handleDecisionBadgeDialogKeyDown(event) {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeDecisionBadgeDialogs();
            return;
          }
          if (event.key !== 'Tab') return;
          var dialog = decisionBadgeDialogRef.current;
          var focusable = getDecisionDialogFocusable(dialog);
          if (!focusable.length) {
            event.preventDefault();
            if (dialog) dialog.focus();
            return;
          }
          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
          }
        }

        document.addEventListener('keydown', handleDecisionBadgeDialogKeyDown, true);
        var focusTimer = setTimeout(function() {
          var dialog = decisionBadgeDialogRef.current;
          var focusable = getDecisionDialogFocusable(dialog);
          if (focusable.length) focusable[0].focus();
          else if (dialog) dialog.focus();
        }, 0);

        return function() {
          clearTimeout(focusTimer);
          document.removeEventListener('keydown', handleDecisionBadgeDialogKeyDown, true);
          var previous = decisionBadgeDialogOpenerRef.current;
          decisionBadgeDialogOpenerRef.current = null;
          if (previous && previous.isConnected !== false && typeof previous.focus === 'function') {
            setTimeout(function() { previous.focus(); }, 0);
          }
        };
      }, [decisionBadgeDialogOpen]);

      // ── Helpers ──
      function tryAwardBadge(badgeId) {
        if (earnedBadges[badgeId]) return;
        var newBadges = Object.assign({}, earnedBadges);
        newBadges[badgeId] = Date.now();
        upd('earnedBadges', newBadges);
        var badge = BADGES.find(function(b) { return b.id === badgeId; });
        if (badge) {
          upd('showBadgePopup', badgeId);
          if (soundEnabled) sfxBadge();
          addToast(badge.icon + ' Badge earned: ' + badge.name + '!', 'success');
          if (announceToSR) announceToSR('Badge earned: ' + badge.name);
          awardXP(25);
        }
      }

      function logPractice(type, id) {
        var entry = { type: type, id: id, timestamp: Date.now() };
        var newLog = practiceLog.concat([entry]);
        upd('practiceLog', newLog);
        var totalActivities = dtCompleted + edCompleted + csCompleted + biasViewed + vsCompleted + rwCompleted;
        if (totalActivities + 1 >= 10) tryAwardBadge('total_10');
        var daySet = {};
        newLog.forEach(function(e) { daySet[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
        var today = new Date();
        var streak = 0;
        for (var si = 0; si < 30; si++) {
          var chk = new Date(today);
          chk.setDate(chk.getDate() - si);
          if (daySet[chk.toISOString().slice(0,10)]) { streak++; } else if (si > 0) { break; }
        }
        if (streak >= 3) tryAwardBadge('streak_3');
      }

      var ACCENT = _decFg('#f59e0b');
      var ACCENT_TEXT = _decHC ? '#000000' : _decFg('#0f172a');
      var ACCENT_DIM = '#f59e0b22';
      var ACCENT_MED = '#f59e0b44';

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'decision', label: '\uD83C\uDF33 Decision Tree' },
        { id: 'dilemma',  label: '\u2696\uFE0F Ethical Dilemmas' },
        { id: 'consequence', label: '\uD83D\uDD17 Consequence Map' },
        { id: 'bias',     label: '\uD83E\uDDE0 Bias Check' },
        { id: 'values',   label: '\uD83C\uDCCF Values Sort' },
        { id: 'realworld', label: '\uD83C\uDF0D Real-World Decisions' },
        { id: 'compass',  label: '\uD83E\uDDED Moral reasoning' },
        { id: 'advisor',  label: '\u2728 AI Advisor' },
        { id: 'progress', label: '\uD83D\uDCCA Progress' },
        { id: 'print',    label: '\uD83D\uDDA8 Print' }
      ];

      var tabBar = h('div', {
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        h('div', { role: 'tablist', 'aria-label': 'Decision Making tabs', style: { display: 'flex', gap: 2 } },
          tabs.map(function(t) {
          var isActive = activeTab === t.id;
          return h('button', { 'aria-label': t.label,
            key: t.id,
            onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
            onFocus: function(ev) { if (ev.currentTarget && ev.currentTarget.scrollIntoView) ev.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); },
            'aria-selected': isActive,
            role: 'tab',
            style: {
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
              background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? _decFg(ACCENT) : _decFg('#94a3b8'),
              transition: 'all 0.15s'
            }
          }, t.label);
          })
        ),
        // Sound toggle
        h('button', { 'aria-label': 'Sound effects', 'aria-pressed': !!soundEnabled,
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: _decFg('#94a3b8') },
          title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        // Badge counter
        h('button', { 'aria-label': Object.keys(earnedBadges).length + '/' + BADGES.length + ' badges earned', 'aria-expanded': !!showBadgesPanel,
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: _decFg('#94a3b8'), position: 'relative' }
        },
          '\uD83C\uDFC5',
          Object.keys(earnedBadges).length > 0 && h('span', {             style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: _decFg(ACCENT_TEXT), borderRadius: '50%', width: 14, height: 14, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }, Object.keys(earnedBadges).length)
        )
      );

      // ── Topic-accent hero band per tab ──
      var heroBand = (function() {
        var TAB_META = {
          decision:    { accent: '#16a34a', soft: 'rgba(22,163,74,0.14)',  icon: '\uD83C\uDF33', title: 'Decision Tree \u2014 branch the choice + the consequences', hint: 'List options \u2192 list outcomes per option \u2192 weight by likelihood + magnitude. Decision-theory framework (Howard 1968) used by everyone from doctors to portfolio managers. Slows snap judgments without paralyzing them.' },
          dilemma:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.14)', icon: '\u2696',         title: 'Ethical Dilemmas \u2014 trolley problems + Heinz', hint: 'Kohlberg 1958: 6 stages of moral reasoning, from \u201Cwill I get caught\u201D up through universal principles. Most adults reason at stages 3-4 day-to-day. Practicing dilemmas raises the ceiling without forcing one answer.' },
          consequence: { accent: _decFg('#fbbf24'), soft: 'rgba(234,88,12,0.14)', icon: '\uD83D\uDD17', title: 'Consequence Map - possibilities, not predictions', hint: 'Consider different outcomes, whose needs are affected, and what the plan depends on. New information can justify a change. An outcome alone does not tell you whether the original reasoning was sound.' },
          bias:        { accent: '#0891b2', soft: 'rgba(8,145,178,0.14)', icon: '\uD83E\uDDE0', title: 'Bias Check — test an interpretation', hint: 'Separate observations from guesses, consider another explanation and choose a relevant check. Recognizing a pattern does not prove a person is biased or make an answer correct.' },
          values:      { accent: '#d97706', soft: 'rgba(217,119,6,0.14)', icon: '\uD83C\uDCCF', title: 'Values Sort — values in context', hint: 'Explore what matters together, where priorities pull apart and what boundaries need protection. Try a changed situation and explain your next step.' },
          realworld:   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', icon: '\uD83C\uDF0D', title: 'Real-World \u2014 college, money, relationships',     hint: 'Higher-stakes practice scenarios. Pre-rehearse decisions you\u2019ll actually face: which college, asking someone out, whether to share something on social. \u201CFuture self interview\u201D \u2014 ask the version of you in 5 years what they wish you\u2019d done.' },
          compass:     { accent: '#a855f7', soft: 'rgba(168,85,247,0.14)', icon: '\uD83E\uDDED', title: 'Moral reasoning — compare the reasons', hint: 'Explore a fictional case through several lenses. Notice uncertainty, boundaries and support, then reconsider when the context changes. You can think or discuss without writing.' },
          advisor:     { accent: '#ec4899', soft: 'rgba(236,72,153,0.14)', icon: '\u2728',         title: 'AI Advisor \u2014 a sounding board, not the boss',     hint: 'Type the situation; the AI walks the framework with you. Use it to see angles you missed, not to outsource the call. Final decisions still go through YOUR values + your context, not a model\u2019s training data.' },
          progress:    { accent: _decFg('#f59e0b'), soft: 'rgba(245,158,11,0.14)', icon: '\uD83D\uDCCA', title: 'Progress \u2014 patterns over time',                   hint: 'Which decisions did you regret? Which felt right? Track over weeks: most patterns repeat. Spotting your patterns turns reactive choices into deliberate ones. Self-knowledge IS the upgrade.' }
        };
        var meta = TAB_META[activeTab] || TAB_META.decision;
        return h('div', {
          style: {
            margin: '8px 12px 12px',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%), #0f172a',
            border: '1px solid ' + meta.accent + '55',
            borderLeft: '4px solid ' + meta.accent,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
          }
        },
          h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
          h('div', { style: { flex: 1, minWidth: 220 } },
            h('h3', { style: { color: _decFg(meta.accent), fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
            h('p', { style: { margin: '3px 0 0', color: _decFg('#cbd5e1'), fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })();

      // ── Badge Popup ──
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', { ref: decisionBadgeDialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'decision-badge-earned-title', 'aria-describedby': 'decision-badge-earned-desc', tabIndex: -1, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' }, onClick: function(e) { if (e.target === e.currentTarget) closeDecisionBadgeDialogs(); } },
            h('div', { style: { position: 'relative', background: _decBg('#1e293b'), border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', animation: 'fadeIn 0.3s', maxWidth: 300 } },
              h('button', { 'aria-label': 'Close badge announcement', onClick: closeDecisionBadgeDialogs, style: { position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: 22, background: _decBg('#334155'), color: _decFg('#cbd5e1'), border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '×'),
              h('div', { style: { fontSize: 56, marginBottom: 10 }, 'aria-hidden': 'true' }, popBadge.icon),
              h('h3', { id: 'decision-badge-earned-title', style: { fontSize: 18, fontWeight: 700, color: _decFg('#f1f5f9'), margin: '0 0 6px' } }, 'Badge earned: ' + popBadge.name),
              h('div', { id: 'decision-badge-earned-desc', style: { fontSize: 12, color: _decFg('#94a3b8') } }, popBadge.desc)
            )
          );
        }
      }

      // ── Badges panel ──
      if (showBadgesPanel) {
        badgePopup = h('div', { ref: decisionBadgeDialogRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'decision-badges-panel-title', tabIndex: -1, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, background: 'rgba(0,0,0,0.5)' }, onClick: function(e) { if (e.target === e.currentTarget) closeDecisionBadgeDialogs(); } },
          h('div', { style: { position: 'relative', background: _decBg('#1e293b'), border: '1px solid #334155', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto' } },
            h('button', { 'aria-label': 'Close badges panel', onClick: closeDecisionBadgeDialogs, style: { position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: 22, background: _decBg('#334155'), color: _decFg('#cbd5e1'), border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '×'),
            h('h3', { id: 'decision-badges-panel-title', style: { textAlign: 'center', color: _decFg('#f1f5f9'), marginBottom: 16, fontSize: 16 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', { key: b.id, style: { padding: 12, borderRadius: 10, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : _decBg('#334155')), textAlign: 'center', opacity: earned ? 1 : 0.5 } },
                  h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 11, fontWeight: 600, color: earned ? _decFg('#f1f5f9') : _decFg('#94a3b8'), marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 10, color: _decFg('#94a3b8'), marginTop: 2 } }, b.desc)
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Decision Tree ──
      // Guided 5-step decision-making process
      // ══════════════════════════════════════════════════════════
      var dtContent = null;
      if (activeTab === 'decision') {
        var dtScenarios = DECISION_SCENARIOS[band] || DECISION_SCENARIOS.elementary;
        var curDt = dtScenarios[dtIdx % dtScenarios.length];
        var dtSteps = [
          { label: 'Read', icon: '\uD83D\uDCD6' },
          { label: 'Values', icon: '\uD83D\uDC9C' },
          { label: 'Options', icon: '\uD83D\uDD00' },
          { label: 'Choose', icon: '\u2705' },
          { label: 'Reflect', icon: '\uD83D\uDCAD' }
        ];

        dtContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _decFg('#f1f5f9'), fontSize: 18 } }, '\uD83C\uDF33 Decision Tree'),
          h('p', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } },
            'Walk through a structured decision-making process step by step.'
          ),
          // Scenario counter
          h('div', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((dtIdx % dtScenarios.length) + 1) + ' of ' + dtScenarios.length +
            (dtCompleted > 0 ? ' \u00B7 ' + dtCompleted + ' completed' : '')
          ),
          // Step indicator
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 } },
            dtSteps.map(function(st, i) {
              var done = i < dtStep;
              var current = i === dtStep;
              return h('div', {
                key: i,
                style: { display: 'flex', alignItems: 'center', gap: 4 }
              },
                h('div', {
                  style: {
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    background: done ? _decFg('#22c55e') : current ? '#b45309' : _decBg('#334155'),
                    color: _decFg(done) || current ? _decFg('#fff') : _decFg('#94a3b8'), fontWeight: 600, transition: 'all 0.2s'
                  }
                }, done ? '\u2713' : st.icon),
                i < dtSteps.length - 1 && h('div', { style: { width: 16, height: 2, background: done ? _decFg('#22c55e') : _decBg('#334155') } })
              );
            })
          ),

          // Step 0: Read the scenario
          dtStep === 0 && h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: _decFg(ACCENT), fontSize: 15, marginBottom: 10, fontWeight: 700 } }, curDt.title),
            h('p', { style: { fontSize: 14, color: _decFg('#e2e8f0'), lineHeight: 1.7, marginBottom: 16 } }, curDt.situation),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'I’ve read it',
                onClick: function() { upd('dtStep', 1); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: _decFg(ACCENT_TEXT), fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'I\'ve read it \u2192')
            )
          ),

          // Step 1: Identify values at stake
          dtStep === 1 && h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: _decFg(ACCENT), fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDC9C What values are at stake?'),
            h('p', { style: { color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } }, 'Select all the values that are involved in this decision:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 } },
              ['honesty', 'kindness', 'fairness', 'loyalty', 'courage', 'respect', 'responsibility', 'safety', 'inclusion', 'integrity', 'compassion', 'independence', 'generosity', 'self-care'].map(function(v) {
                var selected = dtValues.indexOf(v) >= 0;
                return h('button', { 
                  key: v,
                  onClick: function() {
                    var newVals = selected ? dtValues.filter(function(x) { return x !== v; }) : dtValues.concat([v]);
                    upd('dtValues', newVals);
                    if (newVals.length >= 3) tryAwardBadge('values_explorer');
                    if (soundEnabled) sfxClick();
                  },
                  style: {
                    padding: '6px 12px', borderRadius: 20, border: '1px solid ' + (selected ? ACCENT : _decBg('#334155')),
                    background: selected ? ACCENT_DIM : 'transparent', color: selected ? _decFg(ACCENT) : _decFg('#94a3b8'),
                    fontSize: 12, cursor: 'pointer', fontWeight: selected ? 600 : 400
                  }
                }, v);
              })
            ),
            h('p', { style: { color: _decFg('#94a3b8'), fontSize: 11, marginBottom: 12 } },
              'The scenario involves: ' + curDt.values.join(', ')
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Next: Options',
                onClick: function() {
                  if (dtValues.length === 0) { addToast('Select at least one value!', 'info'); return; }
                  upd('dtStep', 2); if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: _decFg(ACCENT_TEXT), fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'Next: Options \u2192')
            )
          ),

          // Step 2: Consider options
          dtStep === 2 && h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: _decFg(ACCENT), fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDD00 What are your options?'),
            h('p', { style: { color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } }, 'Think about what you could do. Here are some possibilities:'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
              curDt.options.map(function(opt, i) {
                return h('div', {                   key: i,
                  style: { padding: '12px 16px', borderRadius: 10, background: _decBg('#1e293b'), border: '1px solid #334155', color: _decFg('#e2e8f0'), fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }
                },
                  h('span', { style: { color: _decFg(ACCENT), fontWeight: 700, fontSize: 14 } }, String.fromCharCode(65 + i) + '.'),
                  opt
                );
              })
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Next: Choose',
                onClick: function() { upd('dtStep', 3); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: _decFg(ACCENT_TEXT), fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'Next: Choose \u2192')
            )
          ),

          // Step 3: Make your choice
          dtStep === 3 && h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: _decFg(ACCENT), fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\u2705 What would you choose?'),
            h('p', { style: { color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } }, 'Pick the option that best aligns with the values you identified:'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
              curDt.options.map(function(opt, i) {
                var isChosen = dtChoice === i;
                return h('button', { 'aria-label': String.fromCharCode(65 + i) + '. ' + opt,
                  key: i,
                  onClick: function() { upd('dtChoice', i); if (soundEnabled) sfxClick(); },
                  style: {
                    padding: '12px 16px', borderRadius: 10, border: '2px solid ' + (isChosen ? ACCENT : _decBg('#334155')),
                    background: isChosen ? ACCENT_DIM : _decBg('#1e293b'), color: _decFg('#e2e8f0'), fontSize: 13, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { color: isChosen ? _decFg(ACCENT) : _decFg('#94a3b8'), fontWeight: 700, fontSize: 14 } }, String.fromCharCode(65 + i) + '.'),
                  opt
                );
              })
            ),
            dtChoice != null && h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Next: Reflect',
                onClick: function() { upd('dtStep', 4); if (soundEnabled) sfxThink(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: _decFg(ACCENT_TEXT), fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'Next: Reflect \u2192')
            )
          ),

          // Step 4: Reflect with AI
          dtStep === 4 && h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: _decFg(ACCENT), fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDCAD Reflect on your choice'),
            h('p', { style: { color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } },
              'You chose: "' + curDt.options[dtChoice] + '". Why? What might happen as a result?'
            ),
            h('textarea', {
              value: dtReflection,
              onChange: function(e) { upd('dtReflection', e.target.value); },
              'aria-label': 'Decision tree reflection',
              placeholder: band === 'elementary' ? 'I chose this because... (Tip: don\'t share personal info like your full name, address, or school)' : 'I chose this because... The consequences might be... It connects to the values of... (Tip: keep it general — don\'t share personal info like names, addresses, or contact details)',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }
            }),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
              // Get AI analysis
              h('button', { 'aria-label': 'Get AI analysis',
                onClick: function() {
                  if (!dtReflection.trim()) { addToast('Write a bit about why you chose this!', 'info'); return; }
                  if (!callGemini) { addToast('AI advisor not available.', 'error'); return; }
                  upd('dtAiLoad', true);
                  var prompt = 'You are a decision-making coach for ' + band + ' school students.\n\n' +
                    'SCENARIO: "' + curDt.title + '"\n' + curDt.situation + '\n' +
                    'VALUES AT STAKE: ' + (dtValues.length > 0 ? dtValues.join(', ') : curDt.values.join(', ')) + '\n' +
                    'OPTIONS: ' + curDt.options.join(' | ') + '\n' +
                    'STUDENT CHOSE: "' + curDt.options[dtChoice] + '"\n' +
                    'THEIR REASONING: "' + dtReflection + '"\n\n' +
                    'Provide warm, constructive feedback:\n' +
                    '1. Acknowledge what values their choice reflects\n' +
                    '2. Note one consequence they may not have considered (positive or negative)\n' +
                    '3. Briefly mention what a different choice might look like and what values IT would honor\n' +
                    '4. End with an affirming observation about their decision-making process\n\n' +
                    'Use ' + (band === 'elementary' ? 'simple, warm language for ages 5-10.' : band === 'middle' ? 'clear language for ages 11-14.' : 'nuanced language for ages 15-18.') + '\n' +
                    'Never say their choice was wrong. This is about process, not answers. Keep it under 200 words.';
                  // Triangulated safety assessment of the student's reasoning,
                  // fired in parallel with the feedback generation.
                  if (window.SelHub && window.SelHub.assessSafety) {
                    window.SelHub.assessSafety(dtReflection, band, 'decisions', callGemini)
                      .catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
                      .then(function(_safety) {
                        _safety = _safety || { tier: 0 };
                        if (_safety.tier >= 2 && onSafetyFlag) {
                          onSafetyFlag({
                            category: 'ai_decisions_' + (_safety.category || 'concerning'),
                            match: _safety.rationale || 'SEL decisions safety concern',
                            severity: _safety.tier >= 3 ? 'critical' : 'medium',
                            source: 'sel_decisions',
                            context: dtReflection.substring(0, 100),
                            timestamp: new Date().toISOString(),
                            aiGenerated: true,
                            confidence: _safety.tier >= 3 ? 0.9 : 0.7,
                            tier: _safety.tier
                          });
                        }
                        upd('_decisionsTier', _safety.tier || 0);
                      });
                  }
                  callGemini(prompt).then(function(result) {
                    var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                    upd('dtAiResp', resp);
                    upd('dtAiLoad', false);
                  }).catch(function(err) {
                    upd('dtAiLoad', false);
                    addToast('Error: ' + err.message, 'error');
                  });
                },
                disabled: dtAiLoad,
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: dtAiLoad ? _decBg('#334155') : '#6366f1', color: _decFg('#fff'), fontWeight: 600, fontSize: 13, cursor: dtAiLoad ? 'default' : 'pointer' }
              }, dtAiLoad ? 'Analyzing...' : '\u2728 Get Feedback'),
              // Complete
              h('button', { 'aria-label': 'Complete & Next',
                onClick: function() {
                  var newDone = dtCompleted + 1;
                  upd('dtCompleted', newDone);
                  logPractice('decision', curDt.id);
                  awardXP(20);
                  tryAwardBadge('first_decision');
                  if (newDone >= 5) tryAwardBadge('decision_5');
                  if (soundEnabled) sfxCorrect();
                  addToast('Decision tree complete!', 'success');
                  // Auto advance
                  upd({ dtIdx: dtIdx + 1, dtStep: 0, dtValues: [], dtChoice: null, dtReflection: '', dtAiResp: null });
                  ctx.announceToSR && ctx.announceToSR('Decision tree completed, next scenario loaded');
                },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: _decBg('#15803d'), color: _decFg('#fff'), fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\u2705 Complete & Next')
            ),
            // AI Response
            (_decisionsTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) ? window.SelHub.renderCrisisResources(h, band) : null,
            dtAiResp && h('div', { style: { padding: 16, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid #6366f144', marginTop: 16 } },
              h('p', { style: { fontSize: 10, color: _decFg('#818cf8'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2728 Decision Analysis'),
              h('div', { style: { fontSize: 13, color: _decFg('#e2e8f0'), lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, dtAiResp)
            )
          ),

          // Skip link
          dtStep === 0 && h('div', { style: { textAlign: 'center', marginTop: 4 } },
            h('button', { 'aria-label': 'Skip to another scenario',
              onClick: function() {
                upd({ dtIdx: dtIdx + 1, dtStep: 0, dtValues: [], dtChoice: null, dtReflection: '', dtAiResp: null });
                if (soundEnabled) sfxClick();
              },
              style: { background: 'none', border: 'none', color: _decFg('#94a3b8'), fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
            }, 'Skip to another scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Ethical Dilemmas ──
      // ══════════════════════════════════════════════════════════
      var edContent = null;
      if (activeTab === 'dilemma') {
        var edScenarios = ETHICAL_DILEMMAS[band] || ETHICAL_DILEMMAS.elementary;
        var curEd = edScenarios[edIdx % edScenarios.length];

        edContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _decFg('#f1f5f9'), fontSize: 18 } }, '\u2696\uFE0F Ethical Dilemmas'),
          h('p', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } },
            'No clear right answer \u2014 weigh competing values and defend your reasoning.'
          ),
          h('div', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 11, marginBottom: 12 } },
            'Dilemma ' + ((edIdx % edScenarios.length) + 1) + ' of ' + edScenarios.length +
            (edCompleted > 0 ? ' \u00B7 ' + edCompleted + ' explored' : '')
          ),
          // Dilemma card
          h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: _decFg(ACCENT), fontSize: 15, marginBottom: 10, fontWeight: 700 } }, curEd.title),
            h('p', { style: { fontSize: 14, color: _decFg('#e2e8f0'), lineHeight: 1.7, marginBottom: 14 } }, curEd.dilemma),
            // Values in tension
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 } },
              h('div', { style: { padding: '8px 14px', borderRadius: 10, background: '#3b82f622', border: '1px solid #3b82f644', color: _decFg('#60a5fa'), fontSize: 12, fontWeight: 600 } }, curEd.valueA),
              h('span', { style: { color: _decFg('#94a3b8'), fontSize: 16, fontWeight: 700 } }, 'vs'),
              h('div', { style: { padding: '8px 14px', borderRadius: 10, background: '#ef444422', border: '1px solid #ef444444', color: _decFg('#f87171'), fontSize: 12, fontWeight: 600 } }, curEd.valueB)
            )
          ),
          // Arguments for each side
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 } },
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, fontWeight: 600, color: _decFg('#60a5fa'), marginBottom: 4 } }, 'Argument for: ' + curEd.valueA),
              h('textarea', {
                value: edSideA,
                onChange: function(e) { upd('edSideA', e.target.value); },
                'aria-label': 'Arguments for side A',
                placeholder: 'Why might this value matter more here? (Tip: don\'t share personal info like names or contact details)',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #3b82f644', background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            ),
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, fontWeight: 600, color: _decFg('#f87171'), marginBottom: 4 } }, 'Argument for: ' + curEd.valueB),
              h('textarea', {
                value: edSideB,
                onChange: function(e) { upd('edSideB', e.target.value); },
                'aria-label': 'Arguments for side B',
                placeholder: 'Why might this value matter more here? (Tip: don\'t share personal info like names or contact details)',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #ef444444', background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            )
          ),
          // Your verdict
          h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: _decFg('#e2e8f0'), marginBottom: 6 } }, 'Your verdict \u2014 what would you do and why?'),
            h('textarea', {
              value: edVerdict,
              onChange: function(e) { upd('edVerdict', e.target.value); },
              'aria-label': 'Your verdict',
              placeholder: 'I would lean toward... because... (Tip: keep it general — don\'t share personal info like full names, addresses, or your school)',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            })
          ),
          // Think about it
          h('div', { style: { padding: 14, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: _decFg(ACCENT), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Think about it'),
            h('p', { style: { fontSize: 12, color: _decFg('#e2e8f0'), lineHeight: 1.6, fontStyle: 'italic' } }, curEd.thinkAbout)
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 } },
            // AI analysis
            h('button', { 'aria-label': 'AI analysis',
              onClick: function() {
                if (!edVerdict.trim() && !edSideA.trim() && !edSideB.trim()) { addToast('Write your thoughts first!', 'info'); return; }
                if (!callGemini) { addToast('AI not available.', 'error'); return; }
                upd('edAiLoad', true);
                upd('edAiResp', null);
                var prompt = 'You are an ethics discussion facilitator for ' + band + ' school students.\n\n' +
                  'DILEMMA: "' + curEd.title + '"\n' + curEd.dilemma + '\n' +
                  'VALUE A: ' + curEd.valueA + '\nVALUE B: ' + curEd.valueB + '\n\n' +
                  'Student\'s argument for ' + curEd.valueA + ': "' + (edSideA || '(not provided)') + '"\n' +
                  'Student\'s argument for ' + curEd.valueB + ': "' + (edSideB || '(not provided)') + '"\n' +
                  'Student\'s verdict: "' + (edVerdict || '(not provided)') + '"\n\n' +
                  'Respond with:\n' +
                  '1. Acknowledge the strength in BOTH sides of their reasoning\n' +
                  '2. Introduce ONE philosophical or ethical framework relevant to this dilemma (e.g., utilitarianism, deontology, virtue ethics, care ethics) in ' + (band === 'elementary' ? 'kid-friendly language' : 'accessible terms') + '\n' +
                  '3. Mention a real-world parallel where this tension plays out\n' +
                  '4. End with a thought-provoking question\n\n' +
                  'IMPORTANT: Never say one side is "right." Ethical dilemmas are valuable BECAUSE they have no clear answer.\n' +
                  'Keep it under 200 words. Use ' + (band === 'elementary' ? 'warm, simple language.' : band === 'middle' ? 'clear, engaging language.' : 'intellectually stimulating language.');
                // Triage the student's free-text arguments/verdict before the AI (mirrors the Decision-Tree path).
                if (window.SelHub && window.SelHub.assessSafety) {
                  var _edIn = (edSideA + '\n' + edSideB + '\n' + edVerdict);
                  window.SelHub.assessSafety(_edIn, band, 'decisions', callGemini)
                    .catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
                    .then(function(_safety) {
                      _safety = _safety || { tier: 0 };
                      if (_safety.tier >= 2 && onSafetyFlag) {
                        onSafetyFlag({
                          category: 'ai_decisions_dilemma_' + (_safety.category || 'concerning'),
                          match: _safety.rationale || 'SEL decisions safety concern',
                          severity: _safety.tier >= 3 ? 'critical' : 'medium',
                          source: 'sel_decisions',
                          context: _edIn.substring(0, 100),
                          timestamp: new Date().toISOString(),
                          aiGenerated: true,
                          confidence: _safety.tier >= 3 ? 0.9 : 0.7,
                          tier: _safety.tier
                        });
                      }
                      upd('_decisionsTier', _safety.tier || 0);
                    });
                }
                callGemini(prompt).then(function(result) {
                  var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('edAiResp', resp);
                  upd('edAiLoad', false);
                }).catch(function(err) {
                  upd('edAiLoad', false);
                  addToast('Error: ' + err.message, 'error');
                });
              },
              disabled: edAiLoad,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: edAiLoad ? _decBg('#334155') : '#6366f1', color: _decFg('#fff'), fontWeight: 600, fontSize: 13, cursor: edAiLoad ? 'default' : 'pointer' }
            }, edAiLoad ? 'Thinking...' : '\u2728 Explore This Dilemma'),
            // Next
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() {
                var newDone = edCompleted + 1;
                upd('edCompleted', newDone);
                logPractice('dilemma', curEd.id);
                awardXP(15);
                tryAwardBadge('first_dilemma');
                if (newDone >= 5) tryAwardBadge('dilemma_5');
                if (soundEnabled) sfxCorrect();
                upd({ edIdx: edIdx + 1, edSideA: '', edSideB: '', edVerdict: '', edAiResp: null });
                ctx.announceToSR && ctx.announceToSR('Next dilemma loaded');
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: _decBg('#334155'), color: _decFg('#f1f5f9'), fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Complete & Next \u2192')
          ),
          // AI Response
          edAiResp && h('div', { style: { padding: 16, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid #6366f144' } },
            h('p', { style: { fontSize: 10, color: _decFg('#818cf8'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2728 Ethical Analysis'),
            h('div', { style: { fontSize: 13, color: _decFg('#e2e8f0'), lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, edAiResp)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Consequence Map ──
      // ══════════════════════════════════════════════════════════
      var csContent = null;
      if (activeTab === 'consequence') {
        var mapBand = CONSEQUENCE_SCENARIOS[band] ? band : 'elementary';
        var csScenarios = CONSEQUENCE_SCENARIOS[mapBand];
        var mapSelected = d.mapSelected && typeof d.mapSelected === 'object' ? d.mapSelected : {};
        var legacyIndex = Number.isInteger(csIdx) && csIdx >= 0 ? csIdx % csScenarios.length : 0;
        var curCs = csScenarios.find(function(item) { return item.id === mapSelected[mapBand]; }) || csScenarios[legacyIndex];
        var mapDrafts = d.mapDrafts && typeof d.mapDrafts === 'object' ? d.mapDrafts : {};
        var mapDraft = mapDrafts[curCs.id] && typeof mapDrafts[curCs.id] === 'object' ? mapDrafts[curCs.id] : {};
        var mapText = function(key) { return typeof mapDraft[key] === 'string' ? mapDraft[key] : ''; };
        var mapSet = function(values) { var next = Object.assign({}, mapDrafts); next[curCs.id] = Object.assign({}, mapDraft, values); upd('mapDrafts', next); };
        var mapParts = [
          { key: 'near', label: 'A possible near-term effect', help: 'What might happen soon, for whom, and why? Use could or might when the outcome is uncertain.' },
          { key: 'later', label: 'A different possible path', help: 'Describe another plausible outcome. What condition would make it more or less likely?' },
          { key: 'long', label: 'If this became a pattern', help: 'What might accumulate or change over time? Avoid treating a distant outcome as certain.' },
          { key: 'people', label: 'Whose needs or effort are affected?', help: 'Consider who benefits, who carries costs, and whose perspective is missing. Do not assume their feelings.' },
          { key: 'uncertainty', label: 'What would you need to check?', help: 'Separate what the case states from assumptions. Name information, permission, or support that could matter.' },
          { key: 'adjustment', label: 'An adjustment within your control', help: 'Consider a smaller trial, a different route, or trusted support. Some effects cannot be undone; safety should not wait for this exercise.' },
          { key: 'review', label: 'When would you revisit the plan?', help: 'Name a change in circumstances or something observable to check. A good or bad outcome alone does not prove a good or bad decision.' }
        ];
        var mapSnapshot = mapDraft.snapshot && typeof mapDraft.snapshot === 'object' && !Array.isArray(mapDraft.snapshot) ? mapDraft.snapshot : null;
        var hasMapWriting = mapParts.some(function(part) { return mapText(part.key).trim(); });
        var mapLegacy = { near: csShort, later: csMid, long: csLong };
        var hasMapLegacy = Object.keys(mapLegacy).some(function(key) { return typeof mapLegacy[key] === 'string' && mapLegacy[key].trim(); });
        var mapBorder = _decBd('#334155');
        var mapCard = { padding: 16, marginTop: 16, border: '1px solid ' + mapBorder, borderRadius: 12, background: _decBg('#0f172a') };
        var mapButton = { width: '100%', minHeight: 44, padding: '10px 12px', border: '1px solid ' + mapBorder, borderRadius: 8, background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 14, textAlign: 'left', cursor: 'pointer', overflowWrap: 'anywhere' };
        var mapSummary = { minHeight: 44, padding: '10px 0', fontWeight: 700, cursor: 'pointer' };
        var mapField = function(part) {
          var id = 'dec-map-' + part.key;
          return h('div', { key: part.key, style: { marginTop: 14 } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, part.label + ' (optional)'),
            h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, part.help),
            h('textarea', { id: id, rows: 3, value: mapText(part.key), 'aria-describedby': id + '-help', onChange: function(event) { var values = {}; values[part.key] = event.target.value; mapSet(values); },
              style: { width: '100%', maxWidth: '100%', minHeight: 90, boxSizing: 'border-box', padding: 10, borderRadius: 8, border: '1px solid ' + mapBorder, background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 16, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical' }
            })
          );
        };
        csContent = h('section', { 'aria-label': 'Consequence reasoning map', style: { maxWidth: 740, margin: '0 auto', padding: '12px 16px 24px', background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere' } },
          h('h3', { style: { fontSize: 21, margin: '8px 0' } }, 'Consequence Map'),
          h('p', null, 'Explore possible effects, not a fixed future. Use a fictional case and respond by thinking, discussing, drawing, signing, AAC, or optional notes. No score or completed-map claim is attached to navigation.'),
          h('p', null, 'Notes and an optional earlier version stay in the current tool state. Use the Hub save/export controls to keep a project copy. This activity sends nothing and does not verify a real-world outcome.'),
          h('label', { htmlFor: 'dec-map-case', style: { display: 'block', fontWeight: 700 } }, 'Choose a consequence scenario'),
          h('select', { id: 'dec-map-case', value: curCs.id, style: Object.assign({}, mapButton, { fontSize: 16 }), onChange: function(event) { var next = Object.assign({}, mapSelected); next[mapBand] = event.target.value; upd('mapSelected', next); announceToSR && announceToSR('Consequence scenario changed. Other drafts and earlier versions are kept.'); } }, csScenarios.map(function(item, index) { return h('option', { key: item.id, value: item.id }, (index + 1) + '. ' + item.title); })),
          hasMapLegacy && h('details', { style: mapCard }, h('summary', { style: mapSummary }, 'An earlier unassigned map is available'),
            h('p', null, 'Older notes did not store a reliable case and grade-band link. Review them before copying into a revised case. Existing writing and this earlier copy are kept.'),
            ['near', 'later', 'long'].map(function(key, index) { return typeof mapLegacy[key] === 'string' && mapLegacy[key].trim() ? h('p', { key: key, style: { whiteSpace: 'pre-wrap' } }, h('strong', null, ['Earlier short-term note: ', 'Earlier medium-term note: ', 'Earlier long-term note: '][index]), mapLegacy[key]) : null; }),
            h('button', { type: 'button', style: mapButton, onClick: function() { var copied = {}; Object.keys(mapLegacy).forEach(function(key) { if (!mapText(key).trim() && typeof mapLegacy[key] === 'string') copied[key] = mapLegacy[key]; }); mapSet(copied); announceToSR && announceToSR('Earlier notes copied into empty fields. Existing writing and the earlier copy were kept.'); } }, 'Copy earlier notes into empty fields')
          ),
          h('section', { style: mapCard, 'aria-labelledby': 'dec-map-case-title' },
            h('h4', { id: 'dec-map-case-title', style: { marginTop: 0, fontSize: 18 } }, curCs.title), h('p', null, curCs.action),
            h('p', null, h('strong', null, 'People to consider: '), curCs.affectedPeople.join(', ')),
            h('details', { key: 'model-' + curCs.id }, h('summary', { style: mapSummary }, 'Compare possible effects and their limits'),
              h('p', null, h('strong', null, 'A possible benefit or intended effect: '), curCs.benefit),
              h('p', null, h('strong', null, 'A possible cost or limitation: '), curCs.cost),
              h('p', null, h('strong', null, 'What this depends on: '), curCs.depends),
              h('p', null, 'These examples are not equally likely predictions or a balance that makes harm acceptable. Consider safety, rights, and consent alongside possible benefits.')
            )
          ),
          h('details', { key: 'effects-' + curCs.id, open: true, style: mapCard }, h('summary', { style: mapSummary }, '1. Explore more than one possible path'), mapParts.slice(0,3).map(mapField)),
          h('details', { key: 'needs-' + curCs.id, style: mapCard }, h('summary', { style: mapSummary }, '2. Consider people and missing information'), mapParts.slice(3,5).map(mapField)),
          h('details', { key: 'plan-' + curCs.id, style: mapCard }, h('summary', { style: mapSummary }, '3. Adjust the plan and choose a review point'),
            mapParts.slice(5).map(mapField),
            h('details', null, h('summary', { style: mapSummary }, 'Compare an adjustment and review example'), h('p', null, curCs.adjustment), h('p', null, curCs.review))
          ),
          h('section', { style: mapCard, 'aria-label': 'Earlier reasoning version' },
            h('p', null, 'Optionally keep one version before revising. This copies your current notes for comparison; it does not record completion or save a project file.'),
            !hasMapWriting && !mapSnapshot && h('p', { id: 'dec-map-version-help' }, 'Available after adding any note. You can explore without writing or keeping a version.'),
            h('button', { type: 'button', style: mapButton, disabled: !hasMapWriting && !mapSnapshot, 'aria-describedby': !hasMapWriting && !mapSnapshot ? 'dec-map-version-help' : undefined, onClick: function() {
              if (!mapSnapshot && hasMapWriting) { var copy = {}; mapParts.forEach(function(part) { copy[part.key] = mapText(part.key); }); mapSet({ snapshot: copy }); announceToSR && announceToSR('Earlier version kept in this tool. You can edit the current notes without changing it.'); }
            } }, mapSnapshot ? 'Earlier version kept' : 'Keep this version for comparison'),
            mapSnapshot && h('details', null, h('summary', { style: mapSummary }, 'Read the earlier version'), mapParts.map(function(part) {
              return h('p', { key: part.key, style: { whiteSpace: 'pre-wrap' } }, h('strong', null, part.label + ': '), typeof mapSnapshot[part.key] === 'string' && mapSnapshot[part.key].trim() ? mapSnapshot[part.key] : 'Not recorded');
            }))
          ),
          h('section', { style: mapCard, 'aria-labelledby': 'dec-map-change-title' },
            h('h4', { id: 'dec-map-change-title', style: { fontSize: 17, marginTop: 0 } }, '4. Reconsider when a condition changes'),
            h('p', null, 'You can explore this without writing or keeping a version. The change below is hypothetical, not an outcome that has happened.'),
            h('button', { type: 'button', style: mapButton, 'aria-expanded': mapDraft.changeSeen === true, 'aria-controls': 'dec-map-change', onClick: function() { if (mapDraft.changeSeen !== true) { mapSet({ changeSeen: true }); announceToSR && announceToSR('A hypothetical change is available. Consider what it changes in your reasoning.'); } } }, mapDraft.changeSeen === true ? 'Changed condition shown' : 'Explore a changed condition'),
            h('div', { id: 'dec-map-change', hidden: mapDraft.changeSeen !== true }, h('p', null, curCs.change), mapField({ key: 'revised', label: 'What would you keep or change, and why?', help: 'Refer to the changed condition, a boundary, or new support. Keeping a plan can be reasonable; explain what still makes it fit.' }))
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Bias Check ──
      // ══════════════════════════════════════════════════════════
      var biasContent = null;
      if (activeTab === 'bias') {
        function biasRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
        var biases = BIAS_DATA[band] || BIAS_DATA.elementary;
        var biasSelections = biasRecord(d.biasSelections);
        var oldBiasIndex = typeof biasIdx === 'number' && isFinite(biasIdx) && biasIdx >= 0 ? Math.floor(biasIdx) % biases.length : 0;
        var selectedBiasId = Object.prototype.hasOwnProperty.call(biasSelections, band) ? biasSelections[band] : null;
        var curBias = biases.find(function(item) { return item.id === selectedBiasId; }) || biases[oldBiasIndex];
        var biasKey = band + ':' + curBias.id;
        var biasDrafts = biasRecord(d.biasDrafts);
        var biasDraft = biasRecord(Object.prototype.hasOwnProperty.call(biasDrafts, biasKey) ? biasDrafts[biasKey] : null);
        var biasSurface = _decHC ? '#000000' : _decL ? '#ffffff' : '#0f172a';
        var biasInk = _decHC ? '#ffff00' : _decL ? '#0f172a' : '#e2e8f0';
        var biasEdge = _decHC ? '#ffff00' : '#64748b';
        var biasControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + biasEdge, borderRadius: 8, background: biasSurface, color: biasInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
        function updateBiasDraft(key, value) {
          var next = Object.assign({}, biasDrafts);
          next[biasKey] = Object.assign({}, biasDraft);
          next[biasKey][key] = value;
          upd('biasDrafts', next);
        }
        var biasFields = band === 'elementary' ? [
          { key: 'facts', label: 'What we know', help: 'Name what happened in the example. What did someone actually see or hear?' },
          { key: 'interpretation', label: 'A working thought', help: 'What is someone thinking it means? A thought can still be a guess.' },
          { key: 'alternative', label: 'Another possible explanation', help: 'What else could fit? You can also say that you need more information.' },
          { key: 'check', label: 'A useful check or support', help: 'What could you look at or ask? A trusted adult can help.' },
          { key: 'review', label: 'What I would keep or change', help: 'What would help you decide? You do not have to change your mind just to finish.' }
        ] : [
          { key: 'facts', label: 'What we know', help: 'Separate observations and source claims from interpretations. Note what the example does not establish.' },
          { key: 'interpretation', label: 'A working thought', help: 'State a tentative interpretation. A pattern name alone is not evidence that it applies.' },
          { key: 'alternative', label: 'Another possible explanation', help: 'Consider an alternative that fits the facts, or identify why the evidence is still insufficient.' },
          { key: 'check', label: 'A useful check or support', help: 'Choose relevant evidence, a respectful question or practical support. Another opinion is not automatically a better source.' },
          { key: 'review', label: 'What I would keep or change', help: 'Identify what finding would support, weaken or leave your interpretation unresolved. Keep appropriate boundaries while checking.' }
        ];
        var biasHasWorkingThought = typeof biasDraft.interpretation === 'string' && biasDraft.interpretation.trim().length > 0;
        var oldBiasReflection = typeof biasReflection === 'string' ? biasReflection : '';
        biasContent = h('section', { role: 'region', 'aria-label': 'Bias evidence practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: biasSurface, color: biasInk, border: '1px solid ' + biasEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
          h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Check the evidence behind a thought'),
          h('p', null, 'Use these pattern names as prompts to inspect reasoning, not labels for people. Explore a fictional example, a useful check and its limits. You can think or discuss without writing.'),
          h('label', { htmlFor: 'dec-bias-choice', style: { display: 'block', fontWeight: 700 } }, 'Choose a thinking pattern'),
          h('select', { id: 'dec-bias-choice', value: curBias.id, onChange: function(e) { var next = Object.assign({}, biasSelections); next[band] = e.target.value; upd('biasSelections', next); }, style: biasControl }, biases.map(function(item) { return h('option', { key: item.id, value: item.id }, item.simple); })),
          h('div', { key: biasKey },
            h('h3', { style: { fontSize: 18 } }, curBias.simple), h('p', { style: { fontWeight: 700 } }, curBias.name), h('p', null, curBias.desc),
            h('h4', { style: { fontSize: 16 } }, 'A fictional example'), h('p', null, curBias.example),
            h('details', { style: { borderTop: '1px solid ' + biasEdge } },
              h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Compare a checking approach'),
              h('p', null, h('strong', null, 'A question to explore: '), curBias.question),
              h('p', null, h('strong', null, 'A check to try: '), curBias.antidote),
              h('p', null, h('strong', null, 'Limits and care: '), curBias.limits)),
            h('details', { id: 'dec-bias-evidence-notes', style: { borderTop: '1px solid ' + biasEdge } },
              h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Build an evidence check (optional)'),
              h('p', null, 'Use the fictional example or another situation you choose. Personal disclosure is optional.'),
              biasFields.map(function(field) {
                var id = 'dec-bias-note-' + field.key;
                var value = Object.prototype.hasOwnProperty.call(biasDraft, field.key) && typeof biasDraft[field.key] === 'string' ? biasDraft[field.key] : '';
                return h('div', { key: field.key, style: { margin: '12px 0' } },
                  h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
                  h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, field.help),
                  h('textarea', { id: id, rows: 3, value: value, 'aria-describedby': id + '-help', onChange: function(e) { updateBiasDraft(field.key, e.target.value); }, style: Object.assign({}, biasControl, { resize: 'vertical', lineHeight: 1.6 }) }));
              }),
              h('p', null, 'Notes stay with this example and grade band in the current project. Use the hub save or export controls to keep them beyond this session. Review private details before sharing.')
            )
          ),
          oldBiasReflection.trim().length > 0 && h('details', { style: { borderTop: '1px solid ' + biasEdge } },
            h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Earlier Bias Check reflection'),
            h('p', null, 'This earlier note has not been assigned to a new example. You can copy it into an empty working thought; the original stays in project data.'),
            h('p', { style: { whiteSpace: 'pre-wrap' } }, oldBiasReflection),
            h('button', { type: 'button', disabled: biasHasWorkingThought, onClick: function() {
              if (biasHasWorkingThought) return;
              updateBiasDraft('interpretation', oldBiasReflection);
              if (announceToSR) announceToSR('Earlier reflection copied into the working thought. The original is unchanged.');
              setTimeout(function() {
                var notes = document.getElementById('dec-bias-evidence-notes');
                var field = document.getElementById('dec-bias-note-interpretation');
                if (notes && field) { notes.open = true; field.focus(); }
              }, 0);
            }, style: Object.assign({}, biasControl, { cursor: biasHasWorkingThought ? 'default' : 'pointer', fontWeight: 700 }) }, 'Copy earlier reflection into this working thought'),
            biasHasWorkingThought && h('p', null, 'This example already has a working thought. It will not be overwritten.')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Values Sort ──
      // Interactive card-ranking: prioritize values in context
      // ══════════════════════════════════════════════════════════
      var vsContent = null;
      if (activeTab === 'values') {
        function valuesRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
        var vsSorts = VALUES_SORT[band] || VALUES_SORT.elementary;
        var valuesSelections = valuesRecord(d.valuesSelections);
        var oldVsIndex = typeof vsIdx === 'number' && isFinite(vsIdx) && vsIdx >= 0 ? Math.floor(vsIdx) % vsSorts.length : 0;
        var chosenVsId = Object.prototype.hasOwnProperty.call(valuesSelections, band) ? valuesSelections[band] : null;
        var curVs = vsSorts.find(function(item) { return item.id === chosenVsId; }) || vsSorts[oldVsIndex];
        var valuesCase = VALUES_PRACTICE[curVs.id];
        var valuesKey = band + ':' + curVs.id;
        var valuesDrafts = valuesRecord(d.valuesDrafts);
        var valuesDraft = valuesRecord(Object.prototype.hasOwnProperty.call(valuesDrafts, valuesKey) ? valuesDrafts[valuesKey] : null);
        var valuesPriorities = valuesRecord(valuesDraft.priorities);
        var valuesSurface = _decHC ? '#000000' : _decL ? '#ffffff' : '#0f172a';
        var valuesInk = _decHC ? '#ffff00' : _decL ? '#0f172a' : '#e2e8f0';
        var valuesEdge = _decHC ? '#ffff00' : '#64748b';
        var valuesControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + valuesEdge, borderRadius: 8, background: valuesSurface, color: valuesInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
        var priorityChoices = [['', 'Still deciding'], ['protect', 'Protect here'], ['support', 'Support if possible'], ['less', 'Less central here']];
        function updateValuesDraft(key, value) {
          var next = Object.assign({}, valuesDrafts);
          next[valuesKey] = Object.assign({}, valuesDraft);
          next[valuesKey][key] = value;
          upd('valuesDrafts', next);
        }
        function valuesNote(key, label, help) {
          var id = 'dec-values-note-' + key;
          var value = Object.prototype.hasOwnProperty.call(valuesDraft, key) && typeof valuesDraft[key] === 'string' ? valuesDraft[key] : '';
          return h('div', { style: { margin: '12px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label + ' (optional)'),
            h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, help),
            h('textarea', { id: id, rows: 3, value: value, 'aria-describedby': id + '-help', onChange: function(e) { updateValuesDraft(key, e.target.value); }, style: Object.assign({}, valuesControl, { resize: 'vertical', lineHeight: 1.6 }) }));
        }
        var oldValuesRanking = Array.isArray(vsRanking) ? vsRanking.filter(function(value) { return typeof value === 'string'; }) : [];
        vsContent = h('section', { role: 'region', 'aria-label': 'Values in context practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: valuesSurface, color: valuesInk, border: '1px solid ' + valuesEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
          h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Explore what matters in this situation'),
          h('p', null, 'Values are things we care about. Several can matter together, and the situation can change how we act on them. Explore, talk or write; there is no score or required ranking.'),
          h('label', { htmlFor: 'dec-values-choice', style: { display: 'block', fontWeight: 700 } }, 'Choose a values context'),
          h('select', { id: 'dec-values-choice', value: curVs.id, onChange: function(e) { var next = Object.assign({}, valuesSelections); next[band] = e.target.value; upd('valuesSelections', next); }, style: valuesControl }, vsSorts.map(function(item) { return h('option', { key: item.id, value: item.id }, item.context); })),
          h('div', { key: valuesKey },
            h('h3', { style: { fontSize: 18 } }, curVs.context),
            h('h4', { style: { fontSize: 16 } }, 'A fictional situation'), h('p', null, valuesCase.situation),
            h('p', null, 'Use this example or imagine another situation. You do not need to share a personal experience.'),
            h('details', { style: { borderTop: '1px solid ' + valuesEdge } },
              h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Map what matters (optional)'),
              valuesNote('context', 'The situation I am considering', band === 'elementary' ? 'Use the example or make up a situation. Who is involved?' : 'Use the example or specify the choice, people affected and relevant constraints. Avoid identifying details.'),
              h('p', { id: 'dec-values-priority-help' }, 'These words are starting points: some name values, needs, pressures or possible consequences. Choose a role for any word that helps. Several can share a role; leave others undecided. Less central here does not mean unimportant in your life.'),
              h('p', null, 'A preference cannot make harm or ignored consent acceptable. Name safety, access and boundaries even if they are missing from this list.'),
              curVs.values.map(function(value, index) {
                var selected = Object.prototype.hasOwnProperty.call(valuesPriorities, value) && priorityChoices.some(function(item) { return item[0] === valuesPriorities[value]; }) ? valuesPriorities[value] : '';
                return h('div', { key: value, style: { margin: '12px 0' } },
                  h('label', { htmlFor: 'dec-values-priority-' + index, style: { display: 'block', fontWeight: 700 } }, value + ' — role in this situation'),
                  h('select', { id: 'dec-values-priority-' + index, value: selected, 'aria-describedby': 'dec-values-priority-help', onChange: function(e) { var next = Object.assign({}, valuesPriorities); next[value] = e.target.value; updateValuesDraft('priorities', next); }, style: valuesControl }, priorityChoices.map(function(item) { return h('option', { key: item[0], value: item[0] }, item[1]); })));
              }),
              valuesNote('meaning', 'What these words mean here', band === 'elementary' ? 'Pick one or two words. What could someone do to show them? Add a word that is missing if you want.' : 'Define one or two priorities in observable actions. Add a missing value or need; people may use the same word differently.'),
              valuesNote('tension', 'What fits together or pulls apart', band === 'elementary' ? 'Can one action help with two things you care about? What might be hard to do together?' : 'Identify a genuine tension and a way to support more than one value. Whose needs or costs might the first plan miss?'),
              valuesNote('boundary', 'A boundary or support to protect', band === 'elementary' ? 'What needs to stay safe or fair? Who could help? You do not have to solve it alone.' : 'Name consent, access, safety or another limit the plan must respect. Identify who has responsibility and what support is needed.'),
              valuesNote('action', 'A possible next step and reason', band === 'elementary' ? 'What small step could help? Say how it shows what matters and who can help.' : 'Choose a workable action and explain which priorities it serves, what remains unresolved and whose input you need.')
            ),
            h('details', { style: { borderTop: '1px solid ' + valuesEdge } },
              h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Explore the tension and a change'),
              h('p', null, h('strong', null, 'A tension to consider: '), valuesCase.tension),
              h('p', null, h('strong', null, 'Now imagine: '), valuesCase.change),
              valuesNote('review', 'What I would keep or change, and why', band === 'elementary' ? 'Does this new detail change your plan? What still matters? You can keep your idea and explain why.' : 'Separate a changed action from a changed value. What would you revise or keep, and what feedback or later check would help?')),
            h('details', { style: { borderTop: '1px solid ' + valuesEdge } },
              h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Compare one possible response'),
              h('p', null, valuesCase.model),
              h('p', null, 'This is one response to the changed situation, not an answer key. Compare its reasons, limits and needed support with your own. Different choices still need to account for their effects on people.')),
            h('p', null, 'Choices and notes stay with this context and grade band in the current project. Use the hub save or export controls to keep them beyond this session. Review private details before sharing.')
          ),
          oldValuesRanking.length > 0 && h('details', { style: { borderTop: '1px solid ' + valuesEdge } },
            h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Earlier values ranking'),
            h('p', null, 'The earlier activity kept one ranking without a reliable grade-band link. It is shown as a historical note and is not assigned to this context or converted into priorities.'),
            h('ol', null, oldValuesRanking.map(function(value, index) { return h('li', { key: index }, value); }))
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Real-World Decisions ──
      // Famous ethical decisions from history for analysis
      // ══════════════════════════════════════════════════════════
      var rwContent = null;
      if (activeTab === 'realworld') {
        var rwCases = REAL_WORLD[band] || REAL_WORLD.elementary;
        var curRw = rwCases[rwIdx % rwCases.length];

        rwContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _decFg('#f1f5f9'), fontSize: 18 } }, '\uD83C\uDF0D Real-World Decisions'),
          h('p', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 12 } },
            'Study real decisions that changed history. What would YOU have done?'
          ),
          h('div', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 11, marginBottom: 12 } },
            'Case ' + ((rwIdx % rwCases.length) + 1) + ' of ' + rwCases.length +
            (rwCompleted > 0 ? ' \u00B7 ' + rwCompleted + ' analyzed' : '')
          ),
          // Case card
          h('div', { style: { padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid #3b82f644', marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
              h('h4', { style: { color: _decFg('#60a5fa'), fontSize: 16, fontWeight: 700, margin: 0 } }, curRw.title),
              h('span', { style: { fontSize: 11, color: _decFg('#94a3b8'), background: _decBg('#1e293b'), padding: '2px 8px', borderRadius: 6 } }, curRw.year)
            ),
            h('p', { style: { fontSize: 14, color: _decFg('#e2e8f0'), lineHeight: 1.7, marginBottom: 12 } }, curRw.summary),
            // The decision
            h('div', { style: { padding: 12, borderRadius: 10, background: _decBg('#1e293b'), border: '1px solid #3b82f633', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: _decFg('#60a5fa'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'The Decision'),
              h('p', { style: { fontSize: 13, color: _decFg('#f1f5f9'), fontWeight: 600 } }, curRw.decision)
            ),
            // Values tested
            h('div', { style: { marginBottom: 12 } },
              h('span', { style: { fontSize: 10, color: _decFg(ACCENT), background: ACCENT_DIM, padding: '3px 10px', borderRadius: 6, fontWeight: 600 } }, '\u2696\uFE0F ' + curRw.valuesTested)
            ),
            // Impact
            h('div', { style: { padding: 12, borderRadius: 10, background: '#22c55e11', border: '1px solid #22c55e33' } },
              h('p', { style: { fontSize: 10, color: _decFg('#22c55e'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'What Happened'),
              h('p', { style: { fontSize: 12, color: _decFg('#e2e8f0'), lineHeight: 1.6 } }, curRw.impact)
            )
          ),
          // Reflection question
          h('div', { style: { padding: 14, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: _decFg(ACCENT), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Your Turn'),
            h('p', { style: { fontSize: 13, color: _decFg('#e2e8f0'), lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10 } }, curRw.question),
            h('textarea', {
              value: rwReflection,
              onChange: function(e) { upd('rwReflection', e.target.value); },
              'aria-label': 'Real-world decision reflection',
              placeholder: 'What would you have done? What makes this decision so hard? (Tip: don\'t share personal info like names, addresses, or your school)',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: _decBg('#0f172a'), color: _decFg('#f1f5f9'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            })
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 } },
            // AI analysis
            h('button', { 'aria-label': 'AI analysis',
              onClick: function() {
                if (!rwReflection.trim()) { addToast('Write your reflection first!', 'info'); return; }
                if (!callGemini) { addToast('AI not available.', 'error'); return; }
                upd('rwAiLoad', true);
                upd('rwAiResp', null);
                var prompt = 'You are a thoughtful history and ethics teacher for ' + band + ' school students.\n\n' +
                  'HISTORICAL CASE: "' + curRw.title + '" (' + curRw.year + ')\n' + curRw.summary + '\n' +
                  'The decision: ' + curRw.decision + '\n' +
                  'Values tested: ' + curRw.valuesTested + '\n\n' +
                  'STUDENT\'S REFLECTION: "' + rwReflection + '"\n\n' +
                  'Respond with:\n' +
                  '1. Connect their thinking to the historical context — what did they notice that matters?\n' +
                  '2. Introduce ONE additional perspective or historical fact they might not know\n' +
                  '3. Draw a parallel to something relevant in their life today\n' +
                  '4. End with a thought-provoking question that goes deeper\n\n' +
                  'Use ' + (band === 'elementary' ? 'simple, engaging language for ages 5-10.' : band === 'middle' ? 'clear, inspiring language for ages 11-14.' : 'intellectually rich language for ages 15-18.') + '\n' +
                  'Keep it under 200 words. Honor their thinking while pushing it further.';
                // Triage the student's free-text reflection before the AI (mirrors the Decision-Tree path).
                if (window.SelHub && window.SelHub.assessSafety) {
                  window.SelHub.assessSafety(rwReflection, band, 'decisions', callGemini)
                    .catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
                    .then(function(_safety) {
                      _safety = _safety || { tier: 0 };
                      if (_safety.tier >= 2 && onSafetyFlag) {
                        onSafetyFlag({
                          category: 'ai_decisions_realworld_' + (_safety.category || 'concerning'),
                          match: _safety.rationale || 'SEL decisions safety concern',
                          severity: _safety.tier >= 3 ? 'critical' : 'medium',
                          source: 'sel_decisions',
                          context: rwReflection.substring(0, 100),
                          timestamp: new Date().toISOString(),
                          aiGenerated: true,
                          confidence: _safety.tier >= 3 ? 0.9 : 0.7,
                          tier: _safety.tier
                        });
                      }
                      upd('_decisionsTier', _safety.tier || 0);
                    });
                }
                callGemini(prompt).then(function(result) {
                  var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('rwAiResp', resp);
                  upd('rwAiLoad', false);
                }).catch(function(err) {
                  upd('rwAiLoad', false);
                  addToast('Error: ' + err.message, 'error');
                });
              },
              disabled: rwAiLoad,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: rwAiLoad ? _decBg('#334155') : '#6366f1', color: _decFg('#fff'), fontWeight: 600, fontSize: 13, cursor: rwAiLoad ? 'default' : 'pointer' }
            }, rwAiLoad ? 'Analyzing...' : '\u2728 Discuss With AI'),
            // Complete & Next
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() {
                var newDone = rwCompleted + 1;
                upd('rwCompleted', newDone);
                logPractice('realworld', curRw.id);
                awardXP(15);
                tryAwardBadge('first_realworld');
                if (newDone >= rwCases.length) tryAwardBadge('realworld_all');
                if (soundEnabled) sfxCorrect();
                upd({ rwIdx: rwIdx + 1, rwReflection: '', rwAiResp: null });
                ctx.announceToSR && ctx.announceToSR('Next case loaded');
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: _decBg('#334155'), color: _decFg('#f1f5f9'), fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Complete & Next \u2192')
          ),
          // AI Response
          rwAiResp && h('div', { style: { padding: 16, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid #6366f144' } },
            h('p', { style: { fontSize: 10, color: _decFg('#818cf8'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2728 Historical Analysis'),
            h('div', { style: { fontSize: 13, color: _decFg('#e2e8f0'), lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, rwAiResp)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Moral Compass ──
      // Compare reasons in context; no profile, moral score or completion reward.
      var compassContent = null;
      if (activeTab === 'compass') {
        function compassRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
        var reasoningCases = MORAL_REASONING_CASES[band] || MORAL_REASONING_CASES.elementary;
        var reasoningSelections = compassRecord(d.compassSelections);
        var selectedReasoningId = Object.prototype.hasOwnProperty.call(reasoningSelections, band) ? reasoningSelections[band] : null;
        var reasoningCase = reasoningCases.find(function(item) { return item.id === selectedReasoningId; }) || reasoningCases[0];
        var reasoningKey = band + ':' + reasoningCase.id;
        var reasoningDrafts = compassRecord(d.compassDrafts);
        var reasoningDraft = compassRecord(Object.prototype.hasOwnProperty.call(reasoningDrafts, reasoningKey) ? reasoningDrafts[reasoningKey] : null);
        var reasoningSurface = _decHC ? '#000000' : _decL ? '#ffffff' : '#0f172a';
        var reasoningInk = _decHC ? '#ffff00' : _decL ? '#0f172a' : '#e2e8f0';
        var reasoningEdge = _decHC ? '#ffff00' : '#64748b';
        var reasoningControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + reasoningEdge, borderRadius: 8, background: reasoningSurface, color: reasoningInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
        function reasoningUpdate(key, value) {
          var next = Object.assign({}, reasoningDrafts);
          next[reasoningKey] = Object.assign({}, reasoningDraft);
          next[reasoningKey][key] = value;
          upd('compassDrafts', next);
        }
        function reasoningField(key, label, help) {
          var id = 'dec-reasoning-' + key;
          var value = Object.prototype.hasOwnProperty.call(reasoningDraft, key) && typeof reasoningDraft[key] === 'string' ? reasoningDraft[key] : '';
          return h('div', { style: { margin: '12px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label + ' (optional)'),
            h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, help),
            h('textarea', { id: id, rows: 3, value: value, 'aria-describedby': id + '-help', onChange: function(e) { reasoningUpdate(key, e.target.value); }, style: Object.assign({}, reasoningControl, { resize: 'vertical', lineHeight: 1.6 }) }));
        }
        var reasoningLenses = [
          { key: 'outcomes', label: 'Possible outcomes', question: band === 'elementary' ? 'What could happen, and who might it help or make things harder for?' : 'What benefits and costs are plausible, for whom, and what do those predictions depend on?' },
          { key: 'rights', label: 'Rights and fairness', question: band === 'elementary' ? 'What choice, privacy or chance to join in needs respect?' : 'What boundaries, consent and access needs matter even when the majority prefers an option?' },
          { key: 'care', label: 'Care and relationships', question: band === 'elementary' ? 'Who needs to be heard, and who could help?' : 'Whose perspective is missing, what support is wanted, and who should share responsibility?' },
          { key: 'commitments', label: 'Commitments and integrity', question: band === 'elementary' ? 'What did people agree to, and what might need to change?' : 'Which responsibilities or commitments matter, and how could they be revised honestly if circumstances change?' }
        ];
        var earlierAnswers = compassRecord(mcAnswers);
        var earlierStatements = [].concat(COMPASS_STATEMENTS.elementary, COMPASS_STATEMENTS.middle, COMPASS_STATEMENTS.high).filter(function(item) { return Object.prototype.hasOwnProperty.call(earlierAnswers, item.id) && ['agree', 'sometimes', 'disagree'].indexOf(earlierAnswers[item.id]) >= 0; });
        compassContent = h('section', { role: 'region', 'aria-label': 'Moral reasoning practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: reasoningSurface, color: reasoningInk, border: '1px solid ' + reasoningEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
          h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Compare reasons, then reconsider'),
          h('p', null, 'A lens is a question to help you notice something. Use several lenses together; they do not assign you a moral type or produce a score. Some boundaries need to be respected even when a choice has benefits.'),
          h('label', { htmlFor: 'dec-reasoning-case', style: { display: 'block', fontWeight: 700 } }, 'Choose a moral reasoning case'),
          h('select', { id: 'dec-reasoning-case', value: reasoningCase.id, onChange: function(e) { var next = Object.assign({}, reasoningSelections); next[band] = e.target.value; upd('compassSelections', next); }, style: reasoningControl }, reasoningCases.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
          h('div', { key: reasoningKey },
            h('h3', { style: { fontSize: 18 } }, reasoningCase.title), h('p', null, reasoningCase.situation),
            h('details', null, h('summary', { style: { minHeight: 44, padding: '10px 0', fontWeight: 700, cursor: 'pointer' } }, 'Consider possible routes'), h('p', null, reasoningCase.options)),
            reasoningField('initial', 'My starting thought and reason', 'Think, discuss, draw elsewhere or add a note. You do not need to decide yet.'),
            h('h3', { style: { fontSize: 18 } }, 'Explore four lenses'),
            reasoningLenses.map(function(lens) { return h('details', { key: lens.key, style: { borderTop: '1px solid ' + reasoningEdge } },
              h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, lens.label),
              h('p', null, lens.question), h('p', null, h('strong', null, 'In this case: '), reasoningCase.lenses[lens.key]),
              reasoningField(lens.key, lens.label + ' note', 'What does this lens add or leave unresolved? It does not have to support a different answer.')); }),
            reasoningField('unknown', 'What I would need to check', 'Separate stated facts from guesses. Consider missing perspectives, permission and practical support.'),
            h('button', { type: 'button', 'aria-expanded': reasoningDraft.changeSeen === true, 'aria-controls': 'dec-reasoning-change', onClick: function() { reasoningUpdate('changeSeen', reasoningDraft.changeSeen !== true); }, style: Object.assign({}, reasoningControl, { cursor: 'pointer', fontWeight: 700 }) }, 'Explore a changed condition'),
            h('div', { id: 'dec-reasoning-change', hidden: reasoningDraft.changeSeen !== true },
              h('p', null, reasoningCase.change),
              reasoningField('revised', 'What I would keep or change, and why', 'Name what changed your reasoning or why the original reason still holds. A different answer is not automatically better.'),
              h('details', null, h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Compare one possible response'), h('p', null, reasoningCase.model))),
            reasoningField('review', 'A next step and review point', 'Who could help, and what would you check before acting or continuing?'),
            h('p', null, 'Notes are optional and stay with this case and grade band in the current project. Use the hub save or export controls to keep them beyond this session. Review private details before sharing.')
          ),
          (earlierStatements.length > 0 || mcDone || typeof mcAiResp === 'string') && h('details', { style: { borderTop: '1px solid ' + reasoningEdge } },
            h('summary', { style: { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' } }, 'Earlier quiz records'),
            h('p', null, 'Your earlier answers, generated text and badges remain in project data. That quiz is no longer used to assign a moral profile. The statements below are historical prompts, not guidance for action.'),
            h('ul', null, earlierStatements.map(function(item) { return h('li', { key: item.id, style: { marginBottom: 10 } }, item.text + ' — Earlier response: ' + ({ agree: 'Agree', sometimes: 'It depends', disagree: 'Disagree' })[earlierAnswers[item.id]]); })))
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: AI Advisor ──
      // ══════════════════════════════════════════════════════════
      var advContent = null;
      if (activeTab === 'advisor') {
        advContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _decFg('#f1f5f9'), fontSize: 18 } }, '\u2728 Decision Advisor'),
          h('p', { style: { textAlign: 'center', color: _decFg('#94a3b8'), fontSize: 12, marginBottom: 16 } },
            'Describe a real decision you\'re facing and get structured thinking tools to help.'
          ),
          h('div', { style: { padding: 16, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('textarea', {
              value: advPrompt,
              onChange: function(e) { upd('advPrompt', e.target.value); },
              'aria-label': 'Describe your decision for AI advisor',
              placeholder: band === 'elementary'
                ? 'Tell me about something you need to decide. For example: "I can\'t decide if I should try out for the play or join soccer..." (Tip: don\'t share personal info like your full name, address, or school)'
                : 'Describe a decision you\'re facing. Include what makes it hard — the competing values, the people involved, the pressure you feel... (Tip: keep it general — don\'t share personal info like full names, addresses, contact details, or your school)',
              rows: 5,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: _decBg('#1e293b'), color: _decFg('#f1f5f9'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('button', {
              onClick: function() {
                if (!advPrompt.trim()) { addToast('Describe your decision first!', 'info'); return; }
                if (!callGemini) { addToast('AI advisor is not available right now.', 'error'); return; }
                upd('advLoading', true);
                upd('advResponse', null);
                var systemPrompt = 'You are a wise, supportive decision-making advisor for ' + band + ' school students. ' +
                  'A student has described a real decision they\'re facing.\n\n' +
                  'Help them think through it with this structure:\n\n' +
                  '**1. The Core Decision:** Restate what they\'re deciding in one clear sentence\n' +
                  '**2. Values in Tension:** Name 2-3 values that are pulling in different directions\n' +
                  '**3. Options & Consequences:** List 2-3 realistic options with a short pro and con for each\n' +
                  '**4. Bias Alert:** Name one cognitive bias that might be affecting their thinking right now\n' +
                  '**5. A Question to Sit With:** Give them one powerful question to reflect on\n\n' +
                  'Use ' + (band === 'elementary' ? 'simple, kind language for ages 5-10. Keep it short and clear.' :
                    band === 'middle' ? 'clear, supportive language for ages 11-14.' :
                    'thoughtful, nuanced language for ages 15-18. Respect their capacity for complexity.') + '\n' +
                  'NEVER tell them what to decide. Help them think, not choose.\n' +
                  'Keep the total under 300 words.\n\n' +
                  'Student\'s decision: ' + advPrompt;
                // CRISIS-5: triangulated safety assessment of the student's decision
                // disclosure, fired in parallel (mirrors the Decision Tree path above).
                if (window.SelHub && window.SelHub.assessSafety) {
                  window.SelHub.assessSafety(advPrompt, band, 'decisions', callGemini)
                    .catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
                    .then(function(_safety) {
                      _safety = _safety || { tier: 0 };
                      if (_safety.tier >= 2 && onSafetyFlag) {
                        onSafetyFlag({
                          category: 'ai_advisor_' + (_safety.category || 'concerning'),
                          match: _safety.rationale || 'SEL advisor safety concern',
                          severity: _safety.tier >= 3 ? 'critical' : 'medium',
                          source: 'sel_decisions',
                          context: advPrompt.substring(0, 100),
                          timestamp: new Date().toISOString(),
                          aiGenerated: true,
                          confidence: _safety.tier >= 3 ? 0.9 : 0.7,
                          tier: _safety.tier
                        });
                      }
                      upd('_decisionsTier', _safety.tier || 0);
                    });
                }
                callGemini(systemPrompt).then(function(result) {
                  var text = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                  upd('advResponse', text);
                  upd('advLoading', false);
                  tryAwardBadge('ai_advisor');
                  awardXP(10);
                  logPractice('advisor', 'custom');
                }).catch(function(err) {
                  upd('advLoading', false);
                  addToast('Advisor error: ' + err.message, 'error');
                });
              },
              disabled: advLoading,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: advLoading ? _decBg('#334155') : ACCENT, color: advLoading ? _decFg('#94a3b8') : '#0f172a', fontWeight: 700, fontSize: 13, cursor: advLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
            },
              advLoading ? 'Thinking...' : h(Sparkles, { size: 14 }), advLoading ? null : ' Analyze My Decision'
            )
          ),
          // AI Response
          advResponse && h('div', { style: { padding: 20, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid ' + ACCENT_MED } },
            h('p', { style: { fontSize: 10, color: _decFg(ACCENT), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, 'Decision Framework'),
            h('div', { style: { fontSize: 13, color: _decFg('#e2e8f0'), lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, advResponse)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Progress ──
      // ══════════════════════════════════════════════════════════
      var progressContent = null;
      if (activeTab === 'progress') {
        var totalActs = dtCompleted + edCompleted + csCompleted + biasViewed + vsCompleted + rwCompleted;
        var stats = [
          { label: 'Decision Trees', value: dtCompleted, icon: '\uD83C\uDF33', color: _decFg('#f59e0b') },
          { label: 'Ethical Dilemmas', value: edCompleted, icon: '\u2696\uFE0F', color: _decFg('#8b5cf6') },
          { label: 'Consequence Maps', value: csCompleted, icon: '\uD83D\uDD17', color: _decFg('#ef4444') },
          { label: 'Earlier bias card reveals', value: biasViewed, icon: '\uD83E\uDDE0', color: _decFg('#3b82f6') },
          { label: 'Earlier values sorts', value: vsCompleted, icon: '\uD83C\uDCCF', color: _decFg('#22c55e') },
          { label: 'Real-World Cases', value: rwCompleted, icon: '\uD83C\uDF0D', color: _decFg('#60a5fa') }
        ];

        progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: _decFg('#f1f5f9'), fontSize: 18 } }, '\uD83D\uDCCA Your Progress'),
          // Total
          h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: _decBg('#0f172a'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { fontSize: 40, fontWeight: 700, color: _decFg(ACCENT) } }, totalActs),
            h('div', { style: { fontSize: 13, color: _decFg('#94a3b8') } }, 'Total Activities Completed')
          ),
          // Stats grid
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 } },
            stats.map(function(s) {
              return h('div', {
                key: s.label,
                style: { padding: 16, borderRadius: 12, background: _decBg('#1e293b'), border: '1px solid ' + s.color + '44', textAlign: 'center' }
              },
                h('div', { style: { fontSize: 24 } }, s.icon),
                h('div', { style: { fontSize: 22, fontWeight: 700, color: _decFg(s.color), margin: '4px 0' } }, s.value),
                h('div', { style: { fontSize: 11, color: _decFg('#94a3b8') } }, s.label)
              );
            })
          ),
          // Recent practice log
          practiceLog.length > 0 && h('div', null,
            h('h4', { style: { fontSize: 14, color: _decFg('#f1f5f9'), marginBottom: 8 } }, 'Recent Practice'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              practiceLog.slice(-8).reverse().map(function(entry, i) {
                var icons = { decision: '\uD83C\uDF33', dilemma: '\u2696\uFE0F', consequence: '\uD83D\uDD17', bias: '\uD83E\uDDE0', values: '\uD83C\uDCCF', realworld: '\uD83C\uDF0D', advisor: '\u2728' };
                var labels = { decision: 'Decision Tree', dilemma: 'Ethical Dilemma', consequence: 'Consequence Map', bias: 'Bias Check', values: 'Values Sort', realworld: 'Real-World Case', advisor: 'AI Advisor' };
                return h('div', {
                  key: i,
                  style: { padding: '8px 12px', borderRadius: 8, background: _decBg('#0f172a'), display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }
                },
                  h('span', null, icons[entry.type] || '\uD83D\uDCDD'),
                  h('span', { style: { color: _decFg('#e2e8f0'), fontWeight: 500 } }, labels[entry.type] || entry.type),
                  h('span', { style: { marginLeft: 'auto', color: _decFg('#94a3b8'), fontSize: 11 } }, new Date(entry.timestamp).toLocaleString())
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      // ══════════════════════════════════════════════════════════
      // ── TAB: Print ──
      // ══════════════════════════════════════════════════════════
      var printContent = null;
      if (activeTab === 'print') {
        printContent = h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto' } },
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.4)', borderRight: '1px solid rgba(245,158,11,0.4)', borderBottom: '1px solid rgba(245,158,11,0.4)', borderLeft: '3px solid #f59e0b', marginBottom: 12, fontSize: 12.5, color: _decFg('#78350f'), lineHeight: 1.65 } },
            h('strong', null, '\uD83D\uDDA8 Decision template. '),
            'A one-page structured-decision worksheet you can carry. Apply it to anything from "what classes do I sign up for?" to "do I confront this friend?" The structure slows down the choice enough that the wise answer can show up.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: function() { try { window.print(); } catch (e) {} }, style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)', color: _decFg('#fff'), fontWeight: 800, fontSize: 13 } }, '\uD83D\uDDA8 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#dec-print-region, #dec-print-region * { visibility: visible !important; } ' +
            '#dec-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#dec-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'dec-print-region', style: { padding: 18, borderRadius: 12, background: _decBg('#ffffff'), color: _decFg('#0f172a'), border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: _decFg('#0f172a') } }, 'My Decision Worksheet'),
              h('div', { style: { fontSize: 11, color: _decFg('#475569') } }, 'Structured decision-making')
            ),

            h('div', { style: { padding: 10, background: _decBg('#fffbeb'), border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: _decFg('#78350f') } },
              h('strong', null, 'How to use: '),
              'fill the worksheet by hand on a single decision. Doing this slowly is the work. "Sleeping on it" \u00b7 "talking it through with one person you trust" \u00b7 "writing it out" all live here.'
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '1. The decision in one sentence'),
              h('div', { style: { height: 40, borderBottom: '1px solid #cbd5e1' } })
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '2. Why this matters to me (values at stake)'),
              h('div', { style: { height: 50, borderBottom: '1px solid #cbd5e1' } })
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '3. The options I can see'),
              h('div', { style: { fontSize: 11.5, color: _decFg('#475569'), marginBottom: 6, fontStyle: 'italic' } }, 'Force yourself to list at least 3, even if the third feels silly. The third option is often where the wise answer hides.'),
              [1, 2, 3].map(function(i) { return h('div', { key: i, style: { height: 28, borderBottom: '1px solid #cbd5e1', marginBottom: 4 } }); })
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '4. Consequences across time'),
              h('table', { 'aria-label': 'Consequences across time by option', style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 } },
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', style: { padding: 6, border: '1px solid #cbd5e1', background: _decBg('#f1f5f9'), textAlign: 'left' } }, 'Option'),
                  h('th', { scope: 'col', style: { padding: 6, border: '1px solid #cbd5e1', background: _decBg('#f1f5f9'), textAlign: 'left' } }, 'Short term'),
                  h('th', { scope: 'col', style: { padding: 6, border: '1px solid #cbd5e1', background: _decBg('#f1f5f9'), textAlign: 'left' } }, 'Long term')
                )),
                h('tbody', null,
                  [1, 2, 3].map(function(i) {
                    return h('tr', { key: i },
                      h('th', { scope: 'row', style: { padding: 6, border: '1px solid #cbd5e1', height: 32, textAlign: 'left' } }, String(i)),
                      h('td', { style: { padding: 6, border: '1px solid #cbd5e1' } }, ''),
                      h('td', { style: { padding: 6, border: '1px solid #cbd5e1' } }, '')
                    );
                  })
                )
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '5. Whose voices should be in the room?'),
              h('div', { style: { fontSize: 11.5, color: _decFg('#475569'), marginBottom: 4, fontStyle: 'italic' } }, 'A trusted adult, a friend who knows your context, the person most affected, your own future self looking back.'),
              h('div', { style: { height: 50, borderBottom: '1px solid #cbd5e1' } })
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '6. Bias check'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 11.5, color: _decFg('#0f172a'), lineHeight: 1.6 } },
                h('li', null, 'Am I deciding fast because I am uncomfortable, or because the situation actually requires speed?'),
                h('li', null, 'Am I weighing the short term more than the long term because the short term is louder?'),
                h('li', null, 'Whose approval am I trying to win? Is that approval worth the cost?'),
                h('li', null, 'If a friend brought me this decision, what would I tell them?')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 10, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: _decFg('#475569'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, '7. My choice and my first step'),
              h('div', { style: { fontSize: 11.5, color: _decFg('#475569'), marginBottom: 4 } }, 'Choice:'),
              h('div', { style: { height: 32, borderBottom: '1px solid #cbd5e1', marginBottom: 8 } }),
              h('div', { style: { fontSize: 11.5, color: _decFg('#475569'), marginBottom: 4 } }, 'First step within 24 hours:'),
              h('div', { style: { height: 32, borderBottom: '1px solid #cbd5e1' } })
            ),

            h('div', { style: { padding: 10, background: _decBg('#fffbeb'), border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 10, fontSize: 11.5, color: _decFg('#78350f'), lineHeight: 1.55 } },
              h('strong', null, 'A decision is not final until it is in motion. '),
              'Naming a first step within 24 hours converts deliberation into action. If 24 hours pass without movement, you have actually decided not to.'
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: _decFg('#475569'), lineHeight: 1.5 } },
              'Sources: Kahneman, D. (2011), Thinking, Fast and Slow \u00b7 Heath, C. & Heath, D. (2013), Decisive \u00b7 Linehan, M. (DBT pros and cons skill). Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      var content = dtContent || edContent || csContent || biasContent || vsContent || rwContent || compassContent || advContent || progressContent || printContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('decisions', h, ctx) : null),
        tabBar,
        heroBand,
        badgePopup,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
