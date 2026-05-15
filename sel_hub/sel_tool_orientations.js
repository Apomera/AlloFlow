// ═══════════════════════════════════════════════════════════════
// sel_tool_orientations.js · Orientations: Ways of Living, Compared
// A comparative philosophy tool. Eight traditions, organized by the
// big questions they answer differently. Non-prescriptive: the point
// is to know what's available, not to pick a single "correct" one.
// Each tradition has a "what it cannot do well" panel to model
// honest comparison without buffet-style spirituality.
// Registered tool ID: "orientations"
// Category: inner-work
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('orientations'))) {
(function() {
  'use strict';

  // WCAG 4.1.3 live region
  (function() {
    if (document.getElementById('allo-live-orientations')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-orientations';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ═══════════════════════════════════════════════════════════
  // TRADITIONS
  // Eight philosophical orientations, each with substantive content
  // and an honest "limits" panel. Indigenous relationality is framed
  // explicitly as a recurring orientation across many distinct
  // Indigenous nations, not a single monolithic philosophy. Wabanaki
  // and other specific Indigenous nations have their own authoritative
  // teachers; this tool points to them, not over them.
  // ═══════════════════════════════════════════════════════════
  var TRADITIONS = [
    {
      id: 'daoism', name: 'Daoism (Wuwei)', icon: '☯', color: '#0ea5e9',
      origin: 'Ancient China, traditionally traced to Laozi (Dao De Jing) and Zhuangzi, roughly 6th to 4th century BCE. Living tradition with monastic, folk, and philosophical lineages.',
      core: (
        'The Dao (the Way) is the natural flow of how things actually are. The central practice is ' +
        'wuwei: usually translated as "non-coercive action" or "effortless action." Wuwei is not passivity. ' +
        'It is acting in alignment with the grain of a situation rather than against it. Water carves ' +
        'canyons not by force but by patience and yielding. The skilled chef cuts at the natural joints ' +
        'of the meat and the knife stays sharp. Wuwei asks: what does this situation actually need from ' +
        'me, versus what does my ego want to impose on it?'
      ),
      practices: [
        'Notice when you are forcing something. Ask whether the situation is asking for that force, or whether your effort is in the way.',
        'Practice "softness" as a strength: the willow that bends survives the storm; the oak that resists breaks.',
        'Cultivate ziran ("self-so") · letting things be what they naturally are without needing to control them.',
        'Pay attention to small natural patterns. Daoism is rich in metaphor from water, breath, season.'
      ],
      onSuffering: 'Suffering often comes from straining against the flow of how things are. Loosen your grip. The flow contains both your wishes and what is actually happening; you do not have to win.',
      onGoodLife: 'A good life is one in alignment with the Dao: simple, attentive, responsive, not driven by status or accumulation. Practical wisdom is more central than abstract knowledge.',
      onAction: 'Act minimally. Do what the situation needs and stop. Most problems do not need force; they need patient attention.',
      cannotDoWell: 'Daoist non-action can be misused to justify NOT acting on injustice ("just go with the flow"). The tradition has been critiqued for being too quietist when the flow of power needs interruption. Wuwei means right action, not no action.',
      learnFrom: ['Laozi, Dao De Jing (multiple translations; Stephen Mitchell\'s is poetic, Roger Ames + David Hall\'s is philosophically rigorous)', 'Zhuangzi (Burton Watson translation)', 'David Hinton\'s essays on Chinese philosophy', 'Practicing Daoist temples and teachers']
    },
    {
      id: 'zen', name: 'Zen Buddhism', icon: '🪷', color: '#a855f7',
      origin: 'Buddhism in 6th-century China (Chan), exported to Japan (Zen), Korea (Seon), Vietnam (Thiền). Lineages alive today; Western Zen centers since mid-1900s.',
      core: (
        'Zen emphasizes direct experience over doctrine. The central insight is that suffering arises ' +
        'from clinging · to identity, to outcomes, to permanence · and that the way through is to wake up ' +
        'to the suchness of this moment without adding stories to it. Zazen (sitting meditation) is the ' +
        'core practice: sit, breathe, notice thoughts arise and pass, return to this breath. Koans are ' +
        'paradoxical questions or stories meant to break the conceptual mind\'s grip ("What is the sound ' +
        'of one hand clapping?"). Zen does not deny the mind; it points beyond it.'
      ),
      practices: [
        'Zazen: sit upright, attention on breath, let thoughts arise without following them.',
        'Walking meditation (kinhin): bring the quality of sitting into movement.',
        'Beginner\'s mind (shoshin): meet each moment without the assumption that you already know what is here.',
        'Mu: a one-word koan often given to beginners · sit with "no" until the conceptual mind exhausts itself.'
      ],
      onSuffering: 'Suffering and reality are not separate. Suffering arises when we cling to how we want things to be. The practice is not to escape suffering but to meet it fully, without the extra story.',
      onGoodLife: 'The good life is direct life. Wash the dishes when you are washing the dishes. Talk to your friend when you are talking to your friend. Cease layering plans, judgments, and identity onto what is already here.',
      onAction: 'Right action arises from right seeing. If you see clearly without the ego\'s distortion, action follows. Engaged Buddhists (Thich Nhat Hanh, the Buddhist Peace Fellowship) have extended this into social action.',
      cannotDoWell: 'Zen can become an excuse for spiritual bypassing · using "everything is empty" or "all is one" to avoid feeling difficult emotions or addressing real injustice. The koan tradition also requires a teacher relationship; reading koans alone in a book mostly does not work. Zen without sangha (community of practitioners) tends to drift.',
      learnFrom: ['Shunryu Suzuki, Zen Mind, Beginner\'s Mind', 'Thich Nhat Hanh, The Miracle of Mindfulness; Being Peace', 'Robert Aitken, Taking the Path of Zen', 'A practicing teacher in a real lineage; online dharma talks are useful, but Zen at its core is taught person-to-person.']
    },
    {
      id: 'stoicism', name: 'Stoicism', icon: '🏛', color: '#f59e0b',
      origin: 'Founded by Zeno of Citium in Athens around 300 BCE. Major figures: Epictetus (former slave), Seneca (Roman statesman), Marcus Aurelius (Roman emperor). Currents revived strongly since 1990s.',
      core: (
        'Stoicism distinguishes ruthlessly between what is in your control and what is not. What is in ' +
        'your control: your beliefs, judgments, intentions, responses, what you give attention to. What ' +
        'is NOT in your control: your body\'s health, your reputation, other people\'s behavior, ' +
        'outcomes, the world\'s events. The central practice is to invest only in what is in your ' +
        'control, and to accept (not approve, just accept) what is not. The result is supposed to be ' +
        'apatheia: not numbness, but freedom from being jerked around by what you cannot control.'
      ),
      practices: [
        'Premeditatio malorum: rehearse setbacks before they happen. If a friend dies, what will I have left? Rehearsing reduces the shock and increases gratitude for what is.',
        'Negative visualization: imagine losing what you have. Often the practice produces gratitude rather than dread.',
        'The view from above: imagine looking down at your own life from very high up. What seems urgent often shrinks.',
        'Reservation clause: "I will do this, if nothing prevents me." Commit to the action; do not commit to the outcome.'
      ],
      onSuffering: 'Suffering comes from valuing what you do not control. Most pain we add to events is not the event itself; it is our judgment about the event. Change the judgment and you can change the suffering, even when the event itself cannot be changed.',
      onGoodLife: 'The good life is virtue: wisdom, justice, courage, self-discipline. Everything else (health, wealth, status) is "preferred" but not necessary. A person living virtuously in poverty is doing well; a person of bad character with riches is not.',
      onAction: 'Act according to nature and reason. Do your assigned role (citizen, parent, student, friend) well, without obsessing over outcomes.',
      cannotDoWell: 'Stoicism has a real victim-blaming risk. "What is in your control" gets applied to things that are actually structurally outside individual control: racism, poverty, abuse. Marcus Aurelius was an emperor; for him, much WAS in his control. For a child being abused, "control your judgment about it" is the wrong frame. Modern Stoicism that ignores this risk is doing the tradition\'s most harmful version.',
      learnFrom: ['Epictetus, Enchiridion (the short handbook)', 'Marcus Aurelius, Meditations (his private journal, never meant for publication)', 'Seneca, Letters from a Stoic', 'Massimo Pigliucci, How to Be a Stoic (contemporary intro)', 'The Stoic Fellowship · modern lay Stoic communities']
    },
    {
      id: 'existentialism', name: 'Existentialism', icon: '🚪', color: '#dc2626',
      origin: 'European philosophy mid-1800s through mid-1900s. Kierkegaard, Nietzsche, Heidegger, Sartre, de Beauvoir, Camus, Frankl. Has Jewish, Christian, atheist, and feminist strands.',
      core: (
        'Existentialism starts from the observation that we exist BEFORE we have a fixed essence. Unlike ' +
        'a chair (which has the essence of "chair-ness" before any particular chair is made), humans ' +
        'arrive in existence and then have to make ourselves into who we become through choices. This ' +
        'is freedom, and it is terrifying. We are "condemned to be free" (Sartre): there is no manual, ' +
        'no fixed human nature, no excuses. Every choice is mine, and I am responsible for it. The ' +
        'response can be "bad faith" (pretending I had no choice) or "authenticity" (owning the choosing ' +
        'fully). Existentialism is unflinching about anxiety, absurdity, and death; it argues we live ' +
        'better when we look at them squarely.'
      ),
      practices: [
        'Notice when you tell yourself you "had to" do something. Probably you chose it. Owning the choice is the first step.',
        'Examine inherited values: who told you what matters, and would you choose those values if you were choosing them fresh?',
        'Take seriously that you will die. Not morbidly; just truly. Whose life are you waiting for permission to live?',
        'Practice radical responsibility: not blame, but ownership. "This is mine to do" rather than "this happened to me."'
      ],
      onSuffering: 'Suffering can come from refusing to confront the freedom and responsibility of being a self. Some suffering also comes from real meaninglessness in the universe; the response is to make meaning through commitment and action, knowing you are the one making it.',
      onGoodLife: 'A good life is an authentic one. Living the life you actually chose, owning your choices, refusing the comfort of pretending the choices were not yours.',
      onAction: 'Choose. Then choose again. Existentialist ethics emerges from commitment, not from rules. De Beauvoir extended this into feminist ethics: my freedom requires your freedom.',
      cannotDoWell: 'Existentialism in its individualist forms ignores how our choices are heavily shaped by class, race, gender, disability, and structural conditions. "You are free to choose" lands very differently for a teenager in foster care than for a wealthy professor. Some existentialists (de Beauvoir, Fanon, the Black existentialists) addressed this; others did not.',
      learnFrom: ['Viktor Frankl, Man\'s Search for Meaning (existentialism that survived Auschwitz)', 'Albert Camus, The Myth of Sisyphus', 'Simone de Beauvoir, The Ethics of Ambiguity', 'Frantz Fanon, Black Skin White Masks (existentialism through race and colonialism)', 'Lewis Gordon, Existence in Black']
    },
    {
      id: 'confucian', name: 'Confucian Relational Ethics', icon: '⚖', color: '#16a34a',
      origin: 'Confucius (Kongzi, 551-479 BCE) and successors (Mencius, Xunzi) in ancient China. Living tradition shaping much of East Asian moral thought; revived in contemporary "New Confucianism."',
      core: (
        'Confucianism starts from the observation that we are born into webs of relationship: parent-' +
        'child, sibling-sibling, ruler-citizen, teacher-student, friend-friend. We do not become moral ' +
        'by abstracting away from these relationships; we become moral by tending them well. The central ' +
        'virtue is ren · usually translated "humaneness" or "benevolence" · the practice of treating ' +
        'others with the kind of care due to a relative. Li (ritual propriety) is the practiced form: ' +
        'the small daily ceremonies of greeting, eating together, marking transitions, that make ' +
        'relationships real. Confucian ethics is fundamentally relational; the question is never "what ' +
        'is the universal right thing?" but "what do I, in this specific role, owe to this specific person?"'
      ),
      practices: [
        'Tend the relationships you are already in. Practice li (ritual): the small consistent actions that say "you matter to me."',
        'Notice your roles. You are a child, friend, student, citizen. What does each role specifically ask of you?',
        'Cultivate ren: meet people with the care you would want for someone you love.',
        'Self-examination (xiushen): regularly examine whether you are living up to what each relationship asks.'
      ],
      onSuffering: 'Suffering is often relational: I have failed someone, or someone has failed me, or our roles to each other are broken. The way through is to repair, not to abandon the relationships.',
      onGoodLife: 'The good life is the well-cultivated person in well-cultivated relationships. There is no isolated good life; flourishing is necessarily social.',
      onAction: 'Act according to your role and the situation. The ruler should rule well, the parent parent well, the friend befriend well. The shape of right action depends on who you are TO this person.',
      cannotDoWell: 'Confucian role-ethics has been used to justify hierarchy (children must obey parents, women must obey men, citizens must obey rulers) in ways that protect abusers. Feminist Confucian scholars are working to recover the tradition\'s ethics of mutual obligation while critiquing its patriarchal applications.',
      learnFrom: ['Analects (Edward Slingerland\'s translation is approachable)', 'Mencius (Philip J. Ivanhoe edition)', 'Bryan W. Van Norden, Introduction to Classical Chinese Philosophy', 'Tu Weiming\'s work on contemporary Confucianism', 'Sin Yee Chan and other feminist Confucian scholars']
    },
    {
      id: 'ubuntu', name: 'Ubuntu', icon: '🌍', color: '#0d9488',
      origin: 'Recurring orientation across many Bantu-speaking African peoples (Nguni languages of Southern Africa especially). Has been articulated philosophically by Desmond Tutu, Nelson Mandela, and Southern African theologians and philosophers.',
      core: (
        'Ubuntu is often translated "I am because we are." A person is a person through other persons. ' +
        'Unlike Western philosophies that start from the isolated individual and ask how that individual ' +
        'can connect to others, Ubuntu starts from interconnection and asks how a person emerges WITHIN ' +
        'that interconnection. To be fully a person is to participate in the humanity of others. Cruelty, ' +
        'isolation, and indifference are not just bad behaviors; they make you less of a person. Ubuntu ' +
        'has been central to South African post-apartheid reconciliation work, restorative justice ' +
        'practice, and ongoing African ethical theory.'
      ),
      practices: [
        'Greet people fully. Greeting in many African traditions is not a transaction; it is the acknowledgment of shared humanity.',
        'Tend to community before self. Ubuntu does not deny the self; it locates the self in the web.',
        'Practice restorative rather than retributive responses: when harm is done, what does the community need to heal? Who needs what made right?',
        'Examine where your culture\'s individualism is hiding the relational reality you actually live inside.'
      ],
      onSuffering: 'Suffering is rarely individual. The healing happens in community. Isolation deepens suffering; reconnection often relieves it.',
      onGoodLife: 'The good life is a life of full humanity, which requires the full humanity of those around you. You cannot flourish in a community where others are degraded; the degradation diminishes you too.',
      onAction: 'Act in ways that build the humanity of others. Restorative justice (in the South African post-apartheid mode) is one expression of Ubuntu in public action.',
      cannotDoWell: 'Ubuntu has sometimes been romanticized by Western readers as a simple antidote to Western individualism. It is a real and complex philosophical tradition with its own internal debates. Treating it as a slogan ("ubuntu = community good") flattens it. Authentic engagement requires reading African philosophers, not just admiring the concept from afar.',
      learnFrom: ['Desmond Tutu, No Future Without Forgiveness (Ubuntu through the Truth and Reconciliation Commission)', 'Mogobe Ramose, African Philosophy through Ubuntu', 'Thaddeus Metz, A Relational Moral Theory', 'Africa Is a Country and other African-philosophy publications']
    },
    {
      id: 'indigenousRel', name: 'Indigenous Relationality (a recurring orientation)', icon: '🪶', color: '#7c3aed',
      origin: 'Not a single philosophy. A recurring orientation across many distinct Indigenous nations on every inhabited continent, each with its own languages, ceremonies, governance, and intellectual traditions. The shared thread is relational ontology: the universe is fundamentally a web of kinship, including human, more-than-human, ancestral, and future relations.',
      core: (
        'Across many Indigenous traditions there is a recurring orientation: the basic units of reality are ' +
        'relationships, not isolated things. "All my relations" (a phrase from Lakota, Dakota, and many ' +
        'other nations) is the ethical and metaphysical claim that humans, animals, plants, rocks, ' +
        'rivers, stars, ancestors, and descendants are bound in obligation to one another. Land is not ' +
        'a possession; it is kin. Stewardship is not optional; it is what it means to be a person in a ' +
        'place. Specific practices vary widely between nations: Wabanaki fire stewardship, Coast Salish ' +
        'salmon ceremonies, Anishinaabe seven-generations thinking, Quechua ayni (reciprocity), Maori ' +
        'kaitiakitanga (guardianship). What recurs is the relational, multi-generational, ' +
        'more-than-human framing.'
      ),
      practices: [
        'Locate yourself in place. Whose land are you on? What are its names? (The Land & Place tool in Stewardship has scaffolding for this.)',
        'Extend kinship beyond humans. Notice what you owe to a river, a tree, a mountain, an animal you depend on.',
        'Think in generations. What did your ancestors leave you? What are you leaving the seventh generation forward?',
        'Listen for relational obligation. Most Indigenous ethics is not rule-based; it asks "what does my relationship to this being require of me?"'
      ],
      onSuffering: 'Suffering often arises from broken relationship · to land, to ancestors, to community, to non-human kin. Healing happens through repair, ceremony, and re-relating.',
      onGoodLife: 'The good life is a life lived in right relationship with all your relations. This is not metaphor in most Indigenous traditions; it is ontological.',
      onAction: 'Act in ways that honor your specific relationships: to this land, this people, these ancestors, these descendants. Generic universal rules are less central than specific relational obligation.',
      cannotDoWell: 'This tool can do honest comparative summary. What it cannot do, and should not pretend to do, is teach you a specific Indigenous philosophy. Indigenous traditions are LIVED in specific communities; access to them is through relationship, ceremony, and learning from authoritative voices within those communities. New Age extractivism (taking Indigenous practices out of context and consuming them) is a real and ongoing harm. The right move is to learn from Indigenous scholars and follow Indigenous-led organizations rather than treating "Indigenous wisdom" as a generic product.',
      learnFrom: ['Robin Wall Kimmerer (Citizen Potawatomi Nation), Braiding Sweetgrass', 'Vine Deloria Jr. (Standing Rock Sioux), God Is Red', 'Linda Tuhiwai Smith (Maori), Decolonizing Methodologies', 'Glen Coulthard (Yellowknives Dene), Red Skin White Masks', 'For Wabanaki specifically: Wabanaki Public Health and Wellness, Penobscot Nation Cultural and Historic Preservation Department, First Light Learning Journey']
    },
    {
      id: 'care', name: 'Care Ethics', icon: '🤲', color: '#ec4899',
      origin: 'Emerged in 1980s feminist philosophy. Carol Gilligan\'s In a Different Voice (1982) and Nel Noddings\' Caring (1984) were foundational; the field now includes Joan Tronto, Virginia Held, Eva Feder Kittay, and a substantial international literature.',
      core: (
        'Care ethics begins from a different starting point than most Western moral philosophy. Where the ' +
        'mainstream tradition starts from autonomous adults choosing between principles, care ethics ' +
        'starts from the reality that EVERY human being begins life utterly dependent and spends much of ' +
        'life either receiving care or giving it. The fundamental moral question is not "what universal ' +
        'rule should I follow?" but "what does this specific other person need from me right now, and ' +
        'what is my responsibility within this relationship?" Care ethics centers the work of caregivers ' +
        '(disproportionately women, racialized people, and immigrants) as foundational to ethics rather ' +
        'than peripheral to it.'
      ),
      practices: [
        'Notice who is doing care work around you. Whose labor sustains your day? Is that labor seen and valued?',
        'Practice attentive listening · Noddings\' "engrossment": being fully present to what the other person actually needs, not what you assume they need.',
        'Ask what care YOU are receiving, and whether you can acknowledge it more fully.',
        'Examine the structures that organize care: who has to do it, who can buy out of it, what gets paid, what doesn\'t.'
      ],
      onSuffering: 'Suffering often happens when care is missing, asymmetrical, or unrecognized. Repair is relational and often slow.',
      onGoodLife: 'The good life is one of well-tended caring relationships, where receiving care does not diminish dignity and giving care is supported rather than exploited.',
      onAction: 'Act in response to the particular other. Care ethics is suspicious of one-size-fits-all rules; it asks what THIS person, in THIS situation, needs.',
      cannotDoWell: 'Pure care ethics can struggle with strangers, with people far away, and with conflicts where care for one party harms another. It has been critiqued for sometimes reinforcing the assumption that caring labor is women\'s natural work. The most useful contemporary care ethics (Tronto especially) addresses these by asking: who is responsible for care, who is excluded, and how should caring labor be structured politically?',
      learnFrom: ['Joan Tronto, Caring Democracy', 'Eva Feder Kittay, Love\'s Labor', 'Nel Noddings, Caring: A Relational Approach to Ethics', 'Virginia Held, The Ethics of Care', 'Disability justice and Black feminist thinkers extending care ethics: Mia Mingus, Patricia Hill Collins, Audre Lorde']
    }
  ];

  // ─── Comparison questions ──────────────────────────────────
  var QUESTIONS = [
    { id: 'suffering', label: 'What do I do with suffering?', field: 'onSuffering', icon: '🌊' },
    { id: 'goodLife', label: 'What is the good life?', field: 'onGoodLife', icon: '🌟' },
    { id: 'action', label: 'How should I act?', field: 'onAction', icon: '🚶' },
    { id: 'control', label: 'What is in my control?', synth: true, icon: '🎚' }
  ];

  // Synthesized comparison rows for "what is in my control" since traditions
  // disagree sharply on this and it's pedagogically valuable to surface that
  var CONTROL_TAKES = {
    daoism: 'Less than your ego thinks. Stop trying to force the river. Wuwei: act with the grain, not against it.',
    zen: 'The mind that asks "what is in my control" is part of what is suffering. Drop the framing; meet what is.',
    stoicism: 'Sharply yes: your beliefs, judgments, intentions, attention. Sharply no: outcomes, other people, your body\'s ultimate fate.',
    existentialism: 'Everything is in your control, in the sense that every choice is yours. There is no excuse. This is freedom and it is terrifying.',
    confucian: 'Your conduct in your specific relationships is in your control. The roles you are in shape what is asked of you.',
    ubuntu: 'You alone control very little. With others, much more becomes possible. The "I" in "I control" is itself misleading.',
    indigenousRel: 'Control is the wrong frame. The right frame is responsibility within relationship. What do I owe to my relations?',
    care: 'You control how you show up in caring relationships. Structural conditions of care (who has to do it, who is paid) are not under individual control but ARE under collective political control.'
  };

  function defaultState() {
    return {
      view: 'library',                    // 'library' | 'detail' | 'compare' | 'about'
      detailId: null,
      compareId: null
    };
  }

  // ─── Tool registration ───
  window.SelHub.registerTool('orientations', {
    icon: '🧭',
    label: 'Orientations',
    desc: 'Ways of Living, Compared. Eight philosophical traditions (Daoism, Zen, Stoicism, Existentialism, Confucian ethics, Ubuntu, Indigenous relationality, Care Ethics) compared on big life questions. Non-prescriptive: the point is to know what is available, not to pick one as "right." Each tradition has an honest "what it cannot do well" panel.',
    color: 'purple',
    category: 'inner-work',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.orientations || defaultState();
      function setOR(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.orientations) || defaultState();
          return Object.assign({}, prev, { orientations: Object.assign({}, prior, patch) });
        });
      }

      var view = d.view || 'library';
      function goto(v) { setOR({ view: v, detailId: null, compareId: null }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#c4b5fd', fontSize: 22, fontWeight: 900 } }, '🧭 Orientations'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Ways of living, compared. Eight traditions, big questions, honest limits.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'library', label: 'Traditions', icon: '📚' },
          { id: 'compare', label: 'Compare on a question', icon: '⚖' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = (view === t.id) || (t.id === 'library' && view === 'detail');
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#a78bfa' : '#334155'),
                background: active ? 'rgba(167,139,250,0.18)' : '#1e293b',
                color: active ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' }
        },
          'This tool offers honest summary. It is not authoritative on any of these traditions. Each is lived in real communities by real practitioners; if you find yourself drawn to one, follow that to its actual teachers and texts.'
        );
      }

      // ═══════════════════════════════════════════════════════
      // LIBRARY
      // ═══════════════════════════════════════════════════════
      function renderLibrary() {
        if (view === 'detail' && d.detailId) {
          return renderDetail(d.detailId);
        }
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.6 } },
            '📚 Eight traditions, each with substantive content. The point is not to pick a winner; the point is to know what is available, see what disagrees with what, and notice what each can\'t do well.'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            TRADITIONS.map(function(t) {
              return h('button', { key: t.id, onClick: function() { setOR({ view: 'detail', detailId: t.id }); },
                style: { padding: 14, borderRadius: 10, border: '1.5px solid ' + t.color + '66', background: '#0f172a', cursor: 'pointer', textAlign: 'left' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 24 } }, t.icon),
                  h('strong', { style: { color: t.color, fontSize: 14 } }, t.name)
                ),
                h('div', { style: { fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5, marginBottom: 6 } }, t.origin.split('.')[0] + '.'),
                h('div', { style: { fontSize: 11, color: t.color, fontStyle: 'italic' } }, 'Read full → ')
              );
            })
          ),
          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // DETAIL
      // ═══════════════════════════════════════════════════════
      function renderDetail(id) {
        var t = TRADITIONS.find(function(x) { return x.id === id; });
        if (!t) return renderLibrary();
        return h('div', null,
          h('button', { onClick: function() { setOR({ view: 'library', detailId: null }); }, 'aria-label': 'Back to traditions',
            style: { marginBottom: 12, background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 } }, '← Traditions'),

          // Hero
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, ' + t.color + '24 0%, rgba(15,23,42,0.4) 100%)', border: '1px solid ' + t.color + '66', borderLeft: '4px solid ' + t.color, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
              h('span', { style: { fontSize: 38 } }, t.icon),
              h('h3', { style: { margin: 0, color: t.color, fontSize: 22, fontWeight: 800 } }, t.name)
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } }, t.origin)
          ),

          // Core
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: t.color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Core orientation'),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.75 } }, t.core)
          ),

          // Practices
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: t.color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Practices that follow'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.8 } },
              t.practices.map(function(p, i) { return h('li', { key: i }, p); })
            )
          ),

          // Big questions
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 12 } },
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '🌊 On suffering'),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.6 } }, t.onSuffering)
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '🌟 On the good life'),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.6 } }, t.onGoodLife)
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              h('div', { style: { fontSize: 11, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '🚶 On action'),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.6 } }, t.onAction)
            )
          ),

          // Cannot do well · the honest limits
          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '4px solid #ef4444', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '⚠ What this tradition cannot do well'),
            h('p', { style: { margin: 0, color: '#fecaca', fontSize: 13, lineHeight: 1.7 } }, t.cannotDoWell)
          ),

          // Learn from
          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.3)', borderLeft: '4px solid #86efac', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '📖 Where to learn more from authoritative voices'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#bbf7d0', fontSize: 12.5, lineHeight: 1.8 } },
              t.learnFrom.map(function(s, i) { return h('li', { key: i }, s); })
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // COMPARE
      // ═══════════════════════════════════════════════════════
      function renderCompare() {
        var qid = d.compareId || 'suffering';
        var q = QUESTIONS.find(function(x) { return x.id === qid; }) || QUESTIONS[0];
        function pickQ(id) { setOR({ compareId: id }); }

        function answerFor(t) {
          if (q.synth) return CONTROL_TAKES[t.id] || '(no entry)';
          return t[q.field] || '';
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)', borderLeft: '3px solid #a78bfa', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.55 } },
            h('strong', null, '⚖ Comparison view. '),
            'Pick a question. See how the eight traditions answer it differently. The point is to notice the disagreements; they are real.'
          ),

          // Question picker
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, marginBottom: 14 } },
            QUESTIONS.map(function(qq) {
              var picked = qid === qq.id;
              return h('button', { key: qq.id, onClick: function() { pickQ(qq.id); }, 'aria-pressed': picked,
                style: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid ' + (picked ? '#a78bfa' : '#334155'),
                  background: picked ? 'rgba(167,139,250,0.18)' : '#1e293b',
                  color: picked ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, textAlign: 'left' } },
                qq.icon + ' ' + qq.label);
            })
          ),

          // Eight answers
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 10 } },
            TRADITIONS.map(function(t) {
              return h('div', { key: t.id, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderLeft: '3px solid ' + t.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 18 } }, t.icon),
                  h('strong', { style: { color: t.color, fontSize: 13 } }, t.name),
                  h('button', { onClick: function() { setOR({ view: 'detail', detailId: t.id }); }, style: { marginLeft: 'auto', background: 'transparent', border: '1px solid ' + t.color + '66', color: t.color, borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 10.5, fontWeight: 700 } }, 'Full →')
                ),
                h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } }, answerFor(t))
              );
            })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('orientations', h, ctx) : null),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', color: '#c4b5fd', fontSize: 16 } }, 'What this tool is for'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.75 } },
              'Most people grow up inside one philosophical orientation, often unnamed. The values you absorbed from your family, your culture, your school, your media · those are a philosophy. They have premises. They could have been otherwise. People in other times and places have answered the same big questions very differently and lived rich lives within those answers.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.75 } },
              'This tool exists to make the unnamed philosophy you already have visible by comparison. Not to convert you to anything. Not even to claim there is a single "right" tradition. The point is to widen what is thinkable, so the values you live by are values you actually chose rather than just absorbed.'
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '4px solid #ef4444', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 16 } }, 'The trap to avoid: buffet spirituality'),
            h('p', { style: { margin: '0 0 8px', color: '#fecaca', fontSize: 13, lineHeight: 1.7 } },
              'A real risk in comparative philosophy is that you take a vibe from each tradition without understanding any of them deeply. "I like the Zen idea of letting go and the Stoic idea of control and the Indigenous idea of relationship!" · but those three claims actually disagree with each other in important ways, and treating them as compatible flattens what each is actually saying.'
            ),
            h('p', { style: { margin: 0, color: '#fecaca', fontSize: 13, lineHeight: 1.7 } },
              'A better practice: read deeply in one tradition before judging it against another. If a tradition draws you, follow it to its actual teachers and texts. The "Where to learn more" sections in each detail page are a starting point.'
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '4px solid #a855f7', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', color: '#c4b5fd', fontSize: 16 } }, 'On Indigenous traditions specifically'),
            h('p', { style: { margin: 0, color: '#e9d5ff', fontSize: 13, lineHeight: 1.75 } },
              'The "Indigenous relationality" entry in this tool is summary, not authority. Indigenous philosophies are alive in specific communities and are taught person-to-person through ceremony, story, and relationship. Treating them as a generic product is a real and ongoing harm called extraction. The right move is to read Indigenous scholars (Robin Wall Kimmerer, Vine Deloria Jr., Linda Tuhiwai Smith, Glen Coulthard), to follow Indigenous-led organizations, and · for Wabanaki specifically · to learn from Wabanaki Public Health and Wellness, the Penobscot Nation Cultural and Historic Preservation Department, the Passamaquoddy Cultural Heritage Museum, and First Light Learning Journey.'
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', color: '#c4b5fd', fontSize: 16 } }, 'Why each tradition has a "what it cannot do well" panel'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Every philosophical tradition can be misused. Stoicism has been weaponized to blame victims. Zen has been misused for spiritual bypassing. Wuwei has been used to justify quietism. Existentialism has erased structural conditions. Confucianism has protected patriarchal hierarchy. Every tradition has internal critics and contemporary scholars working on its blind spots. Honest comparison names those blind spots rather than pretending they do not exist.'
            )
          ),

          softPointer()
        );
      }

      // ── Root ──
      var body;
      if (view === 'detail') body = renderLibrary();
      else if (view === 'compare') body = renderCompare();
      else if (view === 'about') body = renderAbout();
      else body = renderLibrary();

      return h('div', { style: { maxWidth: 860, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Orientations: comparative philosophy' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
