(function initResearchLaneHumanities(retriesLeft) {
  "use strict";
  window.AlloModules = window.AlloModules || {};
  if (!window.AlloModules.ResearchLaneHumanities) window.AlloModules.ResearchLaneHumanities = { __pending: true };
  if (window.ResearchHub && window.ResearchHub._lanes && window.ResearchHub._lanes.humanities && window.ResearchHub._lanes.humanities.__tier >= 2) {
    console.log("[CDN] ResearchLaneHumanities already registered, skipping");
    return;
  }
  if (!window.ResearchHub || typeof window.ResearchHub.registerLane !== "function") {
    if (retriesLeft === void 0) retriesLeft = 50;
    if (retriesLeft <= 0) {
      console.error("[ResearchLaneHumanities] window.ResearchHub never became available \u2014 giving up");
      return;
    }
    console.warn("[ResearchLaneHumanities] window.ResearchHub not yet available \u2014 deferring");
    setTimeout(function() {
      initResearchLaneHumanities(retriesLeft - 1);
    }, 200);
    return;
  }
  var React = window.React;
  if (!React) {
    console.error("[ResearchLaneHumanities] React not found");
    return;
  }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useFocusTrap = window.__alloHooks && window.__alloHooks.useFocusTrap || function() {
  };
  function announce(msg, priority) {
    try {
      if (typeof window !== "undefined" && window.alloAnnounce) window.alloAnnounce(msg, priority || "polite");
    } catch (_) {
    }
  }
  var H = window.ResearchHub.helpers || {};
  var isPlausibleProse = H.isPlausibleProse || function() {
    return { ok: true };
  };
  var normalizeForCompare = H.normalizeForCompare || function(s) {
    return (s || "").toLowerCase();
  };
  var tokenJaccard = H.tokenJaccard || function() {
    return 0;
  };
  var SHARED_STOP_WORDS = H.SHARED_STOP_WORDS || /* @__PURE__ */ new Set();
  var STAGES = [
    {
      key: "frame_question",
      label: "Frame the Question",
      icon: "\u2753",
      shortLabel: "Frame",
      color: "#be185d",
      loopBackTargets: []
    },
    {
      key: "sift_triage",
      label: "SIFT Triage",
      icon: "\u{1F50D}",
      shortLabel: "SIFT",
      color: "#be123c",
      loopBackTargets: ["frame_question"]
    },
    {
      key: "counter_framings",
      label: "Counter-Framings",
      icon: "\u{1F94B}",
      shortLabel: "Framings",
      color: "#9f1239",
      loopBackTargets: ["frame_question", "sift_triage"]
    },
    {
      key: "warrant_lab",
      label: "Warrant Lab",
      icon: "\u2696\uFE0F",
      shortLabel: "Warrant",
      color: "#a21caf",
      loopBackTargets: ["frame_question", "sift_triage", "counter_framings"]
    },
    {
      key: "positionality_reckoning",
      label: "Positionality Reckoning",
      icon: "\u{1F9ED}",
      shortLabel: "Position",
      color: "#7c3aed",
      loopBackTargets: ["frame_question", "sift_triage", "counter_framings", "warrant_lab"]
    },
    {
      key: "genre_composition",
      label: "Compose the Artifact",
      icon: "\u{1F4E2}",
      shortLabel: "Compose",
      color: "#6d28d9",
      loopBackTargets: ["frame_question", "sift_triage", "counter_framings", "warrant_lab", "positionality_reckoning"]
    }
  ];
  var STAGE_KEYS = STAGES.map(function(s) {
    return s.key;
  });
  var STAGE_BY_KEY = {};
  STAGES.forEach(function(s) {
    STAGE_BY_KEY[s.key] = s;
  });
  var LOOPBACK_CHIPS = [
    { id: "source_failed_SIFT", label: "A source did not pass SIFT", icon: "\u{1F6AB}" },
    { id: "source_corroboration_collapsed", label: "Independent coverage did not confirm", icon: "\u{1F50E}" },
    { id: "original_context_changed_meaning", label: "Tracing to original changed the meaning", icon: "\u{1F9F5}" },
    { id: "framing_destabilized_argument", label: "A framing destabilized my warrant", icon: "\u{1F94B}" },
    { id: "positionality_shift", label: "My standpoint shifted", icon: "\u{1F9ED}" },
    { id: "absent_voice_surfaced", label: "An absent voice changed the question", icon: "\u{1F4AC}" },
    { id: "warrant_could_not_bridge", label: "My warrant could not bridge evidence to claim", icon: "\u2696\uFE0F" },
    { id: "qualifier_too_broad", label: "My qualifier was too broad", icon: "\u{1F4CF}" },
    { id: "rebuttal_did_not_answer_framing", label: "My rebuttal did not answer the framing", icon: "\u{1F501}" },
    { id: "genre_audience_mismatch", label: "Genre and audience mismatched", icon: "\u{1F4D6}" },
    { id: "foreclosure_widened", label: "I noticed more I cannot speak to", icon: "\u{1F576}\uFE0F" },
    { id: "standpoint_obscuring_revealed", label: "My standpoint obscured something", icon: "\u{1F575}\uFE0F" },
    { id: "foregrounding_reconsidered", label: "I reconsidered what I foreground", icon: "\u{1F441}\uFE0F" },
    { id: "other", label: "Other (I will explain)", icon: "\u{1F4AC}" }
  ];
  var FRAMING_TAXONOMY = [
    {
      id: "structural_economic",
      label: "Structural / economic",
      oneLineCue: "How does the distribution of wealth, labor, or markets shape this?",
      semanticAnchorWhitelist: ["class", "labor", "capital", "wage", "market", "distribution", "wealth", "inequality", "employer", "worker", "income", "rent", "price"]
    },
    {
      id: "cultural_memory",
      label: "Cultural memory",
      oneLineCue: "What story is being told here, and who decides which version persists?",
      semanticAnchorWhitelist: ["remembered", "commemorate", "memorial", "forget", "narrative", "story", "identity", "tradition", "heritage", "myth", "legacy", "monument"]
    },
    {
      id: "legal_institutional",
      label: "Legal / institutional",
      oneLineCue: "What rule, statute, or institutional procedure organizes this?",
      semanticAnchorWhitelist: ["statute", "ruling", "court", "precedent", "regulation", "jurisdiction", "charter", "law", "policy", "procedure", "institution", "code"]
    },
    {
      id: "religious_traditional",
      label: "Religious / traditional",
      oneLineCue: "What faith tradition, ritual, or sacred practice shapes how this is understood?",
      semanticAnchorWhitelist: ["ritual", "doctrine", "scripture", "sacred", "congregation", "faith", "observance", "tradition", "belief", "community", "elder", "ceremony"]
    },
    {
      id: "lived_experience",
      label: "Lived experience",
      oneLineCue: "What does this look like from the inside, day to day?",
      semanticAnchorWhitelist: ["daily", "lived", "felt", "experienced", "embodied", "navigated", "encountered", "everyday", "routine", "habit", "bodily", "direct"]
    },
    {
      id: "comparative_international",
      label: "Comparative / transnational",
      oneLineCue: "How does this look in a different place or across borders?",
      semanticAnchorWhitelist: ["across", "compared", "parallel", "transnational", "diaspora", "abroad", "treaty", "international", "border", "migrant", "elsewhere", "global"]
    },
    {
      id: "ecological",
      label: "Ecological",
      oneLineCue: "What land, water, climate, or species relations shape this?",
      semanticAnchorWhitelist: ["ecosystem", "watershed", "species", "climate", "sustainable", "biodiverse", "habitat", "land", "water", "soil", "river", "forest", "wildlife"]
    },
    {
      id: "gender_kinship",
      label: "Gender / kinship",
      oneLineCue: "What gendered or family / care relations organize this?",
      semanticAnchorWhitelist: ["family", "household", "gender", "care", "kin", "motherhood", "fatherhood", "queer", "women", "men", "children", "elder", "caregiver"]
    },
    {
      id: "racial_formation",
      label: "Racial formation",
      oneLineCue: "How is race or racialization shaping who counts in this story?",
      semanticAnchorWhitelist: ["race", "racial", "color", "racialized", "formed", "designation", "classification", "identity", "ancestry", "ethnic", "category", "difference"]
    },
    {
      id: "technological_infrastructural",
      label: "Technological / infrastructural",
      oneLineCue: "What infrastructure, platform, or protocol mediates this?",
      semanticAnchorWhitelist: ["infrastructure", "network", "platform", "protocol", "system", "pipeline", "grid", "technology", "digital", "data", "code", "algorithm"]
    }
  ];
  function chipById(id) {
    return FRAMING_TAXONOMY.filter(function(c) {
      return c.id === id;
    })[0] || null;
  }
  var ANALOG_DOMAIN_TAXONOMY = [
    "bridge_truss_design",
    "recipe_substitution",
    "sports_play_call",
    "mapmaking_choices",
    "public_transit_routing",
    "museum_display_choice",
    "archive_cataloging",
    "courtroom_admissibility",
    "building_code_choice",
    "schedule_priority"
  ];
  var WARRANT_MARKERS_RE = /\b(because|since|insofar as|to the extent that|inasmuch as|by virtue of|on the grounds that|implies|entails|presupposes|warrants|licenses|justifies|when read as|if we accept that|treats? .+ as|counts? as|stands? for|operates? as|functions? as)\b/i;
  var QUALIFIER_MARKERS_RE = /\b(only when|provided that|assuming|so long as|in (the )?(context|case) of|for|within|to the extent|where|if|under|during|prior to|after|among|specifically|in particular|but only|except|not when|unless|absent|barring)\b/i;
  var REBUTTAL_SHAPE_RE = /\b(one (might|could|would) object that|an? objection (might|could|would) be|a critic (might|could|would) say|someone (might|could|would) ask|skeptic(s|al)? (might|would)|the counter-argument is|against this|on the other hand)\b/i;
  var WARRANT_TAUTOLOGY_DENYLIST = [
    "because it does",
    "because that is what it means",
    "because the evidence shows",
    "because the source says",
    "because it is true",
    "because that is the definition",
    "self-evidently",
    "obviously",
    "as everyone knows",
    "because it is obvious",
    "because the data speaks for itself",
    "because it just is"
  ];
  var POSITIONALITY_DENYLIST = [
    "a student",
    "a person",
    "a citizen",
    "an observer",
    "a learner",
    "objective observer",
    "neutral observer",
    "no bias",
    "view from nowhere",
    "unbiased",
    "outside observer",
    "impartial",
    "as a regular person",
    "as a kid",
    "as a normal person",
    "just trying to understand"
  ];
  var POSITIONALITY_OBSCURES_DENYLIST = [
    "nothing",
    "none",
    "i see everything",
    "i miss nothing",
    "i have no blind spots",
    "i can see all sides",
    "i am unbiased",
    "no blind spots",
    "not applicable"
  ];
  var LATERAL_BOILERPLATE_DENYLIST = [
    "it looks fine",
    "seems legit",
    "it is from a real website",
    "i trust this source",
    "this is a good source",
    "it has a date",
    "it has an author",
    "wikipedia is reliable",
    "i checked it",
    "looks credible"
  ];
  var THESIS_PLATITUDE_DENYLIST = [
    "it is complicated",
    "there are many sides",
    "people disagree",
    "it depends on perspective",
    "both sides have a point",
    "everyone has their own truth",
    "it is what it is",
    "some people think x, others think y",
    "this is a complex issue"
  ];
  var FRAMING_PROBE_RATIONALE_TEMPLATE_DENYLIST = [
    "it survives because",
    "it does not really change anything",
    "this framing is wrong",
    "both framings are valid",
    "i thought about it"
  ];
  var STAKES_AUDIENCE_OPTIONS = [
    { id: "school_community", label: "My school community" },
    { id: "city", label: "My city or neighborhood" },
    { id: "named_public", label: "A specific named public (e.g. local educators)" },
    { id: "historical_record", label: "The historical record" },
    { id: "policymakers", label: "Policymakers" }
  ];
  var GENRE_OPTIONS = [
    { id: "op_ed", label: "Op-ed", words: [400, 900] },
    { id: "policy_memo", label: "Policy memo", words: [500, 1200] },
    { id: "civic_action_statement", label: "Civic-action statement", words: [200, 500] },
    { id: "exhibit_text", label: "Exhibit / display text", words: [60, 150] }
  ];
  var HUMANITIES_METHOD_GUIDANCE = {
    humanistic_interpretation: {
      label: "Humanistic Interpretation",
      purpose: "Interpret texts, images, events, or cultural artifacts without collapsing meaning into a single final answer.",
      questionStems: [
        "How does this artifact or account construct meaning for different audiences?",
        "What becomes visible \u2014 and what is obscured \u2014 when this is read in its historical or cultural context?"
      ],
      rigorChecks: ["Close reading or artifact evidence", "Historical and cultural context", "Competing plausible interpretations", "Claims calibrated to what the evidence can support"],
      ethics: "Represent sources in context, distinguish your interpretation from a creator\u2019s intent, and state what your position cannot speak for."
    },
    community_qualitative: {
      label: "Community & Qualitative Inquiry",
      purpose: "Investigate lived experience and community perspectives while treating accounts as situated evidence, not universal proof.",
      questionStems: [
        "How do differently situated people describe or experience this issue?",
        "What patterns and meaningful exceptions appear across teacher-approved or public accounts?"
      ],
      rigorChecks: ["Transparent account selection", "Context-preserving notes and quotations", "Discrepant cases and absent voices", "Reflexivity about your relationship to the community"],
      ethics: "Current workflow: use public or teacher-approved accounts. Do not collect or upload identifiable interviews, images, or recordings without informed consent and an approved safeguarding plan."
    },
    civic_policy: {
      label: "Civic & Policy Inquiry",
      purpose: "Examine a public choice through evidence, institutions, stakeholder interests, power, consequences, and feasible alternatives.",
      questionStems: [
        "Who benefits, who bears costs, and who has decision-making power under the current policy?",
        "Which alternative best addresses the evidence, trade-offs, and stated public values?"
      ],
      rigorChecks: ["Stakeholder and power analysis", "Credible evidence linked to warrants", "Counterarguments and policy alternatives", "Trade-offs, feasibility, and accountability"],
      ethics: "Name who is affected but missing from the record, avoid presenting advocacy as neutral description, and make uncertainty and value judgments explicit."
    },
    creative_cultural: {
      label: "Creative & Cultural Inquiry",
      purpose: "Study how form, medium, audience, context, and cultural position shape what an artifact does and what readings it permits.",
      questionStems: [
        "How do formal choices in this artifact shape attention, feeling, or interpretation?",
        "How might different audiences read this work differently because of context, medium, or cultural position?"
      ],
      rigorChecks: ["Specific evidence from form and medium", "Context and audience analysis", "Multiple defensible readings", "No unsupported claims about creator intent"],
      ethics: "Credit creators and communities, distinguish influence from ownership, and attend to appropriation, access, and whose traditions are being interpreted."
    }
  };
  function humanitiesMethodGuide(methodPackId) {
    return HUMANITIES_METHOD_GUIDANCE[methodPackId] || HUMANITIES_METHOD_GUIDANCE.humanistic_interpretation;
  }
  var CONTESTATION_RANGE = {
    school_community: { op_ed: true, policy_memo: false, civic_action_statement: true, exhibit_text: true },
    city: { op_ed: true, policy_memo: true, civic_action_statement: true, exhibit_text: false },
    named_public: { op_ed: true, policy_memo: true, civic_action_statement: true, exhibit_text: true },
    historical_record: { op_ed: true, policy_memo: false, civic_action_statement: false, exhibit_text: true },
    policymakers: { op_ed: false, policy_memo: true, civic_action_statement: false, exhibit_text: false }
  };
  var SIFT_TIERS = ["unvetted", "primary_corroborated", "secondary_corroborated", "secondary_uncorroborated", "opinion_disclosed", "failed_SIFT"];
  function siftPromoted(s) {
    return s && s.sift && s.sift.tier && s.sift.tier !== "unvetted" && s.sift.tier !== "failed_SIFT";
  }
  function siftVetted(s) {
    return s && s.sift && (s.sift.tier === "primary_corroborated" || s.sift.tier === "secondary_corroborated");
  }
  var ABSENT_VOICE_CHIPS = [
    "language_barrier",
    "archival_silencing",
    "no_access_to_publishing",
    "credentialing_gatekeeping",
    "surveillance_risk",
    "oral_tradition_not_textual",
    "dead_letter",
    "paywalled",
    "other_freetext"
  ];
  var EPISTEMIC_STATUS_OPTIONS = [
    { id: "distant", label: "Distant \u2014 no direct relationship" },
    { id: "kin", label: "Kin \u2014 family / close relationship" },
    { id: "community_member", label: "Community member" },
    { id: "invited", label: "Invited \u2014 asked to speak on this" },
    { id: "self_appointed", label: "Self-appointed \u2014 I chose this without invitation" }
  ];
  var EXEMPLAR_PAIRS = {
    frame_question: {
      criterion: "A contestable question names what is at stake AND for whom \u2014 not a definitional or factoid question. It opens a position you have to defend, not a fact you have to look up.",
      strongExample: "Question: Should our school's library digitize its yearbook archive (1962-1989), given that some alumni and their families have asked for early-edition photos to be removed because of harm those photos caused them? Stakes: school community (current students, alumni, families). Plausible answers: (a) digitize fully \u2014 historical record matters; (b) digitize with consent-based redactions; (c) do not digitize until consent process is built; (d) consult an indigenous-archives framework first.",
      weakExample: "Question: What year was our library built? Stakes: anyone who likes history."
    },
    sift_triage: {
      criterion: "Strong lateral reading leaves the source to learn ABOUT it before reading it. The work that matters is independent coverage AND who-made-it AND why-they-made-it \u2014 not paraphrasing the source.",
      strongExample: "Stop: my first reaction is that this NYT op-ed sounds confident. Investigate: searched 'school yearbook digitization consent' on news.google + the Society of American Archivists site. Found three independent pieces (American Libraries Magazine 2022; Reveal News 2021; SAA position statement 2019). Who made the op-ed: a retired school principal (Linkedin verified, no archives training) for an audience of school administrators. Why: arguing AGAINST a state bill she opposes. Find: the SAA statement complicates her claim \u2014 there is professional disagreement, not consensus. Trace: the 1965 ALA Bill of Rights she cites does NOT actually address consent the way she paraphrases. Tier: opinion_disclosed.",
      weakExample: "I read the article. It's from the New York Times so it's reliable. Tier: secondary_corroborated."
    },
    counter_framings: {
      criterion: "A strong counter-framing is a different LENS that reads the same vetted sources differently \u2014 NOT a different scholar, NOT a quote, NOT a both-sides ritual.",
      strongExample: "Framing 1 (lived_experience): What does it feel like to be the person in a 1973 yearbook photo who never consented to it being online? Foregrounds: ongoing harm, daily life. Sources fit: SAA statement quotes from affected community members. Framing 2 (legal_institutional): What does FERPA + state records-retention law require? Foregrounds: statutory duty, institutional procedure. Sources fit: state law text + 2022 court ruling. These would read the same SAA statement very differently.",
      weakExample: "Framing 1: yes. Framing 2: no. Some experts say yes, some say no."
    },
    warrant_lab: {
      criterion: "A strong Toulmin chain has a warrant that names the inferential bridge \u2014 the assumption that licenses moving from evidence to claim \u2014 AND survives at least one counter-framing without becoming trivial.",
      strongExample: "Claim: The library should redact 1962-1989 photos when the depicted person requests it. Evidence: SAA 2019 statement + 3 affected-community accounts in American Libraries Magazine. Warrant: SINCE archives that retain non-consensual material continue to cause documented ongoing harm to depicted individuals, AND professional consensus has shifted to redress, redaction is justified. Qualifier: only when the depicted person (or surviving family) requests it AND the photo cannot be otherwise educationally substituted. Rebuttal: One might object that this sets a precedent for erasing the historical record. Answer: redaction-with-record (the photo is removed from public access but its existence and the redaction request are catalogued) preserves the record AS evidence of changing norms.",
      weakExample: "Claim: redact the photos. Evidence: it's the right thing. Warrant: because harm is bad. Qualifier: generally. Rebuttal: but free speech."
    },
    positionality_reckoning: {
      criterion: "A strong positionality declares what the standpoint LETS YOU SEE AND ALSO WHAT IT FORECLOSES \u2014 not a generic identity opener, and not a denial of having any blind spots.",
      strongExample: "Material relationship: I am a current senior at this school. My grandmother is in a 1968 yearbook photo who never asked to be online. Visibility: this lets me see how alumni in my own family read 'the archive' \u2014 as an album that decided things about them. Obscuring: this also means I cannot see how the library's archivists weigh competing professional duties day-to-day. Whose standpoint is structurally absent: students who are NOT alumni-connected. Partial incorporation commitment: I asked Ms. Chen (the librarian) two questions about her professional standards and used her answers in Stage 2. Epistemic status: kin.",
      weakExample: "As a student, I think this is bad. I have no bias. I just want the truth."
    },
    genre_composition: {
      criterion: "A strong artifact is in a genre that fits the audience AND ships its blind spots WITH it \u2014 not a polished essay that hides what it cannot speak to.",
      strongExample: "Op-ed for school newspaper: 800 words, names the alumni asking for redaction, names the SAA standard, declares the writer as a senior with a family connection, ends with a Foreclosure Coda: 'What this argument cannot speak to: how the library's archivists weigh competing duties day-to-day; what photos taken in 1962 of underage students should be treated as evidence of harm vs. evidence of school complicity; whether a redaction precedent would chill historical accountability.'",
      weakExample: "Op-ed: 'Schools should respect everyone's privacy. The end.'"
    }
  };
  var LOOP_REWARDING_EXEMPLARS = [
    {
      criterion: "A strong inquiry shows the student looped back when a source failed SIFT \u2014 not pushed past it.",
      strongExample: "Session log: started with the principal's op-ed \u2192 Stage 2 SIFT investigate revealed she misparaphrases the ALA Bill of Rights \u2192 tier'd it opinion_disclosed \u2192 looped back to Stage 2 to find primary-corroborated sources (SAA statement + state law text) before writing any claim. Warrant survived framing probe.",
      weakExample: "Walked 1\u21926. All sources tier='secondary_corroborated' because they are 'real websites.' Final position: 'this is complicated.' Zero loop-backs."
    },
    {
      criterion: "A strong reckoning shows positionality surfacing an absent framing \u2014 Stage 5 fed back into Stage 3.",
      strongExample: "v1 positionality at Stage 1 named me as 'student researcher.' At Stage 5 reckoning I realized my kin relationship to a depicted alum meant I was reading the SAA statement through her experience specifically. Looped to Stage 3 and added a new framing (lived_experience) that I had not surfaced because it was uncomfortable. v2 positionality named visibility + obscuring honestly.",
      weakExample: "v1 positionality: 'as a student.' Never revised. Stage 3 framings stayed at 'pro' and 'con.'"
    }
  ];
  function devFloors(devLevel) {
    switch (devLevel) {
      case "k2":
        return {
          question: 12,
          rationale: 30,
          sources: 2,
          framings: 1,
          positionality: 30,
          warrant: 0,
          rebuttal: 0,
          foreclosure: 30,
          absentVoices: 1,
          plausibleAnswers: 2,
          exemplarReason: 12,
          composition: { op_ed: [50, 200], policy_memo: [50, 200], civic_action_statement: [40, 150], exhibit_text: [20, 60] }
        };
      case "3_5":
        return {
          question: 18,
          rationale: 50,
          sources: 3,
          framings: 2,
          positionality: 60,
          warrant: 25,
          rebuttal: 40,
          foreclosure: 40,
          absentVoices: 2,
          plausibleAnswers: 2,
          exemplarReason: 18,
          composition: { op_ed: [120, 400], policy_memo: [150, 500], civic_action_statement: [80, 250], exhibit_text: [40, 100] }
        };
      case "ap":
        return {
          question: 35,
          rationale: 120,
          sources: 5,
          framings: 3,
          positionality: 140,
          warrant: 70,
          rebuttal: 110,
          foreclosure: 90,
          absentVoices: 4,
          plausibleAnswers: 4,
          exemplarReason: 60,
          composition: { op_ed: [600, 1200], policy_memo: [700, 1500], civic_action_statement: [300, 600], exhibit_text: [80, 180] }
        };
      default:
        return {
          question: 25,
          rationale: 80,
          sources: 4,
          framings: 2,
          positionality: 100,
          warrant: 50,
          rebuttal: 80,
          foreclosure: 60,
          absentVoices: 3,
          plausibleAnswers: 3,
          exemplarReason: 40,
          composition: { op_ed: [400, 900], policy_memo: [500, 1200], civic_action_statement: [200, 500], exhibit_text: [60, 150] }
        };
    }
  }
  function normName(s) {
    return normalizeForCompare(s || "").replace(/\s+/g, " ").trim();
  }
  function exemplarOk(journal, stageKey) {
    var sn = (journal.stageNotes || {})[stageKey] || {};
    return !!(sn.exemplarViewed || sn.exemplarDismissed);
  }
  function contentTokens(s) {
    return normalizeForCompare(s || "").split(/\W+/).filter(function(t) {
      return t.length > 3 && !SHARED_STOP_WORDS.has(t);
    });
  }
  function hostnameFromRef(ref) {
    if (!ref || typeof ref !== "string") return "";
    try {
      if (/^https?:\/\//i.test(ref)) return new URL(ref).hostname.toLowerCase();
      var m = ref.match(/^([a-z0-9.-]+\.[a-z]{2,})(?:\/|$)/i);
      return m ? m[1].toLowerCase() : "";
    } catch (_) {
      return "";
    }
  }
  function inDenylist(text, denylist) {
    var t = normalizeForCompare(text || "");
    if (!t) return false;
    for (var i = 0; i < denylist.length; i++) {
      if (t === denylist[i] || t.indexOf(denylist[i]) !== -1) return true;
    }
    return false;
  }
  function contestabilityProbeGate(journal) {
    var floors = devFloors(journal.devLevel || "6_8");
    var qt = (journal.questionTitle || "").trim();
    if (qt.length < floors.question || !qt.endsWith("?")) {
      return {
        ok: false,
        reason: "Author a question of at least " + floors.question + " chars that ends in a question mark.",
        bypass_signals: ["question_too_short_or_no_qmark"]
      };
    }
    if (/\b(what (is|are|year|date|number)|how many|when (did|was)|who (is|was)|define|definition of)\b/i.test(qt) && !/\b(should|ought|right|just|fair|legitimate|matter|count|owe|owed|responsible|account)\b/i.test(qt)) {
      return {
        ok: false,
        reason: 'Your question reads as definitional / factoid. A contestable question opens a position. Try "should...", "what should we owe...", "how should we count...".',
        bypass_signals: ["question_not_contestable"]
      };
    }
    var sn = (journal.stageNotes || {}).frame_question || {};
    var rat = (sn.contestabilityRationale || "").trim();
    if (rat.length < floors.rationale) {
      return {
        ok: false,
        reason: "Write a contestability rationale of at least " + floors.rationale + " chars naming what makes this contestable AND for whom.",
        bypass_signals: ["contestabilityRationale_short"]
      };
    }
    var stakeholders = journal.questionStakeholders || [];
    if (stakeholders.length < 2) {
      return {
        ok: false,
        reason: "Name at least 2 stakeholders whose interests this question foregrounds.",
        bypass_signals: ["too_few_stakeholders"]
      };
    }
    for (var a = 0; a < stakeholders.length; a++) {
      for (var b = a + 1; b < stakeholders.length; b++) {
        if (tokenJaccard(stakeholders[a].whoseQuestionIsThis, stakeholders[b].whoseQuestionIsThis) > 0.6) {
          return {
            ok: false,
            reason: "Two of your stakeholders read as nearly identical \u2014 distinguish them.",
            bypass_signals: ["stakeholders_collapsed"]
          };
        }
      }
    }
    var pa = journal.humanitiesPlausibleAnswers || [];
    if (pa.length < floors.plausibleAnswers) {
      return {
        ok: false,
        reason: "Author at least " + floors.plausibleAnswers + " plausible answers \u2014 competing positions a reasonable person could hold.",
        bypass_signals: ["too_few_plausible_answers"]
      };
    }
    for (var p = 0; p < pa.length; p++) {
      for (var q = p + 1; q < pa.length; q++) {
        if (tokenJaccard(pa[p].text, pa[q].text) > 0.6) {
          return {
            ok: false,
            reason: "Two plausible answers are nearly identical \u2014 distinguish them.",
            bypass_signals: ["plausible_answers_collapsed"]
          };
        }
      }
    }
    if (!pa.some(function(x) {
      return x.isWorkingPosition;
    })) {
      return {
        ok: false,
        reason: "Mark one plausible answer as your working position (this is provisional \u2014 you can change it).",
        bypass_signals: ["no_working_position"]
      };
    }
    var sa = journal.stakesAudience;
    if (!sa || !sa.chip) {
      return {
        ok: false,
        reason: "Pick a stakes audience \u2014 the public your position will be accountable to.",
        bypass_signals: ["no_stakes_audience"]
      };
    }
    var pos = journal.positionality || {};
    var posOK = pos.text && pos.text.trim().length > 0 || pos.audioBase64 && pos.durationS >= 5;
    if (!posOK) {
      return {
        ok: false,
        reason: "Start your PositionalityCard \u2014 name your material relationship to this question (text or 5s+ voice).",
        bypass_signals: ["positionality_missing"]
      };
    }
    if (pos.text && inDenylist(pos.text, POSITIONALITY_DENYLIST)) {
      return {
        ok: false,
        reason: "Your positionality reads as boilerplate identity. Name your MATERIAL relationship to this question, not a generic category.",
        bypass_signals: ["positionality_boilerplate"]
      };
    }
    if (!exemplarOk(journal, "frame_question")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function sourceLateralProbeGate(journal, ctx) {
    var floors = devFloors(journal.devLevel || "6_8");
    var targetId = ctx && ctx.targetSourceId;
    if (!targetId) {
      return { ok: false, reason: "Pick a specific source to probe.", bypass_signals: ["no_target_source"] };
    }
    var src = (journal.sources || []).filter(function(s) {
      return s.id === targetId;
    })[0];
    if (!src) {
      return { ok: false, reason: "Source not found in journal.", bypass_signals: ["source_missing"] };
    }
    var sift = src.sift || {};
    var stop = sift.stop || {};
    if (!stop.firstReactionText || stop.firstReactionText.trim().length < 40) {
      return {
        ok: false,
        reason: "Write your first reaction (\u226540 chars) before AI probes this source.",
        bypass_signals: ["stop_too_short"]
      };
    }
    var inv = sift.investigate || {};
    var indRef = (inv.independentSourceRef || "").trim();
    if (!indRef) {
      return {
        ok: false,
        reason: "Provide an independent reference (different host) before AI helps.",
        bypass_signals: ["no_independent_ref"]
      };
    }
    var srcHost = hostnameFromRef(src.citation || "");
    var indHost = hostnameFromRef(indRef);
    if (srcHost && indHost && srcHost === indHost) {
      return {
        ok: false,
        reason: "Your independent source has the same host as the target. Lateral reading means LEAVING this site.",
        bypass_signals: ["independent_ref_same_host"]
      };
    }
    if (inDenylist(inv.lateralEvidence || "", LATERAL_BOILERPLATE_DENYLIST)) {
      return {
        ok: false,
        reason: "Your lateral-evidence note reads as boilerplate. Name what an independent source ACTUALLY said about this one.",
        bypass_signals: ["lateral_boilerplate"]
      };
    }
    if (!(inv.lateralEvidence && inv.lateralEvidence.trim().length >= 40)) {
      return {
        ok: false,
        reason: "Lateral evidence needs \u226540 chars naming what independent coverage said.",
        bypass_signals: ["lateral_too_short"]
      };
    }
    var wmif = Array.isArray(inv.whoMadeItFacts) ? inv.whoMadeItFacts : [];
    var validFacts = wmif.filter(function(f) {
      if (!f || !f.text) return false;
      var hasProperNoun = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/.test(f.text);
      var hasYear = /\b(18|19|20|21)\d{2}\b/.test(f.text);
      return hasProperNoun && hasYear;
    });
    if (validFacts.length < 2) {
      return {
        ok: false,
        reason: "Need at least 2 who-made-it facts each containing a proper noun AND a year.",
        bypass_signals: ["who_made_it_facts_insufficient"]
      };
    }
    if (sift.tier !== "unvetted") {
      return {
        ok: false,
        reason: "AI lateral probe is for unvetted sources only \u2014 this one is already tiered.",
        bypass_signals: ["already_tiered"]
      };
    }
    if (!exemplarOk(journal, "sift_triage")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function counterFramingVoicerGate(journal) {
    if (Array.isArray(journal.framings) && journal.framings.length >= 4) {
      return {
        ok: false,
        reason: "You already have 4 framings (the max). Probe the ones you have via warrant_lab instead.",
        bypass_signals: ["framings_at_max"]
      };
    }
    if (Array.isArray(journal.framings) && journal.framings.length < 1) {
      return {
        ok: false,
        reason: "Author your first framing yourself \u2014 pick a FRAMING_TAXONOMY chip and name what it foregrounds. AI helps you find the NEXT one.",
        bypass_signals: ["no_first_framing"]
      };
    }
    if (Array.isArray(journal.claimEvidenceLinks) && journal.claimEvidenceLinks.length > 0) {
      return {
        ok: false,
        reason: "You already started building claim-evidence links. Loop back through Stage 3 manually to add framings \u2014 AI cannot help once a position is in motion.",
        bypass_signals: ["warrant_chain_started"]
      };
    }
    if (!exemplarOk(journal, "counter_framings")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function warrantQuestionerGate(journal, ctx) {
    var floors = devFloors(journal.devLevel || "6_8");
    var hp = journal.humanitiesPosition;
    if (!hp || !hp.text || hp.text.trim().length < (floors.warrant ? floors.warrant + 10 : 60)) {
      return {
        ok: false,
        reason: "Author your position (\u2265" + (floors.warrant + 10) + " chars) before AI probes your warrants.",
        bypass_signals: ["no_position"]
      };
    }
    if (inDenylist(hp.text, THESIS_PLATITUDE_DENYLIST)) {
      return {
        ok: false,
        reason: "Your position reads as a platitude. Take a real position.",
        bypass_signals: ["position_platitude"]
      };
    }
    var links = journal.claimEvidenceLinks || [];
    if (links.length < 1) {
      return {
        ok: false,
        reason: "Author at least one claim-evidence link first.",
        bypass_signals: ["no_links"]
      };
    }
    var targetLink = ctx && ctx.targetLinkId ? links.filter(function(l) {
      return l.id === ctx.targetLinkId;
    })[0] : links[links.length - 1];
    if (!targetLink) {
      return { ok: false, reason: "Target link not found.", bypass_signals: ["target_link_missing"] };
    }
    var warrant = (targetLink.warrant || "").trim();
    if (warrant.length < (floors.warrant || 50)) {
      return {
        ok: false,
        reason: "Author a warrant of \u2265" + (floors.warrant || 50) + " chars first.",
        bypass_signals: ["warrant_too_short"]
      };
    }
    var frameLink = false;
    (journal.framings || []).forEach(function(f) {
      if (f.framingPrompt && normalizeForCompare(warrant).indexOf(normalizeForCompare(f.framingPrompt).slice(0, 20)) !== -1) frameLink = true;
    });
    if (!WARRANT_MARKERS_RE.test(warrant) && !frameLink) {
      return {
        ok: false,
        reason: "Your warrant needs an inferential bridge token (e.g. since, because, treats X as, counts as) OR substring-link to a framing prompt.",
        bypass_signals: ["warrant_no_marker"]
      };
    }
    if (inDenylist(warrant, WARRANT_TAUTOLOGY_DENYLIST)) {
      return {
        ok: false,
        reason: "Your warrant reads as a tautology. A warrant names the assumption that licenses moving from evidence to claim.",
        bypass_signals: ["warrant_tautology"]
      };
    }
    if (tokenJaccard(hp.text, warrant) >= 0.5) {
      return {
        ok: false,
        reason: "Your warrant overlaps too much with your claim. The warrant should name the assumption BETWEEN evidence and claim.",
        bypass_signals: ["warrant_restates_claim"]
      };
    }
    if (!exemplarOk(journal, "warrant_lab")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function noAiStageSentinelGate(journal) {
    return {
      ok: false,
      reason: "positionality_reckoning is a NO-AI stage by design \u2014 standpoint cannot be drafted by a system that has no standpoint of its own.",
      bypass_signals: ["no_ai_stage"]
    };
  }
  function standpointMirrorGate(journal) {
    var devLevel = journal.devLevel || "6_8";
    if (devLevel === "k2" || devLevel === "3_5") {
      return {
        ok: false,
        reason: "Standpoint mirror is reserved for 6-8 and up. Continue authoring your composition directly.",
        bypass_signals: ["dev_level_below_floor"]
      };
    }
    var floors = devFloors(devLevel);
    var comps = journal.compositions || [];
    var latest = comps.length ? comps[comps.length - 1] : null;
    if (!latest || !latest.bodyText) {
      return {
        ok: false,
        reason: "Author a draft composition first.",
        bypass_signals: ["no_composition"]
      };
    }
    var gc = journal.genreChoice && journal.genreChoice.genre || "op_ed";
    var bounds = (floors.composition || {})[gc] || [200, 800];
    var wc = (latest.bodyText.trim().split(/\s+/).filter(Boolean) || []).length;
    if (wc < bounds[0]) {
      return {
        ok: false,
        reason: "Composition needs at least " + bounds[0] + " words for " + gc + ".",
        bypass_signals: ["composition_below_floor"]
      };
    }
    var ps = journal.positionalitySnapshots || [];
    if (ps.length < 2) {
      return {
        ok: false,
        reason: "You need at least 2 positionality snapshots (the original + at least one revision after iteration).",
        bypass_signals: ["too_few_positionality_snapshots"]
      };
    }
    var coda = (latest.foreclosureCodaText || "").trim();
    if (!coda) {
      return {
        ok: false,
        reason: "Foreclosure Coda not yet assembled \u2014 open the composition workspace.",
        bypass_signals: ["no_foreclosure_coda"]
      };
    }
    var latestSnap = ps[ps.length - 1];
    if (!latestSnap.obscuringField || coda.indexOf(latestSnap.obscuringField.slice(0, 20)) === -1) {
      return {
        ok: false,
        reason: "Foreclosure Coda must include the latest positionality.obscuring text.",
        bypass_signals: ["coda_missing_obscuring"]
      };
    }
    var av = journal.absentVoices || [];
    for (var i = 0; i < av.length; i++) {
      if (av[i].whoseVoiceText && coda.indexOf(av[i].whoseVoiceText.slice(0, 20)) === -1) {
        return {
          ok: false,
          reason: 'Foreclosure Coda is missing absent-voice "' + av[i].whoseVoiceText.slice(0, 30) + '...".',
          bypass_signals: ["coda_missing_absent_voice"]
        };
      }
    }
    if (!exemplarOk(journal, "genre_composition")) {
      return {
        ok: false,
        reason: "Look at the example pair for this step first.",
        bypass_signals: ["exemplar_not_viewed"]
      };
    }
    return { ok: true };
  }
  function contestabilityProbePrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var stakeholders = (journal.questionStakeholders || []).map(function(s, i) {
      return i + 1 + ". " + s.whoseQuestionIsThis + " (cares because: " + s.whyTheyCareText + ")";
    }).join("\n");
    var plausibles = (journal.humanitiesPlausibleAnswers || []).map(function(p, i) {
      return i + 1 + ". " + p.text + (p.isWorkingPosition ? " [WORKING]" : "");
    }).join("\n");
    var pos = journal.positionality || {};
    var sa = journal.stakesAudience || {};
    return [
      "SYSTEM: You are a humanities-inquiry coach helping a " + devLevel + " student probe whether their question is genuinely CONTESTABLE.",
      "You MUST NOT propose a better question, rewrite the question, supply a thesis, judge good/bad, name a stake the student did not declare, propose plausible answers, or pick the strongest.",
      "You only ask QUESTIONS probing what makes the question contestable, whose stake is unnamed, and which framings might dissolve it.",
      'Every question ends with "?", is \u226425 words, avoids causal markers (because/therefore/since/thus/hence).',
      "",
      "USER:",
      "devLevel: " + devLevel,
      "question: " + (journal.questionTitle || ""),
      "stakes audience: " + (sa.label || sa.chip || "?"),
      "stakeholders:\n" + stakeholders,
      "plausible answers:\n" + plausibles,
      "positionality (verbatim): " + (pos.text || "[voice " + (pos.durationS || "?") + "s]"),
      "",
      'Return ONLY JSON: { "what_makes_this_contestable_questions": string[], "whose_stake_is_unnamed_questions": string[], "framings_that_might_dissolve_the_question_questions": string[] }'
    ].join("\n");
  }
  function sourceLateralProbePrompt(journal, ctx) {
    var devLevel = journal.devLevel || "6_8";
    var targetId = ctx && ctx.targetSourceId;
    var src = (journal.sources || []).filter(function(s) {
      return s.id === targetId;
    })[0] || {};
    var sift = src.sift || {};
    var inv = sift.investigate || {};
    var usedChips = /* @__PURE__ */ new Set();
    (journal.absentVoices || []).forEach(function(av) {
      if (av.whyAbsentChip) usedChips.add(av.whyAbsentChip);
    });
    var unusedChips = ABSENT_VOICE_CHIPS.filter(function(c) {
      return !usedChips.has(c);
    });
    var wmif = Array.isArray(inv.whoMadeItFacts) ? inv.whoMadeItFacts.map(function(f) {
      return "- " + f.text;
    }).join("\n") : "";
    return [
      "SYSTEM: You are a humanities-inquiry coach reviewing a student's lateral-reading work on ONE source. You CANNOT see the source text.",
      "You MUST NOT summarize the source, identify the publisher, evaluate credibility, assign a tier, supply who-made-it facts, write any sift field, quote the source, or fact-check.",
      "You only ask questions probing the LATERAL WORK the student has done: chain of transmission, presentism, original audience, independent coverage gaps, absent voices.",
      'Every question ends with "?", is \u226425 words, avoids causal markers AND imperative verbs (try/use/add/replace/should).',
      "NEVER name a scholar. NEVER quote text.",
      "",
      "USER:",
      "devLevel: " + devLevel,
      "student stop note (verbatim): " + ((sift.stop || {}).firstReactionText || ""),
      "student independent source ref: " + (inv.independentSourceRef || ""),
      "student lateral evidence note (verbatim): " + (inv.lateralEvidence || ""),
      "student who-made-it facts:\n" + wmif,
      "student why-they-made-it hypothesis: " + (inv.whyTheyMadeItHypothesis || "?"),
      "unused absent-voice chips: " + JSON.stringify(unusedChips),
      "",
      'Return ONLY JSON: { "lateral_moves_still_missing_questions": string[], "whose_stake_in_publishing_this_questions": string[], "independent_coverage_gaps_questions": string[], "absent_voice_kinds_not_yet_tracked": string[] (intersection of unused chips ONLY \u2014 strings must be from the unused list verbatim), "presentism_risks_in_my_reading_questions": string[], "what_the_original_audience_would_have_heard_questions": string[], "chain_of_transmission_blind_spots_questions": string[] }'
    ].join("\n");
  }
  function counterFramingVoicerPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var usedChips = /* @__PURE__ */ new Set();
    (journal.framings || []).forEach(function(f) {
      if (f.frameKindChip) usedChips.add(f.frameKindChip);
    });
    var unused = FRAMING_TAXONOMY.filter(function(c) {
      return !usedChips.has(c.id);
    }).map(function(c) {
      return { id: c.id, label: c.label, oneLineCue: c.oneLineCue };
    });
    var existingFramings = (journal.framings || []).map(function(f, i) {
      return i + 1 + ". [" + f.frameKindChip + "] foregrounds: " + (f.whatItForegrounds || "");
    }).join("\n");
    return [
      "SYSTEM: You are a humanities-inquiry coach helping a " + devLevel + " student surface ADDITIONAL framings from a CURATED CHIP LIST.",
      "You ABSOLUTELY MUST NOT name a scholar, quote any text, attribute to a person / school / movement, propose frame labels of your own, propose frame contents, rank framings, or generate scholar-like prose.",
      "You may select chip ids ONLY from the unused chip list provided. You cannot invent chips.",
      'Every question ends with "?", \u226425 words, no causal markers, no imperative verbs.',
      "",
      "USER:",
      "devLevel: " + devLevel,
      "question: " + (journal.questionTitle || ""),
      "existing framings:\n" + existingFramings,
      "unused framing chips: " + JSON.stringify(unused),
      "",
      'Return ONLY JSON: { "framing_kind_chips_not_yet_used": string[] (chip ids ONLY from unused list verbatim), "what_each_chip_would_foreground_questions": [{ "frame_kind_chip": string, "foregrounding_questions": string[], "occlusion_questions": string[] }], "framings_that_might_compete_with_yours_questions": string[] }'
    ].join("\n");
  }
  function warrantQuestionerPrompt(journal, ctx) {
    var devLevel = journal.devLevel || "6_8";
    var links = journal.claimEvidenceLinks || [];
    var targetLink = ctx && ctx.targetLinkId ? links.filter(function(l) {
      return l.id === ctx.targetLinkId;
    })[0] : links[links.length - 1];
    if (!targetLink) targetLink = {};
    var subTrigger = "A";
    if (targetLink.stuckSignal) subTrigger = "B";
    else if ((journal.framingProbes || []).filter(function(p) {
      return p.linkId === targetLink.id;
    }).length >= 1) {
      var probes = (journal.framingProbes || []).filter(function(p) {
        return p.linkId === targetLink.id;
      });
      var allSurvive = probes.every(function(p) {
        return p.verdict === "warrant_survives";
      });
      var hasJustification = probes.every(function(p) {
        return p.allSurvivesJustification && p.allSurvivesJustification.length >= 120;
      });
      if (allSurvive && !hasJustification) subTrigger = "C";
    }
    var hp = journal.humanitiesPosition || {};
    var framingsList = (journal.framings || []).map(function(f, i) {
      return i + 1 + ". id=" + f.id + " [" + f.frameKindChip + "] foregrounds: " + (f.whatItForegrounds || "");
    }).join("\n");
    return [
      "SYSTEM: You are a humanities-inquiry coach pressure-testing a student-authored Toulmin chain. Sub-trigger: " + subTrigger + ".",
      "You MUST NOT supply a warrant, propose a warrant, rewrite the claim, rate the argument, label strong/weak/well-warranted, propose better thesis, propose qualifier or rebuttal text, judge claim defensibility, propose verdicts, or rebalance framings.",
      'Every question ends with "?", \u226425 words, no causal markers, no imperative verbs.',
      "If sub-trigger is B (stuckSignal), select an analog domain from ANALOG_DOMAIN_TAXONOMY: " + JSON.stringify(ANALOG_DOMAIN_TAXONOMY) + " that does NOT share more than 30% token overlap with the question. Show the SHAPE of a claim/warrant/qualifier in that domain (the student translates SHAPE, not content).",
      "If sub-trigger is C, generate pressure_test_questions_by_framing \u2014 for each framing, ask 1-2 questions that would force the student to acknowledge whether the warrant truly survives.",
      "",
      "USER:",
      "devLevel: " + devLevel,
      "sub_trigger: " + subTrigger,
      "question: " + (journal.questionTitle || ""),
      "position (verbatim): " + (hp.text || ""),
      'target claim-evidence link: claim_pointer="' + (targetLink.claim || "") + '" evidence_ids=' + JSON.stringify(targetLink.evidenceIds || []) + ' warrant="' + (targetLink.warrant || "") + '" qualifier="' + (targetLink.qualifier || "") + '" rebuttal="' + (targetLink.rebuttal || "") + '" stuckSignal=' + !!targetLink.stuckSignal,
      "framings:\n" + framingsList,
      "",
      'Return ONLY JSON: { "warrant_assumptions_left_implicit_questions": string[], "qualifier_scope_questions": string[], "rebuttal_pressure_questions": string[], "standpoint_dependency_questions": string[], "analog_domain_shape": { "analog_domain": string, "example_claim_shape": string, "example_warrant_shape": string, "example_qualifier_shape": string, "transfer_questions": string[] }, "pressure_test_questions_by_framing": [{ "framing_id": string, "questions": string[] }] }'
    ].join("\n");
  }
  function standpointMirrorPrompt(journal) {
    var devLevel = journal.devLevel || "6_8";
    var ps = journal.positionalitySnapshots || [];
    var latest = ps.length ? ps[ps.length - 1] : {};
    var av = (journal.absentVoices || []).map(function(a, i) {
      return i + 1 + ". " + a.whoseVoiceText;
    }).join("\n");
    var hp = journal.humanitiesPosition || {};
    var comps = journal.compositions || [];
    var latestComp = comps.length ? comps[comps.length - 1] : {};
    var gc = journal.genreChoice && journal.genreChoice.genre || "op_ed";
    return [
      "SYSTEM: You are a humanities-inquiry coach helping a " + devLevel + " student check whether their composition's VISIBILITY and OBSCURING match their declared positionality and absent voices.",
      "You MUST NOT rewrite, polish, suggest hooks, suggest titles, propose claims, evaluate the artifact, call the position strong/weak/balanced, name the student's identity, supply positionality, name absent voices, or declare standpoint good enough.",
      "You only echo back what the STUDENT wrote about visibility / obscuring / absent voices and ask whether the composition reflects it.",
      "You MUST NOT include any substring (>=12 chars) of compositions.bodyText in your output.",
      'Every question ends with "?", \u226425 words, no causal markers, no imperative verbs.',
      "",
      "USER:",
      "devLevel: " + devLevel,
      "genre: " + gc,
      "latest positionality visibility (verbatim): " + (latest.visibilityField || ""),
      "latest positionality obscuring (verbatim): " + (latest.obscuringField || ""),
      "whatThisClaimDoesNotSpeakTo (verbatim): " + (hp.whatThisClaimDoesNotSpeakTo || ""),
      "absent voices:\n" + av,
      "foreclosure coda (verbatim, do NOT echo): " + (latestComp.foreclosureCodaText || ""),
      "",
      'Return ONLY JSON: { "echoed_what_you_said_about_visibility_questions": string[], "echoed_what_you_said_about_obscuring_questions": string[], "absent_voices_you_named_then_might_explore_further_questions": string[], "where_your_standpoint_might_shape_your_warrant_questions": string[], "foreclosure_completeness_questions": string[], "genre_accountability_questions": string[] }'
    ].join("\n");
  }
  function contestabilityProbeValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["what_makes_this_contestable_questions", "whose_stake_is_unnamed_questions", "framings_that_might_dissolve_the_question_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    var qt = normalizeForCompare(journal.questionTitle || "");
    var all = [].concat(out.what_makes_this_contestable_questions, out.whose_stake_is_unnamed_questions, out.framings_that_might_dissolve_the_question_questions);
    for (var k = 0; k < all.length; k++) {
      if (typeof all[k] === "string" && qt && normalizeForCompare(all[k]).indexOf(qt) !== -1) {
        return { __rejected: true, rejectReason: "question_echoes_title_verbatim", attemptedShapeKeys: ["questions"] };
      }
    }
    return out;
  }
  var SCHOLAR_NAMES_UNAMBIGUOUS = /* @__PURE__ */ new Set([
    "foucault",
    "foucauldian",
    "foucaults",
    "derrida",
    "derridean",
    "marx",
    "marxist",
    "marxian",
    "gramsci",
    "gramscian",
    "spivak",
    "bourdieu",
    "habermas",
    "chomsky",
    "nietzsche",
    "nietzschean",
    "freud",
    "freudian",
    "lacan",
    "lacanian",
    "zizek",
    "adorno",
    "durkheim",
    "fanon",
    "fanonian",
    "crenshaw",
    "wineburg",
    "caulfield",
    "barthes",
    "sartre",
    "sartrean",
    "beauvoir",
    "deleuze",
    "deleuzian",
    "hegel",
    "hegelian",
    "kant",
    "kantian",
    "arendt",
    "gadamer",
    "ranciere",
    "agamben"
  ]);
  var SCHOLAR_NAMES_AMBIGUOUS = /* @__PURE__ */ new Set(["Said", "Butler", "Hooks", "Weber"]);
  function scholarNameSuspected(text) {
    if (!text) return false;
    var s = String(text);
    if (/\b(Dr\.?|Professor|Prof\.?|Sir|Dame)\s+[A-Z][a-z]+/.test(s)) return true;
    if (/\b(de|van|von|da|del|della|du|al)\s+[A-Z][a-z]+/.test(s)) return true;
    var lowerTokens = s.toLowerCase().match(/[a-z']+/g) || [];
    for (var i = 0; i < lowerTokens.length; i++) {
      if (SCHOLAR_NAMES_UNAMBIGUOUS.has(lowerTokens[i])) return true;
    }
    var capTokens = s.match(/\b[A-Z][a-z]+\b/g) || [];
    for (var j = 0; j < capTokens.length; j++) {
      if (SCHOLAR_NAMES_AMBIGUOUS.has(capTokens[j])) return true;
    }
    return false;
  }
  function sourceLateralProbeValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["lateral_moves_still_missing_questions", "whose_stake_in_publishing_this_questions", "independent_coverage_gaps_questions", "absent_voice_kinds_not_yet_tracked", "presentism_risks_in_my_reading_questions", "what_the_original_audience_would_have_heard_questions", "chain_of_transmission_blind_spots_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    var allText = JSON.stringify(out);
    if (scholarNameSuspected(allText)) {
      return { __rejected: true, rejectReason: "scholar_name_in_output", attemptedShapeKeys: ["*"] };
    }
    var allValuesForQuoteCheck = needed.reduce(function(acc, k) {
      var v = out[k];
      return Array.isArray(v) ? acc.concat(v.filter(function(x) {
        return typeof x === "string";
      })) : acc;
    }, []);
    for (var qv = 0; qv < allValuesForQuoteCheck.length; qv++) {
      if (/"[^"]{20,}"/.test(allValuesForQuoteCheck[qv])) {
        return { __rejected: true, rejectReason: "quoted_text_in_output", attemptedShapeKeys: ["*"] };
      }
    }
    var IMP = /\b(try|use|add|replace|swap|consider|should|must|need to)\b/i;
    var allQ = ["lateral_moves_still_missing_questions", "whose_stake_in_publishing_this_questions", "independent_coverage_gaps_questions", "presentism_risks_in_my_reading_questions", "what_the_original_audience_would_have_heard_questions", "chain_of_transmission_blind_spots_questions"].reduce(function(acc, k) {
      return acc.concat(out[k] || []);
    }, []);
    for (var q = 0; q < allQ.length; q++) {
      if (typeof allQ[q] === "string" && IMP.test(allQ[q])) {
        return { __rejected: true, rejectReason: "imperative_in_questions", attemptedShapeKeys: ["questions"] };
      }
    }
    var chipEnum = new Set(ABSENT_VOICE_CHIPS);
    for (var c = 0; c < (out.absent_voice_kinds_not_yet_tracked || []).length; c++) {
      if (!chipEnum.has(out.absent_voice_kinds_not_yet_tracked[c])) {
        return { __rejected: true, rejectReason: "absent_voice_chip_not_in_enum", attemptedShapeKeys: ["absent_voice_kinds_not_yet_tracked"] };
      }
    }
    return out;
  }
  function counterFramingVoicerValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    if (!Array.isArray(out.framing_kind_chips_not_yet_used)) {
      return { __rejected: true, rejectReason: "missing_framing_kind_chips_not_yet_used", attemptedShapeKeys: Object.keys(out || {}) };
    }
    if (!Array.isArray(out.what_each_chip_would_foreground_questions)) {
      return { __rejected: true, rejectReason: "missing_what_each_chip_would_foreground_questions", attemptedShapeKeys: ["*"] };
    }
    var chipIds = new Set(FRAMING_TAXONOMY.map(function(c) {
      return c.id;
    }));
    for (var i = 0; i < out.framing_kind_chips_not_yet_used.length; i++) {
      if (!chipIds.has(out.framing_kind_chips_not_yet_used[i])) {
        return { __rejected: true, rejectReason: "chip_not_in_taxonomy", attemptedShapeKeys: ["framing_kind_chips_not_yet_used"] };
      }
    }
    var allText = JSON.stringify(out);
    if (scholarNameSuspected(allText)) {
      return { __rejected: true, rejectReason: "scholar_name_in_output", attemptedShapeKeys: ["*"] };
    }
    if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/.test(allText)) {
      var safeWhitelist = FRAMING_TAXONOMY.map(function(c) {
        return c.label;
      }).join(" ").toLowerCase();
      var matches = allText.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
      for (var m = 0; m < matches.length; m++) {
        var lower = matches[m].toLowerCase();
        if (safeWhitelist.indexOf(lower) === -1 && lower !== "inquiry studio" && lower !== "research hub") {
          return { __rejected: true, rejectReason: "proper_noun_pair_detected_likely_scholar_name", attemptedShapeKeys: ["*"] };
        }
      }
    }
    return out;
  }
  function warrantQuestionerValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["warrant_assumptions_left_implicit_questions", "qualifier_scope_questions", "rebuttal_pressure_questions", "standpoint_dependency_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    if (out.analog_domain_shape && out.analog_domain_shape.analog_domain) {
      if (ANALOG_DOMAIN_TAXONOMY.indexOf(out.analog_domain_shape.analog_domain) === -1) {
        return { __rejected: true, rejectReason: "analog_domain_not_in_taxonomy", attemptedShapeKeys: ["analog_domain_shape", "analog_domain"] };
      }
      var qt = normalizeForCompare(journal.questionTitle || "");
      var dom = normalizeForCompare(out.analog_domain_shape.analog_domain.replace(/_/g, " "));
      if (qt && tokenJaccard(qt, dom) >= 0.3) {
        return { __rejected: true, rejectReason: "analog_domain_too_close_to_question", attemptedShapeKeys: ["analog_domain_shape"] };
      }
    }
    var IMP = /^(your warrant should|a better warrant|consider warranting|the warrant could be)/i;
    var allText = JSON.stringify(out);
    if (IMP.test(allText)) {
      return { __rejected: true, rejectReason: "directive_phrase_in_output", attemptedShapeKeys: ["*"] };
    }
    return out;
  }
  function standpointMirrorValidate(out, journal) {
    if (!out) return { __rejected: true, rejectReason: "no_output", attemptedShapeKeys: [] };
    var needed = ["echoed_what_you_said_about_visibility_questions", "echoed_what_you_said_about_obscuring_questions", "absent_voices_you_named_then_might_explore_further_questions", "where_your_standpoint_might_shape_your_warrant_questions", "foreclosure_completeness_questions", "genre_accountability_questions"];
    for (var i = 0; i < needed.length; i++) {
      if (!Array.isArray(out[needed[i]])) {
        return { __rejected: true, rejectReason: "missing_" + needed[i], attemptedShapeKeys: Object.keys(out || {}) };
      }
    }
    var comps = journal.compositions || [];
    var latest = comps.length ? comps[comps.length - 1] : {};
    var body = normalizeForCompare(latest.bodyText || "");
    if (body) {
      var allText = normalizeForCompare(JSON.stringify(out));
      for (var s = 0; s + 12 <= body.length; s++) {
        var span = body.slice(s, s + 12);
        if (allText.indexOf(span) !== -1) {
          return { __rejected: true, rejectReason: "echoes_composition_body", attemptedShapeKeys: ["*"] };
        }
      }
    }
    return out;
  }
  var TOUCHPOINTS = {
    contestability_probe: {
      id: "contestability_probe",
      stage: "frame_question",
      label: "Probe my question for contestability",
      gateCheck: contestabilityProbeGate,
      buildPrompt: contestabilityProbePrompt,
      validate: contestabilityProbeValidate
    },
    source_lateral_probe: {
      id: "source_lateral_probe",
      stage: "sift_triage",
      label: "Probe a source laterally",
      gateCheck: sourceLateralProbeGate,
      buildPrompt: sourceLateralProbePrompt,
      validate: sourceLateralProbeValidate
    },
    counter_framing_voicer: {
      id: "counter_framing_voicer",
      stage: "counter_framings",
      label: "Surface a framing I have not used",
      gateCheck: counterFramingVoicerGate,
      buildPrompt: counterFramingVoicerPrompt,
      validate: counterFramingVoicerValidate
    },
    warrant_questioner: {
      id: "warrant_questioner",
      stage: "warrant_lab",
      label: "Pressure-test my warrant",
      gateCheck: warrantQuestionerGate,
      buildPrompt: warrantQuestionerPrompt,
      validate: warrantQuestionerValidate
    },
    no_ai_stage_sentinel: {
      id: "no_ai_stage_sentinel",
      stage: "positionality_reckoning",
      label: "NO AI here by design",
      gateCheck: noAiStageSentinelGate,
      buildPrompt: function() {
        return "";
      },
      validate: function() {
        return { __rejected: true, rejectReason: "no_ai_stage" };
      }
    },
    standpoint_mirror: {
      id: "standpoint_mirror",
      stage: "genre_composition",
      label: "Mirror my standpoint against my draft",
      gateCheck: standpointMirrorGate,
      buildPrompt: standpointMirrorPrompt,
      validate: standpointMirrorValidate
    }
  };
  function CycleWheel(props) {
    var t = props.t || function(k) {
      return k;
    };
    var activeStage = props.activeStage;
    var onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var sourceCount = props.sourceCount || 0;
    var size = 188, radius = 72;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "navigation",
        "aria-label": t("humanities.cycle_nav_aria") || "Inquiry Studio cycle navigation",
        style: { position: "relative", width: size + "px", height: size + "px", flexShrink: 0 }
      },
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "10px",
        color: "#475569",
        fontWeight: 700,
        padding: "24px"
      } }, t("humanities.cycle_center_label") || "Loops are first-class. Click any stage."),
      STAGES.map(function(s, idx) {
        var theta = idx / STAGES.length * 2 * Math.PI - Math.PI / 2;
        var x = size / 2 + radius * Math.cos(theta) - 22;
        var y = size / 2 + radius * Math.sin(theta) - 22;
        var isActive = activeStage === s.key;
        var sn = journalStageNotes[s.key] || {};
        var hasWork = !!(sn.contestabilityRationale || sn.text || s.key === "sift_triage" && sourceCount > 0);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.key,
            type: "button",
            "data-help-key": "humanities_cycle_" + s.key,
            onClick: function() {
              if (typeof onJump === "function") onJump(s.key);
            },
            "aria-label": s.label + (isActive ? " (current)" : "") + (hasWork ? " (has work)" : ""),
            "aria-current": isActive ? "step" : void 0,
            style: {
              position: "absolute",
              left: x + "px",
              top: y + "px",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: isActive ? s.color : hasWork ? "#fdf2f8" : "#ffffff",
              color: isActive ? "#ffffff" : s.color,
              border: "2px solid " + s.color,
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isActive ? "0 4px 12px " + s.color + "66" : "none",
              transition: "all 0.15s"
            },
            title: s.label
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, s.icon)
        );
      })
    );
  }
  function StageChipStrip(props) {
    var t = props.t || function(k) {
      return k;
    };
    var activeStage = props.activeStage, onJump = props.onJump;
    var journalStageNotes = props.journalStageNotes || {};
    var sourceCount = props.sourceCount || 0;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "tablist",
        "aria-label": t("humanities.aria_stage_nav") || "Stage navigation",
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "6px 0",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0"
        }
      },
      STAGES.map(function(s, idx) {
        var isActive = activeStage === s.key;
        var sn = journalStageNotes[s.key] || {};
        var hasWork = !!(sn.contestabilityRationale || sn.text || s.key === "sift_triage" && sourceCount > 0);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.key,
            type: "button",
            role: "tab",
            "aria-selected": isActive,
            onClick: function() {
              if (typeof onJump === "function") onJump(s.key);
            },
            style: {
              padding: "6px 12px",
              borderRadius: "999px",
              background: isActive ? s.color : "#ffffff",
              color: isActive ? "#ffffff" : "#475569",
              border: "1px solid " + (isActive ? s.color : "#cbd5e1"),
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }
          },
          /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, idx + 1 + ". "),
          /* @__PURE__ */ React.createElement("span", null, s.shortLabel),
          hasWork && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2713")
        );
      })
    );
  }
  function LoopBackPicker(props) {
    var t = props.t || function(k) {
      return k;
    };
    var toStage = props.toStage;
    var preloadChipId = props.preloadChipId || null;
    var onCommit = props.onCommit, onCancel = props.onCancel;
    var _id = useState(preloadChipId);
    var chipId = _id[0];
    var setChipId = _id[1];
    var _other = useState("");
    var otherText = _other[0];
    var setOtherText = _other[1];
    var canCommit = !!chipId && (chipId !== "other" || otherText.trim().length >= 10);
    var modalRef = useRef(null);
    useFocusTrap(modalRef, true, onCancel);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: modalRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("humanities.loopback_modal_title") || "Why are you looping back?",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        },
        onClick: function(e) {
          if (e.target === e.currentTarget) onCancel();
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: function(e) {
            e.stopPropagation();
          },
          style: {
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "480px",
            width: "100%",
            padding: "20px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            maxHeight: "90vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F501} "), t("humanities.loopback_modal_title") || "Why are you looping back?"),
        /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 12px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("humanities.loopback_modal_help") || "Loops are how rigor accumulates in humanities work. Your downstream work is preserved; you can return."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "6px", maxHeight: "50vh", overflowY: "auto" } }, LOOPBACK_CHIPS.map(function(c) {
          var selected = chipId === c.id;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: c.id,
              type: "button",
              onClick: function() {
                setChipId(c.id);
              },
              "aria-pressed": selected,
              style: {
                padding: "8px 12px",
                borderRadius: "10px",
                border: selected ? "2px solid #be185d" : "1px solid #cbd5e1",
                background: selected ? "#fce7f3" : "#ffffff",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                color: "#1e293b"
              }
            },
            /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "16px" } }, c.icon),
            /* @__PURE__ */ React.createElement("span", null, c.label)
          );
        })),
        chipId === "other" && /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: otherText,
            onChange: function(e) {
              setOtherText(e.target.value);
            },
            rows: 2,
            maxLength: 240,
            placeholder: t("humanities.loopback_other_ph") || "Briefly: what made you loop back? (\u226510 chars)",
            style: {
              marginTop: "8px",
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontFamily: "inherit",
              fontSize: "12px"
            }
          }
        ),
        /* @__PURE__ */ React.createElement("div", { style: { marginTop: "14px", display: "flex", justifyContent: "flex-end", gap: "8px" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onCancel,
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer"
            }
          },
          t("common.cancel") || "Cancel"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            disabled: !canCommit,
            onClick: function() {
              onCommit({ whyChipId: chipId, why: chipId === "other" ? otherText.trim() : null });
            },
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: canCommit ? "#be185d" : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "12px",
              cursor: canCommit ? "pointer" : "not-allowed"
            }
          },
          t("humanities.loopback_commit") || "Loop back to ",
          STAGE_BY_KEY[toStage] ? STAGE_BY_KEY[toStage].label : toStage
        ))
      )
    );
  }
  function EducatorPanel(props) {
    var t = props.t || function(k) {
      return k;
    };
    return /* @__PURE__ */ React.createElement("details", { style: {
      padding: "10px 14px",
      borderRadius: "12px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#9d174d" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F393} "), t("humanities.educator_panel_summary") || "For teachers: how humanities grading should work in this lane"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", fontSize: "11px", color: "#831843", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0" } }, t("humanities.educator_panel_p1") || "Humanities does not converge on what is true (science) or optimize a solution under constraint (engineering). It cultivates standing-to-speak under contested interpretation, then articulates a position accountable to multiple readings without false balance."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0" } }, t("humanities.educator_panel_p2") || "Grade the WARRANT TRAJECTORY (qualifierRevisionLog), the SOURCE TIER HISTORY (sift.tierHistory[]), and the FORECLOSURE CODA (does the artifact ship its blind spots WITH it?) \u2014 NOT essay polish. AI here asks adversarial questions only and is structurally locked out of Stage 5."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontStyle: "italic" } }, t("humanities.educator_panel_p3") || "Two cross-cutting rubric exemplars at lane exit reward loop-back density and standpoint-revision depth specifically. The WarrantTrajectoryRibbon is the load-bearing assessment artifact.")));
  }
  function BlockedNote(props) {
    var t = props.t;
    var reason = props.reason || (t("humanities.blocked_generic") || "AI couldn't help with that \u2014 try again later.");
    return /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e",
      lineHeight: 1.5
    } }, /* @__PURE__ */ React.createElement("strong", { style: { marginRight: "4px" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F6E1}\uFE0F "), t("humanities.blocked_prefix") || "AI helper paused:"), reason);
  }
  function TextareaCard(props) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "12px", fontWeight: 700, color: "#1e293b", display: "block" } }, props.label), props.help && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, props.help), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: props.value || "",
        onChange: function(e) {
          props.onChange(e.target.value);
        },
        rows: props.rows || 3,
        maxLength: props.max || 800,
        placeholder: props.placeholder || "",
        style: {
          marginTop: "4px",
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "60px"
        }
      }
    ));
  }
  function ExemplarGate(props) {
    var t = props.t, stageKey = props.stageKey;
    var journal = props.journal, setJournal = props.setJournal;
    var primitives = props.primitives || {};
    var ExemplarPair = primitives.ExemplarPair;
    var stageNote = (journal.stageNotes || {})[stageKey] || {};
    var viewed = !!(stageNote.exemplarViewed || stageNote.exemplarDismissed);
    var pair = props.pair;
    var floors = devFloors(journal.devLevel || "6_8");
    var _open = useState(false);
    var open = _open[0];
    var setOpen = _open[1];
    if (!pair || !ExemplarPair) return null;
    function tokenBoundReasoning(reasoning) {
      if (!reasoning || reasoning.trim().length < floors.exemplarReason) return false;
      var rt = normalizeForCompare(reasoning);
      var criterionToks = contentTokens(pair.criterion);
      var strongToks = contentTokens(pair.strongExample);
      var critHit = criterionToks.some(function(tk) {
        return rt.indexOf(tk) !== -1;
      });
      var strongHit = strongToks.some(function(tk) {
        return rt.indexOf(tk) !== -1;
      });
      return critHit && strongHit;
    }
    if (viewed && !open) {
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setOpen(true);
          },
          style: {
            padding: "6px 12px",
            borderRadius: "999px",
            background: "#f1f5f9",
            color: "#475569",
            border: "none",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4D6} "),
        t("humanities.review_exemplar_again") || "Review the example pair again"
      );
    }
    if (!viewed) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "12px",
        borderRadius: "12px",
        background: "#fffbeb",
        border: "1px solid #fcd34d"
      } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#92400e" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1} "), t("humanities.exemplar_required_prefix") || "Before AI can help here:", " ", t("humanities.exemplar_required_suffix") || "check this example pair (\u2265" + floors.exemplarReason + "c reasoning, token-bound to criterion)."), /* @__PURE__ */ React.createElement(
        ExemplarPair,
        {
          t,
          criterion: pair.criterion,
          strongExample: pair.strongExample,
          weakExample: pair.weakExample,
          onJudgment: function(j) {
            if (!tokenBoundReasoning(j.reasoning)) {
              return;
            }
            setJournal(function(prev) {
              var next = Object.assign({}, prev);
              next.stageNotes = Object.assign({}, prev.stageNotes || {});
              var sn = Object.assign({}, next.stageNotes[stageKey] || {});
              sn.exemplarViewed = true;
              sn.exemplarJudgment = j;
              sn.exemplarJudgmentAt = Date.now();
              next.stageNotes[stageKey] = sn;
              return next;
            });
          }
        }
      ), /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: "10px", color: "#a16207", fontStyle: "italic" } }, "Reasoning must be \u2265", floors.exemplarReason, " chars AND mention something from the criterion AND the strong example."), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setJournal(function(prev) {
              var next = Object.assign({}, prev);
              next.stageNotes = Object.assign({}, prev.stageNotes || {});
              var sn = Object.assign({}, next.stageNotes[stageKey] || {});
              sn.exemplarDismissed = true;
              sn.exemplarDismissedAt = Date.now();
              next.stageNotes[stageKey] = sn;
              return next;
            });
          },
          style: {
            marginTop: "8px",
            padding: "4px 10px",
            borderRadius: "999px",
            background: "transparent",
            color: "#92400e",
            border: "1px solid #fcd34d",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        t("humanities.exemplar_skip") || "I've got it \u2014 skip without judging"
      ));
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      ExemplarPair,
      {
        t,
        criterion: pair.criterion,
        strongExample: pair.strongExample,
        weakExample: pair.weakExample,
        initialChoice: stageNote.exemplarJudgment && stageNote.exemplarJudgment.choice || null,
        initialReasoning: stageNote.exemplarJudgment && stageNote.exemplarJudgment.reasoning || "",
        onJudgment: function(j) {
          setJournal(function(prev) {
            var next = Object.assign({}, prev);
            next.stageNotes = Object.assign({}, prev.stageNotes || {});
            var sn = Object.assign({}, next.stageNotes[stageKey] || {});
            sn.exemplarJudgment = j;
            next.stageNotes[stageKey] = sn;
            return next;
          });
          setOpen(false);
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setOpen(false);
        },
        style: {
          marginTop: "6px",
          background: "transparent",
          border: "none",
          color: "#475569",
          fontSize: "11px",
          cursor: "pointer",
          textDecoration: "underline"
        }
      },
      t("common.close") || "Close"
    ));
  }
  function AiResultPanel(props) {
    var t = props.t, data = props.data;
    var primitives = props.primitives || {};
    var SuggestionBadge = primitives.SuggestionBadge;
    if (!data) return null;
    function renderQuestions(arr, label) {
      if (!Array.isArray(arr) || !arr.length) return null;
      return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, label), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px", color: "#1e293b", lineHeight: 1.6 } }, arr.map(function(q, i) {
        return /* @__PURE__ */ React.createElement("li", { key: i }, q);
      })));
    }
    return /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", style: {
      marginTop: "10px",
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#fdf2f8",
      border: "1px solid #f9a8d4"
    } }, SuggestionBadge && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "6px" } }, /* @__PURE__ */ React.createElement(SuggestionBadge, { t })), renderQuestions(data.what_makes_this_contestable_questions, t("humanities.aiq_contestable") || "What makes this contestable?"), renderQuestions(data.whose_stake_is_unnamed_questions, t("humanities.aiq_stake_unnamed") || "Whose stake is unnamed?"), renderQuestions(data.framings_that_might_dissolve_the_question_questions, t("humanities.aiq_dissolve") || "Framings that might dissolve the question:"), renderQuestions(data.lateral_moves_still_missing_questions, t("humanities.aiq_lateral_missing") || "Lateral moves still missing:"), renderQuestions(data.whose_stake_in_publishing_this_questions, t("humanities.aiq_stake_publishing") || "Whose stake in publishing this?"), renderQuestions(data.independent_coverage_gaps_questions, t("humanities.aiq_coverage_gaps") || "Independent coverage gaps:"), Array.isArray(data.absent_voice_kinds_not_yet_tracked) && data.absent_voice_kinds_not_yet_tracked.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, t("humanities.aiq_absent_voice_kinds") || "Absent-voice kinds not yet tracked:"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, data.absent_voice_kinds_not_yet_tracked.map(function(c, i) {
      return /* @__PURE__ */ React.createElement("span", { key: i, style: {
        padding: "3px 8px",
        borderRadius: "999px",
        background: "#fce7f3",
        color: "#9d174d",
        fontSize: "10px",
        fontWeight: 700,
        border: "1px solid #f9a8d4"
      } }, c);
    }))), renderQuestions(data.presentism_risks_in_my_reading_questions, t("humanities.aiq_presentism") || "Presentism risks in my reading:"), renderQuestions(data.what_the_original_audience_would_have_heard_questions, t("humanities.aiq_original_audience") || "What the original audience would have heard:"), renderQuestions(data.chain_of_transmission_blind_spots_questions, t("humanities.aiq_transmission") || "Chain-of-transmission blind spots:"), Array.isArray(data.framing_kind_chips_not_yet_used) && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, t("humanities.aiq_unused_chips") || "Unused framing chips you might explore:"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, data.framing_kind_chips_not_yet_used.map(function(c, i) {
      var chip = chipById(c);
      return /* @__PURE__ */ React.createElement("span", { key: i, style: {
        padding: "3px 8px",
        borderRadius: "999px",
        background: "#fce7f3",
        color: "#9d174d",
        fontSize: "10px",
        fontWeight: 700,
        border: "1px solid #f9a8d4"
      } }, chip ? chip.label : c);
    }))), Array.isArray(data.what_each_chip_would_foreground_questions) && data.what_each_chip_would_foreground_questions.map(function(entry, i) {
      var chip = chipById(entry.frame_kind_chip);
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, (t("humanities.aiq_if_you_tried") || "If you tried [{chip}]:").replace("{chip}", chip ? chip.label : entry.frame_kind_chip)), renderQuestions(entry.foregrounding_questions, t("humanities.aiq_foregrounding") || "Foregrounding:"), renderQuestions(entry.occlusion_questions, t("humanities.aiq_occlusion") || "Occlusion:"));
    }), renderQuestions(data.framings_that_might_compete_with_yours_questions, t("humanities.aiq_compete") || "Framings that might compete with yours:"), renderQuestions(data.warrant_assumptions_left_implicit_questions, t("humanities.aiq_warrant_assumptions") || "Warrant assumptions left implicit:"), renderQuestions(data.qualifier_scope_questions, t("humanities.aiq_qualifier_scope") || "Qualifier scope:"), renderQuestions(data.rebuttal_pressure_questions, t("humanities.aiq_rebuttal_pressure") || "Rebuttal pressure:"), renderQuestions(data.standpoint_dependency_questions, t("humanities.aiq_standpoint_dependency") || "Standpoint dependency:"), data.analog_domain_shape && data.analog_domain_shape.analog_domain && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "8px",
      padding: "8px 10px",
      borderRadius: "8px",
      background: "#fff",
      border: "1px solid #f9a8d4"
    } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, (t("humanities.aiq_analog_domain") || "Analog domain ({domain}):").replace("{domain}", data.analog_domain_shape.analog_domain.replace(/_/g, " "))), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px" } }, /* @__PURE__ */ React.createElement("em", null, t("humanities.aiq_claim_shape") || "Claim shape:"), " ", data.analog_domain_shape.example_claim_shape), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px" } }, /* @__PURE__ */ React.createElement("em", null, t("humanities.aiq_warrant_shape") || "Warrant shape:"), " ", data.analog_domain_shape.example_warrant_shape), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "11px" } }, /* @__PURE__ */ React.createElement("em", null, t("humanities.aiq_qualifier_shape") || "Qualifier shape:"), " ", data.analog_domain_shape.example_qualifier_shape), renderQuestions(data.analog_domain_shape.transfer_questions, t("humanities.aiq_transfer") || "Transfer questions (translate the shape, not the content):")), Array.isArray(data.pressure_test_questions_by_framing) && data.pressure_test_questions_by_framing.map(function(entry, i) {
      var f = (props.journal && props.journal.framings || []).filter(function(fr) {
        return fr.id === entry.framing_id;
      })[0];
      var chip = f ? chipById(f.frameKindChip) : null;
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, (t("humanities.aiq_pressure_test_via") || "Pressure test via [{frame}]:").replace("{frame}", chip ? chip.label : entry.framing_id)), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "12px" } }, (entry.questions || []).map(function(q, j) {
        return /* @__PURE__ */ React.createElement("li", { key: j }, q);
      })));
    }), renderQuestions(data.echoed_what_you_said_about_visibility_questions, t("humanities.aiq_echoed_visibility") || "Echoed: what you said about visibility:"), renderQuestions(data.echoed_what_you_said_about_obscuring_questions, t("humanities.aiq_echoed_obscuring") || "Echoed: what you said about obscuring:"), renderQuestions(data.absent_voices_you_named_then_might_explore_further_questions, t("humanities.aiq_absent_explore") || "Absent voices you named, then might explore further:"), renderQuestions(data.where_your_standpoint_might_shape_your_warrant_questions, t("humanities.aiq_standpoint_warrant") || "Where your standpoint might shape your warrant:"), renderQuestions(data.foreclosure_completeness_questions, t("humanities.aiq_foreclosure") || "Foreclosure-coda completeness:"), renderQuestions(data.genre_accountability_questions, t("humanities.aiq_genre_accountability") || "Genre accountability:"));
  }
  function PositionalityCard(props) {
    var t = props.t || function(k) {
      return k;
    };
    var journal = props.journal, setJournal = props.setJournal;
    var editable = !!props.editable;
    var pos = journal.positionality || { text: "", audioBase64: null, durationS: 0 };
    var ps = journal.positionalitySnapshots || [];
    var latest = ps.length ? ps[ps.length - 1] : null;
    var devLevel = journal.devLevel || "6_8";
    var floors = devFloors(devLevel);
    var primitives = props.primitives || {};
    var VoiceNoteBlock = primitives.VoiceNoteBlock;
    var _editing = useState(editable && !pos.text && !pos.audioBase64);
    var editing = _editing[0];
    var setEditing = _editing[1];
    var _draft = useState(pos.text || "");
    var draft = _draft[0];
    var setDraft = _draft[1];
    var _voice = useState({ audioBase64: pos.audioBase64, durationS: pos.durationS });
    var voice = _voice[0];
    var setVoice = _voice[1];
    var draftDenied = draft && inDenylist(draft, POSITIONALITY_DENYLIST);
    var draftLenOk = draft.trim().length >= floors.positionality || voice.audioBase64;
    var save = function() {
      if (draftDenied) return;
      if (!draftLenOk) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.positionality = {
          text: draft.trim(),
          audioBase64: voice.audioBase64 || null,
          durationS: voice.durationS || 0
        };
        return next;
      });
      setEditing(false);
    };
    if (!editable && !pos.text && !pos.audioBase64 && !latest) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "8px 12px",
        borderRadius: "10px",
        background: "#fdf2f8",
        border: "1px dashed #f9a8d4",
        fontSize: "11px",
        color: "#9d174d"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F9ED} "), t("humanities.positionality_missing_readonly") || "No positionality declared yet \u2014 loop back to Frame the Question to start.");
    }
    if (!editing) {
      var displayText = latest && latest.materialRelationshipText || pos.text;
      var visibility = latest && latest.visibilityField;
      var obscuring = latest && latest.obscuringField;
      var epi = latest && latest.epistemicStatus;
      return /* @__PURE__ */ React.createElement("div", { style: {
        padding: "8px 12px",
        borderRadius: "10px",
        background: "#fdf2f8",
        border: "1px solid #f9a8d4",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { fontSize: "20px" } }, "\u{1F9ED}"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "200px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", fontWeight: 800, color: "#9d174d" } }, t("humanities.positionality_card_title") || "Standpoint", " v" + (ps.length || 1), pos.staleLabel && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", color: "#b45309", fontWeight: 800, fontSize: "10px" } }, t("humanities.positionality_stale") || "(stale \u2014 re-version)")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#831843", marginTop: "2px", lineHeight: 1.5 } }, displayText && displayText.length > 140 ? displayText.slice(0, 140) + "\u2026" : displayText), (visibility || obscuring) && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#9d174d" } }, visibility && /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "see:"), " ", visibility.length > 50 ? visibility.slice(0, 50) + "\u2026" : visibility, " "), obscuring && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px" } }, /* @__PURE__ */ React.createElement("strong", null, "miss:"), " ", obscuring.length > 50 ? obscuring.slice(0, 50) + "\u2026" : obscuring)), epi && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "2px", fontSize: "10px", color: "#9d174d" } }, /* @__PURE__ */ React.createElement("strong", null, "epistemic:"), " ", epi)), editable && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setEditing(true);
          },
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: "transparent",
            color: "#9d174d",
            border: "1px solid #f9a8d4",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        t("humanities.edit_positionality") || "Edit"
      ), props.onReturnToReckoning && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: props.onReturnToReckoning,
          "aria-label": t("humanities.return_to_reckoning_aria") || "Re-version standpoint at Positionality Reckoning",
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: "#be185d",
            color: "#fff",
            border: "none",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u21A9\uFE0F "),
        t("humanities.return_to_reckoning") || "Re-version"
      ));
    }
    if (!editable) return null;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "14px",
      borderRadius: "14px",
      background: "#fdf2f8",
      border: "1px solid #f9a8d4",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#9d174d" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F9ED} "), t("humanities.positionality_edit_title") || "Your standpoint \u2014 material relationship to the question"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#831843", lineHeight: 1.5 } }, t("humanities.positionality_edit_help") || "Name your MATERIAL relationship to this question, not a generic identity. \u2265" + floors.positionality + ' chars or 5s+ voice. Generic-identity statements ("as a student", "an observer") are refused.'), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft,
        rows: 4,
        maxLength: 1500,
        onChange: function(e) {
          setDraft(e.target.value);
        },
        placeholder: t("humanities.positionality_edit_ph") || "I am [specific relationship to this question]. This question matters to me because [material stake].",
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid " + (draftDenied ? "#dc2626" : "#f9a8d4"),
          fontSize: "12px",
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: "70px"
        }
      }
    ), draftDenied && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#dc2626" } }, t("humanities.positionality_denied") || "This reads as boilerplate identity. Name your material relationship to this question, not a generic category."), VoiceNoteBlock && (devLevel === "k2" || devLevel === "3_5") && /* @__PURE__ */ React.createElement(
      VoiceNoteBlock,
      {
        t,
        initialBase64: voice.audioBase64,
        initialDuration: voice.durationS,
        label: t("humanities.positionality_voice_label") || "Positionality voice note (K-2/3-5)",
        onChange: function(v) {
          setVoice(v);
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px" } }, pos.text && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setEditing(false);
          setDraft(pos.text);
        },
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !draftLenOk || draftDenied,
        onClick: save,
        style: {
          padding: "6px 14px",
          borderRadius: "999px",
          background: !draftLenOk || draftDenied ? "#cbd5e1" : "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: !draftLenOk || draftDenied ? "not-allowed" : "pointer"
        }
      },
      t("humanities.save_positionality") || "Save standpoint"
    )));
  }
  function HumanitiesSourceContextPanel(props) {
    var source = props.source || {};
    var onUpdate = props.onUpdate;
    var context = source.humanitiesContext || {};
    var updateContext = function(field, value) {
      var nextContext = Object.assign({}, context);
      nextContext[field] = value;
      nextContext.updatedAt = Date.now();
      onUpdate(Object.assign({}, source, { humanitiesContext: nextContext }));
    };
    var inputStyle = { width: "100%", boxSizing: "border-box", marginTop: "3px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", fontFamily: "inherit" };
    var labelStyle = { display: "block", fontSize: "10px", fontWeight: 800, color: "#475569" };
    return /* @__PURE__ */ React.createElement("details", { "data-humanities-source-context": "true", style: { borderBottom: "1px solid #f3e8ff", background: "#faf5ff" } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", padding: "9px 10px", fontSize: "11px", fontWeight: 800, color: "#6b21a8" } }, "Source context, transmission, and cultural authority"), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 10px 11px", display: "grid", gap: "9px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "8px" } }, /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "What kind of relationship does this source have to the subject?", /* @__PURE__ */ React.createElement("select", { value: context.relationshipType || "", onChange: function(e) {
      updateContext("relationshipType", e.target.value);
    }, style: inputStyle }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose one"), /* @__PURE__ */ React.createElement("option", { value: "primary_record" }, "Primary record / contemporaneous artifact"), /* @__PURE__ */ React.createElement("option", { value: "scholarship" }, "Scholarship / later analysis"), /* @__PURE__ */ React.createElement("option", { value: "testimony" }, "Testimony / lived account"), /* @__PURE__ */ React.createElement("option", { value: "creative_artifact" }, "Creative or cultural artifact"), /* @__PURE__ */ React.createElement("option", { value: "journalism" }, "Journalism / public reporting"), /* @__PURE__ */ React.createElement("option", { value: "other" }, "Other relationship"))), /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "How does it relate to your current position?", /* @__PURE__ */ React.createElement("select", { value: context.inquiryRelationship || "", onChange: function(e) {
      updateContext("inquiryRelationship", e.target.value);
    }, style: inputStyle }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose one"), /* @__PURE__ */ React.createElement("option", { value: "supports" }, "Supports"), /* @__PURE__ */ React.createElement("option", { value: "complicates" }, "Complicates"), /* @__PURE__ */ React.createElement("option", { value: "challenges" }, "Challenges"), /* @__PURE__ */ React.createElement("option", { value: "background" }, "Provides background")))), /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "Edition, translation, transcription, or chain of transmission", /* @__PURE__ */ React.createElement("textarea", { value: context.editionTranslation || "", rows: 2, maxLength: 900, onChange: function(e) {
      updateContext("editionTranslation", e.target.value);
    }, placeholder: "Which edition or translation? Who transcribed, edited, selected, digitized, or translated it? What changed along the way?", style: inputStyle })), /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "Historical and material context", /* @__PURE__ */ React.createElement("textarea", { value: context.historicalContext || "", rows: 2, maxLength: 900, onChange: function(e) {
      updateContext("historicalContext", e.target.value);
    }, placeholder: "When, where, for whom, and under what institutions or material conditions was this made?", style: inputStyle })), /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "Creator, community authority, and permission to interpret", /* @__PURE__ */ React.createElement("textarea", { value: context.culturalAuthority || "", rows: 2, maxLength: 900, onChange: function(e) {
      updateContext("culturalAuthority", e.target.value);
    }, placeholder: "Who has cultural or community authority here? Are there protocols, restrictions, sacred knowledge, or permissions that shape responsible use?", style: inputStyle })), /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "Contested, translated, or historically shifting terms", /* @__PURE__ */ React.createElement("textarea", { value: context.contestedTerms || "", rows: 2, maxLength: 700, onChange: function(e) {
      updateContext("contestedTerms", e.target.value);
    }, placeholder: "Which terms changed meaning, resist translation, or carry contested labels? State whose terminology you are using.", style: inputStyle })), /* @__PURE__ */ React.createElement("label", { style: labelStyle }, "Archival silences, missing records, and preservation bias", /* @__PURE__ */ React.createElement("textarea", { value: context.archivalSilences || "", rows: 2, maxLength: 900, onChange: function(e) {
      updateContext("archivalSilences", e.target.value);
    }, placeholder: "What was not recorded, not preserved, inaccessible, destroyed, paywalled, untranslated, or made unsafe to disclose?", style: inputStyle })), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#6b7280", lineHeight: 1.45 } }, "These fields contextualize interpretation; they do not turn testimony, scholarship, or cultural artifacts into interchangeable forms of evidence.")));
  }
  function SIFTGateRow(props) {
    var t = props.t || function(k) {
      return k;
    };
    var source = props.source;
    var onUpdate = props.onUpdate;
    var allSources = props.allSources || [];
    var devLevel = props.devLevel || "6_8";
    var _open = useState(props.startOpen ? "stop" : null);
    var openGate = _open[0];
    var setOpenGate = _open[1];
    var sift = source.sift || {};
    var srcHost = hostnameFromRef(source.citation || "");
    var isHistoricalScholarly = (devLevel === "ap" || devLevel === "9_12") && source.kind === "scholarly_article";
    var updateSift = function(path, value) {
      var next = JSON.parse(JSON.stringify(sift));
      var keys = path.split(".");
      var ref = next;
      for (var i = 0; i < keys.length - 1; i++) {
        if (!ref[keys[i]]) ref[keys[i]] = {};
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      onUpdate(Object.assign({}, source, { sift: next }));
    };
    var promoteTier = function(tier) {
      var oldTier = sift.tier || "unvetted";
      var hist = (sift.tierHistory || []).concat([{ fromTier: oldTier, toTier: tier, ts: Date.now() }]);
      onUpdate(Object.assign({}, source, { sift: Object.assign({}, sift, { tier, tierHistory: hist, tierAssignedAt: Date.now() }) }));
    };
    var stop = sift.stop || {};
    var inv = sift.investigate || {};
    var find = sift.find || {};
    var trace = sift.trace || {};
    var prov = source.provenance || {};
    var indRef = (inv.independentSourceRef || "").trim();
    var indHost = hostnameFromRef(indRef);
    var indSameHost = srcHost && indHost && srcHost === indHost;
    var stopOk = (stop.firstReactionText || "").trim().length >= 40;
    var invOk = !!indRef && !indSameHost && (inv.lateralEvidence || "").trim().length >= 40 && !inDenylist(inv.lateralEvidence || "", LATERAL_BOILERPLATE_DENYLIST) && Array.isArray(inv.whoMadeItFacts) && inv.whoMadeItFacts.filter(function(f) {
      if (!f || !f.text) return false;
      return /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/.test(f.text) && /\b(18|19|20|21)\d{2}\b/.test(f.text);
    }).length >= 2;
    var findOk = Array.isArray(find.independentCoverageSourceIds) && find.independentCoverageSourceIds.length >= 1 && find.independentCoverageSourceIds.every(function(sid) {
      var s = allSources.filter(function(ss) {
        return ss.id === sid;
      })[0];
      if (!s) return false;
      var sh = hostnameFromRef(s.citation || "");
      return sh && sh !== srcHost && s.sift && s.sift.stop && s.sift.stop.firstReactionText;
    });
    var traceOk = (trace.originalContextCitation || trace.isOriginal) && (trace.contextualizationNote || "").trim().length >= 30;
    var scholar = source.scholarMeta || {};
    var counterIdValid = scholar.counterCitationSourceId && allSources.some(function(s) {
      return s.id === scholar.counterCitationSourceId;
    });
    var histOk = !isHistoricalScholarly || !!scholar.scholarEpistemicStatus && counterIdValid && (scholar.scholarContestationNote || "").trim().length >= 60;
    var allGatesOk = stopOk && invOk && findOk && traceOk && histOk;
    var gateRow = function(key, label, ok, content) {
      var isOpen = openGate === key;
      return /* @__PURE__ */ React.createElement("div", { key, style: { borderBottom: "1px solid #f3e8ff" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            setOpenGate(isOpen ? null : key);
          },
          style: {
            width: "100%",
            padding: "8px 10px",
            textAlign: "left",
            background: ok ? "#f0fdf4" : "#fdf2f8",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
            fontWeight: 700,
            color: "#1e293b"
          }
        },
        /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { marginRight: "6px" } }, ok ? "\u2713" : "\u25CB"), label),
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, isOpen ? "\u25B2" : "\u25BC")
      ), isOpen && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px", background: "#fff" } }, content));
    };
    return /* @__PURE__ */ React.createElement("div", { style: {
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid " + (allGatesOk ? "#86efac" : "#f9a8d4")
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: "8px 10px",
      background: "#fdf2f8",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "12px", color: "#9d174d" } }, source.citation || "(no citation)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#831843", marginTop: "2px" } }, "tier: ", /* @__PURE__ */ React.createElement("strong", null, sift.tier || "unvetted"), prov.publishingOrg && /* @__PURE__ */ React.createElement("span", null, " \xB7 publisher: ", prov.publishingOrg), srcHost && /* @__PURE__ */ React.createElement("span", null, " \xB7 host: ", srcHost))), allGatesOk && /* @__PURE__ */ React.createElement(
      "select",
      {
        value: sift.tier || "unvetted",
        onChange: function(e) {
          promoteTier(e.target.value);
        },
        style: {
          padding: "4px 8px",
          borderRadius: "6px",
          border: "1px solid #f9a8d4",
          fontSize: "11px"
        }
      },
      SIFT_TIERS.map(function(tn) {
        return /* @__PURE__ */ React.createElement("option", { key: tn, value: tn }, tn);
      })
    ), props.onRemove && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: props.onRemove,
        "aria-label": t("humanities.aria_remove_source") || "Remove source",
        style: {
          background: "transparent",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          fontSize: "14px"
        }
      },
      "\u2715"
    )), /* @__PURE__ */ React.createElement(HumanitiesSourceContextPanel, { source, onUpdate }), gateRow("stop", t("humanities.sift_stop_title") || "Stop \u2014 first reaction", stopOk, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 4px", fontSize: "10px", color: "#64748b" } }, "What is your first reaction to this source, before reading further? (\u226540 chars)"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: stop.firstReactionText || "",
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          updateSift("stop.firstReactionText", e.target.value);
          updateSift("stop.ts", Date.now());
        },
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    ))), gateRow("investigate", t("humanities.sift_investigate_title") || "Investigate \u2014 leave the source", invOk, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 4px", fontSize: "10px", color: "#64748b" } }, "Open a separate tab. Search for this source / publisher / claim. Provide:"), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block" } }, "Independent reference URL or publication (different host) *", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: inv.independentSourceRef || "",
        maxLength: 300,
        onChange: function(e) {
          updateSift("investigate.independentSourceRef", e.target.value);
        },
        placeholder: t("humanities.source_url_ph") || "e.g. https://americanlibrariesmagazine.org/...",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid " + (indSameHost ? "#dc2626" : "#cbd5e1"),
          fontSize: "11px"
        }
      }
    ), indSameHost && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#dc2626" } }, "Same host as target source \u2014 lateral reading means LEAVING this site.")), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "What independent coverage actually said about this source (\u226540 chars) *", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: inv.lateralEvidence || "",
        rows: 2,
        maxLength: 600,
        onChange: function(e) {
          updateSift("investigate.lateralEvidence", e.target.value);
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block" } }, "Who made this source? \u2014 facts (\u22652 entries, each needs a proper noun AND a year) *"), (Array.isArray(inv.whoMadeItFacts) ? inv.whoMadeItFacts : []).map(function(f, i) {
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { marginTop: "4px", display: "flex", gap: "4px" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: f.text || "",
          maxLength: 240,
          onChange: function(e) {
            var arr = (inv.whoMadeItFacts || []).slice();
            arr[i] = Object.assign({}, arr[i], { text: e.target.value, ts: Date.now() });
            updateSift("investigate.whoMadeItFacts", arr);
          },
          placeholder: t("humanities.who_made_it_ph") || "e.g. Founded 1995 by Ms. Jane Doe (LinkedIn verified)",
          style: {
            flex: 1,
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "11px"
          }
        }
      ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
        var arr = (inv.whoMadeItFacts || []).filter(function(_, j) {
          return j !== i;
        });
        updateSift("investigate.whoMadeItFacts", arr);
      }, style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" } }, "\u2715"));
    }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: function() {
      var arr = (inv.whoMadeItFacts || []).concat([{ text: "", ts: Date.now() }]);
      updateSift("investigate.whoMadeItFacts", arr);
    }, style: {
      marginTop: "4px",
      padding: "3px 8px",
      borderRadius: "999px",
      background: "#be185d",
      color: "#fff",
      border: "none",
      fontSize: "10px",
      fontWeight: 700,
      cursor: "pointer"
    } }, "+ add who-made-it fact")), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "Why was it made? (hypothesis)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: inv.whyTheyMadeItHypothesis || "",
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          updateSift("investigate.whyTheyMadeItHypothesis", e.target.value);
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "Who made this \u2014 type", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: prov.whoMadeItEnum || "",
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { provenance: Object.assign({}, prov, { whoMadeItEnum: e.target.value }) }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
      /* @__PURE__ */ React.createElement("option", { value: "researcher_academic" }, "researcher / academic"),
      /* @__PURE__ */ React.createElement("option", { value: "journalist_news" }, "journalist / news"),
      /* @__PURE__ */ React.createElement("option", { value: "government_agency" }, "government agency"),
      /* @__PURE__ */ React.createElement("option", { value: "activist_org" }, "activist organization"),
      /* @__PURE__ */ React.createElement("option", { value: "eyewitness_participant" }, "eyewitness / participant"),
      /* @__PURE__ */ React.createElement("option", { value: "anonymous" }, "anonymous"),
      /* @__PURE__ */ React.createElement("option", { value: "AI_generated" }, "AI-generated")
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "Publishing organization", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: prov.publishingOrg || "",
        maxLength: 120,
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { provenance: Object.assign({}, prov, { publishingOrg: e.target.value }) }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      }
    )))), gateRow("find", t("humanities.sift_find_title") || "Find \u2014 independent coverage", findOk, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 4px", fontSize: "10px", color: "#64748b" } }, "Link to other sources in your list that cover the same topic from a different host (\u22651 required)."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px" } }, allSources.filter(function(s) {
      return s.id !== source.id;
    }).map(function(s) {
      var on = (find.independentCoverageSourceIds || []).indexOf(s.id) !== -1;
      var sh = hostnameFromRef(s.citation || "");
      var hostOk = sh && sh !== srcHost;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: s.id,
          type: "button",
          disabled: !hostOk,
          onClick: function() {
            var arr = (find.independentCoverageSourceIds || []).slice();
            var idx = arr.indexOf(s.id);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(s.id);
            updateSift("find.independentCoverageSourceIds", arr);
          },
          "aria-pressed": on,
          title: hostOk ? "" : "Same host as target \u2014 cannot be independent coverage",
          style: {
            padding: "3px 8px",
            borderRadius: "999px",
            background: on ? "#be185d" : "#fff",
            color: on ? "#fff" : hostOk ? "#be185d" : "#94a3b8",
            border: "1px solid " + (hostOk ? "#be185d" : "#cbd5e1"),
            fontSize: "10px",
            fontWeight: 700,
            cursor: hostOk ? "pointer" : "not-allowed"
          }
        },
        (s.citation || s.id).slice(0, 30)
      );
    })), allSources.length <= 1 && /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: "10px", color: "#a16207", fontStyle: "italic" } }, "Add at least one more source (with a different host) to enable independent-coverage linking."))), gateRow("trace", t("humanities.sift_trace_title") || "Trace \u2014 to the original", traceOk, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "flex", gap: "6px", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: !!trace.isOriginal,
        onChange: function(e) {
          updateSift("trace.isOriginal", e.target.checked);
        }
      }
    ), "This source IS the original (primary document)"), !trace.isOriginal && /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "Original-context citation (where does this trace back to?)", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: trace.originalContextCitation || "",
        maxLength: 300,
        onChange: function(e) {
          updateSift("trace.originalContextCitation", e.target.value);
        },
        placeholder: t("humanities.counter_citation_ph") || "e.g. ALA Bill of Rights 1965, Article III",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "Contextualization note \u2014 what did you learn by tracing? (\u226530 chars, with a year)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: trace.contextualizationNote || "",
        rows: 2,
        maxLength: 600,
        onChange: function(e) {
          updateSift("trace.contextualizationNote", e.target.value);
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )))), isHistoricalScholarly && gateRow("historiographical", t("humanities.sift_historiographical_title") || "Historiographical \u2014 scholar contestation (AP/9-12 only)", histOk, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "10px", color: "#475569", lineHeight: 1.5 } }, "Scholarly articles are not inherently more reliable \u2014 they sit within ongoing scholarly debates. At AP / 9-12, citing a scholarly source requires showing you know where the scholar sits in that debate. (This unlocks richer scholar citation while preserving the V1 rule that AI never names scholars.)"), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block" } }, "Where does this scholar sit? *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: scholar.scholarEpistemicStatus || "",
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { scholarMeta: Object.assign({}, scholar, { scholarEpistemicStatus: e.target.value }) }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
      /* @__PURE__ */ React.createElement("option", { value: "established_consensus" }, "established consensus (most of the field agrees)"),
      /* @__PURE__ */ React.createElement("option", { value: "contested" }, "contested (the field is openly debating this)"),
      /* @__PURE__ */ React.createElement("option", { value: "contesting_consensus" }, "contesting consensus (this scholar challenges the mainstream)"),
      /* @__PURE__ */ React.createElement("option", { value: "fringe" }, "fringe (most of the field rejects this)"),
      /* @__PURE__ */ React.createElement("option", { value: "contemporary_debate" }, "contemporary debate (no settled position yet)")
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "Counter-citation: another source in your list that contests or complicates this scholar *", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: scholar.counterCitationSourceId || "",
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { scholarMeta: Object.assign({}, scholar, { counterCitationSourceId: e.target.value }) }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
      allSources.filter(function(s) {
        return s.id !== source.id;
      }).map(function(s) {
        return /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, (s.citation || s.id).slice(0, 60));
      })
    ), scholar.counterCitationSourceId && !counterIdValid && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#dc2626" } }, "Counter-citation source not found \u2014 re-pick from the dropdown.")), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569", display: "block", marginTop: "6px" } }, "How is this scholar contested? (\u226560 chars; name what the counter-citation argues) *", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: scholar.scholarContestationNote || "",
        rows: 3,
        maxLength: 1e3,
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { scholarMeta: Object.assign({}, scholar, { scholarContestationNote: e.target.value }) }));
        },
        placeholder: t("humanities.scholar_contestation_ph") || "e.g. Wineburg argues lateral reading is essential; Caulfield extends with SIFT but adds 'find better coverage' as a discrete move Wineburg did not name. The debate concerns whether 'investigate the source' is sufficient or whether trace-to-original is required.",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid " + (scholar.scholarContestationNote && scholar.scholarContestationNote.length < 60 ? "#dc2626" : "#cbd5e1"),
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )))), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "6px 10px",
      borderTop: "1px solid #f3e8ff",
      background: "#fff",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, "Who made this and why (\u226560c)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: source.who_made_this_and_why || "",
        rows: 2,
        maxLength: 600,
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { who_made_this_and_why: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, "What world produced this (\u226540c)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: source.what_world_produced_this || "",
        rows: 2,
        maxLength: 600,
        onChange: function(e) {
          onUpdate(Object.assign({}, source, { what_world_produced_this: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    ))));
  }
  function AbsentVoicesLedger(props) {
    var t = props.t || function(k) {
      return k;
    };
    var voices = props.voices || [];
    var onAdd = props.onAdd;
    var onRemove = props.onRemove;
    var sourceCount = props.sourceCount || 0;
    var floor = Math.max(1, Math.floor(sourceCount / 2));
    var _adding = useState(false);
    var adding = _adding[0];
    var setAdding = _adding[1];
    var _draft = useState({ whoseVoiceText: "", whyAbsentChip: "", whatTheyMightSeeText: "" });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var distinctTokens = draft.whoseVoiceText ? contentTokens(draft.whoseVoiceText) : [];
    var voiceOk = draft.whoseVoiceText.trim().length >= 25 && distinctTokens.length >= 4;
    var canAdd = voiceOk && draft.whyAbsentChip;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#fff",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4AC} "), t("humanities.absent_voices_title") || "Absent voices", " (", voices.length, "/", floor, "+)"), voices.length < floor && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#b91c1c", fontWeight: 700 } }, t("humanities.absent_voices_need_more") || "Add an absent voice \u2014 proportional-growth gate")), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, t("humanities.absent_voices_help") || "Whose voice is structurally absent from your sources \u2014 not by accident, but by archival silencing, language barrier, paywall, or surveillance risk?"), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" } }, voices.map(function(v) {
      return /* @__PURE__ */ React.createElement("li", { key: v.id, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#fdf2f8",
        border: "1px solid #fbcfe8",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px"
      } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4AC}"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, fontSize: "11px", color: "#1e293b", lineHeight: 1.5 } }, /* @__PURE__ */ React.createElement("strong", null, v.whoseVoiceText), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#9d174d", marginTop: "2px" } }, "why absent: ", /* @__PURE__ */ React.createElement("em", null, v.whyAbsentChip)), v.whatTheyMightSeeText && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#475569", marginTop: "2px" } }, v.whatTheyMightSeeText)), onRemove && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            onRemove(v.id);
          },
          "aria-label": t("humanities.aria_remove_absent") || "Remove absent voice",
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })), adding ? /* @__PURE__ */ React.createElement("div", { style: {
      padding: "8px",
      borderRadius: "8px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#9d174d" } }, "Whose voice is structurally absent? (\u226525 chars, \u22654 distinct content words)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.whoseVoiceText,
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whoseVoiceText: e.target.value }));
        },
        placeholder: t("humanities.absent_voices_ph") || "e.g. Yearbook subjects from 1962-1989 who never consented to being archived",
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#9d174d" } }, "Why are they absent? (closed enum)", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.whyAbsentChip,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whyAbsentChip: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
      ABSENT_VOICE_CHIPS.map(function(c) {
        return /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c.replace(/_/g, " "));
      })
    )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#9d174d" } }, "What might they see that your sources do not? (optional)", /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.whatTheyMightSeeText || "",
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whatTheyMightSeeText: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "4px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(false);
        },
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "transparent",
          color: "#475569",
          border: "1px solid #cbd5e1",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canAdd,
        onClick: function() {
          if (!canAdd) return;
          onAdd(Object.assign({}, draft, {
            id: "av" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
            ts: Date.now()
          }));
          setDraft({ whoseVoiceText: "", whyAbsentChip: "", whatTheyMightSeeText: "" });
          setAdding(false);
        },
        style: {
          padding: "4px 12px",
          borderRadius: "999px",
          background: canAdd ? "#be185d" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "10px",
          cursor: canAdd ? "pointer" : "not-allowed"
        }
      },
      "Add"
    ))) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(true);
        },
        style: {
          alignSelf: "flex-start",
          padding: "4px 12px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("humanities.add_absent_voice") || "Add absent voice"
    ));
  }
  function MethodReadinessPanel(props) {
    var journal = props.journal, setJournal = props.setJournal;
    var packId = journal.activeMethodPack;
    if (packId !== "community_qualitative" && packId !== "creative_cultural") return null;
    var frame = (journal.stageNotes || {}).frame_question || {};
    var key = packId === "community_qualitative" ? "qualitativeMethod" : "creativeMethod";
    var method = frame[key] || {};
    var update = function(patch) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var priorFrame = Object.assign({}, next.stageNotes.frame_question || {});
        priorFrame[key] = Object.assign({}, priorFrame[key] || {}, patch, { updatedAt: Date.now() });
        next.stageNotes.frame_question = priorFrame;
        return next;
      });
    };
    if (packId === "community_qualitative") {
      return /* @__PURE__ */ React.createElement("section", { "data-qualitative-method-readiness": "true", "aria-labelledby": "qualitative-method-title", style: { padding: "13px", borderRadius: "13px", border: "1px solid #f9a8d4", background: "#fdf2f8" } }, /* @__PURE__ */ React.createElement("h4", { id: "qualitative-method-title", style: { margin: 0, fontSize: "13px", color: "#9d174d" } }, "Qualitative method readiness"), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 9px", fontSize: "10px", lineHeight: 1.5, color: "#475569" } }, "Plan how accounts are selected, protected, interpreted, coded, and challenged by meaningful exceptions. This workspace does not collect interviews."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "9px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Approved evidence boundary", /* @__PURE__ */ React.createElement("select", { value: method.evidenceBoundary || "", onChange: function(e) {
        update({ evidenceBoundary: e.target.value });
      }, style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose one"), /* @__PURE__ */ React.createElement("option", { value: "public_accounts" }, "Public accounts"), /* @__PURE__ */ React.createElement("option", { value: "teacher_approved" }, "Teacher-approved collection"), /* @__PURE__ */ React.createElement("option", { value: "consented_project" }, "Separately consented project"))), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Why these accounts, and what can they not represent?", /* @__PURE__ */ React.createElement("textarea", { value: method.selectionRationale || "", onChange: function(e) {
        update({ selectionRationale: e.target.value.slice(0, 1600) });
      }, rows: 3, maxLength: 1600, style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } })), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Coding and memo plan", /* @__PURE__ */ React.createElement("textarea", { value: method.codingPlan || "", onChange: function(e) {
        update({ codingPlan: e.target.value.slice(0, 1600) });
      }, rows: 3, maxLength: 1600, placeholder: "How will you label patterns while preserving context?", style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } })), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Negative or discrepant case plan", /* @__PURE__ */ React.createElement("textarea", { value: method.discrepantCasePlan || "", onChange: function(e) {
        update({ discrepantCasePlan: e.target.value.slice(0, 1600) });
      }, rows: 3, maxLength: 1600, placeholder: "What would challenge the pattern you expect to see?", style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } }))), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "9px", fontSize: "10px", color: "#831843" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: method.safeguardingAcknowledged === true, onChange: function(e) {
        update({ safeguardingAcknowledged: e.target.checked });
      } }), "I will use only the approved evidence boundary above and will not upload identifiable interviews, recordings, or images without a separate consent and safeguarding plan."));
    }
    return /* @__PURE__ */ React.createElement("section", { "data-creative-method-readiness": "true", "aria-labelledby": "creative-method-title", style: { padding: "13px", borderRadius: "13px", border: "1px solid #fdba74", background: "#fff7ed" } }, /* @__PURE__ */ React.createElement("h4", { id: "creative-method-title", style: { margin: 0, fontSize: "13px", color: "#9a3412" } }, "Creative and cultural process plan"), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 9px", fontSize: "10px", lineHeight: 1.5, color: "#475569" } }, "Choose whether you are analyzing an artifact or documenting a creative-practice inquiry. Either path requires evidence, attribution, critique, and revision."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "9px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Inquiry mode", /* @__PURE__ */ React.createElement("select", { value: method.inquiryMode || "", onChange: function(e) {
      update({ inquiryMode: e.target.value });
    }, style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Choose one"), /* @__PURE__ */ React.createElement("option", { value: "artifact_analysis" }, "Cultural artifact analysis"), /* @__PURE__ */ React.createElement("option", { value: "creative_practice" }, "Creative-practice inquiry"))), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Medium, context, and process question", /* @__PURE__ */ React.createElement("textarea", { value: method.processQuestion || "", onChange: function(e) {
      update({ processQuestion: e.target.value.slice(0, 1600) });
    }, rows: 3, maxLength: 1600, style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } })), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Attribution and cultural-position plan", /* @__PURE__ */ React.createElement("textarea", { value: method.attributionPlan || "", onChange: function(e) {
      update({ attributionPlan: e.target.value.slice(0, 1600) });
    }, rows: 3, maxLength: 1600, placeholder: "Whose work, tradition, or community must be credited and contextualized?", style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } })), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 800 } }, "Critique and revision plan", /* @__PURE__ */ React.createElement("textarea", { value: method.critiquePlan || "", onChange: function(e) {
      update({ critiquePlan: e.target.value.slice(0, 1600) });
    }, rows: 3, maxLength: 1600, placeholder: "Who will respond, what will be documented, and how might the work change?", style: { display: "block", width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "1px solid #94a3b8" } }))));
  }
  function FrameQuestionStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var stageNote = (journal.stageNotes || {}).frame_question || {};
    var _qt = useState(journal.questionTitle || "");
    var qt = _qt[0];
    var setQt = _qt[1];
    var _rat = useState(stageNote.contestabilityRationale || "");
    var rat = _rat[0];
    var setRat = _rat[1];
    var _addingSh = useState(false);
    var addingSh = _addingSh[0];
    var setAddingSh = _addingSh[1];
    var _addingAns = useState(false);
    var addingAns = _addingAns[0];
    var setAddingAns = _addingAns[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var methodGuide = humanitiesMethodGuide(journal.activeMethodPack);
    useEffect(function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.questionTitle = (qt || "").slice(0, 240);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        next.stageNotes.frame_question = Object.assign({}, next.stageNotes.frame_question || {}, {
          contestabilityRationale: rat,
          ts: Date.now()
        });
        return next;
      });
    }, [qt, rat]);
    var stakeholders = journal.questionStakeholders || [];
    var plausibles = journal.humanitiesPlausibleAnswers || [];
    var sa = journal.stakesAudience;
    var addStakeholder = function(s) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.questionStakeholders = (prev.questionStakeholders || []).concat([Object.assign({}, s, {
          id: "qs" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now()
        })]);
        return next;
      });
      setAddingSh(false);
    };
    var removeStakeholder = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.questionStakeholders = (prev.questionStakeholders || []).filter(function(x) {
          return x.id !== id;
        });
        return next;
      });
    };
    var addPlausibleAnswer = function(text) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.humanitiesPlausibleAnswers = (prev.humanitiesPlausibleAnswers || []).concat([{
          id: "pa" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          text: text.trim(),
          isWorkingPosition: false
        }]);
        return next;
      });
      setAddingAns(false);
    };
    var removePlausibleAnswer = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.humanitiesPlausibleAnswers = (prev.humanitiesPlausibleAnswers || []).filter(function(x) {
          return x.id !== id;
        });
        return next;
      });
    };
    var setWorkingPosition = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.humanitiesPlausibleAnswers = (prev.humanitiesPlausibleAnswers || []).map(function(x) {
          return Object.assign({}, x, { isWorkingPosition: x.id === id });
        });
        return next;
      });
    };
    var setStakesAudience = function(chipId) {
      var opt = STAKES_AUDIENCE_OPTIONS.filter(function(o) {
        return o.id === chipId;
      })[0];
      if (!opt) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stakesAudience = { chip: opt.id, label: opt.label, ts: Date.now() };
        return next;
      });
    };
    var askContestability = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.contestability_probe, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      "section",
      {
        "data-humanities-method-guide": journal.activeMethodPack || "humanistic_interpretation",
        "aria-labelledby": "humanities-method-guide-title",
        style: {
          padding: "14px",
          borderRadius: "14px",
          border: "1px solid #f9a8d4",
          background: "linear-gradient(135deg,#fff1f2,#ffffff 55%,#f5f3ff)"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.6px", color: "#be185d" } }, "Current inquiry approach"), /* @__PURE__ */ React.createElement("h3", { id: "humanities-method-guide-title", style: { margin: "2px 0 0", fontSize: "15px", fontWeight: 900, color: "#881337" } }, methodGuide.label)), /* @__PURE__ */ React.createElement("span", { style: { borderRadius: "999px", padding: "4px 9px", background: "#fff", border: "1px solid #fbcfe8", color: "#9d174d", fontSize: "9px", fontWeight: 900 } }, "Shared humanities rigor cycle")),
      /* @__PURE__ */ React.createElement("p", { style: { margin: "7px 0 0", fontSize: "11px", lineHeight: 1.55, color: "#475569" } }, methodGuide.purpose),
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { borderRadius: "11px", padding: "10px", background: "rgba(255,255,255,0.84)", border: "1px solid #ffe4e6" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 900, color: "#9f1239" } }, "Question starters"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "6px 0 0", paddingLeft: "18px", fontSize: "10px", lineHeight: 1.5, color: "#475569" } }, methodGuide.questionStems.map(function(stem) {
        return /* @__PURE__ */ React.createElement("li", { key: stem }, stem);
      }))), /* @__PURE__ */ React.createElement("div", { style: { borderRadius: "11px", padding: "10px", background: "rgba(255,255,255,0.84)", border: "1px solid #ede9fe" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 900, color: "#6d28d9" } }, "Rigor commitments"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "6px 0 0", paddingLeft: "18px", fontSize: "10px", lineHeight: 1.5, color: "#475569" } }, methodGuide.rigorChecks.map(function(check) {
        return /* @__PURE__ */ React.createElement("li", { key: check }, check);
      })))),
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: "9px", padding: "8px 10px", borderRadius: "10px", background: "#fffbeb", border: "1px solid #fde68a", fontSize: "10px", lineHeight: 1.5, color: "#78350f" } }, /* @__PURE__ */ React.createElement("strong", null, "Ethics and limits:"), " ", methodGuide.ethics)
    ), /* @__PURE__ */ React.createElement(MethodReadinessPanel, { journal, setJournal }), /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "frame_question",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.frame_question
      }
    ), /* @__PURE__ */ React.createElement(
      PositionalityCard,
      {
        t,
        journal,
        setJournal,
        editable: true,
        primitives
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.question_label") || "Your contestable question",
        help: t("humanities.question_help") || "Open a position, not a fact. \u2265" + floors.question + ' chars, ends in "?". Definitional / factoid questions are refused.',
        value: qt,
        onChange: setQt,
        rows: 2,
        max: 240,
        placeholder: t("humanities.question_ph") || "e.g. Should our library digitize the 1962-1989 yearbooks given alumni redaction requests?"
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.contestability_label") || "Contestability rationale",
        help: t("humanities.contestability_help") || "What makes this contestable, and for whom? Name a stakeholder and a contested term. \u2265" + floors.rationale + " chars.",
        value: rat,
        onChange: setRat,
        rows: 4,
        max: 1500
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.stakeholders_title") || "Question stakeholders", " (", stakeholders.length, "/2+)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, "Whose interests does this question foreground? At least 2 distinct stakeholders."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" } }, stakeholders.map(function(s) {
      return /* @__PURE__ */ React.createElement("li", { key: s.id, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#f8fafc",
        fontSize: "11px",
        color: "#1e293b",
        display: "flex",
        gap: "8px"
      } }, /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("strong", null, s.whoseQuestionIsThis), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#64748b" } }, "cares because: ", s.whyTheyCareText), (s.whatThisFramingForegrounds || s.whatThisFramingObscures) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#9d174d", marginTop: "2px" } }, s.whatThisFramingForegrounds && /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("em", null, "foregrounds:"), " ", s.whatThisFramingForegrounds, " "), s.whatThisFramingObscures && /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("em", null, "obscures:"), " ", s.whatThisFramingObscures))), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeStakeholder(s.id);
          },
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })), addingSh ? /* @__PURE__ */ React.createElement(StakeholderEditor, { t, onSave: addStakeholder, onCancel: function() {
      setAddingSh(false);
    } }) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAddingSh(true);
        },
        style: {
          marginTop: "8px",
          padding: "5px 12px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("humanities.add_stakeholder") || "Add stakeholder"
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.plausibles_title") || "Plausible answers", " (", plausibles.length, "/", floors.plausibleAnswers, "+)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, "Competing positions a reasonable person could hold. Mark one as your working position (provisional)."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" } }, plausibles.map(function(p) {
      return /* @__PURE__ */ React.createElement("li", { key: p.id, style: {
        padding: "6px 10px",
        borderRadius: "8px",
        background: p.isWorkingPosition ? "#fce7f3" : "#f8fafc",
        border: "1px solid " + (p.isWorkingPosition ? "#f9a8d4" : "#e2e8f0"),
        fontSize: "11px",
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "radio",
          name: "working-position",
          checked: p.isWorkingPosition,
          onChange: function() {
            setWorkingPosition(p.id);
          }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, p.text), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removePlausibleAnswer(p.id);
          },
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      ));
    })), addingAns ? /* @__PURE__ */ React.createElement(PlausibleAnswerEditor, { t, onSave: addPlausibleAnswer, onCancel: function() {
      setAddingAns(false);
    } }) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAddingAns(true);
        },
        style: {
          marginTop: "8px",
          padding: "5px 12px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("humanities.add_plausible") || "Add plausible answer"
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.stakes_audience_title") || "Stakes audience \u2014 who is your position accountable to?"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } }, STAKES_AUDIENCE_OPTIONS.map(function(opt) {
      var selected = sa && sa.chip === opt.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: opt.id,
          type: "button",
          onClick: function() {
            setStakesAudience(opt.id);
          },
          "aria-pressed": selected,
          style: {
            padding: "6px 12px",
            borderRadius: "999px",
            background: selected ? "#be185d" : "#fff",
            color: selected ? "#fff" : "#be185d",
            border: "1px solid #be185d",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        opt.label
      );
    }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askContestability,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("humanities.probing") || "Probing\u2026" : t("humanities.contestability_button") || "Probe my question for contestability"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives, journal }));
  }
  function StakeholderEditor(props) {
    var t = props.t || function(k) {
      return k;
    };
    var _draft = useState({ whoseQuestionIsThis: "", whyTheyCareText: "", whatThisFramingForegrounds: "", whatThisFramingObscures: "" });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var canSave = draft.whoseQuestionIsThis.trim().length >= 4 && draft.whyTheyCareText.trim().length >= 20;
    return /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "8px",
      padding: "8px",
      borderRadius: "8px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.whoseQuestionIsThis,
        maxLength: 120,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whoseQuestionIsThis: e.target.value }));
        },
        placeholder: t("humanities.stakeholder_question_ph") || "Whose question is this? (e.g. alumni asking for redaction)",
        style: { padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px" }
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.whyTheyCareText,
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whyTheyCareText: e.target.value }));
        },
        placeholder: t("humanities.stakeholder_why_ph") || "Why do they care? (\u226520 chars)",
        style: { padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", fontFamily: "inherit" }
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.whatThisFramingForegrounds,
        maxLength: 200,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whatThisFramingForegrounds: e.target.value }));
        },
        placeholder: t("humanities.stakeholder_foreground_ph") || "What does their framing foreground? (optional)",
        style: { padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px" }
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.whatThisFramingObscures,
        maxLength: 200,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whatThisFramingObscures: e.target.value }));
        },
        placeholder: t("humanities.stakeholder_obscure_ph") || "What does their framing obscure? (optional)",
        style: { padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "4px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: props.onCancel,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "transparent",
          color: "#475569",
          border: "1px solid #cbd5e1",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: function() {
          if (canSave) props.onSave(draft);
        },
        style: {
          padding: "4px 12px",
          borderRadius: "999px",
          background: canSave ? "#be185d" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "10px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      t("common.add") || "Add"
    )));
  }
  function PlausibleAnswerEditor(props) {
    var t = props.t || function(k) {
      return k;
    };
    var _text = useState("");
    var text = _text[0];
    var setText = _text[1];
    var canSave = text.trim().split(/\s+/).filter(Boolean).length >= 6;
    return /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "8px",
      padding: "8px",
      borderRadius: "8px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: text,
        rows: 2,
        maxLength: 600,
        onChange: function(e) {
          setText(e.target.value);
        },
        placeholder: t("humanities.plausible_answer_ph") || "A competing position someone could reasonably hold (\u22656 words)",
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", fontFamily: "inherit" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "4px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: props.onCancel,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "transparent",
          color: "#475569",
          border: "1px solid #cbd5e1",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: function() {
          if (canSave) props.onSave(text);
        },
        style: {
          padding: "4px 12px",
          borderRadius: "999px",
          background: canSave ? "#be185d" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "10px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      t("common.add") || "Add"
    )));
  }
  function SiftTriageStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var sources = journal.sources || [];
    var voices = journal.absentVoices || [];
    var _adding = useState(false);
    var adding = _adding[0];
    var setAdding = _adding[1];
    var _newSrc = useState({ citation: "", notes: "", kind: "web_article" });
    var newSrc = _newSrc[0];
    var setNewSrc = _newSrc[1];
    var _targetId = useState(null);
    var targetId = _targetId[0];
    var setTargetId = _targetId[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var addSource = function() {
      if (!newSrc.citation.trim()) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.sources = (prev.sources || []).concat([{
          id: "src" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now(),
          kind: newSrc.kind,
          citation: newSrc.citation.trim(),
          notes: newSrc.notes.trim(),
          sift: { tier: "unvetted", stop: {}, investigate: { whoMadeItFacts: [] }, find: { independentCoverageSourceIds: [] }, trace: {}, tierHistory: [] },
          provenance: {},
          humanitiesContext: {
            relationshipType: "",
            inquiryRelationship: "",
            editionTranslation: "",
            historicalContext: "",
            culturalAuthority: "",
            contestedTerms: "",
            archivalSilences: ""
          },
          who_made_this_and_why: "",
          what_world_produced_this: ""
        }]);
        return next;
      });
      setNewSrc({ citation: "", notes: "", kind: "web_article" });
      setAdding(false);
    };
    var removeSource = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.sources = (prev.sources || []).filter(function(s) {
          return s.id !== id;
        });
        return next;
      });
    };
    var updateSource = function(id, patch) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.sources = (prev.sources || []).map(function(s) {
          return s.id === id ? patch : s;
        });
        return next;
      });
    };
    var addAbsent = function(v) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.absentVoices = (prev.absentVoices || []).concat([v]);
        return next;
      });
    };
    var removeAbsent = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.absentVoices = (prev.absentVoices || []).filter(function(v) {
          return v.id !== id;
        });
        return next;
      });
    };
    var askLateralProbe = async function(sourceId) {
      setTargetId(sourceId);
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.source_lateral_probe, Object.assign({}, ctx, { targetSourceId: sourceId }));
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    var vettedCount = sources.filter(siftPromoted).length;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "sift_triage",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.sift_triage
      }
    ), /* @__PURE__ */ React.createElement(
      PositionalityCard,
      {
        t,
        journal,
        setJournal,
        editable: false,
        onReturnToReckoning: props.onReturnToReckoning,
        primitives
      }
    ), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F50D} "), "Vetted sources: ", vettedCount, "/", floors.sources, "+"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#831843", fontStyle: "italic" } }, "Sources cannot underwrite claims until externally vetted. Vertical reading is not enough.")), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" } }, sources.map(function(s) {
      return /* @__PURE__ */ React.createElement("li", { key: s.id, style: { display: "flex", flexDirection: "column", gap: "4px" } }, /* @__PURE__ */ React.createElement(
        SIFTGateRow,
        {
          t,
          source: s,
          allSources: sources,
          devLevel: journal.devLevel || "6_8",
          onUpdate: function(patched) {
            updateSource(s.id, patched);
          },
          onRemove: function() {
            removeSource(s.id);
          }
        }
      ), s.sift && s.sift.tier === "unvetted" && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            askLateralProbe(s.id);
          },
          disabled: busy,
          style: {
            alignSelf: "flex-start",
            padding: "5px 12px",
            borderRadius: "999px",
            background: busy ? "#cbd5e1" : "#0d9488",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "11px",
            cursor: busy ? "wait" : "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
        t("humanities.lateral_probe_button") || "Probe this source laterally"
      ));
    })), adding ? /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#fff",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newSrc.citation,
        maxLength: 400,
        onChange: function(e) {
          setNewSrc(Object.assign({}, newSrc, { citation: e.target.value }));
        },
        placeholder: t("humanities.source_citation_ph") || "URL or full citation",
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }
      }
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newSrc.kind,
        onChange: function(e) {
          setNewSrc(Object.assign({}, newSrc, { kind: e.target.value }));
        },
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }
      },
      /* @__PURE__ */ React.createElement("option", { value: "web_article" }, "web article"),
      /* @__PURE__ */ React.createElement("option", { value: "news_print" }, "news / print"),
      /* @__PURE__ */ React.createElement("option", { value: "scholarly_article" }, "scholarly article"),
      /* @__PURE__ */ React.createElement("option", { value: "primary_document" }, "primary document"),
      /* @__PURE__ */ React.createElement("option", { value: "interview" }, "interview"),
      /* @__PURE__ */ React.createElement("option", { value: "archival" }, "archival"),
      /* @__PURE__ */ React.createElement("option", { value: "other" }, "other")
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: newSrc.notes,
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setNewSrc(Object.assign({}, newSrc, { notes: e.target.value }));
        },
        placeholder: t("humanities.source_notes_ph") || "Initial notes (optional)",
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontFamily: "inherit" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(false);
        },
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !newSrc.citation.trim(),
        onClick: addSource,
        style: {
          padding: "6px 14px",
          borderRadius: "999px",
          background: newSrc.citation.trim() ? "#be185d" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: newSrc.citation.trim() ? "pointer" : "not-allowed"
        }
      },
      "Add source"
    ))) : /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(true);
        },
        style: {
          alignSelf: "flex-start",
          padding: "6px 14px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("humanities.add_source") || "Add source"
    ), /* @__PURE__ */ React.createElement(
      AbsentVoicesLedger,
      {
        t,
        voices,
        sourceCount: sources.length,
        onAdd: addAbsent,
        onRemove: removeAbsent
      }
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives, journal }));
  }
  function CounterFramingsStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var framings = journal.framings || [];
    var vettedSources = (journal.sources || []).filter(siftVetted);
    var _adding = useState(false);
    var adding = _adding[0];
    var setAdding = _adding[1];
    var _draft = useState({ frameKindChip: "", label: "", framingPrompt: "", whatItForegrounds: "", whatItOccludes: "", whichVettedSourcesFitIt: [] });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var chip = chipById(draft.frameKindChip);
    var anchorOk = !!chip && !!draft.whatItForegrounds && chip.semanticAnchorWhitelist.some(function(anchor) {
      return normalizeForCompare(draft.whatItForegrounds).indexOf(anchor) !== -1;
    });
    var pairwiseDistinct = framings.every(function(f) {
      return tokenJaccard(f.whatItForegrounds || "", draft.whatItForegrounds || "") < 0.55;
    });
    var canSave = draft.frameKindChip && draft.label.trim().length >= 4 && draft.framingPrompt.trim().length >= 30 && draft.whatItForegrounds.trim().length >= 20 && anchorOk && pairwiseDistinct && draft.whichVettedSourcesFitIt.length >= 1;
    var addFraming = function() {
      if (!canSave) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.framings = (prev.framings || []).concat([Object.assign({}, draft, {
          id: "fr" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          ts: Date.now()
        })]);
        if (next.positionality) {
          next.positionality = Object.assign({}, next.positionality, { staleLabel: true });
        }
        return next;
      });
      setDraft({ frameKindChip: "", label: "", framingPrompt: "", whatItForegrounds: "", whatItOccludes: "", whichVettedSourcesFitIt: [] });
      setAdding(false);
    };
    var removeFraming = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.framings = (prev.framings || []).filter(function(f) {
          return f.id !== id;
        });
        return next;
      });
    };
    var askVoicer = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.counter_framing_voicer, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    var usedChips = new Set(framings.map(function(f) {
      return f.frameKindChip;
    }));
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "counter_framings",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.counter_framings
      }
    ), /* @__PURE__ */ React.createElement(
      PositionalityCard,
      {
        t,
        journal,
        setJournal,
        editable: false,
        onReturnToReckoning: props.onReturnToReckoning,
        primitives
      }
    ), vettedSources.length === 0 && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: t("humanities.no_vetted_sources") || "Loop back to SIFT Triage and promote at least one source to a vetted tier before framing." }), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.framings_title") || "Framings", " (", framings.length, "/", floors.framings, "+, max 4)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, "Lenses that would read the same vetted sources differently. NOT a both-sides ritual; NOT a scholar list."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" } }, framings.map(function(f) {
      var c = chipById(f.frameKindChip);
      return /* @__PURE__ */ React.createElement("div", { key: f.id, style: {
        padding: "10px",
        borderRadius: "10px",
        background: "#fdf2f8",
        border: "1px solid #fbcfe8"
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "12px", color: "#9d174d" } }, f.label), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeFraming(f.id);
          },
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#9d174d", marginTop: "2px" } }, "chip: ", c ? c.label : f.frameKindChip), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#1e293b", lineHeight: 1.45 } }, f.framingPrompt), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#475569" } }, /* @__PURE__ */ React.createElement("em", null, "foregrounds:"), " ", f.whatItForegrounds), f.whatItOccludes && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#475569" } }, /* @__PURE__ */ React.createElement("em", null, "occludes:"), " ", f.whatItOccludes));
    })), framings.length < 4 && !adding && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(true);
        },
        style: {
          marginTop: "10px",
          padding: "6px 14px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ ",
      t("humanities.add_framing") || "Add framing"
    ), adding && /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: "10px",
      padding: "10px",
      borderRadius: "10px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#9d174d" } }, "Pick a chip (taxonomy is curated \u2014 you cannot invent one)", /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, FRAMING_TAXONOMY.map(function(c) {
      var used = usedChips.has(c.id);
      var selected = draft.frameKindChip === c.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          type: "button",
          disabled: used,
          onClick: function() {
            setDraft(Object.assign({}, draft, { frameKindChip: c.id }));
          },
          "aria-pressed": selected,
          title: c.oneLineCue,
          style: {
            padding: "3px 8px",
            borderRadius: "999px",
            background: selected ? "#be185d" : used ? "#e5e7eb" : "#fff",
            color: selected ? "#fff" : used ? "#94a3b8" : "#be185d",
            border: "1px solid " + (used ? "#cbd5e1" : "#be185d"),
            fontSize: "10px",
            fontWeight: 700,
            cursor: used ? "not-allowed" : "pointer"
          }
        },
        c.label,
        used ? " (used)" : ""
      );
    }))), chip && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#9d174d", fontStyle: "italic" } }, "Cue: ", chip.oneLineCue, " ", /* @__PURE__ */ React.createElement("br", null), "Anchor whitelist (at least one must appear in foregrounding): ", chip.semanticAnchorWhitelist.join(", ")), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: draft.label,
        maxLength: 80,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { label: e.target.value }));
        },
        placeholder: t("humanities.framing_label_ph") || "Your label for this framing (\u22654 chars)",
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px" }
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.framingPrompt,
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { framingPrompt: e.target.value }));
        },
        placeholder: t("humanities.framing_prompt_ph") || "Framing prompt: a question this lens would ask of your sources (\u226530 chars)",
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", fontFamily: "inherit" }
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.whatItForegrounds,
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whatItForegrounds: e.target.value }));
        },
        placeholder: t("humanities.framing_foreground_ph") || "What does this framing FOREGROUND? (must include an anchor word, \u226520 chars)",
        style: {
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid " + (draft.whatItForegrounds && !anchorOk ? "#dc2626" : "#cbd5e1"),
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    ), draft.whatItForegrounds && !anchorOk && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#dc2626" } }, "No anchor word from this chip found. Include one of: ", (chip && chip.semanticAnchorWhitelist || []).slice(0, 5).join(", "), "\u2026"), draft.whatItForegrounds && !pairwiseDistinct && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#dc2626" } }, "Too similar to an existing framing. Make this one substantively different."), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: draft.whatItOccludes,
        rows: 2,
        maxLength: 400,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { whatItOccludes: e.target.value }));
        },
        placeholder: t("humanities.framing_occlude_ph") || "What does it OCCLUDE? (optional)",
        style: { padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", fontFamily: "inherit" }
      }
    ), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#9d174d" } }, "Which vetted sources fit this framing? (\u22651)", /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, vettedSources.map(function(s) {
      var on = draft.whichVettedSourcesFitIt.indexOf(s.id) !== -1;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: s.id,
          type: "button",
          onClick: function() {
            var arr = draft.whichVettedSourcesFitIt.slice();
            var idx = arr.indexOf(s.id);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(s.id);
            setDraft(Object.assign({}, draft, { whichVettedSourcesFitIt: arr }));
          },
          style: {
            padding: "3px 8px",
            borderRadius: "999px",
            background: on ? "#be185d" : "#fff",
            color: on ? "#fff" : "#be185d",
            border: "1px solid #be185d",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        (s.citation || s.id).slice(0, 30)
      );
    }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          setAdding(false);
        },
        style: {
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      t("common.cancel") || "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: addFraming,
        style: {
          padding: "6px 14px",
          borderRadius: "999px",
          background: canSave ? "#be185d" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "11px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      "Save framing"
    )))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askVoicer,
        style: {
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("humanities.surfacing") || "Surfacing\u2026" : t("humanities.voicer_button") || "Surface a framing chip I have not used"
    ), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives, journal }));
  }
  function WarrantLabStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var floors = devFloors(journal.devLevel || "6_8");
    var vettedSources = (journal.sources || []).filter(siftVetted);
    var framings = journal.framings || [];
    var hp = journal.humanitiesPosition;
    var links = journal.claimEvidenceLinks || [];
    var probes = journal.framingProbes || [];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _targetLinkId = useState(null);
    var targetLinkId = _targetLinkId[0];
    var setTargetLinkId = _targetLinkId[1];
    var _probeModal = useState(null);
    var probeModal = _probeModal[0];
    var setProbeModal = _probeModal[1];
    var _hpDraft = useState(hp || { text: "", label: "", whatThisClaimDoesNotSpeakTo: "", positionalityLinkText: "" });
    var hpDraft = _hpDraft[0];
    var setHpDraft = _hpDraft[1];
    var saveHp = function() {
      var pos = journal.positionality || {};
      var av = journal.absentVoices || [];
      var availableSources = [pos.text || ""].concat(av.map(function(a) {
        return a.whoseVoiceText || "";
      }));
      var linkTextOk = (hpDraft.positionalityLinkText || "").trim().length >= 12 && availableSources.some(function(src) {
        if (!src) return false;
        return normalizeForCompare(src).indexOf(normalizeForCompare(hpDraft.positionalityLinkText.slice(0, 20))) !== -1;
      });
      if (!linkTextOk) return;
      if (inDenylist(hpDraft.text, THESIS_PLATITUDE_DENYLIST)) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.humanitiesPosition = Object.assign({}, hpDraft, { ts: Date.now(), staleLabel: false });
        return next;
      });
    };
    var addLink = function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.claimEvidenceLinks = (prev.claimEvidenceLinks || []).concat([{
          id: "cel" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          claim: "humanitiesPosition",
          evidenceIds: [],
          warrant: "",
          qualifier: "",
          rebuttal: "",
          answersFramingId: "",
          qualifierRevisionLog: [],
          warrantRevisionLog: [],
          stuckSignal: false
        }]);
        return next;
      });
    };
    var updateLink = function(id, patch) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.claimEvidenceLinks = (prev.claimEvidenceLinks || []).map(function(l) {
          if (l.id !== id) return l;
          var merged = Object.assign({}, l, patch);
          if (patch.qualifier !== void 0 && Array.isArray(l.qualifierRevisionLog) && l.qualifierRevisionLog.length) {
            var log = l.qualifierRevisionLog.slice();
            for (var i = log.length - 1; i >= 0; i--) {
              if (log[i] && log[i].toQualifier === null) {
                log[i] = Object.assign({}, log[i], { toQualifier: patch.qualifier, resolvedTs: Date.now() });
                break;
              }
            }
            merged.qualifierRevisionLog = log;
          }
          return merged;
        });
        return next;
      });
    };
    var removeLink = function(id) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.claimEvidenceLinks = (prev.claimEvidenceLinks || []).filter(function(l) {
          return l.id !== id;
        });
        next.framingProbes = (prev.framingProbes || []).filter(function(p) {
          return p.linkId !== id;
        });
        return next;
      });
    };
    var setProbeVerdict = function(linkId, framingId, verdict, studentRationale, quotedSnippetRef, allSurvivesJustification) {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        var probeId = "fp" + Date.now() + "_" + Math.floor(Math.random() * 1e3);
        next.framingProbes = (prev.framingProbes || []).concat([{
          id: probeId,
          ts: Date.now(),
          linkId,
          framingId,
          verdict,
          studentRationale,
          quotedSnippetRef: quotedSnippetRef || null,
          allSurvivesJustification: allSurvivesJustification || null
        }]);
        if (verdict === "warrant_contracts") {
          next.claimEvidenceLinks = (prev.claimEvidenceLinks || []).map(function(lnk) {
            if (lnk.id !== linkId) return lnk;
            return Object.assign({}, lnk, {
              qualifierRevisionLog: (lnk.qualifierRevisionLog || []).concat([{
                ts: Date.now(),
                fromQualifier: lnk.qualifier || "",
                toQualifier: null,
                // back-filled by updateLink when the student next edits this link's qualifier
                triggeredByFramingProbeId: probeId
              }])
            });
          });
        }
        return next;
      });
    };
    var askQuestioner = async function(linkId) {
      setTargetLinkId(linkId);
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.warrant_questioner, Object.assign({}, ctx, { targetLinkId: linkId }));
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "warrant_lab",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.warrant_lab
      }
    ), /* @__PURE__ */ React.createElement(
      PositionalityCard,
      {
        t,
        journal,
        setJournal,
        editable: false,
        onReturnToReckoning: props.onReturnToReckoning,
        primitives
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.position_title") || "Your position"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, "\u226560 chars. Must include a multi-word phrase (\u22653 content words, \u226512 chars) verbatim from your positionality OR an absent-voice entry. Refuses thesis platitudes."), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: hpDraft.text,
        rows: 3,
        maxLength: 1500,
        onChange: function(e) {
          setHpDraft(Object.assign({}, hpDraft, { text: e.target.value }));
        },
        placeholder: t("humanities.position_text_ph") || "State your position in your own voice.",
        style: {
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: hpDraft.positionalityLinkText || "",
        maxLength: 200,
        onChange: function(e) {
          setHpDraft(Object.assign({}, hpDraft, { positionalityLinkText: e.target.value }));
        },
        placeholder: t("humanities.position_link_ph") || "Multi-word phrase (\u22653 content words, \u226512 chars) from your positionality or an absent voice",
        style: {
          marginTop: "6px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: hpDraft.whatThisClaimDoesNotSpeakTo || "",
        rows: 2,
        maxLength: 1e3,
        onChange: function(e) {
          setHpDraft(Object.assign({}, hpDraft, { whatThisClaimDoesNotSpeakTo: e.target.value }));
        },
        placeholder: t("humanities.position_notspeak_ph") || "What this claim does NOT speak to (\u226560 chars; will feed the Foreclosure Coda)",
        style: {
          marginTop: "6px",
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontFamily: "inherit"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#475569", fontWeight: 700 } }, "Label:"), ["defensible_given_evidence", "partial_standing", "contested_open"].map(function(lab) {
      var selected = hpDraft.label === lab;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: lab,
          type: "button",
          onClick: function() {
            setHpDraft(Object.assign({}, hpDraft, { label: lab }));
          },
          style: {
            padding: "4px 10px",
            borderRadius: "999px",
            background: selected ? "#9d174d" : "#fff",
            color: selected ? "#fff" : "#9d174d",
            border: "1px solid #9d174d",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        lab.replace(/_/g, " ")
      );
    }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: saveHp,
        style: {
          marginLeft: "auto",
          padding: "5px 14px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "Save position"
    ))), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.links_title") || "Claim-evidence-warrant links"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addLink,
        style: {
          padding: "5px 12px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      "+ Add link"
    )), links.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#64748b", fontStyle: "italic" } }, "Add a Toulmin link: pick evidence from vetted sources, author a warrant with an inferential bridge, add a qualifier and a rebuttal."), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" } }, links.map(function(l) {
      var warrantJaccard = hp && hp.text ? tokenJaccard(hp.text, l.warrant || "") : 0;
      var jaccardOk = warrantJaccard < 0.5;
      var markerOk = WARRANT_MARKERS_RE.test(l.warrant || "");
      var qualifierOk = (l.qualifier || "").length >= 20 && QUALIFIER_MARKERS_RE.test(l.qualifier || "");
      var rebuttalOk = (l.rebuttal || "").length >= floors.rebuttal && REBUTTAL_SHAPE_RE.test(l.rebuttal || "");
      var linkProbes = probes.filter(function(p) {
        return p.linkId === l.id;
      });
      return /* @__PURE__ */ React.createElement("li", { key: l.id, style: {
        padding: "10px",
        borderRadius: "10px",
        background: "#fdf2f8",
        border: "1px solid #fbcfe8"
      } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#9d174d" } }, "Toulmin link"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            removeLink(l.id);
          },
          style: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }
        },
        "\u2715"
      )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", fontWeight: 700, color: "#475569" } }, "Evidence (pick from vetted sources, \u22652 different publishers preferred)", /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, vettedSources.map(function(s) {
        var on = (l.evidenceIds || []).indexOf(s.id) !== -1;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: s.id,
            type: "button",
            onClick: function() {
              var arr = (l.evidenceIds || []).slice();
              var idx = arr.indexOf(s.id);
              if (idx >= 0) arr.splice(idx, 1);
              else arr.push(s.id);
              updateLink(l.id, { evidenceIds: arr });
            },
            style: {
              padding: "3px 8px",
              borderRadius: "999px",
              background: on ? "#be185d" : "#fff",
              color: on ? "#fff" : "#be185d",
              border: "1px solid #be185d",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          (s.citation || s.id).slice(0, 30)
        );
      }))), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "6px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, "Warrant \u2014 the inferential bridge (\u2265", floors.warrant, " chars; must contain a bridge token or link to a framing prompt)", /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: l.warrant || "",
          rows: 3,
          maxLength: 1500,
          onChange: function(e) {
            updateLink(l.id, { warrant: e.target.value });
          },
          style: {
            marginTop: "2px",
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid " + (l.warrant && (!jaccardOk || !markerOk) ? "#dc2626" : "#cbd5e1"),
            fontSize: "11px",
            fontFamily: "inherit"
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", color: jaccardOk ? "#16a34a" : "#dc2626", marginTop: "2px" } }, "claim\u2194warrant tokenJaccard: ", warrantJaccard.toFixed(2), " (must be <0.50)", " \xB7 ", "marker: ", markerOk ? "\u2713" : "\u2717")), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "6px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, 'Qualifier \u2014 scope (\u226520 chars; must contain a scope token like "only when", "provided that")', /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: l.qualifier || "",
          rows: 2,
          maxLength: 600,
          onChange: function(e) {
            updateLink(l.id, { qualifier: e.target.value });
          },
          style: {
            marginTop: "2px",
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid " + (l.qualifier && !qualifierOk ? "#dc2626" : "#cbd5e1"),
            fontSize: "11px",
            fontFamily: "inherit"
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", color: qualifierOk ? "#16a34a" : "#94a3b8", marginTop: "2px" } }, "scope marker: ", QUALIFIER_MARKERS_RE.test(l.qualifier || "") ? "\u2713" : "\u2717")), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "6px", fontSize: "10px", fontWeight: 700, color: "#475569" } }, "Rebuttal \u2014 anticipated objection + answer (\u2265", floors.rebuttal, ' chars; must contain "one might object that" / "a critic could say"-style shape)', /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: l.rebuttal || "",
          rows: 3,
          maxLength: 1500,
          onChange: function(e) {
            updateLink(l.id, { rebuttal: e.target.value });
          },
          style: {
            marginTop: "2px",
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid " + (l.rebuttal && !rebuttalOk ? "#dc2626" : "#cbd5e1"),
            fontSize: "11px",
            fontFamily: "inherit"
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", color: rebuttalOk ? "#16a34a" : "#94a3b8", marginTop: "2px" } }, "object-and-answer shape: ", REBUTTAL_SHAPE_RE.test(l.rebuttal || "") ? "\u2713" : "\u2717")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", color: "#475569", fontWeight: 700 } }, "Answers framing:", /* @__PURE__ */ React.createElement(
        "select",
        {
          value: l.answersFramingId || "",
          onChange: function(e) {
            updateLink(l.id, { answersFramingId: e.target.value });
          },
          style: {
            marginLeft: "4px",
            padding: "3px 6px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "10px"
          }
        },
        /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
        framings.map(function(f) {
          return /* @__PURE__ */ React.createElement("option", { key: f.id, value: f.id }, f.label);
        })
      )), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "10px", color: "#475569", fontWeight: 700, marginLeft: "12px" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: !!l.stuckSignal,
          onChange: function(e) {
            updateLink(l.id, { stuckSignal: e.target.checked });
          }
        }
      ), "I am stuck \u2014 give me an analog domain"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          disabled: busy,
          onClick: function() {
            askQuestioner(l.id);
          },
          style: {
            marginLeft: "auto",
            padding: "5px 12px",
            borderRadius: "999px",
            background: busy ? "#cbd5e1" : "#0d9488",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "11px",
            cursor: busy ? "wait" : "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
        "Pressure-test this warrant"
      )), framings.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "10px", color: "#9d174d" } }, "Framing probes:"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px" } }, framings.map(function(f) {
        var existing = linkProbes.filter(function(p) {
          return p.framingId === f.id;
        });
        var latest = existing.length ? existing[existing.length - 1] : null;
        return /* @__PURE__ */ React.createElement("div", { key: f.id, style: {
          padding: "6px",
          borderRadius: "6px",
          background: "#fff",
          border: "1px solid #fbcfe8",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap"
        } }, /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: "10px", color: "#1e293b" } }, /* @__PURE__ */ React.createElement("strong", null, f.label), latest && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "4px", color: latest.verdict === "warrant_survives" ? "#16a34a" : latest.verdict === "warrant_contracts" ? "#d97706" : "#dc2626" } }, "(", latest.verdict.replace(/_/g, " "), ")")), ["warrant_survives", "warrant_contracts", "warrant_fails"].map(function(v) {
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: v,
              type: "button",
              onClick: function() {
                setProbeModal({ linkId: l.id, framingId: f.id, verdict: v });
              },
              style: {
                padding: "3px 8px",
                borderRadius: "999px",
                background: "transparent",
                color: v === "warrant_survives" ? "#16a34a" : v === "warrant_contracts" ? "#d97706" : "#dc2626",
                border: "1px solid currentColor",
                fontSize: "9px",
                fontWeight: 700,
                cursor: "pointer"
              }
            },
            v.replace("warrant_", "")
          );
        }));
      }))));
    }))), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives, journal }), probeModal && /* @__PURE__ */ React.createElement(
      FramingProbeModal,
      {
        t,
        journal,
        linkId: probeModal.linkId,
        framingId: probeModal.framingId,
        verdict: probeModal.verdict,
        onCommit: function(payload) {
          setProbeVerdict(probeModal.linkId, probeModal.framingId, probeModal.verdict, payload.rationale, payload.quotedSnippetRef, payload.allSurvivesJustification);
          setProbeModal(null);
        },
        onCancel: function() {
          setProbeModal(null);
        }
      }
    ));
  }
  function FramingProbeModal(props) {
    var t = props.t || function(k) {
      return k;
    };
    var journal = props.journal;
    var linkId = props.linkId, framingId = props.framingId, verdict = props.verdict;
    var onCommit = props.onCommit, onCancel = props.onCancel;
    var link = (journal.claimEvidenceLinks || []).filter(function(l) {
      return l.id === linkId;
    })[0] || {};
    var framing = (journal.framings || []).filter(function(f) {
      return f.id === framingId;
    })[0] || {};
    var linkedSources = (journal.sources || []).filter(function(s) {
      return (link.evidenceIds || []).indexOf(s.id) !== -1;
    });
    var contentSourceText = linkedSources.map(function(s) {
      return s.notes || "";
    }).join(" ") + " " + (framing.whatItForegrounds || "") + " " + (framing.framingPrompt || "");
    var validContentTokens = /* @__PURE__ */ new Set();
    contentTokens(contentSourceText).forEach(function(tk) {
      if (tk.length >= 4) validContentTokens.add(tk);
    });
    var _rationale = useState("");
    var rationale = _rationale[0];
    var setRationale = _rationale[1];
    var _allSurvivesJust = useState("");
    var asJust = _allSurvivesJust[0];
    var setAsJust = _allSurvivesJust[1];
    var existingProbes = (journal.framingProbes || []).filter(function(p) {
      return p.linkId === linkId;
    });
    var totalFramings = (journal.framings || []).length;
    var existingSurviveCount = existingProbes.filter(function(p) {
      return p.verdict === "warrant_survives";
    }).length;
    var wouldBeAllSurvives = verdict === "warrant_survives" && // would this verdict complete an all-survives distribution? Count distinct framings probed.
    (function() {
      var probedFramings = /* @__PURE__ */ new Set();
      existingProbes.forEach(function(p) {
        if (p.verdict === "warrant_survives") probedFramings.add(p.framingId);
      });
      probedFramings.add(framingId);
      return probedFramings.size === totalFramings && totalFramings >= 2;
    })();
    var rationaleLengthOk = rationale.trim().length >= 60;
    var rationaleDenylistOk = !inDenylist(rationale, FRAMING_PROBE_RATIONALE_TEMPLATE_DENYLIST);
    var rationaleTokens = contentTokens(rationale);
    var rationaleContentOk = validContentTokens.size === 0 || rationaleTokens.some(function(tk) {
      return validContentTokens.has(tk);
    });
    var asJustOk = !wouldBeAllSurvives || asJust.trim().length >= 120;
    var canCommit = rationaleLengthOk && rationaleDenylistOk && rationaleContentOk && asJustOk;
    var color = verdict === "warrant_survives" ? "#16a34a" : verdict === "warrant_contracts" ? "#d97706" : "#dc2626";
    var modalRef = useRef(null);
    useFocusTrap(modalRef, true, onCancel);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: modalRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("humanities.framing_probe_modal_title") || "Record framing probe verdict",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        },
        onClick: function(e) {
          if (e.target === e.currentTarget) onCancel();
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: function(e) {
            e.stopPropagation();
          },
          style: {
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "520px",
            width: "100%",
            padding: "20px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            maxHeight: "90vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { color, marginRight: "6px" } }, "\u25CF"), t("humanities.framing_probe_modal_title") || "Record framing probe verdict"),
        /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0", fontSize: "11px", color: "#475569", lineHeight: 1.5 } }, "Framing: ", /* @__PURE__ */ React.createElement("strong", null, framing.label || "(unnamed)"), " \xB7 ", "Verdict: ", /* @__PURE__ */ React.createElement("strong", { style: { color } }, verdict.replace("warrant_", "").replace(/_/g, " "))),
        /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginTop: "8px", fontSize: "11px", fontWeight: 700, color: "#1e293b" } }, t("humanities.probe_rationale_label") || "Rationale (\u226560 chars, not a platitude, must mention a content word from a linked source or this framing)", /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: rationale,
            rows: 4,
            maxLength: 1500,
            onChange: function(e) {
              setRationale(e.target.value);
            },
            placeholder: verdict === "warrant_survives" ? "How does this framing read your evidence and your warrant still hold?" : verdict === "warrant_contracts" ? "What scope does this framing force you to give up?" : "How does this framing make your warrant fail?",
            style: {
              marginTop: "4px",
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid " + (!rationaleLengthOk && rationale || !rationaleDenylistOk || !rationaleContentOk ? "#dc2626" : "#cbd5e1"),
              fontSize: "12px",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: "70px"
            }
          }
        )),
        rationale && !rationaleLengthOk && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "10px", color: "#dc2626" } }, "\u226560 chars required (", rationale.trim().length, " so far)."),
        rationale && !rationaleDenylistOk && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "10px", color: "#dc2626" } }, "Rationale reads as a platitude (FRAMING_PROBE_RATIONALE_TEMPLATE_DENYLIST). Engage substantively."),
        rationale && rationaleLengthOk && !rationaleContentOk && validContentTokens.size > 0 && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0", fontSize: "10px", color: "#dc2626" } }, "Mention a content word from the linked source(s) or this framing's foregrounding text. Examples: ", Array.from(validContentTokens).slice(0, 6).join(", "), validContentTokens.size > 6 ? "\u2026" : ""),
        wouldBeAllSurvives && /* @__PURE__ */ React.createElement("div", { style: {
          marginTop: "10px",
          padding: "10px",
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          borderRadius: "8px"
        } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#92400e" } }, t("humanities.all_survives_warning") || "All-survives distribution detected."), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "11px", color: "#92400e", lineHeight: 1.5 } }, 'Every framing probe so far returned "warrant survives." That is unusual \u2014 frameworks usually contract under at least one alternative reading. Author a \u2265120-char justification explaining why your warrant genuinely survives every framing.'), /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: asJust,
            rows: 3,
            maxLength: 1200,
            onChange: function(e) {
              setAsJust(e.target.value);
            },
            placeholder: t("humanities.all_survives_just_ph") || "Why does the warrant truly survive every framing? Be specific about which evidence resists which framing.",
            style: {
              marginTop: "6px",
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid " + (asJust && asJust.length < 120 ? "#dc2626" : "#fbbf24"),
              fontSize: "11px",
              fontFamily: "inherit"
            }
          }
        ), asJust && asJust.length < 120 && /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "10px", color: "#dc2626" } }, "\u2265120 chars required (", asJust.length, " so far).")),
        /* @__PURE__ */ React.createElement("div", { style: { marginTop: "14px", display: "flex", justifyContent: "flex-end", gap: "8px" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onCancel,
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer"
            }
          },
          t("common.cancel") || "Cancel"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            disabled: !canCommit,
            onClick: function() {
              if (!canCommit) return;
              onCommit({
                rationale: rationale.trim(),
                allSurvivesJustification: wouldBeAllSurvives ? asJust.trim() : null
              });
            },
            style: {
              padding: "8px 14px",
              borderRadius: "999px",
              background: canCommit ? color : "#cbd5e1",
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "12px",
              cursor: canCommit ? "pointer" : "not-allowed"
            }
          },
          t("humanities.framing_probe_commit") || "Record verdict"
        ))
      )
    );
  }
  function PositionalityReckoningStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var devLevel = journal.devLevel || "6_8";
    var floors = devFloors(devLevel);
    var ps = journal.positionalitySnapshots || [];
    var latest = ps.length ? ps[ps.length - 1] : null;
    var prior = ps.length >= 2 ? ps[ps.length - 2] : null;
    var pos = journal.positionality || {};
    var _draft = useState({
      materialRelationshipText: pos.text || "",
      visibilityField: latest && latest.visibilityField || "",
      obscuringField: latest && latest.obscuringField || "",
      whoseStandpointIsStructurallyAbsentText: latest && latest.whoseStandpointIsStructurallyAbsentText || "",
      partialIncorporationCommitmentsText: latest && latest.partialIncorporationCommitmentsText || "",
      epistemicStatus: latest && latest.epistemicStatus || ""
    });
    var draft = _draft[0];
    var setDraft = _draft[1];
    var visibilityPolarityOk = !inDenylist(draft.visibilityField, ["nothing", "none", "everything", "all sides"]);
    var obscuringPolarityOk = !inDenylist(draft.obscuringField, POSITIONALITY_OBSCURES_DENYLIST);
    var fieldsAtFloor = devLevel === "k2" || devLevel === "3_5" ? true : draft.materialRelationshipText.length >= 100 && draft.visibilityField.length >= 100 && draft.obscuringField.length >= 100 && draft.whoseStandpointIsStructurallyAbsentText.length >= 100 && draft.partialIncorporationCommitmentsText.length >= 100;
    var visObsDistinct = draft.visibilityField && draft.obscuringField ? tokenJaccard(draft.visibilityField, draft.obscuringField) < 0.55 : false;
    var newTokensVsPrior = prior ? contentTokens(draft.materialRelationshipText + " " + draft.visibilityField + " " + draft.obscuringField).filter(function(tk) {
      return !normalizeForCompare(prior.materialRelationshipText + " " + prior.visibilityField + " " + prior.obscuringField).split(/\W+/).includes(tk);
    }).length >= 2 : true;
    var canSave = fieldsAtFloor && visObsDistinct && newTokensVsPrior && visibilityPolarityOk && obscuringPolarityOk && draft.epistemicStatus;
    var saveSnapshot = function() {
      if (!canSave) return;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.positionalitySnapshots = (prev.positionalitySnapshots || []).concat([Object.assign({}, draft, {
          v: (prev.positionalitySnapshots || []).length + 1,
          ts: Date.now(),
          devLevelMode: devLevel === "k2" || devLevel === "3_5" ? "picture_voice" : "structured",
          deltaFromPriorText: prior ? "Revised after " + (prev.loopBacks || []).length + " loop-backs" : "Initial reckoning"
        })]);
        return next;
      });
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "positionality_reckoning",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.positionality_reckoning
      }
    ), /* @__PURE__ */ React.createElement(
      PositionalityCard,
      {
        t,
        journal,
        setJournal,
        editable: false,
        primitives
      }
    ), /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#fef2f2",
      border: "2px solid #fca5a5",
      fontSize: "12px",
      color: "#7f1d1d",
      lineHeight: 1.5
    } }, /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F6AB} "), t("humanities.no_ai_stage_banner") || "NO-AI STAGE."), " ", t("humanities.no_ai_stage_text") || "Standpoint cannot be drafted by a system that has no standpoint of its own. This is intentional and load-bearing."), /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#fff",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.reckoning_title") || "Re-version your standpoint (snapshot v" + (ps.length + 1) + ")"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.5 } }, devLevel === "k2" || devLevel === "3_5" ? "Draw or record your standpoint as it has changed across the inquiry." : "Each text field \u2265100 chars. Visibility and Obscuring must be substantively distinct. New snapshot must add \u22652 new substrate-linked tokens vs the prior."), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.pr_material_label") || "Material relationship to the question",
        value: draft.materialRelationshipText,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { materialRelationshipText: v }));
        },
        rows: 3,
        max: 1500
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.pr_visibility_label") || "What does your standpoint let you SEE? (visibility)",
        help: t("humanities.pr_visibility_help") || "\u2265100 chars. Must use 'see/notice/foreground/visible'-class tokens. 'I see everything' is refused.",
        value: draft.visibilityField,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { visibilityField: v }));
        },
        rows: 3,
        max: 1500
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.pr_obscuring_label") || "What does your standpoint OBSCURE? (obscuring)",
        help: t("humanities.pr_obscuring_help") || "\u2265100 chars. Must use 'obscure/miss/blind/limit'-class tokens. 'I have no blind spots' is refused.",
        value: draft.obscuringField,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { obscuringField: v }));
        },
        rows: 3,
        max: 1500
      }
    ), !obscuringPolarityOk && draft.obscuringField && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#dc2626" } }, "Obscuring field reads as denial of blind spots. Name what you actually cannot see from where you stand."), !visObsDistinct && draft.visibilityField && draft.obscuringField && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "10px", color: "#dc2626" } }, "Visibility and obscuring fields are too similar. They should name different things."), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.pr_absent_label") || "Whose standpoint is structurally absent from your inquiry?",
        value: draft.whoseStandpointIsStructurallyAbsentText,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { whoseStandpointIsStructurallyAbsentText: v }));
        },
        rows: 2,
        max: 1e3
      }
    ), /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.pr_partial_label") || "Partial-incorporation commitments \u2014 what did you do to bring an absent voice in?",
        value: draft.partialIncorporationCommitmentsText,
        onChange: function(v) {
          setDraft(Object.assign({}, draft, { partialIncorporationCommitmentsText: v }));
        },
        rows: 2,
        max: 1e3
      }
    ), /* @__PURE__ */ React.createElement("label", { style: { fontSize: "11px", fontWeight: 700, color: "#1e293b" } }, "Epistemic status \u2014 your relationship to the people in this question", /* @__PURE__ */ React.createElement(
      "select",
      {
        value: draft.epistemicStatus,
        onChange: function(e) {
          setDraft(Object.assign({}, draft, { epistemicStatus: e.target.value }));
        },
        style: {
          marginTop: "2px",
          width: "100%",
          padding: "6px 8px",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          fontSize: "12px",
          fontFamily: "inherit"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"),
      EPISTEMIC_STATUS_OPTIONS.map(function(o) {
        return /* @__PURE__ */ React.createElement("option", { key: o.id, value: o.id }, o.label);
      })
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: !canSave,
        onClick: saveSnapshot,
        style: {
          alignSelf: "flex-start",
          padding: "8px 18px",
          borderRadius: "999px",
          background: canSave ? "#7c3aed" : "#cbd5e1",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: canSave ? "pointer" : "not-allowed"
        }
      },
      t("humanities.save_positionality_snapshot") || "Save positionality snapshot v" + (ps.length + 1)
    )), ps.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px", borderRadius: "10px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "12px", fontWeight: 800, color: "#1e293b" } }, t("humanities.snapshots_history") || "Snapshot history"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", overflowX: "auto" } }, ps.map(function(s) {
      return /* @__PURE__ */ React.createElement("div", { key: s.v, style: {
        flexShrink: 0,
        padding: "6px 10px",
        borderRadius: "8px",
        background: "#fdf2f8",
        border: "1px solid #fbcfe8",
        minWidth: "120px",
        maxWidth: "180px"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#9d174d", fontWeight: 800 } }, "v", s.v), /* @__PURE__ */ React.createElement("div", { style: {
        fontSize: "10px",
        color: "#831843",
        marginTop: "2px",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden"
      } }, s.materialRelationshipText));
    }))));
  }
  function GenreCompositionStage(props) {
    var t = props.t, ctx = props.ctx;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var devLevel = journal.devLevel || "6_8";
    var floors = devFloors(devLevel);
    var sa = journal.stakesAudience || {};
    var gc = journal.genreChoice;
    var ps = journal.positionalitySnapshots || [];
    var av = journal.absentVoices || [];
    var hp = journal.humanitiesPosition || {};
    var comps = journal.compositions || [];
    var latest = comps.length ? comps[comps.length - 1] : null;
    var _bodyText = useState(latest && latest.bodyText || "");
    var bodyText = _bodyText[0];
    var setBodyText = _bodyText[1];
    var _accountabilityTarget = useState(latest && latest.publicAccountabilityTarget || "");
    var accTarget = _accountabilityTarget[0];
    var setAccTarget = _accountabilityTarget[1];
    var _accountabilityNote = useState(latest && latest.publicAccountabilityNote || "");
    var accNote = _accountabilityNote[0];
    var setAccNote = _accountabilityNote[1];
    var _aiResult = useState(null);
    var aiResult = _aiResult[0];
    var setAiResult = _aiResult[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _validationError = useState("");
    var validationError = _validationError[0];
    var setValidationError = _validationError[1];
    var pickGenre = function(g) {
      if (!sa.chip) {
        setValidationError("Pick a stakes audience first (loop back to Frame the Question if needed).");
        return;
      }
      if (!CONTESTATION_RANGE[sa.chip][g]) {
        setValidationError('Audience "' + sa.chip + '" is incompatible with genre "' + g + '" \u2014 pick a compatible pair or loop back to change audience.');
        return;
      }
      setValidationError("");
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.genreChoice = { genre: g, ts: Date.now(), lockUntilSubstrateLinkPass: false };
        return next;
      });
    };
    var foreclosureCoda = useMemo(function() {
      var parts = [];
      var latestSnap = ps.length ? ps[ps.length - 1] : null;
      if (latestSnap && latestSnap.obscuringField) {
        parts.push("What this argument cannot speak to (from my standpoint): " + latestSnap.obscuringField);
      }
      if (hp && hp.whatThisClaimDoesNotSpeakTo) {
        parts.push("What this claim explicitly does not address: " + hp.whatThisClaimDoesNotSpeakTo);
      }
      if (av.length > 0) {
        parts.push("Voices structurally absent from my sources: " + av.map(function(a) {
          return a.whoseVoiceText;
        }).join("; "));
      }
      return parts.join("\n\n");
    }, [ps, hp, av]);
    var saveComposition = function() {
      if (!gc || !gc.genre) return;
      var bounds = (floors.composition || {})[gc.genre] || [200, 800];
      var wc = bodyText.trim().split(/\s+/).filter(Boolean).length;
      if (wc < bounds[0]) {
        setValidationError("Composition needs \u2265" + bounds[0] + " words for " + gc.genre + ".");
        return;
      }
      var codaIncludes = function(s) {
        return s && foreclosureCoda.indexOf(s.slice(0, 20)) !== -1;
      };
      var latestSnap = ps.length ? ps[ps.length - 1] : null;
      if (latestSnap && !codaIncludes(latestSnap.obscuringField)) {
        setValidationError("Foreclosure Coda must include your latest positionality.obscuring text.");
        return;
      }
      for (var i = 0; i < av.length; i++) {
        if (!codaIncludes(av[i].whoseVoiceText)) {
          setValidationError('Foreclosure Coda is missing absent-voice "' + av[i].whoseVoiceText.slice(0, 30) + '...". Re-open the coda.');
          return;
        }
      }
      setValidationError("");
      var hash = String(foreclosureCoda).split("").reduce(function(h, c) {
        return (h << 5) - h + c.charCodeAt(0) | 0;
      }, 0);
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.compositions = (prev.compositions || []).concat([{
          id: "comp" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
          v: (prev.compositions || []).length + 1,
          ts: Date.now(),
          genreChoice: gc.genre,
          bodyText: bodyText.trim(),
          bodyClaimTags: [],
          loadBearingClaimId: "humanitiesPosition",
          publicAccountabilityTarget: accTarget.trim(),
          publicAccountabilityNote: accNote.trim(),
          foreclosureCodaText: foreclosureCoda,
          foreclosureCodaHash: hash,
          no_ai_notes: "Authored by student; AI standpoint_mirror used echo-prevention only."
        }]);
        return next;
      });
    };
    var askMirror = async function() {
      setBusy(true);
      setAiResult(null);
      try {
        var res = await ctx.ask(TOUCHPOINTS.standpoint_mirror, ctx);
        setAiResult(res);
      } finally {
        setBusy(false);
      }
    };
    var _egress = useState(null);
    var egress = _egress[0];
    var setEgress = _egress[1];
    var sendToStoryForge = function() {
      if (!latest) {
        setValidationError("Save a composition first.");
        return;
      }
      setValidationError("");
      var payload = {
        version: 1,
        sourceModule: "ResearchHub",
        sourceLane: "humanities",
        ts: Date.now(),
        composition: {
          v: latest.v,
          genre: latest.genreChoice,
          bodyText: latest.bodyText,
          foreclosureCodaText: latest.foreclosureCodaText,
          foreclosureCodaHash: latest.foreclosureCodaHash,
          publicAccountabilityTarget: latest.publicAccountabilityTarget,
          publicAccountabilityNote: latest.publicAccountabilityNote
        },
        question: {
          title: journal.questionTitle || "",
          stakesAudience: journal.stakesAudience && journal.stakesAudience.label || journal.stakesAudience && journal.stakesAudience.chip || ""
        },
        position: {
          text: journal.humanitiesPosition && journal.humanitiesPosition.text || "",
          label: journal.humanitiesPosition && journal.humanitiesPosition.label || "",
          whatThisClaimDoesNotSpeakTo: journal.humanitiesPosition && journal.humanitiesPosition.whatThisClaimDoesNotSpeakTo || ""
        },
        standpoint: {
          materialRelationship: ps.length && ps[ps.length - 1].materialRelationshipText || journal.positionality && journal.positionality.text || "",
          visibility: ps.length && ps[ps.length - 1].visibilityField || "",
          obscuring: ps.length && ps[ps.length - 1].obscuringField || "",
          epistemicStatus: ps.length && ps[ps.length - 1].epistemicStatus || "",
          snapshotCount: ps.length
        },
        absentVoices: (journal.absentVoices || []).map(function(a) {
          return { whoseVoiceText: a.whoseVoiceText, whyAbsentChip: a.whyAbsentChip };
        }),
        provenance: {
          // SIFT pass IS the provenance. Send aggregate counts, not source list
          // (URLs may carry session metadata; teachers can re-open the Hub to
          // see the full source list if they need it).
          totalSources: (journal.sources || []).length,
          vettedSources: (journal.sources || []).filter(function(s) {
            return s.sift && (s.sift.tier === "primary_corroborated" || s.sift.tier === "secondary_corroborated");
          }).length,
          failedSIFT: (journal.sources || []).filter(function(s) {
            return s.sift && s.sift.tier === "failed_SIFT";
          }).length,
          framingsConsidered: (journal.framings || []).length,
          framingProbesRun: (journal.framingProbes || []).length
        }
      };
      try {
        window.localStorage.setItem("__alloHubEgressToStoryForge", JSON.stringify(payload));
        try {
          window.dispatchEvent(new CustomEvent("alloflow:hub-egress", { detail: { target: "StoryForge", payload } }));
        } catch (_) {
        }
        setEgress({ ok: true, ts: Date.now() });
      } catch (e) {
        setEgress({ ok: false, error: e && e.message || "localStorage write failed" });
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, validationError && /* @__PURE__ */ React.createElement("div", { role: "alert", style: { padding: "10px 12px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#7f1d1d", fontSize: "12px" } }, validationError), /* @__PURE__ */ React.createElement(
      ExemplarGate,
      {
        t,
        stageKey: "genre_composition",
        journal,
        setJournal,
        primitives,
        pair: EXEMPLAR_PAIRS.genre_composition
      }
    ), /* @__PURE__ */ React.createElement(
      PositionalityCard,
      {
        t,
        journal,
        setJournal,
        editable: false,
        onReturnToReckoning: props.onReturnToReckoning,
        primitives
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", borderRadius: "12px", background: "#fff", border: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, t("humanities.genre_title") || "Pick a genre (must be compatible with your stakes audience)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#475569", marginBottom: "6px" } }, "Stakes audience: ", /* @__PURE__ */ React.createElement("strong", null, sa.label || sa.chip || "\u2014 not set \u2014")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } }, GENRE_OPTIONS.map(function(g) {
      var selected = gc && gc.genre === g.id;
      var compatible = sa.chip && CONTESTATION_RANGE[sa.chip] && CONTESTATION_RANGE[sa.chip][g.id];
      var bounds = (floors.composition || {})[g.id] || g.words;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: g.id,
          type: "button",
          disabled: !compatible,
          onClick: function() {
            pickGenre(g.id);
          },
          title: compatible ? "" : "Audience-genre pair blocked by CONTESTATION_RANGE_CHECK",
          style: {
            padding: "8px 12px",
            borderRadius: "12px",
            background: selected ? "#9d174d" : "#fff",
            color: selected ? "#fff" : compatible ? "#9d174d" : "#94a3b8",
            border: "1px solid " + (compatible ? "#9d174d" : "#cbd5e1"),
            fontSize: "11px",
            fontWeight: 700,
            cursor: compatible ? "pointer" : "not-allowed",
            textAlign: "left"
          }
        },
        /* @__PURE__ */ React.createElement("strong", null, g.label),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", fontWeight: 400, marginTop: "2px" } }, bounds[0], "-", bounds[1], " words", compatible ? "" : " (incompatible)")
      );
    }))), gc && gc.genre && /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.composition_label") || "Your composition",
        help: t("humanities.composition_help") || "Author the artifact. Word floor depends on your genre.",
        value: bodyText,
        onChange: setBodyText,
        rows: 12,
        max: 2e4,
        placeholder: t("humanities.composition_ph") || "Open with the contested question, name your stakes audience, develop your position with substrate links, and end with the Foreclosure Coda below."
      }
    ), gc && gc.genre && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8"
    } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px", fontSize: "13px", fontWeight: 800, color: "#9d174d" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F576}\uFE0F "), t("humanities.foreclosure_coda_title") || "Foreclosure Coda (auto-assembled, non-skippable)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px", fontSize: "11px", color: "#831843", lineHeight: 1.5 } }, t("humanities.foreclosure_coda_help") || "This is assembled from your positionality.obscuring, your absent voices, and your what-this-claim-does-not-speak-to entries. You can edit ABOVE and BELOW the anchored content but cannot remove it."), /* @__PURE__ */ React.createElement("pre", { style: {
      whiteSpace: "pre-wrap",
      fontFamily: "inherit",
      fontSize: "11px",
      color: "#1e293b",
      lineHeight: 1.5,
      margin: 0
    } }, foreclosureCoda || "(Coda will assemble when you have positionality + absent voices + claim-foreclosure entries.)")), gc && gc.genre && /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.acc_target_label") || "Public accountability target",
        help: t("humanities.acc_target_help") || "Who specifically will see this? (e.g. the school board; the principal Ms. Patel)",
        value: accTarget,
        onChange: setAccTarget,
        rows: 2,
        max: 300
      }
    ), gc && gc.genre && /* @__PURE__ */ React.createElement(
      TextareaCard,
      {
        t,
        label: t("humanities.acc_note_label") || "Public accountability note",
        help: t("humanities.acc_note_help") || "What does shipping this commit you to? (e.g. attending the next school board meeting)",
        value: accNote,
        onChange: setAccNote,
        rows: 2,
        max: 500
      }
    ), gc && gc.genre && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: saveComposition,
        style: {
          padding: "10px 18px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer"
        }
      },
      t("humanities.save_composition") || "Save composition v" + ((comps.length || 0) + 1)
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: busy,
        onClick: askMirror,
        style: {
          padding: "10px 18px",
          borderRadius: "999px",
          background: busy ? "#cbd5e1" : "#0d9488",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: busy ? "wait" : "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F916} "),
      busy ? t("humanities.mirroring") || "Mirroring\u2026" : t("humanities.mirror_button") || "Mirror my standpoint against my draft"
    ), latest && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: sendToStoryForge,
        title: t("humanities.send_to_storyforge_title") || "Saves your composition to this device. Note: StoryForge import is not available yet \u2014 this stages the data so a future StoryForge import can pick it up.",
        style: {
          padding: "10px 18px",
          borderRadius: "999px",
          background: "#7c3aed",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4DA} "),
      t("humanities.send_to_storyforge") || "Save for StoryForge"
    )), egress && egress.ok && /* @__PURE__ */ React.createElement("div", { role: "status", style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#f5f3ff",
      border: "1px solid #c4b5fd",
      fontSize: "11px",
      color: "#5b21b6",
      lineHeight: 1.5
    } }, /* @__PURE__ */ React.createElement("strong", null, "\u2705 ", t("humanities.egress_ok") || "Composition saved on this device."), " ", t("humanities.egress_ok_detail") || "Your composition (with standpoint, foreclosure coda, and provenance counts) is saved in this browser. StoryForge import isn\u2019t available yet \u2014 when it ships it will be able to pick this up. Your data stays on this device."), egress && !egress.ok && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef2f2",
      border: "1px solid #fca5a5",
      fontSize: "11px",
      color: "#7f1d1d"
    } }, t("humanities.egress_failed") || "Could not stage payload: ", " ", egress.error), aiResult && aiResult.blocked && /* @__PURE__ */ React.createElement(BlockedNote, { t, reason: aiResult.detail || aiResult.blockedReason }), aiResult && !aiResult.blocked && aiResult.data && /* @__PURE__ */ React.createElement(AiResultPanel, { t, data: aiResult.data, primitives, journal }));
  }
  function LaneRoot(props) {
    var ctx = props.ctx;
    var t = ctx.t;
    var journal = ctx.journal, setJournal = ctx.setJournal;
    var primitives = ctx.primitives;
    var activeStage = journal.activeStage || "frame_question";
    if (STAGE_KEYS.indexOf(activeStage) === -1) activeStage = "frame_question";
    var _loopback = useState(null);
    var loopback = _loopback[0];
    var setLoopback = _loopback[1];
    var jumpStage = useCallback(function(toStage, preloadChipId) {
      if (toStage === activeStage) return;
      var toIdx = STAGE_KEYS.indexOf(toStage);
      var fromIdx = STAGE_KEYS.indexOf(activeStage);
      if (toIdx === -1 || fromIdx === -1) return;
      if (toIdx < fromIdx) {
        setLoopback({ fromStage: activeStage, toStage, preloadChipId: preloadChipId || null });
        return;
      }
      setJournal(function(prev) {
        return Object.assign({}, prev, { activeStage: toStage });
      });
      announce((t("humanities.sr_now_on") || "Now on: ") + (STAGE_BY_KEY[toStage] && STAGE_BY_KEY[toStage].label || toStage), "polite");
    }, [activeStage]);
    var commitLoopBack = useCallback(function(payload) {
      var fromStage = loopback.fromStage, toStage = loopback.toStage;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.loopBacks = (prev.loopBacks || []).concat([{
          ts: Date.now(),
          fromStage,
          toStage,
          whyChipId: payload.whyChipId,
          why: payload.why || null
        }]);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var toIdx = STAGE_KEYS.indexOf(toStage);
        STAGE_KEYS.forEach(function(sk, idx) {
          if (idx > toIdx) {
            var sn = Object.assign({}, next.stageNotes[sk] || {});
            sn.supersededBy = { fromStage: toStage, ts: Date.now() };
            sn.acknowledgedSuperseded = false;
            next.stageNotes[sk] = sn;
          }
        });
        if (next.framings && next.framings.length) {
          next.framings = next.framings.map(function(f) {
            return Object.assign({}, f, { staleLabel: true });
          });
        }
        if (next.humanitiesPosition) {
          next.humanitiesPosition = Object.assign({}, next.humanitiesPosition, { staleLabel: true });
        }
        if (next.positionality && payload.whyChipId === "positionality_shift") {
          next.positionality = Object.assign({}, next.positionality, { staleLabel: true });
        }
        next.activeStage = toStage;
        next.pendingLoopReturn = { fromStage, ts: Date.now() };
        return next;
      });
      setLoopback(null);
      announce((t("humanities.sr_looped_back") || "Looped back to ") + (STAGE_BY_KEY[toStage] && STAGE_BY_KEY[toStage].label || toStage) + ". " + (t("humanities.sr_work_preserved") || "Your earlier work is preserved; you can return to where you were."), "polite");
    }, [loopback]);
    var returnToOrigin = useCallback(function() {
      if (!journal.pendingLoopReturn) return;
      var origin = journal.pendingLoopReturn.fromStage;
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.activeStage = origin;
        next.pendingLoopReturn = null;
        if (prev.loopBacks && prev.loopBacks.length) {
          var idx = prev.loopBacks.length - 1;
          next.loopBacks = prev.loopBacks.slice();
          next.loopBacks[idx] = Object.assign({}, prev.loopBacks[idx], {
            returnedToOrigin: { stage: origin, ts: Date.now() }
          });
        }
        return next;
      });
    }, [journal.pendingLoopReturn]);
    var stageNote = (journal.stageNotes || {})[activeStage] || {};
    var superseded = stageNote.supersededBy && !stageNote.acknowledgedSuperseded;
    var acknowledgeSuperseded = function() {
      setJournal(function(prev) {
        var next = Object.assign({}, prev);
        next.stageNotes = Object.assign({}, prev.stageNotes || {});
        var sn = Object.assign({}, next.stageNotes[activeStage] || {});
        sn.acknowledgedSuperseded = true;
        next.stageNotes[activeStage] = sn;
        return next;
      });
    };
    var onReturnToReckoning = function() {
      jumpStage("positionality_reckoning", "positionality_shift");
    };
    var laneCtx = Object.assign({}, ctx, {
      activeStage,
      ask: activeStage === "positionality_reckoning" ? null : ctx.ask
    });
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: ctx.onExitLane,
        style: {
          alignSelf: "flex-start",
          padding: "4px 10px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      "\u2190 ",
      t("humanities.back_to_hub_lanes") || "Choose a different lane"
    ), /* @__PURE__ */ React.createElement(EducatorPanel, { t }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      CycleWheel,
      {
        t,
        activeStage,
        onJump: jumpStage,
        journalStageNotes: journal.stageNotes || {},
        sourceCount: (journal.sources || []).length
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "200px" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "17px", fontWeight: 800, color: "#1e293b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, STAGE_BY_KEY[activeStage].icon + " "), STAGE_BY_KEY[activeStage].label), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.5 } }, t("humanities.stage_intro_" + activeStage) || ""))), /* @__PURE__ */ React.createElement(
      StageChipStrip,
      {
        t,
        activeStage,
        onJump: jumpStage,
        journalStageNotes: journal.stageNotes || {},
        sourceCount: (journal.sources || []).length
      }
    ), superseded && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      padding: "10px 14px",
      borderRadius: "10px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "12px",
      color: "#92400e",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A0\uFE0F "), t("humanities.superseded_banner") || "Your work here was written against earlier upstream content. The upstream changed; this is preserved as a record of your earlier thinking."), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: acknowledgeSuperseded,
        style: {
          padding: "4px 10px",
          borderRadius: "999px",
          background: "#fff",
          border: "1px solid #fbbf24",
          color: "#92400e",
          fontWeight: 700,
          fontSize: "11px",
          cursor: "pointer"
        }
      },
      t("humanities.acknowledge_superseded") || "I understand \u2014 keep as a record"
    )), journal.pendingLoopReturn && journal.pendingLoopReturn.fromStage !== activeStage && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: returnToOrigin,
        style: {
          alignSelf: "flex-start",
          padding: "8px 14px",
          borderRadius: "999px",
          background: "#be185d",
          color: "#fff",
          border: "none",
          fontWeight: 800,
          fontSize: "12px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(190,24,93,0.35)"
        }
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u21AA\uFE0F "),
      (t("humanities.return_to_where_i_was") || "Return to where I was: ") + (STAGE_BY_KEY[journal.pendingLoopReturn.fromStage] ? STAGE_BY_KEY[journal.pendingLoopReturn.fromStage].label : "")
    ), activeStage === "frame_question" && /* @__PURE__ */ React.createElement(FrameQuestionStage, { t, ctx: laneCtx }), activeStage === "sift_triage" && /* @__PURE__ */ React.createElement(SiftTriageStage, { t, ctx: laneCtx, onReturnToReckoning }), activeStage === "counter_framings" && /* @__PURE__ */ React.createElement(CounterFramingsStage, { t, ctx: laneCtx, onReturnToReckoning }), activeStage === "warrant_lab" && /* @__PURE__ */ React.createElement(WarrantLabStage, { t, ctx: laneCtx, onReturnToReckoning }), activeStage === "positionality_reckoning" && /* @__PURE__ */ React.createElement(PositionalityReckoningStage, { t, ctx: laneCtx }), activeStage === "genre_composition" && /* @__PURE__ */ React.createElement(GenreCompositionStage, { t, ctx: laneCtx, onReturnToReckoning }), /* @__PURE__ */ React.createElement("details", { style: {
      padding: "10px 14px",
      borderRadius: "12px",
      background: "#fdf2f8",
      border: "1px solid #fbcfe8"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#9d174d" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4DA} "), t("humanities.cross_cutting_exemplars_title") || "How is strong humanities work recognized? (cross-cutting examples)"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" } }, LOOP_REWARDING_EXEMPLARS.map(function(pair, i) {
      return /* @__PURE__ */ React.createElement(
        primitives.ExemplarPair,
        {
          key: i,
          t,
          criterion: pair.criterion,
          strongExample: pair.strongExample,
          weakExample: pair.weakExample,
          onJudgment: function() {
          }
        }
      );
    }))), loopback && /* @__PURE__ */ React.createElement(
      LoopBackPicker,
      {
        t,
        toStage: loopback.toStage,
        preloadChipId: loopback.preloadChipId,
        onCommit: commitLoopBack,
        onCancel: function() {
          setLoopback(null);
        }
      }
    ));
  }
  window.ResearchHub.registerLane("humanities", {
    label: "Humanities & Social Research",
    tagline: "Inquiry Studio",
    icon: "\u{1F4DA}",
    gradFrom: "from-rose-50",
    gradTo: "to-pink-50",
    border: "border-rose-600",
    titleColor: "text-rose-800",
    descColor: "text-rose-700",
    blurb: "Author a contestable question + name your standpoint, vet sources laterally before they can underwrite claims, surface counter-framings (no scholars, no quotes), build a Toulmin chain pressure-tested against framings, re-version your standpoint at the NO-AI reckoning stage, and ship in an op-ed / policy memo / civic-action statement / exhibit text with a non-skippable Foreclosure Coda. AI here asks adversarial questions only \u2014 it cannot draft, polish, or name scholars.",
    stages: STAGES,
    touchpoints: Object.keys(TOUCHPOINTS).map(function(k) {
      return TOUCHPOINTS[k];
    }),
    exemplarPairs: EXEMPLAR_PAIRS,
    crossCuttingExemplars: LOOP_REWARDING_EXEMPLARS,
    loopbackChips: LOOPBACK_CHIPS,
    framingTaxonomy: FRAMING_TAXONOMY,
    analogDomainTaxonomy: ANALOG_DOMAIN_TAXONOMY,
    render: function(ctx) {
      return /* @__PURE__ */ React.createElement(LaneRoot, { ctx });
    },
    __tier: 2
  });
  window.AlloModules.ResearchLaneHumanities = { __tier: 2, lane: "humanities" };
  console.log("[CDN] ResearchLaneHumanities registered (Tier 2)");
})();
