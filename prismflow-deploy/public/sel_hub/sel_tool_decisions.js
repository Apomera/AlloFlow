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
    elementary: [
      { id: 'cs1', title: 'Telling a Lie', action: 'You tell your teacher that your dog ate your homework (it didn\'t — you forgot to do it).', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'your teacher', 'your parents'] },
      { id: 'cs2', title: 'Standing Up for Someone', action: 'A kid is getting made fun of at the bus stop. You say, "Hey, that\'s not cool. Stop it."', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'the bullied kid', 'the bully'] },
      { id: 'cs3', title: 'Sharing Your Lunch', action: 'You notice a classmate never has lunch. You start sharing half of yours every day without telling anyone.', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'your classmate', 'their family'] },
      { id: 'cs4', title: 'Excluding Someone', action: 'You tell the new kid they can\'t sit at your lunch table because "it\'s full" (it isn\'t).', categories: ['right away', 'this week', 'over time'], affectedPeople: ['the new kid', 'you', 'your table group'] },
      { id: 'cs5', title: 'Saying Sorry', action: 'You broke your friend\'s toy by accident. Instead of hiding it, you go and say "I\'m sorry, I broke it. Can I help fix it?"', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'your friend', 'the friendship'] },
      { id: 'cs6', title: 'Copying Homework', action: 'You copy your friend\'s math homework every morning because you don\'t understand the material.', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'your friend', 'your math skills'] },
      { id: 'cs6b', title: 'Being the Includer', action: 'Every day at recess, you invite the kid who always plays alone to join your group, even when your friends roll their eyes.', categories: ['right away', 'this week', 'over time'], affectedPeople: ['the lonely kid', 'you', 'your friend group', 'the school culture'] },
      { id: 'cs6c', title: 'The Silent Treatment', action: 'You\'re mad at your friend so you stop talking to them completely. You won\'t tell them why.', categories: ['right away', 'this week', 'over time'], affectedPeople: ['your friend', 'you', 'the friendship', 'other friends caught in the middle'] },
      { id: 'cs6d', title: 'Practicing Every Day', action: 'You decide to practice piano for 15 minutes every single day, even when you don\'t feel like it.', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'your family (hearing practice)', 'your future self'] },
      { id: 'cs6e', title: 'The Tattletale', action: 'Every time a classmate breaks a small rule, you raise your hand and tell the teacher.', categories: ['right away', 'this week', 'over time'], affectedPeople: ['you', 'your classmates', 'the teacher', 'your social reputation'] }
    ],
    middle: [
      { id: 'cs7', title: 'Posting Without Thinking', action: 'You post a rant about a teacher on social media. You name them directly and call them unfair.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'the teacher', 'your school reputation', 'future you'] },
      { id: 'cs8', title: 'Choosing Honesty', action: 'You tell your parent the truth about a bad grade instead of hiding the report card.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'your parents', 'your academic future'] },
      { id: 'cs9', title: 'Starting a Petition', action: 'You start a petition to change a school rule you think is unfair (no phones at lunch).', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'students', 'teachers', 'school admin'] },
      { id: 'cs10', title: 'Ignoring a Friend\'s Pain', action: 'Your friend tells you they\'ve been feeling really down lately. You say "You\'ll be fine" and change the subject.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['your friend', 'you', 'the friendship', 'their mental health'] },
      { id: 'cs11', title: 'Defending the Unpopular Kid', action: 'When everyone is mocking a classmate\'s presentation, you say "Actually, I thought that took guts. Nice job."', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['the presenting student', 'you', 'the classroom culture', 'the mockers'] },
      { id: 'cs12', title: 'Quitting the Team', action: 'You quit the basketball team mid-season because you\'re not getting enough playing time.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'your coach', 'your teammates', 'your commitment reputation'] },
      { id: 'cs12b', title: 'The Apology Text', action: 'After a fight with a friend, you send a long, genuine apology text. You mean every word.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'your friend', 'the friendship', 'your self-respect'] },
      { id: 'cs12c', title: 'Skipping the Hard Class', action: 'You switch from Honors Math to regular Math because it\'s easier and your GPA will be higher.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'your college applications', 'your math readiness', 'your confidence'] },
      { id: 'cs12d', title: 'The Bystander Choice', action: 'You see someone getting bullied in the hallway. You record it on your phone instead of intervening.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['the bullied student', 'you', 'the bully', 'other bystanders', 'the school climate'] },
      { id: 'cs12e', title: 'Volunteering Regularly', action: 'You sign up to volunteer at the animal shelter every Saturday morning, even though it means missing sleeping in.', categories: ['within hours', 'within weeks', 'long-term'], affectedPeople: ['you', 'the animals', 'the shelter staff', 'your character', 'your college app'] }
    ],
    high: [
      { id: 'cs13', title: 'Taking the Shortcut', action: 'You use AI to write your college application essay instead of writing it yourself.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'admissions', 'other applicants', 'your self-knowledge'] },
      { id: 'cs14', title: 'Calling Out Injustice', action: 'You write an editorial for the school paper about racial bias in disciplinary practices, naming specific patterns you\'ve observed.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'affected students', 'administration', 'school culture'] },
      { id: 'cs15', title: 'Cutting Off a Toxic Friend', action: 'You end a long friendship because the person has become manipulative and draining. You tell them why honestly.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'the friend', 'mutual friends', 'your mental health'] },
      { id: 'cs16', title: 'Choosing Money Over Mission', action: 'You turn down a nonprofit internship aligned with your values to take a corporate job that pays three times more.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'the nonprofit', 'your career trajectory', 'your sense of purpose'] },
      { id: 'cs17', title: 'The Gap Year', action: 'Instead of going straight to college, you take a year off to travel and work, against your parents\' wishes.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'your parents', 'your future self', 'your financial situation'] },
      { id: 'cs18', title: 'Reporting a Friend', action: 'You report your close friend for selling drugs at school because you\'re genuinely worried about them and the other students.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['your friend', 'you', 'the friendship', 'other students', 'your friend\'s future'] },
      { id: 'cs18b', title: 'The Honest College Essay', action: 'You write a raw, honest college essay about your family\'s struggles with addiction instead of the "safe" essay about a volunteer trip.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'admissions readers', 'your family', 'your authenticity'] },
      { id: 'cs18c', title: 'Confronting a Mentor', action: 'You tell your favorite teacher that their grading seems biased — certain students consistently get harsher feedback for the same quality of work.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'the teacher', 'affected students', 'the teacher-student relationship', 'school culture'] },
      { id: 'cs18d', title: 'The Social Media Cleanse', action: 'You delete all social media apps for a month to focus on real-life relationships and mental health.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'your online friends', 'your mental health', 'your real-life relationships'] },
      { id: 'cs18e', title: 'Taking the Blame', action: 'Your younger sibling broke something valuable. You take the blame because you know they\'ll get in more trouble than you would.', categories: ['immediately', 'this year', '5 years from now'], affectedPeople: ['you', 'your sibling', 'your parents', 'the sibling relationship', 'your sibling\'s accountability'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Cognitive Biases ──
  // Students learn to recognize thinking traps
  // ══════════════════════════════════════════════════════════════
  var BIAS_DATA = {
    elementary: [
      { id: 'b1', name: 'The Bandwagon Effect', simple: 'Following the Crowd', icon: '\uD83D\uDE8C',
        desc: 'Doing something just because everyone else is doing it, without thinking about whether it\'s right for you.',
        example: 'All your friends say the new movie is amazing, so you say it\'s your favorite too — even though you actually thought it was just okay.',
        question: 'Can you think of a time you changed your opinion to match the group? What did you really think?',
        antidote: 'Before agreeing, ask yourself: "Is this really what I think, or am I just going along?"' },
      { id: 'b2', name: 'Black-and-White Thinking', simple: 'All or Nothing', icon: '\u26AB',
        desc: 'Seeing things as only good or bad, with nothing in between.',
        example: 'You get a B on a test and say "I\'m terrible at math" — even though a B is actually good.',
        question: 'Is there a time you said "always" or "never" about something that was really only "sometimes"?',
        antidote: 'Try replacing "always" and "never" with "sometimes" or "this time."' },
      { id: 'b3', name: 'The Halo Effect', simple: 'Judging by First Look', icon: '\uD83D\uDE07',
        desc: 'Thinking someone is all-good (or all-bad) based on one thing about them.',
        example: 'A new kid has cool shoes, so you assume they\'re nice and fun to play with — before you even talk to them.',
        question: 'Have you ever been surprised that someone was different than you expected?',
        antidote: 'Remember: cool on the outside doesn\'t always mean kind on the inside (and vice versa!).' },
      { id: 'b4', name: 'Wishful Thinking', simple: 'Believing What You Want', icon: '\u2B50',
        desc: 'Believing something is true just because you want it to be true.',
        example: 'You didn\'t study for the spelling test, but you tell yourself "I\'ll just know the words" because you really want to do well.',
        question: 'Has wishing something were true ever gotten in the way of preparing for it?',
        antidote: 'Ask: "Is this what I hope will happen, or what I actually think will happen?"' },
      { id: 'b5', name: 'Blame Shifting', simple: 'It\'s Not My Fault', icon: '\uD83D\uDC48',
        desc: 'Always finding a reason why problems are someone else\'s fault, never your own.',
        example: 'You got in trouble for talking in class, but you say "He started talking to ME first!" — even though you kept the conversation going.',
        question: 'Think of a time you got in trouble. What was YOUR part in what happened?',
        antidote: 'Before blaming someone else, ask: "What was my part in this?"' },
      { id: 'b6', name: 'The Spotlight Effect', simple: 'Everyone Is Watching Me', icon: '\uD83D\uDD26',
        desc: 'Thinking everyone notices your mistakes or embarrassing moments more than they actually do.',
        example: 'You trip in the hallway and think everyone saw. In reality, most people didn\'t even notice.',
        question: 'Do you remember the last time someone else tripped or made a mistake? (Probably not!)',
        antidote: 'Remember: people are usually too busy thinking about themselves to notice your small mistakes.' },
      { id: 'b6b', name: 'The Recency Effect', simple: 'Last Thing Wins', icon: '\uD83D\uDD1D',
        desc: 'Judging something based mostly on the most recent thing that happened, ignoring everything before it.',
        example: 'Your teacher was kind all year, but they gave you a bad grade on one assignment. Now you think they\'re unfair.',
        question: 'Is there someone you\'re judging based only on the last thing they did?',
        antidote: 'Zoom out. Think about the WHOLE picture, not just the last frame.' },
      { id: 'b6c', name: 'The Fairness Fallacy', simple: 'It Should Be Equal', icon: '\u2696\uFE0F',
        desc: 'Believing that everything should always be perfectly equal, even when situations are different.',
        example: 'Your brother gets to stay up later because he\'s older. You say "That\'s not fair!" But fairness doesn\'t always mean same-ness.',
        question: 'Can you think of a time when "equal" and "fair" were actually different things?',
        antidote: 'Fair doesn\'t always mean equal. Sometimes different people need different things.' }
    ],
    middle: [
      { id: 'b7', name: 'Confirmation Bias', simple: 'Seeing What You Expect', icon: '\uD83D\uDD0D',
        desc: 'Only noticing information that agrees with what you already believe, and ignoring anything that doesn\'t.',
        example: 'You think a certain teacher is unfair. You notice every time they\'re strict, but you ignore the times they\'re generous with grades or second chances.',
        question: 'Think about an opinion you hold strongly. What evidence have you been ignoring?',
        antidote: 'Actively look for evidence AGAINST your belief. If your opinion survives, it\'s stronger. If it doesn\'t, you learned something.' },
      { id: 'b8', name: 'Sunk Cost Fallacy', simple: 'Too Far to Quit', icon: '\uD83D\uDCB8',
        desc: 'Continuing something because you\'ve already invested time or effort, even though quitting would be better.',
        example: 'You\'ve watched 4 episodes of a show you hate because you keep hoping it gets better. You\'ve already "invested" the time.',
        question: 'Is there something in your life you keep doing only because you\'ve already put time into it?',
        antidote: 'Ask: "If I were starting fresh today, would I choose this?" If no, it\'s okay to stop.' },
      { id: 'b9', name: 'False Consensus Effect', simple: 'Everyone Agrees With Me', icon: '\uD83D\uDC65',
        desc: 'Assuming that most people share your opinions, values, or behaviors.',
        example: 'You think everyone finds a certain type of music annoying. Then you discover it\'s actually the most popular genre in your grade.',
        question: 'Have you ever been shocked to discover your opinion was actually the minority view?',
        antidote: 'Before saying "everyone thinks..." try asking actual people what they think.' },
      { id: 'b10', name: 'Anchoring Bias', simple: 'Stuck on the First Thing', icon: '\u2693',
        desc: 'Relying too heavily on the first piece of information you receive.',
        example: 'Someone tells you a new student got suspended at their last school. Now everything they do seems suspicious, even though you don\'t know the full story.',
        question: 'Has a first impression ever been completely wrong? What "anchor" were you holding onto?',
        antidote: 'Deliberately seek a SECOND source of information before forming a judgment.' },
      { id: 'b11', name: 'Just-World Fallacy', simple: 'People Get What They Deserve', icon: '\u2696\uFE0F',
        desc: 'Believing that good things happen to good people and bad things happen to bad people — that the world is inherently fair.',
        example: 'A classmate\'s family loses their home. Someone says, "They must have made bad choices." In reality, a medical emergency caused the financial crisis.',
        question: 'Why is it comforting to believe the world is fair? What happens to our empathy when we assume victims "deserved it"?',
        antidote: 'When something bad happens to someone, resist the urge to find a reason they "deserved" it. Sometimes bad things happen to good people.' },
      { id: 'b12', name: 'In-Group Bias', simple: 'My Group Is Better', icon: '\uD83D\uDEE1\uFE0F',
        desc: 'Automatically favoring people who are in your group (friends, team, school) over those who aren\'t.',
        example: 'Your school plays a rival in basketball. A player on your team commits a foul — you say it was nothing. The rival team does the same thing — you say it\'s dirty play.',
        question: 'Have you ever judged the exact same behavior differently based on who did it?',
        antidote: 'Swap the roles in your mind. Would you judge this the same way if the "other side" did it?' },
      { id: 'b12b', name: 'Negativity Bias', simple: 'Bad Sticks More Than Good', icon: '\u2796',
        desc: 'Remembering negative experiences more vividly and letting them weigh more heavily than positive ones.',
        example: 'You get 9 compliments on your outfit and 1 negative comment. At the end of the day, you only think about the negative one.',
        question: 'Think about your day. Are you giving more mental space to the bad moments than the good ones?',
        antidote: 'For every negative thought you catch, deliberately recall two positive things from the same day.' },
      { id: 'b12c', name: 'The Planning Fallacy', simple: 'It\'ll Take Less Time Than You Think', icon: '\u23F0',
        desc: 'Consistently underestimating how long things will take, even when you\'ve been wrong before.',
        example: 'You tell yourself the project will take 2 hours. It took 5 hours last time. It takes 5 hours again. Next time, you\'ll still say 2.',
        question: 'Think about the last big assignment. How long did you think it would take vs. how long it actually took?',
        antidote: 'When estimating time, take your best guess and multiply by 1.5. Your past experience is more reliable than your optimism.' }
    ],
    high: [
      { id: 'b13', name: 'Fundamental Attribution Error', simple: 'Character vs. Circumstance', icon: '\uD83C\uDFAD',
        desc: 'Blaming other people\'s behavior on their character while excusing your own behavior as situational.',
        example: 'When someone cuts you off in traffic, they\'re a terrible driver. When you cut someone off, you were late for something important.',
        question: 'Think of the last time you judged someone harshly. What situation might they have been in?',
        antidote: 'When you catch yourself labeling someone (lazy, rude, selfish), pause and ask: "What circumstances might explain this behavior?"' },
      { id: 'b14', name: 'Availability Heuristic', simple: 'If I Can Remember It, It\'s Common', icon: '\uD83D\uDCF0',
        desc: 'Judging how likely something is based on how easily you can think of examples — which is influenced by media, not statistics.',
        example: 'You\'re afraid of flying but not of driving, even though driving is statistically far more dangerous. Plane crashes make the news; car accidents don\'t.',
        question: 'What risks do you overestimate because of social media or news coverage?',
        antidote: 'Ask: "Am I afraid of this because it\'s common, or because it\'s dramatic and memorable?"' },
      { id: 'b15', name: 'Dunning-Kruger Effect', simple: 'The Less You Know, The More Confident You Feel', icon: '\uD83D\uDCC8',
        desc: 'People with limited knowledge in an area tend to overestimate their competence, while experts tend to underestimate theirs.',
        example: 'After reading one article about economics, someone confidently explains how to fix inflation. An economist with 30 years of experience says "It\'s complicated."',
        question: 'In what areas of your life might you be overconfident? Where might you be underestimating yourself?',
        antidote: 'The more certain you feel about a complex topic, the more important it is to seek out people who disagree with you.' },
      { id: 'b16', name: 'Status Quo Bias', simple: 'Change Is Scary, So Don\'t', icon: '\uD83D\uDFE2',
        desc: 'Preferring things to stay the same, even when change would be better, simply because the current state feels safe.',
        example: 'You stay in a friend group that makes you feel bad because "at least I have friends" — even though making new friends might make you happier.',
        question: 'What in your life are you keeping simply because it\'s familiar, not because it\'s good?',
        antidote: 'Evaluate your current situation as if you were choosing it for the first time. Would you choose this today?' },
      { id: 'b17', name: 'Moral Licensing', simple: 'I Was Good, So I Can Be Bad', icon: '\uD83C\uDF96\uFE0F',
        desc: 'Using past good behavior as permission for future bad behavior.',
        example: 'You volunteered at a food bank on Saturday, so you feel justified being rude to a cashier on Sunday. "I\'m a good person" becomes a free pass.',
        question: 'Have you ever used a good deed as justification for something you know wasn\'t right?',
        antidote: 'Each decision stands alone. Being kind yesterday doesn\'t earn you cruelty credits today.' },
      { id: 'b18', name: 'Narrative Fallacy', simple: 'Making Stories That Aren\'t There', icon: '\uD83D\uDCDA',
        desc: 'Creating a neat, logical story to explain events that were actually random or complex.',
        example: 'A successful CEO drops out of college, so people say "dropping out made them successful." In reality, thousands of dropouts didn\'t become CEOs. The story ignores luck, privilege, and timing.',
        question: 'What "success stories" have you accepted without questioning the hidden factors?',
        antidote: 'When you hear a compelling story about why something happened, ask: "What\'s being left out?"' },
      { id: 'b18b', name: 'Projection Bias', simple: 'Everyone Thinks Like Me', icon: '\uD83D\uDE36',
        desc: 'Assuming other people have the same thoughts, values, and priorities as you do.',
        example: 'You love spontaneity and assume your friend does too. You surprise them with a plan change and they get upset because they value predictability.',
        question: 'When was the last time you assumed someone else wanted what you want — and were wrong?',
        antidote: 'Before assuming what someone wants, ask them. Their inner world is as complex and different as yours.' },
      { id: 'b18c', name: 'The Empathy Gap', simple: 'I Can\'t Imagine Feeling That Way', icon: '\uD83C\uDF21\uFE0F',
        desc: 'Underestimating how emotions affect decisions — both your own future emotions and other people\'s current ones.',
        example: 'When you\'re calm, you say "I\'d never yell at someone over something small." But when you\'re stressed and hungry and tired? You yell.',
        question: 'Think of a time you said "I\'d never do that" about something you later did. What was different about the emotional state?',
        antidote: 'When judging someone\'s behavior, first ask: "What emotional state might they be in?" And when making rules for yourself, plan for your worst day, not your best.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Values Sort Contexts ──
  // Students rank values by importance in different life contexts
  // ══════════════════════════════════════════════════════════════
  var VALUES_SORT = {
    elementary: [
      { id: 'vs1', context: 'Being a good friend', values: ['honesty', 'kindness', 'loyalty', 'fairness', 'fun', 'sharing'] },
      { id: 'vs2', context: 'Being a good student', values: ['hard work', 'curiosity', 'honesty', 'respect', 'helpfulness', 'courage'] },
      { id: 'vs3', context: 'Being a good family member', values: ['love', 'responsibility', 'patience', 'helping out', 'honesty', 'forgiveness'] },
      { id: 'vs4', context: 'Being a good teammate', values: ['fairness', 'encouragement', 'effort', 'sportsmanship', 'teamwork', 'respect'] },
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
    { id: 'first_bias',        icon: '\uD83D\uDD0D', name: 'Bias Spotter',         desc: 'Learn about your first cognitive bias' },
    { id: 'bias_all',          icon: '\uD83E\uDDD0', name: 'Clear Thinker',        desc: 'Study all biases in your grade band' },
    { id: 'ai_advisor',        icon: '\u2728',        name: 'Wisdom Seeker',        desc: 'Use the AI decision advisor' },
    { id: 'total_10',          icon: '\uD83C\uDFC6', name: 'Master Decider',       desc: 'Complete 10 activities across all tabs' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Decision Streak',      desc: 'Practice 3 days in a row' },
    { id: 'values_explorer',   icon: '\uD83D\uDC9C', name: 'Values Explorer',      desc: 'Consider 3+ different values in one decision' },
    { id: 'first_sort',        icon: '\uD83C\uDCCF', name: 'Priority Setter',      desc: 'Complete your first values sort' },
    { id: 'sort_3',            icon: '\uD83C\uDFAF', name: 'Values Architect',     desc: 'Complete 3 values sorts' },
    { id: 'first_realworld',   icon: '\uD83C\uDF0D', name: 'History Student',      desc: 'Analyze your first real-world decision' },
    { id: 'realworld_all',     icon: '\uD83C\uDFDB\uFE0F', name: 'Moral Historian', desc: 'Study all real-world decisions in your grade band' },
    { id: 'compass_done',      icon: '\uD83E\uDDED', name: 'Moral Compass',     desc: 'Complete the Moral Compass assessment' },
    { id: 'compass_balanced',  icon: '\u2696\uFE0F', name: 'Balanced Thinker',  desc: 'Score within 2 points across all ethical frameworks' }
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

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.decisions) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('decisions', key); }
        else { if (ctx.update) ctx.update('decisions', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'decision';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Decision Tree state
      var dtIdx          = d.dtIdx || 0;
      var dtStep         = d.dtStep || 0; // 0=read, 1=values, 2=options, 3=choose, 4=reflect
      var dtValues       = d.dtValues || [];
      var dtChoice       = d.dtChoice || null;
      var dtReflection   = d.dtReflection || '';
      var dtAiResp       = d.dtAiResp || null;
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
      var vsSaved        = d.vsSaved || false;
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
          awardXP(25);
          setTimeout(function() { upd('showBadgePopup', null); }, 3000);
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

      var ACCENT = '#f59e0b';
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
        { id: 'compass',  label: '\uD83E\uDDED Moral Compass' },
        { id: 'advisor',  label: '\u2728 AI Advisor' },
        { id: 'progress', label: '\uD83D\uDCCA Progress' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Decision Making tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(t) {
          var isActive = activeTab === t.id;
          return h('button', { 'aria-label': t.label,
            key: t.id,
            onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
            'aria-selected': isActive,
            role: 'tab',
            style: {
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
              background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8',
              transition: 'all 0.15s'
            }
          }, t.label);
        }),
        // Sound toggle
        h('button', { 'aria-label': 'Toggle panel',
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#94a3b8' },
          title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        // Badge counter
        h('button', { 'aria-label': 'Toggle panel',
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#94a3b8', position: 'relative' }
        },
          '\uD83C\uDFC5',
          Object.keys(earnedBadges).length > 0 && h('span', {             style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: '#0f172a', borderRadius: '50%', width: 14, height: 14, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }
          }, Object.keys(earnedBadges).length)
        )
      );

      // ── Badge Popup ──
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', {             style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' },
            onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', {
              style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', animation: 'fadeIn 0.3s', maxWidth: 300 }
            },
              h('div', { style: { fontSize: 56, marginBottom: 10 } }, popBadge.icon),
              h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
              h('div', { style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
            )
          );
        }
      }

      // ── Badges panel ──
      if (showBadgesPanel) {
        badgePopup = h('div', {           style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, background: 'rgba(0,0,0,0.5)' },
          onClick: function() { upd('showBadgesPanel', false); }
        },
          h('div', {             onClick: function(e) { e.stopPropagation(); },
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto' }
          },
            h('h3', { style: { textAlign: 'center', color: '#f1f5f9', marginBottom: 16, fontSize: 16 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', {
                  key: b.id,
                  style: { padding: 12, borderRadius: 10, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.5 }
                },
                  h('div', { style: { fontSize: 28 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 11, fontWeight: 600, color: earned ? '#f1f5f9' : '#94a3b8', marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, b.desc)
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
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDF33 Decision Tree'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
            'Walk through a structured decision-making process step by step.'
          ),
          // Scenario counter
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
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
                    background: done ? '#22c55e' : current ? ACCENT : '#334155',
                    color: done || current ? '#fff' : '#94a3b8', fontWeight: 600, transition: 'all 0.2s'
                  }
                }, done ? '\u2713' : st.icon),
                i < dtSteps.length - 1 && h('div', { style: { width: 16, height: 2, background: done ? '#22c55e' : '#334155' } })
              );
            })
          ),

          // Step 0: Read the scenario
          dtStep === 0 && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 10, fontWeight: 700 } }, curDt.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 16 } }, curDt.situation),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'I’ve read it',
                onClick: function() { upd('dtStep', 1); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'I\'ve read it \u2192')
            )
          ),

          // Step 1: Identify values at stake
          dtStep === 1 && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDC9C What values are at stake?'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Select all the values that are involved in this decision:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 } },
              ['honesty', 'kindness', 'fairness', 'loyalty', 'courage', 'respect', 'responsibility', 'safety', 'inclusion', 'integrity', 'compassion', 'independence', 'generosity', 'self-care'].map(function(v) {
                var selected = dtValues.indexOf(v) >= 0;
                return h('button', { 'aria-label': 'Toggle sound',
                  key: v,
                  onClick: function() {
                    var newVals = selected ? dtValues.filter(function(x) { return x !== v; }) : dtValues.concat([v]);
                    upd('dtValues', newVals);
                    if (newVals.length >= 3) tryAwardBadge('values_explorer');
                    if (soundEnabled) sfxClick();
                  },
                  style: {
                    padding: '6px 12px', borderRadius: 20, border: '1px solid ' + (selected ? ACCENT : '#334155'),
                    background: selected ? ACCENT_DIM : 'transparent', color: selected ? ACCENT : '#94a3b8',
                    fontSize: 12, cursor: 'pointer', fontWeight: selected ? 600 : 400
                  }
                }, v);
              })
            ),
            h('p', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
              'The scenario involves: ' + curDt.values.join(', ')
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Next: Options',
                onClick: function() {
                  if (dtValues.length === 0) { addToast('Select at least one value!', 'info'); return; }
                  upd('dtStep', 2); if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'Next: Options \u2192')
            )
          ),

          // Step 2: Consider options
          dtStep === 2 && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDD00 What are your options?'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Think about what you could do. Here are some possibilities:'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
              curDt.options.map(function(opt, i) {
                return h('div', {                   key: i,
                  style: { padding: '12px 16px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }
                },
                  h('span', { style: { color: ACCENT, fontWeight: 700, fontSize: 14 } }, String.fromCharCode(65 + i) + '.'),
                  opt
                );
              })
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Next: Choose',
                onClick: function() { upd('dtStep', 3); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'Next: Choose \u2192')
            )
          ),

          // Step 3: Make your choice
          dtStep === 3 && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\u2705 What would you choose?'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Pick the option that best aligns with the values you identified:'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
              curDt.options.map(function(opt, i) {
                var isChosen = dtChoice === i;
                return h('button', { 'aria-label': String.fromCharCode(65 + i) + '.',
                  key: i,
                  onClick: function() { upd('dtChoice', i); if (soundEnabled) sfxClick(); },
                  style: {
                    padding: '12px 16px', borderRadius: 10, border: '2px solid ' + (isChosen ? ACCENT : '#334155'),
                    background: isChosen ? ACCENT_DIM : '#1e293b', color: '#e2e8f0', fontSize: 13, cursor: 'pointer',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8
                  }
                },
                  h('span', { style: { color: isChosen ? ACCENT : '#94a3b8', fontWeight: 700, fontSize: 14 } }, String.fromCharCode(65 + i) + '.'),
                  opt
                );
              })
            ),
            dtChoice != null && h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Next: Reflect',
                onClick: function() { upd('dtStep', 4); if (soundEnabled) sfxThink(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, 'Next: Reflect \u2192')
            )
          ),

          // Step 4: Reflect with AI
          dtStep === 4 && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 14, marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDCAD Reflect on your choice'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
              'You chose: "' + curDt.options[dtChoice] + '". Why? What might happen as a result?'
            ),
            h('textarea', {
              value: dtReflection,
              onChange: function(e) { upd('dtReflection', e.target.value); },
              'aria-label': 'Decision tree reflection',
              placeholder: band === 'elementary' ? 'I chose this because...' : 'I chose this because... The consequences might be... It connects to the values of...',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }
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
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: dtAiLoad ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: dtAiLoad ? 'default' : 'pointer' }
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
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\u2705 Complete & Next')
            ),
            // AI Response
            dtAiResp && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #6366f144', marginTop: 16 } },
              h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2728 Decision Analysis'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, dtAiResp)
            )
          ),

          // Skip link
          dtStep === 0 && h('div', { style: { textAlign: 'center', marginTop: 4 } },
            h('button', { 'aria-label': 'Skip to another scenario',
              onClick: function() {
                upd({ dtIdx: dtIdx + 1, dtStep: 0, dtValues: [], dtChoice: null, dtReflection: '', dtAiResp: null });
                if (soundEnabled) sfxClick();
              },
              style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
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
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u2696\uFE0F Ethical Dilemmas'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
            'No clear right answer \u2014 weigh competing values and defend your reasoning.'
          ),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Dilemma ' + ((edIdx % edScenarios.length) + 1) + ' of ' + edScenarios.length +
            (edCompleted > 0 ? ' \u00B7 ' + edCompleted + ' explored' : '')
          ),
          // Dilemma card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 10, fontWeight: 700 } }, curEd.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 } }, curEd.dilemma),
            // Values in tension
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 } },
              h('div', { style: { padding: '8px 14px', borderRadius: 10, background: '#3b82f622', border: '1px solid #3b82f644', color: '#60a5fa', fontSize: 12, fontWeight: 600 } }, curEd.valueA),
              h('span', { style: { color: '#94a3b8', fontSize: 16, fontWeight: 700 } }, 'vs'),
              h('div', { style: { padding: '8px 14px', borderRadius: 10, background: '#ef444422', border: '1px solid #ef444444', color: '#f87171', fontSize: 12, fontWeight: 600 } }, curEd.valueB)
            )
          ),
          // Arguments for each side
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 } },
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, fontWeight: 600, color: '#60a5fa', marginBottom: 4 } }, 'Argument for: ' + curEd.valueA),
              h('textarea', {
                value: edSideA,
                onChange: function(e) { upd('edSideA', e.target.value); },
                'aria-label': 'Arguments for side A',
                placeholder: 'Why might this value matter more here?',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #3b82f644', background: '#1e293b', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            ),
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 4 } }, 'Argument for: ' + curEd.valueB),
              h('textarea', {
                value: edSideB,
                onChange: function(e) { upd('edSideB', e.target.value); },
                'aria-label': 'Arguments for side B',
                placeholder: 'Why might this value matter more here?',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #ef444444', background: '#1e293b', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            )
          ),
          // Your verdict
          h('div', { style: { marginBottom: 16 } },
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 } }, 'Your verdict \u2014 what would you do and why?'),
            h('textarea', {
              value: edVerdict,
              onChange: function(e) { upd('edVerdict', e.target.value); },
              'aria-label': 'Your verdict',
              placeholder: 'I would lean toward... because...',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            })
          ),
          // Think about it
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Think about it'),
            h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic' } }, curEd.thinkAbout)
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
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: edAiLoad ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: edAiLoad ? 'default' : 'pointer' }
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
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Complete & Next \u2192')
          ),
          // AI Response
          edAiResp && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #6366f144' } },
            h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2728 Ethical Analysis'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, edAiResp)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Consequence Map ──
      // ══════════════════════════════════════════════════════════
      var csContent = null;
      if (activeTab === 'consequence') {
        var csScenarios = CONSEQUENCE_SCENARIOS[band] || CONSEQUENCE_SCENARIOS.elementary;
        var curCs = csScenarios[csIdx % csScenarios.length];

        csContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDD17 Consequence Map'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
            'Trace the ripple effects of a choice across time and people.'
          ),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((csIdx % csScenarios.length) + 1) + ' of ' + csScenarios.length +
            (csCompleted > 0 ? ' \u00B7 ' + csCompleted + ' mapped' : '')
          ),
          // Action card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 8, fontWeight: 700 } }, curCs.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, curCs.action),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              curCs.affectedPeople.map(function(p) {
                return h('span', {
                  key: p,
                  style: { fontSize: 10, color: '#94a3b8', background: '#1e293b', padding: '3px 8px', borderRadius: 6 }
                }, '\uD83D\uDC64 ' + p);
              })
            )
          ),
          // Time-based consequence inputs
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 } },
            // Short-term
            h('div', null,
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fbbf24', marginBottom: 4 } },
                '\u26A1', curCs.categories[0]
              ),
              h('textarea', {
                value: csShort,
                onChange: function(e) { upd('csShort', e.target.value); },
                'aria-label': 'Short-term consequences',
                placeholder: 'What happens ' + curCs.categories[0] + '? Who is affected and how?',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #fbbf2444', background: '#1e293b', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            ),
            // Medium-term
            h('div', null,
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fb923c', marginBottom: 4 } },
                '\uD83D\uDD52', curCs.categories[1]
              ),
              h('textarea', {
                value: csMid,
                onChange: function(e) { upd('csMid', e.target.value); },
                'aria-label': 'Medium-term consequences',
                placeholder: 'What happens ' + curCs.categories[1] + '? How do things change?',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #fb923c44', background: '#1e293b', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            ),
            // Long-term
            h('div', null,
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 4 } },
                '\uD83C\uDF0D', curCs.categories[2]
              ),
              h('textarea', {
                value: csLong,
                onChange: function(e) { upd('csLong', e.target.value); },
                'aria-label': 'Long-term consequences',
                placeholder: 'What happens ' + curCs.categories[2] + '? What lasting effects might there be?',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 10, border: '1px solid #f8717144', background: '#1e293b', color: '#f1f5f9', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
              })
            )
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                if (!csShort.trim() && !csMid.trim() && !csLong.trim()) { addToast('Fill in at least one time period!', 'info'); return; }
                var newDone = csCompleted + 1;
                upd({ csSaved: true, csCompleted: newDone });
                logPractice('consequence', curCs.id);
                awardXP(15);
                tryAwardBadge('first_consequence');
                if (newDone >= 3) tryAwardBadge('consequence_3');
                if (soundEnabled) sfxCorrect();
                addToast('Consequence map saved!', 'success');
                ctx.announceToSR && ctx.announceToSR('Consequence map saved');
              },
              disabled: csSaved,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: csSaved ? '#22c55e' : ACCENT, color: csSaved ? '#fff' : '#0f172a', fontWeight: 600, fontSize: 13, cursor: csSaved ? 'default' : 'pointer' }
            }, csSaved ? '\u2705 Saved!' : '\uD83D\uDCBE Save Map'),
            csSaved && h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                upd({ csIdx: csIdx + 1, csShort: '', csMid: '', csLong: '', csSaved: false });
                if (soundEnabled) sfxClick();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Bias Check ──
      // ══════════════════════════════════════════════════════════
      var biasContent = null;
      if (activeTab === 'bias') {
        var biases = BIAS_DATA[band] || BIAS_DATA.elementary;
        var curBias = biases[biasIdx % biases.length];

        biasContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83E\uDDE0 Bias Check'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
            'Learn to recognize the thinking traps that lead to bad decisions.'
          ),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Bias ' + ((biasIdx % biases.length) + 1) + ' of ' + biases.length +
            (biasViewed > 0 ? ' \u00B7 ' + biasViewed + ' studied' : '')
          ),
          // Bias card - name only (click to reveal)
          !biasRevealed && h('div', { onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
            onClick: function() {
              upd('biasRevealed', true);
              if (soundEnabled) sfxReveal();
              var newViewed = biasViewed + 1;
              upd('biasViewed', newViewed);
              logPractice('bias', curBias.id);
              awardXP(10);
              tryAwardBadge('first_bias');
              if (newViewed >= biases.length) tryAwardBadge('bias_all');
            },
            style: { padding: 30, borderRadius: 14, background: '#0f172a', border: '2px dashed ' + ACCENT_MED, cursor: 'pointer', textAlign: 'center', marginBottom: 16 },
            role: 'button', tabIndex: 0
          },
            h('div', { style: { fontSize: 40, marginBottom: 8 } }, curBias.icon),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, curBias.simple),
            h('div', { style: { fontSize: 12, color: '#94a3b8' } }, 'Tap to learn about this thinking trap')
          ),
          // Revealed bias detail
          biasRevealed && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
              h('span', { style: { fontSize: 32 } }, curBias.icon),
              h('div', null,
                h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, curBias.name),
                h('div', { style: { fontSize: 12, color: ACCENT } }, curBias.simple)
              )
            ),
            // What is it?
            h('div', { style: { marginBottom: 14 } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'What is it?'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, curBias.desc)
            ),
            // Example
            h('div', { style: { marginBottom: 14 } },
              h('p', { style: { fontSize: 10, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Example'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, fontStyle: 'italic' } }, curBias.example)
            ),
            // Self-check question
            h('div', { style: { padding: 14, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 14 } },
              h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Ask yourself'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, curBias.question)
            ),
            // Antidote
            h('div', { style: { padding: 14, borderRadius: 10, background: '#22c55e11', border: '1px solid #22c55e33' } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Antidote'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, curBias.antidote)
            )
          ),
          // Reflection area (after reveal)
          biasRevealed && h('div', { style: { marginBottom: 16 } },
            h('textarea', {
              value: biasReflection,
              onChange: function(e) { upd('biasReflection', e.target.value); },
              'aria-label': 'Bias reflection',
              placeholder: 'Can you think of a time this bias affected YOUR thinking?',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
            })
          ),
          // Next bias
          biasRevealed && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next Bias',
              onClick: function() {
                upd({ biasIdx: biasIdx + 1, biasRevealed: false, biasReflection: '' });
                if (soundEnabled) sfxClick();
                ctx.announceToSR && ctx.announceToSR('Next bias loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Bias \u2192')
          ),
          // Skip
          !biasRevealed && h('div', { style: { textAlign: 'center', marginTop: 4 } },
            h('button', { 'aria-label': 'Skip to another bias',
              onClick: function() {
                upd({ biasIdx: biasIdx + 1, biasRevealed: false, biasReflection: '' });
                if (soundEnabled) sfxClick();
              },
              style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
            }, 'Skip to another bias \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Values Sort ──
      // Interactive card-ranking: prioritize values in context
      // ══════════════════════════════════════════════════════════
      var vsContent = null;
      if (activeTab === 'values') {
        var vsSorts = VALUES_SORT[band] || VALUES_SORT.elementary;
        var curVs = vsSorts[vsIdx % vsSorts.length];
        // Initialize ranking if empty or wrong context
        var ranking = vsRanking.length === curVs.values.length ? vsRanking : curVs.values.slice();

        function moveValue(fromIdx, toIdx) {
          if (toIdx < 0 || toIdx >= ranking.length) return;
          var newRanking = ranking.slice();
          var item = newRanking.splice(fromIdx, 1)[0];
          newRanking.splice(toIdx, 0, item);
          upd('vsRanking', newRanking);
          if (soundEnabled) sfxClick();
        }

        vsContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDCCF Values Sort'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
            'Rank these values from MOST to LEAST important for this situation. There are no wrong answers!'
          ),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Context ' + ((vsIdx % vsSorts.length) + 1) + ' of ' + vsSorts.length +
            (vsCompleted > 0 ? ' \u00B7 ' + vsCompleted + ' completed' : '')
          ),
          // Context card
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'center' } },
            h('p', { style: { fontSize: 11, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'What matters most when...'),
            h('p', { style: { fontSize: 16, color: '#f1f5f9', fontWeight: 700 } }, curVs.context + '?')
          ),
          // Ranking list
          h('div', { style: { marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 } },
            ranking.map(function(val, i) {
              var medalColors = ['#f59e0b', '#94a3b8', '#cd7f32', '#94a3b8', '#475569', '#334155'];
              var medalLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
              return h('div', {
                key: val,
                style: {
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                  background: '#1e293b', border: '1px solid ' + (i === 0 ? '#f59e0b44' : '#334155'),
                  transition: 'all 0.15s'
                }
              },
                // Rank medal
                h('div', {                   style: { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: medalColors[i] + '33', color: medalColors[i], flexShrink: 0 }
                }, medalLabels[i]),
                // Value name
                h('span', { style: { flex: 1, color: '#e2e8f0', fontSize: 14, fontWeight: i === 0 ? 700 : 500 } }, val),
                // Move buttons
                h('button', { 'aria-label': 'Move buttons',
                  onClick: function() { moveValue(i, i - 1); },
                  disabled: i === 0,
                  style: { width: 28, height: 28, borderRadius: 6, border: 'none', background: i === 0 ? '#1e293b' : '#334155', color: i === 0 ? '#334155' : '#e2e8f0', cursor: i === 0 ? 'default' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                }, '\u25B2'),
                h('button', { 'aria-label': 'Values sort saved',
                  onClick: function() { moveValue(i, i + 1); },
                  disabled: i === ranking.length - 1,
                  style: { width: 28, height: 28, borderRadius: 6, border: 'none', background: i === ranking.length - 1 ? '#1e293b' : '#334155', color: i === ranking.length - 1 ? '#334155' : '#e2e8f0', cursor: i === ranking.length - 1 ? 'default' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                }, '\u25BC')
              );
            })
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { 'aria-label': 'Next Context',
              onClick: function() {
                var newDone = vsCompleted + 1;
                upd({ vsSaved: true, vsCompleted: newDone });
                logPractice('values', curVs.id);
                awardXP(15);
                tryAwardBadge('first_sort');
                if (newDone >= 3) tryAwardBadge('sort_3');
                if (soundEnabled) sfxCorrect();
                addToast('Values sort saved! Your #1: ' + ranking[0], 'success');
                ctx.announceToSR && ctx.announceToSR('Values sort saved');
              },
              disabled: vsSaved,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: vsSaved ? '#22c55e' : ACCENT, color: vsSaved ? '#fff' : '#0f172a', fontWeight: 600, fontSize: 13, cursor: vsSaved ? 'default' : 'pointer' }
            }, vsSaved ? '\u2705 Saved!' : '\uD83D\uDCBE Save Ranking'),
            vsSaved && h('button', { 'aria-label': 'Next Context',
              onClick: function() {
                upd({ vsIdx: vsIdx + 1, vsRanking: [], vsSaved: false });
                if (soundEnabled) sfxClick();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Context \u2192')
          ),
          // Reflection prompt
          vsSaved && h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, 'Reflect'),
            h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } },
              'You ranked "' + ranking[0] + '" as most important and "' + ranking[ranking.length - 1] + '" as least. Would someone else rank them the same way? Why might their ranking be different?'
            )
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
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDF0D Real-World Decisions'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } },
            'Study real decisions that changed history. What would YOU have done?'
          ),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Case ' + ((rwIdx % rwCases.length) + 1) + ' of ' + rwCases.length +
            (rwCompleted > 0 ? ' \u00B7 ' + rwCompleted + ' analyzed' : '')
          ),
          // Case card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #3b82f644', marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
              h('h4', { style: { color: '#60a5fa', fontSize: 16, fontWeight: 700, margin: 0 } }, curRw.title),
              h('span', { style: { fontSize: 11, color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: 6 } }, curRw.year)
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 12 } }, curRw.summary),
            // The decision
            h('div', { style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #3b82f633', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'The Decision'),
              h('p', { style: { fontSize: 13, color: '#f1f5f9', fontWeight: 600 } }, curRw.decision)
            ),
            // Values tested
            h('div', { style: { marginBottom: 12 } },
              h('span', { style: { fontSize: 10, color: ACCENT, background: ACCENT_DIM, padding: '3px 10px', borderRadius: 6, fontWeight: 600 } }, '\u2696\uFE0F ' + curRw.valuesTested)
            ),
            // Impact
            h('div', { style: { padding: 12, borderRadius: 10, background: '#22c55e11', border: '1px solid #22c55e33' } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'What Happened'),
              h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, curRw.impact)
            )
          ),
          // Reflection question
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Your Turn'),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 10 } }, curRw.question),
            h('textarea', {
              value: rwReflection,
              onChange: function(e) { upd('rwReflection', e.target.value); },
              'aria-label': 'Real-world decision reflection',
              placeholder: 'What would you have done? What makes this decision so hard?',
              rows: 4,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
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
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: rwAiLoad ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: rwAiLoad ? 'default' : 'pointer' }
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
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Complete & Next \u2192')
          ),
          // AI Response
          rwAiResp && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #6366f144' } },
            h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2728 Historical Analysis'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, rwAiResp)
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Moral Compass ──
      // Quick-fire agree/disagree → reveals ethical framework
      // ══════════════════════════════════════════════════════════
      var compassContent = null;
      if (activeTab === 'compass') {
        var mcStatements = COMPASS_STATEMENTS[band] || COMPASS_STATEMENTS.elementary;
        var answeredCount = Object.keys(mcAnswers).length;
        var allAnswered = answeredCount >= mcStatements.length;

        // Calculate scores
        var scores = { U: 0, D: 0, V: 0, C: 0 };
        if (allAnswered) {
          mcStatements.forEach(function(s) {
            var ans = mcAnswers[s.id];
            if (ans === 'agree') scores[s.tag] += 2;
            else if (ans === 'sometimes') scores[s.tag] += 1;
            // disagree = 0
          });
        }
        var maxScore = Math.max(scores.U, scores.D, scores.V, scores.C);
        var dominant = Object.keys(scores).filter(function(k) { return scores[k] === maxScore; });
        var totalScore = scores.U + scores.D + scores.V + scores.C;
        var scoreRange = maxScore - Math.min(scores.U, scores.D, scores.V, scores.C);

        compassContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83E\uDDED Moral Compass'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            allAnswered && !mcDone
              ? 'All questions answered! See your results below.'
              : mcDone
              ? 'Your ethical framework profile is below.'
              : 'Answer these quick moral questions to discover your ethical thinking style. There are no wrong answers!'
          ),

          // Progress bar
          !mcDone && h('div', { style: { marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 11, color: '#94a3b8' } }, answeredCount + ' of ' + mcStatements.length),
              h('span', { style: { fontSize: 11, color: ACCENT } }, Math.round((answeredCount / mcStatements.length) * 100) + '%')
            ),
            h('div', { style: { height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden' } },
              h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((answeredCount / mcStatements.length) * 100) + '%', transition: 'width 0.3s' } })
            )
          ),

          // Statements list (not done yet)
          !mcDone && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } },
            mcStatements.map(function(s, i) {
              var answered = mcAnswers[s.id];
              return h('div', {
                key: s.id,
                style: { padding: '14px 16px', borderRadius: 12, background: '#0f172a', border: '1px solid ' + (answered ? '#22c55e44' : '#334155') }
              },
                h('p', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 10, lineHeight: 1.5 } },
                  h('span', { style: { color: '#94a3b8', fontWeight: 700, marginRight: 6 } }, (i + 1) + '.'),
                  s.text
                ),
                h('div', { style: { display: 'flex', gap: 6 } },
                  ['agree', 'sometimes', 'disagree'].map(function(choice) {
                    var isSelected = answered === choice;
                    var colors = { agree: '#22c55e', sometimes: '#f59e0b', disagree: '#ef4444' };
                    var labels = { agree: 'Agree', sometimes: 'It Depends', disagree: 'Disagree' };
                    return h('button', { 'aria-label': 'Toggle sound',
                      key: choice,
                      onClick: function() {
                        var newAnswers = Object.assign({}, mcAnswers);
                        newAnswers[s.id] = choice;
                        upd('mcAnswers', newAnswers);
                        if (soundEnabled) sfxClick();
                      },
                      style: {
                        flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: isSelected ? 700 : 500, cursor: 'pointer',
                        border: '1px solid ' + (isSelected ? colors[choice] : '#334155'),
                        background: isSelected ? colors[choice] + '22' : 'transparent',
                        color: isSelected ? colors[choice] : '#94a3b8'
                      }
                    }, labels[choice]);
                  })
                )
              );
            })
          ),

          // Submit button (all answered but not done)
          allAnswered && !mcDone && h('div', { style: { textAlign: 'center', marginBottom: 16 } },
            h('button', { 'aria-label': 'Reveal My Moral Compass',
              onClick: function() {
                upd('mcDone', true);
                logPractice('compass', 'assessment');
                awardXP(25);
                tryAwardBadge('compass_done');
                if (scoreRange <= 2) tryAwardBadge('compass_balanced');
                if (soundEnabled) sfxCorrect();
                if (celebrate) celebrate();
                ctx.announceToSR && ctx.announceToSR('Moral compass results ready');
              },
              style: { padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
            }, '\uD83E\uDDED Reveal My Moral Compass')
          ),

          // Results
          mcDone && h('div', null,
            // Framework bars
            h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('h4', { style: { color: '#f1f5f9', fontSize: 14, marginBottom: 12, textAlign: 'center' } }, 'Your Ethical Framework Profile'),
              ['U', 'D', 'V', 'C'].map(function(tag) {
                var fw = COMPASS_FRAMEWORKS[tag];
                var pct = totalScore > 0 ? Math.round((scores[tag] / (mcStatements.filter(function(s) { return s.tag === tag; }).length * 2)) * 100) : 0;
                var isDominant = dominant.indexOf(tag) >= 0;
                return h('div', { key: tag, style: { marginBottom: 14 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontSize: 16 } }, fw.icon),
                      h('span', { style: { fontSize: 12, fontWeight: isDominant ? 700 : 500, color: isDominant ? fw.color : '#94a3b8' } }, fw.name)
                    ),
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: fw.color } }, pct + '%')
                  ),
                  h('div', { style: { height: 10, borderRadius: 5, background: '#334155', overflow: 'hidden' } },
                    h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', style: { height: '100%', borderRadius: 5, background: fw.color, width: pct + '%', transition: 'width 0.5s' } })
                  )
                );
              })
            ),
            // Dominant framework explanation
            dominant.length > 0 && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + COMPASS_FRAMEWORKS[dominant[0]].color + '44', marginBottom: 16 } },
              h('p', { style: { fontSize: 10, color: COMPASS_FRAMEWORKS[dominant[0]].color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } },
                dominant.length > 1 ? 'Your blend' : 'Your primary framework'
              ),
              dominant.map(function(tag) {
                var fw = COMPASS_FRAMEWORKS[tag];
                return h('div', { key: tag, style: { marginBottom: dominant.length > 1 ? 10 : 0 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { style: { fontSize: 24 } }, fw.icon),
                    h('span', { style: { fontSize: 15, fontWeight: 700, color: fw.color } }, fw.name)
                  ),
                  h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 } }, fw.desc)
                );
              })
            ),
            // Get AI deeper analysis
            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('button', { 'aria-label': 'Get AI deeper analysis',
                onClick: function() {
                  if (!callGemini) { addToast('AI not available.', 'error'); return; }
                  upd('mcAiLoad', true);
                  upd('mcAiResp', null);
                  var agreePairs = mcStatements.filter(function(s) { return mcAnswers[s.id] === 'agree'; }).map(function(s) { return '"' + s.text + '" (' + s.tag + ')'; });
                  var disagreePairs = mcStatements.filter(function(s) { return mcAnswers[s.id] === 'disagree'; }).map(function(s) { return '"' + s.text + '" (' + s.tag + ')'; });
                  var prompt = 'You are a philosophy teacher for ' + band + ' school students.\n\n' +
                    'A student just completed a moral compass assessment. Here are their scores:\n' +
                    'Consequentialist (U): ' + scores.U + '\nPrincipled (D): ' + scores.D + '\nVirtue (V): ' + scores.V + '\nCare (C): ' + scores.C + '\n\n' +
                    'They AGREED with: ' + (agreePairs.length > 0 ? agreePairs.join('; ') : 'none') + '\n' +
                    'They DISAGREED with: ' + (disagreePairs.length > 0 ? disagreePairs.join('; ') : 'none') + '\n\n' +
                    'Provide a thoughtful, personal analysis:\n' +
                    '1. Name their dominant ethical style and explain what it means in everyday life\n' +
                    '2. Point out one interesting tension or surprise in their answers (where they broke from their pattern)\n' +
                    '3. Describe a real situation where their framework would serve them well\n' +
                    '4. Describe one situation where it might be challenged\n' +
                    '5. End with an empowering observation about their moral thinking\n\n' +
                    'Use ' + (band === 'elementary' ? 'simple, warm language for ages 5-10.' : band === 'middle' ? 'engaging language for ages 11-14.' : 'intellectually stimulating language for ages 15-18.') + '\n' +
                    'Keep it under 250 words. Be affirming — every framework has strengths.';
                  callGemini(prompt).then(function(result) {
                    var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                    upd('mcAiResp', resp);
                    upd('mcAiLoad', false);
                  }).catch(function(err) {
                    upd('mcAiLoad', false);
                    addToast('Error: ' + err.message, 'error');
                  });
                },
                disabled: mcAiLoad,
                style: { padding: '12px 24px', borderRadius: 10, border: 'none', background: mcAiLoad ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: mcAiLoad ? 'default' : 'pointer' }
              }, mcAiLoad ? 'Analyzing your ethics...' : '\u2728 Get Personalized Analysis')
            ),
            mcAiResp && h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid #6366f144', marginBottom: 16 } },
              h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, '\u2728 Your Moral Profile'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, mcAiResp)
            ),
            // Retake
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Retake the assessment',
                onClick: function() {
                  upd({ mcAnswers: {}, mcDone: false, mcAiResp: null });
                  if (soundEnabled) sfxClick();
                },
                style: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }
              }, 'Retake the assessment')
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: AI Advisor ──
      // ══════════════════════════════════════════════════════════
      var advContent = null;
      if (activeTab === 'advisor') {
        advContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u2728 Decision Advisor'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
            'Describe a real decision you\'re facing and get structured thinking tools to help.'
          ),
          h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('textarea', {
              value: advPrompt,
              onChange: function(e) { upd('advPrompt', e.target.value); },
              'aria-label': 'Describe your decision for AI advisor',
              placeholder: band === 'elementary'
                ? 'Tell me about something you need to decide. For example: "I can\'t decide if I should try out for the play or join soccer..."'
                : 'Describe a decision you\'re facing. Include what makes it hard — the competing values, the people involved, the pressure you feel...',
              rows: 5,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('button', { 'aria-label': 's decision:',
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
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: advLoading ? '#334155' : ACCENT, color: advLoading ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: 13, cursor: advLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
            },
              advLoading ? 'Thinking...' : h(Sparkles, { size: 14 }), advLoading ? null : ' Analyze My Decision'
            )
          ),
          // AI Response
          advResponse && h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontWeight: 700 } }, 'Decision Framework'),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, advResponse)
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
          { label: 'Decision Trees', value: dtCompleted, icon: '\uD83C\uDF33', color: '#f59e0b' },
          { label: 'Ethical Dilemmas', value: edCompleted, icon: '\u2696\uFE0F', color: '#8b5cf6' },
          { label: 'Consequence Maps', value: csCompleted, icon: '\uD83D\uDD17', color: '#ef4444' },
          { label: 'Biases Studied', value: biasViewed, icon: '\uD83E\uDDE0', color: '#3b82f6' },
          { label: 'Values Sorted', value: vsCompleted, icon: '\uD83C\uDCCF', color: '#22c55e' },
          { label: 'Real-World Cases', value: rwCompleted, icon: '\uD83C\uDF0D', color: '#60a5fa' }
        ];

        progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Progress'),
          // Total
          h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { fontSize: 40, fontWeight: 700, color: ACCENT } }, totalActs),
            h('div', { style: { fontSize: 13, color: '#94a3b8' } }, 'Total Activities Completed')
          ),
          // Stats grid
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 } },
            stats.map(function(s) {
              return h('div', {
                key: s.label,
                style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + s.color + '44', textAlign: 'center' }
              },
                h('div', { style: { fontSize: 24 } }, s.icon),
                h('div', { style: { fontSize: 22, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.label)
              );
            })
          ),
          // Recent practice log
          practiceLog.length > 0 && h('div', null,
            h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Practice'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              practiceLog.slice(-8).reverse().map(function(entry, i) {
                var icons = { decision: '\uD83C\uDF33', dilemma: '\u2696\uFE0F', consequence: '\uD83D\uDD17', bias: '\uD83E\uDDE0', values: '\uD83C\uDCCF', realworld: '\uD83C\uDF0D', advisor: '\u2728' };
                var labels = { decision: 'Decision Tree', dilemma: 'Ethical Dilemma', consequence: 'Consequence Map', bias: 'Bias Check', values: 'Values Sort', realworld: 'Real-World Case', advisor: 'AI Advisor' };
                return h('div', {
                  key: i,
                  style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }
                },
                  h('span', null, icons[entry.type] || '\uD83D\uDCDD'),
                  h('span', { style: { color: '#e2e8f0', fontWeight: 500 } }, labels[entry.type] || entry.type),
                  h('span', { style: { marginLeft: 'auto', color: '#94a3b8', fontSize: 11 } }, new Date(entry.timestamp).toLocaleString())
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      var content = dtContent || edContent || csContent || biasContent || vsContent || rwContent || compassContent || advContent || progressContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        badgePopup,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content)
      );
    }
  });
})();
