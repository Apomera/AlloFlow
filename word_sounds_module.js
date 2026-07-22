(function () {
  if (window.AlloModules && window.AlloModules.WordSoundsModal) {
    console.log("[CDN] WordSoundsModal already loaded, skipping duplicate");
  } else {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-word-sounds')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-word-sounds';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  // WCAG 4.1.3: announce dynamic outcomes to screen readers. Prefer the
  // project-standard host announcer (it owns its own polite region); otherwise
  // write to the dedicated region created above. Without this, correct/incorrect
  // feedback was visual + audio chime only and never reached AT users.
  function wsAnnounce(message) {
    if (!message) return;
    try {
      if (typeof window !== 'undefined' && typeof window.alloAnnounce === 'function') {
        window.alloAnnounce(String(message));
        return;
      }
      if (typeof document !== 'undefined') {
        var region = document.getElementById('allo-live-word-sounds');
        if (region) { region.textContent = ''; region.textContent = String(message); }
      }
    } catch (e) { /* announcement is best-effort */ }
  }

  // WCAG 2.1 AA: Accessibility CSS injection
  if (!document.getElementById('ws-a11y-css')) {
    var wsA11yStyle = document.createElement('style');
    wsA11yStyle.id = 'ws-a11y-css';
    wsA11yStyle.textContent = [
      '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
      // WCAG 1.4.3: Force AA-passing slate-600 (#475569 ≈ 7.42:1 on white) and gray-500 (#6b7280 ≈ 4.83:1) on Tailwind classes that otherwise fail.
      '.fixed.inset-0 .text-gray-400 { color: #6b7280 !important; }',
      '.fixed.inset-0 .text-slate-600 { color: #475569 !important; }',
      '/* Word Sounds celebration animations */',
      '@keyframes ws-confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(120px) rotate(720deg); opacity: 0; } }',
      '@keyframes ws-star-burst { 0% { transform: scale(0) rotate(0deg); opacity: 1; } 50% { transform: scale(1.5) rotate(180deg); opacity: 1; } 100% { transform: scale(0) rotate(360deg); opacity: 0; } }',
      '@keyframes ws-bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.3); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }',
      '@keyframes ws-glow-pulse { 0%, 100% { box-shadow: 0 0 8px rgba(74,222,128,0.3); } 50% { box-shadow: 0 0 24px rgba(74,222,128,0.6); } }',
      '@keyframes ws-streak-fire { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }',
      '@keyframes ws-float-up { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.5); opacity: 0; } }',
      '@keyframes ws-shake-correct { 0%, 100% { transform: rotate(0deg); } 15% { transform: rotate(-8deg); } 30% { transform: rotate(8deg); } 45% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } 75% { transform: rotate(-2deg); } }',
      '.ws-confetti { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: ws-confetti-fall 1.5s ease-out forwards; pointer-events: none; z-index: 100; }',
      '.ws-star { position: absolute; font-size: 20px; animation: ws-star-burst 0.8s ease-out forwards; pointer-events: none; z-index: 100; }',
      '.ws-bounce { animation: ws-bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }',
      '.ws-glow { animation: ws-glow-pulse 1.5s ease-in-out 2; }',
      '.ws-streak-bg { background: linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b, #ef4444); background-size: 200% 100%; animation: ws-streak-fire 1s linear infinite; }',
      '.ws-float-xp { animation: ws-float-up 1.2s ease-out forwards; pointer-events: none; position: absolute; z-index: 100; font-weight: 900; color: #fbbf24; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }',
      '.ws-correct-shake { animation: ws-shake-correct 0.5s ease-out; }',
    ].join('\n');
    document.head.appendChild(wsA11yStyle);
  }

  // ── Celebration Effects — confetti, stars, XP float for K-2 engagement ──
  function wsSpawnConfetti(count) {
    try {
      var container = document.querySelector('.fixed.inset-0') || document.body;
      var colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
      for (var i = 0; i < (count || 12); i++) {
        (function(delay) {
          setTimeout(function() {
            var el = document.createElement('div');
            el.className = 'ws-confetti';
            el.style.left = (10 + Math.random() * 80) + '%';
            el.style.top = '30%';
            el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            el.style.width = (6 + Math.random() * 6) + 'px';
            el.style.height = (6 + Math.random() * 6) + 'px';
            el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            container.appendChild(el);
            setTimeout(function() { try { el.remove(); } catch(e) {} }, 1600);
          }, delay);
        })(i * 40);
      }
    } catch(e) {}
  }
  function wsSpawnStars(count) {
    try {
      var container = document.querySelector('.fixed.inset-0') || document.body;
      var emojis = ['\u2B50', '\uD83C\uDF1F', '\u2728', '\uD83D\uDCAB'];
      for (var i = 0; i < (count || 5); i++) {
        (function(delay) {
          setTimeout(function() {
            var el = document.createElement('div');
            el.className = 'ws-star';
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            el.style.left = (20 + Math.random() * 60) + '%';
            el.style.top = (20 + Math.random() * 40) + '%';
            container.appendChild(el);
            setTimeout(function() { try { el.remove(); } catch(e) {} }, 900);
          }, delay);
        })(i * 100);
      }
    } catch(e) {}
  }
  function wsSpawnXPFloat(text, x, y) {
    try {
      var container = document.querySelector('.fixed.inset-0') || document.body;
      var el = document.createElement('div');
      el.className = 'ws-float-xp';
      el.textContent = text;
      el.style.left = (x || 50) + '%';
      el.style.top = (y || 40) + '%';
      el.style.fontSize = '18px';
      container.appendChild(el);
      setTimeout(function() { try { el.remove(); } catch(e) {} }, 1300);
    } catch(e) {}
  }

  // WCAG 2.4.3: Focus management for modal dialogs
  var _alloFocusTrigger = null;
  function alloSaveFocus() { _alloFocusTrigger = document.activeElement; }
  function alloRestoreFocus() { if (_alloFocusTrigger && typeof _alloFocusTrigger.focus === 'function') { try { _alloFocusTrigger.focus(); } catch(e) { console.warn("[WordSounds] silent catch:", e); } _alloFocusTrigger = null; } }

    // word_sounds_module.js
    // Auto-extracted from AlloFlowANTI.txt
    // Word Sounds Studio module for AlloFlow - loaded from GitHub CDN
    // Version: 1.0.0 (Feb 2026)
    const warnLog = (...args) => console.warn("[WS-WARN]", ...args);
    const debugLog = (...args) => {
      if (typeof console !== "undefined") console.log("[WS-DBG]", ...args);
    };
    // Maps each phoneme/letter to a concrete "key word" for Imagen generation
    // in AAC mode on the isolation activity (mirrors Jolly Phonics key-word approach).
    const PHONEME_KEYWORDS = {
      a: "apple", b: "ball", c: "cat", d: "dog", e: "egg",
      f: "fish", g: "goat", h: "hat", i: "igloo", j: "jet",
      k: "kite", l: "lion", m: "moon", n: "nest", o: "octopus",
      p: "pig", q: "queen", r: "ring", s: "sun", t: "tree",
      u: "umbrella", v: "van", w: "web", x: "fox", y: "yarn",
      z: "zebra",
      sh: "ship", ch: "chair", th: "thumb", wh: "whale",
      ng: "ring", ck: "duck", ph: "phone", oo: "moon", ee: "bee",
      ai: "rain", ay: "play", oa: "boat", ow: "owl", ou: "cloud",
    };

    // ═══════════════════════════════════════════════════════════════
    // GRAPHOPHONEME_ANCHORS — explicit letter ↔ sound pairing for the
    // persistent anchor strip rendered alongside isolation, blending,
    // manipulation, rhyme, syllable, sound-sort drills. The anchor
    // closes the transfer gap from pure phonological awareness to
    // decoding by keeping the grapheme, key word, IPA symbol, and
    // sample sentence visible while the student works the activity.
    //
    // Built from PHONEME_KEYWORDS so existing AAC mode (Jolly-Phonics
    // style key-word images) reuses the same keyword table.
    //
    // Shape per entry:
    //   graphemes:        array of grapheme spellings for this sound
    //                     (primary first, variants after)
    //   keyWord:          short word containing the target grapheme
    //   ipa:              IPA symbol used by IPA_TO_AUDIO lookups
    //   sample:           sample sentence using the key word
    //   sampleHighlight:  [start, end] char indices to bold the target
    //                     letters inside the sample (for the anchor UI)
    //   rule:             optional pedagogical rule (hard/soft c, etc.)
    //   note:             optional teacher-facing pedagogy note
    // ═══════════════════════════════════════════════════════════════
    const GRAPHOPHONEME_ANCHORS = {
      // ── Single consonants ──
      a:  { graphemes: ["a"],  keyWord: "apple",    ipa: "æ",  sample: "The apple is red.",           sampleHighlight: [4, 5] },
      b:  { graphemes: ["b", "bb"], keyWord: "ball", ipa: "b", sample: "The ball is round.",          sampleHighlight: [4, 5] },
      c:  { graphemes: ["c"],  keyWord: "cat",      ipa: "k",  sample: "A cat sat on the mat.",      sampleHighlight: [2, 3],
            rule: "Hard c (sounds like /k/) before a, o, u, or consonants.",
            note: "Pair with the soft-c anchor (cent, city) for older students." },
      d:  { graphemes: ["d", "dd"], keyWord: "dog", ipa: "d",  sample: "My dog can run fast.",       sampleHighlight: [3, 4] },
      e:  { graphemes: ["e"],  keyWord: "egg",      ipa: "ɛ",  sample: "The egg is in the nest.",    sampleHighlight: [4, 5] },
      f:  { graphemes: ["f", "ff", "ph"], keyWord: "fish", ipa: "f", sample: "A fish swims fast.",   sampleHighlight: [2, 3] },
      g:  { graphemes: ["g", "gg"], keyWord: "goat", ipa: "g", sample: "The goat ate the grass.",    sampleHighlight: [4, 5],
            rule: "Hard g before a, o, u, or consonants.",
            note: "Pair with soft-g anchor (gem, giant) for older students." },
      h:  { graphemes: ["h"],  keyWord: "hat",      ipa: "h",  sample: "My hat is on my head.",      sampleHighlight: [3, 4] },
      i:  { graphemes: ["i"],  keyWord: "igloo",    ipa: "ɪ",  sample: "An igloo is made of ice.",   sampleHighlight: [3, 4] },
      j:  { graphemes: ["j"],  keyWord: "jet",      ipa: "ʤ",  sample: "The jet flies high.",        sampleHighlight: [4, 5] },
      k:  { graphemes: ["k"],  keyWord: "kite",     ipa: "k",  sample: "My kite is in the sky.",     sampleHighlight: [3, 4] },
      l:  { graphemes: ["l", "ll"], keyWord: "lion", ipa: "l", sample: "The lion is brave.",         sampleHighlight: [4, 5] },
      m:  { graphemes: ["m", "mm"], keyWord: "moon", ipa: "m", sample: "The moon is bright.",        sampleHighlight: [4, 5] },
      n:  { graphemes: ["n", "nn"], keyWord: "nest", ipa: "n", sample: "The nest is in the tree.",   sampleHighlight: [4, 5] },
      o:  { graphemes: ["o"],  keyWord: "octopus",  ipa: "ɒ",  sample: "The octopus has eight arms.", sampleHighlight: [4, 5] },
      p:  { graphemes: ["p", "pp"], keyWord: "pig", ipa: "p",  sample: "The pig is pink.",           sampleHighlight: [4, 5] },
      q:  { graphemes: ["q", "qu"], keyWord: "queen", ipa: "k", sample: "The queen sits on a chair.", sampleHighlight: [4, 5],
            note: "q is almost always followed by u in English." },
      r:  { graphemes: ["r", "rr"], keyWord: "ring", ipa: "r", sample: "The ring is gold.",          sampleHighlight: [4, 5] },
      s:  { graphemes: ["s", "ss"], keyWord: "sun", ipa: "s",  sample: "The sun is hot.",            sampleHighlight: [4, 5] },
      t:  { graphemes: ["t", "tt"], keyWord: "tree", ipa: "t", sample: "The tree is tall.",          sampleHighlight: [4, 5] },
      u:  { graphemes: ["u"],  keyWord: "umbrella", ipa: "ʌ",  sample: "I use an umbrella in the rain.", sampleHighlight: [9, 10] },
      v:  { graphemes: ["v"],  keyWord: "van",      ipa: "v",  sample: "The van is fast.",           sampleHighlight: [4, 5] },
      w:  { graphemes: ["w"],  keyWord: "web",      ipa: "w",  sample: "The spider made a web.",     sampleHighlight: [19, 20] },
      x:  { graphemes: ["x"],  keyWord: "fox",      ipa: "ks", sample: "The fox runs quickly.",      sampleHighlight: [6, 7] },
      y:  { graphemes: ["y"],  keyWord: "yarn",     ipa: "j",  sample: "The yarn is soft.",          sampleHighlight: [4, 5] },
      z:  { graphemes: ["z", "zz"], keyWord: "zebra", ipa: "z", sample: "The zebra has stripes.",    sampleHighlight: [4, 5] },
      // ── Digraphs and trigraphs ──
      sh: { graphemes: ["sh", "ti", "ci", "ssi"], keyWord: "ship", ipa: "ʃ", sample: "The ship sails on the sea.",   sampleHighlight: [4, 6],
            note: "Multi-grapheme phoneme. Common in -tion (action) and -cian (musician) endings." },
      ch: { graphemes: ["ch", "tch"], keyWord: "chair", ipa: "ʧ", sample: "The chair is by the table.",              sampleHighlight: [4, 6],
            rule: "Use tch after a short vowel (catch, watch, witch).",
            note: "ch can also say /k/ in Greek words (school, chorus) and /sh/ in French (chef)." },
      th: { graphemes: ["th"], keyWord: "thumb", ipa: "θ", sample: "I hurt my thumb.",                                sampleHighlight: [12, 14],
            note: "th has TWO sounds: voiceless (thumb, thin) and voiced (this, that). Both spelled the same." },
      wh: { graphemes: ["wh"], keyWord: "whale", ipa: "w", sample: "The whale swims in the ocean.",                   sampleHighlight: [4, 6],
            note: "In most American English, wh sounds the same as w. Historically /hw/." },
      ng: { graphemes: ["ng"], keyWord: "ring", ipa: "ŋ", sample: "The bell rings loudly.",                           sampleHighlight: [9, 11],
            note: "Always appears at the end of a syllable. Never starts a word in English." },
      ck: { graphemes: ["ck"], keyWord: "duck", ipa: "k", sample: "The duck swims on the pond.",                      sampleHighlight: [6, 8],
            rule: "Use ck after a short vowel at the end of a one-syllable word (back, duck, sock)." },
      ph: { graphemes: ["ph"], keyWord: "phone", ipa: "f", sample: "The phone is ringing.",                           sampleHighlight: [4, 6],
            note: "Greek-origin spelling for /f/. Other examples: graph, photo, dolphin." },
      // ── Long vowels and vowel teams ──
      oo: { graphemes: ["oo", "u_e", "ew", "ue"], keyWord: "moon", ipa: "u", sample: "The moon shines at night.",     sampleHighlight: [4, 6],
            note: "oo has TWO sounds: long /u/ (moon, food) and short /ʊ/ (book, foot)." },
      ee: { graphemes: ["ee", "ea", "y", "e_e", "ie"], keyWord: "bee", ipa: "i", sample: "A bee buzzes in the garden.", sampleHighlight: [2, 4],
            note: "Long e has many spellings. Most common: ee, ea, y (at end of word)." },
      ai: { graphemes: ["ai", "ay", "a_e", "eigh"], keyWord: "rain", ipa: "e", sample: "The rain falls on the roof.", sampleHighlight: [4, 6],
            rule: "Use ai in the middle of a word, ay at the end (rain / play)." },
      ay: { graphemes: ["ay", "ai", "a_e", "eigh"], keyWord: "play", ipa: "e", sample: "Let's play in the park.",     sampleHighlight: [6, 8],
            rule: "Use ay at the end of a word or syllable (play, today)." },
      oa: { graphemes: ["oa", "o_e", "ow", "oe"], keyWord: "boat", ipa: "o", sample: "The boat floats on the lake.",   sampleHighlight: [4, 6],
            rule: "Use oa in the middle of a word, ow often at the end (boat / snow)." },
      ow: { graphemes: ["ow", "ou"], keyWord: "owl", ipa: "aʊ", sample: "An owl hoots at night.",                      sampleHighlight: [3, 5],
            note: "ow has TWO sounds: /aʊ/ (owl, cow) and /o/ (snow, low). Context determines which." },
      ou: { graphemes: ["ou", "ow"], keyWord: "cloud", ipa: "aʊ", sample: "The cloud is white and fluffy.",            sampleHighlight: [4, 6],
            rule: "Use ou in the middle of a word, ow often at the end (cloud / cow)." },
    };

    // Soft-c and soft-g paired anchors (used for the multi-phoneme grapheme
    // explorer in older-student mode).
    const GRAPHEME_RULE_PAIRS = {
      c: {
        hard: { ipa: "k", keyWord: "cat",  context: "before a, o, u, or consonants", examples: ["cat", "cot", "cup", "club"] },
        soft: { ipa: "s", keyWord: "cent", context: "before e, i, y",                 examples: ["cent", "city", "cycle", "ice"] },
      },
      g: {
        hard: { ipa: "g", keyWord: "goat", context: "before a, o, u, or consonants", examples: ["goat", "got", "gum", "glad"] },
        soft: { ipa: "ʤ", keyWord: "gem",  context: "before e, i, y (usually)",      examples: ["gem", "giant", "gym", "page"] },
      },
    };

    // Mastery-driven anchor visibility default. Reads/writes the user's preference
    // from localStorage so the setting persists across sessions.
    const ANCHOR_MODE_STORAGE_KEY = "allo_word_sounds_anchor_mode_v1";
    function getStoredAnchorMode() {
      try {
        const v = (typeof localStorage !== "undefined") ? localStorage.getItem(ANCHOR_MODE_STORAGE_KEY) : null;
        if (v === "full" || v === "compact" || v === "hidden") return v;
      } catch (_) {}
      return "full";
    }
    function setStoredAnchorMode(mode) {
      try {
        if (typeof localStorage !== "undefined") localStorage.setItem(ANCHOR_MODE_STORAGE_KEY, mode);
      } catch (_) {}
    }

    // Look up the anchor for a given target. Accepts a single letter
    // ("m"), a digraph ("sh"), or a whole word in which case it derives
    // the first-letter anchor as a safe fallback. Returns null if no
    // anchor data exists.
    function getAnchor(target) {
      if (!target || typeof target !== "string") return null;
      const t = target.toLowerCase().trim();
      if (GRAPHOPHONEME_ANCHORS[t]) return GRAPHOPHONEME_ANCHORS[t];
      // Try digraph match on a 2-letter prefix or first character
      if (t.length >= 2 && GRAPHOPHONEME_ANCHORS[t.slice(0, 2)]) return GRAPHOPHONEME_ANCHORS[t.slice(0, 2)];
      if (GRAPHOPHONEME_ANCHORS[t[0]]) return GRAPHOPHONEME_ANCHORS[t[0]];
      return null;
    }

    // Render the persistent anchor strip above an activity drill.
    // Props:
    //   target     — grapheme/letter to anchor (e.g. "m", "sh", "ai")
    //   mode       — "full" | "compact" | "hidden" (controlled by parent)
    //   onModeChange  — (newMode) => void; persisted to localStorage
    //   onPlaySound   — () => void; play the phoneme audio (delegates to
    //                   the existing IPA_TO_AUDIO + onPlayAudio infra)
    //   onShowMultiSpelling — optional, opens multi-grapheme explorer
    //
    // Returns a React.createElement tree using the existing inline
    // compiled-JSX style of this module.
    function AnchorStrip(props) {
      const target = props.target;
      const mode = props.mode || "full";
      if (mode === "hidden" || !target) return null;
      const anchor = getAnchor(target);
      if (!anchor) return null;
      const handleModeToggle = () => {
        const next = mode === "full" ? "compact" : "full";
        if (typeof props.onModeChange === "function") props.onModeChange(next);
      };
      const handleHide = () => {
        if (typeof props.onModeChange === "function") props.onModeChange("hidden");
      };
      const handlePlay = () => {
        if (typeof props.onPlaySound === "function") props.onPlaySound(((anchor.graphemes && anchor.graphemes[0]) || target), anchor.keyWord);
      };
      const hasMultiSpellings = (anchor.graphemes || []).length > 1;
      const primaryGrapheme = (anchor.graphemes && anchor.graphemes[0]) || target;
      // ── COMPACT MODE ──
      if (mode === "compact") {
        return React.createElement(
          "div",
          {
            role: "region",
            "aria-label": (ts("word_sounds.anchor_compact_letter") || "Anchor: letter ") + primaryGrapheme + (ts("word_sounds.anchor_compact_says") || " says ") + anchor.ipa + (ts("word_sounds.anchor_compact_like") || ", like ") + anchor.keyWord,
            className: "mx-auto mb-3 flex items-center gap-3 px-4 py-2 rounded-full bg-amber-50 border-2 border-amber-300 shadow-sm max-w-md",
          },
          React.createElement(
            "div",
            { className: "flex items-center gap-1 font-black text-xl text-amber-700", "aria-hidden": "true" },
            primaryGrapheme.toUpperCase(),
            React.createElement("span", { className: "text-slate-700" }, "/"),
            primaryGrapheme,
          ),
          React.createElement("span", { className: "text-amber-800 font-mono text-sm", "aria-hidden": "true" }, "/" + anchor.ipa + "/"),
          React.createElement("span", { className: "text-slate-700 text-sm font-semibold" }, (ts("word_sounds.anchor_like") || "like ") + anchor.keyWord),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handlePlay,
              "aria-label": (ts("word_sounds.anchor_hear_sound") || "Hear the sound ") + anchor.ipa,
              className: "ml-auto p-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
            },
            "🔊",
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleModeToggle,
              "aria-label": ts("word_sounds.anchor_expand") || "Expand anchor",
              className: "p-1.5 rounded-full hover:bg-amber-100 text-amber-600 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
            },
            "⇲",
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: handleHide,
              "aria-label": ts("word_sounds.anchor_hide") || "Hide anchor",
              className: "p-1.5 rounded-full hover:bg-slate-100 text-slate-700 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            },
            "×",
          ),
        );
      }
      // ── FULL MODE ──
      const sampleStart = (anchor.sampleHighlight && anchor.sampleHighlight[0]) || 0;
      const sampleEnd   = (anchor.sampleHighlight && anchor.sampleHighlight[1]) || 0;
      const sampleBefore = anchor.sample.slice(0, sampleStart);
      const sampleHi     = anchor.sample.slice(sampleStart, sampleEnd);
      const sampleAfter  = anchor.sample.slice(sampleEnd);
      // Apply an error-remediation highlight ring when the parent signals
      // a recent incorrect answer. The `ws-glow` keyframe is already defined
      // in the existing celebration CSS at the top of this module, and the
      // global prefers-reduced-motion rule disables animations for users
      // with vestibular concerns.
      const errorFlash = !!props.errorFlash;
      const flashClasses = errorFlash
        ? " ring-4 ring-red-400 ring-offset-2 ws-correct-shake"
        : "";
      return React.createElement(
        "div",
        {
          role: "region",
          "aria-label": (ts("word_sounds.anchor_card_for_sound") || "Anchor card for the sound ") + anchor.ipa + (ts("word_sounds.anchor_card_spelled") || ", spelled ") + primaryGrapheme + (ts("word_sounds.anchor_card_like_word") || ", like the word ") + anchor.keyWord + (errorFlash ? (ts("word_sounds.anchor_reviewing") || ". Reviewing this letter sound.") : ""),
          "aria-live": errorFlash ? "polite" : undefined,
          className: "mx-auto mb-4 max-w-2xl rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-md overflow-hidden transition-all" + flashClasses,
        },
        // Header row
        React.createElement(
          "div",
          { className: "flex items-center justify-between px-4 py-1.5 bg-amber-100 border-b border-amber-200" },
          React.createElement(
            "span",
            { className: "text-[11px] font-bold text-amber-800 uppercase tracking-wider" },
            ts("word_sounds.anchor_badge") || "Anchor",
          ),
          React.createElement(
            "div",
            { className: "flex items-center gap-1" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleModeToggle,
                "aria-label": ts("word_sounds.anchor_switch_compact") || "Switch to compact anchor view",
                className: "px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 hover:bg-amber-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
              },
              ts("word_sounds.anchor_compact_btn") || "Compact",
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: handleHide,
                "aria-label": ts("word_sounds.anchor_hide") || "Hide anchor",
                className: "px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
              },
              ts("word_sounds.anchor_hide_btn") || "Hide",
            ),
          ),
        ),
        // Body grid: letter card on left, info on right
        React.createElement(
          "div",
          { className: "flex items-stretch gap-4 p-4" },
          // Letter card (upper/lower stacked)
          React.createElement(
            "div",
            {
              className: "flex flex-col items-center justify-center px-4 py-3 rounded-xl bg-white border-2 border-amber-400 shadow-inner min-w-[88px]",
              "aria-hidden": "true",
            },
            React.createElement("div", { className: "font-black text-4xl text-amber-700 leading-none" }, primaryGrapheme.toUpperCase()),
            React.createElement("div", { className: "h-px w-8 bg-amber-300 my-1" }),
            React.createElement("div", { className: "font-black text-4xl text-amber-700 leading-none" }, primaryGrapheme),
          ),
          // Info column
          React.createElement(
            "div",
            { className: "flex-1 flex flex-col gap-2 min-w-0" },
            React.createElement(
              "div",
              { className: "flex items-center gap-2 flex-wrap" },
              React.createElement("span", { className: "text-[11px] font-bold text-slate-700 uppercase" }, ts("word_sounds.anchor_key_word") || "Key word:"),
              React.createElement("span", { className: "text-base font-bold text-slate-800" }, anchor.keyWord),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handlePlay,
                  "aria-label": (ts("word_sounds.anchor_hear_sound") || "Hear the sound ") + anchor.ipa + (ts("word_sounds.anchor_in_the_word") || " in the word ") + anchor.keyWord,
                  className: "ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                },
                "🔊 ",
                React.createElement("span", { className: "font-mono" }, "/" + anchor.ipa + "/"),
              ),
            ),
            React.createElement(
              "p",
              { className: "text-sm text-slate-700 leading-relaxed" },
              sampleBefore,
              React.createElement(
                "strong",
                {
                  className: "px-1 py-0.5 rounded bg-amber-200 text-amber-900 font-black",
                  "aria-label": (ts("word_sounds.anchor_highlighted") || "highlighted: ") + sampleHi,
                },
                sampleHi,
              ),
              sampleAfter,
            ),
            anchor.rule
              ? React.createElement(
                  "div",
                  { className: "text-[11px] text-slate-700 italic flex items-start gap-1" },
                  React.createElement("span", { "aria-hidden": "true" }, "📐"),
                  React.createElement("span", null, anchor.rule),
                )
              : null,
            hasMultiSpellings
              ? React.createElement(
                  "div",
                  { className: "flex flex-wrap items-center gap-1 mt-1" },
                  React.createElement("span", { className: "text-[10px] font-bold text-slate-700 uppercase mr-1" }, ts("word_sounds.anchor_other_spellings") || "Other spellings:"),
                  ...anchor.graphemes.slice(1).map((g, i) =>
                    React.createElement(
                      "span",
                      { key: "g-" + i, className: "px-1.5 py-0.5 rounded bg-white border border-amber-300 text-amber-700 text-xs font-mono font-bold" },
                      g,
                    ),
                  ),
                )
              : null,
          ),
        ),
        anchor.note
          ? React.createElement(
              "div",
              { className: "px-4 py-2 bg-amber-100/60 border-t border-amber-200 text-[11px] text-slate-700" },
              React.createElement("span", { className: "font-bold mr-1" }, ts("word_sounds.anchor_teacher_note") || "Teacher note:"),
              anchor.note,
            )
          : null,
      );
    }
    // Expose for external use (teacher dashboard, parent mode, future tools)
    window.__alloAnchor = { getAnchor: getAnchor, GRAPHOPHONEME_ANCHORS: GRAPHOPHONEME_ANCHORS, GRAPHEME_RULE_PAIRS: GRAPHEME_RULE_PAIRS };
    // ── HOMOPHONE GUARD ──
    // Blend-Sounds / Syllable-Blending presents the target word spoken and then
    // asks students to pick the matching written word. If a distractor SOUNDS
    // identical to the target (e.g., "wail" for "whale"), the item becomes
    // unanswerable by ear. Gemini will sometimes pick homophones because they
    // share syllable count and topic feel. This curated table lets us detect
    // the common pairs locally; the prompt is also strengthened to avoid them.
    // Keys and values are lowercase. Keep additions mutually consistent — any
    // two words that share a pronunciation belong in the same cluster.
    const HOMOPHONE_CLUSTERS = [
      ["ate", "eight"],
      ["bare", "bear"],
      ["be", "bee"],
      ["blew", "blue"],
      ["board", "bored"],
      ["brake", "break"],
      ["buy", "by", "bye"],
      ["cell", "sell"],
      ["cent", "scent", "sent"],
      ["dear", "deer"],
      ["die", "dye"],
      ["eye", "i"],
      ["fair", "fare"],
      ["feat", "feet"],
      ["flour", "flower"],
      ["flu", "flew"],
      ["for", "four", "fore"],
      ["grate", "great"],
      ["hair", "hare"],
      ["hear", "here"],
      ["heard", "herd"],
      ["heel", "heal"],
      ["hi", "high"],
      ["hoarse", "horse"],
      ["hole", "whole"],
      ["hour", "our"],
      ["knead", "need"],
      ["knight", "night"],
      ["knot", "not"],
      ["know", "no"],
      ["made", "maid"],
      ["mail", "male"],
      ["meat", "meet"],
      ["one", "won"],
      ["pair", "pare", "pear"],
      ["peace", "piece"],
      ["plain", "plane"],
      ["read", "red"],
      ["right", "write"],
      ["road", "rode", "rowed"],
      ["role", "roll"],
      ["rose", "rows"],
      ["sail", "sale"],
      ["scene", "seen"],
      ["sea", "see"],
      ["so", "sew", "sow"],
      ["son", "sun"],
      ["stair", "stare"],
      ["steal", "steel"],
      ["tail", "tale"],
      ["their", "there", "they're"],
      ["threw", "through"],
      ["throne", "thrown"],
      ["tide", "tied"],
      ["to", "too", "two"],
      ["toe", "tow"],
      ["wail", "whale"],
      ["waist", "waste"],
      ["wait", "weight"],
      ["way", "weigh"],
      ["weak", "week"],
      ["wear", "where"],
      ["which", "witch"],
      ["wood", "would"],
      ["your", "you're"],
      ["bail", "bale"],
      ["ball", "bawl"],
      ["beat", "beet"],
      ["knew", "new"],
      ["pole", "poll"],
      ["pray", "prey"],
      ["rain", "reign", "rein"],
      ["sole", "soul"],
      ["tea", "tee"],
    ];
    // Build lookup: word -> cluster-index for O(1) homophone checks.
    const HOMOPHONE_INDEX = (function () {
      const idx = Object.create(null);
      for (let ci = 0; ci < HOMOPHONE_CLUSTERS.length; ci++) {
        const cluster = HOMOPHONE_CLUSTERS[ci];
        for (let wi = 0; wi < cluster.length; wi++) {
          idx[cluster[wi]] = ci;
        }
      }
      return idx;
    })();
    // Catches the regular single-syllable long-A rimes the curated list
    // can't enumerate (bail/bale, mail/male, main/mane, plain/plane, ...).
    // The onset must be vowel-free, which guarantees a single syllable, so
    // this can never fire on words like 'captain' or 'private'; and within
    // a single syllable ail/ale and ain/ane are always the same sound, so
    // there are no false positives inside the pattern.
    const regularSoundKey = (w) => {
      const m = w.match(/^([^aeiou]+)(ail|ale|ain|ane)$/);
      if (!m) return w;
      return m[1] + (m[2] === 'ail' || m[2] === 'ale' ? '~AL' : '~AN');
    };
    const isHomophone = (a, b) => {
      if (!a || !b) return false;
      const na = String(a).trim().toLowerCase();
      const nb = String(b).trim().toLowerCase();
      if (!na || !nb) return false;
      if (na === nb) return true; // same word counts as blocked too
      const ia = HOMOPHONE_INDEX[na];
      const ib = HOMOPHONE_INDEX[nb];
      if (ia !== undefined && ia === ib) return true;
      const ka = regularSoundKey(na);
      return ka !== na && ka === regularSoundKey(nb);
    };
    // Rhyme Time variety: pick a RANDOM rhyming family member as the correct
    // answer instead of always the same one, so it isn't predictable across
    // items (mail/snail/trail/pale/scale rather than always 'mail'). The rime
    // guard (candidates must share the known-good rhyme's spelling rime) means
    // this can never turn a non-rhyme into the 'correct' answer.
    const pickVariedRhyme = (family, knownGood, target) => {
      if (!knownGood) return knownGood;
      const kg = String(knownGood).toLowerCase();
      const tgt = String(target || '').toLowerCase();
      const rimeOf = (w) => { const s = String(w || '').toLowerCase(); return s.length >= 2 ? s.slice(-2) : s; };
      const gr = rimeOf(kg);
      const cands = (Array.isArray(family) ? family : [])
        .map((w) => String(w || '').toLowerCase())
        .filter((w) => w && w !== tgt && rimeOf(w) === gr);
      if (kg !== tgt && cands.indexOf(kg) === -1) cands.push(kg);
      if (cands.length === 0) return knownGood;
      return cands[Math.floor(Math.random() * cands.length)];
    };
    // ── PHONEME EQUIVALENCE ──
    // Find Sounds (isolation) presents a target phoneme audibly and asks the
    // child to pick the matching grapheme. If two answer choices SPELL the
    // same phoneme differently (e.g., "c" and "k" both saying /k/), the item
    // has multiple correct-sounding answers and becomes unsolvable by ear.
    // This table groups graphemes that share an unambiguous default phoneme
    // in American English. Deliberately conservative — only graphemes that
    // reliably produce the same sound outside rare contexts. phonemeKey()
    // returns the shared phoneme label so two spellings collapse to one key
    // during option dedup.
    const SAME_PHONEME_CLUSTERS = [
      { phoneme: "/k/",  graphemes: ["k", "c", "ck", "q"] },
      { phoneme: "/f/",  graphemes: ["f", "ph"] },
      { phoneme: "/w/",  graphemes: ["w", "wh"] },
      { phoneme: "/oi/", graphemes: ["oi", "oy"] },
      { phoneme: "/ur/", graphemes: ["er", "ir", "ur"] },
      { phoneme: "/aw/", graphemes: ["aw", "au"] },
      { phoneme: "/ay/", graphemes: ["ai", "ay"] },
      { phoneme: "/ee/", graphemes: ["ee", "ea"] },
      { phoneme: "/oh/", graphemes: ["oa", "oe"] },
    ];
    const PHONEME_KEY_OF = (function () {
      const map = Object.create(null);
      for (const cluster of SAME_PHONEME_CLUSTERS) {
        for (const g of cluster.graphemes) map[g] = cluster.phoneme;
      }
      return map;
    })();
    // Returns a stable key representing the sound this grapheme makes. Two
    // graphemes in the same cluster return the same key so Set-based dedup
    // treats them as one option. Graphemes not in any cluster key by themselves.
    const phonemeKey = (grapheme) => {
      if (!grapheme) return "";
      const g = String(grapheme).trim().toLowerCase();
      return PHONEME_KEY_OF[g] || g;
    };
    // Resolved at RENDER time, not module-load time: CDN module fetch order is
    // network-dependent, so capturing window.WordSoundsReviewPanel once at IIFE
    // evaluation permanently froze the "loading..." fallback whenever this
    // module finished loading before misc_components. The fallback also keeps a
    // Start button usable so nobody is ever hard-stuck on it.
    const WordSoundsReviewPanel = (props) => {
      const Impl = window.WordSoundsReviewPanel;
      if (typeof Impl === "function") return React.createElement(Impl, props);
      return React.createElement(
        "div",
        { className: "p-6 text-center text-slate-600 text-sm space-y-3" },
        React.createElement("div", null, "📋 Review Panel (loading...)"),
        React.createElement(
          "button",
          {
            onClick: props.onStartActivity,
            className:
              "px-4 py-2 bg-violet-600 text-white font-bold rounded-lg text-sm hover:bg-violet-700",
          },
          "Start Activity",
        ),
      );
    };
    const loadWordAudioBank =
      typeof window.loadWordAudioBank === "function"
        ? window.loadWordAudioBank
        : () => {
          debugLog("loadWordAudioBank stub (CDN)");
        };
    const loadAudioFromStorage =
      typeof window.loadAudioFromStorage === "function"
        ? window.loadAudioFromStorage
        : (key) => {
          try {
            return localStorage.getItem("alloflow_audio_" + key) || null;
          } catch (e) {
            return null;
          }
        };
    const saveAudioToStorage =
      typeof window.saveAudioToStorage === "function"
        ? window.saveAudioToStorage
        : (key, val) => {
          try {
            localStorage.setItem("alloflow_audio_" + key, val);
          } catch (e) { console.warn("[WordSounds] silent catch:", e); }
        };
    // Bound here so handleRegenerateWord (line ~6583) actually has a
    // function to call. Without this, the typeof-guard there short-
    // circuited and the localStorage entry "alloflow_audio_<word>" was
    // never cleared on regenerate — handleAudio's loadAudioFromStorage
    // path then returned the OLD URL, so the student heard the same
    // TTS clip even though every other cache had been wiped.
    const removeAudioFromStorage =
      typeof window.removeAudioFromStorage === "function"
        ? window.removeAudioFromStorage
        : (key) => {
          try {
            localStorage.removeItem("alloflow_audio_" + key);
          } catch (e) { console.warn("[WordSounds] silent catch:", e); }
        };
    // Loads the fixed (non-AI-generated) probe item banks. NOTE: the effort to
    // finalize stable, always-the-same probe banks is still IN PROGRESS, so on
    // the CDN build this is a no-op stub and the banks may be unpopulated.
    const loadProbeBanks =
      typeof window.loadProbeBanks === "function"
        ? window.loadProbeBanks
        : () => {
          debugLog("loadProbeBanks stub (CDN)");
        };
    const ts = typeof window.ts === "function" ? window.ts : (key) => key;

    // === CDN crash fixes: constants defined in parent monolith ===
    const SOUND_MATCH_POOL = [
      "bat",
      "bed",
      "big",
      "bib",
      "bud",
      "bus",
      "but",
      "bag",
      "ban",
      "bit",
      "cat",
      "cap",
      "cup",
      "cut",
      "cob",
      "cub",
      "cab",
      "kit",
      "kid",
      "dog",
      "den",
      "did",
      "dip",
      "dug",
      "dim",
      "dot",
      "dam",
      "dub",
      "fan",
      "fin",
      "fix",
      "fog",
      "fun",
      "fig",
      "fit",
      "fat",
      "fib",
      "fox",
      "gum",
      "gas",
      "got",
      "gut",
      "gap",
      "gab",
      "gig",
      "gob",
      "hat",
      "hen",
      "him",
      "hit",
      "hop",
      "hot",
      "hug",
      "hum",
      "hut",
      "hub",
      "jet",
      "jab",
      "jam",
      "jig",
      "jog",
      "jot",
      "jug",
      "jut",
      "leg",
      "let",
      "lid",
      "lip",
      "lit",
      "log",
      "lot",
      "lug",
      "map",
      "mat",
      "men",
      "met",
      "mix",
      "mob",
      "mom",
      "mop",
      "mud",
      "mug",
      "nab",
      "nag",
      "nap",
      "net",
      "nip",
      "nod",
      "not",
      "nun",
      "nut",
      "pig",
      "pan",
      "pat",
      "peg",
      "pen",
      "pet",
      "pin",
      "pit",
      "pod",
      "pop",
      "pot",
      "pub",
      "pun",
      "pup",
      "put",
      "rag",
      "ram",
      "ran",
      "rap",
      "rat",
      "red",
      "rib",
      "rid",
      "rig",
      "rim",
      "rip",
      "rob",
      "rod",
      "rot",
      "rub",
      "rug",
      "run",
      "rut",
      "sat",
      "set",
      "sip",
      "sit",
      "six",
      "sob",
      "sod",
      "sub",
      "sum",
      "sun",
      "tab",
      "tag",
      "tan",
      "tap",
      "ten",
      "tin",
      "tip",
      "top",
      "tot",
      "tub",
      "tug",
      "van",
      "vat",
      "vet",
      "vim",
      "vow",
      "wag",
      "web",
      "wed",
      "wig",
      "win",
      "wit",
      "wok",
      "won",
      "yak",
      "yam",
      "yap",
      "yes",
      "yet",
      "zap",
      "zen",
      "zip",
      "zoo",
      "box",
      "wax",
      "ship",
      "shop",
      "shed",
      "shin",
      "shut",
      "shot",
      "shell",
      "fish",
      "dish",
      "wish",
      "rush",
      "bush",
      "cash",
      "mash",
      "gush",
      "chip",
      "chin",
      "chop",
      "chat",
      "rich",
      "much",
      "such",
      "each",
      "inch",
      "thin",
      "that",
      "them",
      "this",
      "then",
      "math",
      "bath",
      "path",
      "with",
      "when",
      "whip",
      "whiz",
      "phone",
      "ring",
      "sing",
      "king",
      "long",
      "song",
      "hung",
      "bang",
      "lung",
      "back",
      "deck",
      "kick",
      "lock",
      "luck",
      "neck",
      "pick",
      "rock",
      "sock",
      "duck",
      "car",
      "far",
      "jar",
      "bar",
      "star",
      "park",
      "dark",
      "mark",
      "her",
      "fern",
      "sir",
      "bird",
      "girl",
      "dirt",
      "firm",
      "for",
      "corn",
      "fork",
      "cord",
      "torn",
      "form",
      "fur",
      "burn",
      "turn",
      "hurt",
      "curb",
      "surf",
      "brag",
      "brim",
      "clip",
      "crab",
      "crib",
      "drag",
      "drip",
      "drop",
      "drum",
      "flag",
      "flat",
      "flip",
      "frog",
      "grab",
      "grin",
      "grip",
      "plan",
      "plum",
      "plug",
      "skip",
      "slam",
      "slap",
      "slim",
      "slip",
      "slug",
      "snap",
      "snip",
      "snug",
      "spin",
      "spot",
      "step",
      "stop",
      "stub",
      "stun",
      "swim",
      "trap",
      "trim",
      "trip",
      "trot",
    ];
    const PHONEME_STORAGE_KEY = "allo_phoneme_bank_v1";
    const RIME_FAMILIES = {
      at: [
        "bat",
        "cat",
        "fat",
        "hat",
        "mat",
        "pat",
        "rat",
        "sat",
        "flat",
        "chat",
      ],
      an: [
        "ban",
        "can",
        "fan",
        "man",
        "pan",
        "ran",
        "tan",
        "van",
        "plan",
        "clan",
      ],
      ap: [
        "cap",
        "gap",
        "lap",
        "map",
        "nap",
        "rap",
        "tap",
        "clap",
        "trap",
        "snap",
      ],
      ig: ["big", "dig", "fig", "jig", "pig", "rig", "wig", "twig"],
      in: [
        "bin",
        "din",
        "fin",
        "pin",
        "tin",
        "win",
        "chin",
        "grin",
        "spin",
        "thin",
      ],
      ip: [
        "dip",
        "hip",
        "lip",
        "rip",
        "sip",
        "tip",
        "zip",
        "chip",
        "ship",
        "trip",
      ],
      it: [
        "bit",
        "fit",
        "hit",
        "kit",
        "pit",
        "sit",
        "wit",
        "grit",
        "spit",
        "slit",
      ],
      op: [
        "cop",
        "hop",
        "mop",
        "pop",
        "top",
        "chop",
        "crop",
        "drop",
        "shop",
        "stop",
      ],
      ot: [
        "cot",
        "dot",
        "got",
        "hot",
        "jot",
        "lot",
        "not",
        "pot",
        "rot",
        "shot",
      ],
      og: ["bog", "cog", "dog", "fog", "hog", "jog", "log", "frog", "blog"],
      ug: [
        "bug",
        "dug",
        "hug",
        "jug",
        "mug",
        "rug",
        "tug",
        "plug",
        "slug",
        "snug",
      ],
      un: ["bun", "fun", "gun", "nun", "pun", "run", "sun", "spun", "stun"],
      et: [
        "bet",
        "get",
        "jet",
        "let",
        "met",
        "net",
        "pet",
        "set",
        "vet",
        "wet",
      ],
      en: ["ben", "den", "hen", "men", "pen", "ten", "then", "when", "wren"],
      ed: ["bed", "fed", "led", "red", "wed", "shed", "sled", "shred"],
      ell: [
        "bell",
        "cell",
        "fell",
        "sell",
        "tell",
        "well",
        "yell",
        "shell",
        "smell",
        "spell",
      ],
      ill: [
        "bill",
        "fill",
        "hill",
        "mill",
        "pill",
        "will",
        "chill",
        "drill",
        "grill",
        "skill",
      ],
      all: [
        "ball",
        "call",
        "fall",
        "hall",
        "mall",
        "tall",
        "wall",
        "small",
        "stall",
      ],
      ack: [
        "back",
        "jack",
        "pack",
        "rack",
        "sack",
        "tack",
        "black",
        "crack",
        "snack",
        "track",
      ],
      ake: [
        "bake",
        "cake",
        "fake",
        "lake",
        "make",
        "rake",
        "take",
        "wake",
        "shake",
        "snake",
      ],
      ame: [
        "came",
        "fame",
        "game",
        "name",
        "same",
        "tame",
        "blame",
        "flame",
        "frame",
      ],
      ate: [
        "date",
        "fate",
        "gate",
        "hate",
        "late",
        "mate",
        "rate",
        "plate",
        "skate",
        "state",
      ],
      ide: ["hide", "ride", "side", "wide", "bride", "glide", "pride", "slide"],
      ine: [
        "dine",
        "fine",
        "line",
        "mine",
        "nine",
        "pine",
        "vine",
        "shine",
        "spine",
      ],
      ore: [
        "bore",
        "core",
        "more",
        "pore",
        "sore",
        "tore",
        "wore",
        "shore",
        "store",
        "score",
      ],
      ook: ["book", "cook", "hook", "look", "nook", "took", "brook", "shook"],
    };
    const GRADE_SUBTEST_BATTERIES = {
      K: ["segmentation", "blending", "isolation"],
      1: ["segmentation", "blending", "isolation", "spelling", "orf"],
      2: ["segmentation", "blending", "rhyming", "spelling", "orf"],
      "3-5": ["segmentation", "rhyming", "spelling", "orf"],
    }; // === End crash fixes ===
    const fisherYatesShuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.WordSoundsModal = ({
      audioCache: providedAudioCache,
      glossaryTerms,
      onClose,
      wordSoundsActivity,
      setWordSoundsActivity,
      wordSoundsScore = { correct: 0, total: 0, streak: 0 },
      setWordSoundsScore,
      currentWordSoundsWord,
      setCurrentWordSoundsWord,
      wordSoundsPhonemes,
      setWordSoundsPhonemes,
      wordSoundsLanguage,
      setWordSoundsLanguage,
      wordSoundsFeedback,
      setWordSoundsFeedback,
      wordSoundsHistory,
      setWordSoundsHistory,
      wordSoundsFamilies,
      setWordSoundsFamilies,
      wordSoundsAudioLibrary,
      setWordSoundsAudioLibrary,
      fetchTTSBytes,
      onScoreUpdate,
      speakWord,
      callGemini: providedCallGemini,
      callTTS: providedCallTTS,
      callImagen: providedCallImagen,
      selectedVoice,
      t,
      wordSoundsDifficulty = "auto",
      setWordSoundsDifficulty,
      wordSoundsAccuracyHistory = [],
      setWordSoundsAccuracyHistory,
      wordSoundsTtsSpeed = 1.0,
      setWordSoundsTtsSpeed,
      orthoSessionGoal = 0,
      setOrthoSessionGoal,
      wordSoundsStreak = 0,
      setWordSoundsStreak,
      wordSoundsSessionGoal = 10,
      setWordSoundsSessionGoal,
      wordSoundsSessionProgress = 0,
      setWordSoundsSessionProgress,
      wordSoundsBadges = [],
      setWordSoundsBadges,
      wordSoundsLevel = 1,
      setWordSoundsLevel,
      phonemeMastery = {},
      setPhonemeMastery,
      wordSoundsDailyProgress = {},
      setWordSoundsDailyProgress,
      wordSoundsConfusionPatterns = {},
      setWordSoundsConfusionPatterns,
      playSound,
      disableAnimations = false,
      addToast,
      wsPreloadedWords = [],
      setWsPreloadedWords,
      onBackToSetup,
      initialShowReviewPanel = false,
      initialActivitySequence = [],
      lessonPlanConfig = null,
      isProbeMode = false,
      probeGradeLevel = "K",
      onProbeComplete,
      getWordSoundsString,
      isParentMode = false,
      allowRuntimeAi,
    }) => {
      // One central boundary: student players receive prepared assets only.
      // Defaults to ALLOWED unless the host marks this device as a QR-student
      // device (window.__alloStudentAiDisabled, set by the host's QR guard) —
      // an older host that never passes the prop keeps full teacher behavior.
      const runtimeAiAllowed =
        allowRuntimeAi !== undefined
          ? !!allowRuntimeAi
          : !(
            typeof window !== "undefined" &&
            window.__alloStudentAiDisabled === true
          );
      const callGemini = runtimeAiAllowed ? providedCallGemini : null;
      const callTTS = runtimeAiAllowed ? providedCallTTS : null;
      const callImagen = runtimeAiAllowed ? providedCallImagen : null;
      const estimateFirstPhoneme = (word) => {
        if (!word) return "";
        const w = word.toLowerCase();
        const EXCEPTIONS = {
          city: "s",
          cent: "s",
          cell: "s",
          circle: "s",
          cycle: "s",
          cedar: "s",
          cereal: "s",
          center: "s",
          gym: "j",
          gem: "j",
          giant: "j",
          giraffe: "j",
          gentle: "j",
          germ: "j",
          gist: "j",
          ginger: "j",
          knight: "n",
          knee: "n",
          knob: "n",
          knock: "n",
          knot: "n",
          know: "n",
          knife: "n",
          wrap: "r",
          wren: "r",
          write: "r",
          wrong: "r",
          wrist: "r",
          gnaw: "n",
          gnat: "n",
          gnome: "n",
          psalm: "s",
          psychology: "s",
        };
        if (EXCEPTIONS[w]) return EXCEPTIONS[w];
        const digraphs = ["sh", "ch", "th", "wh", "ph", "ng", "ck"];
        for (const dg of digraphs) {
          if (w.startsWith(dg)) return dg;
        }
        if (w.startsWith("kn")) return "n";
        if (w.startsWith("wr")) return "r";
        if (w.startsWith("gn")) return "n";
        if (w.startsWith("c") && w.length > 1 && "eiy".includes(w[1]))
          return "s";
        if (w.startsWith("g") && w.length > 1 && "eiy".includes(w[1]))
          return "j";
        // Vowel-first words: the first PHONEME can be a multi-letter unit —
        // an r-controlled vowel ("art" → /ar/, not letter-a) or a vowel team
        // ("eat" → /ea/, "out" → /ow/). Returning the bare first letter made
        // corrective feedback speak the wrong sound for these words.
        const rControlled = ["ar", "er", "ir", "or", "ur"];
        for (const rc of rControlled) {
          if (w.startsWith(rc)) return rc;
        }
        const vowelTeams = ["ai", "ay", "au", "aw", "ea", "ee", "ei", "ey", "ew", "ie", "igh", "oa", "oe", "oi", "oo", "ou", "ow", "oy", "ue"];
        for (const vt of vowelTeams) {
          if (w.startsWith(vt)) return vt;
        }
        return w.charAt(0);
      };
      const estimateLastPhoneme = (word) => {
        if (!word) return "";
        const w = word.toLowerCase();
        const EXCEPTIONS = {
          come: "m",
          some: "m",
          done: "n",
          gone: "n",
          give: "v",
          live: "v",
          have: "v",
          nation: "n",
          action: "n",
        };
        if (EXCEPTIONS[w]) return EXCEPTIONS[w];
        const rControlled = ["ar", "er", "ir", "or", "ur"];
        for (const rc of rControlled) {
          if (w.endsWith(rc)) return rc;
        }
        const digraphs = ["sh", "ch", "th", "ng", "ck"];
        for (const dg of digraphs) {
          if (dg === "ck" && w.endsWith("ck")) return "k";
          if (w.endsWith(dg)) return dg;
        }
        // Vowel-team endings are one PHONEME ("play" → /ay/, not letter-y;
        // "tree" → /ee/) — mirror of the first-phoneme fix above.
        const vowelTeams = ["igh", "ay", "ey", "ee", "ea", "oo", "ew", "ue", "ie", "oa", "ow", "oe", "oy", "oi", "aw", "au"];
        for (const vt of vowelTeams) {
          if (w.endsWith(vt)) return vt;
        }
        return w.slice(-1);
      };
      // Sound Sort: precomputed option set, primed during the eager preload so
      // the activity opens instantly (parity with Blend/Rhyme) - no render flash.
      const soundSortPreloadRef = React.useRef(null);
      const computeSoundSortItem = (targetWordRaw, phonemesArr, aiSortData) => {
        const targetWord = (targetWordRaw || '').toLowerCase();
        if (!targetWord || targetWord.length < 2) return null;
        const wordSeed = targetWord.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const mode = wordSeed % 2 === 0 ? 'first' : 'last';
        // Teacher-edited boards are authoritative: no sound filtering, no
        // pool merging, no difficulty slicing — the teacher may deliberately
        // include words the estimators would reject ("city" starts with /s/).
        // Empty strings are kept (they're live edit rows); the play view
        // filters them out.
        if (aiSortData && aiSortData.teacherEdited) {
          const tMode = aiSortData.position === 'last' ? 'last' : 'first';
          const tTarget = String(aiSortData.phoneme || '').replace(/^\/+|\/+$/g, '').toLowerCase().trim();
          const tWordLen = targetWord.length;
          const tHasBlend = /^[bcdfghjklmnpqrstvwxyz]{2,}/i.test(targetWord);
          return {
            mode: tMode,
            targetChar: tTarget,
            difficulty: tWordLen <= 3 && !tHasBlend ? 'easy' : (tWordLen <= 4 || tHasBlend ? 'medium' : 'hard'),
            options: (aiSortData.words || []).filter((w) => w != null && String(w).toLowerCase() !== targetWord).slice(0, 8),
            distractors: (aiSortData.distractors || []).filter((w) => w != null && String(w).toLowerCase() !== targetWord).slice(0, 8),
          };
        }
        let aiMatches = [];
        let aiMode = mode;
        if (aiSortData && aiSortData.words && aiSortData.words.length >= 2) {
          aiMatches = aiSortData.words.map((w) => w.toLowerCase().trim()).filter((w) => w && w !== targetWord);
          if (aiSortData.position === 'first' || aiSortData.position === 'last') aiMode = aiSortData.position;
        }
        // Derive the target sound AFTER the mode is settled (AI data may flip
        // first/last), then normalize it: Gemini phonemes can arrive as "/b/"
        // — the slashes break the phonemeFor() match filter (estimators return
        // bare graphemes) and miss the phoneme audio bank keys.
        let targetPhoneme = (aiSortData && aiSortData.phoneme)
          ? aiSortData.phoneme
          : (phonemesArr && phonemesArr.length > 0)
            ? (aiMode === 'first' ? phonemesArr[0] : phonemesArr[phonemesArr.length - 1])
            : (aiMode === 'first' ? estimateFirstPhoneme(targetWord) : estimateLastPhoneme(targetWord));
        targetPhoneme = String(targetPhoneme || '').replace(/^\/+|\/+$/g, '').toLowerCase().trim();
        const phonemeFor = (w) => aiMode === 'first' ? estimateFirstPhoneme(w.toLowerCase()) : estimateLastPhoneme(w.toLowerCase());
        // Compare by SOUND class (phonemeKey), not spelling: the estimators
        // return graphemes ("c" for "cap") while the AI target is a phoneme
        // ("k" for "cat"), so exact-string comparison dropped phonetically
        // correct matches AND recruited identical-sounding words (cap, cup)
        // as scored-wrong distractors — punishing correct judgments.
        const _soundEq = (a, b) => phonemeKey(a) === phonemeKey(b);
        const pool = SOUND_MATCH_POOL || ['bat', 'cat', 'dog', 'sit'];
        // Unwinnable-board guard: if the (AI-derived) target sound matches
        // nothing in either word source, fall back to the estimator-derived
        // target — the pool always has matches for estimator graphemes.
        const _hasAny = (t) =>
          aiMatches.some((w) => _soundEq(phonemeFor(w), t)) ||
          pool.some((w) => { const wc = w.toLowerCase(); return wc !== targetWord && _soundEq(phonemeFor(wc), t); });
        if (!_hasAny(targetPhoneme)) {
          targetPhoneme = aiMode === 'first' ? estimateFirstPhoneme(targetWord) : estimateLastPhoneme(targetWord);
        }
        aiMatches = aiMatches.filter((w) => _soundEq(phonemeFor(w), targetPhoneme));
        const poolMatches = pool.filter((w) => { const wc = w.toLowerCase(); if (wc === targetWord) return false; return _soundEq(phonemeFor(wc), targetPhoneme); });
        const matches = [...new Set([...aiMatches, ...poolMatches])];
        const matchesLower = new Set(matches.map((w) => w.toLowerCase()));
        const distractorsPool = pool.filter((w) => { const wc = w.toLowerCase(); if (wc === targetWord) return false; if (matchesLower.has(wc)) return false; return !_soundEq(phonemeFor(wc), targetPhoneme); });
        const wordLen = targetWord.length;
        const hasBlend = /^[bcdfghjklmnpqrstvwxyz]{2,}/i.test(targetWord);
        const difficulty = wordLen <= 3 && !hasBlend ? 'easy' : (wordLen <= 4 || hasBlend ? 'medium' : 'hard');
        const matchLimit = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
        const distractorLimit = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 5;
        const seededRandom = (seed) => { let s = seed; return () => { s = Math.sin(s) * 10000; return s - Math.floor(s); }; };
        const rng = seededRandom(wordSeed);
        const shuffleSeeded = (arr) => [...arr].sort(() => rng() - 0.5);
        const filterByDifficulty = (words) => { if (difficulty === 'easy') return words.filter((w) => w.length <= 3); if (difficulty === 'medium') return words.filter((w) => w.length <= 4); return words; };
        let selectedMatches = shuffleSeeded(filterByDifficulty(matches)).slice(0, matchLimit);
        if (selectedMatches.length < 2) selectedMatches = shuffleSeeded(matches).slice(0, matchLimit);
        const selectedDistractors = shuffleSeeded(filterByDifficulty(distractorsPool)).slice(0, distractorLimit);
        // Report aiMode (the mode the match filter actually used), not the raw
        // seed mode — they differ when the AI sort data flips first/last.
        return { mode: aiMode, targetChar: targetPhoneme, difficulty, options: selectedMatches, distractors: selectedDistractors };
      };
      // Word Families: resolve the rime the SAME way for the instruction audio
      // and the on-screen game (AI rime first, then RIME_FAMILIES, then -at), and
      // prime it once per word so the two never disagree.
      const wordFamilyRimeRef = React.useRef(null);
      const resolveWordFamilyRime = (targetWordRaw, aiRimeData) => {
        const targetWord = (targetWordRaw || '').toLowerCase();
        let targetRime = null;
        let familyMembers = [];
        // Teacher-edited data is authoritative — no endsWith validation (the
        // teacher may include irregular family members) and empty strings are
        // kept as live edit rows (the play view filters them).
        if (aiRimeData && aiRimeData.teacherEdited && aiRimeData.rime) {
          return {
            rime: String(aiRimeData.rime).toLowerCase().trim(),
            members: (aiRimeData.words || []).filter(
              (w) => w != null && String(w).toLowerCase() !== targetWord,
            ),
          };
        }
        if (aiRimeData && aiRimeData.rime && aiRimeData.words && aiRimeData.words.length >= 3) {
          // Normalize like the sibling paths (uppercase AI rimes broke the
          // endsWith distractor filter), validate members actually belong to
          // the family, and dedupe — an off-rime AI "member" became a chip
          // that scored correct while looking identical to a distractor, and
          // duplicates let the board complete early.
          targetRime = aiRimeData.rime.replace(/^-/, '').toLowerCase().trim();
          familyMembers = [...new Set(
            aiRimeData.words
              .map((w) => w.toLowerCase().trim())
              .filter((w) => w && w !== targetWord && w.endsWith(targetRime)),
          )];
        }
        if (!targetRime || familyMembers.length < 2) {
          targetRime = null;
          familyMembers = [];
          for (const [rime, members] of Object.entries(RIME_FAMILIES)) {
            if (targetWord.endsWith(rime) && targetWord.length > rime.length) {
              targetRime = rime;
              familyMembers = members.filter((w) => w !== targetWord);
              break;
            }
          }
        }
        if (!targetRime) {
          const ending = targetWord.slice(-2);
          if (RIME_FAMILIES[ending]) {
            targetRime = ending;
            familyMembers = RIME_FAMILIES[ending].filter((w) => w !== targetWord);
          }
        }
        if (!targetRime) {
          // Derive the word's ACTUAL rime (last vowel group + coda) and scan
          // the word pools for genuine family members before surrendering to
          // '-at' — the old fallback taught bat/cat/hat "as in duck", pairing
          // the target word with a family it doesn't belong to.
          const _rimeMatch = targetWord.match(/[aeiou][a-z]*$/);
          const _actualRime = _rimeMatch ? _rimeMatch[0] : null;
          if (_actualRime && _actualRime.length >= 2) {
            const _scanPool = [
              ...(typeof SOUND_MATCH_POOL !== "undefined" ? SOUND_MATCH_POOL : []),
              ...Object.values(RIME_FAMILIES).flat(),
            ];
            const _derived = [
              ...new Set(
                _scanPool.filter(
                  (w) =>
                    w !== targetWord &&
                    w.endsWith(_actualRime) &&
                    w.length > _actualRime.length,
                ),
              ),
            ];
            if (_derived.length >= 2) {
              targetRime = _actualRime;
              familyMembers = _derived;
            }
          }
        }
        if (!targetRime) {
          targetRime = 'at';
          familyMembers = (RIME_FAMILIES['at'] || []).filter((w) => w !== targetWord);
        }
        return { rime: targetRime, members: familyMembers };
      };
      const includeOrthographic = orthoSessionGoal > 0;
      const latestRequestedWord = React.useRef(null);
      const [isEditing, setIsEditing] = React.useState(false);
      const [isMinimized, setIsMinimized] = React.useState(false);
      React.useEffect(() => {
        if (typeof loadProbeBanks === "function") {
          loadProbeBanks();
        }
      }, []);
      const [activitySequence, setActivitySequence] = React.useState(
        initialActivitySequence || [],
      );
      const [sequenceIndex, setSequenceIndex] = React.useState(0);
      React.useEffect(() => {
        if (initialActivitySequence && initialActivitySequence.length > 0) {
          debugLog(
            "🔄 Syncing activitySequence from prop:",
            initialActivitySequence,
          );
          setActivitySequence(initialActivitySequence);
        }
      }, [initialActivitySequence]);
      const [isStudentLocked, setIsStudentLocked] = React.useState(false);
      const audioCtxRef = React.useRef(null);
      const [playInstructions, setPlayInstructions] = React.useState(true);
      const [tracingPhase, setTracingPhase] = React.useState("upper");
      const lastTracingWord = React.useRef(null);
      const [isCelebrating, setIsCelebrating] = React.useState(false);
      const playInstructions2 = playInstructions;
      const [isLoadingPhonemes, setIsLoadingPhonemes] = React.useState(false);
      const [phonemeError, setPhonemeError] = React.useState(null);
      const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
      const isPlayingAudioRef = React.useRef(false);
      React.useEffect(() => { isPlayingAudioRef.current = isPlayingAudio; }, [isPlayingAudio]);
      // Visible cue when a requested clip never plays (network TTS failure or the
      // phoneme bank not loading). Without this the tool just goes silent, which
      // for an audio-first phonics task reads as "broken" with no guidance.
      const [audioNotice, setAudioNotice] = React.useState(null);
      const lastAudioRef = React.useRef(null);
      const audioNoticeTimerRef = React.useRef(null);
      // WCAG 4.1.3: mirror EVERY visible feedback message to the SR live
      // region in one place. Only 2 of ~24 message-setting sites announced
      // before (level-up, mapping, scramble, spelling-bee, transitions were
      // visual + color only for AT users). Replaces the old per-site calls.
      React.useEffect(() => {
        if (wordSoundsFeedback && wordSoundsFeedback.message) {
          wsAnnounce(String(wordSoundsFeedback.message));
        }
      }, [wordSoundsFeedback]);
      const [userAnswer, setUserAnswer] = React.useState("");
      const [showLetterHints, setShowLetterHints] = React.useState(false);
      React.useEffect(() => {
        if (isProbeMode) {
          setShowLetterHints(false);
        }
      }, [isProbeMode]);
      React.useEffect(() => {
        if (isProbeMode) {
          setShowLetterHints(false);
          setShowWordText(false);
        }
      }, [isProbeMode]);
      const [imageVisibilityMode, setImageVisibilityMode] =
        React.useState("smart");
      const [showImageForCurrentWord, setShowImageForCurrentWord] =
        React.useState(false);
      const SMART_IMAGE_VISIBILITY = {
        counting: "afterCompletion",
        isolation: "progressive",
        blending: "afterCompletion",
        segmentation: "alwaysOn",
        rhyming: "alwaysOn",
        letter_tracing: "alwaysOn",
        mapping: "alwaysOn",
        orthography: "afterCompletion",
        sound_sort: "progressive",
        spelling_bee: "afterCompletion",
        word_scramble: "afterCompletion",
        missing_letter: "afterCompletion",
      };
      const SMART_TEXT_VISIBILITY = {
        counting: "hidden",
        isolation: "hidden",
        blending: "hidden",
        segmentation: "afterAnswer",
        rhyming: "afterAnswer",
        letter_tracing: "alwaysOn",
        mapping: "alwaysOn",
        orthography: "afterAnswer",
        sound_sort: "afterAnswer",
        word_families: "progressive",
        spelling_bee: "hidden",
        word_scramble: "alwaysOn",
        missing_letter: "alwaysOn",
      };
      const getEffectiveImageMode = () => {
        if (imageVisibilityMode === "smart") {
          return SMART_IMAGE_VISIBILITY[wordSoundsActivity] || "progressive";
        }
        return imageVisibilityMode;
      };
      const getEffectiveTextMode = () => {
        if (imageVisibilityMode === "alwaysOn") return "alwaysOn";
        if (imageVisibilityMode === "alwaysOff") return "alwaysOn";
        return SMART_TEXT_VISIBILITY[wordSoundsActivity] || "afterAnswer";
      };
      const [elkoninBoxes, setElkoninBoxes] = React.useState([]);
      const [nextWordBuffer, setNextWordBuffer] = React.useState(null);
      const [decodingChoices, setDecodingChoices] = React.useState([]);
      const [decodeDragOver, setDecodeDragOver] = React.useState(false);
      const lastWordForDecoding = React.useRef(null);
      const [isPrefetching, setIsPrefetching] = React.useState(false);
      const internalAudioCache = React.useRef(new Map());
      const audioInstances = React.useRef(new Map());
      const isMountedRef = React.useRef(true);
      React.useEffect(() => {
        loadWordAudioBank();
      }, []);
      React.useEffect(() => {
        if (!playInstructions || !wordSoundsActivity || initialShowReviewPanel)
          return;
        const activityInstructionMap = {
          counting: "how_many_sounds",
          blending: "listen_to_sounds",
          segmentation: "break_the_word",
          rhyming: "which_word_rhymes",
          letter_tracing: "trace_the_letter",
          mapping: "match_sounds_to_letters",
          orthography: "spell_the_word",
          sound_sort: "sort_the_sounds",
          word_families: "find_word_family",
          spelling_bee: "spell_the_word",
          word_scramble: "unscramble_the_word",
          missing_letter: "find_missing_letter",
        };
        const instrKey = activityInstructionMap[wordSoundsActivity];
        if (!instrKey) return;
        let instrCancelled = false;
        const playInstr = async () => {
          await new Promise((r) => setTimeout(r, 600));
          if (instrCancelled) return;
          if (
            typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
            window.__ALLO_INSTRUCTION_AUDIO[instrKey]
          ) {
            debugLog(
              "🔊 Playing instruction audio for:",
              wordSoundsActivity,
              instrKey,
            );
            try {
              const audio = new Audio(
                window.__ALLO_INSTRUCTION_AUDIO[instrKey],
              );
              instructionAudioRef.current = audio;
              if (instrCancelled) { try { audio.pause(); } catch (e) {} return; }
              audio.playbackRate = 0.95;
              await new Promise((res, rej) => {
                audio.onended = res;
                audio.onerror = () => {
                  warnLog("Instruction audio error");
                  res();
                };
                setTimeout(res, 8000);
                audio.play().catch(() => res());
              });
            } catch (e) {
              warnLog("Instruction playback failed:", e);
            }
          } else {
            debugLog(
              "⚠️ No instruction audio for:",
              instrKey,
              "- using TTS fallback",
            );
            const fallbackTexts = {
              how_many_sounds: "How many sounds do you hear?",
              what_is_the_sound: "What sound do you hear?",
              listen_to_sounds: "Listen to the sounds and pick the word.",
              break_the_word: "Break the word into its sounds.",
              which_word_rhymes: "Which word rhymes?",
              trace_the_letter: "Trace the letter.",
              match_sounds_to_letters: "Match the sounds to their letters.",
              spell_the_word: "Spell the word you hear.",
              sort_the_sounds: "Sort the sounds.",
              find_word_family: "Find the word family.",
              unscramble_the_word: "Unscramble the word.",
              find_missing_letter: "Find the missing letter.",
            };
            const text = fallbackTexts[instrKey];
            if (text && handleAudio) {
              try {
                await handleAudio(text);
              } catch (e) {
                /* silent */
              }
            }
          }
        };
        playInstr();
        return () => {
          instrCancelled = true;
          if (instructionAudioRef.current) {
            try { instructionAudioRef.current.pause(); } catch (e) {}
            instructionAudioRef.current = null;
          }
        };
      }, [wordSoundsActivity]);
      const audioCache = providedAudioCache || internalAudioCache;
      const ttsQueue = React.useRef(Promise.resolve());
      const [attempts, setAttempts] = React.useState(0);
      const [rhymeOptions, setRhymeOptions] = React.useState([]);
      const rhymeOptionsRef = React.useRef([]);
      React.useEffect(() => {
        rhymeOptionsRef.current = rhymeOptions;
      }, [rhymeOptions]);
      const [highlightedRhymeIndex, setHighlightedRhymeIndex] =
        React.useState(null);
      const [highlightedIsoIndex, setHighlightedIsoIndex] =
        React.useState(null);
      const [highlightedBlendIndex, setHighlightedBlendIndex] =
        React.useState(null);
      const [highlightedManipIndex, setHighlightedManipIndex] =
        React.useState(null);
      const [manipulationState, setManipulationState] = React.useState(null);
      const manipulationStateRef = React.useRef(null);
      React.useEffect(() => {
        manipulationStateRef.current = manipulationState;
      }, [manipulationState]);
      const [manipulationOptions, setManipulationOptions] = React.useState([]);
      const manipulationOptionsRef = React.useRef([]);
      React.useEffect(() => {
        manipulationOptionsRef.current = manipulationOptions;
      }, [manipulationOptions]);
      const [isGeneratingManipulation, setIsGeneratingManipulation] =
        React.useState(false);
      const [syllableData, setSyllableData] = React.useState(null);
      const syllableDataRef = React.useRef(null);
      React.useEffect(() => { syllableDataRef.current = syllableData; }, [syllableData]);
      const [isGeneratingSyllable, setIsGeneratingSyllable] = React.useState(false);
      const [highlightedSyllableIndex, setHighlightedSyllableIndex] = React.useState(null);
      const [highlightedSyllableOptionIndex, setHighlightedSyllableOptionIndex] = React.useState(null);
      const [syllableTapCount, setSyllableTapCount] = React.useState(0);
      const lastWordForSyllable = React.useRef(null);
      const syllableGenInFlightRef = React.useRef(null);
      const [blendingProgress, setBlendingProgress] = React.useState(0);
      const [blendingOptions, setBlendingOptions] = React.useState([]);
      const blendingOptionsRef = React.useRef([]);
      React.useEffect(() => {
        blendingOptionsRef.current = blendingOptions;
      }, [blendingOptions]);
      const [orthographyOptions, setOrthographyOptions] = React.useState([]);
      const [isolationState, setIsolationState] = React.useState(null);
      const isolationStateRef = React.useRef(null);
      React.useEffect(() => { isolationStateRef.current = isolationState; }, [isolationState]);
      const audioCancelledRef = React.useRef(false);
      // Monotonic token: bumped whenever in-progress read-aloud audio should stop
      // (activity switch or answer submitted). Option-play loops capture it and
      // bail when it changes, so audio never bleeds into the next activity/item.
      const audioRunIdRef = React.useRef(0);
      // Bumped by startActivity: checkAnswer's 0.8-3s advance timeout captures
      // it and bails if the teacher switched activities in the window —
      // otherwise the stale closure advanced the OLD activity's next word,
      // clobbering the word startActivity just set.
      const advanceEpochRef = React.useRef(0);
      // Tracks the post-error anchor "replay the sound" timeout so it can be
      // cleared on cleanup/teardown — otherwise it fires (and plays a phoneme)
      // after the tool has been closed or minimized.
      const anchorReplayTimeoutRef = React.useRef(null);
      const [ttsSpeed, setTtsSpeed] = React.useState(wordSoundsTtsSpeed || 1.0);
      const modalRef = React.useRef(null);
      const probeResultsDialogRef = React.useRef(null);
      const sessionCompleteDialogRef = React.useRef(null);
      const dialogReturnFocusRef = React.useRef(null);
      React.useEffect(() => {
        if (typeof document === "undefined") return undefined;
        dialogReturnFocusRef.current = document.activeElement;
        return () => {
          const returnTarget = dialogReturnFocusRef.current;
          if (returnTarget && returnTarget.isConnected && typeof returnTarget.focus === "function") {
            try { returnTarget.focus({ preventScroll: true }); } catch (e) { try { returnTarget.focus(); } catch (e2) {} }
          }
        };
      }, []);
      const getDialogFocusable = (dialog) =>
        dialog
          ? Array.from(
              dialog.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
              ),
            ).filter((element) => {
              if (
                element.hidden ||
                element.getAttribute("aria-hidden") === "true" ||
                element.getAttribute("type") === "hidden" ||
                element.classList.contains("hidden") ||
                element.closest('[hidden], [aria-hidden="true"], .hidden')
              ) return false;
              if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
                const style = window.getComputedStyle(element);
                if (style.display === "none" || style.visibility === "hidden") return false;
              }
              return true;
            })
          : [];
      const handleDialogKeyDown = (event, onEscape) => {
        if (event.key === "Escape" && typeof onEscape === "function") {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = getDialogFocusable(event.currentTarget);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const currentIndex = focusable.indexOf(document.activeElement);
        if (event.shiftKey && currentIndex <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && (currentIndex < 0 || currentIndex === focusable.length - 1)) {
          event.preventDefault();
          focusable[0].focus();
        }
      };
      const submissionLockRef = React.useRef(false);
      const sessionWordResults = React.useRef([]);
      const feedbackAudioRef = React.useRef(null);
      const instructionAudioRef = React.useRef(null);
      const activityRegionRef = React.useRef(null);
      const activityFocusInitedRef = React.useRef(false);
      const isolationPositionRef = React.useRef(null);
      const lastWordForIsolation = React.useRef(null);
      const lastWordForRhyming = React.useRef(null);
      const lastWordForManipulation = React.useRef(null);
      const lastWordForOrthography = React.useRef(null);
      const lastWordForBlending = React.useRef(null);
      const autoDirectorCooldown = React.useRef(false);
      const [useMicInput, setUseMicInput] = React.useState(false);
      const [isListening, setIsListening] = React.useState(false);
      const recognitionRef = React.useRef(null);
      // Garden Bridge — check if Symbol Studio prepared a phonics word list
      const gardenPhonicsWords = React.useMemo(() => {
        try {
          const raw = localStorage.getItem('alloGardenPhonicsWords');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              debugLog('🌱 Garden phonics words loaded:', parsed.length, 'words');
              return parsed;
            }
          }
        } catch (e) { /* silent */ }
        return null;
      }, []);
      const [gardenWordsApplied, setGardenWordsApplied] = React.useState(false);
      const [showGardenBanner, setShowGardenBanner] = React.useState(!!gardenPhonicsWords);

      const preloadedWords = wsPreloadedWords || [];
      const portableTtsLibrary = React.useMemo(() => {
        const library = {};
        for (const item of preloadedWords) {
          const assets = item && item._ttsAssets;
          if (!assets || typeof assets !== "object") continue;
          Object.entries(assets).forEach(([key, asset]) => {
            if (asset) library[String(key).trim().toLowerCase().replace(/\s+/g, " ")] = asset;
          });
        }
        return library;
      }, [preloadedWords]);
      const preparedImageLibrary = React.useMemo(() => {
        const library = {};
        for (const item of preloadedWords) {
          const word = String(item?.targetWord || item?.word || item?.term || "").trim().toLowerCase();
          if (word && item?.image && typeof item.image === "string" && !item.image.startsWith("ref::")) library[word] = item.image;
          if (item?._decodingAssets && typeof item._decodingAssets === "object") Object.assign(library, item._decodingAssets);
          if (item?._aacAssets && typeof item._aacAssets === "object") Object.assign(library, item._aacAssets);
        }
        return library;
      }, [preloadedWords]);
      const hasPreparedImages = React.useMemo(
        () => Object.keys(preparedImageLibrary).length > 0,
        [preparedImageLibrary],
      );
      // Keys the teacher explicitly regenerated this session: handleAudio
      // must NOT serve the packed clip for them (the pack entry is removed
      // from state too, but this ref makes the very next play — inside the
      // same regenerate handler, before re-render — already skip the pack).
      const packAudioInvalidatedRef = React.useRef(new Set());
      // Resolve a playable src for text the teacher packed at setup time
      // (data URI or {mime, base64}); null when the pack has no clip for it.
      const portableTtsSrcFor = React.useCallback(
        (text) => {
          const key = String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
          if (packAudioInvalidatedRef.current.has(key)) return null;
          const asset = portableTtsLibrary[key];
          if (!asset) return null;
          if (typeof asset === "string") return asset;
          return asset.base64
            ? `data:${asset.mime || "audio/mpeg"};base64,${asset.base64}`
            : null;
        },
        [portableTtsLibrary],
      );
      const setPreloadedWords =
        setWsPreloadedWords ||
        (() => {
          console.warn(
            "setWsPreloadedWords is not defined - updates won't persist",
          );
        });
      const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
      const [preloadProgress, setPreloadProgress] = React.useState(0);
      const [isPreloading, setIsPreloading] = React.useState(false);
      const [firstWordReady, setFirstWordReady] = React.useState(false);
      React.useEffect(() => {
        if (isProbeMode && preloadedWords && preloadedWords.length > 0 && !firstWordReady) {
          debugLog("📊 Probe mode: setting firstWordReady=true for", preloadedWords.length, "preloaded probe words");
          setFirstWordReady(true);
        }
      }, [isProbeMode, preloadedWords, firstWordReady]);
      const preloadedWordCache = React.useRef(new Map());
      const [showReviewPanel, setShowReviewPanel] = React.useState(
        initialShowReviewPanel || false,
      );
      const hasStartedFromReview = React.useRef(false);
      // Direct-play detection: hosts that preset a concrete activity before
      // mount (live-session push hydration, student self-open from history,
      // the preview "Launch" button) intend the GAME, not the teacher
      // word-list review. Every teacher launch path that wants the review
      // panel says so via initialShowReviewPanel (wordSoundsAutoReview), so
      // the force-review effects below must not override a direct-play mount
      // — that stranded live-session students on a teacher-only screen.
      // 'word-sounds' is the placeholder activity value, not a real one.
      const mountPresetActivityRef = React.useRef(
        !!wordSoundsActivity &&
          wordSoundsActivity !== "word-sounds" &&
          !initialShowReviewPanel,
      );
      const lastPreloadedFirstWord = React.useRef(null);
      const [masteryStats, setMasteryStats] = React.useState({});
      const [revisitQueue, setRevisitQueue] = React.useState([]);
      const sequenceIndexRef = React.useRef(0);
      // AAC symbol overlay
      // Teachers can preset the symbol overlay from setup ("_aacDefaultOn"
      // rides the pack), so an AAC user starts supported without having to
      // find the toggle each session.
      const [aacMode, setAacMode] = React.useState(
        () => preloadedWords.some((w) => w && w._aacDefaultOn),
      );
      const [optionImages, setOptionImages] = React.useState({});
      const optionImagesCache = React.useRef(new Map());
      const shouldAdvanceActivity = React.useCallback(
        (activityId, lessonPlanConfig) => {
          if (!lessonPlanConfig || !lessonPlanConfig.activities) return false;
          const activityConfig = lessonPlanConfig.activities.find(
            (a) => a.id === activityId,
          );
          if (!activityConfig) return false;
          const stats = masteryStats[activityId] || {
            attempted: 0,
            consecutiveStreak: 0,
          };
          const minItems = activityConfig.count || 5;
          const masteryThreshold = lessonPlanConfig.masteryThreshold || 3;
          return (
            stats.attempted >= minItems &&
            stats.consecutiveStreak >= masteryThreshold
          );
        },
        [masteryStats],
      );
      const updateMasteryStats = React.useCallback(
        (activityId, isCorrect, word) => {
          setMasteryStats((prev) => {
            const current = prev[activityId] || {
              attempted: 0,
              correct: 0,
              consecutiveStreak: 0,
              completed: false,
            };
            return {
              ...prev,
              [activityId]: {
                attempted: current.attempted + 1,
                correct: current.correct + (isCorrect ? 1 : 0),
                consecutiveStreak: isCorrect
                  ? current.consecutiveStreak + 1
                  : 0,
                completed: current.completed,
              },
            };
          });
          if (!isCorrect && word) {
            setRevisitQueue((prev) => {
              if (prev.some((w) => w.word === word)) return prev;
              return [...prev, { word, activityId }];
            });
          }
        },
        [],
      );
      // Generate Imagen symbols for response option words in AAC mode.
      // Results are cached in optionImagesCache so each word is only generated once.
      const generateOptionImages = React.useCallback(
        async (words) => {
          if (!aacMode) return;
          const uncached = words.filter(
            (w) => w && !optionImagesCache.current.has(w),
          );
          if (!uncached.length) return;
          // Pack images first — student devices have no Imagen. AAC render
          // sites prepend the data:image header themselves, so normalize a
          // packed data-URI down to its raw base64 payload.
          const needGen = [];
          uncached.forEach((word) => {
            const packed =
              preparedImageLibrary[String(word).trim().toLowerCase()];
            if (packed && typeof packed === "string") {
              const raw = packed.startsWith("data:")
                ? packed.split(",")[1] || ""
                : packed;
              if (raw) {
                optionImagesCache.current.set(word, raw);
                setOptionImages((prev) => ({ ...prev, [word]: raw }));
                return;
              }
            }
            needGen.push(word);
          });
          if (!needGen.length || typeof callImagen !== "function") return;
          await Promise.all(
            needGen.map(async (word) => {
              try {
                const prompt = `Simple flat vector icon of "${word}", minimal educational illustration, white background, no text or labels`;
                const img = await callImagen(prompt);
                if (img) {
                  optionImagesCache.current.set(word, img);
                  setOptionImages((prev) => ({ ...prev, [word]: img }));
                }
              } catch (_err) {
                // silent — never block the activity over a missing image
              }
            }),
          );
        },
        [aacMode, callImagen, preparedImageLibrary],
      );
      // Re-generate images whenever options change while AAC mode is active.
      React.useEffect(() => {
        if (!aacMode) return;
        const words = [
          ...(rhymeOptions || []),
          ...(blendingOptions || []),
          ...(manipulationOptions || []),
          ...(syllableData?.blendingOptions || []),
        ]
          .filter(Boolean)
          .map((o) => (typeof o === "string" ? o : o.text))
          .filter(Boolean);
        if (words.length) generateOptionImages(words);
      }, [aacMode, rhymeOptions, blendingOptions, manipulationOptions, syllableData, generateOptionImages]);
      // Isolation view: map phoneme options to Jolly-Phonics key words for Imagen.
      React.useEffect(() => {
        if (!aacMode || !isolationState?.isoOptions) return;
        const keywords = isolationState.isoOptions
          .map((p) => {
            const clean = p.replace(/\//g, "").toLowerCase();
            return PHONEME_KEYWORDS[clean];
          })
          .filter(Boolean);
        if (keywords.length) generateOptionImages(keywords);
      }, [aacMode, isolationState, generateOptionImages]);
      // Small static table for the most common phonics words — guarantees a good
      // experience even without Gemini available.
      // Mix of positions (initial deletion, final & medial substitution) so the
      // manipulated sound is not always at the start; 5 distractors each -> 6 options.
      const MANIPULATION_FALLBACKS = {
        cat: { type: "deletion", instruction: "Say 'cat'. Now say it again, but leave out the /k/ sound.", targetPhoneme: "k", answer: "at", distractors: ["it", "on", "up", "an", "in"] },
        hat: { type: "substitution", instruction: "Say 'hat'. Now change the /t/ sound to /m/.", targetPhoneme: "t", answer: "ham", distractors: ["had", "hen", "jam", "ram", "map"] },
        dog: { type: "substitution", instruction: "Say 'dog'. Now change the /g/ sound to /t/.", targetPhoneme: "g", answer: "dot", distractors: ["dock", "dab", "dig", "den", "dim"] },
        stop: { type: "deletion", instruction: "Say 'stop'. Now say it again, but leave out the /s/ sound.", targetPhoneme: "s", answer: "top", distractors: ["hop", "mop", "pop", "cop", "shop"] },
        clap: { type: "substitution", instruction: "Say 'clap'. Now change the /a/ sound to /i/.", targetPhoneme: "a", answer: "clip", distractors: ["club", "clay", "clam", "crab", "grip"] },
        train: { type: "deletion", instruction: "Say 'train'. Now say it again, but leave out the /t/ sound.", targetPhoneme: "t", answer: "rain", distractors: ["main", "gain", "pain", "chain", "brain"] },
        plane: { type: "deletion", instruction: "Say 'plane'. Now say it again, but leave out the /p/ sound.", targetPhoneme: "p", answer: "lane", distractors: ["cane", "bane", "mane", "vane", "crane"] },
        smile: { type: "deletion", instruction: "Say 'smile'. Now say it again, but leave out the /s/ sound.", targetPhoneme: "s", answer: "mile", distractors: ["file", "pile", "tile", "mild", "wild"] },
        black: { type: "deletion", instruction: "Say 'black'. Now say it again, but leave out the /b/ sound.", targetPhoneme: "b", answer: "lack", distractors: ["back", "hack", "pack", "rack", "sack"] },
        flat: { type: "substitution", instruction: "Say 'flat'. Now change the /t/ sound to /g/.", targetPhoneme: "t", answer: "flag", distractors: ["flap", "flask", "flame", "flop", "flip"] },
      };
      // Top up an option set to 6 with generic short words (reliable 6 choices).
      const MANIP_FILL = ["sit", "map", "bed", "pin", "mud", "fan", "log", "cup"];
      const padManipOpts = (arr) => {
        const out = (arr || []).filter(Boolean);
        // MANIP_FILL is English words — non-English boards pad from the
        // session's own same-language words instead. (Called from effects/
        // handlers only, so wsLangCaps/preloadedWords are initialized.)
        const fill = wsLangCaps.isEnglish
          ? MANIP_FILL
          : (preloadedWords || [])
              .map((p) => String(p.targetWord || p.word || p.term || "").toLowerCase())
              .filter(Boolean);
        for (const f of fill) { if (out.length >= 6) break; if (out.indexOf(f) === -1) out.push(f); }
        return out;
      };
      // Pure helper: generates a manipulation task without touching React state.
      // Used by fetchWordData (setup preload) AND the in-activity effect via the
      // stateful wrapper below. Three-layer fallback: static table → Gemini → algorithmic.
      // Never throws; returns a valid task object or a minimal algorithmic fallback.
      const generateManipulationTask = React.useCallback(
        async (word, phonemes) => {
          if (!word) return null;
          const fallbackKey = word.toLowerCase();
          if (MANIPULATION_FALLBACKS[fallbackKey]) {
            return { ...MANIPULATION_FALLBACKS[fallbackKey] };
          }
          let result = null;
          // Content language for word choice: answers/distractors must be
          // real words of the SESSION language, never English fillers.
          const _manipIsEnglish =
            !wordSoundsLanguage ||
            String(wordSoundsLanguage).toLowerCase().indexOf("en") === 0;
          const _manipLangLabel = _manipIsEnglish
            ? "English"
            : `the language with code "${wordSoundsLanguage}"`;
          if (typeof callGemini === "function") {
            const phonemeStr = (phonemes || []).join(", ") || "unknown";
            const prompt =
              `You are a speech-language pathology educator creating a phoneme manipulation exercise.\n` +
              `Word: "${word}"\nPhonemes: ${phonemeStr}\n\n` +
              `Choose DELETION (remove one phoneme) OR SUBSTITUTION (swap one phoneme), whichever produces a common word in ${_manipLangLabel}.\n` +
              `IMPORTANT: Vary WHICH phoneme you manipulate - do NOT always pick the first sound. Prefer a MIDDLE (vowel) or FINAL sound when it yields a common word, so the exercise is not always about the beginning of the word.\n` +
              `Return ONLY valid JSON — no markdown, no explanation:\n` +
              `{"type":"substitution","instruction":"Say 'cap'. Now change the /a/ sound to /u/.","targetPhoneme":"a","answer":"cup","distractors":["cop","cab","can","cat","map"]}\n\n` +
              `Rules: answer and all FIVE distractors must be real common words in ${_manipLangLabel}, all different from the answer; the instruction sentence stays in English (it is read by the teacher) but quotes the ${_manipLangLabel} words; targetPhoneme in plain text without slashes. Provide exactly 5 distractors.`;
            try {
              const raw = await callGemini(prompt);
              const jsonMatch = (raw || "").match(/\{[\s\S]*?\}/);
              if (jsonMatch) result = JSON.parse(jsonMatch[0]);
            } catch (geminiErr) {
              warnLog("[Manipulation] Gemini failed:", geminiErr?.message);
            }
          }
          if (!result || !result.answer || !result.distractors) {
            const answer = word.slice(1);
            result = {
              type: "deletion",
              instruction: `Say '${word}'. Now say it again, but leave out the first sound.`,
              targetPhoneme: phonemes?.[0] || word[0],
              answer,
              // English fillers only on English boards; other languages pad
              // from the caller's own words via padManipOpts.
              distractors: (_manipIsEnglish ? ["at", "on", "in", "up", "it", "an"] : [])
                .filter((d) => d !== answer)
                .slice(0, 5),
            };
          }
          return result;
        },
        [callGemini, wordSoundsLanguage],
      );
      // Stateful wrapper: calls the pure helper and pushes the result into
      // React state so the activity view re-renders with the new task.
      const generateManipulationData = React.useCallback(
        async (word, phonemes) => {
          if (!word) return;
          setIsGeneratingManipulation(true);
          try {
            const result = await generateManipulationTask(word, phonemes);
            if (!result) return;
            // Stale-word guard: a slow Gemini result for word N must not land
            // on word N+1 (the child would be graded against N's answer while
            // looking at N+1). The trigger effect sets the ref eagerly, so it
            // always names the LATEST requested word.
            if (
              lastWordForManipulation.current &&
              lastWordForManipulation.current !== word
            )
              return;
            const opts = fisherYatesShuffle(padManipOpts([result.answer, ...(result.distractors || []).slice(0, 5)]));
            setManipulationState(result);
            manipulationStateRef.current = result;
            setManipulationOptions(opts);
            manipulationOptionsRef.current = opts;
          } catch (err) {
            warnLog("[Manipulation] generateManipulationData failed:", err);
          } finally {
            setIsGeneratingManipulation(false);
          }
        },
        [generateManipulationTask],
      );
      const generateSyllableData = React.useCallback(
        async (word) => {
          if (!word) return;
          setIsGeneratingSyllable(true);
          try {
            // Word-match guard: wordSoundsPhonemes can lag a word advance, and
            // installing the PREVIOUS word's prepared syllables here would lock
            // in an unwinnable board (the lastWordForSyllable guard blocks the
            // refresh once data is set).
            const packMatchesWord =
              String(wordSoundsPhonemes?.word || "").trim().toLowerCase() ===
              String(word).trim().toLowerCase();
            const preparedSyllable = packMatchesWord
              ? wordSoundsPhonemes?.activityItems?.syllable_blending ||
              wordSoundsPhonemes?.activityItems?.syllable_counting
              : null;
            let result = null;
            if (Array.isArray(preparedSyllable?.syllables) && preparedSyllable.syllables.length) {
              const rawOpts = Array.isArray(wordSoundsPhonemes?.activityItems?.syllable_blending?.options)
                ? [...wordSoundsPhonemes.activityItems.syllable_blending.options]
                : [];
              const targetLcPrep = String(word).trim().toLowerCase();
              const optsValid =
                rawOpts.length >= 2 &&
                rawOpts.some((o) => String(o || "").trim().toLowerCase() === targetLcPrep);
              if (optsValid) {
                // Teacher-reviewed board: exact options and order.
                const preparedData = {
                  syllables: [...preparedSyllable.syllables],
                  count: preparedSyllable.syllables.length,
                  blendingOptions: rawOpts,
                };
                setSyllableData(preparedData);
                syllableDataRef.current = preparedData;
                return;
              }
              // Syllables are trusted; options were unusable (e.g. the target
              // fell off the board) — rebuild them locally below, never via AI.
              result = { syllables: [...preparedSyllable.syllables], blendingOptions: null };
            }
            if (!result && typeof callGemini === "function") {
              const prompt = `You are a reading specialist. For the word "${word}", return ONLY valid JSON with no markdown:\n{"syllables":["syl","la","bles"],"blendingOptions":["${word}","word2","word3","word4"]}\nsyllables: the syllables of "${word}" as an array of strings\nblendingOptions: exactly 4 words — "${word}" first, then 3 distractors of similar syllable count and general topic.\n\nCRITICAL: Distractors MUST be pronounced differently from "${word}". NEVER include homophones (words that sound the same as the target — e.g., for "whale" do not use "wail"; for "eight" do not use "ate"; for "night" do not use "knight"; for "meet" do not use "meat"). The activity plays the target word aloud and asks the child to pick the correct written word, so phonetically identical distractors make it unsolvable. If you cannot think of 3 non-homophone distractors, return fewer rather than including a homophone.`;
              try {
                const raw = await callGemini(prompt);
                const match = raw.match(/\{[\s\S]*?\}/);
                if (match) result = JSON.parse(match[0]);
              } catch (e) {
                warnLog("[Syllable] Gemini failed:", e?.message);
              }
            }
            if (!result || !Array.isArray(result.syllables) || !result.syllables.length) {
              // Vowel-group fallback: estimate count and split word evenly
              const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
              const groups = cleaned.match(/[aeiouy]+/g) || ["a"];
              let cnt = groups.length;
              if (cleaned.endsWith("e") && cnt > 1) cnt--;
              cnt = Math.max(1, cnt);
              const partLen = Math.ceil(word.length / cnt);
              const syls = [];
              for (let i = 0; i < cnt; i++) {
                syls.push(word.slice(i * partLen, Math.min((i + 1) * partLen, word.length)));
              }
              result = { syllables: syls, blendingOptions: null };
            }
            // Strip any distractor that sounds like the target word (homophone)
            // or duplicates it. The target must be preserved so it's always in
            // the options pool. If filtering leaves us with fewer than 2 total
            // options (target + 1 distractor), drop the options entirely and
            // the UI falls back to the syllable-only view — better than a
            // broken item where two answers sound identical.
            let cleanOptions = null;
            if (Array.isArray(result.blendingOptions) && result.blendingOptions.length >= 2) {
              const targetLc = String(word).trim().toLowerCase();
              const seen = new Set([targetLc]);
              const filtered = [];
              // Target always first if present; otherwise prepend it.
              if (!result.blendingOptions.some((w) => String(w).trim().toLowerCase() === targetLc)) {
                filtered.push(word);
              }
              for (const opt of result.blendingOptions) {
                const lc = String(opt || "").trim().toLowerCase();
                if (!lc) continue;
                if (seen.has(lc)) continue; // de-dupe
                if (isHomophone(targetLc, lc)) {
                  warnLog("[Syllable] Dropped homophone distractor:", opt, "for target:", word);
                  continue;
                }
                seen.add(lc);
                filtered.push(opt);
              }
              if (filtered.length >= 2) {
                cleanOptions = fisherYatesShuffle(filtered).slice(0, 4);
              }
            }
            if (!cleanOptions) {
              // Gemini unavailable: build tappable options locally (target + 3
              // distinct multi-syllable distractors) so the activity is always
              // playable with visible choices instead of falling back to mic-only.
              const _tlc = String(word).trim().toLowerCase();
              const _pool = ["rabbit","pencil","basket","window","monkey","garden","button","tiger","wagon","lemon","puppy","table","apple","kitten","dragon","robot","sunset","picnic"];
              const _distract = fisherYatesShuffle(_pool).filter((w) => w !== _tlc && !isHomophone(_tlc, w)).slice(0, 3);
              cleanOptions = fisherYatesShuffle([word, ..._distract]);
            }
            const data = {
              syllables: result.syllables,
              count: result.syllables.length,
              blendingOptions: cleanOptions,
            };
            // Stale-word guard (same class as manipulation above).
            if (
              lastWordForSyllable.current &&
              lastWordForSyllable.current !== word
            )
              return;
            setSyllableData(data);
            syllableDataRef.current = data;
          } catch (err) {
            warnLog("[Syllable] generateSyllableData failed:", err);
          } finally {
            setIsGeneratingSyllable(false);
          }
        },
        [callGemini, wordSoundsPhonemes],
      );
      // Trigger syllable data generation whenever word changes in syllable activities.
      React.useEffect(() => {
        if (
          wordSoundsActivity !== "syllable_blending" &&
          wordSoundsActivity !== "syllable_counting"
        )
          return;
        const currentWord = currentWordSoundsWord || wordSoundsPhonemes?.word;
        if (!currentWord) return;
        if (lastWordForSyllable.current === currentWord && syllableData) return;
        // In-flight guard: setSyllableData(null) below re-fires this effect
        // (syllableData is a dep) and the null defeated the word guard — every
        // word change kicked off TWO racing Gemini syllable generations.
        if (syllableGenInFlightRef.current === currentWord) return;
        syllableGenInFlightRef.current = currentWord;
        lastWordForSyllable.current = currentWord;
        setSyllableData(null);
        syllableDataRef.current = null;
        setSyllableTapCount(0);
        generateSyllableData(currentWord);
      }, [
        wordSoundsActivity,
        currentWordSoundsWord,
        wordSoundsPhonemes,
        generateSyllableData,
        syllableData,
      ]);
      // Trigger generation whenever the word changes while in manipulation mode.
      // Prefers the pre-generated per-word manipulationTask from setup, so the
      // user's QC edits in the Pre-Activity Review panel are what the student
      // actually hears. Falls back to on-demand generation for backwards compat
      // (e.g. words from an older session without the field).
      React.useEffect(() => {
        if (wordSoundsActivity !== "manipulation") return;
        const currentWord = currentWordSoundsWord || wordSoundsPhonemes?.word;
        if (!currentWord) return;
        if (
          lastWordForManipulation.current === currentWord &&
          manipulationOptions.length > 0
        )
          return;
        lastWordForManipulation.current = currentWord;
        const preparedManipulation = wordSoundsPhonemes?.activityItems?.manipulation;
        const preloadedTask = preparedManipulation?.task || wordSoundsPhonemes?.manipulationTask;
        if (
          preloadedTask &&
          preloadedTask.answer &&
          Array.isArray(preloadedTask.distractors) &&
          preloadedTask.distractors.length > 0
        ) {
          // Prepared options must carry the task's answer — a board without
          // it is unwinnable, so fall back to the local shuffle.
          const opts = Array.isArray(preparedManipulation?.options) &&
            preparedManipulation.options.length > 1 &&
            preparedManipulation.options.includes(preloadedTask.answer)
            ? [...preparedManipulation.options]
            : fisherYatesShuffle(padManipOpts([preloadedTask.answer, ...preloadedTask.distractors.slice(0, 5)]));
          setManipulationState(preloadedTask);
          manipulationStateRef.current = preloadedTask;
          setManipulationOptions(opts);
          manipulationOptionsRef.current = opts;
          return;
        }
        setManipulationState(null);
        setManipulationOptions([]);
        manipulationStateRef.current = null;
        manipulationOptionsRef.current = [];
        const phonemes = wordSoundsPhonemes?.phonemes || [];
        generateManipulationData(currentWord, phonemes);
      }, [
        wordSoundsActivity,
        currentWordSoundsWord,
        wordSoundsPhonemes,
        generateManipulationData,
      ]);
      React.useEffect(() => {
        console.log(
          `[WS-DBG] WordSoundsModal MOUNTED. initialShowReviewPanel: ${initialShowReviewPanel}, activity: ${wordSoundsActivity}`,
        );
        return () => {
          // Flip the mount flag so the ~25 `if (isMountedRef.current)` guards on
          // post-await / setTimeout setState actually fire after the modal closes.
          isMountedRef.current = false;
          console.log("[WS-DBG] WordSoundsModal UNMOUNTED");
        };
      }, []);
      // A11y: when the activity changes, move focus to the freshly-mounted
      // activity region so keyboard / screen-reader users land on the new task
      // instead of being stranded on the picker. Skip the first mount so we
      // don't fight the modal's own initial focus.
      React.useEffect(() => {
        if (!activityFocusInitedRef.current) { activityFocusInitedRef.current = true; return; }
        const region = activityRegionRef.current;
        if (region && typeof region.focus === "function") {
          try { region.focus({ preventScroll: false }); } catch (e) { try { region.focus(); } catch (e2) {} }
        }
      }, [wordSoundsActivity]);
      React.useEffect(() => {
        console.log(
          `[WS-DBG] initialShowReviewPanel changed to: ${initialShowReviewPanel}`,
        );
        if (initialShowReviewPanel) {
          hasStartedFromReview.current = false;
          console.log(
            "📋 [WS-DBG] initialShowReviewPanel is true - forcing Review Panel open. current showReviewPanel state:",
            showReviewPanel,
          );
          setShowReviewPanel(true);
        }
      }, [initialShowReviewPanel]);
      React.useEffect(() => {
        if (preloadedWords.length > 0) {
          const firstWord =
            preloadedWords[0]?.word ||
            preloadedWords[0]?.term ||
            preloadedWords[0]?.targetWord;
          if (firstWord && lastPreloadedFirstWord.current !== firstWord) {
            hasStartedFromReview.current = false;
            lastPreloadedFirstWord.current = firstWord;
            debugLog(
              "🔄 Reset hasStartedFromReview for new word set:",
              firstWord,
            );
          }
        }
      }, [preloadedWords]);
      const [regeneratingIndex, setRegeneratingIndex] = React.useState(null);
      const [generatingImageIndex, setGeneratingImageIndex] =
        React.useState(null);
      const [generatingImageSet, setGeneratingImageSet] = React.useState(
        new Set(),
      );
      const isSequentialMode = wordSoundsDifficulty === "sequential";
      const [errorMessage, setErrorMessage] = React.useState(null);
      const [showSessionComplete, setShowSessionComplete] =
        React.useState(false);
      // ── Graphophonemic anchor strip state (persistent letter ↔ sound card) ──
      // Mode ('full' | 'compact' | 'hidden') is persisted to localStorage.
      const [anchorMode, setAnchorMode] = React.useState(() => getStoredAnchorMode());
      const updateAnchorMode = React.useCallback((mode) => {
        setAnchorMode(mode);
        setStoredAnchorMode(mode);
      }, []);
      // Derive the anchor target for the current item across activity types:
      //   - isolation:    isolationState.correctSound, else first letter
      //   - blending:     first letter of word
      //   - manipulation: targetPhoneme from the task
      //   - rhyme/rime:   the rime ending (e.g. "at", "in")
      // Activity-renderer code reads anchorTarget directly.
      const anchorTarget = React.useMemo(() => {
        try {
          const iso = isolationStateRef.current;
          if (iso && iso.correctSound) return String(iso.correctSound).toLowerCase().trim();
        } catch (_) {}
        // manipulation activity: anchor on the task's target phoneme
        if (manipulationState && manipulationState.targetPhoneme)
          return String(manipulationState.targetPhoneme).toLowerCase().trim();
        // blending / rhyme / other: anchor on the first letter of the current word
        const curWord = currentWordSoundsWord || (wordSoundsPhonemes && wordSoundsPhonemes.word);
        if (curWord) return String(curWord).toLowerCase().trim()[0] || null;
        return null;
      }, [currentWordSoundsWord, wordSoundsPhonemes, manipulationState, isolationState]);
      // Anchor play handler: speak the key word so the student hears the
      // sound in its keyword context (Jolly-Phonics style). Falls back to
      // attempting to play the phoneme directly if no key word is available.
      const handleAnchorPlay = React.useCallback((soundKey, keyWord) => {
        // Play the anchor's PHONEME from the bank. IMPORTANT: pass the GRAPHEME
        // key (e.g. 'a','sh','oo'), NOT the IPA symbol — the bank (and a teacher's
        // custom Voice Pack) is keyed by grapheme, so handleAudio(ipa) would miss
        // for vowels/digraphs and even play the wrong (short) vowel via specialMap.
        // handleAudio checks __ALLO_PHONEME_AUDIO_BANK first, so the child hears the
        // real recorded clip (or a custom override). Fall back to speaking the key
        // word only if there is no clip. (handleAudio is referenced at call time and
        // kept out of the dep array to avoid a render-time temporal-dead-zone error.)
        // handleAudio resolves the grapheme through the bank + its fallback maps
        // (ea->ee, oi->oy, ...), which cover the full English set, so this is the
        // normal path. Only if the bank never loaded (offline/CDN failure) do we
        // speak the key word instead of going silent — the previous unconditional
        // return made that documented fallback unreachable.
        const _pb = (typeof window.__ALLO_PHONEME_AUDIO_BANK !== "undefined")
          ? window.__ALLO_PHONEME_AUDIO_BANK : null;
        const _bankLoaded = !!(_pb && _pb["a"]);
        if (soundKey && _bankLoaded && typeof handleAudio === "function") {
          handleAudio(soundKey);
          return;
        }
        const toSpeak = keyWord || soundKey;
        if (toSpeak && typeof speakWord === "function") { speakWord(toSpeak); return; }
        if (soundKey && typeof handleAudio === "function") handleAudio(soundKey);
      }, [speakWord]);
      // Post-error remediation: when the student gets an answer wrong, briefly
      // flash the anchor and auto-play the key word so the letter ↔ sound
      // association is reinforced immediately (classic OG corrective procedure).
      const [anchorErrorFlash, setAnchorErrorFlash] = React.useState(false);
      const lastFeedbackRef = React.useRef(null);
      React.useEffect(() => {
        if (!wordSoundsFeedback) return;
        // Only react to NEW feedback events that are incorrect.
        if (lastFeedbackRef.current === wordSoundsFeedback) return;
        lastFeedbackRef.current = wordSoundsFeedback;
        if (wordSoundsFeedback.isCorrect) return;
        // Flash for 1.6 s and auto-play the key word (respects reduced-motion via
        // the existing prefers-reduced-motion CSS already injected at the top).
        setAnchorErrorFlash(true);
        const anchor = getAnchor(anchorTarget);
        if (anchor && anchor.keyWord) {
          // Brief delay so the incorrect-feedback chime plays first.
          anchorReplayTimeoutRef.current = setTimeout(function() { anchorReplayTimeoutRef.current = null; handleAnchorPlay(((anchor.graphemes && anchor.graphemes[0]) || anchorTarget), anchor.keyWord); }, 400);
        }
        const t = setTimeout(function() { setAnchorErrorFlash(false); }, 1600);
        return function() { clearTimeout(t); if (anchorReplayTimeoutRef.current) { clearTimeout(anchorReplayTimeoutRef.current); anchorReplayTimeoutRef.current = null; } };
      }, [wordSoundsFeedback, anchorTarget, handleAnchorPlay]);
      React.useEffect(() => {
        if (!showSessionComplete) return;
        if (activitySequence && activitySequence.length > 0) {
          const currentIdx = sequenceIndexRef.current;
          const nextIdx = currentIdx + 1;
          if (nextIdx < activitySequence.length) {
            debugLog(
              "🎯 Auto-advancing to next activity:",
              activitySequence[nextIdx],
              "index:",
              nextIdx,
            );
            const advanceTimer = setTimeout(() => {
              if (!isMountedRef.current) return;
              setShowSessionComplete(false);
              sequenceIndexRef.current = nextIdx;
              setSequenceIndex(nextIdx);
              const nextAct = activitySequence[nextIdx];
              if (nextAct && setWordSoundsActivity) {
                setWordSoundsActivity(nextAct);
                setPlayInstructions(true);
                debugLog("✅ Advanced to activity:", nextAct);
              }
            }, 3000);
            return () => clearTimeout(advanceTimer);
          } else {
            debugLog("🏁 All activities in sequence completed!");
          }
        }
      }, [showSessionComplete, activitySequence]);
      const showError = React.useCallback((message, duration = 3000) => {
        setErrorMessage(message);
        setTimeout(() => {
          if (isMountedRef.current) setErrorMessage(null);
        }, duration);
      }, []);
      const ttsFailureCount = React.useRef(0);
      const ttsQuotaExhausted = React.useRef(false);
      const ttsInflight = React.useRef(new Map());
      const currentActiveAudio = React.useRef(null);
      // ── Durable audio teardown ──────────────────────────────────────────────
      // Stops ALL Word Sounds audio and permanently cancels any in-flight phoneme
      // sequence (blending / anchor / instruction). Fixes phonemes leaking out of
      // the tool after it is closed or minimized: the activity-switch cancel flag
      // self-resets after 50ms (un-cancelling raced audio) and the post-error
      // anchor "replay" timeout was never cleared, so queued / in-flight phonemes
      // kept firing from the global PHONEME bank while Word Sounds was not in view.
      const stopAllWordSoundsAudio = React.useCallback(function () {
        audioCancelledRef.current = true;   // hard-cancel (NOT auto-reset here)
        audioRunIdRef.current++;            // invalidate any run-id-guarded loop
        try { if (currentActiveAudio.current) { currentActiveAudio.current.pause(); currentActiveAudio.current = null; } } catch (e) {}
        try { if (audioInstances.current) audioInstances.current.forEach(function (a) { try { a.pause(); } catch (e) {} }); } catch (e) {}
        try { if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; } } catch (e) {}
        try { if (instructionAudioRef.current) { instructionAudioRef.current.pause(); instructionAudioRef.current = null; } } catch (e) {}
        try { if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        try { if (anchorReplayTimeoutRef.current) { clearTimeout(anchorReplayTimeoutRef.current); anchorReplayTimeoutRef.current = null; } } catch (e) {}
      }, []);
      // On unmount (tool closed), phonemes must not outlive the component.
      React.useEffect(function () { return function () { stopAllWordSoundsAudio(); }; }, [stopAllWordSoundsAudio]);
      // On minimize (component stays mounted but the tool is "not in use") stop
      // audio; re-enable playback when the tool is restored.
      React.useEffect(function () {
        if (isMinimized) stopAllWordSoundsAudio();
        else audioCancelledRef.current = false;
      }, [isMinimized, stopAllWordSoundsAudio]);
      // Ref-mirror of wordSoundsAudioLibrary so handleAudio reads the LATEST
      // value at call time, not a closure-captured snapshot. Fixes the
      // regenerate-word bug where a stale closure inside handleRegenerateWord's
      // setTimeout(handleAudio, 100) was hitting the pre-clear library entry
      // and playing the OLD TTS clip — see plan sleepy-yawning-cocke.md.
      const wordSoundsAudioLibraryRef = React.useRef(wordSoundsAudioLibrary);
      React.useEffect(function() {
        wordSoundsAudioLibraryRef.current = wordSoundsAudioLibrary;
      });
      const clearAudioNotice = React.useCallback(() => {
        if (audioNoticeTimerRef.current) {
          clearTimeout(audioNoticeTimerRef.current);
          audioNoticeTimerRef.current = null;
        }
        setAudioNotice(null);
      }, []);
      const notifyAudioUnavailable = React.useCallback(() => {
        const msg =
          ts("word_sounds.audio_unavailable") ||
          "Sound didn't load — check your connection, then tap the sound again.";
        setAudioNotice(msg);
        if (audioNoticeTimerRef.current) clearTimeout(audioNoticeTimerRef.current);
        audioNoticeTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setAudioNotice(null);
        }, 8000);
      }, []);
      const handleAudio = React.useCallback(
        async (input, playImmediately = true) => {
          if (!input) {
            warnLog("handleAudio called with null input");
            return Promise.resolve();
          }
          // Remember the last thing the child asked to hear so the "Try again"
          // button can replay it, and clear any stale failure notice on a fresh
          // request (a genuine failure below re-shows it).
          if (playImmediately) {
            lastAudioRef.current = input;
            if (audioNotice) clearAudioNotice();
          }
          const textToPlay =
            typeof input === "object" && input.word ? input.word : input;
          if (
            typeof textToPlay === "string" &&
            textToPlay.startsWith("data:audio")
          ) {
            if (currentActiveAudio.current) {
              currentActiveAudio.current.pause();
              currentActiveAudio.current.currentTime = 0;
              currentActiveAudio.current = null;
            }
            const audio = new Audio(textToPlay);
            currentActiveAudio.current = audio;
            audio.onended = () => {
              if (currentActiveAudio.current === audio)
                currentActiveAudio.current = null;
            };
            audio.onpause = () => {
              if (currentActiveAudio.current === audio)
                currentActiveAudio.current = null;
            };
            if (playImmediately) {
              return new Promise((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
                setTimeout(resolve, 5000);
                audio.play().catch((e) => {
                  warnLog("Data URI playback failed", e);
                  resolve();
                });
              });
            }
            return Promise.resolve();
          }
          let text = (
            typeof textToPlay === "string"
              ? textToPlay.trim()
              : String(textToPlay).trim()
          ).toLowerCase();
          // Slash-delimited phoneme notation ("/b/", "/sh/") must key into the
          // audio bank as "b"/"sh" — otherwise the lookup misses and the string
          // falls through to TTS, which reads it literally ("slash B slash").
          if (/^\/.+\/$/.test(text)) {
            text = text.replace(/^\/+|\/+$/g, "").trim();
          }
          if (
            typeof window.__ALLO_PHONEME_AUDIO_BANK !== "undefined" &&
            window.__ALLO_PHONEME_AUDIO_BANK[text]
          ) {
            debugLog("⚡ Playing internal bank audio for:", text);
            if (currentActiveAudio.current) {
              try { currentActiveAudio.current.pause(); currentActiveAudio.current.currentTime = 0; } catch (e) {}
              currentActiveAudio.current = null;
            }
            const audio = new Audio(window.__ALLO_PHONEME_AUDIO_BANK[text]);
            // Register so an activity switch can stop it (was unmanaged -> bled
            // into the next activity until it finished or hit the 5s timeout).
            currentActiveAudio.current = audio;
            audio.onpause = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; };
            if (playImmediately) {
              return new Promise((resolve) => {
                audio.onended = () => { if (currentActiveAudio.current === audio) currentActiveAudio.current = null; resolve(); };
                audio.onerror = () => resolve();
                setTimeout(resolve, 5000);
                audio.play().catch((e) => {
                  warnLog("Bank playback failed", e);
                  resolve();
                });
              });
            }
            return Promise.resolve();
          }
          if (!text) return Promise.resolve();
          setIsPlayingAudio(true);
          const playInstance = async (audio) => {
            try {
              audio.currentTime = 0;
              audio.playbackRate = ttsSpeed;
              await audio.play();
              await new Promise((resolve) => {
                audio.onended = resolve;
                setTimeout(resolve, 3000);
              });
            } catch (e) {
              warnLog("Playback failed", e);
            } finally {
              setIsPlayingAudio(false);
            }
          };
          const loadAndPlay = async (src) => {
            const audio = new Audio(src);
            await new Promise((resolve) => {
              audio.oncanplaythrough = resolve;
              audio.onerror = (e) => {
                warnLog("Audio load error:", audio.src, e);
                resolve();
              };
              setTimeout(resolve, 1000);
            });
            audioInstances.current.set(text, audio);
            if (playImmediately) {
              await playInstance(audio);
            } else {
              setIsPlayingAudio(false);
            }
            return src;
          };
          if (audioInstances.current.has(text)) {
            debugLog("⚡ audioInstances HIT:", text);
            if (playImmediately) {
              await playInstance(audioInstances.current.get(text));
            } else {
              // Preload path: setIsPlayingAudio(true) above had no reset on
              // this early return, sticking the UI in a "playing" state.
              setIsPlayingAudio(false);
            }
            return;
          }
          if (
            audioCache &&
            audioCache.current &&
            audioCache.current.has(text)
          ) {
            const url = audioCache.current.get(text);
            debugLog("⚡ using shared audio cache for:", text);
            return loadAndPlay(url);
          }
          const lower = text.toLowerCase();
          const portableSrc = portableTtsSrcFor(text);
          if (portableSrc) {
            debugLog("⚡ using prepared Word Sounds TTS for:", text);
            return loadAndPlay(portableSrc);
          }
          if (
            typeof _CACHE_WORD_AUDIO_BANK !== "undefined" &&
            _CACHE_WORD_AUDIO_BANK &&
            _CACHE_WORD_AUDIO_BANK[lower]
          ) {
            debugLog("⚡ using global word_audio_bank for:", text);
            return loadAndPlay(_CACHE_WORD_AUDIO_BANK[lower]);
          }
          let normalizedKey = lower.trim();
          if (
            normalizedKey.startsWith("short ") &&
            normalizedKey.length === 7
          ) {
            normalizedKey = normalizedKey.replace("short ", "");
          } else if (normalizedKey.endsWith("_short"))
            normalizedKey = normalizedKey.replace("_short", "");
          else if (normalizedKey.endsWith(" short"))
            normalizedKey = normalizedKey.replace(" short", "");
          const specialMap = {
            au: "aw",
            "\u0101": "ay",
            "\u0113": "ee",
            "\u012b": "ie",
            "\u014d": "oa",
            "\u016b": "oo",
            "\u0103": "a",
            "\u0115": "e",
            "\u012d": "i",
            "\u014f": "o",
            "\u016d": "u",
            ae: "ay",
            ai: "ay",
            a_e: "ay",
            ei: "ay",
            ea: "ee",
            ey: "ee",
            e_e: "ee",
            i_e: "ie",
            igh: "ie",
            y: "ee",
            o_e: "oa",
            ow: "ow",
            ew: "oo",
            u_e: "oo",
            ue: "oo",
            ui: "oo",
            "long u": "oo",
            "short u": "u",
            "\u0259": "u",
          };
          if (specialMap[normalizedKey])
            normalizedKey = specialMap[normalizedKey];
          const bankKey =
            typeof window.__ALLO_PHONEME_AUDIO_BANK !== "undefined" &&
              window.__ALLO_PHONEME_AUDIO_BANK[normalizedKey]
              ? normalizedKey
              : lower;
          if (
            typeof window.__ALLO_PHONEME_AUDIO_BANK !== "undefined" &&
            window.__ALLO_PHONEME_AUDIO_BANK[bankKey]
          ) {
            if (bankKey !== lower)
              debugLog(`⚡ Mapped complex phoneme "${lower}" to "${bankKey}"`);
            return loadAndPlay(window.__ALLO_PHONEME_AUDIO_BANK[bankKey]);
          }
          // Read the audio library from the ref so we always see the LATEST
          // value, not the closure-captured snapshot. Without this, a stale
          // handleAudio reference (e.g. captured by handleRegenerateWord's
          // setTimeout) would short-circuit on the pre-clear entry and play
          // the OLD TTS clip after a regenerate.
          var liveLibrary = wordSoundsAudioLibraryRef.current;
          if (liveLibrary && liveLibrary[lower]) {
            return loadAndPlay(liveLibrary[lower]);
          }
          const persistent = loadAudioFromStorage(text);
          if (persistent) {
            return loadAndPlay(persistent);
          }
          const isPhoneme = (() => {
            const trimmed = text.trim().toLowerCase();
            if (trimmed.length === 1) return true;
            if (/^[āēīōūăĕĭŏŭə]$/.test(trimmed)) return true;
            if (
              typeof window.__ALLO_PHONEME_AUDIO_BANK !== "undefined" &&
              window.__ALLO_PHONEME_AUDIO_BANK[trimmed]
            )
              return true;
            const phonemePatterns = [
              "sh",
              "ch",
              "th",
              "wh",
              "ph",
              "ng",
              "ck",
              "dh",
              "zh",
              "ar",
              "er",
              "ir",
              "or",
              "ur",
              "aw",
              "ow",
              "ou",
              "oo",
              "ee",
              "ea",
              "ay",
              "ai",
              "oa",
              "ie",
              "ue",
              "oy",
              "air",
              "ear",
              "oo_long",
              "oo_short",
              "igh",
              "tch",
              "dge",
              "kn",
              "wr",
              "gn",
              "mb",
              "qu",
            ];
            if (phonemePatterns.includes(trimmed)) return true;
            return false;
          })();
          if (
            isPhoneme &&
            typeof window.__ALLO_PHONEME_AUDIO_BANK !== "undefined"
          ) {
            const phonemeMatches = {
              "\u0101": "ay",
              "\u0113": "ee",
              "\u012b": "ie",
              "\u014d": "oa",
              "\u016b": "oo",
              "\u0103": "a",
              "\u0115": "e",
              "\u012d": "i",
              "\u014f": "o",
              "\u016d": "u",
              kn: "n",
              wr: "r",
              gn: "n",
              mb: "m",
              gh: "g",
              qu: "k",
              igh: "ie",
              tch: "ch",
              dge: "j",
              ai: "ay",
              a_e: "ay",
              ae: "ay",
              ei: "ay",
              ea: "ee",
              ey: "ee",
              e_e: "ee",
              i_e: "ie",
              y: "ee",
              o_e: "oa",
              ue: "oo",
              ew: "oo",
              u_e: "oo",
              ui: "oo",
              oi: "oy",
              au: "aw",
              ou: "ow",
              ir: "er",
              ur: "er",
              c: "k",
              q: "k",
              x: "s",
              ph: "f",
              ck: "k",
              ce: "s",
              ci: "s",
              cy: "s",
              ge: "j",
              gi: "j",
              gy: "j",
              "\u0259": "u",
              "\u0254\u026a": "oy",
              aʊ: "ow",
              "\u0259\u028a": "oa",
              eɪ: "ay",
              aɪ: "ie",
              iː: "ee",
              uː: "oo",
              "\u0251\u02d0": "ar",
              "\u0254\u02d0": "or",
              "\u025c\u02d0": "er",
              "\u00e6": "a",
              "\u025b": "e",
              "\u026a": "i",
              "\u0252": "o",
              "\u028c": "u",
              "\u028a": "oo",
              "\u03b8": "th",
              "\u00f0": "th",
              "\u0283": "sh",
              "\u0292": "sh",
              "\u014b": "ng",
              tʃ: "ch",
              dʒ: "j",
              "\u026a\u0259": "ear",
              eə: "air",
              "\u028a\u0259": "oo",
            };
            const match =
              phonemeMatches[lower] || phonemeMatches[normalizedKey];
            if (match && window.__ALLO_PHONEME_AUDIO_BANK[match]) {
              debugLog(`Phoneme fallback: "${text}" -> "${match}"`);
              return loadAndPlay(window.__ALLO_PHONEME_AUDIO_BANK[match]);
            }
            const isEnglish =
              !wordSoundsLanguage || wordSoundsLanguage.startsWith("en");
            if (isEnglish) {
              warnLog(
                `No bank audio for English phoneme "${text}" - skipping (no TTS for phonemes)`,
              );
              setIsPlayingAudio(false);
              return;
            }
            if (callTTS && selectedVoice) {
              try {
                debugLog(`Non-English phoneme "${text}" - using Gemini TTS`);
                const url = await callTTS(text, selectedVoice);
                if (url) {
                  return loadAndPlay(url);
                }
              } catch (e) {
                warnLog("Gemini TTS failed for phoneme", e);
              }
            }
            warnLog(`No audio source for non-English phoneme "${text}"`);
            setIsPlayingAudio(false);
            return;
          }
          if (callTTS && selectedVoice && !isPhoneme) {
            if (ttsInflight.current.has(text)) {
              debugLog(
                "⏳ TTS already in-flight for:",
                text,
                "- awaiting existing request",
              );
              try {
                const url = await ttsInflight.current.get(text);
                if (url && playImmediately) {
                  return loadAndPlay(url);
                }
                setIsPlayingAudio(false);
                return;
              } catch (e) {
                warnLog("In-flight TTS failed", e);
              }
            }
            try {
              const ttsPromise = callTTS(text, selectedVoice);
              ttsInflight.current.set(text, ttsPromise);
              const url = await ttsPromise;
              ttsInflight.current.delete(text);
              if (url) {
                saveAudioToStorage(text, url);
                return loadAndPlay(url);
              }
            } catch (e) {
              ttsInflight.current.delete(text);
              warnLog("TTS attempt 1 failed for word:", text, e?.message);
              // Retry once after a delay instead of falling back to browser TTS
              try {
                await new Promise((r) => setTimeout(r, 1500));
                const retryUrl = await callTTS(text, selectedVoice);
                if (retryUrl) {
                  saveAudioToStorage(text, retryUrl);
                  return loadAndPlay(retryUrl);
                }
              } catch (retryErr) {
                warnLog("TTS retry also failed for:", text, retryErr?.message);
              }
            }
          }
          if (playImmediately) {
            if (!isPhoneme) {
              // A word we could not voice at all (TTS exhausted / unavailable).
              warnLog("⚠️ All Gemini TTS attempts exhausted for word:", text, "- skipping audio (no browser TTS fallback)");
              notifyAudioUnavailable();
            } else if (
              typeof window.__ALLO_PHONEME_AUDIO_BANK === "undefined" ||
              !window.__ALLO_PHONEME_AUDIO_BANK["a"]
            ) {
              // Reaching here for a phoneme means the bank never loaded, so the
              // whole activity would be silent. (A single unmapped phoneme with
              // the bank present stays a deliberate silent skip above — we don't
              // TTS isolated phonemes.)
              notifyAudioUnavailable();
            }
          }
          setIsPlayingAudio(false);
        },
        [
          callTTS,
          selectedVoice,
          speakWord,
          wordSoundsLanguage,
          ttsSpeed,
          wordSoundsAudioLibrary,
          notifyAudioUnavailable,
          clearAudioNotice,
          audioNotice,
          portableTtsSrcFor,
        ],
      );
      const retryLastAudio = React.useCallback(() => {
        clearAudioNotice();
        const last = lastAudioRef.current;
        if (last != null) handleAudio(last);
      }, [handleAudio, clearAudioNotice]);
      // Speak an instruction sentence that embeds phoneme notation ("change
      // the /t/ sound to /m/"): whole-sentence TTS reads the tokens literally
      // ("slash tee slash"). Split the /X/ tokens out and play them from the
      // phoneme bank (handleAudio strips the slashes → bank clip), TTS-ing
      // only the plain-text spans around them.
      const speakInstructionWithPhonemes = React.useCallback(
        async (sentence) => {
          const parts = String(sentence || "")
            .split(/(\/[^\s/]{1,4}\/)/g)
            .map((s) => s.trim())
            // Drop empty and punctuation-only segments (a trailing "." after
            // a /m/ token would otherwise become its own TTS call).
            .filter((s) => s && /[a-z0-9]/i.test(s));
          if (!parts.length) return;
          const myRun = audioRunIdRef.current;
          for (const part of parts) {
            if (audioRunIdRef.current !== myRun || audioCancelledRef.current)
              return;
            await handleAudio(part);
            await new Promise((r) => setTimeout(r, 120));
          }
        },
        [handleAudio],
      );
      const playBlending = React.useCallback(async () => {
        if (!wordSoundsPhonemes?.phonemes) return;
        // Run-id contract: bail between clips when an answer/activity-switch
        // bumps the token — this loop previously had NO cancellation at all,
        // so a mid-blend word advance kept stepping through the OLD word's
        // phonemes over the new item.
        const myRun = audioRunIdRef.current;
        try {
          setIsPlayingAudio(true);
          setBlendingProgress(0);
          for (let i = 0; i < (wordSoundsPhonemes.phonemes?.length || 0); i++) {
            if (audioRunIdRef.current !== myRun || audioCancelledRef.current) return;
            const phoneme = wordSoundsPhonemes?.phonemes?.[i];
            setBlendingProgress(i + 1);
            await handleAudio(phoneme);
            await new Promise((r) => setTimeout(r, 500));
          }
          setBlendingProgress((wordSoundsPhonemes.phonemes?.length || 0) + 1);
          await new Promise((r) => setTimeout(r, 200));
          if (audioRunIdRef.current !== myRun || audioCancelledRef.current) return;
          // Guard the global (it can be undefined before audio_banks loads).
          // Route through handleAudio (data-URI path) so the clip registers in
          // currentActiveAudio — the old bare `new Audio()` was unstoppable by
          // stopAllWordSoundsAudio/minimize/unmount.
          const whichWordAudio =
            (typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
              window.__ALLO_INSTRUCTION_AUDIO["which_word_did_you_hear"]) ||
            null;
          if (whichWordAudio) {
            await handleAudio(whichWordAudio);
          } else {
            await handleAudio("Which word did you hear?");
          }
        } catch (err) {
          warnLog("Blending playback error:", err);
        } finally {
          setIsPlayingAudio(false);
        }
      }, [wordSoundsPhonemes]);
      const PhonologyView = React.useCallback(
        ({
          activity,
          data,
          showLetterHints,
          onPlayAudio,
          onCheckAnswer,
          isEditing,
          onUpdateOption,
          highlightedIndex: externalHighlightedIndex,
          optionImages,
        }) => {
          const [playingIndex, setPlayingIndex] = React.useState(null);
          const [isSequencing, setIsSequencing] = React.useState(false);
          const sequenceRef = React.useRef(false);
          const playFullSequence = async () => {
            if (isSequencing) return;
            setIsSequencing(true);
            sequenceRef.current = true;
            try {
              setPlayingIndex(-1);
              await onPlayAudio(data.word);
              if (!sequenceRef.current) return;
              for (let i = 0; i < (data.options?.length || 0); i++) {
                if (!sequenceRef.current) break;
                setPlayingIndex(i);
                await onPlayAudio(data.options[i]);
                await new Promise((r) => setTimeout(r, 750));
              }
            } catch (e) {
              warnLog("Sequence error", e);
            } finally {
              setPlayingIndex(null);
              setIsSequencing(false);
              sequenceRef.current = false;
            }
          };
          if (activity === "isolation") {
            return /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex flex-col items-center justify-center gap-8 animate-in zoom-in-50 duration-500",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center space-y-4" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "relative" },
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": ts("word_sounds.hear_word_again") || "Play word audio",
                      onClick: () => onPlayAudio(data.word),
                      className: `w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 group relative mb-4 mx-auto overflow-hidden ${playingIndex === -1 ? "bg-violet-400 text-white ring-4 ring-violet-200 scale-110 shadow-violet-300/50" : "bg-violet-100 hover:bg-violet-200 text-violet-600"}`,
                    },
                    data.image
                      ? /*#__PURE__*/ React.createElement("img", {
                        loading: "lazy",
                        src: data.image,
                        alt: data.word,
                        className: `w-full h-full object-cover rounded-full ${playingIndex === -1 ? "ring-4 ring-violet-300" : ""}`,
                      })
                      : /*#__PURE__*/ React.createElement(Volume2, {
                        size: 64,
                        className:
                          playingIndex === -1
                            ? "animate-pulse"
                            : "group-hover:animate-pulse",
                      }),
                    /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs py-1 rounded-b-full font-medium",
                        },
                        "\uD83D\uDC42",
                      ),
                  ),
                  !isEditing &&
                    /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.play_all_sounds"),
                      onClick: playFullSequence,
                      disabled: isSequencing,
                      className: `absolute -right-4 top-0 p-2 rounded-full shadow-md transition-all ${isSequencing ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-white text-violet-500 hover:bg-violet-50 hover:text-violet-700"}`,
                      title: t("common.play_all_sounds"),
                    },
                    isSequencing
                      ? /*#__PURE__*/ React.createElement("div", {
                        className:
                          "animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full",
                      })
                      : /*#__PURE__*/ React.createElement(PlayCircle, {
                        size: 24,
                      }),
                  ),
                ),
                (data.dictionaryIpa || data.dictionaryAudio)
                  ? /*#__PURE__*/ React.createElement(
                      "div",
                      { className: "flex items-center justify-center gap-2 flex-wrap" },
                      data.dictionaryIpa
                        ? /*#__PURE__*/ React.createElement("span", { className: "font-mono text-sm text-slate-500" }, data.dictionaryIpa)
                        : null,
                      data.dictionaryAudio
                        ? /*#__PURE__*/ React.createElement(
                            "button",
                            {
                              type: "button",
                              onClick: () => { try { new Audio(data.dictionaryAudio).play().catch(() => {}); } catch (_e) {} },
                              className: "inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-white hover:bg-violet-50 border border-violet-300 rounded-full px-2.5 py-1 shadow-sm transition-colors",
                              "aria-label": (ts("word_sounds.hear_real_recording") || "Hear a real recording"),
                              title: (ts("word_sounds.hear_real_recording") || "Hear a real recording"),
                            },
                            (ts("word_sounds.real_recording") || "Real recording"),
                          )
                        : null,
                    )
                  : null,
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex items-center justify-center gap-2" },
                  /*#__PURE__*/ React.createElement(
                    "h3",
                    { className: "text-2xl font-bold text-slate-700" },
                    (() => {
                      const pos =
                        typeof data.position === "number" ? data.position : 0;
                      const ordinals = [
                        "1st",
                        "2nd",
                        "3rd",
                        "4th",
                        "5th",
                        "6th",
                        "7th",
                        "8th",
                      ];
                      return `What is the ${ordinals[pos] || pos + 1 + "th"} sound?`;
                    })(),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: async () => {
                        const pos =
                          typeof data.position === "number" ? data.position : 0;
                        const ordinals = [
                          "1st",
                          "2nd",
                          "3rd",
                          "4th",
                          "5th",
                          "6th",
                          "7th",
                          "8th",
                        ];
                        const ordinal = ordinals[pos] || pos + 1 + "th";
                        // typeof-guard (every other site has it): a raw
                        // dereference throws if the bank never loaded, and
                        // register the clip so close/minimize can stop it.
                        const bankAudio =
                          (typeof window.__ALLO_ISOLATION_AUDIO !==
                            "undefined" &&
                            window.__ALLO_ISOLATION_AUDIO[ordinal]) ||
                          null;
                        if (bankAudio) {
                          try {
                            const audio = new Audio(bankAudio);
                            audio.playbackRate = 0.9;
                            currentActiveAudio.current = audio;
                            audio.onended = () => {
                              if (currentActiveAudio.current === audio)
                                currentActiveAudio.current = null;
                            };
                            await audio.play();
                            return;
                          } catch (e) {
                            /* fall through to Gemini TTS */
                          }
                        }
                        try {
                          const instruction = `What is the ${ordinal} sound?`;
                          // Prepared packs carry this exact sentence; only a
                          // teacher device without a pack falls to live TTS.
                          const url =
                            portableTtsSrcFor(instruction) ||
                            (typeof callTTS === "function"
                              ? await callTTS(instruction, selectedVoice)
                              : null);
                          if (url) {
                            const audio = new Audio(url);
                            audio.playbackRate = 0.9;
                            currentActiveAudio.current = audio;
                            audio.onended = () => {
                              if (currentActiveAudio.current === audio)
                                currentActiveAudio.current = null;
                            };
                            await audio.play();
                          }
                        } catch (e) {
                          warnLog("Instruction audio failed:", e);
                        }
                      },
                      className:
                        "p-2 rounded-full bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-600 transition-colors",
                      title: t("common.repeat_instruction"),
                      "aria-label": t("common.repeat_instruction"),
                    },
                    /*#__PURE__*/ React.createElement(RefreshCw, { size: 18 }),
                  ),
                ),
                showLetterHints &&
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "text-4xl font-black tracking-widest text-slate-600",
                  },
                  data.word
                    .split("")
                    .map((char, i) =>
                        /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        key: i,
                        className:
                          typeof data.position === "number" &&
                            i === data.position
                            ? "text-violet-400"
                            : "",
                      },
                      char === " " ? "\u00A0" : "_",
                    ),
                    ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl",
                },
                (data.options || []).map((opt, idx) =>
                  isEditing
                    ? /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        key: idx,
                        className: `relative group flex items-center gap-2 ${opt?.toLowerCase() === data.correctSound?.toLowerCase() ? "ring-2 ring-green-400 rounded-2xl" : ""}`,
                      },
                        /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          "aria-label":
                            opt?.toLowerCase() ===
                              data.correctSound?.toLowerCase()
                              ? "Correct answer"
                              : "Set as correct",
                          onClick: (e) => {
                            e.stopPropagation();
                            onUpdateOption &&
                              onUpdateOption(idx, opt, "set_correct");
                          },
                          className: `p-1 rounded-full transition-colors flex-shrink-0 ${opt?.toLowerCase() === data.correctSound?.toLowerCase() ? "text-green-500" : "text-slate-600 hover:text-green-400"}`,
                          title:
                            opt?.toLowerCase() ===
                              data.correctSound?.toLowerCase()
                              ? "✓ Correct answer"
                              : "Click to set as correct",
                        },
                        opt?.toLowerCase() ===
                          data.correctSound?.toLowerCase()
                          ? /*#__PURE__*/ React.createElement(Check, {
                            size: 20,
                          })
                          : /*#__PURE__*/ React.createElement(Star, {
                            size: 18,
                          }),
                      ),
                        /*#__PURE__*/ React.createElement("input", {
                        "aria-label": t("common.enter_opt"),
                        className:
                          "w-full h-32 rounded-2xl border-4 border-amber-600 bg-white text-center text-4xl font-bold outline-none focus:ring-4 focus:ring-amber-500 text-slate-700",
                        value: opt,
                        onChange: (e) =>
                          onUpdateOption &&
                          onUpdateOption(idx, e.target.value),
                        onKeyDown: (e) => e.stopPropagation(),
                      }),
                    )
                    : /*#__PURE__*/ React.createElement(
                      "div",
                      { key: idx, className: "relative group" },
                        /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          "aria-label": t("common.volume"),
                          onClick: () => onCheckAnswer(opt),
                          className: `w-full h-32 rounded-2xl font-bold flex items-center justify-center shadow-sm transition-all active:scale-95 ${optionImages ? "flex-col gap-1 text-lg" : "text-4xl"} ${playingIndex === idx || externalHighlightedIndex === idx ? "bg-violet-50 border-violet-400 text-violet-700 ring-4 ring-violet-200 scale-105" : "bg-white border-b-4 border-slate-200 text-slate-700 hover:shadow-md hover:scale-[1.02] hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700"}`,
                        },
                        (() => {
                          const clean = opt.replace(/\//g, "").toLowerCase();
                          const keyword = PHONEME_KEYWORDS[clean];
                          const img = optionImages && keyword && optionImages[keyword];
                          if (img) {
                            return [
                              /*#__PURE__*/ React.createElement("img", {
                                key: "img",
                                src: `data:image/png;base64,${img}`,
                                alt: keyword,
                                className: "w-14 h-14 object-contain rounded-lg",
                              }),
                              /*#__PURE__*/ React.createElement(
                                "span",
                                { key: "lbl", className: "text-sm font-bold" },
                                showLetterHints ? opt : `Sound ${idx + 1}`,
                              ),
                            ];
                          }
                          return showLetterHints
                            ? opt
                            : /*#__PURE__*/ React.createElement(
                                "span",
                                { className: "text-sm text-slate-600 font-normal" },
                                "Sound ",
                                idx + 1,
                              );
                        })(),
                      ),
                        /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          "aria-label": t("common.listen"),
                          onClick: (e) => {
                            e.stopPropagation();
                            onPlayAudio(opt, true);
                          },
                          className:
                            "absolute top-2 right-2 w-10 h-10 bg-violet-100 hover:bg-violet-500 hover:text-white text-violet-600 rounded-xl flex items-center justify-center shadow-sm transition-all z-10",
                          title: t("common.listen"),
                        },
                          /*#__PURE__*/ React.createElement(Volume2, {
                          size: 20,
                        }),
                      ),
                    ),
                ),
              ),
            );
          }
          return null;
        },
        [t],
      );
      const RhymeView = React.memo(
        ({
          data,
          showLetterHints,
          onPlayAudio,
          onCheckAnswer,
          isEditing,
          onUpdateOption,
          highlightedIndex,
          isAudioBusy,
          optionImages,
        }) => {
          const [playingIndex, setPlayingIndex] = React.useState(null);
          const activeIndex = playingIndex ?? highlightedIndex;
          return /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex flex-col items-center gap-8 animate-in slide-in-from-right duration-500",
            },

            /*#__PURE__*/ React.createElement(
              "div",
              { className: "grid grid-cols-2 gap-4 w-full max-w-lg" },
              (data.options || []).map((opt, i) =>
                isEditing
                  ? /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: i,
                      className: `p-4 rounded-2xl bg-white border-2 shadow-md flex items-center gap-2 relative ${opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? "border-green-400 ring-2 ring-green-200" : "border-amber-200"}`,
                    },
                      /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        "aria-label":
                          opt?.toLowerCase() === data.rhymeWord?.toLowerCase()
                            ? "Correct answer"
                            : "Set as correct",
                        onClick: (e) => {
                          e.stopPropagation();
                          onUpdateOption &&
                            onUpdateOption(i, opt, "set_correct");
                        },
                        className: `p-1 rounded-full transition-colors flex-shrink-0 ${opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? "text-green-500" : "text-slate-600 hover:text-green-400"}`,
                        title:
                          opt?.toLowerCase() === data.rhymeWord?.toLowerCase()
                            ? "✓ Correct answer"
                            : "Click to set as correct answer",
                      },
                      opt?.toLowerCase() === data.rhymeWord?.toLowerCase()
                        ? /*#__PURE__*/ React.createElement(Check, {
                          size: 20,
                        })
                        : /*#__PURE__*/ React.createElement(Star, {
                          size: 18,
                        }),
                    ),
                      /*#__PURE__*/ React.createElement("input", {
                      "aria-label": t("common.enter_opt"),
                      type: "text",
                      value: opt,
                      onChange: (e) =>
                        onUpdateOption && onUpdateOption(i, e.target.value),
                      className:
                        "w-full px-3 py-2 text-lg font-bold text-slate-700 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400",
                      onKeyDown: (e) => e.stopPropagation(),
                    }),
                      /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        "aria-label": t("common.volume"),
                        onClick: (e) => {
                          e.stopPropagation();
                          onPlayAudio(opt, true);
                        },
                        className:
                          "absolute right-2 top-2 p-2 text-slate-600 hover:text-indigo-600",
                      },
                        /*#__PURE__*/ React.createElement(Volume2, {
                        size: 16,
                      }),
                    ),
                  )
                  // WCAG: the tile was a role="button" div with the listen
                  // <button> nested inside — nested interactive controls
                  // (axe: nested-interactive). Same fix as the blending grid:
                  // a plain wrapper, the tile is a real answer <button>, and
                  // the listen control is an absolutely-positioned SIBLING.
                  : /*#__PURE__*/ React.createElement(
                    "div",
                    { key: i, className: "relative group" },
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => onCheckAnswer(opt),
                        className: `w-full ${optionImages ? "p-4" : "p-6"} rounded-2xl transition-all text-left cursor-pointer outline-none focus:ring-2 focus:ring-orange-400 ${activeIndex === i ? "border-orange-500 bg-orange-200 ring-4 ring-orange-400 scale-[1.05] shadow-xl font-black z-10 relative" : "bg-white border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50"}`,
                      },
                      optionImages && optionImages[opt]
                        ? /*#__PURE__*/ React.createElement(
                            "div",
                            { className: "flex flex-col items-center gap-2" },
                            /*#__PURE__*/ React.createElement("img", {
                              src: `data:image/png;base64,${optionImages[opt]}`,
                              alt: opt,
                              className: "w-20 h-20 object-contain rounded-xl",
                            }),
                            /*#__PURE__*/ React.createElement(
                              "span",
                              {
                                className: "text-base font-bold text-slate-700 pr-8",
                              },
                              showLetterHints ? opt : `${ts("word_sounds.option_label") || "Option"} ${i + 1}`,
                            ),
                          )
                        : /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-xl font-bold text-slate-700 pr-10 block",
                            },
                            showLetterHints ? opt : `${ts("word_sounds.option_label") || "Option"} ${i + 1}`,
                          ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        type: "button",
                        "aria-label": t("common.volume"),
                        onClick: (e) => {
                          e.stopPropagation();
                          onPlayAudio(opt, true);
                        },
                        className:
                          "absolute bottom-3 right-3 w-9 h-9 rounded-full bg-orange-50 hover:bg-orange-200 text-slate-600 hover:text-orange-600 flex items-center justify-center transition-colors z-10 shadow-sm",
                        title: ts("common.listen") || "Listen",
                      },
                      /*#__PURE__*/ React.createElement(Volume2, {
                        size: 18,
                      }),
                    ),
                  ),
              ),
            ),
          );
        },
      );
      // ManipulationView — phoneme deletion / substitution activity.
      // Shows the manipulation task instruction card + 4 option buttons.
      const ManipulationView = React.memo(
        ({
          data,
          showLetterHints,
          onPlayAudio,
          onCheckAnswer,
          isEditing,
          onUpdateOption,
          highlightedIndex,
          isAudioBusy,
          optionImages,
          isLoading,
        }) => {
          const [playingIndex, setPlayingIndex] = React.useState(null);
          const activeIndex = playingIndex ?? highlightedIndex;
          if (isLoading) {
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col items-center gap-4 py-10" },
              /*#__PURE__*/ React.createElement("div", {
                className:
                  "w-12 h-12 rounded-full border-4 border-violet-300 border-t-violet-600 animate-spin",
              }),
              /*#__PURE__*/ React.createElement(
                "p",
                { className: "text-slate-600 text-sm font-medium animate-pulse" },
                "Building your Sound Swap task\u2026",
              ),
            );
          }
          if (!data || !data.instruction) {
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "text-center text-slate-600 text-sm py-6" },
              "Loading task\u2026",
            );
          }
          return /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex flex-col items-center gap-6 animate-in slide-in-from-right duration-500",
            },
            // Task instruction card
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "w-full max-w-lg bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl p-5 text-center",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-3 " +
                    (data.type === "deletion"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"),
                },
                data.type === "deletion"
                  ? "\u2702\uFE0F Phoneme Deletion"
                  : "\uD83D\uDD04 Phoneme Substitution",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                { className: "text-slate-700 font-semibold text-lg leading-snug" },
                data.instruction,
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": ts("word_sounds.sr_listen_instruction") || "Listen to instruction",
                  // Segmented playback: /X/ tokens play from the phoneme bank.
                  onClick: () => speakInstructionWithPhonemes(data.instruction),
                  className:
                    "mt-3 inline-flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-full text-sm font-medium transition-colors",
                },
                /*#__PURE__*/ React.createElement(Volume2, { size: 16 }),
                "Listen Again",
              ),
            ),
            // Options grid
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "grid grid-cols-2 gap-4 w-full max-w-lg" },
              (data.options || []).map((opt, i) =>
                isEditing
                  ? /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        key: i,
                        className: `p-4 rounded-2xl bg-white border-2 shadow-md flex items-center gap-2 relative ${opt?.toLowerCase() === data.answer?.toLowerCase() ? "border-green-400 ring-2 ring-green-200" : "border-amber-200"}`,
                      },
                      /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          "aria-label":
                            opt?.toLowerCase() === data.answer?.toLowerCase()
                              ? "Correct answer"
                              : "Set as correct",
                          onClick: (e) => {
                            e.stopPropagation();
                            onUpdateOption &&
                              onUpdateOption(i, opt, "set_correct");
                          },
                          className: `p-1 rounded-full transition-colors flex-shrink-0 ${opt?.toLowerCase() === data.answer?.toLowerCase() ? "text-green-500" : "text-slate-600 hover:text-green-400"}`,
                          title:
                            opt?.toLowerCase() === data.answer?.toLowerCase()
                              ? "\u2713 Correct answer"
                              : "Click to set as correct",
                        },
                        opt?.toLowerCase() === data.answer?.toLowerCase()
                          ? /*#__PURE__*/ React.createElement(Check, { size: 20 })
                          : /*#__PURE__*/ React.createElement(Star, { size: 18 }),
                      ),
                      /*#__PURE__*/ React.createElement("input", {
                        "aria-label": t("common.enter_opt"),
                        type: "text",
                        value: opt,
                        onChange: (e) =>
                          onUpdateOption && onUpdateOption(i, e.target.value),
                        className:
                          "w-full px-3 py-2 text-lg font-bold text-slate-700 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400",
                        onKeyDown: (e) => e.stopPropagation(),
                      }),
                      /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          "aria-label": t("common.volume"),
                          onClick: (e) => {
                            e.stopPropagation();
                            onPlayAudio(opt, true);
                          },
                          className:
                            "absolute right-2 top-2 p-2 text-slate-600 hover:text-indigo-600",
                        },
                        /*#__PURE__*/ React.createElement(Volume2, { size: 16 }),
                      ),
                    )
                  // WCAG: same nested-interactive fix as RhymeView — plain
                  // wrapper, real answer <button>, sibling listen button.
                  : /*#__PURE__*/ React.createElement(
                      "div",
                      { key: i, className: "relative group" },
                      /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => onCheckAnswer(opt),
                          className: `w-full ${optionImages ? "p-4" : "p-6"} rounded-2xl transition-all text-left cursor-pointer outline-none focus:ring-2 focus:ring-violet-400 ${activeIndex === i ? "border-violet-500 bg-violet-200 ring-4 ring-violet-400 scale-[1.05] shadow-xl font-black z-10 relative" : "bg-white border-2 border-slate-100 hover:border-violet-400 hover:bg-violet-50"}`,
                        },
                        optionImages && optionImages[opt]
                          ? /*#__PURE__*/ React.createElement(
                              "div",
                              { className: "flex flex-col items-center gap-2" },
                              /*#__PURE__*/ React.createElement("img", {
                                src: `data:image/png;base64,${optionImages[opt]}`,
                                alt: opt,
                                className: "w-20 h-20 object-contain rounded-xl",
                              }),
                              /*#__PURE__*/ React.createElement(
                                "span",
                                {
                                  className: "text-base font-bold text-slate-700 pr-8",
                                },
                                showLetterHints ? opt : `${ts("word_sounds.option_label") || "Option"} ${i + 1}`,
                              ),
                            )
                          : /*#__PURE__*/ React.createElement(
                              "span",
                              {
                                className: "text-xl font-bold text-slate-700 pr-10 block",
                              },
                              showLetterHints ? opt : `${ts("word_sounds.option_label") || "Option"} ${i + 1}`,
                            ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          type: "button",
                          "aria-label": t("common.volume"),
                          onClick: (e) => {
                            e.stopPropagation();
                            onPlayAudio(opt, true);
                          },
                          className:
                            "absolute bottom-3 right-3 w-9 h-9 rounded-full bg-violet-50 hover:bg-violet-200 text-slate-600 hover:text-violet-600 flex items-center justify-center transition-colors z-10 shadow-sm",
                          title: ts("common.listen") || "Listen",
                        },
                        /*#__PURE__*/ React.createElement(Volume2, {
                          size: 18,
                        }),
                      ),
                    ),
              ),
            ),
          );
        },
      );
      // SyllableBlendingView — hear syllables played separately, pick the whole word.
      const SyllableBlendingView = React.memo(
        ({
          data,
          isLoading,
          highlightedSyllableIndex,
          highlightedOptionIndex,
          showLetterHints,
          onPlayAudio,
          isEditing,
          onUpdateOption,
          isAudioBusy,
          optionImages,
          onCheckAnswer,
        }) => {
          const syllables = data?.syllables || [];
          const blendingOptions = data?.blendingOptions || null;
          if (isLoading && !syllables.length) {
            return React.createElement(
              "div",
              { className: "flex flex-col items-center gap-4 py-8" },
              React.createElement("div", {
                className:
                  "w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin",
              }),
              React.createElement(
                "p",
                { className: "text-slate-600 text-sm" },
                "Building syllable activity\u2026",
              ),
            );
          }
          return React.createElement(
            "div",
            { className: "flex flex-col gap-5" },
            React.createElement(
              "div",
              {
                className:
                  "bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col gap-3",
              },
              React.createElement(
                "p",
                {
                  className:
                    "text-xs font-semibold text-sky-600 uppercase tracking-wide text-center",
                },
                "Listen to the syllables",
              ),
              React.createElement(
                "div",
                { className: "flex flex-wrap justify-center gap-2" },
                ...syllables.map((syl, i) =>
                  React.createElement(
                    "div",
                    {
                      key: i,
                      className: `px-4 py-2 rounded-xl text-xl font-bold transition-all duration-200 ${
                        highlightedSyllableIndex === i
                          ? "bg-sky-500 text-white scale-110 shadow-lg"
                          : "bg-white border-2 border-sky-200 text-sky-700"
                      }`,
                    },
                    syl,
                    i < syllables.length - 1
                      ? React.createElement(
                          "span",
                          { className: "text-sky-700 ml-2" },
                          "\u00b7",
                        )
                      : null,
                  ),
                ),
              ),
              React.createElement(
                "button",
                {
                  onClick: () =>
                    syllables.forEach((syl, i) =>
                      setTimeout(() => onPlayAudio?.(syl), i * 650),
                    ),
                  disabled: isAudioBusy,
                  className:
                    "mx-auto flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-full text-sm font-semibold transition-colors disabled:opacity-50",
                },
                "\u25b6 Play Syllables",
              ),
            ),
            blendingOptions && blendingOptions.length > 0
              ? React.createElement(
                  "div",
                  { className: "grid grid-cols-2 gap-3" },
                  ...blendingOptions.map((opt, i) => {
                    const imgSrc = optionImages?.[opt];
                    return isEditing
                      ? React.createElement("input", {
                          key: i,
                          defaultValue: opt,
                          "aria-label": t("common.enter_opt") || "Edit option",
                          className:
                            "border-2 border-sky-200 rounded-xl px-3 py-2 text-center font-semibold",
                          onBlur: (e) => onUpdateOption?.(i, e.target.value),
                        })
                      : React.createElement(
                          "button",
                          {
                            key: i,
                            onClick: () => onCheckAnswer?.(opt),
                            disabled: isAudioBusy,
                            className: `flex flex-col items-center gap-1 p-3 rounded-2xl border-2 font-bold text-lg transition-all bg-white hover:bg-sky-50 border-sky-200 hover:border-sky-400 hover:scale-105 active:scale-95 shadow-sm${
                              highlightedOptionIndex === i
                                ? " ring-4 ring-sky-400 scale-105 bg-sky-50"
                                : ""
                            }`,
                          },
                          imgSrc
                            ? React.createElement("img", {
                                src: imgSrc,
                                alt: opt,
                                className:
                                  "w-20 h-20 object-contain rounded-lg",
                              })
                            : null,
                          showLetterHints
                            ? React.createElement(
                                "span",
                                { className: "flex items-center gap-1" },
                                opt,
                                React.createElement(
                                  "button",
                                  {
                                    onClick: (e) => {
                                      e.stopPropagation();
                                      onPlayAudio?.(opt);
                                    },
                                    className:
                                      "text-sky-700 hover:text-sky-600 text-sm ml-1",
                                    "aria-label": (ts("word_sounds.sr_hear") || "Hear ") + opt,
                                  },
                                  "\ud83d\udd0a",
                                ),
                              )
                            : React.createElement(
                                "span",
                                { className: "text-sky-700 text-2xl" },
                                "\ud83d\udd0a",
                              ),
                        );
                  }),
                )
              : React.createElement(
                  "p",
                  { className: "text-center text-slate-600 text-sm py-4" },
                  "Speak your answer or tap the mic below",
                ),
          );
        },
      );
      // SyllableCountingView — tap once per syllable, then submit the count.
      const SyllableCountingView = React.memo(
        ({
          data,
          isLoading,
          tapCount,
          onTap,
          onReset,
          onCheckAnswer,
          onPlayAudio,
          isAudioBusy,
          word,
        }) => {
          if (isLoading && !data) {
            return React.createElement(
              "div",
              { className: "flex flex-col items-center gap-4 py-8" },
              React.createElement("div", {
                className:
                  "w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin",
              }),
              React.createElement(
                "p",
                { className: "text-slate-600 text-sm" },
                "Getting ready\u2026",
              ),
            );
          }
          return React.createElement(
            "div",
            { className: "flex flex-col items-center gap-5" },
            React.createElement(
              "div",
              {
                className:
                  "bg-amber-50 border border-amber-200 rounded-2xl p-4 w-full text-center",
              },
              React.createElement(
                "p",
                {
                  className:
                    "text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2",
                },
                "Tap once for each syllable you hear",
              ),
              React.createElement(
                "button",
                {
                  onClick: () => onPlayAudio?.(word),
                  disabled: isAudioBusy,
                  className:
                    "flex items-center gap-2 mx-auto px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full font-semibold text-sm transition-colors disabled:opacity-50",
                },
                "\ud83d\udd0a Hear the word again",
              ),
            ),
            React.createElement(
              "div",
              {
                className:
                  "text-6xl font-black text-amber-800 w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center select-none",
              },
              tapCount > 0 ? String(tapCount) : "?",
            ),
            React.createElement(
              "button",
              {
                onClick: onTap,
                className:
                  "w-32 h-32 rounded-full bg-amber-700 hover:bg-amber-700 active:scale-90 text-white text-5xl shadow-lg transition-all select-none",
                "aria-label": ts("word_sounds.sr_tap_count_syllables") || "Tap to count syllables",
              },
              "\ud83d\udc4f",
            ),
            React.createElement(
              "button",
              {
                onClick: onReset,
                className:
                  "text-xs text-slate-600 hover:text-slate-600 underline",
              },
              "Reset",
            ),
            tapCount > 0
              ? React.createElement(
                  "div",
                  { className: "flex flex-col items-center gap-2 w-full" },
                  React.createElement(
                    "p",
                    { className: "text-sm text-slate-600" },
                    `You tapped ${tapCount} ${tapCount === 1 ? "time" : "times"}. Submit?`,
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: () => onCheckAnswer?.(tapCount),
                      className:
                        "px-8 py-3 bg-amber-700 hover:bg-amber-700 text-white rounded-xl font-bold shadow transition-all hover:scale-105",
                    },
                    "Submit \u2713",
                  ),
                )
              : null,
          );
        },
      );
      const OrthographyView = React.memo(
        ({ data, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, letterBank, lengthHint }) => {
          const [userSpelling, setUserSpelling] = React.useState("");
          const [feedback, setFeedback] = React.useState(null);
          const [draggedLetter, setDraggedLetter] = React.useState(null);
          // Easy difficulty passes a scaffolded bank (word letters + a few
          // distractors); otherwise the full alphabet.
          const alphabet = Array.isArray(letterBank) && letterBank.length > 1
            ? letterBank
            : "abcdefghijklmnopqrstuvwxyz".split("");
          React.useEffect(() => {
            setUserSpelling("");
            setFeedback(null);
          }, [data.correct, data.word]);
          const handleChipClick = (letter) => {
            const lowerL = letter.toLowerCase();
            if (
              typeof LETTER_NAME_AUDIO !== "undefined" &&
              LETTER_NAME_AUDIO[lowerL]
            ) {
              onPlayAudio(LETTER_NAME_AUDIO[lowerL]);
            } else {
              onPlayAudio(letter);
            }
          };
          const handleDragStart = (e, letter) => {
            setDraggedLetter(letter);
            e.dataTransfer.effectAllowed = "copy";
            e.dataTransfer.setData("text/plain", letter);
          };
          const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          };
          const handleDrop = (e) => {
            e.preventDefault();
            const letter =
              draggedLetter || e.dataTransfer.getData("text/plain");
            if (letter) {
              setUserSpelling((prev) => prev + letter);
              setDraggedLetter(null);
            }
          };
          const handleSubmit = (e) => {
            if (e) e.preventDefault();
            if (!userSpelling.trim()) return;
            const target = data.correct || data.word;
            const isCorrect =
              target &&
              userSpelling.trim().toLowerCase() === target.toLowerCase();
            setFeedback(isCorrect ? "correct" : "incorrect");
            if (isCorrect) {
              setTimeout(() => {
                if (isMountedRef.current) onCheckAnswer(userSpelling);
              }, 500);
            } else {
              onCheckAnswer(userSpelling);
            }
          };
          if (isEditing) {
            return /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex flex-col items-center gap-6 animate-in fade-in",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-amber-50 p-6 rounded-2xl border-2 border-amber-200",
                },
                /*#__PURE__*/ React.createElement(
                  "h3",
                  {
                    className:
                      "font-bold text-amber-800 mb-4 flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "bg-amber-200 p-1 rounded", "aria-hidden": "true" },
                    "\u270F\uFE0F",
                  ),
                  " Edit Spelling Word",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                  /*#__PURE__*/ React.createElement("input", {
                    "aria-label": t("common.edit_spelling_word"),
                    type: "text",
                    value: data.word,
                    onChange: (e) =>
                      onUpdateOption && onUpdateOption(0, e.target.value),
                    className:
                      "w-48 px-4 py-3 text-xl font-bold text-slate-700 bg-white rounded-xl border border-amber-600 focus:ring-4 focus:ring-amber-200 outline-none shadow-sm",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.volume"),
                      onClick: () => onPlayAudio(data.word),
                      className:
                        "p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm",
                    },
                    /*#__PURE__*/ React.createElement(Volume2, { size: 24 }),
                  ),
                ),
              ),
            );
          }
          return /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex flex-col items-center gap-6 animate-in fade-in duration-500 w-full max-w-4xl mx-auto",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col items-center gap-3 mb-2" },
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.volume"),
                  onClick: () => onPlayAudio(data.word),
                  className:
                    "w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-indigo-500/30 transition-all active:scale-95 ring-4 ring-indigo-50",
                  title: ts("word_sounds.hear_word_again") || "Hear Word Again",
                },
                /*#__PURE__*/ React.createElement(Volume2, { size: 32 }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "form",
              {
                onSubmit: handleSubmit,
                className: "w-full max-w-lg relative group",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  onDragOver: handleDragOver,
                  onDrop: handleDrop,
                  className: `relative rounded-2xl transition-all ${draggedLetter ? "scale-105 ring-4 ring-indigo-200 bg-indigo-50" : ""}`,
                },
                /*#__PURE__*/ React.createElement("input", {
                  "aria-label": t("common.drag_letters_here"),
                  type: "text",
                  value: userSpelling,
                  onChange: (e) => setUserSpelling(e.target.value),
                  // Easy difficulty: underscores show how many letters the
                  // word has (length scaffold).
                  placeholder: lengthHint
                    ? Array.from({ length: lengthHint }, () => "_").join(" ")
                    : t("common.placeholder_drag_letters_here"),
                  // lowercase display to match the letter tiles — K-2 learners
                  // match letter SHAPES, and an uppercase transform of their
                  // lowercase input broke that correspondence.
                  className: `w-full px-6 py-5 text-center text-4xl font-bold rounded-2xl border-4 outline-none focus:ring-2 focus:ring-indigo-400 transition-all shadow-sm placeholder:text-slate-600 tracking-widest lowercase
                                ${feedback === "correct" ? "border-green-400 bg-green-50 text-green-700" : feedback === "incorrect" ? "border-red-600 bg-red-50 text-red-700 animate-shake" : "border-slate-200 bg-white text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"}
                            `,
                  autoComplete: "off",
                }),
                userSpelling &&
                  /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.close"),
                    type: "button",
                    onClick: () => setUserSpelling(""),
                    className:
                      "absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors",
                  },
                    /*#__PURE__*/ React.createElement(X, { size: 24 }),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "bg-slate-50/50 p-6 rounded-3xl border border-slate-100 w-full",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex flex-wrap justify-center gap-2" },
                alphabet.map((letter) =>
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    key: letter,
                    draggable: true,
                    role: "button",
                    tabIndex: 0,
                    "aria-label": letter.toUpperCase(),
                    onDragStart: (e) => handleDragStart(e, letter),
                    onClick: () => handleChipClick(letter),
                    onKeyDown: (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleChipClick(letter);
                      }
                    },
                    className:
                      "w-12 h-14 bg-white rounded-xl border-b-4 border-slate-200 shadow-sm text-2xl font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:-translate-y-1 active:border-b-0 active:translate-y-1 active:shadow-inner transition-all flex items-center justify-center select-none cursor-grab active:cursor-grabbing",
                  },
                  letter,
                ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className:
                    "text-center text-slate-600 text-sm mt-4 font-medium",
                },
                ts("word_sounds.drag_letters_hint") ||
                  "Drag letters to spell the word, or click to hear them!",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                "aria-label": t("common.next"),
                onClick: handleSubmit,
                disabled: !userSpelling,
                className: `px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-all flex items-center gap-2 ${!userSpelling ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0"}`,
              },
              ts("word_sounds.check_spelling") || "Check Spelling",
              " ",
              /*#__PURE__*/ React.createElement(ChevronRight, { size: 20 }),
            ),
          );
        },
      );
      const WordFamiliesView = React.useMemo(
        () =>
          ({
            data,
            onPlayAudio,
            onPlayInstruction,
            onCheckAnswer,
            isEditing,
            onUpdateOption,
            showLetterHints,
            soundOnlyMode,
          }) => {
            const [foundWords, setFoundWords] = React.useState([]);
            const [shakenWord, setShakenWord] = React.useState(null);
            const [wrongFeedback, setWrongFeedback] = React.useState(null);
            const [isComplete, setIsComplete] = React.useState(false);
            const [wordBank, setWordBank] = React.useState([]);
            const [activeIndex, setActiveIndex] = React.useState(null);
            const lastOptionsKey = React.useRef("");
            // Refs track the active timer/listener so they survive re-renders and
            // can be cancelled precisely: on content change or on unmount.
            const safetyTimerRef = React.useRef(null);
            const instrDoneListenerRef = React.useRef(null);
            React.useEffect(() => {
              if (data.options && data.distractors) {
                const newKey =
                  JSON.stringify([...data.options].sort()) +
                  "|" +
                  JSON.stringify([...data.distractors].sort());
                if (newKey !== lastOptionsKey.current) {
                  // Options content changed — cancel any in-flight listener/timer
                  // before registering new ones.
                  if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
                  if (instrDoneListenerRef.current) window.removeEventListener('wordSoundsInstructionDone', instrDoneListenerRef.current);
                  lastOptionsKey.current = newKey;
                  // Skip blank entries: teacher-edited boards keep empty
                  // strings as live edit rows — they must never render as
                  // tappable blank chips.
                  const mixed = [
                    ...(data.options || [])
                      .filter((w) => w && String(w).trim())
                      .map((w) => ({
                      text: w,
                      isFamily: true,
                    })),
                    ...(data.distractors || [])
                      .filter((w) => w && String(w).trim())
                      .map((w) => ({
                      text: w,
                      isFamily: false,
                    })),
                  ];
                  const mixed_shuffled = fisherYatesShuffle(mixed);
                  setWordBank(mixed_shuffled);
                  setFoundWords([]);
                  setIsComplete(false);
                  const playAllOptions = async () => {
                    const myRun = audioRunIdRef.current;
                    await new Promise((r) => setTimeout(r, 250));
                    if (audioRunIdRef.current !== myRun) return;
                    // Do not read options over still-playing instruction/target-word
                    // audio (the target word is spoken as part of the item instructions).
                    let _idleGuard = 0;
                    while ((isPlayingAudioRef.current || currentActiveAudio.current) && _idleGuard < 6000) {
                      if (audioRunIdRef.current !== myRun) return;
                      await new Promise((r) => setTimeout(r, 100));
                      _idleGuard += 100;
                    }
                    if (audioRunIdRef.current !== myRun) return;
                    for (let i = 0; i < mixed_shuffled.length; i++) {
                      if (!isMountedRef.current || audioRunIdRef.current !== myRun) break;
                      setActiveIndex(i);
                      try {
                        await onPlayAudio(mixed_shuffled[i].text);
                      } catch (e) { console.warn("[WordSounds] silent catch:", e); }
                      setActiveIndex(null);
                      await new Promise((r) => setTimeout(r, 200));
                    }
                  };
                  // Wait for instruction audio to finish before auto-playing options.
                  // clearTimeout on the ref prevents double-play if both event and
                  // timer would otherwise fire.
                  const onInstrDone = () => {
                    clearTimeout(safetyTimerRef.current);
                    safetyTimerRef.current = null;
                    instrDoneListenerRef.current = null;
                    playAllOptions();
                  };
                  instrDoneListenerRef.current = onInstrDone;
                  window.addEventListener('wordSoundsInstructionDone', onInstrDone, { once: true });
                  // Safety fallback: if no instruction event fires within 12s, play anyway.
                  // 12s accommodates the ~800ms initial delay + up to ~3s sound_match_start
                  // audio + TTS generation time for "as in" and the target word.
                  safetyTimerRef.current = setTimeout(() => {
                    window.removeEventListener('wordSoundsInstructionDone', instrDoneListenerRef.current);
                    instrDoneListenerRef.current = null;
                    safetyTimerRef.current = null;
                    playAllOptions();
                  }, 12000);
                }
              }
              // No cleanup return here — removing the listener on every re-render
              // (caused by new array references from the parent) would silently
              // delete it before wordSoundsInstructionDone fires.
            }, [data.options, data.distractors]);
            // Separate unmount-only effect to cancel any pending timer/listener
            // when the component is removed (e.g. word advances, activity changes).
            React.useEffect(() => {
              return () => {
                if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
                if (instrDoneListenerRef.current) window.removeEventListener('wordSoundsInstructionDone', instrDoneListenerRef.current);
              };
            }, []);
            const handleWordClick = (item) => {
              if (foundWords.includes(item.text) || isComplete) return;
              onPlayAudio(item.text);
              if (item.isFamily) {
                const newFound = [...foundWords, item.text];
                setFoundWords(newFound);
                // Blank edit rows don't count toward completion.
                const allMembers = (data.options || []).filter(
                  (m) => m && String(m).trim(),
                );
                const uniqueFound = new Set(newFound);
                if (allMembers.length > 0 && allMembers.every((m) => uniqueFound.has(m))) {
                  setIsComplete(true);
                  onPlayAudio("correct");
                  setTimeout(() => {
                    if (isMountedRef.current) onCheckAnswer("correct");
                  }, 1200);
                }
              } else {
                setShakenWord(item.text);
                setWrongFeedback(item.text);
                setTimeout(() => {
                  if (isMountedRef.current) {
                    setShakenWord(null);
                    setWrongFeedback(null);
                  }
                }, 1500);
                onCheckAnswer("incorrect");
              }
            };
            if (isEditing) {
              return /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex flex-col gap-8 animate-in fade-in" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-center" },
                  /*#__PURE__*/ React.createElement(
                    "h3",
                    { className: "text-xl font-bold text-slate-600 mb-2" },
                    "Editing Word Family: ",
                    /*#__PURE__*/ React.createElement(
                      "span",
                      { className: "text-violet-600" },
                      data.family,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    { className: "text-sm text-slate-600" },
                    ts("word_sounds.wf_edit_hint") ||
                      "Modify the family members and distractors below.",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "grid grid-cols-1 md:grid-cols-2 gap-8" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-violet-50 p-6 rounded-2xl border-2 border-violet-100",
                    },
                    /*#__PURE__*/ React.createElement(
                      "h4",
                      {
                        className:
                          "font-bold text-violet-700 mb-4 flex items-center gap-2",
                      },
                      /*#__PURE__*/ React.createElement(
                        "span",
                        { className: "bg-violet-200 p-1 rounded", "aria-hidden": "true" },
                        "\uD83C\uDFE0",
                      ),
                      " Family Members",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      { className: "space-y-3" },
                      (data.options || []).map((word, i) =>
                        /*#__PURE__*/ React.createElement(
                        "div",
                        { key: `opt-${i}`, className: "flex gap-2" },
                          /*#__PURE__*/ React.createElement("input", {
                          "aria-label": t("common.family_word"),
                          value: word,
                          onChange: (e) =>
                            onUpdateOption &&
                            onUpdateOption(i, e.target.value, "member"),
                          className:
                            "flex-1 px-3 py-2 rounded-lg border border-violet-200 outline-none focus:ring-2 focus:ring-violet-400 font-bold text-slate-700",
                          placeholder: t("common.placeholder_family_word"),
                        }),
                          /*#__PURE__*/ React.createElement(
                          "button",
                          {
                            onClick: () => onPlayAudio(word),
                            className:
                              "p-2 text-violet-700 hover:text-violet-600",
                          },
                            /*#__PURE__*/ React.createElement(Volume2, {
                            size: 18,
                          }),
                        ),
                          /*#__PURE__*/ React.createElement(
                          "button",
                          {
                            onClick: () =>
                              onUpdateOption &&
                              onUpdateOption(i, null, "remove_member"),
                            "aria-label": t("common.remove"),
                            className:
                              "p-2 text-red-600 hover:text-red-500 transition-colors",
                            title: t("common.remove"),
                          },
                            /*#__PURE__*/ React.createElement(X, { size: 16 }),
                        ),
                      ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          onClick: () =>
                            onUpdateOption &&
                            onUpdateOption(-1, "", "add_member"),
                          className:
                            "w-full py-2 border-2 border-dashed border-violet-200 rounded-lg text-violet-700 hover:text-violet-600 hover:border-violet-400 transition-all text-sm font-bold",
                        },
                        "+ Add Word",
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-amber-50 p-6 rounded-2xl border-2 border-amber-100",
                    },
                    /*#__PURE__*/ React.createElement(
                      "h4",
                      {
                        className:
                          "font-bold text-amber-700 mb-4 flex items-center gap-2",
                      },
                      /*#__PURE__*/ React.createElement(
                        "span",
                        { className: "bg-amber-200 p-1 rounded" },
                        "\uD83D\uDEAB",
                      ),
                      " Distractors",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      { className: "space-y-3" },
                      (data.distractors || []).map((word, i) =>
                        /*#__PURE__*/ React.createElement(
                        "div",
                        { key: `dist-${i}`, className: "flex gap-2" },
                          /*#__PURE__*/ React.createElement("input", {
                          "aria-label": t("common.distractor"),
                          value: word,
                          onChange: (e) =>
                            onUpdateOption &&
                            onUpdateOption(i, e.target.value, "distractor"),
                          className:
                            "flex-1 px-3 py-2 rounded-lg border border-amber-200 outline-none focus:ring-2 focus:ring-amber-400 font-bold text-slate-700",
                          placeholder: t("common.placeholder_distractor"),
                        }),
                          /*#__PURE__*/ React.createElement(
                          "button",
                          {
                            onClick: () => onPlayAudio(word),
                            className:
                              "p-2 text-amber-700 hover:text-amber-600",
                          },
                            /*#__PURE__*/ React.createElement(Volume2, {
                            size: 18,
                          }),
                        ),
                          /*#__PURE__*/ React.createElement(
                          "button",
                          {
                            onClick: () =>
                              onUpdateOption &&
                              onUpdateOption(i, null, "remove_distractor"),
                            "aria-label": t("common.remove"),
                            className:
                              "p-2 text-red-600 hover:text-red-500 transition-colors",
                            title: t("common.remove"),
                          },
                            /*#__PURE__*/ React.createElement(X, { size: 16 }),
                        ),
                      ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          onClick: () =>
                            onUpdateOption &&
                            onUpdateOption(-1, "", "add_distractor"),
                          className:
                            "w-full py-2 border-2 border-dashed border-amber-200 rounded-lg text-amber-700 hover:text-amber-600 hover:border-amber-400 transition-all text-sm font-bold",
                        },
                        "+ Add Distractor",
                      ),
                    ),
                  ),
                ),
              );
            }
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col h-full" },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center mb-6 relative" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100 mb-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "flex flex-col" },
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "text-xs uppercase font-bold text-slate-600 tracking-wider",
                      },
                      ts("word_sounds.sound_sort_label") || "Sound Sort",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      { className: "text-xl font-black text-violet-600" },
                      showLetterHints
                        ? data.family
                        : data.mode === "first"
                          ? "Starts with /…/"
                          : data.mode === "last"
                            ? "Ends with /…/"
                            : "Sound Family",
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      // Prefer the full instruction sequence ("Find words that
                      // start with the /s/ sound, as in sit") when the parent
                      // provided one. Falls back to the bare target sound for
                      // callers that don't wire onPlayInstruction (e.g. the
                      // Word Families reuse at line ~12393 where the target
                      // phoneme IS the full teaching cue).
                      "aria-label": typeof onPlayInstruction === 'function'
                        ? (t("common.replay_instructions") || "Replay instructions")
                        : t("common.hear_target_sound"),
                      onClick: () => {
                        if (typeof onPlayInstruction === 'function') {
                          onPlayInstruction();
                        } else {
                          onPlayAudio(
                            data.targetChar || data.options?.[0] || data.family,
                          );
                        }
                      },
                      title: typeof onPlayInstruction === 'function'
                        ? (t("common.replay_instructions") || "Replay instructions")
                        : t("common.hear_target_sound"),
                      className:
                        "ml-2 p-2 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors",
                    },
                    /*#__PURE__*/ React.createElement(Volume2, { size: 18 }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "h3",
                  { className: "text-lg text-slate-600 font-medium" },
                  ts("word_sounds.sound_sort_instruction") ||
                  (showLetterHints
                    ? `Find all words that match: ${data.family}`
                    : "Tap each word to hear it. Find the ones that match!"),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "mt-2 flex items-center justify-center gap-2" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-bold",
                    },
                    foundWords.length,
                    " / ",
                    (data.options || []).filter((w) => w && String(w).trim())
                      .length,
                    " ",
                    ts("word_sounds.sound_sort_found") || "found",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-white rounded-3xl border-4 border-violet-100 p-6 mb-8 relative overflow-hidden min-h-[200px] shadow-inner transition-colors duration-500",
                  style: { backgroundColor: isComplete ? "#f5f3ff" : "white" },
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-cols-2 md:grid-cols-3 gap-3 relative z-10",
                  },
                  (foundWords || []).map((word, i) =>
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: `found-${i}`,
                      className: "animate-in zoom-in spin-in-3 duration-300",
                    },
                      /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "bg-violet-700 text-white px-4 py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2",
                      },
                      soundOnlyMode ? "🔊" : word,
                      " ",
                        /*#__PURE__*/ React.createElement(Check, {
                        size: 16,
                        className: "text-violet-200",
                      }),
                    ),
                  ),
                  ),
                  [
                    ...Array(
                      Math.max(
                        0,
                        (data.options || []).filter(
                          (w) => w && String(w).trim(),
                        ).length - foundWords.length,
                      ),
                    ),
                  ].map((_, i) =>
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: `empty-${i}`,
                      className:
                        "border-2 border-dashed border-slate-100 rounded-xl h-12 flex items-center justify-center",
                    },
                      /*#__PURE__*/ React.createElement("div", {
                      className: "w-2 h-2 bg-slate-100 rounded-full",
                    }),
                  ),
                  ),
                ),
                isComplete &&
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm animate-in fade-in z-20",
                  },
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-green-100 text-green-700 px-6 py-4 rounded-2xl font-black text-2xl shadow-xl transform rotate-3 border-4 border-white",
                    },
                    ts("word_sounds.sound_sort_complete") ||
                    "All Matched! 🎉",
                  ),
                ),
              ),
              wrongFeedback &&
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center animate-in fade-in mb-2" },
                  /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className:
                      "inline-block bg-rose-100 text-rose-600 px-4 py-2 rounded-full text-sm font-bold",
                  },
                  '\u274C "',
                  // Sound-only mode masks chip text \u2014 don't leak the printed
                  // word in the error banner (a letter hint precisely on
                  // errors defeats the masking).
                  soundOnlyMode ? "\uD83D\uDD0A" : wrongFeedback,
                  '" ',
                  ts("word_sounds.sound_sort_wrong_hint") ||
                  (showLetterHints
                    ? `doesn't match: ${data.family}`
                    : `doesn't match the target sound`),
                ),
              ),
              !isComplete &&
              wordBank.length > 0 &&
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex justify-center mb-3" },
                  /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    onClick: async () => {
                      for (let i = 0; i < wordBank.length; i++) {
                        const item = wordBank[i];
                        if (foundWords.includes(item.text)) continue;
                        setActiveIndex(i);
                        try {
                          await onPlayAudio(item.text);
                        } catch (e) { console.warn("[WordSounds] silent catch:", e); }
                        setActiveIndex(null);
                        await new Promise((r) => setTimeout(r, 350));
                      }
                    },
                    className:
                      "flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors font-bold text-sm",
                    "aria-label": t("common.hear_all_words"),
                    title: t("common.play_all_remaining_words_aloud"),
                  },
                    /*#__PURE__*/ React.createElement(Volume2, { size: 16 }),
                  " Hear All Words",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex flex-wrap justify-center gap-3" },
                (wordBank || []).map((item, idx) => {
                  const isFound = foundWords.includes(item.text);
                  const isShaking = shakenWord === item.text;
                  if (isFound) return null;
                  return /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: `bank-${idx}`,
                      className: "flex items-center gap-1",
                    },
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          onPlayAudio(item.text);
                        },
                        className:
                          "p-2 rounded-full text-violet-700 hover:text-violet-600 hover:bg-violet-50 transition-colors",
                        "aria-label": (ts("word_sounds.sr_hear") || "Hear ") + (soundOnlyMode ? (ts("word_sounds.sr_option") || "option") : item.text),
                        title: t("common.hear_this_word"),
                      },
                      /*#__PURE__*/ React.createElement(Volume2, { size: 18 }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        onClick: () => handleWordClick(item),
                        className: `px-5 py-3 rounded-xl text-lg font-bold shadow-sm border-b-4 transition-all hover:scale-105 active:scale-95 ${isShaking ? "bg-red-100 border-red-300 text-red-600 animate-shake" : activeIndex === idx ? "bg-violet-200 border-violet-500 text-violet-800 scale-[1.05] ring-4 ring-violet-300 z-10" : "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600"}`,
                      },
                      soundOnlyMode ? "🔊" : item.text,
                    ),
                  );
                }),
              ),
            );
          },
        [t],
      );
      const SoundMappingView = React.memo(
        ({ data, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption }) => {
          const [slots, setSlots] = React.useState(
            new Array(data.phonemes?.length || 0).fill(null),
          );
          const [chips, setChips] = React.useState([]);
          const lastWordRef = React.useRef(null);
          React.useEffect(() => {
            if (data.graphemes && data.word !== lastWordRef.current) {
              lastWordRef.current = data.word;
              const labeled = data.graphemes?.map((g, i) => ({
                id: i,
                text: typeof g === "string" ? g : String(g),
                isPlaced: false,
              }));
              setChips(fisherYatesShuffle(labeled));
              setSlots(new Array((data.graphemes || []).length).fill(null));
            }
          }, [data.word, data.graphemes ? data.graphemes.join(",") : ""]);
          React.useEffect(() => {
            if (data.word) {
              const timer = setTimeout(() => {
                debugLog("🔊 Auto-Playing Mapping:", data.word);
                onPlayAudio(data.word, true);
              }, 500);
              return () => clearTimeout(timer);
            }
          }, [data.word]);
          const handleChipClick = (chip) => {
            if (isEditing) return;
            const emptyIdx = slots.findIndex((s) => s === null);
            if (emptyIdx !== -1) {
              const newSlots = [...slots];
              newSlots[emptyIdx] = chip;
              setSlots(newSlots);
              setChips((prev) =>
                prev.map((c) =>
                  c.id === chip.id ? { ...c, isPlaced: true } : c,
                ),
              );
              onPlayAudio(chip.text);
              if (newSlots.every((s) => s !== null)) {
                // Validate the arrangement: each placed grapheme must match the
                // expected grapheme for its position (compare by text so repeated
                // letters are interchangeable). Previously this auto-passed on fill.
                const isCorrect = newSlots.every(
                  (s, i) =>
                    s && String(s.text) === String((data.graphemes || [])[i]),
                );
                setTimeout(() => {
                  if (isMountedRef.current)
                    onCheckAnswer(isCorrect ? "correct" : "incorrect");
                }, 1000);
              }
            }
          };
          const handleSlotClick = (index) => {
            if (isEditing) return;
            const chip = slots[index];
            if (chip) {
              const newSlots = [...slots];
              newSlots[index] = null;
              setSlots(newSlots);
              setChips((prev) =>
                prev.map((c) =>
                  c.id === chip.id ? { ...c, isPlaced: false } : c,
                ),
              );
              playSound("pop");
            }
          };
          const reset = () => {
            setSlots(new Array(data.phonemes?.length || 0).fill(null));
            setChips((prev) => prev.map((c) => ({ ...c, isPlaced: false })));
          };
          return /*#__PURE__*/ React.createElement(
            "div",
            { className: "flex flex-col items-center gap-8" },
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex justify-center gap-4 mb-4" },
              slots.map((slot, i) =>
                /*#__PURE__*/ React.createElement(
                "button",
                {
                  key: i,
                  onClick: () => handleSlotClick(i),
                  className: `w-20 h-20 rounded-2xl border-4 border-dashed flex items-center justify-center text-3xl font-bold transition-all ${slot ? "border-indigo-500 bg-white text-indigo-700 shadow-md scale-100" : "border-slate-300 bg-slate-50 text-slate-600 scale-95"}`,
                  "aria-label": slot
                    ? `Slot ${i + 1}: ${slot.text}`
                    : `Empty Slot ${i + 1}`,
                },
                slot ? slot.text : i + 1,
              ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-wrap justify-center gap-4 py-8" },
              isEditing
                ? data.graphemes?.map((g, i) =>
                    /*#__PURE__*/ React.createElement(
                  "div",
                  { key: i, className: "relative" },
                      /*#__PURE__*/ React.createElement("input", {
                    "aria-label": t("common.enter_g"),
                    value: g,
                    onChange: (e) =>
                      onUpdateOption && onUpdateOption(i, e.target.value),
                    className:
                      "w-20 h-20 rounded-2xl border-4 text-center text-3xl font-bold outline-none focus:ring-4 focus:ring-amber-500 border-amber-600 bg-white text-slate-700",
                    onKeyDown: (e) => e.stopPropagation(),
                  }),
                      /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className:
                        "absolute -top-2 -right-2 bg-slate-200 text-slate-600 text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-sm",
                    },
                    i + 1,
                  ),
                ),
                )
                : chips
                  .filter((c) => !c.isPlaced)
                  .map((chip) =>
                      /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      // Append the chip's text so each chip has a DISTINCT
                      // accessible name (the bare key resolves to "Select
                      // sound" for every chip, masking which sound it is).
                      "aria-label": `${ts("word_sounds.select_sound_chip") || "Select sound"} ${chip.text}`,
                      key: chip.id,
                      onClick: () => handleChipClick(chip),
                      className:
                        "w-20 h-20 rounded-2xl bg-white border-b-4 border-slate-200 text-3xl font-bold text-slate-600 shadow-sm hover:border-indigo-400 hover:text-indigo-600 hover:-translate-y-1 hover:shadow-lg transition-all active:scale-95",
                    },
                    chip.text,
                  ),
                  ),
            ),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                "aria-label": t("common.volume"),
                onClick: () => {
                  debugLog("🔊 Playing Mapping:", data.word);
                  onPlayAudio(data.word, true);
                },
                className:
                  "flex items-center gap-2 text-slate-600 hover:text-indigo-500 transition-colors",
              },
              /*#__PURE__*/ React.createElement(Volume2, { size: 16 }),
              " ",
              ts("word_sounds.listen_word") || "Listen to Word",
            ),
          );
        },
      );
      const ts = React.useCallback(
        (key, params = {}) => {
          const s =
            typeof getWordSoundsString === "function"
              ? getWordSoundsString(t, key, params)
              : t(key) || key;
          // On a total miss every string source echoes the raw key back
          // (truthy), which silently defeated every `ts("key") || "English"`
          // fallback in this module — children saw/heard literal
          // "word_sounds.xyz" strings. Return "" on a key echo so the
          // inline English fallbacks actually fire.
          return s === key ? "" : s;
        },
        [t],
      );
      const ALL_ACTIVITIES = [
        {
          id: "counting",
          label: ts("word_sounds.activity_counting"),
          icon: "🔢",
          description: ts("word_sounds.counting_desc"),
          tier: "phonological",
        },
        {
          id: "isolation",
          label: ts("word_sounds.activity_isolation"),
          icon: "🎯",
          description: ts("word_sounds.isolation_desc"),
          tier: "phonological",
        },
        {
          id: "blending",
          label: ts("word_sounds.activity_blending"),
          icon: "🔗",
          description: ts("word_sounds.blending_desc"),
          tier: "phonological",
        },
        {
          id: "segmentation",
          label: ts("word_sounds.activity_segmentation"),
          icon: "📦",
          description: ts("word_sounds.segmentation_desc"),
          tier: "phonological",
        },
        {
          id: "rhyming",
          label: ts("word_sounds.activity_rhyming"),
          icon: "🎵",
          description: ts("word_sounds.rhyming_desc"),
          tier: "phonological",
        },
        {
          id: "manipulation",
          label: ts("word_sounds.activity_manipulation") || "Sound Swap",
          icon: "✂️",
          description:
            ts("word_sounds.manipulation_desc") ||
            "Delete or change sounds in words",
          tier: "phonological",
        },
        {
          id: "syllable_blending",
          label:
            ts("word_sounds.activity_syllable_blending") || "Syllable Blending",
          icon: "🔗",
          description:
            ts("word_sounds.syllable_blending_desc") ||
            "Blend syllables into whole words",
          tier: "phonological",
        },
        {
          id: "syllable_counting",
          label:
            ts("word_sounds.activity_syllable_counting") || "Syllable Claps",
          icon: "👏",
          description:
            ts("word_sounds.syllable_counting_desc") ||
            "Count the syllables in words",
          tier: "phonological",
        },
        {
          id: "orthography",
          label: ts("word_sounds.activity_orthography") || "Sight & Spell",
          icon: "👁️",
          description:
            ts("word_sounds.orthography_desc") || "Match sounds to spelling",
          tier: "orthographic",
        },
        {
          id: "mapping",
          label: ts("word_sounds.activity_mapping") || "Sound Mapping",
          icon: "🎹",
          description:
            ts("word_sounds.mapping_desc") || "Connect sounds to letters",
          tier: "orthographic",
        },
        {
          id: "spelling_bee",
          label: ts("word_sounds.activity_spelling_bee") || "Spelling Bee",
          icon: "🐝",
          description:
            ts("word_sounds.spelling_bee_desc") || "Spell the word you hear",
          tier: "orthographic",
        },
        {
          id: "word_scramble",
          label: ts("word_sounds.activity_word_scramble") || "Word Scramble",
          icon: "🔀",
          description:
            ts("word_sounds.word_scramble_desc") || "Unscramble the letters",
          tier: "orthographic",
        },
        {
          id: "missing_letter",
          label: ts("word_sounds.activity_missing_letter") || "Missing Letter",
          icon: "❓",
          description:
            ts("word_sounds.missing_letter_desc") || "Fill in the blank",
          tier: "orthographic",
        },
        {
          id: "sound_sort",
          label: ts("word_sounds.activity_sound_sort") || "Sound Sort",
          icon: "🔊",
          description:
            ts("word_sounds.sound_sort_desc") || "Sort words by shared sounds",
          tier: "phonological",
        },
        {
          id: "letter_tracing",
          label: ts("word_sounds.activity_letter_tracing") || "Letter Trace",
          icon: "✍️",
          description:
            ts("word_sounds.letter_tracing_desc") || "Trace the first letter",
          // Handwriting / letter-formation is orthographic, not phonological:
          // keep it out of phonological-only sessions (the default).
          tier: "orthographic",
        },
        {
          id: "word_families",
          label: ts("word_sounds.activity_word_families") || "Word Families",
          icon: "🏠",
          description:
            ts("word_sounds.word_families_desc") ||
            "Build the word family house",
          tier: "phonological",
        },
        {
          id: "decoding",
          label: ts("word_sounds.activity_decoding") || "Read & Match",
          icon: "\uD83D\uDCD6",
          description: ts("word_sounds.decoding_desc") || "Read the word and tap its picture",
          tier: "orthographic",
        },
      ];
      // ── Language capability model (multilingual stage 2, 2026-07-12) ──
      // English sessions take the FIRST branch everywhere below and behave
      // byte-identically to the pre-multilingual module. For other content
      // languages, activities whose machinery is English-specific (first/last-
      // sound estimators + English word pools, English rime families, a–z
      // letter-formation paths) are unavailable rather than half-working, and
      // letter-tile activities require an alphabetic script where one code
      // point is one teachable letter (abjads/abugidas/CJK/Thai-family would
      // render broken fragments from split("")).
      const wsLangCaps = React.useMemo(() => {
        const isEnglish =
          !wordSoundsLanguage ||
          String(wordSoundsLanguage).toLowerCase().indexOf("en") === 0;
        const primary = String(wordSoundsLanguage || "en")
          .toLowerCase()
          .split(/[-_]/)[0];
        const NON_ALPHABETIC = new Set([
          "ar", "he", "fa", "prs", "ur", "ps", "sd", "ug", "dv", // abjads
          "hi", "bn", "mr", "ne", "gu", "pa", "ta", "te", "kn", "ml", "si", "as", "or", // abugidas
          "th", "lo", "km", "my", "bo", "dz", // SE-Asian abugidas
          "zh", "cmn", "yue", "ja", "ko", // CJK
          "am", "ti", // Ge'ez
        ]);
        const RTL = new Set(["ar", "he", "fa", "prs", "ur", "ps", "sd", "ug", "dv", "ku"]);
        return {
          isEnglish,
          primary,
          letterTiles: isEnglish || !NON_ALPHABETIC.has(primary),
          rtl: RTL.has(primary),
        };
      }, [wordSoundsLanguage]);
      const wsActivityAvailableForLang = React.useCallback(
        (activityId) => {
          if (wsLangCaps.isEnglish) return true; // English: everything, unchanged
          switch (activityId) {
            // English-specific machinery — never half-run in another language:
            case "sound_sort": // estimateFirst/LastPhoneme + SOUND_MATCH_POOL are English
            case "word_families": // RIME_FAMILIES / '-at' derivation are English
            case "letter_tracing": // LETTER_SVG_PATHS covers a–z only
              return false;
            // Letter-tile / scramble activities need an alphabetic script:
            case "orthography":
            case "spelling_bee":
            case "word_scramble":
            case "missing_letter":
              return wsLangCaps.letterTiles;
            // Grapheme-ordering chips assume left-to-right:
            case "mapping":
              return wsLangCaps.letterTiles && !wsLangCaps.rtl;
            // Phoneme/syllable/picture activities run off per-word data in the
            // content language (eSpeak/Gemini phonemes, packed boards):
            default:
              return true;
          }
        },
        [wsLangCaps],
      );
      const ACTIVITIES = React.useMemo(() => {
        const tierFiltered = includeOrthographic
          ? ALL_ACTIVITIES
          : ALL_ACTIVITIES.filter((a) => a.tier === "phonological");
        if (wsLangCaps.isEnglish) return tierFiltered;
        return tierFiltered.filter((a) => wsActivityAvailableForLang(a.id));
      }, [includeOrthographic, wsLangCaps, wsActivityAvailableForLang]);
      // Skill-cluster grouping for the activity picker (UX). Maps each activity
      // to a research-aligned cluster along the phonological-awareness continuum
      // -> phonics -> spelling -> handwriting. Purely presentational; the
      // orthographic-tier gating above is unchanged.
      const ACTIVITY_GROUP_OF = {
        syllable_counting: "pa_large", syllable_blending: "pa_large", rhyming: "pa_large", word_families: "pa_large",
        counting: "pa_phoneme", segmentation: "pa_phoneme", isolation: "pa_phoneme", blending: "pa_phoneme", sound_sort: "pa_phoneme", manipulation: "pa_phoneme",
        mapping: "phonics", orthography: "phonics",
        spelling_bee: "spelling", word_scramble: "spelling", missing_letter: "spelling",
        letter_tracing: "handwriting", decoding: "phonics",
      };
      const ACTIVITY_GROUP_ORDER = ["pa_large", "pa_phoneme", "phonics", "spelling", "handwriting"];
      const ACTIVITY_GROUP_LABELS = { pa_large: "Syllables & Rhyme", pa_phoneme: "Phonemes", phonics: "Phonics", spelling: "Spelling", handwriting: "Writing" };
      const ACTIVITY_GROUP_FULL = { pa_large: "Sound awareness - larger units (syllables & rhyme)", pa_phoneme: "Phonemic awareness - individual sounds", phonics: "Phonics - sound to letter", spelling: "Spelling / encoding", handwriting: "Handwriting / letter formation" };
      const extractWords = React.useCallback((term) => {
        if (!term) return [];
        return term
          .split(/[\s-]+/)
          .filter((w) => w.length > 2 && /^[a-zA-Z]+$/.test(w));
      }, []);
      const PHONEME_NORMALIZE = {
        igh: "ie",
        tch: "ch",
        dge: "j",
        kn: "n",
        wr: "r",
        gn: "n",
        gh: "g",
        mb: "m",
        qu: "k",
        oi: "oy",
        aw: "au",
        ew: "oo",
        oe: "oa",
      };
      const estimatePhonemesBasic = React.useCallback((word) => {
        if (!word) return [];
        const w = word.toLowerCase();
        const digraphs = [
          "sh",
          "ch",
          "th",
          "wh",
          "ph",
          "ng",
          "ck",
          "qu",
          "wr",
          "kn",
          "gn",
          "gh",
          "mb",
          "ar",
          "er",
          "ir",
          "or",
          "ur",
        ];
        const trigraphs = ["igh", "tch", "dge"];
        const HARD_G_EXCEPTIONS = new Set([
          "get",
          "gets",
          "getting",
          "got",
          "girl",
          "girls",
          "give",
          "gives",
          "giving",
          "given",
          "gift",
          "gifts",
          "gear",
          "gears",
          "geese",
          "begin",
          "beginning",
          "beginnings",
        ]);
        let result = [];
        let i = 0;
        while (i < w.length) {
          if (i < w.length - 2 && trigraphs.includes(w.slice(i, i + 3))) {
            result.push(w.slice(i, i + 3));
            i += 3;
          } else if (i < w.length - 1 && digraphs.includes(w.slice(i, i + 2))) {
            result.push(w.slice(i, i + 2));
            i += 2;
          } else if (
            w[i] === "c" &&
            i < w.length - 1 &&
            ["e", "i", "y"].includes(w[i + 1])
          ) {
            result.push("s");
            i++;
          } else if (
            w[i] === "g" &&
            i < w.length - 1 &&
            ["e", "i", "y"].includes(w[i + 1])
          ) {
            if (HARD_G_EXCEPTIONS.has(w)) {
              result.push("g");
            } else {
              result.push("j");
            }
            i++;
          } else {
            result.push(w[i]);
            i++;
          }
        }
        return result.map((p) => PHONEME_NORMALIZE[p] || p);
      }, []);
      const [showProbeResults, setShowProbeResults] = React.useState(false);
      const probeStartTimeRef = React.useRef(null);
      React.useEffect(() => {
        if (typeof document === "undefined" || isMinimized) return undefined;
        const dialog = showProbeResults
          ? probeResultsDialogRef.current
          : showSessionComplete
            ? sessionCompleteDialogRef.current
            : modalRef.current;
        if (!dialog) return undefined;
        const initialTarget =
          dialog.querySelector("[data-dialog-initial-focus]") ||
          getDialogFocusable(dialog)[0] ||
          dialog;
        const focusTimer = setTimeout(() => {
          if (initialTarget && typeof initialTarget.focus === "function") {
            try { initialTarget.focus({ preventScroll: true }); } catch (e) { try { initialTarget.focus(); } catch (e2) {} }
          }
        }, 0);
        return () => clearTimeout(focusTimer);
      }, [showProbeResults, showSessionComplete, isMinimized]);
      // Per-word-difficulty accuracy for THIS probe (each history item is tagged
      // with wordDifficulty at answer time). Shared by the live session-complete
      // modal and the onProbeComplete payload so a difficulty shift between
      // probes is visible rather than mistaken for a skill change.
      const computeProbeByBand = React.useCallback((extraEntry) => {
        const _probeStart = probeStartTimeRef.current || 0;
        const _byBand = { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
        // extraEntry: the just-answered item, passed by checkAnswer because
        // its closure history predates the final setWordSoundsHistory —
        // without it the last item is missing from the banded payload.
        const _items = extraEntry
          ? [...(wordSoundsHistory || []), extraEntry]
          : wordSoundsHistory || [];
        _items.forEach((h) => {
          if (!h || h.timestamp < _probeStart || h.activity !== wordSoundsActivity) return;
          const _b = _byBand[h.wordDifficulty] ? h.wordDifficulty : "medium";
          _byBand[_b].t++; if (h.correct) _byBand[_b].c++;
        });
        return _byBand;
      }, [wordSoundsHistory, wordSoundsActivity]);
      const renderProbeResults = () => {
        const totalTime = probeStartTimeRef.current
          ? (Date.now() - probeStartTimeRef.current) / 1000
          : 0;
        const correct = wordSoundsScore.correct;
        const total = wordSoundsScore.total;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const itemsPerMin =
          totalTime > 0 ? Math.round((total / totalTime) * 60 * 10) / 10 : 0;
        // Per-word-difficulty breakdown so a difficulty shift between probes
        // is visible rather than mistaken for a skill change. Built from this
        // probe's history items (each tagged with wordDifficulty at answer time).
        const _probeStart = probeStartTimeRef.current || 0;
        const _byBand = { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
        (wordSoundsHistory || []).forEach((h) => {
          if (!h || h.timestamp < _probeStart || h.activity !== wordSoundsActivity) return;
          const _b = _byBand[h.wordDifficulty] ? h.wordDifficulty : "medium";
          _byBand[_b].t++; if (h.correct) _byBand[_b].c++;
        });
        const _bandPct = (b) => (_byBand[b].t > 0 ? Math.round((_byBand[b].c / _byBand[b].t) * 100) : "");
        const _bandTotal = _byBand.easy.t + _byBand.medium.t + _byBand.hard.t;
        const probeCSV = () => {
          const headers = [
            "Date",
            "Grade",
            "Activity",
            "Items Attempted",
            "Items Correct",
            "Accuracy %",
            "Items/Min",
            "Duration (s)",
            "CVC/Easy %", "CVC/Easy n", "Medium %", "Medium n", "Hard %", "Hard n",
          ];
          const row = [
            new Date().toLocaleDateString(),
            probeGradeLevel,
            wordSoundsActivity,
            total,
            correct,
            accuracy,
            itemsPerMin,
            Math.round(totalTime),
            _bandPct("easy"), _byBand.easy.t, _bandPct("medium"), _byBand.medium.t, _bandPct("hard"), _byBand.hard.t,
          ];
          const csv = headers.join(",") + "\n" + row.join(",");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download =
            "Probe_" +
            probeGradeLevel +
            "_" +
            wordSoundsActivity +
            "_" +
            new Date().toISOString().split("T")[0] +
            ".csv";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        };
        const finishProbe = () => {
          setShowProbeResults(false);
          if (onProbeComplete)
            onProbeComplete({
              correct,
              total,
              accuracy,
              itemsPerMin,
              duration: totalTime,
              byDifficulty: { easy: { ..._byBand.easy }, medium: { ..._byBand.medium }, hard: { ..._byBand.hard } },
            });
          onClose();
        };
        return /*#__PURE__*/ React.createElement(
          "div",
          {
            ref: probeResultsDialogRef,
            className:
              "fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "word-sounds-probe-results-title",
            onKeyDown: (event) => handleDialogKeyDown(event, finishProbe),
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-8 text-center border-4 border-violet-200",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "text-4xl mb-3" },
              "\uD83D\uDCCA",
            ),
            /*#__PURE__*/ React.createElement(
              "h2",
              {
                id: "word-sounds-probe-results-title",
                tabIndex: -1,
                "data-dialog-initial-focus": "true",
                className: "text-xl font-black text-slate-800 mb-1",
              },
              t("common.benchmark_probe_results"),
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className:
                  "text-xs font-bold text-slate-600 uppercase tracking-wider mb-6",
              },
              "Grade ",
              probeGradeLevel,
              " \u2022 ",
              wordSoundsActivity,
              " \u2022 ",
              new Date().toLocaleDateString(),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "grid grid-cols-2 gap-3 mb-6" },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-violet-50 border border-violet-200 rounded-xl p-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-3xl font-black text-violet-600" },
                  total,
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-[11px] font-bold text-slate-600 uppercase",
                  },
                  "Items Attempted",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-emerald-50 border border-emerald-200 rounded-xl p-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-3xl font-black text-emerald-600" },
                  correct,
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-[11px] font-bold text-slate-600 uppercase",
                  },
                  "Items Correct",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-indigo-50 border border-indigo-200 rounded-xl p-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: `text-3xl font-black ${accuracy >= 80 ? "text-green-600" : accuracy >= 60 ? "text-yellow-600" : "text-red-600"}`,
                  },
                  accuracy,
                  "%",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-[11px] font-bold text-slate-600 uppercase",
                  },
                  "Accuracy",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "bg-amber-50 border border-amber-200 rounded-xl p-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-3xl font-black text-amber-600" },
                  itemsPerMin,
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-[11px] font-bold text-slate-600 uppercase",
                  },
                  "Items / Min",
                ),
              ),
            ),
            _bandTotal > 0 &&
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-left" },
              /*#__PURE__*/ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1" }, "Accuracy by word difficulty"),
              ...["easy", "medium", "hard"].filter((b) => _byBand[b].t > 0).map((b) =>
                /*#__PURE__*/ React.createElement("div", { key: "bd-" + b, className: "flex justify-between text-sm text-slate-700" },
                  /*#__PURE__*/ React.createElement("span", { className: "capitalize" }, b === "easy" ? "CVC / easy" : b),
                  /*#__PURE__*/ React.createElement("span", { className: "font-mono" }, _byBand[b].c + "/" + _byBand[b].t + " (" + _bandPct(b) + "%)"),
                ),
              ),
              /*#__PURE__*/ React.createElement("div", { className: "text-[10px] text-slate-600 italic mt-1" }, "Compare like with like: a shift in word difficulty (not a skill change) can move the overall number."),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "text-xs text-slate-600 mb-4" },
              "Duration: ",
              Math.floor(totalTime / 60),
              ":",
              Math.round(totalTime % 60)
                .toString()
                .padStart(2, "0"),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex gap-3 justify-center" },
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: probeCSV,
                  className:
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors",
                },
                "\uD83D\uDCE5 Download CSV",
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: finishProbe,
                  className:
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-violet-600 text-white hover:bg-violet-700 transition-colors",
                },
                "Done",
              ),
            ),
          ),
        );
      };
      React.useEffect(() => {
        if (
          isProbeMode &&
          wordSoundsScore.total === 1 &&
          !probeStartTimeRef.current
        ) {
          probeStartTimeRef.current = Date.now();
        }
      }, [isProbeMode, wordSoundsScore.total]);
      const [probeElapsed, setProbeElapsed] = React.useState(0);
      React.useEffect(() => {
        if (!isProbeMode || !probeStartTimeRef.current) return;
        const interval = setInterval(() => {
          setProbeElapsed(
            Math.floor((Date.now() - probeStartTimeRef.current) / 1000),
          );
        }, 1000);
        return () => clearInterval(interval);
      }, [isProbeMode, probeStartTimeRef.current]);
      const wordPool = React.useMemo(() => {
        if (!glossaryTerms || glossaryTerms.length === 0) return [];
        const pool = [];
        glossaryTerms.forEach((term) => {
          const fullTerm = term.term || term.word || term;
          const words = extractWords(fullTerm);
          words.forEach((word) => {
            pool.push({
              word: word.toLowerCase(),
              originalTerm: fullTerm,
              displayWord: word,
              definition: term.definition || term.meaning || "",
              image: term.image || null,
              phonemes:
                fullTerm.toLowerCase() === word.toLowerCase() && term.phonemes
                  ? term.phonemes
                  : null,
              syllables:
                fullTerm.toLowerCase() === word.toLowerCase() && term.syllables
                  ? term.syllables
                  : null,
              rhymeWord: pickVariedRhyme(term.familyMembers, term.rhymeWord, word),
              wordFamily: term.wordFamily,
              familyMembers: term.familyMembers,
              phonemeCount: term.phonemeCount,
              firstSound: term.firstSound,
              lastSound: term.lastSound,
              middleSound: term.middleSound,
              rhymeDistractors: term.rhymeDistractors,
              blendingDistractors: term.blendingDistractors,
              orthographyDistractors: term.orthographyDistractors,
            });
          });
        });
        const seen = new Set();
        return pool.filter((entry) => {
          if (seen.has(entry.word)) return false;
          seen.add(entry.word);
          return true;
        });
      }, [glossaryTerms, extractWords]);
      const availableLanguages = React.useMemo(() => {
        const langs = new Set(["English"]);
        if (glossaryTerms && glossaryTerms.length > 0) {
          glossaryTerms.forEach((term) => {
            if (term.translations) {
              Object.keys(term.translations).forEach((l) => langs.add(l));
            }
          });
        } else {
          warnLog("⚠️ WordSoundsModal: glossaryTerms is empty or undefined");
        }
        const result = Array.from(langs);
        debugLog("✅ WordSoundsModal: availableLanguages", result);
        return result;
      }, [glossaryTerms]);
      const getRandomWord = React.useCallback(() => {
        if (!wordPool || wordPool.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * wordPool.length);
        const entry = wordPool[randomIndex];
        return {
          singleWord: entry.displayWord || entry.word,
          fullTerm: entry.originalTerm,
          definition: entry.definition,
          image: entry.image,
        };
      }, [wordPool]);
      const categorizeWordDifficulty = React.useCallback((word) => {
        if (!word) return "medium";
        const w = word.toLowerCase();
        const isSimpleCVC =
          /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(w);
        const isShortSimple =
          w.length <= 4 && !/[qxz]/.test(w) && !/([aeiou]){2,}/.test(w);
        const hasBlend =
          /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw|wr)/.test(
            w,
          ) || /(nd|ng|nk|nt|mp|ft|lt|pt|sk|sp|st)$/.test(w);
        const hasDigraph = /(ch|sh|th|wh|ph|ck|gh|kn|wr|mb|gn)/.test(w);
        // True silent-letter clusters only. Final-e is NOT lumped here: regular
        // CVCe (cake, bike, home) is a foundational early pattern, not a hard
        // "silent letter" word, so it should not be penalized out of "easy".
        const hasSilentLetter = /(kn|wr|mb|gn|gh)/.test(w);
        const isLong = w.length >= 7;
        const hasComplexVowel = /(oo|ee|ea|ou|ow|oi|oy|au|aw|ew|ie|ei)/.test(w);
        let complexity = 0;
        if (hasBlend) complexity += 2;
        if (hasDigraph) complexity += 2;
        if (hasSilentLetter) complexity += 1;
        if (hasComplexVowel) complexity += 1;
        if (isSimpleCVC || (isShortSimple && complexity === 0)) return "easy";
        // isLong is the hard trigger on its own (7+ letters); it no longer also
        // adds to complexity, so length is weighted once, not twice.
        if (complexity >= 4 || isLong) return "hard";
        return "medium";
      }, []);
      const getEffectiveDifficulty = React.useCallback(() => {
        if (wordSoundsDifficulty !== "auto") return wordSoundsDifficulty;
        const hist = wordSoundsHistory || [];
        // Adapt per-activity, not on a pooled window: a learner who is strong at
        // blending but weak at segmentation shouldn't get one averaged difficulty
        // that fits neither. Fall back to the pooled window until this activity
        // has enough of its own signal (a fresh activity would otherwise adapt off
        // 1-2 noisy items right after a switch).
        const perActivity = hist
          .filter((h) => h && h.activity === wordSoundsActivity)
          .slice(-10);
        const recentHistory =
          perActivity.length >= 4 ? perActivity : hist.slice(-10);
        if (recentHistory.length < 3) return "easy";
        const correctCount = recentHistory.filter((h) => h.correct).length;
        const accuracy = correctCount / recentHistory.length;
        const levelBoost = Math.min((wordSoundsLevel - 1) * 0.05, 0.15);
        if (accuracy >= 0.85 - levelBoost) return "hard";
        if (accuracy >= 0.6 - levelBoost) return "medium";
        return "easy";
      }, [wordSoundsDifficulty, wordSoundsHistory, wordSoundsActivity, wordSoundsLevel]);
      const categorizedPool = React.useMemo(() => {
        return wordPool.map((entry) => ({
          ...entry,
          difficulty: categorizeWordDifficulty(entry.word),
        }));
      }, [wordPool, categorizeWordDifficulty]);
      const getDifficultyFilteredPool = React.useCallback(() => {
        const effectiveDifficulty = getEffectiveDifficulty();
        let filtered = categorizedPool.filter(
          (e) => e.difficulty === effectiveDifficulty,
        );
        if (
          categorizedPool.length <= 15 ||
          (glossaryTerms && glossaryTerms.length > 0)
        ) {
          return categorizedPool;
        }
        if (filtered.length < 3) {
          if (effectiveDifficulty === "easy") {
            filtered = categorizedPool.filter((e) => e.difficulty !== "hard");
          } else if (effectiveDifficulty === "hard") {
            filtered = categorizedPool.filter((e) => e.difficulty !== "easy");
          } else {
            filtered = categorizedPool;
          }
        }
        return filtered.length > 0 ? filtered : categorizedPool;
      }, [categorizedPool, getEffectiveDifficulty]);
      const getAdaptiveRandomWord = React.useCallback(
        (excludeWord = null) => {
          const activityId = wordSoundsActivity || "segmentation";
          if (
            !sessionQueueRef.current[activityId] ||
            sessionQueueRef.current[activityId].length === 0
          ) {
            return null;
          }
          const queue = sessionQueueRef.current[activityId];
          const nextWord = queue[0];
          const remaining = queue.slice(1);
          sessionQueueRef.current[activityId] = remaining;
          setSessionWordLists((prev) => ({ ...prev, [activityId]: remaining }));
          return nextWord;
        },
        [wordSoundsActivity],
      );
      const [soundChips, setSoundChips] = React.useState([]);
      const [segmentationErrors, setSegmentationErrors] = React.useState([]);
      const [playingOptionIndex, setPlayingOptionIndex] = React.useState(null);
      const [showWordText, setShowWordText] = React.useState(false);
      const [draggedItem, setDraggedItem] = React.useState(null);
      const sessionQueueRef = React.useRef({});
      const [sessionWordLists, setSessionWordLists] = React.useState({});
      const SESSION_LENGTH = 10;
      const easyPool = React.useMemo(
        () =>
          wordPool
            ? wordPool.filter(
              (w) =>
                categorizeWordDifficulty &&
                categorizeWordDifficulty(w.word) === "easy",
            )
            : [],
        [wordPool, categorizeWordDifficulty],
      );
      const mediumPool = React.useMemo(
        () =>
          wordPool
            ? wordPool.filter(
              (w) =>
                categorizeWordDifficulty &&
                categorizeWordDifficulty(w.word) === "medium",
            )
            : [],
        [wordPool, categorizeWordDifficulty],
      );
      const hardPool = React.useMemo(
        () =>
          wordPool
            ? wordPool.filter(
              (w) =>
                categorizeWordDifficulty &&
                categorizeWordDifficulty(w.word) === "hard",
            )
            : [],
        [wordPool, categorizeWordDifficulty],
      );
      const generateSessionQueue = React.useCallback(
        (activityId, difficulty) => {
          // Prepared pack words take precedence: a nonempty glossary-derived
          // wordPool previously shadowed the teacher-reviewed pack, so
          // sessions drew raw glossary words with no prepared boards or
          // portable audio (blank on student devices). The glossary pool is
          // only the fallback when no pack was prepared.
          const rawPool =
            preloadedWords && preloadedWords.length > 0
              ? preloadedWords.map((pw) => ({
                word: pw.word || pw.targetWord || pw.displayWord,
                displayWord: pw.displayWord || pw.word,
                originalTerm: pw.targetWord,
                definition: pw.definition,
                image: pw.image,
                difficulty: "medium",
              }))
              : (wordPool || []);
          const uniqueMap = new Map();
          if (rawPool) {
            rawPool.forEach((w) => {
              const key = (
                w.word ||
                w.targetWord ||
                w.displayWord ||
                ""
              ).toLowerCase();
              if (key) uniqueMap.set(key, w);
            });
          }
          const effectivePool = Array.from(uniqueMap.values());
          if (!effectivePool || effectivePool.length === 0) {
            warnLog(
              "⚠️ generateSessionQueue: No words available in pool or preloaded!",
            );
            return [];
          }
          debugLog(
            `🎲 Generating session queue for ${activityId} (${difficulty})`,
          );
          let diffFiltered = effectivePool;
          if (categorizeWordDifficulty && difficulty !== "all") {
            diffFiltered = effectivePool.filter((w) => {
              const wordDiff = categorizeWordDifficulty(
                w.word || w.displayWord,
              );
              return wordDiff === difficulty;
            });
            debugLog(
              `📊 Difficulty filter (${difficulty}): ${diffFiltered.length}/${effectivePool.length} words`,
            );
          }
          let candidates = diffFiltered;
          if (candidates.length < SESSION_LENGTH) {
            debugLog(
              "⚠️ Not enough strict difficulty words, broadening pool...",
            );
            candidates = effectivePool;
          }
          const activityHistory = (wordSoundsHistory || [])
            .filter((h) => h.activity === activityId && h.correct)
            .map((h) => h.word?.toLowerCase());
          const playedSet = new Set(activityHistory);
          let freshCandidates = candidates.filter(
            (c) => !playedSet.has(c.word?.toLowerCase()),
          );
          if (freshCandidates.length < SESSION_LENGTH && !isSequentialMode) {
            debugLog("♻️ Pool exhausted, recycling words for queue...");
            freshCandidates = candidates;
          } else if (freshCandidates.length === 0 && isSequentialMode) {
            debugLog("🏁 Sequential Queue Empty: Activity Complete");
            if (isProbeMode) {
              setShowProbeResults(true);
              return null;
            }
            return [];
          }
          let selection = freshCandidates;
          if (!isSequentialMode) {
            selection = fisherYatesShuffle(freshCandidates);
          } else {
            selection = [...freshCandidates].sort((a, b) =>
              (a.word || "").localeCompare(b.word || ""),
            );
          }
          const queue = selection
            .slice(0, SESSION_LENGTH)
            .map((entry) => ({
              singleWord: entry.displayWord || entry.word,
              fullTerm: entry.originalTerm,
              definition: entry.definition,
              difficulty:
                entry.difficulty || categorizeWordDifficulty(entry.word),
              image: entry.image,
              uniqueId: Date.now() + Math.random(),
            }));
          debugLog(
            `✅ Queue generated: ${queue.length} words (Sequential: ${isSequentialMode})`,
          );
          sessionQueueRef.current[activityId] = queue;
          setSessionWordLists((prev) => ({ ...prev, [activityId]: queue }));
          return queue;
        },
        [
          wordPool,
          preloadedWords,
          wordSoundsHistory,
          categorizeWordDifficulty,
          isSequentialMode,
        ],
      );
      const generateSoundChips = React.useCallback((phonemes) => {
        if (!Array.isArray(phonemes)) return [];
        const getPastelColor = (idx, total) => {
          const hue = (idx * (360 / total)) % 360;
          return `hsl(${hue}, 85%, 92%)`;
        };
        let chipCount = 0;
        const correctChips = (Array.isArray(phonemes) ? phonemes : []).map(
          (rawP, i) => {
            const p = (rawP || "").trim();
            chipCount++;
            return {
              id: `correct-${i}-${Date.now()}`,
              phoneme: p,
              isDistractor: false,
              used: false,
              color: getPastelColor(chipCount, 12),
            };
          },
        );
        // Dedup by SOUND class (phonemeKey), not spelling — otherwise a word
        // containing "c" could get an injected "k" distractor chip that sounds
        // identical but grades wrong (unsolvable by ear in sound-only mode).
        const usedPhonemes = new Set(
          (Array.isArray(phonemes) ? phonemes : []).map((p) =>
            phonemeKey((p || "").toLowerCase().trim()),
          ),
        );
        const commonPhonemes = [
          "s",
          "t",
          "r",
          "n",
          "l",
          "k",
          "p",
          "m",
          "b",
          "d",
          "sh",
          "ch",
          "th",
          "ar",
          "er",
        ];
        const distractors = [];
        const numDistractors = Math.max(3, Math.ceil(phonemes.length * 0.5));
        const shuffledCommon = fisherYatesShuffle(commonPhonemes);
        for (const p of shuffledCommon) {
          if (distractors.length >= numDistractors) break;
          const pLower = phonemeKey(p.toLowerCase());
          if (!usedPhonemes.has(pLower)) {
            chipCount++;
            usedPhonemes.add(pLower);
            distractors.push({
              id: `distractor-${distractors.length}-${Date.now()}`,
              phoneme: p,
              isDistractor: true,
              used: false,
              color: getPastelColor(chipCount + 5, 12),
            });
          }
        }
        return fisherYatesShuffle([...correctChips, ...distractors]);
      }, []);
      const updatePhonemeMastery = React.useCallback(
        (phonemes, isCorrect) => {
          if (!phonemes || !Array.isArray(phonemes) || !setPhonemeMastery)
            return;
          setPhonemeMastery((prev) => {
            const updated = { ...prev };
            (Array.isArray(phonemes) ? phonemes : []).forEach((phoneme) => {
              const p = phoneme.toLowerCase();
              if (!updated[p]) {
                updated[p] = { correct: 0, total: 0 };
              }
              updated[p].total += 1;
              if (isCorrect) {
                updated[p].correct += 1;
              }
              // Consumers (teacher_module, student_analytics) filter on v.accuracy,
              // which was never written -> the "mastered phonemes" list was always
              // empty. Compute it at write time so per-phoneme mastery is readable.
              updated[p].accuracy =
                updated[p].total > 0
                  ? Math.round((updated[p].correct / updated[p].total) * 100)
                  : 0;
            });
            return updated;
          });
        },
        [setPhonemeMastery],
      );
      const trackConfusion = React.useCallback(
        (expected, actual) => {
          if (
            !expected ||
            !actual ||
            typeof expected !== "string" ||
            typeof actual !== "string"
          )
            return;
          if (expected.toLowerCase() === actual.toLowerCase()) return;
          if (!setWordSoundsConfusionPatterns) return;
          setWordSoundsConfusionPatterns((prev) => {
            const key = `${expected.toLowerCase()}->${actual.toLowerCase()}`;
            const updated = { ...prev };
            updated[key] = (updated[key] || 0) + 1;
            return updated;
          });
        },
        [setWordSoundsConfusionPatterns],
      );
      const updateDailyProgress = React.useCallback(
        (isCorrect) => {
          if (!setWordSoundsDailyProgress) return;
          const today = new Date().toISOString().split("T")[0];
          setWordSoundsDailyProgress((prev) => {
            const updated = { ...prev };
            if (!updated[today]) {
              updated[today] = { total: 0, correct: 0, streak: 0 };
            }
            updated[today].total += 1;
            if (isCorrect) {
              updated[today].correct += 1;
            }
            return updated;
          });
        },
        [setWordSoundsDailyProgress],
      );
      const checkAndAwardBadges = React.useCallback(
        (activity, isCorrect, currentStreak) => {
          if (!setWordSoundsBadges) return;
          const newBadges = [];
          const history = wordSoundsHistory || [];
          const totalCorrect =
            history.filter((h) => h.correct).length + (isCorrect ? 1 : 0);
          const badgeChecks = [
            {
              id: "first_sound",
              condition: totalCorrect >= 1,
              name: "First Sound",
              icon: "🎵",
            },
            {
              id: "streak_5",
              condition: currentStreak >= 5,
              name: "On Fire!",
              icon: "🔥",
            },
            {
              id: "streak_10",
              condition: currentStreak >= 10,
              name: "Unstoppable",
              icon: "⚡",
            },
            {
              id: "streak_25",
              condition: currentStreak >= 25,
              name: "Legendary",
              icon: "🏆",
            },
            {
              id: "perfect_10",
              condition:
                history.slice(-10).filter((h) => h.correct).length === 10,
              name: "Perfect 10",
              icon: "💯",
            },
            {
              id: "rhyme_master",
              condition:
                history.filter((h) => h.activity === "rhyming" && h.correct)
                  .length >= 20,
              name: "Rhyme Master",
              icon: "🎤",
            },
            {
              id: "sound_detective",
              condition:
                history.filter((h) => h.activity === "isolation" && h.correct)
                  .length >= 20,
              name: "Sound Detective",
              icon: "🔍",
            },
            {
              id: "counting_pro",
              condition:
                history.filter((h) => h.activity === "counting" && h.correct)
                  .length >= 20,
              name: "Counting Pro",
              icon: "🔢",
            },
          ];
          badgeChecks.forEach((badge) => {
            if (
              badge.condition &&
              !wordSoundsBadges.find((b) => b.id === badge.id)
            ) {
              newBadges.push({ ...badge, earnedAt: new Date().toISOString() });
            }
          });
          if (newBadges.length > 0) {
            setWordSoundsBadges((prev) => [...prev, ...newBadges]);
          }
          return newBadges;
        },
        [wordSoundsHistory, wordSoundsBadges, setWordSoundsBadges],
      );
      const DifficultyIndicator = React.useCallback(() => {
        const effectiveDifficulty = getEffectiveDifficulty();
        const colors = { easy: "#22c55e", medium: "#eab308", hard: "#ef4444" };
        const labels = { easy: "Easy", medium: "Medium", hard: "Hard" };
        return /*#__PURE__*/ React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "12px",
              backgroundColor: colors[effectiveDifficulty] + "20",
              border: `1px solid ${colors[effectiveDifficulty]}`,
              fontSize: "12px",
              fontWeight: 500,
              color: colors[effectiveDifficulty],
            },
          },
          /*#__PURE__*/ React.createElement(
            "span",
            null,
            wordSoundsDifficulty === "auto" ? "🤖" : "📊",
          ),
          /*#__PURE__*/ React.createElement(
            "span",
            null,
            labels[effectiveDifficulty],
          ),
          wordSoundsDifficulty === "auto" &&
            /*#__PURE__*/ React.createElement(
            "span",
            { style: { fontSize: "10px", opacity: 0.7 } },
            "(Auto)",
          ),
        );
      }, [getEffectiveDifficulty, wordSoundsDifficulty]);
      const [currentWordImage, setCurrentWordImage] = React.useState(null);
      const lastPlayedWord = React.useRef(null);
      const wordDataCache = React.useRef(new Map());
      const pendingRequests = React.useRef(new Map());
      const applyWordDataToState = (data) => {
        if (
          data &&
          data.word &&
          pendingRequests.current.has(data.word.toLowerCase())
        ) {
          const { resolve } = pendingRequests.current.get(
            data.word.toLowerCase(),
          );
          resolve(data);
          pendingRequests.current.delete(data.word.toLowerCase());
        }
        if (!data) return;
        setWordSoundsPhonemes(data);
        if (
          wordSoundsActivity === "blending" &&
          data.blendingDistractors &&
          setBlendingOptions
        ) {
          const target = (data.word || "").trim().toLowerCase();
          const unique = [
            ...new Set(
              data.blendingDistractors
                .map((d) => (d || "").toString().trim().toLowerCase())
                .filter((d) => d && d !== target),
            ),
          ];
          if (unique.length >= 1) {
            const validUnique = unique.slice(0, 5);
            // Pad to 5 distractors if fewer available
            if (validUnique.length < 5) {
              const BLEND_FALLBACK_POOL = ["dog","cat","sun","bed","map","pig","run","hop","net","cup","hat","log","mop","pen","rug","van","zip","fox","jet","web"];
              const usedSet = new Set([target, ...validUnique]);
              const shuffledPool = fisherYatesShuffle([...BLEND_FALLBACK_POOL]);
              for (const fw of shuffledPool) {
                if (validUnique.length >= 5) break;
                if (!usedSet.has(fw)) { validUnique.push(fw); usedSet.add(fw); }
              }
            }
            const opts = fisherYatesShuffle([target, ...validUnique]);
            setBlendingOptions(opts);
          }
        }
        setIsLoadingPhonemes(false);
        setPhonemeError(null);
        // Never cache dataless entries — a phonemes:null item re-served from
        // cache breaks every downstream activity for that word permanently.
        if (data.word && data.phonemes && data.phonemes.length) {
          wordDataCache.current.set(data.word.toLowerCase(), data);
        }
      };
      const fetchWordData = React.useCallback(
        async (
          word,
          retryCount = 0,
          isBackground = false,
          forceRefresh = false,
        ) => {
          latestRequestedWord.current = word;
          if (!word) return;
          if (pendingRequests.current.has(word.toLowerCase())) {
            debugLog(`⏳ Request for "${word}" already pending, waiting...`);
            const { promise } = pendingRequests.current.get(word.toLowerCase());
            return promise;
          }
          let resolveRequest, rejectRequest;
          const requestPromise = new Promise((resolve, reject) => {
            resolveRequest = resolve;
            rejectRequest = reject;
          });
          pendingRequests.current.set(word.toLowerCase(), {
            promise: requestPromise,
            resolve: resolveRequest,
            reject: rejectRequest,
          });
          const cleanupRequest = () => {
            pendingRequests.current.delete(word.toLowerCase());
          };
          if (retryCount === 0) setPhonemeError(null);
          const cached = wordDataCache.current.get(word.toLowerCase());
          if (cached && !forceRefresh) {
            applyWordDataToState(cached);
            resolveRequest(cached);
            cleanupRequest();
            return;
          }
          const poolEntry = wordPool.find(
            (p) =>
              p.word === word.toLowerCase() &&
              p.phonemes &&
              p.phonemes.length > 0,
          );
          if (poolEntry && !forceRefresh) {
            debugLog("⚡ using Glossary pre-generated data for:", word);
            applyWordDataToState(poolEntry);
            return poolEntry;
          }
          const MAX_RETRIES = 3;
          if (!isBackground) setIsLoadingPhonemes(true);
          let phonemeData = null;
          if (!phonemeData) {
            const fallbackPhonemes = estimatePhonemesBasic
              ? estimatePhonemesBasic(word)
              : word.toLowerCase().split("");
            const wordLower = word.toLowerCase();
            const rhymeEnding =
              wordLower.length >= 3 ? wordLower.slice(-3) : wordLower.slice(-2);
            const rhymeEndingShort = wordLower.slice(-2);
            const rhymeFamilies = {
              an: [
                "can",
                "fan",
                "man",
                "pan",
                "ran",
                "tan",
                "van",
                "ban",
                "dan",
              ],
              at: ["cat", "bat", "hat", "mat", "rat", "sat", "pat", "fat"],
              op: ["hop", "mop", "top", "pop", "stop", "chop", "drop", "shop"],
              ig: ["big", "dig", "fig", "pig", "wig", "jig", "rig"],
              og: ["dog", "fog", "hog", "log", "jog", "frog", "blog"],
              un: ["bun", "fun", "run", "sun", "pun", "spun"],
              ug: ["bug", "dug", "hug", "jug", "mug", "rug", "tug", "plug"],
              in: ["bin", "fin", "pin", "win", "tin", "spin", "grin", "chin"],
              it: ["bit", "fit", "hit", "kit", "pit", "sit", "wit", "spit"],
              ot: ["cot", "dot", "got", "hot", "lot", "not", "pot", "shot"],
              et: [
                "bet",
                "get",
                "jet",
                "let",
                "met",
                "net",
                "pet",
                "set",
                "wet",
              ],
              en: ["ben", "den", "hen", "men", "pen", "ten", "when", "then"],
              ed: ["bed", "fed", "led", "red", "wed", "shed", "sled"],
              ap: [
                "cap",
                "gap",
                "lap",
                "map",
                "nap",
                "rap",
                "tap",
                "trap",
                "clap",
              ],
              ip: [
                "dip",
                "hip",
                "lip",
                "rip",
                "sip",
                "tip",
                "zip",
                "chip",
                "ship",
                "trip",
              ],
              ck: [
                "back",
                "pack",
                "rack",
                "tack",
                "black",
                "crack",
                "snack",
                "track",
              ],
              ell: [
                "bell",
                "cell",
                "fell",
                "sell",
                "tell",
                "well",
                "yell",
                "shell",
                "spell",
              ],
              ill: [
                "bill",
                "fill",
                "hill",
                "mill",
                "pill",
                "will",
                "chill",
                "drill",
                "skill",
              ],
              all: [
                "ball",
                "call",
                "fall",
                "hall",
                "mall",
                "tall",
                "wall",
                "small",
              ],
              ook: ["book", "cook", "hook", "look", "took", "brook", "shook"],
              ake: [
                "bake",
                "cake",
                "fake",
                "lake",
                "make",
                "rake",
                "take",
                "wake",
                "shake",
                "snake",
              ],
              ame: [
                "came",
                "fame",
                "game",
                "name",
                "same",
                "tame",
                "blame",
                "flame",
                "frame",
                "shame",
              ],
              ate: [
                "date",
                "fate",
                "gate",
                "hate",
                "late",
                "mate",
                "rate",
                "plate",
                "skate",
                "state",
              ],
              ide: [
                "hide",
                "ride",
                "side",
                "wide",
                "bride",
                "glide",
                "pride",
                "slide",
              ],
              ine: [
                "dine",
                "fine",
                "line",
                "mine",
                "nine",
                "pine",
                "vine",
                "shine",
                "spine",
              ],
              ore: [
                "bore",
                "core",
                "more",
                "pore",
                "sore",
                "tore",
                "wore",
                "shore",
                "store",
                "score",
              ],
            };
            let rhymeDistractors = [];
            for (const [ending, family] of Object.entries(rhymeFamilies)) {
              if (wordLower.endsWith(ending)) {
                const seed = wordLower
                  .split("")
                  .reduce((a, c) => a + c.charCodeAt(0), 0);
                const shuffled = [...family].sort((a, b) => {
                  const hashA = (seed * 31 + a.charCodeAt(0)) % 97;
                  const hashB = (seed * 31 + b.charCodeAt(0)) % 97;
                  return hashA - hashB;
                });
                rhymeDistractors = shuffled
                  .filter((w) => w !== wordLower)
                  .slice(0, 5);
                break;
              }
            }
            if (rhymeDistractors.length === 0 && rhymeEndingShort.length >= 2) {
              const consonants = [
                "b",
                "c",
                "d",
                "f",
                "g",
                "h",
                "j",
                "k",
                "l",
                "m",
                "n",
                "p",
                "r",
                "s",
                "t",
                "w",
              ];
              rhymeDistractors = consonants
                .map((c) => c + rhymeEndingShort)
                .filter((w) => w !== wordLower && w.length >= 2)
                .slice(0, 3);
            }
            const blendingDistractors = [];
            const commonWords = [
              "cat",
              "dog",
              "sun",
              "run",
              "big",
              "hot",
              "top",
              "sit",
              "hat",
              "map",
              "cup",
              "bed",
              "red",
              "pen",
              "bus",
              "pig",
              "bat",
              "fan",
              "pin",
              "pot",
              "net",
              "jet",
              "wet",
              "bet",
              "hen",
              "leg",
              "fox",
              "box",
              "nut",
              "cut",
              "bug",
              "rug",
              "hug",
              "tub",
              "cub",
              "web",
              "jam",
              "ham",
              "van",
              "gap",
            ];
            const seed = wordLower
              .split("")
              .reduce((a, c) => a + c.charCodeAt(0), 0);
            const shuffled = [...commonWords].sort((a, b) => {
              const hashA = (seed * a.charCodeAt(0)) % 100;
              const hashB = (seed * b.charCodeAt(0)) % 100;
              return hashA - hashB;
            });
            const homophonePairs = {
              sun: ["son"],
              son: ["sun"],
              ate: ["eight"],
              eight: ["ate"],
              sea: ["see", "c"],
              see: ["sea", "c"],
              two: ["to", "too"],
              to: ["two", "too"],
              too: ["to", "two"],
              red: ["read"],
              read: ["red"],
              blue: ["blew"],
              blew: ["blue"],
              one: ["won"],
              won: ["one"],
              bear: ["bare"],
              bare: ["bear"],
              deer: ["dear"],
              dear: ["deer"],
              eye: ["i"],
              i: ["eye"],
              know: ["no"],
              no: ["know"],
              right: ["write"],
              write: ["right"],
            };
            for (const w of shuffled) {
              const isHp =
                isHomophone(wordLower, w) ||
                (homophonePairs[wordLower] &&
                homophonePairs[wordLower].includes(w));
              if (
                w !== wordLower &&
                !isHp &&
                Math.abs(w.length - wordLower.length) <= 1 &&
                blendingDistractors.length < 5
              ) {
                blendingDistractors.push(w);
              }
            }
            phonemeData = {
              word: word,
              phonemes: fallbackPhonemes,
              phonemeCount: fallbackPhonemes.length,
              firstSound: fallbackPhonemes[0] || wordLower[0] || "",
              lastSound:
                fallbackPhonemes[fallbackPhonemes.length - 1] ||
                wordLower[wordLower.length - 1] ||
                "",
              rhymeWord: pickVariedRhyme(rhymeDistractors, rhymeDistractors[0] || "", wordLower),
              rhymeDistractors: rhymeDistractors,
              blendingDistractors: blendingDistractors,
              familyEnding: "-" + rhymeEndingShort,
              familyMembers: rhymeDistractors,
              mappingGraphemes: fallbackPhonemes,
            };
            // Attach manipulationTask so the Sound Swap activity has preloaded
            // data (instruction + answer + distractors) for this word — no
            // mid-activity Gemini stall, and the user can edit/preview in the
            // Pre-Activity Review before the student hears it.
            try {
              phonemeData.manipulationTask = await generateManipulationTask(word, fallbackPhonemes);
            } catch (e) {
              phonemeData.manipulationTask = null;
            }
            debugLog(
              "📦 Generated local fallback phoneme data for:",
              word,
              phonemeData,
            );
            // Only apply to LIVE state when this is still the latest
            // foreground request — background prefetches and superseded
            // fetches (word N resolving after word N+1) were last-writer-wins
            // clobbering the current word's data.
            const _isLatestReq =
              (latestRequestedWord.current || "").toLowerCase() ===
              word.toLowerCase();
            if (_isLatestReq && !isBackground) {
              applyWordDataToState(phonemeData);
            }
            wordDataCache.current.set(word.toLowerCase(), phonemeData);
          }
          if (resolveRequest) resolveRequest(phonemeData);
          cleanupRequest();
          setIsLoadingPhonemes(false);
          return phonemeData;
        },
        [wordSoundsLanguage, callGemini, generateManipulationTask],
      );
      const generateFallbackData = (word) => {
        const phonemes = estimatePhonemesBasic
          ? estimatePhonemesBasic(word)
          : word.toLowerCase().split("");
        return {
          word,
          phonemes,
          phonemeCount: phonemes.length,
          firstSound: phonemes[0],
          lastSound: phonemes[phonemes.length - 1],
          rhymeWord: "",
          rhymeDistractors: [],
          orthographyDistractors: [],
        };
      };
      React.useEffect(() => {
        const repairBlendingDistractors = async () => {
          if (wordSoundsActivity === "blending" && wordSoundsPhonemes) {
            const targetToCheck = (
              currentWordSoundsWord ||
              wordSoundsPhonemes?.word ||
              ""
            )
              .trim()
              .toLowerCase();
            if (lastWordForBlending.current !== targetToCheck) {
              setBlendingOptions && setBlendingOptions([]);
              debugLog("🔄 Word changed, clearing stale blending options");
            }
            if (
              lastWordForBlending.current === targetToCheck &&
              blendingOptions.length > 0
            ) {
              return;
            }
            lastWordForBlending.current = targetToCheck;
            // Word-match guard: only trust the prepared board when the pack
            // entry is for THIS word — stale wordSoundsPhonemes mid-advance
            // would install the previous word's options (whose "correct"
            // answer isn't even on the board).
            const preparedBlending =
              String(wordSoundsPhonemes?.word || "").trim().toLowerCase() ===
                targetToCheck
                ? wordSoundsPhonemes?.activityItems?.blending
                : null;
            if (
              Array.isArray(preparedBlending?.options) &&
              preparedBlending.options.length > 1 &&
              preparedBlending.options.some(
                (o) => String(o || "").trim().toLowerCase() === targetToCheck,
              )
            ) {
              setBlendingOptions([...preparedBlending.options]);
              return;
            }
            let rawDistractors = wordSoundsPhonemes?.blendingDistractors || [];
            const hpMap = {
              sun: ["son"],
              son: ["sun"],
              ate: ["eight"],
              eight: ["ate"],
              sea: ["see", "c"],
              see: ["sea", "c"],
              two: ["to", "too"],
              to: ["two", "too"],
              too: ["to", "two"],
              red: ["read"],
              read: ["red"],
              blue: ["blew"],
              blew: ["blue"],
              one: ["won"],
              won: ["one"],
              bear: ["bare"],
              bare: ["bear"],
              deer: ["dear"],
              dear: ["deer"],
              eye: ["i"],
              i: ["eye"],
              know: ["no"],
              no: ["know"],
              right: ["write"],
              write: ["right"],
            };
            let uniqueDistractors = [
              ...new Set(
                rawDistractors
                  .map((d) => (d || "").toString().trim().toLowerCase())
                  .filter(
                    (d) =>
                      d &&
                      d !== targetToCheck &&
                      !isHomophone(targetToCheck, d) &&
                      !(
                        hpMap[targetToCheck] && hpMap[targetToCheck].includes(d)
                      ),
                  ),
              ),
            ];
            if (uniqueDistractors.length < 5) {
              debugLog("⚠️ Insufficient unique distractors. Repairing...");
              try {
                const repairPrompt = `List 3 unique distractor words for "${targetToCheck}" (cannot be the word itself). Return JSON array.`;
                const repairRes = await callGemini(repairPrompt, true);
                const repairMatch = repairRes.match(/\[[\s\S]*\]/);
                if (repairMatch) {
                  const fixed = JSON.parse(repairMatch[0]);
                  const merged = [...uniqueDistractors, ...fixed];
                  uniqueDistractors = [
                    ...new Set(
                      merged
                        .map((d) => d.trim().toLowerCase())
                        .filter((d) => d !== targetToCheck),
                    ),
                  ];
                }
              } catch (repairErr) {
                warnLog("Blending repair failed", repairErr);
              }
            }
            const finalDistractors = uniqueDistractors.slice(0, 5);
            while (finalDistractors.length < 5) {
              const fallbacks = ["cat", "dog", "run", "pig", "sun", "mat", "hat"];
              const needed = fallbacks.find(f => !finalDistractors.includes(f) && f !== targetToCheck);
              if (needed) finalDistractors.push(needed);
              else break;
            }
            const finalOptions = [targetToCheck, ...finalDistractors];
            const uniqueFinalOptions = [...new Set(finalOptions)];
            // Staleness guard: the Gemini repair can straddle a word advance;
            // without this, word N's option set (whose "correct" answer is
            // word N) clobbered word N+1's freshly-set options — the new
            // target wasn't even in the list, so blending was unwinnable.
            if (_repairCancelled) return;
            setBlendingOptions &&
              setBlendingOptions(fisherYatesShuffle(uniqueFinalOptions));
            debugLog(
              "✅ Blending options set (Unique & Filtered):",
              uniqueFinalOptions,
            );
          }
        };
        let _repairCancelled = false;
        repairBlendingDistractors();
        return () => {
          _repairCancelled = true;
        };
      }, [
        wordSoundsActivity,
        wordSoundsPhonemes,
        currentWordSoundsWord,
        callGemini,
      ]);
      // Read & Match distractors: same difficulty band + orthographic
      // neighbors (shared rime/onset, equal length, or one grapheme apart),
      // homophones excluded, backfilled from a decodable list so there are
      // always >= 3 choices. This makes a correct answer require decoding the
      // printed word rather than picture-elimination, so Read & Match works as
      // a genuine decoding indicator, not a recognition game.
      const DECODING_BACKFILL = ["cat", "dog", "sun", "map", "bed", "pig", "cup", "hat", "fish", "star", "tree", "frog", "duck", "book"];
      const buildDecodingDistractors = (target) => {
        const tgt = (target || "").toLowerCase();
        const band = categorizeWordDifficulty(tgt);
        const rime = tgt.length >= 2 ? tgt.slice(-2) : tgt;
        const onset = tgt.charAt(0);
        const editDist1 = (a, b) => {
          if (Math.abs(a.length - b.length) > 1) return false;
          let i = 0, j = 0, edits = 0;
          while (i < a.length && j < b.length) {
            if (a[i] === b[j]) { i++; j++; continue; }
            if (++edits > 1) return false;
            if (a.length > b.length) i++;
            else if (a.length < b.length) j++;
            else { i++; j++; }
          }
          return edits + (a.length - i) + (b.length - j) <= 1;
        };
        const isNeighbor = (w) =>
          w.length === tgt.length ||
          (w.length >= 2 && w.slice(-2) === rime) ||
          (onset && w.charAt(0) === onset) ||
          editDist1(w, tgt);
        const all = [...new Set((wordPool || []).map((p) => p.word).filter(
          (w) => w && w !== tgt && !isHomophone(tgt, w),
        ))];
        const sameBand = all.filter((w) => categorizeWordDifficulty(w) === band);
        const ordered = [
          ...fisherYatesShuffle(sameBand.filter(isNeighbor)),
          ...fisherYatesShuffle(sameBand.filter((w) => !isNeighbor(w))),
          ...fisherYatesShuffle(all.filter((w) => categorizeWordDifficulty(w) !== band)),
        ];
        const picked = [];
        for (const w of ordered) { if (picked.length >= 3) break; if (picked.indexOf(w) === -1) picked.push(w); }
        if (picked.length < 3) {
          // DECODING_BACKFILL is English words — never inject them into a
          // non-English board; pad from the session's own words instead.
          const backfill = wsLangCaps.isEnglish
            ? DECODING_BACKFILL
            : (preloadedWords || []).map((p) => String(p.targetWord || p.word || p.term || "").toLowerCase());
          for (const w of fisherYatesShuffle(backfill)) {
            if (picked.length >= 3) break;
            if (w && w !== tgt && picked.indexOf(w) === -1 && !isHomophone(tgt, w)) picked.push(w);
          }
        }
        return picked.slice(0, 3);
      };
      // Read & Match (decoding): printed word (NOT spoken) -> tap/drag its picture.
      // Prefers the teacher-reviewed pack board + pack images; Imagen only
      // backfills choices the pack didn't cover (never on student devices,
      // where the boundary nulls callImagen).
      const decodingPreparedForRef = React.useRef(null);
      React.useEffect(() => {
        if (wordSoundsActivity !== "decoding") return;
        const target = (currentWordSoundsWord || "").toLowerCase();
        if (!target) return;
        const preparedDecoding =
          String(wordSoundsPhonemes?.word || "").trim().toLowerCase() === target
            ? wordSoundsPhonemes?.activityItems?.decoding
            : null;
        const preparedUsable =
          Array.isArray(preparedDecoding?.choices) &&
          preparedDecoding.choices.length >= 2 &&
          preparedDecoding.choices.some(
            (w) => String(w || "").toLowerCase() === target,
          );
        // Re-run for the same word only to upgrade a deterministic board to
        // the prepared one (pack data can arrive a beat after the word).
        if (
          lastWordForDecoding.current === target &&
          (!preparedUsable || decodingPreparedForRef.current === target)
        )
          return;
        lastWordForDecoding.current = target;
        decodingPreparedForRef.current = preparedUsable ? target : null;
        const choices = preparedUsable
          ? [...preparedDecoding.choices]
          : fisherYatesShuffle([
            currentWordSoundsWord || target,
            ...buildDecodingDistractors(target),
          ]);
        setDecodingChoices(choices);
        const uncovered = [];
        choices.forEach((w) => {
          const lc = (w || "").toLowerCase();
          if (!lc || optionImagesCache.current.has(w) || optionImagesCache.current.has(lc)) return;
          const packedImg = preparedImageLibrary[lc];
          if (packedImg) {
            optionImagesCache.current.set(lc, packedImg);
            setOptionImages((prev) => ({ ...prev, [lc]: packedImg }));
            return;
          }
          const pe = (wordPool || []).find((p) => p.word === lc);
          if (pe && pe.image) return;
          uncovered.push(w);
        });
        if (typeof callImagen === "function") {
          uncovered.forEach((w) => {
            const lc = (w || "").toLowerCase();
            callImagen(`Simple flat vector icon of "${w}", minimal educational illustration, white background, no text or labels`)
              .then((img) => { if (img) { optionImagesCache.current.set(lc, img); setOptionImages((prev) => ({ ...prev, [lc]: img })); } })
              .catch(() => {});
          });
        }
      }, [wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes, wordPool, callImagen, preparedImageLibrary,
        // startActivity clears decodingChoices + the word guard; watching the
        // state re-runs the rebuild (the guard above prevents any loop).
        decodingChoices]);
      const generateOrthographyDistractors = (word) => {
        if (!word || word.length < 2)
          return [`${word}s`, `${word}ed`, `un${word}`];
        const distractors = [];
        const lowerWord = word.toLowerCase();
        if (/(.)\1/.test(lowerWord)) {
          distractors.push(lowerWord.replace(/(.)\1/, "$1"));
        } else if (lowerWord.length > 2) {
          distractors.push(
            lowerWord.slice(0, 2) + lowerWord[1] + lowerWord.slice(2),
          );
        }
        const vowelSwaps = { a: "e", e: "a", i: "e", o: "u", u: "o" };
        for (let i = 0; i < lowerWord.length; i++) {
          if (vowelSwaps[lowerWord[i]]) {
            distractors.push(
              lowerWord.slice(0, i) +
              vowelSwaps[lowerWord[i]] +
              lowerWord.slice(i + 1),
            );
            break;
          }
        }
        if (lowerWord.length > 3) {
          const midIndex = Math.floor(lowerWord.length / 2);
          distractors.push(
            lowerWord.slice(0, midIndex) + lowerWord.slice(midIndex + 1),
          );
        }
        distractors.push(lowerWord + "s");
        if (lowerWord.includes("c"))
          distractors.push(lowerWord.replace("c", "k"));
        if (lowerWord.includes("k"))
          distractors.push(lowerWord.replace("k", "c"));
        if (lowerWord.includes("ph"))
          distractors.push(lowerWord.replace("ph", "f"));
        const filtered = [...new Set(distractors)].filter(
          (d) => d !== lowerWord && d.length > 0,
        );
        while (filtered.length < 3) {
          filtered.push(`${lowerWord}${["x", "z", "q"][filtered.length]}`);
        }
        return filtered.slice(0, 4);
      };
      const prefetchNextWords = React.useCallback(async () => {
        return;
      }, [
        preloadedWords,
        isPrefetching,
        currentWordSoundsWord,
        wordSoundsActivity,
        fetchWordData,
        getDifficultyFilteredPool,
      ]);
      const preloadInitialBatch = React.useCallback(async () => {
        if (!runtimeAiAllowed) {
          if (!preloadedWords.length) warnLog("Prepared Word Sounds pack is empty; student runtime generation is disabled.");
          return;
        }
        if (isPreloading) return;
        if (preloadedWords.length > 0) {
          debugLog("🛡️ Blocking preloadInitialBatch: words already loaded");
          return;
        }
        const alreadyCached = preloadedWordCache.current.size;
        if (alreadyCached > 0) {
          debugLog(
            `✅ ${alreadyCached} words already cached, checking for new words...`,
          );
        }
        if (!wordPool || wordPool.length === 0) {
          warnLog("Word pool empty, skipping preload");
          return;
        }
        setIsPreloading(true);
        setPreloadProgress(0);
        setFirstWordReady(false);
        const PRELOAD_COUNT = 10;
        const wordsToPreload = [];
        const usedWords = new Set();
        const difficultyPool = fisherYatesShuffle(wordPool);
        for (const entry of difficultyPool) {
          if (wordsToPreload.length >= PRELOAD_COUNT) break;
          const wordText = (entry.singleWord || entry.word || "").toLowerCase();
          if (preloadedWordCache.current.has(wordText)) {
            debugLog("⚡ Skipping cached word:", wordText);
            continue;
          }
          const word =
            entry.word?.toLowerCase() || entry.displayWord?.toLowerCase();
          if (word && !usedWords.has(word)) {
            usedWords.add(word);
            wordsToPreload.push(entry);
          }
        }
        const totalSteps = wordsToPreload.length * 2;
        let completedSteps = 0;
        const preloadedData = [];
        try {
          const prefetchPromises = wordsToPreload.map(async (wordEntry, i) => {
            const targetWord = wordEntry.displayWord || wordEntry.word;
            const isFirstWord = i === 0;
            if (wordEntry.phonemes && wordEntry.phonemes.length > 0) {
              debugLog("⚡ [Prefetch] using Glossary data for:", targetWord);
              const fetchAudio = async () => {
                try {
                  await handleAudio(targetWord, false);
                  // Phonemes may arrive as strings OR {ipa, grapheme} objects
                  // from glossary entries; flatten safely.
                  const _flatPhoneme = (p) =>
                    typeof p === "string"
                      ? p
                      : (p && (p.grapheme || p.ipa)) || "";
                  const distractorSets = [
                    ...(wordEntry.blendingDistractors || []),
                    ...(wordEntry.rhymeDistractors || []),
                    ...(wordEntry.familyMembers || []),
                    // ── Coverage additions (match Gemini path) ──
                    // The word's phonemes — Find Sounds and Segmentation
                    // play each as its own response option.
                    ...((wordEntry.phonemes || []).map(_flatPhoneme)),
                    // Sound Sort options.
                    ...((wordEntry.soundSortMatches?.words) || []),
                    // Spelling / Orthography distractors.
                    ...(wordEntry.orthographyDistractors || []),
                    // Manipulation distractors.
                    ...(wordEntry.manipulationDistractors || []),
                  ];
                  if (distractorSets.length > 0) {
                    await Promise.all(
                      [...new Set(distractorSets.filter(Boolean))].map((d) =>
                        handleAudio(d, false).catch(() => { }),
                      ),
                    );
                  }
                  // Pre-fetch Word Families rime members + distractors
                  const _tw = (targetWord || "").toLowerCase();
                  let _rimeMembers = [];
                  // NOTE: no phonemeData in this scope (it lives in the sibling
                  // Gemini-fetch branch) — referencing it here threw a swallowed
                  // ReferenceError that silently aborted this whole prefetch.
                  const _aiRime = wordEntry.rimeFamilyMembers || null;
                  if (_aiRime && _aiRime.words && _aiRime.words.length >= 3) {
                    _rimeMembers = _aiRime.words.filter((w) => w.toLowerCase() !== _tw);
                  }
                  if (_rimeMembers.length < 2 && typeof RIME_FAMILIES !== "undefined") {
                    for (const [rime, members] of Object.entries(RIME_FAMILIES)) {
                      if (_tw.endsWith(rime) && _tw.length > rime.length) {
                        _rimeMembers = members.filter((w) => w !== _tw);
                        const _rk = Object.keys(RIME_FAMILIES);
                        const _ri = _rk.indexOf(rime);
                        const _adj = _rk.filter((r) => r !== rime && (r[0] === rime[0] || Math.abs(_rk.indexOf(r) - _ri) <= 3));
                        for (const ar of _adj.slice(0, 4)) {
                          _rimeMembers.push(...(RIME_FAMILIES[ar] || []).slice(0, 3));
                        }
                        break;
                      }
                    }
                  }
                  if (_rimeMembers.length > 0) {
                    const _uniqueRime = [...new Set(_rimeMembers)].slice(0, 12);
                    await Promise.all(
                      _uniqueRime.map((w) => handleAudio(w, false).catch(() => { })),
                    );
                    debugLog("🏠 [Prefetch] Pre-fetched", _uniqueRime.length, "word family audio for:", _tw);
                  }
                  const keys = [
                    wordEntry.firstSound,
                    wordEntry.lastSound,
                    wordEntry.rhymeWord,
                  ].filter(Boolean);
                  await Promise.all(
                    keys.map((k) => handleAudio(k, false).catch(() => { })),
                  );
                } catch (e) {
                  warnLog("Caught error:", e?.message || e);
                }
              };
              if (isFirstWord) {
                await fetchAudio();
                if (isMountedRef.current) setFirstWordReady(true);
              } else {
                fetchAudio();
              }
              return {
                ...wordEntry,
                ttsReady: true,
                difficulty:
                  wordEntry.difficulty || categorizeWordDifficulty(targetWord),
              };
            }
            try {
              const langContext = wordSoundsLanguage
                ? ` in language ${wordSoundsLanguage}`
                : "";
              const prompt = `Analyze the word "${targetWord}" for phonemic awareness${langContext}.
PHONEME NOTATION (use EXACTLY these symbols):
• LONG VOWELS: Use macron symbols: ā (long a), ē (long e), ī (long i), ō (long o), ū (long u)
• SHORT VOWELS: Use plain letters: a, e, i, o, u
• DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)
• R-CONTROLLED: ar, er, ir, or, ur (count as ONE sound)
EXAMPLES:
• "cake" → ["k", "ā", "k"] (3 phonemes, long a = ā)
• "cat" → ["k", "a", "t"] (3 phonemes, short a = a)
• "rain" → ["r", "ā", "n"] (3 phonemes, ai makes long a = ā)
• "green" → ["g", "r", "ē", "n"] (4 phonemes, ee = ē)
• "kite" → ["k", "ī", "t"] (3 phonemes, i_e = ī)
• "boat" → ["b", "ō", "t"] (3 phonemes, oa = ō)
• "moon" → ["m", "ū", "n"] (3 phonemes, oo = ū)
• "ship" → ["sh", "i", "p"] (3 phonemes, sh is one sound)
• "car" → ["k", "ar"] (2 phonemes, ar is one sound)
• "star" → ["s", "t", "ar"] (3 phonemes, ar is ONE sound - do NOT add extra r)
• "bird" → ["b", "ir", "d"] (3 phonemes, ir is one sound)
• "turn" → ["t", "ur", "n"] (3 phonemes, ur is one sound)
• "corn" → ["k", "or", "n"] (3 phonemes, or is one sound)
• "knight" → ["n", "ī", "t"] (3 phonemes, skip silent k and gh)
Return ONLY valid JSON. For phonemes, return BOTH the IPA symbol AND the grapheme (letters) from the word:
{
  "word": "${targetWord}",
  "phonemes": [
    {"ipa": "IPA symbol", "grapheme": "letters from word"},
    {"ipa": "IPA symbol", "grapheme": "letters from word"}
  ],
  "syllables": ["syl", "la", "bles"],
  "phonemeCount": 3,
  "rhymeWords": ["word1", "word2", "word3"],
  "firstSound": "first phoneme IPA",
  "lastSound": "last phoneme IPA",
  "middleSound": "middle phoneme IPA",
  "blendingDistractors": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"],
  "soundSortMatches": {"phoneme": "first or last phoneme", "position": "first|last", "words": ["word1", "word2", "word3", "word4", "word5"]},
  "rimeFamilyMembers": {"rime": "-at", "words": ["cat", "bat", "hat", "mat", "sat"]},
  "orthographyDistractors": ["misspelling1", "misspelling2", "misspelling3"]
}
PHONEME FORMAT: Each phoneme is an object with:
- "ipa": Use IPA symbols: ŋ (ng in sing), ʃ (sh), tʃ (ch), θ (unvoiced th), ð (voiced th), ʒ (zh in vision), eɪ (long a), aɪ (long i), oʊ (long o), i (long e/ee), u (long oo), ɔ (aw), ɛr (er/ir/ur)
- "grapheme": The actual letters from the word that represent this sound
ACTIVITY DATA FIELDS:
- "soundSortMatches": Pick ONE phoneme (first or last). Find 5 OTHER real words sharing that phoneme in the same position. Include the phoneme and position.
- "rimeFamilyMembers": Identify the rime (vowel+coda, e.g. "-at" from "cat"). List 5 real words sharing that rime. If no clear rime family, return {"rime": "", "words": []}.
- "orthographyDistractors": Create 3 plausible misspellings of the word (swap vowels, double letters, phonetic spellings). Must NOT be real words.
CONSTRAINT: You MUST only use these IPA symbols in your phoneme output. Do NOT invent or use any symbols not in this list:
Consonants: b, d, f, g, h, k, l, m, n, p, r, s, t, v, w, z, j (=Y), ŋ (=ng), ʃ (=sh), tʃ (=ch), θ (=th unvoiced), ð (=th voiced), ʒ (=zh), dʒ (=j/g soft), kw (=qu)
Short Vowels: æ (=short a), ɛ (=short e), ɪ (=short i), ɒ (=short o), ʌ (=short u)
Long Vowels: eɪ (=long a), iː or i (=long e), aɪ (=long i), oʊ (=long o), uː or u (=long oo), juː (=long u/ue)
Other Vowels: ʊ (=short oo), ɔː or ɔ (=aw), aʊ (=ow), ɔɪ (=oy)
R-Controlled: ɑr (=ar), ɜr or ɛr (=er), ɪr (=ir), ɔr (=or), ʊr (=ur), ɛər (=air), ɪər (=ear)
EXAMPLES:
- "baking" → [{"ipa":"b","grapheme":"b"},{"ipa":"eɪ","grapheme":"a"},{"ipa":"k","grapheme":"k"},{"ipa":"ɪ","grapheme":"i"},{"ipa":"ŋ","grapheme":"ng"}]
- "ship" → [{"ipa":"ʃ","grapheme":"sh"},{"ipa":"ɪ","grapheme":"i"},{"ipa":"p","grapheme":"p"}]
- "think" → [{"ipa":"θ","grapheme":"th"},{"ipa":"ɪ","grapheme":"i"},{"ipa":"ŋ","grapheme":"n"},{"ipa":"k","grapheme":"k"}]`;
              let response = null;
              let lastError = null;
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  if (attempt > 1)
                    debugLog(
                      `🔄 Gemini Retry Attempt ${attempt} for "${targetWord}"...`,
                    );
                  const temp = attempt === 1 ? 0.3 : 0.6;
                  response = await callGemini(prompt, { temperature: temp });
                  if (response && response.includes("{")) {
                    break;
                  } else {
                    throw new Error("Invalid/Empty Response");
                  }
                } catch (e) {
                  lastError = e;
                  if (attempt < 3)
                    await new Promise((r) => setTimeout(r, 1000 * attempt));
                }
              }
              if (!response) {
                warnLog(
                  `❌ Gemini failed after 3 attempts for "${targetWord}"`,
                  lastError,
                );
                throw lastError || new Error("Gemini Exhausted");
              }
              let phonemeData = null;
              try {
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  phonemeData = JSON.parse(jsonMatch[0]);
                }
              } catch (parseErr) {
                const estimatePhonemes = (word) => {
                  const w = word.toLowerCase();
                  const digraphs = [
                    "sh",
                    "ch",
                    "th",
                    "wh",
                    "ph",
                    "ng",
                    "ck",
                    "qu",
                    "wr",
                    "kn",
                    "gn",
                    "gh",
                    "mb",
                    "ar",
                    "er",
                    "ir",
                    "or",
                    "ur",
                  ];
                  const trigraphs = ["igh", "tch", "dge"];
                  let result = [];
                  let i = 0;
                  while (i < w.length) {
                    if (
                      i < w.length - 2 &&
                      trigraphs.includes(w.slice(i, i + 3))
                    ) {
                      result.push(w.slice(i, i + 3));
                      i += 3;
                    } else if (
                      i < w.length - 1 &&
                      digraphs.includes(w.slice(i, i + 2))
                    ) {
                      result.push(w.slice(i, i + 2));
                      i += 2;
                    } else {
                      result.push(w[i]);
                      i++;
                    }
                  }
                  return result;
                };
                const smartPhonemes = estimatePhonemes(targetWord);
                phonemeData = {
                  word: targetWord,
                  phonemes: smartPhonemes,
                  phonemeCount: smartPhonemes.length,
                  rhymeWords: [],
                  // First/last SOUND, not letter: smartPhonemes is digraph-
                  // aware, so "car" cues /ar/ (r-controlled) not letter-r.
                  firstSound: smartPhonemes[0] || targetWord[0]?.toLowerCase(),
                  lastSound: smartPhonemes[smartPhonemes.length - 1] || targetWord[targetWord.length - 1]?.toLowerCase(),
                };
              }
              // ── eSpeak-primary phoneme sequence + Gemini triangulation (2026-07-06) ──
              // eSpeak NG G2P is deterministic + dictionary-backed and benchmarked
              // 32/32 on the core phonics set (digraphs, r-controlled, silent
              // letters, long vowels), so it's the PRIMARY source for the phoneme
              // SEQUENCE + COUNT. Gemini still provides grapheme alignment + the
              // rich extras (rhymes/distractors/sound-sort): buildPhonemes keeps
              // Gemini's graphemes when the two AGREE on count, else the local
              // digraph-aware aligner, and records agreement (_phonemeAgreement)
              // for triangulation. Lazy-loaded (18.5MB wasm) via __alloLoadPlugin;
              // 4s cap so a slow first-word load falls back to Gemini for that word
              // and is ready for the next. eSpeak failure → keep Gemini's phonemes,
              // so this is never a regression. (School Box uses the native binary.)
              try {
                if (!(window.AlloPhonics && typeof window.AlloPhonics.toPhonemes === "function") && window.__alloLoadPlugin) {
                  await Promise.race([window.__alloLoadPlugin("phonics_g2p_loader.js"), new Promise((r) => setTimeout(r, 6000))]);
                }
                if (window.AlloPhonics && typeof window.AlloPhonics.toPhonemes === "function") {
                  const _esp = await Promise.race([
                    window.AlloPhonics.toPhonemes(targetWord, { lang: wordSoundsLanguage }),
                    new Promise((res) => setTimeout(() => res(null), 4000)),
                  ]);
                  if (_esp && Array.isArray(_esp.ipa) && _esp.ipa.length) {
                    const _merged = window.AlloPhonics.buildPhonemes(targetWord, _esp, phonemeData && phonemeData.phonemes);
                    if (_merged) {
                      phonemeData = Object.assign({}, phonemeData || {}, _merged);
                      debugLog(`🔤 eSpeak G2P for "${targetWord}": ${_esp.ipaString} (${_merged._phonemeAgreement === false ? "diverged from" : "agreed with"} Gemini)`);
                    }
                  }
                }
              } catch (_e) {
                /* keep Gemini phonemeData — eSpeak is an enhancement, never a gate */
              }
              // Authoritative dictionary IPA + real recording (English-only) — a quiet third
              // oracle beside eSpeak/Gemini, and the word's authoritative IPA to display.
              // Fallback-safe: absence just means no extra row. Rides phonemeData → state.
              try {
                if (!wordSoundsLanguage || wordSoundsLanguage.startsWith("en")) {
                  if (!(window.AlloDictionary && typeof window.AlloDictionary.lookup === "function") && window.__alloLoadPlugin) {
                    await Promise.race([window.__alloLoadPlugin("dictionary_loader.js"), new Promise((r) => setTimeout(r, 6000))]);
                  }
                  if (window.AlloDictionary && typeof window.AlloDictionary.lookup === "function") {
                    const _de = await Promise.race([window.AlloDictionary.lookup(targetWord), new Promise((res) => setTimeout(() => res(null), 4000))]);
                    if (_de && (_de.phonetic || _de.audio)) {
                      phonemeData = Object.assign({}, phonemeData || {}, { dictionaryIpa: _de.phonetic || "", dictionaryAudio: _de.audio || "" });
                      debugLog(`[dict] "${targetWord}": IPA ${_de.phonetic || "(none)"}${_de.audio ? " + recording" : ""}`);
                    }
                  }
                }
              } catch (_e) {
                /* no dictionary entry — enhancement only, never a gate */
              }
              const fetchAudio = async () => {
                try {
                  await handleAudio(targetWord, false);

                  // Helper to safely filter distractors
                  const hpMap = {
                    sun: ["son"], son: ["sun"], ate: ["eight"], eight: ["ate"],
                    sea: ["see", "c"], see: ["sea", "c"], two: ["to", "too"],
                    to: ["two", "too"], too: ["to", "two"], red: ["read"],
                    read: ["red"], blue: ["blew"], blew: ["blue"], one: ["won"],
                    won: ["one"], bear: ["bare"], bare: ["bear"], deer: ["dear"],
                    dear: ["deer"], eye: ["i"], i: ["eye"], know: ["no"],
                    no: ["know"], right: ["write"], write: ["right"]
                  };

                  const filterDistractors = (rawList) => {
                    if (!rawList || !Array.isArray(rawList)) return [];
                    const targetToCheck = targetWord.toLowerCase().trim();
                    let unique = [...new Set(
                      rawList.map(d => (d || "").toString().trim().toLowerCase())
                        .filter(d => d && d !== targetToCheck && !isHomophone(targetToCheck, d) && !(hpMap[targetToCheck] && hpMap[targetToCheck].includes(d)))
                    )];
                    if (unique.length < 5) {
                      const fallbacks = ["cat", "dog", "run", "sun", "big", "pig", "bug", "hop", "mad", "sip"];
                      unique = [...new Set([...unique, ...fallbacks])].filter(d => d !== targetToCheck);
                    }
                    return unique.slice(0, 5);
                  };

                  const safeBlendingDistractors = filterDistractors(phonemeData?.blendingDistractors);
                  const safeRhymeDistractors = filterDistractors(phonemeData?.rhymeDistractors || phonemeData?.rhymeWords);

                  // Phonemes arrive as objects {ipa, grapheme} from the
                  // Gemini path; flatten to playable strings for TTS prefetch.
                  // Accept strings too so this helper is safe on either shape.
                  const flattenPhoneme = (p) =>
                    typeof p === "string"
                      ? p
                      : (p && (p.grapheme || p.ipa)) || "";
                  const keys = [
                    phonemeData?.firstSound,
                    phonemeData?.lastSound,
                    phonemeData?.rhymeWord,
                    ...(phonemeData?.phonemes || []).map(flattenPhoneme),
                    ...safeBlendingDistractors,
                    ...safeRhymeDistractors,
                    ...(phonemeData?.familyMembers || []),
                    ...(phonemeData?.mappingGraphemes || []),
                    // ── Coverage additions ──
                    // Sound Sort options: match-words rendered as taps.
                    ...((phonemeData?.soundSortMatches?.words) || []),
                    // Spelling / Orthography distractors: the misspellings
                    // shown as response options. Activity plays them on tap.
                    ...(phonemeData?.orthographyDistractors || []),
                    // Manipulation distractors (e.g., "cat" - /k/ → "at"
                    // with distractors "hat", "bat", "mat").
                    ...(phonemeData?.manipulationDistractors || []),
                  ].filter(Boolean);

                  // Deduplicate TTS queue
                  const uniqueKeysToFetch = [...new Set(keys)];

                  await Promise.all(
                    uniqueKeysToFetch.map((k) => handleAudio(k, false).catch(() => { })),
                  );
                  // Pre-fetch Word Families options from AI rime data + RIME_FAMILIES
                  const _tw2 = (targetWord || "").toLowerCase();
                  let _rimeWords2 = [];
                  if (phonemeData?.rimeFamilyMembers?.words?.length >= 3) {
                    _rimeWords2 = phonemeData.rimeFamilyMembers.words.filter((w) => w.toLowerCase() !== _tw2);
                  }
                  if (_rimeWords2.length < 2 && typeof RIME_FAMILIES !== "undefined") {
                    for (const [rime, members] of Object.entries(RIME_FAMILIES)) {
                      if (_tw2.endsWith(rime) && _tw2.length > rime.length) {
                        _rimeWords2 = members.filter((w) => w !== _tw2);
                        break;
                      }
                    }
                  }
                  if (_rimeWords2.length > 0) {
                    await Promise.all(
                      [...new Set(_rimeWords2)].slice(0, 8).map((w) => handleAudio(w, false).catch(() => { })),
                    );
                  }
                } catch (e) {
                  warnLog("Caught error:", e?.message || e);
                }
              };
              if (isFirstWord) {
                await fetchAudio();
                debugLog("🚀 Optimistic First Word Ready!");
                if (isMountedRef.current) setFirstWordReady(true);
              } else {
                fetchAudio();
              }
              let phonemes = phonemeData?.phonemes || [];
              if (phonemes.length > 0 && typeof phonemes[0] === "string") {
                phonemes = (Array.isArray(phonemes) ? phonemes : []).map((p) =>
                  normalizePhoneme(p),
                );
              }
              let phonemeCount =
                phonemes.length || phonemeData?.phonemeCount || 0;
              if (phonemeCount === 0) {
                warnLog(
                  "⚠️ ZERO PHONEMES detected for:",
                  targetWord,
                  "- will retry Gemini",
                );
                for (
                  let retryAttempt = 1;
                  retryAttempt <= 3 && phonemeCount === 0;
                  retryAttempt++
                ) {
                  debugLog(
                    `🔄 Gemini retry ${retryAttempt}/3 for "${targetWord}"...`,
                  );
                  try {
                    const retryPrompt = `CRITICAL: Return phonemes for "${targetWord}".
The word "${targetWord}" MUST have at least 1 sound. Every word has sounds.
Return JSON: {"word":"${targetWord}","phonemes":["sound1","sound2"],"phonemeCount":2}
Use digraphs (sh,ch,th) as single sounds. Use ā,ē,ī,ō,ū for long vowels.`;
                    const retryResponse = await callGemini(retryPrompt, {
                      temperature: 0.2 + retryAttempt * 0.1,
                    });
                    const retryMatch = retryResponse.match(/\{[\s\S]*\}/);
                    if (retryMatch) {
                      const retryData = JSON.parse(retryMatch[0]);
                      if (retryData.phonemes?.length > 0) {
                        phonemeData = retryData;
                        phonemes = retryData.phonemes;
                        phonemeCount = phonemes.length;
                        debugLog(
                          `✅ Retry ${retryAttempt} succeeded:`,
                          phonemes,
                        );
                      }
                    }
                  } catch (retryErr) {
                    warnLog(
                      `⚠️ Retry ${retryAttempt} failed:`,
                      retryErr.message,
                    );
                  }
                }
                if (phonemeCount === 0) {
                  warnLog(
                    "⚠️ All 3 Gemini retries failed for:",
                    targetWord,
                    "- using enhanced local estimation",
                  );
                  const estimatePhonemesEnhanced = (word) => {
                    const w = word.toLowerCase();
                    const result = [];
                    let i = 0;
                    const vowelTeams = {
                      ough: "ō",
                      igh: "ī",
                      eigh: "ā",
                      augh: "aw",
                      tion: "shun",
                      sion: "zhun",
                      oa: "ō",
                      oe: "ō",
                      ow: "ō",
                      ai: "ā",
                      ay: "ā",
                      ei: "ā",
                      ey: "ā",
                      ee: "ē",
                      ea: "ē",
                      ie: "ī",
                      ue: "ū",
                      ew: "ū",
                      oo: "ū",
                      ou: "ow",
                      oi: "oy",
                      au: "aw",
                      ar: "ar",
                      er: "er",
                      ir: "er",
                      or: "or",
                      ur: "er",
                    };
                    const trigraphs = ["tch", "dge"];
                    const digraphs = [
                      "sh",
                      "ch",
                      "th",
                      "wh",
                      "ph",
                      "ng",
                      "ck",
                      "qu",
                      "wr",
                      "kn",
                      "gn",
                      "gh",
                      "mb",
                      "ar",
                      "er",
                      "ir",
                      "or",
                      "ur",
                    ];
                    while (i < w.length) {
                      let matched = false;
                      if (i < w.length - 3) {
                        const four = w.slice(i, i + 4);
                        if (vowelTeams[four]) {
                          result.push(vowelTeams[four]);
                          i += 4;
                          matched = true;
                        }
                      }
                      if (!matched && i < w.length - 2) {
                        const three = w.slice(i, i + 3);
                        if (vowelTeams[three]) {
                          result.push(vowelTeams[three]);
                          i += 3;
                          matched = true;
                        } else if (trigraphs.includes(three)) {
                          result.push(three);
                          i += 3;
                          matched = true;
                        }
                      }
                      if (!matched && i < w.length - 1) {
                        const two = w.slice(i, i + 2);
                        if (vowelTeams[two]) {
                          result.push(vowelTeams[two]);
                          i += 2;
                          matched = true;
                        } else if (digraphs.includes(two)) {
                          result.push(two);
                          i += 2;
                          matched = true;
                        }
                      }
                      if (!matched && i < w.length - 2) {
                        const vowels = "aeiou";
                        if (
                          vowels.includes(w[i]) &&
                          !vowels.includes(w[i + 1]) &&
                          w[w.length - 1] === "e" &&
                          i === w.length - 3
                        ) {
                          const longVowelMap = {
                            a: "ā",
                            e: "ē",
                            i: "ī",
                            o: "ō",
                            u: "ū",
                          };
                          result.push(longVowelMap[w[i]] || w[i]);
                          result.push(w[i + 1]);
                          i = w.length;
                          matched = true;
                        }
                      }
                      if (!matched) {
                        if (
                          i === 0 &&
                          (w.startsWith("kn") ||
                            w.startsWith("wr") ||
                            w.startsWith("gn"))
                        ) {
                          i++;
                        } else if (w[i] !== "e" || i !== w.length - 1) {
                          result.push(w[i]);
                        }
                        i++;
                      }
                    }
                    return result.filter((p) => p);
                  };
                  const fallbackPhonemes = estimatePhonemesEnhanced(targetWord);
                  phonemeData = {
                    ...phonemeData,
                    word: targetWord,
                    phonemes: fallbackPhonemes,
                    phonemeCount: fallbackPhonemes.length,
                    firstSound: fallbackPhonemes[0] || targetWord[0],
                    lastSound:
                      fallbackPhonemes[fallbackPhonemes.length - 1] ||
                      targetWord[targetWord.length - 1],
                    _fallbackUsed: true,
                  };
                  debugLog(
                    "✅ Enhanced fallback phonemes applied:",
                    fallbackPhonemes,
                  );
                }
              }
              return { ...wordEntry, phonemes: phonemeData, ttsReady: true };
            } catch (err) {
              warnLog("Parallel fetch failed for", targetWord, err);
              return null;
            }
          });
          const results = await Promise.all(prefetchPromises);
          const validResults = results.filter(Boolean);
          if (validResults.length > 0) {
            if (regeneratingIndex !== null) {
              debugLog("🔒 Skipping bulk replace - regeneration in progress");
              setPreloadedWords((prev) => {
                const merged = [...validResults];
                prev.forEach((existingWord, idx) => {
                  if (existingWord._regeneratedAt) {
                    merged[idx] = existingWord;
                  }
                });
                return merged;
              });
            } else {
              setPreloadedWords(validResults);
            }
            setPreloadProgress(100);
            validResults.forEach((w) => {
              const key = (w.targetWord || w.word || "").toLowerCase();
              if (key) preloadedWordCache.current.set(key, w);
            });
            debugLog(
              `📦 Cache now has ${preloadedWordCache.current.size} words`,
            );
          }
        } catch (err) {
          warnLog("Bulk preload failed:", err);
        } finally {
          setIsPreloading(false);
          setPreloadProgress(100);
        }
      }, [
        isPreloading,
        preloadedWords.length,
        wordPool,
        callGemini,
        wordSoundsLanguage,
        runtimeAiAllowed,
      ]);
      React.useEffect(() => { }, [
        wordPool,
        preloadedWords.length,
        isPreloading,
        preloadInitialBatch,
      ]);
      React.useEffect(() => {
        if (!preloadedWords || preloadedWords.length === 0) return;
        const wordsNeedingAudio = preloadedWords.filter(
          (w) => !w.ttsReady && !w._audioRequested,
        );
        if (wordsNeedingAudio.length === 0) return;
        debugLog(
          `🎧 Prefetching audio for ${wordsNeedingAudio.length} words...`,
        );
        if (setWsPreloadedWords) {
          setWsPreloadedWords((prev) =>
            prev.map((w) =>
              wordsNeedingAudio.some((n) => n.word === w.word)
                ? { ...w, _audioRequested: true, _ttsFailed: false }
                : w,
            ),
          );
        }
        // Pre-fetch with an inner retry + per-word success tracking. Previously
        // a 401/transient failure left `ttsReady: true` because the .catch in
        // the middle swallowed the error silently; the UI then showed the word
        // as ready while handleAudio quietly played nothing in Blend Sounds.
        // Now: retry up to 2 times with exponential backoff, and only mark
        // `ttsReady` true if we actually got a cached URL back. On final
        // failure, mark `_ttsFailed: true` so the Review Panel can surface a
        // retry-missing-words button.
        const tryPrefetch = async (text) => {
          let lastErr = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await handleAudio(text, false);
              // Probe the cache so we know the URL actually materialized.
              const cached =
                (audioInstances &&
                  audioInstances.current &&
                  audioInstances.current.has(text.toLowerCase())) ||
                (audioCache &&
                  audioCache.current &&
                  audioCache.current.has(text.toLowerCase())) ||
                (typeof window !== "undefined" &&
                  window._CACHE_WORD_AUDIO_BANK &&
                  window._CACHE_WORD_AUDIO_BANK[text.toLowerCase()]);
              if (cached) return true;
              // No cache entry even though no throw: treat as failure + retry.
              throw new Error("prefetch completed without caching a URL");
            } catch (e) {
              lastErr = e;
              // 429 means we're rate-limited globally — further retries will
              // hit the cooldown and fail instantly. Break early.
              if (e && e.message && (e.message.includes("429") || e.message.includes("Rate Limited"))) break;
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
              }
            }
          }
          warnLog("Audio prefetch exhausted retries for", text, lastErr && lastErr.message);
          return false;
        };
        wordsNeedingAudio.forEach(async (w) => {
          const text = w.word;
          const ok = await tryPrefetch(text);
          if (setWsPreloadedWords) {
            setWsPreloadedWords((prev) =>
              prev.map((pw) => {
                if (pw.word === text) {
                  return {
                    ...pw,
                    ttsReady: ok,
                    _audioRequested: false,
                    _ttsFailed: !ok,
                  };
                }
                return pw;
              }),
            );
          }
        });
      }, [preloadedWords, setWsPreloadedWords]);
      React.useEffect(() => {
        if (
          preloadedWords.length > 0 &&
          !showReviewPanel &&
          !currentWordSoundsWord &&
          !hasStartedFromReview.current
        ) {
          const timer = setTimeout(() => {
            if (
              !showReviewPanel &&
              !currentWordSoundsWord &&
              !hasStartedFromReview.current &&
              !isProbeMode
            ) {
              debugLog("📋 Words loaded - showing Review Panel");
              setShowReviewPanel(true);
            }
          }, 300);
          return () => clearTimeout(timer);
        }
      }, [preloadedWords, showReviewPanel, currentWordSoundsWord]);
      const handleReorderPreloadedWords = React.useCallback(
        (newOrder) => {
          if (setWsPreloadedWords) {
            setWsPreloadedWords(newOrder);
            debugLog("✅ Reordered words via setWsPreloadedWords");
          } else {
            setPreloadedWords(newOrder);
            warnLog(
              "⚠️ REORDER: Using local fallback (won't persist across unmount)",
            );
          }
        },
        [setWsPreloadedWords],
      );
      const handleUpdatePreloadedWord = React.useCallback((index, newData) => {
        if (setWsPreloadedWords) {
          setWsPreloadedWords((prev) => {
            const prevArray = Array.isArray(prev) ? prev : [];
            const updated = [...prevArray];
            if (index < updated.length) {
              updated[index] = { ...updated[index], ...newData };
            }
            debugLog(
              "✅ Updated word at index",
              index,
              "via setWsPreloadedWords",
            );
            return updated;
          });
        } else {
          setPreloadedWords((prev) => {
            const prevArray = Array.isArray(prev) ? prev : [];
            const updated = [...prevArray];
            if (index >= 0 && index < updated.length) {
              updated[index] = { ...updated[index], ...newData };
            }
            return updated;
          });
          warnLog(
            "⚠️ UPDATE: Using local fallback (won't persist across unmount)",
          );
        }
        const wordKey = (newData.targetWord || newData.word)?.toLowerCase();
        if (wordKey) {
          preloadedWordCache.current.set(wordKey, newData);
          debugLog("📝 Updated cached word:", wordKey);
        }
      }, []);
      const handleDeleteWord = React.useCallback(
        (idx) => {
          debugLog(
            "🗑️ DELETE: Attempting to remove word at index:",
            idx,
            "setWsPreloadedWords defined:",
            !!setWsPreloadedWords,
          );
          const performDelete = (setter, name) => {
            if (setter) {
              setter((prevWords) => {
                const prevArray = Array.isArray(prevWords) ? prevWords : [];
                debugLog(
                  "🗑️ DELETE via " + name + ": Current list has",
                  prevArray.length,
                  "words",
                );
                const newWords = prevArray.filter((_, i) => i !== idx);
                debugLog(
                  "🗑️ DELETE via " + name + ": New list has",
                  newWords.length,
                  "words",
                );
                return newWords;
              });
              debugLog("🗑️ DELETE: Update dispatched via " + name);
              return true;
            }
            return false;
          };
          const usedLifted = performDelete(
            setWsPreloadedWords,
            "setWsPreloadedWords",
          );
          if (!usedLifted) {
            warnLog(
              "⚠️ DELETE: Lifted setter unavailable, trying direct state manipulation",
            );
            setPreloadedWords((prev) => {
              const prevArray = Array.isArray(prev) ? prev : [];
              return prevArray.filter((_, i) => i !== idx);
            });
            warnLog(
              "⚠️ DELETE: Using local fallback (won't persist across unmount)",
            );
          }
        },
        [setWsPreloadedWords],
      );
      const handleRegenerateWord = React.useCallback(
        async (index) => {
          debugLog("🔄🔄🔄 handleRegenerateWord CALLED with index:", index);
          setRegeneratingIndex(index);
          const existingWord = preloadedWords[index];
          if (!existingWord) {
            setRegeneratingIndex(null);
            return;
          }
          const targetWord = existingWord.targetWord || existingWord.word || "";
          debugLog("🔄 Regenerating TTS for:", targetWord);
          if (audioCache && audioCache.current) {
            audioCache.current.delete(targetWord);
            audioCache.current.delete(targetWord.toLowerCase());
          }
          if (audioInstances && audioInstances.current) {
            audioInstances.current.delete(targetWord);
            audioInstances.current.delete(targetWord.toLowerCase());
          }
          // Clear in-flight TTS promise so handleAudio's ttsInflight branch
          // doesn't short-circuit on a stale/pending request and replay the
          // pre-regen URL. handleRegenerateOption below already does this;
          // this handler was missing it, which was the regenerate bug.
          if (ttsInflight && ttsInflight.current) {
            ttsInflight.current.delete(targetWord);
            ttsInflight.current.delete(targetWord.toLowerCase());
          }
          if (typeof window !== "undefined" && window._CACHE_WORD_AUDIO_BANK) {
            delete window._CACHE_WORD_AUDIO_BANK[targetWord.toLowerCase()];
          }
          if (typeof window.__clearAlloTtsCacheForWord === "function") {
            window.__clearAlloTtsCacheForWord(targetWord);
          }
          // Also clear the reducer-backed wordSoundsAudioLibrary entry for
          // this word. handleAudio at line ~1684 checks this library BEFORE
          // calling callTTS — if a previous session persisted an entry, the
          // old audio URL was served even after every other cache was
          // cleared, so the student heard the same clip despite pressing
          // regenerate.
          if (typeof setWordSoundsAudioLibrary === "function" && wordSoundsAudioLibrary) {
            try {
              setWordSoundsAudioLibrary(function(prev) {
                if (!prev || typeof prev !== 'object') return prev;
                const next = Object.assign({}, prev);
                delete next[targetWord];
                delete next[targetWord.toLowerCase()];
                return next;
              });
            } catch (e) { warnLog('Clear wordSoundsAudioLibrary failed:', e && e.message); }
          }
          // ── Clear downstream activity option caches ──
          // Each activity (rhyming, blending, isolation, etc.) builds its
          // own option list from wordSoundsPhonemes.rhymeDistractors /
          // .blendingDistractors and gates the rebuild behind "only run if
          // the current list is empty or doesn't include the correct
          // answer." After regenerate, wordSoundsPhonemes IS updated with
          // fresh distractors, but those gates stay false so the UI keeps
          // showing the pre-regen options — exactly what the user sees
          // when the rhyme panel still reads "bin / bin / chin / fin"
          // after pressing regenerate. Force the rebuild by wiping the
          // caches here so each activity effect starts from scratch.
          try {
            if (typeof setRhymeOptions === 'function') setRhymeOptions([]);
            if (typeof setBlendingOptions === 'function') setBlendingOptions([]);
            if (typeof setIsolationState === 'function') setIsolationState(null);
            if (lastWordForRhyming && 'current' in lastWordForRhyming) lastWordForRhyming.current = null;
            if (typeof lastWordForBlending !== 'undefined' && lastWordForBlending && 'current' in lastWordForBlending) {
              lastWordForBlending.current = null;
            }
            if (typeof lastWordForIsolation !== 'undefined' && lastWordForIsolation && 'current' in lastWordForIsolation) {
              lastWordForIsolation.current = null;
            }
          } catch (e) { warnLog('Clear activity option caches failed:', e && e.message); }
          if (preloadedWordCache.current) {
            preloadedWordCache.current.delete(targetWord.toLowerCase());
          }
          if (wordDataCache.current) {
            wordDataCache.current.delete(targetWord.toLowerCase());
          }
          // The portable pack is consulted FIRST by handleAudio, so clearing
          // every other cache while leaving the packed clip made regenerate
          // a silent no-op on pack words: invalidate the key synchronously
          // (covers the immediate replay below) and drop the pack entry so
          // the fresh TTS clip wins from now on.
          {
            const packKey = targetWord.trim().toLowerCase().replace(/\s+/g, " ");
            packAudioInvalidatedRef.current.add(packKey);
            if (typeof setPreloadedWords === "function") {
              setPreloadedWords((prev) => (Array.isArray(prev) ? prev : []).map((it) => {
                if (!it || !it._ttsAssets || typeof it._ttsAssets !== "object" || !it._ttsAssets[packKey]) return it;
                const nextAssets = { ...it._ttsAssets };
                delete nextAssets[packKey];
                return { ...it, _ttsAssets: nextAssets };
              }));
            }
          }
          // Invalidate the pinned sound-sort/word-families items so the
          // regenerated data actually reaches the board (they're word-keyed
          // and would otherwise keep serving the pre-regenerate item).
          if (soundSortPreloadRef.current?.word === targetWord.toLowerCase()) {
            soundSortPreloadRef.current = null;
          }
          if (wordFamilyRimeRef.current?.word === targetWord.toLowerCase()) {
            wordFamilyRimeRef.current = null;
          }
          if (typeof removeAudioFromStorage === "function") {
            removeAudioFromStorage(targetWord);
            removeAudioFromStorage(targetWord.toLowerCase());
          } else {
            try {
              const bank = JSON.parse(safeGetItem(PHONEME_STORAGE_KEY) || "{}");
              if (bank[targetWord]) {
                delete bank[targetWord];
                safeSetItem(PHONEME_STORAGE_KEY, JSON.stringify(bank));
              }
            } catch (e) {
              warnLog("Caught error:", e?.message || e);
            }
          }
          try {
            await handleAudio(targetWord, true);
          } catch (err) {
            warnLog("Regeneration failed:", err);
          } finally {
            setRegeneratingIndex(null);
          }
        },
        [preloadedWords, handleAudio],
      );
      // Re-run pronunciation analysis for one review word without regenerating
      // its audio, image, distractors, difficulty, or other teacher edits.
      const handleCheckPhonemes = React.useCallback(
        async (index) => {
          const existingWord = preloadedWords[index];
          if (!existingWord) return;
          const targetWord = String(
            existingWord.targetWord || existingWord.word || "",
          ).trim();
          if (!targetWord) return;

          setRegeneratingIndex(index);
          addToast?.("Checking phonemes for " + targetWord + "...", "info");
          try {
            const language = wordSoundsLanguage || "English";
            const priorPhonemes = Array.isArray(existingWord.phonemes)
              ? existingWord.phonemes
              : [];

            const aiCheck = async () => {
              if (!runtimeAiAllowed || typeof callGemini !== "function") return null;
              try {
                const response = await callGemini(
                  'Check the spoken phoneme segmentation of the single word "' +
                    targetWord +
                    '" in ' +
                    language +
                    '. Return strict JSON only: {"phonemes":[{"ipa":"IPA symbol","grapheme":"letters from the word"}],"syllables":["written syllable"]}. Use one entry per spoken phoneme, preserve silent letters only inside the appropriate grapheme, distinguish voiced /\u00f0/ from unvoiced /\u03b8/, and do not include definitions, distractors, or activity content.',
                  { temperature: 0.1 },
                );
                const match = String(response || "").match(/\{[\s\S]*\}/);
                if (!match) return null;
                const parsed = JSON.parse(match[0]);
                return Array.isArray(parsed.phonemes) && parsed.phonemes.length
                  ? parsed
                  : null;
              } catch (error) {
                warnLog("Focused phoneme check failed:", error?.message || error);
                return null;
              }
            };

            const localCheck = async () => {
              try {
                if (
                  !(window.AlloPhonics &&
                    typeof window.AlloPhonics.toPhonemes === "function") &&
                  window.__alloLoadPlugin
                ) {
                  await Promise.race([
                    window.__alloLoadPlugin("phonics_g2p_loader.js"),
                    new Promise((resolve) => setTimeout(resolve, 6000)),
                  ]);
                }
                if (
                  window.AlloPhonics &&
                  typeof window.AlloPhonics.toPhonemes === "function"
                ) {
                  return await Promise.race([
                    window.AlloPhonics.toPhonemes(targetWord, { lang: language }),
                    new Promise((resolve) =>
                      setTimeout(() => resolve(null), 5000),
                    ),
                  ]);
                }
              } catch (error) {
                warnLog("Local phoneme check failed:", error?.message || error);
              }
              return null;
            };

            const dictionaryCheck = async () => {
              const normalizedLanguage = String(language).toLowerCase();
              if (
                normalizedLanguage &&
                !normalizedLanguage.startsWith("en") &&
                normalizedLanguage !== "english"
              ) {
                return null;
              }
              try {
                if (
                  !(window.AlloDictionary &&
                    typeof window.AlloDictionary.lookup === "function") &&
                  window.__alloLoadPlugin
                ) {
                  await Promise.race([
                    window.__alloLoadPlugin("dictionary_loader.js"),
                    new Promise((resolve) => setTimeout(resolve, 6000)),
                  ]);
                }
                if (
                  window.AlloDictionary &&
                  typeof window.AlloDictionary.lookup === "function"
                ) {
                  return await Promise.race([
                    window.AlloDictionary.lookup(targetWord),
                    new Promise((resolve) =>
                      setTimeout(() => resolve(null), 5000),
                    ),
                  ]);
                }
              } catch (error) {
                warnLog("Dictionary phoneme check failed:", error?.message || error);
              }
              return null;
            };

            const [aiData, espeakData, dictionaryData] = await Promise.all([
              aiCheck(),
              localCheck(),
              dictionaryCheck(),
            ]);

            let checkedData =
              aiData && Array.isArray(aiData.phonemes)
                ? {
                    phonemes: aiData.phonemes,
                    phonemeCount: aiData.phonemes.length,
                    syllables: Array.isArray(aiData.syllables)
                      ? aiData.syllables
                      : existingWord.syllables,
                    _phonemeSource: "gemini",
                    _phonemeAgreement: null,
                  }
                : null;

            if (
              espeakData &&
              Array.isArray(espeakData.ipa) &&
              espeakData.ipa.length &&
              window.AlloPhonics &&
              typeof window.AlloPhonics.buildPhonemes === "function"
            ) {
              checkedData = window.AlloPhonics.buildPhonemes(
                targetWord,
                espeakData,
                aiData?.phonemes || priorPhonemes,
              );
              if (
                checkedData &&
                aiData &&
                Array.isArray(aiData.syllables)
              ) {
                checkedData.syllables = aiData.syllables;
              }
            }

            let usedFallback = false;
            if (
              !checkedData ||
              !Array.isArray(checkedData.phonemes) ||
              !checkedData.phonemes.length
            ) {
              const estimated = estimatePhonemesBasic
                ? estimatePhonemesBasic(targetWord)
                : targetWord.toLowerCase().split("");
              if (!Array.isArray(estimated) || !estimated.length) {
                throw new Error("No phoneme analysis was returned");
              }
              usedFallback = true;
              const soundValue = (item) =>
                typeof item === "string"
                  ? item
                  : (item && (item.ipa || item.grapheme)) || "";
              checkedData = {
                phonemes: estimated,
                phonemeCount: estimated.length,
                firstSound: soundValue(estimated[0]),
                middleSound: soundValue(
                  estimated[Math.floor((estimated.length - 1) / 2)],
                ),
                lastSound: soundValue(estimated[estimated.length - 1]),
                syllables: existingWord.syllables,
                _phonemeSource: "estimated",
                _phonemeAgreement: null,
              };
            }

            const checkedPhonemes = checkedData.phonemes;
            const soundValue = (item) =>
              typeof item === "string"
                ? item
                : (item && (item.ipa || item.grapheme)) || "";
            const phonemePatch = {
              phonemes: checkedPhonemes,
              phonemeCount: checkedPhonemes.length,
              firstSound:
                checkedData.firstSound || soundValue(checkedPhonemes[0]),
              middleSound:
                checkedData.middleSound ||
                soundValue(
                  checkedPhonemes[
                    Math.floor((checkedPhonemes.length - 1) / 2)
                  ],
                ),
              lastSound:
                checkedData.lastSound ||
                soundValue(checkedPhonemes[checkedPhonemes.length - 1]),
              syllables:
                checkedData.syllables !== undefined
                  ? checkedData.syllables
                  : existingWord.syllables,
              _phonemeSource: checkedData._phonemeSource || "checked",
              _phonemeAgreement:
                checkedData._phonemeAgreement !== undefined
                  ? checkedData._phonemeAgreement
                  : null,
              _espeakCount: checkedData._espeakCount || null,
              _geminiCount: checkedData._geminiCount || null,
              _fallbackUsed: usedFallback,
              _phonemeCheckedAt: Date.now(),
              _packEdited: true,
            };
            if (
              dictionaryData &&
              (dictionaryData.phonetic || dictionaryData.audio)
            ) {
              phonemePatch.dictionaryIpa = dictionaryData.phonetic || "";
              phonemePatch.dictionaryAudio = dictionaryData.audio || "";
            }

            // Passing the fully merged word lets the review cache receive the
            // same preserved object as state; only fields in phonemePatch change.
            handleUpdatePreloadedWord(index, {
              ...existingWord,
              ...phonemePatch,
            });

            if (usedFallback) {
              addToast?.(
                "Phonemes were estimated locally; please review them before use.",
                "warning",
              );
            } else {
              addToast?.("Phonemes checked for " + targetWord + ".", "success");
            }
          } catch (error) {
            warnLog("Phoneme check failed:", error?.message || error);
            addToast?.(
              "Could not check phonemes for " + targetWord + ". Your edits were kept.",
              "error",
            );
          } finally {
            setRegeneratingIndex(null);
          }
        },
        [
          preloadedWords,
          wordSoundsLanguage,
          runtimeAiAllowed,
          callGemini,
          estimatePhonemesBasic,
          handleUpdatePreloadedWord,
          addToast,
        ],
      );
      // Regenerate only the Sound Swap task for a single word without touching
      // its phonemes/rhymes/etc. Used by the "Regenerate Task" button in the
      // Pre-Activity Review editor.
      const handleRegenerateManipulationTask = React.useCallback(
        async (index) => {
          const existingWord = preloadedWords[index];
          if (!existingWord) return;
          const targetWord = existingWord.targetWord || existingWord.word || "";
          if (!targetWord) return;
          try {
            const phonemes = Array.isArray(existingWord.phonemes)
              ? existingWord.phonemes
              : [];
            const newTask = await generateManipulationTask(targetWord, phonemes);
            if (!newTask) return;
            if (setWsPreloadedWords) {
              setWsPreloadedWords((prev) => {
                const prevArray = Array.isArray(prev) ? prev : [];
                const updated = [...prevArray];
                if (index < updated.length) {
                  // Strip the compiled pack board too — the manipulation
                  // effect prefers activityItems.manipulation.task, which
                  // would silently shadow the freshly regenerated task.
                  const prevItem = updated[index];
                  let nextActivityItems = prevItem.activityItems;
                  if (nextActivityItems && nextActivityItems.manipulation) {
                    nextActivityItems = { ...nextActivityItems };
                    delete nextActivityItems.manipulation;
                  }
                  updated[index] = { ...prevItem, manipulationTask: newTask, activityItems: nextActivityItems, _packEdited: true };
                }
                return updated;
              });
            }
            // Live board: if this is the word on screen, swap the task in and
            // force the manipulation effect to rebuild from it.
            setWordSoundsPhonemes((prev) => {
              if (!prev || String(prev.word || "").trim().toLowerCase() !== targetWord.trim().toLowerCase()) return prev;
              const next = { ...prev, manipulationTask: newTask };
              if (next.activityItems && next.activityItems.manipulation) {
                const items = { ...next.activityItems };
                delete items.manipulation;
                next.activityItems = items;
              }
              return next;
            });
            lastWordForManipulation.current = null;
          } catch (err) {
            warnLog("[Manipulation] Regenerate task failed:", err?.message || err);
          }
        },
        [preloadedWords, generateManipulationTask, setWsPreloadedWords],
      );
      // Refresh audio for a single distractor word: clear every in-memory layer
      // handleAudio would hit (audioInstances / audioCache / ttsInflight / global
      // blob URL cache) and then call handleAudio so a fresh TTS synthesis runs.
      // Previously this regenerated the distractor WORD via Gemini, which surprised
      // users who expected the refresh button to only re-synth pronunciation.
      const handleRegenerateOption = React.useCallback(
        async (wordIdx, listKey, opIdx, currentVal) => {
          if (!currentVal) return;
          const raw = String(currentVal);
          const text = raw.toLowerCase().trim();
          debugLog(`🔄 Refreshing audio for: "${raw}"`);
          try {
            if (audioInstances.current && audioInstances.current.has(text)) {
              audioInstances.current.delete(text);
            }
            if (audioCache && audioCache.current && audioCache.current.has(text)) {
              audioCache.current.delete(text);
            }
            if (ttsInflight.current && ttsInflight.current.has(text)) {
              ttsInflight.current.delete(text);
            }
            if (typeof window.__clearAlloTtsCacheForWord === "function") {
              window.__clearAlloTtsCacheForWord(raw);
            }
            // Same pack-first trap as handleRegenerateWord: without this the
            // portable pack clip replays and the refresh is a silent no-op.
            const packKey = raw.trim().toLowerCase().replace(/\s+/g, " ");
            packAudioInvalidatedRef.current.add(packKey);
            if (typeof setPreloadedWords === "function") {
              setPreloadedWords((prev) => (Array.isArray(prev) ? prev : []).map((it) => {
                if (!it || !it._ttsAssets || typeof it._ttsAssets !== "object" || !it._ttsAssets[packKey]) return it;
                const nextAssets = { ...it._ttsAssets };
                delete nextAssets[packKey];
                return { ...it, _ttsAssets: nextAssets };
              }));
            }
            await handleAudio(raw);
          } catch (e) {
            warnLog("Audio refresh failed", e);
            if (showError) showError("Failed to refresh audio. Try again.");
          }
        },
        [audioCache, handleAudio, showError],
      );
      const handleRegenerateAll = React.useCallback(async () => {
        debugLog("🧹 Deep cleaning audio state for regeneration...");
        setIsPlayingAudio(false);
        if (audioInstances.current) audioInstances.current.clear();
        if (audioCache.current) audioCache.current.clear();
        if (wordDataCache.current) wordDataCache.current.clear();
        if (preloadedWordCache.current) preloadedWordCache.current.clear();
        if (typeof window.__clearAlloTtsCacheForWord === "function") {
          window.__clearAlloTtsCacheForWord();
        }
        if (!preloadedWords || preloadedWords.length === 0) {
          warnLog("No words to regenerate");
          addToast?.("No words to regenerate", "error");
          return;
        }
        debugLog(
          "🔄 Regenerating data for all " + preloadedWords.length + " words...",
        );
        addToast?.("🔄 Regenerating all word data...", "info");
        const regeneratedWords = [];
        for (let i = 0; i < preloadedWords.length; i++) {
          const word = preloadedWords[i];
          const targetWord = word.targetWord || word.word || word.singleWord;
          setRegeneratingIndex(i);
          try {
            debugLog(
              `🔄 Regenerating ${i + 1}/${preloadedWords.length}: ${targetWord}`,
            );
            const freshData = await fetchWordData(targetWord, 0, true);
            regeneratedWords.push({
              ...word,
              ...(freshData || {}),
              image: word.image || freshData?.image || null,
            });
          } catch (err) {
            warnLog("Failed to regenerate:", targetWord, err);
            regeneratedWords.push(word);
          }
        }
        const setter = setWsPreloadedWords || setPreloadedWords;
        if (setter) {
          setter(regeneratedWords);
          debugLog(
            "✅ Regeneration complete for " +
            regeneratedWords.length +
            " words",
          );
        } else {
          warnLog("❌ No state setter available for regenerate all");
        }
        setRegeneratingIndex(null);
        addToast?.("✅ All words regenerated!", "success");
      }, [
        preloadedWords,
        fetchWordData,
        setWsPreloadedWords,
        setPreloadedWords,
        addToast,
      ]);
      // Retry TTS prefetch for only the words the initial pass couldn't cache
      // (marked with _ttsFailed by the preload effect above). This is the
      // "second pass" the teacher can trigger if 401 or transient errors left
      // some words without audio. No phoneme data is re-fetched — we just
      // re-run the prefetch pipeline with a fresh retry cycle.
      const handleRetryFailedTTS = React.useCallback(async () => {
        const missing = (preloadedWords || []).filter(
          (w) => w && (w._ttsFailed || (w.ttsReady === false && !w._audioRequested)),
        );
        if (missing.length === 0) {
          addToast?.("All audio is ready — nothing to retry.", "info");
          return;
        }
        addToast?.(
          `🎧 Retrying audio for ${missing.length} word${missing.length === 1 ? "" : "s"}...`,
          "info",
        );
        // Flip _audioRequested so the prefetch effect picks them up again, and
        // clear _ttsFailed + ttsReady so the filter matches cleanly.
        if (setWsPreloadedWords) {
          setWsPreloadedWords((prev) =>
            (Array.isArray(prev) ? prev : []).map((w) => {
              if (missing.some((m) => m.word === w.word)) {
                return { ...w, ttsReady: false, _audioRequested: false, _ttsFailed: false };
              }
              return w;
            }),
          );
        }
      }, [preloadedWords, setWsPreloadedWords, addToast]);
      const handleGenerateWordImage = React.useCallback(
        async (index, word) => {
          if (generatingImageSet.size >= 5) {
            warnLog("⚠️ Max 5 concurrent image generations");
            return;
          }
          setGeneratingImageIndex(index);
          setGeneratingImageSet((prev) => new Set(prev).add(index));
          const MAX_RETRIES = 3;
          try {
            const imagePrompt = `Simple flat vector icon of "${word}", minimal educational illustration, white background, no text or labels`;
            let imageBase64 = null;
            if (typeof callImagen === "function") {
              for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                  if (attempt > 0) {
                    const backoffMs = 1000 * Math.pow(2, attempt);
                    debugLog(
                      `⏳ Retry ${attempt + 1}/${MAX_RETRIES} for "${word}" after ${backoffMs}ms...`,
                    );
                    await new Promise((r) => setTimeout(r, backoffMs));
                  }
                  debugLog("🖼️ Calling callImagen for:", word);
                  imageBase64 = await callImagen(imagePrompt);
                  break;
                } catch (retryErr) {
                  const is401 =
                    retryErr.message && retryErr.message.includes("401");
                  if (is401 && attempt < MAX_RETRIES - 1) {
                    warnLog(`⚠️ Rate limited on "${word}", will retry...`);
                    continue;
                  }
                  throw retryErr;
                }
              }
            } else {
              warnLog("callImagen not available - check if prop is passed");
              addToast?.("Image generation not available", "error");
              setGeneratingImageIndex(null);
              setGeneratingImageSet((prev) => {
                const s = new Set(prev);
                s.delete(index);
                return s;
              });
              return;
            }
            if (imageBase64) {
              setPreloadedWords((prev) => {
                const newList = [...prev];
                if (newList[index]) {
                  newList[index] = { ...newList[index], image: imageBase64 };
                }
                return newList;
              });
              addToast?.("✨ Image generated!", "success");
            }
          } catch (e) {
            warnLog("Failed to generate image:", e);
            addToast?.("Failed to generate image", "error");
            setPreloadedWords((prev) => {
              const newList = [...prev];
              if (newList[index]) {
                newList[index] = {
                  ...newList[index],
                  imageFailed: true,
                  image: null,
                };
              }
              return newList;
            });
          } finally {
            setGeneratingImageIndex(null);
          }
        },
        [generatingImageIndex, setPreloadedWords],
      );
      const handleRefineWordImage = React.useCallback(
        async (index, instruction) => {
          if (generatingImageIndex !== null) return;
          const word = preloadedWords[index];
          if (!word?.image) {
            addToast?.("No image to refine", "error");
            return;
          }
          setGeneratingImageIndex(index);
          try {
            const rawBase64 = word.image.split(",")[1];
            if (!rawBase64) {
              throw new Error("Invalid image format");
            }
            const refinementPrompt = `Edit this educational icon. Instruction: ${instruction}. Maintain simple, flat vector art style with white background.`;
            let newImageBase64 = null;
            if (typeof callGeminiImageEdit === "function") {
              newImageBase64 = await callGeminiImageEdit(
                refinementPrompt,
                rawBase64,
              );
            } else {
              warnLog("callGeminiImageEdit not available");
              addToast?.("Image editing not available", "error");
              setGeneratingImageIndex(null);
              return;
            }
            if (newImageBase64) {
              setPreloadedWords((prev) => {
                const newList = [...prev];
                if (newList[index]) {
                  newList[index] = { ...newList[index], image: newImageBase64 };
                }
                return newList;
              });
              addToast?.("✨ Image refined!", "success");
            }
          } catch (e) {
            warnLog("Failed to refine image:", e);
            addToast?.("Failed to refine image", "error");
          } finally {
            setGeneratingImageIndex(null);
          }
        },
        [generatingImageIndex, preloadedWords, setPreloadedWords],
      );
      React.useEffect(() => {
        if (wordSoundsPhonemes && !nextWordBuffer && !isLoadingPhonemes) {
          const timer = setTimeout(() => prefetchNextWords(), 1000);
          return () => clearTimeout(timer);
        }
      }, [
        wordSoundsPhonemes,
        nextWordBuffer,
        isLoadingPhonemes,
        prefetchNextWords,
      ]);
      const generateUniqueSoundChips = React.useCallback((phonemes) => {
        if (!phonemes) return [];
        const chips = (Array.isArray(phonemes) ? phonemes : []).map((p, i) => ({
          id: `correct-${i}-${Date.now()}`,
          phoneme: (p || "").trim(),
          type: "correct",
          isDistractor: false,
          color: "#f0f9ff",
          used: false,
        }));
        const correctCounts = {};
        (Array.isArray(phonemes) ? phonemes : []).forEach((p) => {
          const key = (p || "").toLowerCase().trim();
          correctCounts[key] = (correctCounts[key] || 0) + 1;
        });
        const usedPhonemes = new Set(Object.keys(correctCounts));
        const commonPhonemes = [
          "s",
          "t",
          "m",
          "p",
          "k",
          "n",
          "r",
          "l",
          "b",
          "g",
          "f",
          "h",
          "d",
          "sh",
          "ch",
          "th",
          "a",
          "e",
          "i",
          "o",
          "u",
        ];
        const shuffledCommon = fisherYatesShuffle(commonPhonemes);
        let distractorCount = 0;
        for (const p of shuffledCommon) {
          if (distractorCount >= 5) break;
          const pLower = p.toLowerCase();
          if (!usedPhonemes.has(pLower)) {
            chips.push({
              id: `distractor-${p}-${Date.now()}-${distractorCount}`,
              phoneme: p,
              type: "distractor",
              isDistractor: true,
              color: "#f8fafc",
              used: false,
            });
            usedPhonemes.add(pLower);
            distractorCount++;
          }
        }
        const shuffledChips = fisherYatesShuffle(chips);
        const pastelColors = [
          "#eff6ff",
          "#f0fdf4",
          "#faf5ff",
          "#fff7ed",
          "#fdf2f8",
          "#fcf6f5",
          "#ecfeff",
          "#fefce8",
        ];
        return shuffledChips.map((chip, i) => ({
          ...chip,
          color: pastelColors[i % pastelColors.length],
        }));
      }, []);
      React.useEffect(() => {
        if (!wordSoundsPhonemes) return;
        const effectiveCount =
          wordSoundsPhonemes?.phonemeCount ||
          wordSoundsPhonemes?.phonemes?.length ||
          0;
        if (
          wordSoundsActivity === "letter_tracing" &&
          currentWordSoundsWord !== lastTracingWord.current
        ) {
          lastTracingWord.current = currentWordSoundsWord;
          setTracingPhase("upper");
        }
        if (
          ["segmentation", "blending"].includes(wordSoundsActivity) &&
          wordSoundsPhonemes.phonemes
        ) {
          if (
            elkoninBoxes.length === 0 ||
            elkoninBoxes.length !== effectiveCount ||
            soundChips.length === 0
          ) {
            debugLog(
              "🔧 Initializing Elkonin boxes:",
              effectiveCount,
              "for",
              currentWordSoundsWord,
            );
            wordSoundsPhonemes?.phonemes &&
              setSoundChips(
                Array.isArray(wordSoundsPhonemes?.activityItems?.segmentation?.chips)
                  ? wordSoundsPhonemes.activityItems.segmentation.chips.map((chip, index) => ({ ...chip, used: false, color: ["#eff6ff", "#f0fdf4", "#faf5ff", "#fff7ed", "#fdf2f8", "#ecfeff"][index % 6] }))
                  : generateUniqueSoundChips(wordSoundsPhonemes.phonemes),
              );
            setElkoninBoxes(new Array(effectiveCount).fill(null));
          }
        }
        if (
          wordSoundsActivity === "orthography" &&
          (!orthographyOptions || orthographyOptions.length < 2)
        ) {
          const targetWord = currentWordSoundsWord || wordSoundsPhonemes?.word;
          if (targetWord) {
            debugLog("🔧 Initializing orthography options for:", targetWord);
            if (
              lastWordForOrthography.current === targetWord &&
              orthographyOptions.length > 0
            ) {
              debugLog(
                "✅ Orthography options already set for this word, skipping",
              );
              return;
            }
            lastWordForOrthography.current = targetWord;
            // Prefer the teacher-reviewed misspelling board from the pack
            // (exact options + order); requires the correct word on the board.
            const preparedOrthography =
              String(wordSoundsPhonemes?.word || "").trim().toLowerCase() ===
                String(targetWord).trim().toLowerCase()
                ? wordSoundsPhonemes?.activityItems?.orthography
                : null;
            if (
              Array.isArray(preparedOrthography?.options) &&
              preparedOrthography.options.length > 1 &&
              preparedOrthography.options.some(
                (o) =>
                  String(o).trim().toLowerCase() ===
                  String(targetWord).trim().toLowerCase(),
              )
            ) {
              setOrthographyOptions([...preparedOrthography.options]);
              return;
            }
            const generated = generateOrthographyDistractors(targetWord);
            const distractors = fisherYatesShuffle(generated).slice(0, 5);
            setOrthographyOptions(
              fisherYatesShuffle([targetWord, ...distractors]),
            );
          }
        }
        if (wordSoundsActivity === "rhyming") {
          const currentWord = currentWordSoundsWord || wordSoundsPhonemes?.word;
          // Keep-existing-board check FIRST: the prepared install below must
          // only run for a fresh/changed word, or any effect re-run (e.g. a
          // teacher edit writing wordSoundsPhonemes) would reinstall the pack
          // board over the edited options.
          if (
            lastWordForRhyming.current === currentWord &&
            rhymeOptions.length > 0
          ) {
            debugLog(
              "✅ Rhyme options already set for this word, skipping re-shuffle",
            );
            return;
          }
          // Word-match guard (stale pack mid-advance) + answer-on-board guard
          // (a pack compiled with no rhymeWord serializes a distractor-only
          // board; fall through to the RIME_FAMILIES derivation instead).
          const preparedRhyming =
            String(wordSoundsPhonemes?.word || "").trim().toLowerCase() ===
              String(currentWord || "").trim().toLowerCase()
              ? wordSoundsPhonemes?.activityItems?.rhyming
              : null;
          if (
            Array.isArray(preparedRhyming?.options) &&
            preparedRhyming.options.length > 1 &&
            preparedRhyming.answer &&
            preparedRhyming.options.includes(preparedRhyming.answer)
          ) {
            lastWordForRhyming.current = currentWord;
            setRhymeOptions([...preparedRhyming.options]);
            return;
          }
          const correctRhyme = wordSoundsPhonemes?.rhymeWord;
          if (correctRhyme) {
            lastWordForRhyming.current = currentWord;
            const generateNearRhymes = (word) => {
              const endings = [
                "at",
                "an",
                "en",
                "in",
                "op",
                "ot",
                "ug",
                "un",
                "ake",
                "ine",
                "ight",
                "ound",
              ];
              const commonWords = {
                at: ["cat", "hat", "bat", "mat", "rat", "sat", "fat", "pat"],
                an: ["can", "fan", "man", "pan", "ran", "van", "tan", "plan"],
                en: ["hen", "pen", "ten", "men", "den", "then", "when", "wren"],
                in: ["pin", "win", "tin", "bin", "fin", "sin", "chin", "thin"],
                op: ["hop", "mop", "top", "pop", "cop", "drop", "shop", "stop"],
                ot: ["hot", "pot", "cot", "dot", "got", "lot", "not", "shot"],
                ug: ["bug", "hug", "mug", "rug", "tug", "dug", "jug", "plug"],
                un: ["bun", "fun", "run", "sun", "pun", "spun", "stun"],
                ake: [
                  "bake",
                  "cake",
                  "lake",
                  "make",
                  "take",
                  "wake",
                  "shake",
                  "snake",
                ],
                ine: [
                  "fine",
                  "line",
                  "mine",
                  "nine",
                  "pine",
                  "vine",
                  "shine",
                  "spine",
                ],
                ight: [
                  "light",
                  "night",
                  "right",
                  "sight",
                  "tight",
                  "bright",
                  "flight",
                  "slight",
                ],
                ound: [
                  "bound",
                  "found",
                  "ground",
                  "hound",
                  "mound",
                  "pound",
                  "round",
                  "sound",
                ],
              };
              const lowerWord = word.toLowerCase();
              let distractors = [];
              for (const ending of endings) {
                if (!lowerWord.endsWith(ending) && commonWords[ending]) {
                  distractors.push(...commonWords[ending]);
                }
              }
              return fisherYatesShuffle(distractors).slice(0, 5);
            };
            // Non-English: generateNearRhymes' pools are English words — pad
            // from the session's own same-language words instead.
            const distractors =
              wordSoundsPhonemes?.rhymeDistractors?.length >= 3
                ? wordSoundsPhonemes?.rhymeDistractors?.slice(0, 5)
                : wsLangCaps.isEnglish
                  ? generateNearRhymes(currentWordSoundsWord || "cat")
                  : fisherYatesShuffle(
                      (preloadedWords || [])
                        .map((p) => String(p.targetWord || p.word || p.term || "").toLowerCase())
                        .filter((w) => w && w !== (currentWordSoundsWord || "").toLowerCase() && w !== correctRhyme)
                        .concat(wordSoundsPhonemes?.rhymeDistractors || []),
                    ).slice(0, 5);
            const getRime = (word) => {
              const w = (word || "").toLowerCase();
              // Non-English: aeiou vowel-scanning is meaningless on other
              // scripts (it returns "" for every Arabic/Devanagari word, which
              // made every distractor look like a rhyme and get filtered out).
              // A trailing-characters match is the script-agnostic equivalent.
              if (!wsLangCaps.isEnglish) return w.slice(-2);
              const vowels = "aeiou";
              let rimeStart = w.length;
              for (let i = w.length - 1; i >= 0; i--) {
                if (vowels.includes(w[i])) {
                  rimeStart = i;
                  while (i > 0 && vowels.includes(w[i - 1])) i--;
                  rimeStart = i;
                  break;
                }
              }
              return w.slice(rimeStart);
            };
            const correctRime = getRime(correctRhyme);
            const filteredDistractors = distractors.filter((d) => {
              if (!d) return false;
              return getRime(d) !== correctRime;
            });
            const options = [correctRhyme, ...filteredDistractors.slice(0, 4)];
            if (
              rhymeOptions.length === 0 ||
              !rhymeOptions.includes(correctRhyme) ||
              // Word-change check: two same-rime-family words in a row (bat →
              // cat) kept the OLD word's options because the new correctRhyme
              // coincidentally appeared in them — but the distractors were
              // filtered against the old word's rime, not the new one's.
              String(lastWordForRhyming.current || "").toLowerCase() !==
                (currentWordSoundsWord || "").toLowerCase()
            ) {
              setRhymeOptions(fisherYatesShuffle(options));
              lastWordForRhyming.current = currentWordSoundsWord;
            }
          } else {
            if (rhymeOptions.length === 0) {
              const word = (currentWordSoundsWord || "").toLowerCase();
              // Non-English content: the RIME_FAMILIES table and the
              // similarSoundMap word pool below are ENGLISH words — injecting
              // them would put English options on a Spanish/Arabic/… board.
              // Derive a rhyme by script-agnostic ending match from the
              // session's own (same-language) words instead; if none exists,
              // leave the board unbuilt (the word simply isn't rhymable with
              // the data we have) rather than fabricate English content.
              if (!wsLangCaps.isEnglish) {
                const _ownWords = (preloadedWords || [])
                  .map((p) => String(p.targetWord || p.word || p.term || "").toLowerCase())
                  .filter((w) => w && w !== word);
                const _ending = word.slice(-2);
                const _derivedRhyme = word.length >= 3
                  ? _ownWords.find((w) => w.length >= 2 && w.slice(-2) === _ending)
                  : null;
                if (_derivedRhyme) {
                  setWordSoundsPhonemes((prev) => ({
                    ...(prev || {}),
                    rhymeWord: _derivedRhyme,
                    rhymeDistractors: _ownWords.filter((w) => w !== _derivedRhyme && w.slice(-2) !== _ending).slice(0, 4),
                  }));
                }
                return;
              }
              // No rhymeWord (e.g. generateFallbackData hard-codes ""): derive
              // one from RIME_FAMILIES so the board has a correct option —
              // distractor-only boards made the item unanswerable (grader
              // accepted only rhymeWord, so every response scored wrong).
              if (typeof RIME_FAMILIES !== "undefined") {
                for (const [_rime, _members] of Object.entries(RIME_FAMILIES)) {
                  if (word.endsWith(_rime) && word.length > _rime.length) {
                    const _derived = _members.find((m) => m !== word);
                    if (_derived) {
                      setWordSoundsPhonemes((prev) => ({
                        ...(prev || {}),
                        rhymeWord: _derived,
                      }));
                      return;
                    }
                  }
                }
              }
              const firstLetter = word.charAt(0);
              const similarSoundMap = {
                b: ["ball", "big", "bus", "box", "bed"],
                c: ["car", "cup", "cat", "can", "cow"],
                k: ["car", "cup", "kit", "key", "kid"],
                d: ["dog", "dig", "den", "dot", "dip"],
                f: ["fun", "fog", "fit", "fan", "fox"],
                g: ["go", "get", "gum", "gap", "got"],
                h: ["hot", "hop", "hug", "hen", "hit"],
                j: ["jog", "jet", "jug", "jam", "job"],
                l: ["let", "log", "lip", "leg", "lit"],
                m: ["mud", "mop", "mix", "met", "map"],
                n: ["nap", "net", "nod", "nut", "not"],
                p: ["pop", "pet", "pig", "pen", "pot"],
                r: ["run", "red", "rip", "rug", "rob"],
                s: ["sun", "sit", "set", "sob", "sip"],
                t: ["top", "tin", "ten", "tub", "tap"],
                w: ["win", "wet", "wag", "web", "wig"],
                z: ["zip", "zap", "zoo", "zig", "zest"],
              };
              let pool = similarSoundMap[firstLetter] || [
                "dog",
                "cat",
                "run",
                "sun",
                "bed",
              ];
              pool = pool.filter((w) => w !== word);
              const distractors = fisherYatesShuffle(pool).slice(0, 4);
              setRhymeOptions(distractors);
            }
          }
        }
      }, [
        wordSoundsPhonemes,
        wordSoundsActivity,
        currentWordSoundsWord,
        generateSoundChips,
        // startActivity resets orthographyOptions AFTER this effect may have
        // installed the prepared board in the same flush; watching the state
        // re-runs the install (the count-gate above prevents any loop).
        orthographyOptions,
        wsLangCaps,
        preloadedWords,
      ]);
      React.useEffect(() => {
        if (wordSoundsActivity !== "isolation" || !wordSoundsPhonemes) {
          if (isolationState) setIsolationState(null);
          return;
        }
        const currentWord = wordSoundsPhonemes?.word || currentWordSoundsWord;
        const isNewWord = lastWordForIsolation.current !== currentWord;
        const preparedIsolation = wordSoundsPhonemes?.activityItems?.isolation;
        if (
          isNewWord &&
          preparedIsolation?.correctSound &&
          Array.isArray(preparedIsolation?.options) &&
          preparedIsolation.options.includes(preparedIsolation.correctSound) &&
          preparedIsolation.options.length > 1
        ) {
          const preparedState = {
            word: currentWordSoundsWord || currentWord,
            currentPosition: preparedIsolation.position || 0,
            correctSound: preparedIsolation.correctSound,
            correctAnswer: preparedIsolation.correctSound,
            isoOptions: [...preparedIsolation.options],
          };
          isolationPositionRef.current = preparedState.currentPosition;
          lastWordForIsolation.current = currentWord;
          isolationStateRef.current = preparedState;
          setIsolationState(preparedState);
          return;
        }
        if (
          isNewWord &&
          isolationState &&
          isolationState.word === currentWord &&
          isolationState.correctSound &&
          isolationState.isoOptions?.length > 0
        ) {
          debugLog(
            "✅ Using pre-generated isolation options:",
            isolationState.isoOptions,
          );
          lastWordForIsolation.current = currentWord;
          return;
        }
        if (!isNewWord && isolationState?.isoOptions?.length > 0) {
          return;
        }
        if (isNewWord) {
          debugLog(
            "⚠️ Generating new isolation options (fallback - not pre-generated)",
          );
          lastWordForIsolation.current = currentWord;
          const phonemeCount = wordSoundsPhonemes?.phonemes?.length || 2;
          const positionIndex = Math.floor(Math.random() * phonemeCount);
          isolationPositionRef.current = positionIndex;
          const currentPosition =
            typeof isolationPositionRef.current === "number"
              ? isolationPositionRef.current
              : 0;
          const phonemes = wordSoundsPhonemes?.phonemes || [];
          const positionIdx =
            typeof currentPosition === "number" ? currentPosition : 0;
          const correctSound =
            phonemes[positionIdx] || wordSoundsPhonemes?.firstSound;
          // Dedup by PHONEME (not grapheme string) so different spellings of
          // the same sound — e.g., "c" and "k" both saying /k/, "oi" and "oy"
          // both /oi/, "ai" and "ay" both /ā/ — can never coexist as options.
          // phonemeKey() returns a shared key for clustered graphemes; for
          // everything else it's just the lowercase grapheme.
          const correctKey = phonemeKey(correctSound);
          const isoAllPhonemes = wordSoundsPhonemes?.phonemes || [];
          const isoDistractors = [];
          const used = new Set([correctKey]);
          for (const p of isoAllPhonemes) {
            if (isoDistractors.length >= 5) break;
            const k = phonemeKey(p);
            if (!k || used.has(k)) continue;
            isoDistractors.push(p);
            used.add(k);
          }
          const SIMILAR_SOUNDS = {
            b: ["d", "p", "v", "g"],
            d: ["b", "t", "g", "n"],
            f: ["v", "th", "s", "p"],
            g: ["k", "d", "b", "j"],
            h: ["wh", "f"],
            j: ["g", "ch", "zh", "z"],
            k: ["g", "t", "c", "ck"],
            l: ["r", "w", "n", "y"],
            m: ["n", "b", "p", "ng"],
            n: ["m", "ng", "d", "l"],
            p: ["b", "t", "f", "k"],
            r: ["l", "w", "y", "er"],
            s: ["z", "sh", "th", "f"],
            t: ["d", "k", "p", "ch"],
            v: ["f", "b", "w", "th"],
            w: ["r", "l", "wh", "y"],
            y: ["w", "l", "ee", "i"],
            z: ["s", "zh", "j", "th"],
            sh: ["ch", "s", "zh", "th"],
            ch: ["sh", "j", "t", "tch"],
            th: ["f", "v", "s", "d"],
            wh: ["w", "h", "f"],
            ng: ["n", "m", "nk"],
            ck: ["k", "g", "c"],
            a: ["e", "u", "o", "ah"],
            e: ["i", "a", "u", "eh"],
            i: ["e", "ee", "y", "ih"],
            o: ["u", "a", "aw", "ah"],
            u: ["o", "oo", "a", "uh"],
            ee: ["i", "ea", "e", "y"],
            oo: ["u", "ew", "o"],
            ai: ["ay", "a", "ei"],
            oa: ["o", "ow", "oe"],
            ou: ["ow", "oo", "u"],
            ow: ["ou", "oa", "o"],
            oi: ["oy", "ou", "aw"],
            oy: ["oi", "ow", "o"],
            ar: ["or", "er", "a", "ah"],
            or: ["ar", "er", "aw", "ore"],
            er: ["ar", "or", "ur", "ir"],
            ir: ["er", "ur", "ear"],
            ur: ["er", "ir", "or"],
            aw: ["or", "o", "au", "ow"],
            au: ["aw", "o", "ou"],
            c: ["k", "s", "ck", "g"],
          };
          const wordSeed = (currentWordSoundsWord || "")
            .split("")
            .reduce((a, c) => a + c.charCodeAt(0), 0);
          // Non-English: SIMILAR_SOUNDS and the expanded pool below are
          // ENGLISH graphemes ("sh", "ar", "th") — mixing them into a
          // Spanish/Arabic isolation board is incoherent. Pad from the other
          // session words' own (same-language) phonemes instead.
          if (!wsLangCaps.isEnglish) {
            for (const pw of preloadedWords || []) {
              if (isoDistractors.length >= 5) break;
              for (const ph of pw.phonemes || []) {
                if (isoDistractors.length >= 5) break;
                const flat = typeof ph === "string" ? ph : (ph && (ph.grapheme || ph.ipa)) || "";
                const k = phonemeKey(flat);
                if (flat && !used.has(k)) {
                  isoDistractors.push(flat);
                  used.add(k);
                }
              }
            }
          }
          const similarPool = wsLangCaps.isEnglish
            ? SIMILAR_SOUNDS[correctSound?.toLowerCase()] || []
            : [];
          const shuffledSimilar = [...similarPool].sort(
            (a, b) =>
              ((wordSeed * 31 + a.charCodeAt(0)) % 97) -
              ((wordSeed * 31 + b.charCodeAt(0)) % 97),
          );
          for (const sim of shuffledSimilar) {
            if (isoDistractors.length >= 5) break;
            const k = phonemeKey(sim);
            if (!used.has(k)) {
              isoDistractors.push(sim);
              used.add(k);
            }
          }
          const isoExpandedPool = [
            "b",
            "d",
            "f",
            "g",
            "h",
            "j",
            "k",
            "l",
            "m",
            "n",
            "p",
            "r",
            "s",
            "t",
            "v",
            "w",
            "z",
            "a",
            "e",
            "i",
            "o",
            "u",
            "sh",
            "ch",
            "th",
            "wh",
            "ng",
            "ee",
            "oo",
            "ar",
            "or",
            "er",
          ];
          const shuffledPool = wsLangCaps.isEnglish
            ? [...isoExpandedPool].sort(
                (a, b) =>
                  ((wordSeed * 13 + a.charCodeAt(0)) % 89) -
                  ((wordSeed * 13 + b.charCodeAt(0)) % 89),
              )
            : []; // English grapheme pool — see the language gate above
          for (const p of shuffledPool) {
            if (isoDistractors.length >= 5) break;
            const k = phonemeKey(p);
            if (!used.has(k)) {
              isoDistractors.push(p);
              used.add(k);
            }
          }
          const fallbackSound =
            (currentWordSoundsWord || "")[0]?.toLowerCase() || "a";
          const effectiveCorrect = correctSound || fallbackSound;
          // Final dedup by phoneme — catches any same-sound pairs even if
          // upstream steps missed them.
          const isoUniqueOpts = (function () {
            const out = [];
            const seenKeys = new Set();
            for (const g of [effectiveCorrect, ...isoDistractors.slice(0, 5)]) {
              const k = phonemeKey(g);
              if (!k || seenKeys.has(k)) continue;
              seenKeys.add(k);
              out.push(g);
            }
            return out;
          })();
          const isoExpandedPool2 = [
            "b",
            "d",
            "f",
            "g",
            "h",
            "j",
            "k",
            "l",
            "m",
            "n",
            "p",
            "r",
            "s",
            "t",
            "v",
            "w",
            "z",
            "a",
            "e",
            "i",
            "o",
            "u",
            "sh",
            "ch",
            "th",
          ];
          const isoUsedSet = new Set(isoUniqueOpts.map((o) => phonemeKey(o)));
          for (const p of isoExpandedPool2) {
            if (isoUniqueOpts.length >= 6) break;
            const k = phonemeKey(p);
            if (!isoUsedSet.has(k)) {
              isoUniqueOpts.push(p);
              isoUsedSet.add(k);
            }
          }
          const isoOptions = fisherYatesShuffle(isoUniqueOpts.slice(0, 6));
          setIsolationState({
            word: currentWordSoundsWord,
            currentPosition,
            correctSound: effectiveCorrect,
            correctAnswer: effectiveCorrect,
            isoOptions,
          });
          isoOptions.forEach((phoneme) => {
            handleAudio(phoneme, false).catch(async (err) => {
              warnLog("Prefetch failed for", phoneme, "- retrying once...");
              await new Promise((r) => setTimeout(r, 500));
              handleAudio(phoneme, false).catch(() => { });
            });
          });
        }
      }, [wordSoundsActivity, wordSoundsPhonemes, currentWordSoundsWord]);
      React.useEffect(() => {
        if (wordSoundsActivity !== "isolation") return;
        if (!currentWordSoundsWord) return;
        // Use the ref (always up-to-date) instead of state (may lag behind render)
        if (lastWordForIsolation.current?.toLowerCase() === currentWordSoundsWord?.toLowerCase())
          return;
        const timer = setTimeout(() => {
          if (!isMountedRef.current) return;
          // Re-check ref inside callback — main setup may have already handled this word
          if (lastWordForIsolation.current?.toLowerCase() === currentWordSoundsWord?.toLowerCase()) return;
          debugLog(
            "🔧 Auto-recovery: isolationState stuck for 3s, forcing re-sync for:",
            currentWordSoundsWord,
          );
          const phonemes =
            wordSoundsPhonemes?.phonemes ||
            estimatePhonemesBasic(currentWordSoundsWord);
          const pos = Math.floor(Math.random() * phonemes.length);
          const correct = phonemes[pos] || currentWordSoundsWord[0] || "a";
          // Phoneme-key dedup — keep distractors in truly different phonemes
          // from the correct answer AND from each other.
          const _used = new Set([phonemeKey(correct)]);
          const dists = [];
          for (const p of phonemes) {
            if (dists.length >= 5) break;
            const k = phonemeKey(p);
            if (!k || _used.has(k)) continue;
            dists.push(p);
            _used.add(k);
          }
          {
            const _pool = ["b", "d", "f", "g", "k", "l", "m", "n", "p", "r", "s", "t", "a", "e", "i", "o", "u"];
            const _shuffled = [..._pool].sort(() => Math.random() - 0.5);
            for (const _p of _shuffled) {
              if (dists.length >= 5) break;
              const k = phonemeKey(_p);
              if (!_used.has(k)) { dists.push(_p); _used.add(k); }
            }
          }
          setIsolationState({
            word: currentWordSoundsWord,
            currentPosition: pos,
            correctSound: correct,
            correctAnswer: correct,
            isoOptions: fisherYatesShuffle([correct, ...dists.slice(0, 5)]),
          });
          setIsLoadingPhonemes(false);
        }, 3000);
        return () => clearTimeout(timer);
      }, [currentWordSoundsWord, isolationState?.word, wordSoundsActivity]);
      React.useEffect(() => {
        if (playInstructions) return;
        if (currentWordSoundsWord && !isLoadingPhonemes) {
          const playKey = `${currentWordSoundsWord}-${wordSoundsActivity}`;
          if (lastPlayedWord.current === playKey) return;
          // This flag was referenced throughout the async body below but never
          // declared in THIS effect (only the instructions-ON effect has one),
          // so every check threw a swallowed ReferenceError — killing syllable
          // playback and the first-item option waits when instructions are off.
          let cancelled = false;
          const timer = setTimeout(async () => {
            try {
              if (!isMountedRef.current) return;
              lastPlayedWord.current = playKey;
              // Read & Match decodes a PRINTED word that must never be spoken,
              // so do not auto-play it even when instructions are toggled off.
              if (wordSoundsActivity === "decoding") return;
              if (wordSoundsActivity === "blending") {
                await playBlending();
              } else {
                await handleAudio(currentWordSoundsWord);
                let isoSnap = isolationStateRef.current;
                if (
                  wordSoundsActivity === "isolation" &&
                  !isoSnap?.isoOptions?.length
                ) {
                  // Wait for isolation options to be generated on first item
                  for (let isoWaitIdx = 0; isoWaitIdx < 20; isoWaitIdx++) {
                    await new Promise((r) => setTimeout(r, 150));
                    if (cancelled || audioCancelledRef.current) return;
                    isoSnap = isolationStateRef.current;
                    if (isoSnap?.isoOptions?.length > 0) break;
                  }
                }
                if (
                  wordSoundsActivity === "isolation" &&
                  isoSnap?.isoOptions?.length > 0
                ) {
                  await new Promise((r) => setTimeout(r, 350));
                  for (
                    let i = 0;
                    i < (isoSnap?.isoOptions?.length || 0);
                    i++
                  ) {
                    setHighlightedIsoIndex(i);
                    await handleAudio(isoSnap.isoOptions[i]);
                    await new Promise((r) => setTimeout(r, 300));
                  }
                  setHighlightedIsoIndex(null);
                }
              }
              if (wordSoundsActivity === "rhyming") {
                // Wait for rhyme options to be populated on first item
                if (!rhymeOptionsRef.current || rhymeOptionsRef.current.length === 0) {
                  for (let rhymeWait = 0; rhymeWait < 20; rhymeWait++) {
                    await new Promise((r) => setTimeout(r, 150));
                    if (cancelled || audioCancelledRef.current) return;
                    if (rhymeOptionsRef.current && rhymeOptionsRef.current.length > 0) break;
                  }
                }
                if (rhymeOptionsRef.current && rhymeOptionsRef.current.length > 0) {
                  await new Promise((r) => setTimeout(r, 150));
                  for (let i = 0; i < rhymeOptionsRef.current.length; i++) {
                    setHighlightedRhymeIndex(i);
                    const opt = rhymeOptionsRef.current[i];
                    const text = typeof opt === "string" ? opt : opt.text;
                    await handleAudio(text);
                    await new Promise((r) => setTimeout(r, 250));
                  }
                  setHighlightedRhymeIndex(null);
                }
              }
              if (wordSoundsActivity === "manipulation") {
                // Wait for Gemini generation to finish (up to 6s)
                if (!manipulationOptionsRef.current || manipulationOptionsRef.current.length === 0) {
                  for (let mWait = 0; mWait < 30; mWait++) {
                    await new Promise((r) => setTimeout(r, 200));
                    if (cancelled || audioCancelledRef.current) return;
                    if (manipulationOptionsRef.current && manipulationOptionsRef.current.length > 0) break;
                  }
                }
                if (manipulationOptionsRef.current && manipulationOptionsRef.current.length > 0) {
                  await new Promise((r) => setTimeout(r, 150));
                  for (let i = 0; i < manipulationOptionsRef.current.length; i++) {
                    setHighlightedManipIndex(i);
                    const opt = manipulationOptionsRef.current[i];
                    await handleAudio(typeof opt === "string" ? opt : opt.text);
                    await new Promise((r) => setTimeout(r, 250));
                  }
                  setHighlightedManipIndex(null);
                }
              }
              if (wordSoundsActivity === "syllable_blending") {
                // Wait for Gemini syllable data (up to 6s)
                if (!syllableDataRef.current?.syllables?.length) {
                  for (let sWait = 0; sWait < 30; sWait++) {
                    await new Promise((r) => setTimeout(r, 200));
                    if (cancelled || audioCancelledRef.current) return;
                    if (syllableDataRef.current?.syllables?.length) break;
                  }
                }
                // Play each syllable with chip highlighting
                const syls = syllableDataRef.current?.syllables || [];
                if (syls.length) {
                  await new Promise((r) => setTimeout(r, 150));
                  for (let i = 0; i < syls.length; i++) {
                    if (cancelled || audioCancelledRef.current) return;
                    setHighlightedSyllableIndex(i);
                    await handleAudio(syls[i]);
                    await new Promise((r) => setTimeout(r, 350));
                  }
                  setHighlightedSyllableIndex(null);
                  await new Promise((r) => setTimeout(r, 300));
                }
                // The answer OPTIONS are intentionally NOT read aloud here:
                // reading them spoils the blend (the child would just match what
                // they heard). The task is to blend the presented syllables and
                // recognize the word. Only the syllables (the stimulus) are played.
              }
              if (wordSoundsActivity === "syllable_counting") {
                const countWord = currentWordSoundsWord || wordSoundsPhonemes?.word;
                if (countWord) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (cancelled || audioCancelledRef.current) return;
                  await handleAudio(countWord);
                }
              }
            } catch (e) {
              warnLog("Unhandled error in timer:", e);
            }
          }, 50);
          return () => {
            cancelled = true;
            clearTimeout(timer);
          };
        }
      }, [
        currentWordSoundsWord,
        isLoadingPhonemes,
        wordSoundsActivity,
        rhymeOptions,
        playBlending,
      ]);
      const startActivity = React.useCallback(
        (
          activityId,
          forceWord = null,
          excludeWord = null,
          recursionDepth = 0,
        ) => {
          // Language capability redirect: a pushed lesson-plan sequence or a
          // preset can name an English-only activity while the content
          // language is not English — never half-run it; swap to the first
          // available activity instead. English sessions: no-op (always true).
          if (activityId && !wsActivityAvailableForLang(activityId)) {
            const fromSeq = (activitySequence || []).find((a) =>
              wsActivityAvailableForLang(a),
            );
            const redirect =
              fromSeq || (ACTIVITIES[0] && ACTIVITIES[0].id) || "counting";
            debugLog(
              `Activity "${activityId}" unavailable for ${wordSoundsLanguage}; starting "${redirect}" instead`,
            );
            activityId = redirect;
          }
          // === Stop all ongoing audio immediately on activity switch ===
          audioCancelledRef.current = true;
          audioRunIdRef.current++;
          if (currentActiveAudio.current) {
            currentActiveAudio.current.pause();
            currentActiveAudio.current.currentTime = 0;
            currentActiveAudio.current = null;
          }
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          if (audioInstances.current) {
            audioInstances.current.forEach((audio) => {
              try { audio.pause(); } catch (e) { console.warn("[WordSounds] silent catch:", e); }
            });
          }
          // Feedback + instruction clips are standalone Audio objects not in the
          // maps above; stop them too so they don't bleed into the next activity.
          if (feedbackAudioRef.current) {
            try { feedbackAudioRef.current.pause(); } catch (e) {}
            feedbackAudioRef.current = null;
          }
          if (instructionAudioRef.current) {
            try { instructionAudioRef.current.pause(); } catch (e) {}
            instructionAudioRef.current = null;
          }
          // Guard against un-cancelling a MINIMIZED tool: switch-activity-
          // then-minimize within 50ms left the hard-cancel flag false,
          // re-opening the leak stopAllWordSoundsAudio exists to close.
          setTimeout(() => {
            if (!isMinimized) audioCancelledRef.current = false;
          }, 50);
          // === End audio cleanup ===
          advanceEpochRef.current++;
          setWordSoundsActivity(activityId);
          setWordSoundsFeedback?.(null);
          setUserAnswer("");
          setAttempts(0);
          if (isProbeMode) {
            // Start the probe clock at PRESENTATION, not at the first answer
            // (the old total===1 effect excluded item 1's response time from
            // the rate denominator — inflating items/min — and its timestamp
            // filter dropped item 1 from the by-band breakdown).
            probeStartTimeRef.current = Date.now();
            setProbeElapsed(0);
          }
          setBlendingProgress(0);
          setSoundChips([]);
          setShowSessionComplete(false);
          sessionWordResults.current = [];
          // Streak intentionally PERSISTS across activity changes: a correct
          // run is not wiped just because the student switched activities. A
          // wrong answer still resets it (see newStreak logic), and the auto-
          // director still resets it explicitly when IT advances, so the
          // adaptive director's behavior is unchanged.
          debugLog("Streak preserved across activity change to:", activityId);
          setElkoninBoxes([]);
          setSegmentationErrors([]);
          setNextWordBuffer(null);
          lastPlayedWord.current = null;
          // Read & Match: clear choices/highlight and the regen guard so a
          // returning or repeated word always rebuilds its picture set.
          setDecodingChoices([]);
          setDecodeDragOver(false);
          lastWordForDecoding.current = null;
          // Sight & Spell: the rebuild effect is gated on option COUNT, not
          // word — without this reset, re-entering orthography served the
          // previous word's misspellings with the new word patched at index 0.
          setOrthographyOptions([]);
          if (typeof lastWordForOrthography !== "undefined" && lastWordForOrthography && "current" in lastWordForOrthography) {
            lastWordForOrthography.current = null;
          }
          if (!forceWord) {
            const effectiveDiff = getEffectiveDifficulty();
            generateSessionQueue(activityId, effectiveDiff);
          }
          let word = forceWord;
          if (!word) {
            const queue = sessionQueueRef.current[activityId];
            if (queue && queue.length > 0) {
              word = queue[0];
              sessionQueueRef.current[activityId] = queue.slice(1);
              setSessionWordLists((prev) => ({
                ...prev,
                [activityId]: queue.slice(1),
              }));
            }
          }
          if (!word) {
            const hasAnyWords =
              (wordPool && wordPool.length > 0) ||
              (preloadedWords && preloadedWords.length > 0);
            if (!hasAnyWords) {
              debugLog("WordSounds: No words available, waiting for data...");
              setWordSoundsFeedback?.({
                type: "info",
                message: "Loading your words... ⏳",
              });
              return;
            }
            if (recursionDepth > ACTIVITIES.length + 1) {
              warnLog(
                "WordSounds: All pools exhausted, stopping auto-advance.",
              );
              setWordSoundsFeedback?.({
                type: "success",
                message: "All activities complete! Great job! 🌟",
              });
              return;
            }
            if (
              wordPool &&
              wordPool.length > 0 &&
              recursionDepth === 0 &&
              !isSequentialMode
            ) {
              debugLog(
                "WordSounds: Queue empty but pool has words. Regenerating with broader difficulty...",
              );
              generateSessionQueue(activityId, "medium");
              const retryWord = getAdaptiveRandomWord();
              if (retryWord) {
                const retryTargetWord =
                  retryWord.singleWord || retryWord.fullTerm || retryWord.word;
                setCurrentWordSoundsWord(retryTargetWord);
                setCurrentWordImage(retryWord.image);
                setShowWordText(false);
                const retryPreloaded = preloadedWords.find(
                  (pw) =>
                    pw.word?.toLowerCase() === retryTargetWord.toLowerCase() ||
                    pw.targetWord?.toLowerCase() ===
                    retryTargetWord.toLowerCase(),
                );
                if (retryPreloaded && retryPreloaded.phonemes) {
                  setWordSoundsPhonemes(retryPreloaded);
                } else {
                  const fallback = generateFallbackData(retryTargetWord);
                  if (fallback) applyWordDataToState(fallback);
                }
                setIsLoadingPhonemes(false);
                return;
              }
            }
            const currentIndex = ACTIVITIES.findIndex(
              (a) => a.id === activityId,
            );
            if (currentIndex !== -1) {
              const nextIndex = currentIndex + 1;
              if (nextIndex >= ACTIVITIES.length) {
                debugLog("✅ Completed all activities!");
                setWordSoundsFeedback?.({
                  type: "success",
                  message: "All activities complete! Great job! 🌟",
                });
                return;
              }
              const nextActivity = ACTIVITIES[nextIndex];
              debugLog(
                "🎯 Activity queue empty - showing completion instead of auto-advancing",
              );
              setWordSoundsFeedback?.({
                type: "success",
                message: "Activity Complete! Great job! 🌟",
              });
              setShowSessionComplete(true);
            }
            return;
          }
          if (word) {
            const targetWord =
              word.singleWord ||
              word.fullTerm ||
              word.term ||
              word.word ||
              word;
            setCurrentWordSoundsWord(targetWord);
            setCurrentWordImage(word.image);
            setShowWordText(false);
            const preloadedWord = preloadedWords.find(
              (pw) =>
                pw.word?.toLowerCase() === targetWord.toLowerCase() ||
                pw.displayWord?.toLowerCase() === targetWord.toLowerCase(),
            );
            const matchingIdx = preloadedWords.findIndex(
              (pw) =>
                pw.word?.toLowerCase() === targetWord.toLowerCase() ||
                pw.targetWord?.toLowerCase() === targetWord.toLowerCase() ||
                pw.displayWord?.toLowerCase() === targetWord.toLowerCase(),
            );
            if (matchingIdx >= 0) {
              setCurrentWordIndex(matchingIdx + 1);
              debugLog(
                "🔄 Synced currentWordIndex to",
                matchingIdx + 1,
                "to skip:",
                targetWord,
              );
            }
            if (preloadedWord && preloadedWord.phonemes) {
              debugLog("🚀 Using preloaded data for:", targetWord);
              setWordSoundsPhonemes(preloadedWord);
              setIsLoadingPhonemes(false);
              if (
                activityId === "blending" &&
                preloadedWord.blendingDistractors
              ) {
                let distractors = preloadedWord.blendingDistractors.slice(
                  0,
                  5,
                );
                if (distractors.length < 5) {
                  const pool = ["dog","cat","sun","bed","map","pig","run","hop","net","cup","hat","log","mop","pen","rug","van","zip","fox","jet","web"];
                  const used = new Set([targetWord.toLowerCase(), ...distractors.map(d => d.toLowerCase())]);
                  for (const w of [...pool].sort(() => Math.random() - 0.5)) {
                    if (distractors.length >= 5) break;
                    if (!used.has(w)) { distractors.push(w); used.add(w); }
                  }
                }
                setBlendingOptions(
                  fisherYatesShuffle([targetWord, ...distractors]),
                );
                lastWordForBlending.current = targetWord;
                debugLog(
                  "📋 [Eager] Set blending options from preloaded:",
                  targetWord,
                );
              }
              if (activityId === "rhyming" && preloadedWord.rhymeDistractors) {
                const correctRhyme = preloadedWord.rhymeWord;
                const distractors = preloadedWord.rhymeDistractors.slice(0, 5);
                const options = correctRhyme
                  ? fisherYatesShuffle([correctRhyme, ...distractors])
                  : distractors;
                setRhymeOptions(options);
                lastWordForRhyming.current = targetWord;
                debugLog(
                  "📋 [Eager] Set rhyme options from preloaded:",
                  targetWord,
                );
              }
              if (activityId === "sound_sort") {
                soundSortPreloadRef.current = {
                  word: (targetWord || '').toLowerCase(),
                  item: computeSoundSortItem(targetWord, preloadedWord.phonemes, preloadedWord.soundSortMatches),
                };
                debugLog("📋 [Eager] Set sound sort options from preloaded:", targetWord);
              }
              if (activityId === "word_families") {
                const _wfr = resolveWordFamilyRime(targetWord, preloadedWord.rimeFamilyMembers);
                wordFamilyRimeRef.current = { word: (targetWord || '').toLowerCase(), rime: _wfr.rime, members: _wfr.members };
              }
            } else {
              debugLog(
                "📦 Using local fallback for:",
                targetWord,
                "(preloaded data unavailable)",
              );
              const fallback = generateFallbackData(targetWord);
              if (fallback) {
                applyWordDataToState(fallback);
                wordDataCache.current.set(targetWord.toLowerCase(), fallback);
              }
              setIsLoadingPhonemes(false);
            }
          }
        },
        [
          getAdaptiveRandomWord,
          fetchWordData,
          setWordSoundsActivity,
          setCurrentWordSoundsWord,
          setWordSoundsFeedback,
          wordPool,
          preloadedWords.length,
          wsActivityAvailableForLang,
          activitySequence,
          ACTIVITIES,
        ],
      );
      React.useEffect(() => {
        if (
          firstWordReady &&
          preloadedWords.length > 0 &&
          !currentWordSoundsWord &&
          !isLoadingPhonemes
        ) {
          if (isProbeMode && !hasStartedFromReview.current) {
            hasStartedFromReview.current = true;
            const autoStartTimer = setTimeout(() => {
              startActivity(wordSoundsActivity);
            }, 100);
            return () => clearTimeout(autoStartTimer);
          }
          const firstWord = preloadedWords[0];
          if (firstWord && firstWord.phonemes) {
            if (
              !showReviewPanel &&
              !hasStartedFromReview.current &&
              !isProbeMode &&
              !mountPresetActivityRef.current
            ) {
              setShowReviewPanel(true);
            }
          }
        }
      }, [
        firstWordReady,
        preloadedWords,
        currentWordSoundsWord,
        isLoadingPhonemes,
        showReviewPanel,
        isProbeMode,
        wordSoundsActivity,
        startActivity,
      ]);
      React.useEffect(() => {
        if (showReviewPanel) {
          return;
        }
        const hasWords =
          (wordPool && wordPool.length > 0) ||
          (preloadedWords && preloadedWords.length > 0);
        if (hasWords && !currentWordSoundsWord && !isLoadingPhonemes) {
          if (preloadedWords.length > 0 && !hasStartedFromReview.current && !isProbeMode) {
            if (!mountPresetActivityRef.current) {
              setShowReviewPanel(true);
              return;
            }
            // Direct-play mount (live-session push / student self-open /
            // preview Launch): start the preset activity — never strand a
            // student on the teacher review panel. Also restarts play when a
            // teacher pushes a DIFFERENT word set while the modal is mounted
            // (the new-first-word effect resets hasStartedFromReview).
            hasStartedFromReview.current = true;
            startActivity(wordSoundsActivity || "counting");
            return;
          }
          // Guard: if user already started from review and we have preloaded words,
          // don't re-trigger preload — the activity should be running with the first word
          if (hasStartedFromReview.current && preloadedWords.length > 0) {
            debugLog("🛡️ Skip preload re-trigger: user already started activity from review");
            return;
          }
          const prefetchTimer = setTimeout(() => {
            prefetchNextWords();
            if (typeof preloadInitialBatch === "function") {
              preloadInitialBatch();
            }
          }, 100);
          return () => clearTimeout(prefetchTimer);
        }
      }, [
        wordPool,
        currentWordSoundsWord,
        wordSoundsActivity,
        startActivity,
        isLoadingPhonemes,
        prefetchNextWords,
        showReviewPanel,
        preloadedWords.length,
      ]);
      React.useEffect(() => {
        if (
          activitySequence &&
          activitySequence.length > 0 &&
          wordSoundsActivity === "word-sounds" &&
          preloadedWords.length > 0 &&
          !showReviewPanel &&
          !initialShowReviewPanel
        ) {
          debugLog(
            "🎯 Lesson Plan: Auto-starting first activity:",
            activitySequence[0],
          );
          hasStartedFromReview.current = true;
          const autoStartTimer = setTimeout(() => {
            startActivity(activitySequence[0]);
          }, 100);
          return () => clearTimeout(autoStartTimer);
        }
      }, [
        activitySequence,
        wordSoundsActivity,
        preloadedWords.length,
        startActivity,
        showReviewPanel,
        initialShowReviewPanel,
      ]);
      React.useEffect(() => {
        if (
          wordSoundsActivity &&
          (!sessionQueueRef.current[wordSoundsActivity] ||
            sessionQueueRef.current[wordSoundsActivity].length === 0)
        ) {
          debugLog("🚀 Initializing Session Queue for", wordSoundsActivity);
          generateSessionQueue(
            wordSoundsActivity,
            wordSoundsDifficulty || "medium",
          );
          if (!currentWordSoundsWord) {
            const hasWords =
              (wordPool && wordPool.length > 0) ||
              (preloadedWords && preloadedWords.length > 0);
            if (hasWords) {
              hasStartedFromReview.current = true;
              startActivity(wordSoundsActivity);
            } else {
              const first = getAdaptiveRandomWord();
              if (first) {
                const w = first.singleWord || first.word || first;
                setCurrentWordSoundsWord(w);
              }
            }
          }
        }
      }, [
        wordSoundsActivity,
        wordPool,
        preloadedWords.length,
        generateSessionQueue,
        startActivity,
      ]);
      React.useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (audioInstances.current) {
          audioInstances.current.forEach((audio) => {
            try {
              audio.pause();
            } catch (e) {
              warnLog("Caught error:", e?.message || e);
            }
          });
        }
        // Also stop the active data-URI/bank clip: a word advance within the
        // same activity never paused it, so multi-second clips crossed item
        // boundaries (startActivity only covers activity SWITCHES).
        if (currentActiveAudio.current) {
          try {
            currentActiveAudio.current.pause();
            currentActiveAudio.current.currentTime = 0;
          } catch (e) { /* already stopped */ }
          currentActiveAudio.current = null;
        }
        setIsPlayingAudio(false);
      }, [currentWordSoundsWord, wordSoundsActivity]);
      React.useEffect(() => {
        if (!playInstructions || isMinimized || !currentWordSoundsWord) return;
        if (showReviewPanel) return;
        // orthography now gets instructions like all other activities
        let cancelled = false;
        // Run-id: answering bumps audioRunIdRef, but the option-play loops
        // below only checked `cancelled` (which flips 2-3s later on the word
        // change) — so read-alouds kept talking over the answer feedback.
        const seqRun = audioRunIdRef.current;
        const seqStale = () =>
          cancelled ||
          audioCancelledRef.current ||
          audioRunIdRef.current !== seqRun;
        setIsPlayingAudio(true);
        const runInstructionSequence = async () => {
          try {
            await new Promise((r) => setTimeout(r, 800));
            if (cancelled || audioCancelledRef.current) return;
            let instructionAudioSrc = null;
            let instructionText = null;
            const INST_KEY_MAP = {
              orthography: "inst_orthography",
              spelling_bee: "inst_spelling_bee",
              word_scramble: "inst_word_scramble",
              missing_letter: "inst_missing_letter",
              counting: "inst_counting",
              blending: "inst_blending",
              segmentation: "inst_segmentation",
              rhyming: "inst_rhyming",
              letter_tracing: "inst_letter_tracing",
              sound_sort: "inst_sound_sort",
              word_families: "inst_word_families",
              mapping: "mapping",
              // manipulation intentionally omitted — no inst_manipulation key
              // exists in audio_bank.json. Its instruction is generated per-word
              // by generateManipulationTask at setup time and pre-warmed via
              // Gemini TTS, so the audio bank lookup path should never fire.
              syllable_blending: "inst_syllable_blending",
              syllable_counting: "inst_syllable_counting",
            };
            const instKey =
              INST_KEY_MAP[wordSoundsActivity] || wordSoundsActivity;
            if (
              typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
              (window.__ALLO_INSTRUCTION_AUDIO[instKey] ||
                window.__ALLO_INSTRUCTION_AUDIO[wordSoundsActivity]) &&
              wordSoundsActivity !== "rhyming" &&
              wordSoundsActivity !== "letter_tracing" &&
              wordSoundsActivity !== "sound_sort" &&
              wordSoundsActivity !== "word_families"
            ) {
              instructionAudioSrc =
                window.__ALLO_INSTRUCTION_AUDIO[instKey] ||
                window.__ALLO_INSTRUCTION_AUDIO[wordSoundsActivity];
            } else if (wordSoundsActivity === "isolation") {
              // Wait for isolationState to become available (may not be set yet on first item)
              let isoWaitState = isolationState || isolationStateRef.current;
              if (!isoWaitState && currentWordSoundsWord) {
                for (let isoWait = 0; isoWait < 20; isoWait++) {
                  await new Promise((r) => setTimeout(r, 150));
                  if (cancelled || audioCancelledRef.current) return;
                  isoWaitState = isolationStateRef.current;
                  if (isoWaitState && isoWaitState.isoOptions?.length > 0) break;
                }
              }
              if (isoWaitState) {
              const posRaw = isoWaitState.currentPosition;
              const posKeyMap = {
                first: "1st",
                middle: "middle",
                last: "last",
              };
              const ordinals = [
                "1st",
                "2nd",
                "3rd",
                "4th",
                "5th",
                "6th",
                "7th",
                "8th",
                "9th",
                "10th",
                "11th",
                "12th",
              ];
              const posKey =
                typeof posRaw === "number"
                  ? ordinals[posRaw]
                  : posKeyMap[posRaw] || posRaw;
              if (
                typeof window.__ALLO_ISOLATION_AUDIO !== "undefined" &&
                window.__ALLO_ISOLATION_AUDIO[posKey]
              ) {
                instructionAudioSrc = window.__ALLO_ISOLATION_AUDIO[posKey];
              } else {
                const ordinalNames = [
                  "first",
                  "second",
                  "third",
                  "fourth",
                  "fifth",
                  "sixth",
                  "seventh",
                  "eighth",
                  "ninth",
                  "tenth",
                  "eleventh",
                  "twelfth",
                ];
                const posStr =
                  typeof posRaw === "number" ? ordinalNames[posRaw] : posRaw;
                instructionText = `What is the ${posStr || "target"} sound in ${currentWordSoundsWord}?`;
              }
              } else {
                instructionText = ts('word_sounds.isolation_prompt') || "What sound is in this word?";
              }
            } else if (wordSoundsActivity === "letter_tracing") {
              const lowLet = currentWordSoundsWord.charAt(0).toLowerCase();
              const upperLet = currentWordSoundsWord.charAt(0).toUpperCase();
              if (
                typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                window.__ALLO_INSTRUCTION_AUDIO["trace_letter"]
              ) {
                await handleAudio(
                  window.__ALLO_INSTRUCTION_AUDIO["trace_letter"],
                );
                if (cancelled) return;
                await new Promise((r) => setTimeout(r, 200));
                const letterNameKey = "letter_" + lowLet;
                if (
                  typeof window.__ALLO_LETTER_NAME_AUDIO_BANK !== "undefined" &&
                  window.__ALLO_LETTER_NAME_AUDIO_BANK[lowLet]
                ) {
                  // Dedicated letter NAME bank — "ay", "bee", "see", etc.
                  await handleAudio(window.__ALLO_LETTER_NAME_AUDIO_BANK[lowLet]);
                } else if (
                  typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                  window.__ALLO_INSTRUCTION_AUDIO[letterNameKey]
                ) {
                  await handleAudio(window.__ALLO_INSTRUCTION_AUDIO[letterNameKey]);
                } else if (
                  typeof LETTER_NAME_AUDIO !== "undefined" &&
                  LETTER_NAME_AUDIO[lowLet]
                ) {
                  await handleAudio(LETTER_NAME_AUDIO[lowLet]);
                } else {
                  await handleAudio(upperLet);
                }
                await new Promise((r) => setTimeout(r, 200));
                if (window.__ALLO_INSTRUCTION_AUDIO["for"]) {
                  await handleAudio(window.__ALLO_INSTRUCTION_AUDIO["for"]);
                  if (cancelled) return;
                  await new Promise((r) => setTimeout(r, 200));
                }
                // Use pre-recorded word name audio if available, otherwise TTS
                const wordLower = currentWordSoundsWord.toLowerCase();
                if (typeof _CACHE_WORD_AUDIO_BANK !== "undefined" && _CACHE_WORD_AUDIO_BANK && _CACHE_WORD_AUDIO_BANK[wordLower]) {
                  await handleAudio(_CACHE_WORD_AUDIO_BANK[wordLower]);
                } else if (typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" && window.__ALLO_INSTRUCTION_AUDIO["word_" + wordLower]) {
                  await handleAudio(window.__ALLO_INSTRUCTION_AUDIO["word_" + wordLower]);
                } else {
                  await handleAudio(currentWordSoundsWord);
                }
              } else if (
                typeof window.__ALLO_LETTER_NAME_AUDIO_BANK !== "undefined" &&
                window.__ALLO_LETTER_NAME_AUDIO_BANK[lowLet]
              ) {
                instructionAudioSrc = window.__ALLO_LETTER_NAME_AUDIO_BANK[lowLet];
              } else if (
                typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                window.__ALLO_INSTRUCTION_AUDIO["letter_" + lowLet]
              ) {
                instructionAudioSrc = window.__ALLO_INSTRUCTION_AUDIO["letter_" + lowLet];
              } else if (
                typeof LETTER_NAME_AUDIO !== "undefined" &&
                LETTER_NAME_AUDIO[lowLet]
              ) {
                instructionAudioSrc = LETTER_NAME_AUDIO[lowLet];
              } else {
                instructionText = `Trace the letter ${upperLet} for ${currentWordSoundsWord}`;
              }
            } else if (wordSoundsActivity === "sound_sort") {
              const targetWord = (currentWordSoundsWord || "").toLowerCase();
              // Use the SAME precomputed item as the game view (preload ref /
              // computeSoundSortItem) so the spoken target sound is the sound
              // the match filter actually tests. The raw Gemini phonemes can
              // disagree with it and may carry slash notation ("/b/") that the
              // phoneme audio bank can't key on — that's what made TTS read
              // the sound literally instead of playing the bank clip.
              const _ssPre = soundSortPreloadRef.current;
              const _ssItem = (_ssPre && _ssPre.word === targetWord && _ssPre.item)
                ? _ssPre.item
                : computeSoundSortItem(targetWord, wordSoundsPhonemes && wordSoundsPhonemes.phonemes, wordSoundsPhonemes && wordSoundsPhonemes.soundSortMatches);
              const wordSeed = targetWord
                .split("")
                .reduce((a, c) => a + c.charCodeAt(0), 0);
              const mode = _ssItem
                ? _ssItem.mode
                : wordSeed % 2 === 0 ? "first" : "last";
              let targetSound = _ssItem
                ? _ssItem.targetChar
                : mode === "first"
                  ? estimateFirstPhoneme(targetWord)
                  : estimateLastPhoneme(targetWord);
              // Belt-and-braces: never let slash notation reach the audio path.
              targetSound = String(targetSound || "").replace(/^\/+|\/+$/g, "").trim();
              const ssPromptKey =
                mode === "first" ? "sound_match_start" : "sound_match_end";
              if (
                typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                window.__ALLO_INSTRUCTION_AUDIO[ssPromptKey]
              ) {
                await handleAudio(window.__ALLO_INSTRUCTION_AUDIO[ssPromptKey]);
              } else {
                // Speak the framing WITHOUT the phoneme embedded — TTS reads a
                // bare "b" as the letter name ("bee"). The sound itself plays
                // from the phoneme bank right after.
                await handleAudio(
                  mode === "first"
                    ? "Find words that start with the sound"
                    : "Find words that end with the sound",
                );
              }
              if (cancelled) return;
              await new Promise((r) => setTimeout(r, 200));
              await handleAudio(targetSound);
              if (currentWordSoundsWord) {
                await new Promise((r) => setTimeout(r, 150));
                if (
                  typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                  window.__ALLO_INSTRUCTION_AUDIO["as_in"]
                ) {
                  await handleAudio(window.__ALLO_INSTRUCTION_AUDIO["as_in"]);
                } else {
                  await handleAudio("as in");
                }
                await new Promise((r) => setTimeout(r, 100));
                await handleAudio(currentWordSoundsWord);
              }
            } else if (wordSoundsActivity === "word_families") {
              const targetWord = currentWordSoundsWord?.toLowerCase() || "";
              const _wfPre = wordFamilyRimeRef.current;
              const targetRime = (_wfPre && _wfPre.word === targetWord)
                ? _wfPre.rime
                : resolveWordFamilyRime(targetWord, wordSoundsPhonemes?.rimeFamilyMembers).rime;
              if (
                typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                window.__ALLO_INSTRUCTION_AUDIO["inst_word_families"]
              ) {
                await handleAudio(
                  window.__ALLO_INSTRUCTION_AUDIO["inst_word_families"],
                );
                if (cancelled) return;
                await new Promise((r) => setTimeout(r, 200));
                if (cancelled) return;
                await handleAudio(targetRime);
              } else {
                try {
                  await handleAudio(
                    `Find all words in the ${targetRime} family`,
                  );
                } catch (e) {
                  warnLog("Word families instruction audio failed:", e);
                }
              }
            } else if (wordSoundsActivity === "rhyming") {
              if (
                typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                window.__ALLO_INSTRUCTION_AUDIO["inst_rhyming"]
              ) {
                await handleAudio(
                  window.__ALLO_INSTRUCTION_AUDIO["inst_rhyming"],
                );
                if (cancelled) return;
                await new Promise((r) => setTimeout(r, 200));
                if (cancelled) return;
                await handleAudio(currentWordSoundsWord);
              } else {
                await handleAudio("Which word rhymes with");
                if (cancelled) return;
                await new Promise((r) => setTimeout(r, 200));
                if (cancelled) return;
                await handleAudio(currentWordSoundsWord);
              }
            } else if (wordSoundsActivity === "syllable_blending") {
              instructionText = ts(`word_sounds.syllable_blending_prompt`) || "Listen to the syllables and blend them together";
            } else if (wordSoundsActivity === "syllable_counting") {
              instructionText = ts(`word_sounds.syllable_counting_prompt`) || "How many syllables do you hear? Clap for each one";
            } else if (wordSoundsActivity === "manipulation") {
              // Manipulation plays its own Gemini-generated instruction in the block below; skip generic instruction
              instructionText = null;
            } else {
              instructionText = ts(`word_sounds.${wordSoundsActivity}_prompt`);
              // Defensive: if ts() couldn't find a translation and returned the
              // raw key (e.g. "word_sounds.manipulation_prompt"), null it out
              // rather than letting TTS speak the key literal. This is what
              // produced "word sounds manipulation prompt" reports historically.
              if (typeof instructionText === 'string' && instructionText.startsWith('word_sounds.')) {
                instructionText = null;
              }
            }
            if (seqStale()) return;
            if (instructionAudioSrc) {
              await handleAudio(instructionAudioSrc);
            } else if (instructionText && !isPlayingAudio) {
              await handleAudio(instructionText);
            }
            // Bail BEFORE dispatching: a word advance mid-instruction used to
            // still fire this event, kicking WordFamiliesView's option
            // auto-play against the wrong (next) item.
            if (seqStale()) return;
            // Signal that instruction audio is done (used by WordFamiliesView / Sound Sort)
            try { window.dispatchEvent(new Event('wordSoundsInstructionDone')); } catch(e) { console.warn("[WordSounds] silent catch:", e); }
            if (
              wordSoundsActivity === "blending" &&
              wordSoundsPhonemes?.phonemes
            ) {
              await new Promise((r) => setTimeout(r, 200));
              if (cancelled) return;
              // Resolve options BEFORE playBlending so TTS preloading runs during
              // phoneme playback instead of after, eliminating the post-blend gap.
              let effectiveBlendingOptions = blendingOptionsRef.current;
              if (
                !effectiveBlendingOptions ||
                effectiveBlendingOptions.length === 0
              ) {
                for (let waitAttempt = 0; waitAttempt < 10; waitAttempt++) {
                  await new Promise((r) => setTimeout(r, 100));
                  if (cancelled) return;
                  if (
                    blendingOptionsRef.current &&
                    blendingOptionsRef.current.length > 0
                  ) {
                    effectiveBlendingOptions = blendingOptionsRef.current;
                    break;
                  }
                }
              }
              // Kick off TTS generation for all options now — fire-and-forget so
              // playBlending() and TTS preloading run concurrently.
              const optionsPreloadPromise =
                effectiveBlendingOptions && effectiveBlendingOptions.length > 0
                  ? Promise.all(
                      effectiveBlendingOptions.map((o) =>
                        handleAudio(
                          typeof o === "string" ? o : o.text,
                          false,
                        ).catch(() => { }),
                      ),
                    )
                  : Promise.resolve();
              await playBlending();
              // By the time phoneme playback finishes (~3-5s), TTS should be cached.
              await optionsPreloadPromise;
              if (cancelled) return;
              if (
                effectiveBlendingOptions &&
                effectiveBlendingOptions.length > 0
              ) {
                await new Promise((r) => setTimeout(r, 100));
                for (let i = 0; i < effectiveBlendingOptions.length; i++) {
                  if (seqStale()) break;
                  setHighlightedBlendIndex(i);
                  await handleAudio(effectiveBlendingOptions[i]);
                  if (cancelled) return;
                  await new Promise((r) => setTimeout(r, 200));
                }
                setHighlightedBlendIndex(null);
              }
            }
            if (
              wordSoundsActivity === "segmentation" &&
              currentWordSoundsWord
            ) {
              await new Promise((r) => setTimeout(r, 400));
              if (cancelled) return;
              await handleAudio(currentWordSoundsWord);
            }
            if (wordSoundsActivity === "rhyming") {
              // Wait for rhyme options to be populated (same pattern as isolation)
              if (!rhymeOptionsRef.current || rhymeOptionsRef.current.length === 0) {
                for (let rhymeWait = 0; rhymeWait < 20; rhymeWait++) {
                  await new Promise((r) => setTimeout(r, 150));
                  if (cancelled || audioCancelledRef.current) return;
                  if (rhymeOptionsRef.current && rhymeOptionsRef.current.length > 0) break;
                }
              }
              if (rhymeOptionsRef.current && rhymeOptionsRef.current.length > 0) {
                // Snapshot options so the loop and preload use a stable reference.
                const rhymeSnapshot = [...rhymeOptionsRef.current];
                await new Promise((r) => setTimeout(r, 200));
                if (cancelled) return;
                // Preload TTS for all options before the play loop — mirrors
                // isolation pattern; ensures audio is cached when the loop starts.
                await Promise.all(
                  rhymeSnapshot.map((o) =>
                    handleAudio(
                      typeof o === "string" ? o : o.text,
                      false,
                    ).catch(() => { }),
                  ),
                );
                if (cancelled) return;
                for (let i = 0; i < rhymeSnapshot.length; i++) {
                  if (seqStale()) break;
                  setHighlightedRhymeIndex(i);
                  await handleAudio(rhymeSnapshot[i]);
                  if (cancelled) return;
                  await new Promise((r) => setTimeout(r, 350));
                }
                setHighlightedRhymeIndex(null);
              }
            }
            if (wordSoundsActivity === "manipulation") {
              // Wait for Gemini generation (up to 6s)
              if (
                !manipulationStateRef.current ||
                !manipulationOptionsRef.current?.length
              ) {
                for (let mWait = 0; mWait < 30; mWait++) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (cancelled || audioCancelledRef.current) return;
                  if (
                    manipulationStateRef.current &&
                    manipulationOptionsRef.current?.length > 0
                  )
                    break;
                }
              }
              if (
                manipulationStateRef.current &&
                manipulationOptionsRef.current?.length > 0
              ) {
                // Play the task instruction — /X/ tokens come from the phoneme
                // bank instead of TTS reading "slash tee slash".
                const instruction = manipulationStateRef.current.instruction;
                if (instruction) {
                  await speakInstructionWithPhonemes(instruction);
                  if (cancelled) return;
                  await new Promise((r) => setTimeout(r, 400));
                }
                // Snapshot + preload option TTS
                const manipSnapshot = [...manipulationOptionsRef.current];
                await Promise.all(
                  manipSnapshot.map((o) =>
                    handleAudio(
                      typeof o === "string" ? o : o.text,
                      false,
                    ).catch(() => {}),
                  ),
                );
                if (cancelled) return;
                for (let i = 0; i < manipSnapshot.length; i++) {
                  if (seqStale()) break;
                  setHighlightedManipIndex(i);
                  await handleAudio(manipSnapshot[i]);
                  if (cancelled) return;
                  await new Promise((r) => setTimeout(r, 350));
                }
                setHighlightedManipIndex(null);
              }
            }
            if (
              (wordSoundsActivity === "syllable_blending" ||
                wordSoundsActivity === "syllable_counting") &&
              currentWordSoundsWord
            ) {
              // Wait for Gemini syllable data
              if (!syllableDataRef.current) {
                for (let sWait = 0; sWait < 30; sWait++) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (cancelled) return;
                  if (syllableDataRef.current) break;
                }
              }
              if (syllableDataRef.current) {
                await new Promise((r) => setTimeout(r, 300));
                if (cancelled) return;
                await handleAudio(currentWordSoundsWord);
                if (cancelled) return;
                await new Promise((r) => setTimeout(r, 400));
                if (wordSoundsActivity === "syllable_blending") {
                  const syls = syllableDataRef.current.syllables || [];
                  for (let i = 0; i < syls.length; i++) {
                    if (seqStale()) break;
                    setHighlightedSyllableIndex(i);
                    await handleAudio(syls[i]);
                    if (cancelled) return;
                    await new Promise((r) => setTimeout(r, 350));
                  }
                  setHighlightedSyllableIndex(null);
                  // Options intentionally NOT read aloud (same reason as the
                  // syllable_blending note above): reading them spoils the blend.
                  // Option audio loads on demand when the child taps an option.
                }
              }
            }
            if (wordSoundsActivity === "isolation" && currentWordSoundsWord) {
              await new Promise((r) => setTimeout(r, 400));
              if (cancelled) return;
              await handleAudio(currentWordSoundsWord);
              // Read options from the REF + wait for them to populate on first
              // item. Previously this block closed over the `isolationState`
              // React prop snapshot captured at runInstructionSequence start
              // — on the first word, that snapshot was often null/empty
              // because setIsolationState hadn't flushed to the re-render
              // yet, so the options block was silently skipped. (Second word
              // onward, the prior word's state was still present → options
              // DID play — matching the user's observed behavior.) Use the
              // ref and spin-wait up to ~3s for options to land.
              let isoSnap2 = isolationStateRef.current || isolationState;
              if (!isoSnap2?.isoOptions?.length) {
                for (let isoWait2 = 0; isoWait2 < 20; isoWait2++) {
                  await new Promise((r) => setTimeout(r, 150));
                  if (cancelled || audioCancelledRef.current) return;
                  isoSnap2 = isolationStateRef.current;
                  if (isoSnap2?.isoOptions?.length > 0) break;
                }
              }
              if (isoSnap2?.isoOptions?.length > 0) {
                await new Promise((r) => setTimeout(r, 300));
                if (cancelled) return;
                await Promise.all(
                  isoSnap2.isoOptions.map((o) =>
                    handleAudio(o, false).catch(() => { }),
                  ),
                );
                for (
                  let i = 0;
                  i < (isoSnap2?.isoOptions?.length || 0);
                  i++
                ) {
                  if (seqStale()) break;
                  setHighlightedIsoIndex(i);
                  await handleAudio(isoSnap2.isoOptions[i]);
                  if (cancelled) return;
                  await new Promise((r) => setTimeout(r, 450));
                }
                setHighlightedIsoIndex(null);
              }
            }
            if (wordSoundsActivity === "counting" && currentWordSoundsWord) {
              await new Promise((r) => setTimeout(r, 400));
              if (cancelled) return;
              await handleAudio(currentWordSoundsWord);
            }
            // sound_sort word already played in custom instruction block above
          } catch (e) {
            warnLog("Unhandled error in runInstructionSequence:", e);
          } finally {
            // The 8919 setIsPlayingAudio(true) had NO matching reset on
            // data-URI-only sequences (bank clips never touch the flag), so
            // replay buttons stayed spinner-disabled for the whole item.
            if (isMountedRef.current) setIsPlayingAudio(false);
          }
        };
        runInstructionSequence();
        return () => {
          cancelled = true;
        };
      }, [
        wordSoundsActivity,
        currentWordSoundsWord,
        playInstructions,
        isMinimized,
      ]);
      const playSynthesizedSound = (type, intensity = 0) => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") ctx.resume();
          if (type === "correct") {
            const baseFreq = 523.25;
            const steps = [0, 4, 7, 12, 16, 19, 24];
            const step = steps[Math.min(intensity, steps.length - 1)] || 0;
            const freq = baseFreq * Math.pow(2, step / 12);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(
              freq * 1.01,
              ctx.currentTime + 0.1,
            );
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + 0.5,
            );
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
          }
        } catch (e) {
          warnLog("Audio juice failed", e);
        }
      };
      const checkAnswer = React.useCallback(
        (answer, expectedAnswer, opts) => {
          debugLog("TeacherCheck: checkAnswer called", {
            answer,
            expectedAnswer,
            locked: submissionLockRef.current,
          });
          if (submissionLockRef.current) return;
          audioRunIdRef.current++;
          try {
            const safeAnswer = (answer ?? "").toString().toLowerCase().trim();
            const safeExpected = (expectedAnswer ?? "")
              .toString()
              .toLowerCase()
              .trim();
            if (!safeExpected) {
              warnLog(
                "⚠️ checkAnswer: expectedAnswer is empty/null, skipping check",
              );
              return;
            }
            // Canonical map: each alternate spelling of a sound maps to ONE
            // representative (which is itself NOT a key, so it resolves to
            // itself). A prior version used bidirectional swaps (oi:"oy",
            // oy:"oi"); those never matched when BOTH sides were in the table
            // (each flipped to the other), so alternate spellings were silently
            // rejected. Collapsing to a canonical form fixes it:
            // norm("oy") === norm("oi") === "oi".
            const ANSWER_EQUIV = {
              oy: "oi",
              au: "aw",
              ew: "oo",
              oe: "oa",
              ai: "ay",
              ea: "ee",
              ir: "er", ur: "er",
              igh: "ie",
              ou: "ow",
              ck: "k",
              ph: "f",
              wr: "r",
              kn: "n",
            };
            const normAnswer = ANSWER_EQUIV[safeAnswer] || safeAnswer;
            const normExpected = ANSWER_EQUIV[safeExpected] || safeExpected;
            const isCorrect =
              normAnswer === normExpected || safeAnswer === safeExpected;
            // Several activities grade locally and pass sentinel pairs like
            // ("incorrect","correct") — the sentinel must never be spoken,
            // shown, or hinted at as if it were the real answer.
            const _expIsSentinel = [
              "correct",
              "incorrect",
              "right",
              "wrong",
              "true",
              "false",
            ].includes(safeExpected);
            const effectiveCheckMode = getEffectiveImageMode();
            // Find-all boards (sound_sort/word_families) pass maxAttempts =
            // distractor count + 1: their instruction invites tapping words to
            // hear them, so two exploratory taps must not finalize the item
            // as a scored failure. Default stays 2 presentations (1 retry).
            const _retryBudget =
              opts && Number(opts.maxAttempts) > 1
                ? Number(opts.maxAttempts) - 1
                : 1;
            if (!isCorrect && attempts < _retryBudget && !isProbeMode) {
              const newAttempts = attempts + 1;
              setAttempts(newAttempts);
              playSound("error");
              if (newAttempts === 1) {
                if (effectiveCheckMode === "progressive")
                  setShowImageForCurrentWord(true);
                setWordSoundsFeedback?.({
                  isCorrect: false,
                  message:
                    ts("word_sounds.fb_try_again") ||
                    "Try again! Listen closely... 👂",
                });
                // (announced by the wordSoundsFeedback mirror effect)
                try {
                  if (
                    typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                    window.__ALLO_INSTRUCTION_AUDIO["fb_try_again_listen"]
                  ) {
                    if (feedbackAudioRef.current) {
                      feedbackAudioRef.current.pause();
                      feedbackAudioRef.current = null;
                    }
                    const tryAgainAudio = new Audio(
                      window.__ALLO_INSTRUCTION_AUDIO["fb_try_again_listen"],
                    );
                    feedbackAudioRef.current = tryAgainAudio;
                    tryAgainAudio.volume = 0.7;
                    tryAgainAudio.play().catch(() => { });
                    // Run-id guard: if the child answers correctly while this
                    // clip is still playing, the natural onended used to
                    // replay the OLD word (or a whole blend) over the
                    // celebration and next item.
                    const _fbRun = audioRunIdRef.current;
                    tryAgainAudio.onended = () => {
                      // Read & Match decodes a PRINTED word that is never spoken;
                      // skip the re-speak so the modality stays read-only.
                      if (isMountedRef.current && currentWordSoundsWord && wordSoundsActivity !== "decoding" && audioRunIdRef.current === _fbRun) {
                        setTimeout(
                          () => {
                            if (audioRunIdRef.current !== _fbRun) return;
                            wordSoundsActivity === "blending" ? playBlending() : handleAudio(currentWordSoundsWord);
                          },
                          300,
                        );
                      }
                    };
                  } else {
                    const _fbRun2 = audioRunIdRef.current;
                    setTimeout(() => {
                      if (isMountedRef.current && currentWordSoundsWord && wordSoundsActivity !== "decoding" && audioRunIdRef.current === _fbRun2)
                        wordSoundsActivity === "blending" ? playBlending() : handleAudio(currentWordSoundsWord);
                    }, 800);
                  }
                } catch (e) {
                  debugLog("fb_try_again_listen error", e);
                }
              } else {
                // Never build a letter hint from a sentinel ("correct" →
                // 'starts with "C"') — fall back to a generic encouragement.
                // Cue the first grapheme CLUSTER, not the first letter: "chip"
                // starts with "CH", "art" with "AR" (r-controlled) — a bare
                // "C"/"A" cues the wrong sound for digraph/vowel-team words.
                const _hintOnset =
                  (typeof estimateFirstPhoneme === "function"
                    ? estimateFirstPhoneme(safeExpected)
                    : "") || safeExpected.charAt(0);
                const hint = _expIsSentinel || !safeExpected
                  ? "So close!"
                  : wordSoundsPhonemes?.phonemes
                    ? `Hint: This word has ${wordSoundsPhonemes.phonemes.length} sounds and starts with "${_hintOnset.toUpperCase()}"`
                    : `Hint: It starts with "${_hintOnset.toUpperCase()}"`;
                setWordSoundsFeedback?.({
                  isCorrect: false,
                  message:
                    ts("word_sounds.fb_one_more_try") ||
                    `${hint} — one more try! 💪`,
                });
                setShowWordText(true);
                try {
                  if (
                    typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                    window.__ALLO_INSTRUCTION_AUDIO["fb_almost"]
                  ) {
                    if (feedbackAudioRef.current) {
                      feedbackAudioRef.current.pause();
                      feedbackAudioRef.current = null;
                    }
                    const almostAudio = new Audio(
                      window.__ALLO_INSTRUCTION_AUDIO["fb_almost"],
                    );
                    feedbackAudioRef.current = almostAudio;
                    almostAudio.volume = 0.7;
                    almostAudio.play().catch(() => { });
                    // Run-id + sentinel guards (same class as the try-again
                    // clip above): never re-speak a stale item or a sentinel.
                    const _almRun = audioRunIdRef.current;
                    almostAudio.onended = () => {
                      if (isMountedRef.current && wordSoundsActivity !== "decoding" && !_expIsSentinel && audioRunIdRef.current === _almRun) {
                        setTimeout(() => {
                          if (audioRunIdRef.current === _almRun) handleAudio(expectedAnswer);
                        }, 300);
                      }
                    };
                  } else {
                    const _almRun2 = audioRunIdRef.current;
                    setTimeout(() => {
                      if (isMountedRef.current && wordSoundsActivity !== "decoding" && !_expIsSentinel && audioRunIdRef.current === _almRun2) handleAudio(expectedAnswer);
                    }, 800);
                  }
                } catch (e) {
                  debugLog("fb_almost error", e);
                }
              }
              setTimeout(() => {
                if (isMountedRef.current) setWordSoundsFeedback?.(null);
              }, 3000);
              return;
            }
            submissionLockRef.current = true;
            setAttempts(0);
            const newStreak = isCorrect
              ? attempts > 0
                ? wordSoundsScore.streak
                : wordSoundsScore.streak + 1
              : 0;
            if (isCorrect) {
              playSynthesizedSound("correct", newStreak);
              // Honor the host's reduce-motion toggle: suppress the visual burst
              // (confetti/stars/XP float/avatar bounce) and the haptic buzz for
              // motion/sensory-sensitive learners, not just speed it up via CSS.
              // The success chime + word/image reveal + feedback banner remain.
              // Suppress in probe mode too: a timed CBM should not pay out
              // per-item celebrations (XP floats claim XP that probe mode
              // deliberately never awards), and the 2.5s burst eats probe time.
              if (!disableAnimations && !isProbeMode) {
                setIsCelebrating(true);
                // Visual celebrations — scale with streak!
                wsSpawnConfetti(newStreak >= 5 ? 20 : newStreak >= 3 ? 15 : 8);
                if (newStreak >= 3) wsSpawnStars(newStreak >= 5 ? 7 : 4);
                wsSpawnXPFloat(newStreak >= 5 ? '🔥 +' + (5 + newStreak) + ' XP!' : newStreak >= 3 ? '⭐ +' + (5 + newStreak) + ' XP!' : '+5 XP', 50, 35);
                if (window._alloHaptic) window._alloHaptic(newStreak >= 5 ? 'achieve' : 'correct');
                setTimeout(() => {
                  if (isMountedRef.current) setIsCelebrating(false);
                }, 2500);
              }
              setShowWordText(true);
              if (setShowImageForCurrentWord) setShowImageForCurrentWord(true);
            }
            if (!isCorrect && effectiveCheckMode === "afterCompletion") {
              setShowImageForCurrentWord(true);
            }
            if (
              !isCorrect &&
              typeof alloBotRef !== "undefined" &&
              alloBotRef?.current?.playAnimation
            )
              alloBotRef.current.playAnimation("sympathetic-tilt", 800);
            setWordSoundsScore((prev) => ({
              correct: prev.correct + (isCorrect ? 1 : 0),
              total: prev.total + 1,
              streak: newStreak,
            }));
            // The score INCLUDING this answer. The closure's wordSoundsScore
            // predates the functional update above, so every read of it in the
            // delayed advance timeout (goal checks, onProbeComplete payloads)
            // silently dropped the final item.
            const postScore = {
              correct: wordSoundsScore.correct + (isCorrect ? 1 : 0),
              total: wordSoundsScore.total + 1,
            };
            const _advanceEpoch = advanceEpochRef.current;
            if (setWordSoundsStreak) setWordSoundsStreak(newStreak);
            // Letter hints are a practice scaffold — never auto-enable them
            // mid-probe (it changes what the probe measures; items would be
            // logged mode:"visual" while scored as a sound-only CBM).
            if (!isCorrect && !showLetterHints && !isProbeMode && newStreak === 0) {
              const recentHistory = (wordSoundsHistory || []).slice(-5);
              const recentAccuracy =
                recentHistory.length > 0
                  ? recentHistory.filter((h) => h.correct).length /
                  recentHistory.length
                  : 1;
              if (recentAccuracy < 0.4) {
                setShowLetterHints(true);
                setWordSoundsFeedback?.({
                  type: "info",
                  message:
                    ts("word_sounds.fb_text_scaffold") ||
                    "Let's add some text to help! 📝",
                });
                debugLog(
                  "📝 Letter hints re-enabled due to low accuracy:",
                  recentAccuracy,
                );
              }
            }
            if (!isProbeMode) {
              if (isCorrect) {
                const baseXP = attempts > 0 ? 5 : 10;
                const streakBonus =
                  attempts > 0 ? 0 : Math.min(newStreak * 2, 20);
                const effectiveDiff = getEffectiveDifficulty();
                const difficultyBonus =
                  effectiveDiff === "hard"
                    ? 10
                    : effectiveDiff === "medium"
                      ? 5
                      : 0;
                const totalXP = baseXP + streakBonus + difficultyBonus;
                onScoreUpdate?.(totalXP, `word_sounds_${wordSoundsActivity}`);
              }
            }
            // Missed words are tracked via updateMasteryStats → revisitQueue (deferred review).
            // Legacy immediate re-queue was removed to prevent infinite-loop word cycling.
            // The student gets max 2 attempts per presentation, then progresses.
            updateMasteryStats(
              wordSoundsActivity,
              isCorrect,
              currentWordSoundsWord,
            );
            const _historyEntry = {
              timestamp: Date.now(),
              activity: wordSoundsActivity,
              word: currentWordSoundsWord,
              correct: isCorrect,
              mode: showLetterHints ? "visual" : "sound_only",
              difficulty: getEffectiveDifficulty(),
              wordDifficulty: categorizeWordDifficulty(currentWordSoundsWord),
              phonemes: wordSoundsPhonemes?.phonemes || [],
              // Integrity flag: with the AAC symbol overlay on, picture-
              // supported responding changes what the item measures (access
              // vs. unassisted phonological work) — analytics must be able
              // to tell these apart rather than pooling them silently.
              ...(aacMode ? { aacAssisted: true } : {}),
              ...(opts && typeof opts.formationScore === "number"
                ? { formationScore: opts.formationScore }
                : {}),
            };
            setWordSoundsHistory((prev) => [...prev, _historyEntry]);
            // Feed the session-complete Word Recap / "Practice Missed Words" /
            // parent summary — this ref was initialized and read but NEVER
            // written, so all three features were permanently invisible.
            if (currentWordSoundsWord) {
              sessionWordResults.current.push({
                word: currentWordSoundsWord,
                correct: isCorrect,
                attempts: attempts + 1,
                activity: wordSoundsActivity,
              });
            }
            const currentLessonConfig = lessonPlanConfig;
            const hasLessonPlan =
              currentLessonConfig &&
              activitySequence &&
              activitySequence.length > 0;
            if (autoDirectorCooldown.current) {
              debugLog(
                "⏸️ Auto-director on cooldown, skipping progression check",
              );
            } else if (
              hasLessonPlan &&
              isCorrect &&
              // Never let the lesson-plan auto-director switch activities
              // mid-probe: startActivity resets the probe clock without
              // resetting the score, permanently killing the payload arming.
              !isProbeMode &&
              shouldAdvanceActivity(wordSoundsActivity, currentLessonConfig)
            ) {
              debugLog(
                "📋 Mastery achieved for:",
                wordSoundsActivity,
                masteryStats[wordSoundsActivity],
              );
              setMasteryStats((prev) => ({
                ...prev,
                [wordSoundsActivity]: {
                  ...prev[wordSoundsActivity],
                  completed: true,
                },
              }));
              const uniqueActivities = [...new Set(activitySequence)];
              const currentIdx = uniqueActivities.indexOf(wordSoundsActivity);
              if (currentIdx < uniqueActivities.length - 1) {
                const nextActivity = uniqueActivities[currentIdx + 1];
                setWordSoundsFeedback({
                  type: "success",
                  message: `✅ Activity complete! Moving to ${nextActivity.replace(/_/g, " ")}! 🎉`,
                });
                setWordSoundsScore((prev) => ({ ...prev, streak: 0 }));
                if (setWordSoundsStreak) setWordSoundsStreak(0);
                autoDirectorCooldown.current = true;
                setTimeout(() => {
                  if (!isMountedRef.current) return;
                  startActivity(nextActivity);
                  setTimeout(() => {
                    autoDirectorCooldown.current = false;
                  }, 15000);
                  if (!isMountedRef.current) return;
                }, 2500);
              } else {
                if (revisitQueue.length > 0) {
                  setWordSoundsFeedback({
                    type: "info",
                    message: `📝 Let's review ${revisitQueue.length} words you missed!`,
                  });
                  const firstRevisit = revisitQueue[0];
                  if (firstRevisit) {
                    setWordSoundsScore((prev) => ({ ...prev, streak: 0 }));
                    if (setWordSoundsStreak) setWordSoundsStreak(0);
                    autoDirectorCooldown.current = true;
                    setTimeout(() => {
                      if (!isMountedRef.current) return;
                      startActivity(firstRevisit.activityId, firstRevisit.word);
                      setRevisitQueue((prev) => prev.slice(1));
                      setTimeout(() => {
                        autoDirectorCooldown.current = false;
                      }, 15000);
                    }, 2500);
                  }
                } else {
                  setWordSoundsFeedback({
                    type: "success",
                    message: `🎊 Lesson Complete! All activities mastered! 🌟`,
                  });
                  setTimeout(() => {
                    if (isMountedRef.current) setShowSessionComplete(true);
                  }, 2500);
                }
              }
            } else if (
              !hasLessonPlan &&
              isCorrect &&
              wordSoundsActivity !== "orthography"
            ) {
              const actStats = masteryStats[wordSoundsActivity] || {
                attempted: 0,
              };
              const MIN_PRACTICE = 5;
              const queueRemaining =
                sessionQueueRef.current[wordSoundsActivity] || [];
              const allWordsCompleted =
                actStats.attempted > 0 && queueRemaining.length === 0;
              const readyToAdvance =
                (actStats.attempted >= MIN_PRACTICE && newStreak >= 3) ||
                allWordsCompleted;
              if (showLetterHints && newStreak >= 3) {
                setWordSoundsFeedback({
                  type: "success",
                  message:
                    ts("word_sounds.fb_no_text_mode") ||
                    "Awesome! Let's try WITHOUT text now! 🙈",
                });
                setTimeout(() => {
                  if (isMountedRef.current) setShowLetterHints(false);
                }, 2000);
              } else if (!showLetterHints && readyToAdvance) {
                const PHONO_ORDER = [
                  "counting",
                  "isolation",
                  "blending",
                  "segmentation",
                  "rhyming",
                  "word_families",
                  "sound_sort",
                ];
                const currentIdx = PHONO_ORDER.indexOf(wordSoundsActivity);
                if (currentIdx >= 0 && currentIdx < PHONO_ORDER.length - 1) {
                  const nextActivity = PHONO_ORDER[currentIdx + 1];
                  setWordSoundsFeedback({
                    type: "success",
                    message:
                      ts("word_sounds.fb_great_work_next") ||
                      `Great work! Let's try ${nextActivity}! 🎉`,
                  });
                  setWordSoundsScore((prev) => ({ ...prev, streak: 0 }));
                  if (setWordSoundsStreak) setWordSoundsStreak(0);
                  autoDirectorCooldown.current = true;
                  debugLog(
                    "🛑 Auto-director cooldown STARTED for:",
                    nextActivity,
                  );
                  setTimeout(() => {
                    if (!isMountedRef.current) return;
                    if (!isProbeMode) setWordSoundsActivity(nextActivity);
                    setTimeout(() => {
                      if (!isMountedRef.current) return;
                      autoDirectorCooldown.current = false;
                      debugLog("✅ Auto-director cooldown CLEARED");
                    }, 15000);
                  }, 2000);
                } else if (
                  includeOrthographic &&
                  wordSoundsScore.correct >= wordSoundsSessionGoal
                ) {
                  const ORTHO_ORDER = [
                    "orthography",
                    "mapping",
                    "spelling_bee",
                    "word_scramble",
                    "missing_letter",
                  ];
                  const orthoIdx = ORTHO_ORDER.indexOf(wordSoundsActivity);
                  if (orthoIdx >= 0 && orthoIdx < ORTHO_ORDER.length - 1) {
                    const nextOrtho = ORTHO_ORDER[orthoIdx + 1];
                    setWordSoundsFeedback({
                      type: "success",
                      message:
                        ts("word_sounds.fb_spelling_transition") ||
                        `Great spelling! Let's try ${nextOrtho.replace(/_/g, " ")}! 🏆`,
                    });
                    setWordSoundsScore((prev) => ({ ...prev, streak: 0 }));
                    if (setWordSoundsStreak) setWordSoundsStreak(0);
                    autoDirectorCooldown.current = true;
                    setTimeout(() => {
                      if (!isMountedRef.current) return;
                      if (!isProbeMode) setWordSoundsActivity(nextOrtho);
                      setTimeout(() => {
                        autoDirectorCooldown.current = false;
                      }, 15000);
                    }, 2000);
                  } else if (orthoIdx === -1) {
                    setWordSoundsFeedback({
                      type: "success",
                      message:
                        ts("word_sounds.fb_spelling_transition") ||
                        "You're a pro! Testing your spelling now! 👁️",
                    });
                    autoDirectorCooldown.current = true;
                    setTimeout(() => {
                      if (!isMountedRef.current) return;
                      if (!isProbeMode) setWordSoundsActivity("orthography");
                      setTimeout(() => {
                        autoDirectorCooldown.current = false;
                      }, 15000);
                    }, 2000);
                  }
                }
              }
            }
            if (wordSoundsPhonemes?.phonemes) {
              // Scope phoneme-mastery attribution to what was actually tested:
              // isolation assesses ONE phoneme (correctSound), and word-level
              // judgments (rhyming, syllables, picture-match) assess no
              // individual phoneme at all — attributing those to every phoneme
              // in the word systematically diluted the per-phoneme data
              // teachers see in "mastered phonemes" reporting.
              const _wordLevelActs = [
                "rhyming",
                "syllable_blending",
                "syllable_counting",
                "decoding",
                "word_families",
                "letter_tracing",
              ];
              if (wordSoundsActivity === "isolation") {
                const _isoSound =
                  isolationStateRef.current?.correctSound ||
                  isolationState?.correctSound;
                if (_isoSound) updatePhonemeMastery([_isoSound], isCorrect);
              } else if (!_wordLevelActs.includes(wordSoundsActivity)) {
                updatePhonemeMastery(wordSoundsPhonemes.phonemes, isCorrect);
              }
            }
            if (!isCorrect && answer && expectedAnswer) {
              // Only log genuine sound/word confusions. Several activities pass
              // control sentinels ("correct"/"incorrect"/"wrong"/"right") or raw
              // counts as the check args; without this guard confusionPatterns
              // fills with meaningless pairs like "correct->incorrect".
              const _cA = String(answer).toLowerCase().trim();
              const _cE = String(expectedAnswer).toLowerCase().trim();
              const _cSent = new Set(["correct", "incorrect", "wrong", "right"]);
              if (
                !_cSent.has(_cA) && !_cSent.has(_cE) &&
                !/^\d+\+?$/.test(_cA) && !/^\d+\+?$/.test(_cE)
              ) {
                trackConfusion(expectedAnswer, answer);
              }
            }
            updateDailyProgress(isCorrect);
            // Level-ups are practice gamification — never mid-probe.
            if (isCorrect && !isProbeMode && setWordSoundsSessionProgress) {
              setWordSoundsSessionProgress((prev) => {
                const newVal = prev + 1;
                if (newVal > 0 && newVal % 10 === 0) {
                  playSound("success");
                  setWordSoundsLevel && setWordSoundsLevel((l) => l + 1);
                  const nextLevel = newVal / 10 + 1;
                  const levelMessages = [
                    ts("word_sounds.level_up_trickier", { level: nextLevel }) || `🌟 LEVEL ${nextLevel}! Words are getting trickier! 🌟`,
                    ts("word_sounds.level_up_star", { level: nextLevel }) || `🚀 LEVEL ${nextLevel}! You're a phonics star! 🌟`,
                    ts("word_sounds.level_up_challenge", { level: nextLevel }) || `🏆 LEVEL ${nextLevel}! Challenge mode activated! 🌟`,
                  ];
                  setWordSoundsFeedback?.({
                    type: "success",
                    message:
                      levelMessages[
                      Math.floor(Math.random() * levelMessages.length)
                      ],
                  });
                  try {
                    if (
                      typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                      window.__ALLO_INSTRUCTION_AUDIO["fb_amazing"]
                    ) {
                      if (feedbackAudioRef.current) {
                        feedbackAudioRef.current.pause();
                        feedbackAudioRef.current = null;
                      }
                      const audio = new Audio(
                        window.__ALLO_INSTRUCTION_AUDIO["fb_amazing"],
                      );
                      feedbackAudioRef.current = audio;
                      audio.volume = 0.7;
                      audio.play().catch(() => { });
                    }
                  } catch (e) {
                    debugLog("Level-up audio error", e);
                  }
                  return 0;
                }
                return newVal;
              });
            }
            // Badges are practice rewards — probe items shouldn't earn them.
            if (!isProbeMode) {
              checkAndAwardBadges(wordSoundsActivity, isCorrect, newStreak);
            }
            const streakCelebration =
              newStreak === 5 || newStreak === 10 || newStreak === 25
                ? " " +
                  (ts("word_sounds.fb_streak_row", { n: newStreak }) ||
                    `🔥 ${newStreak} in a row!`)
                : "";
            if (isCorrect) {
              const feedbackAudioKey = (() => {
                if (newStreak === 5) return "fb_on_fire";
                if (newStreak === 10) return "fb_excellent";
                if (newStreak === 25) return "fb_wow";
                if (newStreak === 1) return "fb_you_got_it";
                if (Math.random() < 0.3) {
                  const pool = [
                    "fb_great_job",
                    "fb_nice",
                    "fb_keep_going",
                    "fb_way_to_go",
                    "fb_perfect",
                    "fb_correct",
                    "fb_you_got_it",
                    "fb_excellent",
                  ];
                  return pool[Math.floor(Math.random() * pool.length)];
                }
                return null;
              })();
              if (feedbackAudioKey) {
                try {
                  if (
                    typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                    window.__ALLO_INSTRUCTION_AUDIO[feedbackAudioKey]
                  ) {
                    if (feedbackAudioRef.current) {
                      feedbackAudioRef.current.pause();
                      feedbackAudioRef.current = null;
                    }
                    const audio = new Audio(
                      window.__ALLO_INSTRUCTION_AUDIO[feedbackAudioKey],
                    );
                    feedbackAudioRef.current = audio;
                    audio.volume = 0.6;
                    audio.play().catch((e) => debugLog("Audio play error", e));
                  }
                } catch (err) {
                  debugLog("Audio init error", err);
                }
              }
            }
            const _resultMsg = isCorrect
              ? (ts("word_sounds.feedback_correct") || "Correct! 🎉") +
                streakCelebration
              : ts("word_sounds.fb_nice_try") ||
                (_expIsSentinel || !safeExpected
                  ? "Nice try!"
                  : `Nice try! The answer was "${expectedAnswer}".`);
            setWordSoundsFeedback?.({
              isCorrect,
              streak: newStreak,
              message: _resultMsg,
            });
            // (announced by the wordSoundsFeedback mirror effect)
            if (
              !isCorrect &&
              expectedAnswer &&
              !_expIsSentinel &&
              wordSoundsActivity !== "decoding"
            ) {
              setTimeout(() => {
                if (isMountedRef.current) handleAudio(expectedAnswer);
              }, 600);
            }
            // Activity-agnostic spaced review: re-insert a missed word a few items
            // deeper into the LIVE session queue (Leitner-style) so it resurfaces
            // within this session even without a lesson plan, instead of only being
            // recorded for end-of-session review. NEVER in probe mode (that would
            // corrupt the timed CBM measure).
            if (!isCorrect && currentWordSoundsWord && !isProbeMode) {
              const _rActId = wordSoundsActivity || "segmentation";
              const _rQueue = sessionQueueRef.current[_rActId] || [];
              const _rLc = (currentWordSoundsWord || "").toLowerCase();
              const _alreadyQueued = _rQueue.some((w) =>
                (((w && (w.singleWord || w.fullTerm || w.word)) || w) || "").toString().toLowerCase() === _rLc,
              );
              if (!_alreadyQueued) {
                const _at = Math.min(3, _rQueue.length);
                const _rItem = { word: currentWordSoundsWord, singleWord: currentWordSoundsWord, fullTerm: currentWordSoundsWord, _revisit: true };
                sessionQueueRef.current[_rActId] = [..._rQueue.slice(0, _at), _rItem, ..._rQueue.slice(_at)];
              }
            }
            setTimeout(
              () => {
                submissionLockRef.current = false;
                // Bail if startActivity ran during the feedback window — this
                // closure belongs to the OLD activity and would clobber the
                // new one's word/state (and could double-fire onProbeComplete
                // after the modal closed).
                if (advanceEpochRef.current !== _advanceEpoch) return;
                if (!isMountedRef.current) return;
                // HOISTED, QUEUE-INDEPENDENT completion check. The queue-refill
                // effect re-runs after every answer (generateSessionQueue's
                // identity changes with history) and repopulates an empty queue
                // BEFORE this timeout fires, so the old goal check buried in
                // the queue-empty branch was unreachable in auto-difficulty
                // mode — probes ran past their goal forever ("Word 11 of 10")
                // and never banked an onProbeComplete payload.
                const _goalMet = isProbeMode
                  ? postScore.total >= wordSoundsSessionGoal
                  : postScore.correct >=
                    wordSoundsSessionGoal + (orthoSessionGoal || 0);
                if (_goalMet) {
                  debugLog("WordSounds: Session Goal Met! Complete.");
                  if (
                    isProbeMode &&
                    probeStartTimeRef.current &&
                    onProbeComplete
                  ) {
                    const elapsedMinutes = Math.max(
                      (Date.now() - probeStartTimeRef.current) / 60000,
                      0.01,
                    );
                    onProbeComplete({
                      itemsPerMin: Math.round(
                        postScore.correct / elapsedMinutes,
                      ),
                      correct: postScore.correct,
                      total: postScore.total,
                      elapsed: Math.round(elapsedMinutes * 60),
                      activity: wordSoundsActivity,
                      byDifficulty: computeProbeByBand(_historyEntry),
                    });
                  }
                  setShowSessionComplete(true);
                  return;
                }
                const actId = wordSoundsActivity || "segmentation";
                let queue = sessionQueueRef.current[actId] || [];
                const currentLower = (
                  currentWordSoundsWord || ""
                ).toLowerCase();
                while (queue.length > 0) {
                  const peekWord = queue[0];
                  const peekTarget = (
                    peekWord.singleWord ||
                    peekWord.fullTerm ||
                    peekWord.word ||
                    peekWord ||
                    ""
                  )
                    .toString()
                    .toLowerCase();
                  if (peekTarget === currentLower && queue.length > 1) {
                    queue = [...queue.slice(1), queue[0]];
                    debugLog("⏩ Skipped repeat word in queue:", peekTarget);
                  } else {
                    break;
                  }
                }
                sessionQueueRef.current[actId] = queue;
                if (queue.length > 0) {
                  const queueWord = queue[0];
                  sessionQueueRef.current[actId] = queue.slice(1);
                  setSessionWordLists((prev) => ({
                    ...prev,
                    [actId]: queue.slice(1),
                  }));
                  const queueTargetWord =
                    queueWord.singleWord ||
                    queueWord.fullTerm ||
                    queueWord.word ||
                    queueWord;
                  const bufferedWord =
                    preloadedWords.find(
                      (pw) =>
                        pw.word?.toLowerCase() ===
                        queueTargetWord.toLowerCase() ||
                        pw.targetWord?.toLowerCase() ===
                        queueTargetWord.toLowerCase() ||
                        pw.displayWord?.toLowerCase() ===
                        queueTargetWord.toLowerCase(),
                    ) || queueWord;
                  const targetWord =
                    bufferedWord.targetWord ||
                    bufferedWord.displayWord ||
                    bufferedWord.word ||
                    "";
                  // Queue items outside the preloaded set routinely carry
                  // phonemes:null — applying them verbatim gave segmentation
                  // 0 boxes and poisoned wordDataCache. Fall back like
                  // startActivity does.
                  const phonemeData =
                    bufferedWord.phonemes && bufferedWord.phonemes.length
                      ? bufferedWord
                      : generateFallbackData(targetWord) || bufferedWord;
                  const wordImage = bufferedWord.image;
                  setCurrentWordSoundsWord(targetWord);
                  setCurrentWordImage(wordImage);
                  setShowWordText(false);
                  setShowImageForCurrentWord(false);
                  applyWordDataToState(phonemeData);
                  if (wordSoundsActivity === "orthography") {
                    const bufferedTargetWord =
                      bufferedWord?.targetWord || bufferedWord?.word;
                    if (
                      bufferedTargetWord &&
                      bufferedTargetWord.toLowerCase() ===
                      targetWord.toLowerCase()
                    ) {
                      if (lastWordForOrthography.current === targetWord) {
                        debugLog(
                          "⏩ Orthography options already set for:",
                          targetWord,
                        );
                      } else {
                        const pool =
                          phonemeData?.orthographyDistractors?.length > 0
                            ? phonemeData.orthographyDistractors
                            : wordSoundsPhonemes?.orthographyDistractors?.length > 0
                              ? wordSoundsPhonemes.orthographyDistractors
                              : generateOrthographyDistractors(targetWord);
                        const distractors = fisherYatesShuffle(pool).slice(
                          0,
                          5,
                        );
                        const options = fisherYatesShuffle([
                          targetWord,
                          ...distractors,
                        ]);
                        setOrthographyOptions(options);
                        lastWordForOrthography.current = targetWord;
                      }
                    } else {
                      warnLog(
                        "⚠️ Orthography buffer mismatch, skipping:",
                        bufferedTargetWord,
                        "vs",
                        targetWord,
                      );
                    }
                  }
                  if (wordSoundsActivity === "rhyming") {
                    const bufferedTargetWord =
                      bufferedWord?.targetWord || bufferedWord?.word;
                    if (
                      bufferedTargetWord &&
                      bufferedTargetWord.toLowerCase() ===
                      targetWord.toLowerCase()
                    ) {
                      if (lastWordForRhyming.current === targetWord) {
                        debugLog(
                          "⏩ Rhyme options already set for:",
                          targetWord,
                        );
                      } else {
                        const correctRhyme = phonemeData?.rhymeWord;
                        const distractorPool =
                          phonemeData?.rhymeDistractors || [
                            "dog",
                            "cat",
                            "run",
                            "bed",
                            "sit",
                          ];
                        const distractors = fisherYatesShuffle(
                          distractorPool,
                        ).slice(0, 5);
                        const options = correctRhyme
                          ? fisherYatesShuffle([correctRhyme, ...distractors])
                          : distractors;
                        setRhymeOptions(options);
                        lastWordForRhyming.current = targetWord;
                      }
                    } else {
                      warnLog(
                        "⚠️ Rhyme buffer mismatch, skipping:",
                        bufferedTargetWord,
                        "vs",
                        targetWord,
                      );
                    }
                  }
                  if (
                    ["segmentation", "blending"].includes(wordSoundsActivity) &&
                    phonemeData?.phonemes
                  ) {
                    if (lastWordForBlending.current !== targetWord) {
                      setSoundChips(generateSoundChips(phonemeData.phonemes));
                      setElkoninBoxes(
                        new Array(
                          phonemeData.phonemeCount ||
                          phonemeData.phonemes.length,
                        ).fill(null),
                      );
                      lastWordForBlending.current = targetWord;
                      if (
                        wordSoundsActivity === "blending" &&
                        phonemeData?.blendingDistractors
                      ) {
                        let distractors =
                          phonemeData.blendingDistractors.slice(0, 5);
                        if (distractors.length < 5) {
                          const pool = ["dog","cat","sun","bed","map","pig","run","hop","net","cup","hat","log","mop","pen","rug","van","zip","fox","jet","web"];
                          const used = new Set([targetWord.toLowerCase(), ...distractors.map(d => d.toLowerCase())]);
                          for (const w of [...pool].sort(() => Math.random() - 0.5)) {
                            if (distractors.length >= 5) break;
                            if (!used.has(w)) { distractors.push(w); used.add(w); }
                          }
                        }
                        const options = fisherYatesShuffle([
                          targetWord,
                          ...distractors,
                        ]);
                        setBlendingOptions(options);
                        debugLog(
                          "📋 Set blending options from preloaded:",
                          options,
                        );
                      }
                    } else {
                      debugLog(
                        "⏩ Blending/segmentation state already set for:",
                        targetWord,
                      );
                    }
                  }
                  if (wordSoundsActivity === "isolation") {
                    if (bufferedWord.isolationOptions) {
                      lastWordForIsolation.current = targetWord;
                      isolationPositionRef.current =
                        bufferedWord.isolationOptions.currentPosition;
                      // Re-shuffle on each reuse — without this, the same
                      // word re-presented in a session always shows the
                      // options in the same saved order (correct answer
                      // ends up "parked" in the same spot), which the
                      // student eventually pattern-matches on. Dedup first
                      // as a belt-and-suspenders safeguard against any
                      // lingering dupes from legacy saved sessions.
                      const _reuseOpts = Array.from(
                        new Set(
                          (bufferedWord.isolationOptions.isoOptions || []).map(
                            (x) => (typeof x === "string" ? x : String(x)),
                          ),
                        ),
                      );
                      setIsolationState({
                        ...bufferedWord.isolationOptions,
                        isoOptions: fisherYatesShuffle(_reuseOpts),
                      });
                    } else if (lastWordForIsolation.current !== targetWord) {
                      debugLog(
                        "🔧 Generating isolation state for:",
                        targetWord,
                      );
                      const phonemes =
                        phonemeData?.phonemes ||
                        estimatePhonemesBasic(targetWord);
                      const phonemeLen = phonemes.length || 2;
                      const position = Math.floor(Math.random() * phonemeLen);
                      const correctIdx = position;
                      const correctPhoneme =
                        phonemes[correctIdx] ||
                        phonemes[0] ||
                        targetWord.charAt(0);
                      // Phoneme-key dedup — guarantees no two options share a
                      // sound (e.g., c/k, oi/oy, ai/ay) even if the source
                      // phoneme list contains equivalent spellings.
                      const _correctKey = phonemeKey(correctPhoneme);
                      const _distUsed = new Set([_correctKey]);
                      const distractors = [];
                      for (const p of phonemes) {
                        if (distractors.length >= 5) break;
                        const k = phonemeKey(p);
                        if (!k || _distUsed.has(k)) continue;
                        distractors.push(p);
                        _distUsed.add(k);
                      }
                      const _fillPool = [
                        "b","d","f","g","k","l","m","n","p","r","s","t",
                      ];
                      const _fillShuffled = [..._fillPool].sort(
                        () => Math.random() - 0.5,
                      );
                      for (const _f of _fillShuffled) {
                        if (distractors.length >= 5) break;
                        const k = phonemeKey(_f);
                        if (!_distUsed.has(k)) {
                          distractors.push(_f);
                          _distUsed.add(k);
                        }
                      }
                      const isoUniqueSet = new Set(_distUsed);
                      const ioFiller = [
                        "b",
                        "d",
                        "f",
                        "g",
                        "h",
                        "j",
                        "k",
                        "l",
                        "m",
                        "n",
                        "p",
                        "r",
                        "s",
                        "t",
                        "v",
                        "w",
                        "z",
                        "a",
                        "e",
                        "i",
                        "o",
                        "u",
                      ];
                      const ioFilled = [
                        correctPhoneme,
                        ...distractors.slice(0, 5),
                      ];
                      for (const p of ioFiller) {
                        if (ioFilled.length >= 6) break;
                        const k = phonemeKey(p);
                        if (!isoUniqueSet.has(k)) {
                          ioFilled.push(p);
                          isoUniqueSet.add(k);
                        }
                      }
                      const isoOptions = fisherYatesShuffle(
                        ioFilled.slice(0, 6),
                      );
                      const generatedState = {
                        correctAnswer: correctPhoneme,
                        correctSound: correctPhoneme,
                        currentPosition: position,
                        isoOptions: isoOptions,
                        prompt:
                          position === 0
                            ? "beginning"
                            : position === phonemeLen - 1
                              ? "ending"
                              : "middle",
                      };
                      isolationPositionRef.current = position;
                      lastWordForIsolation.current = targetWord;
                      setIsolationState(generatedState);
                    }
                  }
                  setIsLoadingPhonemes(false);
                  setCurrentWordIndex((prev) => prev + 1);
                  setNextWordBuffer(null);
                  setWordSoundsFeedback?.(null);
                  setUserAnswer("");
                  setTimeout(() => prefetchNextWords(), 100);
                } else {
                  const fallbackActId = wordSoundsActivity || "segmentation";
                  const fallbackQueue = sessionQueueRef.current[fallbackActId];
                  let word = null;
                  if (fallbackQueue && fallbackQueue.length > 0) {
                    word = fallbackQueue[0];
                    sessionQueueRef.current[fallbackActId] =
                      fallbackQueue.slice(1);
                    setSessionWordLists((prev) => ({
                      ...prev,
                      [fallbackActId]: fallbackQueue.slice(1),
                    }));
                  }
                  if (!word && wordPool && wordPool.length > 0) {
                    debugLog(
                      "WordSounds: Queue empty during progression. Regenerating with 'medium' fallback...",
                    );
                    generateSessionQueue(wordSoundsActivity, "medium");
                    const regenQueue = sessionQueueRef.current[fallbackActId];
                    if (regenQueue && regenQueue.length > 0) {
                      const fCurrentLower = (
                        currentWordSoundsWord || ""
                      ).toLowerCase();
                      let fIdx = regenQueue.findIndex((w) => {
                        const wt = (
                          w.singleWord ||
                          w.fullTerm ||
                          w.word ||
                          w ||
                          ""
                        )
                          .toString()
                          .toLowerCase();
                        return wt !== fCurrentLower;
                      });
                      if (fIdx < 0) fIdx = 0; // fallback to first if all match
                      word = regenQueue[fIdx];
                      sessionQueueRef.current[fallbackActId] =
                        regenQueue.slice(1);
                      setSessionWordLists((prev) => ({
                        ...prev,
                        [fallbackActId]: regenQueue.slice(1),
                      }));
                    }
                  }
                  if (word) {
                    const targetWord =
                      word.singleWord ||
                      word.fullTerm ||
                      word.term ||
                      word.word ||
                      word;
                    setCurrentWordSoundsWord(targetWord);
                    const preloadedMatch = preloadedWords.find(
                      (pw) =>
                        pw.word?.toLowerCase() === targetWord.toLowerCase() ||
                        pw.targetWord?.toLowerCase() ===
                        targetWord.toLowerCase() ||
                        pw.displayWord?.toLowerCase() ===
                        targetWord.toLowerCase(),
                    );
                    const correctImage = preloadedMatch?.image || word.image;
                    debugLog(
                      "🖼️ Image sync check:",
                      targetWord,
                      "preloaded:",
                      !!preloadedMatch,
                      "image:",
                      !!correctImage,
                    );
                    setCurrentWordImage(correctImage);
                    setShowWordText(false);
                    if (preloadedMatch && preloadedMatch.phonemes) {
                      debugLog("🚀 Using preloaded phonemes for:", targetWord);
                      setWordSoundsPhonemes(preloadedMatch);
                      setIsLoadingPhonemes(false);
                      if (
                        wordSoundsActivity === "blending" &&
                        preloadedMatch.blendingDistractors
                      ) {
                        let distractors =
                          preloadedMatch.blendingDistractors.slice(0, 5);
                        if (distractors.length < 5) {
                          const pool = ["dog","cat","sun","bed","map","pig","run","hop","net","cup","hat","log","mop","pen","rug","van","zip","fox","jet","web"];
                          const used = new Set([targetWord.toLowerCase(), ...distractors.map(d => d.toLowerCase())]);
                          for (const w of [...pool].sort(() => Math.random() - 0.5)) {
                            if (distractors.length >= 5) break;
                            if (!used.has(w)) { distractors.push(w); used.add(w); }
                          }
                        }
                        const options = fisherYatesShuffle([
                          targetWord,
                          ...distractors,
                        ]);
                        setBlendingOptions(options);
                        lastWordForBlending.current = targetWord;
                        debugLog(
                          "📋 [Fallback] Set blending options:",
                          options,
                        );
                      }
                      if (
                        wordSoundsActivity === "rhyming" &&
                        preloadedMatch.rhymeDistractors
                      ) {
                        const correctRhyme = preloadedMatch.rhymeWord;
                        const distractors =
                          preloadedMatch.rhymeDistractors.slice(0, 5);
                        const options = correctRhyme
                          ? fisherYatesShuffle([correctRhyme, ...distractors])
                          : distractors;
                        setRhymeOptions(options);
                        lastWordForRhyming.current = targetWord;
                        debugLog("📋 [Fallback] Set rhyme options:", options);
                      }
                    } else {
                      debugLog(
                        "📦 Using local fallback for:",
                        targetWord,
                        "(no preloaded match)",
                      );
                      const fallback = generateFallbackData(targetWord);
                      if (fallback) {
                        applyWordDataToState(fallback);
                        wordDataCache.current.set(
                          targetWord.toLowerCase(),
                          fallback,
                        );
                      }
                      setIsLoadingPhonemes(false);
                    }
                    if (
                      wordSoundsActivity === "isolation" &&
                      lastWordForIsolation.current !== targetWord
                    ) {
                      debugLog(
                        "🔧 [Fallback] Generating isolation state for:",
                        targetWord,
                      );
                      const iso_phonemes =
                        preloadedMatch?.phonemes ||
                        estimatePhonemesBasic(targetWord);
                      const iso_phonemeLen = iso_phonemes.length || 2;
                      const iso_position = Math.floor(
                        Math.random() * iso_phonemeLen,
                      );
                      const iso_correctIdx = iso_position;
                      const iso_correct =
                        iso_phonemes[iso_correctIdx] ||
                        iso_phonemes[0] ||
                        targetWord.charAt(0);
                      // Phoneme-key dedup — no two options may share a sound
                      // (e.g., c/k, oi/oy, ai/ay). Mirrors the matching block
                      // above for the other bufferedWord path.
                      const _isoCorrectKey = phonemeKey(iso_correct);
                      const _isoDistUsed = new Set([_isoCorrectKey]);
                      const iso_dist = [];
                      for (const p of iso_phonemes) {
                        if (iso_dist.length >= 5) break;
                        const k = phonemeKey(p);
                        if (!k || _isoDistUsed.has(k)) continue;
                        iso_dist.push(p);
                        _isoDistUsed.add(k);
                      }
                      const _isoFillPool = [
                        "b","d","f","g","k","l","m","n","p","r","s","t",
                      ];
                      const _isoFillShuffled = [..._isoFillPool].sort(
                        () => Math.random() - 0.5,
                      );
                      for (const _f of _isoFillShuffled) {
                        if (iso_dist.length >= 5) break;
                        const k = phonemeKey(_f);
                        if (!_isoDistUsed.has(k)) {
                          iso_dist.push(_f);
                          _isoDistUsed.add(k);
                        }
                      }
                      const iso_unique = new Set(_isoDistUsed);
                      const iso_filler = [
                        "b",
                        "d",
                        "f",
                        "g",
                        "h",
                        "j",
                        "k",
                        "l",
                        "m",
                        "n",
                        "p",
                        "r",
                        "s",
                        "t",
                        "v",
                        "w",
                        "z",
                        "a",
                        "e",
                        "i",
                        "o",
                        "u",
                      ];
                      const iso_filled = [iso_correct, ...iso_dist.slice(0, 5)];
                      for (const p of iso_filler) {
                        if (iso_filled.length >= 6) break;
                        const k = phonemeKey(p);
                        if (!iso_unique.has(k)) {
                          iso_filled.push(p);
                          iso_unique.add(k);
                        }
                      }
                      const iso_opts = fisherYatesShuffle(
                        iso_filled.slice(0, 6),
                      );
                      isolationPositionRef.current = iso_position;
                      lastWordForIsolation.current = targetWord;
                      setIsolationState({
                        word: targetWord,
                        correctAnswer: iso_correct,
                        correctSound: iso_correct,
                        currentPosition: iso_position,
                        isoOptions: iso_opts,
                        prompt:
                          iso_position === 0
                            ? "beginning"
                            : iso_position === iso_phonemeLen - 1
                              ? "ending"
                              : "middle",
                      });
                    }
                    setIsLoadingPhonemes(false);
                    setWordSoundsFeedback?.(null);
                    setUserAnswer("");
                  } else {
                    // Goal-met completion is handled by the hoisted check at
                    // the top of this timeout (queue-independent, postScore).
                    if (isProbeMode) {
                      debugLog("📊 Probe: Queue depleted. Ending probe.");
                      if (probeStartTimeRef.current && onProbeComplete) {
                        const elapsedMinutes = Math.max(
                          (Date.now() - probeStartTimeRef.current) / 60000,
                          0.01,
                        );
                        const itemsPerMin = Math.round(
                          postScore.correct / elapsedMinutes,
                        );
                        onProbeComplete({
                          itemsPerMin,
                          correct: postScore.correct,
                          total: postScore.total,
                          elapsed: Math.round(elapsedMinutes * 60),
                          activity: wordSoundsActivity,
                          byDifficulty: computeProbeByBand(_historyEntry),
                        });
                      }
                      setShowSessionComplete(true);
                    } else {
                      debugLog(
                        "⚠️ Queue empty but goal not met. Forcing refill...",
                      );
                      generateSessionQueue(wordSoundsActivity, "medium");
                      const retryActId = wordSoundsActivity || "segmentation";
                      const retryQueue = sessionQueueRef.current[retryActId];
                      const retryWord =
                        retryQueue && retryQueue.length > 0
                          ? retryQueue.shift()
                          : null;
                      if (retryWord)
                        sessionQueueRef.current[retryActId] = retryQueue;
                      if (retryWord) {
                        const target =
                          retryWord.singleWord || retryWord.word || retryWord;
                        debugLog(
                          "♻️ Refill successful, continuing with:",
                          target,
                        );
                        setCurrentWordSoundsWord(target);
                        // Parity with the normal advance branch — without
                        // these, the previous item's feedback banner/typed
                        // answer (and segmentation's filled boxes for a
                        // same-phoneme-count word) carried into the refill.
                        setWordSoundsFeedback?.(null);
                        setUserAnswer("");
                        setElkoninBoxes([]);
                        setSegmentationErrors([]);
                        const refillPreloaded = preloadedWords.find(
                          (pw) =>
                            pw.word?.toLowerCase() === target.toLowerCase() ||
                            pw.targetWord?.toLowerCase() ===
                            target.toLowerCase(),
                        );
                        if (refillPreloaded && refillPreloaded.phonemes) {
                          setWordSoundsPhonemes(refillPreloaded);
                        } else {
                          const fallback = generateFallbackData(target);
                          if (fallback) applyWordDataToState(fallback);
                        }
                        setIsLoadingPhonemes(false);
                      } else {
                        warnLog("❌ Refill failed (no words). Ending session.");
                        setShowSessionComplete(true);
                      }
                    }
                  }
                }
              },
              isProbeMode ? (isCorrect ? 800 : 1200) : isCorrect ? 2000 : 3000,
            );
          } catch (e) {
            warnLog("CheckAnswer CRITICAL FAIL", e);
            submissionLockRef.current = false;
            console.error("CheckAnswer error details:", e?.message, e?.stack);
            if (
              e?.message?.includes("Cannot read properties of null") ||
              e?.message?.includes("undefined")
            ) {
              debugLog(
                "⚠️ checkAnswer: Swallowed null-reference error:",
                e.message,
              );
            } else {
              addToast("Error checking answer - please try again", "error");
            }
          }
        },
        [
          wordSoundsScore,
          wordSoundsActivity,
          currentWordSoundsWord,
          wordSoundsPhonemes,
          onScoreUpdate,
          setWordSoundsScore,
          setWordSoundsHistory,
          setWordSoundsFeedback,
          getAdaptiveRandomWord,
          setCurrentWordSoundsWord,
          fetchWordData,
          ts,
          getEffectiveDifficulty,
          updatePhonemeMastery,
          trackConfusion,
          updateDailyProgress,
          checkAndAwardBadges,
          setWordSoundsStreak,
          nextWordBuffer,
          preloadedWords,
          prefetchNextWords,
          generateSoundChips,
          // attempts was MISSING here: the retry gate (`attempts < 1`) ran on
          // a permanently-stale attempts=0 closure, so practice mode gave
          // infinite free retries, never recorded a wrong answer, and awarded
          // full first-try XP/streak on the eventual correct answer.
          attempts,
          isProbeMode,
          showLetterHints,
          aacMode,
          wordSoundsHistory,
        ],
      );
      React.useEffect(() => {
        // Guard: onresult handler already calls checkAnswer, so this
        // effect only fires for non-mic userAnswer changes (typing).
        if (useMicInput && !isListening && userAnswer) {
          debugLog("🎤 Mic input received (useEffect) — skipping, handled by onresult");
        }
      }, [
        useMicInput,
        isListening,
        userAnswer,
        wordSoundsActivity,
        currentWordSoundsWord,
        wordSoundsPhonemes,
        checkAnswer,
      ]);
      const handleMicInput = React.useCallback(() => {
        if (
          !("webkitSpeechRecognition" in window) &&
          !("SpeechRecognition" in window)
        ) {
          addToast("Microphone not supported in this browser", "error");
          return;
        }
        if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
          return;
        }
        // Phase 3v.M — phoneme dictation scoring stays identical; only
        // the SpeechRecognition construction is shared. The transcript
        // → expected comparison + checkAnswer() flow is preserved.
        const handleTranscript = (transcript) => {
          debugLog("Mic Transcript:", transcript);
          setUserAnswer(transcript);
          let expected = currentWordSoundsWord;
          if (wordSoundsActivity === "rhyming")
            expected = wordSoundsPhonemes?.rhymeWord;
          const cleanTranscript = transcript
            .toLowerCase()
            .trim()
            .replace(/[.,!?]/g, "");
          const cleanTarget = expected
            ?.toLowerCase()
            .trim()
            .replace(/[.,!?]/g, "");
          // The recognizer picks a spelling arbitrarily for homophones
          // ("one"/"won", "blue"/"blew") — a child who SAID the right word
          // must not be marked wrong for the recognizer's spelling choice.
          const _homophoneOk =
            typeof isHomophone === "function" &&
            cleanTranscript &&
            cleanTarget &&
            isHomophone(cleanTranscript, cleanTarget);
          if (cleanTranscript === cleanTarget || _homophoneOk) {
            checkAnswer("correct", "correct");
          } else {
            checkAnswer(transcript, expected);
          }
        };
        const handleError = (e) => {
          warnLog("Mic Error", e);
          setIsListening(false);
          if (e && e.error !== "no-speech") {
            addToast(ts("common.mic_error") || "Microphone error", "error");
          }
        };
        const handleEnd = () => setIsListening(false);
        if (window.AlloFlowVoice && typeof window.AlloFlowVoice.initWebSpeechCapture === 'function') {
          const ctrl = window.AlloFlowVoice.initWebSpeechCapture({
            lang: wordSoundsLanguage || 'en-US',
            continuous: false,
            interimResults: false,
            onTranscript: (text) => handleTranscript(text),
            onError: handleError,
            onEnd: handleEnd
          });
          if (!ctrl.supported) {
            handleError({ error: 'not-supported' });
            return;
          }
          if (ctrl.start()) {
            recognitionRef.current = ctrl;
            setIsListening(true);
            playSound("pop");
          }
          return;
        }
        // Inline fallback (pre-3v.M behavior)
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = wordSoundsLanguage || "en-US";
        recognition.onstart = () => {
          setIsListening(true);
          playSound("pop");
        };
        recognition.onend = handleEnd;
        recognition.onerror = handleError;
        recognition.onresult = (event) => {
          handleTranscript(event.results[0][0].transcript);
        };
        recognition.start();
      }, [
        wordSoundsLanguage,
        isListening,
        currentWordSoundsWord,
        wordSoundsActivity,
        wordSoundsPhonemes,
        checkAnswer,
        addToast,
        playSound,
        ts,
      ]);
      const handleChipClick = React.useCallback(
        (chip, source, index) => {
          setSegmentationErrors([]);
          if (source === "pool") {
            const firstEmptyIndex = elkoninBoxes.findIndex(
              (box) => box === null,
            );
            if (firstEmptyIndex !== -1) {
              const newBoxes = [...elkoninBoxes];
              newBoxes[firstEmptyIndex] = chip;
              setElkoninBoxes(newBoxes);
              setSoundChips((prev) =>
                prev.map((c) => (c.id === chip.id ? { ...c, used: true } : c)),
              );
              playSound("pop");
              handleAudio(chip.phoneme);
            }
          } else if (source === "box") {
            const newBoxes = [...elkoninBoxes];
            newBoxes[index] = null;
            setElkoninBoxes(newBoxes);
            setSoundChips((prev) =>
              prev.map((c) => (c.id === chip.id ? { ...c, used: false } : c)),
            );
            playSound("woosh");
          }
        },
        [elkoninBoxes, soundChips, playSound],
      );
      const handleSegDrop = React.useCallback(
        (e, targetSource, targetIndex = null) => {
          e.preventDefault();
          if (!draggedItem) return;
          const { item, source, index: sourceIndex } = draggedItem;
          let newBoxes = [...elkoninBoxes];
          let newChips = [...soundChips];
          if (source === "pool" && targetSource === "box") {
            const existingChip = newBoxes[targetIndex];
            if (existingChip) {
              newChips = newChips.map((c) =>
                c.id === existingChip.id ? { ...c, used: false } : c,
              );
            }
            newBoxes[targetIndex] = item;
            newChips = newChips.map((c) =>
              c.id === item.id ? { ...c, used: true } : c,
            );
            playSound("pop");
            handleAudio(item.phoneme);
          } else if (source === "box" && targetSource === "pool") {
            newBoxes[sourceIndex] = null;
            newChips = newChips.map((c) =>
              c.id === item.id ? { ...c, used: false } : c,
            );
            playSound("woosh");
          } else if (source === "box" && targetSource === "box") {
            if (sourceIndex === targetIndex) return;
            const targetContent = newBoxes[targetIndex];
            newBoxes[targetIndex] = item;
            newBoxes[sourceIndex] = targetContent;
            playSound("pop");
          }
          setElkoninBoxes(newBoxes);
          setSoundChips(newChips);
          setDraggedItem(null);
          setSegmentationErrors([]);
        },
        [draggedItem, elkoninBoxes, soundChips, handleAudio],
      );
      const handleMoveKey = React.useCallback(
        (item, source, index) => {
          if (source === "pool") {
            const firstEmpty = elkoninBoxes.findIndex((b) => b === null);
            if (firstEmpty !== -1) {
              let newBoxes = [...elkoninBoxes];
              let newChips = [...soundChips];
              newBoxes[firstEmpty] = item;
              newChips = newChips.map((c) =>
                c.id === item.id ? { ...c, used: true } : c,
              );
              playSound("pop");
              handleAudio(item.phoneme);
              setElkoninBoxes(newBoxes);
              setSoundChips(newChips);
            }
          } else if (source === "box") {
            let newBoxes = [...elkoninBoxes];
            let newChips = [...soundChips];
            newBoxes[index] = null;
            newChips = newChips.map((c) =>
              c.id === item.id ? { ...c, used: false } : c,
            );
            playSound("woosh");
            setElkoninBoxes(newBoxes);
            setSoundChips(newChips);
          }
        },
        [elkoninBoxes, soundChips, handleAudio],
      );
      // Keyboard activation for draggable sound chips: Enter/Space performs the
      // same move as drag-and-drop, so the Elkonin segmentation activity is
      // operable without a pointer (WCAG 2.1.1). Mirrors the handleMoveKey API.
      const handleKeyDown = (e, item, action) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          if (typeof action === "function") action();
        }
      };
      // Any teacher edit supersedes the compiled pack board for the word's
      // activity: strip it from the live phoneme object AND the pack item so
      // a prepared-board effect can't reinstall the pre-edit options (now or
      // on a later relaunch of the same resource).
      const invalidatePreparedBoard = (activityId) => {
        if (!activityId) return;
        const wordKey = String(currentWordSoundsWord || "").trim().toLowerCase();
        setWordSoundsPhonemes((prev) => {
          if (!prev || !prev.activityItems || !prev.activityItems[activityId]) return prev;
          const nextItems = { ...prev.activityItems };
          delete nextItems[activityId];
          return { ...prev, activityItems: nextItems };
        });
        if (typeof setPreloadedWords === "function" && wordKey) {
          setPreloadedWords((prevWords) => (Array.isArray(prevWords) ? prevWords : []).map((it) => {
            const itWord = String(it?.targetWord || it?.word || it?.term || "").trim().toLowerCase();
            if (itWord !== wordKey || !it?.activityItems || !it.activityItems[activityId]) return it;
            const nextItems = { ...it.activityItems };
            delete nextItems[activityId];
            return { ...it, activityItems: nextItems, _packEdited: true };
          }));
        }
      };
      const handleOptionUpdate = (index, newValue, type, ctx) => {
        // Teacher edits write React state only — drop the cached entry so a
        // later cache hit / advance re-apply can't silently revert the edit
        // (the regenerate handler already does this; edits didn't).
        if (currentWordSoundsWord && wordDataCache.current) {
          wordDataCache.current.delete(currentWordSoundsWord.toLowerCase());
        }
        invalidatePreparedBoard((ctx && ctx.activity) || wordSoundsActivity);
        // Sound Sort / Word Families: write the fields the game ACTUALLY
        // reads (soundSortMatches / rimeFamilyMembers) with a teacherEdited
        // flag the compute paths honor verbatim. The old branch wrote
        // familyMembers/rhymeDistractors, which nothing renders — every edit
        // was silently dropped. `ctx` carries the currently displayed board
        // from the call site so indexed edits refer to what the teacher sees.
        if (
          ctx &&
          (ctx.activity === "sound_sort" || ctx.activity === "word_families")
        ) {
          const words = [...(ctx.options || [])];
          const distractors = [...(ctx.distractors || [])];
          if (type === "member") words[index] = newValue;
          else if (type === "distractor") distractors[index] = newValue;
          else if (type === "add_member") words.push("");
          else if (type === "add_distractor") distractors.push("");
          else if (type === "remove_member") words.splice(index, 1);
          else if (type === "remove_distractor") distractors.splice(index, 1);
          else return;
          if (ctx.activity === "sound_sort") {
            setWordSoundsPhonemes((prev) => ({
              ...(prev || {}),
              soundSortMatches: {
                position: ctx.mode,
                phoneme: ctx.target,
                words,
                distractors,
                teacherEdited: true,
              },
            }));
            soundSortPreloadRef.current = null;
          } else {
            setWordSoundsPhonemes((prev) => ({
              ...(prev || {}),
              rimeFamilyMembers: {
                rime: ctx.rime,
                words,
                distractors,
                teacherEdited: true,
              },
            }));
            wordFamilyRimeRef.current = null;
          }
          return;
        }
        if (type === "set_correct") {
          if (wordSoundsActivity === "rhyming") {
            setWordSoundsPhonemes((prev) => ({ ...prev, rhymeWord: newValue }));
            debugLog("✏️ Teacher set correct rhyme answer to:", newValue);
            addToast?.(`✅ Correct answer set to "${newValue}"`, "success");
          } else if (wordSoundsActivity === "manipulation") {
            setManipulationState((prev) => ({ ...prev, answer: newValue }));
            debugLog("✏️ Teacher set correct manipulation answer to:", newValue);
            addToast?.(`✅ Correct answer set to "${newValue}"`, "success");
          } else if (wordSoundsActivity === "isolation") {
            setIsolationState((prev) => ({
              ...prev,
              correctSound: newValue,
              correctAnswer: newValue,
            }));
            debugLog("✏️ Teacher set correct isolation answer to:", newValue);
            addToast?.(`✅ Correct answer set to "${newValue}"`, "success");
          } else if (wordSoundsActivity === "blending") {
            setCurrentWordSoundsWord(newValue);
            debugLog("✏️ Teacher set correct blending answer to:", newValue);
            addToast?.(`✅ Correct answer set to "${newValue}"`, "success");
          }
          return;
        }
        if (wordSoundsActivity === "orthography") {
          const newOptions = [...orthographyOptions];
          newOptions[index] = newValue;
          setOrthographyOptions(newOptions);
        } else if (wordSoundsActivity === "rhyming") {
          const newOptions = [...rhymeOptions];
          newOptions[index] = newValue;
          setRhymeOptions(newOptions);
        } else if (wordSoundsActivity === "manipulation") {
          const newOptions = [...manipulationOptions];
          newOptions[index] = newValue;
          setManipulationOptions(newOptions);
        } else if (wordSoundsActivity === "syllable_blending") {
          const newOpts = [...(syllableData?.blendingOptions || [])];
          newOpts[index] = newValue;
          setSyllableData((prev) => ({ ...prev, blendingOptions: newOpts }));
        } else if (wordSoundsActivity === "sound_sort") {
          const newPhonemes = { ...wordSoundsPhonemes };
          const family =
            newPhonemes.wordFamily ||
            (currentWordSoundsWord?.length > 2
              ? currentWordSoundsWord.slice(1)
              : "at");
          if (!newPhonemes.familyMembers) {
            newPhonemes.familyMembers = [
              currentWordSoundsWord,
              `b${family}`,
              `c${family}`,
              `m${family}`,
            ];
          }
          if (!newPhonemes.rhymeDistractors) {
            newPhonemes.rhymeDistractors = ["dog", "bed", "sit"];
          }
          if (type === "member") {
            while (newPhonemes.familyMembers.length <= index)
              newPhonemes.familyMembers.push("");
            newPhonemes.familyMembers[index] = newValue;
          } else if (type === "distractor") {
            while (newPhonemes.rhymeDistractors.length <= index)
              newPhonemes.rhymeDistractors.push("");
            newPhonemes.rhymeDistractors[index] = newValue;
          } else {
            if (!newPhonemes.familyMembers) newPhonemes.familyMembers = [];
            newPhonemes.familyMembers[index] = newValue;
          }
          setWordSoundsPhonemes(newPhonemes);
        } else if (wordSoundsActivity === "isolation") {
          const newOptions = [...(isolationState?.isoOptions || [])];
          newOptions[index] = newValue;
          setIsolationState((prev) => ({ ...prev, isoOptions: newOptions }));
        } else if (wordSoundsActivity === "mapping") {
          const newGraphemes = [...(wordSoundsPhonemes?.graphemes || [])];
          newGraphemes[index] = newValue;
          setWordSoundsPhonemes((prev) => ({
            ...prev,
            graphemes: newGraphemes,
          }));
        } else if (
          wordSoundsActivity === "segmentation" ||
          wordSoundsActivity === "blending"
        ) {
          const newPhonemes = [...(wordSoundsPhonemes?.phonemes || [])];
          newPhonemes[index] = newValue;
          const updated = { ...wordSoundsPhonemes, phonemes: newPhonemes };
          setWordSoundsPhonemes(updated);
          setSoundChips((prev) => {
            const newChips = [...prev];
            if (newChips[index]) {
              newChips[index] = { ...newChips[index], phoneme: newValue };
            }
            return newChips;
          });
        }
      };
      const LetterTraceView = React.memo(({ letter, word, onComplete }) => {
        const canvasRef = React.useRef(null);
        const maskRef = React.useRef(null);
        const localMountedRef = React.useRef(true);
        const strokesRef = React.useRef([]); // captured user stroke point arrays
        const [isDrawing, setIsDrawing] = React.useState(false);
        const [feedback, setFeedback] = React.useState(null);
        const [resetKey, setResetKey] = React.useState(0);
        const [startDotPos, setStartDotPos] = React.useState(null);
        const [handAnimPos, setHandAnimPos] = React.useState(null);
        const [isAnimating, setIsAnimating] = React.useState(true);
        const audioCtxRef = React.useRef(null);
        const noiseNodeRef = React.useRef(null);
        const LETTER_SVG_PATHS = {
          a: "M 200 100 Q 230 180 200 260 Q 160 280 120 230 Q 100 180 140 140 Q 180 120 220 160 L 220 260",
          b: "M 120 80 L 120 260 M 120 180 Q 120 120 180 120 Q 240 120 240 190 Q 240 260 180 260 Q 120 260 120 200",
          c: "M 220 130 Q 180 80 120 120 Q 80 160 80 200 Q 80 260 140 280 Q 200 280 220 240",
          d: "M 200 80 L 200 260 M 200 180 Q 200 120 140 120 Q 80 140 80 200 Q 80 260 140 260 Q 200 260 200 200",
          e: "M 100 180 L 220 180 Q 220 120 160 100 Q 100 120 100 180 Q 100 260 160 280 Q 220 260 220 220",
          f: "M 200 90 Q 160 60 140 100 L 140 260 M 100 160 L 180 160",
          g: "M 200 110 Q 200 80 160 80 Q 100 95 100 140 Q 100 190 160 210 Q 200 190 200 140 L 200 270 Q 180 300 120 285",
          h: "M 100 80 L 100 260 M 100 160 Q 100 120 160 120 Q 220 120 220 180 L 220 260",
          i: "M 160 100 L 160 100 M 160 140 L 160 260",
          j: "M 180 80 L 180 80 M 180 110 L 180 250 Q 160 285 120 270",
          k: "M 100 80 L 100 260 M 200 120 L 100 180 L 200 260",
          l: "M 160 80 L 160 260",
          m: "M 80 260 L 80 140 Q 80 100 120 100 Q 160 100 160 160 L 160 260 M 160 140 Q 160 100 200 100 Q 240 100 240 160 L 240 260",
          n: "M 100 260 L 100 140 Q 100 100 160 100 Q 220 100 220 160 L 220 260",
          o: "M 160 100 Q 100 100 100 180 Q 100 260 160 260 Q 220 260 220 180 Q 220 100 160 100",
          p: "M 100 110 L 100 285 M 100 140 Q 100 95 160 95 Q 220 95 220 140 Q 220 190 160 190 Q 100 190 100 160",
          q: "M 220 110 L 220 285 M 220 140 Q 220 95 160 95 Q 100 95 100 140 Q 100 190 160 190 Q 220 190 220 160",
          r: "M 100 260 L 100 140 Q 120 100 180 120",
          s: "M 200 130 Q 160 100 120 130 Q 80 160 160 190 Q 240 220 200 260 Q 160 280 100 250",
          t: "M 150 80 L 150 260 M 100 130 L 200 130",
          u: "M 100 140 L 100 220 Q 100 260 160 260 Q 220 260 220 220 L 220 140 L 220 260",
          v: "M 80 140 L 160 260 L 240 140",
          w: "M 60 140 L 110 260 L 160 180 L 210 260 L 260 140",
          x: "M 100 140 L 220 260 M 220 140 L 100 260",
          y: "M 100 110 L 160 160 M 220 110 L 160 160 L 120 270",
          z: "M 100 140 L 220 140 L 100 260 L 220 260",
          A: "M 60 260 L 160 60 L 260 260 M 100 180 L 220 180",
          B: "M 80 60 L 80 260 M 80 60 L 180 60 Q 240 60 240 110 Q 240 160 180 160 L 80 160 M 80 160 L 180 160 Q 250 160 250 210 Q 250 260 180 260 L 80 260",
          C: "M 240 100 Q 200 40 140 40 Q 60 60 60 160 Q 60 260 140 280 Q 200 280 240 220",
          D: "M 80 60 L 80 260 M 80 60 L 160 60 Q 260 80 260 160 Q 260 240 160 260 L 80 260",
          E: "M 220 60 L 80 60 L 80 260 L 220 260 M 80 160 L 180 160",
          F: "M 220 60 L 80 60 L 80 260 M 80 160 L 180 160",
          G: "M 240 100 Q 200 40 140 40 Q 60 60 60 160 Q 60 260 140 280 Q 220 280 240 200 L 240 160 L 180 160",
          H: "M 80 60 L 80 260 M 240 60 L 240 260 M 80 160 L 240 160",
          I: "M 120 60 L 200 60 M 160 60 L 160 260 M 120 260 L 200 260",
          J: "M 140 60 L 220 60 M 180 60 L 180 220 Q 180 280 120 280 Q 80 260 80 220",
          K: "M 80 60 L 80 260 M 240 60 L 80 160 L 240 260",
          L: "M 80 60 L 80 260 L 220 260",
          M: "M 60 260 L 60 60 L 160 180 L 260 60 L 260 260",
          N: "M 80 260 L 80 60 L 240 260 L 240 60",
          O: "M 160 40 Q 60 40 60 160 Q 60 280 160 280 Q 260 280 260 160 Q 260 40 160 40",
          P: "M 80 60 L 80 260 M 80 60 L 180 60 Q 240 60 240 110 Q 240 160 180 160 L 80 160",
          Q: "M 160 40 Q 60 40 60 160 Q 60 280 160 280 Q 260 280 260 160 Q 260 40 160 40 M 200 220 L 260 280",
          R: "M 80 60 L 80 260 M 80 60 L 180 60 Q 240 60 240 110 Q 240 160 180 160 L 80 160 M 160 160 L 240 260",
          S: "M 220 80 Q 180 40 120 60 Q 60 80 60 120 Q 60 160 160 180 Q 260 200 260 240 Q 260 280 180 280 Q 100 280 60 240",
          T: "M 60 60 L 260 60 M 160 60 L 160 260",
          U: "M 80 60 L 80 200 Q 80 280 160 280 Q 240 280 240 200 L 240 60",
          V: "M 60 60 L 160 260 L 260 60",
          W: "M 40 60 L 100 260 L 160 120 L 220 260 L 280 60",
          X: "M 60 60 L 260 260 M 260 60 L 60 260",
          Y: "M 60 60 L 160 160 L 160 260 M 260 60 L 160 160",
          Z: "M 60 60 L 260 60 L 60 260 L 260 260",
          // ── Digraphs and trigraphs ──
          // The canvas draws these as multi-character strings via strokeText()
          // (which natively handles 2- and 3-character strings); the M
          // coordinates below are used only as start-dot anchors for the
          // animated hand. The mask-search loop snaps each anchor to the
          // nearest filled stroke pixel within a 40px radius, so these only
          // need to land near the first letter's expected position when
          // the digraph is rendered centered at (width/2, height/2 + 20)
          // with the auto-scaled font (150px for 2-char, 110px for 3-char).
          // For a 320px canvas at 150px font, two chars span roughly x=80–240.
          sh:  "M 130 130",   // top of 's' in "sh"
          ch:  "M 130 130",   // top arc of 'c' in "ch"
          th:  "M 100 80",    // top of 't' in "th"
          wh:  "M 80 140",    // top-left of 'w' in "wh"
          ng:  "M 100 140",   // top of 'n' in "ng"
          ck:  "M 100 140",   // top arc of 'c' in "ck"
          ph:  "M 90 110",    // top of 'p' in "ph"
          qu:  "M 120 110",   // top of 'q' in "qu"
          // Trigraphs (rendered at 110px font; spans roughly x=80–240)
          igh: "M 130 140",   // top of 'i' in "igh"
          tch: "M 100 90",    // top of 't' in "tch"
          dge: "M 120 100",   // top of 'd' in "dge"
        };

        // Render-font-size selector: scales down for multi-character graphemes
        // so digraphs (sh, ch, th, wh, ng, ck, ph, qu) and trigraphs (igh,
        // tch, dge) fit within the 320×320 canvas with comfortable margin.
        function _wsTraceFontSize(text) {
          if (!text) return 200;
          const len = String(text).length;
          if (len <= 1) return 200;
          if (len === 2) return 150;
          if (len === 3) return 110;
          return 90;
        }
        // Total drawn length of a captured stroke (sum of segment distances).
        function _wsStrokeLen(s) {
          let L = 0;
          for (let i = 1; i < s.length; i++) {
            L += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
          }
          return L;
        }
        const samplePathPoints = React.useMemo(() => {
          return (pathD, numPoints = 40) => {
            const ns = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(ns, "svg");
            const path = document.createElementNS(ns, "path");
            path.setAttribute("d", pathD);
            svg.appendChild(path);
            document.body.appendChild(svg);
            const totalLength = path.getTotalLength();
            const points = [];
            for (let i = 0; i <= numPoints; i++) {
              const distance = (i / numPoints) * totalLength;
              const pt = path.getPointAtLength(distance);
              points.push({ x: pt.x, y: pt.y });
            }
            document.body.removeChild(svg);
            return points;
          };
        }, []);
        React.useEffect(() => {
          setIsAnimating(false);
        }, [letter, resetKey]);
        const startScratch = () => {
          try {
            if (!audioCtxRef.current)
              audioCtxRef.current = new (
                window.AudioContext || window.webkitAudioContext
              )();
            const ctx = audioCtxRef.current;
            if (ctx.state === "suspended") ctx.resume();
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 800;
            filter.Q.value = 1;
            const gain = ctx.createGain();
            gain.gain.value = 0.05;
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start();
            noiseNodeRef.current = { node: noise, gain: gain };
          } catch (e) {
            warnLog("Audio scratch failed", e);
          }
        };
        const stopScratch = () => {
          if (noiseNodeRef.current) {
            const { node, gain } = noiseNodeRef.current;
            try {
              gain.gain.exponentialRampToValueAtTime(
                0.001,
                node.context.currentTime + 0.1,
              );
              node.stop(node.context.currentTime + 0.1);
            } catch (e) {
              warnLog("Caught error:", e?.message || e);
            }
            noiseNodeRef.current = null;
          }
        };
        React.useEffect(() => {
          return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            if (audioInstances.current) {
              audioInstances.current.forEach((audio) => {
                try {
                  audio.pause();
                  audio.src = "";
                } catch (e) {
                  warnLog("Caught error:", e?.message || e);
                }
              });
              audioInstances.current.clear();
            }
            if (audioCtxRef.current) {
              try {
                audioCtxRef.current.close();
              } catch (e) {
                warnLog("Caught error:", e?.message || e);
              }
            }
            if (feedbackAudioRef.current) {
              feedbackAudioRef.current.pause();
              feedbackAudioRef.current = null;
            }
            localMountedRef.current = false;
          };
        }, []);
        React.useEffect(() => {
          const canvas = canvasRef.current;
          const mask = maskRef.current;
          if (!canvas || !mask) return;
          const width = canvas.width;
          const height = canvas.height;
          const ctx = canvas.getContext("2d");
          const mCtx = mask.getContext("2d");
          ctx.clearRect(0, 0, width, height);
          mCtx.clearRect(0, 0, width, height);
          strokesRef.current = []; // reset captured strokes for the new letter/attempt
          // Multi-character graphemes (sh, ch, th, wh, ng, ck, ph, qu, igh,
          // tch, dge) auto-scale the font down so the digraph/trigraph fits
          // inside the 320×320 canvas. Single letters keep the original 200px.
          const _wsFontPx = _wsTraceFontSize(letter);
          const font =
            'bold ' + _wsFontPx + 'px "Comic Sans MS", "Chalkboard SE", sans-serif';
          // Stroke widths also scale proportionally so visual + hit-area
          // detection stay consistent across grapheme lengths.
          const _wsVisStroke  = Math.max(14, Math.round(25 * (_wsFontPx / 200)));
          const _wsMaskStroke = Math.max(20, Math.round(35 * (_wsFontPx / 200)));
          ctx.font = font;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = _wsVisStroke;
          ctx.setLineDash([15, 15]);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeText(letter, width / 2, height / 2 + 20);
          mCtx.font = font;
          mCtx.textAlign = "center";
          mCtx.textBaseline = "middle";
          mCtx.fillStyle = "#000000";
          mCtx.strokeStyle = "#ff0000";
          mCtx.lineWidth = _wsMaskStroke;
          mCtx.setLineDash([]);
          mCtx.lineCap = "round";
          mCtx.lineJoin = "round";
          mCtx.strokeText(letter, width / 2, height / 2 + 20);
          const mData = mCtx.getImageData(0, 0, width, height).data;
          const svgPath =
            LETTER_SVG_PATHS[letter] || LETTER_SVG_PATHS[letter.toLowerCase()];
          let startX = width / 2,
            startY = 60,
            found = false;
          if (svgPath) {
            const mMatch = svgPath.match(/^M\s+([\d.]+)\s+([\d.]+)/);
            if (mMatch) {
              const svgX = parseFloat(mMatch[1]);
              const svgY = parseFloat(mMatch[2]);
              const searchRadius = 40;
              let bestDist = Infinity;
              for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
                for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
                  const px = Math.round(svgX + dx);
                  const py = Math.round(svgY + dy);
                  if (px < 0 || px >= width || py < 0 || py >= height) continue;
                  const idx = (py * width + px) * 4;
                  if (mData[idx + 3] > 100) {
                    const dist = dx * dx + dy * dy;
                    if (dist < bestDist) {
                      bestDist = dist;
                      startX = px;
                      startY = py;
                      found = true;
                    }
                  }
                }
              }
              if (!found) {
                startX = svgX;
                startY = svgY;
                found = true;
              }
            }
          }
          if (!found) {
            for (let y = 40; y < height; y += 4) {
              for (let x = 40; x < width; x += 4) {
                const i = (y * width + x) * 4;
                if (mData[i + 3] > 100) {
                  startX = x;
                  startY = y;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }
          if (found) {
            ctx.beginPath();
            ctx.arc(startX, startY, 12, 0, Math.PI * 2);
            ctx.fillStyle = "#10b981";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.stroke();
            setStartDotPos({ x: startX, y: startY });
          } else {
            setStartDotPos(null);
          }
        }, [letter, resetKey]);
        const checkTracing = () => {
          const canvas = canvasRef.current;
          const mask = maskRef.current;
          if (!canvas || !mask) return;
          const width = canvas.width;
          const height = canvas.height;
          const uData = canvas
            .getContext("2d")
            .getImageData(0, 0, width, height).data;
          const mData = mask
            .getContext("2d")
            .getImageData(0, 0, width, height).data;
          let hits = 0;
          let totalTarget = 0;
          let outsideInk = 0;
          // Per-cell coverage lets us tell "traced the whole letter" from
          // "scribbled one region" — a single global coverage % can't.
          const GRID = 8;
          const cellW = Math.ceil(width / GRID);
          const cellH = Math.ceil(height / GRID);
          const cellTarget = new Array(GRID * GRID).fill(0);
          const cellHit = new Array(GRID * GRID).fill(0);
          for (let i = 0; i < uData.length; i += 4) {
            const uAlpha = uData[i + 3];
            const mAlpha = mData[i + 3];
            const isInk = uAlpha > 50 && uData[i] < 160 && uData[i + 1] < 160;
            const isTarget = mAlpha > 50;
            if (isTarget) {
              totalTarget++;
              const pxIndex = i / 4;
              const ci =
                Math.floor(Math.floor(pxIndex / width) / cellH) * GRID +
                Math.floor((pxIndex % width) / cellW);
              cellTarget[ci]++;
              if (isInk) {
                hits++;
                cellHit[ci]++;
              }
            } else if (isInk) {
              outsideInk++;
            }
          }
          // Completeness: fraction of the glyph's regions that were actually traced.
          let cellsWithTarget = 0;
          let cellsCovered = 0;
          for (let c = 0; c < cellTarget.length; c++) {
            if (cellTarget[c] >= 12) {
              cellsWithTarget++;
              if (cellHit[c] / cellTarget[c] >= 0.35) cellsCovered++;
            }
          }
          const completeness = cellsWithTarget
            ? cellsCovered / cellsWithTarget
            : 0;
          // Accuracy / neatness: of all the ink laid down, how much is on the letter.
          const totalInk = hits + outsideInk;
          const accuracy = totalInk > 0 ? hits / totalInk : 0;
          const coverage = hits / (totalTarget || 1); // for the "barely drawn" gate
          // Stroke-derived signals. Digraphs/trigraphs are M-only anchors (no full
          // path), so stroke order/count don't apply — they fall back to shape +
          // neatness + start point only.
          const svgPath =
            LETTER_SVG_PATHS[letter] || LETTER_SVG_PATHS[letter.toLowerCase()];
          const hasFullPath = !!svgPath && /[LQ]/i.test(svgPath);
          const strokes = (strokesRef.current || []).filter(
            (s) => s && s.length >= 3 && _wsStrokeLen(s) > 24,
          );
          // Did they start at the green dot?
          let startScore = 1;
          if (startDotPos && strokes.length) {
            const f = strokes[0][0];
            const d = Math.hypot(f.x - startDotPos.x, f.y - startDotPos.y);
            startScore = d <= 35 ? 1 : d <= 70 ? 0.6 : 0.25;
          }
          // Plausible number of strokes? (single letters only)
          let strokeCountScore = 1;
          let expectedStrokes = 0;
          if (hasFullPath) {
            expectedStrokes = (svgPath.match(/M/g) || []).length || 1;
            const diff = Math.abs(strokes.length - expectedStrokes);
            strokeCountScore =
              diff === 0 ? 1 : diff === 1 ? 0.7 : diff === 2 ? 0.4 : 0.2;
          }
          // Soft direction coaching (NOT scored): did the longest stroke run the
          // same overall way as the reference path?
          let directionOff = false;
          if (hasFullPath && strokes.length) {
            const pts = samplePathPoints(svgPath, 16);
            if (pts.length > 1) {
              const refDx = pts[pts.length - 1].x - pts[0].x;
              const refDy = pts[pts.length - 1].y - pts[0].y;
              const longest = strokes.reduce(
                (a, b) => (_wsStrokeLen(b) > _wsStrokeLen(a) ? b : a),
                strokes[0],
              );
              const uDx = longest[longest.length - 1].x - longest[0].x;
              const uDy = longest[longest.length - 1].y - longest[0].y;
              const dot = refDx * uDx + refDy * uDy;
              const mag = Math.hypot(refDx, refDy) * Math.hypot(uDx, uDy);
              if (mag > 1500 && dot / mag < -0.3) directionOff = true;
            }
          }
          // Composite formation score (0–1), weighted by what matters most.
          let score;
          let passFloorOk;
          if (hasFullPath) {
            score =
              0.45 * completeness +
              0.3 * accuracy +
              0.15 * startScore +
              0.1 * strokeCountScore;
            passFloorOk = completeness >= 0.55 && accuracy >= 0.45;
          } else {
            score = 0.55 * completeness + 0.3 * accuracy + 0.15 * startScore;
            passFloorOk = completeness >= 0.5 && accuracy >= 0.4;
          }
          const score100 = Math.round(score * 100);
          const passThreshold = hasFullPath ? 0.7 : 0.65;
          debugLog("Trace formation:", {
            score100,
            completeness,
            accuracy,
            startScore,
            strokeCountScore,
            strokes: strokes.length,
            expectedStrokes,
            directionOff,
          });
          // Hardly anything drawn yet — encourage, don't score.
          if (totalInk < 200 || coverage < 0.08) {
            setFeedback({
              type: "error",
              emoji: "🔄",
              size: "md",
              tip: "Trace the letter!",
            });
            setTimeout(() => {
              if (localMountedRef.current) setFeedback(null);
            }, 2000);
            return;
          }
          if (score >= passThreshold && passFloorOk) {
            setFeedback({
              type: "success",
              emoji: "🌟",
              size: "lg",
              tip: "Great forming! " + score100 + "/100",
            });
            setTimeout(() => {
              if (localMountedRef.current) onComplete(true, score100);
            }, 800);
            return;
          }
          // Not yet — one targeted, encouraging tip on the weakest thing.
          let tip;
          if (startScore <= 0.6) tip = "Start at the green dot!";
          else if (completeness < 0.55) tip = "Trace the whole letter!";
          else if (accuracy < 0.5) tip = "Try to stay on the lines!";
          else if (directionOff) tip = "Follow the letter from the green dot.";
          else tip = "Almost! Keep tracing.";
          setFeedback({ type: "neutral", emoji: "👆", size: "md", tip: tip });
          setTimeout(() => {
            if (localMountedRef.current) setFeedback(null);
          }, 2200);
        };
        const getPoint = (e) => {
          const canvas = canvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          return { x: clientX - rect.left, y: clientY - rect.top };
        };
        const startDraw = (e) => {
          setIsDrawing(true);
          startScratch();
          const { x, y } = getPoint(e);
          strokesRef.current.push([{ x, y }]); // begin a new captured stroke
          const ctx = canvasRef.current.getContext("2d");
          ctx.setLineDash([]);
          ctx.strokeStyle = "#7c3aed";
          ctx.lineWidth = 30;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(x, y);
        };
        const draw = (e) => {
          if (!isDrawing) return;
          e.preventDefault();
          const { x, y } = getPoint(e);
          const curStroke = strokesRef.current[strokesRef.current.length - 1];
          if (curStroke) curStroke.push({ x, y }); // record point for formation scoring
          const ctx = canvasRef.current.getContext("2d");
          ctx.lineTo(x, y);
          ctx.stroke();
        };
        const endDraw = () => {
          if (isDrawing) {
            setIsDrawing(false);
            stopScratch();
            const ctx = canvasRef.current.getContext("2d");
            ctx.beginPath();
          }
        };
        return /*#__PURE__*/ React.createElement(
          "div",
          { className: "flex flex-col items-center animate-in fade-in" },
          /*#__PURE__*/ React.createElement("canvas", {
            ref: maskRef,
            width: 320,
            height: 320,
            className: "hidden",
          }),
          /*#__PURE__*/ React.createElement(
            "div",
            { className: "relative" },
            /*#__PURE__*/ React.createElement("canvas", {
              ref: canvasRef,
              width: 320,
              height: 320,
              tabIndex: 0,
              role: "img",
              "aria-label": ts("word_sounds.sr_tracing_canvas") || "Letter tracing canvas. Use mouse or touch to trace the letter shape. Use the surrounding controls to skip, get a hint, or hear the letter sound.",
              onMouseDown: startDraw,
              onMouseMove: draw,
              onMouseUp: endDraw,
              onMouseLeave: endDraw,
              onTouchStart: startDraw,
              onTouchMove: draw,
              onTouchEnd: endDraw,
              className: `border-4 rounded-3xl bg-white shadow-xl touch-none cursor-crosshair mb-6 transition-all duration-500 ${feedback?.type === "success" ? "border-solid border-emerald-400 shadow-emerald-200/50 shadow-2xl" : feedback?.type === "error" ? "border-dashed border-rose-300" : "border-dashed border-violet-200"}`,
            }),
            !isDrawing &&
            !feedback &&
            (isAnimating ? handAnimPos : startDotPos) &&
              /*#__PURE__*/ React.createElement(
              "div",
              {
                className: `absolute pointer-events-none ${isAnimating ? "" : "animate-bounce"}`,
                style: {
                  left: (isAnimating ? handAnimPos?.x : startDotPos?.x) - 35,
                  top: (isAnimating ? handAnimPos?.y : startDotPos?.y) - 15,
                  transform: "translate(-50%, -50%)",
                  transition: isAnimating
                    ? "left 0.12s ease-out, top 0.12s ease-out"
                    : "none",
                },
              },
                /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: `text-4xl filter drop-shadow-lg transform -rotate-12 block ${isAnimating ? "scale-110" : ""}`,
                  "aria-hidden": "true",
                },
                "\uD83D\uDC49",
              ),
            ),
            feedback &&
              /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none",
              },
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: `
                                ${feedback.size === "lg" ? "text-8xl" : "text-5xl"}
                                ${feedback.type === "success" ? "animate-bounce" : "animate-pulse"}
                                filter drop-shadow-xl
                                transition-all duration-300
                            `,
                },
                feedback.emoji,
              ),
              feedback.tip &&
                /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "text-sm font-bold text-slate-700 bg-white/85 px-3 py-1 rounded-full shadow",
                },
                feedback.tip,
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            { className: "flex items-center justify-center gap-3 mb-6" },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className:
                  "text-5xl font-black text-violet-600 bg-violet-50 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner",
              },
              letter,
            ),
            word &&
              /*#__PURE__*/ React.createElement(
              "span",
              { className: "text-lg text-slate-600 font-medium" },
              "for ",
                /*#__PURE__*/ React.createElement(
                "span",
                { className: "font-bold text-slate-700" },
                word,
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            { className: "flex gap-4" },
            /*#__PURE__*/ React.createElement(
              "button",
              {
                onClick: () => {
                  setResetKey((k) => k + 1);
                  setFeedback(null);
                },
                className:
                  "px-6 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors",
              },
              "Clear",
            ),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                onClick: checkTracing,
                className:
                  "px-8 py-3 rounded-xl font-bold bg-violet-600 text-white shadow-lg hover:scale-105 transition-transform",
              },
              "Check \u2713",
            ),
          ),
        );
      });
      const renderPrompt = () =>
        /*#__PURE__*/ React.createElement(
        "div",
        { className: "text-center mb-6 relative" },
        (() => {
          const effectiveMode = getEffectiveImageMode();
          const shouldShowImage =
            currentWordImage &&
            (effectiveMode === "alwaysOn" ||
              ((effectiveMode === "progressive" ||
                effectiveMode === "afterCompletion") &&
                showImageForCurrentWord));
          return shouldShowImage;
        })()
          ? /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex flex-col items-center animate-in fade-in zoom-in",
            },
                /*#__PURE__*/ React.createElement("img", {
              loading: "lazy",
              src: currentWordImage,
              alt: "Mystery Word",
              className:
                "w-32 h-32 object-cover rounded-xl shadow-md mb-2 border-2 border-slate-100",
            }),
            (getEffectiveTextMode() === "alwaysOn" || showWordText) &&
                  /*#__PURE__*/ React.createElement(
              "span",
              {
                className:
                  "text-lg font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full shadow-sm",
              },
              currentWordSoundsWord,
            ),
            wordSoundsActivity !== "counting" &&
                  /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex gap-1 mb-2" },
              [...Array(wordSoundsPhonemes?.phonemeCount || 3)].map(
                (_, i) =>
                        /*#__PURE__*/ React.createElement("div", {
                  key: i,
                  className:
                    "w-8 h-8 bg-slate-100 rounded-lg animate-pulse",
                }),
              ),
            ),
                /*#__PURE__*/ React.createElement(
              "button",
              {
                onClick: () =>
                  wordSoundsActivity === "blending"
                    ? playBlending()
                    : handleAudio(currentWordSoundsWord),
                disabled: isPlayingAudio,
                className: `p-3 rounded-full transition-colors shadow-sm mt-1 ${isPlayingAudio ? "bg-slate-100 text-slate-600 cursor-wait" : "bg-violet-100 text-violet-700 hover:bg-violet-200"}`,
                "aria-label": t("common.play_word"),
              },
              isPlayingAudio
                ? /*#__PURE__*/ React.createElement("div", {
                  className:
                    "animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full",
                })
                : /*#__PURE__*/ React.createElement(Volume2, { size: 24 }),
            ),
          )
          : /*#__PURE__*/ React.createElement(
            "button",
            {
              onClick: () =>
                wordSoundsActivity === "blending"
                  ? playBlending()
                  : handleAudio(currentWordSoundsWord),
              disabled: isPlayingAudio,
              className: `flex flex-col items-center justify-center gap-2 mx-auto p-4 rounded-2xl transition-all ${isPlayingAudio ? "bg-violet-100 scale-105" : "bg-white/60 hover:bg-violet-50 hover:scale-105"}`,
            },
            (getEffectiveTextMode() === "alwaysOn" || showWordText) &&
                  /*#__PURE__*/ React.createElement(
              "span",
              { className: "text-4xl font-bold text-violet-700" },
              currentWordSoundsWord,
            ),
                /*#__PURE__*/ React.createElement(
              "div",
              { className: "relative flex items-center justify-center" },
                  /*#__PURE__*/ React.createElement(Ear, {
                size: 48,
                className: `transition-all ${isPlayingAudio ? "text-violet-500 animate-pulse" : "text-violet-400"}`,
              }),
              isPlayingAudio &&
                    /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "absolute -right-3 -top-1 flex gap-0.5 items-end h-5",
                },
                      /*#__PURE__*/ React.createElement("div", {
                  className: "w-1 bg-violet-400 rounded-full",
                  style: {
                    height: "4px",
                    animation:
                      "soundwave 0.6s ease-in-out infinite alternate",
                  },
                }),
                      /*#__PURE__*/ React.createElement("div", {
                  className: "w-1 bg-violet-500 rounded-full",
                  style: {
                    height: "12px",
                    animation:
                      "soundwave 0.6s ease-in-out infinite alternate 0.2s",
                  },
                }),
                      /*#__PURE__*/ React.createElement("div", {
                  className: "w-1 bg-violet-400 rounded-full",
                  style: {
                    height: "8px",
                    animation:
                      "soundwave 0.6s ease-in-out infinite alternate 0.4s",
                  },
                }),
              ),
            ),
            !(getEffectiveTextMode() === "alwaysOn" || showWordText) &&
                  /*#__PURE__*/ React.createElement(
              "span",
              { className: "text-xs font-medium text-violet-500 mt-1" },
              ts("word_sounds.tap_to_hear") || "Tap to hear",
            ),
          ),
        wordSoundsActivity !== "counting" &&
            /*#__PURE__*/ React.createElement(
          "div",
          { className: "flex items-center justify-center gap-2 mt-2" },
              /*#__PURE__*/ React.createElement(
            "p",
            { className: "text-slate-600" },
            ts(`word_sounds.${wordSoundsActivity}_prompt`) ||
              (wordSoundsActivity === "syllable_counting"
                ? "How many syllables do you hear? Clap for each one"
                : wordSoundsActivity === "syllable_blending"
                  ? "Listen to the syllables and blend them together"
                  : ""),
          ),
              /*#__PURE__*/ React.createElement(
            "button",
            {
              "aria-label": t("common.read_instructions"),
              onClick: () => {
                const instKeyMap = {
                  orthography: "inst_orthography",
                  spelling_bee: "inst_spelling_bee",
                  word_scramble: "inst_word_scramble",
                  missing_letter: "inst_missing_letter",
                  counting: "inst_counting",
                  blending: "inst_blending",
                  segmentation: "inst_segmentation",
                  rhyming: "inst_rhyming",
                  letter_tracing: "inst_letter_tracing",
                  sound_sort: "inst_sound_sort",
                  word_families: "inst_word_families",
                  mapping: "mapping",
                };
                const rptKey =
                  instKeyMap[wordSoundsActivity] || wordSoundsActivity;
                if (
                  wordSoundsActivity === "isolation" &&
                  typeof window.__ALLO_ISOLATION_AUDIO !== "undefined"
                ) {
                  const ordinals = [
                    "1st",
                    "2nd",
                    "3rd",
                    "4th",
                    "5th",
                    "6th",
                    "7th",
                    "8th",
                    "9th",
                    "10th",
                  ];
                  const posKey =
                    ordinals[isolationState?.currentPosition || 0] ||
                    "fallback";
                  if (window.__ALLO_ISOLATION_AUDIO[posKey]) {
                    handleAudio(window.__ALLO_ISOLATION_AUDIO[posKey]);
                  } else {
                    handleAudio(
                      ts("word_sounds.isolation_prompt") ||
                        "What sound is in this word?",
                    );
                  }
                } else if (
                  typeof window.__ALLO_INSTRUCTION_AUDIO !== "undefined" &&
                  (window.__ALLO_INSTRUCTION_AUDIO[rptKey] ||
                    window.__ALLO_INSTRUCTION_AUDIO[wordSoundsActivity])
                ) {
                  handleAudio(
                    window.__ALLO_INSTRUCTION_AUDIO[rptKey] ||
                    window.__ALLO_INSTRUCTION_AUDIO[wordSoundsActivity],
                  );
                } else {
                  handleAudio(
                    ts(`word_sounds.${wordSoundsActivity}_prompt`) ||
                      (wordSoundsActivity === "syllable_counting"
                        ? "How many syllables do you hear? Clap for each one"
                        : wordSoundsActivity === "syllable_blending"
                          ? "Listen to the syllables and blend them together"
                          : ""),
                  );
                }
              },
              className:
                "p-1.5 rounded-full text-slate-600 hover:text-violet-600 hover:bg-violet-100 transition-colors",
              title: t("common.read_instructions"),
            },
                /*#__PURE__*/ React.createElement(Volume2, { size: 16 }),
          ),
        ),
      );
      const playSegmentationSequence = async () => {
        setIsPlayingAudio(true);
        try {
          for (const box of elkoninBoxes) {
            if (box && box.phoneme) {
              await handleAudio(box.phoneme);
              await new Promise((r) => setTimeout(r, 500));
            } else {
              await new Promise((r) => setTimeout(r, 600));
            }
          }
        } catch (e) {
          warnLog("Unhandled error:", e);
        } finally {
          setIsPlayingAudio(false);
        }
      };
      const spellingBeeInitRef = React.useRef(false);
      React.useEffect(() => {
        let sbTimer = null;
        if (
          wordSoundsActivity === "spelling_bee" &&
          currentWordSoundsWord &&
          !spellingBeeInitRef.current
        ) {
          spellingBeeInitRef.current = true;
          sbTimer = setTimeout(() => handleAudio(currentWordSoundsWord), 300);
        }
        if (wordSoundsActivity !== "spelling_bee") {
          spellingBeeInitRef.current = false;
        }
        return () => {
          spellingBeeInitRef.current = false;
          if (sbTimer) clearTimeout(sbTimer);
        };
      }, [currentWordSoundsWord, wordSoundsActivity]);
      const scrambleWord = (word) => {
        if (!word || word.length <= 2) return word?.split("") || [];
        const letters = word.split("");
        const seed = word.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        for (let i = letters.length - 1; i > 0; i--) {
          const j = (seed + i) % (i + 1);
          [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        if (letters.join("") === word) {
          [letters[0], letters[1]] = [letters[1], letters[0]];
        }
        return letters;
      };
      // Prepared boards are only trusted when the pack entry is for the word
      // currently on screen — wordSoundsPhonemes can lag a word advance, and a
      // stale entry would deal the previous word's letters/answer.
      const packForCurrentWord =
        String(wordSoundsPhonemes?.word || "").trim().toLowerCase() ===
          String(currentWordSoundsWord || "").trim().toLowerCase()
          ? wordSoundsPhonemes?.activityItems
          : null;
      const scrambledLetters = React.useMemo(
        () => Array.isArray(packForCurrentWord?.word_scramble?.letters)
          ? [...packForCurrentWord.word_scramble.letters]
          : scrambleWord(currentWordSoundsWord?.toLowerCase()),
        [currentWordSoundsWord, wordSoundsPhonemes],
      );
      const [usedScrambleIndices, setUsedScrambleIndices] = React.useState([]);
      const hiddenIndex = React.useMemo(() => {
        if (Number.isInteger(packForCurrentWord?.missing_letter?.hiddenIndex)) return packForCurrentWord.missing_letter.hiddenIndex;
        if (!currentWordSoundsWord || currentWordSoundsWord.length <= 1)
          return 0;
        const seed = currentWordSoundsWord
          .split("")
          .reduce((a, c) => a + c.charCodeAt(0), 0);
        return seed % currentWordSoundsWord.length;
      }, [currentWordSoundsWord, wordSoundsPhonemes]);
      const correctLetter = packForCurrentWord?.missing_letter?.correctLetter || currentWordSoundsWord?.[hiddenIndex]?.toLowerCase();
      const letterOptions = React.useMemo(() => {
        if (Array.isArray(packForCurrentWord?.missing_letter?.options)) return [...packForCurrentWord.missing_letter.options];
        const alphabet = "abcdefghijklmnopqrstuvwxyz";
        const options = [correctLetter];
        const seed = (currentWordSoundsWord || "")
          .split("")
          .reduce((a, c) => a + c.charCodeAt(0), 0);
        let s = seed;
        const nextRand = () => {
          s = Math.sin(s + 1) * 10000;
          return s - Math.floor(s);
        };
        while (options.length < 4) {
          const rand = alphabet[Math.floor(nextRand() * 26)];
          if (!options.includes(rand)) options.push(rand);
        }
        return options.sort(() => nextRand() - 0.5);
      }, [correctLetter, currentWordSoundsWord, wordSoundsPhonemes]);
      const renderActivityContent = () => {
        const handleDragStart = (e, item, source, index = null) => {
          setDraggedItem({ item, source, index });
          e.dataTransfer.effectAllowed = "move";
        };
        const handleDragOver = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        };
        if (isLoadingPhonemes) {
          return /*#__PURE__*/ React.createElement(
            "div",
            { className: "flex flex-col items-center justify-center py-12" },
            /*#__PURE__*/ React.createElement("div", {
              className:
                "animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent mb-4",
            }),
            /*#__PURE__*/ React.createElement(
              "p",
              { className: "text-slate-600 mb-4" },
              ts("word_sounds.loading_phonemes"),
            ),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                "aria-label": t("common.minimize"),
                onClick: () => setIsMinimized(true),
                className:
                  "px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors flex items-center gap-2",
              },
              /*#__PURE__*/ React.createElement(Minimize, { size: 16 }),
              " ", ts("word_sounds.run_in_background") || "Run in Background",
            ),
          );
        }
        if (!wordSoundsPhonemes) {
          return /*#__PURE__*/ React.createElement(
            "div",
            { className: "text-center py-12 text-slate-600" },
            /*#__PURE__*/ React.createElement(Ear, {
              size: 48,
              className: "mx-auto mb-4 text-violet-700",
            }),
            /*#__PURE__*/ React.createElement(
              "p",
              null,
              ts("word_sounds.select_activity"),
            ),
          );
        }
        switch (wordSoundsActivity) {
          case "isolation": {
            const {
              word: isoWord,
              currentPosition,
              correctSound,
              isoOptions,
            } = isolationState || {};
            if (
              !isolationState ||
              (isoWord &&
                isoWord.toLowerCase() !== currentWordSoundsWord?.toLowerCase())
            ) {
              if (
                currentWordSoundsWord &&
                isoWord &&
                isoWord.toLowerCase() !== currentWordSoundsWord?.toLowerCase()
              ) {
                debugLog(
                  "⚠️ Isolation state mismatch:",
                  isoWord,
                  "vs",
                  currentWordSoundsWord,
                  "- will auto-sync",
                );
              }
              return /*#__PURE__*/ React.createElement(
                "div",
                { className: "p-8 text-center animate-pulse text-violet-700" },
                ts("word_sounds.loading_phonemes") || "Loading sounds...",
              );
            }
            if (useMicInput) {
              return /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex flex-col items-center" },
                renderVoiceInputOverlay(ts("word_sounds.say_sound") || "Say the sound (e.g. 'Buh')"),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "mt-6" },
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.voice_input"),
                      onClick: handleMicInput,
                      className:
                        "flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 transition-colors",
                    },
                    /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                    " ", ts("word_sounds.switch_to_clicking") || "Switch to Clicking",
                  ),
                ),
              );
            }
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col gap-4" },
              /*#__PURE__*/ React.createElement(PhonologyView, {
                key: currentWordSoundsWord,
                activity: wordSoundsActivity,
                data: {
                  word: currentWordSoundsWord,
                  position: currentPosition,
                  options: isoOptions,
                  correctSound: correctSound,
                  image:
                    isolationState?.image ||
                    currentWordImage ||
                    wordSoundsPhonemes?.image,
                },
                showLetterHints: showLetterHints,
                onPlayAudio: handleAudio,
                onCheckAnswer: (ans) => checkAnswer(ans, correctSound),
                isEditing: isEditing,
                onUpdateOption: handleOptionUpdate,
                highlightedIndex: highlightedIsoIndex,
                optionImages: aacMode ? optionImages : null,
              }),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "mx-auto" },
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.voice_input"),
                    onClick: handleMicInput,
                    className:
                      "flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors",
                  },
                  /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                  " ", ts("word_sounds.use_microphone") || "Use Microphone",
                ),
              ),
            );
          }
          case "segmentation":
          case "blending": {
            const availableChips = soundChips.filter((c) => !c.used);
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-6" },
              renderPrompt(),
              wordSoundsActivity === "segmentation" &&
                /*#__PURE__*/ React.createElement(
                React.Fragment,
                null,
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex justify-center gap-3 flex-wrap min-h-[100px] p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 transition-colors",
                    onDragOver: handleDragOver,
                  },
                  elkoninBoxes.map((chip, i) => {
                    const isError = segmentationErrors.includes(i);
                    return /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        key: i,
                        onDragOver: handleDragOver,
                        onDrop: (e) => handleSegDrop(e, "box", i),
                        className: `w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all relative ${isError ? "bg-red-50 border-2 border-red-400" : chip ? "scale-100 shadow-md ring-2 ring-violet-200" : "bg-white border-2 border-slate-200 text-slate-600"}`,
                        style: {
                          backgroundColor: chip ? chip.color : undefined,
                          border: chip
                            ? `2px solid ${chip.color.replace("92%", "60%")}`
                            : undefined,
                        },
                      },
                      chip
                        ? /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            draggable: true,
                            onDragStart: (e) =>
                              handleDragStart(e, chip, "box", i),
                            tabIndex: 0,
                            onKeyDown: (e) =>
                              handleKeyDown(e, chip, () =>
                                handleMoveKey(chip, "box", i),
                              ),
                            onClick: () => handleAudio(chip.phoneme),
                            className:
                              "w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-transform",
                            "aria-label": (ts("word_sounds.sr_phoneme") || "Phoneme ") + chip.phoneme + (ts("word_sounds.sr_phoneme_keys") || ". Press Space to hear, Enter to remove."),
                          },
                          showLetterHints
                            ? chip.phoneme
                            : /*#__PURE__*/ React.createElement(Volume2, {
                              size: 24,
                              className: "opacity-50",
                            }),
                        )
                        : /*#__PURE__*/ React.createElement(
                          "span",
                          { className: "text-sm opacity-50" },
                          "Drop",
                        ),
                    );
                  }),
                ),
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex justify-center mt-2 mb-4" },
                    /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.play"),
                      onClick: playSegmentationSequence,
                      "data-help-key": "wordsounds_test_sequence",
                      disabled: isPlayingAudio,
                      className:
                        "flex items-center gap-2 px-5 py-2 rounded-full bg-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-200 transition-colors shadow-sm",
                    },
                    isPlayingAudio
                      ? /*#__PURE__*/ React.createElement("div", {
                        className:
                          "animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full",
                      })
                      : /*#__PURE__*/ React.createElement(Play, { size: 16 }),
                    ts("word_sounds.test_sequence") || "Test Sequence",
                  ),
                ),
              ),
              wordSoundsActivity === "segmentation" &&
                /*#__PURE__*/ React.createElement(
                React.Fragment,
                null,
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex justify-center gap-4 flex-wrap mt-6 min-h-[80px] p-4 rounded-xl hover:bg-slate-50 transition-colors",
                    onDragOver: handleDragOver,
                    onDrop: (e) => handleSegDrop(e, "pool"),
                  },
                  availableChips.map((chip, idx) =>
                    isEditing
                      ? /*#__PURE__*/ React.createElement(
                        "div",
                        { key: chip.id, className: "relative" },
                            /*#__PURE__*/ React.createElement("input", {
                          "aria-label": t("common.text_field"),
                          className:
                            "w-16 h-16 rounded-full border-b-4 font-bold text-xl flex items-center justify-center text-center outline-none focus:ring-2 focus:ring-violet-400",
                          style: {
                            backgroundColor: chip.color,
                            borderColor: chip.color.replace("92%", "70%"),
                            color: "#475569",
                          },
                          value: chip.phoneme,
                          onChange: (e) =>
                            handleOptionUpdate(idx, e.target.value),
                          onKeyDown: (e) => e.stopPropagation(),
                        }),
                      )
                      : /*#__PURE__*/ React.createElement(
                        "button",
                        {
                          key: chip.id,
                          draggable: true,
                          onDragStart: (e) =>
                            handleDragStart(e, chip, "pool"),
                          onClick: () => handleAudio(chip.phoneme),
                          onKeyDown: (e) =>
                            handleKeyDown(e, chip, () =>
                              handleMoveKey(chip, "pool"),
                            ),
                          tabIndex: 0,
                          "data-help-key": "wordsounds_pool_item",
                          "aria-label": showLetterHints
                            ? `Phoneme ${chip.phoneme}`
                            : "Mystery Sound",
                          title:
                            typeof PHONEME_GUIDE !== "undefined" &&
                              PHONEME_GUIDE[chip.phoneme]
                              ? `${PHONEME_GUIDE[chip.phoneme].label}: ${PHONEME_GUIDE[chip.phoneme].tip}\nDrag to box or Click to listen`
                              : "Drag to box or Click to listen",
                          className:
                            "w-16 h-16 rounded-full border-b-4 font-bold text-xl flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing",
                          style: {
                            backgroundColor: chip.color,
                            borderColor: chip.color.replace("92%", "70%"),
                            color: "#475569",
                          },
                        },
                        showLetterHints
                          ? chip.phoneme
                          : /*#__PURE__*/ React.createElement(Volume2, {
                            size: 20,
                          }),
                      ),
                  ),
                ),
              ),
              wordSoundsActivity === "segmentation" &&
                /*#__PURE__*/ React.createElement(
                React.Fragment,
                null,
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex justify-center gap-3 mt-6" },
                    /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () => {
                        if (elkoninBoxes.some((b) => b === null)) return;
                        const expected = wordSoundsPhonemes?.phonemes || [];
                        const errors = [];
                        let isPerfect = true;
                        const normalizePhoneme = (p) => {
                          const map = {
                            "\u0101": "ay",
                            "\u0113": "ee",
                            "\u012b": "ie",
                            "\u014d": "oa",
                            "\u016b": "oo",
                            "\u0103": "a",
                            "\u0115": "e",
                            "\u012d": "i",
                            "\u014f": "o",
                            "\u016d": "u",
                            oi: "oy",
                            aw: "au",
                            ew: "oo",
                            oe: "oa",
                          };
                          const lower = (p || "").toLowerCase().trim();
                          return map[lower] || lower;
                        };
                        elkoninBoxes.forEach((box, idx) => {
                          if (
                            !box ||
                            !expected[idx] ||
                            normalizePhoneme(box.phoneme) !==
                            normalizePhoneme(expected[idx])
                          ) {
                            errors.push(idx);
                            isPerfect = false;
                          }
                        });
                        if (!isPerfect) {
                          setSegmentationErrors(errors);
                          checkAnswer("wrong", "right");
                        } else {
                          const userPhonemes = elkoninBoxes
                            .map((b) => (b.phoneme || "").trim())
                            .join("")
                            .toLowerCase();
                          const expectedPhonemes = expected
                            .map((p) => (p || "").trim())
                            .join("")
                            .toLowerCase();
                          checkAnswer(userPhonemes, expectedPhonemes);
                        }
                      },
                      disabled: elkoninBoxes.some((b) => b === null),
                      className: `px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all ${elkoninBoxes.some((b) => b === null) ? "bg-slate-200 text-slate-600 cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-700 hover:scale-105"}`,
                    },
                    t("common.check"),
                  ),
                ),
              ),
              wordSoundsActivity === "blending" &&
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "space-y-4 mt-6" },
                isEditing &&
                wordSoundsPhonemes?.phonemes &&
                    /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "p-4 border-2 border-dashed border-violet-300 rounded-xl bg-violet-50 mb-6 relative animate-in zoom-in-95",
                  },
                      /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "absolute -top-3 left-4 bg-violet-100 text-violet-700 px-2 text-xs font-bold uppercase tracking-wider rounded border border-violet-200",
                    },
                    "Edit Sounds",
                  ),
                      /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex flex-wrap gap-2 justify-center mt-2",
                    },
                    (wordSoundsPhonemes?.phonemes || []).map((p, idx) =>
                          /*#__PURE__*/ React.createElement("input", {
                      "aria-label": t("common.enter_p"),
                      key: `blend-ph-${idx}`,
                      value: p,
                      onChange: (e) =>
                        handleOptionUpdate(idx, e.target.value),
                      className:
                        "w-14 h-14 rounded-lg border-2 border-violet-200 text-center font-bold text-lg outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 shadow-sm",
                      title: `Sound ${idx + 1}`,
                    }),
                    ),
                  ),
                ),
                useMicInput
                  ? /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex flex-col items-center gap-4 animate-in fade-in",
                    },
                        /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        "aria-label": t("common.voice_input"),
                        onClick: handleMicInput,
                        className: `w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all ${isListening ? "bg-rose-700 text-white scale-110 ring-4 ring-rose-200 animate-pulse" : "bg-white text-slate-600 border-4 border-slate-100 hover:border-violet-200 hover:text-violet-500"}`,
                      },
                          /*#__PURE__*/ React.createElement(Mic, { size: 40 }),
                    ),
                        /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "font-bold text-slate-600 min-h-[1.5em]",
                      },
                      isListening
                        ? ts("word_sounds.listening") || "Listening..."
                        : userAnswer ||
                        ts("word_sounds.tap_to_speak") ||
                        "Tap to Speak",
                    ),
                  )
                  : blendingOptions.length > 0 &&
                        /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "flex flex-col gap-4" },
                          /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        onClick: async () => {
                          const myRun = audioRunIdRef.current;
                          try {
                            for (
                              let i = 0;
                              i < blendingOptions.length;
                              i++
                            ) {
                              if (audioRunIdRef.current !== myRun) break;
                              setPlayingOptionIndex(i);
                              await handleAudio(blendingOptions[i]);
                              await new Promise((r) =>
                                setTimeout(r, 600),
                              );
                            }
                            setPlayingOptionIndex(null);
                          } catch (e) {
                            warnLog(
                              "Unhandled error in anon_blendingPlay:",
                              e,
                            );
                          }
                        },
                        className:
                          "mx-auto flex items-center gap-2 px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-full font-medium text-sm shadow-sm transition-colors",
                        disabled: isPlayingAudio,
                      },
                      isPlayingAudio
                        ? /*#__PURE__*/ React.createElement("div", {
                          className:
                            "animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full",
                        })
                        : /*#__PURE__*/ React.createElement(PlayCircle, {
                          size: 18,
                        }),
                      // ts() returns "" on a missing key — without the
                      // fallback this button had NO accessible name (and no
                      // visible text) whenever the key wasn't in the pack.
                      ts("word_sounds.play_all_options") || "Play all options",
                    ),
                          /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        key: "blend-grid-" + (showLetterHints ? "phonics" : "soundsonly"),
                        className:
                          "grid grid-cols-2 gap-3 max-w-sm mx-auto",
                      },
                      (blendingOptions || []).map((word, idx) =>
                        isEditing
                          ? /*#__PURE__*/ React.createElement("input", {
                            "aria-label": t("common.enter_word"),
                            key: `blend-edit-${idx}`,
                            value: word,
                            onChange: (e) => {
                              const newOpts = [...blendingOptions];
                              newOpts[idx] = e.target.value;
                              setBlendingOptions(newOpts);
                            },
                            className:
                              "px-6 py-4 bg-white border-2 border-amber-200 rounded-xl font-bold text-lg shadow-md focus:ring-2 focus:ring-amber-400 outline-none",
                            onKeyDown: (e) => e.stopPropagation(),
                          })
                          : /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              key: `blend-option-${idx}`,
                              className: `relative group transition-all duration-300 ${playingOptionIndex === idx || highlightedBlendIndex === idx ? "scale-105 ring-4 ring-pink-300 rounded-xl z-20" : ""}`,
                            },
                                    /*#__PURE__*/ React.createElement(
                              "button",
                              {
                                "aria-label": t("common.volume"),
                                onClick: () => {
                                  const isCorrect =
                                    word?.toLowerCase() ===
                                    currentWordSoundsWord?.toLowerCase();
                                  checkAnswer(
                                    isCorrect ? "correct" : "incorrect",
                                    "correct",
                                  );
                                },
                                className:
                                  "w-full px-8 py-6 bg-white border-2 border-slate-200 rounded-xl font-bold text-xl shadow-md hover:border-violet-400 hover:scale-105 hover:shadow-lg transition-all capitalize flex flex-col items-center gap-2",
                              },
                              aacMode && optionImages[word]
                                ? /*#__PURE__*/ React.createElement("img", {
                                    src: `data:image/png;base64,${optionImages[word]}`,
                                    alt: word,
                                    className:
                                      "w-16 h-16 object-contain rounded-xl",
                                  })
                                : null,
                              showLetterHints
                                ? word
                                : /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className:
                                      "text-slate-600 text-sm font-normal",
                                  },
                                  "Option ",
                                  idx + 1,
                                ),
                            ),
                                    /*#__PURE__*/ React.createElement(
                              "button",
                              {
                                "aria-label": t(
                                  "common.listen_to_this_option",
                                ),
                                onClick: (e) => {
                                  e.stopPropagation();
                                  if (isPlayingAudio) return;
                                  handleAudio(word);
                                },
                                className:
                                  "absolute top-1 right-1 w-8 h-8 bg-pink-100 hover:bg-pink-500 hover:text-white text-pink-600 rounded-lg flex items-center justify-center shadow-sm transition-all z-10",
                                title: t(
                                  "common.listen_to_this_option",
                                ),
                              },
                                      /*#__PURE__*/ React.createElement(
                                Volume2,
                                { size: 16 },
                              ),
                            ),
                          ),
                      ),
                    ),
                          /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        "aria-label": t("common.voice_input"),
                        onClick: handleMicInput,
                        className:
                          "mx-auto flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors",
                      },
                            /*#__PURE__*/ React.createElement(Mic, {
                        size: 20,
                      }),
                      " Use Microphone",
                    ),
                  ),
              ),
            );
          }
          case "orthography": {
            const correctWord = currentWordSoundsWord;
            let safeOptions = [...orthographyOptions];
            if (!safeOptions || safeOptions.length < 2) {
              debugLog(
                "⚠️ Generating distractors for Sight & Spell (options were empty)",
              );
              const generated = generateOrthographyDistractors(correctWord);
              const distractors = generated.slice(0, 5);
              safeOptions = [correctWord, ...distractors];
            }
            if (
              correctWord &&
              !safeOptions.some(
                (opt) => opt && opt.toLowerCase() === correctWord.toLowerCase(),
              )
            ) {
              debugLog(
                "⚠️ Added missing correct option to Sight & Spell:",
                correctWord,
              );
              if (safeOptions.length > 0) {
                safeOptions[0] = correctWord;
              } else {
                safeOptions = [correctWord];
              }
            }
            safeOptions = [...new Set(safeOptions)];
            // Easy difficulty: scaffold the tile bank to the word's letters +
            // a few distractors and show a word-length placeholder, instead
            // of the full alphabet (seeded by the word — stable re-renders).
            let orthoLetterBank = null;
            let orthoLengthHint = null;
            const orthoCleanWord = (currentWordSoundsWord || "").toLowerCase().replace(/[^a-z]/g, "");
            if (getEffectiveDifficulty() === "easy" && orthoCleanWord.length > 1) {
              const wordLetters = [...new Set(orthoCleanWord.split(""))];
              let s = orthoCleanWord.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
              const nextRand = () => { s = Math.sin(s + 1) * 10000; return s - Math.floor(s); };
              const pool = "abcdefghijklmnopqrstuvwxyz".split("").filter((l) => !wordLetters.includes(l));
              const distractors = [];
              while (distractors.length < 4 && pool.length) {
                distractors.push(pool.splice(Math.floor(nextRand() * pool.length), 1)[0]);
              }
              orthoLetterBank = [...wordLetters, ...distractors].sort(() => nextRand() - 0.5);
              orthoLengthHint = orthoCleanWord.length;
            }
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(OrthographyView, {
                activity: wordSoundsActivity,
                data: {
                  word: currentWordSoundsWord,
                  options: safeOptions,
                  correct: currentWordSoundsWord,
                },
                showLetterHints: true,
                letterBank: orthoLetterBank,
                lengthHint: orthoLengthHint,
                onPlayAudio: handleAudio,
                onCheckAnswer: (ans) => checkAnswer(ans, currentWordSoundsWord),
                isEditing: isEditing,
                onUpdateOption: handleOptionUpdate,
              }),
            );
          }
          case "mapping":
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(SoundMappingView, {
                key: currentWordSoundsWord,
                data: {
                  word: currentWordSoundsWord,
                  phonemes: wordSoundsPhonemes?.phonemes || [],
                  graphemes:
                    wordSoundsPhonemes?.graphemes ||
                    currentWordSoundsWord?.split("") ||
                    [],
                },
                onPlayAudio: handleAudio,
                onCheckAnswer: (ans) => checkAnswer(ans, "correct"),
                isEditing: isEditing,
                onUpdateOption: handleOptionUpdate,
              }),
            );
          case "spelling_bee": {
            const getLetterFeedback = () => {
              if (!userAnswer || !currentWordSoundsWord) return [];
              const target = currentWordSoundsWord.toLowerCase();
              const input = userAnswer.toLowerCase();
              return target
                .split("")
                .map((letter, idx) => ({
                  target: letter,
                  typed: input[idx] || "",
                  correct: input[idx]?.toLowerCase() === letter,
                }));
            };
            const letterFeedback = getLetterFeedback();
            const correctCount = letterFeedback.filter((l) => l.correct).length;
            const checkSpellingBee = () => {
              const correct =
                userAnswer?.toLowerCase().trim() ===
                currentWordSoundsWord?.toLowerCase();
              const liveStreak = wordSoundsScore?.streak || 0;
              if (correct) {
                const streakBonus =
                  liveStreak >= 5
                    ? " 🔥x2 BONUS!"
                    : liveStreak >= 3
                      ? " ⭐ Streak!"
                      : "";
                setWordSoundsFeedback({
                  type: "correct",
                  message: "🎉 Perfect!" + streakBonus,
                });
                setTimeout(() => {
                  if (!isMountedRef.current) return;
                  setUserAnswer("");
                  checkAnswer("correct", "correct");
                }, 1500);
              } else {
                const almostMsg =
                  correctCount > 0
                    ? `${correctCount}/${currentWordSoundsWord?.length} letters correct! Check the red boxes 👀`
                    : "Try again! Listen carefully 🔊";
                setWordSoundsFeedback({
                  type: "incorrect",
                  message: almostMsg,
                });
                handleAudio(currentWordSoundsWord);
                checkAnswer("incorrect", "correct");
              }
            };
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col items-center gap-5 p-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center relative" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: `text-4xl mb-2 ${wordSoundsFeedback?.type === "correct" ? "animate-bounce" : ""}`,
                  },
                  "\uD83D\uDC1D",
                ),
                /*#__PURE__*/ React.createElement(
                  "h3",
                  { className: "text-lg font-bold text-amber-700" },
                  ts("word_sounds.spelling_bee_title"),
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  { className: "text-sm text-amber-600" },
                  ts("word_sounds.spelling_bee_subtitle"),
                ),
                currentStreak >= 3 &&
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "absolute -top-2 -right-8 px-2 py-1 bg-orange-700 text-white text-xs font-bold rounded-full animate-pulse",
                  },
                  "\uD83D\uDD25 x",
                  currentStreak,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex gap-3" },
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.volume"),
                    onClick: () => handleAudio(currentWordSoundsWord),
                    className:
                      "flex items-center gap-2 px-5 py-2.5 bg-amber-100 hover:bg-amber-200 rounded-full text-amber-800 font-bold transition-all hover:scale-105 shadow-md",
                  },
                  /*#__PURE__*/ React.createElement(Volume2, { size: 20 }),
                  ts("word_sounds.spelling_bee_hear"),
                ),
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.slow_playback"),
                    onClick: () =>
                      handleAudio(currentWordSoundsWord, null, 0.5),
                    className:
                      "flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 font-medium transition-all",
                    title: t("common.slow_playback"),
                  },
                  ts("word_sounds.spelling_bee_slow"),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex gap-2 justify-center flex-wrap" },
                currentWordSoundsWord?.split("").map((letter, idx) => {
                  const hasInput = userAnswer?.[idx];
                  const isCorrect =
                    hasInput &&
                    userAnswer[idx]?.toLowerCase() === letter.toLowerCase();
                  const isWrong = hasInput && !isCorrect;
                  return /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: idx,
                      className: `w-11 h-13 border-2 rounded-lg flex items-center justify-center text-xl font-bold uppercase transition-all ${isCorrect ? "border-green-400 bg-green-50 text-green-700 scale-105" : isWrong ? "border-rose-400 bg-rose-50 text-rose-600 animate-pulse" : "border-slate-200 bg-slate-50 text-slate-600"}`,
                    },
                    userAnswer?.[idx]?.toUpperCase() || "_",
                  );
                }),
              ),
              userAnswer &&
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-sm text-slate-600" },
                correctCount,
                "/",
                currentWordSoundsWord?.length,
                " letters correct",
              ),
              useMicInput
                ? renderVoiceInputOverlay("Say the letters or word!")
                : /*#__PURE__*/ React.createElement("input", {
                  "aria-label": t("common.enter_user_answer"),
                  type: "text",
                  inputMode: "text",
                  value: userAnswer || "",
                  onChange: (e) => {
                    setUserAnswer(e.target.value);
                    setWordSoundsFeedback(null);
                  },
                  onKeyDown: (e) => e.key === "Enter" && checkSpellingBee(),
                  placeholder: t("common.placeholder_type_the_word"),
                  maxLength: currentWordSoundsWord?.length || 20,
                  className:
                    "w-full max-w-xs px-4 py-3 text-center text-xl font-bold border-2 border-amber-600 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none",
                  autoFocus: true,
                }),
              /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.voice_input"),
                    onClick: checkSpellingBee,
                    disabled: !userAnswer,
                    className: `px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${userAnswer ? "bg-amber-500 hover:bg-amber-700 text-white hover:scale-105" : "bg-slate-200 text-slate-600 cursor-not-allowed"}`,
                  },
                  ts("word_sounds.spelling_bee_check") || "Check Spelling ✓",
                ),
              /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "mt-2" },
                /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.microphone"),
                      onClick: handleMicInput,
                      className: `flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${useMicInput ? "bg-rose-100 text-rose-700 font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
                    },
                  /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                    " ",
                    useMicInput
                      ? ts("word_sounds.mic_switch_typing") || "Switch to Typing"
                      : ts("word_sounds.mic_switch_mic") || "Use Microphone",
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex gap-4 text-sm" },
                /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () =>
                        setUserAnswer(currentWordSoundsWord?.[0] || ""),
                      className: "text-amber-600 hover:text-amber-700 underline",
                    },
                    ts("word_sounds.spelling_bee_first_letter") || "Hint: first letter",
                  ),
                /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () => {
                        const word = currentWordSoundsWord || "";
                        const vowels = "aeiou";
                        const current = userAnswer?.toLowerCase() || "";
                        const vowelHint = word
                          .split("")
                          .map((ch) =>
                            vowels.includes(ch.toLowerCase()) ? ch : "_",
                          )
                          .join("");
                        if (
                          current === vowelHint.toLowerCase() ||
                          (current.length > 0 && !current.includes("_"))
                        ) {
                          // Already have vowels or typed answer — fill consonants one at a time
                          const base = vowelHint.split("");
                          const filled = word.split("").map((ch, i) => {
                            if (base[i] !== "_") return base[i];
                            if (current[i] && current[i] !== "_") return current[i];
                            return "_";
                          });
                          // Reveal ONE more consonant
                          const nextBlank = filled.indexOf("_");
                          if (nextBlank >= 0) filled[nextBlank] = word[nextBlank];
                          setUserAnswer(filled.join(""));
                        } else {
                          setUserAnswer(vowelHint);
                        }
                      },
                      className: "text-slate-600 hover:text-slate-600 underline",
                    },
                    userAnswer && userAnswer.includes("_")
                      ? ts("word_sounds.spelling_bee_hint_more") || "💡 Show More"
                      : ts("word_sounds.spelling_bee_hint_vowels") ||
                      "💡 Show Vowels",
                  ),
                ),
            );
          }
          case "word_scramble": {
            const checkScramble = () => {
              const correct =
                userAnswer?.toLowerCase().trim() ===
                currentWordSoundsWord?.toLowerCase();
              if (correct) {
                setWordSoundsFeedback({
                  type: "correct",
                  message:
                    ts("word_sounds.scramble_correct") || "🎉 Unscrambled!",
                });
                setTimeout(() => {
                  if (!isMountedRef.current) return;
                  setUserAnswer("");
                  setUsedScrambleIndices([]);
                  checkAnswer("correct", "correct");
                }, 1500);
              } else {
                setWordSoundsFeedback({
                  type: "incorrect",
                  message:
                    ts("word_sounds.scramble_try_again") ||
                    "Not quite! Try again 🔀",
                });
                setUserAnswer("");
                setUsedScrambleIndices([]);
                checkAnswer("incorrect", "correct");
              }
            };
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col items-center gap-5 p-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-4xl mb-2" },
                  "\uD83D\uDD00",
                ),
                /*#__PURE__*/ React.createElement(
                  "h3",
                  { className: "text-lg font-bold text-violet-700" },
                  ts("word_sounds.word_scramble_title"),
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  { className: "text-sm text-violet-600" },
                  ts("word_sounds.word_scramble_subtitle"),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  // Was t("common.volume") ("Volume") — wrong identity for a
                  // control that plays the target word.
                  "aria-label": t("common.play_word") || "Play word",
                  onClick: () => handleAudio(currentWordSoundsWord),
                  className:
                    "flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 rounded-full text-violet-700 font-medium transition-all",
                },
                /*#__PURE__*/ React.createElement(Volume2, { size: 18 }),
                ts("word_sounds.word_scramble_hint"),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex gap-2 justify-center flex-wrap" },
                scrambledLetters.map((letter, idx) => {
                  const isUsed = usedScrambleIndices.includes(idx);
                  const pickLetter = () => {
                    if (isUsed) return;
                    setUserAnswer((prev) => (prev || "") + letter);
                    setUsedScrambleIndices((prev) => [...prev, idx]);
                  };
                  return /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: idx,
                      role: "button",
                      tabIndex: isUsed ? -1 : 0,
                      "aria-disabled": isUsed,
                      "aria-label": letter.toUpperCase(),
                      className: `w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold uppercase shadow-md transition-all ${isUsed ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed opacity-50" : "border-violet-300 bg-violet-50 text-violet-700 hover:scale-105 cursor-pointer"}`,
                      onClick: pickLetter,
                      onKeyDown: (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pickLetter();
                        }
                      },
                    },
                    letter.toUpperCase(),
                  );
                }),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex gap-1 justify-center" },
                currentWordSoundsWord
                  ?.split("")
                  .map((_, idx) =>
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: idx,
                      className: `w-10 h-12 border-2 rounded flex items-center justify-center text-lg font-bold uppercase ${userAnswer?.[idx] ? "border-violet-400 bg-violet-100 text-violet-700" : "border-slate-200 bg-white"}`,
                    },
                    userAnswer?.[idx]?.toUpperCase() || "",
                  ),
                  ),
              ),
              useMicInput
                ? renderVoiceInputOverlay("Say the un-scrambled word!")
                : /*#__PURE__*/ React.createElement("input", {
                  "aria-label": t("common.enter_user_answer"),
                  type: "text",
                  value: userAnswer || "",
                  onChange: (e) => {
                    setUserAnswer(e.target.value);
                    setWordSoundsFeedback(null);
                  },
                  onKeyDown: (e) => e.key === "Enter" && checkScramble(),
                  placeholder: t("common.placeholder_type_or_tap_letters"),
                  maxLength: currentWordSoundsWord?.length || 20,
                  className:
                    "w-full max-w-xs px-4 py-3 text-center text-xl font-bold border-2 border-violet-600 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none",
                  autoFocus: true,
                }),
              /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex gap-3" },
                  !useMicInput &&
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () => {
                        setUserAnswer("");
                        setUsedScrambleIndices([]);
                      },
                      className:
                        "px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-all",
                    },
                    ts("word_sounds.word_scramble_clear") || "Clear",
                  ),
                /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.voice_input"),
                      onClick: checkScramble,
                      disabled: !userAnswer,
                      className: `px-6 py-2 rounded-lg font-bold shadow-md transition-all ${userAnswer ? "bg-violet-500 hover:bg-violet-600 text-white hover:scale-105" : "bg-slate-200 text-slate-600 cursor-not-allowed"}`,
                    },
                    ts("word_sounds.word_scramble_check"),
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "mt-2" },
                /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.microphone"),
                      onClick: handleMicInput,
                      className: `flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${useMicInput ? "bg-rose-100 text-rose-700 font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
                    },
                  /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                    " ",
                    useMicInput
                      ? ts("word_sounds.mic_switch_typing") || "Switch to Typing"
                      : ts("word_sounds.mic_switch_mic") || "Use Microphone",
                  ),
                ),
            );
          }
          case "missing_letter": {
            const checkMissingLetter = () => {
              const correct =
                userAnswer?.toLowerCase().trim() === correctLetter;
              if (correct) {
                setWordSoundsFeedback({
                  type: "correct",
                  message:
                    ts("word_sounds.ml_correct") || "🎉 Correct letter!",
                });
                setTimeout(() => {
                  if (!isMountedRef.current) return;
                  setUserAnswer("");
                  checkAnswer("correct", "correct");
                }, 1500);
              } else {
                // Escalate on THIS item's tries (the per-item `attempts`
                // state), not the session-wide error count — a child who
                // missed twice earlier in the session used to get the answer
                // revealed on their FIRST miss of a fresh item. And never
                // auto-fill the answer: showing it while requiring the child
                // to type it keeps the interaction without granting free,
                // recorded-as-correct credit for no discrimination.
                const itemTries = attempts;
                const position = (hiddenIndex || 0) + 1;
                if (itemTries >= 1) {
                  setWordSoundsFeedback({
                    type: "incorrect",
                    message:
                      ts("word_sounds.ml_hint_position", { n: position }) ||
                      `🔍 Hint: It's letter #${position} in the word. Listen carefully!`,
                  });
                } else {
                  setWordSoundsFeedback({
                    type: "incorrect",
                    message:
                      ts("word_sounds.ml_try_again") ||
                      "Not quite! Listen again 🔊",
                  });
                }
                handleAudio(currentWordSoundsWord);
                checkAnswer("incorrect", "correct");
              }
            };
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col items-center gap-5 p-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-4xl mb-2" },
                  "\u2753",
                ),
                /*#__PURE__*/ React.createElement(
                  "h3",
                  { className: "text-lg font-bold text-emerald-700" },
                  ts("word_sounds.missing_letter_title"),
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  { className: "text-sm text-emerald-600" },
                  ts("word_sounds.missing_letter_subtitle"),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": ts("word_sounds.missing_letter_hear") || "Hear the word",
                  onClick: () => handleAudio(currentWordSoundsWord),
                  className:
                    "flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 rounded-full text-emerald-700 font-medium transition-all",
                },
                /*#__PURE__*/ React.createElement(Volume2, { size: 18 }),
                ts("word_sounds.missing_letter_hear") || "Hear the word",
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex gap-1 justify-center flex-wrap" },
                currentWordSoundsWord
                  ?.split("")
                  .map((letter, idx) =>
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: idx,
                      className: `w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold uppercase ${idx === hiddenIndex ? "border-emerald-400 bg-emerald-50 text-emerald-700 border-dashed" : "border-slate-200 bg-white text-slate-700"}`,
                    },
                    idx === hiddenIndex
                      ? userAnswer?.toUpperCase() || "?"
                      : letter.toUpperCase(),
                  ),
                  ),
              ),
              useMicInput
                ? renderVoiceInputOverlay("Say the missing letter!")
                : /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex gap-3 justify-center flex-wrap" },
                  letterOptions.map((letter, idx) =>
                      /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      key: idx,
                      onClick: () => {
                        setUserAnswer(letter);
                        setWordSoundsFeedback(null);
                      },
                      className: `w-14 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-bold uppercase transition-all hover:scale-110 ${userAnswer?.toLowerCase() === letter ? "border-emerald-500 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`,
                    },
                    letter.toUpperCase(),
                  ),
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.voice_input"),
                    onClick: checkMissingLetter,
                    disabled: !userAnswer,
                    className: `px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${userAnswer ? "bg-emerald-500 hover:bg-emerald-700 text-white hover:scale-105" : "bg-slate-200 text-slate-600 cursor-not-allowed"}`,
                  },
                  "Check Answer \u2713",
                ),
              /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "mt-4" },
                /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.microphone"),
                      onClick: handleMicInput,
                      className: `flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${useMicInput ? "bg-rose-100 text-rose-700 font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
                    },
                  /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                    " ",
                    useMicInput
                      ? ts("word_sounds.mic_switch_tapping") ||
                      "Switch to Tapping"
                      : ts("word_sounds.mic_switch_mic") || "Use Microphone",
                  ),
                ),
            );
          }
          case "manipulation": {
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col gap-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(ManipulationView, {
                data: {
                  ...manipulationState,
                  options: manipulationOptions,
                },
                isLoading: isGeneratingManipulation && !manipulationOptions.length,
                highlightedIndex: highlightedManipIndex,
                showLetterHints: showLetterHints,
                onPlayAudio: handleAudio,
                isEditing: isEditing,
                onUpdateOption: handleOptionUpdate,
                isAudioBusy: isPlayingAudio,
                optionImages: aacMode ? optionImages : null,
                onCheckAnswer: (ans) => {
                  const isCorrect =
                    ans?.toLowerCase() ===
                    manipulationState?.answer?.toLowerCase();
                  checkAnswer(isCorrect ? "correct" : "incorrect", "correct");
                },
              }),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.voice_input"),
                  onClick: handleMicInput,
                  className:
                    "mx-auto flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors",
                },
                /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                " Use Microphone",
              ),
            );
          }
          case "syllable_blending": {
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col gap-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(SyllableBlendingView, {
                data: syllableData,
                isLoading: isGeneratingSyllable && !syllableData,
                highlightedSyllableIndex: highlightedSyllableIndex,
                highlightedOptionIndex: highlightedSyllableOptionIndex,
                showLetterHints: showLetterHints,
                onPlayAudio: handleAudio,
                isEditing: isEditing,
                onUpdateOption: handleOptionUpdate,
                isAudioBusy: isPlayingAudio,
                optionImages: aacMode ? optionImages : null,
                onCheckAnswer: (ans) => {
                  const word =
                    currentWordSoundsWord || wordSoundsPhonemes?.word || "";
                  const isCorrect =
                    ans?.toLowerCase() === word.toLowerCase();
                  checkAnswer(isCorrect ? "correct" : "incorrect", "correct");
                },
              }),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.voice_input"),
                  onClick: handleMicInput,
                  className:
                    "mx-auto flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors",
                },
                /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                " Use Microphone",
              ),
            );
          }
          case "syllable_counting": {
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col gap-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(SyllableCountingView, {
                data: syllableData,
                isLoading: isGeneratingSyllable && !syllableData,
                tapCount: syllableTapCount,
                onTap: () => setSyllableTapCount((prev) => prev + 1),
                onReset: () => setSyllableTapCount(0),
                onPlayAudio: handleAudio,
                isAudioBusy: isPlayingAudio,
                word: currentWordSoundsWord || wordSoundsPhonemes?.word || "",
                onCheckAnswer: (taps) => {
                  const correct = syllableData?.count || 1;
                  const isCorrect = taps === correct;
                  checkAnswer(isCorrect ? "correct" : "incorrect", "correct");
                },
              }),
            );
          }
          case "rhyming": {
            if (useMicInput) {
              return /*#__PURE__*/ React.createElement(
                "div",
                { className: "space-y-6 mt-4" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-center" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "inline-block px-6 py-3 bg-violet-100 rounded-full text-violet-800 font-bold text-lg mb-4",
                    },
                    (ts("word_sounds.rhymes_with") || "rhymes with") +
                      ' "' +
                      currentWordSoundsWord +
                      '"',
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex flex-col items-center gap-4 animate-in fade-in",
                  },
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      "aria-label": t("common.voice_input"),
                      onClick: handleMicInput,
                      className: `w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all ${isListening ? "bg-rose-700 text-white scale-110 ring-4 ring-rose-200 animate-pulse" : "bg-white text-slate-600 border-4 border-slate-100 hover:border-violet-200 hover:text-violet-500"}`,
                    },
                    /*#__PURE__*/ React.createElement(Mic, { size: 40 }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className:
                        "font-bold text-slate-600 min-h-[1.5em] text-lg",
                    },
                    isListening
                      ? ts("word_sounds.listening") || "Listening..."
                      : userAnswer ||
                      ts("word_sounds.tap_to_speak") ||
                      "Tap to Speak",
                  ),
                ),
              );
            }
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex flex-col gap-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(RhymeView, {
                data: {
                  word: currentWordSoundsWord,
                  rhymeWord: wordSoundsPhonemes?.rhymeWord,
                  options: rhymeOptions,
                },
                highlightedIndex: highlightedRhymeIndex,
                showLetterHints: showLetterHints,
                onPlayAudio: handleAudio,
                isEditing: isEditing,
                onUpdateOption: handleOptionUpdate,
                isAudioBusy: isPlayingAudio,
                optionImages: aacMode ? optionImages : null,
                onCheckAnswer: (ans) => {
                  const _a = (ans || "").toLowerCase().trim();
                  const _rw = (
                    wordSoundsPhonemes?.rhymeWord || ""
                  ).toLowerCase();
                  const _tw = (currentWordSoundsWord || "").toLowerCase();
                  // Same rime extraction as the option-builder's getRime:
                  // last vowel group + coda ("cat" → "at", "train" → "ain").
                  const _rimeOf = (w) => {
                    const vowels = "aeiou";
                    let rimeStart = w.length;
                    for (let i = w.length - 1; i >= 0; i--) {
                      if (vowels.includes(w[i])) {
                        rimeStart = i;
                        while (i > 0 && vowels.includes(w[i - 1])) i--;
                        rimeStart = i;
                        break;
                      }
                    }
                    return w.slice(rimeStart);
                  };
                  // Accept the designated rhymeWord OR any pick that genuinely
                  // shares the target's rime — fallback option pools aren't
                  // rime-filtered, and words with an empty rhymeWord otherwise
                  // made this item unanswerable (every response scored wrong).
                  const isRhyme =
                    (_rw && _a === _rw) ||
                    (_a &&
                      _tw &&
                      _a !== _tw &&
                      _rimeOf(_a).length >= 2 &&
                      _rimeOf(_a) === _rimeOf(_tw));
                  checkAnswer(isRhyme ? "correct" : "incorrect", "correct");
                },
              }),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.voice_input"),
                  onClick: handleMicInput,
                  className:
                    "mx-auto flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors",
                },
                /*#__PURE__*/ React.createElement(Mic, { size: 20 }),
                " Use Microphone",
              ),
            );
          }
          case "sound_sort": {
            const targetWord = (currentWordSoundsWord || "").toLowerCase();
            if (!targetWord || targetWord.length < 2) return null;
            const _ssPre = soundSortPreloadRef.current;
            const _ssItem = (_ssPre && _ssPre.word === targetWord && _ssPre.item)
              ? _ssPre.item
              : computeSoundSortItem(targetWord, wordSoundsPhonemes && wordSoundsPhonemes.phonemes, wordSoundsPhonemes && wordSoundsPhonemes.soundSortMatches);
            if (!_ssItem) return null;
            // PIN the item on first compute: on the non-preloaded path the AI
            // sort data lands asynchronously mid-play — recomputing per-render
            // could flip first/last (remounting the board via key= and wiping
            // foundWords) and desync from the already-spoken instruction.
            if (!(_ssPre && _ssPre.word === targetWord && _ssPre.item)) {
              soundSortPreloadRef.current = { word: targetWord, item: _ssItem };
            }
            const mode = _ssItem.mode;
            const targetPhoneme = _ssItem.targetChar;
            const difficulty = _ssItem.difficulty;
            const selectedMatches = _ssItem.options;
            const selectedDistractors = _ssItem.distractors;
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-4" },
              /*#__PURE__*/ React.createElement(WordFamiliesView, {
                key: `${targetWord}-${mode}`,
                data: {
                  family:
                    mode === "first"
                      ? `Starts with ${targetPhoneme}`
                      : `Ends with ${targetPhoneme}`,
                  mode: mode,
                  difficulty: difficulty,
                  targetChar: targetPhoneme,
                  targetWord: targetWord,
                  options: selectedMatches,
                  distractors: selectedDistractors,
                },
                // Word Families already passes this; Sound Sort omitted it, so
                // sound-only sessions still showed printed words (solvable by
                // first letter) and history logged mode:"sound_only" wrongly.
                // The global letters toggle (👁️) also reveals — one mental
                // model across all activities; the local toggle still works.
                soundOnlyMode: !showWordText && !showLetterHints,
                onPlayAudio: handleAudio,
                onUpdateOption: (i, v, type) =>
                  handleOptionUpdate(i, v, type, {
                    activity: "sound_sort",
                    options: selectedMatches,
                    distractors: selectedDistractors,
                    mode: mode,
                    target: targetPhoneme,
                  }),
                isEditing: isEditing,
                // Full-instruction replay — mirrors the auto-playback sequence
                // that runs on first load (instruction prompt → target sound →
                // "as in" → target word). The old replay button only played
                // `data.targetChar`, so a student who needed to hear the task
                // again could only replay the sound, not the "find words that
                // start with the /s/ sound" guidance.
                onPlayInstruction: async () => {
                  try {
                    const isoMode = mode;
                    const bank = (typeof window !== 'undefined' && window.__ALLO_INSTRUCTION_AUDIO) || {};
                    const promptKey = isoMode === 'first' ? 'sound_match_start' : 'sound_match_end';
                    if (bank[promptKey]) {
                      await handleAudio(bank[promptKey]);
                      await new Promise((r) => setTimeout(r, 200));
                    } else {
                      // No phoneme embedded in the TTS sentence — TTS reads a
                      // bare "b" as the letter name. The sound itself plays
                      // from the phoneme bank on the next line.
                      await handleAudio(
                        isoMode === 'first'
                          ? `Find words that start with the sound`
                          : `Find words that end with the sound`,
                      );
                      await new Promise((r) => setTimeout(r, 200));
                    }
                    await handleAudio(targetPhoneme);
                    if (targetWord) {
                      await new Promise((r) => setTimeout(r, 150));
                      if (bank['as_in']) {
                        await handleAudio(bank['as_in']);
                      } else {
                        await handleAudio('as in');
                      }
                      await new Promise((r) => setTimeout(r, 100));
                      await handleAudio(targetWord);
                    }
                  } catch (e) {
                    warnLog('Replay instruction failed:', e && e.message);
                  }
                },
                onCheckAnswer: (result) => {
                  // Find-all board: allow one exploratory wrong tap per
                  // distractor before the item finalizes (the instruction
                  // invites tapping words to hear them).
                  checkAnswer(result, "correct", {
                    maxAttempts: Math.max(
                      2,
                      (selectedDistractors || []).length + 1,
                    ),
                  });
                },
                showLetterHints: showLetterHints,
              }),
            );
          }
          case "letter_tracing": {
            const firstLetter = currentWordSoundsWord
              ? currentWordSoundsWord.charAt(0)
              : "a";
            const isLowercaseBonus = tracingPhase === "lower";
            const displayLetter = isLowercaseBonus
              ? firstLetter.toLowerCase()
              : firstLetter.toUpperCase();
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-6" },
              renderPrompt(),
              isLowercaseBonus &&
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex flex-col items-center justify-center gap-1 animate-in fade-in",
                },
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex items-center gap-2" },
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-4xl animate-pulse" },
                    "\u2B50",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className:
                        "text-2xl font-black text-emerald-600 tracking-wide",
                    },
                    "Bonus!",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-4xl animate-pulse" },
                    "\u2B50",
                  ),
                ),
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex items-center gap-2 text-slate-600" },
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-2xl" },
                    firstLetter.toUpperCase(),
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-lg" },
                    "\u2192",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-2xl font-bold text-violet-600" },
                    firstLetter.toLowerCase(),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(LetterTraceView, {
                key: `trace-${displayLetter}-${tracingPhase}`,
                letter: displayLetter,
                word: currentWordSoundsWord,
                onComplete: (success, formationScore) => {
                  if (success) {
                    playSound("success");
                    if (!isLowercaseBonus) {
                      if (
                        typeof window.__ALLO_INSTRUCTION_AUDIO !==
                        "undefined" &&
                        window.__ALLO_INSTRUCTION_AUDIO["fb_great_job"]
                      ) {
                        handleAudio(
                          window.__ALLO_INSTRUCTION_AUDIO["fb_great_job"],
                        );
                      }
                      setTimeout(() => {
                        if (!isMountedRef.current) return;
                        if (
                          typeof window.__ALLO_INSTRUCTION_AUDIO !==
                          "undefined" &&
                          window.__ALLO_INSTRUCTION_AUDIO["now_try_lowercase"]
                        ) {
                          handleAudio(
                            window.__ALLO_INSTRUCTION_AUDIO[
                            "now_try_lowercase"
                            ],
                          );
                        }
                        setTracingPhase("lower");
                      }, 1200);
                    } else {
                      if (
                        typeof window.__ALLO_INSTRUCTION_AUDIO !==
                        "undefined" &&
                        window.__ALLO_INSTRUCTION_AUDIO["fb_amazing"]
                      ) {
                        handleAudio(
                          window.__ALLO_INSTRUCTION_AUDIO["fb_amazing"],
                        );
                      }
                      setTimeout(() => {
                        if (!isMountedRef.current) return;
                        setTracingPhase("upper");
                        checkAnswer("correct", "correct", { formationScore });
                      }, 1000);
                    }
                  }
                },
              }),
              isLowercaseBonus &&
                /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: () => {
                    setTracingPhase("upper");
                    checkAnswer("correct", "correct");
                  },
                  className:
                    "text-sm text-slate-600 hover:text-slate-600 underline transition-colors",
                },
                "Skip lowercase \u2192",
              ),
            );
          }
          case "counting": {
            const count =
              wordSoundsPhonemes?.phonemeCount ||
              wordSoundsPhonemes?.phonemes?.length ||
              0;
            const expectedCount = count >= 11 ? "11+" : count;
            const numberOptions = Array.from({ length: 10 }, (_, i) => i + 1);
            const handleCountDrop = (e) => {
              e.preventDefault();
              if (!draggedItem) return;
              const { item } = draggedItem;
              const val = item === 11 || item === "11+" ? "11+" : parseInt(item);
              checkAnswer(val, expectedCount);
              setDraggedItem(null);
            };
            const handleCountKeyDown = (e, num) => {
              // role="button" must activate on Space as well as Enter.
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                checkAnswer(num === 11 ? "11+" : num, expectedCount);
              }
            };
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-6" },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center justify-center mb-4 flex-wrap",
                },
                /*#__PURE__*/ React.createElement(
                  "h3",
                  { className: "text-xl font-bold text-violet-700 mb-2" },
                  ts("word_sounds.how_many_sounds"),
                ),
              ),
              renderPrompt(),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "mx-auto w-48 h-48 rounded-3xl border-4 border-dashed border-violet-300 bg-violet-50 flex flex-col items-center justify-center mb-8 transition-all relative overflow-hidden",
                  onDragOver: handleDragOver,
                  onDrop: handleCountDrop,
                  style: {
                    borderColor: draggedItem ? "#8b5cf6" : undefined,
                    transform: draggedItem ? "scale(1.05)" : "scale(1)",
                    backgroundColor: draggedItem ? "#f5f3ff" : undefined,
                  },
                },
                draggedItem &&
                  /*#__PURE__*/ React.createElement("div", {
                  className:
                    "absolute inset-0 bg-violet-200/20 animate-pulse pointer-events-none",
                }),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-center pointer-events-none p-4 z-10" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "mb-3 text-violet-500" },
                    /*#__PURE__*/ React.createElement(Calculator, {
                      size: 48,
                      className: "mx-auto opacity-50",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-white/80 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-violet-600 shadow-sm border border-violet-100",
                    },
                    draggedItem
                      ? ts("word_sounds.counting_drop")
                      : ts("word_sounds.how_many_sounds"),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex justify-center flex-wrap gap-4" },
                numberOptions.map((num) =>
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    key: num,
                    draggable: true,
                    role: "button",
                    onDragStart: (e) => handleDragStart(e, num, "number"),
                    onKeyDown: (e) => handleCountKeyDown(e, num),
                    tabIndex: 0,
                    onClick: () => checkAnswer(num, expectedCount),
                    className:
                      "w-16 h-16 rounded-2xl bg-white border-b-4 border-violet-200 text-violet-700 font-black text-2xl flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 hover:bg-violet-50 hover:border-violet-400 transition-all cursor-grab active:cursor-grabbing",
                    "aria-label": (ts("word_sounds.sr_number") || "Number ") + num,
                  },
                  num,
                ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    draggable: true,
                    role: "button",
                    onDragStart: (e) => handleDragStart(e, 11, "number"),
                    onKeyDown: (e) => handleCountKeyDown(e, 11),
                    tabIndex: 0,
                    onClick: () => checkAnswer("11+", expectedCount),
                    className:
                      "w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border-b-4 border-purple-300 text-purple-700 font-black text-lg flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 hover:bg-purple-50 hover:border-purple-400 transition-all cursor-grab active:cursor-grabbing",
                    "aria-label": t("common.11_or_more_sounds"),
                  },
                  "11+",
                ),
              ),
            );
          }
          case "word_families": {
            const targetWord = currentWordSoundsWord?.toLowerCase() || "";
            const aiRimeData = wordSoundsPhonemes?.rimeFamilyMembers;
            const _wfPre = wordFamilyRimeRef.current;
            const _wf = (_wfPre && _wfPre.word === targetWord) ? _wfPre : resolveWordFamilyRime(targetWord, aiRimeData);
            let targetRime = _wf.rime;
            let familyMembers = (_wf.members || []).slice();
            const rimeWordLen = targetWord.length;
            const rimeDifficulty =
              rimeWordLen <= 3 ? "easy" : rimeWordLen <= 4 ? "medium" : "hard";
            const rimeMemberLimit =
              rimeDifficulty === "easy"
                ? 3
                : rimeDifficulty === "medium"
                  ? 4
                  : 5;
            const rimeDistractorLimit =
              rimeDifficulty === "easy"
                ? 2
                : rimeDifficulty === "medium"
                  ? 3
                  : 4;
            const wfSeed =
              targetWord
                .split("")
                .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 17;
            const wfRng = ((s) => {
              let x = s;
              return () => {
                x = Math.sin(x) * 10000;
                return x - Math.floor(x);
              };
            })(wfSeed);
            const wfShuffle = (arr) => [...arr].sort(() => wfRng() - 0.5);
            // Teacher-edited board: use the lists verbatim — no reshuffle, no
            // slicing, no adjacent-family distractor pool.
            const _wfTeacher = !!(aiRimeData && aiRimeData.teacherEdited);
            const selectedMembers = _wfTeacher
              ? familyMembers.slice(0, 8)
              : wfShuffle(familyMembers).slice(0, rimeMemberLimit);
            const rimeKeys = Object.keys(RIME_FAMILIES);
            const currentRimeIdx = rimeKeys.indexOf(targetRime);
            const adjacentRimes = rimeKeys.filter(
              (r) =>
                r !== targetRime &&
                (r[0] === targetRime[0] ||
                  Math.abs(rimeKeys.indexOf(r) - currentRimeIdx) <= 3),
            );
            let distractorPool = [];
            for (const adjRime of wfShuffle(adjacentRimes).slice(0, 4)) {
              const adjMembers = RIME_FAMILIES[adjRime] || [];
              distractorPool.push(...adjMembers.slice(0, 3));
            }
            distractorPool = distractorPool.filter(
              (w) => !w.endsWith(targetRime),
            );
            const selectedDistractors = _wfTeacher
              ? (aiRimeData.distractors || []).filter((w) => w != null).slice(0, 8)
              : wfShuffle(distractorPool).slice(0, rimeDistractorLimit);
            return /*#__PURE__*/ React.createElement(
              "div",
              { className: "space-y-4" },
              renderPrompt(),
              /*#__PURE__*/ React.createElement(WordFamiliesView, {
                key: `wf-${targetWord}`,
                data: {
                  family: `-${targetRime} family`,
                  mode: "rime",
                  difficulty: rimeDifficulty,
                  targetChar: targetRime,
                  targetWord: targetWord,
                  options: selectedMembers,
                  distractors: selectedDistractors,
                },
                isEditing: isEditing,
                onCheckAnswer: (result) =>
                  checkAnswer(
                    result === "correct" ? currentWordSoundsWord : null,
                    currentWordSoundsWord,
                    // Find-all board: one exploratory wrong tap per distractor
                    // before the item finalizes (instruction invites tapping).
                    {
                      maxAttempts: Math.max(
                        2,
                        (selectedDistractors || []).length + 1,
                      ),
                    },
                  ),
                onPlayAudio: (w) => handleAudio(w),
                // Replay = instruction clip + WHICH family (the in-card
                // fallback previously played only the bare rime with no
                // framing, and the header replay omitted the rime entirely).
                onPlayInstruction: async () => {
                  try {
                    const bank =
                      (typeof window !== "undefined" &&
                        window.__ALLO_INSTRUCTION_AUDIO) ||
                      {};
                    if (bank["inst_word_families"]) {
                      await handleAudio(bank["inst_word_families"]);
                      await new Promise((r) => setTimeout(r, 200));
                    } else {
                      await handleAudio("Find all the words in the family");
                      await new Promise((r) => setTimeout(r, 200));
                    }
                    await handleAudio(targetRime);
                  } catch (e) {
                    warnLog("WF replay instruction failed:", e);
                  }
                },
                onUpdateOption: (i, v, type) =>
                  handleOptionUpdate(i, v, type, {
                    activity: "word_families",
                    options: selectedMembers,
                    distractors: selectedDistractors,
                    rime: targetRime,
                  }),
                showLetterHints: showLetterHints,
                // Global letters toggle reveals here too (see Sound Sort note).
                soundOnlyMode: !showWordText && !showLetterHints,
              }),
            );
          }
          case "decoding": {
            const dWord = currentWordSoundsWord || "";
            // Require ≥2 choices: the [dWord] fallback could render a
            // one-card grid where tapping the only picture scores correct
            // with zero discrimination (image-cache timing window).
            const dChoices = (decodingChoices && decodingChoices.length >= 2) ? decodingChoices : [];
            const imgFor = (w) => { const lc = (w || "").toLowerCase(); const pe = (wordPool || []).find((p) => p.word === lc); return optionImages[w] || optionImages[lc] || preparedImageLibrary[lc] || (pe && pe.image) || null; };
            const dSrc = (img) => (typeof img === "string" && (img.startsWith("data:") || img.startsWith("http"))) ? img : ("data:image/png;base64," + img);
            const dAnyImg = dChoices.some((w) => imgFor(w));
            // Only reveal the grid when EVERY choice has its picture, so a card
            // can never be picked out by "the one that already loaded" (which
            // would let a child win without decoding the printed word).
            const dAllReady = dChoices.length > 0 && dChoices.every((w) => imgFor(w));
            // Pass the real words; checkAnswer scores correctness and (for
            // decoding) suppresses re-speaking the printed target.
            const dCheck = (w) => checkAnswer((w || ""), dWord);
            // Name each picture by what it depicts so the activity is operable
            // with a screen reader (WCAG 1.1.1). AT-only: the generated images
            // carry no visible text, so a sighted/low-vision learner still has
            // to decode the printed word to choose; only a non-visual user gets
            // the names, for whom the picture-match was otherwise impossible.
            const dChoiceName = (w) => ts("word_sounds.decoding_choice_of", { word: w }) || ("Picture of " + (w || ""));
            return /*#__PURE__*/ React.createElement("div", { className: "flex flex-col items-center gap-5 p-4" },
              /*#__PURE__*/ React.createElement("p", { className: "text-xs font-semibold text-violet-600 uppercase tracking-wide" }, ts("word_sounds.decoding_drag_prompt") || "Drag the picture onto the word, or tap the picture"),
              /*#__PURE__*/ React.createElement("div", { onDragOver: (e) => { e.preventDefault(); if (!decodeDragOver) setDecodeDragOver(true); }, onDragLeave: () => setDecodeDragOver(false), onDrop: (e) => { e.preventDefault(); setDecodeDragOver(false); const _dw = e.dataTransfer.getData("text/plain"); if (_dw) dCheck(_dw); }, className: "text-5xl font-black tracking-wide capitalize px-6 py-3 rounded-2xl border-2 border-dashed transition-colors " + (decodeDragOver ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-400 text-slate-800") }, dWord),
              (!dAnyImg && typeof callImagen !== "function")
                ? /*#__PURE__*/ React.createElement("p", { className: "text-amber-700 text-sm font-semibold" }, ts("word_sounds.decoding_needs_image") || "Picture matching needs image generation (open in Canvas).")
                : !dAllReady
                  ? /*#__PURE__*/ React.createElement("p", { className: "text-slate-500 text-sm font-semibold italic" }, ts("word_sounds.decoding_preparing") || "Preparing pictures...")
                  : /*#__PURE__*/ React.createElement("div", { className: "grid grid-cols-2 gap-4 max-w-md w-full" },
                      ...dChoices.map((w, i) => { const img = imgFor(w); const _cn = dChoiceName(w); return /*#__PURE__*/ React.createElement("button", { key: "dc-" + i + "-" + w, draggable: !!img, onDragStart: (e) => { e.dataTransfer.setData("text/plain", w); e.dataTransfer.effectAllowed = "move"; }, onDragEnd: () => setDecodeDragOver(false), onClick: () => dCheck(w), className: "aspect-square bg-white border-2 border-slate-200 rounded-2xl shadow-md hover:border-violet-400 hover:scale-105 transition-all flex items-center justify-center p-2 cursor-grab active:cursor-grabbing", "aria-label": _cn },
                        /*#__PURE__*/ React.createElement("img", { src: dSrc(img), alt: _cn, draggable: false, className: "w-full h-full object-contain rounded-xl pointer-events-none" }));
                      }),
                    ),
            );
          }
          default:
            return null;
        }
      };
      const accuracy =
        wordSoundsScore.total > 0
          ? Math.round((wordSoundsScore.correct / wordSoundsScore.total) * 100)
          : 0;
      const closeSessionDialog = () => {
        setShowSessionComplete(false);
        onClose();
      };
      if (showProbeResults) return renderProbeResults();
      if (showSessionComplete) {
        const streakEmoji =
          wordSoundsStreak >= 5 ? "🔥" : wordSoundsStreak >= 3 ? "⚡" : "✨";
        return /*#__PURE__*/ React.createElement(
          "div",
          {
            ref: sessionCompleteDialogRef,
            className:
              "fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in zoom-in duration-300",
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "word-sounds-session-complete-title",
            onKeyDown: (event) => handleDialogKeyDown(event, closeSessionDialog),
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto text-white",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "p-8 text-center" },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-6xl mb-4 animate-bounce" },
                accuracy >= 90
                  ? "🏆"
                  : accuracy >= 70
                    ? "🎉"
                    : accuracy >= 50
                      ? "⭐"
                      : "💪",
              ),
              /*#__PURE__*/ React.createElement(
                "h2",
                {
                  id: "word-sounds-session-complete-title",
                  tabIndex: -1,
                  "data-dialog-initial-focus": "true",
                  className: "text-3xl font-black mb-2",
                },
                isParentMode
                  ? (accuracy >= 80
                    ? ts("word_sounds.parent_amazing") || "\uD83C\uDF1F Amazing home practice!"
                    : ts("word_sounds.parent_great") || "\uD83C\uDFE0 Great home practice!")
                  : (ts("word_sounds.session_complete") || "Session Complete!"),
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                { className: "text-white/70" },
                isParentMode
                  ? ts("word_sounds.parent_summary", { total: wordSoundsScore.total }) || `Your child practiced ${wordSoundsScore.total} word${wordSoundsScore.total === 1 ? "" : "s"} today \u2014 share this summary with their teacher!`
                  : (accuracy >= 90
                    ? ts("word_sounds.session_msg_outstanding") ||
                    "Outstanding work! You're a phonics champion!"
                    : accuracy >= 70
                      ? ts("word_sounds.session_msg_great") ||
                      "Great job with this activity!"
                      : accuracy >= 50
                        ? ts("word_sounds.session_msg_good") ||
                        "Good effort! Keep practicing!"
                        : ts("word_sounds.session_msg_nice") ||
                        "Nice try! Every practice makes you stronger!"),
              ),
              wordSoundsLevel > 1 &&
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "mt-2 inline-flex items-center gap-1 bg-white/20 rounded-full px-4 py-1 text-sm font-bold",
                },
                "\u2B50 Level ",
                wordSoundsLevel,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "bg-white/10 backdrop-blur p-6" },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "grid grid-cols-3 gap-4 text-center mb-4" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "bg-white/10 rounded-2xl p-4" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "text-3xl font-black" },
                    wordSoundsScore.correct,
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "text-xs text-white/80 uppercase tracking-wider",
                    },
                    ts("word_sounds.correct") || "Correct",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "bg-white/10 rounded-2xl p-4" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "text-3xl font-black" },
                    accuracy,
                    "%",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "text-xs text-white/80 uppercase tracking-wider",
                    },
                    ts("word_sounds.accuracy") || "Accuracy",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "bg-white/10 rounded-2xl p-4" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "text-3xl font-black" },
                    streakEmoji,
                    " ",
                    wordSoundsStreak,
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "text-xs text-white/80 uppercase tracking-wider",
                    },
                    ts("word_sounds.streak") || "Streak",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "grid grid-cols-2 gap-3 text-center" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "bg-white/10 rounded-xl p-3" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "text-xl font-bold" },
                    wordSoundsScore.total,
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "text-xs text-white/80 uppercase tracking-wider",
                    },
                    ts("word_sounds.session_words_practiced") ||
                    "Words Practiced",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "bg-white/10 rounded-xl p-3" },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    { className: "text-xl font-bold" },
                    // Probe mode never awards XP (onScoreUpdate is gated), so
                    // don't display XP that was never earned \u2014 show accuracy.
                    isProbeMode
                      ? `${accuracy}%`
                      : `${(wordSoundsScore?.correct || 0) * 10} \u2728`,
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "text-xs text-white/80 uppercase tracking-wider",
                    },
                    isProbeMode
                      ? ts("word_sounds.accuracy") || "Accuracy"
                      : ts("word_sounds.session_xp_earned") || "XP Earned",
                  ),
                ),
              ),
            ),
            isProbeMode && (() => {
              const _bb = computeProbeByBand();
              const _tot = _bb.easy.t + _bb.medium.t + _bb.hard.t;
              if (_tot === 0) return null;
              const _pct = (b) => (_bb[b].t > 0 ? Math.round((_bb[b].c / _bb[b].t) * 100) : "");
              return /*#__PURE__*/ React.createElement(
                "div",
                { className: "bg-white/10 backdrop-blur px-6 pb-5" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "bg-white/10 rounded-xl p-3 text-left" },
                  /*#__PURE__*/ React.createElement("div", { className: "text-xs font-bold text-white/80 uppercase tracking-wider mb-1" }, ts("word_sounds.accuracy_by_difficulty") || "Accuracy by word difficulty"),
                  ...["easy", "medium", "hard"].filter((b) => _bb[b].t > 0).map((b) =>
                    /*#__PURE__*/ React.createElement("div", { key: "ssb-" + b, className: "flex justify-between text-sm text-white/90" },
                      /*#__PURE__*/ React.createElement("span", { className: "capitalize" }, b === "easy" ? (ts("word_sounds.band_cvc_easy") || "CVC / easy") : (b === "hard" ? (ts("word_sounds.band_hard") || "Hard") : (ts("word_sounds.band_medium") || "Medium"))),
                      /*#__PURE__*/ React.createElement("span", { className: "font-mono" }, _bb[b].c + "/" + _bb[b].t + " (" + _pct(b) + "%)"),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement("div", { className: "text-[10px] text-white/80 italic mt-1" }, ts("word_sounds.band_compare_caveat") || "Compare like with like: a shift in word difficulty (not a skill change) can move the overall number."),
                ),
              );
            })(),
            sessionWordResults.current.length > 0 &&
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "px-6 pb-2" },
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "text-xs uppercase tracking-wider text-white/80 font-bold mb-2",
                },
                "Word Recap",
              ),
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin",
                },
                [
                  ...new Map(
                    sessionWordResults.current.map((r) => [r.word, r]),
                  ).values(),
                ].map((r, i) =>
                    /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    key: i,
                    className: `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${r.correct ? "bg-green-400/20 text-green-200" : "bg-red-400/20 text-red-200"}`,
                  },
                  r.correct ? "✓" : "✗",
                  " ",
                  r.word,
                  r.attempts > 1 &&
                        /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-white/75" },
                    "(",
                    r.attempts,
                    "\xD7)",
                  ),
                ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "p-6 flex flex-col gap-3" },
              isParentMode &&
                /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: () => {
                    const date = new Date().toLocaleDateString();
                    const actLabel = wordSoundsActivity
                      ? wordSoundsActivity.charAt(0).toUpperCase() +
                        wordSoundsActivity.slice(1)
                      : "Word Sounds";
                    const wordLines = [
                      ...new Map(
                        sessionWordResults.current.map((r) => [r.word, r]),
                      ).values(),
                    ]
                      .map((r) => `  ${r.correct ? "\u2713" : "\u2717"} ${r.word}`)
                      .join("\n");
                    const summary =
                      (ts("word_sounds.parent_summary_title", { date }) || `Home Practice Summary (${date})`) + "\n" +
                      (ts("word_sounds.parent_summary_activity", { activity: actLabel }) || `Activity: ${actLabel}`) + "\n" +
                      (ts("word_sounds.parent_summary_score", { correct: wordSoundsScore.correct, total: wordSoundsScore.total, pct: accuracy }) || `Score: ${wordSoundsScore.correct}/${wordSoundsScore.total} (${accuracy}%)`) +
                      (wordLines ? "\n\n" + (ts("word_sounds.parent_summary_words") || "Words practiced:") + "\n" + wordLines : "");
                    navigator.clipboard
                      .writeText(summary)
                      .then(() =>
                        addToast?.("\uD83D\uDCCB " + (ts("word_sounds.parent_summary_copied") || "Summary copied! Paste it into a message for the teacher."), "success"),
                      )
                      .catch(() =>
                        addToast?.(ts("word_sounds.parent_summary_copy_failed") || "Copy failed, try long-pressing the summary.", "error"),
                      );
                  },
                  className:
                    "w-full py-4 bg-amber-400 text-amber-900 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform",
                },
                "\uD83D\uDCCB " + (ts("word_sounds.parent_copy_button") || "Copy Summary for Teacher"),
              ),
              sessionWordResults.current.filter((r) => !r.correct).length > 0 &&
                /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: () => {
                    setShowSessionComplete(false);
                    const missedWords = [
                      ...new Set(
                        sessionWordResults.current
                          .filter((r) => !r.correct)
                          .map((r) => r.word),
                      ),
                    ];
                    const actId = wordSoundsActivity || "segmentation";
                    sessionQueueRef.current[actId] = missedWords.map((w) => ({
                      word: w,
                      singleWord: w,
                    }));
                    setWordSoundsScore({ correct: 0, total: 0 });
                    setWordSoundsSessionProgress?.(0);
                    sessionWordResults.current = [];
                    const firstMissed = missedWords[0];
                    setCurrentWordSoundsWord(firstMissed);
                    const preloaded = preloadedWords.find(
                      (pw) =>
                        pw.word?.toLowerCase() ===
                        firstMissed.toLowerCase() ||
                        pw.targetWord?.toLowerCase() ===
                        firstMissed.toLowerCase(),
                    );
                    if (preloaded) {
                      setWordSoundsPhonemes(preloaded);
                    } else {
                      const fallback = generateFallbackData(firstMissed);
                      if (fallback) applyWordDataToState(fallback);
                    }
                    setIsLoadingPhonemes(false);
                  },
                  className:
                    "w-full py-4 bg-amber-400 text-amber-900 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform",
                },
                "\uD83C\uDFAF Practice Missed Words (",
                [
                  ...new Set(
                    sessionWordResults.current
                      .filter((r) => !r.correct)
                      .map((r) => r.word),
                  ),
                ].length,
                ")",
              ),
              // Probe mode: no Play Again / Next Activity. Play Again silently
              // started a SECOND probe (one launch → two banked payloads), and
              // Next Activity let the child leave the probed skill while the
              // probe UI persisted. Close is the only honest exit.
              !isProbeMode &&
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: () => {
                    setShowSessionComplete(false);
                    setWordSoundsScore({ correct: 0, total: 0 });
                    setWordSoundsSessionProgress?.(0);
                    sessionWordResults.current = [];
                    startActivity(wordSoundsActivity);
                  },
                  className:
                    "w-full py-4 bg-white text-violet-600 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform",
                },
                "\uD83D\uDD04 ",
                isParentMode
                  ? "Practice Again"
                  : (ts("word_sounds.play_again") || "Play Again"),
              ),
              !isProbeMode &&
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: () => {
                    setShowSessionComplete(false);
                    if (activitySequence.length > 0) {
                      const nextIdx =
                        (sequenceIndex + 1) % activitySequence.length;
                      setSequenceIndex(nextIdx);
                      setWordSoundsActivity(activitySequence[nextIdx]);
                    } else {
                      setWordSoundsActivity(null);
                    }
                  },
                  className:
                    "w-full py-3 bg-white/20 text-white rounded-full font-medium hover:bg-white/30 transition-colors",
                },
                activitySequence.length > 0
                  ? "➡️ " +
                  (ts("word_sounds.session_next_activity") ||
                    "Next Activity")
                  : ts("word_sounds.choose_activity") ||
                  "Choose Another Activity",
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: closeSessionDialog,
                  className:
                    "w-full py-2 text-white/80 hover:text-white transition-colors",
                },
                isParentMode ? "\u2705 All Done for Today" : (ts("common.close") || "Close"),
              ),
            ),
          ),
        );
      }
      if (showReviewPanel) {
        return /*#__PURE__*/ React.createElement(WordSoundsReviewPanel, {
          preloadedWords: preloadedWords,
          onUpdateWord: handleUpdatePreloadedWord,
          onReorderWords: handleReorderPreloadedWords,
          onRegenerateWord: handleRegenerateWord,
          onCheckPhonemes: handleCheckPhonemes,
          onRegenerateOption: handleRegenerateOption,
          onRegenerateManipulationTask: handleRegenerateManipulationTask,
          onRegenerateAll: handleRegenerateAll,
          onRetryFailedTTS: handleRetryFailedTTS,
          onGenerateImage: handleGenerateWordImage,
          onRefineImage: handleRefineWordImage,
          activitySequence: activitySequence,
          setActivitySequence: setActivitySequence,
          isStudentLocked: isStudentLocked,
          setIsStudentLocked: setIsStudentLocked,
          generatingImageIndex: generatingImageIndex,
          regeneratingIndex: regeneratingIndex,
          isLoading: isLoadingPhonemes,
          onStartActivity: () => {
            hasStartedFromReview.current = true;
            setWordSoundsHistory([]);
            setShowReviewPanel(false);
            // Ensure an activity is selected — if none yet, default to first in sequence or 'counting'
            const targetActivity = wordSoundsActivity || (activitySequence && activitySequence.length > 0 ? activitySequence[0] : 'counting');
            if (!wordSoundsActivity && setWordSoundsActivity) {
              setWordSoundsActivity(targetActivity);
            }
            // Use startActivity to properly initialize the session queue and pick a word
            setTimeout(() => {
              if (typeof startActivity === 'function') {
                startActivity(targetActivity);
              } else {
                // Fallback: manually set the first word
                const firstWord = preloadedWords[currentWordIndex % Math.max(1, preloadedWords.length)];
                if (firstWord) {
                  const wordText = firstWord.targetWord || firstWord.word || firstWord.term || firstWord.singleWord || firstWord.displayWord || "";
                  if (wordText) {
                    setCurrentWordSoundsWord(wordText);
                    setWordSoundsPhonemes(firstWord);
                    setIsLoadingPhonemes(false);
                  }
                }
              }
            }, 50);
          },
          onClose: onClose,
          onBackToSetup: () => {
            setShowReviewPanel(false);
            if (onBackToSetup) {
              onBackToSetup();
            } else {
              onClose();
            }
          },
          onPlayAudio: handleAudio,
          onDeleteWord: handleDeleteWord,
          t: t,
          imageVisibilityMode: imageVisibilityMode,
          setImageVisibilityMode: setImageVisibilityMode,
        });
      }
      if (isMinimized) {
        return /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "fixed bottom-4 right-4 z-[100] w-80 bg-white rounded-xl shadow-2xl border-2 border-violet-200 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden flex flex-col font-sans",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-gradient-to-r from-violet-600 to-purple-600 p-3 flex items-center justify-between text-white shadow-sm cursor-move",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex items-center gap-2 font-bold text-sm" },
              isLoadingPhonemes
                ? /*#__PURE__*/ React.createElement("div", {
                  className:
                    "animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full",
                })
                : /*#__PURE__*/ React.createElement(Music, { size: 16 }),
              /*#__PURE__*/ React.createElement(
                  "span",
                  null,
                  isLoadingPhonemes ? "Generating Sounds..." : "Word Sounds",
                ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex gap-1" },
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.maximize"),
                  onClick: () => setIsMinimized(false),
                  className: "p-1 hover:bg-white/20 rounded transition-colors",
                  title: t("common.maximize"),
                },
                /*#__PURE__*/ React.createElement(Maximize2, { size: 16 }),
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.close_maximize"),
                  onClick: onClose,
                  className: "p-1 hover:bg-white/20 rounded transition-colors",
                  title: t("common.close"),
                },
                /*#__PURE__*/ React.createElement(X, { size: 16 }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            { className: "p-4 bg-slate-50 flex-grow" },
            isLoadingPhonemes
              ? /*#__PURE__*/ React.createElement(
                "div",
                {
                  "data-help-key": "word_sounds_loading_minimized",
                  className: "space-y-3",
                },
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex justify-between text-xs text-slate-600 font-medium",
                  },
                    /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    "Processing...",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "animate-pulse" },
                    "Active",
                  ),
                ),
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "h-2 bg-slate-200 rounded-full overflow-hidden",
                  },
                    /*#__PURE__*/ React.createElement("div", {
                    className:
                      "h-full bg-violet-500 animate-pulse w-full origin-left scale-x-75",
                  }),
                ),
                  /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className:
                      "text-[11px] text-slate-600 text-center italic",
                  },
                  ts("word_sounds.minimized_generating") ||
                    "You can continue working. Sound generation is running in the background.",
                ),
              )
              : /*#__PURE__*/ React.createElement(
                "div",
                { className: "text-center" },
                  /*#__PURE__*/ React.createElement(
                  "p",
                  { className: "text-xs text-slate-600 mb-3 font-medium" },
                  ts("word_sounds.minimized_ready") || "Ready to play!",
                ),
                  /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    onClick: () => setIsMinimized(false),
                    className:
                      "w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-violet-700 transition-colors",
                  },
                  "Resume Activity",
                ),
              ),
          ),
        );
      }
      return /*#__PURE__*/ React.createElement(
        "div",
        {
          ref: modalRef,
          className:
            "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "word-sounds-dialog-title",
          onKeyDown: (event) => handleDialogKeyDown(event, onClose),
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4",
          },
          errorMessage &&
            /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-red-700 text-white px-4 py-2 text-center text-sm font-medium animate-in slide-in-from-top",
            },
            "\u26A0\uFE0F ",
            errorMessage,
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-white",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex items-center justify-between" },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex items-center gap-3" },
                /*#__PURE__*/ React.createElement(
                  "svg",
                  {
                    width: "48",
                    height: "48",
                    viewBox: "0 0 48 48",
                    className: `drop-shadow-lg transition-transform duration-500 ${isCelebrating ? "animate-bounce scale-110" : ""}`,
                  },
                  /*#__PURE__*/ React.createElement("circle", {
                    cx: "24",
                    cy: "24",
                    r: "16",
                    fill: "#FBBF24",
                    stroke: "#F59E0B",
                    strokeWidth: "2",
                  }),
                  /*#__PURE__*/ React.createElement("rect", {
                    x: "10",
                    y: "19",
                    width: "12",
                    height: "8",
                    rx: "2",
                    fill: "#1F2937",
                  }),
                  /*#__PURE__*/ React.createElement("rect", {
                    x: "26",
                    y: "19",
                    width: "12",
                    height: "8",
                    rx: "2",
                    fill: "#1F2937",
                  }),
                  /*#__PURE__*/ React.createElement("rect", {
                    x: "22",
                    y: "21",
                    width: "4",
                    height: "3",
                    fill: "#1F2937",
                  }),
                  /*#__PURE__*/ React.createElement("rect", {
                    x: "11",
                    y: "20",
                    width: "4",
                    height: "2",
                    rx: "1",
                    fill: "#4B5563",
                    opacity: "0.5",
                  }),
                  /*#__PURE__*/ React.createElement("rect", {
                    x: "27",
                    y: "20",
                    width: "4",
                    height: "2",
                    rx: "1",
                    fill: "#4B5563",
                    opacity: "0.5",
                  }),
                  /*#__PURE__*/ React.createElement("path", {
                    d: "M18 32 Q24 35 30 32",
                    stroke: "#B45309",
                    strokeWidth: "2",
                    fill: "none",
                    strokeLinecap: "round",
                  }),
                  /*#__PURE__*/ React.createElement("path", {
                    d: "M6 24 Q6 8 24 8 Q42 8 42 24",
                    stroke: "#1F2937",
                    strokeWidth: "4",
                    fill: "none",
                    strokeLinecap: "round",
                  }),
                  /*#__PURE__*/ React.createElement("ellipse", {
                    cx: "6",
                    cy: "26",
                    rx: "5",
                    ry: "7",
                    fill: "#374151",
                  }),
                  /*#__PURE__*/ React.createElement("ellipse", {
                    cx: "42",
                    cy: "26",
                    rx: "5",
                    ry: "7",
                    fill: "#374151",
                  }),
                  /*#__PURE__*/ React.createElement("ellipse", {
                    cx: "6",
                    cy: "26",
                    rx: "3",
                    ry: "5",
                    fill: "#4B5563",
                  }),
                  /*#__PURE__*/ React.createElement("ellipse", {
                    cx: "42",
                    cy: "26",
                    rx: "3",
                    ry: "5",
                    fill: "#4B5563",
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  null,
                  /*#__PURE__*/ React.createElement(
                    "h2",
                    {
                      id: "word-sounds-dialog-title",
                      tabIndex: -1,
                      "data-dialog-initial-focus": "true",
                      className: "text-xl font-bold",
                    },
                    "\uD83D\uDD24 Word Sounds Studio",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    { className: "text-violet-200 text-sm" },
                    ts("word_sounds.choose_activity_prompt") ||
                      "Choose an activity below to get started!",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.minimize_to_background"),
                  onClick: () => setIsMinimized(true),
                  className:
                    "p-2 hover:bg-white/20 rounded-full transition-colors mr-1",
                  title: t("common.minimize_to_background"),
                },
                /*#__PURE__*/ React.createElement(Minimize, { size: 20 }),
              ),
              /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: onClose,
                  className:
                    "p-2 hover:bg-white/20 rounded-full transition-colors",
                  "aria-label": t("common.close"),
                },
                /*#__PURE__*/ React.createElement(X, { size: 20 }),
              ),
            ),
            lessonPlanConfig &&
            activitySequence?.length > 0 &&
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "mt-3 bg-white/10 rounded-xl p-3 backdrop-blur" },
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center justify-between text-xs mb-2",
                },
                  /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2 text-white font-bold",
                  },
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-violet-200" },
                    "\uD83D\uDCCB",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    wordSoundsActivity
                      ?.replace("_", " ")
                      .replace(/^./, (c) => c.toUpperCase()) || "Activity",
                  ),
                ),
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "flex items-center gap-1" },
                  [...Array(lessonPlanConfig.masteryThreshold || 3)].map(
                    (_, i) =>
                        /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        key: i,
                        className: `text-base ${(masteryStats[wordSoundsActivity]?.consecutiveStreak || 0) > i ? "opacity-100" : "opacity-30"}`,
                      },
                      (masteryStats[wordSoundsActivity]
                        ?.consecutiveStreak || 0) > i
                        ? "✓"
                        : "○",
                    ),
                  ),
                ),
              ),
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "h-2 bg-white/20 rounded-full overflow-hidden" },
                  /*#__PURE__*/ React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
                  className:
                    "h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-300",
                  style: {
                    width: `${Math.min(100, ((masteryStats[wordSoundsActivity]?.attempted || 0) / (lessonPlanConfig.activities?.find((a) => a.id === wordSoundsActivity)?.count || 5)) * 100)}%`,
                  },
                }),
              ),
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex justify-between text-[11px] text-violet-200 mt-1",
                },
                  /*#__PURE__*/ React.createElement(
                  "span",
                  null,
                  masteryStats[wordSoundsActivity]?.attempted || 0,
                  "/",
                  lessonPlanConfig.activities?.find(
                    (a) => a.id === wordSoundsActivity,
                  )?.count || 5,
                  " items",
                ),
                  /*#__PURE__*/ React.createElement(
                  "span",
                  null,
                  (() => {
                    const uniqueActs = [...new Set(activitySequence)];
                    const currentIdx = uniqueActs.indexOf(wordSoundsActivity);
                    if (currentIdx < uniqueActs.length - 1) {
                      const next = uniqueActs[currentIdx + 1];
                      return (
                        "Next: " + (next?.replace("_", " ") || "Complete")
                      );
                    }
                    return "🎉 Final Activity";
                  })(),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex items-center justify-between gap-4 mt-3 text-sm flex-wrap",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex items-center gap-2 flex-wrap" },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full",
                  },
                  /*#__PURE__*/ React.createElement(Trophy, { size: 14 }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    wordSoundsScore.correct,
                    "/",
                    wordSoundsScore.total,
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: `flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-500 border ${wordSoundsScore.streak > 9 ? "ws-streak-bg border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]" : wordSoundsScore.streak > 4 ? "bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-white/20 border-transparent"}`,
                  },
                  wordSoundsScore.streak > 4
                    ? /*#__PURE__*/ React.createElement(
                      "span",
                      { className: "animate-pulse text-amber-700" },
                      "\uD83D\uDD25",
                    )
                    : /*#__PURE__*/ React.createElement(Zap, {
                      size: 14,
                      className: isCelebrating
                        ? "text-yellow-300 animate-spin"
                        : "",
                    }),
                  /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        key: wordSoundsScore.streak,
                        className: `font-bold ${isCelebrating ? "animate-in zoom-in slide-in-from-bottom-2 duration-300 text-amber-200" : ""}`,
                      },
                      ts("word_sounds.streak"),
                      ": ",
                      wordSoundsScore.streak,
                    ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full",
                  },
                  /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    accuracy,
                    "% ",
                    ts("word_sounds.accuracy"),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                // Teacher review/edit are practice affordances \u2014 opening the
                // review panel mid-probe replaces the probe UI entirely and
                // its Start button wipes the evidence (setWordSoundsHistory([])).
                !isProbeMode &&
                preloadedWords.length > 0 &&
                  /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.review_and_edit_word_list"),
                    onClick: () => setShowReviewPanel(true),
                    className:
                      "flex items-center gap-1 px-3 py-1.5 bg-amber-700 text-white rounded-full text-sm font-bold hover:bg-amber-600 transition-colors shadow-md",
                    title: t("common.review_and_edit_word_list"),
                  },
                  "\u270F\uFE0F Review Words",
                ),
                !isProbeMode &&
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.confirm"),
                    onClick: () => setIsEditing((prev) => !prev),
                    className: `p-1.5 rounded-full transition-colors flex items-center justify-center ${isEditing ? "bg-amber-100 text-amber-600 ring-2 ring-amber-300" : "bg-white/10 text-white hover:bg-white/20"}`,
                    title: isEditing
                      ? ts("common.done") || "Done"
                      : ts("common.edit") || "Edit",
                  },
                  isEditing
                    ? /*#__PURE__*/ React.createElement(Check, { size: 16 })
                    : /*#__PURE__*/ React.createElement(Edit2, { size: 16 }),
                ),
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    "aria-label": t("common.voice_input"),
                    onClick: () => {
                      setUseMicInput(!useMicInput);
                      if (useMicInput) setIsListening(false);
                    },
                    className: `p-1.5 rounded-full transition-colors flex items-center justify-center ${useMicInput ? "bg-rose-700 text-white ring-2 ring-rose-300 shadow-md animate-pulse" : "bg-white/10 text-white hover:bg-white/20"}`,
                    title: useMicInput
                      ? ts("word_sounds.switch_click_mode") ||
                      "Switch to Click Mode"
                      : ts("word_sounds.switch_mic_mode") ||
                      "Switch to Microphone Mode",
                  },
                  useMicInput
                    ? /*#__PURE__*/ React.createElement(Mic, { size: 16 })
                    : /*#__PURE__*/ React.createElement(MicOff, { size: 16 }),
                ),
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    onClick: () => {
                      if (!isProbeMode) setShowLetterHints((prev) => !prev);
                    },
                    className: `flex items-center gap-1 px-3 py-1 rounded-full border transition-all text-xs font-bold ${showLetterHints ? "bg-white/20 border-white/30 text-white" : "bg-violet-800 border-violet-500 text-violet-100 shadow-inner"}`,
                    title: showLetterHints
                      ? ts("word_sounds.switch_sound_only") ||
                      "Switch to Sound Only Mode (Hide Letters)"
                      : ts("word_sounds.switch_letter_mode") ||
                      "Switch to Letter Mode (Show Letters)",
                  },
                  /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    showLetterHints ? "👁️" : "👂",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "hidden sm:inline" },
                    showLetterHints
                      ? ts("word_sounds.mode_phonics") || "Phonics"
                      : ts("word_sounds.mode_sound") || "Sound Only",
                  ),
                ),
                /*#__PURE__*/ React.createElement(DifficultyIndicator, null),
                availableLanguages.length > 1 &&
                setWordSoundsLanguage &&
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "relative group" },
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none",
                    },
                      /*#__PURE__*/ React.createElement(Globe, {
                      size: 12,
                      className: "text-indigo-200",
                    }),
                  ),
                    /*#__PURE__*/ React.createElement(
                    "select",
                    {
                      "aria-label": t("common.selection"),
                      value: wordSoundsLanguage || "en-US",
                      onChange: (e) => setWordSoundsLanguage(e.target.value),
                      className:
                        "bg-violet-800 border border-violet-600 rounded-full pl-8 pr-8 py-1 text-white text-xs cursor-pointer hover:bg-violet-700 transition-colors outline-none focus:ring-2 focus:ring-violet-400 appearance-none shadow-sm",
                      title: ts("common.language") || "Language",
                    },
                    availableLanguages.map((lang) =>
                        /*#__PURE__*/ React.createElement(
                      "option",
                      { key: lang, value: (window.getSpeechLangCode || function(l){ return l || 'en-US'; })(lang) },
                      lang === "English" ? "🇺🇸 English" : `${lang}`,
                    ),
                    ),
                  ),
                    /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none",
                    },
                      /*#__PURE__*/ React.createElement(ChevronDown, {
                      size: 12,
                      className: "text-indigo-200",
                    }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    onClick: () => setPlayInstructions((prev) => !prev),
                    className: `flex items-center gap-1 px-3 py-1 rounded-full border transition-all text-xs font-bold ${playInstructions ? "bg-indigo-100 border-indigo-200 text-indigo-700" : "bg-white/10 border-white/30 text-white/70"}`,
                    title: playInstructions
                      ? "Instructions are ON"
                      : "Instructions are OFF",
                  },
                  /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    playInstructions ? "🗣️" : "🔇",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "hidden sm:inline" },
                    "Help",
                  ),
                ),
                !isStudentLocked &&
                setWordSoundsDifficulty &&
                  /*#__PURE__*/ React.createElement(
                  "select",
                  {
                    "aria-label": t("common.selection"),
                    value: wordSoundsDifficulty || "auto",
                    onChange: (e) => setWordSoundsDifficulty(e.target.value),
                    className:
                      "bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs cursor-pointer hover:bg-white/30 transition-colors outline-none focus:ring-2 focus:ring-white/50",
                    style: { WebkitAppearance: "none", appearance: "none" },
                  },
                    /*#__PURE__*/ React.createElement(
                    "option",
                    { value: "auto", className: "text-slate-800" },
                    "\uD83E\uDD16 Auto",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "option",
                    { value: "sequential", className: "text-slate-800" },
                    "\uD83D\uDCDD Sequential",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "option",
                    { value: "easy", className: "text-slate-800" },
                    "\uD83D\uDFE2 Easy",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "option",
                    { value: "medium", className: "text-slate-800" },
                    "\uD83D\uDFE1 Medium",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "option",
                    { value: "hard", className: "text-slate-800" },
                    "\uD83D\uDD34 Hard",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full ml-auto md:ml-2",
                  },
                  /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-xs opacity-80" },
                    "\uD83D\uDC22",
                  ),
                  /*#__PURE__*/ React.createElement("input", {
                    "aria-label": t("common.range_slider"),
                    type: "range",
                    min: "0.5",
                    max: "1.5",
                    step: "0.25",
                    value: ttsSpeed,
                    onChange: (e) => setTtsSpeed(parseFloat(e.target.value)),
                    className:
                      "w-20 accent-white h-1 bg-white/30 rounded-lg appearance-none cursor-pointer",
                    title: ts("word_sounds.tts_speed") || "Speed",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "text-xs opacity-80" },
                    "\uD83D\uDC07",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className:
                        "text-xs font-mono w-6 text-right border-l border-white/20 pl-2 ml-1 font-bold",
                    },
                    ttsSpeed,
                    "x",
                  ),
                ),
              ),
            ),
            wordSoundsSessionProgress > 0 &&
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "mt-3" },
                /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex justify-between text-xs text-violet-200 mb-1",
                },
                  /*#__PURE__*/ React.createElement(
                  "span",
                  null,
                  ts("word_sounds.session_progress"),
                ),
                  /*#__PURE__*/ React.createElement(
                  "span",
                  null,
                  Math.min(wordSoundsSessionProgress, wordSoundsSessionGoal),
                  "/",
                  wordSoundsSessionGoal,
                ),
              ),
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "h-2 bg-white/20 rounded-full overflow-hidden" },
                  /*#__PURE__*/ React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
                  className:
                    "h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500",
                  style: {
                    width: `${Math.min((wordSoundsSessionProgress / wordSoundsSessionGoal) * 100, 100)}%`,
                  },
                }),
              ),
            ),
            wordSoundsBadges &&
            wordSoundsBadges.length > 0 &&
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex items-center gap-1 mt-2 flex-wrap" },
              wordSoundsBadges
                .slice(-5)
                .map((badge, i) =>
                    /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    key: badge.id || i,
                    className:
                      "flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs",
                    title: badge.name,
                  },
                      /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    badge.icon,
                  ),
                      /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "hidden sm:inline" },
                    badge.name,
                  ),
                ),
                ),
            ),
          ),
          // Garden Bridge banner — appears when garden-prepared phonics words are available
          showGardenBanner && gardenPhonicsWords && !gardenWordsApplied &&
            React.createElement("div", {
              className: "border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3"
            },
              React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("span", { className: "text-lg" }, "🌱"),
                React.createElement("div", { className: "flex-1" },
                  React.createElement("div", { className: "text-sm font-bold text-emerald-800" },
                    "Word Garden phonics lesson ready!"),
                  React.createElement("div", { className: "text-xs text-emerald-600" },
                    gardenPhonicsWords.length + " words from the student\u2019s vocabulary: " + gardenPhonicsWords.slice(0, 5).join(", ") + (gardenPhonicsWords.length > 5 ? "..." : ""))),
                React.createElement("button", {
                  onClick: function () {
                    // Apply garden words as the preloaded word list
                    if (setWsPreloadedWords) {
                      setWsPreloadedWords(gardenPhonicsWords.map(function (w) { return { word: w, phonemes: null }; }));
                    }
                    setGardenWordsApplied(true);
                    setShowGardenBanner(false);
                    // Clear the localStorage flag so it doesn't persist across sessions
                    try { localStorage.removeItem("alloGardenPhonicsWords"); } catch (e3) {}
                    if (addToast) addToast("🌱 Garden words loaded! Activities will use the student\u2019s vocabulary.", "success");
                  },
                  className: "px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap"
                }, "📖 Use Garden Words"),
                React.createElement("button", {
                  onClick: function () { setShowGardenBanner(false); },
                  className: "text-emerald-700 hover:text-emerald-600 text-lg",
                  "aria-label": ts("word_sounds.sr_dismiss") || "Dismiss"
                }, "\u00D7"))),
          !isStudentLocked &&
          !isProbeMode &&
            /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "border-b border-slate-200 px-4 py-3 overflow-x-auto",
            },
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex gap-2 items-center" },
              isParentMode &&
                /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 whitespace-nowrap mr-1",
                  title: "Home Practice Mode",
                },
                "\uD83C\uDFE0 Home Practice",
              ),
              // Honesty chip: in a non-English session some activities are
              // hidden because their machinery is English-specific (letter
              // paths, rime families, letter tiles on non-alphabetic scripts).
              !wsLangCaps.isEnglish &&
                ALL_ACTIVITIES.some((a) => !wsActivityAvailableForLang(a.id)) &&
                /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 whitespace-nowrap mr-1",
                  title:
                    ts("word_sounds.lang_hidden_activities_hint") ||
                    "Some letter- and spelling-pattern activities are designed for English and are hidden for this language.",
                },
                "\uD83C\uDF10 ",
                ts("word_sounds.lang_hidden_activities") || "Some activities are English-only",
              ),
              ACTIVITY_GROUP_ORDER.flatMap((__g) => {
                const __acts = ACTIVITIES.filter((a) => (ACTIVITY_GROUP_OF[a.id] || "pa_phoneme") === __g);
                if (!__acts.length) return [];
                return [
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      key: "wsgrp-" + __g,
                      className: "text-[10px] font-bold uppercase tracking-wide text-slate-600 px-1 self-center whitespace-nowrap",
                      title: ACTIVITY_GROUP_FULL[__g],
                    },
                    ACTIVITY_GROUP_LABELS[__g],
                  ),
                  ...__acts.map((activity) =>
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        key: activity.id,
                        onClick: () => startActivity(activity.id),
                        className: `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${wordSoundsActivity === activity.id ? "bg-violet-700 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
                        title: activity.description,
                      },
                      /*#__PURE__*/ React.createElement("span", null, activity.icon),
                      /*#__PURE__*/ React.createElement("span", null, activity.label),
                    ),
                  ),
                ];
              }),
              (typeof callImagen === "function" || hasPreparedImages) &&
                /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: () => setAacMode((prev) => !prev),
                  className: `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ml-auto ${aacMode ? "bg-teal-700 text-white shadow-md ring-2 ring-teal-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
                  title: aacMode
                    ? "AAC Symbol Overlay ON — click to turn off"
                    : "Turn on AAC Symbol Overlay (generates images for answer choices)",
                },
                /*#__PURE__*/ React.createElement("span", null, "\uD83D\uDDBC\uFE0F"),
                /*#__PURE__*/ React.createElement("span", null, "AAC"),
              ),
            ),
          ),
          isProbeMode &&
            /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 flex items-center justify-between text-sm font-bold shadow-inner",
            },
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex items-center gap-3" },
                /*#__PURE__*/ React.createElement(
                "span",
                { className: "bg-white/20 px-2 py-0.5 rounded-full text-xs" },
                "\uD83D\uDCCA PROBE MODE",
              ),
                /*#__PURE__*/ React.createElement(
                "span",
                null,
                "Word ",
                wordSoundsScore.total + 1,
                " of ",
                wordSoundsSessionGoal,
              ),
            ),
              /*#__PURE__*/ React.createElement(
              "div",
              { className: "flex items-center gap-3" },
                /*#__PURE__*/ React.createElement(
                "span",
                null,
                wordSoundsScore.correct,
                " correct / ",
                wordSoundsScore.total,
                " total",
              ),
              probeStartTimeRef.current &&
                  /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "bg-white/20 px-2 py-0.5 rounded-full tabular-nums",
                },
                "\u23F1 ",
                Math.floor(probeElapsed / 60),
                ":",
                String(probeElapsed % 60).padStart(2, "0"),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            { className: "flex-1 overflow-y-auto p-6" },
            phonemeError &&
              /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2",
              },
                /*#__PURE__*/ React.createElement(
                "div",
                { className: "flex items-center gap-2 text-amber-700" },
                  /*#__PURE__*/ React.createElement(AlertTriangle, {
                  size: 20,
                }),
                  /*#__PURE__*/ React.createElement(
                  "div",
                  { className: "text-sm" },
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "font-bold" },
                    ts("word_sounds.ai_gen_failed") || "AI Generation Failed.",
                  ),
                    /*#__PURE__*/ React.createElement(
                    "span",
                    { className: "ml-1 opacity-80" },
                    ts("word_sounds.ai_gen_fallback") || "Using basic data.",
                  ),
                ),
              ),
                /*#__PURE__*/ React.createElement(
                "button",
                {
                  "aria-label": t("common.refresh"),
                  onClick: () => fetchWordData(phonemeError),
                  className:
                    "px-3 py-1.5 bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm",
                },
                  /*#__PURE__*/ React.createElement(RefreshCw, { size: 12 }),
                "Retry",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                key: wordSoundsActivity,
                ref: activityRegionRef,
                tabIndex: -1,
                className:
                  "animate-in fade-in slide-in-from-right-8 duration-500 ease-out fill-mode-both focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 focus-visible:outline-offset-2",
              },
              // ── Graphophonemic anchor strip (WCAG-aligned, Orton-Gillingham style) ──
              // Persists letter ↔ sound ↔ key-word ↔ sentence association across every
              // PA activity so the student maintains the decoding bridge. Hidden for
              // connected-text activities (ORF, spelling_bee) where it would distract.
              // Mode (full / compact / hidden) persists to localStorage.
              (function() {
                var _hideAnchorForActivity = (
                  wordSoundsActivity === "orf" ||
                  wordSoundsActivity === "spelling_bee" ||
                  wordSoundsActivity === "sight_words" ||
                  isProbeMode
                );
                if (_hideAnchorForActivity) return null;
                return /*#__PURE__*/ React.createElement(AnchorStrip, {
                  target: anchorTarget,
                  // Promote to "full" mode briefly during error remediation
                  // even if user has it set to compact / hidden, so the
                  // corrective procedure is visible.
                  mode: anchorErrorFlash ? "full" : anchorMode,
                  onModeChange: updateAnchorMode,
                  onPlaySound: handleAnchorPlay,
                  errorFlash: anchorErrorFlash,
                });
              })(),
              renderActivityContent(),
            ),
            wordSoundsFeedback &&
              /*#__PURE__*/ React.createElement(
              "div",
              {
                className: `mt-6 p-4 rounded-xl text-center font-bold animate-in slide-in-from-bottom-2 ${(wordSoundsFeedback.isCorrect || wordSoundsFeedback.type === "correct" || wordSoundsFeedback.type === "success") ? "bg-green-100 text-green-700 border-2 border-green-300" : "bg-red-100 text-red-700 border-2 border-red-300"}`,
              },
              (wordSoundsFeedback.isCorrect || wordSoundsFeedback.type === "correct" || wordSoundsFeedback.type === "success") ? "🎉 " : "💡 ",
              wordSoundsFeedback.message,
            ),
            audioNotice &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  role: "status",
                  className:
                    "mt-3 p-3 rounded-xl text-center text-sm font-semibold bg-amber-50 text-amber-800 border-2 border-amber-200 flex flex-wrap items-center justify-center gap-3",
                },
                /*#__PURE__*/ React.createElement("span", null, "🔇 " + audioNotice),
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: retryLastAudio,
                    className:
                      "px-3 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400",
                  },
                  ts("word_sounds.audio_retry") || "🔊 Try again",
                ),
              ),
          ),
        ),
      );
    };
  }
})();
