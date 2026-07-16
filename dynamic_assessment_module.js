(function () {
  if (window.AlloModules && window.AlloModules.DynamicAssessment) {
    console.log("[CDN] DynamicAssessment already loaded, skipping duplicate");
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // dynamic_assessment_module.js — Dynamic Assessment Studio
  //
  // Top-level clinical tool sibling to allohaven_module.js / symbol_studio.
  // Implements Vygotsky/Feuerstein dynamic-assessment methodology:
  // pretest → mediation → posttest with graduated prompt hierarchies +
  // modifiability scoring. Both examiner-led and AI-mediated paths ship.
  // Module covers Phases A–BB (see DA_AUDIT.md for the full inventory).
  //
  // Core mechanic: each item ships with a 4-level prompt ladder.
  // Level 0 = no scaffold (student attempts alone).
  // Level 1 = declarative cue (general orientation).
  // Level 2 = leading question (interrogative scaffold).
  // Level 3 = modeling (show the move, then ask student to do it).
  // Level 4 = direct teach (give answer with explanation).
  //
  // Item scoring: 5 - (promptLevelReached); 0 if still wrong after L4.
  // Pretest baseline + Posttest score → Modifiability Index =
  //   (post - pre) / (maxPossible - pre)  — proportion of growth realized.
  //
  // Persistence: localStorage 'alloflow_dynamic_assessment_v1'.
  // No examiner free-text observations are ever synced to Firestore.
  // ═══════════════════════════════════════════════════════════

  var STORAGE_KEY = "alloflow_dynamic_assessment_v1";

  // ── Reduced-motion CSS (WCAG 2.3.3) ──
  (function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("allo-da-motion-reduce-css")) return;
    var st = document.createElement("style");
    st.id = "allo-da-motion-reduce-css";
    // Comprehensive: suppress ALL animations + transitions inside .da-root
    // under reduced-motion, not just the three named classes. Catches CSS
    // transitions on items like buttons/cards that have hover transitions.
    st.textContent = [
      "@media (prefers-reduced-motion: reduce) {",
      "  .da-root *, .da-root *::before, .da-root *::after {",
      "    animation-duration: 0.01ms !important;",
      "    animation-iteration-count: 1 !important;",
      "    transition-duration: 0.01ms !important;",
      "    scroll-behavior: auto !important;",
      "  }",
      "  .da-anim, .da-fade-in, .da-pop { animation: none !important; }",
      "}"
    ].join("\n");
    if (document.head) document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("allo-live-da")) return;
    var lr = document.createElement("div");
    lr.id = "allo-live-da";
    lr.setAttribute("aria-live", "polite");
    lr.setAttribute("aria-atomic", "true");
    lr.setAttribute("role", "status");
    lr.className = "sr-only";
    lr.style.cssText =
      "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0";
    if (document.body) document.body.appendChild(lr);
  })();
  function announce(msg) {
    if (typeof document === "undefined") return;
    var lr = document.getElementById("allo-live-da");
    if (lr) {
      lr.textContent = "";
      setTimeout(function () { lr.textContent = msg; }, 30);
    }
  }

  // ── Read-aloud (Gemini TTS via the host's shared AlloSpeechPlayer) ──
  // DA had no TTS. These delegate to window.AlloSpeechPlayer (Gemini TTS →
  // Kokoro → browser fallback, mute- and abort-aware) so a student can HEAR
  // an item/scaffold instead of reading it. This is both an accessibility
  // feature and the foundation for the "modality" access contrast (does
  // performance change when the reading demand is removed?).
  function daSpeak(text, lang) {
    try {
      var sp = (typeof window !== "undefined") ? window.AlloSpeechPlayer : null;
      if (sp && typeof sp.speak === "function") {
        // Pass a language so home-language (L1) read-aloud speaks in the L1,
        // not the default voice. AlloSpeechPlayer reads opts.language.
        sp.speak(String(text || ""), lang ? { language: lang } : undefined);
      }
    } catch (_) {}
  }
  function daStopSpeak() {
    try {
      var sp = (typeof window !== "undefined") ? window.AlloSpeechPlayer : null;
      if (sp && typeof sp.stop === "function") sp.stop();
    } catch (_) {}
  }
  function daTtsAvailable() {
    return (typeof window !== "undefined") && !!(window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === "function");
  }

  // ── Host theme detection ──
  // The host app stamps `theme-${theme}` (light | dark | contrast) on its
  // root/main element but does not pass a theme prop to DA. Same DOM-sniff
  // pattern as stem_lab_module's AlloStemTheme: query for the class, watch
  // it with a MutationObserver (wired in the component) so the Studio
  // re-themes live when the user toggles the app theme.
  function daDetectTheme() {
    try {
      if (typeof document === "undefined") return "light";
      var names = ["contrast", "dark", "light"];
      for (var i = 0; i < names.length; i++) {
        if (document.querySelector("main.theme-" + names[i])) return names[i];
      }
      if (document.body && document.body.classList) {
        for (var j = 0; j < names.length; j++) {
          if (document.body.classList.contains("theme-" + names[j])) return names[j];
        }
      }
      for (var k = 0; k < names.length; k++) {
        if (document.querySelector(".theme-" + names[k])) return names[k];
      }
    } catch (_) {}
    return "light";
  }
  // The element whose class attribute carries the theme (observed for changes).
  function daThemeTarget() {
    try {
      if (typeof document === "undefined") return null;
      return document.querySelector("main.theme-light, main.theme-dark, main.theme-contrast, .theme-light, .theme-dark, .theme-contrast") || document.body || null;
    } catch (_) { return null; }
  }

  // ── Module-level style block ──
  // Theme system: every surface color in the component reads a --da-* custom
  // property. Light values reproduce the original palette byte-for-byte; dark
  // and contrast values are generated from DA_THEME_TOKENS below. The shell
  // element (rendered around every view) carries .da-theme-<name> so the
  // whole module re-themes live when the host app's theme toggles.
  // Print media re-pins every token to its LIGHT value so packets/letters
  // print dark-on-white regardless of the on-screen theme.
  var DA_THEME_TOKENS = {
    // token: [light, dark, contrast]
    "page":          ["#ffffff", "#0f172a", "#000000"],
    "surface":       ["#ffffff", "#1e293b", "#000000"],
    "surface-2":     ["#f8fafc", "#253247", "#000000"],
    "surface-3":     ["#f1f5f9", "#2b3a52", "#000000"],
    "ink":           ["#0f172a", "#e8eef7", "#ffff00"],
    "ink-2":         ["#334155", "#cbd5e1", "#ffff00"],
    "ink-3":         ["#475569", "#b0bece", "#ffff00"],
    "muted":         ["#5c6675", "#94a3b8", "#ffff00"],
    "faint":         ["#94a3b8", "#7e8ca0", "#ffff00"],
    "border":        ["#e2e8f0", "#334155", "#ffff00"],
    "border-2":      ["#cbd5e1", "#46586e", "#ffff00"],
    "on-accent":     ["#ffffff", "#ffffff", "#000000"],
    "accent":        ["#1e3a8a", "#2563eb", "#ffff00"],
    "accent-text":   ["#1e3a8a", "#93c5fd", "#ffff00"],
    "accent-2":      ["#2563eb", "#60a5fa", "#ffff00"],
    "focus":         ["#b45309", "#fbbf24", "#ffff00"],
    "blue-tint":     ["#eff6ff", "rgba(59,130,246,0.14)", "#000000"],
    "blue-tint-2":   ["#dbeafe", "rgba(59,130,246,0.22)", "#000000"],
    "blue-border":   ["#bfdbfe", "rgba(96,165,250,0.5)", "#ffff00"],
    "indigo-tint":   ["#eef2ff", "rgba(99,102,241,0.14)", "#000000"],
    "indigo-border": ["#c7d2fe", "rgba(129,140,248,0.5)", "#ffff00"],
    "indigo-border-2": ["#a5b4fc", "rgba(129,140,248,0.6)", "#ffff00"],
    "indigo-text":   ["#3730a3", "#a5b4fc", "#ffff00"],
    "indigo-deep":   ["#312e81", "#c7d2fe", "#ffff00"],
    "indigo-deeper": ["#1e1b4b", "#e0e7ff", "#ffff00"],
    "indigo-mid":    ["#6366f1", "#818cf8", "#ffff00"],
    "indigo-mid-2":  ["#4338ca", "#a5b4fc", "#ffff00"],
    "sky-tint":      ["#f0f9ff", "rgba(14,165,233,0.12)", "#000000"],
    "sky-tint-2":    ["#ecfeff", "rgba(34,211,238,0.10)", "#000000"],
    "sky-border":    ["#bae6fd", "rgba(56,189,248,0.5)", "#ffff00"],
    "sky-border-2":  ["#7dd3fc", "rgba(56,189,248,0.65)", "#ffff00"],
    "sky-text":      ["#0369a1", "#7dd3fc", "#ffff00"],
    "sky-deep":      ["#075985", "#bae6fd", "#ffff00"],
    "sky-deeper":    ["#0c4a6e", "#e0f2fe", "#ffff00"],
    "cyan-text":     ["#0891b2", "#67e8f9", "#ffff00"],
    "cyan-deep":     ["#155e75", "#a5f3fc", "#ffff00"],
    "teal-text":     ["#0f766e", "#5eead4", "#ffff00"],
    "teal-mid":      ["#0d9488", "#2dd4bf", "#ffff00"],
    "violet-tint":   ["#faf5ff", "rgba(139,92,246,0.12)", "#000000"],
    "violet-tint-2": ["#f5f3ff", "rgba(139,92,246,0.10)", "#000000"],
    "violet-tint-3": ["#fdf4ff", "rgba(217,70,239,0.10)", "#000000"],
    "violet-border": ["#c4b5fd", "rgba(167,139,250,0.5)", "#ffff00"],
    "violet-border-2": ["#e9d5ff", "rgba(216,180,254,0.4)", "#ffff00"],
    "violet-border-3": ["#a78bfa", "rgba(167,139,250,0.65)", "#ffff00"],
    "violet-text":   ["#6b21a8", "#c4b5fd", "#ffff00"],
    "violet-text-2": ["#5b21b6", "#c4b5fd", "#ffff00"],
    "violet-mid":    ["#7c3aed", "#a78bfa", "#ffff00"],
    "violet-mid-2":  ["#6d28d9", "#a78bfa", "#ffff00"],
    "violet-deep":   ["#4c1d95", "#ddd6fe", "#ffff00"],
    "fuchsia-text":  ["#86198f", "#e879f9", "#ffff00"],
    "rose-tint":     ["#fdf2f8", "rgba(236,72,153,0.12)", "#000000"],
    "rose-border":   ["#f9a8d4", "rgba(244,114,182,0.5)", "#ffff00"],
    "rose-text":     ["#9d174d", "#f9a8d4", "#ffff00"],
    "rose-deep":     ["#831843", "#fbcfe8", "#ffff00"],
    "pink-mid":      ["#db2777", "#f472b6", "#ffff00"],
    "red-tint":      ["#fef2f2", "rgba(239,68,68,0.12)", "#000000"],
    "red-tint-2":    ["#fee2e2", "rgba(239,68,68,0.20)", "#000000"],
    "red-border":    ["#fca5a5", "rgba(248,113,113,0.5)", "#ffff00"],
    "red-mid":       ["#dc2626", "#f87171", "#ffff00"],
    "red-mid-2":     ["#ef4444", "#f87171", "#ffff00"],
    "red-text":      ["#b91c1c", "#fca5a5", "#ffff00"],
    "red-deep":      ["#7f1d1d", "#fecaca", "#ffff00"],
    "orange-mid":    ["#ea580c", "#fb923c", "#ffff00"],
    "orange-mid-2":  ["#f97316", "#fb923c", "#ffff00"],
    "orange-text":   ["#c2410c", "#fdba74", "#ffff00"],
    "orange-text-2": ["#9a3412", "#fdba74", "#ffff00"],
    "orange-deep":   ["#7c2d12", "#fed7aa", "#ffff00"],
    "amber-tint":    ["#fffbeb", "rgba(245,158,11,0.12)", "#000000"],
    "amber-tint-2":  ["#fef3c7", "rgba(245,158,11,0.18)", "#000000"],
    "amber-tint-3":  ["#fdfaf3", "rgba(245,158,11,0.08)", "#000000"],
    "amber-border":  ["#fbbf24", "rgba(251,191,36,0.55)", "#ffff00"],
    "amber-border-2": ["#f3d28a", "rgba(251,191,36,0.4)", "#ffff00"],
    "amber-mid":     ["#f59e0b", "#fbbf24", "#ffff00"],
    "amber-mid-2":   ["#d97706", "#fbbf24", "#ffff00"],
    "amber-text":    ["#a16207", "#fcd34d", "#ffff00"],
    "amber-text-2":  ["#92400e", "#fde68a", "#ffff00"],
    "amber-text-3":  ["#b45309", "#fcd34d", "#ffff00"],
    "green-tint":    ["#f0fdf4", "rgba(34,197,94,0.12)", "#000000"],
    "green-tint-2":  ["#dcfce7", "rgba(34,197,94,0.20)", "#000000"],
    "green-border":  ["#86efac", "rgba(74,222,128,0.5)", "#ffff00"],
    "green-border-2": ["#bbf7d0", "rgba(74,222,128,0.35)", "#ffff00"],
    "green-mid":     ["#16a34a", "#22c55e", "#ffff00"],
    "green-text":    ["#16a34a", "#4ade80", "#ffff00"],
    "green-text-2":  ["#15803d", "#86efac", "#ffff00"],
    "green-deep":    ["#14532d", "#bbf7d0", "#ffff00"],
    "green-deep-2":  ["#166534", "#bbf7d0", "#ffff00"],
    "zinc-text":     ["#52525b", "#c9ced8", "#ffff00"],
    // Button backgrounds under white (--da-on-accent) text. These hues are
    // ALSO used as text-on-tint (where dark mode needs a light value), so the
    // buttons get their own tokens that stay deep in dark mode. Contrast mode
    // uses yellow (on-accent flips to black there).
    "btn-indigo":    ["#3730a3", "#4f46e5", "#ffff00"],
    "btn-sky":       ["#075985", "#0369a1", "#ffff00"],
    "btn-rose":      ["#9d174d", "#be185d", "#ffff00"],
    "btn-amber":     ["#92400e", "#b45309", "#ffff00"],
    "btn-violet":    ["#6d28d9", "#7c3aed", "#ffff00"],
    "btn-green":     ["#15803d", "#15803d", "#ffff00"]
  };
  function daBuildTokenCss(idx) {
    var decls = [];
    Object.keys(DA_THEME_TOKENS).forEach(function (k) {
      decls.push("--da-" + k + ": " + DA_THEME_TOKENS[k][idx] + ";");
    });
    return decls.join(" ");
  }
  (function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("allo-da-styles")) return;
    var st = document.createElement("style");
    st.id = "allo-da-styles";
    st.textContent = [
      "@keyframes da-fade-in { 0% { opacity:0; transform:translateY(6px); } 100% { opacity:1; transform:translateY(0); } }",
      "@keyframes da-pop { 0% { transform:scale(0.96); } 50% { transform:scale(1.04); } 100% { transform:scale(1); } }",
      ".da-fade-in { animation: da-fade-in 280ms ease-out; }",
      ".da-pop { animation: da-pop 320ms ease-out; }",
      // Token sets: light is the default; the shell's theme class flips them.
      ".da-shell, .da-root { " + daBuildTokenCss(0) + " }",
      ".da-shell.da-theme-dark, .da-shell.da-theme-dark .da-root { " + daBuildTokenCss(1) + " }",
      ".da-shell.da-theme-contrast, .da-shell.da-theme-contrast .da-root { " + daBuildTokenCss(2) + " }",
      // The shell paints the page surface (the host wraps the module in a
      // hardcoded white card; radius matches the host's rounded-2xl).
      // color-scheme keys the UA's native widgets (scrollbars, checkboxes,
      // form controls) to the active theme.
      ".da-shell { background: var(--da-page); border-radius: 16px; color: var(--da-ink); color-scheme: light; }",
      ".da-shell.da-theme-dark { color-scheme: dark; }",
      ".da-shell.da-theme-contrast { outline: 2px solid #ffff00; color-scheme: dark; }",
      // Form controls have no inline background/color — without this they
      // keep the UA's white default and glare inside dark/contrast themes.
      ".da-root input, .da-root textarea, .da-root select { background-color: var(--da-surface); color: var(--da-ink); }",
      ".da-root input::placeholder, .da-root textarea::placeholder { color: var(--da-faint); opacity: 1; }",
      ".da-root { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; line-height: 1.55; color: var(--da-ink); }",
      // WCAG 2.4.7/1.4.11 — visible, ≥3:1 focus indicator on EVERY focusable,
      // not just buttons. Token flips per theme so it stays ≥3:1 on all surfaces.
      ".da-root button:focus-visible, .da-root a:focus-visible, .da-root input:focus-visible, .da-root select:focus-visible, .da-root textarea:focus-visible, .da-root summary:focus-visible, .da-root [tabindex]:focus-visible { outline: 3px solid var(--da-focus); outline-offset: 2px; }",
      // WCAG 2.5.8 — minimum target size for the small icon/chip buttons.
      ".da-root button { min-height: 24px; min-width: 24px; }",
      ".da-card { background: var(--da-surface); border: 1px solid var(--da-border); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,0.06); }",
      ".da-ladder-step { padding: 10px 12px; border: 1px solid var(--da-border); border-radius: 10px; background: var(--da-surface-2); transition: border-color 200ms ease, background 200ms ease; }",
      ".da-ladder-step.used { background: var(--da-amber-tint-2); border-color: var(--da-amber-border); }",
      ".da-ladder-step.active { background: var(--da-blue-tint-2); border-color: var(--da-accent-2); }",
      // Windows High Contrast Mode (forced-colors) — the OS overrides our
      // palette; keep structure visible via system-color borders + focus.
      "@media (forced-colors: active) {",
      "  .da-card, .da-ladder-step { border: 1px solid CanvasText; }",
      "  .da-root button { border: 1px solid ButtonText; }",
      "  .da-root button:focus-visible, .da-root a:focus-visible, .da-root input:focus-visible, .da-root select:focus-visible, .da-root textarea:focus-visible, .da-root summary:focus-visible, .da-root [tabindex]:focus-visible { outline: 3px solid Highlight; }",
      "}",
      // Phase E — Print packet styles
      ".da-print-packet { display: none; }",
      // Phase S — Family letter is hidden by default on screen
      ".da-family-letter { display: none; }",
      // Phase T — Teacher handoff print block is hidden by default
      ".da-teacher-handoff-print { display: none; }",
      "@media print {",
      // Re-pin every theme token to its LIGHT value so packets, family
      // letters, and handoffs print dark-on-white even from dark/contrast.
      "  .da-shell, .da-shell.da-theme-dark, .da-shell.da-theme-contrast, .da-root { " + daBuildTokenCss(0) + " }",
      "  body * { visibility: hidden !important; }",
      "  .da-print-packet, .da-print-packet * { visibility: visible !important; }",
      "  .da-print-packet { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 20px; }",
      "  .da-print-packet h1, .da-print-packet h2, .da-print-packet h3 { color: #000 !important; }",
      "  .da-print-packet .no-print { display: none !important; }",
      "  .da-print-section { page-break-inside: avoid; margin-bottom: 16px; }",
      "  .da-print-section h2 { border-bottom: 1.5px solid #000; padding-bottom: 4px; font-size: 13pt; margin: 0 0 8px; }",
      "  .da-print-meta { font-size: 9pt; color: #444; font-style: italic; }",
      "  .da-print-stat { display: inline-block; padding: 4px 8px; border: 1px solid #999; border-radius: 4px; margin: 2px 4px 2px 0; font-size: 9pt; }",
      "  .da-print-table { width: 100%; border-collapse: collapse; font-size: 9pt; }",
      "  .da-print-table th, .da-print-table td { border: 1px solid #999; padding: 3px 6px; text-align: left; }",
      "  .da-print-table th { background: #eee; font-weight: 700; }",
      // Phase S — Family letter print mode (toggled via body[data-da-print-mode='family-letter'])
      "  body[data-da-print-mode='family-letter'] .da-print-packet, body[data-da-print-mode='family-letter'] .da-print-packet * { visibility: hidden !important; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter, body[data-da-print-mode='family-letter'] .da-family-letter * { visibility: visible !important; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 36pt 48pt; font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.65; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter h1 { font-size: 18pt; margin: 0 0 12pt; color: #000 !important; font-weight: 700; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter h2 { font-size: 12pt; margin: 16pt 0 4pt; color: #000 !important; font-weight: 700; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter p { margin: 0 0 8pt; color: #000 !important; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter ol { margin: 4pt 0 8pt 18pt; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter .da-family-greeting { font-size: 12pt; margin-bottom: 18pt; }",
      "  body[data-da-print-mode='family-letter'] .da-family-letter .da-family-signoff { margin-top: 24pt; font-style: italic; color: #333 !important; }",
      // Phase T — Teacher handoff print mode
      "  body[data-da-print-mode='teacher-handoff'] .da-print-packet, body[data-da-print-mode='teacher-handoff'] .da-print-packet * { visibility: hidden !important; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print, body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print * { visibility: visible !important; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 28pt 36pt; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 10.5pt; line-height: 1.55; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print h1 { font-size: 14pt; margin: 0 0 4pt; color: #000 !important; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print h2 { font-size: 11pt; margin: 10pt 0 4pt; color: #000 !important; padding-bottom: 2pt; border-bottom: 1px solid #999; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print h3 { font-size: 10pt; margin: 6pt 0 2pt; color: #000 !important; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print p, body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print li { margin: 0 0 4pt; color: #000 !important; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print ol, body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print ul { margin: 2pt 0 4pt 18pt; }",
      "  body[data-da-print-mode='teacher-handoff'] .da-teacher-handoff-print .da-th-redflag { background: #f5f5f5; padding: 6pt 8pt; border-left: 2pt solid #000; }",
      "}"
    ].join("\n");
    if (document.head) document.head.appendChild(st);
  })();

  // ═════════════════════════════════════════════════════════
  // SECTION 1 — Item schema + content
  // ═════════════════════════════════════════════════════════
  // Each item:
  //   {
  //     id, domain, difficulty ('easy'|'medium'|'hard'),
  //     construct, gradeBand,
  //     prompt: string,                       // What the student sees
  //     correctAnswer: string,                // Canonical
  //     acceptableAnswers: [string],          // Case-insensitive partials accepted
  //     promptLadder: [                       // Always 4 levels
  //       { level:1, type:'cue', text:'...' },
  //       { level:2, type:'leading', text:'...' },
  //       { level:3, type:'model', text:'...' },
  //       { level:4, type:'directTeach', text:'...' }
  //     ],
  //     constructTags: [string],              // For aggregate reporting
  //     transferTwin?: { prompt, correctAnswer, acceptableAnswers }
  //       // Parallel-but-novel item; tests if learning generalized.
  //   }

  // ─── MATH REASONING ITEM BANK ───
  // 12 items × 3 difficulty levels = 36 items.
  // Grade bands roughly: easy = grades 2-3, medium = grades 4-5, hard = 6-7.
  // Prompt-ladder pattern for math word problems:
  //   L1 declarative cue: orient to the question being asked
  //   L2 leading question: nudge toward the operation/strategy
  //   L3 modeling: show a similar move, then ask student to apply
  //   L4 direct teach: give the move + answer with explanation
  var MATH_ITEMS = [
    // ─── EASY (grades 2-3): one-step word problems ───
    {
      id: "math-e-01", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Subtraction word problem",
      prompt: "Sara had 12 apples. She gave 5 to her brother. How many apples does Sara have left?",
      correctAnswer: "7",
      acceptableAnswers: ["7", "seven", "7 apples", "seven apples"],
      promptLadder: [
        { level: 1, type: "cue", text: "What is the question asking you to find?" },
        { level: 2, type: "leading", text: "When you give something away, do you have more or fewer left?" },
        { level: 3, type: "model", text: "Let me show you: if I had 10 apples and gave 3 away, I'd do 10 - 3 = 7. Now try yours: 12 - 5 = ?" },
        { level: 4, type: "directTeach", text: "When someone 'gives away' apples, we subtract. So 12 - 5 = 7. Sara has 7 apples left." }
      ],
      constructTags: ["subtraction", "one-step"],
      transferTwin: { prompt: "Marco had 14 pencils. He gave 6 to his friend. How many pencils does Marco have left?", correctAnswer: "8", acceptableAnswers: ["8", "eight", "8 pencils", "eight pencils"] }
    },
    {
      id: "math-e-02", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Addition word problem",
      prompt: "Liam read 8 pages on Monday and 6 pages on Tuesday. How many pages did he read in total?",
      correctAnswer: "14",
      acceptableAnswers: ["14", "fourteen", "14 pages", "fourteen pages"],
      promptLadder: [
        { level: 1, type: "cue", text: "We want the total. Total means putting things together." },
        { level: 2, type: "leading", text: "If you read some on one day and some on another, do you add or subtract?" },
        { level: 3, type: "model", text: "Like: 3 pages + 5 pages = 8 pages total. Now do yours: 8 + 6 = ?" },
        { level: 4, type: "directTeach", text: "Total means add. 8 + 6 = 14. Liam read 14 pages in total." }
      ],
      constructTags: ["addition", "one-step"],
      transferTwin: { prompt: "Mia drew 7 pictures in the morning and 9 in the afternoon. How many did she draw in total?", correctAnswer: "16", acceptableAnswers: ["16", "sixteen"] }
    },
    {
      id: "math-e-03", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Comparison difference",
      prompt: "Jake has 15 stickers. Maya has 9 stickers. How many more stickers does Jake have than Maya?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "six", "6 stickers"],
      promptLadder: [
        { level: 1, type: "cue", text: "'How many more' means we want the difference between two numbers." },
        { level: 2, type: "leading", text: "If Jake has more, what operation finds the difference?" },
        { level: 3, type: "model", text: "If one person has 10 and another has 4, the difference is 10 - 4 = 6. Try yours: 15 - 9 = ?" },
        { level: 4, type: "directTeach", text: "Difference = larger minus smaller. 15 - 9 = 6. Jake has 6 more stickers than Maya." }
      ],
      constructTags: ["subtraction", "comparison"]
    },
    {
      id: "math-e-04", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Equal groups (multiplication concept)",
      prompt: "There are 4 boxes. Each box has 3 toys. How many toys are there in all?",
      correctAnswer: "12",
      acceptableAnswers: ["12", "twelve", "12 toys"],
      promptLadder: [
        { level: 1, type: "cue", text: "Each box has the same number. We want the total." },
        { level: 2, type: "leading", text: "If you have equal groups, you can add or you can multiply. Which would be faster?" },
        { level: 3, type: "model", text: "Like: 2 boxes with 3 toys each is 3 + 3 = 6 (or 2 × 3 = 6). Try yours: 3 + 3 + 3 + 3 = ?" },
        { level: 4, type: "directTeach", text: "4 groups of 3 is 4 × 3 = 12. There are 12 toys in all." }
      ],
      constructTags: ["multiplication", "equal-groups"]
    },
    {
      id: "math-e-05", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Sharing (division concept)",
      prompt: "There are 18 cookies. Three friends share them equally. How many cookies does each friend get?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "six", "6 cookies"],
      promptLadder: [
        { level: 1, type: "cue", text: "'Share equally' means each person gets the same amount." },
        { level: 2, type: "leading", text: "If you split 18 things into 3 equal groups, what operation does that?" },
        { level: 3, type: "model", text: "Like: 12 cookies, 4 friends → 12 ÷ 4 = 3 each. Try yours: 18 ÷ 3 = ?" },
        { level: 4, type: "directTeach", text: "Sharing equally is division. 18 ÷ 3 = 6. Each friend gets 6 cookies." }
      ],
      constructTags: ["division", "sharing"]
    },
    {
      id: "math-e-06", domain: "math", difficulty: "easy", gradeBand: "2-3",
      construct: "Money — making change (subtraction)",
      prompt: "A book costs $4. You pay with a $10 bill. How much change do you get back?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "$6", "six", "$6.00", "six dollars"],
      promptLadder: [
        { level: 1, type: "cue", text: "Change is what's left over after paying." },
        { level: 2, type: "leading", text: "If you handed over $10 and the book cost $4, do you subtract or add to find the change?" },
        { level: 3, type: "model", text: "Like: pay $5 for a $2 thing → change = $5 - $2 = $3. Try yours: $10 - $4 = ?" },
        { level: 4, type: "directTeach", text: "Change = money paid - cost. $10 - $4 = $6. You get $6 back." }
      ],
      constructTags: ["subtraction", "money"]
    },
    // ─── MEDIUM (grades 4-5): two-step word problems ───
    {
      id: "math-m-01", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (multiply then subtract)",
      prompt: "A baker made 6 trays of muffins with 8 muffins per tray. She sold 35 muffins. How many muffins does she have left?",
      correctAnswer: "13",
      acceptableAnswers: ["13", "thirteen", "13 muffins"],
      promptLadder: [
        { level: 1, type: "cue", text: "There are two steps here: how many total were made, then how many remain after selling." },
        { level: 2, type: "leading", text: "Step 1: 6 trays of 8 muffins each. What operation gets the total made?" },
        { level: 3, type: "model", text: "Step 1: 6 × 8 = 48 muffins total. Step 2: subtract what was sold. So 48 - 35 = ?" },
        { level: 4, type: "directTeach", text: "First find total made: 6 × 8 = 48. Then subtract sold: 48 - 35 = 13 muffins left." }
      ],
      constructTags: ["multiplication", "subtraction", "two-step"],
      transferTwin: { prompt: "A factory made 5 boxes of pens with 12 pens per box. They shipped 41 pens. How many pens are left?", correctAnswer: "19", acceptableAnswers: ["19", "nineteen"] }
    },
    {
      id: "math-m-02", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (add then divide)",
      prompt: "Tomas had $24. His grandma gave him $12 more for his birthday. He wants to share all his money equally with his 3 cousins (himself + 3 = 4 people total). How much does each person get?",
      correctAnswer: "9",
      acceptableAnswers: ["9", "$9", "nine", "$9.00", "nine dollars"],
      promptLadder: [
        { level: 1, type: "cue", text: "Two steps: figure out total money, then split it equally." },
        { level: 2, type: "leading", text: "Step 1: he started with $24 and got $12 more. Total? Step 2: shared among 4 people. What operation?" },
        { level: 3, type: "model", text: "Step 1: $24 + $12 = $36 total. Step 2: $36 ÷ 4 = ? per person." },
        { level: 4, type: "directTeach", text: "Total = $24 + $12 = $36. Split 4 ways: $36 ÷ 4 = $9. Each person gets $9." }
      ],
      constructTags: ["addition", "division", "two-step", "money"]
    },
    {
      id: "math-m-03", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (rate × time then compare)",
      prompt: "Ana types 25 words per minute. She types for 6 minutes. How many words has she typed?",
      correctAnswer: "150",
      acceptableAnswers: ["150", "one hundred fifty", "150 words"],
      promptLadder: [
        { level: 1, type: "cue", text: "Rate is 'how many per minute'. Time is how many minutes." },
        { level: 2, type: "leading", text: "If she does 25 words every minute, and she does that for 6 minutes, what operation gets the total?" },
        { level: 3, type: "model", text: "If she did 10 words/min for 4 min, that's 10 × 4 = 40 words. Try yours: 25 × 6 = ?" },
        { level: 4, type: "directTeach", text: "Rate × time = total. 25 × 6 = 150 words." }
      ],
      constructTags: ["multiplication", "rate"]
    },
    {
      id: "math-m-04", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Two-step (subtract then multiply)",
      prompt: "A toy costs $15. It is on sale for $3 off. If you buy 4 of them, how much do you pay total?",
      correctAnswer: "48",
      acceptableAnswers: ["48", "$48", "forty-eight", "$48.00"],
      promptLadder: [
        { level: 1, type: "cue", text: "Two steps: find the sale price first, then total for 4." },
        { level: 2, type: "leading", text: "Step 1: $15 - $3 off = sale price. Step 2: 4 toys at that price." },
        { level: 3, type: "model", text: "Step 1: $15 - $3 = $12 sale price. Step 2: $12 × 4 = ?" },
        { level: 4, type: "directTeach", text: "Sale price = $15 - $3 = $12. Total = $12 × 4 = $48." }
      ],
      constructTags: ["subtraction", "multiplication", "two-step", "money"]
    },
    {
      id: "math-m-05", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Fraction of a whole",
      prompt: "A pizza is cut into 8 slices. Tara eats 3 slices. What fraction of the pizza did she eat?",
      correctAnswer: "3/8",
      acceptableAnswers: ["3/8", "three eighths", "three-eighths", "3 out of 8"],
      promptLadder: [
        { level: 1, type: "cue", text: "A fraction has a top number (what you have) and a bottom number (the whole)." },
        { level: 2, type: "leading", text: "What is the whole? What part did she take?" },
        { level: 3, type: "model", text: "If a cake is cut into 6 pieces and you eat 2, that's 2/6 of the cake. Try yours." },
        { level: 4, type: "directTeach", text: "Whole = 8 slices. She ate 3. The fraction is 3/8." }
      ],
      constructTags: ["fractions", "part-whole"]
    },
    {
      id: "math-m-06", domain: "math", difficulty: "medium", gradeBand: "4-5",
      construct: "Time elapsed",
      prompt: "A movie starts at 3:45 PM and ends at 5:20 PM. How long is the movie?",
      correctAnswer: "1 hour 35 minutes",
      acceptableAnswers: ["1 hour 35 minutes", "1h 35m", "1:35", "95 minutes", "1 hr 35 min"],
      promptLadder: [
        { level: 1, type: "cue", text: "We want the time that passed between start and end." },
        { level: 2, type: "leading", text: "From 3:45 to 4:45 is one hour. How many more minutes from 4:45 to 5:20?" },
        { level: 3, type: "model", text: "Like: 2:30 PM to 4:00 PM is 1 hour 30 minutes. For yours, 3:45 → 4:45 = 1 hr, then 4:45 → 5:20 = 35 min." },
        { level: 4, type: "directTeach", text: "From 3:45 to 5:20 = 1 hour (3:45 to 4:45) + 35 minutes (4:45 to 5:20) = 1 hour 35 minutes." }
      ],
      constructTags: ["time", "elapsed"]
    },
    // ─── HARD (grades 6-7): multi-step with fractions/proportions/percents ───
    {
      id: "math-h-01", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Percent of a quantity",
      prompt: "A jacket costs $80. It is 25% off. What is the sale price?",
      correctAnswer: "60",
      acceptableAnswers: ["60", "$60", "sixty", "$60.00"],
      promptLadder: [
        { level: 1, type: "cue", text: "Percent off means a discount. The sale price is less than the original." },
        { level: 2, type: "leading", text: "Step 1: How much is the discount in dollars? Step 2: subtract it from the original." },
        { level: 3, type: "model", text: "25% of $80: think 25% = 1/4. So $80 ÷ 4 = $20 discount. Then $80 - $20 = ?" },
        { level: 4, type: "directTeach", text: "Discount = 25% × $80 = $20. Sale price = $80 - $20 = $60." }
      ],
      constructTags: ["percent", "two-step", "money"],
      transferTwin: { prompt: "A backpack costs $40. It is 20% off. What is the sale price?", correctAnswer: "32", acceptableAnswers: ["32", "$32", "thirty-two"] }
    },
    {
      id: "math-h-02", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Adding fractions with unlike denominators",
      prompt: "A recipe needs 1/2 cup of milk and 1/4 cup of cream. How much liquid total?",
      correctAnswer: "3/4",
      acceptableAnswers: ["3/4", "three quarters", "three-quarters", "3/4 cup", "0.75 cups"],
      promptLadder: [
        { level: 1, type: "cue", text: "To add fractions, the bottom numbers must match." },
        { level: 2, type: "leading", text: "1/2 and 1/4 have different bottoms. Can we rewrite 1/2 so both have the same bottom number?" },
        { level: 3, type: "model", text: "1/2 = 2/4 (same value, different name). Now you can add 2/4 + 1/4 = ?" },
        { level: 4, type: "directTeach", text: "Convert: 1/2 = 2/4. Then add: 2/4 + 1/4 = 3/4 cup total." }
      ],
      constructTags: ["fractions", "addition", "common-denominators"]
    },
    {
      id: "math-h-03", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Ratio / proportion",
      prompt: "A recipe uses 3 cups of flour for every 2 cups of sugar. If you use 9 cups of flour, how much sugar do you need?",
      correctAnswer: "6",
      acceptableAnswers: ["6", "six", "6 cups", "six cups"],
      promptLadder: [
        { level: 1, type: "cue", text: "The ratio of flour to sugar stays the same. We just scale up." },
        { level: 2, type: "leading", text: "How many times bigger is 9 than 3? Whatever factor that is, apply it to sugar too." },
        { level: 3, type: "model", text: "9 ÷ 3 = 3. So everything is 3 times bigger. Sugar: 2 × 3 = ?" },
        { level: 4, type: "directTeach", text: "Scale factor = 9 ÷ 3 = 3. Sugar = 2 × 3 = 6 cups." }
      ],
      constructTags: ["ratio", "proportion"]
    },
    {
      id: "math-h-04", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Average (mean)",
      prompt: "Marisol scored 80, 92, and 86 on three tests. What is her average score?",
      correctAnswer: "86",
      acceptableAnswers: ["86", "eighty-six", "86 points"],
      promptLadder: [
        { level: 1, type: "cue", text: "Average means 'spread out evenly'. Two steps: add them up, then divide." },
        { level: 2, type: "leading", text: "Step 1: 80 + 92 + 86 = ? Step 2: divide by how many tests (3)." },
        { level: 3, type: "model", text: "Sum: 80 + 92 + 86 = 258. Average: 258 ÷ 3 = ?" },
        { level: 4, type: "directTeach", text: "Average = (sum) ÷ (count). (80 + 92 + 86) ÷ 3 = 258 ÷ 3 = 86." }
      ],
      constructTags: ["mean", "multi-step"]
    },
    {
      id: "math-h-05", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Distance = rate × time (find time)",
      prompt: "A train travels at 60 miles per hour. How long does it take to travel 180 miles?",
      correctAnswer: "3 hours",
      acceptableAnswers: ["3", "three", "3 hours", "three hours", "3 hr", "3h"],
      promptLadder: [
        { level: 1, type: "cue", text: "Distance = rate × time. We know distance and rate; we want time." },
        { level: 2, type: "leading", text: "If you rearrange: time = distance ÷ rate. So divide miles by miles per hour." },
        { level: 3, type: "model", text: "At 60 mph, in 1 hour you go 60 miles, in 2 hours 120 miles. So 180 miles takes 180 ÷ 60 = ?" },
        { level: 4, type: "directTeach", text: "Time = distance ÷ rate = 180 ÷ 60 = 3 hours." }
      ],
      constructTags: ["rate", "division", "physics"]
    },
    {
      id: "math-h-06", domain: "math", difficulty: "hard", gradeBand: "6-7",
      construct: "Percent increase",
      prompt: "A plant was 12 inches tall. It grew to 15 inches. What is the percent increase?",
      correctAnswer: "25%",
      acceptableAnswers: ["25%", "25", "25 percent", "twenty-five percent", "25 %"],
      promptLadder: [
        { level: 1, type: "cue", text: "Percent change compares the growth to the original size." },
        { level: 2, type: "leading", text: "Step 1: How much did it grow (in inches)? Step 2: That growth is what fraction of the original 12?" },
        { level: 3, type: "model", text: "Growth = 15 - 12 = 3 inches. As a fraction of original: 3/12 = 1/4 = 25%." },
        { level: 4, type: "directTeach", text: "Percent increase = (new - old) ÷ old × 100. (15 - 12) ÷ 12 × 100 = 25%." }
      ],
      constructTags: ["percent", "change"]
    }
  ];

  // ─── READING COMPREHENSION ITEM BANK (Phase C) ───
  // Short passages embedded in the prompt + literal / inferential
  // questions. Scaffold ladder for reading:
  //   L1 (cue): orient student to re-read or locate the relevant span
  //   L2 (leading): point to the specific kind of evidence in the text
  //   L3 (model): show a parallel inference, then redirect
  //   L4 (directTeach): give the answer with reasoning
  var READING_ITEMS = [
    // ─── EASY (grades 2-3) ───
    {
      id: "read-e-01", domain: "reading", difficulty: "easy", gradeBand: "2-3",
      construct: "Literal recall",
      prompt: "Maya put her bike in the garage because it was raining. Where is the bike now?",
      correctAnswer: "garage",
      acceptableAnswers: ["garage", "in the garage", "in garage"],
      promptLadder: [
        { level: 1, type: "cue", text: "The answer is right there in the sentence. Read it again carefully." },
        { level: 2, type: "leading", text: "What does the sentence say Maya did with her bike?" },
        { level: 3, type: "model", text: "When a sentence says 'Tom put the keys on the table', and we're asked where the keys are, the answer is on the table. Now look at yours." },
        { level: 4, type: "directTeach", text: "The sentence tells us directly: Maya put the bike IN THE GARAGE. So the bike is in the garage." }
      ],
      constructTags: ["literal-recall"],
      transferTwin: { prompt: "Diego put his backpack under the desk because the floor was wet. Where is the backpack?", correctAnswer: "under the desk", acceptableAnswers: ["under the desk", "desk", "under desk"] }
    },
    {
      id: "read-e-02", domain: "reading", difficulty: "easy", gradeBand: "2-3",
      construct: "Cause and effect",
      prompt: "The plant on the windowsill turned yellow after Sam forgot to water it for two weeks. Why did the plant turn yellow?",
      correctAnswer: "no water",
      acceptableAnswers: ["no water", "not watered", "Sam forgot to water", "lack of water", "needed water"],
      promptLadder: [
        { level: 1, type: "cue", text: "The sentence tells us what happened before the plant turned yellow." },
        { level: 2, type: "leading", text: "What did Sam forget to do?" },
        { level: 3, type: "model", text: "If a sentence said 'the cookies burned because the oven was too hot', the cause is the hot oven. What was the cause here?" },
        { level: 4, type: "directTeach", text: "The plant turned yellow BECAUSE Sam forgot to water it. The cause is no water for two weeks." }
      ],
      constructTags: ["cause-effect"]
    },
    {
      id: "read-e-03", domain: "reading", difficulty: "easy", gradeBand: "2-3",
      construct: "Sequence",
      prompt: "First Liam picked up the milk. Then he poured it into a glass. Last he drank it. What did Liam do FIRST?",
      correctAnswer: "picked up the milk",
      acceptableAnswers: ["picked up the milk", "picked up milk", "got the milk", "grabbed the milk", "milk"],
      promptLadder: [
        { level: 1, type: "cue", text: "The story uses three order words: First, Then, Last. Look for First." },
        { level: 2, type: "leading", text: "Which sentence starts with the word 'First'?" },
        { level: 3, type: "model", text: "In a story, 'first' marks the very first action. If a story says 'First the bell rang, then she stood up', the first action is the bell ringing." },
        { level: 4, type: "directTeach", text: "The first sentence begins 'First Liam picked up the milk.' That's the first action." }
      ],
      constructTags: ["sequencing"]
    },
    {
      id: "read-e-04", domain: "reading", difficulty: "easy", gradeBand: "2-3",
      construct: "Pronoun reference",
      prompt: "Lily gave the book to her brother. Then he read it under his blanket. Who read the book?",
      correctAnswer: "her brother",
      acceptableAnswers: ["brother", "her brother", "lily's brother", "the brother"],
      promptLadder: [
        { level: 1, type: "cue", text: "The word 'he' in the second sentence refers to someone in the first sentence." },
        { level: 2, type: "leading", text: "Who is 'he' — Lily or her brother?" },
        { level: 3, type: "model", text: "If a sentence says 'Maya passed the ball to her sister. She kicked it.' — 'she' is the sister because she got the ball. Same idea here." },
        { level: 4, type: "directTeach", text: "Lily gave the book to her brother, and then HE read it. 'He' is her brother. The brother read the book." }
      ],
      constructTags: ["pronoun-reference", "inference"]
    },
    {
      id: "read-e-05", domain: "reading", difficulty: "easy", gradeBand: "2-3",
      construct: "Inference from clues",
      prompt: "Coach blew the whistle. The players grabbed their water bottles and sat on the bench. What is happening?",
      correctAnswer: "break",
      acceptableAnswers: ["break", "water break", "halftime", "rest", "time out", "timeout", "rest break"],
      promptLadder: [
        { level: 1, type: "cue", text: "Think about what players do when they stop playing for a moment." },
        { level: 2, type: "leading", text: "Why would players grab water bottles and sit down? When does that happen during a game?" },
        { level: 3, type: "model", text: "Clues like 'water bottles' and 'sit on the bench' usually mean a pause in the game. What kind of pause?" },
        { level: 4, type: "directTeach", text: "The coach paused play, the players drank water and sat down — they're taking a break (or halftime / time out)." }
      ],
      constructTags: ["inference"]
    },
    {
      id: "read-e-06", domain: "reading", difficulty: "easy", gradeBand: "2-3",
      construct: "Vocabulary in context",
      prompt: "The exhausted hiker collapsed onto the picnic table after walking ten miles uphill. What does EXHAUSTED mean?",
      correctAnswer: "very tired",
      acceptableAnswers: ["very tired", "tired", "really tired", "worn out", "no energy"],
      promptLadder: [
        { level: 1, type: "cue", text: "The word EXHAUSTED is describing how the hiker feels. What clues in the sentence tell you about that feeling?" },
        { level: 2, type: "leading", text: "What did the hiker do RIGHT AFTER ten miles uphill? What kind of person collapses onto a table?" },
        { level: 3, type: "model", text: "If a sentence says 'The thirsty runner gulped down water', thirsty means needing water. Use the action clues — what does 'collapsed after ten miles' tell us?" },
        { level: 4, type: "directTeach", text: "Exhausted means very tired. The clues — ten miles, uphill, collapsing — tell us the hiker had no energy left." }
      ],
      constructTags: ["vocabulary", "context-clues"]
    },
    // ─── MEDIUM (grades 4-5) ───
    {
      id: "read-m-01", domain: "reading", difficulty: "medium", gradeBand: "4-5",
      construct: "Inference from multiple clues",
      prompt: "The streetlight at the corner of Elm and Oak had been out for three weeks. Mrs. Chen kept calling the city, but no one came. Finally, last Friday, a yellow truck pulled up to the corner and a worker climbed into a bucket lift. What is the worker probably doing?",
      correctAnswer: "fixing the streetlight",
      acceptableAnswers: ["fixing the streetlight", "fixing the light", "repairing the streetlight", "replacing the bulb", "repairing the light"],
      promptLadder: [
        { level: 1, type: "cue", text: "The passage talks about something broken. Then a truck shows up. Connect those." },
        { level: 2, type: "leading", text: "What was broken for three weeks? Why does the city send trucks with bucket lifts?" },
        { level: 3, type: "model", text: "If a story said 'The roof leaked all month. Finally a truck arrived with a ladder', we'd guess: roof repair. Same pattern here." },
        { level: 4, type: "directTeach", text: "The streetlight has been out, the city was called, and now a worker is in a bucket lift at that corner — almost certainly fixing the streetlight." }
      ],
      constructTags: ["inference", "synthesis"],
      transferTwin: { prompt: "The mailbox at the end of Hadley Lane had been dented for a month. The Andersons had filed a complaint. On Tuesday, a postal-service van stopped at the corner and a worker stepped out with tools. What is the worker probably doing?", correctAnswer: "fixing the mailbox", acceptableAnswers: ["fixing the mailbox", "repairing the mailbox", "replacing the mailbox"] }
    },
    {
      id: "read-m-02", domain: "reading", difficulty: "medium", gradeBand: "4-5",
      construct: "Character motivation",
      prompt: "All week, Diego made his bed without being asked. He cleared the table every night and even took out the trash. On Saturday morning, he asked his dad if he could have a sleepover with two friends. What is Diego doing?",
      correctAnswer: "being helpful to get permission",
      acceptableAnswers: ["being helpful to get permission", "trying to get what he wants", "earning permission", "doing chores to ask for something", "buttering up his dad", "being good before asking"],
      promptLadder: [
        { level: 1, type: "cue", text: "Notice WHEN Diego started doing extra chores, and WHEN he asked for something." },
        { level: 2, type: "leading", text: "Why would someone do extra chores ALL week before asking for a favor?" },
        { level: 3, type: "model", text: "If a kid suddenly does all their homework AND their sister's chores right before asking for a big toy, we'd say they're trying to earn the toy. Same idea here." },
        { level: 4, type: "directTeach", text: "Diego stacked up a week of helpful actions, then asked for a sleepover. He was being especially helpful to get permission for the sleepover." }
      ],
      constructTags: ["motivation", "inference"]
    },
    {
      id: "read-m-03", domain: "reading", difficulty: "medium", gradeBand: "4-5",
      construct: "Compare and contrast",
      prompt: "Most owls hunt at night. They have huge eyes that catch even tiny amounts of light, and soft feathers that let them fly silently. Hawks are different — they hunt during the day and rely on sharp vision in bright sun. How are owl eyes DIFFERENT from hawk eyes?",
      correctAnswer: "owl eyes are bigger / made for low light",
      acceptableAnswers: ["bigger", "huge", "made for night", "for low light", "for the dark", "catch more light", "bigger to see at night", "larger"],
      promptLadder: [
        { level: 1, type: "cue", text: "The passage describes owl eyes with one specific word and tells us why." },
        { level: 2, type: "leading", text: "When do owls hunt? What did the passage say about the size of their eyes and why?" },
        { level: 3, type: "model", text: "Compare like this: 'Polar bears are white to blend with snow; brown bears are brown to blend with forest.' Use the same shape: 'Owl eyes are ___ to ___; hawk eyes are ___ to ___.'" },
        { level: 4, type: "directTeach", text: "Owl eyes are HUGE so they catch tiny amounts of light at night. Hawk eyes work in bright sun. The difference is size and what kind of light they're adapted to." }
      ],
      constructTags: ["compare-contrast"]
    },
    {
      id: "read-m-04", domain: "reading", difficulty: "medium", gradeBand: "4-5",
      construct: "Main idea",
      prompt: "Beavers cut down trees with their sharp front teeth. They drag the logs into rivers and pile them up to build dams. The dams slow the water and create ponds. In the middle of each pond, beavers build a wooden lodge as their home. What is this passage MOSTLY about?",
      correctAnswer: "how beavers build their homes",
      acceptableAnswers: ["how beavers build their homes", "how beavers build dams and homes", "how beavers make their dams", "beaver building", "beavers building homes", "beavers making dams"],
      promptLadder: [
        { level: 1, type: "cue", text: "Every sentence in the passage describes a step in something. What is the something?" },
        { level: 2, type: "leading", text: "List the steps the passage describes. What do they all add up to?" },
        { level: 3, type: "model", text: "If a passage says 'A bird grabs twigs, weaves them, and adds soft grass for lining,' the main idea is HOW THE BIRD BUILDS ITS NEST. Use the same logic here." },
        { level: 4, type: "directTeach", text: "Every sentence is a step in building: trees → logs → dam → pond → lodge. The main idea is HOW BEAVERS BUILD THEIR HOMES." }
      ],
      constructTags: ["main-idea"]
    },
    {
      id: "read-m-05", domain: "reading", difficulty: "medium", gradeBand: "4-5",
      construct: "Setting inference",
      prompt: "The bell rang. Children rushed out of doorways carrying lunchboxes and laughing. Mrs. Patel reminded everyone to walk, not run, in the hallway. Two kids dropped their pencils. Where is this happening?",
      correctAnswer: "at school",
      acceptableAnswers: ["school", "at school", "in school", "elementary school", "in a school", "hallway at school", "classroom hallway"],
      promptLadder: [
        { level: 1, type: "cue", text: "Look at the words: 'bell', 'doorways', 'lunchboxes', 'hallway', 'Mrs. Patel reminded everyone to walk.' What place do these go together in?" },
        { level: 2, type: "leading", text: "Where else would you have bells, classrooms, hallways, lunchboxes, and a teacher named Mrs. Patel?" },
        { level: 3, type: "model", text: "If a story has words like 'aisle', 'cart', 'checkout', and 'cashier', we know it's a grocery store. Use the words here the same way." },
        { level: 4, type: "directTeach", text: "Bell + lunchboxes + hallway + teacher reminding kids to walk = school. That's where this is happening." }
      ],
      constructTags: ["setting-inference"]
    },
    {
      id: "read-m-06", domain: "reading", difficulty: "medium", gradeBand: "4-5",
      construct: "Inference from environmental cues",
      prompt: "The garden hose was coiled neatly in the shed. The grass was tall and dry. Crispy brown leaves crunched under foot. The pumpkins on the front porch were starting to soften. What season is it most likely?",
      correctAnswer: "autumn",
      acceptableAnswers: ["autumn", "fall", "late fall", "late autumn", "october", "november"],
      promptLadder: [
        { level: 1, type: "cue", text: "Each clue suggests a time of year. Look at all four together." },
        { level: 2, type: "leading", text: "When do leaves turn brown and crunch? When are pumpkins on porches? When does the hose get put away?" },
        { level: 3, type: "model", text: "If clues are 'snow on the ground, ice on the windshield, kids in coats' — that's winter. Use the same logic." },
        { level: 4, type: "directTeach", text: "Crunchy brown leaves + softening pumpkins + hose put away = autumn / fall." }
      ],
      constructTags: ["inference", "synthesis"]
    },
    // ─── HARD (grades 6-7) ───
    {
      id: "read-h-01", domain: "reading", difficulty: "hard", gradeBand: "6-7",
      construct: "Author's purpose",
      prompt: "Even today, many people believe that humans use only 10% of their brains. This myth, repeated in movies and motivational posters, has no scientific basis. Brain-imaging studies have shown that virtually all areas of the brain are active during normal daily activities, including sleep. Why did the author probably write this passage?",
      correctAnswer: "to correct a myth",
      acceptableAnswers: ["to correct a myth", "to debunk a myth", "to inform", "to correct misinformation", "to disprove a common belief", "to explain that the 10% claim is false", "to refute a myth"],
      promptLadder: [
        { level: 1, type: "cue", text: "Look at the verbs the author uses about the 10% claim. Are they supporting it or pushing back?" },
        { level: 2, type: "leading", text: "When the author says 'this myth has no scientific basis' and cites brain-imaging — what is the author trying to convince you of?" },
        { level: 3, type: "model", text: "If an author writes 'It is often said that lightning never strikes the same place twice. In fact, lightning rods rely on the opposite being true,' the purpose is to correct a myth. Same shape here." },
        { level: 4, type: "directTeach", text: "The author calls the 10% claim a 'myth' with 'no scientific basis' and provides evidence against it. The purpose is to correct/debunk a myth." }
      ],
      constructTags: ["author-purpose"],
      transferTwin: { prompt: "Although many people believe goldfish have a 3-second memory, decades of laboratory studies have shown goldfish can learn complex routes, remember individual humans, and retain training for months. The myth persists because it is repeated in cartoons. Why did the author write this?", correctAnswer: "to correct a myth", acceptableAnswers: ["to correct a myth", "to debunk a myth", "to inform", "to refute a myth"] }
    },
    {
      id: "read-h-02", domain: "reading", difficulty: "hard", gradeBand: "6-7",
      construct: "Theme",
      prompt: "Marisol practiced piano for one hour every day. Her friends went to the park; her older sister rolled her eyes; her teacher said she was 'naturally gifted.' At the spring recital, Marisol played the hardest piece flawlessly. The audience cheered for the 'gifted' child. What is the main message of this story?",
      correctAnswer: "practice creates skill",
      acceptableAnswers: ["practice", "hard work", "effort", "practice not just talent", "practice creates skill", "skill comes from practice", "talent is really practice", "hard work pays off", "practice is what looks like talent"],
      promptLadder: [
        { level: 1, type: "cue", text: "The story ends with the audience saying she's 'gifted' — but what did she actually DO to get there?" },
        { level: 2, type: "leading", text: "What does the contrast between 'gifted' and 'one hour every day' suggest the author wants you to notice?" },
        { level: 3, type: "model", text: "If a story shows a runner training every dawn for months and then winning, while a commentator calls them a 'natural,' the theme is 'success comes from preparation, not magic.' Same shape here." },
        { level: 4, type: "directTeach", text: "The story shows Marisol's daily practice while the audience calls her 'gifted.' The author's message: what looks like talent is really sustained effort. Practice creates skill." }
      ],
      constructTags: ["theme", "synthesis"]
    },
    {
      id: "read-h-03", domain: "reading", difficulty: "hard", gradeBand: "6-7",
      construct: "Vocabulary from context",
      prompt: "After three days of careful negotiation, the two countries reached a tenuous agreement. The next morning, fighting broke out again, and the agreement collapsed. What does TENUOUS mean in this passage?",
      correctAnswer: "weak or fragile",
      acceptableAnswers: ["weak", "fragile", "weak or fragile", "unstable", "shaky", "not strong", "easily broken"],
      promptLadder: [
        { level: 1, type: "cue", text: "Notice what happened to the agreement IMMEDIATELY after it was made. That tells you something about how strong it was." },
        { level: 2, type: "leading", text: "An agreement that 'collapsed' the next morning was a strong agreement or a weak one?" },
        { level: 3, type: "model", text: "If a passage says 'The bridge was a fleeting structure; it stood for one season before being swept away,' fleeting means short-lived. Use the same logic — what happened to the agreement?" },
        { level: 4, type: "directTeach", text: "The agreement collapsed the next morning. That tells us 'tenuous' means weak or fragile — barely holding together." }
      ],
      constructTags: ["vocabulary", "context-clues"]
    },
    {
      id: "read-h-04", domain: "reading", difficulty: "hard", gradeBand: "6-7",
      construct: "Synthesizing multiple clues",
      prompt: "The plates were still warm on the table. Coffee cups sat in the sink, half full. The front door was unlocked but the car was gone. Mr. Lee's reading glasses sat on the kitchen counter, his half-finished crossword beside them. What can you conclude?",
      correctAnswer: "Mr. Lee left in a hurry",
      acceptableAnswers: ["left in a hurry", "rushed out", "left suddenly", "had to leave fast", "an emergency", "in a rush", "hurried out", "lee left in a hurry", "lee rushed out"],
      promptLadder: [
        { level: 1, type: "cue", text: "Each detail by itself is small. But together they paint a picture. List what's UNUSUAL in this scene." },
        { level: 2, type: "leading", text: "Warm plates, half-full coffee, unlocked door, glasses left behind, car gone. What kind of departure leaves THAT pattern?" },
        { level: 3, type: "model", text: "If a scene showed 'water still running, half-eaten sandwich, jacket on the floor, back door open' — we'd conclude someone left suddenly. Same shape here." },
        { level: 4, type: "directTeach", text: "Warm food + half-finished tasks + unlocked door + glasses left behind = Mr. Lee left in a hurry, possibly suddenly. The clues fit together." }
      ],
      constructTags: ["inference", "synthesis"]
    },
    {
      id: "read-h-05", domain: "reading", difficulty: "hard", gradeBand: "6-7",
      construct: "Fact vs. opinion",
      prompt: "Climate scientists agree that Earth's average surface temperature has risen by approximately 1.1°C since 1880. This rise is driven primarily by greenhouse gas emissions from burning fossil fuels. Some politicians refuse to act on this evidence, which is the single greatest moral failure of our generation. Which sentence in this paragraph is OPINION, not fact?",
      correctAnswer: "the third sentence",
      acceptableAnswers: ["the third sentence", "third sentence", "the last sentence", "last sentence", "the moral failure sentence", "single greatest moral failure"],
      promptLadder: [
        { level: 1, type: "cue", text: "Facts can be checked — measured, verified. Opinions involve judgments or values. Read each sentence and ask: 'could I verify this with data?'" },
        { level: 2, type: "leading", text: "Which sentence uses judgment language ('single greatest moral failure') rather than measurable data?" },
        { level: 3, type: "model", text: "'The river is 200 meters wide' = fact (measurable). 'The river is too beautiful to dam' = opinion (a value judgment). Apply that test here." },
        { level: 4, type: "directTeach", text: "The third sentence — 'the single greatest moral failure of our generation' — is a value judgment, not a verifiable measurement. That's opinion." }
      ],
      constructTags: ["fact-opinion", "critical-reading"]
    },
    {
      id: "read-h-06", domain: "reading", difficulty: "hard", gradeBand: "6-7",
      construct: "Identifying flaws in argument",
      prompt: "An article claims that cell phones cause headaches. The article cites a new study that found 80% of participants reported headaches after using cell phones. Buried in paragraph three: the study included only 50 people, all of whom had been recruited from a chronic-headache clinic. What is the main problem with the article's claim?",
      correctAnswer: "biased sample",
      acceptableAnswers: ["biased sample", "selected sample", "the sample was biased", "they already had headaches", "the participants already had headaches", "biased participants", "sampling bias", "selection bias", "the study was biased"],
      promptLadder: [
        { level: 1, type: "cue", text: "The article makes a strong cause-effect claim. Look at WHO was in the study." },
        { level: 2, type: "leading", text: "If you recruited 50 people from a chronic-headache clinic and asked if they got headaches, would you have a fair test of whether phones cause headaches?" },
        { level: 3, type: "model", text: "If a study claimed 'fast food makes people unhealthy' but only recruited people already at a weight-loss clinic, the sample is biased — they were already unhealthy before any fast food. Same problem here." },
        { level: 4, type: "directTeach", text: "The participants were ALREADY from a chronic-headache clinic. Of course 80% reported headaches — they already had them. The sample is biased; the study can't prove phones cause headaches." }
      ],
      constructTags: ["critical-reading", "argument-analysis"]
    }
  ];

  // ─── WORKING MEMORY + EXECUTIVE FUNCTION ITEM BANK (Phase C) ───
  // These are administered VERBALLY by the examiner — the prompt is what
  // the examiner says to the student; the correctAnswer is what the
  // student should produce. The examiner can use the manual Mark-correct /
  // Mark-wrong buttons when auto-match doesn't fit cleanly.
  //
  // Scaffold ladder for WM/EF:
  //   L1 (cue): re-orient to the rule or repeat slowly
  //   L2 (leading): suggest a strategy (chunk it, say it aloud, visualize)
  //   L3 (model): show how YOU would do a parallel one
  //   L4 (directTeach): walk through the answer with reasoning
  var WM_ITEMS = [
    // ─── EASY (grades 2-3) ───
    {
      id: "wm-e-01", domain: "working-memory", difficulty: "easy", gradeBand: "2-3",
      construct: "Digit span forward (4 digits)",
      prompt: "I'm going to say 4 numbers. Listen carefully, then repeat them in the same order. Ready? 7, 2, 9, 4.",
      correctAnswer: "7 2 9 4",
      acceptableAnswers: ["7 2 9 4", "7, 2, 9, 4", "seven two nine four", "7294"],
      promptLadder: [
        { level: 1, type: "cue", text: "Listen one more time, in the same order. Then say them back." },
        { level: 2, type: "leading", text: "Try saying them under your breath as I say them — that often helps you hold onto them." },
        { level: 3, type: "model", text: "Watch how I do this with different numbers: '5, 1, 8.' My mouth softly says 5-1-8 right after the speaker. Now you try yours." },
        { level: 4, type: "directTeach", text: "The numbers were 7, 2, 9, 4 — in that exact order. Repeating them under your breath as I say them is a strategy that helps." }
      ],
      constructTags: ["working-memory", "digit-span", "verbal"]
    },
    {
      id: "wm-e-02", domain: "working-memory", difficulty: "easy", gradeBand: "2-3",
      construct: "Multi-step instruction (3 steps)",
      prompt: "I'll give you three things to do in order. Listen, then do them. Ready? Touch your nose. Clap once. Then say your name out loud.",
      correctAnswer: "nose, clap, name",
      acceptableAnswers: ["nose clap name", "touched nose clapped said name", "did all three in order", "completed all three steps", "correct sequence"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three things, in order. I'll say them again." },
        { level: 2, type: "leading", text: "Hold up three fingers as I say them. Touch each finger as you remember each step." },
        { level: 3, type: "model", text: "I'll give myself three: stand, sit, smile. Watch — STAND (I stand), SIT (I sit), SMILE (I smile). Now you do yours." },
        { level: 4, type: "directTeach", text: "The three steps in order: 1) touch nose, 2) clap once, 3) say your name. Let's do them together one at a time." }
      ],
      constructTags: ["working-memory", "instruction-following", "executive"]
    },
    {
      id: "wm-e-03", domain: "working-memory", difficulty: "easy", gradeBand: "2-3",
      construct: "Categorization",
      prompt: "I'll say four words. Three belong together — one doesn't. Which one DOESN'T belong? Apple, banana, train, grape.",
      correctAnswer: "train",
      acceptableAnswers: ["train", "the train", "train doesn't belong"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three of those things are alike in one way. Listen again: apple, banana, train, grape." },
        { level: 2, type: "leading", text: "What do apples, bananas, and grapes have in common? Is a train the same kind of thing?" },
        { level: 3, type: "model", text: "If I said 'shoe, sock, sandwich, boot' — three are footwear, one is food. The sandwich doesn't belong. Same idea." },
        { level: 4, type: "directTeach", text: "Apple, banana, and grape are all fruits. Train is a vehicle. Train doesn't belong." }
      ],
      constructTags: ["categorization", "executive"]
    },
    {
      id: "wm-e-04", domain: "working-memory", difficulty: "easy", gradeBand: "2-3",
      construct: "Rule-following with switching",
      prompt: "Remember this rule: clap if I say a COLOR, snap if I say a FRUIT. Practice: Red. Banana. Blue. Strawberry. Did you clap-snap-clap-snap?",
      correctAnswer: "clap snap clap snap",
      acceptableAnswers: ["clap snap clap snap", "yes", "correct sequence", "clapped for colors, snapped for fruits", "right pattern"],
      promptLadder: [
        { level: 1, type: "cue", text: "The rule: COLOR = clap. FRUIT = snap. Let me say each word slowly." },
        { level: 2, type: "leading", text: "First decide: is it a color or a fruit? Then clap or snap. Let's try just the first one: Red is a..." },
        { level: 3, type: "model", text: "Watch: I say SKY (a thing, not a color/fruit, so neither — wait, but for our rule let's say only color/fruit count). Let me show: BLUE — that's a color, so [I clap]. Now you." },
        { level: 4, type: "directTeach", text: "Red = color = clap. Banana = fruit = snap. Blue = color = clap. Strawberry = fruit = snap. The pattern is clap-snap-clap-snap." }
      ],
      constructTags: ["rule-following", "cognitive-flexibility", "executive"]
    },
    {
      id: "wm-e-05", domain: "working-memory", difficulty: "easy", gradeBand: "2-3",
      construct: "Mental visualization",
      prompt: "Picture a RED BALL on top of a YELLOW BOX. Now picture a GREEN STAR next to the box. Without looking, where is the red ball?",
      correctAnswer: "on top of the yellow box",
      acceptableAnswers: ["on top of the yellow box", "on top of the box", "on the box", "above the box", "on top of yellow box", "on yellow box"],
      promptLadder: [
        { level: 1, type: "cue", text: "Close your eyes if it helps. Build the picture piece by piece in your mind." },
        { level: 2, type: "leading", text: "What did I put down FIRST in the picture — the ball or the box?" },
        { level: 3, type: "model", text: "Like building blocks: I say 'a blue cat under a brown table.' I picture the brown table, then the blue cat going underneath. Now build yours." },
        { level: 4, type: "directTeach", text: "First I said the yellow box. Then the red ball ON TOP of it. The red ball is on top of the yellow box." }
      ],
      constructTags: ["visualization", "working-memory"]
    },
    {
      id: "wm-e-06", domain: "working-memory", difficulty: "easy", gradeBand: "2-3",
      construct: "Inhibition (simple Stroop-like)",
      prompt: "When I say UP, you say DOWN. When I say DOWN, you say UP. Ready? UP. UP. DOWN. UP. What did you say?",
      correctAnswer: "down down up down",
      acceptableAnswers: ["down down up down", "down, down, up, down", "down-down-up-down"],
      promptLadder: [
        { level: 1, type: "cue", text: "Slow down. After each word I say, do the opposite. UP becomes DOWN. DOWN becomes UP." },
        { level: 2, type: "leading", text: "It helps to whisper the opposite to yourself BEFORE you say it out loud. Let's try one: I say UP. You whisper to yourself..." },
        { level: 3, type: "model", text: "I'll show you. If I say LEFT and the rule is say the opposite, I think 'right' in my head, then say RIGHT out loud. Now you do yours: UP → ?" },
        { level: 4, type: "directTeach", text: "The rule swaps them: UP→down, UP→down, DOWN→up, UP→down. The answer is down, down, up, down." }
      ],
      constructTags: ["inhibition", "executive"]
    },
    // ─── MEDIUM (grades 4-5) ───
    {
      id: "wm-m-01", domain: "working-memory", difficulty: "medium", gradeBand: "4-5",
      construct: "Digit span backward (4 digits)",
      prompt: "I'll say four numbers. Repeat them BACKWARDS. Listen: 3, 8, 1, 6.",
      correctAnswer: "6 1 8 3",
      acceptableAnswers: ["6 1 8 3", "6, 1, 8, 3", "six one eight three", "6183"],
      promptLadder: [
        { level: 1, type: "cue", text: "I'll say them again. Hold them in your head, then say them in reverse order." },
        { level: 2, type: "leading", text: "Start from the last number you heard and work backwards. What was the LAST number?" },
        { level: 3, type: "model", text: "Watch with different numbers: 4, 9, 2. To go backwards I say the last first: 2, 9, 4. Now you do yours." },
        { level: 4, type: "directTeach", text: "Forward: 3, 8, 1, 6. Backward: start from the end. 6, 1, 8, 3. Saying the last one first is the trick." }
      ],
      constructTags: ["working-memory", "digit-span-backward", "verbal"],
      transferTwin: { prompt: "Repeat these four numbers backwards: 5, 2, 9, 4.", correctAnswer: "4 9 2 5", acceptableAnswers: ["4 9 2 5", "4, 9, 2, 5", "four nine two five", "4925"] }
    },
    {
      id: "wm-m-02", domain: "working-memory", difficulty: "medium", gradeBand: "4-5",
      construct: "Sorting by category (rule discovery)",
      prompt: "These four belong together: triangle, square, circle, hexagon. These two don't: penguin, river. Now sort these into the group OR not: pentagon, lion, rectangle, sky. Which two BELONG with the first group?",
      correctAnswer: "pentagon and rectangle",
      acceptableAnswers: ["pentagon and rectangle", "pentagon, rectangle", "pentagon rectangle", "rectangle and pentagon", "rectangle, pentagon", "the shapes"],
      promptLadder: [
        { level: 1, type: "cue", text: "Look at the first group. What do those four words have in common?" },
        { level: 2, type: "leading", text: "Triangle, square, circle, hexagon — what KIND of word is each one?" },
        { level: 3, type: "model", text: "If the first group was 'apple, banana, grape' (fruits) and you had to sort 'orange, dog, kiwi, cup', you'd pick the fruits: orange and kiwi. Same idea — find the category first." },
        { level: 4, type: "directTeach", text: "The first group is SHAPES. Pentagon and rectangle are also shapes. Lion is an animal; sky is the air. Pentagon and rectangle belong." }
      ],
      constructTags: ["categorization", "rule-discovery", "executive"]
    },
    {
      id: "wm-m-03", domain: "working-memory", difficulty: "medium", gradeBand: "4-5",
      construct: "Holding while doing",
      prompt: "Hold these four words in your head: RED, THREE, SQUARE, DOG. Now answer this math question: what's 7 + 8? Now repeat your four words.",
      correctAnswer: "red three square dog",
      acceptableAnswers: ["red three square dog", "red, three, square, dog", "all four words"],
      promptLadder: [
        { level: 1, type: "cue", text: "Hold them tight while you do the math. The math is the distractor — the words are what we're checking." },
        { level: 2, type: "leading", text: "Try saying them very quietly to yourself while you do the math. Whisper rehearsal helps." },
        { level: 3, type: "model", text: "Watch: I'll hold 'pencil, ten, blue, fish.' Now I solve 5 + 4 = 9. Then I check: pencil, ten, blue, fish. Now you do yours." },
        { level: 4, type: "directTeach", text: "The four words were RED, THREE, SQUARE, DOG. (Math answer is 15, but it's the holding-on that matters.)" }
      ],
      constructTags: ["working-memory", "dual-task", "executive"]
    },
    {
      id: "wm-m-04", domain: "working-memory", difficulty: "medium", gradeBand: "4-5",
      construct: "Sequential reasoning",
      prompt: "Three friends are in line: Aiko, Ben, Carlos. Carlos is in front of Ben. Aiko is in front of Carlos. Who is FIRST in line?",
      correctAnswer: "Aiko",
      acceptableAnswers: ["aiko", "Aiko"],
      promptLadder: [
        { level: 1, type: "cue", text: "Try to picture the line in your head. Put one person in front, then add the others using the rules." },
        { level: 2, type: "leading", text: "Start with: Carlos is in front of Ben. So the order so far is Carlos, then Ben. Now add Aiko — she's in front of Carlos." },
        { level: 3, type: "model", text: "Like building a line: if I told you 'Sam is in front of Maya, Maya is in front of Lee,' I'd put Sam first, then Maya, then Lee. Apply the same order." },
        { level: 4, type: "directTeach", text: "Carlos in front of Ben → C, B. Aiko in front of Carlos → A, C, B. Aiko is first." }
      ],
      constructTags: ["sequential-reasoning", "working-memory"]
    },
    {
      id: "wm-m-05", domain: "working-memory", difficulty: "medium", gradeBand: "4-5",
      construct: "Rule switching",
      prompt: "Sort by COLOR: red things together, blue things together. (Cards: red apple, blue marble, red truck, blue sky.) ... Now SWITCH: sort by SHAPE — round things together, NOT-round things together. Sort the same four.",
      correctAnswer: "round: apple, marble. not-round: truck, sky",
      acceptableAnswers: ["apple marble truck sky", "round apple marble not-round truck sky", "round things: apple marble; other: truck sky", "apple and marble are round"],
      promptLadder: [
        { level: 1, type: "cue", text: "Forget the colors for now. Look at each item and ask: is this thing ROUND?" },
        { level: 2, type: "leading", text: "Apple — round or not-round? Marble? Truck? Sky?" },
        { level: 3, type: "model", text: "Watch the switch: if the first rule was 'sort by color' and now the rule is 'sort by size,' I ignore the colors and look only at size. Same here — ignore color, look only at shape." },
        { level: 4, type: "directTeach", text: "Round: apple, marble. Not-round: truck (rectangular), sky (the sky isn't a shape). The switch from color to shape is what's hard — you have to drop the first rule." }
      ],
      constructTags: ["set-shifting", "cognitive-flexibility", "executive"]
    },
    {
      id: "wm-m-06", domain: "working-memory", difficulty: "medium", gradeBand: "4-5",
      construct: "Planning (errand sequencing)",
      prompt: "You have 4 errands today: post office, library, grocery, pharmacy. The library closes at 4pm. Everything else is open until 8pm. It's 2pm now. Which errand should you do FIRST and why?",
      correctAnswer: "library",
      acceptableAnswers: ["library", "the library", "library because it closes first"],
      promptLadder: [
        { level: 1, type: "cue", text: "One of those errands has a deadline. Which one?" },
        { level: 2, type: "leading", text: "If the library closes at 4pm and it's 2pm, how much time do you have? What happens to your other errands if you do them first?" },
        { level: 3, type: "model", text: "Like packing for a trip: if one item must be at the airport by 5pm and others can go any time, you handle the airport item first. Same principle here." },
        { level: 4, type: "directTeach", text: "The library closes earliest, so do it first. The other three errands stay open until 8pm and can wait." }
      ],
      constructTags: ["planning", "prioritization", "executive"]
    },
    // ─── HARD (grades 6-7) ───
    {
      id: "wm-h-01", domain: "working-memory", difficulty: "hard", gradeBand: "6-7",
      construct: "Digit span backward (6 digits)",
      prompt: "Repeat these six numbers BACKWARDS: 4, 9, 2, 7, 5, 1.",
      correctAnswer: "1 5 7 2 9 4",
      acceptableAnswers: ["1 5 7 2 9 4", "1, 5, 7, 2, 9, 4", "one five seven two nine four", "157294"],
      promptLadder: [
        { level: 1, type: "cue", text: "Six is more to hold. I'll say them again slowly." },
        { level: 2, type: "leading", text: "Try chunking — split them into two groups of three and reverse each chunk: (4-9-2) then (7-5-1)." },
        { level: 3, type: "model", text: "With different numbers like 6, 3, 8, 1, 4, 9 — I'd chunk: (6-3-8) → (8-3-6), then (1-4-9) → (9-4-1). The full backward order is 9-4-1-8-3-6." },
        { level: 4, type: "directTeach", text: "Forward: 4, 9, 2, 7, 5, 1. Backward: 1, 5, 7, 2, 9, 4. Chunking into threes helps a lot." }
      ],
      constructTags: ["working-memory", "digit-span-backward"]
    },
    {
      id: "wm-h-02", domain: "working-memory", difficulty: "hard", gradeBand: "6-7",
      construct: "Letter-number sequencing",
      prompt: "I'll say a mixed list of letters and numbers. Sort them: NUMBERS in order smallest to largest, then LETTERS in alphabetical order. Ready: K, 3, B, 7, M, 2.",
      correctAnswer: "2 3 7 B K M",
      acceptableAnswers: ["2 3 7 b k m", "2 3 7 B K M", "2, 3, 7, B, K, M", "two three seven B K M"],
      promptLadder: [
        { level: 1, type: "cue", text: "Two tasks. First, find all the numbers. Then all the letters. Then sort each group." },
        { level: 2, type: "leading", text: "From K, 3, B, 7, M, 2 — what are the numbers? What are the letters? Now order each group." },
        { level: 3, type: "model", text: "Same problem with H, 5, A, 1, P, 3 — numbers in order: 1, 3, 5. Letters in order: A, H, P. Full answer: 1, 3, 5, A, H, P. Now do yours." },
        { level: 4, type: "directTeach", text: "Numbers in the list: 3, 7, 2 → sorted: 2, 3, 7. Letters: K, B, M → alphabetical: B, K, M. Final: 2, 3, 7, B, K, M." }
      ],
      constructTags: ["working-memory", "set-shifting", "executive"]
    },
    {
      id: "wm-h-03", domain: "working-memory", difficulty: "hard", gradeBand: "6-7",
      construct: "Multi-step instruction (complex)",
      prompt: "Listen carefully. Touch your LEFT ear with your RIGHT hand, count to 5 BACKWARDS out loud, then tell me what color shirt I'm wearing — without looking at me again. (Examiner: wear/note shirt color before administering.)",
      correctAnswer: "completed all three steps",
      acceptableAnswers: ["completed all three", "did all three steps", "yes", "all three correct", "correct sequence"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three steps. I'll say them again. Hold them all before you start." },
        { level: 2, type: "leading", text: "Touch which ear with which hand? Then count which direction from 5? Then recall what color was my shirt?" },
        { level: 3, type: "model", text: "I'll do a parallel example: I'll touch my RIGHT knee with my LEFT hand, count 3-2-1, then tell you the color of the floor. Watch. Now you do yours." },
        { level: 4, type: "directTeach", text: "Step 1: left ear, right hand (cross-body). Step 2: count 5-4-3-2-1. Step 3: name the shirt color from memory. Let's do them one at a time." }
      ],
      constructTags: ["working-memory", "multi-step", "executive"]
    },
    {
      id: "wm-h-04", domain: "working-memory", difficulty: "hard", gradeBand: "6-7",
      construct: "Holding while reasoning",
      prompt: "Remember these three things: a recipe ingredient, a country, and a tool. Choose any. Now solve this: a train leaves Station A at 2pm going 60 mph; another leaves Station B at 3pm going 80 mph; the stations are 200 miles apart and the trains are heading toward each other. Roughly when will they meet? (Round to nearest hour.) Now tell me your three things.",
      correctAnswer: "all three things",
      acceptableAnswers: ["all three", "all three things", "named all three"],
      promptLadder: [
        { level: 1, type: "cue", text: "Pick three things you'll remember easily — concrete and visual. Then come back to them after the math." },
        { level: 2, type: "leading", text: "Whisper your three things once before starting the math, then again every minute or so during the math." },
        { level: 3, type: "model", text: "Watch: I pick PENCIL, JAPAN, HAMMER. I solve the math. Then I check: pencil, Japan, hammer. The trick is to PICK things you can picture, then rehearse mid-task." },
        { level: 4, type: "directTeach", text: "The math: at 4pm, train A has gone 120 miles, train B has gone 80 miles → 200 miles, they meet. About 4pm. Now name your three: ___, ___, ___." }
      ],
      constructTags: ["working-memory", "dual-task", "executive"]
    },
    {
      id: "wm-h-05", domain: "working-memory", difficulty: "hard", gradeBand: "6-7",
      construct: "Planning with constraints",
      prompt: "You're packing for a 3-day trip. You can take 10 items total. You need: 4 to 7 clothing items, 1 to 3 toiletries, and EITHER a book OR a tablet (not both). What 10 items would you take? List them and tell me your reasoning.",
      correctAnswer: "a valid combination summing to 10",
      acceptableAnswers: ["10 items", "valid list", "ten items totaling correctly", "any valid combination", "correct combination"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three constraints: total = 10, clothing range 4–7, toiletries range 1–3, plus exactly 1 entertainment. Start with one constraint and work outward." },
        { level: 2, type: "leading", text: "If you pack 5 clothes and 3 toiletries, that's 8. Plus 1 book or tablet = 9. You have 1 more slot — what goes there?" },
        { level: 3, type: "model", text: "Watch one valid solution: 6 clothes (2 pants, 3 shirts, 1 jacket), 2 toiletries (toothbrush, soap), 1 book, plus 1 extra (water bottle) = 10. Now build yours." },
        { level: 4, type: "directTeach", text: "Many valid answers exist. One: 6 clothes + 2 toiletries + 1 book + 1 extra (like a snack or charger) = 10. The challenge is satisfying all three constraints at once." }
      ],
      constructTags: ["planning", "constraint-satisfaction", "executive"]
    },
    {
      id: "wm-h-06", domain: "working-memory", difficulty: "hard", gradeBand: "6-7",
      construct: "Inhibition + switching",
      prompt: "Rule: say the OPPOSITE of each word. BUT if I clap before saying it, say the SAME word. Ready? HOT. BIG. (clap) DAY. FAST. (clap) UP.",
      correctAnswer: "cold small day slow up",
      acceptableAnswers: ["cold small day slow up", "cold, small, day, slow, up", "cold small day slow up correct"],
      promptLadder: [
        { level: 1, type: "cue", text: "Listen for the clap. Clap means same. No clap means opposite." },
        { level: 2, type: "leading", text: "Pause for half a second after each word. Check: was there a clap? Then decide same or opposite." },
        { level: 3, type: "model", text: "Watch: NIGHT (no clap, so opposite) → DAY. (clap) BLACK (clap, so same) → BLACK. The clap tells you which mode you're in." },
        { level: 4, type: "directTeach", text: "HOT (opposite) → cold. BIG (opposite) → small. (clap) DAY → day. FAST (opposite) → slow. (clap) UP → up. Full answer: cold, small, day, slow, up." }
      ],
      constructTags: ["inhibition", "cognitive-flexibility", "executive"]
    }
  ];

  // ─── LANGUAGE PRODUCTION / NARRATION ITEM BANK (Phase C) ───
  // Open-ended production tasks: the student produces language, the
  // examiner judges. acceptableAnswers contains keywords/elements that
  // should appear in a satisfactory response — examiner can also use
  // manual Mark-correct / Mark-wrong when responses don't auto-match.
  //
  // Scaffold ladder for language production:
  //   L1 (cue): orient — take your time, think of one piece first
  //   L2 (leading): ask a directing question that scaffolds the structure
  //   L3 (model): give a parallel example to imitate
  //   L4 (directTeach): give a full example + explain its structure
  var LANGUAGE_ITEMS = [
    // ─── EASY (grades 2-3) ───
    {
      id: "lang-e-01", domain: "language", difficulty: "easy", gradeBand: "2-3",
      construct: "Using a word in a sentence",
      prompt: "Use the word HUGE in a sentence.",
      correctAnswer: "any sentence using 'huge' correctly",
      acceptableAnswers: ["huge"],
      promptLadder: [
        { level: 1, type: "cue", text: "Think about WHAT things are huge. Pick one." },
        { level: 2, type: "leading", text: "Can you think of an animal, a building, or a feeling that's huge? Start your sentence with 'The...' " },
        { level: 3, type: "model", text: "Here's one with a different word — 'tiny': 'The tiny mouse hid under the table.' Now make yours with 'huge' the same way." },
        { level: 4, type: "directTeach", text: "Example: 'The elephant at the zoo was HUGE.' The word 'huge' describes the elephant's size. Try one yourself." }
      ],
      constructTags: ["vocabulary", "syntax"]
    },
    {
      id: "lang-e-02", domain: "language", difficulty: "easy", gradeBand: "2-3",
      construct: "Defining a familiar word",
      prompt: "Tell me what HAPPY means in your own words.",
      correctAnswer: "feeling good / pleased / joyful",
      acceptableAnswers: ["feeling good", "feeling glad", "feeling joyful", "good feeling", "feeling great", "joyful", "pleased", "smile", "feel like smiling", "feel good", "in a good mood", "cheerful"],
      promptLadder: [
        { level: 1, type: "cue", text: "Think about the LAST time you felt happy. What was that feeling like?" },
        { level: 2, type: "leading", text: "Is happy a feeling? A thing? Something you do? Start with 'Happy means when you feel...' " },
        { level: 3, type: "model", text: "Watch with a different word — SAD: 'Sad means when you feel like crying.' Now do yours: Happy means when you feel..." },
        { level: 4, type: "directTeach", text: "Happy means feeling good, glad, or joyful — like wanting to smile. Example: 'When you eat your favorite snack, you feel happy.'" }
      ],
      constructTags: ["definitions", "expressive-language"]
    },
    {
      id: "lang-e-03", domain: "language", difficulty: "easy", gradeBand: "2-3",
      construct: "Describing an object",
      prompt: "Describe an apple to me. Tell me what it looks like.",
      correctAnswer: "color, shape, size description",
      acceptableAnswers: ["red", "green", "yellow", "round", "small", "smooth", "stem", "color", "shape", "fruit", "shiny"],
      promptLadder: [
        { level: 1, type: "cue", text: "Picture an apple in your head. What's the first thing you'd say about it?" },
        { level: 2, type: "leading", text: "What color is your apple? Is it big or small? Round or some other shape?" },
        { level: 3, type: "model", text: "Watch — describing a BANANA: 'A banana is yellow. It's long and curved.' Now describe an apple the same way: it's __, it's __." },
        { level: 4, type: "directTeach", text: "An apple is usually round. It can be red, green, or yellow. It has a small stem on top. It feels smooth on the outside." }
      ],
      constructTags: ["description", "expressive-language"]
    },
    {
      id: "lang-e-04", domain: "language", difficulty: "easy", gradeBand: "2-3",
      construct: "Sequencing language (procedure)",
      prompt: "Tell me how to make a peanut butter sandwich. Use the words FIRST, NEXT, and LAST.",
      correctAnswer: "sequenced steps using First, Next, Last",
      acceptableAnswers: ["first", "next", "last", "then", "after", "bread", "peanut butter", "spread"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three steps. Start each one with First, Next, or Last." },
        { level: 2, type: "leading", text: "What do you need to grab FIRST? Then what do you put on the bread? Then what's the LAST thing you do?" },
        { level: 3, type: "model", text: "Watch with brushing teeth: 'First, I get my toothbrush. Next, I put toothpaste on it. Last, I brush my teeth.' Now do the sandwich." },
        { level: 4, type: "directTeach", text: "'First, get two pieces of bread. Next, spread peanut butter on one piece. Last, put the other piece on top.' Three steps with sequence words." }
      ],
      constructTags: ["procedural-language", "sequencing"]
    },
    {
      id: "lang-e-05", domain: "language", difficulty: "easy", gradeBand: "2-3",
      construct: "Comparison",
      prompt: "Tell me ONE WAY a cat and a dog are the SAME.",
      correctAnswer: "any valid similarity",
      acceptableAnswers: ["fur", "four legs", "tails", "pets", "animals", "mammals", "eat", "sleep", "play", "have a tail", "have whiskers", "make sounds", "warm-blooded", "domesticated"],
      promptLadder: [
        { level: 1, type: "cue", text: "Think about a cat. Think about a dog. What do they BOTH have or do?" },
        { level: 2, type: "leading", text: "Do they both have legs? Fur? Tails? Are they both animals?" },
        { level: 3, type: "model", text: "If I asked how a robin and an eagle are the same, I might say: 'They both have wings.' Now do it for cat and dog." },
        { level: 4, type: "directTeach", text: "Cats and dogs are both ANIMALS, both have FOUR LEGS, both have FUR, and both can be PETS. Any one of those is a 'way they're the same.'" }
      ],
      constructTags: ["comparison", "categorization"]
    },
    {
      id: "lang-e-06", domain: "language", difficulty: "easy", gradeBand: "2-3",
      construct: "Retelling a simple event",
      prompt: "Listen to this short story, then tell it back to me in your own words. 'Yesterday I went to the park. I played on the swings. Then I came home.'",
      correctAnswer: "park, swings, came home",
      acceptableAnswers: ["park", "swings", "came home", "went home", "went to the park", "played"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three things happened. Try to tell them in the same order I told you." },
        { level: 2, type: "leading", text: "WHERE did I go? WHAT did I do there? Then what did I do?" },
        { level: 3, type: "model", text: "If I told you 'I made cookies, ate one, and shared the rest,' you'd say: 'You made cookies, you ate one, then you shared the rest.' Now do yours." },
        { level: 4, type: "directTeach", text: "'You went to the park. You played on the swings. Then you came home.' Three steps, in order, in your own words." }
      ],
      constructTags: ["narrative-retell", "memory"]
    },
    // ─── MEDIUM (grades 4-5) ───
    {
      id: "lang-m-01", domain: "language", difficulty: "medium", gradeBand: "4-5",
      construct: "Using a more abstract word in context",
      prompt: "Use the word DISAPPOINTED in a sentence that shows you understand what it means.",
      correctAnswer: "sentence using 'disappointed' with appropriate context (failed expectation)",
      acceptableAnswers: ["disappointed"],
      promptLadder: [
        { level: 1, type: "cue", text: "Disappointed is a feeling that happens when you WANTED something to go one way but it didn't. Think of a time that's happened." },
        { level: 2, type: "leading", text: "Have you ever been excited about something — a trip, a game, a present — and then it didn't happen? That's disappointed." },
        { level: 3, type: "model", text: "Example with EXCITED: 'Maya was excited when she saw the puppy.' Use 'disappointed' the same way — tell us WHO was disappointed and ABOUT WHAT." },
        { level: 4, type: "directTeach", text: "Example: 'Jamal was disappointed when the soccer game was canceled because of rain.' Disappointed = sad because something you hoped for didn't happen." }
      ],
      constructTags: ["vocabulary", "abstract-words"]
    },
    {
      id: "lang-m-02", domain: "language", difficulty: "medium", gradeBand: "4-5",
      construct: "Defining a less common word",
      prompt: "What does FURIOUS mean? Tell me in your own words AND give an example.",
      correctAnswer: "very angry / extremely angry, with example",
      acceptableAnswers: ["very angry", "extremely angry", "really mad", "super angry", "mad", "angry", "raging", "outraged"],
      promptLadder: [
        { level: 1, type: "cue", text: "Furious is a strong feeling. Stronger than just 'angry.' Try to put it in words." },
        { level: 2, type: "leading", text: "If 'mad' is a small fire, 'furious' is a big one. What kind of feeling is furious — happy? sad? mad?" },
        { level: 3, type: "model", text: "Watch with SCARED: 'Scared means feeling fear, like when you hear a strange noise at night.' Now do furious the same way: feeling + example." },
        { level: 4, type: "directTeach", text: "Furious means VERY ANGRY. Example: 'My mom was furious when she saw the broken window because she had warned us not to play ball indoors.'" }
      ],
      constructTags: ["definitions", "expressive-language"]
    },
    {
      id: "lang-m-03", domain: "language", difficulty: "medium", gradeBand: "4-5",
      construct: "Multi-sensory description",
      prompt: "Describe a thunderstorm using at LEAST three senses (sight, sound, feel, smell). Tell me about each one.",
      correctAnswer: "description using 3+ senses",
      acceptableAnswers: ["sight", "see", "sound", "hear", "feel", "smell", "rain", "thunder", "lightning", "wind", "wet", "cold", "loud", "flash", "dark sky", "thunder", "fresh", "ozone"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three senses — pick three. Sight, sound, feel are the easiest to start with." },
        { level: 2, type: "leading", text: "What do you SEE in a thunderstorm? What do you HEAR? What can you FEEL on your skin?" },
        { level: 3, type: "model", text: "Watch with WINTER MORNING: 'I see frost on the windows (sight). I hear my boots crunch on the snow (sound). I feel the cold sting my cheeks (feel).' Now do a thunderstorm." },
        { level: 4, type: "directTeach", text: "Example: 'I see bright lightning flash across a dark sky. I hear loud booms of thunder. I feel cold rain on my face and the wind pushing my jacket.' Three senses." }
      ],
      constructTags: ["description", "sensory-language"]
    },
    {
      id: "lang-m-04", domain: "language", difficulty: "medium", gradeBand: "4-5",
      construct: "Narrative structure (BME)",
      prompt: "Tell a short story (3 to 5 sentences) about a missing dog. Your story should have a BEGINNING, a MIDDLE, and an END.",
      correctAnswer: "story with clear beginning, middle, end",
      acceptableAnswers: ["dog", "lost", "found", "missing", "looked", "searched", "home", "owner"],
      promptLadder: [
        { level: 1, type: "cue", text: "Three parts: how the dog got missing (beginning), what the owner did (middle), how it ended (end)." },
        { level: 2, type: "leading", text: "Whose dog is it? How did it go missing? What did the owner DO? Did they find the dog?" },
        { level: 3, type: "model", text: "Watch — a missing cat story: 'Beginning: Maya's cat slipped out the back door. Middle: She put up posters and asked neighbors. End: Three days later, the cat came home for dinner.' Now do a dog version." },
        { level: 4, type: "directTeach", text: "Beginning: 'Diego's dog got loose during a thunderstorm.' Middle: 'He searched the neighborhood, calling and calling.' End: 'He found her shivering under the porch and brought her home.' Three parts." }
      ],
      constructTags: ["narrative-structure", "storytelling"]
    },
    {
      id: "lang-m-05", domain: "language", difficulty: "medium", gradeBand: "4-5",
      construct: "Compare/contrast with examples",
      prompt: "How are a HAMMER and a SCREWDRIVER similar? How are they different? Give one example of each.",
      correctAnswer: "one similarity + one difference",
      acceptableAnswers: ["tools", "both tools", "hand tools", "build", "construction", "nails", "screws", "hit", "twist", "turn", "metal", "wood", "head", "handle"],
      promptLadder: [
        { level: 1, type: "cue", text: "Same: what category do they both belong to? Different: what does each one DO?" },
        { level: 2, type: "leading", text: "Are they both tools? Are they used for the same kind of work — banging things, or turning things?" },
        { level: 3, type: "model", text: "Watch with KNIFE and FORK: 'Both are eating utensils (similar). A knife cuts; a fork holds and lifts food (different).' Now do hammer and screwdriver." },
        { level: 4, type: "directTeach", text: "Similar: both are HAND TOOLS used for building or fixing. Different: a hammer HITS nails to drive them in; a screwdriver TURNS screws to tighten or loosen them." }
      ],
      constructTags: ["compare-contrast", "expressive-language"]
    },
    {
      id: "lang-m-06", domain: "language", difficulty: "medium", gradeBand: "4-5",
      construct: "Summarizing a multi-event scenario",
      prompt: "Listen carefully, then summarize what happened in ONE sentence. 'Yesterday the cat got out of the yard. My brother chased her down the street and caught her near the park. But while he was carrying her home, her collar broke and fell off somewhere. Now we can't find the collar.'",
      correctAnswer: "cat escaped, was caught, collar lost",
      acceptableAnswers: ["cat", "collar", "lost", "broke", "escaped", "missing collar", "got out", "caught", "collar fell off"],
      promptLadder: [
        { level: 1, type: "cue", text: "What is the BIG IDEA of the whole story? Ignore the small details." },
        { level: 2, type: "leading", text: "Three things happened: cat got out, was caught, collar got lost. Combine those into one sentence." },
        { level: 3, type: "model", text: "Watch — summarize: 'I was making a cake. The oven was hotter than the recipe said. The cake burned, and I had to start over.' One sentence: 'My cake burned because the oven was too hot.' Now do yours." },
        { level: 4, type: "directTeach", text: "One-sentence summary: 'Our cat escaped, my brother caught her, but her collar broke off and we can't find it now.' One sentence covering the key events." }
      ],
      constructTags: ["summarization", "expressive-language"]
    },
    // ─── HARD (grades 6-7) ───
    {
      id: "lang-h-01", domain: "language", difficulty: "hard", gradeBand: "6-7",
      construct: "Using complex vocabulary",
      prompt: "Use the word RELUCTANT in a sentence that shows you understand the meaning.",
      correctAnswer: "sentence demonstrating 'unwilling but doing it anyway'",
      acceptableAnswers: ["reluctant"],
      promptLadder: [
        { level: 1, type: "cue", text: "Reluctant means you don't want to do something but you might do it anyway. Think of a time someone agreed to do something they really didn't want to." },
        { level: 2, type: "leading", text: "WHO is reluctant in your sentence? What are they reluctant TO DO?" },
        { level: 3, type: "model", text: "Watch with HESITANT: 'The hiker was hesitant to cross the rickety bridge.' Reluctant is similar — slow to agree. Now make yours." },
        { level: 4, type: "directTeach", text: "Example: 'Aaron was reluctant to lend his bike to his cousin, but he eventually agreed.' Reluctant = unwilling but might still do it." }
      ],
      constructTags: ["vocabulary", "complex-words"]
    },
    {
      id: "lang-h-02", domain: "language", difficulty: "hard", gradeBand: "6-7",
      construct: "Defining an abstract concept",
      prompt: "Define PERSEVERANCE. Give a definition AND an example.",
      correctAnswer: "definition + example",
      acceptableAnswers: ["keep going", "not giving up", "persistence", "trying", "continue", "despite", "even when hard", "stick with it", "stay with"],
      promptLadder: [
        { level: 1, type: "cue", text: "Perseverance is what you DO when something is hard and you keep going anyway. Define that idea." },
        { level: 2, type: "leading", text: "What's the opposite of perseverance? (Giving up.) So what is perseverance? Then think of a time someone did it." },
        { level: 3, type: "model", text: "Watch with COURAGE: 'Courage is acting bravely even when you're afraid. Example: a firefighter running into a burning building to save someone.' Now do perseverance." },
        { level: 4, type: "directTeach", text: "Definition: 'Perseverance is continuing to work toward a goal even when it's difficult or you keep failing.' Example: 'Marie Curie kept doing experiments for years despite many failures, and eventually discovered radium.'" }
      ],
      constructTags: ["definitions", "abstract-language"]
    },
    {
      id: "lang-h-03", domain: "language", difficulty: "hard", gradeBand: "6-7",
      construct: "Process description with sequence",
      prompt: "Describe how a SEED becomes a TREE. Use at least 4 sequential steps.",
      correctAnswer: "4+ ordered steps describing germination → growth → maturity",
      acceptableAnswers: ["seed", "sprout", "germinate", "roots", "stem", "leaves", "sapling", "grow", "tree", "soil", "water", "sunlight", "first", "then", "next", "finally"],
      promptLadder: [
        { level: 1, type: "cue", text: "Four steps. Start with the seed in the ground. End with a full tree. Fill in the middle." },
        { level: 2, type: "leading", text: "Step 1: seed in soil. What does it NEED to start growing? Step 2: what FIRST appears? Step 3: what grows next? Step 4: what does it become?" },
        { level: 3, type: "model", text: "Watch with caterpillar→butterfly: 'First, an egg hatches into a caterpillar. Then it eats and grows. Next, it makes a chrysalis. Finally, it emerges as a butterfly.' Now do seed→tree." },
        { level: 4, type: "directTeach", text: "Step 1: A seed is planted in soil and absorbs water. Step 2: It sprouts — a tiny root grows down, a shoot grows up. Step 3: Leaves develop and capture sunlight to make food. Step 4: Over years, the trunk thickens and the tree grows tall." }
      ],
      constructTags: ["procedural-language", "sequencing", "science-content"]
    },
    {
      id: "lang-h-04", domain: "language", difficulty: "hard", gradeBand: "6-7",
      construct: "Narrative with theme",
      prompt: "Tell a short story (3 to 5 sentences) where the THEME is 'patience pays off.' Your story should show — not just tell — the theme.",
      correctAnswer: "story illustrating patience-rewarded theme",
      acceptableAnswers: ["wait", "waited", "patient", "patience", "finally", "eventually", "after", "weeks", "months", "rewarded"],
      promptLadder: [
        { level: 1, type: "cue", text: "Don't say 'patience pays off' in the story. SHOW someone waiting and being rewarded." },
        { level: 2, type: "leading", text: "Who's your character? What are they waiting FOR? Why is it hard to wait? What's the reward when they finally get it?" },
        { level: 3, type: "model", text: "Watch with 'honesty is the best policy': 'Diego broke the lamp. He could have blamed his sister, but he told his mom the truth. His mom was upset about the lamp but proud of him, and let him keep his weekend plans.' Same shape — but for patience." },
        { level: 4, type: "directTeach", text: "Example: 'Sofia wanted to learn to play guitar. For three months, her fingers hurt and her songs sounded terrible. Some friends quit their lessons. Sofia kept practicing every day. At the spring talent show, her clear notes filled the auditorium and the audience asked for an encore.' She showed patience and was rewarded." }
      ],
      constructTags: ["narrative-structure", "theme", "show-not-tell"]
    },
    {
      id: "lang-h-05", domain: "language", difficulty: "hard", gradeBand: "6-7",
      construct: "Compare with depth",
      prompt: "How are COURAGE and RECKLESSNESS similar? How are they DIFFERENT? Give a brief example of each.",
      correctAnswer: "similarity + difference + two examples",
      acceptableAnswers: ["risk", "danger", "brave", "afraid", "thoughtful", "careless", "thinking", "without thinking", "considered", "wisdom", "judgment", "consequence"],
      promptLadder: [
        { level: 1, type: "cue", text: "Both involve doing something risky. The difference is WHY and HOW. Think about that." },
        { level: 2, type: "leading", text: "Someone with courage knows the risk and acts anyway — for good reason. Someone reckless doesn't really think about the risk. What's the key difference there?" },
        { level: 3, type: "model", text: "Watch with HONESTY and BLUNTNESS: 'Both involve telling the truth. Honesty considers the listener's feelings; bluntness ignores them. Honesty: telling a friend their plan won't work, kindly. Bluntness: telling a friend their plan is dumb.' Now do courage and recklessness." },
        { level: 4, type: "directTeach", text: "Similar: both involve facing danger or risk. Different: courage involves weighing the risk and acting for a reason; recklessness skips the weighing entirely. Courage example: a firefighter entering a burning building to save someone. Reckless example: jumping off a high cliff into water without checking how deep it is." }
      ],
      constructTags: ["compare-contrast", "abstract-language"]
    },
    {
      id: "lang-h-06", domain: "language", difficulty: "hard", gradeBand: "6-7",
      construct: "Summarizing a longer passage",
      prompt: "Restate this paragraph in your OWN words, in 1 or 2 sentences. 'The new bridge across the river opened on Tuesday. Engineers had warned officials that the foundation in the riverbed had not been fully tested. By Friday, cracks appeared in two of the support columns. The bridge is now closed pending a full inspection.'",
      correctAnswer: "concise summary of the events + outcome",
      acceptableAnswers: ["bridge", "opened", "cracked", "closed", "inspection", "foundation", "engineers warned", "untested", "problem", "shut down", "closed for safety"],
      promptLadder: [
        { level: 1, type: "cue", text: "Four sentences in the passage. Boil them down to one or two. Use your own words, not the passage's exact words." },
        { level: 2, type: "leading", text: "What happened in order? Opened → warned about foundation → cracks appeared → closed. Now state that in your own words." },
        { level: 3, type: "model", text: "Watch — summarize: 'A new restaurant opened downtown. Reviews praised the food but criticized the service. The owner promised changes. The restaurant has won two awards since.' One sentence: 'A new restaurant fixed its early service problems and won two awards.' Now do the bridge." },
        { level: 4, type: "directTeach", text: "Example summary: 'A new bridge that opened on Tuesday was closed by Friday after cracks appeared in support columns, which engineers had warned might fail because the foundation was never fully tested.'" }
      ],
      constructTags: ["summarization", "synthesis"]
    }
  ];

  // ─── Combined registry ───
  // Register all items by id so renderActivePhase can look them up.
  // Add new domains here as they ship.
  var ITEMS_BY_ID = {};
  MATH_ITEMS.forEach(function (it) { ITEMS_BY_ID[it.id] = it; });
  READING_ITEMS.forEach(function (it) { ITEMS_BY_ID[it.id] = it; });
  WM_ITEMS.forEach(function (it) { ITEMS_BY_ID[it.id] = it; });
  LANGUAGE_ITEMS.forEach(function (it) { ITEMS_BY_ID[it.id] = it; });

  function getItemsByDomainAndDifficulty(domain, difficulty) {
    var pool;
    if (domain === "math") pool = MATH_ITEMS;
    else if (domain === "reading") pool = READING_ITEMS;
    else if (domain === "working-memory") pool = WM_ITEMS;
    else if (domain === "language") pool = LANGUAGE_ITEMS;
    else return [];
    return pool.filter(function (it) { return it.difficulty === difficulty; });
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 2 — Scoring + modifiability
  // ═════════════════════════════════════════════════════════

  // Per-item score from the prompt level needed.
  // promptLevelReached = 0 → solved unprompted → 5 pts
  // promptLevelReached = 1 → solved with L1 cue → 4 pts
  // promptLevelReached = 4 → still wrong after direct teach → 0 pts
  function scoreForLevel(promptLevelReached, finalCorrect, scaffoldLeaked) {
    if (!finalCorrect) return 0;
    var l = promptLevelReached || 0;
    if (l < 0) l = 0;
    if (l > 4) l = 4;
    // A4 — a "leaky" rung (one the clinician judged gave away the answer) means
    // success at that rung is NOT valid evidence of competence there. Conservative
    // correction: credit one level higher (the student needed at least the next
    // level of support). L4 leaks are expected — direct teach states the answer
    // by design — so they carry no extra penalty.
    if (scaffoldLeaked && l < 4) l = l + 1;
    return Math.max(0, 5 - l);
  }

  function sumItemResultScores(itemResults) {
    if (!Array.isArray(itemResults)) return 0;
    return itemResults.reduce(function (s, r) { return s + (r.scoreAwarded || 0); }, 0);
  }
  function maxPossibleScore(itemCount) { return 5 * (itemCount || 0); }

  // Modifiability Index = (post - pre) / (max - pre).
  // Bounded to [-1, 1]. Negative would mean posttest was actually worse
  // than pretest — rare but possible (fatigue, regression).
  function computeModifiabilityIndex(pretestSum, posttestSum, itemCount) {
    var max = maxPossibleScore(itemCount);
    if (max <= 0) return 0;
    if (max === pretestSum) return 0; // Already at ceiling on pretest
    var idx = (posttestSum - pretestSum) / (max - pretestSum);
    if (idx > 1) idx = 1;
    if (idx < -1) idx = -1;
    return Math.round(idx * 100) / 100;
  }

  // Narrative tier from the index value.
  // Transfer-probe interpretation (Phase E).
  // Modifiability captures growth on SAME items. Transfer captures whether
  // learning generalized to STRUCTURALLY SIMILAR BUT SURFACE-DIFFERENT
  // items (the transferTwin field). Pre-/post-test growth without
  // transfer growth = pattern recognition / memory; pre-/post-test
  // growth WITH transfer growth = actual learning that generalized.
  // The clinical inference is different in each case.
  function transferTier(transferSum, transferMax, posttestSum, posttestMax) {
    if (transferMax === 0) return null;
    var transferPct = transferSum / transferMax;
    var posttestPct = posttestMax > 0 ? posttestSum / posttestMax : 0;
    var transferRatio = posttestPct > 0 ? transferPct / posttestPct : 0;
    if (transferPct >= 0.7) {
      return { id: "strong-transfer", label: "Strong transfer", color: "#16a34a",
        desc: "Performance on transfer items (novel surface features, same construct) was strong. The student appears to have learned the underlying construct, not just memorized the practiced items. This is the clearest pattern of generalizable learning under mediation." };
    }
    if (transferRatio >= 0.7) {
      return { id: "partial-transfer", label: "Partial transfer", color: "#a16207",
        desc: "Transfer-item performance approached but did not match posttest performance. The student retained much of what was learned but generalization is incomplete. Continued exposure to varied surface features is indicated." };
    }
    if (transferRatio >= 0.4) {
      return { id: "weak-transfer", label: "Weak transfer", color: "#ea580c",
        desc: "Transfer performance was meaningfully below posttest performance. The student's posttest gain may reflect item-specific learning or memory of mediation rather than construct mastery. Plan additional generalization practice." };
    }
    return { id: "minimal-transfer", label: "Minimal transfer", color: "#b91c1c",
      desc: "Performance on novel items collapsed back to baseline. The posttest gains appear to reflect item-specific memory rather than construct learning. The construct has not yet been mastered in a generalizable form." };
  }

  // ═════════════════════════════════════════════════════════
  // Learning-zone (ZPD) snapshot
  // ─────────────────────────────────────────────────────────
  // Classifies each administered item into the Vygotskian bands the
  // session's own data supports:
  //   independent  — solved unprompted at PRETEST (secure before teaching)
  //   zpd          — solved during MEDIATION with scaffolds L1–L3
  //                  (the teachable band: fails alone, succeeds with help)
  //   frustration  — needed L4 direct teach, or never solved in mediation
  //                  (not yet reachable through prompting alone)
  // A rung the clinician flagged as leaky counts one level higher (same
  // conservative correction scoreForLevel applies), so a leaked L3 success
  // lands in the frustration band rather than inflating the ZPD band.
  // Descriptive within this session only — NOT a normed placement.
  function computeZpdProfile(session) {
    var results = (session && session.itemResults) || [];
    var pre = {}, med = {};
    var order = [];
    var seen = {};
    results.forEach(function (r) {
      if (!r || !r.itemId) return;
      if (!seen[r.itemId]) { seen[r.itemId] = true; order.push(r.itemId); }
      if (r.phase === "pretest") pre[r.itemId] = r;
      else if (r.phase === "mediation") med[r.itemId] = r;
    });
    var out = { independent: [], zpd: [], frustration: [], nClassified: 0 };
    order.forEach(function (id) {
      var item = ITEMS_BY_ID[id];
      var construct = item ? item.construct : id;
      var p = pre[id], m = med[id];
      if (p && p.finalCorrect) {
        out.independent.push({ itemId: id, construct: construct });
        out.nClassified++;
        return;
      }
      if (m) {
        var lvl = m.promptLevelReached || 0;
        if (m.scaffoldLeaked && lvl < 4) lvl = lvl + 1;
        if (m.finalCorrect && lvl <= 3) {
          out.zpd.push({ itemId: id, construct: construct, level: lvl });
        } else {
          out.frustration.push({ itemId: id, construct: construct, solvedWithTeach: !!m.finalCorrect });
        }
        out.nClassified++;
      }
      // No pretest success and no mediation record → unclassifiable; skip.
    });
    return out;
  }

  // ═════════════════════════════════════════════════════════
  // Undo support — roll back the most recent item entry
  // ─────────────────────────────────────────────────────────
  // A single mis-click on "Mark correct" used to force discarding the WHOLE
  // session (live, with a student across the table). This computes the
  // session-field patch that re-presents the most recently recorded item.
  // Pure: returns null when there is nothing to undo. The popped result is
  // returned so the caller can restore the response/observation drafts.
  function rollbackLastItemResult(session) {
    var results = (session && session.itemResults) || [];
    if (results.length === 0) return null;
    var popped = results[results.length - 1];
    var remaining = results.slice(0, -1);
    // The item's position within its phase = how many results that phase
    // retains after the pop (items run 0..n-1 in order within each phase).
    var idxInPhase = remaining.filter(function (r) { return r.phase === popped.phase; }).length;
    return {
      itemResults: remaining,
      currentPhase: popped.phase,
      currentItemIdx: idxInPhase,
      currentLadderLevel: 0,
      popped: popped
    };
  }

  // ═════════════════════════════════════════════════════════
  // Single-item sensitivity band for the Modifiability Index
  // ─────────────────────────────────────────────────────────
  // Quantifies the small-N caution: how far would the MI move if ONE item's
  // scaffold level had been judged one step differently (±1 point on one
  // phase sum — the most common real scoring error, adjacent-level
  // confusion)? Returns { lo, hi } or null when no items.
  function computeMiSensitivity(pretestSum, posttestSum, itemCount) {
    var max = maxPossibleScore(itemCount);
    if (max <= 0) return null;
    function clamp(v) { return Math.max(0, Math.min(max, v)); }
    var candidates = [
      computeModifiabilityIndex(clamp(pretestSum + 1), posttestSum, itemCount),
      computeModifiabilityIndex(clamp(pretestSum - 1), posttestSum, itemCount),
      computeModifiabilityIndex(pretestSum, clamp(posttestSum + 1), itemCount),
      computeModifiabilityIndex(pretestSum, clamp(posttestSum - 1), itemCount),
      computeModifiabilityIndex(pretestSum, posttestSum, itemCount)
    ];
    return { lo: Math.min.apply(null, candidates), hi: Math.max.apply(null, candidates) };
  }

  // ═════════════════════════════════════════════════════════
  // Phase I — Structured observation taxonomy
  // ─────────────────────────────────────────────────────────
  // Free-text observations capture nuance but don't aggregate.
  // These quick-tap chips run alongside the free-text field
  // so patterns become visible across items + across sessions.
  // Each tag has a clinical "what to look for" hint; report
  // narrative pulls the top-N tags from each session.
  // ═════════════════════════════════════════════════════════
  var OBSERVATION_TAGS = [
    { id: "self-corrected",   label: "Self-corrected",      hint: "Caught + revised own response without prompting (metacognitive monitoring)" },
    { id: "wait-time",        label: "Needed wait time",    hint: "Solved after extended pause; possible processing-speed signal" },
    { id: "self-talk",        label: "Used self-talk",      hint: "Verbalized strategy aloud during work (private speech)" },
    { id: "off-task",         label: "Off-task / drift",    hint: "Attention drifted; redirection needed to resume" },
    { id: "frustration",      label: "Showed frustration",  hint: "Affect signals stress, avoidance, or shutdown" },
    { id: "asked-clarify",    label: "Asked clarifying Q",  hint: "Sought clarification before attempting (strength signal)" },
    { id: "strategy-change",  label: "Changed strategy",    hint: "Abandoned initial approach + tried another (flexibility)" },
    { id: "perseveration",    label: "Perseverated",        hint: "Stuck on prior pattern despite cue to switch (rigidity)" },
    { id: "guess",            label: "Appeared to guess",   hint: "Response not derived from visible strategy" },
    { id: "fluent",           label: "Fluent + automatic",  hint: "Quick, confident, no visible effort (mastery signal)" }
  ];
  var OBSERVATION_TAGS_BY_ID = OBSERVATION_TAGS.reduce(function (acc, t) { acc[t.id] = t; return acc; }, {});

  // Aggregate tag counts across all itemResults in a session.
  // Returns [{ id, label, count, share }] sorted by count desc.
  function aggregateObservationTags(itemResults) {
    var counts = {};
    var total = 0;
    (itemResults || []).forEach(function (r) {
      var tags = Array.isArray(r.observationTags) ? r.observationTags : [];
      tags.forEach(function (tid) {
        counts[tid] = (counts[tid] || 0) + 1;
        total++;
      });
    });
    var out = [];
    Object.keys(counts).forEach(function (tid) {
      var def = OBSERVATION_TAGS_BY_ID[tid];
      if (!def) return;
      out.push({ id: tid, label: def.label, count: counts[tid], share: total > 0 ? counts[tid] / total : 0 });
    });
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  // ═════════════════════════════════════════════════════════
  // Phase Z — Calibration scenarios for inter-rater training
  // ─────────────────────────────────────────────────────────
  // Hand-authored scenarios with expert verdicts. Each presents a
  // realistic item + student response and asks the clinician to
  // score. The system compares to the expert verdict and surfaces
  // teaching points where clinicians commonly disagree.
  // These are NOT items — they're training cases. Real sessions
  // are unaffected.
  // ═════════════════════════════════════════════════════════
  var CALIBRATION_SCENARIOS = [
    {
      id: "cal-math-1",
      title: "Self-correction mid-answer",
      domain: "math",
      phase: "mediation",
      item: {
        prompt: "Maya has 24 stickers. She gives 1/3 to her brother. How many does she have left?",
        correctAnswer: "16",
        construct: "Fraction-of-a-whole + subtraction (2 steps)",
        gradeBand: "4-5"
      },
      scaffoldsDelivered: 1,
      studentResponse: "Um... 24 divided by 3 is 8... wait, but that's what she gave away, so she has... 24 minus 8 equals 16.",
      expertScoring: {
        finalCorrect: true,
        supportType: "cue",
        observationTags: ["self-corrected", "self-talk"],
        scoreAwarded: 4,
        reasoning: "Student arrived at correct answer with only an L1 cue (orient to what the question asks). The pause + 'wait' + self-correction is exactly what L1 cues are designed to surface — the student had the procedure but needed prompting to monitor whether the result answered the question. Score: 4 pts (L1 = -1 from unprompted max of 5).",
        teachingPoint: "Common error: scoring this as 'unprompted' because the student got there independently after the cue. The cue WAS support, even if minimal. Also common: missing the 'self-corrected' tag — verbal monitoring like this is the strongest single signal of metacognitive engagement."
      }
    },
    {
      id: "cal-math-2",
      title: "Correct procedure, wrong target",
      domain: "math",
      phase: "pretest",
      item: {
        prompt: "A library has 4 shelves. Each shelf holds 27 books. How many more books fit on 6 shelves than on 4 shelves?",
        correctAnswer: "54",
        construct: "Multi-step word problem with comparison",
        gradeBand: "4-5"
      },
      scaffoldsDelivered: 0,
      studentResponse: "162. Because 6 times 27 is 162.",
      expertScoring: {
        finalCorrect: false,
        supportType: "none",
        observationTags: ["guess"],
        scoreAwarded: 0,
        reasoning: "Student answered the wrong question — gave total for 6 shelves, not the difference between 6 and 4. Pretest is unscaffolded; no partial credit available. Score: 0 pts.",
        teachingPoint: "Common error: scoring as partial credit because the multiplication itself is correct. Pretest scoring is binary — answered or not. Save the partial-knowledge observation ('multiplication intact, question parsing failed') for the qualitative record."
      }
    },
    {
      id: "cal-math-3",
      title: "Answer after modeling — generalization risk",
      domain: "math",
      phase: "mediation",
      item: {
        prompt: "What's 3/4 of 20?",
        correctAnswer: "15",
        construct: "Fraction of a whole",
        gradeBand: "4-5"
      },
      scaffoldsDelivered: 3,
      studentResponse: "(After modeling 1/4 of 12) Oh, so it's 5. Three times 5. 15.",
      expertScoring: {
        finalCorrect: true,
        supportType: "model",
        observationTags: ["strategy-change"],
        scoreAwarded: 2,
        reasoning: "Student solved after L3 modeling of a parallel item. Score: 2 pts (L3 = -3 from max). 'Strategy-change' captures the shift from initial attempt (likely subtractive or additive) to multiplicative.",
        teachingPoint: "Common error: scoring 3 pts (L2 leading) because the student 'really got it.' The level reached is the level reached — score the support actually delivered. The student's responsiveness to L3 is good news for mediation responsiveness; it just doesn't change the score."
      }
    },
    {
      id: "cal-read-1",
      title: "Literal vs. inferential confusion",
      domain: "reading",
      phase: "pretest",
      item: {
        prompt: "Passage: 'Liam grabbed his jacket and ran out the door, leaving his half-eaten breakfast on the counter.' Why did Liam leave breakfast behind?",
        correctAnswer: "He was in a hurry / running late",
        construct: "Inferential comprehension",
        gradeBand: "3-5"
      },
      scaffoldsDelivered: 0,
      studentResponse: "He didn't finish it.",
      expertScoring: {
        finalCorrect: false,
        supportType: "none",
        observationTags: [],
        scoreAwarded: 0,
        reasoning: "Student gave a LITERAL re-statement of the passage ('half-eaten' = 'didn't finish') rather than the INFERENCE (he was in a hurry). The question asked WHY, not WHAT. Score: 0 pts.",
        teachingPoint: "Common error: counting this as correct because it's not technically wrong. DA scoring is anchored to the construct — and the construct here is INFERENCE. A literal restatement reveals the gap. The diagnostic value is in the disagreement: this student needs scaffolds on inferential reasoning, not vocabulary."
      }
    },
    {
      id: "cal-read-2",
      title: "Asks clarifying question",
      domain: "reading",
      phase: "pretest",
      item: {
        prompt: "Passage: 'The garden looked nothing like it had three weeks ago — the tomatoes were heavy on their stakes, the basil bushed out wider than the bed.' What season is it in this passage?",
        correctAnswer: "Late summer / summer",
        construct: "Inferential comprehension using domain knowledge",
        gradeBand: "5-7"
      },
      scaffoldsDelivered: 0,
      studentResponse: "Wait — does this take place in like a real garden, or is it metaphorical?",
      expertScoring: {
        finalCorrect: false,
        supportType: "none",
        observationTags: ["asked-clarify"],
        scoreAwarded: 0,
        reasoning: "Student did not answer the item. Asking for clarification is not an answer. Score this as 0 with 'asked-clarify' tag — both halves matter. Strong clarifying question (genuinely sharp parsing of an ambiguity) is a strength signal but doesn't change the score.",
        teachingPoint: "Tempting to score this as 'partial' because the question is sophisticated. Resist. Score the response; tag the strength. The qualitative narrative will surface 'asked clarifying question before attempting' as a metacognitive strength even with a 0-point pretest score."
      }
    },
    {
      id: "cal-wm-1",
      title: "Correct after extended wait time",
      domain: "working-memory",
      phase: "mediation",
      item: {
        prompt: "Repeat these digits backward: 7 - 2 - 9 - 4 - 1",
        correctAnswer: "1 4 9 2 7",
        construct: "Backward digit span (5 digits)",
        gradeBand: "4-7"
      },
      scaffoldsDelivered: 0,
      studentResponse: "(Eight-second pause.) One... four... nine... two... seven.",
      expertScoring: {
        finalCorrect: true,
        supportType: "none",
        observationTags: ["wait-time", "self-talk"],
        scoreAwarded: 5,
        reasoning: "No scaffold delivered. Correct response. Score: 5 pts (unprompted). The 8-second pause is informationally rich (processing speed signal, possibly subvocal rehearsal) but does not change the score.",
        teachingPoint: "Common error: dropping a point because the student 'took too long.' Time-to-respond is OBSERVATIONAL, not SCORING. Capture it in the wait-time tag and the qualitative notes. If untimed presentation is standard for the construct, time doesn't enter the score."
      }
    },
    {
      id: "cal-wm-2",
      title: "Perseveration on prior pattern",
      domain: "working-memory",
      phase: "mediation",
      item: {
        prompt: "Sort these into 2 groups any way you want, then a different way: APPLE, CAT, BOAT, ORANGE, DOG, BIKE.",
        correctAnswer: "Categorical (fruit/animals/vehicles) + e.g. by syllable count or first letter",
        construct: "Set-shifting / cognitive flexibility",
        gradeBand: "5-8"
      },
      scaffoldsDelivered: 2,
      studentResponse: "(After categorizing by type: fruits/animals/vehicles, then asked for a different grouping.) Umm... apple, cat, boat in one group; orange, dog, bike in the other. Because... they're different ones from before.",
      expertScoring: {
        finalCorrect: false,
        supportType: "leading",
        observationTags: ["perseveration", "frustration"],
        scoreAwarded: 0,
        reasoning: "After L2 leading question, student produced a non-categorical regrouping that doesn't reflect a new attribute — it just splits the original groups. Fails the cognitive-flexibility construct. Score: 0 pts (no correct response at L2, would escalate to L3 modeling next).",
        teachingPoint: "Easy to score this as partial because the student 'tried.' But the construct is FLEXIBILITY — generating a NEW attribute to sort by. This response shows the student is stuck on the original attribute. The perseveration tag is the diagnostic gold here."
      }
    },
    {
      id: "cal-lang-1",
      title: "Word retrieval delay",
      domain: "language",
      phase: "pretest",
      item: {
        prompt: "Define 'punctual.'",
        correctAnswer: "Being on time / arriving when expected",
        construct: "Word definition / lexical access",
        gradeBand: "5-7"
      },
      scaffoldsDelivered: 0,
      studentResponse: "Punctual is when you... like, you're at the place when you're supposed to be. Not late.",
      expertScoring: {
        finalCorrect: true,
        supportType: "none",
        observationTags: ["wait-time"],
        scoreAwarded: 5,
        reasoning: "Student produced a functionally-correct definition. The conversational/spoken register ('you're at the place when you're supposed to be') is age-appropriate. Score: 5 pts (unprompted, correct).",
        teachingPoint: "Common error: scoring as partial because the definition isn't formal dictionary-style. Accept developmentally-appropriate spoken definitions if they capture the concept. The construct is LEXICAL ACCESS + definition, not formal academic register."
      }
    },
    {
      id: "cal-lang-2",
      title: "Fluent but off-target",
      domain: "language",
      phase: "mediation",
      item: {
        prompt: "Tell me about the most important thing that happened in this story. (Story prior: 'A boy plants a seed, waters it daily, and after weeks it grows into a sunflower.')",
        correctAnswer: "The seed grew into a sunflower / patience + care produced the flower",
        construct: "Narrative summarization",
        gradeBand: "3-5"
      },
      scaffoldsDelivered: 1,
      studentResponse: "(After L1 cue to think about what changed) The boy watered it every single day. He used a green watering can. And it was sunny.",
      expertScoring: {
        finalCorrect: false,
        supportType: "cue",
        observationTags: ["fluent"],
        scoreAwarded: 0,
        reasoning: "Student produced fluent on-topic language but failed to identify the central event (the growth into a sunflower). Score: 0 pts (still no central event captured at L1). Would escalate to L2 next.",
        teachingPoint: "Fluent production is NOT the same as correct response. Don't reward fluency when the construct is narrative coherence / summary. Tag the strength (fluent), score the construct (missed)."
      }
    },
    {
      id: "cal-math-4",
      title: "Direct teach + immediate correct application",
      domain: "math",
      phase: "mediation",
      item: {
        prompt: "What's 15% of 80?",
        correctAnswer: "12",
        construct: "Percent of a whole",
        gradeBand: "6-7"
      },
      scaffoldsDelivered: 4,
      studentResponse: "(After L4 direct teach explaining 15% = 0.15 × 80.) Oh OK, so 0.15 × 80 is 12.",
      expertScoring: {
        finalCorrect: true,
        supportType: "directTeach",
        observationTags: ["fluent"],
        scoreAwarded: 1,
        reasoning: "Student arrived at correct answer only after L4 direct teach. Score: 1 pt (L4 = -4 from max).",
        teachingPoint: "Direct teach is the LAST scaffold for a reason — if a student needs it, the construct is genuinely absent at this difficulty. 1 pt indicates the student CAN apply the procedure once shown, which is meaningful for instructional planning (Tier 3 reteaching is likely needed before independence). Don't 'reward' fluent application after L4 with extra credit — fluency-with-teach is what L4 is supposed to elicit."
      }
    }
  ];

  // Compute agreement between clinician's score and expert verdict on a scenario.
  // Returns { agreement, mismatches }.
  function scoreCalibrationAgreement(clinicianScore, expertScoring) {
    var mismatches = [];
    if (!!clinicianScore.finalCorrect !== !!expertScoring.finalCorrect) {
      mismatches.push({
        criterion: "correctness",
        severity: "major",
        description: "You marked the response " + (clinicianScore.finalCorrect ? "correct" : "incorrect") +
          "; expert marked it " + (expertScoring.finalCorrect ? "correct" : "incorrect") + "."
      });
    }
    if ((clinicianScore.supportType || "none") !== (expertScoring.supportType || "none")) {
      mismatches.push({
        criterion: "scaffold-level",
        severity: "major",
        description: "You recorded support type '" + (clinicianScore.supportType || "none") +
          "'; expert recorded '" + (expertScoring.supportType || "none") + "'."
      });
    }
    // Tag agreement: count overlap (Jaccard-ish)
    var clinicianTags = (clinicianScore.observationTags || []).slice().sort();
    var expertTags = (expertScoring.observationTags || []).slice().sort();
    var clinicianSet = {};
    clinicianTags.forEach(function (t) { clinicianSet[t] = true; });
    var expertSet = {};
    expertTags.forEach(function (t) { expertSet[t] = true; });
    var missed = expertTags.filter(function (t) { return !clinicianSet[t]; });
    var extra = clinicianTags.filter(function (t) { return !expertSet[t]; });
    if (missed.length > 0) {
      mismatches.push({
        criterion: "observation-tags-missed",
        severity: "minor",
        description: "Expert tagged " + missed.map(function (t) {
          var def = OBSERVATION_TAGS_BY_ID[t]; return def ? def.label : t;
        }).join(", ") + "; you did not."
      });
    }
    if (extra.length > 0) {
      mismatches.push({
        criterion: "observation-tags-extra",
        severity: "minor",
        description: "You tagged " + extra.map(function (t) {
          var def = OBSERVATION_TAGS_BY_ID[t]; return def ? def.label : t;
        }).join(", ") + "; expert did not."
      });
    }
    var agreement = mismatches.length === 0 ? "full"
                  : mismatches.every(function (m) { return m.severity === "minor"; }) ? "minor-only"
                  : "major-disagreement";
    return { agreement: agreement, mismatches: mismatches };
  }

  // ═════════════════════════════════════════════════════════
  // Phase BB — Population statistics & effect sizes
  // ─────────────────────────────────────────────────────────
  // For the body of saved sessions, compute local-norm statistics
  // useful for both single-session contextualization (where does
  // this student fall relative to my caseload?) and for empirical
  // validation work (mean Cohen's d, MI distribution, % at each tier).
  // All metrics are HONEST about sample-size constraints. Below
  // n = 10, results are unstable; below n = 30, treat as exploratory.
  // ═════════════════════════════════════════════════════════
  function aggregateSessionStatistics(sessions) {
    var sess = (sessions || []).filter(function (s) {
      return s && typeof s.modifiabilityIndex === "number";
    });
    var n = sess.length;
    if (n === 0) {
      return { n: 0, miMean: null, miSD: null, miMedian: null,
        pretestMean: null, pretestSD: null, posttestMean: null, posttestSD: null,
        cohenD: null, hedgesG: null, miDistribution: [], tierCounts: {}, allMIs: [] };
    }
    var miVals = sess.map(function (s) { return s.modifiabilityIndex; });
    var preVals = sess.map(function (s) { return typeof s.pretestSum === "number" ? s.pretestSum : 0; });
    var postVals = sess.map(function (s) { return typeof s.posttestSum === "number" ? s.posttestSum : 0; });

    function mean(arr) { return arr.length === 0 ? null : arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }
    function sd(arr, useSample) {
      if (arr.length < 2) return null;
      var m = mean(arr);
      var ss = arr.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0);
      return Math.sqrt(ss / (useSample ? arr.length - 1 : arr.length));
    }
    function median(arr) {
      if (arr.length === 0) return null;
      var s = arr.slice().sort(function (a, b) { return a - b; });
      var mid = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
    }
    var miMean = mean(miVals);
    var miSD = sd(miVals, true);
    var miMedian = median(miVals);
    var preMean = mean(preVals);
    var preSD = sd(preVals, true);
    var postMean = mean(postVals);
    var postSD = sd(postVals, true);

    // Cohen's d for paired pretest → posttest (within-subjects).
    // Pooled SD across the pre + post raw scores.
    var cohenD = null, hedgesG = null;
    if (preSD !== null && postSD !== null && preMean !== null && postMean !== null) {
      var pooledSD = Math.sqrt((preSD * preSD + postSD * postSD) / 2);
      if (pooledSD > 0) {
        cohenD = (postMean - preMean) / pooledSD;
        // Hedges' g — small-sample correction
        var correction = 1 - (3 / (4 * (n + n) - 9));
        hedgesG = cohenD * correction;
      }
    }

    // MI distribution histogram bins (range −1 to +1, step 0.2)
    var bins = [];
    for (var b = -1.0; b < 1.0; b += 0.2) {
      bins.push({ lo: b, hi: b + 0.2, count: 0 });
    }
    miVals.forEach(function (m) {
      for (var i = 0; i < bins.length; i++) {
        if (m >= bins[i].lo && (i === bins.length - 1 ? m <= bins[i].hi : m < bins[i].hi)) {
          bins[i].count++;
          return;
        }
      }
    });

    // Tier counts
    var tierCounts = { high: 0, moderate: 0, low: 0, regression: 0 };
    sess.forEach(function (s) {
      var t = (s.modifiabilityTier && s.modifiabilityTier.id) || modifiabilityTier(s.modifiabilityIndex).id;
      if (t in tierCounts) tierCounts[t]++;
    });

    return {
      n: n, miMean: miMean, miSD: miSD, miMedian: miMedian,
      pretestMean: preMean, pretestSD: preSD,
      posttestMean: postMean, posttestSD: postSD,
      cohenD: cohenD, hedgesG: hedgesG,
      miDistribution: bins, tierCounts: tierCounts,
      allMIs: miVals
    };
  }

  // Z-score for an individual MI relative to a population.
  function computeMiZScore(thisMI, popMean, popSD) {
    if (typeof thisMI !== "number" || popMean === null || popSD === null || popSD === 0) return null;
    return (thisMI - popMean) / popSD;
  }

  // Percentile rank of thisMI within allMIs. Uses simple ranking with
  // midpoint convention for ties.
  function computeMiPercentile(thisMI, allMIs) {
    if (typeof thisMI !== "number" || !Array.isArray(allMIs) || allMIs.length === 0) return null;
    var below = allMIs.filter(function (m) { return m < thisMI; }).length;
    var equal = allMIs.filter(function (m) { return m === thisMI; }).length;
    return Math.round(((below + 0.5 * equal) / allMIs.length) * 100);
  }

  // Plain-language interpretation of Cohen's d.
  function interpretCohenD(d) {
    if (d === null || d === undefined) return { label: "—", color: "#64748b", desc: "Insufficient data." };
    var abs = Math.abs(d);
    if (abs < 0.2) return { label: "Negligible", color: "#64748b",
      desc: "Effect size is below the conventional 'small' threshold (Cohen, 1988). Across your caseload, the average pretest→posttest change is too small to distinguish from measurement noise — do not describe it as a meaningful mediation effect." };
    if (abs < 0.5) return { label: "Small", color: "#a16207",
      desc: "Average mediation produces a small (Cohen, 1988) effect across your caseload. Useful at the individual level for some students, but not a strong population-wide intervention signal." };
    if (abs < 0.8) return { label: "Medium", color: "#15803d",
      desc: "Average mediation produces a medium effect across your caseload. This is consistent with published DA findings and supports the methodology as a clinically meaningful intervention probe." };
    return { label: "Large", color: "#16a34a",
      desc: "Average mediation produces a large effect across your caseload. Strong evidence of population-level responsiveness to the mediation approach in use." };
  }

  // Build per-session CSV row for research export.
  function buildSessionStatsCsv(sessions) {
    var rows = [];
    rows.push([
      "session_id", "date_completed", "student_nickname", "domain", "difficulty", "mode",
      "items_n", "pretest_sum", "posttest_sum", "max_score",
      "modifiability_index", "modifiability_tier", "transfer_n", "transfer_sum"
    ].join(","));
    (sessions || []).forEach(function (s) {
      function txt(x) { return '"' + String(x || "").replace(/"/g, '""') + '"'; }
      function num(x) { return x === null || x === undefined ? "" : (typeof x === "number" ? x.toFixed(4) : String(x)); }
      var trResults = (s.itemResults || []).filter(function (r) { return r.phase === "transfer"; });
      var trSum = sumItemResultScores(trResults);
      rows.push([
        txt(s.id),
        txt(s.dateCompleted || s.dateStarted || ""),
        txt(s.studentNickname || ""),
        txt(s.domain || ""),
        txt(s.difficulty || ""),
        txt(s.mode || ""),
        (s.sessionItemIds || []).length,
        num(s.pretestSum),
        num(s.posttestSum),
        maxPossibleScore((s.sessionItemIds || []).length),
        num(s.modifiabilityIndex),
        txt((s.modifiabilityTier && s.modifiabilityTier.id) || ""),
        trResults.length,
        num(trSum)
      ].join(","));
    });
    return rows.join("\n");
  }

  // ═════════════════════════════════════════════════════════
  // Phase AA — Item analytics across all sessions
  // ─────────────────────────────────────────────────────────
  // For each item that's been administered at least N times,
  // compute psychometric indicators:
  //   - pretestPassRate    : p-value at pretest (proportion correct unprompted)
  //   - posttestPassRate   : proportion correct at posttest
  //   - modifiabilitySensitivity : how often mediation moves wrong→right
  //   - meanScaffoldLevel  : mean level reached during mediation
  //   - transferPassRate   : proportion correct on transfer twin
  //   - flagSet            : psychometric concerns ('too-easy', 'too-hard', 'non-discriminating')
  // Items with n < 3 are excluded (insufficient data for stable estimate).
  // ═════════════════════════════════════════════════════════
  function aggregateItemStatistics(sessions, minN) {
    if (typeof minN !== "number") minN = 3;
    var perItem = {};
    (sessions || []).forEach(function (sess) {
      var rs = sess.itemResults || [];
      rs.forEach(function (r) {
        var id = r.itemId;
        if (!perItem[id]) {
          perItem[id] = {
            itemId: id,
            pretest: { n: 0, correct: 0 },
            posttest: { n: 0, correct: 0 },
            mediation: { n: 0, correctAt: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }, levelsSum: 0, neverSolved: 0 },
            transfer: { n: 0, correct: 0 },
            // For modifiability sensitivity: count students who got it wrong on pretest
            // AND right on posttest within the same session.
            modSensSeen: 0,    // n where pretest result is known AND posttest result is known
            modSensMoved: 0    // n where pretest=wrong AND posttest=right
          };
        }
        var bucket = perItem[id];
        if (r.phase === "pretest") {
          bucket.pretest.n++;
          if (r.finalCorrect) bucket.pretest.correct++;
        } else if (r.phase === "posttest") {
          bucket.posttest.n++;
          if (r.finalCorrect) bucket.posttest.correct++;
        } else if (r.phase === "mediation") {
          bucket.mediation.n++;
          var lvl = r.promptLevelReached || 0;
          if (lvl >= 0 && lvl <= 4) bucket.mediation.correctAt[lvl] = (bucket.mediation.correctAt[lvl] || 0) + 1;
          bucket.mediation.levelsSum += lvl;
          if (!r.finalCorrect) bucket.mediation.neverSolved++;
        } else if (r.phase === "transfer") {
          bucket.transfer.n++;
          if (r.finalCorrect) bucket.transfer.correct++;
        }
      });

      // Modifiability sensitivity needs same-session pretest+posttest pairing
      var preById = {}, postById = {};
      rs.forEach(function (r) {
        if (r.phase === "pretest") preById[r.itemId] = !!r.finalCorrect;
        else if (r.phase === "posttest") postById[r.itemId] = !!r.finalCorrect;
      });
      Object.keys(preById).forEach(function (id) {
        if (id in postById) {
          if (!perItem[id]) return;
          perItem[id].modSensSeen++;
          if (preById[id] === false && postById[id] === true) {
            perItem[id].modSensMoved++;
          }
        }
      });
    });

    var out = Object.keys(perItem).map(function (id) {
      var b = perItem[id];
      var item = ITEMS_BY_ID[id];
      var pretestPassRate = b.pretest.n > 0 ? b.pretest.correct / b.pretest.n : null;
      var posttestPassRate = b.posttest.n > 0 ? b.posttest.correct / b.posttest.n : null;
      var meanScaffoldLevel = b.mediation.n > 0 ? b.mediation.levelsSum / b.mediation.n : null;
      var modSens = b.modSensSeen >= 2 ? b.modSensMoved / b.modSensSeen : null;
      var transferPassRate = b.transfer.n > 0 ? b.transfer.correct / b.transfer.n : null;
      var totalN = b.pretest.n + b.posttest.n + b.mediation.n;

      // Psychometric flags
      var flags = [];
      if (pretestPassRate !== null && pretestPassRate >= 0.85 && b.pretest.n >= minN) {
        flags.push({ id: "too-easy", label: "Too easy", color: "#a16207",
          desc: "Pretest pass rate ≥ 85% — most students solve this unprompted. Limited diagnostic value at this difficulty band." });
      }
      if (meanScaffoldLevel !== null && meanScaffoldLevel >= 3.5 && b.mediation.n >= minN) {
        flags.push({ id: "too-hard", label: "Too hard", color: "#b91c1c",
          desc: "Mean scaffold level ≥ 3.5 — most students need modeling or direct teach. Consider revising L1/L2 scaffolds or moving the item to a harder bank." });
      }
      if (modSens !== null && modSens < 0.1 && b.modSensSeen >= 5) {
        flags.push({ id: "non-discriminating", label: "Non-discriminating", color: "#7c2d12",
          desc: "Mediation rarely moves wrong→right (modifiability sensitivity < 10%). Either the scaffolds are not effective or this isn't a modifiable construct at this difficulty." });
      }
      if (pretestPassRate !== null && pretestPassRate <= 0.05 && b.pretest.n >= minN && posttestPassRate !== null && posttestPassRate <= 0.1) {
        flags.push({ id: "floor", label: "Floor effect", color: "#9d174d",
          desc: "Both pretest and posttest pass rates ≤ 10% — mediation isn't reaching this item. Likely floor effect; revise or remove." });
      }
      if (b.mediation.n > 0 && b.mediation.neverSolved / b.mediation.n >= 0.5) {
        flags.push({ id: "stuck", label: "Often unsolved", color: "#7f1d1d",
          desc: "≥ 50% of mediation attempts ended without success even after L4. Check the L4 direct-teach text — it may be unclear." });
      }

      return {
        itemId: id,
        construct: item ? item.construct : id,
        domain: item ? item.domain : "unknown",
        difficulty: item ? item.difficulty : "unknown",
        gradeBand: item ? item.gradeBand : "—",
        n: totalN,
        pretestN: b.pretest.n,
        pretestPassRate: pretestPassRate,
        posttestN: b.posttest.n,
        posttestPassRate: posttestPassRate,
        mediationN: b.mediation.n,
        meanScaffoldLevel: meanScaffoldLevel,
        modSensSeen: b.modSensSeen,
        modifiabilitySensitivity: modSens,
        transferN: b.transfer.n,
        transferPassRate: transferPassRate,
        flags: flags,
        sufficientData: totalN >= minN
      };
    });
    return out;
  }

  // Build a CSV string suitable for download. One row per item with all stats.
  function buildItemAnalyticsCsv(itemStats) {
    var rows = [];
    rows.push([
      "item_id", "construct", "domain", "difficulty", "grade_band",
      "total_n", "pretest_n", "pretest_pass_rate",
      "posttest_n", "posttest_pass_rate",
      "mediation_n", "mean_scaffold_level",
      "mod_sens_n", "modifiability_sensitivity",
      "transfer_n", "transfer_pass_rate",
      "flags"
    ].join(","));
    itemStats.forEach(function (it) {
      function num(x) { return x === null || x === undefined ? "" : (typeof x === "number" ? x.toFixed(3) : String(x)); }
      function txt(x) { return '"' + String(x || "").replace(/"/g, '""') + '"'; }
      rows.push([
        txt(it.itemId), txt(it.construct), txt(it.domain), txt(it.difficulty), txt(it.gradeBand),
        it.n, it.pretestN, num(it.pretestPassRate),
        it.posttestN, num(it.posttestPassRate),
        it.mediationN, num(it.meanScaffoldLevel),
        it.modSensSeen, num(it.modifiabilitySensitivity),
        it.transferN, num(it.transferPassRate),
        txt(it.flags.map(function (f) { return f.id; }).join(";"))
      ].join(","));
    });
    return rows.join("\n");
  }

  // ═════════════════════════════════════════════════════════
  // Phase J — Longitudinal helpers
  // ─────────────────────────────────────────────────────────
  // Group saved sessions by nickname and compute trend across
  // re-assessment occasions. Returns interpretive labels with
  // appropriate caveats — DA across time is informative but
  // not directly comparable item-for-item (different probes,
  // different domains, practice effects on transfer twins).
  // ═════════════════════════════════════════════════════════
  function groupSessionsByStudent(sessions) {
    var by = {};
    (sessions || []).forEach(function (s) {
      var key = (s.studentNickname || "").trim() || "(anonymous)";
      if (!by[key]) by[key] = [];
      by[key].push(s);
    });
    // Sort each student's sessions oldest → newest
    Object.keys(by).forEach(function (k) {
      by[k].sort(function (a, b) {
        var da = new Date(a.dateCompleted || a.dateStarted || 0).getTime();
        var db = new Date(b.dateCompleted || b.dateStarted || 0).getTime();
        return da - db;
      });
    });
    return by;
  }

  // Returns { slope, label, color, desc } characterizing the MI
  // trend across sessions for one student. Requires 2+ sessions.
  function computeLongitudinalTrend(studentSessions) {
    var pts = (studentSessions || []).map(function (s) {
      return typeof s.modifiabilityIndex === "number" ? s.modifiabilityIndex : 0;
    });
    if (pts.length < 2) {
      return { slope: 0, label: "Insufficient data", color: "#64748b",
        desc: "At least two completed sessions are required to characterize a longitudinal trend." };
    }
    // Simple linear regression slope across session index
    var n = pts.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i; sumY += pts[i]; sumXY += i * pts[i]; sumX2 += i * i;
    }
    var meanX = sumX / n, meanY = sumY / n;
    var denom = sumX2 - n * meanX * meanX;
    var slope = denom !== 0 ? (sumXY - n * meanX * meanY) / denom : 0;
    var first = pts[0], last = pts[pts.length - 1];
    var change = last - first;
    if (Math.abs(change) < 0.1 && Math.abs(slope) < 0.05) {
      return { slope: slope, label: "Stable modifiability profile", color: "#475569",
        desc: "MI has remained within a narrow range across sessions. The student's response to scaffolded mediation appears consistent. This may reflect a stable learning profile OR limited variation across the probes attempted — consider whether different constructs or difficulty bands have been tried." };
    }
    if (slope > 0.05 && change > 0.1) {
      return { slope: slope, label: "Upward modifiability trajectory", color: "#16a34a",
        desc: "MI has trended upward across re-assessment occasions. The student appears increasingly responsive to mediation — this may reflect growing comfort with the assessment format, learning of strategies through prior mediation, or genuine construct development. Treat with appropriate clinical skepticism about practice effects." };
    }
    if (slope < -0.05 && change < -0.1) {
      return { slope: slope, label: "Downward modifiability trajectory", color: "#b91c1c",
        desc: "MI has declined across sessions. Common explanations: probes administered at progressively harder difficulty bands, fatigue/disengagement with the re-testing format, or a genuine plateau in construct learning. Check the domain/difficulty column before drawing conclusions about ability." };
    }
    return { slope: slope, label: "Mixed trajectory", color: "#a16207",
      desc: "Modifiability has varied without a clear directional pattern. This often reflects different domains being probed across sessions, day-to-day variability, or session-length differences. Look at domain consistency in the table below before interpreting." };
  }

  function modifiabilityTier(index) {
    if (index >= 0.6) return { id: "high", label: "Responsive to mediation",
      desc: "Substantial growth between pretest and posttest. The scaffolding strategies used were effective for this student in this construct domain. Continued instruction with similar mediation techniques is likely to be productive." };
    if (index >= 0.3) return { id: "moderate", label: "Moderately responsive — responds to mediation with continued practice",
      desc: "Some growth observed with scaffolding. The student benefited from mediation but may need repeated exposure and structured practice to consolidate gains. Consider targeted intervention with these scaffold types." };
    if (index >= 0) return { id: "low", label: "Limited modifiability under these mediation conditions",
      desc: "Minimal change between pretest and posttest. This may indicate that the scaffolds used were not well-matched to the student's profile, or that a different construct should be probed. Consider trying alternate mediation strategies before drawing conclusions about learning capacity." };
    return { id: "regression", label: "Posttest performance below pretest baseline",
      desc: "Posttest was actually lower than pretest. This often reflects fatigue, anxiety, motivation drop, or session-length issues rather than ability. Re-test on a different day with shorter session." };
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 3 — Persistence helpers
  // ═════════════════════════════════════════════════════════
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return Object.assign({}, defaultState(), parsed || {});
    } catch (e) { return defaultState(); }
  }
  // Save quotient state. Most failures are quota-exceeded; surface them
  // via a window-level flag so the React layer can show a toast without
  // tight coupling.
  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      if (typeof window !== "undefined") window.__alloDaStorageFailed = false;
    } catch (e) {
      // Quota exceeded is the common one. Mark a flag so the component
      // can warn the user. Subsequent saves keep trying.
      if (typeof window !== "undefined") {
        window.__alloDaStorageFailed = true;
        window.__alloDaStorageError = (e && e.message) ? e.message : "Unknown localStorage error";
      }
      if (typeof console !== "undefined") {
        try { console.warn("[DA] localStorage save failed:", e); } catch (err) { /* ignore */ }
      }
    }
  }
  function defaultState() {
    return {
      sessions: [],              // Completed sessions for the activeStudent
      activeSession: null,       // In-progress session (null = no active)
      onboardingSeen: false,
      savedProbeTemplates: []    // Phase A-bis — clinician's reusable AI-generated probes
    };
  }

  // ─── AI mediation prompt (Phase B) ───
  // Builds the Gemini prompt for one mediation attempt. Gemini sees the
  // item, the student's response, the scaffolds already delivered, and
  // returns strict JSON: { verdict, nextScaffoldLevel, observationHint }.
  //
  // We deliberately keep the canonical answer + canned scaffold texts
  // in the prompt so Gemini's role is DECISION (which scaffold next)
  // rather than CONTENT GENERATION (no hallucinated hints). Scaffold
  // text shown to the student is always the pre-authored ladder copy.
  function buildAiMediatePrompt(item, lastResponse, scaffoldsDelivered, outputLanguage) {
    var ladderLines = item.promptLadder.map(function (step) {
      var was = scaffoldsDelivered.indexOf(step.level) >= 0 ? " [ALREADY DELIVERED]" : "";
      return "  L" + step.level + " (" + step.type + ")" + was + ": " + step.text;
    }).join("\n");
    return [
      "You are mediating one item in a dynamic assessment session for a student.",
      "Your job: evaluate the student's most recent response, then decide which scaffold level (if any) to deliver next.",
      buildLanguageDirective(outputLanguage),
      "ITEM:",
      "  " + item.prompt,
      "  Canonical correct answer: " + item.correctAnswer,
      "  Acceptable variants: " + (item.acceptableAnswers || []).join(", "),
      "  Construct being assessed: " + item.construct,
      "",
      "SCAFFOLD LADDER (always 4 levels, pre-authored):",
      ladderLines,
      "",
      "STUDENT RESPONSE THIS ATTEMPT: \"" + String(lastResponse || "").replace(/"/g, '\\"').slice(0, 400) + "\"",
      "",
      "DECISION RULES:",
      "- If the response is correct (matches the canonical answer or an acceptable variant in meaning), verdict = 'correct'. nextScaffoldLevel must be the same level the student was just on (do not advance).",
      "- If the response is wrong or off-topic but the student attempted, verdict = 'incorrect'. nextScaffoldLevel = the SMALLEST level not yet delivered (escalate by exactly one step).",
      "- If the response shows partial understanding (right idea, wrong final answer), verdict = 'partial'. nextScaffoldLevel = smallest level not yet delivered.",
      "- Never skip levels — always escalate by one. Never deliver an already-delivered level.",
      "- If all 4 scaffolds have been delivered AND the student is still wrong, verdict = 'incorrect' and nextScaffoldLevel = 4 (the directTeach was already given; you cannot escalate further).",
      "",
      "Output STRICT JSON only (no markdown, no commentary), shaped exactly like:",
      '{ "verdict": "correct"|"partial"|"incorrect", "nextScaffoldLevel": 0|1|2|3|4, "observationHint": "<1 sentence, ≤25 words, observational note about the student\'s strategy or error pattern, neutral tone>" }'
    ].join("\n");
  }

  // Deterministic fallback when Gemini is unavailable.
  // Rules: try answer-match first. If wrong, escalate one level past the
  // highest already-delivered.
  function fallbackAiMediate(item, lastResponse, scaffoldsDelivered) {
    var isMatch = matchAnswer(item, lastResponse);
    if (isMatch) {
      var lvl = scaffoldsDelivered.length === 0 ? 0 : Math.max.apply(null, scaffoldsDelivered);
      return { verdict: "correct", nextScaffoldLevel: lvl, observationHint: "Solved with prior scaffolding." };
    }
    var nextLvl;
    if (scaffoldsDelivered.length === 0) nextLvl = 1;
    else {
      var maxSoFar = Math.max.apply(null, scaffoldsDelivered);
      nextLvl = Math.min(4, maxSoFar + 1);
    }
    return { verdict: "incorrect", nextScaffoldLevel: nextLvl, observationHint: "Response did not match the canonical answer; escalating scaffold." };
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 2.4 — Report Writer export (Phase D)
  // ═════════════════════════════════════════════════════════
  // Builds a structured payload from a completed DA session that the
  // Report Writer module ingests via window.__alloDAExport. Payload
  // contains both atomic fact chunks (for AI section-drafting downstream)
  // AND a pre-drafted narrative section the clinician can paste in or
  // edit. Template-generated so it's deterministic; clinician can
  // re-generate with Gemini from RW if they want a polished version.

  // Convert a session's data into atomic fact chunks matching the
  // Report Writer's fact-chunk schema:
  //   { id, type, source, field, value, classification?, category?, verified, immutable, addedAt }
  // type='da-summary' is novel and distinguishes DA findings from
  // standardized scores. category='dynamic-assessment' groups them in
  // the fact-chunk review screen.
  function buildDaFactChunks(session) {
    if (!session) return [];
    var nowIso = new Date().toISOString();
    function chunk(field, value, classification) {
      return {
        id: "fc-da-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
        type: "da-summary",
        source: "Dynamic Assessment Probe",
        field: field,
        value: String(value),
        classification: classification || "",
        category: "dynamic-assessment",
        verified: false,
        immutable: false,
        addedAt: nowIso
      };
    }
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var mediationResults = (session.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
    var transferResults = (session.itemResults || []).filter(function (r) { return r.phase === "transfer"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var transferSum = sumItemResultScores(transferResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var transferMax = maxPossibleScore(transferResults.length);
    var transferInterp = transferResults.length > 0
      ? transferTier(transferSum, transferMax, posttestSum, max)
      : null;
    var modIdx = typeof session.modifiabilityIndex === "number"
      ? session.modifiabilityIndex
      : computeModifiabilityIndex(pretestSum, posttestSum, session.sessionItemIds.length);
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);

    // Scaffold histogram for mediation phase
    var scaffoldTypes = { cue: 0, leading: 0, model: 0, directTeach: 0, none: 0, skipped: 0 };
    mediationResults.forEach(function (r) {
      var t = r.supportType || "none";
      scaffoldTypes[t] = (scaffoldTypes[t] || 0) + 1;
    });

    // Domain label
    var domainLabel = session.isCustomBank
      ? "custom-generated probe"
      : (session.domain === "math" ? "math reasoning" : session.domain);

    var chunks = [];
    // Phase V — intake context surfaces FIRST so reviewers see the referral
    // before the findings.
    if (session.intake) {
      var ik = session.intake;
      if (ik.referralReason && ik.referralReason.trim()) chunks.push(chunk("Referral reason", ik.referralReason.trim(), "intake"));
      if (ik.specificQuestion && ik.specificQuestion.trim()) chunks.push(chunk("Referral question", ik.specificQuestion.trim(), "intake"));
      if (ik.hypothesizedBottleneck && ik.hypothesizedBottleneck.trim()) chunks.push(chunk("Hypothesized bottleneck", ik.hypothesizedBottleneck.trim(), "intake"));
      if (ik.priorInterventions && ik.priorInterventions.trim()) chunks.push(chunk("Prior interventions tried", ik.priorInterventions.trim(), "intake"));
      if (ik.existingAssessmentData && ik.existingAssessmentData.trim()) chunks.push(chunk("Existing assessment data", ik.existingAssessmentData.trim(), "intake"));
    }
    chunks = chunks.concat([
      chunk("Domain probed", domainLabel),
      chunk("Difficulty band", session.difficulty),
      chunk("Mediation mode", session.mode === "ai" ? "AI-mediated" : "Clinician-led"),
      chunk("Items administered", session.sessionItemIds.length),
      chunk("Pretest baseline", pretestSum + " / " + max + " (" + Math.round((pretestSum / max) * 100) + "%)"),
      chunk("Posttest score", posttestSum + " / " + max + " (" + Math.round((posttestSum / max) * 100) + "%)"),
      chunk("Absolute growth", (posttestSum - pretestSum >= 0 ? "+" : "") + (posttestSum - pretestSum) + " points"),
      chunk("Modifiability Index", modIdx.toFixed(2), tier.label),
      chunk("Modifiability interpretation", tier.label, tier.id)
    ]);

    // Per-scaffold-type usage
    ["cue", "leading", "model", "directTeach"].forEach(function (k) {
      if (scaffoldTypes[k] > 0) {
        var labels = { cue: "L1 declarative cues used", leading: "L2 leading questions used", model: "L3 modeling used", directTeach: "L4 direct teaching used" };
        chunks.push(chunk(labels[k], scaffoldTypes[k] + " item(s)"));
      }
    });

    // Phase E — Transfer chunks (added when transfer phase ran)
    if (transferResults.length > 0 && transferInterp) {
      chunks.push(chunk("Transfer probe score", transferSum + " / " + transferMax + " (" + Math.round((transferSum / transferMax) * 100) + "%)"));
      chunks.push(chunk("Transfer interpretation", transferInterp.label, transferInterp.id));
    }

    // Learning-zone (ZPD) snapshot — counts per band, descriptive only.
    var zpd = computeZpdProfile(session);
    if (zpd.nClassified > 0) {
      chunks.push(chunk(
        "Learning-zone snapshot (descriptive)",
        zpd.independent.length + " item(s) already independent at pretest · " +
        zpd.zpd.length + " item(s) solved with L1–L3 scaffolds (teachable band) · " +
        zpd.frustration.length + " item(s) needing direct teaching or unsolved",
        "zpd"
      ));
    }

    // Construct tags rolled up
    var allTags = {};
    (session.itemResults || []).forEach(function (r) {
      var it = ITEMS_BY_ID[r.itemId];
      if (it && Array.isArray(it.constructTags)) {
        it.constructTags.forEach(function (t) { allTags[t] = (allTags[t] || 0) + 1; });
      }
    });
    var tagsString = Object.keys(allTags).join(", ");
    if (tagsString) chunks.push(chunk("Constructs probed", tagsString));

    // Phase I — observation tag patterns (top 3 with count)
    var obsAgg = aggregateObservationTags(session.itemResults);
    if (obsAgg.length > 0) {
      var topTags = obsAgg.slice(0, 3).map(function (t) { return t.label + " (" + t.count + ")"; }).join(", ");
      chunks.push(chunk("Observed patterns", topTags));
    }

    // Phase U — session-level clinician note (if present)
    if (session.sessionNote && session.sessionNote.trim()) {
      chunks.push(chunk("Session-level clinician note", session.sessionNote.trim().slice(0, 600)));
    }

    // Phase K — drafted IEP goals (each goal is its own fact chunk so the
    // Report Writer can surface them as discrete claims for review).
    if (Array.isArray(session.iepGoals) && session.iepGoals.length > 0) {
      session.iepGoals.forEach(function (g, gi) {
        chunks.push(chunk("Proposed IEP goal " + (gi + 1) + " (" + g.domain + ")", g.annualGoal, "ai-drafted"));
      });
    }

    // Phase Q — drafted accommodations (each accommodation is its own chunk
    // tagged by UDL principle so the Report Writer can group them or treat
    // them as discrete recommendation claims).
    if (Array.isArray(session.accommodations) && session.accommodations.length > 0) {
      session.accommodations.forEach(function (a, ai) {
        var udlLabel = a.udlPrinciple || "representation";
        chunks.push(chunk(
          "Accommodation " + (ai + 1) + " (" + (a.category || "instructional") + " · " + udlLabel + ")",
          a.title + " — " + a.description,
          "ai-drafted"
        ));
      });
    }

    // Phase X — progress monitoring plan summary (one chunk per monitored construct)
    if (session.progressMonitoring && Array.isArray(session.progressMonitoring.goalMonitoring)) {
      session.progressMonitoring.goalMonitoring.forEach(function (g, gi) {
        chunks.push(chunk(
          "Progress monitoring " + (gi + 1) + " (" + (g.probeType || "construct") + ")",
          g.goalSummary + " — " + (g.frequency || "frequency unspecified") + (g.criterion ? " · criterion: " + g.criterion : ""),
          "ai-drafted"
        ));
      });
    }

    return chunks;
  }

  // Build the pre-drafted narrative section text. Template-based, so it's
  // deterministic + immediately useful. Clinician can edit freely OR
  // ask Report Writer to regenerate with Gemini using the fact chunks.
  function buildDaNarrativeSection(session, studentName) {
    if (!session) return "";
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var mediationResults = (session.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
    var transferResults = (session.itemResults || []).filter(function (r) { return r.phase === "transfer"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var transferSum = sumItemResultScores(transferResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var transferMax = maxPossibleScore(transferResults.length);
    var narrTransferInterp = transferResults.length > 0
      ? transferTier(transferSum, transferMax, posttestSum, max)
      : null;
    var modIdx = typeof session.modifiabilityIndex === "number"
      ? session.modifiabilityIndex
      : computeModifiabilityIndex(pretestSum, posttestSum, session.sessionItemIds.length);
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);
    var growth = posttestSum - pretestSum;
    var name = studentName || session.studentNickname || "The student";
    var domainLabel = session.isCustomBank
      ? "a clinician-generated dynamic-assessment probe"
      : ("a " + (session.domain === "math" ? "math reasoning" : session.domain) + " dynamic-assessment probe at " + session.difficulty + " difficulty");
    var modeLabel = session.mode === "ai" ? "AI-mediated scaffolding" : "clinician-led scaffolding";

    // Scaffold-type summary line
    var scaffoldTypes = { cue: 0, leading: 0, model: 0, directTeach: 0 };
    mediationResults.forEach(function (r) {
      var t = r.supportType;
      if (t in scaffoldTypes) scaffoldTypes[t] = scaffoldTypes[t] + 1;
    });
    var scaffoldParts = [];
    if (scaffoldTypes.cue > 0)         scaffoldParts.push(scaffoldTypes.cue + " items solved with a declarative cue");
    if (scaffoldTypes.leading > 0)     scaffoldParts.push(scaffoldTypes.leading + " with a leading question");
    if (scaffoldTypes.model > 0)       scaffoldParts.push(scaffoldTypes.model + " with modeling");
    if (scaffoldTypes.directTeach > 0) scaffoldParts.push(scaffoldTypes.directTeach + " requiring direct teaching");
    var scaffoldSentence = scaffoldParts.length > 0
      ? (" During the mediation phase: " + scaffoldParts.join(", ") + ".")
      : "";

    // Item count and basic stats
    var lines = [];
    // Phase V — referral context paragraph (only if intake was filled in)
    if (session.intake) {
      var ik = session.intake;
      var ctxParts = [];
      if (ik.referralReason && ik.referralReason.trim()) ctxParts.push(ik.referralReason.trim());
      if (ik.hypothesizedBottleneck && ik.hypothesizedBottleneck.trim()) ctxParts.push("Hypothesized bottleneck: " + ik.hypothesizedBottleneck.trim());
      if (ik.specificQuestion && ik.specificQuestion.trim()) ctxParts.push("The probe was designed to address: " + ik.specificQuestion.trim());
      if (ctxParts.length > 0) {
        lines.push("Referral context: " + ctxParts.join(" "));
      }
    }
    lines.push(
      name + " completed " + domainLabel + " using " + modeLabel +
      ". The probe presented " + session.sessionItemIds.length + " items in a structured pretest → mediation → posttest format following graduated prompt hierarchies (Lidz, 2003; Feuerstein et al., 1979)."
    );
    lines.push(
      "On the pretest baseline (unscaffolded performance), " + name + " earned " + pretestSum + " of " + max +
      " possible points (" + Math.round((pretestSum / max) * 100) + "%). Following the mediation phase, posttest performance was " +
      posttestSum + " of " + max + " points (" + Math.round((posttestSum / max) * 100) + "%), an absolute change of " +
      (growth >= 0 ? "+" : "") + growth + " points." + scaffoldSentence
    );
    lines.push(
      "The Modifiability Index — the proportion of available growth realized between pretest and posttest — was " +
      modIdx.toFixed(2) + ". " + tier.desc
    );
    // Phase E — Transfer paragraph
    if (narrTransferInterp) {
      lines.push(
        "A transfer probe was administered following the posttest. Transfer items maintained the same target construct but used different surface features. " +
        name + " scored " + transferSum + " of " + transferMax + " on the transfer probe (" +
        Math.round((transferSum / transferMax) * 100) + "%). " + narrTransferInterp.desc
      );
    }
    // Phase I — Observed-pattern paragraph (only if examiner recorded any tags)
    var narrObsAgg = aggregateObservationTags(session.itemResults);
    if (narrObsAgg.length > 0) {
      var totalItems = (session.itemResults || []).length;
      var prominent = narrObsAgg.filter(function (t) { return t.count >= Math.max(2, Math.ceil(totalItems * 0.3)); });
      if (prominent.length > 0) {
        var lcFirst = function (s) { return s.charAt(0).toLowerCase() + s.slice(1); };
        var phrases = prominent.map(function (t) { return lcFirst(t.label) + " (" + t.count + " of " + totalItems + " items)"; });
        lines.push(
          "Examiner observations across items consistently noted: " + phrases.join("; ") +
          ". These patterns are clinically meaningful at this frequency and warrant further consideration when planning instruction."
        );
      }
    }
    // Learning-zone (ZPD) snapshot paragraph — deterministic, hedged. Gives
    // the report the WHERE-to-teach read the score sums alone don't carry.
    var zpdNarr = computeZpdProfile(session);
    if (zpdNarr.nClassified > 0) {
      var zpdBits = [];
      zpdBits.push(zpdNarr.independent.length + " already solved independently at pretest");
      zpdBits.push(zpdNarr.zpd.length + " solved during mediation with level 1–3 scaffolds" +
        (zpdNarr.zpd.length > 0
          ? " (" + zpdNarr.zpd.map(function (z) { return z.construct + " at L" + z.level; }).join("; ") + ")"
          : ""));
      zpdBits.push(zpdNarr.frustration.length + " requiring direct teaching or remaining unsolved");
      lines.push(
        "Learning-zone snapshot (descriptive): of the items administered, " + zpdBits.join("; ") +
        ". Items in the scaffold-responsive band indicate where instruction pitched with similar supports is most likely to produce growth (Vygotsky, 1978). This classification describes this session's items only and is not a normed placement."
      );
    }
    // Access-condition observations (only when a language context was recorded
    // at intake AND there is contrast evidence). Aaron-approved wording.
    var narrAccessNote = formatAccessContrastForReport(session, name);
    if (narrAccessNote) lines.push(narrAccessNote);
    lines.push(
      "Clinical interpretation: this finding is descriptive of " + name + "'s response to scaffolded instruction in this specific construct domain. It is not a normed or standardized measure. Findings should be interpreted alongside results from standardized cognitive and academic measures, classroom observation, and intervention response data."
    );
    // Phase Q — drafted accommodations grouped by UDL principle
    if (Array.isArray(session.accommodations) && session.accommodations.length > 0) {
      var accomLines = [];
      accomLines.push("Recommended UDL accommodations (drafted from DA findings; clinician to review and finalize):");
      var byUdl = { "engagement": [], "representation": [], "action-expression": [] };
      session.accommodations.forEach(function (a) {
        var key = a.udlPrinciple in byUdl ? a.udlPrinciple : "representation";
        byUdl[key].push(a);
      });
      Object.keys(byUdl).forEach(function (k) {
        if (byUdl[k].length === 0) return;
        accomLines.push("");
        accomLines.push("UDL · " + (k === "action-expression" ? "Action & Expression" : (k.charAt(0).toUpperCase() + k.slice(1))) + ":");
        byUdl[k].forEach(function (a, ai) {
          accomLines.push("  " + (ai + 1) + ". " + a.title + " — " + a.description);
          if (a.rationale) accomLines.push("     Evidence: " + a.rationale);
        });
      });
      lines.push(accomLines.join("\n"));
    }

    // Phase X — progress monitoring plan (block-quoted under its own heading)
    if (session.progressMonitoring) {
      var pm = session.progressMonitoring;
      var pmLines = [];
      pmLines.push("Progress monitoring plan (drafted from DA findings + IEP goals; clinician + IEP team to review and finalize):");
      if (pm.overview) { pmLines.push(""); pmLines.push(pm.overview); }
      if (Array.isArray(pm.goalMonitoring) && pm.goalMonitoring.length > 0) {
        pmLines.push("");
        pmLines.push("Monitoring schedule:");
        pm.goalMonitoring.forEach(function (g, gi) {
          pmLines.push("  " + (gi + 1) + ". " + g.goalSummary);
          pmLines.push("     Probe: " + (g.probeType || "—") + " · Frequency: " + (g.frequency || "—") +
            (g.criterion ? " · Criterion: " + g.criterion : ""));
        });
      }
      if (Array.isArray(pm.reviewSchedule) && pm.reviewSchedule.length > 0) {
        pmLines.push("");
        pmLines.push("Review schedule: " + pm.reviewSchedule.map(function (r) { return r.timing + " (" + r.focus + ")"; }).join("; "));
      }
      if (pm.caveat) { pmLines.push(""); pmLines.push("Note: " + pm.caveat); }
      lines.push(pmLines.join("\n"));
    }

    // Phase K — drafted IEP goals (block-quoted under their own heading)
    if (Array.isArray(session.iepGoals) && session.iepGoals.length > 0) {
      var goalLines = [];
      goalLines.push("Proposed IEP goals (drafted from DA findings; clinician to review and finalize):");
      session.iepGoals.forEach(function (g, gi) {
        goalLines.push("");
        goalLines.push("Goal " + (gi + 1) + " (" + g.domain + "):");
        goalLines.push(g.annualGoal);
        if (g.measurementCriterion) goalLines.push("Criterion: " + g.measurementCriterion);
        if (g.evaluationMethod) goalLines.push("Measurement: " + g.evaluationMethod);
        if (Array.isArray(g.shortTermObjectives) && g.shortTermObjectives.length > 0) {
          goalLines.push("Short-term objectives:");
          g.shortTermObjectives.forEach(function (sto, soi) {
            goalLines.push("  " + (soi + 1) + ". " + sto);
          });
        }
      });
      lines.push(goalLines.join("\n"));
    }

    return lines.join("\n\n");
  }

  // Top-level export that DA's summary screen calls. Writes the payload
  // to window.__alloDAExport for the Report Writer to pick up. Returns
  // the payload so callers can also toast / log it.
  function exportSessionToReportWriter(session, studentName) {
    if (!session) return null;
    var payload = {
      sessionId: session.id,
      studentNickname: session.studentNickname || studentName || "",
      domain: session.domain,
      difficulty: session.difficulty,
      mode: session.mode,
      isCustomBank: !!session.isCustomBank,
      pretestSum: sumItemResultScores((session.itemResults || []).filter(function (r) { return r.phase === "pretest"; })),
      posttestSum: sumItemResultScores((session.itemResults || []).filter(function (r) { return r.phase === "posttest"; })),
      maxScore: maxPossibleScore(session.sessionItemIds.length),
      modifiabilityIndex: typeof session.modifiabilityIndex === "number"
        ? session.modifiabilityIndex
        : computeModifiabilityIndex(
            sumItemResultScores((session.itemResults || []).filter(function (r) { return r.phase === "pretest"; })),
            sumItemResultScores((session.itemResults || []).filter(function (r) { return r.phase === "posttest"; })),
            session.sessionItemIds.length
          ),
      modifiabilityTier: session.modifiabilityTier || null,
      factChunks: buildDaFactChunks(session),
      prePopulatedSection: buildDaNarrativeSection(session, studentName),
      // Phase K — raw IEP goals (structured) for any host that wants to render them as their own block
      iepGoals: Array.isArray(session.iepGoals) ? session.iepGoals.slice() : [],
      // Phase Q — raw UDL accommodations (structured)
      accommodations: Array.isArray(session.accommodations) ? session.accommodations.slice() : [],
      // Phase S — family-facing plain-language summary (structured; NOT merged into the clinical narrative)
      familySummary: session.familySummary || null,
      // Phase T — teacher / case manager handoff (structured)
      teacherHandoff: session.teacherHandoff || null,
      // Phase X — progress monitoring plan (structured)
      progressMonitoring: session.progressMonitoring || null,
      // Phase V — pre-session intake / referral context (structured; survives in export)
      intake: session.intake || null,
      // Section name that Report Writer should slot this into
      targetSectionName: "Dynamic Assessment Results",
      exportedAt: new Date().toISOString()
    };
    if (typeof window !== "undefined") {
      window.__alloDAExport = payload;
      // Dispatch a custom event so a Report Writer that's already mounted
      // can react without polling.
      try {
        window.dispatchEvent(new CustomEvent("alloDAExportReady", { detail: { sessionId: payload.sessionId } }));
      } catch (e) { /* CustomEvent unsupported — Report Writer falls back to mount-time check */ }
    }
    return payload;
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 2.5 — Custom probe generation (Phase A-bis)
  // ═════════════════════════════════════════════════════════
  // Clinician specs a construct + grade + suspected bottleneck → Gemini
  // generates N items with full 4-level prompt ladders + transfer twins.
  // No host changes; the existing props.callGemini channel is used.
  //
  // Critical design: the prompt is heavily constrained because LLMs
  // tend to give the answer too early in the ladder. We enforce shape
  // strictly and validate every returned item before showing it to the
  // clinician. Items that fail validation are flagged so the clinician
  // can regenerate or fix manually rather than silently shipping bad
  // scaffolds.

  // ─── PII lint ───
  // Strips obvious name patterns + "student is" / "this kid" prefixes
  // before the construct-context goes to Gemini. Soft — defense in
  // depth, not a guarantee. The UI also warns the clinician explicitly.
  function stripPiiFromContext(text) {
    if (!text) return "";
    var s = String(text);
    // Strip lead-in patterns that often introduce a name
    s = s.replace(/\b(?:this|the)\s+(?:student|kid|child|learner|girl|boy|youth)\s+(?:named\s+)?[A-Z][a-z]+\b/gi, "The student");
    // Strip standalone capitalized names that look like first names
    // (single capitalized word, 2-15 chars, not at end of sentence or in a
    // word like "Math" or "English"). This is intentionally cautious.
    var commonWordsToKeep = ["math","reading","english","language","spanish","french","science","social","studies","monday","tuesday","wednesday","thursday","friday","saturday","sunday","january","february","march","april","may","june","july","august","september","october","november","december","tier","grade"];
    s = s.replace(/\b([A-Z][a-z]{1,14})\b/g, function (match, w) {
      if (commonWordsToKeep.indexOf(w.toLowerCase()) >= 0) return match;
      // Only strip if it appears mid-sentence (preceded by lowercase or space)
      return "[name]";
    });
    // Strip "Jamie struggles" patterns (name + verb)
    s = s.replace(/^\s*[A-Z][a-z]+\s+(?:has|is|was|does|did|gets|got|tries|tried|struggles|cannot|can't)\b/i, "The student $1");
    return s.trim().slice(0, 800);
  }

  // ─── Custom probe Gemini prompt ───
  // Built around DECISION constraints (which scaffold goes where) rather
  // than open-ended generation. Strict JSON shape; explicit anti-patterns.
  function buildCustomProbePrompt(form, outputLanguage, daResourceManifest) {
    var domain = String(form.domain || "math");
    var gradeBand = String(form.gradeBand || "4-5");
    var construct = String(form.construct || "").trim().slice(0, 240);
    var bottleneck = String(form.bottleneck || "").trim().slice(0, 160);
    var safeContext = stripPiiFromContext(form.context || "");
    var count = Math.max(1, Math.min(8, parseInt(form.itemCount, 10) || 3));
    // Phase Z+ — Format the existing DA resource inventory for inclusion in
    // the prompt so Gemini can reuse instead of regenerating duplicates.
    var manifestLines = [];
    if (Array.isArray(daResourceManifest) && daResourceManifest.length > 0) {
      manifestLines.push("");
      manifestLines.push("─── EXISTING INVENTORY (reuse these when they fit, don't regenerate dupes) ───");
      manifestLines.push("These resources were generated by previous DA probes in this session and are still in the resource pack. If a supplementaryResource you would emit MATCHES one of these (same kind + substantially overlapping content), emit { \"existingResourceId\": \"<id from below>\", \"anchorRung\": <1|2|3|4> } INSTEAD of a fresh entry. The host will skip generation and reuse the existing resource. Pick reuse aggressively — duplicates clutter the resource pack.");
      daResourceManifest.slice(0, 20).forEach(function (e) {
        if (!e || !e.id) return;
        var line = "  - " + e.id + " | " + (e.kind || "?") + " | \"" + String(e.title || "").slice(0, 60) + "\"";
        if (e.summary) line += " — " + String(e.summary).slice(0, 80);
        manifestLines.push(line);
      });
      manifestLines.push("");
    }

    return [
      "You are generating items for a Dynamic Assessment probe — a school-psychology methodology that measures a student's modifiability (how much they grow with structured scaffolding) rather than static ability.",
      buildLanguageDirective(outputLanguage),
      "PROBE SPEC:",
      "- Domain: " + domain,
      "- Grade band: " + gradeBand,
      "- Target construct: " + (construct || "(unspecified — pick a clinically-useful construct in this domain)"),
      "- Suspected bottleneck: " + (bottleneck || "(unspecified)"),
      "- Additional clinical context (PII-stripped): " + (safeContext || "(none)"),
      "- Number of items to generate: " + count,
      "",
      "Each item ships with a 4-level scaffold ladder. Generate STRICT JSON ARRAY (length=" + count + ") of items, each EXACTLY this shape:",
      "{",
      '  "prompt": "<5-30 word item question; appropriate vocabulary for grade band>",',
      '  "correctAnswer": "<canonical answer, short and unambiguous>",',
      '  "acceptableAnswers": ["<variant 1>", "<variant 2>", ...up to 4 variants],',
      '  "construct": "<short label, ≤30 chars, names the construct probed>",',
      '  "promptLadder": [',
      '    { "level": 1, "type": "cue",         "text": "<orient student toward what the question is asking; ≤25 words; declarative; NO leading question; NO answer>" },',
      '    { "level": 2, "type": "leading",     "text": "<interrogative scaffold; nudge toward operation or strategy; ≤30 words; NO answer>" },',
      '    { "level": 3, "type": "model",       "text": "<show a PARALLEL example solve in 1-2 sentences, then redirect student to apply to their item; ≤50 words; NO direct answer to THEIR item>" },',
      '    { "level": 4, "type": "directTeach", "text": "<give the canonical answer with brief reasoning; ≤40 words>" }',
      '  ],',
      '  "constructTags": ["<short tag>", "<short tag>", ...],',
      '  "transferTwin": {',
      '    "prompt": "<parallel item with DIFFERENT surface features but SAME construct>",',
      '    "correctAnswer": "<canonical>",',
      '    "acceptableAnswers": ["<variant 1>", "<variant 2>"]',
      '  },',
      '  "supplementaryResources": [',
      '    { "kind": "glossary", "title": "<short label, e.g. \\"Glossary: photosynthesis terms\\">", "seedTerms": ["<term 1>", "<term 2>", "<term 3>"], "anchorRung": <1|2|3|4> },',
      '    { "kind": "math-manipulative", "title": "<short label, e.g. \\"Number Line: 0-20\\">", "toolId": "numberline" | "fractions" | "areamodel", "preset": { /* tool-specific, see SUPPLEMENTARY RESOURCES section */ }, "anchorRung": <1|2|3|4> },',
      '    { "kind": "word-sounds-probe", "title": "<short label, e.g. \\"CVC Segmentation Probe\\">", "activity": "counting" | "segmentation" | "blending" | "isolation" | "manipulation" | "rhyming" | "syllable_blending" | "syllable_counting", "words": ["cat", "pan", "sit"], "anchorRung": <1|2|3|4> }',
      '  ]',
      "}",
      "",
      "HARD RULES:",
      "1. L1 must NOT contain the answer, must NOT lead toward a specific operation. It only orients (e.g., 'This question is asking what is left over.').",
      "2. L2 must NOT give the answer. It hints at the strategy/operation as a question (e.g., 'When you give something away, do you add or subtract?').",
      "3. L3 must show a PARALLEL example (different numbers/surface features) then redirect; it must NOT solve the actual item.",
      "4. L4 must contain the answer with one-line reasoning.",
      "5. Transfer twin must use the SAME construct but DIFFERENT surface features (different numbers, different setting, different names if any).",
      "6. Avoid culture-specific knowledge, brand names, and items with multiple valid answers.",
      "7. Use grade-appropriate vocabulary. No PII in any field.",
      "8. acceptableAnswers should include the canonical form plus reasonable variants (e.g., '7', 'seven', '7 apples').",
      "",
      "SUPPLEMENTARY RESOURCES (REQUIRED for most items — Phase Z):",
      "Every item gets a `supplementaryResources` array. The host auto-generates the resource (a glossary card, an interactive number line, etc.) and injects an inline clickable link into the named scaffold rung, alongside a one-line usage hint the host writes for the clinician.",
      "",
      "FIVE SUPPORTED KINDS:",
      "  1. kind=\"glossary\" — vocabulary preview card (one per item max)",
      "  2. kind=\"math-manipulative\" — interactive STEM Lab tool preset to specific state (one per item max)",
      "  3. kind=\"word-sounds-probe\" — Word Sounds Studio probe with target words + activity (one per item max). Use for reading-intervention items targeting phonological awareness.",
      "  4. kind=\"visual-organizer\" — a generated graphic organizer (concept map, mind map, outline, timeline, or concept sort) the student can see/fill while reasoning (one per item max).",
      "  5. kind=\"sentence-frames\" — fill-in sentence starters/frames that scaffold the student PRODUCING a response (one per item max). The ONLY support that scaffolds OUTPUT; the other four scaffold input.",
      "An item can have multiple supports of DIFFERENT kinds — e.g., a reading-intervention item might have a glossary AND a word-sounds-probe.",
      "",
      "─── GLOSSARY GUIDANCE ───",
      "DEFAULT: attach EXACTLY ONE glossary entry per item, unless the prompt + ladder genuinely have zero domain-specific vocabulary (rare — most academic items have at least one Tier-2 word worth previewing). When in doubt, attach a glossary.",
      "Examples that ALWAYS warrant a glossary:",
      "- Reading-comprehension or reading-intervention items (domain=reading) → glossary of the 2-3 Tier-2/3 words appearing in the prompt; anchorRung=1.",
      "- Language-domain items (domain=language) → glossary of the target vocabulary; anchorRung=1.",
      "- Math word problems → glossary of the operation/concept terms (e.g., 'numerator', 'remainder', 'product'); anchorRung=2.",
      "Glossary fields:",
      "  - seedTerms: 2-4 words actually appearing in the prompt OR the L3 model. Lowercase, no punctuation, no proper nouns.",
      "  - anchorRung: 1 (preview before the student attempts) or 2 (leading question shares the terms). Default 1.",
      "  - title: concise label like 'Glossary: photosynthesis terms'.",
      "",
      "─── MATH-MANIPULATIVE GUIDANCE ───",
      "DEFAULT for domain=math: attach EXACTLY ONE math-manipulative whose tool fits the construct. The manipulative is an interactive STEM Lab tool preset to relevant state, so the clinician can demonstrate or have the student manipulate during scaffolding.",
      "Tool selection (toolId):",
      "  - \"numberline\" — for whole-number arithmetic, counting, comparison, skip counting, integer ordering. Preset: { range: {min, max}, markers: [{value, color, label}], tab: 'explore'|'skipCount'|'fracDec' }",
      "      Example for 'what is 17 - 8?': { range: {min: 0, max: 20}, markers: [{value: 17, color: '#3b82f6', label: 'start'}, {value: 8, color: '#ef4444', label: 'subtract'}], tab: 'explore' }",
      "  - \"fractions\" — for fractional reasoning, part-whole, equivalents, comparison. Preset: { numerator: int, denominator: int, tab?: 'practice'|'compare'|'wall' }",
      "      Example for 'is 3/4 greater than 5/8?': { numerator: 3, denominator: 4, tab: 'compare' }",
      "  - \"areamodel\" — for multiplication, area, array reasoning, distributive property. Preset: { rows: int, cols: int, highlight?: {row, col} }",
      "      Example for '4 × 7': { rows: 4, cols: 7 }",
      "Anchor rung guidance for manipulatives:",
      "  - L1: orient the student to the tool layout. Use when seeing the tool removes ambiguity (e.g., 'this is a number line from 0 to 20').",
      "  - L2: invite the student to point/move/predict on the tool. Most natural anchor for leading-question support.",
      "  - L3 (most common for manipulatives): model the strategy on the tool. Use when the example solve needs visual mediation.",
      "  - L4: show the answer concretely on the tool while explaining.",
      "Bounds (the host will reject preset values outside these):",
      "  - numberline: range min/max integers in [-1000, 1000]; max-min ≤ 200; markers ≤ 6 entries.",
      "  - fractions: numerator ∈ [0, 24], denominator ∈ [2, 24].",
      "  - areamodel: rows ∈ [1, 20], cols ∈ [1, 20].",
      "Manipulative fields:",
      "  - toolId: ONE of \"numberline\", \"fractions\", \"areamodel\" — do not invent other tool names.",
      "  - preset: an object matching the chosen tool's shape above. Keep it minimal and tied to THIS specific item.",
      "  - anchorRung: 1-4. Default 3 for manipulatives unless the item makes another rung obviously better.",
      "  - title: concise label like 'Number Line: 0-20' or 'Fraction Bar: 3/4 vs 5/8'.",
      "",
      "─── WORD-SOUNDS-PROBE GUIDANCE ───",
      "USE WHEN: the construct involves phonological awareness — segmenting, blending, counting phonemes, isolating sounds, manipulating sounds, rhyming, syllable work. Most commonly attached to early-reading or reading-intervention items (domain=reading, gradeBand=K-1 or 1-2 typically).",
      "Activity selection (activity):",
      "  - \"counting\" — count phonemes in a word (e.g., 'cat' has 3 sounds)",
      "  - \"segmentation\" — break a word into individual phonemes (/c/-/a/-/t/)",
      "  - \"blending\" — combine phonemes into a word (/c/-/a/-/t/ → 'cat')",
      "  - \"isolation\" — identify a target phoneme position (initial / medial / final)",
      "  - \"manipulation\" — substitute or delete a phoneme to make a new word",
      "  - \"rhyming\" — recognize/produce rhyme pairs",
      "  - \"syllable_blending\" — combine syllables into a word",
      "  - \"syllable_counting\" — count syllables in a word",
      "Word list (words):",
      "  - 3-12 short target words. Lowercase, alphabetic only, no punctuation. Pick words that match the activity (e.g., CVC for early segmentation, CVCC/CCVC for advanced).",
      "  - Match phoneme complexity to gradeBand: K → CVC (cat, sun); 1 → CVC + CCVC (clap, stop); 2+ → CVCC, CCVCC (clamp, splash).",
      "Anchor rung guidance for word-sounds probes:",
      "  - L1: warm up phonological awareness before the item.",
      "  - L2: invite the student to try the activity on the leading-question word.",
      "  - L3: model the phoneme work on a parallel word.",
      "  - L4: do the activity together on the target word as you give the answer.",
      "  Default: 1 (warm-up before attempt).",
      "Word-sounds-probe fields:",
      "  - activity: one of the 8 strings above. Do not invent activities.",
      "  - words: 3-12 short words (lowercase, alphabetic, no punctuation).",
      "  - anchorRung: 1-4. Default 1.",
      "  - title: concise label like 'CVC Segmentation Probe' or 'Initial-Sound Isolation'.",
      "",
      "─── VISUAL-ORGANIZER GUIDANCE ───",
      "USE WHEN: the construct involves RELATIONSHIPS, STRUCTURE, or SEQUENCE that a graphic would make concrete — comparing/contrasting, categorizing, showing cause/effect, mapping how ideas connect, or ordering events. Especially valuable for reading-comprehension, science, and social-studies items where the answer depends on seeing how parts relate.",
      "toolType selection (pick the ONE that fits the cognitive demand):",
      "  - \"concept-map\" — interconnections radiating from a central idea (how concepts link to a hub). Best for 'how does X relate to Y and Z' items.",
      "  - \"mind-map\" — hierarchical branching from one topic into sub-branches. Best for brainstorming/organizing a topic's parts.",
      "  - \"outline\" — ordered hierarchical structure (main ideas + supporting details). Best for 'identify main idea and details' items.",
      "  - \"timeline\" — chronological sequence of events. Best for ordering, cause-and-effect-over-time, or historical-sequence items.",
      "  - \"concept-sort\" — categorize items into groups. Best for classification / 'which group does this belong to' items.",
      "directive field: a clear instruction describing WHAT to visualize, written as source content the generator will turn into the organizer (e.g., 'Compare photosynthesis and cellular respiration: their inputs, outputs, and where each happens in the cell.'). 1–3 sentences. Anchor it to the item's actual content. REQUIRED, min 8 chars.",
      "Anchor rung guidance for visual organizers:",
      "  - L1: show the organizer's structure so the student orients before attempting.",
      "  - L2: have the student add to / trace the organizer as they answer the leading question.",
      "  - L3 (most common): model your reasoning by filling the organizer step-by-step.",
      "  - L4: lay out the full answer visually on the organizer while explaining.",
      "  Default: 3 (model rung).",
      "Visual-organizer fields:",
      "  - toolType: ONE of \"concept-map\", \"mind-map\", \"outline\", \"timeline\", \"concept-sort\". Do not invent others.",
      "  - directive: 1–3 sentences of source content to visualize (see above).",
      "  - anchorRung: 1-4. Default 3.",
      "  - title: concise label like 'Concept Map: Water Cycle' or 'Timeline: Steps of Mitosis'.",
      "",
      "─── SENTENCE-FRAMES GUIDANCE ───",
      "USE WHEN: the bottleneck is EXPRESSION / OUTPUT, not understanding — the student may grasp the idea but struggle to PRODUCE a response. Classic signs: one-word answers, 'I don't know' when they likely do, difficulty starting, disorganized verbal/written output. Especially valuable for the LANGUAGE domain (oral narrative, explanation) and for any item asking the student to JUSTIFY, EXPLAIN, COMPARE, or SUMMARIZE in their own words. This is the only support that scaffolds the student's response itself.",
      "directive field: describe the expressive task to scaffold + the kind of frame that fits, as source content the generator turns into fill-in frames (e.g., 'Frames to help the student explain why a character felt a certain way, citing evidence: I think ___ felt ___ because ___.'). 1–3 sentences. Anchor it to the item's actual response demand. REQUIRED, min 8 chars.",
      "Anchor rung guidance for sentence frames:",
      "  - L1: offer frames up front so the student has language to begin.",
      "  - L2 (most common): invite the student to answer the leading question using a frame.",
      "  - L3: model completing one frame aloud, then have the student do the next.",
      "  - L4: complete a frame together while giving the answer, then have them restate it.",
      "  Default: 2 (invite production).",
      "Sentence-frames fields:",
      "  - directive: 1–3 sentences describing the response demand + frame style (see above).",
      "  - anchorRung: 1-4. Default 2.",
      "  - title: concise label like 'Frames: Explain a Character's Feelings' or 'Frames: Justify a Math Step'.",
      "",
      "─── GENERAL RULES ───",
      "- AT MOST 1 entry PER KIND per item. So max 5 supports per item (one each: glossary + manipulative + word-sounds-probe + visual-organizer + sentence-frames).",
      "- Do not invent new kinds. The five above are the only ones supported.",
      "- If the item truly needs no support, omit the field or send an empty array. Do not pad.",
      "- REUSE existing resources where possible. If an item's needs match an EXISTING INVENTORY entry below, emit { \"existingResourceId\": \"<id>\", \"anchorRung\": <1|2|3|4> } instead of generating a new entry. The host will skip regeneration and link to the existing resource.",
    ]
      .concat(manifestLines)
      .concat([
        "Output STRICT JSON ARRAY only. No markdown fences. No commentary. No leading/trailing text."
      ]).join("\n");
  }

  // ─── Parse + validate Gemini response ───
  function parseCustomProbeResponse(raw) {
    if (!raw) return null;
    var cleaned = String(raw).trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    var parsed = null;
    try { parsed = JSON.parse(cleaned); } catch (e) { return null; }
    if (!Array.isArray(parsed)) return null;
    return parsed;
  }

  // Validate one item, return { ok, errors: [...], item: cleaned-or-null }.
  // Errors are returned per-item so the clinician sees what's wrong rather
  // than getting a silent "Gemini failed".
  function validateGeneratedItem(raw, idx) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["item " + idx + " is not an object"], item: null };
    }
    var prompt = String(raw.prompt || "").trim();
    var correctAnswer = String(raw.correctAnswer || "").trim();
    var acceptable = Array.isArray(raw.acceptableAnswers)
      ? raw.acceptableAnswers.map(function (a) { return String(a || "").trim(); }).filter(function (a) { return a.length > 0; })
      : [];
    var construct = String(raw.construct || "").trim().slice(0, 60) || "custom probe";
    if (!prompt) errors.push("missing prompt");
    if (!correctAnswer) errors.push("missing correctAnswer");
    // Validate ladder
    var ladder = Array.isArray(raw.promptLadder) ? raw.promptLadder : [];
    var cleanedLadder = [];
    var expectedTypes = ["cue", "leading", "model", "directTeach"];
    for (var L = 1; L <= 4; L++) {
      var step = ladder.filter(function (s) { return s && s.level === L; })[0];
      if (!step) {
        errors.push("missing ladder level " + L);
        cleanedLadder.push({ level: L, type: expectedTypes[L - 1], text: "(missing — regenerate or edit)" });
        continue;
      }
      var text = String(step.text || "").trim();
      var type = expectedTypes[L - 1]; // Force canonical types
      if (!text) errors.push("L" + L + " text is empty");
      cleanedLadder.push({ level: L, type: type, text: text || "(missing)" });
    }
    // Sanity: L1 should not contain the canonical answer verbatim
    if (correctAnswer && cleanedLadder[0] && cleanedLadder[0].text &&
        cleanedLadder[0].text.toLowerCase().indexOf(correctAnswer.toLowerCase()) >= 0 &&
        correctAnswer.length >= 2) {
      errors.push("L1 may leak the answer");
    }
    // Transfer twin (optional but encouraged)
    var twin = null;
    if (raw.transferTwin && typeof raw.transferTwin === "object") {
      var twinPrompt = String(raw.transferTwin.prompt || "").trim();
      var twinAns = String(raw.transferTwin.correctAnswer || "").trim();
      if (twinPrompt && twinAns) {
        twin = {
          prompt: twinPrompt,
          correctAnswer: twinAns,
          acceptableAnswers: Array.isArray(raw.transferTwin.acceptableAnswers)
            ? raw.transferTwin.acceptableAnswers.map(function (a) { return String(a || "").trim(); }).filter(function (a) { return a.length > 0; })
            : []
        };
      }
    }
    // Phase Z — Supplementary resources (optional). Validated but NOT
    // generated here — generation happens in the post-validation orchestrator
    // (generateDaSupports) so a bad/missing prop on the host doesn't crash
    // the whole item-validation pass.
    var suppResources = [];
    if (Array.isArray(raw.supplementaryResources)) {
      var hasGlossary = false;
      var hasManipulative = false;
      var hasWordSoundsProbe = false;
      var hasVisualOrganizer = false;
      var hasSentenceFrames = false;
      raw.supplementaryResources.forEach(function (sr) {
        if (!sr || typeof sr !== "object") return;
        var kind = String(sr.kind || "").trim().toLowerCase();
        var anchorRung = parseInt(sr.anchorRung, 10);
        if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = (kind === "math-manipulative" ? 3 : 1);

        // Phase Z+ — REUSE path. If Gemini referenced an existing resource by
        // id, store the pointer; the orchestrator will skip generation and
        // just emit the link token. We can't validate the id against the
        // manifest here (the manifest lives one scope up); the orchestrator
        // checks it before injecting the link, so a stale id degrades to a
        // status=failed entry rather than a crash.
        var existingId = (typeof sr.existingResourceId === "string" && sr.existingResourceId.length > 0)
          ? String(sr.existingResourceId).trim().slice(0, 64)
          : null;
        if (existingId) {
          suppResources.push({
            kind: "reuse",
            existingResourceId: existingId,
            anchorRung: anchorRung,
            status: "suggested",
            title: String(sr.title || "Reused resource").slice(0, 80),
            resourceId: null
          });
          return;
        }

        if (kind === "glossary") {
          if (hasGlossary) return; // one glossary per item max
          var seedTerms = Array.isArray(sr.seedTerms)
            ? sr.seedTerms.map(function (s) { return String(s || "").trim().toLowerCase().replace(/[^\w\s-]/g, ""); })
                .filter(function (s) { return s.length > 1 && s.length <= 40; })
                .slice(0, 6)
            : [];
          if (seedTerms.length === 0) return;
          var gTitle = String(sr.title || "").trim().slice(0, 80) || ("Glossary: " + seedTerms.slice(0, 2).join(", "));
          suppResources.push({
            kind: "glossary",
            title: gTitle,
            seedTerms: seedTerms,
            anchorRung: anchorRung,
            status: "suggested",
            resourceId: null
          });
          hasGlossary = true;
          return;
        }

        if (kind === "math-manipulative") {
          if (hasManipulative) return; // one manipulative per item max
          var toolId = String(sr.toolId || "").trim().toLowerCase();
          var ALLOWED_TOOLS = { numberline: 1, fractions: 1, areamodel: 1 };
          if (!ALLOWED_TOOLS[toolId]) return; // unknown tool → drop silently (the model invented one)
          var rawPreset = (sr.preset && typeof sr.preset === "object") ? sr.preset : {};
          var preset = sanitizeManipulativePreset(toolId, rawPreset);
          if (!preset) return; // sanitizer rejected it (bounds violated, structure unsalvageable)
          var mTitle = String(sr.title || "").trim().slice(0, 80) || defaultManipulativeTitle(toolId, preset);
          suppResources.push({
            kind: "math-manipulative",
            toolId: toolId,
            title: mTitle,
            preset: preset,
            anchorRung: anchorRung,
            status: "suggested",
            resourceId: null
          });
          hasManipulative = true;
          return;
        }

        if (kind === "word-sounds-probe") {
          if (hasWordSoundsProbe) return; // one probe per item max
          var activity = String(sr.activity || "").trim().toLowerCase();
          var ALLOWED_ACTIVITIES = { counting: 1, segmentation: 1, blending: 1, isolation: 1, manipulation: 1, rhyming: 1, syllable_blending: 1, syllable_counting: 1 };
          if (!ALLOWED_ACTIVITIES[activity]) return; // unknown activity → drop silently
          var words = Array.isArray(sr.words)
            ? sr.words.map(function (w) { return String(w || "").trim().toLowerCase().replace(/[^a-z]/g, ""); })
                .filter(function (w) { return w.length >= 2 && w.length <= 14; })
                .slice(0, 12)
            : [];
          if (words.length < 3) return; // need at least 3 words for a probe
          var wTitle = String(sr.title || "").trim().slice(0, 80) || defaultWordSoundsProbeTitle(activity, words);
          suppResources.push({
            kind: "word-sounds-probe",
            activity: activity,
            words: words,
            title: wTitle,
            anchorRung: anchorRung,
            status: "suggested",
            resourceId: null
          });
          hasWordSoundsProbe = true;
          return;
        }

        if (kind === "visual-organizer") {
          if (hasVisualOrganizer) return; // one organizer per item max
          // toolType picks WHICH organizer; the host maps these to the shared
          // resource-generation pipeline (handleGenerate) — no DA-specific
          // render code. Reuses the same Lesson-DNA-aware generators the main
          // app uses, so a DA organizer aligns to the active lesson's thread.
          var toolType = String(sr.toolType || "").trim().toLowerCase();
          var ALLOWED_ORGANIZERS = { "outline": 1, "concept-map": 1, "mind-map": 1, "timeline": 1, "concept-sort": 1 };
          if (!ALLOWED_ORGANIZERS[toolType]) return; // unknown organizer → drop silently (model invented one)
          // directive = what to visualize. Becomes the source text the host
          // feeds the generator. Required and non-trivial.
          var directive = String(sr.directive || sr.prompt || sr.seedPrompt || "").trim();
          if (directive.length < 8) return; // too thin to generate a meaningful organizer
          directive = directive.slice(0, 600);
          var voTitle = String(sr.title || "").trim().slice(0, 80) || defaultVisualOrganizerTitle(toolType, directive);
          // Default anchor rung 3 (model rung) — organizers are most useful when
          // the clinician walks the student through the visualization while modeling.
          if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = 3;
          suppResources.push({
            kind: "visual-organizer",
            toolType: toolType,
            directive: directive,
            title: voTitle,
            anchorRung: anchorRung,
            status: "suggested",
            resourceId: null
          });
          hasVisualOrganizer = true;
          return;
        }

        if (kind === "sentence-frames") {
          if (hasSentenceFrames) return; // one per item max
          // EXPRESSIVE / OUTPUT scaffold — the only support kind that helps the
          // student PRODUCE a response (the other four scaffold input). Frames
          // the student fills in ("First ___, then ___ because ___"). Routed
          // through the shared sentence-frames generator (isolatedContext), so
          // it stays internal to the DA item. directive = the expressive task
          // to scaffold; becomes the source the generator builds frames from.
          var sfDirective = String(sr.directive || sr.prompt || sr.seedPrompt || "").trim();
          if (sfDirective.length < 8) return; // too thin to scaffold
          sfDirective = sfDirective.slice(0, 600);
          var sfHint = sfDirective.split(/[.:;\n]/)[0].trim().slice(0, 40);
          var sfTitle = String(sr.title || "").trim().slice(0, 80) || ("Sentence Frames: " + (sfHint || "response"));
          // Default anchor rung 2 — frames are most useful as the student is
          // invited to produce a response (leading-question rung).
          if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = 2;
          suppResources.push({
            kind: "sentence-frames",
            directive: sfDirective,
            title: sfTitle,
            anchorRung: anchorRung,
            status: "suggested",
            resourceId: null
          });
          hasSentenceFrames = true;
          return;
        }
        // Unknown kind → ignore (don't crash, don't pad)
      });
      // Safety cap: max 5 resources per item (1 of each kind: glossary +
      // manipulative + word-sounds-probe + visual-organizer + sentence-frames)
      if (suppResources.length > 5) suppResources = suppResources.slice(0, 5);
    }

    var item = {
      id: "custom-" + Date.now() + "-" + idx + "-" + Math.floor(Math.random() * 10000),
      domain: "custom",
      difficulty: "custom",
      gradeBand: "custom",
      construct: construct,
      prompt: prompt || "(missing — regenerate)",
      correctAnswer: correctAnswer || "(missing)",
      acceptableAnswers: acceptable,
      promptLadder: cleanedLadder,
      constructTags: Array.isArray(raw.constructTags) ? raw.constructTags.slice(0, 6) : [],
      transferTwin: twin,
      supplementaryResources: suppResources,
      _generationWarnings: errors.slice()
    };
    return { ok: errors.length === 0, errors: errors, item: item };
  }

  // ═════════════════════════════════════════════════════════
  // Phase Z — Supplementary resource generation (reversed Lesson-Plan link pattern)
  // ─────────────────────────────────────────────────────────
  // After items are validated + (optionally) refined, walk each item's
  // supplementaryResources[] list. For each entry, ask the host to mint
  // a real resource in its history (a glossary card, etc.). On success:
  //   - mark the entry status=generated, populate resourceId
  //   - inject an inline `[title](resource:id)` token into the anchor rung
  // On failure: status=failed; the review screen surfaces a Retry button.
  //
  // The host injects two callbacks via props:
  //   - onGenerateGlossary(seedTerms[], title): Promise<{ id }>
  //   - onOpenResource(resourceId): void   (used by the click handler)
  // If onGenerateGlossary isn't wired, this is a no-op (items render as
  // before, just without the inline links).
  // ═════════════════════════════════════════════════════════

  // Phase 2 — Sanitize a math-manipulative preset coming from Gemini.
  // Returns the cleaned preset object, or null if the input is unsalvageable.
  // The bounds here MUST match the limits documented to Gemini in
  // buildCustomProbePrompt — if you relax/tighten them, update both.
  function sanitizeManipulativePreset(toolId, raw) {
    if (!raw || typeof raw !== "object") return null;
    if (toolId === "numberline") {
      var r = raw.range && typeof raw.range === "object" ? raw.range : {};
      var minN = parseInt(r.min, 10);
      var maxN = parseInt(r.max, 10);
      if (!isFinite(minN) || !isFinite(maxN)) { minN = 0; maxN = 20; }
      if (minN < -1000) minN = -1000;
      if (maxN > 1000) maxN = 1000;
      if (maxN <= minN) maxN = minN + 10;
      if ((maxN - minN) > 200) maxN = minN + 200;
      var markers = Array.isArray(raw.markers) ? raw.markers.slice(0, 6).map(function (m) {
        if (!m || typeof m !== "object") return null;
        var v = parseFloat(m.value);
        if (!isFinite(v)) return null;
        var color = typeof m.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(m.color) ? m.color : "#ef4444";
        var label = typeof m.label === "string" ? String(m.label).slice(0, 24) : "";
        return { value: v, color: color, label: label };
      }).filter(Boolean) : [];
      var tab = raw.tab;
      var ALLOWED_TABS = { explore: 1, skipCount: 1, fracDec: 1 };
      if (typeof tab !== "string" || !ALLOWED_TABS[tab]) tab = "explore";
      return { range: { min: minN, max: maxN }, markers: markers, tab: tab };
    }
    if (toolId === "fractions") {
      var num = parseInt(raw.numerator, 10);
      var den = parseInt(raw.denominator, 10);
      if (!isFinite(num)) num = 1;
      if (!isFinite(den)) den = 2;
      if (num < 0) num = 0;
      if (num > 24) num = 24;
      if (den < 2) den = 2;
      if (den > 24) den = 24;
      var fTab = raw.tab;
      var F_TABS = { practice: 1, compare: 1, wall: 1, operations: 1, equivalents: 1, converter: 1 };
      if (typeof fTab !== "string" || !F_TABS[fTab]) fTab = "practice";
      return { numerator: num, denominator: den, tab: fTab };
    }
    if (toolId === "areamodel") {
      var rows = parseInt(raw.rows, 10);
      var cols = parseInt(raw.cols, 10);
      if (!isFinite(rows)) rows = 3;
      if (!isFinite(cols)) cols = 4;
      if (rows < 1) rows = 1; if (rows > 20) rows = 20;
      if (cols < 1) cols = 1; if (cols > 20) cols = 20;
      var hl = (raw.highlight && typeof raw.highlight === "object")
        ? { row: Math.max(0, Math.min(rows - 1, parseInt(raw.highlight.row, 10) || 0)),
            col: Math.max(0, Math.min(cols - 1, parseInt(raw.highlight.col, 10) || 0)) }
        : null;
      var out = { rows: rows, cols: cols };
      if (hl) out.highlight = hl;
      return out;
    }
    return null;
  }

  // Phase 3 — Fallback title for a word-sounds probe.
  function defaultWordSoundsProbeTitle(activity, words) {
    var pretty = String(activity || "").replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return pretty + " Probe (" + (words ? words.length : 0) + " words)";
  }

  // Fallback title for a manipulative when Gemini didn't supply one.
  function defaultManipulativeTitle(toolId, preset) {
    if (toolId === "numberline") {
      var r = preset && preset.range;
      return "Number Line: " + (r ? r.min + "–" + r.max : "0–20");
    }
    if (toolId === "fractions") {
      return "Fraction Bar: " + (preset ? preset.numerator + "/" + preset.denominator : "1/2");
    }
    if (toolId === "areamodel") {
      return "Area Model: " + (preset ? preset.rows + " × " + preset.cols : "3 × 4");
    }
    return "Manipulative";
  }

  // Fallback title for a visual organizer when Gemini didn't supply one.
  function defaultVisualOrganizerTitle(toolType, directive) {
    var labels = {
      "outline": "Outline",
      "concept-map": "Concept Map",
      "mind-map": "Mind Map",
      "timeline": "Timeline",
      "concept-sort": "Concept Sort"
    };
    var base = labels[toolType] || "Visual Organizer";
    var hint = String(directive || "").split(/[.:;\n]/)[0].trim().slice(0, 40);
    return hint ? (base + ": " + hint) : base;
  }

  // Markdown-link-token format reused from Lesson Plan: [title](resource:id)
  function makeResourceLinkToken(title, resourceId) {
    var safeTitle = String(title || "Resource").replace(/[\[\]\(\)]/g, "").slice(0, 80);
    return "[" + safeTitle + "](resource:" + String(resourceId) + ")";
  }

  // Usage-guidance string for the clinician — varies by rung level AND
  // resource kind so it reads as a natural instruction at the moment of
  // escalation. Plain text (the link token is appended after this string).
  function usageHintForAnchorRung(level, kind) {
    if (kind === "math-manipulative") {
      if (level === 1) return "🧮 Show this manipulative so the student can orient before answering:";
      if (level === 2) return "🧮 Have the student point or move on this tool as they answer the leading question:";
      if (level === 3) return "🧮 Model the strategy step-by-step using this tool:";
      if (level === 4) return "🧮 Use this tool to show the canonical answer concretely:";
      return "🧮 Use this tool with the student:";
    }
    if (kind === "word-sounds-probe") {
      if (level === 1) return "🔤 Warm up phonological awareness first — run the probe with the student:";
      if (level === 2) return "🔤 Try the activity on the leading-question word together:";
      if (level === 3) return "🔤 Model the phoneme work on a parallel word from this probe:";
      if (level === 4) return "🔤 Do the activity together on the target word as you give the answer:";
      return "🔤 Use this phonics probe with the student:";
    }
    if (kind === "glossary") {
      if (level === 1) return "💡 Before asking, pre-teach these terms with the student:";
      if (level === 2) return "💡 As you ask the leading question, point to these terms together:";
      if (level === 3) return "💡 Use these terms in the model alongside the example:";
      if (level === 4) return "💡 Reinforce these terms as you give the direct answer:";
      return "💡 Use this resource with the student:";
    }
    if (kind === "visual-organizer") {
      if (level === 1) return "🗺️ Show this organizer so the student can see the structure before answering:";
      if (level === 2) return "🗺️ Have the student add to or trace this organizer as they answer the leading question:";
      if (level === 3) return "🗺️ Model your thinking by filling in this organizer step-by-step:";
      if (level === 4) return "🗺️ Use this organizer to lay out the full answer visually as you explain:";
      return "🗺️ Use this organizer with the student:";
    }
    if (kind === "sentence-frames") {
      if (level === 1) return "✍️ Offer these frames up front so the student has language to start their response:";
      if (level === 2) return "✍️ Invite the student to answer the leading question using one of these frames:";
      if (level === 3) return "✍️ Model completing a frame aloud, then have the student try the next one:";
      if (level === 4) return "✍️ Fill in a frame together as you give the answer, then have them restate it:";
      return "✍️ Use these sentence frames with the student:";
    }
    return "💡 Use this resource with the student:";
  }

  // Phase Z++ — Strip the inline link token (and its preceding usage hint
  // line) for the given resourceId from whichever rung contains it. Returns
  // the patched item. No-op if the token isn't found on any rung.
  // Pattern matched:  "<existing>\n\n💡 Usage hint line: [Title](resource:<id>)"
  function removeLinkTokenFromRung(item, resourceId) {
    if (!resourceId) return item;
    var ladder = (item.promptLadder || []).slice();
    var changed = false;
    for (var li = 0; li < ladder.length; li++) {
      var step = ladder[li];
      if (!step || typeof step.text !== "string") continue;
      var marker = "](resource:" + resourceId + ")";
      var hit = step.text.indexOf(marker);
      if (hit < 0) continue;
      // Walk back to the start of the `[` that opens this link.
      var bracketStart = step.text.lastIndexOf("[", hit);
      if (bracketStart < 0) continue;
      // Walk back further to strip the usage-hint line (everything from the
      // preceding blank line / start of text up to the link end). This keeps
      // the rung clean — no orphan emoji on its own line.
      var hintStart = step.text.lastIndexOf("\n\n", bracketStart);
      if (hintStart < 0) {
        // Link was the only content; nuke whole text up through link.
        hintStart = 0;
      }
      var linkEnd = hit + marker.length;
      var cleaned = step.text.slice(0, hintStart) + step.text.slice(linkEnd);
      // Strip any trailing whitespace/newlines we may have left behind.
      cleaned = cleaned.replace(/[\s\n]+$/g, "");
      ladder[li] = Object.assign({}, step, { text: cleaned });
      changed = true;
      break;
    }
    return changed ? Object.assign({}, item, { promptLadder: ladder }) : item;
  }

  // Move a resource's inline link from its current rung to a new one. Strips
  // from the old rung then re-appends to the new (with the right usage hint).
  function moveResourceAnchor(item, resourceId, newRung, kind, title) {
    if (!resourceId || !(newRung >= 1 && newRung <= 4)) return item;
    var stripped = removeLinkTokenFromRung(item, resourceId);
    var token = makeResourceLinkToken(title || "Resource", resourceId);
    return appendLinkTokenToRung(stripped, newRung, token, resourceId, kind);
  }

  // Detach a resource from an item: remove it from the supplementaryResources
  // array AND strip its link from whichever rung holds it. The history entry
  // itself is NOT touched — the resource lives on in the pack, just unlinked
  // from this DA item.
  function detachResourceFromItem(item, resourceId) {
    if (!resourceId) return item;
    var stripped = removeLinkTokenFromRung(item, resourceId);
    var supps = (stripped.supplementaryResources || []).filter(function (sr) {
      return !(sr && sr.resourceId === resourceId);
    });
    return Object.assign({}, stripped, { supplementaryResources: supps });
  }

  // Inject a resource link token + a usage hint at the end of a ladder rung's
  // text so the clinician sees BOTH the link AND a one-line instruction on
  // how to use it at that rung. Idempotent: if the same resource:id is already
  // linked from this rung, skip (e.g., re-running after partial failure).
  function appendLinkTokenToRung(item, anchorRung, token, resourceId, kind) {
    var ladder = (item.promptLadder || []).slice();
    var idx = ladder.findIndex(function (s) { return s && s.level === anchorRung; });
    if (idx < 0) return item;
    var step = ladder[idx];
    var existing = String(step.text || "");
    if (resourceId && existing.indexOf("resource:" + resourceId) >= 0) return item;
    var hint = usageHintForAnchorRung(anchorRung, kind || "glossary");
    var sep = existing.length > 0 && existing.charAt(existing.length - 1) !== "\n" ? "\n\n" : "";
    var joined = existing + sep + (hint ? hint + " " : "") + token;
    ladder[idx] = Object.assign({}, step, { text: joined });
    return Object.assign({}, item, { promptLadder: ladder });
  }

  // Given a fully validated item + host glossary callback, walk
  // supplementaryResources[] and generate each. Returns a Promise<item>
  // that resolves to the updated item (with link tokens injected).
  // Never throws — failures are captured in status='failed'.
  function generateDaSupportsForItem(item, idx, hostCallbacks) {
    var onGenerateGlossary = hostCallbacks && hostCallbacks.onGenerateGlossary;
    var onGenerateManipulative = hostCallbacks && hostCallbacks.onGenerateManipulative;
    var onGenerateWordSoundsProbe = hostCallbacks && hostCallbacks.onGenerateWordSoundsProbe;
    var onGenerateVisualOrganizer = hostCallbacks && hostCallbacks.onGenerateVisualOrganizer;
    var onGenerateSentenceFrames = hostCallbacks && hostCallbacks.onGenerateSentenceFrames;
    var supps = Array.isArray(item.supplementaryResources) ? item.supplementaryResources : [];
    if (supps.length === 0) return Promise.resolve(item);
    // If NO generator callback wired AND no reuse entries present, no-op.
    var anyReuseHere = supps.some(function (sr) { return sr && sr.kind === "reuse" && sr.existingResourceId; });
    if (typeof onGenerateGlossary !== "function"
        && typeof onGenerateManipulative !== "function"
        && typeof onGenerateWordSoundsProbe !== "function"
        && typeof onGenerateVisualOrganizer !== "function"
        && typeof onGenerateSentenceFrames !== "function"
        && !anyReuseHere) {
      return Promise.resolve(item);
    }
    var working = item;
    // Sequential so we don't fire N parallel callImagen runs; matches Phase Y
    // refinement timing model (one wait, no quota spikes).
    return supps.reduce(function (chain, sr, si) {
      return chain.then(function (currentItem) {
        if (!sr || sr.status === "generated") return currentItem;
        // Mark generating so progress UI can surface state.
        var snapshot = currentItem.supplementaryResources.slice();
        snapshot[si] = Object.assign({}, sr, { status: "generating" });
        currentItem = Object.assign({}, currentItem, { supplementaryResources: snapshot });
        // Phase Z+ REUSE path. No host roundtrip — just look up the title
        // from the manifest (so the link chip reads correctly) and inject the
        // token. If the id doesn't match any manifest entry, fail soft.
        if (sr.kind === "reuse" && sr.existingResourceId) {
          var manifest = Array.isArray(hostCallbacks && hostCallbacks.daResourceManifest) ? hostCallbacks.daResourceManifest : [];
          var hit = manifest.find(function (m) { return m && m.id === sr.existingResourceId; });
          if (!hit) {
            var failSupps = currentItem.supplementaryResources.slice();
            failSupps[si] = Object.assign({}, sr, { status: "failed", _failureMessage: "Reused resource id not found in current inventory" });
            return Object.assign({}, currentItem, { supplementaryResources: failSupps });
          }
          var reuseTitle = hit.title || sr.title || "Reused resource";
          var rToken = makeResourceLinkToken(reuseTitle, hit.id);
          var rSupps = currentItem.supplementaryResources.slice();
          rSupps[si] = Object.assign({}, sr, { kind: "reuse", title: reuseTitle, status: "generated", resourceId: hit.id, _reusedKind: hit.kind });
          var rWith = Object.assign({}, currentItem, { supplementaryResources: rSupps });
          // Pass through the inferred kind so the rung's usage hint matches what
          // kind of resource it actually is (glossary vs manipulative vs probe).
          return Promise.resolve(appendLinkTokenToRung(rWith, sr.anchorRung, rToken, hit.id, hit.kind));
        }

        // Glossary kind (Phase 1)
        if (sr.kind === "glossary") {
          if (typeof onGenerateGlossary !== "function") return currentItem; // host hasn't wired glossary cb
          var gProv = { fromDA: true, daItemIndex: idx, daItemPrompt: String(currentItem.prompt || "").slice(0, 80) };
          return onGenerateGlossary(sr.seedTerms, sr.title, gProv)
            .then(function (res) {
              if (!res || !res.id) throw new Error("Glossary callback returned no id.");
              var token = makeResourceLinkToken(sr.title, res.id);
              var nextSupps = currentItem.supplementaryResources.slice();
              nextSupps[si] = Object.assign({}, sr, { status: "generated", resourceId: res.id });
              var withSupps = Object.assign({}, currentItem, { supplementaryResources: nextSupps });
              return appendLinkTokenToRung(withSupps, sr.anchorRung, token, res.id, sr.kind);
            })
            .catch(function (err) {
              try { console.warn("[DA Phase Z] Glossary generation failed for item " + idx + ":", err && err.message); } catch (_) {}
              var failSupps = currentItem.supplementaryResources.slice();
              failSupps[si] = Object.assign({}, sr, { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
              return Object.assign({}, currentItem, { supplementaryResources: failSupps });
            });
        }

        // Math manipulative kind (Phase 2). Synchronous from DA's perspective:
        // the host just mints a history entry pointing at the right STEM tool
        // with the preset state Gemini specified. No image gen, no AI roundtrip.
        if (sr.kind === "math-manipulative") {
          if (typeof onGenerateManipulative !== "function") return currentItem;
          var mProv = { fromDA: true, daItemIndex: idx, daItemPrompt: String(currentItem.prompt || "").slice(0, 80) };
          return Promise.resolve()
            .then(function () { return onGenerateManipulative(sr.toolId, sr.preset, sr.title, mProv); })
            .then(function (res) {
              if (!res || !res.id) throw new Error("Manipulative callback returned no id.");
              var token = makeResourceLinkToken(sr.title, res.id);
              var nextSupps = currentItem.supplementaryResources.slice();
              nextSupps[si] = Object.assign({}, sr, { status: "generated", resourceId: res.id });
              var withSupps = Object.assign({}, currentItem, { supplementaryResources: nextSupps });
              return appendLinkTokenToRung(withSupps, sr.anchorRung, token, res.id, sr.kind);
            })
            .catch(function (err) {
              try { console.warn("[DA Phase Z] Manipulative generation failed for item " + idx + ":", err && err.message); } catch (_) {}
              var failSupps = currentItem.supplementaryResources.slice();
              failSupps[si] = Object.assign({}, sr, { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
              return Object.assign({}, currentItem, { supplementaryResources: failSupps });
            });
        }

        // Word Sounds probe kind (Phase 3). Synchronous — host mints a
        // type:'word-sounds' history entry with isProbeMode flag + preloaded
        // word list + activity. Clicking the link opens Word Sounds Studio
        // directly into probe mode at the chosen activity.
        if (sr.kind === "word-sounds-probe") {
          if (typeof onGenerateWordSoundsProbe !== "function") return currentItem;
          var wProv = { fromDA: true, daItemIndex: idx, daItemPrompt: String(currentItem.prompt || "").slice(0, 80) };
          return Promise.resolve()
            .then(function () { return onGenerateWordSoundsProbe(sr.activity, sr.words, sr.title, wProv); })
            .then(function (res) {
              if (!res || !res.id) throw new Error("Word Sounds callback returned no id.");
              var token = makeResourceLinkToken(sr.title, res.id);
              var nextSupps = currentItem.supplementaryResources.slice();
              nextSupps[si] = Object.assign({}, sr, { status: "generated", resourceId: res.id });
              var withSupps = Object.assign({}, currentItem, { supplementaryResources: nextSupps });
              return appendLinkTokenToRung(withSupps, sr.anchorRung, token, res.id, sr.kind);
            })
            .catch(function (err) {
              try { console.warn("[DA Phase Z] Word Sounds probe generation failed for item " + idx + ":", err && err.message); } catch (_) {}
              var failSupps = currentItem.supplementaryResources.slice();
              failSupps[si] = Object.assign({}, sr, { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
              return Object.assign({}, currentItem, { supplementaryResources: failSupps });
            });
        }

        // Visual organizer kind (Phase 4). The host routes this through the
        // SAME shared resource-generation pipeline (handleGenerate) the main app
        // uses for outline/concept-map/mind-map/timeline/concept-sort — no
        // DA-specific render code. The host maps toolType → generator + mints a
        // standard history entry, so handleRestoreView opens it for free.
        if (sr.kind === "visual-organizer") {
          if (typeof onGenerateVisualOrganizer !== "function") return currentItem;
          var voProv = { fromDA: true, daItemIndex: idx, daItemPrompt: String(currentItem.prompt || "").slice(0, 80) };
          return Promise.resolve()
            .then(function () { return onGenerateVisualOrganizer(sr.toolType, sr.directive, sr.title, voProv); })
            .then(function (res) {
              if (!res || !res.id) throw new Error("Visual organizer callback returned no id.");
              var token = makeResourceLinkToken(sr.title, res.id);
              var nextSupps = currentItem.supplementaryResources.slice();
              nextSupps[si] = Object.assign({}, sr, { status: "generated", resourceId: res.id });
              var withSupps = Object.assign({}, currentItem, { supplementaryResources: nextSupps });
              return appendLinkTokenToRung(withSupps, sr.anchorRung, token, res.id, sr.kind);
            })
            .catch(function (err) {
              try { console.warn("[DA Phase Z] Visual organizer generation failed for item " + idx + ":", err && err.message); } catch (_) {}
              var failSupps = currentItem.supplementaryResources.slice();
              failSupps[si] = Object.assign({}, sr, { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
              return Object.assign({}, currentItem, { supplementaryResources: failSupps });
            });
        }

        // Sentence-frames kind (expressive/output scaffold). Same shared
        // pipeline: host calls handleGenerate('sentence-frames', directive,
        // {isolatedContext}) → mints a standard 'sentence-frames' history entry
        // → handleRestoreView opens it via its default branch (no new code).
        if (sr.kind === "sentence-frames") {
          if (typeof onGenerateSentenceFrames !== "function") return currentItem;
          var sfProv = { fromDA: true, daItemIndex: idx, daItemPrompt: String(currentItem.prompt || "").slice(0, 80) };
          return Promise.resolve()
            .then(function () { return onGenerateSentenceFrames(sr.directive, sr.title, sfProv); })
            .then(function (res) {
              if (!res || !res.id) throw new Error("Sentence-frames callback returned no id.");
              var token = makeResourceLinkToken(sr.title, res.id);
              var nextSupps = currentItem.supplementaryResources.slice();
              nextSupps[si] = Object.assign({}, sr, { status: "generated", resourceId: res.id });
              var withSupps = Object.assign({}, currentItem, { supplementaryResources: nextSupps });
              return appendLinkTokenToRung(withSupps, sr.anchorRung, token, res.id, sr.kind);
            })
            .catch(function (err) {
              try { console.warn("[DA Phase Z] Sentence-frames generation failed for item " + idx + ":", err && err.message); } catch (_) {}
              var failSupps = currentItem.supplementaryResources.slice();
              failSupps[si] = Object.assign({}, sr, { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
              return Object.assign({}, currentItem, { supplementaryResources: failSupps });
            });
        }
        // Unknown kind — pass through unchanged.
        return currentItem;
      });
    }, Promise.resolve(working));
  }

  // Run generateDaSupportsForItem across all items. Returns a Promise<items[]>.
  function generateDaSupportsForBank(items, hostCallbacks) {
    return items.reduce(function (chain, it, i) {
      return chain.then(function (acc) {
        return generateDaSupportsForItem(it, i, hostCallbacks).then(function (updated) {
          acc.push(updated);
          return acc;
        });
      });
    }, Promise.resolve([]));
  }

  // ═════════════════════════════════════════════════════════
  // Phase Y — Self-critique loop for scaffold generation
  // ─────────────────────────────────────────────────────────
  // The single largest constraint on AI-generated item quality
  // is L3 modeling collapsing into "the answer with extra steps"
  // and L1 paraphrasing the answer instead of orienting attention.
  // Single-pass generation catches the obvious cases; a self-
  // critique pass catches the subtle ones. Three-stage pipeline:
  //   1. Draft generation (existing logic)
  //   2. Critique — Gemini reviews its own draft against 5 quality
  //      criteria and proposes specific fixes
  //   3. Refinement — Gemini applies only the called-out fixes
  // The clinician sees critique notes per item on the review
  // screen, so the AI's reasoning is transparent + editable.
  // ═════════════════════════════════════════════════════════

  // Build a critique prompt for an already-generated draft. Items
  // are passed as the validated array from validateGeneratedItem.
  function buildCritiquePrompt(draftItems, form, outputLanguage) {
    var domainHint = {
      "math": "math reasoning items — common failure modes: L1 leaking the operation, L3 modeling collapsing into 'the answer with extra arithmetic.'",
      "reading": "reading comprehension items — common failure modes: L1 stating the inference, L3 modeling restating the canonical answer with paraphrase.",
      "working-memory": "working memory items — common failure modes: scaffolds that bypass the construct (telling the student the chunking instead of cueing them to chunk).",
      "language": "language production items — common failure modes: L1 leaking target vocabulary, L3 modeling becoming the answer in slightly different words."
    }[form.domain] || "general items";

    return [
      "You are a senior school psychologist reviewing draft Dynamic Assessment items + prompt ladders. Your job is to identify quality issues and propose specific refinements. Be rigorous and concrete.",
      buildLanguageDirective(outputLanguage),
      "Domain context: " + domainHint,
      "",
      "Evaluate EACH item against these 5 criteria:",
      "",
      "1. ANSWER LEAKAGE (most important)",
      "   • L1 declarative cue: Must orient attention without giving the answer. A meta-cue ('What is the question asking you to find?') is good. An information cue that paraphrases the answer ('You need to multiply') is BAD.",
      "   • L2 leading question: Pushes toward strategy, not toward answer. 'What operation does this call for?' is good. 'Should we multiply 4 × 6?' is BAD.",
      "   • L3 modeling: MUST show a parallel example with DIFFERENT surface features (different numbers, different context), THEN redirect to the original item. Common failure: L3 just restates 'the answer with extra steps.' This is the most frequent AI-generation issue. Flag aggressively.",
      "   • L4 direct teach: SHOULD include the answer WITH reasoning, not just the answer.",
      "",
      "2. SCAFFOLD GRADIENT",
      "   • L1 → L4 should be a progression of INCREASING support, not 4 independent attempts at hints.",
      "   • L2 should be more directive than L1 (asks rather than orients).",
      "   • L3 should be more demonstrative than L2 (shows rather than asks).",
      "   • L4 should be more concrete than L3 (gives the answer + reasoning rather than just demonstrating).",
      "",
      "3. CONSTRUCT ALIGNMENT",
      "   • If construct is 'operation selection in word problems,' scaffolds should target operation selection, not computation.",
      "   • If construct is 'inference comprehension,' scaffolds should target inferential reasoning, not literal recall.",
      "",
      "4. AGE / GRADE APPROPRIATENESS",
      "   • Vocabulary and complexity should match the named grade band (" + (form.gradeBand || "unspecified") + ").",
      "   • No culture-specific references required to access (sports/foods/holidays from one tradition only).",
      "",
      "5. TRANSFER TWIN VALIDITY (if present)",
      "   • Must use SAME construct with DIFFERENT surface features. Different numbers alone is NOT enough — the surface context should change.",
      "   • Common failure: twin is the same problem with different digits (still same surface features). Flag this.",
      "",
      "=== DRAFT ITEMS TO REVIEW ===",
      JSON.stringify(draftItems.map(function (it) {
        return {
          itemIndex: it._itemIndex !== undefined ? it._itemIndex : null,
          prompt: it.prompt,
          correctAnswer: it.correctAnswer,
          construct: it.construct,
          promptLadder: it.promptLadder,
          transferTwin: it.transferTwin
        };
      }), null, 2),
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON array. No prose, no markdown fences. One object per item in the same order as the input.",
      "{",
      "  \"itemIndex\": <number>,",
      "  \"overallQuality\": \"good\" | \"needs-minor-refinement\" | \"needs-major-refinement\",",
      "  \"issues\": [",
      "    { \"criterion\": \"answer-leakage\" | \"gradient\" | \"construct-alignment\" | \"age-appropriateness\" | \"transfer-twin\", \"level\": 1|2|3|4|null, \"severity\": \"minor\"|\"major\", \"description\": \"<what's wrong>\", \"suggestedFix\": \"<specific concrete fix>\" }",
      "  ]",
      "}",
      "If an item is genuinely good, return { itemIndex, overallQuality: 'good', issues: [] }. Don't invent issues to fill the array."
    ].join("\n");
  }

  function parseCritiqueResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      var m = s.match(/\[[\s\S]*\]/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (!Array.isArray(parsed)) return null;
    return parsed.map(function (c, i) {
      if (!c || typeof c !== "object") return { itemIndex: i, overallQuality: "good", issues: [] };
      return {
        itemIndex: typeof c.itemIndex === "number" ? c.itemIndex : i,
        overallQuality: String(c.overallQuality || "good"),
        issues: Array.isArray(c.issues) ? c.issues.map(function (iss) {
          if (!iss || typeof iss !== "object") return null;
          return {
            criterion: String(iss.criterion || "").trim() || "unspecified",
            level: typeof iss.level === "number" ? iss.level : null,
            severity: String(iss.severity || "minor").trim(),
            description: String(iss.description || "").trim(),
            suggestedFix: String(iss.suggestedFix || "").trim()
          };
        }).filter(function (x) { return x && x.description; }) : []
      };
    });
  }

  // Build a refinement prompt that applies only the called-out fixes
  // to the items that need them. Items marked 'good' are not touched.
  function buildRefinementPrompt(draftItems, critiques, form, outputLanguage) {
    var itemsNeedingRefinement = [];
    critiques.forEach(function (c, ci) {
      if (c.overallQuality !== "good" && c.issues.length > 0) {
        var item = draftItems[c.itemIndex !== null ? c.itemIndex : ci];
        if (item) {
          itemsNeedingRefinement.push({ item: item, critique: c });
        }
      }
    });
    return [
      "You are refining Dynamic Assessment items based on specific critique feedback from a senior school psychologist.",
      buildLanguageDirective(outputLanguage),
      "Rules:",
      "1. Apply ONLY the changes called out in the critique. Do NOT make other changes.",
      "2. Preserve correctAnswer, construct, gradeBand, prompt. Do NOT change the canonical answer or the question itself.",
      "3. Maintain the L1 → L4 ladder structure (cue, leading, model, directTeach).",
      "4. If a fix would require changing the canonical answer, leave the item AS-IS and add a note about why.",
      "5. If the critique called out L3 modeling as 'answer in disguise,' the L3 fix MUST introduce a parallel example with DIFFERENT surface features (different numbers AND different context) before redirecting.",
      "",
      "=== ITEMS + CRITIQUES TO REFINE ===",
      JSON.stringify(itemsNeedingRefinement.map(function (entry, i) {
        return {
          refineIndex: i,
          originalItemIndex: entry.critique.itemIndex,
          originalItem: {
            prompt: entry.item.prompt,
            correctAnswer: entry.item.correctAnswer,
            promptLadder: entry.item.promptLadder,
            transferTwin: entry.item.transferTwin
          },
          critiqueIssues: entry.critique.issues
        };
      }), null, 2),
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON array. Each element is the refined item using the same shape as the original generation (prompt, correctAnswer, acceptableAnswers, promptLadder, constructTags, transferTwin). Include these extra fields:",
      "  refineIndex: <copy from input>,",
      "  originalItemIndex: <copy from input>,",
      "  _refinementNotes: \"<1-2 sentence summary of what was changed and why>\"",
      "Do not include items that didn't need refinement."
    ].join("\n");
  }

  function parseRefinementResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      var m = s.match(/\[[\s\S]*\]/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (!Array.isArray(parsed)) return null;
    return parsed;
  }

  // Tighter validators introduced in Phase Y. These run alongside
  // the existing validateGeneratedItem checks; failures become
  // _generationWarnings entries surfaced on the review screen.
  function validateScaffoldGradient(item) {
    var warnings = [];
    var ladder = item.promptLadder || [];
    // Each level should be at least as informative as the previous.
    // Heuristic: monotonically non-decreasing text length is a rough
    // gradient check. Not perfect but catches obvious failures.
    // EXCEPTION (added Phase Y.1): L4's job is "give the answer + reasoning",
    // which is often pithier than the L3 modeled-parallel-example. Don't
    // flag an L4 < 60% of L3 if the L4 (a) is at least 50 chars long AND
    // (b) references the canonical answer. Those two conditions together
    // mean L4 is doing its job, just succinctly.
    var prevLen = 0;
    var l4ContainsAns = function (text) {
      if (!text || !item.correctAnswer) return false;
      var _norm = function (s) {
        return String(s || "").toLowerCase()
          .replace(/[\s ]+/g, " ")
          .replace(/^[\s.,;:!?\-—'"`]+|[\s.,;:!?\-—'"`]+$/g, "").trim();
      };
      return _norm(text).indexOf(_norm(item.correctAnswer)) >= 0;
    };
    for (var i = 0; i < ladder.length; i++) {
      var step = ladder[i];
      if (!step || !step.text) continue;
      var len = step.text.length;
      if (i > 0 && len < prevLen * 0.6) {
        // Suppress for an L4 that's substantive + references the answer.
        if (step.level === 4 && len >= 50 && l4ContainsAns(step.text)) {
          // Looks fine — L4 is shorter but it's an answer+reasoning sentence, that's expected.
        } else {
          warnings.push("L" + step.level + " is much shorter than the prior step — gradient may be reversed");
        }
      }
      prevLen = len;
    }
    return warnings;
  }

  function validateL3NotAnswerInDisguise(item) {
    var warnings = [];
    var ladder = item.promptLadder || [];
    var l3 = ladder.filter(function (s) { return s && s.level === 3; })[0];
    if (!l3 || !l3.text || !item.correctAnswer) return warnings;
    var l3Lower = l3.text.toLowerCase();
    var ansLower = item.correctAnswer.toLowerCase();
    // Direct verbatim leak
    if (ansLower.length >= 3 && l3Lower.indexOf(ansLower) >= 0) {
      warnings.push("L3 contains the canonical answer verbatim — should model a parallel example, not state the answer");
    }
    // L3 should typically contain words like "example", "another", "different", "similar"
    // signaling parallel construction. Lack of these is a weak signal but worth noting.
    var parallelSignals = ["example", "another", "different", "similar", "imagine", "suppose", "consider", "look at this", "think of"];
    var hasSignal = parallelSignals.some(function (p) { return l3Lower.indexOf(p) >= 0; });
    if (!hasSignal && l3.text.length < 80) {
      warnings.push("L3 may not be modeling a parallel example — typical L3 introduces a similar case before redirecting");
    }
    return warnings;
  }

  function validateL4ContainsAnswer(item) {
    var warnings = [];
    var ladder = item.promptLadder || [];
    var l4 = ladder.filter(function (s) { return s && s.level === 4; })[0];
    if (!l4 || !l4.text || !item.correctAnswer) return warnings;
    // Normalize both sides: lowercase, strip leading/trailing punctuation +
    // whitespace, collapse internal whitespace. Otherwise "Bees work together
    // to survive." (canonical, period) doesn't match "bees work together to
    // survive," (L4, comma) and we'd false-positive.
    var _norm = function (s) {
      return String(s || "")
        .toLowerCase()
        .replace(/[\s ]+/g, " ")
        .replace(/^[\s.,;:!?\-—'"`]+|[\s.,;:!?\-—'"`]+$/g, "")
        .trim();
    };
    var l4Lower = _norm(l4.text);
    var ansLower = _norm(item.correctAnswer);
    if (!ansLower || ansLower.length < 2) return warnings;
    // Direct substring (after normalization) — covers most "L4 quotes the answer" cases.
    if (l4Lower.indexOf(ansLower) >= 0) return warnings;
    // Fallback: word-overlap heuristic. If L4 contains ≥70% of the answer's
    // content words (≥3 letters), treat it as "references the answer." This
    // covers paraphrased L4s like "the answer is that bees cooperate so the
    // colony survives" when the canonical is "bees work together to survive."
    var stopWords = { the:1, a:1, an:1, of:1, in:1, to:1, is:1, are:1, was:1, were:1, and:1, or:1, but:1, for:1, with:1, on:1, at:1, by:1, as:1, it:1, this:1, that:1, be:1, will:1 };
    var ansWords = ansLower.split(/\s+/).filter(function (w) { return w.length >= 3 && !stopWords[w]; });
    if (ansWords.length === 0) return warnings;
    var l4Tokens = {};
    l4Lower.split(/\s+/).forEach(function (w) { l4Tokens[w] = true; });
    var hits = 0;
    ansWords.forEach(function (w) { if (l4Tokens[w]) hits++; });
    var coverage = hits / ansWords.length;
    if (coverage < 0.7) {
      warnings.push("L4 direct teach does not reference the canonical answer — direct teach should include both the answer AND reasoning");
    }
    return warnings;
  }

  function validateTransferTwinDistinct(item) {
    var warnings = [];
    var twin = item.transferTwin;
    if (!twin || !twin.prompt || !item.prompt) return warnings;
    // Compare prompts at word-overlap level. >70% word overlap suggests
    // twin is "same problem with different numbers" — fails the
    // "different surface features" criterion.
    var stem = item.prompt.toLowerCase().replace(/\d+/g, "0").split(/\s+/);
    var twinP = twin.prompt.toLowerCase().replace(/\d+/g, "0").split(/\s+/);
    var stemSet = {};
    stem.forEach(function (w) { if (w.length >= 3) stemSet[w] = true; });
    var overlapCount = 0, twinTokens = 0;
    twinP.forEach(function (w) { if (w.length >= 3) { twinTokens++; if (stemSet[w]) overlapCount++; } });
    var overlap = twinTokens > 0 ? overlapCount / twinTokens : 0;
    if (overlap > 0.7) {
      warnings.push("Transfer twin shares >70% vocabulary with original — should use different surface features, not just different numbers");
    }
    return warnings;
  }

  // Run the full Phase Y validator suite on an item. Returns extended
  // _generationWarnings.
  function runPhaseYValidators(item) {
    var extra = [];
    extra = extra.concat(validateScaffoldGradient(item));
    extra = extra.concat(validateL3NotAnswerInDisguise(item));
    extra = extra.concat(validateL4ContainsAnswer(item));
    extra = extra.concat(validateTransferTwinDistinct(item));
    return extra;
  }

  // ═════════════════════════════════════════════════════════
  // Phase K — IEP goal generation
  // ─────────────────────────────────────────────────────────
  // Translate a completed DA session into SMART-format IEP
  // goals + short-term objectives. The DA session is exactly
  // the right input for this — it documents which scaffolds
  // moved the student, which constructs were probed, and what
  // observation patterns recurred. Output is editable + the
  // clinician owns the final wording.
  // ═════════════════════════════════════════════════════════

  // Phase V-bis — Format Math Fluency CBM probes (passed in via props from the
  // host's main history) into a multi-line block suitable for the intake's
  // existingAssessmentData field. Appends, never overwrites. Computes a trend
  // line if 2+ probes share the same operation+difficulty.
  function formatMathFluencyProbesForIntake(probes) {
    if (!Array.isArray(probes) || probes.length === 0) return "";
    var lines = ["Math Fluency CBM probes (auto-pulled from session history):"];
    probes.slice(0, 3).forEach(function (p) {
      var d = (p && p.data) || {};
      var dateStr = "";
      try { dateStr = new Date(d.date || (p && p.timestamp) || Date.now()).toISOString().slice(0, 10); } catch (_) {}
      var op = d.operation || "?";
      var diff = d.difficulty || "?";
      var dcpm = typeof d.dcpm === "number" ? d.dcpm : "?";
      var acc = typeof d.accuracy === "number" ? d.accuracy : "?";
      var corr = typeof d.totalCorrect === "number" ? d.totalCorrect : "?";
      var att = typeof d.totalAttempted === "number" ? d.totalAttempted : "?";
      lines.push("- " + dateStr + ": " + dcpm + " DCPM, " + acc + "% accuracy (" + op + "/" + diff + "; " + corr + "/" + att + " correct)");
    });
    if (probes.length >= 2) {
      var firstOp = probes[0] && probes[0].data && probes[0].data.operation;
      var firstDiff = probes[0] && probes[0].data && probes[0].data.difficulty;
      var match = probes.filter(function (p) {
        return p && p.data && p.data.operation === firstOp && p.data.difficulty === firstDiff;
      });
      if (match.length >= 2) {
        // probes are most-recent-first, so match[0] is newest, match[last] is oldest
        var newest = match[0].data || {};
        var oldest = match[match.length - 1].data || {};
        var delta = (newest.dcpm || 0) - (oldest.dcpm || 0);
        var trendWord = delta > 0 ? "improving" : delta < 0 ? "declining" : "flat";
        lines.push("Trend (" + firstOp + "/" + firstDiff + "): " + (delta >= 0 ? "+" : "") + delta + " DCPM across " + match.length + " probe" + (match.length === 1 ? "" : "s") + " (" + trendWord + ").");
      }
    }
    return lines.join("\n");
  }

  // Output-language directive injected into every AI prompt that produces
  // student/family/clinician-facing text. Sourced from the host's leveledTextLanguage
  // (the same setting that controls leveled-text and glossary translation across
  // AlloFlow), with an optional per-DA-session override. Returns "" for English
  // so prompts don't carry a phantom directive in the default case.
  function buildLanguageDirective(outputLanguage) {
    if (!outputLanguage || outputLanguage === "English") return "";
    return [
      "",
      "═══ OUTPUT LANGUAGE ═══",
      "Generate ALL output text in " + outputLanguage + ", including item prompts, scaffold-ladder text, transfer-twin prompts, observation hints, narrative summaries, IEP goal text, accommodation text, family-letter body, teacher-handoff body, and monitoring-plan text. Use " + outputLanguage + "'s standard pedagogical and clinical terminology for K-12 special education.",
      "Universal acronyms (IEP, FBA, BIP, RTI, ABA, UDL, ABC, DOK, DCPM, WCPM, CBM, MTSS, AAC, ELL) stay as-is; provide a brief " + outputLanguage + " gloss on first mention only.",
      "Author names and bibliographic references (Vygotsky, Feuerstein, Lidz, Tzuriel, etc.) stay in their original Latin spelling.",
      "Field keys in JSON (e.g., \"prompt\", \"correctAnswer\", \"construct\", \"verdict\", \"nextScaffoldLevel\") MUST remain English — only the VALUES are translated.",
      "═══════════════════════",
      ""
    ].join("\n");
  }

  // Phase V — Format intake context as a block to prepend to AI prompts.
  // Returns "" if no fields filled, so prompts don't get a phantom block.
  function formatIntakeForPrompt(session) {
    if (!session || !session.intake) return "";
    var ik = session.intake;
    var parts = [];
    if (ik.referralReason && ik.referralReason.trim())
      parts.push("Referral reason: " + ik.referralReason.trim());
    if (ik.hypothesizedBottleneck && ik.hypothesizedBottleneck.trim())
      parts.push("Hypothesized bottleneck: " + ik.hypothesizedBottleneck.trim());
    if (ik.specificQuestion && ik.specificQuestion.trim())
      parts.push("Specific question this probe was meant to answer: " + ik.specificQuestion.trim());
    if (ik.priorInterventions && ik.priorInterventions.trim())
      parts.push("Prior interventions tried: " + ik.priorInterventions.trim());
    if (ik.existingAssessmentData && ik.existingAssessmentData.trim())
      parts.push("Existing assessment data: " + ik.existingAssessmentData.trim());
    if (parts.length === 0) return "";
    return ["=== PRE-SESSION REFERRAL CONTEXT ==="].concat(parts).join("\n");
  }

  function buildIepGoalPrompt(session, studentName, outputLanguage) {
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var mediationResults = (session.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var modIdx = typeof session.modifiabilityIndex === "number" ? session.modifiabilityIndex : 0;
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);
    var name = studentName || session.studentNickname || "the student";

    // What scaffolds actually worked
    var workedAt = { cue: 0, leading: 0, model: 0, directTeach: 0 };
    mediationResults.forEach(function (r) {
      if (r.finalCorrect && !r.scaffoldLeaked && r.supportType in workedAt) workedAt[r.supportType] = workedAt[r.supportType] + 1;
    });

    // Tag patterns
    var tagAgg = aggregateObservationTags(session.itemResults);
    var tagSummary = tagAgg.slice(0, 5).map(function (t) { return t.label + " (" + t.count + ")"; }).join("; ");

    // Constructs probed (rolled up from item-level constructTags)
    var constructs = {};
    (session.itemResults || []).forEach(function (r) {
      var it = ITEMS_BY_ID[r.itemId];
      if (it && Array.isArray(it.constructTags)) {
        it.constructTags.forEach(function (tag) { constructs[tag] = true; });
      }
    });
    var constructList = Object.keys(constructs).join(", ") || (session.domain || "domain unspecified");

    var domainLabel = session.isCustomBank
      ? "a clinician-generated custom probe"
      : ("the " + (session.domain || "domain") + " domain at " + (session.difficulty || "unspecified") + " difficulty");

    return [
      "You are an expert school psychologist drafting IEP goals based on Dynamic Assessment findings. ",
      buildLanguageDirective(outputLanguage),
      "Generate 2 to 4 SMART-format measurable annual IEP goals derived ONLY from the data provided below. ",
      "Each goal must follow the structure: 'Given [conditions], [student] will [observable behavior] at [criterion level], as measured by [evaluation method] across [timeframe].' ",
      "Goals must be observable and measurable — never use words like 'understand,' 'know,' 'appreciate,' or 'demonstrate awareness.' Use action verbs ('will identify,' 'will solve,' 'will produce,' 'will paraphrase'). ",
      "Each annual goal must have 2 to 3 short-term objectives that progressively step toward the annual criterion. ",
      "Anchor each goal to scaffolds that actually moved the student during mediation — if leading questions worked, the goal should reflect a fading-prompt teaching approach. ",
      "If the student's MI tier was low or showed regression, propose conservative goals with prerequisite-construct objectives rather than ambitious end-of-year targets. ",
      "Use person-first language. Do NOT diagnose. Do NOT pathologize. ",
      "",
      formatIntakeForPrompt(session),
      "",
      "=== DA SESSION DATA ===",
      "Student: " + name,
      "Probe: " + domainLabel,
      "Mediation mode: " + (session.mode === "ai" ? "AI-mediated" : "clinician-led"),
      "Items administered: " + session.sessionItemIds.length,
      "Pretest baseline: " + pretestSum + " / " + max + " (" + Math.round((pretestSum / max) * 100) + "%)",
      "Posttest: " + posttestSum + " / " + max + " (" + Math.round((posttestSum / max) * 100) + "%)",
      "Modifiability Index: " + modIdx.toFixed(2) + " (" + tier.label + ")",
      "Constructs probed: " + constructList,
      "Scaffolds that produced correct responses during mediation:",
      "  - L1 declarative cues: " + workedAt.cue + " items",
      "  - L2 leading questions: " + workedAt.leading + " items",
      "  - L3 modeling: " + workedAt.model + " items",
      "  - L4 direct teaching: " + workedAt.directTeach + " items",
      tagSummary ? ("Observation patterns: " + tagSummary) : "Observation patterns: (none recorded)",
      session.sessionNote && session.sessionNote.trim() ? ("Session-level clinician notes: " + session.sessionNote.trim()) : "Session-level clinician notes: (none recorded)",
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON array. No prose, no markdown fences, no commentary. Each element must match this exact shape:",
      "{",
      "  \"domain\": \"<construct area, e.g. 'multi-step word problems'>\",",
      "  \"annualGoal\": \"<SMART-format full annual goal statement>\",",
      "  \"rationale\": \"<one sentence tying this goal to specific DA findings — which scaffold worked, which pattern was observed>\",",
      "  \"shortTermObjectives\": [\"<obj 1>\", \"<obj 2>\", \"<obj 3>\"],",
      "  \"measurementCriterion\": \"<numeric criterion, e.g. '80% accuracy across 3 consecutive probes'>\",",
      "  \"evaluationMethod\": \"<how progress will be measured, e.g. 'weekly CBM probes + classroom work samples'>\"",
      "}"
    ].join("\n");
  }

  function parseIepGoalResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    // Strip markdown fences if Gemini insists
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    // If the response wraps in an object with goals key, unwrap
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      // Last-ditch: try to find a [...] block
      var m = s.match(/\[[\s\S]*\]/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.goals)) return parsed.goals;
    return null;
  }

  function validateIepGoal(raw, idx) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["goal " + idx + " is not an object"], goal: null };
    }
    var domain = String(raw.domain || "").trim().slice(0, 120) || "unspecified";
    var annual = String(raw.annualGoal || "").trim();
    var rationale = String(raw.rationale || "").trim();
    var stos = Array.isArray(raw.shortTermObjectives)
      ? raw.shortTermObjectives.map(function (o) { return String(o || "").trim(); }).filter(function (o) { return o.length > 0; })
      : [];
    var criterion = String(raw.measurementCriterion || "").trim();
    var method = String(raw.evaluationMethod || "").trim();
    if (!annual) errors.push("missing annualGoal");
    if (stos.length === 0) errors.push("no short-term objectives");
    if (!criterion) errors.push("missing measurementCriterion");
    // Soft warning if goal uses banned vague verbs
    var banned = ["understand", "appreciate", "know about", "be aware of", "demonstrate awareness", "be familiar with"];
    var loweredGoal = annual.toLowerCase();
    var hitBan = banned.filter(function (b) { return loweredGoal.indexOf(b) >= 0; });
    if (hitBan.length > 0) errors.push("goal uses non-measurable verb(s): " + hitBan.join(", "));
    return {
      ok: errors.length === 0,
      errors: errors,
      goal: {
        id: "iep-goal-" + Date.now() + "-" + idx + "-" + Math.floor(Math.random() * 10000),
        domain: domain,
        annualGoal: annual || "(missing — regenerate or edit)",
        rationale: rationale,
        shortTermObjectives: stos.length > 0 ? stos : ["(missing — regenerate or edit)"],
        measurementCriterion: criterion || "(missing)",
        evaluationMethod: method || "(unspecified)",
        _warnings: errors.slice()
      }
    };
  }

  // ═════════════════════════════════════════════════════════
  // Phase Q — UDL accommodations generation
  // ─────────────────────────────────────────────────────────
  // Goals say what the student will learn; accommodations say
  // how teachers should support that learning. DA data is
  // ideal evidence: "which scaffolds worked during mediation"
  // maps directly to "what supports should be part of routine
  // instruction." Grouped by UDL principle so output mirrors
  // the framework most schools use.
  // ═════════════════════════════════════════════════════════
  var UDL_PRINCIPLE_LABELS = {
    "engagement": "Engagement (the 'why')",
    "representation": "Representation (the 'what')",
    "action-expression": "Action & Expression (the 'how')"
  };
  var ACCOM_CATEGORY_LABELS = {
    "instructional": "Instructional",
    "environmental": "Environmental",
    "presentation": "Presentation",
    "response": "Response",
    "timing": "Timing / Scheduling",
    "setting": "Setting"
  };

  function buildAccommodationsPrompt(session, studentName, outputLanguage) {
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var mediationResults = (session.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var modIdx = typeof session.modifiabilityIndex === "number" ? session.modifiabilityIndex : 0;
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);
    var name = studentName || session.studentNickname || "the student";

    // Which scaffold levels enabled correct response — this is the key signal.
    var workedAt = { cue: 0, leading: 0, model: 0, directTeach: 0 };
    mediationResults.forEach(function (r) {
      if (r.finalCorrect && !r.scaffoldLeaked && r.supportType in workedAt) workedAt[r.supportType] = workedAt[r.supportType] + 1;
    });

    // Tag patterns suggest specific accommodations (e.g. wait time → timing accom)
    var tagAgg = aggregateObservationTags(session.itemResults);
    var tagSummary = tagAgg.slice(0, 5).map(function (t) { return t.label + " (" + t.count + ")"; }).join("; ");

    // Constructs
    var constructs = {};
    (session.itemResults || []).forEach(function (r) {
      var it = ITEMS_BY_ID[r.itemId];
      if (it && Array.isArray(it.constructTags)) {
        it.constructTags.forEach(function (tag) { constructs[tag] = true; });
      }
    });
    var constructList = Object.keys(constructs).join(", ") || (session.domain || "domain unspecified");

    return [
      "You are an expert school psychologist drafting a list of UDL-aligned classroom accommodations based on Dynamic Assessment findings. ",
      buildLanguageDirective(outputLanguage),
      "Generate 4 to 7 specific, evidence-anchored accommodations derived ONLY from the data provided below. ",
      "Each accommodation must be: ",
      "  (a) specific and observable — NOT vague (no 'provide visual supports'; YES 'provide a single-page reference card showing the operation-cue strategy that worked in mediation'); ",
      "  (b) anchored to a specific DA finding — name which scaffold level worked, which tag pattern was observed, or which construct was probed; ",
      "  (c) an accommodation, not a modification — accommodations change HOW the student accesses content; modifications change WHAT is taught. Stay in accommodation territory. ",
      "  (d) categorized into one UDL principle: engagement (motivation, persistence, self-regulation), representation (multiple ways of presenting content), or action-expression (multiple ways of demonstrating learning). ",
      "Cover at least 2 of the 3 UDL principles where the DA evidence supports it. If the DA evidence does not support a principle, do not generate a token accommodation for it. ",
      "Use person-first language. Do not pathologize. Do not diagnose. ",
      "",
      formatIntakeForPrompt(session),
      "",
      "=== DA SESSION DATA ===",
      "Student: " + name,
      "Probe: " + (session.domain || "domain") + " at " + (session.difficulty || "unspecified") + " difficulty",
      "Modifiability Index: " + modIdx.toFixed(2) + " (" + tier.label + ")",
      "Pretest: " + pretestSum + " / " + max + "; Posttest: " + posttestSum + " / " + max,
      "Constructs probed: " + constructList,
      "Scaffolds that produced correct responses during mediation:",
      "  - L1 declarative cues: " + workedAt.cue + " items",
      "  - L2 leading questions: " + workedAt.leading + " items",
      "  - L3 modeling: " + workedAt.model + " items",
      "  - L4 direct teaching: " + workedAt.directTeach + " items",
      tagSummary ? ("Observation patterns: " + tagSummary) : "Observation patterns: (none recorded)",
      session.sessionNote && session.sessionNote.trim() ? ("Session-level clinician notes: " + session.sessionNote.trim()) : "Session-level clinician notes: (none recorded)",
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON array. No prose, no markdown fences, no commentary. Each element must match this exact shape:",
      "{",
      "  \"title\": \"<short label, e.g. 'Operation-cue reference card'>\",",
      "  \"description\": \"<full accommodation description — what teachers do, when, and how>\",",
      "  \"rationale\": \"<one sentence tying this to specific DA evidence: which scaffold worked OR which tag pattern OR which construct gap>\",",
      "  \"udlPrinciple\": \"engagement\" | \"representation\" | \"action-expression\",",
      "  \"category\": \"instructional\" | \"environmental\" | \"presentation\" | \"response\" | \"timing\" | \"setting\"",
      "}"
    ].join("\n");
  }

  function parseAccommodationsResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      var m = s.match(/\[[\s\S]*\]/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.accommodations)) return parsed.accommodations;
    return null;
  }

  function validateAccommodation(raw, idx) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["accommodation " + idx + " is not an object"], accom: null };
    }
    var title = String(raw.title || "").trim().slice(0, 120);
    var description = String(raw.description || "").trim();
    var rationale = String(raw.rationale || "").trim();
    var udlPrinciple = String(raw.udlPrinciple || "").trim().toLowerCase();
    var category = String(raw.category || "").trim().toLowerCase();
    if (!title) errors.push("missing title");
    if (!description) errors.push("missing description");
    if (!(udlPrinciple in UDL_PRINCIPLE_LABELS)) {
      errors.push("invalid udlPrinciple (must be engagement/representation/action-expression)");
      udlPrinciple = "representation"; // fallback
    }
    if (!(category in ACCOM_CATEGORY_LABELS)) {
      errors.push("invalid category");
      category = "instructional"; // fallback
    }
    // Soft warning: too-vague language
    var vague = ["provide visual supports", "use manipulatives", "give breaks", "be patient"];
    var loweredDesc = description.toLowerCase();
    vague.forEach(function (v) {
      if (loweredDesc === v || loweredDesc.indexOf(v + ".") === 0) errors.push("description is too vague: '" + v + "'");
    });
    return {
      ok: errors.length === 0,
      errors: errors,
      accom: {
        id: "accom-" + Date.now() + "-" + idx + "-" + Math.floor(Math.random() * 10000),
        title: title || "(missing — regenerate or edit)",
        description: description || "(missing — regenerate or edit)",
        rationale: rationale,
        udlPrinciple: udlPrinciple,
        category: category,
        _warnings: errors.slice()
      }
    };
  }

  // ═════════════════════════════════════════════════════════
  // Phase S — Family-facing plain-language summary
  // ─────────────────────────────────────────────────────────
  // Clinical narratives are unintelligible to most families.
  // This generates a 6th-grade-reading-level summary derived
  // from the same DA data, structured as a letter the family
  // can read before an IEP meeting. Banned: "modifiability,"
  // "scaffolding," "construct," "mediation phase," "tier,"
  // "ZPD," any test acronym. Translate everything.
  // ═════════════════════════════════════════════════════════
  var FAMILY_SECTION_LABELS = {
    opener: "What we did today",
    what_we_learned: "What we learned about your child",
    strengths: "Strengths we noticed",
    growth_areas: "Where extra support will help",
    what_helps: "What helped during our time together",
    next_steps: "What this means for school",
    questions_for_team: "Questions you might want to ask the team"
  };
  var FAMILY_SECTION_ORDER = [
    "opener", "what_we_learned", "strengths", "growth_areas",
    "what_helps", "next_steps", "questions_for_team"
  ];

  // ─── Phase DD — Support-usage evidence for reports ───
  // The Phase 1–4 inline supports (glossary / manipulative / word-sounds probe
  // / visual organizer) record the CONCRETE materials a student worked with —
  // the richest, most actionable clinical signal DA produces. Previously this
  // dead-ended: the family letter and teacher handoff only saw scaffold-LEVEL
  // counts (cue/leading/model/directTeach), never the actual materials. These
  // helpers surface "responded when given a number line at L3" into both
  // reports so the handoff's evidence-anchored strategies and the family
  // letter's "what helps" are grounded in what really helped.
  function _daResolveSessionItems(session) {
    var ids = Array.isArray(session.sessionItemIds) ? session.sessionItemIds : [];
    // Prefer the snapshot stored on the session record (works for historical
    // sessions); fall back to ITEMS_BY_ID (active session / prebuilt banks).
    var snap = Array.isArray(session.customBankSnapshot) ? session.customBankSnapshot : null;
    var byId = {};
    if (snap) snap.forEach(function (it) { if (it && it.id) byId[it.id] = it; });
    return ids.map(function (id) { return byId[id] || ITEMS_BY_ID[id] || null; }).filter(Boolean);
  }
  function _daSupportLabels(sr) {
    var k = sr.kind === "reuse" ? (sr._reusedKind || "reuse") : sr.kind;
    if (k === "glossary") {
      var terms = (Array.isArray(sr.seedTerms) && sr.seedTerms.length) ? " [" + sr.seedTerms.slice(0, 4).join(", ") + "]" : "";
      return { clinical: "vocabulary glossary" + terms, family: "picture word-cards for the tricky words" };
    }
    if (k === "math-manipulative") {
      return ({
        numberline: { clinical: "an interactive number line", family: "a number line they could count along" },
        fractions: { clinical: "a fraction-bar manipulative", family: "fraction bars they could see and compare" },
        areamodel: { clinical: "an area-model manipulative", family: "a grid that shows how numbers group together" }
      })[sr.toolId] || { clinical: "a math manipulative", family: "a hands-on math tool" };
    }
    if (k === "word-sounds-probe") {
      return { clinical: (String(sr.activity || "").replace(/_/g, " ").trim() || "phonics") + " phonics probe",
               family: "sound games that break words into smaller parts" };
    }
    if (k === "visual-organizer") {
      return ({
        "concept-map": { clinical: "a concept map", family: "a picture-map showing how the ideas connect" },
        "mind-map": { clinical: "a mind map", family: "a picture-map of the topic and its parts" },
        "outline": { clinical: "a structured outline", family: "a step-by-step list of the main ideas" },
        "timeline": { clinical: "a timeline organizer", family: "a timeline showing the order things happen" },
        "concept-sort": { clinical: "a concept-sort activity", family: "a sorting game to group ideas" }
      })[sr.toolType] || { clinical: "a graphic organizer", family: "a picture that organizes the ideas" };
    }
    if (k === "sentence-frames") {
      return { clinical: "sentence frames (fill-in starters scaffolding the response)", family: "fill-in sentence starters to help them put their answer into words" };
    }
    return { clinical: "a support resource", family: "an extra support" };
  }
  function daSupportsUsedInSession(session) {
    var items = _daResolveSessionItems(session);
    var medById = {};
    (session.itemResults || []).forEach(function (r) { if (r.phase === "mediation") medById[r.itemId] = r; });
    var rows = [];
    items.forEach(function (it, idx) {
      var supps = Array.isArray(it.supplementaryResources)
        ? it.supplementaryResources.filter(function (sr) { return sr && sr.status === "generated"; })
        : [];
      if (supps.length === 0) return;
      var med = medById[it.id];
      var outcome = med
        ? (med.scaffoldLeaked
            ? ("scaffold gave away the answer at L" + (med.promptLevelReached || 0) + " — not valid evidence of competence at that rung")
            : (med.finalCorrect ? ("succeeded at L" + (med.promptLevelReached || 0)) : ("still needed more support after L" + (med.promptLevelReached || 0))))
        : "not administered in mediation";
      var construct = it.construct || (Array.isArray(it.constructTags) ? it.constructTags.slice(0, 2).join("/") : "") || ("item " + (idx + 1));
      rows.push({
        construct: construct,
        outcome: outcome,
        supports: supps.map(function (sr) { return { labels: _daSupportLabels(sr), anchorRung: sr.anchorRung }; })
      });
    });
    return rows;
  }
  function formatSupportsForTeacherPrompt(rows) {
    if (!rows || !rows.length) return "Inline supports attached to items: (none — this probe used scaffold prompts only)";
    var lines = ["Inline supports the student actually worked with during mediation — these are CONCRETE materials; anchor whatWorks strategies to them where the evidence supports it (e.g., recommend a number line if a number-line manipulative helped):"];
    rows.forEach(function (row) {
      var sup = row.supports.map(function (s) { return s.labels.clinical + " (offered at L" + (s.anchorRung || "?") + ")"; }).join("; ");
      lines.push("  - " + row.construct + ": " + sup + " — student " + row.outcome + ".");
    });
    return lines.join("\n");
  }
  function formatSupportsForFamilyPrompt(rows) {
    if (!rows || !rows.length) return "";
    var seen = {}, fam = [];
    rows.forEach(function (row) { row.supports.forEach(function (s) { var f = s.labels.family; if (!seen[f]) { seen[f] = 1; fam.push(f); } }); });
    if (!fam.length) return "";
    return "Specific hands-on supports that helped your child today (weave these into 'what_helps' in plain words — they are the concrete things that made a difference): " + fam.join("; ") + ".";
  }

  // ─── Tier 1 — Access-condition lens (no theory label; describes observations) ───
  // GATED on the multilingual/language-context intake field (never appears for a
  // monolingual student). Classifies the supports that coincided with VALID
  // mediation successes (excludes leaked rungs) as either reducing LANGUAGE
  // demand (glossary / sentence-frames / visual-organizer / word-sounds) or
  // representing the CONSTRUCT (math-manipulative). If successes concentrate on
  // language-reducing supports, that's a HYPOTHESIS (not a finding) that language
  // access — not the underlying skill — is gating performance. This is a SOFT,
  // correlational signal (the supports weren't a controlled manipulation); the
  // Tier-2 access-contrast probes will test it directly. Returns null when the
  // gate is off or there isn't enough supported-success data to say anything.
  var DA_LANG_ACCESS_KINDS = { "glossary": 1, "sentence-frames": 1, "visual-organizer": 1, "word-sounds-probe": 1 };
  var DA_CONSTRUCT_KINDS = { "math-manipulative": 1 };
  function analyzeAccessConditions(session) {
    var lc = (session && session.intake && typeof session.intake.languageContext === "string")
      ? session.intake.languageContext.trim() : "";
    if (!lc) return null; // gate: multilingual/language context required
    var items = _daResolveSessionItems(session);
    var medById = {};
    (session.itemResults || []).forEach(function (r) { if (r.phase === "mediation") medById[r.itemId] = r; });
    var langSucc = 0, constructSucc = 0, supportedSucc = 0;
    var langConstructs = [];
    items.forEach(function (it) {
      var supps = Array.isArray(it.supplementaryResources)
        ? it.supplementaryResources.filter(function (sr) { return sr && sr.status === "generated"; }) : [];
      if (!supps.length) return;
      var med = medById[it.id];
      if (!med || !med.finalCorrect || med.scaffoldLeaked) return; // valid mediation successes only
      var hasLang = supps.some(function (sr) { return DA_LANG_ACCESS_KINDS[sr.kind] || (sr.kind === "reuse" && DA_LANG_ACCESS_KINDS[sr._reusedKind]); });
      var hasConstruct = supps.some(function (sr) { return DA_CONSTRUCT_KINDS[sr.kind] || (sr.kind === "reuse" && DA_CONSTRUCT_KINDS[sr._reusedKind]); });
      if (hasLang || hasConstruct) supportedSucc++;
      if (hasLang) { langSucc++; if (it.construct) langConstructs.push(it.construct); }
      if (hasConstruct) constructSucc++;
    });
    // Tier-2 MODALITY axis: count distinct items the clinician flagged as
    // "succeeded only when read aloud" (a contemporaneous controlled contrast —
    // direct evidence that reading/decoding access, not the construct, gated it).
    var raItems = {}, slItems = {}, l1Items = {};
    (session.itemResults || []).forEach(function (r) {
      if (r && r.itemId && r.accessReadAloudHelped) raItems[r.itemId] = true;
      if (r && r.itemId && r.accessSimplifiedHelped) slItems[r.itemId] = true;
      if (r && r.itemId && r.accessL1Helped) l1Items[r.itemId] = true;
    });
    var readAloudFlips = Object.keys(raItems).length;
    var simplifiedFlips = Object.keys(slItems).length;
    var l1Flips = Object.keys(l1Items).length;
    // Surface the lens if there's EITHER a support-coincidence pattern OR direct
    // contrast evidence (read-aloud / simplified / L1). Small-N discipline applies
    // to the (correlational) support pattern; the direct contrasts are clinician-confirmed.
    if (supportedSucc < 2 && readAloudFlips < 1 && simplifiedFlips < 1 && l1Flips < 1) return null;
    var languageConcentrated = supportedSucc >= 2 && langSucc >= constructSucc && langSucc >= Math.ceil(supportedSucc * 0.5);
    return {
      languageContext: lc,
      langSucc: langSucc,
      constructSucc: constructSucc,
      supportedSucc: supportedSucc,
      languageConcentrated: languageConcentrated,
      exampleConstructs: langConstructs.slice(0, 3),
      readAloudFlips: readAloudFlips,
      simplifiedFlips: simplifiedFlips,
      l1Flips: l1Flips
    };
  }

  // Report-facing access-contrast note (Aaron-approved wording, 2026-05-31).
  // Used in the clinical narrative (verbatim, deterministic) and the teacher
  // handoff prompt (as a required note). Returns "" when there's no evidence or
  // the language gate is off. Hypothesis-generating framing, never diagnostic.
  // NOT used in the family letter (too technical, by decision).
  function formatAccessContrastForReport(session, studentName) {
    var ac = analyzeAccessConditions(session);
    if (!ac) return "";
    var name = studentName || (session && session.studentNickname) || "The student";
    var sentences = [];
    if (ac.readAloudFlips >= 1) {
      sentences.push("On " + ac.readAloudFlips + " item" + (ac.readAloudFlips === 1 ? "" : "s") + ", " + name +
        " reached a correct response when the item was read aloud but not when reading it independently — a same-item contrast suggesting reading/decoding access, rather than the underlying reasoning, limited performance on those items.");
    }
    if (ac.simplifiedFlips >= 1) {
      sentences.push("On " + ac.simplifiedFlips + " item" + (ac.simplifiedFlips === 1 ? "" : "s") + ", " + name +
        " succeeded with a simpler-language version of the same problem but not at full language complexity — a same-item contrast suggesting academic-language load, rather than the underlying reasoning, limited performance on those items.");
    }
    if (ac.l1Flips >= 1) {
      sentences.push("On " + ac.l1Flips + " item" + (ac.l1Flips === 1 ? "" : "s") + ", " + name +
        " succeeded when the same problem was presented in their home language but not in the language of testing — a same-item contrast suggesting the language of testing, rather than the underlying reasoning, limited performance on those items (home-language translation should be verified with a proficient speaker).");
    }
    if (ac.languageConcentrated) {
      sentences.push("Gains during mediation also concentrated on supports that reduced language demand (vocabulary previews, sentence frames, visual organizers), consistent with academic-language access shaping performance.");
    }
    if (sentences.length === 0) return "";
    sentences.push("These are hypothesis-generating observations from a small number of items, to be weighed alongside language-proficiency data, home-language history, and opportunity to learn — not a determination of disability or its absence.");
    return "Access-condition observations: " + sentences.join(" ");
  }

  function buildFamilySummaryPrompt(session, studentName, outputLanguage) {
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var mediationResults = (session.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var modIdx = typeof session.modifiabilityIndex === "number" ? session.modifiabilityIndex : 0;
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);
    var name = studentName || session.studentNickname || "your child";
    // What scaffolds worked
    var workedAt = { cue: 0, leading: 0, model: 0, directTeach: 0 };
    mediationResults.forEach(function (r) {
      if (r.finalCorrect && !r.scaffoldLeaked && r.supportType in workedAt) workedAt[r.supportType] = workedAt[r.supportType] + 1;
    });
    var bestSupport = "leading questions"; // default
    var bestCount = workedAt.leading;
    if (workedAt.cue > bestCount) { bestSupport = "small hints and reminders"; bestCount = workedAt.cue; }
    if (workedAt.model > bestCount) { bestSupport = "watching an example first"; bestCount = workedAt.model; }
    if (workedAt.directTeach > bestCount) { bestSupport = "being taught the step directly"; bestCount = workedAt.directTeach; }

    var tagAgg = aggregateObservationTags(session.itemResults);
    var tagSummary = tagAgg.slice(0, 3).map(function (t) { return t.label; }).join("; ");

    var domainPlain = {
      "math": "math problem-solving",
      "reading": "reading and understanding what was read",
      "working-memory": "remembering and holding information in mind",
      "language": "putting thoughts into words"
    }[session.domain] || (session.domain || "thinking skills");

    return [
      "You are an experienced school psychologist writing a plain-language letter to a family describing what you learned in a one-on-one session with their child. ",
      buildLanguageDirective(outputLanguage),
      "The audience is a parent or guardian who is NOT a clinician — they may not have a high-school education and the AlloFlow user-set output language may not be their first language. ",
      "Reading level target: 6th grade. Short sentences. Concrete examples. No jargon. ",
      "BANNED WORDS: 'modifiability,' 'modifiable,' 'scaffolding,' 'scaffold,' 'mediation,' 'mediated,' 'construct,' 'tier,' 'index,' 'baseline,' 'posttest,' 'ZPD,' 'zone of proximal development,' 'cognitive,' 'metacognitive,' 'pretest,' 'probe,' 'phoneme,' 'orthography,' acronyms (no 'IEP' — say 'school plan'). ",
      "REQUIRED TONE: warm, honest, strengths-first. NEVER make grandiose claims. NEVER promise outcomes. ",
      "Use person-first language. Do NOT diagnose. Do NOT pathologize. ",
      "Refer to the child by name OR as 'your child' — never 'the student' or 'the subject.' ",
      "",
      formatIntakeForPrompt(session),
      "",
      "=== SESSION DATA (clinician's notes, not for the family) ===",
      "Student name to use in the letter: " + name,
      "What we worked on: " + domainPlain,
      "Items the child tried: " + session.sessionItemIds.length,
      "Tried alone, no help — solved: " + pretestSum + " out of " + max,
      "After working together, tried alone again — solved: " + posttestSum + " out of " + max,
      "Change after we worked together: " + (posttestSum - pretestSum >= 0 ? "+" : "") + (posttestSum - pretestSum) + " points (overall pattern: " + tier.id + " responsiveness)",
      "What helped most during our time together: " + bestSupport,
      formatSupportsForFamilyPrompt(daSupportsUsedInSession(session)),
      "Things we noticed about how the child works: " + (tagSummary || "(none recorded)"),
      session.sessionNote && session.sessionNote.trim() ? ("Clinician's overall impression of the session: " + session.sessionNote.trim()) : "",
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON object with these exact keys (each value is plain-language prose, NOT a list unless specified):",
      "{",
      "  \"opener\": \"<2-3 sentences explaining what you did with the child today, in family-friendly terms>\",",
      "  \"what_we_learned\": \"<2-4 sentences. The headline finding. Avoid score-talk. Speak in terms of 'your child learns best when...' rather than 'their MI was X'>\",",
      "  \"strengths\": \"<2-3 sentences celebrating what went well. Be specific — name a thing the child did, not just adjectives.>\",",
      "  \"growth_areas\": \"<2-3 sentences honestly naming areas that need support. Compassionate but truthful. NEVER 'they failed' or 'they couldn't' — say 'they still need practice with' or 'they're working on'>\",",
      "  \"what_helps\": \"<3-4 sentences describing what kind of help made a difference. This is the most important section. The family should leave knowing what supports their child needs.>\",",
      "  \"next_steps\": \"<2-3 sentences about what happens next: what teachers will try, how progress will be checked. Cautious — never promise outcomes.>\",",
      "  \"questions_for_team\": [\"<question 1 a parent might want to ask the school team>\", \"<question 2>\", \"<question 3>\"]",
      "}"
    ].join("\n");
  }

  function parseFamilySummaryResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      var m = s.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  }

  function validateFamilySummary(raw) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["response is not an object"], summary: null };
    }
    var out = {
      id: "family-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
      generatedAt: new Date().toISOString()
    };
    FAMILY_SECTION_ORDER.forEach(function (key) {
      var v = raw[key];
      if (key === "questions_for_team") {
        out[key] = Array.isArray(v)
          ? v.map(function (q) { return String(q || "").trim(); }).filter(function (q) { return q.length > 0; })
          : [];
        if (out[key].length === 0) errors.push("missing or empty questions_for_team");
      } else {
        out[key] = String(v || "").trim();
        if (!out[key]) errors.push("missing " + key);
      }
    });
    // Soft-check banned words across all prose
    var allProse = FAMILY_SECTION_ORDER
      .filter(function (k) { return k !== "questions_for_team"; })
      .map(function (k) { return out[k]; }).join(" ").toLowerCase();
    var bannedDetected = [];
    ["modifiability", "modifiable", "scaffolding", "scaffold", "mediation", "construct ", "tier ", "baseline ", "posttest", "pretest", "metacognitive", "cognitive load", " iep", " zpd"].forEach(function (b) {
      if (allProse.indexOf(b.trim()) >= 0 && allProse.indexOf(b.trim()) === 0) {
        bannedDetected.push(b.trim());
      } else if (allProse.indexOf(" " + b.trim() + " ") >= 0 || allProse.indexOf(b.trim() + ".") >= 0 || allProse.indexOf(b.trim() + ",") >= 0) {
        bannedDetected.push(b.trim());
      }
    });
    if (bannedDetected.length > 0) errors.push("contains jargon: " + bannedDetected.join(", "));
    out._warnings = errors.slice();
    return { ok: errors.length === 0, errors: errors, summary: out };
  }

  // ═════════════════════════════════════════════════════════
  // Phase T — Teacher / case manager handoff page
  // ─────────────────────────────────────────────────────────
  // The missing audience: classroom teachers and case managers
  // who will implement what was found. Family letter is for
  // parents (jargon-free). IEP goals are for the IEP document.
  // Accommodations are formal supports. The handoff is the
  // practical "Monday morning" page — strategies anchored to
  // DA findings, watch-for behaviors, quick informal probes,
  // re-referral triggers.
  // ═════════════════════════════════════════════════════════
  function buildTeacherHandoffPrompt(session, studentName, outputLanguage) {
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var mediationResults = (session.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var modIdx = typeof session.modifiabilityIndex === "number" ? session.modifiabilityIndex : 0;
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);
    var name = studentName || session.studentNickname || "the student";
    var workedAt = { cue: 0, leading: 0, model: 0, directTeach: 0 };
    mediationResults.forEach(function (r) {
      if (r.finalCorrect && !r.scaffoldLeaked && r.supportType in workedAt) workedAt[r.supportType] = workedAt[r.supportType] + 1;
    });
    var didNotWork = mediationResults.filter(function (r) { return !r.finalCorrect; }).length;
    var leakedCount = mediationResults.filter(function (r) { return r.scaffoldLeaked; }).length;
    var tagAgg = aggregateObservationTags(session.itemResults);
    var tagSummary = tagAgg.slice(0, 5).map(function (t) { return t.label + " (" + t.count + ")"; }).join("; ");
    var constructs = {};
    (session.itemResults || []).forEach(function (r) {
      var it = ITEMS_BY_ID[r.itemId];
      if (it && Array.isArray(it.constructTags)) {
        it.constructTags.forEach(function (tag) { constructs[tag] = true; });
      }
    });
    var constructList = Object.keys(constructs).join(", ") || (session.domain || "domain unspecified");

    return [
      "You are an experienced school psychologist writing a one-page handoff to a classroom teacher or special-education case manager who will implement instruction for this student. ",
      buildLanguageDirective(outputLanguage),
      "The audience is a professional educator (NOT a parent) — technical language about instruction is fine. Reading level: educated professional. ",
      "Focus on PRACTICAL CLASSROOM IMPLEMENTATION. Each strategy must be something a teacher can do during instruction on Monday morning. NEVER vague ('use visual supports'); always specific ('use a 3-column strategy chart at the top of every word problem packet showing: the question / the numbers / the operation needed'). ",
      "Tie every strategy to specific DA evidence — which scaffold worked, which observation pattern was seen, which construct was probed. ",
      "Include red flags (concrete behaviors) that should trigger a re-referral back to the school psych. ",
      "Use person-first language. Be honest about what didn't work — don't just write a strengths-only document. ",
      "",
      formatIntakeForPrompt(session),
      "",
      "=== DA SESSION DATA ===",
      "Student: " + name,
      "Probe domain: " + (session.domain || "domain unspecified"),
      "Constructs probed: " + constructList,
      "Items administered: " + session.sessionItemIds.length,
      "Pretest: " + pretestSum + "/" + max + "; Posttest: " + posttestSum + "/" + max + "; MI: " + modIdx.toFixed(2) + " (" + tier.label + ")",
      "Scaffold types that produced correct mediation responses:",
      "  - L1 declarative cues: " + workedAt.cue + " items",
      "  - L2 leading questions: " + workedAt.leading + " items",
      "  - L3 modeling: " + workedAt.model + " items",
      "  - L4 direct teaching: " + workedAt.directTeach + " items",
      "Items where mediation did NOT produce success: " + didNotWork,
      (leakedCount > 0 ? ("NOTE: on " + leakedCount + " item(s) the clinician flagged that the scaffold inadvertently gave away the answer — those responses are NOT counted as the scaffold 'working,' and were scored one level higher. Do not over-credit a scaffold level the student may not actually respond to.") : ""),
      formatSupportsForTeacherPrompt(daSupportsUsedInSession(session)),
      // Access-condition evidence (read-aloud / language-reducing supports). If
      // present, the handoff must convey it faithfully and as hypothesis-generating.
      (function () {
        var note = formatAccessContrastForReport(session, name);
        return note ? ("ACCESS-CONDITION EVIDENCE (include this faithfully in the headline or watchFor, kept hypothesis-generating, NOT diagnostic — do not overstate): " + note) : "";
      })(),
      tagSummary ? ("Observation patterns: " + tagSummary) : "Observation patterns: (none recorded)",
      session.sessionNote && session.sessionNote.trim() ? ("Session-level clinician notes: " + session.sessionNote.trim()) : "Session-level clinician notes: (none recorded)",
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON object with these exact keys. No prose, no markdown, no commentary.",
      "{",
      "  \"headline\": \"<2 sentence clinical summary in teacher-accessible technical language. State the construct, the pattern of responsiveness, and the most important instructional implication.>\",",
      "  \"whatWorks\": [",
      "    { \"title\": \"<short label>\", \"description\": \"<specific classroom strategy, 2-3 sentences>\", \"evidenceFromDA\": \"<which scaffold/pattern this is anchored to>\", \"suggestedFrequency\": \"<e.g., 'every word problem' OR 'first 2 weeks of each new unit'>\" }",
      "  ],",
      "  \"whatDidNotWork\": [\"<concrete strategy or approach that should NOT be the first move with this student, with brief why>\"],",
      "  \"watchFor\": [\"<behavior or pattern teachers should monitor day-to-day; 3-5 items>\"],",
      "  \"quickProbes\": [",
      "    { \"label\": \"<short name>\", \"description\": \"<2-3 sentence informal probe a teacher can run in <5 minutes during routine instruction>\", \"frequency\": \"<e.g., 'weekly'>\" }",
      "  ],",
      "  \"whenToReRefer\": \"<2-3 sentences: under what conditions should the teacher flag this back to the school psych>\",",
      "  \"redFlags\": [\"<concrete observable behavior that should prompt re-referral; 3-5 items>\"]",
      "}",
      "Generate 3-5 strategies in whatWorks, 2-3 items in whatDidNotWork, 3-5 in watchFor, 3-4 in quickProbes, 3-5 in redFlags."
    ].join("\n");
  }

  function parseTeacherHandoffResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      var m = s.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  }

  function validateTeacherHandoff(raw) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["response is not an object"], handoff: null };
    }
    var headline = String(raw.headline || "").trim();
    if (!headline) errors.push("missing headline");
    var works = Array.isArray(raw.whatWorks) ? raw.whatWorks : [];
    var worksClean = works.map(function (w, i) {
      if (!w || typeof w !== "object") return null;
      var title = String(w.title || "").trim().slice(0, 100);
      var description = String(w.description || "").trim();
      var evidence = String(w.evidenceFromDA || w.evidence || "").trim();
      var freq = String(w.suggestedFrequency || w.frequency || "").trim();
      if (!title || !description) return null;
      return { title: title, description: description, evidenceFromDA: evidence, suggestedFrequency: freq };
    }).filter(function (x) { return !!x; });
    if (worksClean.length === 0) errors.push("no whatWorks strategies");

    var didNotWork = Array.isArray(raw.whatDidNotWork)
      ? raw.whatDidNotWork.map(function (x) { return String(x || "").trim(); }).filter(function (x) { return x.length > 0; })
      : [];
    var watchFor = Array.isArray(raw.watchFor)
      ? raw.watchFor.map(function (x) { return String(x || "").trim(); }).filter(function (x) { return x.length > 0; })
      : [];
    var probes = Array.isArray(raw.quickProbes) ? raw.quickProbes : [];
    var probesClean = probes.map(function (p) {
      if (!p || typeof p !== "object") return null;
      var label = String(p.label || "").trim().slice(0, 100);
      var description = String(p.description || "").trim();
      var freq = String(p.frequency || "").trim();
      if (!label || !description) return null;
      return { label: label, description: description, frequency: freq };
    }).filter(function (x) { return !!x; });
    var whenToReRefer = String(raw.whenToReRefer || "").trim();
    var redFlags = Array.isArray(raw.redFlags)
      ? raw.redFlags.map(function (x) { return String(x || "").trim(); }).filter(function (x) { return x.length > 0; })
      : [];

    return {
      ok: errors.length === 0,
      errors: errors,
      handoff: {
        id: "handoff-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
        generatedAt: new Date().toISOString(),
        headline: headline || "(missing)",
        whatWorks: worksClean,
        whatDidNotWork: didNotWork,
        watchFor: watchFor,
        quickProbes: probesClean,
        whenToReRefer: whenToReRefer,
        redFlags: redFlags,
        _warnings: errors.slice()
      }
    };
  }

  // ═════════════════════════════════════════════════════════
  // Phase X — Progress monitoring plan generator
  // ─────────────────────────────────────────────────────────
  // IDEA requires a measurement schedule for every IEP goal.
  // This generator takes the IEP goals (or DA findings if no
  // goals yet) and produces a CBM-anchored monitoring plan
  // with decision rules aligned to RTI/MTSS standards. The DA
  // is NOT the primary monitoring tool — CBM is. The prompt
  // emphasizes evidence-based CBM (AIMSweb / FastBridge /
  // DIBELS / mCLASS / iReady) and the NCII 4-point rule.
  // ═════════════════════════════════════════════════════════
  function buildProgressMonitoringPrompt(session, studentName, outputLanguage) {
    var pretestResults = (session.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
    var posttestResults = (session.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
    var pretestSum = sumItemResultScores(pretestResults);
    var posttestSum = sumItemResultScores(posttestResults);
    var max = maxPossibleScore(session.sessionItemIds.length);
    var modIdx = typeof session.modifiabilityIndex === "number" ? session.modifiabilityIndex : 0;
    var tier = session.modifiabilityTier || modifiabilityTier(modIdx);
    var name = studentName || session.studentNickname || "the student";

    var goals = Array.isArray(session.iepGoals) ? session.iepGoals : [];
    var goalBlock = goals.length > 0
      ? goals.map(function (g, gi) {
          return "  Goal " + (gi + 1) + " (" + g.domain + "): " + g.annualGoal +
            (g.measurementCriterion ? " [criterion: " + g.measurementCriterion + "]" : "") +
            (g.evaluationMethod ? " [evaluation: " + g.evaluationMethod + "]" : "");
        }).join("\n")
      : "  (No IEP goals drafted — generate monitoring plan based on DA findings alone)";

    return [
      "You are an experienced school psychologist drafting a progress monitoring plan that the IEP team will use to measure whether the student is responding to instruction. ",
      buildLanguageDirective(outputLanguage),
      "Anchor every monitored construct to a SPECIFIC evidence-based CBM (curriculum-based measurement) tool when possible. Real tools include: AIMSweb Plus, FastBridge (CBMreading, CBMmath), DIBELS 8, mCLASS, iReady, Read Naturally GOMs, M-COMP, Easy CBM, NWEA MAP Growth (less ideal — too coarse for progress monitoring), CBM-Maze (silent reading comprehension). ",
      "Do NOT invent tool names. If unsure which tool fits, name the construct ('oral reading fluency probe') and let the team choose. ",
      "Decision rules MUST align with NCII / RTI standards: ",
      "  - 4-point rule: 4 consecutive data points below the goal line → change instruction; 4 consecutive above → raise the goal. ",
      "  - 3-data-point trend rule: trend line below goal line after 6-8 weeks → instructional change. ",
      "  - Minimum 6-8 data points before a meaningful trend can be inferred. ",
      "Frequencies: weekly for active Tier 3 intervention; biweekly for Tier 2 / stable Tier 3; monthly for review-only. Match frequency to instructional intensity, NOT examiner availability. ",
      "Be honest that DA is NOT the primary monitoring tool — CBM probes are. DA is a hypothesis-testing tool, used at intake and review. ",
      "",
      formatIntakeForPrompt(session),
      "",
      "=== DA SESSION DATA ===",
      "Student: " + name,
      "Probe domain: " + (session.domain || "unspecified"),
      "Modifiability Index: " + modIdx.toFixed(2) + " (" + tier.label + ")",
      "Pretest: " + pretestSum + "/" + max + "; Posttest: " + posttestSum + "/" + max,
      "",
      "=== IEP GOALS TO MONITOR ===",
      goalBlock,
      "",
      "=== OUTPUT FORMAT ===",
      "Return ONLY a JSON object. No prose, no markdown, no commentary.",
      "{",
      "  \"overview\": \"<2-3 sentences framing the monitoring plan: what's being measured, how often, when team reviews>\",",
      "  \"goalMonitoring\": [",
      "    {",
      "      \"goalSummary\": \"<short description of what's being monitored — tie to IEP goal if present, or to DA construct if not>\",",
      "      \"probeType\": \"<specific CBM tool or construct name, e.g. 'AIMSweb Plus CBMmath M-COMP G5' or 'oral reading fluency probe at grade level'>\",",
      "      \"probeDescription\": \"<1-2 sentences describing what the probe looks like + duration>\",",
      "      \"frequency\": \"<'weekly' | 'biweekly' | 'monthly'>\",",
      "      \"criterion\": \"<numeric target, e.g. '80% accuracy across 3 consecutive probes' or 'ROI of 1.0 word/week'>\",",
      "      \"dataPointsNeeded\": \"<minimum data points before a decision can be made, e.g. '8 points over 8 weeks'>\",",
      "      \"decisionRules\": [",
      "        { \"trigger\": \"<concrete condition>\", \"action\": \"<what the team does>\" }",
      "      ],",
      "      \"tools\": [\"<specific materials/forms needed>\"]",
      "    }",
      "  ],",
      "  \"reviewSchedule\": [",
      "    { \"timing\": \"<e.g. '6 weeks'>\", \"focus\": \"<what the data-team review covers>\" }",
      "  ],",
      "  \"responsibilities\": [",
      "    { \"role\": \"<e.g. 'Case manager'>\", \"action\": \"<what they do>\", \"cadence\": \"<how often>\" }",
      "  ],",
      "  \"caveat\": \"<honest 1-2 sentence reminder that DA is a hypothesis-testing tool, not the primary monitor; CBM is the primary monitor>\"",
      "}",
      "Generate 2-4 goalMonitoring entries (one per IEP goal if goals exist, or 2-3 covering the main DA constructs if no goals), 2-3 reviewSchedule items, 2-4 responsibilities."
    ].join("\n");
  }

  function parseProgressMonitoringResponse(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    var parsed;
    try { parsed = JSON.parse(s); }
    catch (e) {
      var m = s.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { parsed = JSON.parse(m[0]); } catch (e2) { return null; }
    }
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  }

  function validateProgressMonitoring(raw) {
    var errors = [];
    if (!raw || typeof raw !== "object") {
      return { ok: false, errors: ["response is not an object"], plan: null };
    }
    var overview = String(raw.overview || "").trim();
    if (!overview) errors.push("missing overview");

    var monitoring = Array.isArray(raw.goalMonitoring) ? raw.goalMonitoring : [];
    var monitoringClean = monitoring.map(function (g) {
      if (!g || typeof g !== "object") return null;
      var gs = String(g.goalSummary || "").trim();
      var pt = String(g.probeType || "").trim();
      var pd = String(g.probeDescription || "").trim();
      var freq = String(g.frequency || "").trim().toLowerCase();
      var crit = String(g.criterion || "").trim();
      var dpn = String(g.dataPointsNeeded || "").trim();
      var rules = Array.isArray(g.decisionRules) ? g.decisionRules.map(function (r) {
        if (!r || typeof r !== "object") return null;
        var tr = String(r.trigger || "").trim();
        var ac = String(r.action || "").trim();
        if (!tr || !ac) return null;
        return { trigger: tr, action: ac };
      }).filter(function (x) { return !!x; }) : [];
      var tools = Array.isArray(g.tools) ? g.tools.map(function (t) { return String(t || "").trim(); }).filter(function (t) { return t.length > 0; }) : [];
      if (!gs || !pt) return null;
      return { goalSummary: gs, probeType: pt, probeDescription: pd, frequency: freq, criterion: crit, dataPointsNeeded: dpn, decisionRules: rules, tools: tools };
    }).filter(function (x) { return !!x; });
    if (monitoringClean.length === 0) errors.push("no goalMonitoring entries");

    var schedule = Array.isArray(raw.reviewSchedule) ? raw.reviewSchedule.map(function (rs) {
      if (!rs || typeof rs !== "object") return null;
      var ti = String(rs.timing || "").trim();
      var fo = String(rs.focus || "").trim();
      if (!ti || !fo) return null;
      return { timing: ti, focus: fo };
    }).filter(function (x) { return !!x; }) : [];

    var responsibilities = Array.isArray(raw.responsibilities) ? raw.responsibilities.map(function (rp) {
      if (!rp || typeof rp !== "object") return null;
      var ro = String(rp.role || "").trim();
      var ac = String(rp.action || "").trim();
      var ca = String(rp.cadence || "").trim();
      if (!ro || !ac) return null;
      return { role: ro, action: ac, cadence: ca };
    }).filter(function (x) { return !!x; }) : [];

    return {
      ok: errors.length === 0,
      errors: errors,
      plan: {
        id: "monitoring-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
        generatedAt: new Date().toISOString(),
        overview: overview || "(missing)",
        goalMonitoring: monitoringClean,
        reviewSchedule: schedule,
        responsibilities: responsibilities,
        caveat: String(raw.caveat || "").trim(),
        _warnings: errors.slice()
      }
    };
  }

  // Answer-matching for the clinician "Auto-check" convenience scorer.
  // Conservative by design: a false NEGATIVE (clinician overrides via "Mark
  // correct") is clinically safer than a false POSITIVE, which would silently
  // inflate the item score and therefore the Modifiability Index.
  //
  // Earlier this used raw substring containment (r.indexOf(target) !== -1),
  // which mis-scored answers in two common ways:
  //   • numeric: target "7" matched "17"/"27" (any response containing a 7)
  //   • lexical: target "no" matched "i know", "school" matched "schooling"
  // Now: numeric targets compare NUMERICALLY (with simple fraction/decimal
  // support); non-numeric targets require WHOLE-WORD/phrase containment.
  // The intended loose case still works ("I think 7 apples" == "7").
  function _daNormalizeAnswer(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .replace(/[‘’]/g, "'")   // curly → straight apostrophe
      .replace(/\s+/g, " ")
      .trim();
  }
  function _daNumbersIn(s) {
    var nums = [], m;
    // simple fractions a/b first
    var fracRe = /(-?\d+)\s*\/\s*(\d+)/g;
    while ((m = fracRe.exec(s)) !== null) {
      var den = parseFloat(m[2]);
      if (den !== 0) nums.push(parseFloat(m[1]) / den);
    }
    // strip fractions so the integer/decimal scan doesn't re-read num/denom
    var work = s.replace(fracRe, " ");
    var numRe = /-?\d+(?:\.\d+)?/g;
    while ((m = numRe.exec(work)) !== null) nums.push(parseFloat(m[0]));
    return nums.filter(function (n) { return isFinite(n); });
  }
  function matchAnswer(itemDef, response) {
    if (!response) return false;
    var r = _daNormalizeAnswer(response);
    if (!r) return false;
    var pool = (itemDef.acceptableAnswers || [])
      .concat([itemDef.correctAnswer || ""])
      .map(_daNormalizeAnswer)
      .filter(function (a) { return a.length > 0; });
    var EPS = 1e-9;
    var respNums = null; // lazily computed
    for (var i = 0; i < pool.length; i++) {
      var target = pool[i];
      // 1. Exact (normalized) match — always wins.
      if (r === target) return true;
      // 2. Pure-numeric target (no letters): compare numerically so "7" does
      //    NOT match "17", but DOES match "I think 7 apples".
      var targetIsPureNumber = /^[^a-z]+$/.test(target) && _daNumbersIn(target).length === 1;
      if (targetIsPureNumber) {
        if (respNums === null) respNums = _daNumbersIn(r);
        var tgtNum = _daNumbersIn(target)[0];
        for (var n = 0; n < respNums.length; n++) {
          if (Math.abs(respNums[n] - tgtNum) < EPS) return true;
        }
        continue; // numeric targets never fall through to lexical containment
      }
      // 3. Non-numeric target: WHOLE-WORD / phrase containment (boundary on
      //    non-alphanumeric or string edge). Prevents "no"⊂"know" etc. For
      //    scripts without spaces (CJK) the boundaries collapse to substring,
      //    which is the correct behavior there.
      if (target.length >= 2) {
        var esc = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        var wordRe = new RegExp("(?:^|[^a-z0-9])" + esc + "(?:[^a-z0-9]|$)");
        if (wordRe.test(r)) return true;
      }
    }
    return false;
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 4 — React component
  // ═════════════════════════════════════════════════════════
  function DynamicAssessment(props) {
    var React = props.React || window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;

    // ── Theme (light | dark | contrast), self-detected from the host DOM ──
    // The host doesn't pass a theme prop; we sniff its theme-<name> class at
    // mount and observe it for live toggles. The shell element (see RENDER)
    // carries .da-theme-<name>, which flips every --da-* token in CSS.
    var daThemeTuple = useState(daDetectTheme);
    var daTheme = daThemeTuple[0];
    var setDaTheme = daThemeTuple[1];
    useEffect(function () {
      if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
      var target = daThemeTarget();
      if (!target) return;
      var mo = new MutationObserver(function () {
        var next = daDetectTheme();
        setDaTheme(function (prev) { return prev === next ? prev : next; });
      });
      try { mo.observe(target, { attributes: true, attributeFilter: ["class"] }); } catch (_) {}
      return function () { try { mo.disconnect(); } catch (_) {} };
      // eslint-disable-next-line
    }, []);

    // JS-side tone palette for colors that CANNOT be CSS variables:
    // SVG presentation attributes (fill/stroke) and hex+alpha string concats
    // (e.g. idxColor + "11"). Light values match the original palette.
    var DA_TONES = {
      light: { ink: "#0f172a", muted: "#5c6675", faint: "#94a3b8", slate: "#475569", border: "#cbd5e1", grid: "#e2e8f0", surface: "#ffffff",
        blue: "#1e3a8a", blueMid: "#2563eb", sky: "#0284c7", green: "#16a34a", greenStrong: "#15803d", amber: "#a16207", amberMid: "#d97706", orange: "#c2410c",
        red: "#b91c1c", redMid: "#dc2626", violet: "#6d28d9", orangeDeep: "#7c2d12", roseDeep: "#9d174d", redDeep: "#7f1d1d" },
      dark: { ink: "#e8eef7", muted: "#94a3b8", faint: "#7e8ca0", slate: "#b0bece", border: "#46586e", grid: "#334155", surface: "#1e293b",
        blue: "#93c5fd", blueMid: "#60a5fa", sky: "#38bdf8", green: "#4ade80", greenStrong: "#86efac", amber: "#fbbf24", amberMid: "#fbbf24", orange: "#fb923c",
        red: "#f87171", redMid: "#f87171", violet: "#a78bfa", orangeDeep: "#fdba74", roseDeep: "#f9a8d4", redDeep: "#fca5a5" },
      contrast: { ink: "#ffff00", muted: "#ffff00", faint: "#ffff00", slate: "#ffff00", border: "#ffff00", grid: "#ffff00", surface: "#000000",
        blue: "#ffff00", blueMid: "#ffff00", sky: "#ffff00", green: "#00ff00", greenStrong: "#00ff00", amber: "#ffff00", amberMid: "#ffff00", orange: "#ffff00",
        red: "#ffff00", redMid: "#ffff00", violet: "#ffff00", orangeDeep: "#ffff00", roseDeep: "#ffff00", redDeep: "#ffff00" }
    };
    var daTone = DA_TONES[daTheme] || DA_TONES.light;
    // Map a module-level data color (tier.color, flag.color — always the light
    // hex) to the current theme's tone so text stays readable on dark surfaces.
    var DA_HEX_TONE = {
      "#16a34a": "green", "#15803d": "greenStrong", "#a16207": "amber", "#d97706": "amberMid",
      "#b91c1c": "red", "#dc2626": "redMid", "#ea580c": "orange", "#64748b": "muted",
      "#475569": "slate", "#1e3a8a": "blue", "#0f172a": "ink", "#7f1d1d": "redDeep",
      "#7c2d12": "orangeDeep", "#9d174d": "roseDeep", "#92400e": "amber",
      "#6d28d9": "violet", "#5b21b6": "violet", "#7c3aed": "violet",
      "#075985": "blueMid", "#3730a3": "violet", "#3b82f6": "blueMid"
    };
    function daHex(hex) {
      var key = DA_HEX_TONE[String(hex || "").toLowerCase()];
      return key ? daTone[key] : hex;
    }

    // ── Dialog shell focus management (WCAG 2.4.3 / 2.1.2) ──
    var daShellRef = (React.useRef ? React.useRef(null) : { current: null });
    // Focus the shell on mount and restore the opener's focus on unmount —
    // the host mounts/unmounts the module to open/close the modal, so the
    // unmount cleanup is exactly the close moment. Only when hosted as a
    // modal (onClose present); embedded contexts shouldn't have focus yanked.
    useEffect(function () {
      if (typeof props.onClose !== "function") return;
      if (typeof document === "undefined") return;
      var opener = document.activeElement;
      try { if (daShellRef.current && typeof daShellRef.current.focus === "function") daShellRef.current.focus(); } catch (_) {}
      return function () {
        try {
          if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
        } catch (_) {}
      };
      // eslint-disable-next-line
    }, []);
    // Tab/Shift+Tab wrap inside the dialog.
    function daTrapTab(e) {
      if (e.key !== "Tab") return;
      var root = daShellRef.current;
      if (!root) return;
      var nodes;
      try { nodes = root.querySelectorAll("button, [href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])"); } catch (_) { return; }
      var list = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.disabled) continue;
        if (n.offsetParent === null && n !== document.activeElement) continue; // hidden
        list.push(n);
      }
      if (list.length === 0) return;
      var first = list[0], last = list[list.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || active === root)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }

    // ── Themed, accessible confirm dialog (replaces window.confirm) ──
    // Native confirm() is unthemed, unstyled, and yanks the screen-reader
    // context. daAskConfirm renders an alertdialog inside the shell with its
    // own two-button focus loop; Escape cancels; focus returns to the
    // element that triggered it.
    var daConfirmTuple = useState(null); // { message, confirmLabel, danger, onConfirm, _opener }
    var daConfirm = daConfirmTuple[0];
    var setDaConfirm = daConfirmTuple[1];
    function daAskConfirm(opts) {
      var opener = null;
      try { opener = document.activeElement; } catch (_) {}
      setDaConfirm({
        message: String(opts.message || "Are you sure?"),
        confirmLabel: opts.confirmLabel || "Confirm",
        danger: opts.danger !== false, // most of these confirms guard destructive actions
        onConfirm: typeof opts.onConfirm === "function" ? opts.onConfirm : function () {},
        _opener: opener
      });
    }
    function daCloseConfirm(runIt) {
      var c = daConfirm;
      setDaConfirm(null);
      if (c && c._opener && typeof c._opener.focus === "function") {
        try { if (document.contains(c._opener)) c._opener.focus(); } catch (_) {}
      }
      if (runIt && c) c.onConfirm();
    }
    function renderDaConfirm() {
      if (!daConfirm) return null;
      function trapConfirmKeys(e) {
        if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); e.stopPropagation(); daCloseConfirm(false); return; }
        if (e.key === "Tab") {
          // Two buttons only — wrap between them (and keep the shell's own
          // Tab trap from seeing this event).
          e.preventDefault();
          e.stopPropagation();
          try {
            var btns = e.currentTarget.querySelectorAll("button");
            if (btns.length === 2) (document.activeElement === btns[0] ? btns[1] : btns[0]).focus();
          } catch (_) {}
        }
      }
      return h("div", {
        onKeyDown: trapConfirmKeys,
        style: { position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }
      },
        h("div", {
          role: "alertdialog", "aria-modal": "true", "aria-label": daConfirm.message,
          className: "da-card",
          style: { maxWidth: 420, width: "100%", padding: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }
        },
          h("p", { style: { margin: "0 0 14px", fontSize: 14, color: "var(--da-ink)", lineHeight: 1.6 } }, daConfirm.message),
          h("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            h("button", {
              autoFocus: true,
              onClick: function () { daCloseConfirm(false); },
              style: { padding: "8px 16px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "Cancel"),
            h("button", {
              onClick: function () { daCloseConfirm(true); },
              style: daConfirm.danger
                ? { padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--da-red-mid)", color: "var(--da-on-accent)", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }
                : { padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }
            }, daConfirm.confirmLabel)
          )
        )
      );
    }

    // Phase V-bis — Math Fluency CBM probes piped in from the host's main
    // history array. Most-recent-first. May be empty or undefined if the
    // host hasn't passed them (legacy callers, embedded contexts, etc).
    var mathFluencyProbes = Array.isArray(props.mathFluencyProbes) ? props.mathFluencyProbes : [];

    // Output language for all AI-generated DA content (items, scaffolds, IEP
    // goals, accommodations, family letter, teacher handoff, monitoring plan).
    // Source-of-truth: host's leveledTextLanguage (same setting the text-adaptation
    // panel uses). Per-DA-session override via the intake UI; the override resets
    // when the host language changes between opens.
    var hostOutputLanguage = (typeof props.outputLanguage === "string" && props.outputLanguage.trim()) ? props.outputLanguage.trim() : "English";
    var daOutputLangTuple = useState(hostOutputLanguage);
    var daOutputLanguage = daOutputLangTuple[0];
    var setDaOutputLanguage = daOutputLangTuple[1];
    useEffect(function () { setDaOutputLanguage(hostOutputLanguage); }, [hostOutputLanguage]);

    // ── Top-level state (loaded from localStorage) ──
    var stTuple = useState(loadState);
    var state = stTuple[0];
    var setState = stTuple[1];
    function patch(partial) {
      setState(function (prev) {
        // Accept a partial object OR a (prev)=>partial function. The functional
        // form lets callers recompute from the freshest state (e.g. restore-merge
        // dedup against prev.sessions, avoiding a stale-closure clobber).
        var p = (typeof partial === "function") ? partial(prev) : partial;
        var next = Object.assign({}, prev, p);
        saveState(next);
        return next;
      });
    }
    function patchSession(partial) {
      setState(function (prev) {
        if (!prev.activeSession) return prev;
        var nextSess = Object.assign({}, prev.activeSession, partial, { lastTouchedAt: new Date().toISOString() });
        var next = Object.assign({}, prev, { activeSession: nextSess });
        saveState(next);
        return next;
      });
    }

    // Phase U — pause + resume the active session.
    function pauseSession() {
      patchSession({ paused: true, pausedAt: new Date().toISOString() });
      announce("Session paused. Resume from the start screen.");
    }
    function resumeSession() {
      patchSession({ paused: false, pausedAt: null });
      announce("Session resumed.");
    }
    function updateSessionNote(text) {
      patchSession({ sessionNote: String(text || "").slice(0, 4000) });
    }

    // Phase U — timing computation helpers. activeSession.dateStarted is
    // the wall-clock start; itemResults' attemptedAt timestamps mark each
    // item completion. We compute durations between consecutive timestamps
    // ignoring pauses (gaps > 30 min are treated as inactive time).
    function computeSessionTiming(session) {
      if (!session) return { totalMs: 0, activeMs: 0, perItem: [] };
      var startMs = new Date(session.dateStarted).getTime();
      var results = (session.itemResults || []).slice();
      var nowMs = Date.now();
      var endMs = results.length > 0 ? new Date(results[results.length - 1].attemptedAt).getTime() : nowMs;
      var totalMs = endMs - startMs;
      // Per-item durations: each item starts where the previous ended (or
      // at dateStarted for the first). Gaps > 30 min are clamped at 30
      // min so a "left the laptop open overnight" doesn't pollute the
      // active-time estimate.
      var perItem = [];
      var GAP_CAP_MS = 30 * 60 * 1000;
      var cursor = startMs;
      results.forEach(function (r) {
        var t = new Date(r.attemptedAt).getTime();
        var ms = t - cursor;
        if (ms > GAP_CAP_MS) ms = GAP_CAP_MS;
        if (ms < 0) ms = 0;
        perItem.push({ itemId: r.itemId, phase: r.phase, durationMs: ms });
        cursor = t;
      });
      var activeMs = perItem.reduce(function (a, b) { return a + b.durationMs; }, 0);
      return { totalMs: totalMs, activeMs: activeMs, perItem: perItem };
    }
    function formatDuration(ms) {
      if (!ms || ms < 0) return "—";
      var seconds = Math.floor(ms / 1000);
      var minutes = Math.floor(seconds / 60);
      var hours = Math.floor(minutes / 60);
      if (hours > 0) return hours + "h " + (minutes % 60) + "m";
      if (minutes > 0) return minutes + "m " + (seconds % 60) + "s";
      return seconds + "s";
    }
    function formatRelativeTime(iso) {
      if (!iso) return "";
      var ms = Date.now() - new Date(iso).getTime();
      if (ms < 0) return "just now";
      var s = Math.floor(ms / 1000);
      if (s < 60) return "just now";
      var m = Math.floor(s / 60);
      if (m < 60) return m + " min ago";
      var h = Math.floor(m / 60);
      if (h < 24) return h + "h ago";
      var d = Math.floor(h / 24);
      if (d === 1) return "yesterday";
      return d + " days ago";
    }

    // ── Ephemeral UI state ──
    var responseDraftTuple = useState("");
    var responseDraft = responseDraftTuple[0];
    var setResponseDraft = responseDraftTuple[1];
    var observationDraftTuple = useState("");
    var observationDraft = observationDraftTuple[0];
    var setObservationDraft = observationDraftTuple[1];
    // Phase I — structured tag set for the current item (resets on advance)
    var observationTagsDraftTuple = useState([]);
    var observationTagsDraft = observationTagsDraftTuple[0];
    var setObservationTagsDraft = observationTagsDraftTuple[1];
    // A4 — clinician flag: the revealed scaffold rung gave away the answer.
    // Resets on item advance (alongside the other per-item drafts).
    var scaffoldLeakedDraftTuple = useState(false);
    var scaffoldLeakedDraft = scaffoldLeakedDraftTuple[0];
    var setScaffoldLeakedDraft = scaffoldLeakedDraftTuple[1];
    // Access-contrast (modality): clinician flag that the student succeeded on
    // this item ONLY when it was read aloud (reading demand removed), not when
    // reading it themselves. A contemporaneous, controlled modality contrast —
    // direct evidence about whether reading/decoding access gates performance.
    // Resets on item advance.
    var accessReadAloudDraftTuple = useState(false);
    var accessReadAloudDraft = accessReadAloudDraftTuple[0];
    var setAccessReadAloudDraft = accessReadAloudDraftTuple[1];
    // Access-contrast (linguistic load): on-demand simpler-language version of
    // the current item + the flip flag (succeeded only when language simplified).
    // simplifiedTextDraft holds the generated text; simplifiedBusy is the spinner.
    // accessSimplifiedDraft is the per-item flip flag. All reset on advance.
    var simplifiedTextDraftTuple = useState(null);
    var simplifiedTextDraft = simplifiedTextDraftTuple[0];
    var setSimplifiedTextDraft = simplifiedTextDraftTuple[1];
    var simplifiedBusyTuple = useState(false);
    var simplifiedBusy = simplifiedBusyTuple[0];
    var setSimplifiedBusy = simplifiedBusyTuple[1];
    var accessSimplifiedDraftTuple = useState(false);
    var accessSimplifiedDraft = accessSimplifiedDraftTuple[0];
    var setAccessSimplifiedDraft = accessSimplifiedDraftTuple[1];
    // Construct-constant simplification. The KEY validity guard lives in this
    // prompt: simplify ONLY the language, never the problem/numbers/answer/hints.
    function generateSimplifiedItem(itemPrompt) {
      var callGeminiFn = props.callGemini; // module convention: each generator declares its own
      if (typeof callGeminiFn !== "function") { addToast("AI not available — cannot simplify."); return; }
      var p = String(itemPrompt || "").trim();
      if (!p) return;
      setSimplifiedBusy(true);
      Promise.resolve()
        .then(function () {
          return callGeminiFn([
            "Rewrite this assessment item in MUCH simpler English for an English learner.",
            "ABSOLUTE RULES — this is a measurement item, not a teaching moment:",
            "1. Keep the EXACT same problem, the same numbers, names, and quantities, and the same thing being asked.",
            "2. Reduce ONLY vocabulary difficulty and sentence complexity (short sentences, common words, active voice).",
            "3. Do NOT make the problem conceptually easier. Do NOT add hints, steps, examples, or any cue toward the answer.",
            "4. Do NOT change, reveal, or hint at the answer. Do NOT add or remove information.",
            "If you cannot simplify the language without changing the problem, return the item nearly unchanged.",
            "Return ONLY the rewritten item text — no preamble, no quotes, no explanation.",
            "",
            "ITEM:",
            p
          ].join("\n"), false);
        })
        .then(function (raw) {
          var out = String(raw || "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
          if (!out) throw new Error("empty");
          setSimplifiedTextDraft(out);
          setSimplifiedBusy(false);
        })
        .catch(function (e) {
          setSimplifiedBusy(false);
          addToast("Couldn't simplify this item: " + (e && e.message ? e.message : "unknown"));
        });
    }
    // Access-contrast (home language / L1): the clinician's home-language entry
    // (session-stable — NOT reset per item; it's the same student's L1 throughout)
    // + the per-item translated text, spinner, and flip flag (reset per item).
    // Kept separate from daOutputLanguage, which drives item-GENERATION language.
    var homeLangDraftTuple = useState("");
    var homeLangDraft = homeLangDraftTuple[0];
    var setHomeLangDraft = homeLangDraftTuple[1];
    var l1TextDraftTuple = useState(null);
    var l1TextDraft = l1TextDraftTuple[0];
    var setL1TextDraft = l1TextDraftTuple[1];
    var l1BusyTuple = useState(false);
    var l1Busy = l1BusyTuple[0];
    var setL1Busy = l1BusyTuple[1];
    var accessL1DraftTuple = useState(false);
    var accessL1Draft = accessL1DraftTuple[0];
    var setAccessL1Draft = accessL1DraftTuple[1];
    // Construct-constant TRANSLATION. Same validity guard as simplification, plus
    // the output must be a faithful translation (no simplification, no hints). The
    // clinician must verify equivalence with a proficient speaker (caveat surfaced
    // in the lens + reports) — an AI translation is not guaranteed equivalent.
    function generateL1Item(itemPrompt, lang) {
      var callGeminiFn = props.callGemini; // module convention: each generator declares its own
      if (typeof callGeminiFn !== "function") { addToast("AI not available — cannot translate."); return; }
      var p = String(itemPrompt || "").trim();
      var L = String(lang || "").trim();
      if (!p || !L) return;
      setL1Busy(true);
      Promise.resolve()
        .then(function () {
          return callGeminiFn([
            "Translate this assessment item into " + L + " for a student whose home language is " + L + ".",
            "ABSOLUTE RULES — this is a measurement item:",
            "1. Keep the EXACT same problem, numbers, names, quantities, and the same thing being asked.",
            "2. Produce a faithful, natural translation at the SAME complexity — do NOT simplify, do NOT add hints, steps, or examples.",
            "3. Do NOT change, reveal, or hint at the answer. Do NOT add or remove information.",
            "Return ONLY the translated item text in " + L + " — no preamble, no quotes, no English, no explanation.",
            "",
            "ITEM:",
            p
          ].join("\n"), false);
        })
        .then(function (raw) {
          var out = String(raw || "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
          if (!out) throw new Error("empty");
          setL1TextDraft(out);
          setL1Busy(false);
        })
        .catch(function (e) {
          setL1Busy(false);
          addToast("Couldn't translate this item: " + (e && e.message ? e.message : "unknown"));
        });
    }
    function toggleObservationTag(tagId) {
      setObservationTagsDraft(function (prev) {
        if (prev.indexOf(tagId) >= 0) return prev.filter(function (t) { return t !== tagId; });
        return prev.concat([tagId]);
      });
    }

    // ── Phase B — AI mediation transient state ──
    // attempts: log of this item's mediation cycle (only used in AI mode).
    // Cleared on each new item. Each attempt = { response, verdict,
    // levelAfter, scaffoldShown, observationHint }
    var aiAttemptsTuple = useState([]);
    var aiAttempts = aiAttemptsTuple[0];
    var setAiAttempts = aiAttemptsTuple[1];
    var aiBusyTuple = useState(false);
    var aiBusy = aiBusyTuple[0];
    var setAiBusy = aiBusyTuple[1];
    var aiErrorTuple = useState(null);
    var aiError = aiErrorTuple[0];
    var setAiError = aiErrorTuple[1];

    // ── Polish — global keyboard handler ──
    // Esc: back out one level (tour → close; sub-view → start; modal phase
    //      → confirm discard).
    // Cmd/Ctrl+Enter: submit current response in active item phase.
    // Listener attaches once on mount; effect re-binds when current state
    // path changes (so the handler reads the right view).
    useEffect(function () {
      if (typeof document === "undefined") return;
      function onKeyDown(e) {
        // The confirm dialog owns the keyboard while open (its own handler
        // cancels on Escape); don't back-navigate underneath it.
        if (daConfirm) return;
        // Esc — back-navigation
        if (e.key === "Escape" || e.key === "Esc") {
          if (tourStep !== null) { closeTour(); e.preventDefault(); return; }
          if (state.activeSession) {
            // In an active session — let the user confirm discard via
            // existing button (don't auto-discard on Esc; too destructive).
            return;
          }
          // Pre-session sub-view → back to start
          if (startScreenView === "custom-builder") { resetCustomBuilder(); e.preventDefault(); return; }
          if (startScreenView === "custom-review")  { setStartScreenView("custom-builder"); e.preventDefault(); return; }
          if (startScreenView === "sessions")       { setStartScreenView("start"); setSessionFilter(""); e.preventDefault(); return; }
          if (startScreenView === "session-detail") { setStartScreenView("sessions"); setViewingSessionId(null); e.preventDefault(); return; }
          if (startScreenView === "longitudinal")   { setStartScreenView("sessions"); setLongitudinalStudent(null); e.preventDefault(); return; }
          if (startScreenView === "analytics")      { setStartScreenView("sessions"); e.preventDefault(); return; }
          if (startScreenView === "population")     { setStartScreenView("sessions"); e.preventDefault(); return; }
          if (startScreenView === "calibration")    {
            // Inside calibration: Esc goes back one view-stage (feedback→scenario, summary→start, etc.)
            if (calibState.view === "feedback") { updateCalibState({ view: "scenario" }); }
            else if (calibState.view === "summary" || calibState.view === "scenario") {
              daAskConfirm({
                message: "Exit calibration mode? Progress will be discarded.",
                confirmLabel: "Exit calibration",
                onConfirm: function () { resetCalibration(); setStartScreenView("start"); }
              });
            } else { setStartScreenView("start"); }
            e.preventDefault(); return;
          }
          if (startScreenView === "reference")      { setStartScreenView("start"); e.preventDefault(); return; }
          // Top-level start screen with no active session → close the dialog
          // (standard modal Escape behavior; host wrapper never wired it).
          if (startScreenView === "start" && typeof props.onClose === "function") {
            props.onClose(); e.preventDefault(); return;
          }
        }
        // Cmd/Ctrl+Enter — submit response in active item phase
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          if (state.activeSession && state.activeSession.currentPhase !== "summary") {
            // We don't directly trigger submitResponse here because we
            // don't know which scoring path the user intended (auto-check
            // vs mark-correct). Instead we focus the primary submit button
            // so a follow-up Enter activates it.
            try {
              var primary = document.querySelector(".da-root button[data-da-primary='true']");
              if (primary) { primary.click(); e.preventDefault(); }
            } catch (err) { /* ignore */ }
          }
        }
      }
      document.addEventListener("keydown", onKeyDown);
      return function () {
        try { document.removeEventListener("keydown", onKeyDown); } catch (err) { /* ignore */ }
      };
      // eslint-disable-next-line
    }, [tourStep, startScreenView, viewingSessionId, daConfirm, state.activeSession ? state.activeSession.currentPhase : null]);

    // ── Polish — surface localStorage save failures as a toast ──
    // The state mutator pings window.__alloDaStorageFailed on quota errors.
    // We poll lightly on every render of an active session; when the flag
    // flips true we show a single toast and reset it so we don't spam.
    var storageToastShownRef = React.useRef ? React.useRef(false) : { current: false };
    useEffect(function () {
      if (typeof window === "undefined") return;
      if (window.__alloDaStorageFailed && !storageToastShownRef.current) {
        storageToastShownRef.current = true;
        addToast("⚠ Couldn't save to local storage — likely quota full. Your current session will continue but won't persist across reloads. Free up some space and try again.");
      }
      if (!window.__alloDaStorageFailed && storageToastShownRef.current) {
        storageToastShownRef.current = false;
      }
    });

    // Phase Z+ — one-shot resume announcement so the clinician knows the
    // review screen they're seeing came from a previous DA modal-close.
    useEffect(function () {
      if (_resumeAnnouncedRef.current) return;
      if (!_persisted) return;
      if (!Array.isArray(generatedItems) || generatedItems.length === 0) return;
      if (startScreenView !== "custom-review" && startScreenView !== "custom-builder") return;
      _resumeAnnouncedRef.current = true;
      addToast("📋 Resumed your previous probe — " + generatedItems.length + " item" + (generatedItems.length === 1 ? "" : "s") + " in review.");
    }, []);

    // Phase Z+ — persist in-progress probe state so the "Return to DA" pill
    // can restore the review screen. We persist when there are items being
    // reviewed; we CLEAR on the home screen (so a fresh DA open after a
    // completed session doesn't haunt the next student). Listening to
    // startScreenView, generatedItems, customForm covers all the meaningful
    // mid-flow state.
    useEffect(function () {
      if (typeof localStorage === "undefined") return;
      try {
        var hasItems = Array.isArray(generatedItems) && generatedItems.length > 0;
        var midReview = startScreenView === "custom-review" || startScreenView === "custom-builder";
        if (hasItems && midReview) {
          localStorage.setItem(DA_PERSIST_KEY, JSON.stringify({
            _savedAt: Date.now(),
            startScreenView: startScreenView,
            generatedItems: generatedItems,
            customForm: customForm
          }));
        } else if (startScreenView === "start" || (state.activeSession && state.activeSession.currentPhase === "summary")) {
          // Home screen or session completed → wipe stale state.
          localStorage.removeItem(DA_PERSIST_KEY);
        }
      } catch (_) { /* quota/JSON failures non-fatal */ }
    }, [startScreenView, generatedItems, customForm, state.activeSession]);

    // ── Polish — auto-focus the response textarea on phase / item change ──
    // Fires on every (phase, currentItemIdx) tick. Defers to next frame
    // so the textarea is in the DOM. Skips when busy (e.g., AI mode mid-call)
    // so we don't yank focus during an in-flight Gemini request.
    useEffect(function () {
      if (!state.activeSession) return;
      if (state.activeSession.currentPhase === "summary") return;
      if (aiBusy) return;
      var rafId = null;
      try {
        rafId = (window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); })(function () {
          if (responseRef && responseRef.current && typeof responseRef.current.focus === "function") {
            try { responseRef.current.focus(); } catch (e) { /* ignore */ }
          }
        });
      } catch (e) { /* ignore */ }
      return function () {
        if (rafId && window.cancelAnimationFrame) {
          try { window.cancelAnimationFrame(rafId); } catch (e) { /* ignore */ }
        }
      };
      // eslint-disable-next-line
    }, [
      state.activeSession ? state.activeSession.currentPhase : null,
      state.activeSession ? state.activeSession.currentItemIdx : null,
      aiBusy
    ]);

    // ── Rehydrate custom-bank items on mount ──
    // If an active session has a customBankSnapshot, push those items
    // back into ITEMS_BY_ID so the renderer can look them up after a
    // reload. Effect runs once on first render.
    useEffect(function () {
      if (state.activeSession && state.activeSession.isCustomBank && Array.isArray(state.activeSession.customBankSnapshot)) {
        state.activeSession.customBankSnapshot.forEach(function (it) {
          if (it && it.id) ITEMS_BY_ID[it.id] = it;
        });
      }
      // Also rehydrate items from any saved templates (so library-launched
      // sessions resolve their items even after a reload).
      (state.savedProbeTemplates || []).forEach(function (tpl) {
        (tpl.items || []).forEach(function (it) {
          if (it && it.id) ITEMS_BY_ID[it.id] = it;
        });
      });
      // eslint-disable-next-line
    }, []);

    // ── Phase A-bis / F / G — pre-session view router ──
    //   'start'           → built-in start screen
    //   'custom-builder'  → AI probe-generation form (A-bis)
    //   'custom-review'   → review/edit generated items (A-bis)
    //   'sessions'        → all-sessions browser (Phase F)
    //   'session-detail'  → read-only detail of one saved session (Phase F)
    //   'tour'            → onboarding tutorial (Phase G)
    // Phase Z+ — DA state persistence (localStorage). When the user clicks
    // an inline DA-generated resource link, the DA modal closes — and React
    // state is lost. We persist the in-progress review state so reopening
    // DA (via the floating "Return to Dynamic Assessment" pill or the menu)
    // lands the clinician back on the review screen they were on, not the
    // empty home screen. Stored keys are namespaced under DA_PERSIST_KEY.
    var DA_PERSIST_KEY = "alloflow_da_session_state_v1";
    function _loadPersistedDaState() {
      try {
        if (typeof localStorage === "undefined") return null;
        var raw = localStorage.getItem(DA_PERSIST_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        // Stale-cap: drop if older than 24h so a stale review doesn't haunt the next student.
        if (parsed._savedAt && (Date.now() - parsed._savedAt) > 24 * 60 * 60 * 1000) {
          try { localStorage.removeItem(DA_PERSIST_KEY); } catch (_) {}
          return null;
        }
        return parsed;
      } catch (_) { return null; }
    }
    var _persisted = _loadPersistedDaState();
    var _resumeAnnouncedRef = (React.useRef ? React.useRef(false) : { current: false });
    var startScreenViewTuple = useState((_persisted && _persisted.startScreenView) || "start");
    var startScreenView = startScreenViewTuple[0];
    var setStartScreenView = startScreenViewTuple[1];
    // Phase F — which saved session is being viewed in detail mode
    var viewingSessionIdTuple = useState(null);
    var viewingSessionId = viewingSessionIdTuple[0];
    var setViewingSessionId = viewingSessionIdTuple[1];
    // Phase F — student-nickname filter for the sessions browser
    var sessionFilterTuple = useState("");
    var sessionFilter = sessionFilterTuple[0];
    var setSessionFilter = sessionFilterTuple[1];
    // Phase G — current tour step (0..N-1). null = tour closed.
    var tourStepTuple = useState(null);
    var tourStep = tourStepTuple[0];
    var setTourStep = tourStepTuple[1];
    // Phase J — which student name is being viewed in the longitudinal screen
    var longitudinalStudentTuple = useState(null);
    var longitudinalStudent = longitudinalStudentTuple[0];
    var setLongitudinalStudent = longitudinalStudentTuple[1];
    // Phase AA — item analytics filter + sort state
    var analyticsStateTuple = useState({ filterDomain: "all", sortBy: "n", sortDir: "desc", filterFlag: "all" });
    var analyticsState = analyticsStateTuple[0];
    var setAnalyticsState = analyticsStateTuple[1];
    function updateAnalyticsState(patch) {
      setAnalyticsState(function (prev) { return Object.assign({}, prev, patch); });
    }

    // Phase Z — calibration mode state
    var calibStateTuple = useState({
      view: "start",     // 'start' | 'scenario' | 'feedback' | 'summary'
      scenarioIdx: 0,
      results: [],       // [{ scenarioId, clinicianScore, expertScoring, agreement, mismatches }]
      currentResponse: { finalCorrect: null, supportType: "none", observationTags: [] },
      filterDomain: "all"
    });
    var calibState = calibStateTuple[0];
    var setCalibState = calibStateTuple[1];
    function updateCalibState(patch) {
      setCalibState(function (prev) { return Object.assign({}, prev, patch); });
    }
    function updateCalibResponse(patch) {
      setCalibState(function (prev) {
        return Object.assign({}, prev, { currentResponse: Object.assign({}, prev.currentResponse, patch) });
      });
    }
    function toggleCalibTag(tagId) {
      setCalibState(function (prev) {
        var tags = prev.currentResponse.observationTags || [];
        var idx = tags.indexOf(tagId);
        var nextTags = idx >= 0 ? tags.filter(function (t) { return t !== tagId; }) : tags.concat([tagId]);
        return Object.assign({}, prev, { currentResponse: Object.assign({}, prev.currentResponse, { observationTags: nextTags }) });
      });
    }
    function resetCalibration() {
      setCalibState({
        view: "start",
        scenarioIdx: 0,
        results: [],
        currentResponse: { finalCorrect: null, supportType: "none", observationTags: [] },
        filterDomain: "all"
      });
    }
    // Build filtered scenario list based on calibState.filterDomain
    function getCalibScenarios() {
      if (calibState.filterDomain === "all") return CALIBRATION_SCENARIOS;
      return CALIBRATION_SCENARIOS.filter(function (s) { return s.domain === calibState.filterDomain; });
    }
    // Phase V — pre-session intake (component-level so it survives nav to custom-builder)
    var intakeDraftTuple = useState({
      referralReason: "", hypothesizedBottleneck: "", priorInterventions: "",
      existingAssessmentData: "", specificQuestion: "",
      // Multilingual context — home language(s), English-learner status, years of
      // English instruction. Kept free-text (so intakeFilledCount stays string-safe).
      // Non-empty gates the access-condition lens so it never appears for a
      // monolingual student. (Tier 2 will parse a home language from this for L1 support.)
      languageContext: ""
    });
    var intakeDraft = intakeDraftTuple[0];
    var setIntakeDraft = intakeDraftTuple[1];
    function updateIntakeField(field, value) {
      setIntakeDraft(function (prev) { var n = Object.assign({}, prev); n[field] = value; return n; });
    }
    var intakeFilledCount = Object.keys(intakeDraft).filter(function (k) { return intakeDraft[k] && intakeDraft[k].trim().length > 0; }).length;

    // Polish — ref to the active response textarea so we can auto-focus
    // it when the phase advances (saves the click for examiners).
    var responseRef = (React.useRef ? React.useRef(null) : { current: null });
    var customFormTuple = useState((_persisted && _persisted.customForm && typeof _persisted.customForm === "object")
      ? Object.assign({ domain: "math", gradeBand: "4-5", construct: "", bottleneck: "", context: "", itemCount: 3, mode: "clinician" }, _persisted.customForm)
      : { domain: "math", gradeBand: "4-5", construct: "", bottleneck: "", context: "", itemCount: 3, mode: "clinician" });
    var customForm = customFormTuple[0];
    var setCustomForm = customFormTuple[1];
    var generatedItemsTuple = useState((_persisted && Array.isArray(_persisted.generatedItems)) ? _persisted.generatedItems : []);
    var generatedItems = generatedItemsTuple[0];
    var setGeneratedItems = generatedItemsTuple[1];
    // Also restore customForm if persisted (so "Edit spec" path doesn't reset their inputs).
    // customForm useState declaration is just above — we override after the fact via an effect.
    var genBusyTuple = useState(false);
    var genBusy = genBusyTuple[0];
    var setGenBusy = genBusyTuple[1];
    var genErrorTuple = useState(null);
    var genError = genErrorTuple[0];
    var setGenError = genErrorTuple[1];
    // Phase Y — multi-stage generation tracking
    var genStageTuple = useState(null);   // null | 'draft' | 'critique' | 'refine'
    var genStage = genStageTuple[0];
    var setGenStage = genStageTuple[1];
    var useSelfCritiqueTuple = useState(true); // Default ON for SOTA quality
    var useSelfCritique = useSelfCritiqueTuple[0];
    var setUseSelfCritique = useSelfCritiqueTuple[1];
    var saveTemplateTuple = useState(false);  // Save-to-library checkbox state
    var saveTemplate = saveTemplateTuple[0];
    var setSaveTemplate = saveTemplateTuple[1];
    var templateNameTuple = useState("");
    var templateName = templateNameTuple[0];
    var setTemplateName = templateNameTuple[1];
    // Phase K — IEP goal generation state
    var iepGoalsTuple = useState([]);             // Array of generated goal objects
    var iepGoals = iepGoalsTuple[0];
    var setIepGoals = iepGoalsTuple[1];
    var iepBusyTuple = useState(false);
    var iepBusy = iepBusyTuple[0];
    var setIepBusy = iepBusyTuple[1];
    var iepErrorTuple = useState(null);
    var iepError = iepErrorTuple[0];
    var setIepError = iepErrorTuple[1];
    var iepPanelOpenTuple = useState(false);     // Whether the IEP goals panel is visible on the summary
    var iepPanelOpen = iepPanelOpenTuple[0];
    var setIepPanelOpen = iepPanelOpenTuple[1];
    // Phase Q — accommodations generation state
    var accommodationsTuple = useState([]);      // Array of generated accommodation objects
    var accommodations = accommodationsTuple[0];
    var setAccommodations = accommodationsTuple[1];
    var accomBusyTuple = useState(false);
    var accomBusy = accomBusyTuple[0];
    var setAccomBusy = accomBusyTuple[1];
    var accomErrorTuple = useState(null);
    var accomError = accomErrorTuple[0];
    var setAccomError = accomErrorTuple[1];
    var accomPanelOpenTuple = useState(false);
    var accomPanelOpen = accomPanelOpenTuple[0];
    var setAccomPanelOpen = accomPanelOpenTuple[1];
    // Phase S — family-facing plain-language summary
    var familySummaryTuple = useState(null);     // single summary object or null
    var familySummary = familySummaryTuple[0];
    var setFamilySummary = familySummaryTuple[1];
    var familyBusyTuple = useState(false);
    var familyBusy = familyBusyTuple[0];
    var setFamilyBusy = familyBusyTuple[1];
    var familyErrorTuple = useState(null);
    var familyError = familyErrorTuple[0];
    var setFamilyError = familyErrorTuple[1];
    var familyPanelOpenTuple = useState(false);
    var familyPanelOpen = familyPanelOpenTuple[0];
    var setFamilyPanelOpen = familyPanelOpenTuple[1];
    // Phase T — teacher / case manager handoff
    var teacherHandoffTuple = useState(null);
    var teacherHandoff = teacherHandoffTuple[0];
    var setTeacherHandoff = teacherHandoffTuple[1];
    var teacherBusyTuple = useState(false);
    var teacherBusy = teacherBusyTuple[0];
    var setTeacherBusy = teacherBusyTuple[1];
    var teacherErrorTuple = useState(null);
    var teacherError = teacherErrorTuple[0];
    var setTeacherError = teacherErrorTuple[1];
    var teacherPanelOpenTuple = useState(false);
    var teacherPanelOpen = teacherPanelOpenTuple[0];
    var setTeacherPanelOpen = teacherPanelOpenTuple[1];
    // Phase X — progress monitoring plan
    var progressMonitoringTuple = useState(null);
    var progressMonitoring = progressMonitoringTuple[0];
    var setProgressMonitoring = progressMonitoringTuple[1];
    var monitoringBusyTuple = useState(false);
    var monitoringBusy = monitoringBusyTuple[0];
    var setMonitoringBusy = monitoringBusyTuple[1];
    var monitoringErrorTuple = useState(null);
    var monitoringError = monitoringErrorTuple[0];
    var setMonitoringError = monitoringErrorTuple[1];
    var monitoringPanelOpenTuple = useState(false);
    var monitoringPanelOpen = monitoringPanelOpenTuple[0];
    var setMonitoringPanelOpen = monitoringPanelOpenTuple[1];

    // ── Start-screen draft state ──
    // Lifted out of renderStartScreen() because a function-scope useState
    // inside a render branch fires conditionally (only when the start screen
    // actually renders), which breaks React's hook-order invariant on the
    // first transition into an active session. See:
    //   https://reactjs.org/link/invalid-hook-call
    var nicknameDraftTuple = useState("");
    var nicknameDraft = nicknameDraftTuple[0];
    var setNicknameDraft = nicknameDraftTuple[1];
    var difficultyDraftTuple = useState("easy");
    var difficultyDraft = difficultyDraftTuple[0];
    var setDifficultyDraft = difficultyDraftTuple[1];
    var modeDraftTuple = useState("clinician");
    var modeDraft = modeDraftTuple[0];
    var setModeDraft = modeDraftTuple[1];
    var domainDraftTuple = useState("math");
    var domainDraft = domainDraftTuple[0];
    var setDomainDraft = domainDraftTuple[1];

    // Auto-show the onboarding tour on first ever open. Lifted from below the
    // render dispatch (where it was unreachable because every branch returns
    // before it) up to the top of the component body where it actually runs.
    useEffect(function () {
      if (!state.onboardingSeen && (!state.sessions || state.sessions.length === 0) && !state.activeSession) {
        setTourStep(0);
      }
      // eslint-disable-next-line
    }, []);

    // ── Helpers ──
    var addToast = props.addToast || function (msg) { announce(msg); };

    // ── Phase Z — inline resource-link rewriter ──
    // Parses `[title](resource:id)` tokens in a string and returns an array of
    // React children (plain text segments + clickable spans). Mirrors the host's
    // Lesson Plan link pattern. When the user clicks the rendered chip, we
    // delegate to props.onOpenResource(resourceId) so the host (which owns the
    // resource pack + history) handles the navigation. If onOpenResource isn't
    // wired, the chip falls back to an addToast message ("Open in resource pack
    // — host link not wired").
    function renderTextWithResourceLinks(text, keyPrefix) {
      if (!text || typeof text !== "string") return text || "";
      // Fast path: no token in the string → return as-is so we don't allocate.
      if (text.indexOf("](resource:") < 0) return text;
      var out = [];
      var re = /\[([^\]\n]+)\]\(resource:([a-zA-Z0-9_-]+)\)/g;
      var last = 0;
      var match;
      var i = 0;
      while ((match = re.exec(text)) !== null) {
        if (match.index > last) out.push(text.slice(last, match.index));
        var title = match[1];
        var resId = match[2];
        out.push(h("button", {
          key: (keyPrefix || "rl") + "-" + (i++) + "-" + resId,
          type: "button",
          onClick: function (e) {
            try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
            if (typeof props.onOpenResource === "function") {
              props.onOpenResource(resId);
            } else {
              addToast("Open in resource pack — host link not wired");
            }
          },
          title: "Open: " + title + " (resource " + resId.slice(0, 8) + "…)",
          style: {
            display: "inline-flex", alignItems: "center", gap: 4,
            margin: "0 2px", padding: "1px 8px",
            background: "var(--da-indigo-tint)", color: "var(--da-indigo-text)",
            border: "1px solid var(--da-indigo-border)", borderRadius: 999,
            fontSize: "0.85em", fontWeight: 700, fontFamily: "inherit",
            cursor: "pointer", textDecoration: "none", verticalAlign: "baseline"
          }
        }, "🔗 ", title));
        last = match.index + match[0].length;
      }
      if (last < text.length) out.push(text.slice(last));
      return out.length === 0 ? text : out;
    }

    function startSession(opts) {
      // opts: { studentNickname, domain, difficulty, mode, customBank? }
      // If opts.customBank is an array of item objects, those become the
      // session's items (Phase A-bis path). Items are added to a
      // session-scoped ITEMS_BY_ID extension so the renderer can look
      // them up without modifying the global bank.
      var sessionItems;
      var customItems = Array.isArray(opts.customBank) ? opts.customBank : null;
      if (customItems && customItems.length > 0) {
        // Mirror custom items into the runtime lookup so renderActivePhase
        // can resolve them via ITEMS_BY_ID.
        customItems.forEach(function (it) {
          if (it && it.id) ITEMS_BY_ID[it.id] = it;
        });
        sessionItems = customItems.map(function (it) { return it.id; });
      } else {
        var pool = getItemsByDomainAndDifficulty(opts.domain || "math", opts.difficulty || "easy");
        var itemIds = pool.map(function (it) { return it.id; });
        sessionItems = itemIds.slice(0, 6);
      }
      var session = {
        id: "da-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        studentNickname: opts.studentNickname || "",
        domain: opts.domain || "math",
        difficulty: opts.difficulty || (customItems ? "custom" : "easy"),
        mode: opts.mode || "clinician",
        isCustomBank: !!customItems,
        customBankSnapshot: customItems ? customItems.slice() : null,  // Persisted so reloads work
        dateStarted: new Date().toISOString(),
        sessionItemIds: sessionItems,
        currentPhase: "pretest",
        currentItemIdx: 0,
        itemResults: [],
        sessionNote: "",
        currentLadderLevel: 0,
        // Phase V — pre-session intake context (referral question + existing data)
        intake: opts.intake && typeof opts.intake === "object" ? {
          referralReason: String(opts.intake.referralReason || "").slice(0, 2000),
          hypothesizedBottleneck: String(opts.intake.hypothesizedBottleneck || "").slice(0, 2000),
          priorInterventions: String(opts.intake.priorInterventions || "").slice(0, 2000),
          existingAssessmentData: String(opts.intake.existingAssessmentData || "").slice(0, 2000),
          specificQuestion: String(opts.intake.specificQuestion || "").slice(0, 1000),
          languageContext: String(opts.intake.languageContext || "").slice(0, 1000)
        } : null
      };
      patch({ activeSession: session });
      setResponseDraft("");
      setObservationDraft("");
      setScaffoldLeakedDraft(false);
      setAccessReadAloudDraft(false);
      setSimplifiedTextDraft(null);
      setSimplifiedBusy(false);
      setAccessSimplifiedDraft(false);
      setL1TextDraft(null);
      setL1Busy(false);
      setAccessL1Draft(false);
      announce("Session started. Pretest phase, item 1.");
    }

    // ─── Phase A-bis — Generate items via Gemini ───
    // form: { domain, gradeBand, construct, bottleneck, context, itemCount }
    // Calls Gemini with the strict-JSON prompt, parses, validates, and
    // sets generatedItems. Sets startScreenView to 'custom-review' on
    // success. Bails with an error banner if the call fails or the shape
    // is invalid.
    // Phase Y — Multi-stage generation pipeline.
    //   Stage 1 (draft):     existing single-shot generation
    //   Stage 2 (critique):  Gemini reviews its own draft against 5 quality criteria
    //   Stage 3 (refine):    Gemini applies the called-out fixes
    // Stages 2-3 only run when useSelfCritique is true (default ON).
    // Falls back to draft-only if any later stage fails — better to ship
    // an unrefined item than a broken pipeline.
    function generateCustomProbe(form) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setGenError("AI generation requires the host to provide callGemini. The tool is currently running without AI plumbing.");
        return;
      }
      setGenBusy(true);
      setGenError(null);
      setGenStage("draft");

      // Phase Z — Bundle the host callbacks DA uses to spawn supplementary
      // resources. If the host hasn't wired them yet (older callers), the
      // orchestrator silently no-ops and items render without inline links.
      var hostCallbacks = {
        onGenerateGlossary: typeof props.onGenerateGlossary === "function" ? props.onGenerateGlossary : null,
        onGenerateManipulative: typeof props.onGenerateManipulative === "function" ? props.onGenerateManipulative : null,
        onGenerateWordSoundsProbe: typeof props.onGenerateWordSoundsProbe === "function" ? props.onGenerateWordSoundsProbe : null,
        // Phase 4 + sentence-frames: these MUST be bundled too, or the orchestrator
        // (which reads them off hostCallbacks) silently drops every AI-auto-attached
        // visual-organizer / sentence-frames support. (The manual "+ Add" buttons
        // call props.onGenerate* directly, which masked this.)
        onGenerateVisualOrganizer: typeof props.onGenerateVisualOrganizer === "function" ? props.onGenerateVisualOrganizer : null,
        onGenerateSentenceFrames: typeof props.onGenerateSentenceFrames === "function" ? props.onGenerateSentenceFrames : null,
        // Manifest of existing DA-generated resources (the same one passed into the prompt).
        // The orchestrator's REUSE branch reads this to confirm the id Gemini referenced
        // still exists and to grab the title for the link chip.
        daResourceManifest: Array.isArray(props.daResourceManifest) ? props.daResourceManifest : []
      };

      // Helper: terminal "we're done" step. Runs Phase Z supports generation
      // first (sequential, with progress UI), then commits items + closes UI.
      // Used at all 5 exit points in the pipeline (success + each fallback).
      function finalizeAndCommit(items, announceMsg) {
        // No supports callbacks wired AT ALL, OR none of the items declared
        // any supplementaryResources → fast-path skip the orchestrator entirely.
        var anySupps = (items || []).some(function (it) {
          return it && Array.isArray(it.supplementaryResources) && it.supplementaryResources.length > 0;
        });
        var anyCallback = hostCallbacks.onGenerateGlossary || hostCallbacks.onGenerateManipulative || hostCallbacks.onGenerateWordSoundsProbe || hostCallbacks.onGenerateVisualOrganizer || hostCallbacks.onGenerateSentenceFrames;
        // Reuse entries don't need any host callback — the orchestrator handles
        // them inline. So we should still enter the orchestrator if there's any
        // reuse entry, even if no generator callbacks are wired.
        var anyReuse = (items || []).some(function (it) {
          return it && Array.isArray(it.supplementaryResources) && it.supplementaryResources.some(function (sr) {
            return sr && sr.kind === "reuse" && sr.existingResourceId;
          });
        });
        if ((!anyCallback && !anyReuse) || !anySupps) {
          setGeneratedItems(items);
          setGenBusy(false);
          setGenStage(null);
          setStartScreenView("custom-review");
          announce(announceMsg);
          return;
        }
        setGenStage("supports");
        generateDaSupportsForBank(items, hostCallbacks).then(function (finalItems) {
          var generatedCount = 0;
          finalItems.forEach(function (it) {
            (it.supplementaryResources || []).forEach(function (sr) {
              if (sr && sr.status === "generated") generatedCount++;
            });
          });
          setGeneratedItems(finalItems);
          setGenBusy(false);
          setGenStage(null);
          setStartScreenView("custom-review");
          var supportNote = generatedCount > 0
            ? " · " + generatedCount + " inline support" + (generatedCount === 1 ? "" : "s") + " attached"
            : "";
          announce(announceMsg + supportNote);
        }).catch(function (err) {
          // Orchestrator never throws (each item is caught individually), but be defensive.
          try { console.warn("[DA Phase Z] Supports orchestrator unexpected throw:", err); } catch (_) {}
          setGeneratedItems(items);
          setGenBusy(false);
          setGenStage(null);
          setStartScreenView("custom-review");
          announce(announceMsg);
        });
      }

      // Stage 1 — Draft generation
      var draftPrompt = buildCustomProbePrompt(form, daOutputLanguage, props.daResourceManifest);
      Promise.resolve()
        .then(function () { return callGeminiFn(draftPrompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var arr = parseCustomProbeResponse(raw);
          if (!arr || arr.length === 0) {
            throw new Error("AI returned an unexpected shape on draft generation.");
          }
          var validated = arr.slice(0, parseInt(form.itemCount, 10) || 3)
            .map(function (it, i) { return validateGeneratedItem(it, i); });
          var draftItems = validated.map(function (v, i) {
            if (!v.item) return null;
            // Stamp draft index so critique can match back.
            v.item._itemIndex = i;
            // Run Phase Y deep validators alongside basic validation
            var extraWarnings = runPhaseYValidators(v.item);
            v.item._generationWarnings = (v.item._generationWarnings || []).concat(extraWarnings);
            return v.item;
          }).filter(function (x) { return !!x; });

          if (draftItems.length === 0) {
            throw new Error("AI items failed validation. Try regenerating, or simplify the spec.");
          }

          // If self-critique is OFF, ship the draft as-is (after Phase Z supports).
          if (!useSelfCritique) {
            finalizeAndCommit(draftItems, "Generated " + draftItems.length + " items (self-critique disabled).");
            return null;
          }

          // Stage 2 — Critique
          setGenStage("critique");
          var critiquePrompt = buildCritiquePrompt(draftItems, form, daOutputLanguage);
          return Promise.resolve()
            .then(function () { return callGeminiFn(critiquePrompt); })
            .then(function (critiqueOut) {
              var critiqueRaw = typeof critiqueOut === "string" ? critiqueOut : (critiqueOut && critiqueOut.text) || "";
              var critiques = parseCritiqueResponse(critiqueRaw);
              if (!critiques || critiques.length === 0) {
                // Critique failed — fall back to draft-only with a soft note
                draftItems.forEach(function (it) {
                  it._critiqueSkipped = true;
                });
                finalizeAndCommit(draftItems, "Generated " + draftItems.length + " items. Self-critique pass returned no results — review carefully.");
                return null;
              }

              // Attach critique notes to each draft item for transparency.
              draftItems.forEach(function (it) {
                var c = critiques.filter(function (cc) { return cc.itemIndex === it._itemIndex; })[0];
                if (c) {
                  it._critique = c;
                }
              });

              // If all items are 'good', skip refinement.
              var needsRefinement = critiques.some(function (c) { return c.overallQuality !== "good" && c.issues.length > 0; });
              if (!needsRefinement) {
                finalizeAndCommit(draftItems, "Generated " + draftItems.length + " items. Self-critique pass found no issues.");
                return null;
              }

              // Stage 3 — Refinement
              setGenStage("refine");
              var refinePrompt = buildRefinementPrompt(draftItems, critiques, form, daOutputLanguage);
              return Promise.resolve()
                .then(function () { return callGeminiFn(refinePrompt); })
                .then(function (refineOut) {
                  var refineRaw = typeof refineOut === "string" ? refineOut : (refineOut && refineOut.text) || "";
                  var refinedArr = parseRefinementResponse(refineRaw);
                  if (!refinedArr || refinedArr.length === 0) {
                    // Refinement failed — ship draft with critique notes
                    draftItems.forEach(function (it) {
                      if (it._critique && it._critique.issues.length > 0) {
                        it._refinementSkipped = true;
                      }
                    });
                    finalizeAndCommit(draftItems, "Generated " + draftItems.length + " items. Critique flagged issues but refinement pass failed — review carefully.");
                    return null;
                  }

                  // Apply refinements onto the matched draft items.
                  var finalItems = draftItems.slice();
                  refinedArr.forEach(function (refined) {
                    var origIdx = refined.originalItemIndex;
                    if (typeof origIdx !== "number") return;
                    var matchIdx = finalItems.findIndex(function (it) { return it._itemIndex === origIdx; });
                    if (matchIdx < 0) return;
                    // Re-validate the refined item shape
                    var v = validateGeneratedItem(refined, origIdx);
                    if (!v.item) return;
                    // Re-run Phase Y validators
                    var extraWarnings = runPhaseYValidators(v.item);
                    v.item._generationWarnings = (v.item._generationWarnings || []).concat(extraWarnings);
                    // Preserve the original critique + add the refinement note
                    v.item._itemIndex = origIdx;
                    v.item._critique = finalItems[matchIdx]._critique;
                    v.item._refined = true;
                    v.item._refinementNotes = String(refined._refinementNotes || "Refined based on critique").trim();
                    finalItems[matchIdx] = v.item;
                  });

                  var refinedCount = finalItems.filter(function (it) { return it._refined; }).length;
                  finalizeAndCommit(finalItems, "Generated " + finalItems.length + " items. " + refinedCount + " refined based on self-critique.");
                  return null;
                });
            });
        })
        .catch(function (err) {
          setGenBusy(false);
          setGenStage(null);
          setGenError("AI generation failed: " + (err && err.message ? err.message : "unknown error") + ". Try again in a moment.");
        });
    }

    // Regenerate just ONE scaffold step (L1 / L2 / L3 / L4) at the given
    // item index + level. Keeps all other levels + the rest of the item
    // intact. Useful when 3 of 4 scaffold rungs are good but one needs
    // another pass — much cheaper + faster than re-rolling the whole item.
    // levelNum is 1-4. Returns silently on host/setup errors so the UI
    // surface (the small ↻ button) can stay quiet on failure.
    function regenerateOneScaffoldStep(idx, levelNum) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setGenError("AI regeneration requires the host to provide callGemini.");
        return;
      }
      var item = generatedItems[idx];
      if (!item) return;
      var labelByLevel = { 1: "L1 declarative cue", 2: "L2 leading question", 3: "L3 modeling", 4: "L4 direct teach" };
      var label = labelByLevel[levelNum];
      if (!label) return;
      // Build a focused prompt that gives Gemini full context (item, answer,
      // current ladder) and asks for ONLY the one level to rewrite.
      var ladder = (item.promptLadder || []).map(function (s) {
        var ln = s && s.level ? ("L" + s.level) : "?";
        return ln + ": " + (s && s.text ? s.text : "");
      }).join("\n");
      var levelGuidance = ({
        1: "L1 (declarative cue): Orient the student to the task without revealing the answer. A meta-cue like 'What is the question asking you to find?' is good. An information cue that paraphrases the answer is BAD. Keep it short (1 sentence).",
        2: "L2 (leading question): Push toward strategy, not toward the answer. Open-ended ('What operation does this call for?' / 'What is the relationship between these details?'). Do NOT use forced binary choices ('Is it X or Y?') because that leaks the answer.",
        3: "L3 (modeling): Show a PARALLEL example with DIFFERENT surface features (different numbers AND different context), then redirect to the original item. Common failure: L3 just restates the canonical answer with extra steps. Avoid that. Use phrases like 'Imagine a different example…' or 'Suppose…'. Then end with 'Now apply that to [the original item].'",
        4: "L4 (direct teach): Give the answer AND the reasoning (1-2 sentences). The answer MUST be present + the reasoning MUST connect to the canonical evidence in the prompt."
      })[levelNum];
      var sysPrompt = [
        "You are a senior school psychologist refining ONE scaffold rung of a Dynamic Assessment item. Output ONLY the new text for the requested level, nothing else.",
        buildLanguageDirective(daOutputLanguage),
        "",
        "ITEM PROMPT: " + (item.prompt || ""),
        "CANONICAL ANSWER: " + (item.correctAnswer || ""),
        "CONSTRUCT: " + (item.construct || "unspecified"),
        "GRADE BAND: " + ((customForm && customForm.gradeBand) || "unspecified"),
        "",
        "CURRENT LADDER:",
        ladder,
        "",
        "REWRITE THIS LEVEL: " + label,
        "",
        "REQUIREMENTS:",
        levelGuidance,
        "",
        "Output the new text for " + label + " ONLY. No 'L4:' prefix, no quotes, no commentary, no markdown. Just the bare new text for that one rung."
      ].join("\n");
      setGenBusy(true);
      setGenError(null);
      Promise.resolve()
        .then(function () { return callGeminiFn(sysPrompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var newText = String(raw || "").trim()
            .replace(/^```(?:json|text)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();
          // Strip a leading "Lx:" or "Lx —" if Gemini added one anyway.
          newText = newText.replace(/^L\s*[1-4]\s*[:\-—]\s*/i, "").trim();
          // Strip wrapping quotes if it returned a quoted string.
          if (newText.length > 2 && /^['"`].*['"`]$/.test(newText)) {
            newText = newText.slice(1, -1).trim();
          }
          if (!newText || newText.length < 4) {
            setGenBusy(false);
            setGenError("Regeneration of " + label + " returned empty/too-short text — original kept.");
            return;
          }
          // Apply patch in-place. editGeneratedItem will re-run Phase Y validators.
          editGeneratedItem(idx, function (i) {
            var newLadder = (i.promptLadder || []).map(function (s) {
              if (!s || s.level !== levelNum) return s;
              return Object.assign({}, s, { text: newText });
            });
            return Object.assign({}, i, { promptLadder: newLadder });
          });
          setGenBusy(false);
          announce(label + " regenerated for item " + (idx + 1) + ".");
        })
        .catch(function (err) {
          setGenBusy(false);
          setGenError("Step regeneration failed: " + (err && err.message ? err.message : "unknown error"));
        });
    }

    // Regenerate just ONE item at the given index, keeping others intact.
    // Useful when 4 of 5 items are good but one needs another pass.
    function regenerateOneItem(idx) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setGenError("AI generation requires the host to provide callGemini.");
        return;
      }
      var formCopy = Object.assign({}, customForm, { itemCount: 1 });
      setGenBusy(true);
      setGenError(null);
      var prompt = buildCustomProbePrompt(formCopy, daOutputLanguage, props.daResourceManifest);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var arr = parseCustomProbeResponse(raw);
          if (!arr || arr.length === 0) {
            setGenBusy(false);
            setGenError("Regeneration returned unexpected shape — original item kept.");
            return;
          }
          var v = validateGeneratedItem(arr[0], idx);
          if (!v.item) {
            setGenBusy(false);
            setGenError("Regenerated item failed validation — original item kept.");
            return;
          }
          // Phase Y — Run the deep validators on the regenerated item too.
          var extraWarnings = runPhaseYValidators(v.item);
          v.item._generationWarnings = (v.item._generationWarnings || []).concat(extraWarnings);
          // Clear any prior critique notes since this is a fresh draft.
          v.item._critique = null;
          v.item._refined = false;
          v.item._refinementNotes = null;
          var next = generatedItems.slice();
          next[idx] = v.item;
          setGeneratedItems(next);
          setGenBusy(false);
          announce("Item " + (idx + 1) + " regenerated.");
        })
        .catch(function (err) {
          setGenBusy(false);
          setGenError("Regeneration failed: " + (err && err.message ? err.message : "unknown error"));
        });
    }

    // Save the current generated bank as a reusable template.
    function saveProbeTemplate(form, items) {
      var name = (templateName || "").trim() || (form.construct || "Custom probe") + " · " + form.gradeBand;
      var template = {
        id: "tpl-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: name.slice(0, 80),
        domain: form.domain,
        gradeBand: form.gradeBand,
        construct: form.construct,
        bottleneck: form.bottleneck,
        items: items.slice(),
        createdAt: new Date().toISOString()
      };
      patch({ savedProbeTemplates: (state.savedProbeTemplates || []).concat([template]) });
      announce("Probe template saved.");
      return template;
    }

    function deleteProbeTemplate(id) {
      patch({ savedProbeTemplates: (state.savedProbeTemplates || []).filter(function (t) { return t.id !== id; }) });
    }

    // Phase K — generate IEP goals from the current active session
    function generateIepGoalsForSession(session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setIepError("AI generation requires the host to provide callGemini.");
        return;
      }
      if (!session || !session.itemResults || session.itemResults.length === 0) {
        setIepError("No completed session data available to draft goals from.");
        return;
      }
      setIepBusy(true);
      setIepError(null);
      var prompt = buildIepGoalPrompt(session, session.studentNickname, daOutputLanguage);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var arr = parseIepGoalResponse(raw);
          if (!arr || arr.length === 0) {
            setIepBusy(false);
            setIepError("AI returned an unexpected shape. Try again, or edit the goal manually.");
            return;
          }
          var validated = arr.slice(0, 4).map(function (g, i) { return validateIepGoal(g, i); });
          var goals = validated.map(function (v) { return v.goal; }).filter(function (g) { return !!g; });
          if (goals.length === 0) {
            setIepBusy(false);
            setIepError("Generated goals failed validation. Try regenerating.");
            return;
          }
          setIepGoals(goals);
          setIepBusy(false);
          setIepPanelOpen(true);
          announce("Generated " + goals.length + " IEP goals. Review screen open.");
        })
        .catch(function (err) {
          setIepBusy(false);
          setIepError("AI call failed: " + (err && err.message ? err.message : "unknown error") + ". Try again in a moment.");
        });
    }

    // Regenerate just ONE goal at the given index.
    function regenerateOneIepGoal(idx, session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") { setIepError("AI generation requires callGemini."); return; }
      setIepBusy(true);
      setIepError(null);
      var prompt = buildIepGoalPrompt(session, session.studentNickname, daOutputLanguage) +
        "\n\nIMPORTANT: This is a regeneration request — return only ONE goal (single-element JSON array) covering a different angle than goals previously generated.";
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var arr = parseIepGoalResponse(raw);
          if (!arr || arr.length === 0) { setIepBusy(false); setIepError("Regeneration returned unexpected shape — original goal kept."); return; }
          var v = validateIepGoal(arr[0], idx);
          if (!v.goal) { setIepBusy(false); setIepError("Regenerated goal failed validation."); return; }
          var next = iepGoals.slice();
          next[idx] = v.goal;
          setIepGoals(next);
          setIepBusy(false);
          announce("Goal " + (idx + 1) + " regenerated.");
        })
        .catch(function (err) {
          setIepBusy(false);
          setIepError("Regeneration failed: " + (err && err.message ? err.message : "unknown error"));
        });
    }

    // In-place edits for clinician fine-tuning. Touch any field on goal idx.
    function updateIepGoalField(idx, field, value) {
      setIepGoals(function (prev) {
        var next = prev.slice();
        if (!next[idx]) return prev;
        var updated = Object.assign({}, next[idx]);
        updated[field] = value;
        next[idx] = updated;
        return next;
      });
    }

    function updateIepShortTermObjective(idx, stoIdx, value) {
      setIepGoals(function (prev) {
        var next = prev.slice();
        if (!next[idx]) return prev;
        var updated = Object.assign({}, next[idx]);
        var stos = (updated.shortTermObjectives || []).slice();
        stos[stoIdx] = value;
        updated.shortTermObjectives = stos;
        next[idx] = updated;
        return next;
      });
    }

    function removeIepGoal(idx) {
      setIepGoals(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); });
    }

    function copyTextToClipboard(text) {
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(function () { addToast("Copied to clipboard."); });
        }
      } catch (e) {}
      // Fallback for older browsers
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        addToast("Copied to clipboard.");
      } catch (e) { addToast("Copy failed — select + copy manually."); }
    }

    // ── Phase Q — Accommodations generation ──
    function generateAccommodationsForSession(session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setAccomError("AI generation requires the host to provide callGemini.");
        return;
      }
      if (!session || !session.itemResults || session.itemResults.length === 0) {
        setAccomError("No completed session data available to draft accommodations from.");
        return;
      }
      setAccomBusy(true);
      setAccomError(null);
      var prompt = buildAccommodationsPrompt(session, session.studentNickname, daOutputLanguage);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var arr = parseAccommodationsResponse(raw);
          if (!arr || arr.length === 0) {
            setAccomBusy(false);
            setAccomError("AI returned an unexpected shape. Try again, or edit accommodations manually.");
            return;
          }
          var validated = arr.slice(0, 7).map(function (a, i) { return validateAccommodation(a, i); });
          var accoms = validated.map(function (v) { return v.accom; }).filter(function (a) { return !!a; });
          if (accoms.length === 0) {
            setAccomBusy(false);
            setAccomError("Generated accommodations failed validation. Try regenerating.");
            return;
          }
          setAccommodations(accoms);
          setAccomBusy(false);
          setAccomPanelOpen(true);
          announce("Generated " + accoms.length + " accommodations. Review screen open.");
        })
        .catch(function (err) {
          setAccomBusy(false);
          setAccomError("AI call failed: " + (err && err.message ? err.message : "unknown error") + ". Try again in a moment.");
        });
    }

    function regenerateOneAccommodation(idx, session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") { setAccomError("AI generation requires callGemini."); return; }
      setAccomBusy(true);
      setAccomError(null);
      var prompt = buildAccommodationsPrompt(session, session.studentNickname, daOutputLanguage) +
        "\n\nIMPORTANT: This is a regeneration request — return only ONE accommodation (single-element JSON array) covering a different angle than accommodations previously generated.";
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var arr = parseAccommodationsResponse(raw);
          if (!arr || arr.length === 0) { setAccomBusy(false); setAccomError("Regeneration returned unexpected shape — original kept."); return; }
          var v = validateAccommodation(arr[0], idx);
          if (!v.accom) { setAccomBusy(false); setAccomError("Regenerated accommodation failed validation."); return; }
          var next = accommodations.slice();
          next[idx] = v.accom;
          setAccommodations(next);
          setAccomBusy(false);
          announce("Accommodation " + (idx + 1) + " regenerated.");
        })
        .catch(function (err) {
          setAccomBusy(false);
          setAccomError("Regeneration failed: " + (err && err.message ? err.message : "unknown error"));
        });
    }

    function updateAccommodationField(idx, field, value) {
      setAccommodations(function (prev) {
        var next = prev.slice();
        if (!next[idx]) return prev;
        var updated = Object.assign({}, next[idx]);
        updated[field] = value;
        next[idx] = updated;
        return next;
      });
    }

    function removeAccommodation(idx) {
      setAccommodations(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); });
    }

    function formatAccommodationForClipboard(a) {
      var lines = [];
      lines.push(a.title);
      lines.push("Category: " + (ACCOM_CATEGORY_LABELS[a.category] || a.category) + " · UDL: " + (UDL_PRINCIPLE_LABELS[a.udlPrinciple] || a.udlPrinciple));
      lines.push("");
      lines.push(a.description);
      if (a.rationale) { lines.push(""); lines.push("Rationale: " + a.rationale); }
      return lines.join("\n");
    }

    // ── Phase S — Family summary generation ──
    function generateFamilySummaryForSession(session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setFamilyError("AI generation requires the host to provide callGemini.");
        return;
      }
      if (!session || !session.itemResults || session.itemResults.length === 0) {
        setFamilyError("No completed session data available to draft a family summary from.");
        return;
      }
      setFamilyBusy(true);
      setFamilyError(null);
      var prompt = buildFamilySummaryPrompt(session, session.studentNickname, daOutputLanguage);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var parsed = parseFamilySummaryResponse(raw);
          if (!parsed) {
            setFamilyBusy(false);
            setFamilyError("AI returned an unexpected shape. Try again, or edit the summary manually.");
            return;
          }
          var v = validateFamilySummary(parsed);
          if (!v.summary) {
            setFamilyBusy(false);
            setFamilyError("Generated summary failed validation. Try regenerating.");
            return;
          }
          setFamilySummary(v.summary);
          setFamilyBusy(false);
          setFamilyPanelOpen(true);
          announce("Family summary generated. Review screen open.");
        })
        .catch(function (err) {
          setFamilyBusy(false);
          setFamilyError("AI call failed: " + (err && err.message ? err.message : "unknown error") + ". Try again in a moment.");
        });
    }

    function updateFamilySummaryField(field, value) {
      setFamilySummary(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next[field] = value;
        return next;
      });
    }

    function updateFamilyQuestion(qIdx, value) {
      setFamilySummary(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        var qs = (next.questions_for_team || []).slice();
        qs[qIdx] = value;
        next.questions_for_team = qs;
        return next;
      });
    }

    function addFamilyQuestion() {
      setFamilySummary(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next.questions_for_team = (next.questions_for_team || []).concat([""]);
        return next;
      });
    }

    function removeFamilyQuestion(qIdx) {
      setFamilySummary(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next.questions_for_team = (next.questions_for_team || []).filter(function (_, i) { return i !== qIdx; });
        return next;
      });
    }

    function formatFamilySummaryForClipboard(summary, studentName) {
      if (!summary) return "";
      var name = studentName || "your child";
      var lines = [];
      lines.push("Dear family,");
      lines.push("");
      FAMILY_SECTION_ORDER.forEach(function (key) {
        if (key === "questions_for_team") {
          if (Array.isArray(summary[key]) && summary[key].length > 0) {
            lines.push(FAMILY_SECTION_LABELS[key]);
            summary[key].forEach(function (q, qi) { lines.push("  " + (qi + 1) + ". " + q); });
            lines.push("");
          }
        } else if (summary[key]) {
          lines.push(FAMILY_SECTION_LABELS[key]);
          lines.push(summary[key]);
          lines.push("");
        }
      });
      lines.push("If you have any questions, please reach out anytime.");
      return lines.join("\n");
    }

    // ── Phase T — Teacher handoff generation ──
    function generateTeacherHandoffForSession(session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setTeacherError("AI generation requires the host to provide callGemini.");
        return;
      }
      if (!session || !session.itemResults || session.itemResults.length === 0) {
        setTeacherError("No completed session data available to draft a handoff from.");
        return;
      }
      setTeacherBusy(true);
      setTeacherError(null);
      var prompt = buildTeacherHandoffPrompt(session, session.studentNickname, daOutputLanguage);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var parsed = parseTeacherHandoffResponse(raw);
          if (!parsed) {
            setTeacherBusy(false);
            setTeacherError("AI returned an unexpected shape. Try again, or edit manually.");
            return;
          }
          var v = validateTeacherHandoff(parsed);
          if (!v.handoff) {
            setTeacherBusy(false);
            setTeacherError("Generated handoff failed validation. Try regenerating.");
            return;
          }
          setTeacherHandoff(v.handoff);
          setTeacherBusy(false);
          setTeacherPanelOpen(true);
          announce("Teacher handoff generated.");
        })
        .catch(function (err) {
          setTeacherBusy(false);
          setTeacherError("AI call failed: " + (err && err.message ? err.message : "unknown error") + ". Try again in a moment.");
        });
    }

    function updateTeacherField(field, value) {
      setTeacherHandoff(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next[field] = value;
        return next;
      });
    }

    function updateTeacherArrayItem(field, idx, value) {
      setTeacherHandoff(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        var arr = (next[field] || []).slice();
        arr[idx] = value;
        next[field] = arr;
        return next;
      });
    }

    function updateTeacherObjectArrayField(field, idx, subfield, value) {
      setTeacherHandoff(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        var arr = (next[field] || []).slice();
        if (!arr[idx]) return prev;
        var item = Object.assign({}, arr[idx]);
        item[subfield] = value;
        arr[idx] = item;
        next[field] = arr;
        return next;
      });
    }

    function removeTeacherArrayItem(field, idx) {
      setTeacherHandoff(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next[field] = (next[field] || []).filter(function (_, i) { return i !== idx; });
        return next;
      });
    }

    function formatTeacherHandoffForClipboard(h, studentName) {
      if (!h) return "";
      var lines = [];
      lines.push("TEACHER / CASE MANAGER HANDOFF — " + (studentName || ""));
      lines.push("");
      lines.push("Clinical headline:");
      lines.push(h.headline);
      lines.push("");
      if (h.whatWorks && h.whatWorks.length > 0) {
        lines.push("WHAT WORKS:");
        h.whatWorks.forEach(function (w, i) {
          lines.push("  " + (i + 1) + ". " + w.title);
          lines.push("     " + w.description);
          if (w.evidenceFromDA) lines.push("     Evidence: " + w.evidenceFromDA);
          if (w.suggestedFrequency) lines.push("     Frequency: " + w.suggestedFrequency);
          lines.push("");
        });
      }
      if (h.whatDidNotWork && h.whatDidNotWork.length > 0) {
        lines.push("WHAT TO AVOID:");
        h.whatDidNotWork.forEach(function (x, i) { lines.push("  " + (i + 1) + ". " + x); });
        lines.push("");
      }
      if (h.watchFor && h.watchFor.length > 0) {
        lines.push("WATCH FOR:");
        h.watchFor.forEach(function (x, i) { lines.push("  " + (i + 1) + ". " + x); });
        lines.push("");
      }
      if (h.quickProbes && h.quickProbes.length > 0) {
        lines.push("QUICK PROBES (informal check-ins):");
        h.quickProbes.forEach(function (p, i) {
          lines.push("  " + (i + 1) + ". " + p.label + (p.frequency ? " — " + p.frequency : ""));
          lines.push("     " + p.description);
          lines.push("");
        });
      }
      if (h.whenToReRefer) {
        lines.push("WHEN TO RE-REFER:");
        lines.push(h.whenToReRefer);
        lines.push("");
      }
      if (h.redFlags && h.redFlags.length > 0) {
        lines.push("RED FLAGS (re-refer if observed):");
        h.redFlags.forEach(function (x, i) { lines.push("  " + (i + 1) + ". " + x); });
      }
      return lines.join("\n");
    }

    // ── Phase X — Progress monitoring plan generation ──
    function generateProgressMonitoringForSession(session) {
      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        setMonitoringError("AI generation requires the host to provide callGemini.");
        return;
      }
      if (!session || !session.itemResults || session.itemResults.length === 0) {
        setMonitoringError("No completed session data to draft a monitoring plan from.");
        return;
      }
      setMonitoringBusy(true);
      setMonitoringError(null);
      var prompt = buildProgressMonitoringPrompt(session, session.studentNickname, daOutputLanguage);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = typeof out === "string" ? out : (out && out.text) || "";
          var parsed = parseProgressMonitoringResponse(raw);
          if (!parsed) {
            setMonitoringBusy(false);
            setMonitoringError("AI returned an unexpected shape. Try again, or edit manually.");
            return;
          }
          var v = validateProgressMonitoring(parsed);
          if (!v.plan) {
            setMonitoringBusy(false);
            setMonitoringError("Generated plan failed validation. Try regenerating.");
            return;
          }
          setProgressMonitoring(v.plan);
          setMonitoringBusy(false);
          setMonitoringPanelOpen(true);
          announce("Progress monitoring plan generated.");
        })
        .catch(function (err) {
          setMonitoringBusy(false);
          setMonitoringError("AI call failed: " + (err && err.message ? err.message : "unknown error") + ". Try again in a moment.");
        });
    }

    function updateMonitoringField(field, value) {
      setProgressMonitoring(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next[field] = value;
        return next;
      });
    }

    function updateMonitoringArrayObjectField(field, idx, subfield, value) {
      setProgressMonitoring(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        var arr = (next[field] || []).slice();
        if (!arr[idx]) return prev;
        arr[idx] = Object.assign({}, arr[idx], (function () { var o = {}; o[subfield] = value; return o; })());
        next[field] = arr;
        return next;
      });
    }

    function removeMonitoringArrayItem(field, idx) {
      setProgressMonitoring(function (prev) {
        if (!prev) return prev;
        var next = Object.assign({}, prev);
        next[field] = (next[field] || []).filter(function (_, i) { return i !== idx; });
        return next;
      });
    }

    function formatMonitoringPlanForClipboard(plan, studentName) {
      if (!plan) return "";
      var lines = [];
      lines.push("PROGRESS MONITORING PLAN — " + (studentName || ""));
      lines.push("");
      lines.push(plan.overview);
      lines.push("");
      if (plan.goalMonitoring && plan.goalMonitoring.length > 0) {
        lines.push("WHAT TO MONITOR:");
        plan.goalMonitoring.forEach(function (g, gi) {
          lines.push("");
          lines.push("  " + (gi + 1) + ". " + g.goalSummary);
          lines.push("     Probe: " + g.probeType);
          if (g.probeDescription) lines.push("     " + g.probeDescription);
          if (g.frequency) lines.push("     Frequency: " + g.frequency);
          if (g.criterion) lines.push("     Criterion: " + g.criterion);
          if (g.dataPointsNeeded) lines.push("     Data points needed: " + g.dataPointsNeeded);
          if (g.decisionRules && g.decisionRules.length > 0) {
            lines.push("     Decision rules:");
            g.decisionRules.forEach(function (r) {
              lines.push("       · If " + r.trigger + " → " + r.action);
            });
          }
          if (g.tools && g.tools.length > 0) lines.push("     Tools: " + g.tools.join("; "));
        });
        lines.push("");
      }
      if (plan.reviewSchedule && plan.reviewSchedule.length > 0) {
        lines.push("REVIEW SCHEDULE:");
        plan.reviewSchedule.forEach(function (rs) { lines.push("  · " + rs.timing + " — " + rs.focus); });
        lines.push("");
      }
      if (plan.responsibilities && plan.responsibilities.length > 0) {
        lines.push("RESPONSIBILITIES:");
        plan.responsibilities.forEach(function (r) { lines.push("  · " + r.role + ": " + r.action + (r.cadence ? " (" + r.cadence + ")" : "")); });
        lines.push("");
      }
      if (plan.caveat) {
        lines.push("CAVEAT:");
        lines.push(plan.caveat);
      }
      return lines.join("\n");
    }

    function formatGoalForClipboard(goal) {
      var lines = [];
      lines.push("ANNUAL GOAL — " + (goal.domain || ""));
      lines.push(goal.annualGoal || "");
      if (goal.rationale) { lines.push(""); lines.push("Rationale: " + goal.rationale); }
      if (goal.measurementCriterion) { lines.push("Criterion: " + goal.measurementCriterion); }
      if (goal.evaluationMethod) { lines.push("Measurement: " + goal.evaluationMethod); }
      if (Array.isArray(goal.shortTermObjectives) && goal.shortTermObjectives.length > 0) {
        lines.push("");
        lines.push("SHORT-TERM OBJECTIVES:");
        goal.shortTermObjectives.forEach(function (sto, i) {
          lines.push("  " + (i + 1) + ". " + sto);
        });
      }
      return lines.join("\n");
    }

    function resetCustomBuilder() {
      setStartScreenView("start");
      setGeneratedItems([]);
      setGenError(null);
      setSaveTemplate(false);
      setTemplateName("");
    }

    // Edit one field of a generated item in place. The clinician can
    // tweak prompt, answer, or any ladder step's text before running.
    // After the patch lands, re-run the heuristic validators so the
    // ⚠ warning chip + per-warning list reflect the CURRENT state of
    // the item — otherwise an edit that resolves a warning leaves the
    // stale warning visible until full regeneration.
    function editGeneratedItem(idx, patcher) {
      setGeneratedItems(generatedItems.map(function (it, i) {
        if (i !== idx) return it;
        var patched = patcher(it);
        if (patched && typeof patched === "object") {
          try {
            // Re-run Phase Y validators on the patched item. We DON'T
            // touch validateGeneratedItem (the schema-level checks) since
            // those errors were captured at generation time and shouldn't
            // come back unless the structure changes. Phase Y validators
            // are heuristic and should track edits.
            var fresh = runPhaseYValidators(patched);
            patched._generationWarnings = fresh;
          } catch (_) { /* defensive — fall back to whatever was there */ }
        }
        return patched;
      }));
    }

    function discardSession() {
      patch({ activeSession: null });
      setResponseDraft("");
      setObservationDraft("");
      setObservationTagsDraft([]);
      setIepGoals([]);
      setIepPanelOpen(false);
      setIepError(null);
      setAccommodations([]);
      setAccomPanelOpen(false);
      setAccomError(null);
      setFamilySummary(null);
      setFamilyPanelOpen(false);
      setFamilyError(null);
      setTeacherHandoff(null);
      setTeacherPanelOpen(false);
      setTeacherError(null);
      setProgressMonitoring(null);
      setMonitoringPanelOpen(false);
      setMonitoringError(null);
    }

    // Submit student's response on the current item.
    // For pretest/posttest phases: one attempt, score is 5 if right (level 0), 0 if wrong.
    // For mediation phase: examiner can escalate scaffolds and retry; score reflects
    // the highest level reached when the student succeeded (or 0 if never solved).
    function submitResponse(args) {
      // args: { phase, itemId, response, levelReached, finalCorrect, examinerObservation, supportType }
      if (!state.activeSession) return;
      var nowIso = new Date().toISOString();
      var result = {
        itemId: args.itemId,
        phase: args.phase,
        promptLevelReached: args.levelReached || 0,
        studentResponseText: String(args.response || "").trim().slice(0, 1000),
        examinerObservation: String(args.examinerObservation || "").trim().slice(0, 2000),
        observationTags: Array.isArray(args.observationTags)
          ? args.observationTags.filter(function (t) { return !!OBSERVATION_TAGS_BY_ID[t]; })
          : [],
        supportType: args.supportType || null,
        finalCorrect: !!args.finalCorrect,
        scaffoldLeaked: !!args.scaffoldLeaked,
        accessReadAloudHelped: !!args.accessReadAloudHelped,
        accessSimplifiedHelped: !!args.accessSimplifiedHelped,
        accessL1Helped: !!args.accessL1Helped,
        scoreAwarded: scoreForLevel(args.levelReached || 0, !!args.finalCorrect, !!args.scaffoldLeaked),
        attemptedAt: nowIso
      };
      var prev = state.activeSession;
      var newResults = (prev.itemResults || []).concat([result]);
      var nextItemIdx = prev.currentItemIdx + 1;
      var totalInPhase = prev.sessionItemIds.length;
      var nextPhase = prev.currentPhase;
      var advanced = false;
      if (nextItemIdx >= totalInPhase) {
        // Phase complete — advance through the workflow
        if (prev.currentPhase === "pretest") nextPhase = "mediation";
        else if (prev.currentPhase === "mediation") nextPhase = "posttest";
        else if (prev.currentPhase === "posttest") {
          // Phase E — Transfer phase fires only if at least one item has
          // a transferTwin defined. Otherwise jump straight to summary.
          var hasAnyTwin = prev.sessionItemIds.some(function (id) {
            var it = ITEMS_BY_ID[id];
            return it && it.transferTwin && it.transferTwin.prompt;
          });
          nextPhase = hasAnyTwin ? "transfer" : "summary";
        }
        else if (prev.currentPhase === "transfer") nextPhase = "summary";
        nextItemIdx = 0;
        advanced = true;
      }
      patchSession({
        itemResults: newResults,
        currentItemIdx: nextItemIdx,
        currentPhase: nextPhase,
        currentLadderLevel: 0
      });
      setResponseDraft("");
      setObservationDraft("");
      setObservationTagsDraft([]);
      setScaffoldLeakedDraft(false);
      setAccessReadAloudDraft(false);
      setSimplifiedTextDraft(null);
      setSimplifiedBusy(false);
      setAccessSimplifiedDraft(false);
      setL1TextDraft(null);
      setL1Busy(false);
      setAccessL1Draft(false);
      daStopSpeak(); // stop any read-aloud when advancing to the next item
      if (advanced) {
        announce(nextPhase === "summary"
          ? "All phases complete. Results ready."
          : (nextPhase + " phase started."));
      } else {
        announce("Item " + (nextItemIdx + 1) + " of " + totalInPhase);
      }
    }

    function finalizeSession() {
      // Mark complete + push into sessions list + clear active
      if (!state.activeSession) return;
      var s = state.activeSession;
      var pretestResults = s.itemResults.filter(function (r) { return r.phase === "pretest"; });
      var posttestResults = s.itemResults.filter(function (r) { return r.phase === "posttest"; });
      var pretestSum = sumItemResultScores(pretestResults);
      var posttestSum = sumItemResultScores(posttestResults);
      var modIdx = computeModifiabilityIndex(pretestSum, posttestSum, s.sessionItemIds.length);
      var tier = modifiabilityTier(modIdx);
      var record = Object.assign({}, s, {
        dateCompleted: new Date().toISOString(),
        pretestSum: pretestSum,
        posttestSum: posttestSum,
        modifiabilityIndex: modIdx,
        modifiabilityTier: tier,
        // Phase K — persist any IEP goals drafted during this session
        iepGoals: iepGoals && iepGoals.length > 0 ? iepGoals.slice() : [],
        // Phase Q — persist any accommodations drafted during this session
        accommodations: accommodations && accommodations.length > 0 ? accommodations.slice() : [],
        // Phase S — persist any family summary drafted during this session
        familySummary: familySummary || null,
        // Phase T — persist any teacher handoff drafted during this session
        teacherHandoff: teacherHandoff || null,
        // Phase X — persist any monitoring plan drafted during this session
        progressMonitoring: progressMonitoring || null
      });
      var newSessions = (state.sessions || []).concat([record]);
      patch({ activeSession: null, sessions: newSessions });
      // Reset ephemeral state across all output generators
      setIepGoals([]);
      setIepPanelOpen(false);
      setIepError(null);
      setAccommodations([]);
      setAccomPanelOpen(false);
      setAccomError(null);
      setFamilySummary(null);
      setFamilyPanelOpen(false);
      setFamilyError(null);
      setTeacherHandoff(null);
      setTeacherPanelOpen(false);
      setTeacherError(null);
      setProgressMonitoring(null);
      setMonitoringPanelOpen(false);
      setMonitoringError(null);
      announce("Session saved.");
    }

    function setLadderLevel(level) {
      if (!state.activeSession) return;
      patchSession({ currentLadderLevel: level });
      announce("Scaffold level " + level + " delivered.");
    }

    // Undo the most recent item entry — re-presents that item with the
    // response/observation drafts restored so a mis-click doesn't cost the
    // session. AI-mediation attempts restart fresh for the re-presented item
    // (the popped result's transcript is discarded with it).
    function undoLastResult() {
      var s = state.activeSession;
      if (!s) return;
      var rb = rollbackLastItemResult(s);
      if (!rb) { addToast("Nothing to undo yet."); return; }
      patchSession({
        itemResults: rb.itemResults,
        currentPhase: rb.currentPhase,
        currentItemIdx: rb.currentItemIdx,
        currentLadderLevel: rb.currentLadderLevel
      });
      var popped = rb.popped;
      setResponseDraft(popped.studentResponseText || "");
      setObservationDraft(popped.examinerObservation || "");
      setObservationTagsDraft(Array.isArray(popped.observationTags) ? popped.observationTags.slice() : []);
      setScaffoldLeakedDraft(!!popped.scaffoldLeaked);
      setAccessReadAloudDraft(!!popped.accessReadAloudHelped);
      setAccessSimplifiedDraft(!!popped.accessSimplifiedHelped);
      setAccessL1Draft(!!popped.accessL1Helped);
      setAiAttempts([]);
      setAiError(null);
      announce("Last item entry undone. Back on " + rb.currentPhase + " item " + (rb.currentItemIdx + 1) + ".");
    }

    // ─── Phase B — AI mediation cycle ───
    // Called when student submits a response during AI-mediated mediation.
    // 1. Build prompt → call Gemini for verdict + nextScaffoldLevel.
    // 2. Apply fallback if Gemini missing/fails.
    // 3. Append attempt to aiAttempts; if verdict === 'correct' OR all
    //    scaffolds delivered + still wrong, finalize the item.
    // 4. Otherwise, advance currentLadderLevel and let student retry.
    function runAiMediate(itemDef, responseText) {
      var done = function () {}; // placeholder for any post-attempt UI work
      var attemptsSoFar = aiAttempts.slice();
      var scaffoldsDelivered = attemptsSoFar
        .map(function (a) { return a.levelAfter; })
        .filter(function (l) { return typeof l === "number" && l > 0; });
      // De-dupe scaffoldsDelivered
      var uniq = {};
      scaffoldsDelivered = scaffoldsDelivered.filter(function (l) {
        if (uniq[l]) return false;
        uniq[l] = true;
        return true;
      });

      setAiBusy(true);
      setAiError(null);

      // The "level reached so far" before this attempt's evaluation
      var levelBefore = scaffoldsDelivered.length === 0 ? 0 : Math.max.apply(null, scaffoldsDelivered);

      function applyVerdict(v) {
        // v: { verdict, nextScaffoldLevel, observationHint }
        var nextLevel = Math.max(0, Math.min(4, v.nextScaffoldLevel || levelBefore));
        var scaffoldText = "";
        if (v.verdict !== "correct" && nextLevel > 0) {
          var step = itemDef.promptLadder[nextLevel - 1];
          if (step) scaffoldText = step.text;
        }
        var newAttempt = {
          response: String(responseText || "").trim().slice(0, 600),
          verdict: v.verdict,
          levelAfter: v.verdict === "correct" ? levelBefore : nextLevel,
          scaffoldShown: scaffoldText,
          observationHint: String(v.observationHint || "").trim().slice(0, 240)
        };
        var nextAttempts = attemptsSoFar.concat([newAttempt]);
        setAiAttempts(nextAttempts);
        setAiBusy(false);
        setResponseDraft("");
        announce(v.verdict === "correct"
          ? "Correct."
          : ("Scaffold level " + nextLevel + " delivered."));

        // Finalize the item if correct OR exhausted (level 4 already given + still wrong)
        var alreadyHadL4 = scaffoldsDelivered.indexOf(4) >= 0;
        var exhausted = (v.verdict !== "correct") && alreadyHadL4;
        if (v.verdict === "correct" || exhausted) {
          finalizeAiItem(itemDef, nextAttempts, v.verdict === "correct");
        }
      }

      var callGeminiFn = props.callGemini;
      if (typeof callGeminiFn !== "function") {
        // No AI plumbing — use deterministic fallback immediately.
        applyVerdict(fallbackAiMediate(itemDef, responseText, scaffoldsDelivered));
        return;
      }

      var prompt = buildAiMediatePrompt(itemDef, responseText, scaffoldsDelivered, daOutputLanguage);
      Promise.resolve()
        .then(function () { return callGeminiFn(prompt); })
        .then(function (out) {
          var raw = (typeof out === "string" ? out : (out && out.text) || "").trim();
          raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          var parsed = null;
          try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
          if (!parsed || typeof parsed.verdict !== "string" ||
              typeof parsed.nextScaffoldLevel !== "number" ||
              ["correct", "partial", "incorrect"].indexOf(parsed.verdict) < 0) {
            // Bad shape — fall back deterministically
            applyVerdict(fallbackAiMediate(itemDef, responseText, scaffoldsDelivered));
            return;
          }
          // Clamp level to [0, 4]
          parsed.nextScaffoldLevel = Math.max(0, Math.min(4, parsed.nextScaffoldLevel));
          // If verdict is wrong but Gemini suggests an already-delivered level,
          // bump it forward by one (defense against bad outputs).
          if (parsed.verdict !== "correct" && scaffoldsDelivered.indexOf(parsed.nextScaffoldLevel) >= 0) {
            parsed.nextScaffoldLevel = Math.min(4, parsed.nextScaffoldLevel + 1);
          }
          applyVerdict(parsed);
        })
        .catch(function () {
          // Gemini call failed — fall back deterministically + flag error so
          // examiner knows AI plumbing had a hiccup.
          setAiError("AI step skipped — used built-in rule instead.");
          applyVerdict(fallbackAiMediate(itemDef, responseText, scaffoldsDelivered));
        });
    }

    // After an AI-mediated item resolves (correct or exhausted), commit
    // its result + advance to the next item. Mirrors submitResponse but
    // with attempts log baked in.
    function finalizeAiItem(itemDef, attempts, wasCorrect) {
      if (!state.activeSession) return;
      var prev = state.activeSession;
      // Final level reached = max levelAfter across attempts
      var finalLevel = 0;
      attempts.forEach(function (a) {
        if (typeof a.levelAfter === "number" && a.levelAfter > finalLevel) finalLevel = a.levelAfter;
      });
      var nowIso = new Date().toISOString();
      var lastResponse = attempts.length > 0 ? attempts[attempts.length - 1].response : "";
      // Concatenate AI observation hints into the examiner-observation field
      var aiHints = attempts
        .map(function (a) { return a.observationHint; })
        .filter(function (s) { return !!s; })
        .join(" · ");
      var combinedObservation = [observationDraft.trim(), aiHints ? "[AI: " + aiHints + "]" : ""]
        .filter(function (s) { return !!s; })
        .join(" ");
      var result = {
        itemId: itemDef.id,
        phase: "mediation",
        promptLevelReached: finalLevel,
        studentResponseText: lastResponse,
        examinerObservation: combinedObservation.slice(0, 2000),
        observationTags: Array.isArray(observationTagsDraft)
          ? observationTagsDraft.filter(function (t) { return !!OBSERVATION_TAGS_BY_ID[t]; })
          : [],
        supportType: wasCorrect
          ? (finalLevel === 0 ? "none" : (itemDef.promptLadder[finalLevel - 1] || {}).type || "none")
          : "directTeach",
        finalCorrect: !!wasCorrect,
        scoreAwarded: scoreForLevel(finalLevel, !!wasCorrect),
        attemptedAt: nowIso,
        aiAttemptsLog: attempts.slice() // Persisted log of the cycle for the summary
      };
      var newResults = (prev.itemResults || []).concat([result]);
      var nextItemIdx = prev.currentItemIdx + 1;
      var totalInPhase = prev.sessionItemIds.length;
      var nextPhase = prev.currentPhase;
      var advanced = false;
      if (nextItemIdx >= totalInPhase) {
        // AI mediation only advances out of the 'mediation' phase via this
        // path. The next phase is posttest; phase E adds a transfer probe
        // after posttest (handled in submitResponse for those phases).
        nextPhase = "posttest";
        nextItemIdx = 0;
        advanced = true;
      }
      patchSession({
        itemResults: newResults,
        currentItemIdx: nextItemIdx,
        currentPhase: nextPhase,
        currentLadderLevel: 0
      });
      setAiAttempts([]);
      setAiError(null);
      setObservationDraft("");
      setObservationTagsDraft([]);
      setResponseDraft("");
      if (advanced) {
        announce(nextPhase === "summary"
          ? "All phases complete."
          : (nextPhase + " phase started."));
      } else {
        announce("Item " + (nextItemIdx + 1) + " of " + totalInPhase);
      }
    }

    // ── RENDER ──
    // Every view renders inside one shell element that provides:
    //   1. the theme class (.da-theme-<name>) that flips all --da-* tokens,
    //   2. dialog semantics (role/aria-modal/aria-label) the host wrapper
    //      never supplied (WCAG 4.1.2),
    //   3. a Tab focus trap + mount-focus target (WCAG 2.4.3 / 2.1.2),
    //   4. the painted page surface so the host's hardcoded white wrapper
    //      doesn't bleed through in dark/contrast themes.
    function daShellWrap(view) {
      return h("div", {
        ref: daShellRef,
        className: "da-shell da-theme-" + daTheme,
        role: "dialog",
        "aria-modal": typeof props.onClose === "function" ? "true" : undefined,
        "aria-label": "Dynamic Assessment Studio",
        tabIndex: -1,
        onKeyDown: daTrapTab,
        style: { outline: "none" }
      }, view, renderDaConfirm());
    }
    // Phase U: if activeSession is paused, route to the start screen with
    // a resume banner instead of dropping into the item view.
    var isPaused = !!(state.activeSession && state.activeSession.paused);
    var daView;
    if (!state.activeSession || isPaused) {
      // Pre-session views, in priority order
      if (tourStep !== null) daView = renderOnboardingTour();
      else if (startScreenView === "custom-builder") daView = renderCustomBuilder();
      else if (startScreenView === "custom-review")  daView = renderCustomReview();
      else if (startScreenView === "sessions")       daView = renderSessionsBrowser();
      else if (startScreenView === "session-detail") daView = renderSessionDetail();
      else if (startScreenView === "longitudinal")   daView = renderLongitudinalView();
      else if (startScreenView === "analytics")      daView = renderItemAnalytics();
      else if (startScreenView === "population")     daView = renderPopulationStats();
      else if (startScreenView === "calibration")    daView = renderCalibration();
      else if (startScreenView === "reference")      daView = renderReferenceGuide();
      else daView = renderStartScreen();
    } else {
      // AI mode only changes the MEDIATION phase. Pretest/posttest are
      // single-attempt regardless of mode (they're unprompted by design).
      if (state.activeSession.currentPhase === "summary") daView = renderSummaryScreen();
      else if (state.activeSession.currentPhase === "mediation" && state.activeSession.mode === "ai") daView = renderActivePhaseAI();
      else daView = renderActivePhase();
    }
    return daShellWrap(daView);

    // ─── Start screen ───
    function renderStartScreen() {
      // nicknameDraft, difficultyDraft, modeDraft, domainDraft now live at
      // the component's top level (see "Start-screen draft state" comment
      // above). They were lifted out of this render function to keep React's
      // hook-order invariant when the user transitions from the start screen
      // into an active session.
      var hasGemini = typeof props.callGemini === "function";
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 720, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          props.onClose ? h("button", {
            onClick: props.onClose, "aria-label": "Close Dynamic Assessment Studio",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back") : null,
          h("div", { style: { flex: 1, minWidth: 200 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } }, "Clinical tool · v1"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 24, fontWeight: 800, color: "var(--da-ink)" } }, "🔬 Dynamic Assessment Studio")
          ),
          // Phase F + G — top-right utility actions
          h("div", { style: { display: "flex", gap: 6 } },
            h("button", {
              onClick: function () { setStartScreenView("sessions"); },
              "aria-label": "View all saved sessions",
              title: "Browse all saved DA sessions, filter by student, see longitudinal patterns",
              style: { background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "var(--da-ink)" }
            }, "📁 Sessions" + ((state.sessions || []).length > 0 ? " · " + state.sessions.length : "")),
            h("button", {
              onClick: startTour,
              "aria-label": "Open the DA methodology tour",
              title: "4-step intro to Dynamic Assessment + this tool's workflow",
              style: { background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "var(--da-ink)" }
            }, "🧭 Tour"),
            h("button", {
              onClick: function () { setStartScreenView("reference"); },
              "aria-label": "Open the clinician interpretation guide",
              title: "MI tier interpretation, when to use DA, reporting framing, citations",
              style: { background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "var(--da-ink)" }
            }, "📚 Guide"),
            h("button", {
              onClick: function () { resetCalibration(); setStartScreenView("calibration"); },
              "aria-label": "Open calibration mode — practice scoring sample student responses",
              title: "Train on hand-authored scenarios; check your inter-rater agreement with expert verdicts",
              style: { background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "var(--da-ink)" }
            }, "🎓 Calibrate")
          )
        ),
        // Phase U — Active-session resume banner (shown when activeSession exists,
        // either explicitly paused OR persisted across a reload). Lets the
        // clinician pick up where they left off instead of starting fresh.
        state.activeSession && state.activeSession.currentPhase !== "summary" ? (function () {
          var as = state.activeSession;
          var totalItems = (as.sessionItemIds || []).length;
          var doneCount = (as.itemResults || []).length;
          var phaseLabel = (as.currentPhase || "pretest");
          var lastTouched = as.lastTouchedAt || as.dateStarted;
          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 14, background: "var(--da-amber-tint-2)", borderColor: "var(--da-amber-mid)" } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } },
              h("div", { style: { flex: 1, minWidth: 200 } },
                h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 } },
                  "📌 Session in progress" + (as.paused ? " · PAUSED" : "")),
                h("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--da-ink)" } },
                  (as.studentNickname || "Anonymous") + " · " + as.domain + " · " +
                  phaseLabel + " phase · " + Math.min(doneCount + 1, totalItems) + " of " + totalItems + " items"),
                h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", marginTop: 4, fontStyle: "italic" } },
                  "Last touched " + formatRelativeTime(lastTouched) +
                  (as.paused && as.pausedAt ? " · paused " + formatRelativeTime(as.pausedAt) : ""))
              ),
              h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () {
                    if (as.paused) resumeSession();
                  },
                  "aria-label": "Resume the in-progress session",
                  style: { padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--da-btn-amber)", color: "var(--da-on-accent)", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }
                }, as.paused ? "▶ Resume" : "▶ Continue"),
                h("button", {
                  onClick: function () {
                    daAskConfirm({
                      message: "Discard this in-progress session? Item results will be lost. This cannot be undone.",
                      confirmLabel: "Discard session",
                      onConfirm: function () { discardSession(); addToast("In-progress session discarded."); }
                    });
                  },
                  "aria-label": "Discard in-progress session",
                  style: { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "Discard")
              )
            )
          );
        })() : null,
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("p", { style: { margin: "0 0 8px", fontSize: 14, color: "var(--da-ink-2)", lineHeight: 1.6 } },
            "Probes the student's ", h("strong", null, "modifiability"), " — how much their performance changes with structured scaffolding — rather than static ability alone. Following the Feuerstein / Vygotsky tradition: a pretest baseline, a mediation phase where you deliver graduated prompts, and a posttest re-measure."
          ),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.6 } },
            "Examiner-led mode is the default. Sit beside the student, run the items, and choose which scaffold level to deliver when they struggle. Free-text observations stay on this device — never synced."
          )
        ),
        h("div", { className: "da-card" },
          h("h2", { style: { fontSize: 16, fontWeight: 800, margin: "0 0 10px", color: "var(--da-ink)" } }, "Start a session"),
          // Nickname
          h("label", {
            htmlFor: "da-nickname",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 }
          }, "Student codename (optional)"),
          h("input", {
            id: "da-nickname", type: "text", value: nicknameDraft, maxLength: 30,
            onChange: function (e) { setNicknameDraft(e.target.value); },
            placeholder: "e.g., AmberSparrow",
            style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }
          }),
          // Domain picker (Phase C — all four domains shipped)
          h("div", { style: { marginBottom: 12 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Domain"),
            h("div", { role: "group", "aria-label": "Domain", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 } },
              [
                { id: "math",           label: "🧮 Math reasoning",    desc: "Word problems with scaffolded ladders" },
                { id: "reading",        label: "📖 Reading comprehension", desc: "Short passages + literal & inferential probes" },
                { id: "working-memory", label: "🧠 Working memory",    desc: "Digit-span, sorting, planning, inhibition" },
                { id: "language",       label: "🗣️ Language production", desc: "Vocabulary, definition, narration, summarization" }
              ].map(function (opt) {
                var active = domainDraft === opt.id;
                return h("button", {
                  key: "da-dom-" + opt.id,
                  onClick: function () { setDomainDraft(opt.id); },
                  "aria-pressed": active,
                  style: {
                    padding: "10px 12px", textAlign: "left",
                    border: active ? "2px solid var(--da-accent-2)" : "1px solid var(--da-border-2)",
                    borderRadius: 10, background: active ? "var(--da-blue-tint)" : "var(--da-surface)",
                    cursor: "pointer", fontFamily: "inherit"
                  }
                },
                  h("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--da-ink)" } }, opt.label),
                  h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 2 } }, opt.desc)
                );
              })
            )
          ),
          // Difficulty
          h("div", { style: { marginBottom: 14 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Difficulty band"),
            h("div", { role: "group", "aria-label": "Difficulty band", style: { display: "flex", gap: 8 } },
              [
                { id: "easy", label: "Easy", grade: "Grades 2–3", desc: "One-step word problems" },
                { id: "medium", label: "Medium", grade: "Grades 4–5", desc: "Two-step word problems" },
                { id: "hard", label: "Hard", grade: "Grades 6–7", desc: "Multi-step / fractions / proportions" }
              ].map(function (opt) {
                var active = difficultyDraft === opt.id;
                return h("button", {
                  key: "da-diff-" + opt.id,
                  onClick: function () { setDifficultyDraft(opt.id); },
                  "aria-pressed": active,
                  style: {
                    flex: 1, padding: "10px 12px", textAlign: "left",
                    border: active ? "2px solid var(--da-accent-2)" : "1px solid var(--da-border-2)",
                    borderRadius: 10, background: active ? "var(--da-blue-tint)" : "var(--da-surface)",
                    cursor: "pointer", fontFamily: "inherit"
                  }
                },
                  h("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--da-ink)" } }, opt.label),
                  h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 2 } }, opt.grade),
                  h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 2 } }, opt.desc)
                );
              })
            )
          ),
          // Mediation mode (Phase B)
          h("div", { style: { marginBottom: 14 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Mediation mode"),
            h("div", { role: "group", "aria-label": "Mediation mode", style: { display: "flex", gap: 8, flexWrap: "wrap" } },
              [
                { id: "clinician", label: "Clinician-led", icon: "🧑‍⚕️", desc: "You pick which scaffold level to deliver. Full clinical control." },
                { id: "ai", label: "AI-mediated" + (hasGemini ? "" : " (unavailable)"), icon: "🤖", desc: "Gemini plays the examiner role: evaluates each response and chooses the next scaffold. For non-specialist settings." }
              ].map(function (opt) {
                var active = modeDraft === opt.id;
                var disabled = opt.id === "ai" && !hasGemini;
                return h("button", {
                  key: "da-mode-" + opt.id,
                  onClick: function () { if (!disabled) setModeDraft(opt.id); },
                  "aria-pressed": active,
                  disabled: disabled,
                  style: {
                    flex: "1 1 220px", padding: "10px 12px", textAlign: "left",
                    border: active ? "2px solid var(--da-accent-2)" : "1px solid var(--da-border-2)",
                    borderRadius: 10, background: active ? "var(--da-blue-tint)" : disabled ? "var(--da-surface-3)" : "var(--da-surface)",
                    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                    opacity: disabled ? 0.55 : 1
                  }
                },
                  h("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--da-ink)" } }, opt.icon + " " + opt.label),
                  h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 4, lineHeight: 1.5 } }, opt.desc)
                );
              })
            )
          ),
          // Output language picker — sourced from host leveledTextLanguage but
          // overridable per-DA-session. Drives every AI-generated output below
          // (items, scaffolds, IEP goals, accommodations, family/teacher/monitoring).
          h("div", {
            style: { marginBottom: 14, padding: "10px 12px", background: "var(--da-sky-tint)", border: "1px solid var(--da-sky-border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }
          },
            h("span", { style: { fontSize: 16, flexShrink: 0 } }, "🌐"),
            h("label", {
              htmlFor: "da-output-language",
              style: { fontSize: 11.5, fontWeight: 700, color: "var(--da-sky-deeper)", flexShrink: 0 }
            }, "Output language for AI:"),
            h("input", {
              id: "da-output-language",
              type: "text",
              value: daOutputLanguage,
              onChange: function (e) { setDaOutputLanguage(e.target.value); },
              placeholder: "English",
              "aria-label": "Output language for AI-generated content in this Dynamic Assessment session",
              style: { flex: "1 1 160px", minWidth: 140, padding: "4px 8px", border: "1px solid var(--da-sky-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, background: "var(--da-surface)" }
            }),
            daOutputLanguage !== hostOutputLanguage ? h("button", {
              type: "button",
              onClick: function () { setDaOutputLanguage(hostOutputLanguage); },
              "aria-label": "Reset output language to the AlloFlow setting",
              title: "Reset to the AlloFlow text-adaptation language (" + hostOutputLanguage + ")",
              style: { padding: "3px 8px", borderRadius: 6, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }
            }, "↺ reset") : null,
            h("span", { style: { fontSize: 10.5, color: "var(--da-sky-text)", fontStyle: "italic", flexBasis: "100%", marginTop: 2 } },
              daOutputLanguage === "English" ? "Items, scaffolds, IEP goals, accommodations, family/teacher/monitoring outputs will be generated in English." : "Items, scaffolds, IEP goals, accommodations, family/teacher/monitoring outputs will be generated in " + daOutputLanguage + ". Built-in item banks remain in English; use Custom Probe (✨) to generate items in " + daOutputLanguage + ".")
          ),
          // Phase V — Pre-session intake context (collapsible; optional)
          h("details", { style: { marginBottom: 14 } },
            h("summary", { style: { cursor: "pointer", fontSize: 11, fontWeight: 800, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 0" } },
              "📋 Referral context (optional)" + (intakeFilledCount > 0 ? " · " + intakeFilledCount + " field" + (intakeFilledCount === 1 ? "" : "s") + " filled" : "")),
            h("p", { style: { margin: "4px 0 10px", fontSize: 11.5, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.55 } },
              "Capturing the referral question + existing data here makes every AI output (IEP goals, accommodations, family letter, teacher handoff) better. Nothing leaves the device until you choose to send to Report Writer or call AI generation."),
            h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
              [
                { id: "referralReason",          label: "Referral reason",            placeholder: "Teacher referred for math problem-solving struggles; recent SST flagged operation-selection difficulty in multi-step problems." },
                { id: "hypothesizedBottleneck",  label: "Hypothesized bottleneck",    placeholder: "Suspected gap in identifying which operation to use; reading the problem appears intact." },
                { id: "specificQuestion",        label: "Specific question this probe should answer", placeholder: "Does scaffolded operation-selection support produce gains, or is the bottleneck elsewhere?" },
                { id: "priorInterventions",      label: "Prior interventions tried",  placeholder: "Math fact fluency probes in fall; small-group reteach during Tier 2 block (6 weeks, no measurable change in word-problem accuracy)." },
                { id: "existingAssessmentData",  label: "Existing assessment data",   placeholder: "WJ-IV Math Calc SS=92 (avg), Applied Problems SS=78 (low avg); AIMSweb math CBM at 25th percentile fall; classroom observation 3/14 noted prolonged decision-making before any number manipulation." },
                { id: "languageContext",         label: "Multilingual / language background (enables access-condition analysis)", placeholder: "Home language(s): e.g., Somali (primary at home), English at school since K. ~3 years of English instruction. Reading in L1 not yet assessed. — Filling this in turns on the access-condition lens (how performance changes when language/reading demands are reduced). Leave blank for monolingual English students." }
              ].map(function (field) {
                var showPullButton = field.id === "existingAssessmentData" && mathFluencyProbes.length > 0;
                return h("div", { key: "da-intake-" + field.id },
                  h("label", {
                    htmlFor: "da-intake-" + field.id,
                    style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--da-muted)", marginBottom: 2 }
                  }, field.label),
                  // Phase V-bis — Pull-from-Math-Fluency button (only on existingAssessmentData when probes exist)
                  showPullButton ? h("button", {
                    type: "button",
                    onClick: function () {
                      var formatted = formatMathFluencyProbesForIntake(mathFluencyProbes);
                      if (!formatted) return;
                      var existing = (intakeDraft.existingAssessmentData || "").trim();
                      var combined = existing ? (existing + "\n\n" + formatted) : formatted;
                      updateIntakeField("existingAssessmentData", combined);
                      announce("Math Fluency probe data added.");
                    },
                    "aria-label": "Append recent Math Fluency probe data to the existing assessment data field",
                    title: "Appends the " + Math.min(3, mathFluencyProbes.length) + " most recent CBM-Math probe(s) to this field, plus a trend line if applicable.",
                    style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", marginBottom: 6, borderRadius: 8, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }
                  }, "📊 Pull from recent Math Fluency probe" + (mathFluencyProbes.length > 1 ? " (" + mathFluencyProbes.length + " available)" : "")) : null,
                  h("textarea", {
                    id: "da-intake-" + field.id,
                    value: intakeDraft[field.id] || "",
                    onChange: function (e) { updateIntakeField(field.id, e.target.value); },
                    rows: field.id === "existingAssessmentData" || field.id === "priorInterventions" ? 3 : 2,
                    placeholder: field.placeholder,
                    "aria-label": field.label,
                    style: { width: "100%", padding: "6px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }
                  })
                );
              })
            )
          ),

          h("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } },
            h("button", {
              onClick: function () {
                startSession({
                  studentNickname: nicknameDraft.trim(),
                  domain: domainDraft,
                  difficulty: difficultyDraft,
                  mode: modeDraft,
                  intake: intakeFilledCount > 0 ? intakeDraft : null
                });
              },
              style: { padding: "10px 22px", borderRadius: 10, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
            }, "Begin pretest →"),
            // Phase A-bis — entry to AI-generated custom probe builder
            hasGemini ? h("button", {
              onClick: function () {
                setCustomForm(Object.assign({}, customForm, {
                  mode: modeDraft,
                  domain: domainDraft || customForm.domain || "math"
                }));
                setStartScreenView("custom-builder");
              },
              "aria-label": "Build a custom probe with AI",
              title: "Specify a construct + grade + suspected bottleneck; AI generates items with full prompt ladders.",
              style: { padding: "10px 18px", borderRadius: 10, border: "1px dashed var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "✨ Or build a custom probe →") : null
          )
        ),
        // ─── Phase A-bis — Saved probe templates library ───
        Array.isArray(state.savedProbeTemplates) && state.savedProbeTemplates.length > 0 ? h("details", {
          style: { marginTop: 14 }
        },
          h("summary", { style: { fontSize: 12, fontWeight: 700, color: "var(--da-muted)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" } },
            "📚 My probe library · " + state.savedProbeTemplates.length),
          h("div", { style: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 } },
            state.savedProbeTemplates.slice().reverse().map(function (tpl) {
              var created = "";
              try { created = new Date(tpl.createdAt).toLocaleDateString(); } catch (e) {}
              return h("div", { key: "da-tpl-" + tpl.id, className: "da-card", style: { padding: 10 } },
                h("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                  h("div", { style: { flex: 1, minWidth: 200 } },
                    h("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--da-ink)" } }, tpl.name),
                    h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 2 } },
                      tpl.domain + " · grade " + tpl.gradeBand + " · " + (tpl.items || []).length + " items · saved " + created)
                  ),
                  h("button", {
                    onClick: function () {
                      startSession({
                        studentNickname: nicknameDraft.trim(),
                        domain: tpl.domain || "math",
                        difficulty: "custom",
                        mode: modeDraft,
                        customBank: tpl.items,
                        intake: intakeFilledCount > 0 ? intakeDraft : null
                      });
                    },
                    style: { padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
                  }, "▶ Run again"),
                  h("button", {
                    onClick: function () {
                      daAskConfirm({
                        message: "Delete this template? This cannot be undone.",
                        confirmLabel: "Delete template",
                        onConfirm: function () { deleteProbeTemplate(tpl.id); }
                      });
                    },
                    "aria-label": "Delete template",
                    style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }
                  }, "✕")
                )
              );
            })
          )
        ) : null,
        // Recent sessions teaser (full browser is in the Sessions view).
        // Shows up to 3 most-recent saved sessions inline with a "see all"
        // link. Skipped entirely when empty.
        Array.isArray(state.sessions) && state.sessions.length > 0 ? h("div", {
          style: { marginTop: 14 }
        },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em" } },
              "📁 Recent sessions · " + state.sessions.length + " total"),
            h("button", {
              onClick: function () { setStartScreenView("sessions"); },
              style: { background: "transparent", border: "none", color: "var(--da-accent-text)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }
            }, "See all →")
          ),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
            state.sessions.slice().reverse().slice(0, 3).map(function (sn) {
              var dt = "";
              try { dt = new Date(sn.dateCompleted).toLocaleDateString(); } catch (e) {}
              var idxRec = (typeof sn.modifiabilityIndex === "number" ? sn.modifiabilityIndex : 0);
              var idxColor = daHex(idxRec >= 0.6 ? "#16a34a" : idxRec >= 0.3 ? "#a16207" : idxRec >= 0 ? "#b91c1c" : "#475569");
              return h("button", {
                key: "da-prev-" + sn.id,
                onClick: function () { setViewingSessionId(sn.id); setStartScreenView("session-detail"); },
                style: { padding: 10, border: "1px solid var(--da-border)", borderRadius: 10, background: "var(--da-surface)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }
              },
                h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                  h("div", { style: { minWidth: 52, padding: 4, textAlign: "center", border: "1.5px solid " + idxColor, borderRadius: 6, background: idxColor + "11", color: idxColor, fontSize: 13, fontWeight: 800 } },
                    (idxRec >= 0 ? "+" : "") + idxRec.toFixed(2)),
                  h("div", { style: { flex: 1 } },
                    h("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--da-ink)" } },
                      (sn.studentNickname || "Anonymous") + " · " + sn.domain + " (" + sn.difficulty + ")"),
                    h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 2 } }, dt + " · " + (sn.mode === "ai" ? "AI" : "clinician"))
                  )
                )
              );
            })
          )
        ) : null
      );
    }

    // ─── Phase H — Clinician interpretation guide ───
    // A dedicated reference view covering: what DA measures, MI/transfer
    // tier interpretation, scaffold-ladder quality, when DA is and isn't
    // appropriate, IEP-report framing, and citations. Written for school
    // psychologists who may not be DA-trained.
    // ─── Phase J — Longitudinal student view ───
    // Full trajectory screen for one student across re-assessment occasions.
    // Includes SVG MI chart, linear trend interpretation, per-session
    // comparison table, aggregated observation tag patterns across sessions,
    // and an explicit caveat block (DA is informative across time but not
    // directly comparable item-for-item — different probes, practice effects).
    // ─── Phase BB — Population statistics & effect sizes view ───
    function renderPopulationStats() {
      var stats = aggregateSessionStatistics(state.sessions || []);
      var n = stats.n;
      var dInterp = interpretCohenD(stats.cohenD);
      // Histogram geometry
      var chartW = 720, chartH = 220;
      var padL = 50, padR = 16, padT = 16, padB = 36;
      var plotW = chartW - padL - padR;
      var plotH = chartH - padT - padB;
      var maxBinCount = Math.max(1, Math.max.apply(null, stats.miDistribution.map(function (b) { return b.count; })));
      var binW = plotW / Math.max(1, stats.miDistribution.length);

      function fmt(x, d) { return x === null || x === undefined ? "—" : x.toFixed(d == null ? 2 : d); }

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 900, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("sessions"); },
            "aria-label": "Back to sessions",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Sessions"),
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Phase BB · Population statistics"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "📈 Local-norm reference · n = " + n + " sessions")
          )
        ),
        // Caveat
        h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-amber-tint)", borderColor: "var(--da-amber-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "⚠ Local norms, not standardized norms"),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-orange-deep)", lineHeight: 1.55 } },
            "These statistics describe your saved caseload — useful for contextualizing a single session ('this MI is +1 SD above my local mean'), tracking trends over time, and supporting the empirical validation work needed to publish DA as a research instrument. NOT a substitute for nationally-normed reference data. ",
            n < 10 ? h("strong", null, "With n < 10 these estimates are highly unstable; treat as illustrative only.") :
            n < 30 ? h("strong", null, "With n < 30, treat results as exploratory.") :
            "Stable enough for descriptive interpretation; not yet a normed sample.")
        ),
        // Empty state
        n === 0 ? h("div", { className: "da-card", style: { padding: 24, textAlign: "center" } },
          h("p", { style: { margin: 0, color: "var(--da-muted)" } },
            "No saved sessions yet. Complete a session and save it to begin building local norms.")
        ) : null,
        // Headline stat cards
        n > 0 ? h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 } },
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12 } },
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Sessions"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-ink)", marginTop: 4 } }, n)
          ),
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12 } },
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Mean MI"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-accent-text)", marginTop: 4 } }, fmt(stats.miMean)),
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", marginTop: 2 } }, "SD = " + fmt(stats.miSD))
          ),
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12 } },
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Median MI"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-accent-text)", marginTop: 4 } }, fmt(stats.miMedian))
          ),
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12, borderColor: dInterp.color + "55", background: dInterp.color + "0d" } },
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Cohen's d"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: dInterp.color, marginTop: 4 } }, fmt(stats.cohenD)),
            h("div", { style: { fontSize: 10.5, color: dInterp.color, marginTop: 2, fontWeight: 700 } }, dInterp.label)
          )
        ) : null,
        // Cohen's d interpretation card
        n > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, padding: 14, borderColor: dInterp.color + "55", background: dInterp.color + "0d" } },
          h("div", { style: { fontSize: 11, color: dInterp.color, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "Average mediation effect across your caseload"),
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-ink-2)", lineHeight: 1.65 } },
            "Pretest mean " + fmt(stats.pretestMean, 1) + " (SD " + fmt(stats.pretestSD, 1) + ") → posttest mean " + fmt(stats.posttestMean, 1) + " (SD " + fmt(stats.posttestSD, 1) + ") · Cohen's d = " + fmt(stats.cohenD) + " (" + dInterp.label.toLowerCase() + "). " + dInterp.desc),
          stats.hedgesG !== null && n < 50 ? h("p", { style: { margin: "6px 0 0", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
            "Hedges' g (small-sample corrected) = " + fmt(stats.hedgesG) + ". For n < 50, prefer g over d.") : null
        ) : null,
        // MI distribution histogram
        n > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, padding: 12 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "MI distribution across your caseload"),
          h("svg", {
            width: "100%", viewBox: "0 0 " + chartW + " " + chartH,
            role: "img", "aria-label": "Histogram of modifiability indices across " + n + " saved sessions",
            style: { display: "block", maxWidth: "100%", height: "auto", background: "var(--da-surface-2)", borderRadius: 6 }
          },
            // Y-axis baseline
            h("line", { x1: padL, x2: padL + plotW, y1: padT + plotH, y2: padT + plotH, stroke: daTone.slate, strokeWidth: 1 }),
            // Tier reference lines (vertical at 0.6, 0.3, 0)
            [0.6, 0.3, 0].map(function (mi, mi_i) {
              var xAt = padL + ((mi + 1) / 2) * plotW;
              return h("g", { key: "da-bb-ref-" + mi_i },
                h("line", { x1: xAt, x2: xAt, y1: padT, y2: padT + plotH, stroke: daTone.border, strokeWidth: 1, strokeDasharray: "3 4" }),
                h("text", { x: xAt, y: padT - 4, textAnchor: "middle", fontSize: 9, fill: daTone.muted }, (mi >= 0 ? "+" : "") + mi.toFixed(1))
              );
            }),
            // Bars
            stats.miDistribution.map(function (bin, bi) {
              var hPx = (bin.count / maxBinCount) * plotH;
              var x = padL + bi * binW;
              var y = padT + plotH - hPx;
              var color = daHex(bin.lo >= 0.6 ? "#16a34a" : bin.lo >= 0.3 ? "#a16207" : bin.lo >= 0 ? "#b91c1c" : "#475569");
              return h("g", { key: "da-bb-bin-" + bi },
                h("rect", {
                  x: x + 1, y: y, width: binW - 2, height: hPx,
                  fill: color, opacity: 0.85
                }),
                bin.count > 0 ? h("text", {
                  x: x + binW / 2, y: y - 4,
                  textAnchor: "middle", fontSize: 10, fontWeight: 700, fill: color
                }, bin.count) : null,
                h("text", {
                  x: x + binW / 2, y: padT + plotH + 14,
                  textAnchor: "middle", fontSize: 9, fill: daTone.slate
                }, bin.lo.toFixed(1))
              );
            })
          )
        ) : null,
        // Tier breakdown
        n > 0 ? h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "Modifiability tier distribution"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--da-ink-3)" } },
            [
              { id: "high",       label: "Responsive to mediation (MI ≥ 0.6)",        color: "var(--da-green-text)" },
              { id: "moderate",   label: "Moderately responsive (0.3 ≤ MI < 0.6)",   color: "var(--da-amber-text)" },
              { id: "low",        label: "Limited modifiability (0 ≤ MI < 0.3)",      color: "var(--da-red-text)" },
              { id: "regression", label: "Posttest below pretest (MI < 0)",           color: "var(--da-ink-3)" }
            ].map(function (tier) {
              var count = stats.tierCounts[tier.id] || 0;
              var pct = n > 0 ? Math.round((count / n) * 100) : 0;
              return h("div", { key: "da-bb-tier-" + tier.id, style: { display: "flex", alignItems: "center", gap: 8 } },
                h("span", { style: { minWidth: 280 } }, tier.label),
                h("div", { style: { flex: 1, height: 10, background: "var(--da-surface-3)", borderRadius: 5, overflow: "hidden" } },
                  h("div", { "aria-hidden": "true", style: { height: "100%", width: pct + "%", background: tier.color } })),
                h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--da-ink)", minWidth: 70, textAlign: "right" } }, count + " (" + pct + "%)")
              );
            })
          )
        ) : null,
        // CSV export
        n > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } },
          h("div", { style: { flex: 1 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "var(--da-ink)" } }, "Research export"),
            h("p", { style: { margin: 0, fontSize: 11.5, color: "var(--da-muted)", lineHeight: 1.55 } },
              "Per-session CSV with all key fields (MI, tier, pretest/posttest sums, transfer counts). De-identified — only the nickname you chose. Useful for IRB-approved external analysis in R / SPSS / Excel.")
          ),
          h("button", {
            onClick: function () {
              try {
                var csv = buildSessionStatsCsv(state.sessions || []);
                var blob = new Blob([csv], { type: "text/csv" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "da-sessions-" + new Date().toISOString().slice(0, 10) + ".csv";
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 100);
                addToast("📥 Downloaded session-level CSV.");
              } catch (e) { addToast("CSV export failed: " + (e && e.message ? e.message : "unknown")); }
            },
            "aria-label": "Download all session statistics as CSV",
            style: { padding: "6px 14px", borderRadius: 8, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "↓ Session CSV")
        ) : null,
        // Legend
        h("div", { className: "da-card", style: { padding: 12 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--da-ink)" } }, "Reading these statistics"),
          h("ul", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-3)", lineHeight: 1.7 } },
            h("li", null, h("strong", null, "Mean MI"), " — the average modifiability response in your caseload. The first stable reference point a clinician can use to say 'this student is above/below typical for our population.'"),
            h("li", null, h("strong", null, "SD MI"), " — spread. Large SD = high heterogeneity (students respond very differently to mediation). Small SD = homogeneous response."),
            h("li", null, h("strong", null, "Cohen's d"), " — pretest → posttest effect size in pooled-SD units. Conventional thresholds: 0.2 small, 0.5 medium, 0.8 large (Cohen, 1988). For DA, medium effects (d ≥ 0.5) at the population level are consistent with the published literature on graduated-prompt methodology."),
            h("li", null, h("strong", null, "Tier distribution"), " — what % of your caseload falls into each MI tier. A roughly bell-shaped distribution with most students in 'moderate' is consistent with DA's design assumption that modifiability varies continuously.")
          ),
          h("p", { style: { margin: "10px 0 0", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.55 } },
            "These are the descriptive statistics you would report in a content-validity / pilot study paper. Combined with item analytics (Phase AA) + calibration data (Phase Z) + an inter-rater reliability study, they constitute the empirical foundation for publishing DA as a research instrument.")
        )
      );
    }

    // ─── Phase AA — Item analytics view ───
    function renderItemAnalytics() {
      var allStats = aggregateItemStatistics(state.sessions || [], 3);
      // Filter by domain
      var stats = allStats;
      if (analyticsState.filterDomain !== "all") {
        stats = stats.filter(function (s) { return s.domain === analyticsState.filterDomain; });
      }
      // Filter by flag
      if (analyticsState.filterFlag === "any") {
        stats = stats.filter(function (s) { return s.flags.length > 0; });
      } else if (analyticsState.filterFlag !== "all") {
        stats = stats.filter(function (s) { return s.flags.some(function (f) { return f.id === analyticsState.filterFlag; }); });
      }
      // Sort
      var sortDir = analyticsState.sortDir === "asc" ? 1 : -1;
      stats = stats.slice().sort(function (a, b) {
        var av = a[analyticsState.sortBy];
        var bv = b[analyticsState.sortBy];
        if (av === null || av === undefined) av = -Infinity;
        if (bv === null || bv === undefined) bv = -Infinity;
        if (typeof av === "string") return sortDir * av.localeCompare(bv);
        return sortDir * (av - bv);
      });

      function fmtPct(x) { return x === null || x === undefined ? "—" : Math.round(x * 100) + "%"; }
      function fmtNum(x, d) { return x === null || x === undefined ? "—" : x.toFixed(d == null ? 2 : d); }

      // Sort header cell
      function sortHeader(label, key) {
        var isActive = analyticsState.sortBy === key;
        var arrow = isActive ? (analyticsState.sortDir === "asc" ? " ↑" : " ↓") : "";
        // th keeps columnheader semantics (scope + aria-sort); the BUTTON
        // carries the interaction so Enter/Space sort from the keyboard.
        return h("th", {
          scope: "col",
          "aria-sort": isActive ? (analyticsState.sortDir === "asc" ? "ascending" : "descending") : undefined,
          style: { textAlign: "left", padding: 0, border: "1px solid var(--da-border-2)", background: isActive ? "var(--da-blue-tint-2)" : "var(--da-surface-3)" }
        },
          h("button", {
            onClick: function () {
              updateAnalyticsState({
                sortBy: key,
                sortDir: isActive && analyticsState.sortDir === "desc" ? "asc" : "desc"
              });
            },
            "aria-label": "Sort by " + label + (isActive ? (analyticsState.sortDir === "asc" ? ", currently ascending" : ", currently descending") : ""),
            style: { width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "transparent", color: "var(--da-ink)", font: "inherit", fontWeight: 700, cursor: "pointer", userSelect: "none" }
          }, label + arrow)
        );
      }

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 1000, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("sessions"); },
            "aria-label": "Back to sessions",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Sessions"),
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Phase AA · Item analytics"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "📊 Item bank diagnostics · " + allStats.length + " items seen")
          )
        ),

        // Caveat
        h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-amber-tint)", borderColor: "var(--da-amber-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "⚠ Use as instrument-development data, not single-session decisions"),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-orange-deep)", lineHeight: 1.55 } },
            "These statistics describe how items are performing across all your saved sessions. Useful for identifying items that need revision (too easy, too hard, non-discriminating) or for the empirical validation work needed to publish DA as a normed instrument. Items with n < 3 are excluded. Flags are heuristic; small samples (n < 10) are inherently unstable.")
        ),

        // Filters
        h("div", { className: "da-card", style: { marginBottom: 14, padding: 12 } },
          h("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } },
            h("div", null,
              h("div", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } }, "Domain"),
              h("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
                ["all", "math", "reading", "working-memory", "language", "custom"].map(function (d) {
                  var active = analyticsState.filterDomain === d;
                  return h("button", {
                    key: "da-aa-d-" + d,
                    onClick: function () { updateAnalyticsState({ filterDomain: d }); },
                    "aria-pressed": active,
                    style: { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: active ? "1.5px solid var(--da-accent)" : "1px solid var(--da-border-2)", background: active ? "var(--da-accent)" : "var(--da-surface)", color: active ? "var(--da-on-accent)" : "var(--da-ink-3)", cursor: "pointer", fontFamily: "inherit" }
                  }, d);
                })
              )
            ),
            h("div", null,
              h("div", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } }, "Show"),
              h("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
                [
                  { id: "all", label: "All items" },
                  { id: "any", label: "Flagged only" },
                  { id: "too-easy", label: "Too easy" },
                  { id: "too-hard", label: "Too hard" },
                  { id: "non-discriminating", label: "Non-discriminating" }
                ].map(function (f) {
                  var active = analyticsState.filterFlag === f.id;
                  return h("button", {
                    key: "da-aa-f-" + f.id,
                    onClick: function () { updateAnalyticsState({ filterFlag: f.id }); },
                    "aria-pressed": active,
                    style: { padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: active ? "1.5px solid var(--da-accent)" : "1px solid var(--da-border-2)", background: active ? "var(--da-accent)" : "var(--da-surface)", color: active ? "var(--da-on-accent)" : "var(--da-ink-3)", cursor: "pointer", fontFamily: "inherit" }
                  }, f.label);
                })
              )
            ),
            h("div", { style: { flex: 1 } }),
            // CSV export
            allStats.length > 0 ? h("button", {
              onClick: function () {
                try {
                  var csv = buildItemAnalyticsCsv(allStats);
                  var blob = new Blob([csv], { type: "text/csv" });
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement("a");
                  a.href = url;
                  a.download = "da-item-analytics-" + new Date().toISOString().slice(0, 10) + ".csv";
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 100);
                  addToast("📥 Downloaded item analytics CSV.");
                } catch (e) { addToast("CSV export failed: " + (e && e.message ? e.message : "unknown")); }
              },
              "aria-label": "Download item analytics as CSV",
              title: "Per-item psychometric stats — useful for IRB / research / instrument-development work",
              style: { padding: "5px 12px", borderRadius: 8, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "↓ CSV") : null
          )
        ),

        // Empty state
        stats.length === 0 ? h("div", { className: "da-card", style: { textAlign: "center", padding: 24 } },
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-muted)" } },
            allStats.length === 0 ? "No items have been administered yet. Complete a session and save it."
              : "No items match this filter.")
        ) :

        // Table
        h("div", { className: "da-card", style: { padding: 0, overflowX: "auto" } },
          h("table", { style: { width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 } },
            h("thead", null,
              h("tr", null,
                sortHeader("Item", "construct"),
                sortHeader("Domain", "domain"),
                sortHeader("Difficulty", "difficulty"),
                sortHeader("N", "n"),
                sortHeader("Pretest pass", "pretestPassRate"),
                sortHeader("Posttest pass", "posttestPassRate"),
                sortHeader("Mean L", "meanScaffoldLevel"),
                sortHeader("Mod-sens", "modifiabilitySensitivity"),
                sortHeader("Transfer", "transferPassRate"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)", background: "var(--da-surface-3)" } }, "Flags")
              )
            ),
            h("tbody", null,
              stats.map(function (it) {
                var bgRow = it.flags.length === 0 ? "var(--da-surface)" : "var(--da-amber-tint)";
                return h("tr", { key: "da-aa-row-" + it.itemId, style: { background: bgRow } },
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", fontWeight: 700, maxWidth: 220 } }, it.construct),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", color: "var(--da-muted)" } }, it.domain),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", color: "var(--da-muted)" } }, it.difficulty),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace" } }, it.n),
                  h("td", {
                    style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace",
                             color: it.pretestPassRate === null ? "var(--da-faint)" : (it.pretestPassRate >= 0.85 ? "var(--da-amber-text)" : it.pretestPassRate <= 0.1 ? "var(--da-rose-text)" : "var(--da-ink)") }
                  }, fmtPct(it.pretestPassRate) + (it.pretestN > 0 ? " (n=" + it.pretestN + ")" : "")),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace" } },
                    fmtPct(it.posttestPassRate) + (it.posttestN > 0 ? " (n=" + it.posttestN + ")" : "")),
                  h("td", {
                    style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace",
                             color: it.meanScaffoldLevel === null ? "var(--da-faint)" : (it.meanScaffoldLevel >= 3.5 ? "var(--da-red-text)" : it.meanScaffoldLevel <= 1.0 ? "var(--da-green-text)" : "var(--da-ink)") }
                  }, fmtNum(it.meanScaffoldLevel)),
                  h("td", {
                    style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace",
                             color: it.modifiabilitySensitivity === null ? "var(--da-faint)" : (it.modifiabilitySensitivity >= 0.4 ? "var(--da-green-text)" : it.modifiabilitySensitivity < 0.1 ? "var(--da-red-text)" : "var(--da-ink)") }
                  }, fmtPct(it.modifiabilitySensitivity) + (it.modSensSeen > 0 ? " (n=" + it.modSensSeen + ")" : "")),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace" } },
                    fmtPct(it.transferPassRate) + (it.transferN > 0 ? " (n=" + it.transferN + ")" : "")),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)" } },
                    it.flags.length === 0 ? h("span", { style: { color: "var(--da-green-text)", fontWeight: 700 } }, "✓ OK") :
                    h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
                      it.flags.map(function (f) {
                        return h("span", {
                          key: "da-aa-flag-" + it.itemId + "-" + f.id,
                          title: f.desc,
                          style: { padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: daHex(f.color) + "22", color: daHex(f.color), border: "1px solid " + daHex(f.color) + "55", cursor: "help" }
                        }, f.label);
                      })
                    ))
                );
              })
            )
          )
        ),

        // Legend
        h("div", { className: "da-card", style: { marginTop: 14, padding: 12 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--da-ink)" } }, "How to read this"),
          h("ul", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-3)", lineHeight: 1.7 } },
            h("li", null, h("strong", null, "Pretest pass"), " — proportion who solved unprompted. Ideal: 0.3–0.7 (most diagnostic). Above 0.85 = too easy; below 0.1 = too hard."),
            h("li", null, h("strong", null, "Posttest pass"), " — proportion correct on the re-test alone. Compare to pretest to gauge whether mediation transferred."),
            h("li", null, h("strong", null, "Mean L"), " — average scaffold level reached during mediation (0 = unprompted; 4 = direct teach). Above 3.5 = scaffolds may not be effective."),
            h("li", null, h("strong", null, "Mod-sens (modifiability sensitivity)"), " — proportion of students who went from wrong-at-pretest to right-at-posttest. This is the DA-specific signal: ", h("strong", null, "high = mediation works here"), ". Below 0.1 with n ≥ 5 = item may not be modifiable at this difficulty."),
            h("li", null, h("strong", null, "Transfer"), " — proportion correct on the transfer twin. Low transfer despite high posttest = surface learning, not deep transfer.")
          ),
          h("p", { style: { margin: "10px 0 0", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.55 } },
            "These statistics are exactly what you'd use for content-validity work toward publishing DA as a research instrument: flag items, revise scaffolds, re-test, iterate. The CSV export gives you the raw rows for external analysis (R, SPSS, Excel).")
        )
      );
    }

    function renderLongitudinalView() {
      var byStudent = groupSessionsByStudent(state.sessions || []);
      var name = longitudinalStudent || "";
      var sessionsForStudent = byStudent[name] || []; // already sorted oldest → newest
      if (!name || sessionsForStudent.length === 0) {
        return h("div", { className: "da-root", style: { padding: 20 } },
          h("p", null, "No longitudinal data available for this student."),
          h("button", {
            onClick: function () { setStartScreenView("sessions"); setLongitudinalStudent(null); },
            style: { padding: "6px 12px", border: "1px solid var(--da-border-2)", borderRadius: 8, background: "var(--da-surface)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back to sessions")
        );
      }
      var trend = computeLongitudinalTrend(sessionsForStudent);

      // Aggregate observation tags across all sessions for this student
      var aggTagsAcrossSessions = {};
      sessionsForStudent.forEach(function (sess) {
        (sess.itemResults || []).forEach(function (r) {
          (Array.isArray(r.observationTags) ? r.observationTags : []).forEach(function (tid) {
            aggTagsAcrossSessions[tid] = (aggTagsAcrossSessions[tid] || 0) + 1;
          });
        });
      });
      var aggTagList = Object.keys(aggTagsAcrossSessions).map(function (tid) {
        var def = OBSERVATION_TAGS_BY_ID[tid];
        return def ? { id: tid, label: def.label, count: aggTagsAcrossSessions[tid] } : null;
      }).filter(function (x) { return !!x; });
      aggTagList.sort(function (a, b) { return b.count - a.count; });

      // Distinct domains touched across sessions
      var domainSet = {};
      sessionsForStudent.forEach(function (sess) { if (sess.domain) domainSet[sess.domain] = true; });
      var domainsList = Object.keys(domainSet);

      // Date range
      var firstDate = "", lastDate = "";
      try {
        firstDate = new Date(sessionsForStudent[0].dateCompleted || sessionsForStudent[0].dateStarted).toLocaleDateString();
        lastDate = new Date(sessionsForStudent[sessionsForStudent.length - 1].dateCompleted || sessionsForStudent[sessionsForStudent.length - 1].dateStarted).toLocaleDateString();
      } catch (e) {}

      // SVG chart geometry
      var chartW = 720, chartH = 240;
      var padL = 50, padR = 20, padT = 20, padB = 40;
      var plotW = chartW - padL - padR;
      var plotH = chartH - padT - padB;
      // X positions evenly spaced by index, Y maps [-1, 1] → [plotH, 0]
      var miPoints = sessionsForStudent.map(function (s, i) {
        var mi = typeof s.modifiabilityIndex === "number" ? s.modifiabilityIndex : 0;
        var x = padL + (sessionsForStudent.length === 1 ? plotW / 2 : (plotW * i) / (sessionsForStudent.length - 1));
        var yNorm = (mi + 1) / 2; // map [-1,1] → [0,1]
        var y = padT + plotH - yNorm * plotH;
        return { x: x, y: y, mi: mi, session: s };
      });
      var pathD = miPoints.map(function (p, i) { return (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
      // Reference lines at MI = 0.6 (high), 0.3 (moderate), 0 (neutral)
      var yAt = function (mi) { return padT + plotH - ((mi + 1) / 2) * plotH; };

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("sessions"); setLongitudinalStudent(null); },
            "aria-label": "Back to sessions",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Sessions"),
          h("div", { style: { flex: 1, minWidth: 200 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Phase J · Longitudinal profile"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "📈 " + name),
            h("div", { style: { fontSize: 12, color: "var(--da-muted)", marginTop: 4 } },
              sessionsForStudent.length + " sessions · " + firstDate + " → " + lastDate +
              " · domains: " + domainsList.join(", "))
          )
        ),

        // Trend headline card
        h("div", { className: "da-card", style: { marginBottom: 14, padding: 14, borderColor: daHex(trend.color) + "55", background: daHex(trend.color) + "0d" } },
          h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 6 } },
            "Trajectory"),
          h("div", { style: { fontSize: 18, fontWeight: 800, color: daHex(trend.color), marginBottom: 6 } }, trend.label),
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-ink-2)", lineHeight: 1.6 } }, trend.desc)
        ),

        // Caveat box — critical for clinical honesty
        h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-amber-tint)", borderColor: "var(--da-amber-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "⚠ Interpretation caveat"),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-orange-deep)", lineHeight: 1.55 } },
            "Dynamic Assessment scores across sessions are not directly comparable item-for-item. Each session uses different probes, sometimes different domains, and may reflect practice effects from prior mediation exposure. Use this trajectory as a clinical pattern, NOT a normed growth measurement. Always check the per-session column for domain/difficulty consistency before interpreting trend direction.")
        ),

        // MI chart (SVG)
        h("div", { className: "da-card", style: { marginBottom: 14, padding: 12 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "Modifiability Index across sessions"),
          h("svg", {
            width: "100%", viewBox: "0 0 " + chartW + " " + chartH,
            role: "img", "aria-label": "Modifiability Index across " + sessionsForStudent.length + " sessions for " + name,
            style: { display: "block", maxWidth: "100%", height: "auto", background: "var(--da-surface-2)", borderRadius: 6 }
          },
            // Y axis gridlines + labels for MI = 1, 0.6, 0.3, 0, -1
            [1, 0.6, 0.3, 0, -1].map(function (mi, gi) {
              return h(window.React.Fragment, { key: "da-grid-" + gi },
                h("line", {
                  x1: padL, x2: padL + plotW, y1: yAt(mi), y2: yAt(mi),
                  stroke: mi === 0 ? daTone.faint : daTone.grid,
                  strokeWidth: mi === 0 ? 1.5 : 1,
                  strokeDasharray: mi === 0 ? "none" : "4 4"
                }),
                h("text", {
                  x: padL - 6, y: yAt(mi) + 3,
                  textAnchor: "end", fontSize: 10, fill: daTone.muted, fontFamily: "ui-monospace, monospace"
                }, (mi >= 0 ? "+" : "") + mi.toFixed(2))
              );
            }),
            // Tier label band on the right
            h("text", { x: padL + plotW + 4, y: yAt(0.6) + 3, fontSize: 9, fill: daTone.green, fontWeight: 700 }, "high"),
            h("text", { x: padL + plotW + 4, y: yAt(0.3) + 3, fontSize: 9, fill: daTone.amber, fontWeight: 700 }, "moderate"),
            // X axis date labels
            miPoints.map(function (p, pi) {
              var dt = "";
              try {
                dt = new Date(p.session.dateCompleted || p.session.dateStarted)
                  .toLocaleDateString(undefined, { month: "short", day: "numeric" });
              } catch (e) {}
              return h("text", {
                key: "da-xlbl-" + pi,
                x: p.x, y: padT + plotH + 18,
                textAnchor: "middle", fontSize: 10, fill: daTone.slate
              }, dt);
            }),
            // Trend line (linear fit) — only render if 2+ points
            sessionsForStudent.length >= 2 ? (function () {
              var firstMi = sessionsForStudent[0].modifiabilityIndex || 0;
              var fitFirstY = firstMi - trend.slope * 0; // intercept-at-i=0
              var fitLastY  = firstMi + trend.slope * (sessionsForStudent.length - 1);
              return h("line", {
                x1: padL, x2: padL + plotW,
                y1: yAt(fitFirstY), y2: yAt(fitLastY),
                stroke: daHex(trend.color), strokeWidth: 1.5, strokeDasharray: "6 4", opacity: 0.5
              });
            })() : null,
            // Connect points
            sessionsForStudent.length >= 2 ? h("path", {
              d: pathD, fill: "none", stroke: daTone.blue, strokeWidth: 2
            }) : null,
            // Plot points
            miPoints.map(function (p, pi) {
              var color = daHex(p.mi >= 0.6 ? "#16a34a" : p.mi >= 0.3 ? "#a16207" : p.mi >= 0 ? "#b91c1c" : "#475569");
              return h(window.React.Fragment, { key: "da-pt-" + pi },
                h("circle", { cx: p.x, cy: p.y, r: 6, fill: color, stroke: daTone.surface, strokeWidth: 2 }),
                h("text", {
                  x: p.x, y: p.y - 10,
                  textAnchor: "middle", fontSize: 10, fontWeight: 800, fill: color,
                  fontFamily: "ui-monospace, monospace"
                }, (p.mi >= 0 ? "+" : "") + p.mi.toFixed(2))
              );
            })
          )
        ),

        // Per-session comparison table
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "Per-session comparison"),
          h("p", { style: { margin: "0 0 8px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
            "Check domain + difficulty + items before reading the MI column as growth."),
          h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            h("thead", null,
              h("tr", { style: { background: "var(--da-surface-3)" } },
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Date"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Domain"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Difficulty"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Mode"),
                h("th", { scope: "col", style: { textAlign: "right", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Items"),
                h("th", { scope: "col", style: { textAlign: "right", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "MI"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Tier"),
                h("th", { scope: "col", style: { textAlign: "center", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "")
              )
            ),
            h("tbody", null,
              sessionsForStudent.map(function (sn, ri) {
                var dt = "";
                try { dt = new Date(sn.dateCompleted || sn.dateStarted).toLocaleDateString(); } catch (e) {}
                var idx = (typeof sn.modifiabilityIndex === "number" ? sn.modifiabilityIndex : 0);
                var idxColor = daHex(idx >= 0.6 ? "#16a34a" : idx >= 0.3 ? "#a16207" : idx >= 0 ? "#b91c1c" : "#475569");
                var tierLabel = sn.modifiabilityTier ? sn.modifiabilityTier.label : "—";
                return h("tr", { key: "da-long-row-" + sn.id },
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)" } }, dt),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)" } }, sn.domain || "—"),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", color: "var(--da-muted)" } }, sn.difficulty || "—"),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", fontSize: 11 } }, sn.mode === "ai" ? "🤖 AI" : "🧑‍⚕️ Clinician"),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace" } },
                    sn.sessionItemIds ? sn.sessionItemIds.length : "?"),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 800, color: idxColor } },
                    (idx >= 0 ? "+" : "") + idx.toFixed(2)),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", fontSize: 11, fontStyle: "italic", color: idxColor } }, tierLabel),
                  h("td", { style: { padding: "4px 8px", border: "1px solid var(--da-border)", textAlign: "center" } },
                    h("button", {
                      onClick: function () { setViewingSessionId(sn.id); setStartScreenView("session-detail"); },
                      "aria-label": "Open session detail",
                      style: { padding: "3px 8px", borderRadius: 4, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                    }, "View")
                  )
                );
              })
            )
          )
        ),

        // Aggregated observation tag patterns
        aggTagList.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "Recurring observation patterns across sessions"),
          h("p", { style: { margin: "0 0 8px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
            "Tags recorded across all this student's sessions. Patterns that recur across re-assessment occasions are more likely to be stable clinical signals than session-specific noise."),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--da-ink-3)" } },
            aggTagList.map(function (t) {
              var maxCount = aggTagList[0].count;
              var bar = Math.min(1, t.count / Math.max(1, maxCount));
              return h("div", { key: "da-long-tag-" + t.id, style: { display: "flex", alignItems: "center", gap: 8 } },
                h("span", { style: { minWidth: 170 } }, t.label),
                h("div", { style: { flex: 1, height: 8, background: "var(--da-surface-3)", borderRadius: 4, overflow: "hidden" } },
                  h("div", { style: { height: "100%", width: Math.round(bar * 100) + "%", background: "var(--da-accent)" } })),
                h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--da-ink)", minWidth: 30, textAlign: "right" } }, "×" + t.count)
              );
            })
          )
        ) : null,

        // Footer caveat repeated
        h("div", { style: { marginTop: 8, padding: 10, background: "var(--da-surface-2)", borderRadius: 6, fontSize: 11, color: "var(--da-ink-3)", fontStyle: "italic", lineHeight: 1.55 } },
          "Reminder: DA trajectory is a clinical pattern across structured probes, not a standardized growth metric. Pair this view with classroom observation, intervention response logs, and standardized assessment data when planning instruction or eligibility decisions.")
      );
    }

    // ─── Phase Z — Calibration mode ───
    // Inter-rater reliability training. Presents pre-scored scenarios,
    // captures the clinician's scoring decision, compares to expert
    // verdict, and surfaces teaching points on disagreement.
    function renderCalibration() {
      var scenarios = getCalibScenarios();
      if (calibState.view === "start") return renderCalibrationStart(scenarios);
      if (calibState.view === "scenario") return renderCalibrationScenario(scenarios);
      if (calibState.view === "feedback") return renderCalibrationFeedback(scenarios);
      if (calibState.view === "summary") return renderCalibrationSummary();
      return renderCalibrationStart(scenarios);
    }

    function renderCalibrationStart(scenarios) {
      var byDomain = {};
      CALIBRATION_SCENARIOS.forEach(function (s) {
        byDomain[s.domain] = (byDomain[s.domain] || 0) + 1;
      });
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 720, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("start"); },
            "aria-label": "Back to start",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back"),
          h("div", { style: { flex: 1, minWidth: 200 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Phase Z · Calibration mode"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "🎓 Inter-rater calibration training")
          )
        ),
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("p", { style: { margin: "0 0 10px", fontSize: 14, color: "var(--da-ink-2)", lineHeight: 1.7 } },
            "Practice DA scoring on pre-vetted scenarios. Each presents an item + a real-shaped student response. You score it, then see the expert verdict + the clinical reasoning + the common-misalignment teaching point. ",
            h("strong", null, "Nothing is saved to your sessions list."), " This is training only."),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-muted)", lineHeight: 1.6, fontStyle: "italic" } },
            "Use this before your first independent DA sessions, before training a new colleague, or whenever you want to check your scoring drift. Inter-rater reliability is a foundational threshold for any legitimate assessment, including DA.")
        ),
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 } },
            "Filter by domain"),
          h("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
            [
              { id: "all", label: "All domains (" + CALIBRATION_SCENARIOS.length + ")" },
              { id: "math", label: "🧮 Math · " + (byDomain.math || 0) },
              { id: "reading", label: "📖 Reading · " + (byDomain.reading || 0) },
              { id: "working-memory", label: "🧠 Working memory · " + (byDomain["working-memory"] || 0) },
              { id: "language", label: "🗣️ Language · " + (byDomain.language || 0) }
            ].map(function (opt) {
              var active = calibState.filterDomain === opt.id;
              return h("button", {
                key: "da-cal-filter-" + opt.id,
                onClick: function () { updateCalibState({ filterDomain: opt.id, scenarioIdx: 0 }); },
                "aria-pressed": active,
                style: {
                  padding: "5px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                  border: active ? "1.5px solid var(--da-accent)" : "1px solid var(--da-border-2)",
                  background: active ? "var(--da-accent)" : "var(--da-surface)",
                  color: active ? "var(--da-on-accent)" : "var(--da-ink-3)",
                  cursor: "pointer", fontFamily: "inherit"
                }
              }, opt.label);
            })
          )
        ),
        h("div", { className: "da-card" },
          h("h2", { style: { margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--da-ink)" } },
            "Available scenarios · " + scenarios.length),
          scenarios.length === 0 ? h("p", { style: { color: "var(--da-muted)", fontStyle: "italic" } }, "No scenarios match this filter.") :
          h("ol", { style: { paddingLeft: 22, fontSize: 13, lineHeight: 1.6, color: "var(--da-ink-2)", margin: 0 } },
            scenarios.map(function (sc, si) {
              return h("li", { key: "da-cal-list-" + sc.id, style: { marginBottom: 4 } },
                h("strong", null, sc.title),
                h("span", { style: { color: "var(--da-muted)", fontSize: 11.5, marginLeft: 6 } },
                  "· " + sc.domain + " · " + sc.phase + " phase"));
            })
          ),
          h("div", { style: { marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" } },
            h("button", {
              onClick: function () {
                updateCalibState({
                  view: "scenario", scenarioIdx: 0, results: [],
                  currentResponse: { finalCorrect: null, supportType: "none", observationTags: [] }
                });
              },
              disabled: scenarios.length === 0,
              "aria-label": "Begin calibration session",
              style: { padding: "10px 22px", borderRadius: 10, border: "none", background: scenarios.length > 0 ? "var(--da-accent)" : "var(--da-faint)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 14, cursor: scenarios.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }
            }, "▶ Begin calibration")
          )
        )
      );
    }

    function renderCalibrationScenario(scenarios) {
      var sc = scenarios[calibState.scenarioIdx];
      if (!sc) return renderCalibrationSummary();
      var cr = calibState.currentResponse;
      var canSubmit = cr.finalCorrect !== null;
      var phaseColors = { pretest: daTone.slate, mediation: daTone.blueMid, posttest: daTone.green };
      var phaseColor = phaseColors[sc.phase] || daTone.muted;
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              daAskConfirm({
                message: "Exit calibration? Progress will be discarded.",
                confirmLabel: "Exit calibration",
                onConfirm: function () { resetCalibration(); setStartScreenView("start"); }
              });
            },
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }
          }, "✕ Exit"),
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: phaseColor, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 } },
              "Calibration · scenario " + (calibState.scenarioIdx + 1) + " of " + scenarios.length + " · " + sc.phase + " phase"),
            h("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--da-ink)", marginTop: 2 } }, sc.title)
          )
        ),
        // Progress bar
        h("div", {
          role: "progressbar",
          "aria-valuemin": 0, "aria-valuemax": scenarios.length, "aria-valuenow": calibState.scenarioIdx,
          "aria-label": "Calibration progress: scenario " + (calibState.scenarioIdx + 1) + " of " + scenarios.length,
          style: { height: 4, background: "var(--da-border)", borderRadius: 2, overflow: "hidden", marginBottom: 14 }
        },
          h("div", { style: { width: Math.round((calibState.scenarioIdx / scenarios.length) * 100) + "%", height: "100%", background: phaseColor, transition: "width 0.3s ease" } })
        ),
        // Item card
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 } },
            sc.item.construct + " · grades " + sc.item.gradeBand),
          h("p", { style: { margin: 0, fontSize: 15.5, color: "var(--da-ink)", lineHeight: 1.65 } }, sc.item.prompt),
          h("details", { style: { marginTop: 8 } },
            h("summary", { style: { fontSize: 11, color: "var(--da-muted)", cursor: "pointer", fontStyle: "italic" } }, "Reveal canonical answer"),
            h("div", { style: { marginTop: 4, padding: 6, background: "var(--da-surface-3)", borderRadius: 4, fontSize: 12, fontFamily: "ui-monospace, monospace", color: "var(--da-ink)" } }, sc.item.correctAnswer)
          )
        ),
        // Scaffold delivered indicator (mediation only)
        sc.phase === "mediation" ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-amber-tint)", borderColor: "var(--da-amber-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "Scaffolds delivered up to this point: L" + sc.scaffoldsDelivered),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-amber-text-2)", fontStyle: "italic", lineHeight: 1.55 } },
            "The examiner delivered scaffolds up through level " + sc.scaffoldsDelivered + ". The student's response below came after those scaffolds.")
        ) : null,
        // Student response card
        h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-blue-tint)", borderColor: "var(--da-blue-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-accent-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 6 } },
            "Student response"),
          h("p", { style: { margin: 0, fontSize: 14.5, color: "var(--da-ink)", lineHeight: 1.7, fontStyle: "italic" } },
            "“" + sc.studentResponse + "”")
        ),
        // Your scoring inputs
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "Your scoring"),
          // Correct / wrong
          h("div", { style: { marginBottom: 10 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } }, "Final correct?"),
            h("div", { style: { display: "flex", gap: 6 } },
              h("button", {
                onClick: function () { updateCalibResponse({ finalCorrect: true }); },
                "aria-pressed": cr.finalCorrect === true,
                style: { padding: "6px 16px", borderRadius: 6, border: "1px solid " + (cr.finalCorrect === true ? "var(--da-green-mid)" : "var(--da-border-2)"), background: cr.finalCorrect === true ? "var(--da-green-mid)" : "var(--da-surface)", color: cr.finalCorrect === true ? "var(--da-on-accent)" : "var(--da-ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "✓ Correct"),
              h("button", {
                onClick: function () { updateCalibResponse({ finalCorrect: false }); },
                "aria-pressed": cr.finalCorrect === false,
                style: { padding: "6px 16px", borderRadius: 6, border: "1px solid " + (cr.finalCorrect === false ? "var(--da-red-text)" : "var(--da-border-2)"), background: cr.finalCorrect === false ? "var(--da-red-tint)" : "var(--da-surface)", color: cr.finalCorrect === false ? "var(--da-red-text)" : "var(--da-ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "✗ Wrong")
            )
          ),
          // Support type
          h("div", { style: { marginBottom: 10 } },
            h("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
              "Support type" + (sc.phase === "mediation" ? "" : " (pretest/posttest = 'none')")),
            h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
              [
                { id: "none", label: "None (unprompted)" },
                { id: "cue", label: "L1 cue" },
                { id: "leading", label: "L2 leading" },
                { id: "model", label: "L3 model" },
                { id: "directTeach", label: "L4 direct teach" },
                { id: "skipped", label: "Skipped" }
              ].map(function (opt) {
                var active = (cr.supportType || "none") === opt.id;
                return h("button", {
                  key: "da-cal-sup-" + opt.id,
                  onClick: function () { updateCalibResponse({ supportType: opt.id }); },
                  "aria-pressed": active,
                  style: { padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: active ? "1.5px solid var(--da-accent)" : "1px solid var(--da-border-2)", background: active ? "var(--da-accent)" : "var(--da-surface)", color: active ? "var(--da-on-accent)" : "var(--da-ink-3)", cursor: "pointer", fontFamily: "inherit" }
                }, opt.label);
              })
            )
          ),
          // Observation tags
          h("div", null,
            h("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } }, "Observation tags (optional)"),
            h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
              OBSERVATION_TAGS.map(function (tag) {
                var active = (cr.observationTags || []).indexOf(tag.id) >= 0;
                return h("button", {
                  key: "da-cal-tag-" + tag.id,
                  onClick: function () { toggleCalibTag(tag.id); },
                  "aria-pressed": active,
                  title: tag.hint,
                  style: { padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: active ? "1px solid var(--da-accent)" : "1px solid var(--da-border-2)", background: active ? "var(--da-accent)" : "var(--da-surface)", color: active ? "var(--da-on-accent)" : "var(--da-ink-3)", cursor: "pointer", fontFamily: "inherit" }
                }, tag.label);
              })
            )
          )
        ),
        // Submit
        h("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
          h("button", {
            onClick: function () {
              var agreement = scoreCalibrationAgreement(cr, sc.expertScoring);
              var result = {
                scenarioId: sc.id,
                clinicianScore: cr,
                expertScoring: sc.expertScoring,
                agreement: agreement.agreement,
                mismatches: agreement.mismatches
              };
              setCalibState(function (prev) {
                return Object.assign({}, prev, { view: "feedback", results: prev.results.concat([result]) });
              });
            },
            disabled: !canSubmit,
            "aria-label": "Submit scoring and see expert verdict",
            style: { padding: "10px 22px", borderRadius: 10, border: "none", background: canSubmit ? "var(--da-accent)" : "var(--da-faint)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 14, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }
          }, "Compare to expert →")
        )
      );
    }

    function renderCalibrationFeedback(scenarios) {
      var sc = scenarios[calibState.scenarioIdx];
      var lastResult = calibState.results[calibState.results.length - 1];
      if (!sc || !lastResult) return renderCalibrationSummary();
      var agreementColors = { "full": daTone.green, "minor-only": daTone.amber, "major-disagreement": daTone.red };
      var agreementLabels = { "full": "Full agreement", "minor-only": "Minor-disagreement only", "major-disagreement": "Major disagreement" };
      var color = agreementColors[lastResult.agreement] || daTone.muted;
      var isLast = calibState.scenarioIdx >= scenarios.length - 1;
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 } },
              "Calibration feedback · scenario " + (calibState.scenarioIdx + 1) + " of " + scenarios.length),
            h("div", { style: { fontSize: 16, fontWeight: 800, color: color, marginTop: 2 } },
              (lastResult.agreement === "full" ? "✓ " : lastResult.agreement === "minor-only" ? "≈ " : "✗ ") + agreementLabels[lastResult.agreement])
          )
        ),
        // Mismatches (if any)
        lastResult.mismatches.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, borderColor: color + "55", background: color + "0d" } },
          h("div", { style: { fontSize: 11, color: color, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 6 } },
            "Differences from expert"),
          h("ul", { style: { margin: 0, paddingLeft: 22, fontSize: 12.5, color: "var(--da-ink-2)", lineHeight: 1.6 } },
            lastResult.mismatches.map(function (m, mi) {
              return h("li", { key: "da-cal-mismatch-" + mi, style: { marginBottom: 4 } },
                h("span", { style: { fontSize: 10, fontWeight: 800, color: m.severity === "major" ? "var(--da-red-text)" : "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 6 } }, "[" + m.severity + "]"),
                m.description);
            })
          )
        ) : h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, borderColor: "var(--da-green-border)", background: "var(--da-green-tint)" } },
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-green-text-2)", fontWeight: 600 } },
            "✓ Your scoring matches the expert verdict exactly. Nicely done.")
        ),
        // Expert reasoning
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, color: "var(--da-accent-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 6 } },
            "Expert reasoning · score: " + sc.expertScoring.scoreAwarded + " pts"),
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-ink)", lineHeight: 1.65 } },
            sc.expertScoring.reasoning)
        ),
        // Teaching point
        h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-amber-tint-3)", borderColor: "var(--da-amber-border-2)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 6 } },
            "📚 Teaching point"),
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-orange-deep)", lineHeight: 1.65 } },
            sc.expertScoring.teachingPoint)
        ),
        // Side-by-side
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 } },
            "Side by side"),
          h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            h("thead", null,
              h("tr", { style: { background: "var(--da-surface-3)" } },
                h("th", { scope: "col", style: { padding: "5px 8px", textAlign: "left", border: "1px solid var(--da-border-2)", fontSize: 11 } }, "Field"),
                h("th", { scope: "col", style: { padding: "5px 8px", textAlign: "left", border: "1px solid var(--da-border-2)", fontSize: 11 } }, "You"),
                h("th", { scope: "col", style: { padding: "5px 8px", textAlign: "left", border: "1px solid var(--da-border-2)", fontSize: 11 } }, "Expert")
              )
            ),
            h("tbody", null,
              h("tr", null,
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)", fontWeight: 700 } }, "Correct?"),
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)" } }, lastResult.clinicianScore.finalCorrect ? "✓" : "✗"),
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)" } }, sc.expertScoring.finalCorrect ? "✓" : "✗")
              ),
              h("tr", null,
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)", fontWeight: 700 } }, "Support"),
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)" } }, lastResult.clinicianScore.supportType || "none"),
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)" } }, sc.expertScoring.supportType)
              ),
              h("tr", null,
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)", fontWeight: 700 } }, "Tags"),
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)" } },
                  (lastResult.clinicianScore.observationTags || []).map(function (t) { var d = OBSERVATION_TAGS_BY_ID[t]; return d ? d.label : t; }).join(", ") || "—"),
                h("td", { style: { padding: "5px 8px", border: "1px solid var(--da-border)" } },
                  (sc.expertScoring.observationTags || []).map(function (t) { var d = OBSERVATION_TAGS_BY_ID[t]; return d ? d.label : t; }).join(", ") || "—")
              )
            )
          )
        ),
        // Next
        h("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
          h("button", {
            onClick: function () {
              if (isLast) {
                updateCalibState({ view: "summary" });
              } else {
                updateCalibState({
                  view: "scenario",
                  scenarioIdx: calibState.scenarioIdx + 1,
                  currentResponse: { finalCorrect: null, supportType: "none", observationTags: [] }
                });
              }
            },
            "aria-label": isLast ? "See summary" : "Next scenario",
            style: { padding: "10px 22px", borderRadius: 10, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
          }, isLast ? "See summary →" : "Next scenario →")
        )
      );
    }

    function renderCalibrationSummary() {
      var results = calibState.results;
      var total = results.length;
      if (total === 0) return renderCalibrationStart(getCalibScenarios());
      var fullAgreement = results.filter(function (r) { return r.agreement === "full"; }).length;
      var minorOnly = results.filter(function (r) { return r.agreement === "minor-only"; }).length;
      var majorDisagree = results.filter(function (r) { return r.agreement === "major-disagreement"; }).length;
      var fullPct = Math.round((fullAgreement / total) * 100);
      var consistentPct = Math.round(((fullAgreement + minorOnly) / total) * 100);
      // Aggregate mismatch criteria
      var criterionCounts = {};
      results.forEach(function (r) {
        r.mismatches.forEach(function (m) {
          criterionCounts[m.criterion] = (criterionCounts[m.criterion] || 0) + 1;
        });
      });
      var criterionList = Object.keys(criterionCounts).map(function (c) {
        return { criterion: c, count: criterionCounts[c] };
      }).sort(function (a, b) { return b.count - a.count; });

      // Interpretation
      var interpLabel, interpColor, interpDesc;
      if (fullPct >= 80) {
        interpLabel = "Strong scoring consistency"; interpColor = daTone.green;
        interpDesc = "Your scoring aligns closely with expert verdicts. Continue practicing periodically to check for drift, especially before high-stakes evaluations.";
      } else if (consistentPct >= 80) {
        interpLabel = "Acceptable scoring with minor variation"; interpColor = daTone.amber;
        interpDesc = "Your major-criterion decisions (correct/wrong, support level) align with expert verdicts. Minor disagreements (observation tag selection) are common and acceptable, though worth reviewing.";
      } else {
        interpLabel = "Significant scoring drift — review teaching points"; interpColor = daTone.red;
        interpDesc = "Major disagreements (correct/wrong or support level) appeared in " + Math.round((majorDisagree / total) * 100) + "% of scenarios. Re-read the teaching points on each disagreement before running real sessions. Consider a second pass through these scenarios.";
      }
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 720, margin: "0 auto", padding: 20 } },
        h("div", { style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } }, "Calibration complete"),
          h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } }, "🎓 Your scoring profile")
        ),
        h("div", { className: "da-card da-pop", style: { marginBottom: 14, padding: 18, borderColor: interpColor + "55", background: interpColor + "0d" } },
          h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 6 } },
            "Overall · " + total + " scenarios"),
          h("div", { style: { fontSize: 42, fontWeight: 900, color: "var(--da-ink)", lineHeight: 1 } }, fullPct + "%"),
          h("div", { style: { fontSize: 12, color: "var(--da-ink-3)", marginTop: 4 } }, "full agreement · " + consistentPct + "% major-criterion agreement"),
          h("div", { style: { fontSize: 15, fontWeight: 700, color: interpColor, marginTop: 10 } }, interpLabel),
          h("p", { style: { margin: "8px 0 0", fontSize: 13, color: "var(--da-ink-2)", lineHeight: 1.65 } }, interpDesc)
        ),
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 } },
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12 } },
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-green-text)" } }, fullAgreement),
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 } }, "Full agreement")),
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12 } },
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-amber-text)" } }, minorOnly),
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 } }, "Minor only")),
          h("div", { className: "da-card", style: { textAlign: "center", padding: 12 } },
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-red-text)" } }, majorDisagree),
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 } }, "Major"))
        ),
        criterionList.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
            "Where disagreements clustered"),
          h("p", { style: { margin: "0 0 8px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
            "Criteria where your scoring most often differed from expert verdicts. High-frequency entries point to areas worth deliberate practice."),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--da-ink-3)" } },
            criterionList.map(function (c) {
              var max = criterionList[0].count;
              var bar = Math.min(1, c.count / Math.max(1, max));
              return h("div", { key: "da-cal-crit-" + c.criterion, style: { display: "flex", alignItems: "center", gap: 8 } },
                h("span", { style: { minWidth: 170, fontFamily: "ui-monospace, monospace", fontSize: 11 } }, c.criterion),
                h("div", { style: { flex: 1, height: 8, background: "var(--da-surface-3)", borderRadius: 4, overflow: "hidden" } },
                  h("div", { style: { height: "100%", width: Math.round(bar * 100) + "%", background: "var(--da-accent)" } })),
                h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--da-ink)", minWidth: 30, textAlign: "right" } }, "×" + c.count));
            })
          )
        ) : null,
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              updateCalibState({
                view: "scenario", scenarioIdx: 0, results: [],
                currentResponse: { finalCorrect: null, supportType: "none", observationTags: [] }
              });
            },
            style: { padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "↻ Run again"),
          h("button", {
            onClick: function () { resetCalibration(); setStartScreenView("start"); },
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "Done")
        )
      );
    }

    function renderReferenceGuide() {
      // Inline anchor-style section nav (jumps via scrollIntoView)
      function scrollToSection(id) {
        try {
          var el = document.getElementById(id);
          if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } catch (e) { /* ignore */ }
      }
      var SECTIONS = [
        { id: "ref-what",     label: "1. What DA measures" },
        { id: "ref-mi",       label: "2. Modifiability Index tiers" },
        { id: "ref-transfer", label: "3. Transfer Tier interpretation" },
        { id: "ref-ladder",   label: "4. Scaffold ladder quality" },
        { id: "ref-use",      label: "5. When to use DA" },
        { id: "ref-notuse",   label: "6. When NOT to use DA" },
        { id: "ref-report",   label: "7. Framing in IEP reports" },
        { id: "ref-cite",     label: "8. Citations + further reading" }
      ];
      // Shared section styling
      var sectionStyle = { marginBottom: 22, paddingTop: 4 };
      var sectionTitleStyle = { fontSize: 17, fontWeight: 800, margin: "0 0 10px", color: "var(--da-ink)", borderBottom: "2px solid var(--da-accent)", paddingBottom: 6 };
      var subTitleStyle = { fontSize: 14, fontWeight: 800, margin: "14px 0 6px", color: "var(--da-ink)" };
      var bodyStyle = { fontSize: 13, lineHeight: 1.7, color: "var(--da-ink-2)", margin: "0 0 10px" };
      var tierBox = { padding: "10px 14px", borderRadius: 10, marginBottom: 8 };

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 800, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("start"); },
            "aria-label": "Back to start",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back"),
          h("div", null,
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Phase H · Clinical reference"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "📚 Interpretation guide")
          )
        ),

        // Lead paragraph
        h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-blue-tint)", borderColor: "var(--da-blue-border)" } },
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-accent-text)", lineHeight: 1.65 } },
            "This guide is for clinicians using the Dynamic Assessment Studio. It covers what the methodology measures, how to interpret the indices, when DA is and isn't appropriate, and how to frame findings in IEP-ready reports. ",
            h("strong", null, "It is not a substitute for training in dynamic assessment methodology"),
            ". For deeper preparation see the citations in section 8.")
        ),

        // Section nav
        h("div", { className: "da-card", style: { marginBottom: 18 } },
          h("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 } },
            "Jump to"),
          h("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
            SECTIONS.map(function (sec) {
              return h("button", {
                key: "ref-nav-" + sec.id,
                onClick: function () { scrollToSection(sec.id); },
                style: { padding: "5px 10px", borderRadius: 6, border: "1px solid var(--da-border-2)", background: "var(--da-surface-2)", color: "var(--da-ink)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, sec.label);
            })
          )
        ),

        // ── Section 1: What DA measures ──
        h("section", { id: "ref-what", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "1. What DA measures (and what it doesn't)"),
          h("p", { style: bodyStyle },
            h("strong", null, "Dynamic Assessment measures modifiability: "),
            "how much a student's performance changes with structured scaffolding. The methodology is rooted in Vygotsky's Zone of Proximal Development (the gap between independent performance and assisted performance) and Feuerstein's Mediated Learning Experience framework."),
          h("p", { style: bodyStyle },
            "Unlike a standardized cognitive battery — which produces a static score against a normed sample — DA produces a within-student trajectory. The clinical inference is about ",
            h("em", null, "responsiveness to teaching"),
            ", not innate ability."),
          h("h3", { style: subTitleStyle }, "What DA CAN tell you"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "How responsive a student is to scaffolded instruction in a specific construct domain."),
            h("li", null, "Which type of scaffold (cue, leading question, modeling, direct teach) was effective — useful intervention information."),
            h("li", null, "Whether observed performance gaps reflect skill acquisition lag or genuine difficulty with the underlying construct."),
            h("li", null, "Whether learning generalizes to novel surface features (via transfer probes).")
          ),
          h("h3", { style: subTitleStyle }, "What DA CANNOT tell you"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "A normed cognitive or academic score. The Modifiability Index is descriptive, not normative."),
            h("li", null, "Eligibility for special-education services on its own. This is a supplementary observation, not a primary measure."),
            h("li", null, "Generalization to constructs that weren't probed. A math DA tells you about math; not reading."),
            h("li", null, "Long-term outcomes. Within-session modifiability does not directly predict 6-month or 12-month academic trajectory.")
          )
        ),

        // ── Section 2: MI tiers ──
        h("section", { id: "ref-mi", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "2. Modifiability Index tiers"),
          h("p", { style: bodyStyle },
            "The Modifiability Index is computed as ",
            h("code", { style: { background: "var(--da-surface-3)", padding: "1px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace" } }, "(posttest − pretest) ÷ (maxPossible − pretest)"),
            " — the proportion of available growth that was realized after the mediation phase. Bounded [−1, 1]. ",
            h("strong", null, "The tier cut-points below (0.30 / 0.60) are interpretation conventions of this tool"),
            " — chosen to structure clinical reasoning, not derived from normative or validation data. Treat the tiers as a reading frame, and the underlying pattern (clear gain / partial gain / little change / regression) as the finding."),
          // High
          h("div", { style: { ...tierBox, background: "var(--da-green-tint)", border: "1px solid var(--da-green-border)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-green-text-2)", fontSize: 13.5, marginBottom: 4 } }, "MI ≥ 0.6 — Responsive to mediation"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-green-deep-2)", lineHeight: 1.6 } },
              "Substantial growth between pretest and posttest. The scaffolds used were well-matched to the student's profile. Continued instruction with similar mediation patterns is likely to be productive. Clinically: this is a strong positive signal that the construct is within the student's ZPD given appropriate support.")
          ),
          // Moderate
          h("div", { style: { ...tierBox, background: "var(--da-amber-tint)", border: "1px solid var(--da-amber-border)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-amber-text)", fontSize: 13.5, marginBottom: 4 } }, "MI 0.3–0.6 — Moderately responsive"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-amber-text-2)", lineHeight: 1.6 } },
              "Some growth observed with scaffolding. The student benefited from mediation but needs repeated exposure to consolidate gains. Consider targeted Tier-2 intervention using the scaffold types that worked. This is the most common pattern in clinical practice — most students fall here.")
          ),
          // Low
          h("div", { style: { ...tierBox, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-red-text)", fontSize: 13.5, marginBottom: 4 } }, "MI 0.0–0.3 — Limited modifiability under these conditions"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-red-deep)", lineHeight: 1.6 } },
              "Minimal change between pretest and posttest. This may indicate that the scaffolds used were not well-matched, OR that a different construct should be probed, OR that the student has limited modifiability in this specific construct under these specific mediation conditions. ",
              h("strong", null, "Do not interpret as 'unable to learn.' "),
              "Try alternate mediation strategies before drawing conclusions.")
          ),
          // Regression
          h("div", { style: { ...tierBox, background: "var(--da-surface-3)", border: "1px solid var(--da-border-2)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-ink-3)", fontSize: 13.5, marginBottom: 4 } }, "MI < 0 — Regression"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-ink-2)", lineHeight: 1.6 } },
              "Posttest performance below pretest. Almost always reflects fatigue, anxiety, motivation drop, or session-length issues — not ability. Re-test on a different day with a shorter session.")
          )
        ),

        // ── Section 3: Transfer Tiers ──
        h("section", { id: "ref-transfer", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "3. Transfer Tier interpretation"),
          h("p", { style: bodyStyle },
            "The transfer probe (when items have transferTwin defined) re-tests the same construct on novel surface features. ",
            h("strong", null, "Pretest→posttest growth on SAME items conflates memory with learning. "),
            "Transfer probes the cleaner question: did the mediation produce ",
            h("em", null, "generalizable"),
            " change?"),
          h("div", { style: { ...tierBox, background: "var(--da-green-tint)", border: "1px solid var(--da-green-border)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-green-text)", fontSize: 13.5, marginBottom: 4 } }, "Transfer ≥ 70% — Strong transfer"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-green-deep-2)", lineHeight: 1.6 } },
              "Performance on transfer items was strong. The student appears to have learned the underlying construct, not just memorized the practiced items. Clearest pattern of generalizable learning.")
          ),
          h("div", { style: { ...tierBox, background: "var(--da-amber-tint)", border: "1px solid var(--da-amber-border)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-amber-text)", fontSize: 13.5, marginBottom: 4 } }, "Partial transfer (≥70% of posttest)"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-amber-text-2)", lineHeight: 1.6 } },
              "Transfer-item performance approached but did not match posttest performance. The student retained much of what was learned but generalization is incomplete. Continued exposure to varied surface features is indicated.")
          ),
          h("div", { style: { ...tierBox, background: "var(--da-amber-tint-2)", border: "1px solid var(--da-orange-mid-2)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-orange-text)", fontSize: 13.5, marginBottom: 4 } }, "Weak transfer (40–70% of posttest)"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-orange-text-2)", lineHeight: 1.6 } },
              "Transfer performance was meaningfully below posttest. The posttest gain may reflect item-specific learning or memory of mediation rather than construct mastery. Plan additional generalization practice before drawing instructional conclusions.")
          ),
          h("div", { style: { ...tierBox, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)" } },
            h("div", { style: { fontWeight: 800, color: "var(--da-red-text)", fontSize: 13.5, marginBottom: 4 } }, "Minimal transfer"),
            h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-red-deep)", lineHeight: 1.6 } },
              "Performance on novel items collapsed back to baseline. The posttest gains appear to reflect item-specific memory. The construct has not yet been mastered in a generalizable form. ",
              h("strong", null, "This is a critical clinical signal: "),
              "do not interpret the posttest gain as evidence of learning — interpret the transfer collapse as evidence of un-generalized learning.")
          )
        ),

        // ── Section 4: Ladder quality ──
        h("section", { id: "ref-ladder", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "4. Scaffold ladder quality"),
          h("p", { style: bodyStyle },
            "Every item ships with a 4-level scaffold ladder. The clinical validity of DA depends heavily on whether these scaffolds escalate cleanly. Common AI-generated failure modes to watch for when reviewing custom probes:"),
          h("h3", { style: subTitleStyle }, "L1 (Declarative cue)"),
          h("p", { style: bodyStyle },
            h("strong", null, "Should: "), "orient the student to what the question is asking, without leading toward a specific strategy or operation. ",
            h("strong", null, "Common failures: "), "embedding the canonical answer, naming the operation (which leaks L2), or using a question form (which leaks L2).")
          ,
          h("h3", { style: subTitleStyle }, "L2 (Leading question)"),
          h("p", { style: bodyStyle },
            h("strong", null, "Should: "), "ask a directing question that nudges toward the operation or strategy WITHOUT giving the answer. ",
            h("strong", null, "Common failures: "), "stating the answer in a leading-question wrapper (e.g., 'You need to subtract 5 from 12, right?').")
          ,
          h("h3", { style: subTitleStyle }, "L3 (Modeling)"),
          h("p", { style: bodyStyle },
            h("strong", null, "Should: "), "show a PARALLEL example (different numbers/setting/surface features) and redirect the student to apply the same move to their item. ",
            h("strong", null, "Common failures: "), "solving the actual item rather than a parallel one, or modeling without redirecting (which makes L3 indistinguishable from L4).")
          ,
          h("h3", { style: subTitleStyle }, "L4 (Direct teach)"),
          h("p", { style: bodyStyle },
            h("strong", null, "Should: "), "give the canonical answer with brief reasoning. This is the floor of the ladder — if the student is still wrong after L4, they receive 0 points for the item. ",
            h("strong", null, "Common failures: "), "rare — L4 is the easiest level to write."),
          h("p", { style: { ...bodyStyle, fontStyle: "italic", color: "var(--da-muted)" } },
            "If reviewing an AI-generated probe surfaces any of these failure modes, use the per-item Regenerate button OR edit the ladder text inline before running the session.")
        ),

        // ── Section 5: When to use ──
        h("section", { id: "ref-use", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "5. When to use DA"),
          h("p", { style: bodyStyle },
            "DA is most valuable as a supplementary clinical observation tool. Strongest clinical indications:"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, h("strong", null, "Re-evaluations. "), "Standardized scores already exist; DA adds qualitative depth + responsiveness data without duplicating effort."),
            h("li", null, h("strong", null, "EL students or culturally diverse populations. "), "Standardized cognitive measures have documented bias. DA has been shown in some studies to reduce identification bias for these groups (e.g., Peña, Iglesias, & Lidz, 2001; see also Lidz, 2003; Tzuriel, 2001) — supportive evidence, not a guarantee of unbiased measurement."),
            h("li", null, h("strong", null, "Tier-2 RTI triage. "), "A 15-minute brief probe before a formal eval can clarify whether a referred student needs more intensive assessment or whether a Tier-2 intervention is likely to suffice."),
            h("li", null, h("strong", null, "Discrepant test data. "), "When standardized scores are inconsistent with classroom performance, DA can probe whether the gap is in skill acquisition, processing demand, or motivation."),
            h("li", null, h("strong", null, "Intervention planning. "), "Knowing which scaffold types produced success informs the specific accommodations + intervention recommendations.")
          )
        ),

        // ── Section 6: When NOT to use ──
        h("section", { id: "ref-notuse", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "6. When NOT to use DA"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, h("strong", null, "As a primary measure for eligibility decisions. "), "The Modifiability Index is not normed. Eligibility decisions require standardized batteries with established reliability and validity."),
            h("li", null, h("strong", null, "As a replacement for cognitive or academic assessments. "), "DA supplements, never replaces, the standardized component of an evaluation."),
            h("li", null, h("strong", null, "When the student is acutely dysregulated. "), "DA requires sustained engagement across 3–4 phases. A student in crisis cannot produce interpretable modifiability data."),
            h("li", null, h("strong", null, "Without parent / guardian consent for non-standardized procedures. "), "Most district policies require explicit consent for adding non-standard assessment components."),
            h("li", null, h("strong", null, "For cross-student comparisons. "), "MI is a within-student metric. Comparing two students' MIs is not meaningful without normative data the tool does not provide.")
          )
        ),

        // ── Section 7: Reporting framing ──
        h("section", { id: "ref-report", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "7. Framing in IEP / psychoed reports"),
          h("p", { style: bodyStyle },
            "DA findings should be reported as ",
            h("strong", null, "clinical observations of learning behavior"),
            ", not as test scores. Recommended language patterns:"),
          h("h3", { style: subTitleStyle }, "Recommended phrasing"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "\"A supplementary dynamic-assessment probe was administered to observe response to scaffolded instruction…\""),
            h("li", null, "\"Following structured mediation, the student demonstrated [tier] modifiability, indicating…\""),
            h("li", null, "\"The most effective scaffolds were [type], suggesting that classroom accommodations should include…\""),
            h("li", null, "\"Transfer-probe performance suggests [strong / partial / weak / minimal] generalization to novel surface features.\"")
          ),
          h("h3", { style: subTitleStyle }, "Avoid"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "Reporting the Modifiability Index as a standard score, percentile, or classification."),
            h("li", null, "Drawing eligibility conclusions from DA alone."),
            h("li", null, "Comparing the student's MI to other students or to a published mean (no normative data exists)."),
            h("li", null, "Framing DA as a 'better test' than standardized measures — it answers different questions, not better ones.")
          ),
          h("p", { style: bodyStyle },
            h("strong", null, "Report Writer integration: "),
            "When you export DA findings to Report Writer, the auto-drafted 'Dynamic Assessment Results' section uses appropriate framing and includes a caveat sentence. Review and edit the auto-draft before finalizing the report — the framing is a starting point, not a final draft.")
        ),

        // ── Section 8: Citations ──
        h("section", { id: "ref-cite", style: sectionStyle },
          h("h2", { style: sectionTitleStyle }, "8. Citations + further reading"),
          h("p", { style: bodyStyle },
            "If you have not been formally trained in dynamic assessment, the following are starting points:"),
          h("h3", { style: subTitleStyle }, "Foundational"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "Vygotsky, L. S. (1978). ", h("em", null, "Mind in Society: The Development of Higher Psychological Processes"), ". Harvard University Press. (The Zone of Proximal Development concept.)"),
            h("li", null, "Feuerstein, R., Rand, Y., & Hoffman, M. B. (1979). ", h("em", null, "The Dynamic Assessment of Retarded Performers: The Learning Potential Assessment Device, Theory, Instruments, and Techniques"), ". University Park Press.")
          ),
          h("h3", { style: subTitleStyle }, "Practitioner-oriented"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "Lidz, C. S. (2003). ", h("em", null, "Early Childhood Assessment"), ". Wiley. (Includes the Application of Cognitive Functions Scale + chapter-length DA framework.)"),
            h("li", null, "Lidz, C. S., & Elliott, J. G. (Eds.). (2000). ", h("em", null, "Dynamic Assessment: Prevailing Models and Applications"), ". JAI Press."),
            h("li", null, "Tzuriel, D. (2001). ", h("em", null, "Dynamic Assessment of Young Children"), ". Springer."),
            h("li", null, "Haywood, H. C., & Lidz, C. S. (2007). ", h("em", null, "Dynamic Assessment in Practice: Clinical and Educational Applications"), ". Cambridge University Press.")
          ),
          h("h3", { style: subTitleStyle }, "Graduated-prompts research"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "Campione, J. C., & Brown, A. L. (1987). Linking dynamic assessment with school achievement. In C. S. Lidz (Ed.), ", h("em", null, "Dynamic Assessment"), " (pp. 82–115). Guilford Press."),
            h("li", null, "Resing, W. C. M., & Elliott, J. G. (2011). Dynamic testing with tangible electronics: Measuring children's change in strategy use with a series-completion task. ", h("em", null, "British Journal of Educational Psychology"), ", 81(4), 579–605.")
          ),
          h("h3", { style: subTitleStyle }, "Cultural / linguistic fairness"),
          h("ul", { style: { ...bodyStyle, paddingLeft: 22, margin: 0 } },
            h("li", null, "Peña, E. D., Iglesias, A., & Lidz, C. S. (2001). Reducing test bias through dynamic assessment of children's word-learning ability. ", h("em", null, "American Journal of Speech-Language Pathology"), ", 10(2), 138–154."),
            h("li", null, "NASP (2010). Best practices for school psychologists with culturally and linguistically diverse populations.")
          ),
          h("p", { style: { ...bodyStyle, fontStyle: "italic", color: "var(--da-muted)", marginTop: 14 } },
            "This tool's methodology is grounded in but does not directly implement any specific published instrument (LPAD, ACFS, ARROW, etc.). The Modifiability Index is descriptive and was designed for this tool; it is not normed against published populations.")
        )
      );
    }

    // ─── Phase F — Sessions browser ───
    // Lists all saved sessions with a student-nickname filter at the top.
    // Each session card has Run-again / View-detail / Export-JSON actions.
    // When 2+ sessions share a nickname, a longitudinal comparison strip
    // shows the modifiability-index trajectory inline.
    function renderSessionsBrowser() {
      var allSessions = (state.sessions || []).slice().reverse(); // newest first
      var filterText = (sessionFilter || "").trim().toLowerCase();
      var filtered = filterText
        ? allSessions.filter(function (s) {
            var nick = (s.studentNickname || "").toLowerCase();
            var dom = (s.domain || "").toLowerCase();
            return nick.indexOf(filterText) >= 0 || dom.indexOf(filterText) >= 0;
          })
        : allSessions;

      // Group sessions by nickname for the longitudinal view
      var byStudent = {};
      allSessions.forEach(function (s) {
        var key = (s.studentNickname || "").trim() || "(anonymous)";
        if (!byStudent[key]) byStudent[key] = [];
        byStudent[key].push(s);
      });
      // Students with 2+ sessions get the longitudinal strip
      var longitudinalStudents = Object.keys(byStudent).filter(function (k) {
        return byStudent[k].length >= 2 && k !== "(anonymous)";
      });

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("start"); setSessionFilter(""); },
            "aria-label": "Back to start",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back"),
          h("div", { style: { flex: 1, minWidth: 200 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Phase F · Sessions browser"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "📁 All sessions · " + allSessions.length)
          ),
          // Phase AA — item analytics entry (only meaningful with sessions)
          allSessions.length >= 1 ? h("button", {
            onClick: function () { setStartScreenView("analytics"); },
            "aria-label": "Open item analytics — psychometric stats across all sessions",
            title: "Per-item pretest pass rate, modifiability sensitivity, scaffold escalation, transfer rate",
            style: { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "📊 Item analytics") : null,
          // Phase BB — population stats entry
          allSessions.length >= 1 ? h("button", {
            onClick: function () { setStartScreenView("population"); },
            "aria-label": "Open population statistics — effect sizes and MI distribution across your caseload",
            title: "Cohen's d, MI distribution, tier breakdown, local-norm reference data",
            style: { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--da-violet-mid-2)", background: "var(--da-violet-tint)", color: "var(--da-violet-mid-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "📈 Population stats") : null,
          // Phase EE — back up all sessions to a JSON file (guards the trajectory
          // + local-norm data against a cache clear / device change).
          allSessions.length >= 1 ? h("button", {
            onClick: function () { exportAllSessionsAsJson(); },
            "aria-label": "Back up all sessions to a JSON file",
            title: "Save a JSON backup of your entire session history (protects trajectory + local-norm data)",
            style: { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "💾 Back up") : null,
          // Phase EE — restore from a JSON backup (always available — this is the
          // recovery path after a cache clear or on a new device).
          h("button", {
            onClick: function () { importSessionsFromFile(); },
            "aria-label": "Restore sessions from a JSON backup file",
            title: "Load a previously saved backup; merges in any sessions you don't already have",
            style: { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--da-amber-text-3)", background: "var(--da-amber-tint)", color: "var(--da-amber-text-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "📂 Restore")
        ),

        // Empty state
        allSessions.length === 0 ? h("div", { className: "da-card", style: { textAlign: "center", padding: 32 } },
          h("div", { style: { fontSize: 32, marginBottom: 12 } }, "📭"),
          h("p", { style: { margin: "0 0 6px", fontSize: 14, color: "var(--da-ink-3)", fontWeight: 700 } },
            "No saved sessions yet."),
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-muted)", fontStyle: "italic" } },
            "Complete a session and click 'Save session' to see it here.")
        ) : null,

        // Filter
        allSessions.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, padding: 10 } },
          h("input", {
            type: "text", value: sessionFilter,
            onChange: function (e) { setSessionFilter(e.target.value); },
            placeholder: "Filter by student codename or domain…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
          }),
          filtered.length !== allSessions.length ? h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 4, fontStyle: "italic" } },
            "Showing " + filtered.length + " of " + allSessions.length + " sessions") : null
        ) : null,

        // Longitudinal strips for students with 2+ sessions
        longitudinalStudents.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-blue-tint)", borderColor: "var(--da-blue-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-accent-text)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 6 } },
            "📈 Longitudinal patterns"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
            longitudinalStudents.map(function (name) {
              var studentSessions = byStudent[name].slice().reverse(); // oldest → newest for trajectory
              return h("div", { key: "da-long-" + name, style: { padding: 8, background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 8 } },
                h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4, flexWrap: "wrap" } },
                  h("div", { style: { fontSize: 13, fontWeight: 800, color: "var(--da-ink)" } },
                    "👤 " + name + " · " + studentSessions.length + " sessions"),
                  h("button", {
                    onClick: function () { setLongitudinalStudent(name); setStartScreenView("longitudinal"); },
                    "aria-label": "Open full longitudinal view for " + name,
                    title: "Full trajectory view with chart, trend interpretation, and per-session comparison",
                    style: { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                  }, "📈 Full view")
                ),
                h("div", { style: { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" } },
                  studentSessions.map(function (sn, si) {
                    var idx = (typeof sn.modifiabilityIndex === "number" ? sn.modifiabilityIndex : 0);
                    var color = daHex(idx >= 0.6 ? "#16a34a" : idx >= 0.3 ? "#a16207" : idx >= 0 ? "#b91c1c" : "#475569");
                    var dt = "";
                    try { dt = new Date(sn.dateCompleted).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) {}
                    return h(window.React.Fragment, { key: "da-trail-" + sn.id },
                      h("button", {
                        onClick: function () { setViewingSessionId(sn.id); setStartScreenView("session-detail"); },
                        title: "View session detail",
                        style: { padding: "4px 8px", border: "1.5px solid " + color, borderRadius: 6, background: color + "11", color: color, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56 }
                      },
                        h("div", { style: { lineHeight: 1 } }, (idx >= 0 ? "+" : "") + idx.toFixed(2)),
                        h("div", { style: { fontSize: 9, color: "var(--da-ink-3)", marginTop: 2, lineHeight: 1 } }, dt)
                      ),
                      si < studentSessions.length - 1 ? h("span", { style: { color: "var(--da-ink-3)", fontSize: 14 } }, "→") : null
                    );
                  })
                )
              );
            })
          )
        ) : null,

        // Session list
        filtered.length > 0 ? h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
          filtered.map(function (sn) {
            var dt = "";
            try { dt = new Date(sn.dateCompleted || sn.dateStarted).toLocaleString(); } catch (e) {}
            var idx = (typeof sn.modifiabilityIndex === "number" ? sn.modifiabilityIndex : 0);
            var idxColor = daHex(idx >= 0.6 ? "#16a34a" : idx >= 0.3 ? "#a16207" : idx >= 0 ? "#b91c1c" : "#475569");
            var tierLabel = sn.modifiabilityTier ? sn.modifiabilityTier.label : "(not finalized)";
            return h("div", { key: "da-sess-" + sn.id, className: "da-card", style: { padding: 12 } },
              h("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
                // Index badge
                h("div", { style: { textAlign: "center", minWidth: 64, padding: 6, border: "2px solid " + idxColor, borderRadius: 8, background: idxColor + "11" } },
                  h("div", { style: { fontSize: 17, fontWeight: 900, color: idxColor, lineHeight: 1 } }, (idx >= 0 ? "+" : "") + idx.toFixed(2)),
                  h("div", { style: { fontSize: 9, color: "var(--da-muted)", marginTop: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" } }, "MI")
                ),
                // Meta
                h("div", { style: { flex: 1, minWidth: 200 } },
                  h("div", { style: { fontSize: 13, fontWeight: 800, color: "var(--da-ink)" } },
                    (sn.studentNickname || "Anonymous") + " · " + sn.domain + " (" + sn.difficulty + ")"),
                  h("div", { style: { fontSize: 11, color: "var(--da-muted)", marginTop: 2 } },
                    dt + " · " + (sn.mode === "ai" ? "🤖 AI-mediated" : "🧑‍⚕️ Clinician-led") +
                    " · " + (sn.sessionItemIds ? sn.sessionItemIds.length : "?") + " items"),
                  h("div", { style: { fontSize: 11, color: idxColor, marginTop: 3, fontWeight: 700, fontStyle: "italic" } },
                    tierLabel)
                ),
                // Actions
                h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                  h("button", {
                    onClick: function () {
                      setViewingSessionId(sn.id);
                      setStartScreenView("session-detail");
                    },
                    title: "View detail",
                    style: { padding: "5px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                  }, "View"),
                  h("button", {
                    onClick: function () {
                      exportSessionAsJson(sn);
                    },
                    title: "Download as JSON",
                    style: { padding: "5px 10px", borderRadius: 6, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                  }, "↓ JSON"),
                  h("button", {
                    onClick: function () {
                      daAskConfirm({
                        message: "Delete this session? This cannot be undone.",
                        confirmLabel: "Delete session",
                        onConfirm: function () {
                          patch({ sessions: (state.sessions || []).filter(function (s) { return s.id !== sn.id; }) });
                        }
                      });
                    },
                    "aria-label": "Delete session",
                    title: "Delete",
                    style: { padding: "5px 8px", borderRadius: 6, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                  }, "✕")
                )
              )
            );
          })
        ) : (allSessions.length > 0 ? h("div", { className: "da-card", style: { textAlign: "center", padding: 16, color: "var(--da-muted)" } },
          "No sessions match the filter.") : null)
      );
    }

    // ─── Phase F — Single-session detail view ───
    // Read-only re-show of a saved session: same headline modifiability +
    // stat cards as the live summary, plus AI transcripts. Different from
    // the live summary in that it doesn't have Save/Discard buttons.
    function renderSessionDetail() {
      var sn = (state.sessions || []).filter(function (s) { return s.id === viewingSessionId; })[0];
      if (!sn) {
        return h("div", { className: "da-root", style: { padding: 20 } },
          h("p", null, "Session not found."),
          h("button", { onClick: function () { setStartScreenView("sessions"); } }, "← Back to sessions"));
      }
      var idx = (typeof sn.modifiabilityIndex === "number" ? sn.modifiabilityIndex : 0);
      var tier = sn.modifiabilityTier || modifiabilityTier(idx);
      var pretestResults = (sn.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
      var posttestResults = (sn.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
      var transferResults = (sn.itemResults || []).filter(function (r) { return r.phase === "transfer"; });
      var pretestSum = sn.pretestSum != null ? sn.pretestSum : sumItemResultScores(pretestResults);
      var posttestSum = sn.posttestSum != null ? sn.posttestSum : sumItemResultScores(posttestResults);
      var transferSum = sumItemResultScores(transferResults);
      var max = maxPossibleScore(sn.sessionItemIds.length);
      var transferMax = maxPossibleScore(transferResults.length);
      var transferTierObj = transferResults.length > 0
        ? transferTier(transferSum, transferMax, posttestSum, max) : null;
      var dt = "";
      try { dt = new Date(sn.dateCompleted || sn.dateStarted).toLocaleString(); } catch (e) {}

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("sessions"); setViewingSessionId(null); },
            "aria-label": "Back to sessions",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Sessions"),
          h("div", { style: { flex: 1, minWidth: 200 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Session detail · saved " + dt),
            h("h1", { style: { margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "var(--da-ink)" } },
              (sn.studentNickname || "Anonymous") + " · " + sn.domain + " (" + sn.difficulty + ")")
          ),
          h("button", {
            onClick: function () { exportSessionAsJson(sn); },
            style: { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--da-ink-3)", background: "var(--da-surface)", color: "var(--da-ink)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "↓ JSON")
        ),

        // Headline
        h("div", { className: "da-card", style: {
          marginBottom: 14, padding: 18,
          background: tier.id === "high" ? "var(--da-green-tint)" : tier.id === "moderate" ? "var(--da-amber-tint)" : tier.id === "low" ? "var(--da-red-tint)" : "var(--da-surface-3)",
          borderColor: tier.id === "high" ? "var(--da-green-border)" : tier.id === "moderate" ? "var(--da-amber-border)" : tier.id === "low" ? "var(--da-red-border)" : "var(--da-border-2)"
        }},
          h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 6 } }, "Modifiability Index"),
          h("div", { style: { display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" } },
            h("div", { style: { fontSize: 42, fontWeight: 900, color: "var(--da-ink)", lineHeight: 1 } },
              (idx >= 0 ? "+" : "") + idx.toFixed(2)),
            h("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--da-ink)" } }, tier.label)
          ),
          h("p", { style: { margin: "10px 0 0", fontSize: 13, color: "var(--da-ink-2)", lineHeight: 1.65 } }, tier.desc)
        ),

        // Phase V — Intake context (read-only)
        sn.intake ? (function () {
          var ik = sn.intake;
          var hasAny = ik.referralReason || ik.hypothesizedBottleneck || ik.specificQuestion || ik.priorInterventions || ik.existingAssessmentData;
          if (!hasAny) return null;
          return h("details", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-violet-tint-2)", borderColor: "var(--da-violet-border)" } },
            h("summary", { style: { cursor: "pointer", fontSize: 11, fontWeight: 800, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.06em" } },
              "📋 Referral context"),
            h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, lineHeight: 1.55, color: "var(--da-indigo-deeper)" } },
              ik.referralReason && ik.referralReason.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Referral: "), ik.referralReason) : null,
              ik.specificQuestion && ik.specificQuestion.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Question: "), ik.specificQuestion) : null,
              ik.hypothesizedBottleneck && ik.hypothesizedBottleneck.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Hypothesis: "), ik.hypothesizedBottleneck) : null,
              ik.priorInterventions && ik.priorInterventions.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Prior: "), ik.priorInterventions) : null,
              ik.existingAssessmentData && ik.existingAssessmentData.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Existing data: "), ik.existingAssessmentData) : null
            )
          );
        })() : null,

        // Phase U — Session timing + session note (read-only on detail view)
        (function () {
          var timing = computeSessionTiming(sn);
          var hasNote = sn.sessionNote && sn.sessionNote.trim().length > 0;
          if (timing.perItem.length === 0 && !hasNote) return null;
          var avgPerItem = timing.perItem.length > 0 ? timing.activeMs / timing.perItem.length : 0;
          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-surface-2)" } },
            h("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--da-ink-3)", marginBottom: hasNote ? 8 : 0 } },
              h("div", null, "⏱ Active time: ", h("strong", { style: { color: "var(--da-ink)" } }, formatDuration(timing.activeMs))),
              h("div", null, "Total span: ", h("strong", { style: { color: "var(--da-ink)" } }, formatDuration(timing.totalMs))),
              timing.perItem.length > 0 ? h("div", null, "Avg/item: ", h("strong", { style: { color: "var(--da-ink)" } }, formatDuration(avgPerItem))) : null
            ),
            hasNote ? h("div", { style: { padding: 8, background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 6 } },
              h("div", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
                "Session-level notes"),
              h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" } }, sn.sessionNote)
            ) : null
          );
        })(),

        // Score breakdown
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 } },
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Pretest"),
            h("div", { style: { fontSize: 22, fontWeight: 900, color: "var(--da-ink-3)", marginTop: 4 } }, pretestSum + " / " + max)
          ),
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Posttest"),
            h("div", { style: { fontSize: 22, fontWeight: 900, color: "var(--da-green-text)", marginTop: 4 } }, posttestSum + " / " + max)
          ),
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Growth"),
            h("div", { style: { fontSize: 22, fontWeight: 900, color: posttestSum - pretestSum >= 0 ? "var(--da-green-text)" : "var(--da-red-text)", marginTop: 4 } },
              (posttestSum - pretestSum >= 0 ? "+" : "") + (posttestSum - pretestSum) + " pts")
          ),
          transferResults.length > 0 ? h("div", { className: "da-card", style: { textAlign: "center", borderColor: "var(--da-amber-border)", background: "var(--da-amber-tint)" } },
            h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Transfer"),
            h("div", { style: { fontSize: 22, fontWeight: 900, color: "var(--da-amber-text)", marginTop: 4 } }, transferSum + " / " + transferMax)
          ) : null
        ),

        // Transfer interpretation
        transferTierObj ? h("div", { className: "da-card", style: { marginBottom: 14, padding: 14 } },
          h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 6 } },
            "Transfer interpretation"),
          h("div", { style: { fontSize: 15, fontWeight: 800, color: daHex(transferTierObj.color), marginBottom: 6 } }, transferTierObj.label),
          h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-ink-2)", lineHeight: 1.6 } }, transferTierObj.desc)
        ) : null,

        // Phase I — tag patterns in the session-detail view
        (function () {
          var tagAgg = aggregateObservationTags(sn.itemResults);
          if (tagAgg.length === 0) return null;
          return h("div", { className: "da-card", style: { marginBottom: 14 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
              "Observed patterns"),
            h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--da-ink-3)" } },
              tagAgg.map(function (t) {
                var bar = Math.min(1, t.count / Math.max(1, sn.itemResults.length));
                return h("div", { key: "da-tag-detail-" + t.id, style: { display: "flex", alignItems: "center", gap: 8 } },
                  h("span", { style: { minWidth: 170 } }, t.label),
                  h("div", { "aria-hidden": "true", style: { flex: 1, height: 8, background: "var(--da-surface-3)", borderRadius: 4, overflow: "hidden" } },
                    h("div", { style: { height: "100%", width: Math.round(bar * 100) + "%", background: "var(--da-accent)" } })),
                  h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--da-ink)", minWidth: 30, textAlign: "right" } }, "×" + t.count)
                );
              })
            )
          );
        })(),

        // Per-item table
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } }, "Per-item results"),
          h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            h("thead", null,
              h("tr", { style: { background: "var(--da-surface-3)" } },
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Item"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Phase"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Level"),
                h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Score")
              )
            ),
            h("tbody", null,
              (sn.itemResults || []).map(function (r, ri) {
                var it = ITEMS_BY_ID[r.itemId];
                return h("tr", { key: "da-detail-row-" + ri },
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)" } }, it ? it.construct : r.itemId),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", color: "var(--da-muted)" } }, r.phase),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", fontFamily: "ui-monospace, monospace" } }, "L" + r.promptLevelReached),
                  h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", fontFamily: "ui-monospace, monospace", fontWeight: 700 } },
                    r.scoreAwarded + (r.finalCorrect ? "" : " ✗") + (r.scaffoldLeaked ? " ⚠leak" : ""))
                );
              })
            )
          )
        ),
        // Phase X — saved progress monitoring plan (read-only)
        sn.progressMonitoring ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-indigo-tint)", borderColor: "var(--da-indigo-border-2)" } },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
            h("h3", { style: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--da-indigo-text)" } }, "📈 Progress monitoring plan"),
            h("button", {
              onClick: function () { copyTextToClipboard(formatMonitoringPlanForClipboard(sn.progressMonitoring, sn.studentNickname)); },
              "aria-label": "Copy monitoring plan",
              style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "📋 Copy plan")
          ),
          sn.progressMonitoring.overview ? h("p", { style: { margin: "0 0 8px", fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55 } }, sn.progressMonitoring.overview) : null,
          (sn.progressMonitoring.goalMonitoring || []).length > 0 ? h("div", { style: { marginBottom: 6 } },
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-indigo-text)", marginBottom: 4 } }, "Monitoring schedule:"),
            h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } },
              sn.progressMonitoring.goalMonitoring.map(function (g, gi) {
                return h("li", { key: "da-saved-pm-g-" + gi, style: { marginBottom: 4 } },
                  h("strong", null, g.goalSummary),
                  " · ", g.probeType,
                  g.frequency ? h("em", { style: { color: "var(--da-indigo-text)" } }, " (" + g.frequency + ")") : null,
                  g.criterion ? h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", marginTop: 2 } }, "Criterion: " + g.criterion) : null
                );
              })
            )
          ) : null,
          (sn.progressMonitoring.reviewSchedule || []).length > 0 ? h("div", { style: { marginBottom: 6 } },
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-indigo-text)", marginBottom: 4 } }, "Review schedule:"),
            h("ul", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } },
              sn.progressMonitoring.reviewSchedule.map(function (rs, ri) {
                return h("li", { key: "da-saved-pm-rs-" + ri }, h("strong", null, rs.timing), " — ", rs.focus);
              })
            )
          ) : null,
          sn.progressMonitoring.caveat ? h("div", { style: { padding: 8, background: "var(--da-amber-tint)", borderLeft: "3px solid var(--da-amber-mid)", fontSize: 11.5, color: "var(--da-orange-deep)", lineHeight: 1.5 } },
            h("strong", null, "⚠ "), sn.progressMonitoring.caveat
          ) : null
        ) : null,
        // Phase T — saved teacher handoff (read-only on this view)
        sn.teacherHandoff ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-sky-tint-2)", borderColor: "var(--da-sky-border-2)" } },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
            h("h3", { style: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--da-sky-deep)" } }, "🧑‍🏫 Teacher / case manager handoff"),
            h("button", {
              onClick: function () { copyTextToClipboard(formatTeacherHandoffForClipboard(sn.teacherHandoff, sn.studentNickname)); },
              "aria-label": "Copy handoff to clipboard",
              style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "📋 Copy handoff")
          ),
          h("div", { style: { padding: 8, background: "var(--da-surface)", border: "1px solid var(--da-sky-border-2)", borderRadius: 6, fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.6, marginBottom: 8 } },
            h("strong", { style: { color: "var(--da-sky-deep)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.05em" } }, "Headline: "),
            sn.teacherHandoff.headline
          ),
          (sn.teacherHandoff.whatWorks || []).length > 0 ? h("div", { style: { marginBottom: 6 } },
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-sky-deep)", marginBottom: 4 } }, "✓ What works:"),
            h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } },
              sn.teacherHandoff.whatWorks.map(function (w, wi) {
                return h("li", { key: "da-saved-th-w-" + wi, style: { marginBottom: 4 } },
                  h("strong", null, w.title), w.description ? ". " + w.description : "",
                  w.evidenceFromDA ? h("em", { style: { color: "var(--da-sky-deep)" } }, " (evidence: " + w.evidenceFromDA + ")") : null
                );
              })
            )
          ) : null,
          (sn.teacherHandoff.whatDidNotWork || []).length > 0 ? h("div", { style: { marginBottom: 6 } },
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-red-text)", marginBottom: 4 } }, "✗ What to avoid:"),
            h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } },
              sn.teacherHandoff.whatDidNotWork.map(function (x, xi) { return h("li", { key: "da-saved-th-x-" + xi }, x); })
            )
          ) : null,
          (sn.teacherHandoff.watchFor || []).length > 0 ? h("div", { style: { marginBottom: 6 } },
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-sky-deep)", marginBottom: 4 } }, "👀 Watch for:"),
            h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } },
              sn.teacherHandoff.watchFor.map(function (x, xi) { return h("li", { key: "da-saved-th-wf-" + xi }, x); })
            )
          ) : null,
          (sn.teacherHandoff.quickProbes || []).length > 0 ? h("div", { style: { marginBottom: 6 } },
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-sky-deep)", marginBottom: 4 } }, "🎯 Quick probes:"),
            h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } },
              sn.teacherHandoff.quickProbes.map(function (p, pi) {
                return h("li", { key: "da-saved-th-p-" + pi, style: { marginBottom: 3 } },
                  h("strong", null, p.label), p.frequency ? " (" + p.frequency + ")" : "", ". " + p.description);
              })
            )
          ) : null,
          sn.teacherHandoff.whenToReRefer ? h("div", { style: { padding: 8, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 6, fontSize: 12, color: "var(--da-red-deep)", lineHeight: 1.55, marginBottom: 6 } },
            h("strong", null, "⚠ When to re-refer: "), sn.teacherHandoff.whenToReRefer
          ) : null,
          (sn.teacherHandoff.redFlags || []).length > 0 ? h("div", null,
            h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-red-text)", marginBottom: 4 } }, "🚩 Red flags:"),
            h("ul", { style: { margin: 0, paddingLeft: 22, fontSize: 12, color: "var(--da-red-deep)", lineHeight: 1.55 } },
              sn.teacherHandoff.redFlags.map(function (x, xi) { return h("li", { key: "da-saved-th-rf-" + xi }, x); })
            )
          ) : null
        ) : null,
        // Phase S — saved family summary (read-only on this view)
        sn.familySummary ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-rose-tint)", borderColor: "var(--da-rose-border)" } },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
            h("h3", { style: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--da-rose-text)" } }, "👨‍👩‍👧 Family-facing summary"),
            h("button", {
              onClick: function () { copyTextToClipboard(formatFamilySummaryForClipboard(sn.familySummary, sn.studentNickname)); },
              "aria-label": "Copy family letter to clipboard",
              style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "📋 Copy as letter")
          ),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
            FAMILY_SECTION_ORDER.map(function (key) {
              if (key === "questions_for_team") {
                var qs = sn.familySummary[key] || [];
                if (qs.length === 0) return null;
                return h("div", { key: "da-saved-fam-" + key, style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-rose-border)", borderRadius: 6 } },
                  h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-rose-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
                    FAMILY_SECTION_LABELS[key]),
                  h("ol", { style: { margin: "4px 0 0", paddingLeft: 22, fontSize: 12.5, color: "var(--da-ink-2)", lineHeight: 1.55 } },
                    qs.map(function (q, qi) { return h("li", { key: "da-saved-fam-q-" + qi, style: { marginBottom: 3 } }, q); })
                  )
                );
              }
              if (!sn.familySummary[key]) return null;
              return h("div", { key: "da-saved-fam-" + key, style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-rose-border)", borderRadius: 6 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-rose-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
                  FAMILY_SECTION_LABELS[key]),
                h("p", { style: { margin: 0, fontSize: 13, color: "var(--da-ink)", lineHeight: 1.6 } }, sn.familySummary[key])
              );
            })
          )
        ) : null,
        // Phase Q — saved accommodations (read-only on this view)
        Array.isArray(sn.accommodations) && sn.accommodations.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-green-tint)", borderColor: "var(--da-green-border)" } },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
            h("h3", { style: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--da-green-text-2)" } }, "🛠 UDL accommodations · " + sn.accommodations.length),
            h("button", {
              onClick: function () {
                var all = sn.accommodations.map(function (a, i) { return "── " + (i + 1) + ". " + formatAccommodationForClipboard(a); }).join("\n\n");
                copyTextToClipboard(all);
              },
              "aria-label": "Copy all accommodations as one text block",
              style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "📋 Copy all")
          ),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
            sn.accommodations.map(function (a, ai) {
              return h("div", { key: "da-saved-accom-" + a.id, style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-green-border)", borderRadius: 6 } },
                h("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 } },
                  h("span", { style: { fontSize: 9.5, fontWeight: 800, color: "var(--da-green-text-2)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--da-green-tint-2)", padding: "2px 6px", borderRadius: 4 } },
                    ACCOM_CATEGORY_LABELS[a.category] || a.category),
                  h("span", { style: { fontSize: 9.5, color: "var(--da-green-text-2)", fontStyle: "italic" } },
                    "UDL: " + (UDL_PRINCIPLE_LABELS[a.udlPrinciple] || a.udlPrinciple))
                ),
                h("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--da-ink)", marginBottom: 4 } }, a.title),
                h("p", { style: { margin: "0 0 6px", fontSize: 12.5, color: "var(--da-ink-2)", lineHeight: 1.55 } }, a.description),
                a.rationale ? h("div", { style: { padding: 6, background: "var(--da-green-tint)", borderLeft: "3px solid var(--da-green-mid)", fontSize: 11, color: "var(--da-green-deep)", lineHeight: 1.5 } },
                  h("strong", { style: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" } }, "Evidence: "),
                  a.rationale
                ) : null
              );
            })
          )
        ) : null,
        // Phase K — saved IEP goals (read-only on this view; edit lives on the live summary)
        Array.isArray(sn.iepGoals) && sn.iepGoals.length > 0 ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-amber-tint-3)", borderColor: "var(--da-amber-border-2)" } },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
            h("h3", { style: { margin: 0, fontSize: 14, fontWeight: 800, color: "var(--da-amber-text-2)" } }, "🎯 Drafted IEP goals · " + sn.iepGoals.length),
            h("button", {
              onClick: function () {
                var all = sn.iepGoals.map(function (g, i) { return "── Goal " + (i + 1) + " ──\n" + formatGoalForClipboard(g); }).join("\n\n");
                copyTextToClipboard(all);
              },
              "aria-label": "Copy all goals as one text block",
              style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "📋 Copy all")
          ),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
            sn.iepGoals.map(function (g, gi) {
              return h("div", { key: "da-saved-iep-" + g.id, style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-amber-border-2)", borderRadius: 6 } },
                h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 800, marginBottom: 4 } },
                  "Goal " + (gi + 1) + " · " + g.domain),
                h("p", { style: { margin: "0 0 6px", fontSize: 13, color: "var(--da-ink)", lineHeight: 1.55 } }, g.annualGoal),
                g.measurementCriterion ? h("p", { style: { margin: "0 0 4px", fontSize: 11.5, color: "var(--da-ink-3)" } }, h("strong", null, "Criterion: "), g.measurementCriterion) : null,
                g.evaluationMethod ? h("p", { style: { margin: "0 0 6px", fontSize: 11.5, color: "var(--da-ink-3)" } }, h("strong", null, "Measurement: "), g.evaluationMethod) : null,
                Array.isArray(g.shortTermObjectives) && g.shortTermObjectives.length > 0 ? h("div", { style: { fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.5 } },
                  h("strong", { style: { fontSize: 10.5, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Short-term objectives:"),
                  h("ol", { style: { margin: "4px 0 0", paddingLeft: 22 } },
                    g.shortTermObjectives.map(function (sto, soi) { return h("li", { key: "da-saved-sto-" + g.id + "-" + soi, style: { marginBottom: 2 } }, sto); })
                  )
                ) : null
              );
            })
          )
        ) : null
      );
    }

    // ─── Phase F — JSON export ───
    // Triggers a browser download of the full session record. Useful for
    // archiving outside AlloFlow and for sharing with colleagues.
    function exportSessionAsJson(sessionRecord) {
      try {
        var payload = Object.assign({}, sessionRecord, {
          _exportFormat: "alloflow-da-session",
          _exportVersion: "1.0.0",
          _exportedAt: new Date().toISOString()
        });
        var json = JSON.stringify(payload, null, 2);
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        var safeName = (sessionRecord.studentNickname || "anonymous").replace(/[^A-Za-z0-9_-]/g, "_") || "anonymous";
        var dateStr = new Date(sessionRecord.dateCompleted || sessionRecord.dateStarted || Date.now())
          .toISOString().slice(0, 10);
        a.download = "da-session-" + safeName + "-" + dateStr + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        }, 100);
        addToast("📥 Downloaded da-session-" + safeName + "-" + dateStr + ".json");
      } catch (e) {
        addToast("JSON export failed: " + (e && e.message ? e.message : "unknown error"));
      }
    }

    // ─── Phase EE — Full-history backup + restore (JSON, clinician-controlled) ───
    // localStorage is the ONLY home for the session history, and the within-
    // student trajectory (Phase CC) + local-norm context (Phase BB) both depend
    // on it surviving. A cleared cache or a new device wipes everything. These
    // reuse the existing per-session JSON machinery to save/restore the WHOLE
    // history — no cloud, no privacy tradeoff (the clinician owns the file, the
    // same trust model as the per-session export).
    function exportAllSessionsAsJson() {
      try {
        var sessions = state.sessions || [];
        if (sessions.length === 0) { addToast("No saved sessions to back up yet."); return; }
        var payload = {
          _exportFormat: "alloflow-da-session-backup",
          _exportVersion: "1.0.0",
          _exportedAt: new Date().toISOString(),
          sessionCount: sessions.length,
          sessions: sessions
        };
        var json = JSON.stringify(payload, null, 2);
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "da-sessions-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 100);
        addToast("📥 Backed up " + sessions.length + " session" + (sessions.length === 1 ? "" : "s") + ".");
      } catch (e) {
        addToast("Backup failed: " + (e && e.message ? e.message : "unknown error"));
      }
    }

    // Merge imported sessions into state.sessions. Dedup by id; EXISTING local
    // sessions always win (a restore never overwrites what you already have).
    function mergeImportedSessions(imported) {
      // Validity filter. Require a FINALIZED session (numeric modifiabilityIndex):
      // accepting an in-progress shape (itemResults but no MI) would render as a
      // fake "+0.00" measured result in the sessions list. state.sessions is
      // finalized-only, and finalizeSession always sets a numeric MI.
      var candidates = [], skipped = 0;
      (imported || []).forEach(function (s) {
        if (!s || typeof s !== "object" || !s.id) { skipped++; return; }
        if (typeof s.modifiabilityIndex !== "number") { skipped++; return; }
        candidates.push(s);
      });
      // Count added-vs-already-present against the current view (for the toast).
      var existing = state.sessions || [];
      var existingIds = {};
      existing.forEach(function (s) { if (s && s.id) existingIds[s.id] = true; });
      var added = 0;
      candidates.forEach(function (c) { if (!existingIds[c.id]) added++; });
      skipped += candidates.length - added; // already-present count as skipped
      // Apply via the FUNCTIONAL form so a concurrent sessions mutation (e.g. a
      // delete during the async file read) can't be clobbered by a stale closure.
      // Dedup is recomputed against prev.sessions inside the updater.
      if (candidates.length > 0) {
        patch(function (prev) {
          var prevSessions = (prev && prev.sessions) || [];
          var seen = {};
          prevSessions.forEach(function (s) { if (s && s.id) seen[s.id] = true; });
          var fresh = [];
          candidates.forEach(function (c) { if (!seen[c.id]) { seen[c.id] = true; fresh.push(c); } });
          return fresh.length > 0 ? { sessions: prevSessions.concat(fresh) } : {};
        });
      }
      return { added: added, skipped: skipped };
    }

    function importSessionsFromFile() {
      try {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = function (ev) {
          var file = ev.target && ev.target.files && ev.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var parsed = JSON.parse(String(reader.result || ""));
              // Accept a full backup {sessions:[...]}, a raw array, or a single-session export.
              var arr = null;
              if (parsed && Array.isArray(parsed.sessions)) arr = parsed.sessions;
              else if (Array.isArray(parsed)) arr = parsed;
              else if (parsed && parsed.id) arr = [parsed];
              if (!arr) { addToast("That file doesn't look like a DA session backup."); return; }
              var res = mergeImportedSessions(arr);
              addToast("📂 Restored " + res.added + " session" + (res.added === 1 ? "" : "s")
                + (res.skipped > 0 ? " (" + res.skipped + " already present or invalid, skipped)" : "") + ".");
            } catch (e) {
              addToast("Restore failed: that file isn't valid JSON.");
            }
          };
          reader.readAsText(file);
        };
        input.click();
      } catch (e) {
        addToast("Restore failed: " + (e && e.message ? e.message : "unknown error"));
      }
    }

    // ─── Phase G — Onboarding tour ───
    // 4-step first-open tutorial explaining DA methodology + the tool's
    // workflow. Surfaces automatically on first ever open (when
    // sessions.length === 0 AND onboardingSeen is false). Re-launchable
    // anytime via the "🧭 Tour" button on the start screen.
    function startTour() { setTourStep(0); }
    function closeTour() {
      setTourStep(null);
      if (!state.onboardingSeen) patch({ onboardingSeen: true });
    }
    function renderOnboardingTour() {
      var TOUR_STEPS = [
        {
          icon: "🔬",
          title: "What is Dynamic Assessment?",
          body: "Dynamic Assessment measures a student's modifiability — how much they change with structured scaffolding — rather than static ability alone. Vygotsky called this the Zone of Proximal Development. Feuerstein turned it into a clinical methodology. This tool brings that methodology to a workflow you can run in a single session."
        },
        {
          icon: "📋",
          title: "Three (sometimes four) phases per session",
          body: "Every session runs as: Pretest (unscaffolded baseline) → Mediation (you deliver scaffolds; the system tracks which level each item required) → Posttest (re-test alone) → Transfer probe (novel items, same construct — present when items have transfer twins). The Modifiability Index summarizes growth as a proportion of available change."
        },
        {
          icon: "🪜",
          title: "The graduated prompt ladder",
          body: "Every item ships with a 4-level scaffold ladder: L1 declarative cue (orient) → L2 leading question (nudge toward strategy) → L3 modeling (show a parallel solve) → L4 direct teaching (give the answer with reasoning). In clinician-led mode you decide when to escalate. In AI-mediated mode the AI decides, using the same hand-authored scaffolds."
        },
        {
          icon: "📝",
          title: "From session to report",
          body: "When you finish, you can: print a self-contained clinical packet (B&W, paste-ready), send findings to Report Writer as fact chunks + a pre-drafted section, or export raw JSON for archival. Important caveat: these are clinical probes, not standardized measures. Use as supplementary observation with parent consent."
        }
      ];
      var step = TOUR_STEPS[tourStep] || TOUR_STEPS[0];
      var isLast = tourStep >= TOUR_STEPS.length - 1;
      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 620, margin: "0 auto", padding: 20 } },
        h("div", { className: "da-card", style: { padding: 24 } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 } },
            h("span", { style: { fontSize: 36 } }, step.icon),
            h("div", { style: { flex: 1 } },
              h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
                "Step " + (tourStep + 1) + " of " + TOUR_STEPS.length),
              h("h2", { style: { margin: "2px 0 0", fontSize: 19, fontWeight: 800, color: "var(--da-ink)" } }, step.title)
            )
          ),
          // Progress dots
          h("div", { style: { display: "flex", gap: 4, marginBottom: 14 } },
            TOUR_STEPS.map(function (_, i) {
              return h("div", { key: "da-tour-dot-" + i,
                style: { flex: 1, height: 3, borderRadius: 2, background: i <= tourStep ? "var(--da-accent)" : "var(--da-border-2)" } });
            })
          ),
          h("p", { style: { margin: 0, fontSize: 13.5, color: "var(--da-ink-2)", lineHeight: 1.7 } }, step.body),
          // Actions
          h("div", { style: { display: "flex", gap: 8, marginTop: 18, alignItems: "center" } },
            tourStep > 0 ? h("button", {
              onClick: function () { setTourStep(tourStep - 1); },
              style: { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "← Back") : null,
            h("div", { style: { flex: 1 } }),
            h("button", {
              onClick: closeTour,
              "aria-label": "Skip tour",
              style: { padding: "8px 12px", border: "none", background: "transparent", color: "var(--da-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "Skip"),
            h("button", {
              onClick: function () {
                if (isLast) closeTour();
                else setTourStep(tourStep + 1);
              },
              style: { padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, isLast ? "✓ Got it" : "Next →")
          )
        )
      );
    }

    // (Auto-show-tour useEffect was here but was unreachable — every render
    // path returns from the dispatch above. Now lifted to the top of the
    // component body alongside the other top-level effects.)

    // ─── Phase A-bis — Custom probe BUILDER screen ───
    // Form for the clinician to spec a construct → AI generates items.
    function renderCustomBuilder() {
      var hasGemini = typeof props.callGemini === "function";
      function setField(field, val) {
        setCustomForm(Object.assign({}, customForm, (function () { var o = {}; o[field] = val; return o; })()));
      }
      var canGenerate = !genBusy && hasGemini && customForm.construct.trim().length >= 3;

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 720, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 } },
          h("button", {
            onClick: function () { resetCustomBuilder(); },
            "aria-label": "Back to start",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Back"),
          h("div", null,
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } }, "Phase A-bis · AI probe builder"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } }, "✨ Build a custom probe")
          )
        ),

        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("p", { style: { margin: "0 0 8px", fontSize: 13, color: "var(--da-ink-2)", lineHeight: 1.6 } },
            "Specify a construct, grade band, and optional suspected bottleneck. The AI generates ", h("strong", null, "items + full 4-level prompt ladders + transfer twins"), " that match. You review and edit before running."),
          h("p", { style: { margin: 0, fontSize: 11, color: "var(--da-amber-text)", fontStyle: "italic", lineHeight: 1.55 } },
            "⚠ AI-generated items are not normed or validated. Use as clinical probes, not standardized measures. Always review before use.")
        ),

        // Form
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          // Domain
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Domain"),
            h("select", {
              value: customForm.domain,
              onChange: function (e) { setField("domain", e.target.value); },
              style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
            },
              h("option", { value: "math" }, "🧮 Math reasoning"),
              h("option", { value: "reading" }, "📖 Reading comprehension"),
              h("option", { value: "working-memory" }, "🧠 Working memory / executive function"),
              h("option", { value: "language" }, "🗣️ Language production / narration"),
              h("option", { value: "other" }, "Other (free-form)")
            )
          ),
          // Grade band
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Grade band"),
            h("input", {
              type: "text", value: customForm.gradeBand,
              onChange: function (e) { setField("gradeBand", e.target.value); },
              placeholder: "e.g., 4-5, end of 7th, K-1",
              style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
            })
          ),
          // Target construct
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Target construct *"),
            h("input", {
              type: "text", value: customForm.construct, maxLength: 240,
              onChange: function (e) { setField("construct", e.target.value); },
              placeholder: "e.g., multi-step word problems with mixed operations",
              style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
            }),
            h("div", { style: { fontSize: 10.5, color: "var(--da-ink-3)", marginTop: 3 } }, "What construct should the probe target? Be specific.")
          ),
          // Suspected bottleneck
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Suspected bottleneck (optional)"),
            h("input", {
              type: "text", value: customForm.bottleneck, maxLength: 160,
              onChange: function (e) { setField("bottleneck", e.target.value); },
              placeholder: "e.g., working memory, operation selection, inference, vocabulary",
              style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
            }),
            h("div", { style: { fontSize: 10.5, color: "var(--da-ink-3)", marginTop: 3 } }, "Helps the AI shape scaffolds toward the right bottleneck.")
          ),
          // Item count
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Number of items"),
            h("select", {
              value: String(customForm.itemCount),
              onChange: function (e) { setField("itemCount", parseInt(e.target.value, 10) || 3); },
              style: { width: 200, padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
            },
              h("option", { value: "3" }, "3 (brief probe · ~12 min)"),
              h("option", { value: "4" }, "4 items"),
              h("option", { value: "5" }, "5 items"),
              h("option", { value: "6" }, "6 (full probe · ~30 min)"),
              h("option", { value: "8" }, "8 items")
            )
          ),
          // Optional clinical context (PII-warning)
          h("div", { style: { marginBottom: 8 } },
            h("label", { style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 } }, "Additional clinical context (optional, PII auto-stripped)"),
            h("textarea", {
              rows: 2, value: customForm.context, maxLength: 800,
              onChange: function (e) { setField("context", e.target.value); },
              placeholder: "Construct-focused only. e.g., 'comfortable with concrete representations; struggles with abstract symbol manipulation'",
              style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 12, boxSizing: "border-box", resize: "vertical" }
            }),
            h("div", { style: { fontSize: 10.5, color: "var(--da-amber-text)", marginTop: 3, fontStyle: "italic", lineHeight: 1.45 } },
              "⚠ Do not include the student's name, school, or other identifying details. A soft lint strips obvious name patterns before the AI call, but treat this as defense in depth — write construct-focused.")
          ),
          // Phase Y — Self-critique loop toggle (default ON for SOTA quality)
          h("div", { style: { marginTop: 10, padding: 10, background: "var(--da-violet-tint-2)", border: "1px solid var(--da-violet-border)", borderRadius: 8 } },
            h("label", { style: { display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" } },
              h("input", {
                type: "checkbox", checked: useSelfCritique,
                onChange: function (e) { setUseSelfCritique(e.target.checked); },
                "aria-label": "Enable AI self-critique loop",
                style: { marginTop: 3 }
              }),
              h("div", null,
                h("div", { style: { fontSize: 12.5, fontWeight: 700, color: "var(--da-violet-text-2)" } },
                  "🔬 Self-critique loop (recommended)"),
                h("div", { style: { fontSize: 11, color: "var(--da-violet-deep)", marginTop: 2, lineHeight: 1.5 } },
                  "Three-pass pipeline: AI drafts → AI critiques its own draft against 5 quality criteria → AI refines any flagged items. Costs ~3× the API time but materially raises L3 modeling quality and catches answer leakage. Critique notes shown on review screen.")
              )
            )
          )
        ),

        // Generate button + per-stage progress
        h("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
          h("button", {
            onClick: function () { if (canGenerate) generateCustomProbe(customForm); },
            disabled: !canGenerate,
            style: {
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: canGenerate ? "var(--da-accent)" : "var(--da-faint)",
              color: "var(--da-on-accent)", fontWeight: 800, fontSize: 14,
              cursor: canGenerate ? "pointer" : "not-allowed", fontFamily: "inherit"
            }
          }, genBusy
              ? (genStage === "draft" ? "🤖 Drafting items…"
                 : genStage === "critique" ? "🔬 AI critiquing its own draft…"
                 : genStage === "refine" ? "✏️ Refining flagged items…"
                 : "🤖 Generating…")
              : "✨ Generate items"),
          !hasGemini ? h("span", { style: { fontSize: 12, color: "var(--da-red-text)" } },
            "AI generation requires callGemini (not wired in this host)") : null,
          customForm.construct.trim().length < 3 ? h("span", { style: { fontSize: 12, color: "var(--da-muted)", fontStyle: "italic" } },
            "Fill in 'Target construct' to enable") : null
        ),
        // Stage progress strip (only while busy with self-critique)
        genBusy && useSelfCritique && genStage ? h("div", { style: { marginTop: 10, display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--da-violet-text-2)" } },
          ["draft", "critique", "refine"].map(function (stg, si) {
            var isActive = genStage === stg;
            var hasPassed = ["draft", "critique", "refine"].indexOf(stg) < ["draft", "critique", "refine"].indexOf(genStage);
            var label = { draft: "Draft", critique: "Critique", refine: "Refine" }[stg];
            return h("div", { key: "da-y-stg-" + stg, style: { display: "flex", alignItems: "center", gap: 4 } },
              h("span", { style: { width: 10, height: 10, borderRadius: "50%", background: isActive ? "var(--da-violet-mid)" : hasPassed ? "var(--da-violet-border-3)" : "var(--da-border)", display: "inline-block" } }),
              h("span", { style: { fontWeight: isActive ? 800 : 600 } }, label),
              si < 2 ? h("span", { style: { color: "var(--da-ink-3)", margin: "0 4px" } }, "→") : null
            );
          })
        ) : null,

        genError ? h("div", {
          style: { marginTop: 14, padding: "10px 12px", background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, fontSize: 12, color: "var(--da-red-text)", lineHeight: 1.55, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }
        },
          h("span", { style: { flex: 1, minWidth: 200 } }, "⚠ " + genError),
          h("button", {
            onClick: function () {
              if (canGenerate) generateCustomProbe(customForm);
            },
            "aria-label": "Retry the generation",
            style: { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--da-red-text)", background: "var(--da-surface)", color: "var(--da-red-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "↻ Retry"),
          h("button", {
            onClick: function () { setGenError(null); },
            "aria-label": "Dismiss",
            style: { padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: "var(--da-red-deep)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "✕")
        ) : null
      );
    }

    // ─── Phase A-bis — Custom probe REVIEW screen ───
    // Each generated item shown as an editable card with regenerate /
    // exclude / per-field edit. Then Run / Save+Run / Save-only.
    function renderCustomReview() {
      var includedItems = generatedItems.filter(function (it) { return !it._excluded; });
      var hasIncluded = includedItems.length > 0;

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("button", {
            onClick: function () { setStartScreenView("custom-builder"); },
            "aria-label": "Back to builder form",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }
          }, "← Edit spec"),
          h("div", { style: { flex: 1, minWidth: 200 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } },
              "Review · " + generatedItems.length + " item" + (generatedItems.length === 1 ? "" : "s") +
              (includedItems.length !== generatedItems.length ? " (" + includedItems.length + " included)" : "")),
            h("h1", { style: { margin: "2px 0 0", fontSize: 20, fontWeight: 800, color: "var(--da-ink)" } },
              "Edit, regenerate, or run")
          )
        ),

        h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-blue-tint)", borderColor: "var(--da-blue-border)" } },
          h("p", { style: { margin: 0, fontSize: 12, color: "var(--da-accent-text)", lineHeight: 1.55 } },
            "Edit any field in place. Click ", h("strong", null, "Regenerate"), " to re-roll a single item with the same spec. ",
            h("strong", null, "Exclude"), " drops an item from the bank without deleting it. Watch for ladder steps that leak the answer (L1/L2) or fail to model (L3) — those are the most common AI failure modes.")
        ),

        genError ? h("div", {
          style: { marginBottom: 14, padding: "10px 12px", background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, fontSize: 12, color: "var(--da-red-text)" }
        }, "⚠ " + genError) : null,

        // Items
        h("div", { style: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 } },
          generatedItems.map(function (item, idx) {
            return renderEditableItem(item, idx);
          })
        ),

        // Save options
        hasIncluded ? h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            h("input", {
              id: "da-save-template", type: "checkbox", checked: saveTemplate,
              onChange: function (e) { setSaveTemplate(!!e.target.checked); }
            }),
            h("label", { htmlFor: "da-save-template", style: { fontSize: 13, color: "var(--da-ink)", fontWeight: 700 } },
              "Save to my probe library for reuse")
          ),
          saveTemplate ? h("div", { style: { marginTop: 10 } },
            h("input", {
              type: "text", value: templateName,
              onChange: function (e) { setTemplateName(e.target.value); },
              placeholder: "Template name (optional — auto-named if blank)",
              maxLength: 80,
              style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }
            }),
            h("div", { style: { fontSize: 10.5, color: "var(--da-muted)", marginTop: 4, fontStyle: "italic" } },
              "Templates are stored on this device only. Useful for re-running the same probe with different students.")
          ) : null
        ) : null,

        // Actions
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              if (!hasIncluded) return;
              if (saveTemplate) saveProbeTemplate(customForm, includedItems);
              var session = startSession({
                studentNickname: "",
                domain: customForm.domain || "math",
                difficulty: "custom",
                mode: customForm.mode || "clinician",
                customBank: includedItems,
                intake: intakeFilledCount > 0 ? intakeDraft : null
              });
              resetCustomBuilder();
            },
            disabled: !hasIncluded,
            style: {
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: hasIncluded ? "var(--da-accent)" : "var(--da-faint)",
              color: "var(--da-on-accent)", fontWeight: 800, fontSize: 14,
              cursor: hasIncluded ? "pointer" : "not-allowed", fontFamily: "inherit"
            }
          }, saveTemplate ? "💾 Save + Run probe →" : "▶ Run probe →"),
          saveTemplate && hasIncluded ? h("button", {
            onClick: function () {
              saveProbeTemplate(customForm, includedItems);
              resetCustomBuilder();
            },
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "💾 Save only (don't run)") : null,
          h("button", {
            onClick: function () { resetCustomBuilder(); },
            style: { padding: "10px 16px", borderRadius: 10, border: "1px solid var(--da-border-2)", background: "transparent", color: "var(--da-ink-3)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "Cancel")
        )
      );
    }

    // ─── Helper: editable item card for the review screen ───
    // Phase Z — On-demand "Add inline glossary" trigger from the review screen.
    // For items Gemini didn't auto-attach a support to (or where the clinician
    // wants a different one). Asks Gemini to pick seed terms from the prompt
    // text, then runs the same Phase Z orchestrator path so the result lands
    // in history + the rung gets the inline link + usage hint.
    function addManualGlossaryToItem(idx) {
      var item = generatedItems[idx];
      if (!item) return;
      if (typeof props.onGenerateGlossary !== "function") {
        addToast("Glossary generation isn't wired in this host.");
        return;
      }
      // Decide seed terms: lowercase words ≥4 chars from prompt that aren't
      // common stop words. This is heuristic — Gemini's own seeding (during
      // item gen) is better, but this gives the clinician an immediate manual
      // path without a second Gemini round-trip.
      var STOP = { the:1, and:1, that:1, with:1, this:1, from:1, have:1, were:1, your:1, what:1, when:1, then:1, them:1, they:1, into:1, much:1, many:1, will:1, would:1, could:1, about:1, after:1, before:1, which:1, there:1, their:1, where:1, while:1, these:1, those:1, been:1, just:1, more:1, like:1, also:1, some:1 };
      var promptText = String(item.prompt || "");
      var terms = (promptText.toLowerCase().match(/\b[a-z][a-z'-]{3,}\b/g) || [])
        .filter(function (w) { return !STOP[w]; });
      // Dedupe, take first 3 distinct
      var seen = {}, seedTerms = [];
      for (var ti = 0; ti < terms.length && seedTerms.length < 3; ti++) {
        if (!seen[terms[ti]]) { seen[terms[ti]] = 1; seedTerms.push(terms[ti]); }
      }
      if (seedTerms.length === 0) {
        addToast("Couldn't find vocabulary worth defining in this prompt. Edit the prompt or seed terms manually.");
        return;
      }
      var newSupp = {
        kind: "glossary",
        title: "Glossary: " + seedTerms.slice(0, 2).join(", "),
        seedTerms: seedTerms,
        anchorRung: 1,
        status: "generating",
        resourceId: null
      };
      // Optimistic UI: show the supps panel right away with status=generating
      editGeneratedItem(idx, function (i) {
        var existing = Array.isArray(i.supplementaryResources) ? i.supplementaryResources : [];
        return Object.assign({}, i, { supplementaryResources: existing.concat([newSupp]) });
      });
      addToast("Generating inline glossary…");
      var provenance = { fromDA: true, daItemIndex: idx, daItemPrompt: promptText.slice(0, 80) };
      props.onGenerateGlossary(seedTerms, newSupp.title, provenance)
        .then(function (res) {
          if (!res || !res.id) throw new Error("Glossary callback returned no id.");
          var token = makeResourceLinkToken(newSupp.title, res.id);
          editGeneratedItem(idx, function (i) {
            var supps = (i.supplementaryResources || []).slice();
            // Find the entry we added by matching seedTerms + status=generating
            var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.seedTerms && s.seedTerms[0] === seedTerms[0]; });
            if (sIdx < 0) sIdx = supps.length - 1;
            supps[sIdx] = Object.assign({}, supps[sIdx], { status: "generated", resourceId: res.id });
            var withSupps = Object.assign({}, i, { supplementaryResources: supps });
            return appendLinkTokenToRung(withSupps, 1, token, res.id, "glossary");
          });
          addToast("Inline glossary attached.");
        })
        .catch(function (err) {
          editGeneratedItem(idx, function (i) {
            var supps = (i.supplementaryResources || []).slice();
            var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.seedTerms && s.seedTerms[0] === seedTerms[0]; });
            if (sIdx >= 0) {
              supps[sIdx] = Object.assign({}, supps[sIdx], { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
            }
            return Object.assign({}, i, { supplementaryResources: supps });
          });
          addToast("Glossary generation failed: " + (err && err.message ? err.message : "unknown"));
        });
    }

    // Phase 2 — On-demand "Add inline manipulative" trigger. Asks Gemini for a
    // one-shot recommendation (toolId + preset) tied to this item's prompt,
    // then runs the same Phase Z host callback path so the manipulative lands
    // in history + the rung gets the inline link + usage hint.
    function addManualManipulativeToItem(idx) {
      var item = generatedItems[idx];
      if (!item) return;
      if (typeof props.onGenerateManipulative !== "function") {
        addToast("Manipulative generation isn't wired in this host.");
        return;
      }
      if (typeof callGeminiFn !== "function") {
        addToast("AI is not available in this host — cannot decide a manipulative.");
        return;
      }
      // Ask Gemini to pick the right tool + preset for THIS item. Keep the
      // prompt small and tightly schema'd; if Gemini refuses, we fall back
      // to a default numberline 0-20.
      var promptText = String(item.prompt || "");
      var correctAns = String(item.correctAnswer || "");
      var pickPrompt = [
        "You are picking ONE math manipulative tool + preset state to support a Dynamic Assessment item.",
        "Allowed tools:",
        "  numberline → { range: {min, max}, markers: [{value, color, label}], tab: 'explore'|'skipCount'|'fracDec' }",
        "  fractions  → { numerator, denominator, tab: 'practice'|'compare'|'wall' }",
        "  areamodel  → { rows, cols, highlight?: {row, col} }",
        "Bounds: numberline max-min ≤ 200 and ∈ [-1000,1000], fractions denominator ∈ [2,24], areamodel rows/cols ∈ [1,20].",
        "",
        "Item prompt: " + promptText,
        "Correct answer: " + correctAns,
        "",
        "Output STRICT JSON only (no fences, no prose): { \"toolId\": \"<one of the three>\", \"preset\": {...}, \"title\": \"<short label>\", \"anchorRung\": <1|2|3|4> }"
      ].join("\n");
      addToast("Picking the right manipulative…");
      // Insert a placeholder supps entry so the panel shows status=generating
      // immediately while we wait for Gemini.
      var placeholder = {
        kind: "math-manipulative",
        toolId: "pending",
        title: "Picking manipulative…",
        preset: {},
        anchorRung: 3,
        status: "generating",
        resourceId: null
      };
      editGeneratedItem(idx, function (i) {
        var existing = Array.isArray(i.supplementaryResources) ? i.supplementaryResources : [];
        return Object.assign({}, i, { supplementaryResources: existing.concat([placeholder]) });
      });
      Promise.resolve()
        .then(function () { return callGeminiFn(pickPrompt, true); })
        .then(function (raw) {
          var cleaned = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          var parsed = null;
          try { parsed = JSON.parse(cleaned); } catch (_) {}
          if (!parsed || typeof parsed !== "object") throw new Error("AI did not return valid JSON.");
          var toolId = String(parsed.toolId || "").toLowerCase();
          if (!({ numberline: 1, fractions: 1, areamodel: 1 })[toolId]) {
            toolId = "numberline";
            parsed.preset = { range: { min: 0, max: 20 }, markers: [], tab: "explore" };
          }
          var preset = sanitizeManipulativePreset(toolId, parsed.preset || {});
          if (!preset) {
            // Fallback default by tool
            if (toolId === "numberline") preset = { range: { min: 0, max: 20 }, markers: [], tab: "explore" };
            else if (toolId === "fractions") preset = { numerator: 1, denominator: 2, tab: "practice" };
            else preset = { rows: 3, cols: 4 };
          }
          var anchorRung = parseInt(parsed.anchorRung, 10);
          if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = 3;
          var title = String(parsed.title || "").trim().slice(0, 80) || defaultManipulativeTitle(toolId, preset);
          var provenance = { fromDA: true, daItemIndex: idx, daItemPrompt: promptText.slice(0, 80) };
          return props.onGenerateManipulative(toolId, preset, title, provenance)
            .then(function (res) {
              if (!res || !res.id) throw new Error("Manipulative callback returned no id.");
              var token = makeResourceLinkToken(title, res.id);
              editGeneratedItem(idx, function (i) {
                var supps = (i.supplementaryResources || []).slice();
                var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.toolId === "pending"; });
                if (sIdx < 0) sIdx = supps.length - 1;
                supps[sIdx] = { kind: "math-manipulative", toolId: toolId, title: title, preset: preset, anchorRung: anchorRung, status: "generated", resourceId: res.id };
                var withSupps = Object.assign({}, i, { supplementaryResources: supps });
                return appendLinkTokenToRung(withSupps, anchorRung, token, res.id, "math-manipulative");
              });
              addToast("Inline manipulative attached: " + title);
            });
        })
        .catch(function (err) {
          editGeneratedItem(idx, function (i) {
            var supps = (i.supplementaryResources || []).slice();
            var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.toolId === "pending"; });
            if (sIdx >= 0) {
              supps[sIdx] = Object.assign({}, supps[sIdx], { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
            }
            return Object.assign({}, i, { supplementaryResources: supps });
          });
          addToast("Manipulative generation failed: " + (err && err.message ? err.message : "unknown"));
        });
    }

    // Phase Z++ — Per-chip editor state. Holds the resourceId currently being
    // edited (or null) and a transient draft object specific to the chip's kind.
    // Only one chip can be edited at a time across all items.
    var editingChipTuple = useState(null); // { itemIdx, resourceId, kind, draft }
    var editingChip = editingChipTuple[0];
    var setEditingChip = editingChipTuple[1];

    function openChipEditor(itemIdx, sr) {
      if (!sr || !sr.resourceId) return;
      var draft = {};
      if (sr.kind === "glossary") {
        draft = { seedTerms: Array.isArray(sr.seedTerms) ? sr.seedTerms.slice() : [], title: sr.title || "" };
      } else if (sr.kind === "math-manipulative") {
        draft = { toolId: sr.toolId, preset: Object.assign({}, sr.preset || {}), title: sr.title || "" };
      } else if (sr.kind === "word-sounds-probe") {
        draft = { activity: sr.activity, words: Array.isArray(sr.words) ? sr.words.slice() : [], title: sr.title || "" };
      } else if (sr.kind === "reuse") {
        // Reuse entries can be detached/moved but not deeply edited.
        draft = { title: sr.title || "" };
      }
      setEditingChip({ itemIdx: itemIdx, resourceId: sr.resourceId, kind: sr.kind, draft: draft });
    }
    function closeChipEditor() { setEditingChip(null); }

    // Detach + move (kind-agnostic) — both work for any kind.
    function detachChipFromItem(itemIdx, sr) {
      if (!sr || !sr.resourceId) return;
      editGeneratedItem(itemIdx, function (i) {
        return detachResourceFromItem(i, sr.resourceId);
      });
      if (editingChip && editingChip.resourceId === sr.resourceId) closeChipEditor();
      addToast("Detached — resource is still in your resource pack.");
    }
    function moveChipRung(itemIdx, sr, newRung) {
      if (!sr || !sr.resourceId || !(newRung >= 1 && newRung <= 4)) return;
      editGeneratedItem(itemIdx, function (i) {
        var patched = moveResourceAnchor(i, sr.resourceId, newRung, sr._reusedKind || sr.kind, sr.title);
        var supps = (patched.supplementaryResources || []).map(function (s) {
          if (s && s.resourceId === sr.resourceId) return Object.assign({}, s, { anchorRung: newRung });
          return s;
        });
        return Object.assign({}, patched, { supplementaryResources: supps });
      });
    }

    // Save handlers per kind.
    // Glossary: regenerate (mints a NEW history entry; old one becomes orphaned
    // in the resource pack but the inline link is swapped).
    function saveGlossaryEdit(itemIdx, sr, draft) {
      if (typeof props.onGenerateGlossary !== "function") {
        addToast("Glossary callback isn't wired in this host.");
        return;
      }
      var terms = (Array.isArray(draft.seedTerms) ? draft.seedTerms : [])
        .map(function (s) { return String(s || "").trim().toLowerCase(); })
        .filter(function (s) { return s.length > 1; }).slice(0, 6);
      if (terms.length === 0) { addToast("Enter at least one term."); return; }
      var title = String(draft.title || "").trim().slice(0, 80) || ("Glossary: " + terms.slice(0, 2).join(", "));
      var item = generatedItems[itemIdx];
      addToast("Regenerating glossary with edited terms…");
      var provenance = { fromDA: true, daItemIndex: itemIdx, daItemPrompt: String(item && item.prompt || "").slice(0, 80) };
      props.onGenerateGlossary(terms, title, provenance)
        .then(function (res) {
          if (!res || !res.id) throw new Error("Glossary callback returned no id.");
          editGeneratedItem(itemIdx, function (i) {
            // Strip old link, then add new one at the same anchor rung.
            var stripped = removeLinkTokenFromRung(i, sr.resourceId);
            var anchorRung = sr.anchorRung || 1;
            var token = makeResourceLinkToken(title, res.id);
            var withLink = appendLinkTokenToRung(stripped, anchorRung, token, res.id, "glossary");
            // Replace the supps entry with the new id + terms.
            var supps = (withLink.supplementaryResources || []).map(function (s) {
              if (s && s.resourceId === sr.resourceId) {
                return Object.assign({}, s, { seedTerms: terms, title: title, resourceId: res.id, status: "generated" });
              }
              return s;
            });
            return Object.assign({}, withLink, { supplementaryResources: supps });
          });
          closeChipEditor();
          addToast("Glossary updated. (Old entry remains in resource pack — delete it if you don't need it.)");
        })
        .catch(function (err) {
          addToast("Edit failed: " + (err && err.message ? err.message : "unknown"));
        });
    }
    // Manipulative: update in place via host callback (no Imagen cost).
    function saveManipulativeEdit(itemIdx, sr, draft) {
      if (typeof props.onUpdateManipulativePreset !== "function") {
        addToast("In-place manipulative update isn't wired in this host.");
        return;
      }
      var preset = sanitizeManipulativePreset(sr.toolId, draft.preset || {});
      if (!preset) { addToast("Preset values are out of range."); return; }
      var title = String(draft.title || "").trim().slice(0, 80) || defaultManipulativeTitle(sr.toolId, preset);
      props.onUpdateManipulativePreset(sr.resourceId, preset, title)
        .then(function () {
          editGeneratedItem(itemIdx, function (i) {
            // Update title in the link token too so the chip + rung text reflect the new label.
            var stripped = removeLinkTokenFromRung(i, sr.resourceId);
            var anchorRung = sr.anchorRung || 3;
            var token = makeResourceLinkToken(title, sr.resourceId);
            var withLink = appendLinkTokenToRung(stripped, anchorRung, token, sr.resourceId, "math-manipulative");
            var supps = (withLink.supplementaryResources || []).map(function (s) {
              if (s && s.resourceId === sr.resourceId) {
                return Object.assign({}, s, { preset: preset, title: title });
              }
              return s;
            });
            return Object.assign({}, withLink, { supplementaryResources: supps });
          });
          closeChipEditor();
          addToast("Manipulative updated in place.");
        })
        .catch(function (err) {
          addToast("Update failed: " + (err && err.message ? err.message : "unknown"));
        });
    }
    // Word Sounds probe: update in place via host callback.
    function saveWordSoundsEdit(itemIdx, sr, draft) {
      if (typeof props.onUpdateWordSoundsProbe !== "function") {
        addToast("In-place phonics update isn't wired in this host.");
        return;
      }
      var ALLOWED = { counting: 1, segmentation: 1, blending: 1, isolation: 1, manipulation: 1, rhyming: 1, syllable_blending: 1, syllable_counting: 1 };
      var activity = ALLOWED[draft.activity] ? draft.activity : sr.activity;
      var words = (Array.isArray(draft.words) ? draft.words : [])
        .map(function (w) { return String(w || "").toLowerCase().replace(/[^a-z]/g, ""); })
        .filter(function (w) { return w.length >= 2 && w.length <= 14; }).slice(0, 12);
      if (words.length < 3) { addToast("Need at least 3 valid words."); return; }
      var title = String(draft.title || "").trim().slice(0, 80) || defaultWordSoundsProbeTitle(activity, words);
      props.onUpdateWordSoundsProbe(sr.resourceId, activity, words, title)
        .then(function () {
          editGeneratedItem(itemIdx, function (i) {
            var stripped = removeLinkTokenFromRung(i, sr.resourceId);
            var anchorRung = sr.anchorRung || 1;
            var token = makeResourceLinkToken(title, sr.resourceId);
            var withLink = appendLinkTokenToRung(stripped, anchorRung, token, sr.resourceId, "word-sounds-probe");
            var supps = (withLink.supplementaryResources || []).map(function (s) {
              if (s && s.resourceId === sr.resourceId) {
                return Object.assign({}, s, { activity: activity, words: words, title: title });
              }
              return s;
            });
            return Object.assign({}, withLink, { supplementaryResources: supps });
          });
          closeChipEditor();
          addToast("Phonics probe updated in place.");
        })
        .catch(function (err) {
          addToast("Update failed: " + (err && err.message ? err.message : "unknown"));
        });
    }

    // Phase 3 — On-demand "Add inline phonics probe" trigger. Asks Gemini for
    // a one-shot recommendation (activity + word list) tied to this item's
    // prompt, then runs the same Phase Z host callback path so the probe
    // lands in history + the rung gets the inline link + usage hint.
    function addManualWordSoundsProbeToItem(idx) {
      var item = generatedItems[idx];
      if (!item) return;
      if (typeof props.onGenerateWordSoundsProbe !== "function") {
        addToast("Word Sounds generation isn't wired in this host.");
        return;
      }
      if (typeof callGeminiFn !== "function") {
        addToast("AI is not available in this host — cannot pick a phonics probe.");
        return;
      }
      var promptText = String(item.prompt || "");
      var pickPrompt = [
        "You are picking ONE phonological-awareness probe to support a Dynamic Assessment item.",
        "Allowed activities: counting, segmentation, blending, isolation, manipulation, rhyming, syllable_blending, syllable_counting.",
        "Word list rules: 3-12 short words. Lowercase, alphabetic only, no punctuation. Match phoneme complexity to the item's grade-band.",
        "",
        "Item prompt: " + promptText,
        "",
        "Output STRICT JSON only (no fences, no prose): { \"activity\": \"<one of the eight>\", \"words\": [\"<3-12 short words>\"], \"title\": \"<short label>\", \"anchorRung\": <1|2|3|4> }"
      ].join("\n");
      addToast("Picking the right phonics probe…");
      var placeholder = {
        kind: "word-sounds-probe",
        activity: "pending",
        title: "Picking probe…",
        words: [],
        anchorRung: 1,
        status: "generating",
        resourceId: null
      };
      editGeneratedItem(idx, function (i) {
        var existing = Array.isArray(i.supplementaryResources) ? i.supplementaryResources : [];
        return Object.assign({}, i, { supplementaryResources: existing.concat([placeholder]) });
      });
      Promise.resolve()
        .then(function () { return callGeminiFn(pickPrompt, true); })
        .then(function (raw) {
          var cleaned = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          var parsed = null;
          try { parsed = JSON.parse(cleaned); } catch (_) {}
          if (!parsed || typeof parsed !== "object") throw new Error("AI did not return valid JSON.");
          var ALLOWED = { counting: 1, segmentation: 1, blending: 1, isolation: 1, manipulation: 1, rhyming: 1, syllable_blending: 1, syllable_counting: 1 };
          var activity = String(parsed.activity || "").toLowerCase();
          if (!ALLOWED[activity]) activity = "segmentation"; // safe default
          var words = Array.isArray(parsed.words)
            ? parsed.words.map(function (w) { return String(w || "").toLowerCase().replace(/[^a-z]/g, ""); })
                .filter(function (w) { return w.length >= 2 && w.length <= 14; })
                .slice(0, 12)
            : [];
          if (words.length < 3) {
            // Fallback to a generic CVC set so we don't fail outright.
            words = ["cat", "pan", "sit", "top", "mug"];
          }
          var anchorRung = parseInt(parsed.anchorRung, 10);
          if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = 1;
          var title = String(parsed.title || "").trim().slice(0, 80) || defaultWordSoundsProbeTitle(activity, words);
          var provenance = { fromDA: true, daItemIndex: idx, daItemPrompt: promptText.slice(0, 80) };
          return props.onGenerateWordSoundsProbe(activity, words, title, provenance)
            .then(function (res) {
              if (!res || !res.id) throw new Error("Word Sounds callback returned no id.");
              var token = makeResourceLinkToken(title, res.id);
              editGeneratedItem(idx, function (i) {
                var supps = (i.supplementaryResources || []).slice();
                var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.activity === "pending"; });
                if (sIdx < 0) sIdx = supps.length - 1;
                supps[sIdx] = { kind: "word-sounds-probe", activity: activity, words: words, title: title, anchorRung: anchorRung, status: "generated", resourceId: res.id };
                var withSupps = Object.assign({}, i, { supplementaryResources: supps });
                return appendLinkTokenToRung(withSupps, anchorRung, token, res.id, "word-sounds-probe");
              });
              addToast("Inline phonics probe attached: " + title);
            });
        })
        .catch(function (err) {
          editGeneratedItem(idx, function (i) {
            var supps = (i.supplementaryResources || []).slice();
            var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.activity === "pending"; });
            if (sIdx >= 0) {
              supps[sIdx] = Object.assign({}, supps[sIdx], { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
            }
            return Object.assign({}, i, { supplementaryResources: supps });
          });
          addToast("Phonics probe generation failed: " + (err && err.message ? err.message : "unknown"));
        });
    }

    // Phase 4 — Manual "+ Add inline organizer" for items Gemini didn't auto-
    // attach one to. Asks the AI to pick the best organizer type + write the
    // directive for THIS item, then routes through the same host callback
    // (which uses the shared handleGenerate pipeline). Falls back to an outline.
    function addManualVisualOrganizerToItem(idx) {
      var item = generatedItems[idx];
      if (!item) return;
      if (typeof props.onGenerateVisualOrganizer !== "function") {
        addToast("Visual organizer generation isn't wired in this host.");
        return;
      }
      if (typeof callGeminiFn !== "function") {
        addToast("AI is not available in this host — cannot pick an organizer.");
        return;
      }
      var promptText = String(item.prompt || "");
      var pickPrompt = [
        "You are picking ONE graphic organizer to support a Dynamic Assessment item.",
        "Allowed toolType: concept-map (interconnections from a hub), mind-map (hierarchical branches), outline (main idea + details), timeline (chronological sequence), concept-sort (categorize into groups).",
        "Pick the type that best fits the cognitive demand of the item, then write a directive: 1-3 sentences of source content the generator will turn into the organizer. Anchor the directive to the item's actual content.",
        "",
        "Item prompt: " + promptText,
        "",
        "Output STRICT JSON only (no fences, no prose): { \"toolType\": \"<one of the five>\", \"directive\": \"<1-3 sentences>\", \"title\": \"<short label>\", \"anchorRung\": <1|2|3|4> }"
      ].join("\n");
      addToast("Picking the right organizer…");
      var placeholder = {
        kind: "visual-organizer",
        toolType: "pending",
        title: "Picking organizer…",
        directive: "",
        anchorRung: 3,
        status: "generating",
        resourceId: null
      };
      editGeneratedItem(idx, function (i) {
        var existing = Array.isArray(i.supplementaryResources) ? i.supplementaryResources : [];
        return Object.assign({}, i, { supplementaryResources: existing.concat([placeholder]) });
      });
      Promise.resolve()
        .then(function () { return callGeminiFn(pickPrompt, true); })
        .then(function (raw) {
          var cleaned = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          var parsed = null;
          try { parsed = JSON.parse(cleaned); } catch (_) {}
          if (!parsed || typeof parsed !== "object") throw new Error("AI did not return valid JSON.");
          var ALLOWED = { "concept-map": 1, "mind-map": 1, "outline": 1, "timeline": 1, "concept-sort": 1 };
          var toolType = String(parsed.toolType || "").toLowerCase();
          if (!ALLOWED[toolType]) toolType = "outline"; // safe default
          var directive = String(parsed.directive || "").trim().slice(0, 600);
          if (directive.length < 8) directive = promptText.slice(0, 300); // fall back to the item prompt itself
          var anchorRung = parseInt(parsed.anchorRung, 10);
          if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = 3;
          var title = String(parsed.title || "").trim().slice(0, 80) || defaultVisualOrganizerTitle(toolType, directive);
          var provenance = { fromDA: true, daItemIndex: idx, daItemPrompt: promptText.slice(0, 80) };
          return props.onGenerateVisualOrganizer(toolType, directive, title, provenance)
            .then(function (res) {
              if (!res || !res.id) throw new Error("Visual organizer callback returned no id.");
              var token = makeResourceLinkToken(title, res.id);
              editGeneratedItem(idx, function (i) {
                var supps = (i.supplementaryResources || []).slice();
                var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.toolType === "pending"; });
                if (sIdx < 0) sIdx = supps.length - 1;
                supps[sIdx] = { kind: "visual-organizer", toolType: toolType, directive: directive, title: title, anchorRung: anchorRung, status: "generated", resourceId: res.id };
                var withSupps = Object.assign({}, i, { supplementaryResources: supps });
                return appendLinkTokenToRung(withSupps, anchorRung, token, res.id, "visual-organizer");
              });
              addToast("Inline organizer attached: " + title);
            });
        })
        .catch(function (err) {
          editGeneratedItem(idx, function (i) {
            var supps = (i.supplementaryResources || []).slice();
            var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.toolType === "pending"; });
            if (sIdx >= 0) {
              supps[sIdx] = Object.assign({}, supps[sIdx], { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
            }
            return Object.assign({}, i, { supplementaryResources: supps });
          });
          addToast("Organizer generation failed: " + (err && err.message ? err.message : "unknown"));
        });
    }

    // Manual "+ Add inline frames" — for items Gemini didn't auto-attach an
    // expressive scaffold to. Asks the AI to write a directive describing the
    // response demand + frame style for THIS item, then routes through the
    // same host callback. Falls back to the item prompt as the directive.
    function addManualSentenceFramesToItem(idx) {
      var item = generatedItems[idx];
      if (!item) return;
      if (typeof props.onGenerateSentenceFrames !== "function") {
        addToast("Sentence-frames generation isn't wired in this host.");
        return;
      }
      if (typeof callGeminiFn !== "function") {
        addToast("AI is not available in this host — cannot draft frames.");
        return;
      }
      var promptText = String(item.prompt || "");
      var pickPrompt = [
        "You are designing fill-in SENTENCE FRAMES to scaffold a student's spoken or written RESPONSE to a Dynamic Assessment item.",
        "Frames help a student who understands the idea but struggles to PRODUCE a response (e.g., 'I think ___ because ___.').",
        "Write a directive: 1-3 sentences describing the response demand of this item + the kind of frame that fits. Anchor it to the item's actual content.",
        "",
        "Item prompt: " + promptText,
        "",
        "Output STRICT JSON only (no fences, no prose): { \"directive\": \"<1-3 sentences>\", \"title\": \"<short label>\", \"anchorRung\": <1|2|3|4> }"
      ].join("\n");
      addToast("Drafting sentence frames…");
      var placeholder = {
        kind: "sentence-frames",
        directive: "pending",
        title: "Drafting frames…",
        anchorRung: 2,
        status: "generating",
        resourceId: null
      };
      editGeneratedItem(idx, function (i) {
        var existing = Array.isArray(i.supplementaryResources) ? i.supplementaryResources : [];
        return Object.assign({}, i, { supplementaryResources: existing.concat([placeholder]) });
      });
      Promise.resolve()
        .then(function () { return callGeminiFn(pickPrompt, true); })
        .then(function (raw) {
          var cleaned = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          var parsed = null;
          try { parsed = JSON.parse(cleaned); } catch (_) {}
          if (!parsed || typeof parsed !== "object") throw new Error("AI did not return valid JSON.");
          var directive = String(parsed.directive || "").trim().slice(0, 600);
          if (directive.length < 8) directive = promptText.slice(0, 300); // fall back to the item prompt
          var anchorRung = parseInt(parsed.anchorRung, 10);
          if (!(anchorRung >= 1 && anchorRung <= 4)) anchorRung = 2;
          var title = String(parsed.title || "").trim().slice(0, 80) || "Sentence Frames";
          var provenance = { fromDA: true, daItemIndex: idx, daItemPrompt: promptText.slice(0, 80) };
          return props.onGenerateSentenceFrames(directive, title, provenance)
            .then(function (res) {
              if (!res || !res.id) throw new Error("Sentence-frames callback returned no id.");
              var token = makeResourceLinkToken(title, res.id);
              editGeneratedItem(idx, function (i) {
                var supps = (i.supplementaryResources || []).slice();
                var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.directive === "pending"; });
                if (sIdx < 0) sIdx = supps.length - 1;
                supps[sIdx] = { kind: "sentence-frames", directive: directive, title: title, anchorRung: anchorRung, status: "generated", resourceId: res.id };
                var withSupps = Object.assign({}, i, { supplementaryResources: supps });
                return appendLinkTokenToRung(withSupps, anchorRung, token, res.id, "sentence-frames");
              });
              addToast("Inline frames attached: " + title);
            });
        })
        .catch(function (err) {
          editGeneratedItem(idx, function (i) {
            var supps = (i.supplementaryResources || []).slice();
            var sIdx = supps.findIndex(function (s) { return s && s.status === "generating" && s.directive === "pending"; });
            if (sIdx >= 0) {
              supps[sIdx] = Object.assign({}, supps[sIdx], { status: "failed", _failureMessage: (err && err.message) ? String(err.message).slice(0, 120) : "Unknown" });
            }
            return Object.assign({}, i, { supplementaryResources: supps });
          });
          addToast("Sentence-frames generation failed: " + (err && err.message ? err.message : "unknown"));
        });
    }

    // Phase Z++ — Kind-specific inline editor that opens BELOW a chip when
    // the user clicks "✏️ Edit". Renders a minimal form for each kind; on
    // Save, calls the matching save* helper which patches the resource in
    // place (manipulative / word-sounds) OR regenerates (glossary).
    function renderChipEditor(itemIdx, sr, draft) {
      var ed = function (patch) { setEditingChip(Object.assign({}, editingChip, { draft: Object.assign({}, draft, patch) })); };
      var commonBox = { marginTop: 6, padding: 8, background: "var(--da-surface)", border: "1px dashed var(--da-amber-border)", borderRadius: 4 };
      var labelStyle = { display: "block", fontSize: 10, fontWeight: 700, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 };
      var inputStyle = { width: "100%", padding: "4px 6px", border: "1px solid var(--da-border-2)", borderRadius: 4, fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" };
      var saveBtnStyle = { padding: "3px 12px", borderRadius: 4, border: "1px solid var(--da-btn-green)", background: "var(--da-btn-green)", color: "var(--da-on-accent)", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
      var cancelBtnStyle = { padding: "3px 10px", borderRadius: 4, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: 6 };

      if (sr.kind === "glossary") {
        var termsStr = (draft.seedTerms || []).join(", ");
        return h("div", { style: commonBox },
          h("label", { style: labelStyle }, "Seed terms (comma-separated, 1-6)"),
          h("input", {
            type: "text", value: termsStr,
            onChange: function (e) { ed({ seedTerms: e.target.value.split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean).slice(0, 6) }); },
            style: inputStyle
          }),
          h("label", { style: Object.assign({}, labelStyle, { marginTop: 6 }) }, "Title (optional)"),
          h("input", {
            type: "text", value: draft.title || "", maxLength: 80,
            onChange: function (e) { ed({ title: e.target.value }); },
            style: inputStyle
          }),
          h("div", { style: { marginTop: 8, fontSize: 10, color: "var(--da-amber-text-2)", fontStyle: "italic", lineHeight: 1.4 } },
            "Saving regenerates the glossary with the new terms + auto-icons. The old glossary entry stays in your resource pack (you can delete it manually if needed)."),
          h("div", { style: { marginTop: 6 } },
            h("button", { onClick: function () { saveGlossaryEdit(itemIdx, sr, draft); }, style: saveBtnStyle }, "Regenerate with new terms"),
            h("button", { onClick: closeChipEditor, style: cancelBtnStyle }, "Cancel")
          )
        );
      }

      if (sr.kind === "math-manipulative") {
        var preset = draft.preset || {};
        var toolForm = null;
        if (sr.toolId === "numberline") {
          var r = preset.range || { min: 0, max: 20 };
          toolForm = h("div", null,
            h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
              h("div", null,
                h("label", { style: labelStyle }, "Range min"),
                h("input", { type: "number", value: r.min, onChange: function (e) { ed({ preset: Object.assign({}, preset, { range: Object.assign({}, r, { min: parseInt(e.target.value, 10) }) }) }); }, style: inputStyle })
              ),
              h("div", null,
                h("label", { style: labelStyle }, "Range max"),
                h("input", { type: "number", value: r.max, onChange: function (e) { ed({ preset: Object.assign({}, preset, { range: Object.assign({}, r, { max: parseInt(e.target.value, 10) }) }) }); }, style: inputStyle })
              )
            ),
            h("label", { style: Object.assign({}, labelStyle, { marginTop: 6 }) }, "Tab"),
            h("select", { value: preset.tab || "explore", onChange: function (e) { ed({ preset: Object.assign({}, preset, { tab: e.target.value }) }); }, style: inputStyle },
              h("option", { value: "explore" }, "explore"),
              h("option", { value: "skipCount" }, "skipCount"),
              h("option", { value: "fracDec" }, "fracDec")
            ),
            h("label", { style: Object.assign({}, labelStyle, { marginTop: 6 }) }, "Markers (value:label, comma-separated — e.g., 7:start, 12:end)"),
            h("input", {
              type: "text",
              value: (preset.markers || []).map(function (m) { return m.value + (m.label ? ":" + m.label : ""); }).join(", "),
              onChange: function (e) {
                var newMarkers = e.target.value.split(",").map(function (chunk) {
                  var parts = chunk.split(":").map(function (s) { return s.trim(); });
                  var v = parseFloat(parts[0]);
                  if (!isFinite(v)) return null;
                  return { value: v, color: "var(--da-red-mid-2)", label: parts[1] || "" };
                }).filter(Boolean).slice(0, 6);
                ed({ preset: Object.assign({}, preset, { markers: newMarkers }) });
              },
              style: inputStyle
            })
          );
        } else if (sr.toolId === "fractions") {
          toolForm = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 } },
            h("div", null,
              h("label", { style: labelStyle }, "Numerator"),
              h("input", { type: "number", value: preset.numerator || 1, onChange: function (e) { ed({ preset: Object.assign({}, preset, { numerator: parseInt(e.target.value, 10) }) }); }, style: inputStyle })
            ),
            h("div", null,
              h("label", { style: labelStyle }, "Denominator"),
              h("input", { type: "number", value: preset.denominator || 2, onChange: function (e) { ed({ preset: Object.assign({}, preset, { denominator: parseInt(e.target.value, 10) }) }); }, style: inputStyle })
            ),
            h("div", null,
              h("label", { style: labelStyle }, "Tab"),
              h("select", { value: preset.tab || "practice", onChange: function (e) { ed({ preset: Object.assign({}, preset, { tab: e.target.value }) }); }, style: inputStyle },
                h("option", { value: "practice" }, "practice"),
                h("option", { value: "compare" }, "compare"),
                h("option", { value: "wall" }, "wall")
              )
            )
          );
        } else if (sr.toolId === "areamodel") {
          toolForm = h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
            h("div", null,
              h("label", { style: labelStyle }, "Rows"),
              h("input", { type: "number", value: preset.rows || 3, onChange: function (e) { ed({ preset: Object.assign({}, preset, { rows: parseInt(e.target.value, 10) }) }); }, style: inputStyle })
            ),
            h("div", null,
              h("label", { style: labelStyle }, "Cols"),
              h("input", { type: "number", value: preset.cols || 4, onChange: function (e) { ed({ preset: Object.assign({}, preset, { cols: parseInt(e.target.value, 10) }) }); }, style: inputStyle })
            )
          );
        }
        return h("div", { style: commonBox },
          toolForm,
          h("label", { style: Object.assign({}, labelStyle, { marginTop: 6 }) }, "Title (optional)"),
          h("input", { type: "text", value: draft.title || "", maxLength: 80, onChange: function (e) { ed({ title: e.target.value }); }, style: inputStyle }),
          h("div", { style: { marginTop: 8, fontSize: 10, color: "var(--da-amber-text-2)", fontStyle: "italic", lineHeight: 1.4 } },
            "Saving updates this manipulative in place — same resource id, same history entry, no re-render of student devices needed."),
          h("div", { style: { marginTop: 6 } },
            h("button", { onClick: function () { saveManipulativeEdit(itemIdx, sr, draft); }, style: saveBtnStyle }, "Apply changes"),
            h("button", { onClick: closeChipEditor, style: cancelBtnStyle }, "Cancel")
          )
        );
      }

      if (sr.kind === "word-sounds-probe") {
        var wordsStr = (draft.words || []).join(", ");
        return h("div", { style: commonBox },
          h("label", { style: labelStyle }, "Activity"),
          h("select", { value: draft.activity || "segmentation", onChange: function (e) { ed({ activity: e.target.value }); }, style: inputStyle },
            h("option", { value: "counting" }, "counting"),
            h("option", { value: "segmentation" }, "segmentation"),
            h("option", { value: "blending" }, "blending"),
            h("option", { value: "isolation" }, "isolation"),
            h("option", { value: "manipulation" }, "manipulation"),
            h("option", { value: "rhyming" }, "rhyming"),
            h("option", { value: "syllable_blending" }, "syllable_blending"),
            h("option", { value: "syllable_counting" }, "syllable_counting")
          ),
          h("label", { style: Object.assign({}, labelStyle, { marginTop: 6 }) }, "Words (comma-separated, 3-12)"),
          h("input", {
            type: "text", value: wordsStr,
            onChange: function (e) { ed({ words: e.target.value.split(",").map(function (w) { return w.trim().toLowerCase(); }).filter(Boolean).slice(0, 12) }); },
            style: inputStyle
          }),
          h("label", { style: Object.assign({}, labelStyle, { marginTop: 6 }) }, "Title (optional)"),
          h("input", { type: "text", value: draft.title || "", maxLength: 80, onChange: function (e) { ed({ title: e.target.value }); }, style: inputStyle }),
          h("div", { style: { marginTop: 8, fontSize: 10, color: "var(--da-amber-text-2)", fontStyle: "italic", lineHeight: 1.4 } },
            "Saving updates this probe in place — same resource id."),
          h("div", { style: { marginTop: 6 } },
            h("button", { onClick: function () { saveWordSoundsEdit(itemIdx, sr, draft); }, style: saveBtnStyle }, "Apply changes"),
            h("button", { onClick: closeChipEditor, style: cancelBtnStyle }, "Cancel")
          )
        );
      }

      return null;
    }

    function renderEditableItem(item, idx) {
      var warnings = Array.isArray(item._generationWarnings) ? item._generationWarnings : [];
      var isExcluded = !!item._excluded;
      return h("div", {
        key: "da-gen-item-" + idx,
        className: "da-card",
        style: {
          background: isExcluded ? "var(--da-surface-2)" : "var(--da-surface)",
          opacity: isExcluded ? 0.55 : 1,
          borderColor: warnings.length > 0 ? "var(--da-amber-border)" : "var(--da-border)"
        }
      },
        // Header row
        h("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" } },
          h("div", { style: { fontSize: 12, fontWeight: 800, color: "var(--da-ink)" } }, "Item " + (idx + 1) + " — " + (item.construct || "")),
          warnings.length > 0 ? h("span", {
            style: { fontSize: 10.5, color: "var(--da-amber-text)", background: "var(--da-amber-tint-2)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }
          }, "⚠ " + warnings.length + " warning" + (warnings.length === 1 ? "" : "s")) : null,
          h("div", { style: { flex: 1 } }),
          h("button", {
            onClick: function () { regenerateOneItem(idx); },
            disabled: genBusy,
            style: { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink)", fontSize: 11, fontWeight: 700, cursor: genBusy ? "wait" : "pointer", fontFamily: "inherit" }
          }, "↻ Regenerate"),
          h("button", {
            onClick: function () { editGeneratedItem(idx, function (i) { return Object.assign({}, i, { _excluded: !i._excluded }); }); },
            style: { padding: "4px 10px", borderRadius: 6, border: "1px solid " + (isExcluded ? "var(--da-green-mid)" : "var(--da-red-border)"), background: "transparent", color: isExcluded ? "var(--da-green-text-2)" : "var(--da-red-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, isExcluded ? "+ Include" : "✕ Exclude")
        ),
        // Warnings list (heuristic validator output)
        warnings.length > 0 ? h("div", { style: { marginBottom: 8, padding: "6px 10px", background: "var(--da-amber-tint-2)", borderRadius: 6, fontSize: 11, color: "var(--da-amber-text-2)" } },
          warnings.map(function (w, wi) {
            return h("div", { key: "da-warn-" + idx + "-" + wi }, "• " + w);
          })
        ) : null,
        // Phase Y — Self-critique transparency: show AI's critique notes + refinement notes per item
        item._critique || item._refined || item._refinementSkipped || item._critiqueSkipped ? h("div", { style: { marginBottom: 8, padding: 8, background: "var(--da-violet-tint-2)", borderRadius: 6, fontSize: 11, color: "var(--da-violet-deep)", lineHeight: 1.55, borderLeft: "3px solid var(--da-violet-mid)" } },
          h("div", { style: { fontWeight: 800, marginBottom: 4, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 } },
            "🔬 AI self-critique"),
          // Critique skipped (the pass returned no usable results)
          item._critiqueSkipped ? h("div", { style: { fontStyle: "italic", color: "var(--da-orange-deep)" } },
            "Self-critique pass returned no results — this item shipped without refinement. Review L1 + L3 carefully.") : null,
          // Refinement skipped (critique flagged issues but refinement pass failed)
          item._refinementSkipped ? h("div", { style: { fontStyle: "italic", color: "var(--da-orange-deep)" } },
            "Critique flagged issues but the refinement pass failed. See raw critique below; consider hand-editing or regenerating.") : null,
          // Refined: show what changed
          item._refined && item._refinementNotes ? h("div", { style: { fontWeight: 700, color: "var(--da-green-text-2)", marginBottom: 4 } },
            "✓ Refined: " + item._refinementNotes) : null,
          // Critique result (always shown if present)
          item._critique ? h("div", { style: { marginTop: item._refined ? 6 : 0 } },
            h("div", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-violet-text-2)" } },
              "Overall quality: ",
              h("span", {
                style: {
                  color: item._critique.overallQuality === "good" ? "var(--da-green-text-2)"
                       : item._critique.overallQuality === "needs-minor-refinement" ? "var(--da-amber-text)"
                       : "var(--da-red-text)"
                }
              }, item._critique.overallQuality)),
            (item._critique.issues || []).length > 0 ? h("ul", { style: { margin: "4px 0 0 18px", padding: 0, fontSize: 10.5, color: "var(--da-violet-deep)" } },
              item._critique.issues.map(function (iss, ii) {
                return h("li", { key: "da-iss-" + idx + "-" + ii, style: { marginBottom: 2 } },
                  h("strong", null, iss.criterion + (iss.level ? " · L" + iss.level : "") + " (" + iss.severity + "): "),
                  iss.description,
                  iss.suggestedFix ? h("em", { style: { color: "var(--da-violet-mid)", display: "block" } }, "→ Fix: " + iss.suggestedFix) : null
                );
              })
            ) : null
          ) : null
        ) : null,
        // Prompt field
        h("div", { style: { marginBottom: 8 } },
          h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Prompt"),
          // Phase Z — preview row of resource link chips when present (read-only,
          // sits above the editable textarea so clinicians can both click the link
          // AND edit the underlying text).
          (item.prompt && item.prompt.indexOf("](resource:") >= 0) ? h("div", {
            style: { marginBottom: 4, fontSize: 12, color: "var(--da-ink)", lineHeight: 1.55 }
          }, renderTextWithResourceLinks(item.prompt, "rev-prompt-" + idx)) : null,
          h("textarea", {
            rows: 2, value: item.prompt,
            onChange: function (e) {
              var v = e.target.value;
              editGeneratedItem(idx, function (i) { return Object.assign({}, i, { prompt: v }); });
            },
            style: { width: "100%", padding: "6px 10px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          })
        ),
        // Phase Z — Supplementary resources panel.
        // Always rendered: shows existing supports with status, AND small
        // "+ Add inline glossary" / "+ Add inline manipulative" buttons for
        // items that came back without one (Gemini judgment varies). The
        // buttons call Gemini for the right support tied to THIS item.
        (function () {
          var supps = Array.isArray(item.supplementaryResources) ? item.supplementaryResources : [];
          var hasActiveGlossary = supps.some(function (sr) { return sr && sr.kind === "glossary" && (sr.status === "generated" || sr.status === "generating"); });
          var hasActiveManipulative = supps.some(function (sr) { return sr && sr.kind === "math-manipulative" && (sr.status === "generated" || sr.status === "generating"); });
          var hasActiveWordSounds = supps.some(function (sr) { return sr && sr.kind === "word-sounds-probe" && (sr.status === "generated" || sr.status === "generating"); });
          var hasActiveVisualOrganizer = supps.some(function (sr) { return sr && sr.kind === "visual-organizer" && (sr.status === "generated" || sr.status === "generating"); });
          var hasActiveSentenceFrames = supps.some(function (sr) { return sr && sr.kind === "sentence-frames" && (sr.status === "generated" || sr.status === "generating"); });
          var iconForKind = function (kind, toolId) {
            if (kind === "glossary") return "📚";
            if (kind === "math-manipulative") {
              if (toolId === "numberline") return "📏";
              if (toolId === "fractions") return "🧩";
              if (toolId === "areamodel") return "🟦";
              return "🧮";
            }
            if (kind === "word-sounds-probe") return "🔤";
            if (kind === "visual-organizer") return "🗺️";
            if (kind === "sentence-frames") return "✍️";
            if (kind === "reuse") return "♻️"; // reused from inventory
            return "🔗";
          };
          return h("div", {
            style: { marginBottom: 8, padding: 8, background: "var(--da-indigo-tint)", borderRadius: 6, border: "1px solid var(--da-indigo-border)", fontSize: 11, lineHeight: 1.5 }
          },
            h("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" } },
              h("span", { style: { fontWeight: 800, color: "var(--da-indigo-text)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 } },
                "🔗 Inline supports for this item"),
              !hasActiveGlossary ? h("button", {
                onClick: function () { addManualGlossaryToItem(idx); },
                disabled: typeof props.onGenerateGlossary !== "function",
                title: typeof props.onGenerateGlossary === "function" ? "Generate a glossary for vocabulary in this prompt" : "Host glossary callback not wired",
                style: {
                  padding: "2px 10px", borderRadius: 4,
                  border: "1px solid var(--da-indigo-mid)", background: "var(--da-surface)", color: "var(--da-indigo-mid-2)",
                  fontSize: 10, fontWeight: 800, cursor: typeof props.onGenerateGlossary === "function" ? "pointer" : "not-allowed",
                  fontFamily: "inherit"
                }
              }, "+ Add inline glossary") : null,
              !hasActiveManipulative ? h("button", {
                onClick: function () { addManualManipulativeToItem(idx); },
                disabled: typeof props.onGenerateManipulative !== "function",
                title: typeof props.onGenerateManipulative === "function" ? "Attach an interactive math manipulative (number line, fraction bar, or area model)" : "Host manipulative callback not wired",
                style: {
                  padding: "2px 10px", borderRadius: 4,
                  border: "1px solid var(--da-amber-mid-2)", background: "var(--da-surface)", color: "var(--da-amber-text-2)",
                  fontSize: 10, fontWeight: 800, cursor: typeof props.onGenerateManipulative === "function" ? "pointer" : "not-allowed",
                  fontFamily: "inherit"
                }
              }, "+ Add inline manipulative") : null,
              !hasActiveWordSounds ? h("button", {
                onClick: function () { addManualWordSoundsProbeToItem(idx); },
                disabled: typeof props.onGenerateWordSoundsProbe !== "function",
                title: typeof props.onGenerateWordSoundsProbe === "function" ? "Attach a Word Sounds Studio probe (phoneme counting, segmentation, blending, etc.)" : "Host word-sounds callback not wired",
                style: {
                  padding: "2px 10px", borderRadius: 4,
                  border: "1px solid var(--da-cyan-text)", background: "var(--da-surface)", color: "var(--da-cyan-deep)",
                  fontSize: 10, fontWeight: 800, cursor: typeof props.onGenerateWordSoundsProbe === "function" ? "pointer" : "not-allowed",
                  fontFamily: "inherit"
                }
              }, "+ Add inline phonics probe") : null,
              !hasActiveVisualOrganizer ? h("button", {
                onClick: function () { addManualVisualOrganizerToItem(idx); },
                disabled: typeof props.onGenerateVisualOrganizer !== "function",
                title: typeof props.onGenerateVisualOrganizer === "function" ? "Attach a graphic organizer (concept map, mind map, outline, timeline, or concept sort)" : "Host visual-organizer callback not wired",
                style: {
                  padding: "2px 10px", borderRadius: 4,
                  border: "1px solid var(--da-teal-mid)", background: "var(--da-surface)", color: "var(--da-teal-text)",
                  fontSize: 10, fontWeight: 800, cursor: typeof props.onGenerateVisualOrganizer === "function" ? "pointer" : "not-allowed",
                  fontFamily: "inherit"
                }
              }, "+ Add inline organizer") : null,
              !hasActiveSentenceFrames ? h("button", {
                onClick: function () { addManualSentenceFramesToItem(idx); },
                disabled: typeof props.onGenerateSentenceFrames !== "function",
                title: typeof props.onGenerateSentenceFrames === "function" ? "Attach fill-in sentence frames that scaffold the student producing a response" : "Host sentence-frames callback not wired",
                style: {
                  padding: "2px 10px", borderRadius: 4,
                  border: "1px solid var(--da-pink-mid)", background: "var(--da-surface)", color: "var(--da-rose-text)",
                  fontSize: 10, fontWeight: 800, cursor: typeof props.onGenerateSentenceFrames === "function" ? "pointer" : "not-allowed",
                  fontFamily: "inherit"
                }
              }, "+ Add inline frames") : null
            ),
            supps.length > 0
              ? h("div", null, supps.map(function (sr, sri) {
                  var statusColor = sr.status === "generated" ? "var(--da-green-text-2)"
                                  : sr.status === "failed" ? "var(--da-red-text)"
                                  : sr.status === "generating" ? "var(--da-amber-text)"
                                  : "var(--da-muted)";
                  var statusLabel = sr.status === "generated" ? "✓ generated"
                                  : sr.status === "failed" ? "✗ failed"
                                  : sr.status === "generating" ? "… generating"
                                  : "· suggested";
                  var isEditing = editingChip && editingChip.resourceId === sr.resourceId && editingChip.itemIdx === idx;
                  var canEdit = sr.status === "generated" && sr.resourceId
                    && (sr.kind === "glossary" || sr.kind === "math-manipulative" || sr.kind === "word-sounds-probe");
                  var canDetach = sr.status === "generated" && sr.resourceId;
                  return h("div", { key: "da-supp-" + idx + "-" + sri, style: { marginBottom: 4, padding: 4, borderRadius: 4, background: isEditing ? "var(--da-amber-tint-2)" : "transparent" } },
                    h("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
                      h("span", { style: { fontWeight: 700, color: "var(--da-indigo-text)" } }, iconForKind(sr.kind, sr.toolId) + " " + (sr.title || "Resource")),
                      // Rung selector (changes anchor on the fly). For chips with status=generated only.
                      canDetach ? h("select", {
                        value: String(sr.anchorRung || 1),
                        onChange: function (e) { moveChipRung(idx, sr, parseInt(e.target.value, 10)); },
                        title: "Move this support to a different scaffold rung",
                        style: { padding: "0 4px", borderRadius: 4, border: "1px solid var(--da-indigo-border)", background: "var(--da-surface)", color: "var(--da-indigo-text)", fontSize: 10, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }
                      },
                        h("option", { value: "1" }, "L1"),
                        h("option", { value: "2" }, "L2"),
                        h("option", { value: "3" }, "L3"),
                        h("option", { value: "4" }, "L4")
                      ) : h("span", { style: { color: "var(--da-muted)", fontSize: 10 } }, "L" + (sr.anchorRung || 1)),
                      h("span", { style: { color: statusColor, fontSize: 10, fontWeight: 700 } }, statusLabel),
                      sr.status === "generated" && sr.resourceId && typeof props.onOpenResource === "function" ? h("button", {
                        onClick: function (e) { try { e.preventDefault(); } catch (_) {} props.onOpenResource(sr.resourceId); },
                        style: { padding: "1px 8px", borderRadius: 4, border: "1px solid var(--da-indigo-border)", background: "var(--da-surface)", color: "var(--da-indigo-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, "Open") : null,
                      canEdit ? h("button", {
                        onClick: function () { isEditing ? closeChipEditor() : openChipEditor(idx, sr); },
                        title: "Edit this resource (terms / preset / words)",
                        style: { padding: "1px 8px", borderRadius: 4, border: "1px solid var(--da-amber-border)", background: "var(--da-surface)", color: "var(--da-amber-text-2)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, isEditing ? "Cancel" : "✏️ Edit") : null,
                      canDetach ? h("button", {
                        onClick: function () { detachChipFromItem(idx, sr); },
                        title: "Remove this link from the rung (keeps the resource in your pack)",
                        style: { padding: "1px 8px", borderRadius: 4, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, "⛓️‍💥 Detach") : null,
                      sr.status === "failed" && sr._failureMessage ? h("span", { style: { color: "var(--da-red-deep)", fontSize: 10, fontStyle: "italic" } }, "— " + sr._failureMessage) : null
                    ),
                    isEditing ? renderChipEditor(idx, sr, editingChip.draft) : null
                  );
                }))
              : h("div", { style: { color: "var(--da-muted)", fontSize: 10.5, fontStyle: "italic" } },
                  "No inline supports attached. Add a ", h("strong", null, "glossary"), " (vocabulary), ", h("strong", null, "manipulative"), " (math tool), ", h("strong", null, "phonics probe"), " (Word Sounds Studio), ", h("strong", null, "organizer"), " (concept map / timeline / sort), or ", h("strong", null, "sentence frames"), " (scaffold the student's response).")
          );
        })(),
        // Correct answer field
        h("div", { style: { marginBottom: 8, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 } },
          h("div", null,
            h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Correct"),
            h("input", {
              type: "text", value: item.correctAnswer,
              onChange: function (e) {
                var v = e.target.value;
                editGeneratedItem(idx, function (i) { return Object.assign({}, i, { correctAnswer: v }); });
              },
              style: { width: "100%", padding: "6px 10px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 12, boxSizing: "border-box" }
            })
          ),
          h("div", null,
            h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Acceptable variants (comma-separated)"),
            h("input", {
              type: "text", value: (item.acceptableAnswers || []).join(", "),
              onChange: function (e) {
                var v = e.target.value.split(",").map(function (a) { return a.trim(); }).filter(function (a) { return a.length > 0; });
                editGeneratedItem(idx, function (i) { return Object.assign({}, i, { acceptableAnswers: v }); });
              },
              style: { width: "100%", padding: "6px 10px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 12, boxSizing: "border-box" }
            })
          )
        ),
        // Ladder steps — collapsible
        h("details", { open: true },
          h("summary", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Scaffold ladder (4 levels)"),
          h("div", { style: { marginTop: 6, display: "flex", flexDirection: "column", gap: 6 } },
            (item.promptLadder || []).map(function (step, li) {
              var labels = { cue: "L1 — Cue", leading: "L2 — Leading", model: "L3 — Model", directTeach: "L4 — Direct teach" };
              return h("div", { key: "da-step-" + idx + "-" + li, style: { padding: 8, background: "var(--da-surface-2)", border: "1px solid var(--da-border)", borderRadius: 6 } },
                h("div", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-ink)", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 } },
                  h("span", { style: { flex: 1 } }, labels[step.type] || ("L" + step.level)),
                  // Per-level regenerate. Hits Gemini with a focused prompt that
                  // rewrites JUST this rung against the rest of the item — much
                  // cheaper than ↻ Regenerate (whole item) and preserves any
                  // edits already made to the other rungs.
                  h("button", {
                    "aria-label": "Regenerate " + (labels[step.type] || ("L" + step.level)),
                    title: "Regenerate just this scaffold level (keeps L1-L" + step.level + " edits)",
                    onClick: function () { regenerateOneScaffoldStep(idx, step.level); },
                    disabled: genBusy,
                    style: {
                      padding: "2px 8px", borderRadius: 4,
                      border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)",
                      fontSize: 10, fontWeight: 700,
                      cursor: genBusy ? "wait" : "pointer", fontFamily: "inherit",
                      opacity: genBusy ? 0.5 : 1
                    }
                  }, "↻ Regenerate")
                ),
                // Phase Z — preview row of resource link chips when this rung
                // has any inline `[title](resource:id)` tokens. Read-only chips
                // above the editable textarea, so clinicians can click into the
                // resource AND still hand-edit the underlying text.
                (step.text && step.text.indexOf("](resource:") >= 0) ? h("div", {
                  style: { marginBottom: 3, fontSize: 11.5, color: "var(--da-ink)", lineHeight: 1.5 }
                }, renderTextWithResourceLinks(step.text, "rev-step-" + idx + "-" + li)) : null,
                h("textarea", {
                  rows: 2, value: step.text,
                  onChange: function (e) {
                    var v = e.target.value;
                    editGeneratedItem(idx, function (i) {
                      var newLadder = (i.promptLadder || []).slice();
                      newLadder[li] = Object.assign({}, newLadder[li], { text: v });
                      return Object.assign({}, i, { promptLadder: newLadder });
                    });
                  },
                  style: { width: "100%", padding: "6px 10px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12, boxSizing: "border-box", resize: "vertical" }
                })
              );
            })
          )
        ),
        // Transfer twin — if present
        item.transferTwin ? h("details", { style: { marginTop: 6 } },
          h("summary", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Transfer twin (parallel item, different surface)"),
          h("div", { style: { marginTop: 6, padding: 8, background: "var(--da-surface-2)", border: "1px solid var(--da-border)", borderRadius: 6, fontSize: 12, color: "var(--da-ink)" } },
            h("div", { style: { marginBottom: 4 } }, h("strong", null, "Prompt: "), item.transferTwin.prompt),
            h("div", null, h("strong", null, "Answer: "), h("code", { style: { fontFamily: "ui-monospace, monospace", background: "var(--da-surface)", padding: "1px 6px", borderRadius: 4 } }, item.transferTwin.correctAnswer))
          )
        ) : null
      );
    }

    // ─── Active phase (pretest, mediation, or posttest) ───
    function renderActivePhase() {
      var s = state.activeSession;
      var phase = s.currentPhase;
      var idx = s.currentItemIdx;
      var itemId = s.sessionItemIds[idx];
      var rawItem = ITEMS_BY_ID[itemId];
      if (!rawItem) {
        // Shouldn't happen; safety guard
        return h("div", { className: "da-root", style: { padding: 20 } },
          h("p", null, "Item not found. Discard session?"),
          h("button", { onClick: discardSession }, "Discard"));
      }

      // ── Phase E — Transfer-phase item swap ──
      // In transfer phase, present the transferTwin's prompt/answer (same
      // construct, different surface features). Wrap into the item shape
      // so matchAnswer + scoring don't need any branching. Skip items
      // without a twin (rare — only happens if a mixed bank has some
      // items with twins and some without).
      var item = rawItem;
      if (phase === "transfer") {
        if (!rawItem.transferTwin || !rawItem.transferTwin.prompt) {
          // Skip this item — auto-advance with a zero-credit placeholder
          // so the phase stays in sync with the same total item count.
          // We render a brief "no twin available" notice and let the
          // examiner click "Skip" to move on.
          item = {
            id: itemId, prompt: "(No transfer twin defined for this item — skip)",
            correctAnswer: "—", acceptableAnswers: [],
            promptLadder: rawItem.promptLadder, construct: rawItem.construct,
            difficulty: rawItem.difficulty, gradeBand: rawItem.gradeBand,
            _noTwin: true
          };
        } else {
          var tw = rawItem.transferTwin;
          item = {
            id: itemId, // Keep original id for result-keying
            prompt: tw.prompt,
            correctAnswer: tw.correctAnswer,
            acceptableAnswers: Array.isArray(tw.acceptableAnswers) ? tw.acceptableAnswers : [],
            promptLadder: rawItem.promptLadder, // Unused in this phase (no scaffolds)
            construct: rawItem.construct + " (transfer)",
            difficulty: rawItem.difficulty,
            gradeBand: rawItem.gradeBand,
            _isTransfer: true
          };
        }
      }

      var phaseInfo = {
        pretest:  { label: "Pretest",  color: "var(--da-ink-3)", hint: "No scaffolds. Record what the student does alone." },
        mediation:{ label: "Mediation", color: "var(--da-accent-2)", hint: "Same items — use the scaffold ladder. Record what support produced success." },
        posttest: { label: "Posttest", color: "var(--da-green-text)", hint: "Re-test alone. Compare to pretest." },
        transfer: { label: "Transfer probe", color: "var(--da-amber-text)", hint: "Novel items, same construct. Tests whether learning generalized (not just memorized)." }
      }[phase] || { label: phase, color: "var(--da-muted)", hint: "" };

      var totalInPhase = s.sessionItemIds.length;
      var pct = Math.round(((idx) / totalInPhase) * 100);
      var canScaffold = phase === "mediation";

      // Session-arc stepper: which phases this session will run, in order.
      // Transfer appears only when at least one item ships a transferTwin
      // (same condition submitResponse uses to route posttest → transfer).
      var hasAnyTwinStep = s.sessionItemIds.some(function (iid) {
        var it2 = ITEMS_BY_ID[iid];
        return it2 && it2.transferTwin && it2.transferTwin.prompt;
      });
      var stepperPhases = [
        { id: "pretest", label: "Pretest" },
        { id: "mediation", label: "Mediation" },
        { id: "posttest", label: "Posttest" }
      ].concat(hasAnyTwinStep ? [{ id: "transfer", label: "Transfer" }] : [])
       .concat([{ id: "summary", label: "Results" }]);
      var currentStepIdx = 0;
      stepperPhases.forEach(function (sp, spi) { if (sp.id === phase) currentStepIdx = spi; });

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" } },
          // Phase U — Pause (preserves session) is the safer primary; Discard becomes secondary
          h("button", {
            onClick: pauseSession,
            "aria-label": "Pause this session — return to start screen, session preserved",
            title: "Pause without losing progress. Resume from the start screen.",
            style: { background: "var(--da-amber-tint-2)", border: "1px solid var(--da-amber-mid)", color: "var(--da-amber-text-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }
          }, "⏸ Pause"),
          h("button", {
            onClick: function () {
              daAskConfirm({
                message: "Discard this session? Progress will be lost.",
                confirmLabel: "Discard session",
                onConfirm: discardSession
              });
            },
            "aria-label": "Discard session — all in-progress data lost",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }
          }, "✕ Discard"),
          // Undo — re-present the last recorded item (mis-click insurance)
          s.itemResults.length > 0 ? h("button", {
            onClick: undoLastResult,
            "aria-label": "Undo the last recorded item and re-present it",
            title: "Re-presents the most recently recorded item with its response and observations restored.",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", color: "var(--da-ink-3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }
          }, "↩ Undo item") : null,
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: phaseInfo.color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 } },
              phaseInfo.label + " phase · item " + (idx + 1) + " of " + totalInPhase),
            h("div", { style: { fontSize: 12, color: "var(--da-muted)", fontStyle: "italic", marginTop: 2 } }, phaseInfo.hint)
          ),
          s.studentNickname ? h("div", { style: { fontSize: 11, color: "var(--da-muted)" } },
            "Student: " + s.studentNickname) : null
        ),
        // Session-arc stepper — orients the examiner in the test-teach-retest
        // arc (pretest → mediation → posttest [→ transfer] → results).
        h("ol", {
          "aria-label": "Session phases",
          style: { display: "flex", alignItems: "center", gap: 4, listStyle: "none", margin: "0 0 8px", padding: 0, flexWrap: "wrap" }
        },
          stepperPhases.map(function (sp, spi) {
            var stepState = spi < currentStepIdx ? "done" : spi === currentStepIdx ? "current" : "todo";
            return h("li", {
              key: "da-step-arc-" + sp.id,
              "aria-current": stepState === "current" ? "step" : undefined,
              style: { display: "flex", alignItems: "center", gap: 4 }
            },
              h("span", {
                style: {
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  border: stepState === "current" ? "2px solid " + phaseInfo.color : "1px solid var(--da-border-2)",
                  background: stepState === "current" ? "var(--da-surface)" : stepState === "done" ? "var(--da-surface-3)" : "transparent",
                  color: stepState === "current" ? phaseInfo.color : stepState === "done" ? "var(--da-ink-3)" : "var(--da-muted)"
                }
              },
                stepState === "done" ? h("span", { "aria-hidden": "true" }, "✓") : null,
                sp.label,
                h("span", { style: { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 } },
                  stepState === "done" ? " (completed)" : stepState === "current" ? " (current phase)" : " (upcoming)")
              ),
              spi < stepperPhases.length - 1 ? h("span", { "aria-hidden": "true", style: { color: "var(--da-border-2)", fontSize: 11 } }, "→") : null
            );
          })
        ),
        // Progress bar (items within the current phase)
        h("div", {
          role: "progressbar",
          "aria-valuemin": 0, "aria-valuemax": totalInPhase, "aria-valuenow": idx,
          "aria-label": phaseInfo.label + " phase progress: item " + (idx + 1) + " of " + totalInPhase,
          style: { height: 4, background: "var(--da-border)", borderRadius: 2, overflow: "hidden", marginBottom: 14 }
        },
          h("div", { style: { width: pct + "%", height: "100%", background: phaseInfo.color, transition: "width 0.3s ease" } })
        ),

        // Phase U — Session-level note drawer (collapsed by default, available
        // throughout the session for overarching observations separate from
        // per-item examinerObservation)
        h("details", { className: "da-card", style: { marginBottom: 14, padding: 10 } },
          h("summary", { style: { cursor: "pointer", fontSize: 11, fontWeight: 800, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" } },
            "📝 Session-level notes" + (s.sessionNote && s.sessionNote.length > 0 ? " · " + s.sessionNote.length + " chars" : "")
          ),
          h("textarea", {
            value: s.sessionNote || "",
            onChange: function (e) { updateSessionNote(e.target.value); },
            rows: 3, maxLength: 4000,
            placeholder: "Overarching observations across the whole session — affect, fatigue, anything that doesn't belong to a single item…",
            "aria-label": "Session-level notes",
            style: { width: "100%", marginTop: 6, padding: "6px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }
          })
        ),

        // ─── ITEM CARD ───
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } },
              item.construct + " · " + item.difficulty + " · grades " + item.gradeBand),
            // Read-aloud: lets the student HEAR the item instead of reading it
            // (accessibility + the modality access lever).
            daTtsAvailable() ? h("button", {
              type: "button",
              onClick: function () { daSpeak(item.prompt); },
              title: "Read this item aloud (Gemini voice)",
              "aria-label": "Read this item aloud",
              style: { flexShrink: 0, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--da-indigo-border)", background: "var(--da-indigo-tint)", color: "var(--da-indigo-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
            }, "🔊 Read aloud") : null
          ),
          h("p", { style: { margin: 0, fontSize: 16, color: "var(--da-ink)", lineHeight: 1.65 } }, item.prompt),
          // Access contrast (linguistic load): on-demand simpler-language version.
          h("div", { style: { marginTop: 8 } },
            !simplifiedTextDraft ? h("button", {
              type: "button",
              disabled: simplifiedBusy,
              onClick: function () { generateSimplifiedItem(item.prompt); },
              title: "Generate a simpler-language version of this item (same problem, easier words) to test whether language load is the barrier",
              "aria-label": "Show a simpler-language version of this item",
              style: { padding: "3px 10px", borderRadius: 6, border: "1px solid var(--da-violet-border)", background: simplifiedBusy ? "var(--da-violet-tint-2)" : "var(--da-violet-tint)", color: "var(--da-violet-text)", fontSize: 11, fontWeight: 700, cursor: simplifiedBusy ? "wait" : "pointer", fontFamily: "inherit" }
            }, simplifiedBusy ? "✍️ Simplifying…" : "✍️ Show simpler-language version") : null,
            simplifiedTextDraft ? h("div", { style: { marginTop: 6, padding: "8px 10px", borderRadius: 8, background: "var(--da-violet-tint)", border: "1px dashed var(--da-violet-border)" } },
              h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 } },
                h("span", { style: { fontSize: 10, fontWeight: 800, color: "var(--da-violet-text)", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Simpler-language version (same problem)"),
                daTtsAvailable() ? h("button", {
                  type: "button", onClick: function () { daSpeak(simplifiedTextDraft); },
                  title: "Read the simpler version aloud", "aria-label": "Read the simpler version aloud",
                  style: { padding: "1px 7px", borderRadius: 6, border: "1px solid var(--da-violet-border)", background: "var(--da-surface)", color: "var(--da-violet-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "🔊") : null
              ),
              h("p", { style: { margin: 0, fontSize: 14, color: "var(--da-ink)", lineHeight: 1.6 } }, simplifiedTextDraft),
              h("div", { style: { marginTop: 4, fontSize: 10, color: "var(--da-violet-text)", fontStyle: "italic" } },
                "Check the language is simpler but the problem is unchanged before using.")
            ) : null
          ),
          // Access contrast (home language / L1): translate the SAME item into the
          // student's home language. Needs a home language entered (session-stable).
          h("div", { style: { marginTop: 8 } },
            h("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
              h("input", {
                type: "text", value: homeLangDraft,
                onChange: function (e) { setHomeLangDraft(e.target.value); },
                placeholder: "Home language (e.g., Somali)",
                "aria-label": "Student's home language for the translation contrast",
                style: { padding: "3px 8px", borderRadius: 6, border: "1px solid var(--da-border-2)", fontFamily: "inherit", fontSize: 11, width: 170, boxSizing: "border-box" }
              }),
              !l1TextDraft ? h("button", {
                type: "button",
                disabled: l1Busy || !homeLangDraft.trim(),
                onClick: function () { generateL1Item(item.prompt, homeLangDraft.trim()); },
                title: homeLangDraft.trim() ? ("Translate this item into " + homeLangDraft.trim() + " (same problem) to test whether the language of testing is the barrier") : "Enter the student's home language first",
                "aria-label": "Show this item in the student's home language",
                style: { padding: "3px 10px", borderRadius: 6, border: "1px solid var(--da-violet-border)", background: (l1Busy || !homeLangDraft.trim()) ? "var(--da-violet-tint-2)" : "var(--da-violet-tint)", color: "var(--da-violet-text)", fontSize: 11, fontWeight: 700, cursor: (l1Busy || !homeLangDraft.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }
              }, l1Busy ? "🌐 Translating…" : ("🌐 Show in " + (homeLangDraft.trim() || "home language"))) : null
            ),
            l1TextDraft ? h("div", { style: { marginTop: 6, padding: "8px 10px", borderRadius: 8, background: "var(--da-violet-tint)", border: "1px dashed var(--da-violet-border)" } },
              h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 } },
                h("span", { style: { fontSize: 10, fontWeight: 800, color: "var(--da-violet-text)", textTransform: "uppercase", letterSpacing: "0.06em" } }, (homeLangDraft.trim() || "Home-language") + " version (same problem)"),
                daTtsAvailable() ? h("button", {
                  type: "button", onClick: function () { daSpeak(l1TextDraft, homeLangDraft.trim()); },
                  title: "Read the home-language version aloud", "aria-label": "Read the home-language version aloud",
                  style: { padding: "1px 7px", borderRadius: 6, border: "1px solid var(--da-violet-border)", background: "var(--da-surface)", color: "var(--da-violet-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "🔊") : null
              ),
              h("p", { dir: "auto", style: { margin: 0, fontSize: 14, color: "var(--da-ink)", lineHeight: 1.6 } }, l1TextDraft),
              h("div", { style: { marginTop: 4, fontSize: 10, color: "var(--da-violet-text)", fontStyle: "italic" } },
                "⚠ AI translation — verify equivalence with a proficient speaker before relying on it. The problem must be unchanged.")
            ) : null
          )
        ),

        // ─── SCAFFOLD LADDER (only in mediation phase) ───
        canScaffold ? h("div", { className: "da-card", style: { marginBottom: 14, background: "var(--da-amber-tint)", borderColor: "var(--da-amber-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 6 } },
            "Scaffold ladder · current level " + s.currentLadderLevel),
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", fontStyle: "italic", marginBottom: 6 } },
            "Click a level to reveal it to yourself. You decide when to deliver each scaffold to the student. The level you record below should match the highest level needed."),
          // Mediation-quality reminders (Feuerstein's MLE criteria + wait time).
          // Collapsed by default so experienced examiners aren't slowed down.
          h("details", { style: { marginBottom: 10 } },
            h("summary", { style: { cursor: "pointer", fontSize: 10.5, fontWeight: 800, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.05em" } },
              "🧭 Mediation quality reminders (MLE)"),
            h("ul", { style: { margin: "6px 0 0", paddingLeft: 18, fontSize: 11.5, color: "var(--da-ink-2)", lineHeight: 1.6 } },
              h("li", null, h("strong", null, "Wait time first."), " Give 5–10 seconds after each scaffold before escalating — many \"failed\" scaffolds are interrupted processing, and premature escalation inflates the support the score records."),
              h("li", null, h("strong", null, "Intentionality & reciprocity."), " Tell the student what you're working on together and why; check they're engaged with you, not just enduring the task."),
              h("li", null, h("strong", null, "Meaning."), " Say why this problem type matters in the student's world (\"knowing totals vs. leftovers helps you check your change at a store\")."),
              h("li", null, h("strong", null, "Transcendence."), " After a success, bridge beyond the item (\"where else could you use that move?\") — gains that bridge are the ones most likely to show up on the transfer probe.")
            ),
            h("p", { style: { margin: "6px 0 0", fontSize: 10.5, color: "var(--da-amber-text)", fontStyle: "italic", lineHeight: 1.5 } },
              "Drawn from Feuerstein's Mediated Learning Experience criteria and graduated-prompt practice (Lidz, 2003). These support mediation quality; they are reminders, not a scored fidelity measure.")
          ),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
            item.promptLadder.map(function (step) {
              var isActive = s.currentLadderLevel === step.level;
              var hasBeenUsed = s.currentLadderLevel >= step.level;
              var stepLabel = { cue: "Declarative cue", leading: "Leading question", model: "Modeling", directTeach: "Direct teach" }[step.type] || step.type;
              return h("div", {
                key: "da-step-" + step.level,
                className: "da-ladder-step" + (isActive ? " active" : "") + (hasBeenUsed && !isActive ? " used" : "")
              },
                h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                  h("span", { style: { fontSize: 12, fontWeight: 800, color: "var(--da-ink)", minWidth: 30 } }, "L" + step.level),
                  h("span", { style: { flex: 1, fontSize: 12, fontWeight: 700, color: "var(--da-ink)" } }, stepLabel),
                  h("button", {
                    onClick: function () { setLadderLevel(step.level); },
                    "aria-label": "Reveal level " + step.level + " scaffold",
                    style: {
                      padding: "4px 10px", borderRadius: 6, border: "1px solid " + (hasBeenUsed ? "var(--da-amber-border)" : "var(--da-border-2)"),
                      background: hasBeenUsed ? "var(--da-amber-tint-2)" : "var(--da-surface)", color: "var(--da-ink)",
                      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                    }
                  }, hasBeenUsed ? "Re-show" : "Show")
                ),
                hasBeenUsed ? h("div", { style: { display: "flex", alignItems: "flex-start", gap: 6, margin: "6px 0 0", paddingLeft: 38 } },
                  h("p", { style: { margin: 0, flex: 1, fontSize: 12, color: "var(--da-ink-2)", lineHeight: 1.55 } }, '"' + step.text + '"'),
                  daTtsAvailable() ? h("button", {
                    type: "button",
                    onClick: function () { daSpeak(step.text); },
                    title: "Read this scaffold aloud to the student",
                    "aria-label": "Read this scaffold aloud",
                    style: { flexShrink: 0, padding: "1px 7px", borderRadius: 6, border: "1px solid var(--da-amber-border)", background: "var(--da-surface)", color: "var(--da-amber-text-2)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                  }, "🔊") : null
                ) : null
              );
            })
          )
        ) : null,

        // ─── STUDENT RESPONSE INPUT ───
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-response",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 }
          }, "Student response"),
          h("textarea", {
            id: "da-response", rows: 2, value: responseDraft,
            ref: responseRef,
            onChange: function (e) { setResponseDraft(e.target.value); },
            placeholder: "Type or paraphrase what the student said…",
            "aria-label": "Student response — type what the student said",
            style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          })
        ),

        // ─── EXAMINER OBSERVATION ───
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-observation",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 }
          }, "Examiner observation (local only — not synced)"),
          h("textarea", {
            id: "da-observation", rows: 2, value: observationDraft,
            onChange: function (e) { setObservationDraft(e.target.value); },
            placeholder: "Strategy used, hesitation, affect, anything notable…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          }),
          // Phase I — quick-tap observation tags (optional; aggregate across items)
          h("div", { style: { marginTop: 8 } },
            h("div", { style: { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-ink-3)", marginBottom: 4 } },
              "Quick tags (optional · aggregate across the session)"),
            h("div", { role: "group", "aria-label": "Observation tags", style: { display: "flex", flexWrap: "wrap", gap: 6 } },
              OBSERVATION_TAGS.map(function (tag) {
                var active = observationTagsDraft.indexOf(tag.id) >= 0;
                return h("button", {
                  key: "da-tag-" + tag.id,
                  type: "button",
                  onClick: function () { toggleObservationTag(tag.id); },
                  "aria-pressed": active,
                  title: tag.hint,
                  style: {
                    padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    border: active ? "1px solid var(--da-accent)" : "1px solid var(--da-border-2)",
                    background: active ? "var(--da-accent)" : "var(--da-surface)",
                    color: active ? "var(--da-on-accent)" : "var(--da-ink-3)",
                    cursor: "pointer", fontFamily: "inherit"
                  }
                }, tag.label);
              })
            )
          )
        ),

        // ─── A4: leaky-rung flag ───
        // Only meaningful once a scaffold rung has been revealed (L1+). Lets the
        // clinician mark that the shown rung gave away the answer; submitResponse
        // then credits one level higher (the rung isn't valid evidence of
        // competence at that level). Keeps the Modifiability/mediation read honest.
        (canScaffold && (s.currentLadderLevel >= 1) ? h("div", {
          role: "checkbox", tabIndex: 0,
          "aria-checked": scaffoldLeakedDraft ? "true" : "false",
          "aria-label": "Flag that the current scaffold gave away the answer",
          onClick: function () { setScaffoldLeakedDraft(!scaffoldLeakedDraft); },
          onKeyDown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setScaffoldLeakedDraft(!scaffoldLeakedDraft); } },
          style: {
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "6px 10px",
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            border: "1px solid " + (scaffoldLeakedDraft ? "var(--da-amber-mid-2)" : "var(--da-border)"),
            background: scaffoldLeakedDraft ? "var(--da-amber-tint)" : "var(--da-surface-2)"
          }
        },
          h("span", { "aria-hidden": "true", style: { fontSize: 14, lineHeight: 1.3 } }, scaffoldLeakedDraft ? "☑" : "☐"),
          h("span", { style: { fontSize: 11.5, color: scaffoldLeakedDraft ? "var(--da-amber-text-2)" : "var(--da-ink-3)", lineHeight: 1.45 } },
            h("strong", null, "⚠ This scaffold gave away the answer"),
            " — if checked, a correct response is credited one level higher (this rung isn't valid evidence of competence here).")
        ) : null),

        // ─── Tier-2 access contrast (modality): read-aloud flip flag ───
        // A contemporaneous controlled contrast — same item, reading demand removed.
        // Use the 🔊 button above to read the item to the student; if they get it
        // only when they HEAR it (not when reading it themselves), check this. It
        // feeds the access-condition lens as direct evidence that reading/decoding
        // access — not the construct — gated this item. Shown whenever TTS is available.
        (daTtsAvailable() ? h("div", {
          role: "checkbox", tabIndex: 0,
          "aria-checked": accessReadAloudDraft ? "true" : "false",
          "aria-label": "Flag that the student succeeded only when the item was read aloud",
          onClick: function () { setAccessReadAloudDraft(!accessReadAloudDraft); },
          onKeyDown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAccessReadAloudDraft(!accessReadAloudDraft); } },
          style: {
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "6px 10px",
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            border: "1px solid " + (accessReadAloudDraft ? "var(--da-violet-mid)" : "var(--da-border)"),
            background: accessReadAloudDraft ? "var(--da-violet-tint)" : "var(--da-surface-2)"
          }
        },
          h("span", { "aria-hidden": "true", style: { fontSize: 14, lineHeight: 1.3 } }, accessReadAloudDraft ? "☑" : "☐"),
          h("span", { style: { fontSize: 11.5, color: accessReadAloudDraft ? "var(--da-violet-text)" : "var(--da-ink-3)", lineHeight: 1.45 } },
            h("strong", null, "🔊 Succeeded only when read aloud"),
            " — check if the student got this right when they HEARD it but not when reading it themselves. (Access-contrast evidence; does not change the score.)")
        ) : null),

        // ─── Tier-2 access contrast (linguistic load): simplified-language flip flag ───
        // Only meaningful once a simpler-language version has been generated/shown.
        (simplifiedTextDraft ? h("div", {
          role: "checkbox", tabIndex: 0,
          "aria-checked": accessSimplifiedDraft ? "true" : "false",
          "aria-label": "Flag that the student succeeded only with the simpler-language version",
          onClick: function () { setAccessSimplifiedDraft(!accessSimplifiedDraft); },
          onKeyDown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAccessSimplifiedDraft(!accessSimplifiedDraft); } },
          style: {
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "6px 10px",
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            border: "1px solid " + (accessSimplifiedDraft ? "var(--da-violet-mid)" : "var(--da-border)"),
            background: accessSimplifiedDraft ? "var(--da-violet-tint)" : "var(--da-surface-2)"
          }
        },
          h("span", { "aria-hidden": "true", style: { fontSize: 14, lineHeight: 1.3 } }, accessSimplifiedDraft ? "☑" : "☐"),
          h("span", { style: { fontSize: 11.5, color: accessSimplifiedDraft ? "var(--da-violet-text)" : "var(--da-ink-3)", lineHeight: 1.45 } },
            h("strong", null, "✍️ Succeeded only with simpler language"),
            " — check if the student got this right with the simpler-language version but not at full language complexity. (Access-contrast evidence; does not change the score.)")
        ) : null),

        // ─── Tier-2 access contrast (home language / L1): flip flag ───
        // Only meaningful once a home-language version has been generated/shown.
        (l1TextDraft ? h("div", {
          role: "checkbox", tabIndex: 0,
          "aria-checked": accessL1Draft ? "true" : "false",
          "aria-label": "Flag that the student succeeded only in their home language",
          onClick: function () { setAccessL1Draft(!accessL1Draft); },
          onKeyDown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAccessL1Draft(!accessL1Draft); } },
          style: {
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "6px 10px",
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            border: "1px solid " + (accessL1Draft ? "var(--da-violet-mid)" : "var(--da-border)"),
            background: accessL1Draft ? "var(--da-violet-tint)" : "var(--da-surface-2)"
          }
        },
          h("span", { "aria-hidden": "true", style: { fontSize: 14, lineHeight: 1.3 } }, accessL1Draft ? "☑" : "☐"),
          h("span", { style: { fontSize: 11.5, color: accessL1Draft ? "var(--da-violet-text)" : "var(--da-ink-3)", lineHeight: 1.45 } },
            h("strong", null, "🌐 Succeeded only in home language"),
            " — check if the student got this right with the home-language version but not in the language of testing. (Access-contrast evidence; does not change the score.)")
        ) : null),

        // ─── SCORING ROW ───
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" } },
          h("div", { style: { fontSize: 12, color: "var(--da-ink-3)" } },
            canScaffold
              ? "Auto-detect or override below. Auto-check matches student response against canonical answer."
              : "Auto-check matches student response against the canonical answer.",
            h("span", { style: { display: "block", marginTop: 2, fontSize: 10.5, color: "var(--da-ink-3)", fontStyle: "italic" } },
              "Tip: Cmd/Ctrl + Enter activates the primary button. Esc on pre-session screens goes back.")
          ),
          h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            // Auto-check button (primary — activated by Cmd/Ctrl+Enter)
            h("button", {
              onClick: function () {
                var correct = matchAnswer(item, responseDraft);
                var level = canScaffold ? (s.currentLadderLevel || 0) : 0;
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft,
                  levelReached: level,
                  finalCorrect: correct,
                  examinerObservation: observationDraft,
                  observationTags: observationTagsDraft,
                  scaffoldLeaked: scaffoldLeakedDraft,
                  accessReadAloudHelped: accessReadAloudDraft,
                  accessSimplifiedHelped: accessSimplifiedDraft,
                  accessL1Helped: accessL1Draft,
                  supportType: canScaffold ? (item.promptLadder[level - 1] ? item.promptLadder[level - 1].type : "none") : "none"
                });
              },
              "data-da-primary": "true",
              "aria-label": "Auto-check the student's response and advance",
              title: "Cmd/Ctrl + Enter to activate",
              style: { padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--da-accent)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "✓ Auto-check + record"),
            // Manual override
            h("button", {
              onClick: function () {
                var level = canScaffold ? (s.currentLadderLevel || 0) : 0;
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft,
                  levelReached: level,
                  finalCorrect: true,
                  examinerObservation: observationDraft,
                  observationTags: observationTagsDraft,
                  scaffoldLeaked: scaffoldLeakedDraft,
                  accessReadAloudHelped: accessReadAloudDraft,
                  accessSimplifiedHelped: accessSimplifiedDraft,
                  accessL1Helped: accessL1Draft,
                  supportType: canScaffold ? (item.promptLadder[level - 1] ? item.promptLadder[level - 1].type : "none") : "none"
                });
              },
              style: { padding: "8px 16px", borderRadius: 10, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark correct"),
            h("button", {
              onClick: function () {
                var level = canScaffold ? 4 : 0; // Wrong even after direct teach = level 4 with no credit
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft,
                  levelReached: level,
                  finalCorrect: false,
                  examinerObservation: observationDraft,
                  observationTags: observationTagsDraft,
                  supportType: canScaffold ? "directTeach" : "none"
                });
              },
              style: { padding: "8px 16px", borderRadius: 10, border: "1px solid var(--da-red-mid)", background: "var(--da-red-tint)", color: "var(--da-red-text)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark wrong"),
            // Skip — record as wrong, level 0
            h("button", {
              onClick: function () {
                submitResponse({
                  phase: phase, itemId: itemId,
                  response: responseDraft || "(skipped)",
                  levelReached: 0, finalCorrect: false,
                  examinerObservation: observationDraft,
                  observationTags: observationTagsDraft,
                  supportType: "skipped"
                });
              },
              style: { padding: "8px 12px", borderRadius: 10, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
            }, "Skip")
          )
        ),
        // Canonical answer reveal (collapsed by default)
        h("details", { style: { marginTop: 10 } },
          h("summary", { style: { fontSize: 11, color: "var(--da-muted)", cursor: "pointer", fontStyle: "italic" } },
            "Reveal canonical answer (examiner only)"),
          h("div", { style: { marginTop: 6, padding: 8, background: "var(--da-surface-3)", borderRadius: 6, fontSize: 13, color: "var(--da-ink)", fontFamily: "ui-monospace, monospace" } },
            item.correctAnswer)
        )
      );
    }

    // ─── Phase B — AI-mediated mediation phase ───
    // Multi-attempt loop: student types response → Gemini evaluates +
    // decides next scaffold → scaffold text shown → student retries →
    // loop until correct or directTeach delivered. Attempts log scrolls
    // below; final per-item score = 5 - finalLevel.
    function renderActivePhaseAI() {
      var s = state.activeSession;
      var idx = s.currentItemIdx;
      var itemId = s.sessionItemIds[idx];
      var item = ITEMS_BY_ID[itemId];
      if (!item) {
        return h("div", { className: "da-root", style: { padding: 20 } },
          h("p", null, "Item not found. Discard session?"),
          h("button", { onClick: discardSession }, "Discard"));
      }
      var totalInPhase = s.sessionItemIds.length;
      var pct = Math.round(((idx) / totalInPhase) * 100);
      var scaffoldsDelivered = aiAttempts
        .map(function (a) { return a.levelAfter; })
        .filter(function (l) { return typeof l === "number" && l > 0; });
      var deliveredUniq = {};
      scaffoldsDelivered.forEach(function (l) { deliveredUniq[l] = true; });
      var currentLevel = scaffoldsDelivered.length === 0 ? 0 : Math.max.apply(null, scaffoldsDelivered);
      var alreadyHadL4 = !!deliveredUniq[4];
      // Most recent scaffold text to display prominently
      var lastScaffoldText = "";
      for (var ai = aiAttempts.length - 1; ai >= 0; ai--) {
        if (aiAttempts[ai].scaffoldShown) { lastScaffoldText = aiAttempts[ai].scaffoldShown; break; }
      }

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" } },
          // Phase U — Pause first (preserves session); Discard secondary
          h("button", {
            onClick: pauseSession,
            "aria-label": "Pause this session — return to start screen, session preserved",
            title: "Pause without losing progress. Resume from the start screen.",
            style: { background: "var(--da-amber-tint-2)", border: "1px solid var(--da-amber-mid)", color: "var(--da-amber-text-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }
          }, "⏸ Pause"),
          h("button", {
            onClick: function () {
              daAskConfirm({
                message: "Discard this session? Progress will be lost.",
                confirmLabel: "Discard session",
                onConfirm: discardSession
              });
            },
            "aria-label": "Discard session",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }
          }, "✕ Discard"),
          // Undo — re-present the last recorded item (AI attempts restart)
          s.itemResults.length > 0 ? h("button", {
            onClick: undoLastResult,
            "aria-label": "Undo the last recorded item and re-present it",
            title: "Re-presents the most recently recorded item with its response restored. AI mediation attempts restart for that item.",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", color: "var(--da-ink-3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }
          }, "↩ Undo item") : null,
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: "var(--da-accent-2)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 } },
              "🤖 AI mediation · item " + (idx + 1) + " of " + totalInPhase),
            h("div", { style: { fontSize: 12, color: "var(--da-muted)", fontStyle: "italic", marginTop: 2 } },
              "Gemini evaluates each response and chooses the next scaffold. Examiner records observations alongside.")
          ),
          s.studentNickname ? h("div", { style: { fontSize: 11, color: "var(--da-muted)" } },
            "Student: " + s.studentNickname) : null
        ),
        // Progress bar
        h("div", {
          role: "progressbar",
          "aria-valuemin": 0, "aria-valuemax": totalInPhase, "aria-valuenow": idx,
          "aria-label": "AI mediation progress: item " + (idx + 1) + " of " + totalInPhase,
          style: { height: 4, background: "var(--da-border)", borderRadius: 2, overflow: "hidden", marginBottom: 14 }
        },
          h("div", { style: { width: pct + "%", height: "100%", background: "var(--da-accent-2)", transition: "width 0.3s ease" } })
        ),
        // Phase U — Session-level note drawer
        h("details", { className: "da-card", style: { marginBottom: 14, padding: 10 } },
          h("summary", { style: { cursor: "pointer", fontSize: 11, fontWeight: 800, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" } },
            "📝 Session-level notes" + (s.sessionNote && s.sessionNote.length > 0 ? " · " + s.sessionNote.length + " chars" : "")
          ),
          h("textarea", {
            value: s.sessionNote || "",
            onChange: function (e) { updateSessionNote(e.target.value); },
            rows: 3, maxLength: 4000,
            placeholder: "Overarching observations across the whole session — affect, fatigue, anything that doesn't belong to a single item…",
            "aria-label": "Session-level notes",
            style: { width: "100%", marginTop: 6, padding: "6px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }
          })
        ),
        // Item card
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 } },
            item.construct + " · " + item.difficulty + " · grades " + item.gradeBand),
          h("p", { style: { margin: 0, fontSize: 16, color: "var(--da-ink)", lineHeight: 1.65 } },
            renderTextWithResourceLinks(item.prompt, "live-prompt"))
        ),
        // Latest scaffold (if any). Phase Z: pipe through resource-link rewriter
        // so any [title](resource:id) tokens embedded in the rung text by the
        // supplementary-resource orchestrator render as clickable chips.
        lastScaffoldText ? h("div", { className: "da-card da-fade-in", style: { marginBottom: 14, background: "var(--da-amber-tint)", borderColor: "var(--da-amber-border)" } },
          h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800, marginBottom: 4 } },
            "AI scaffold delivered · L" + currentLevel),
          h("p", { style: { margin: 0, fontSize: 14, color: "var(--da-amber-text-2)", lineHeight: 1.6, fontStyle: "italic" } },
            "“", renderTextWithResourceLinks(lastScaffoldText, "live-scaffold"), "”")
        ) : null,
        // Error banner (when fallback kicked in) — with retry
        aiError ? h("div", {
          style: { marginBottom: 14, padding: "8px 12px", background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, fontSize: 12, color: "var(--da-red-text)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }
        },
          h("span", { style: { flex: 1, minWidth: 200 } }, aiError),
          h("button", {
            onClick: function () {
              setAiError(null);
              if (responseDraft.trim() && !aiBusy) runAiMediate(item, responseDraft);
            },
            "aria-label": "Retry the AI mediation call",
            style: { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--da-red-text)", background: "var(--da-surface)", color: "var(--da-red-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "↻ Retry"),
          h("button", {
            onClick: function () { setAiError(null); },
            "aria-label": "Dismiss this error",
            style: { padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: "var(--da-red-deep)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
          }, "✕")
        ) : null,
        // Response input
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-ai-response",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 }
          }, aiAttempts.length === 0 ? "Student response (first attempt)" : "Student response (retry after L" + currentLevel + " scaffold)"),
          h("textarea", {
            id: "da-ai-response", rows: 2, value: responseDraft, disabled: aiBusy,
            ref: responseRef,
            onChange: function (e) { setResponseDraft(e.target.value); },
            placeholder: "Type or paraphrase what the student said…",
            "aria-label": "Student response for AI-mediated attempt",
            style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical", opacity: aiBusy ? 0.6 : 1 }
          })
        ),
        // Examiner observation
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("label", {
            htmlFor: "da-ai-obs",
            style: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-muted)", marginBottom: 4 }
          }, "Examiner observation (local only — appended to AI notes)"),
          h("textarea", {
            id: "da-ai-obs", rows: 2, value: observationDraft,
            onChange: function (e) { setObservationDraft(e.target.value); },
            placeholder: "Strategy, hesitation, affect, anything notable…",
            style: { width: "100%", padding: "8px 10px", border: "1px solid var(--da-border-2)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", resize: "vertical" }
          }),
          // Phase I — quick-tap observation tags (shared with clinician-led path)
          h("div", { style: { marginTop: 8 } },
            h("div", { style: { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--da-ink-3)", marginBottom: 4 } },
              "Quick tags (optional)"),
            h("div", { role: "group", "aria-label": "Observation tags", style: { display: "flex", flexWrap: "wrap", gap: 6 } },
              OBSERVATION_TAGS.map(function (tag) {
                var active = observationTagsDraft.indexOf(tag.id) >= 0;
                return h("button", {
                  key: "da-ai-tag-" + tag.id,
                  type: "button",
                  onClick: function () { toggleObservationTag(tag.id); },
                  "aria-pressed": active,
                  title: tag.hint,
                  style: {
                    padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    border: active ? "1px solid var(--da-accent)" : "1px solid var(--da-border-2)",
                    background: active ? "var(--da-accent)" : "var(--da-surface)",
                    color: active ? "var(--da-on-accent)" : "var(--da-ink-3)",
                    cursor: "pointer", fontFamily: "inherit"
                  }
                }, tag.label);
              })
            )
          )
        ),
        // Action row
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" } },
          h("div", { role: "status", "aria-busy": aiBusy ? "true" : "false", style: { fontSize: 12, color: "var(--da-ink-3)" } },
            aiBusy ? "🤖 AI is evaluating…" :
            alreadyHadL4 ? "Direct teach already delivered. Mark as wrong to advance." :
            "Submit response → AI evaluates → next scaffold appears (if needed)."),
          h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            h("button", {
              onClick: function () {
                if (aiBusy) return;
                if (!responseDraft.trim()) return;
                runAiMediate(item, responseDraft);
              },
              disabled: aiBusy || !responseDraft.trim(),
              "data-da-primary": "true",
              "aria-label": "Submit student response to AI mediator",
              title: "Cmd/Ctrl + Enter to activate",
              style: {
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: (aiBusy || !responseDraft.trim()) ? "var(--da-faint)" : "var(--da-accent)",
                color: "var(--da-on-accent)", fontWeight: 800, fontSize: 13,
                cursor: (aiBusy || !responseDraft.trim()) ? "not-allowed" : "pointer",
                fontFamily: "inherit"
              }
            }, aiBusy ? "…" : "Submit to AI mediator"),
            // Manual override — examiner can force-correct or force-wrong
            // without consuming another AI call.
            h("button", {
              onClick: function () {
                if (aiBusy) return;
                finalizeAiItem(item, aiAttempts.concat([{
                  response: responseDraft || "(examiner override: correct)",
                  verdict: "correct",
                  levelAfter: currentLevel,
                  scaffoldShown: "",
                  observationHint: "Examiner marked correct."
                }]), true);
              },
              disabled: aiBusy,
              style: { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark correct"),
            h("button", {
              onClick: function () {
                if (aiBusy) return;
                finalizeAiItem(item, aiAttempts.concat([{
                  response: responseDraft || "(examiner override: wrong)",
                  verdict: "incorrect",
                  levelAfter: 4,
                  scaffoldShown: "",
                  observationHint: "Examiner marked wrong without further mediation."
                }]), false);
              },
              disabled: aiBusy,
              style: { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--da-red-mid)", background: "var(--da-red-tint)", color: "var(--da-red-text)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
            }, "Mark wrong")
          )
        ),
        // Attempts log (this item's mediation cycle)
        aiAttempts.length > 0 ? h("details", { open: true, style: { marginTop: 14 } },
          h("summary", { style: { fontSize: 11, fontWeight: 700, color: "var(--da-ink-3)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" } },
            "Mediation cycle · " + aiAttempts.length + " attempt" + (aiAttempts.length === 1 ? "" : "s")),
          h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6 } },
            aiAttempts.map(function (a, ai) {
              var verdictColor = a.verdict === "correct" ? "var(--da-green-text)" : a.verdict === "partial" ? "var(--da-amber-text)" : "var(--da-red-text)";
              return h("div", { key: "da-ai-att-" + ai, className: "da-card", style: { padding: 10 } },
                h("div", { style: { fontSize: 11, color: "var(--da-muted)", fontWeight: 700, marginBottom: 4 } },
                  "Attempt " + (ai + 1) + " · ",
                  h("span", { style: { color: verdictColor } }, a.verdict),
                  " · L" + a.levelAfter),
                h("div", { style: { fontSize: 12, color: "var(--da-ink)", marginBottom: 3 } },
                  h("strong", null, "Response: "), "“" + a.response + "”"),
                a.scaffoldShown ? h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", fontStyle: "italic", marginBottom: 3 } },
                  "→ Scaffold: " + a.scaffoldShown) : null,
                a.observationHint ? h("div", { style: { fontSize: 11, color: "var(--da-muted)" } },
                  "AI note: " + a.observationHint) : null
              );
            })
          )
        ) : null,
        // Canonical answer (collapsed)
        h("details", { style: { marginTop: 10 } },
          h("summary", { style: { fontSize: 11, color: "var(--da-muted)", cursor: "pointer", fontStyle: "italic" } },
            "Reveal canonical answer (examiner only)"),
          h("div", { style: { marginTop: 6, padding: 8, background: "var(--da-surface-3)", borderRadius: 6, fontSize: 13, color: "var(--da-ink)", fontFamily: "ui-monospace, monospace" } },
            item.correctAnswer)
        )
      );
    }

    // ─── Phase E — Standalone print packet ───
    // Built from the active session. Renders into a body-attached div with
    // class 'da-print-packet' (hidden onscreen via CSS; revealed via
    // @media print). Trigger: clicking the print button in the summary
    // screen calls window.print() after rendering. Uses black-and-white
    // styling to print cleanly without color ink.
    // Phase S — Family letter print block. Hidden on screen + when the
    // standard print packet renders; revealed only when body has the
    // attribute data-da-print-mode='family-letter'. Lives in the summary
    // so it's in the DOM when print fires.
    function renderFamilyLetterBlock() {
      if (!familySummary) return null;
      var s = state.activeSession;
      var name = (s && s.studentNickname) || "your child";
      var dateStr = "";
      try { dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch (e) {}
      return h("div", { className: "da-family-letter", "aria-hidden": "true" },
        h("p", { className: "da-family-greeting" }, dateStr),
        h("h1", null, "What we learned today"),
        h("p", { className: "da-family-greeting" }, "Dear family of " + name + ","),
        FAMILY_SECTION_ORDER.map(function (key) {
          if (key === "questions_for_team") {
            var qs = familySummary[key] || [];
            if (qs.length === 0) return null;
            return h(window.React.Fragment, { key: "da-letter-" + key },
              h("h2", null, FAMILY_SECTION_LABELS[key]),
              h("ol", null,
                qs.map(function (q, qi) { return h("li", { key: "da-letter-q-" + qi }, q); })
              )
            );
          }
          if (!familySummary[key]) return null;
          return h(window.React.Fragment, { key: "da-letter-" + key },
            h("h2", null, FAMILY_SECTION_LABELS[key]),
            h("p", null, familySummary[key])
          );
        }),
        h("p", { className: "da-family-signoff" }, "If you have any questions, please reach out anytime. Thank you for sharing your child with us."),
        h("p", { className: "da-family-signoff" }, "— Your school team")
      );
    }

    // Phase T — Teacher handoff print block. Hidden on screen + during the
    // standard print packet print. Revealed only when body has the attribute
    // data-da-print-mode='teacher-handoff'.
    function renderTeacherHandoffPrintBlock() {
      if (!teacherHandoff) return null;
      var s = state.activeSession;
      var name = (s && s.studentNickname) || "Student";
      var dateStr = "";
      try { dateStr = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch (e) {}
      return h("div", { className: "da-teacher-handoff-print", "aria-hidden": "true" },
        h("h1", null, "Teacher / Case Manager Handoff"),
        h("p", { style: { fontSize: "9pt", color: "#555", margin: "0 0 8pt" } },
          name + " · " + dateStr + " · drafted from Dynamic Assessment findings"),
        h("h2", null, "Clinical Headline"),
        h("p", null, teacherHandoff.headline),
        (teacherHandoff.whatWorks || []).length > 0 ? h(window.React.Fragment, null,
          h("h2", null, "✓ What Works"),
          h("ol", null,
            teacherHandoff.whatWorks.map(function (w, wi) {
              return h("li", { key: "da-thp-w-" + wi },
                h("strong", null, w.title), ". ", w.description,
                w.evidenceFromDA ? h("em", { style: { color: "#555" } }, " — Evidence: " + w.evidenceFromDA) : null,
                w.suggestedFrequency ? h("em", { style: { color: "#555" } }, " — Frequency: " + w.suggestedFrequency) : null
              );
            })
          )
        ) : null,
        (teacherHandoff.whatDidNotWork || []).length > 0 ? h(window.React.Fragment, null,
          h("h2", null, "✗ What to Avoid"),
          h("ol", null,
            teacherHandoff.whatDidNotWork.map(function (x, xi) { return h("li", { key: "da-thp-x-" + xi }, x); })
          )
        ) : null,
        (teacherHandoff.watchFor || []).length > 0 ? h(window.React.Fragment, null,
          h("h2", null, "👀 Watch For"),
          h("ol", null,
            teacherHandoff.watchFor.map(function (x, xi) { return h("li", { key: "da-thp-wf-" + xi }, x); })
          )
        ) : null,
        (teacherHandoff.quickProbes || []).length > 0 ? h(window.React.Fragment, null,
          h("h2", null, "🎯 Quick Probes (informal check-ins)"),
          h("ol", null,
            teacherHandoff.quickProbes.map(function (p, pi) {
              return h("li", { key: "da-thp-p-" + pi },
                h("strong", null, p.label), p.frequency ? " (" + p.frequency + ")" : "", ". ", p.description);
            })
          )
        ) : null,
        teacherHandoff.whenToReRefer ? h(window.React.Fragment, null,
          h("h2", null, "⚠ When to Re-refer"),
          h("p", { className: "da-th-redflag" }, teacherHandoff.whenToReRefer)
        ) : null,
        (teacherHandoff.redFlags || []).length > 0 ? h(window.React.Fragment, null,
          h("h3", null, "🚩 Red Flags"),
          h("ul", null,
            teacherHandoff.redFlags.map(function (x, xi) { return h("li", { key: "da-thp-rf-" + xi }, x); })
          )
        ) : null
      );
    }

    function renderPrintPacket() {
      var s = state.activeSession;
      if (!s) return null;
      var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
      var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
      var mediationResults = (s.itemResults || []).filter(function (r) { return r.phase === "mediation"; });
      var transferResults = (s.itemResults || []).filter(function (r) { return r.phase === "transfer"; });
      var pretestSum = sumItemResultScores(pretestResults);
      var posttestSum = sumItemResultScores(posttestResults);
      var transferSum = sumItemResultScores(transferResults);
      var modIdx = computeModifiabilityIndex(pretestSum, posttestSum, s.sessionItemIds.length);
      var tier = modifiabilityTier(modIdx);
      var max = maxPossibleScore(s.sessionItemIds.length);
      var transferMax = maxPossibleScore(transferResults.length);
      var transferInterpP = transferResults.length > 0
        ? transferTier(transferSum, transferMax, posttestSum, max) : null;
      var dateStr = "";
      try { dateStr = new Date(s.dateStarted).toLocaleDateString(); } catch (e) {}

      // Scaffold histogram
      var scaffoldTypes = { cue: 0, leading: 0, model: 0, directTeach: 0, none: 0, skipped: 0 };
      mediationResults.forEach(function (r) {
        var t = r.supportType || "none";
        scaffoldTypes[t] = (scaffoldTypes[t] || 0) + 1;
      });

      return h("div", { className: "da-print-packet", "aria-hidden": "true" },
        // Cover header
        h("div", { className: "da-print-section", style: { borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 14 } },
          h("div", { style: { fontSize: "9pt", color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 } },
            "Dynamic Assessment Probe · Clinical Observation Report"),
          h("h1", { style: { margin: "4px 0 0", fontSize: "16pt", color: "#000" } },
            s.studentNickname ? "Student: " + s.studentNickname : "Anonymous probe"),
          h("div", { className: "da-print-meta", style: { marginTop: 4 } },
            "Date: " + dateStr + " · Domain: " + (s.isCustomBank ? "custom probe" : s.domain) +
            " · Difficulty: " + s.difficulty +
            " · Mediation mode: " + (s.mode === "ai" ? "AI-mediated" : "Clinician-led") +
            " · Items administered: " + s.sessionItemIds.length)
        ),
        // Methodology note (essential context for a clinical reader)
        h("div", { className: "da-print-section" },
          h("h2", null, "Methodology"),
          h("p", { style: { fontSize: "10pt", lineHeight: 1.6, color: "#000", margin: 0 } },
            "Dynamic Assessment (DA) measures modifiability — a student's response to structured mediation — rather than static ability. This probe followed the graduated-prompt method (Campione & Brown; Lidz, 2003) across three phases: ",
            h("strong", null, "pretest"), " (unprompted baseline), ",
            h("strong", null, "mediation"), " (scaffolded retry with a 4-level prompt ladder: declarative cue → leading question → modeling → direct teaching), and ",
            h("strong", null, "posttest"), " (unprompted re-test on the same items).",
            transferResults.length > 0 ? " A " : ". ",
            transferResults.length > 0 ? h("strong", null, "transfer probe") : null,
            transferResults.length > 0 ? " followed, using structurally parallel but surface-novel items to assess generalization." : "",
            " Per-item scoring credits unprompted success at 5 points and decrements by 1 per scaffold level required.")
        ),
        // Headline finding
        h("div", { className: "da-print-section" },
          h("h2", null, "Modifiability Profile"),
          h("p", { style: { fontSize: "11pt", margin: "0 0 6px" } },
            h("strong", null, "Modifiability Index: " + modIdx.toFixed(2) + " — " + tier.label)),
          h("p", { style: { fontSize: "10pt", margin: 0, lineHeight: 1.55 } }, tier.desc)
        ),
        // Score stats
        h("div", { className: "da-print-section" },
          h("h2", null, "Performance Summary"),
          h("div", null,
            h("span", { className: "da-print-stat" },
              "Pretest baseline: " + pretestSum + " / " + max + " (" + Math.round((pretestSum / max) * 100) + "%)"),
            h("span", { className: "da-print-stat" },
              "Posttest: " + posttestSum + " / " + max + " (" + Math.round((posttestSum / max) * 100) + "%)"),
            h("span", { className: "da-print-stat" },
              "Growth: " + (posttestSum - pretestSum >= 0 ? "+" : "") + (posttestSum - pretestSum) + " pts"),
            transferResults.length > 0 ? h("span", { className: "da-print-stat" },
              "Transfer: " + transferSum + " / " + transferMax + " (" + Math.round((transferSum / transferMax) * 100) + "%)") : null
          )
        ),
        // Transfer interpretation (if present)
        transferInterpP ? h("div", { className: "da-print-section" },
          h("h2", null, "Transfer Interpretation"),
          h("p", { style: { fontSize: "10pt", margin: "0 0 6px" } },
            h("strong", null, transferInterpP.label)),
          h("p", { style: { fontSize: "10pt", margin: 0, lineHeight: 1.55 } }, transferInterpP.desc)
        ) : null,
        // Learning-zone (ZPD) snapshot — parity with the on-screen summary.
        (function () {
          var zpdP = computeZpdProfile(s);
          if (zpdP.nClassified === 0) return null;
          function zpdRow(label, entries, note) {
            return h("tr", null,
              h("td", null, label),
              h("td", null, String(entries.length)),
              h("td", null, entries.length > 0 ? entries.join("; ") : "—"),
              h("td", null, note)
            );
          }
          return h("div", { className: "da-print-section" },
            h("h2", null, "Learning-Zone Snapshot (Descriptive)"),
            h("table", { className: "da-print-table" },
              h("thead", null, h("tr", null,
                h("th", null, "Band"),
                h("th", null, "Items"),
                h("th", null, "Constructs"),
                h("th", null, "Instructional read")
              )),
              h("tbody", null,
                zpdRow("Independent (solved unprompted at pretest)",
                  zpdP.independent.map(function (z) { return z.construct; }),
                  "Already secure — maintain, don't reteach."),
                zpdRow("Scaffold-responsive band (solved with L1–L3)",
                  zpdP.zpd.map(function (z) { return z.construct + " (L" + z.level + ")"; }),
                  "Pitch instruction here, using the scaffold types that worked."),
                zpdRow("Needs direct teaching (L4 or unsolved)",
                  zpdP.frustration.map(function (z) { return z.construct + (z.solvedWithTeach ? " (solved after teach)" : " (unsolved)"); }),
                  "Not yet reachable through prompting — reteach foundations first.")
              )
            ),
            h("p", { className: "da-print-meta", style: { marginTop: 4 } },
              "Zone-of-proximal-development classification (Vygotsky, 1978) based on the support each item required in this session. Descriptive of this session's items only — not a normed placement.")
          );
        })(),
        // Phase I — Observation tag patterns (only if any tags recorded)
        (function () {
          var tagAgg = aggregateObservationTags(s.itemResults);
          if (tagAgg.length === 0) return null;
          return h("div", { className: "da-print-section" },
            h("h2", null, "Observed Patterns"),
            h("table", { className: "da-print-table" },
              h("thead", null, h("tr", null,
                h("th", null, "Pattern"),
                h("th", null, "Items")
              )),
              h("tbody", null,
                tagAgg.map(function (t, ri) {
                  return h("tr", { key: "da-print-tag-" + ri },
                    h("td", null, t.label),
                    h("td", null, t.count));
                })
              )
            )
          );
        })(),
        // Scaffold histogram
        Object.keys(scaffoldTypes).some(function (k) { return scaffoldTypes[k] > 0; }) ? h("div", { className: "da-print-section" },
          h("h2", null, "Scaffold Usage During Mediation"),
          h("table", { className: "da-print-table" },
            h("thead", null, h("tr", null,
              h("th", null, "Scaffold Level"),
              h("th", null, "Type"),
              h("th", null, "Items")
            )),
            h("tbody", null,
              [
                { k: "none", lvl: "L0", lbl: "Solved unprompted" },
                { k: "cue", lvl: "L1", lbl: "Declarative cue" },
                { k: "leading", lvl: "L2", lbl: "Leading question" },
                { k: "model", lvl: "L3", lbl: "Modeling" },
                { k: "directTeach", lvl: "L4", lbl: "Direct teaching" },
                { k: "skipped", lvl: "—", lbl: "Skipped" }
              ].filter(function (r) { return scaffoldTypes[r.k] > 0; }).map(function (r, ri) {
                return h("tr", { key: "da-print-hist-" + ri },
                  h("td", null, r.lvl),
                  h("td", null, r.lbl),
                  h("td", null, scaffoldTypes[r.k]));
              })
            )
          )
        ) : null,
        // Per-item results table
        h("div", { className: "da-print-section" },
          h("h2", null, "Per-Item Results"),
          h("table", { className: "da-print-table" },
            h("thead", null, h("tr", null,
              h("th", null, "Item"),
              h("th", null, "Phase"),
              h("th", null, "Scaffold L"),
              h("th", null, "Score"),
              h("th", null, "Observation")
            )),
            h("tbody", null,
              (s.itemResults || []).map(function (r, ri) {
                var it = ITEMS_BY_ID[r.itemId];
                var tagLabels = (Array.isArray(r.observationTags) ? r.observationTags : [])
                  .map(function (tid) { var def = OBSERVATION_TAGS_BY_ID[tid]; return def ? def.label : null; })
                  .filter(function (s) { return !!s; });
                var obsText = (r.examinerObservation || "").slice(0, 140);
                var combined = tagLabels.length > 0
                  ? "[" + tagLabels.join(", ") + "] " + obsText
                  : obsText;
                return h("tr", { key: "da-print-row-" + ri },
                  h("td", null, it ? it.construct : r.itemId),
                  h("td", null, r.phase),
                  h("td", null, "L" + r.promptLevelReached),
                  h("td", null, r.scoreAwarded + (r.finalCorrect ? "" : " ✗") + (r.scaffoldLeaked ? " ⚠leak" : "")),
                  h("td", { style: { fontSize: "8pt" } }, combined)
                );
              })
            )
          )
        ),
        // Narrative for paste-in (clinician can copy this into a report)
        h("div", { className: "da-print-section" },
          h("h2", null, "Narrative (for report paste-in)"),
          h("div", { style: { fontSize: "10pt", lineHeight: 1.65, whiteSpace: "pre-wrap" } },
            buildDaNarrativeSection(Object.assign({}, s, {
              modifiabilityIndex: modIdx, modifiabilityTier: tier
            }), s.studentNickname))
        ),
        // Footer caveat
        h("div", { style: { marginTop: 20, paddingTop: 8, borderTop: "1px solid #999", fontSize: "8.5pt", color: "#444", fontStyle: "italic", lineHeight: 1.5 } },
          "This document records a clinician-administered Dynamic Assessment probe. It is a structured clinical observation, NOT a normed or standardized measure. The Modifiability Index is descriptive and should not be used for eligibility decisions on its own. Findings should be interpreted alongside standardized assessment data, classroom observation, intervention response history, and the student's full developmental context.")
      );
    }

    // ─── Summary screen ───
    function renderSummaryScreen() {
      var s = state.activeSession;
      var pretestResults = s.itemResults.filter(function (r) { return r.phase === "pretest"; });
      var mediationResults = s.itemResults.filter(function (r) { return r.phase === "mediation"; });
      var posttestResults = s.itemResults.filter(function (r) { return r.phase === "posttest"; });
      var transferResults = s.itemResults.filter(function (r) { return r.phase === "transfer"; });
      var pretestSum = sumItemResultScores(pretestResults);
      var posttestSum = sumItemResultScores(posttestResults);
      var transferSum = sumItemResultScores(transferResults);
      var modIdx = computeModifiabilityIndex(pretestSum, posttestSum, s.sessionItemIds.length);
      var tier = modifiabilityTier(modIdx);
      var max = maxPossibleScore(s.sessionItemIds.length);
      // Phase E — transfer stats. Only meaningful if transfer phase ran.
      var transferMax = maxPossibleScore(transferResults.length);
      var transferTierObj = transferResults.length > 0
        ? transferTier(transferSum, transferMax, posttestSum, max)
        : null;

      // Scaffold-type histogram (mediation phase only)
      var scaffoldTypes = { cue: 0, leading: 0, model: 0, directTeach: 0, none: 0, skipped: 0 };
      mediationResults.forEach(function (r) {
        var t = r.supportType || "none";
        scaffoldTypes[t] = (scaffoldTypes[t] || 0) + 1;
      });

      return h("div", { className: "da-root da-fade-in", style: { maxWidth: 820, margin: "0 auto", padding: 20 } },
        // Header
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" } },
          h("div", { style: { flex: 1, minWidth: 220 } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 } }, "Session complete"),
            h("h1", { style: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--da-ink)" } },
              "Modifiability profile · " + (s.studentNickname || "Anonymous"))
          ),
          // Mis-click insurance: step back into the session at the last item
          // (nothing is lost — the item is re-presented for re-scoring).
          s.itemResults.length > 0 ? h("button", {
            onClick: undoLastResult,
            "aria-label": "Reopen the session at the last recorded item to re-score it",
            title: "Steps back into the session, re-presenting the most recently recorded item with its response restored.",
            style: { background: "transparent", border: "1px solid var(--da-border-2)", color: "var(--da-ink-3)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }
          }, "↩ Reopen last item") : null
        ),

        // Bridge the h1 → h3 heading jump: every result card below is an h3,
        // so a single sr-only h2 keeps the outline valid (WCAG 1.3.1 / 2.4.10)
        // without changing anything visually.
        h("h2", { style: { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 } },
          "Detailed results"),

        // Headline modifiability card
        h("div", {
          className: "da-card da-pop",
          style: {
            marginBottom: 14, padding: 18,
            background: tier.id === "high" ? "var(--da-green-tint)" : tier.id === "moderate" ? "var(--da-amber-tint)" : tier.id === "low" ? "var(--da-red-tint)" : "var(--da-surface-3)",
            borderColor: tier.id === "high" ? "var(--da-green-border)" : tier.id === "moderate" ? "var(--da-amber-border)" : tier.id === "low" ? "var(--da-red-border)" : "var(--da-border-2)"
          }
        },
          h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 6 } },
            "Modifiability Index"),
          h("div", { style: { display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" } },
            h("div", { style: { fontSize: 42, fontWeight: 900, color: "var(--da-ink)", lineHeight: 1 } },
              (modIdx >= 0 ? "+" : "") + modIdx.toFixed(2)),
            h("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--da-ink)" } }, tier.label)
          ),
          // MI gauge — the index placed on its full −1…+1 range with the tier
          // bands visible, so the number reads as a position, not a grade.
          (function () {
            var gW = 320, gH = 34, gPad = 6, barY = 10, barH = 10;
            var gx = function (v) { return gPad + ((Math.max(-1, Math.min(1, v)) + 1) / 2) * (gW - 2 * gPad); };
            var bands = [
              { from: -1, to: 0, fill: daTone.grid, label: "regression" },
              { from: 0, to: 0.3, fill: daHex("#b91c1c") + "55", label: "low" },
              { from: 0.3, to: 0.6, fill: daHex("#a16207") + "55", label: "moderate" },
              { from: 0.6, to: 1, fill: daHex("#16a34a") + "55", label: "high" }
            ];
            var markerX = gx(modIdx);
            return h("svg", {
              viewBox: "0 0 " + gW + " " + gH, width: "100%", height: gH,
              role: "img",
              "aria-label": "Modifiability Index gauge: " + (modIdx >= 0 ? "+" : "") + modIdx.toFixed(2) +
                ", in the " + tier.label + " band. Bands: below 0 regression, 0 to 0.3 low, 0.3 to 0.6 moderate, 0.6 and above high.",
              style: { display: "block", maxWidth: gW, marginTop: 10 }
            },
              bands.map(function (b, bi) {
                return h("rect", { key: "da-gauge-b-" + bi, x: gx(b.from), y: barY, width: gx(b.to) - gx(b.from), height: barH, fill: b.fill, rx: bi === 0 ? 3 : 0 });
              }),
              // tier cut-point ticks at 0, 0.3, 0.6
              [0, 0.3, 0.6].map(function (v, vi) {
                return h("line", { key: "da-gauge-t-" + vi, x1: gx(v), x2: gx(v), y1: barY - 2, y2: barY + barH + 2, stroke: daTone.muted, strokeWidth: 1 });
              }),
              h("text", { x: gx(-1), y: barY + barH + 12, fontSize: 8, fill: daTone.muted }, "-1"),
              h("text", { x: gx(0) - 3, y: barY + barH + 12, fontSize: 8, fill: daTone.muted }, "0"),
              h("text", { x: gx(1) - 10, y: barY + barH + 12, fontSize: 8, fill: daTone.muted }, "+1"),
              // marker: triangle above the bar at this session's MI
              h("path", {
                d: "M " + (markerX - 5) + " 2 L " + (markerX + 5) + " 2 L " + markerX + " " + (barY - 1) + " Z",
                fill: daTone.ink
              }),
              h("line", { x1: markerX, x2: markerX, y1: barY, y2: barY + barH, stroke: daTone.ink, strokeWidth: 2 })
            );
          })(),
          h("p", { style: { margin: "10px 0 0", fontSize: 13, color: "var(--da-ink-2)", lineHeight: 1.65 } }, tier.desc),
          h("p", { style: { margin: "6px 0 0", fontSize: 10.5, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.5 } },
            "Band cut-points (0.30 / 0.60) are interpretation conventions of this tool — they are not empirically derived or normed thresholds."),
          // Single-item sensitivity — the quantified version of the small-N
          // caution: how far one adjacent-level scoring judgment moves the MI.
          (function () {
            var sens = computeMiSensitivity(pretestSum, posttestSum, s.sessionItemIds.length);
            if (!sens || (sens.hi - sens.lo) < 0.005) return null;
            var fmtMi = function (v) { return (v >= 0 ? "+" : "") + v.toFixed(2); };
            return h("p", { style: { margin: "4px 0 0", fontSize: 10.5, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.5 } },
              "Sensitivity: judging one item's scaffold level a single step differently would put the index between " +
              fmtMi(sens.lo) + " and " + fmtMi(sens.hi) + " — read differences smaller than that range as noise.");
          })(),
          // A1 — small-N measurement-error caution. The MI is a ratio of two
          // small score sums; with few items per phase one mis-scored item
          // swings it substantially. Present it as a direction, not a precise
          // value, so the 2-decimal figure isn't read as more exact than the
          // data can support. Threshold: < 5 items/phase (default is 3).
          (s.sessionItemIds.length < 5 ? h("div", {
            style: { marginTop: 10, padding: "7px 11px", background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.28)", borderRadius: 8, fontSize: 11.5, color: "var(--da-amber-text-2)", lineHeight: 1.55 }
          },
            "⚠ Based on " + s.sessionItemIds.length + " item" + (s.sessionItemIds.length === 1 ? "" : "s") + " per phase. At this length the index carries substantial measurement error — read it as a broad direction (clear gain / little change / regression), not a precise number. Run more items for a more stable estimate."
          ) : null)
        ),

        // ─── Learning-zone (ZPD) snapshot ───
        // Turns the session's own item data into the Vygotskian read the MI
        // alone doesn't give: WHERE to teach next. Independent = already
        // secure; ZPD = fails alone but succeeds with L1–L3 scaffolds (teach
        // here); frustration = not yet reachable through prompting.
        (function () {
          var zpd = computeZpdProfile(s);
          if (zpd.nClassified === 0) return null;
          var cols = [
            { key: "independent", icon: "✅", title: "Independent", sub: "Solved unprompted at pretest",
              items: zpd.independent.map(function (z) { return z.construct; }),
              tone: "green", note: "Already secure — maintain, don't reteach." },
            { key: "zpd", icon: "🌱", title: "Teachable band (ZPD)", sub: "Solved with L1–L3 scaffolds",
              items: zpd.zpd.map(function (z) { return z.construct + " (L" + z.level + ")"; }),
              tone: "amber", note: "Pitch instruction here, using the scaffold types that worked." },
            { key: "frustration", icon: "🧗", title: "Needs direct teaching", sub: "Required L4, or unsolved",
              items: zpd.frustration.map(function (z) { return z.construct + (z.solvedWithTeach ? " (solved after teach)" : " (unsolved)"); }),
              tone: "red", note: "Not yet reachable via prompts — reteach foundations first." }
          ];
          var toneStyles = {
            green: { bg: "var(--da-green-tint)", border: "var(--da-green-border)", text: "var(--da-green-text-2)" },
            amber: { bg: "var(--da-amber-tint)", border: "var(--da-amber-border-2)", text: "var(--da-amber-text)" },
            red: { bg: "var(--da-red-tint)", border: "var(--da-red-border)", text: "var(--da-red-text)" }
          };
          return h("div", { className: "da-card", style: { marginBottom: 14 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
              "Learning-zone snapshot"),
            h("p", { style: { margin: "0 0 10px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.5 } },
              "Each item placed by the support it took — the zone-of-proximal-development read (Vygotsky, 1978) behind the index. Descriptive of this session's items only; not a normed placement."),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 } },
              cols.map(function (c) {
                var ts = toneStyles[c.tone];
                return h("div", { key: "da-zpd-" + c.key, style: { padding: "10px 12px", borderRadius: 10, background: ts.bg, border: "1px solid " + ts.border } },
                  h("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
                    h("span", { "aria-hidden": "true", style: { fontSize: 14 } }, c.icon),
                    h("span", { style: { fontSize: 12.5, fontWeight: 800, color: "var(--da-ink)" } }, c.title),
                    h("span", { style: { fontSize: 15, fontWeight: 900, color: ts.text, marginLeft: "auto" } }, c.items.length)
                  ),
                  h("div", { style: { fontSize: 10, color: "var(--da-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 } }, c.sub),
                  c.items.length > 0 ? h("ul", { style: { margin: "6px 0 0", paddingLeft: 16, fontSize: 11.5, color: "var(--da-ink-2)", lineHeight: 1.5 } },
                    c.items.map(function (label, li) { return h("li", { key: "da-zpd-" + c.key + "-" + li }, label); })
                  ) : h("div", { style: { marginTop: 6, fontSize: 11.5, color: "var(--da-muted)", fontStyle: "italic" } }, "None this session."),
                  h("div", { style: { marginTop: 6, fontSize: 10.5, color: ts.text, lineHeight: 1.45 } }, c.note)
                );
              })
            )
          );
        })(),

        // ─── Phase BB — Contextual mini-card: this MI vs population ───
        // Only meaningful with ≥ 5 prior sessions to compare against.
        (function () {
          var priorSessions = (state.sessions || []).filter(function (ss) {
            return ss && typeof ss.modifiabilityIndex === "number";
          });
          if (priorSessions.length < 5) return null;
          var stats = aggregateSessionStatistics(priorSessions);
          var z = computeMiZScore(modIdx, stats.miMean, stats.miSD);
          var pct = computeMiPercentile(modIdx, stats.allMIs);
          if (z === null || pct === null) return null;
          var zStr = (z >= 0 ? "+" : "") + z.toFixed(2);
          var pctStr = pct + (pct === 1 ? "st" : pct === 2 ? "nd" : pct === 3 ? "rd" : pct >= 11 && pct <= 13 ? "th" : (pct % 10 === 1) ? "st" : (pct % 10 === 2) ? "nd" : (pct % 10 === 3) ? "rd" : "th");
          var color = daHex(z >= 1 ? "#16a34a" : z >= 0 ? "#1e3a8a" : z >= -1 ? "#a16207" : "#b91c1c");
          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-violet-tint)", borderColor: "var(--da-violet-border)" } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } },
                  "Compared to your own sessions · n = " + stats.n),
                // A2 — descriptive framing first. "Percentile" / "z" read as a
                // standardized norm; this is only a comparison against sessions
                // the clinician has personally run. Lead with plain language,
                // demote the statistic to a parenthetical, and ALWAYS state it
                // is not an external norm.
                h("div", { style: { fontSize: 13.5, color: "var(--da-ink)", marginTop: 4, lineHeight: 1.55 } },
                  "This result is higher than about ",
                  h("strong", { style: { color: color } }, pct + "%"),
                  " of the sessions you've run in this tool",
                  h("span", { style: { color: "var(--da-muted)", fontSize: 11.5 } },
                    " (z = " + zStr + " vs your mean " + stats.miMean.toFixed(2) + ", SD = " + (stats.miSD || 0).toFixed(2) + ")."
                  )
                ),
                h("div", { style: { fontSize: 11, color: "var(--da-violet-mid)", fontStyle: "italic", marginTop: 4, lineHeight: 1.5 } },
                  "This compares only against your own saved sessions — it is NOT a percentile against any standardized or external norm."
                  + (stats.n < 30 ? " Below ~30 sessions, treat it as exploratory context only." : "")
                )
              ),
              h("button", {
                onClick: function () { setStartScreenView("population"); },
                "aria-label": "Open full population statistics view",
                style: { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--da-violet-mid-2)", background: "var(--da-surface)", color: "var(--da-violet-mid-2)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "📈 Full stats")
            )
          );
        })(),

        // ─── Phase CC — Within-student longitudinal trajectory ───
        // The local-norm card compares THIS session against ALL students. For
        // progress monitoring, what a clinician actually wants is THIS student
        // over time. Group prior completed sessions by the (PII-free) nickname,
        // append the current session live as the latest point, and plot the
        // Modifiability Index across sessions. Descriptive only — and because
        // MI is construct-relative, cross-domain points are not directly
        // comparable, which the caveat states explicitly.
        (function () {
          var nick = (s.studentNickname || "").trim();
          if (!nick) return null; // anonymous sessions can't be grouped meaningfully
          var nickKey = nick.toLowerCase();
          var prior = (state.sessions || []).filter(function (ss) {
            return ss && typeof ss.modifiabilityIndex === "number"
              && (ss.studentNickname || "").trim().toLowerCase() === nickKey
              && ss.id !== s.id;
          });
          var pts = prior.map(function (ss) {
            return {
              mi: ss.modifiabilityIndex,
              domain: ss.domain || "custom",
              date: ss.dateCompleted || ss.dateStarted || "",
              items: Array.isArray(ss.sessionItemIds) ? ss.sessionItemIds.length : null,
              current: false
            };
          });
          pts.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
          pts.push({ mi: modIdx, domain: s.domain || "custom", date: s.dateStarted || "", items: s.sessionItemIds.length, current: true });
          if (pts.length < 2) return null; // need ≥2 points for a trajectory

          var miColor = function (v) { return daHex(v >= 0.6 ? "#16a34a" : v >= 0.3 ? "#a16207" : v >= 0 ? "#1e3a8a" : "#b91c1c"); };
          var fmtDate = function (iso) { var d = String(iso).slice(0, 10); return d || "—"; };
          var domainLabels = { math: "Math", reading: "Reading", "working-memory": "Working memory", wm: "Working memory", language: "Language", custom: "Custom" };
          var domainsPresent = {};
          pts.forEach(function (p) { domainsPresent[p.domain] = 1; });
          var multiDomain = Object.keys(domainsPresent).length > 1;

          // SVG geometry — MI in [-1, 1] mapped to a compact sparkline.
          var W = 300, H = 70, padL = 8, padR = 8, padT = 8, padB = 8;
          var innerW = W - padL - padR, innerH = H - padT - padB;
          var xAt = function (i) { return pts.length === 1 ? padL + innerW / 2 : padL + (i * innerW) / (pts.length - 1); };
          var yAt = function (mi) { var v = Math.max(-1, Math.min(1, mi)); return padT + (1 - (v + 1) / 2) * innerH; };
          var zeroY = yAt(0);
          var polyPoints = pts.map(function (p, i) { return xAt(i).toFixed(1) + "," + yAt(p.mi).toFixed(1); }).join(" ");

          var first = pts[0], last = pts[pts.length - 1];
          var delta = last.mi - first.mi;
          var direction = Math.abs(delta) < 0.15 ? "held about steady" : (delta > 0 ? "trended upward" : "trended downward");
          var ariaSummary = "This student's Modifiability Index across " + pts.length + " sessions, from " + first.mi.toFixed(2) + " to " + last.mi.toFixed(2) + ", " + direction + ".";

          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-sky-tint)", borderColor: "var(--da-sky-border-2)" } },
            h("div", { style: { fontSize: 11, color: "var(--da-sky-text)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 6 } },
              "📈 " + nick + " over time · " + pts.length + " sessions"),
            // Inline SVG sparkline
            h("svg", {
              viewBox: "0 0 " + W + " " + H, width: "100%", height: H,
              role: "img", "aria-label": ariaSummary,
              style: { display: "block", maxWidth: W, marginBottom: 6 }
            },
              // zero baseline
              h("line", { x1: padL, y1: zeroY.toFixed(1), x2: (W - padR).toFixed(1), y2: zeroY.toFixed(1), stroke: daTone.border, strokeWidth: 1, strokeDasharray: "3 3" }),
              // top/bottom guide labels (muted, not faint — 1.4.3 contrast on tint bg)
              h("text", { x: padL, y: padT + 3, fontSize: 7, fill: daTone.muted }, "+1"),
              h("text", { x: padL, y: (H - padB + 1).toFixed(1), fontSize: 7, fill: daTone.muted }, "-1"),
              // trend line (sky tone ≥3:1 on the tinted card in both themes)
              h("polyline", { points: polyPoints, fill: "none", stroke: daTone.sky, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }),
              // dots
              pts.map(function (p, i) {
                return h("circle", {
                  key: "da-traj-" + i,
                  cx: xAt(i).toFixed(1), cy: yAt(p.mi).toFixed(1),
                  r: p.current ? 4.5 : 3.5,
                  fill: miColor(p.mi),
                  stroke: p.current ? daTone.ink : daTone.surface, strokeWidth: p.current ? 1.5 : 1
                }, h("title", null, fmtDate(p.date) + " · " + (domainLabels[p.domain] || p.domain) + " · MI " + (p.mi >= 0 ? "+" : "") + p.mi.toFixed(2) + (p.current ? " (this session)" : "")));
              })
            ),
            h("div", { style: { fontSize: 13, color: "var(--da-ink)", lineHeight: 1.55 } },
              "Across these sessions the index has ",
              h("strong", null, direction),
              " (" + (first.mi >= 0 ? "+" : "") + first.mi.toFixed(2) + " → " + (last.mi >= 0 ? "+" : "") + last.mi.toFixed(2) + "). The filled dark-ringed dot is this session."),
            h("div", { style: { fontSize: 11, color: "var(--da-sky-text)", fontStyle: "italic", marginTop: 4, lineHeight: 1.5 } },
              multiDomain
                ? "⚠ These sessions span more than one domain (" + Object.keys(domainsPresent).map(function (d) { return domainLabels[d] || d; }).join(", ") + "). The Modifiability Index is construct-relative — compare points WITHIN the same domain, not across. Descriptive trajectory, not a growth norm."
                : "Descriptive trajectory across the sessions you've run with this student — not a standardized growth norm."
            )
          );
        })(),

        // ─── Tier 1 — Access-condition lens (clinician-facing; gated on language context) ───
        // Surfaces ONLY when a multilingual/language context was noted at intake.
        // Describes which supports coincided with mediation successes; if the
        // language-reducing ones dominate, raises a HYPOTHESIS (not a finding).
        // Report-facing wording is intentionally NOT wired yet — this card is for
        // clinician review/sign-off before any of it reaches the family/teacher outputs.
        (function () {
          var ac = analyzeAccessConditions(s);
          if (!ac) return null;
          var egs = ac.exampleConstructs.length ? " (e.g., " + ac.exampleConstructs.join("; ") + ")" : "";
          var children = [
            h("div", { key: "hdr", style: { fontSize: 11, color: "var(--da-fuchsia-text)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 6 } },
              "🌐 Access-condition lens · exploratory")
          ];
          // (a) Support-coincidence signal (correlational; needs >=2 supported successes).
          if (ac.supportedSucc >= 2) {
            children.push(h("div", { key: "supp", style: { fontSize: 13, color: "var(--da-ink)", lineHeight: 1.55 } },
              (ac.languageConcentrated
                ? "This student succeeded most often when supports that REDUCE LANGUAGE DEMAND were available"
                : "Supports that helped were mixed across language-reducing and construct-level types"),
              " — on " + ac.langSucc + " of " + ac.supportedSucc + " supported mediation successes" + egs + "."));
            if (ac.languageConcentrated) {
              children.push(h("div", { key: "hyp", style: { fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55, marginTop: 6 } },
                "This pattern is worth exploring: it is ",
                h("strong", null, "consistent with academic-language access — rather than the underlying skill — limiting performance"),
                ". It is a hypothesis, not a determination."));
            }
          }
          // (b) Direct MODALITY contrast (controlled: same item, reading demand removed).
          if (ac.readAloudFlips >= 1) {
            children.push(h("div", { key: "mod", style: { fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55, marginTop: 6 } },
              "🔊 On ",
              h("strong", null, ac.readAloudFlips + " item" + (ac.readAloudFlips === 1 ? "" : "s")),
              ", the student succeeded ", h("strong", null, "only when it was read aloud"),
              " — a direct contrast (same item, reading demand removed) indicating reading/decoding access, rather than the underlying skill, was the barrier on those items."));
          }
          // (c) Direct LINGUISTIC-LOAD contrast (same problem, simpler language).
          if (ac.simplifiedFlips >= 1) {
            children.push(h("div", { key: "simp", style: { fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55, marginTop: 6 } },
              "✍️ On ",
              h("strong", null, ac.simplifiedFlips + " item" + (ac.simplifiedFlips === 1 ? "" : "s")),
              ", the student succeeded ", h("strong", null, "only with simpler language"),
              " — a direct contrast (same problem, reduced language complexity) indicating academic-language load, rather than the underlying skill, was the barrier on those items."));
          }
          // (d) Direct HOME-LANGUAGE (L1) contrast (same problem, language of testing → L1).
          if (ac.l1Flips >= 1) {
            children.push(h("div", { key: "l1", style: { fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55, marginTop: 6 } },
              "🌐 On ",
              h("strong", null, ac.l1Flips + " item" + (ac.l1Flips === 1 ? "" : "s")),
              ", the student succeeded ", h("strong", null, "only in their home language"),
              " — a direct contrast (same problem, language of testing → home language) indicating the language of testing, rather than the underlying skill, was the barrier on those items. Verify the translation with a proficient speaker."));
          }
          children.push(h("div", { key: "cav", style: { fontSize: 11, color: "var(--da-fuchsia-text)", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 } },
            "⚠ Exploratory, small-N. The read-aloud, simpler-language, and home-language contrasts are controlled manipulations (home-language translations should be verified with a proficient speaker); the support-coincidence pattern is correlational. Interpret only alongside this student's language-proficiency data and the home-language context noted at intake. This lens appears because a language background was recorded at intake."));
          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-violet-tint-3)", borderColor: "var(--da-violet-border-2)" } }, children);
        })(),

        // ─── Phase W — Outputs dashboard ───
        // Surfaces all five output channels at a glance with status badges
        // and jump-to-section / quick-generate buttons. Solves discoverability:
        // first-time clinicians no longer have to scroll through the summary
        // to learn what's available.
        (function () {
          var pretestResultsW = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
          var posttestResultsW = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
          var pretestSumW = sumItemResultScores(pretestResultsW);
          var posttestSumW = sumItemResultScores(posttestResultsW);
          var modIdxW = computeModifiabilityIndex(pretestSumW, posttestSumW, s.sessionItemIds.length);
          var sessionForGenW = Object.assign({}, s, {
            modifiabilityIndex: modIdxW,
            modifiabilityTier: modifiabilityTier(modIdxW)
          });
          function scrollToOutputId(id) {
            try {
              var el = document.getElementById(id);
              if (el && typeof el.scrollIntoView === "function") {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            } catch (e) { /* ignore */ }
          }
          var outputs = [
            {
              id: "out-narrative", icon: "📝", label: "Clinical narrative",
              statusText: "Always available · sent with Report Writer export",
              statusColor: "#1e3a8a",
              done: true,
              action: null,
              anchor: null
            },
            {
              id: "out-iep", icon: "🎯", label: "IEP goals",
              statusText: iepGoals.length > 0 ? "✓ " + iepGoals.length + " goal" + (iepGoals.length === 1 ? "" : "s") + " drafted" : "Not yet drafted",
              statusColor: iepGoals.length > 0 ? "#16a34a" : "#92400e",
              done: iepGoals.length > 0,
              busy: iepBusy,
              action: function () {
                setIepPanelOpen(true);
                if (iepGoals.length === 0 && !iepBusy) generateIepGoalsForSession(sessionForGenW);
                setTimeout(function () { scrollToOutputId("out-iep-anchor"); }, 100);
              },
              anchor: "out-iep-anchor"
            },
            {
              id: "out-accom", icon: "🛠", label: "UDL accommodations",
              statusText: accommodations.length > 0 ? "✓ " + accommodations.length + " accommodation" + (accommodations.length === 1 ? "" : "s") + " drafted" : "Not yet drafted",
              statusColor: accommodations.length > 0 ? "#16a34a" : "#15803d",
              done: accommodations.length > 0,
              busy: accomBusy,
              action: function () {
                setAccomPanelOpen(true);
                if (accommodations.length === 0 && !accomBusy) generateAccommodationsForSession(sessionForGenW);
                setTimeout(function () { scrollToOutputId("out-accom-anchor"); }, 100);
              },
              anchor: "out-accom-anchor"
            },
            {
              id: "out-family", icon: "👨‍👩‍👧", label: "Family letter",
              statusText: familySummary ? "✓ Drafted · plain-language" : "Not yet drafted",
              statusColor: familySummary ? "#16a34a" : "#9d174d",
              done: !!familySummary,
              busy: familyBusy,
              action: function () {
                setFamilyPanelOpen(true);
                if (!familySummary && !familyBusy) generateFamilySummaryForSession(sessionForGenW);
                setTimeout(function () { scrollToOutputId("out-family-anchor"); }, 100);
              },
              anchor: "out-family-anchor"
            },
            {
              id: "out-teacher", icon: "🧑‍🏫", label: "Teacher handoff",
              statusText: teacherHandoff ? "✓ Drafted · classroom strategies" : "Not yet drafted",
              statusColor: teacherHandoff ? "#16a34a" : "#075985",
              done: !!teacherHandoff,
              busy: teacherBusy,
              action: function () {
                setTeacherPanelOpen(true);
                if (!teacherHandoff && !teacherBusy) generateTeacherHandoffForSession(sessionForGenW);
                setTimeout(function () { scrollToOutputId("out-teacher-anchor"); }, 100);
              },
              anchor: "out-teacher-anchor"
            },
            {
              id: "out-monitoring", icon: "📈", label: "Monitoring plan",
              statusText: progressMonitoring ? "✓ Drafted · CBM schedule + decision rules" : "Not yet drafted",
              statusColor: progressMonitoring ? "#16a34a" : "#3730a3",
              done: !!progressMonitoring,
              busy: monitoringBusy,
              action: function () {
                setMonitoringPanelOpen(true);
                if (!progressMonitoring && !monitoringBusy) generateProgressMonitoringForSession(Object.assign({}, sessionForGenW, { iepGoals: iepGoals && iepGoals.length > 0 ? iepGoals.slice() : [] }));
                setTimeout(function () { scrollToOutputId("out-monitoring-anchor"); }, 100);
              },
              anchor: "out-monitoring-anchor"
            }
          ];
          var doneCount = outputs.filter(function (o) { return o.done; }).length;
          var totalAi = 5; // Clinical narrative is auto; 5 AI-generated outputs (incl monitoring)
          var aiDone = outputs.filter(function (o) { return o.id !== "out-narrative" && o.done; }).length;
          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 14, background: "var(--da-surface-2)", borderColor: "var(--da-border-2)" } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-zinc-text)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } }, "Outputs dashboard"),
                h("h3", { style: { margin: "2px 0 0", fontSize: 15, fontWeight: 800, color: "var(--da-ink)" } },
                  "📦 " + doneCount + " of " + outputs.length + " ready · " + aiDone + "/" + totalAi + " AI outputs drafted")
              ),
              aiDone < totalAi ? h("button", {
                onClick: function () {
                  if (!iepGoals.length) { setIepPanelOpen(true); generateIepGoalsForSession(sessionForGenW); }
                  if (!accommodations.length) { setAccomPanelOpen(true); generateAccommodationsForSession(sessionForGenW); }
                  if (!familySummary) { setFamilyPanelOpen(true); generateFamilySummaryForSession(sessionForGenW); }
                  if (!teacherHandoff) { setTeacherPanelOpen(true); generateTeacherHandoffForSession(sessionForGenW); }
                  if (!progressMonitoring) { setMonitoringPanelOpen(true); generateProgressMonitoringForSession(Object.assign({}, sessionForGenW, { iepGoals: iepGoals && iepGoals.length > 0 ? iepGoals.slice() : [] })); }
                  addToast("✨ Generating " + (totalAi - aiDone) + " output" + (totalAi - aiDone === 1 ? "" : "s") + " in parallel…");
                },
                "aria-label": "Generate all remaining AI outputs in parallel",
                style: { padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--da-btn-violet)", color: "var(--da-on-accent)", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }
              }, "✨ Generate remaining (" + (totalAi - aiDone) + ")") : null
            ),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 } },
              outputs.map(function (o) {
                return h("div", {
                  key: o.id,
                  style: {
                    padding: 10,
                    background: o.done ? "var(--da-green-tint)" : "var(--da-surface)",
                    border: "1px solid " + (o.done ? "var(--da-green-border)" : "var(--da-border)"),
                    borderRadius: 8,
                    display: "flex", flexDirection: "column", gap: 4
                  }
                },
                  h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                    h("span", { style: { fontSize: 18 } }, o.icon),
                    h("span", { style: { fontSize: 13, fontWeight: 800, color: "var(--da-ink)", flex: 1 } }, o.label)
                  ),
                  h("div", { style: { fontSize: 11, color: daHex(o.statusColor), fontWeight: 600, lineHeight: 1.4 } }, o.statusText),
                  o.action ? h("div", { style: { display: "flex", gap: 4, marginTop: 4 } },
                    o.done && o.anchor ? h("button", {
                      onClick: function () { scrollToOutputId(o.anchor); },
                      "aria-label": "Jump to " + o.label,
                      style: { padding: "3px 8px", borderRadius: 4, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                    }, "↓ Jump") : null,
                    !o.done ? h("button", {
                      onClick: o.action,
                      disabled: o.busy,
                      "aria-label": "Generate " + o.label,
                      style: { padding: "3px 10px", borderRadius: 4, border: "none", background: o.busy ? "var(--da-faint)" : (daTheme === "contrast" ? "#ffff00" : o.statusColor), color: "var(--da-on-accent)", fontSize: 10.5, fontWeight: 800, cursor: o.busy ? "wait" : "pointer", fontFamily: "inherit" }
                    }, o.busy ? "Drafting…" : "Generate") : h("button", {
                      onClick: o.action,
                      "aria-label": "Open " + o.label + " panel",
                      style: { padding: "3px 10px", borderRadius: 4, border: "1px solid " + daHex(o.statusColor), background: "transparent", color: daHex(o.statusColor), fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                    }, "Open")
                  ) : null
                );
              })
            )
          );
        })(),

        // Phase V — Pre-session intake context (read-only on the live summary)
        s.intake ? (function () {
          var ik = s.intake;
          var hasAny = ik.referralReason || ik.hypothesizedBottleneck || ik.specificQuestion || ik.priorInterventions || ik.existingAssessmentData;
          if (!hasAny) return null;
          return h("details", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-violet-tint-2)", borderColor: "var(--da-violet-border)" } },
            h("summary", { style: { cursor: "pointer", fontSize: 11, fontWeight: 800, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.06em" } },
              "📋 Referral context"),
            h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, lineHeight: 1.55, color: "var(--da-indigo-deeper)" } },
              ik.referralReason && ik.referralReason.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Referral: "), ik.referralReason) : null,
              ik.specificQuestion && ik.specificQuestion.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Question: "), ik.specificQuestion) : null,
              ik.hypothesizedBottleneck && ik.hypothesizedBottleneck.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Hypothesis: "), ik.hypothesizedBottleneck) : null,
              ik.priorInterventions && ik.priorInterventions.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Prior: "), ik.priorInterventions) : null,
              ik.existingAssessmentData && ik.existingAssessmentData.trim() ? h("div", null,
                h("strong", { style: { fontSize: 10.5, color: "var(--da-violet-text-2)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Existing data: "), ik.existingAssessmentData) : null
            )
          );
        })() : null,

        // Phase U — Session timing + session-level note (only if either has content)
        (function () {
          var timing = computeSessionTiming(s);
          var hasNote = s.sessionNote && s.sessionNote.trim().length > 0;
          if (timing.perItem.length === 0 && !hasNote) return null;
          var avgPerItem = timing.perItem.length > 0 ? timing.activeMs / timing.perItem.length : 0;
          return h("div", { className: "da-card", style: { marginBottom: 14, padding: 12, background: "var(--da-surface-2)" } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: hasNote ? 8 : 0 } },
              h("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--da-ink-3)" } },
                h("div", null, "⏱ Active time: ", h("strong", { style: { color: "var(--da-ink)" } }, formatDuration(timing.activeMs))),
                h("div", null, "Total span: ", h("strong", { style: { color: "var(--da-ink)" } }, formatDuration(timing.totalMs))),
                timing.perItem.length > 0 ? h("div", null, "Avg/item: ", h("strong", { style: { color: "var(--da-ink)" } }, formatDuration(avgPerItem))) : null
              )
            ),
            hasNote ? h("div", { style: { padding: 8, background: "var(--da-surface)", border: "1px solid var(--da-border-2)", borderRadius: 6 } },
              h("div", { style: { fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
                "Session-level notes"),
              h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" } }, s.sessionNote)
            ) : null
          );
        })(),

        // Score breakdown
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 } },
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Pretest baseline"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-ink-3)", marginTop: 4 } }, pretestSum + " / " + max),
            h("div", { style: { fontSize: 10, color: "var(--da-muted)" } }, "unprompted credit only")
          ),
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Posttest score"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-green-text)", marginTop: 4 } }, posttestSum + " / " + max),
            h("div", { style: { fontSize: 10, color: "var(--da-muted)" } }, "after mediation")
          ),
          h("div", { className: "da-card", style: { textAlign: "center" } },
            h("div", { style: { fontSize: 11, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Growth"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: posttestSum - pretestSum >= 0 ? "var(--da-green-text)" : "var(--da-red-text)", marginTop: 4 } },
              (posttestSum - pretestSum >= 0 ? "+" : "") + (posttestSum - pretestSum) + " pts"),
            h("div", { style: { fontSize: 10, color: "var(--da-muted)" } }, "absolute change")
          ),
          // Phase E — Transfer card (only when transfer phase ran)
          transferResults.length > 0 ? h("div", { className: "da-card", style: { textAlign: "center", borderColor: "var(--da-amber-border)", background: "var(--da-amber-tint)" } },
            h("div", { style: { fontSize: 11, color: "var(--da-amber-text)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Transfer probe"),
            h("div", { style: { fontSize: 26, fontWeight: 900, color: "var(--da-amber-text)", marginTop: 4 } }, transferSum + " / " + transferMax),
            h("div", { style: { fontSize: 10, color: "var(--da-amber-text)" } }, "novel items, same construct")
          ) : null
        ),
        // Phase E — Transfer interpretation panel (separate, fuller)
        transferTierObj ? h("div", {
          className: "da-card",
          style: {
            marginBottom: 14, padding: 16,
            background: transferTierObj.id === "strong-transfer" ? "var(--da-green-tint)" :
                        transferTierObj.id === "partial-transfer" ? "var(--da-amber-tint)" :
                        transferTierObj.id === "weak-transfer" ? "var(--da-amber-tint-2)" : "var(--da-red-tint)",
            borderColor: daHex(transferTierObj.color)
          }
        },
          h("div", { style: { fontSize: 11, color: "var(--da-ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 6 } },
            "Transfer interpretation"),
          h("div", { style: { fontSize: 15, fontWeight: 800, color: daHex(transferTierObj.color), marginBottom: 6 } },
            transferTierObj.label),
          h("p", { style: { margin: 0, fontSize: 12.5, color: "var(--da-ink-2)", lineHeight: 1.6 } },
            transferTierObj.desc),
          h("p", { style: { margin: "8px 0 0", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic", lineHeight: 1.55 } },
            "Note: pretest→posttest growth on SAME items conflates memory with learning. Transfer probes the same construct on DIFFERENT surface features — the clearer measure of whether mediation produced generalizable change.")
        ) : null,

        // Mediation scaffold histogram
        h("div", { className: "da-card", style: { marginBottom: 14 } },
          h("h3", { style: { margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } }, "Scaffolds used during mediation"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--da-ink-3)" } },
            ["cue", "leading", "model", "directTeach", "none", "skipped"].filter(function (k) { return scaffoldTypes[k] > 0; }).map(function (k) {
              var labels = { cue: "L1 — Declarative cues", leading: "L2 — Leading questions", model: "L3 — Modeling", directTeach: "L4 — Direct teaching", none: "L0 — Solved unprompted", skipped: "Skipped" };
              return h("div", { key: "da-hist-" + k, style: { display: "flex", justifyContent: "space-between" } },
                h("span", null, labels[k]),
                h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--da-ink)" } }, "×" + scaffoldTypes[k])
              );
            })
          )
        ),

        // Phase I — observation tag pattern card (only if any tags recorded)
        (function () {
          var tagAgg = aggregateObservationTags(s.itemResults);
          if (tagAgg.length === 0) return null;
          return h("div", { className: "da-card", style: { marginBottom: 14 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
              "Observed patterns across items"),
            h("p", { style: { margin: "0 0 10px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
              "Quick-tag chips you recorded on each item, aggregated. Patterns that show up on most items often point to the construct that mattered most."),
            h("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--da-ink-3)" } },
              tagAgg.map(function (t) {
                var bar = Math.min(1, t.count / Math.max(1, s.itemResults.length));
                return h("div", { key: "da-tag-row-" + t.id, style: { display: "flex", alignItems: "center", gap: 8 } },
                  h("span", { style: { minWidth: 170 } }, t.label),
                  h("div", { "aria-hidden": "true", style: { flex: 1, height: 8, background: "var(--da-surface-3)", borderRadius: 4, overflow: "hidden" } },
                    h("div", { style: { height: "100%", width: Math.round(bar * 100) + "%", background: "var(--da-accent)" } })),
                  h("span", { style: { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--da-ink)", minWidth: 30, textAlign: "right" } }, "×" + t.count)
                );
              })
            )
          );
        })(),

        // Per-item MOVEMENT table — one row per item pivoted across phases
        // (pre → mediation → post → transfer), with an explicit movement
        // read. Replaces the old flat chronological list, which made the
        // reader reconstruct each item's arc from interleaved rows. (The
        // chronological record survives in the saved-session detail view.)
        (function () {
          var byItem = {};
          s.sessionItemIds.forEach(function (iid) { byItem[iid] = {}; });
          s.itemResults.forEach(function (r) {
            if (!byItem[r.itemId]) byItem[r.itemId] = {};
            byItem[r.itemId][r.phase] = r;
          });
          var hasTransferCol = s.itemResults.some(function (r) { return r.phase === "transfer"; });
          var cellStyle = { padding: "6px 8px", border: "1px solid var(--da-border)", fontFamily: "ui-monospace, monospace", textAlign: "center" };
          function scoreCell(r, extra) {
            if (!r) return h("td", { style: cellStyle }, h("span", { style: { color: "var(--da-faint)" } }, "—"));
            var marks = (r.finalCorrect ? "✓ " : "✗ ") + r.scoreAwarded + "/5" + (extra || "");
            return h("td", { style: Object.assign({}, cellStyle, { color: r.finalCorrect ? "var(--da-green-text-2)" : "var(--da-red-text)", fontWeight: 700 }) }, marks);
          }
          function movement(pre, post) {
            if (!pre || !post) return { label: "—", color: "var(--da-faint)" };
            if (!pre.finalCorrect && post.finalCorrect) return { label: "▲ gained", color: "var(--da-green-text-2)" };
            if (pre.finalCorrect && post.finalCorrect) return { label: "held", color: "var(--da-muted)" };
            if (pre.finalCorrect && !post.finalCorrect) return { label: "▼ lost", color: "var(--da-red-text)" };
            return { label: "not yet", color: "var(--da-amber-text)" };
          }
          return h("div", { className: "da-card", style: { marginBottom: 14 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } }, "Per-item movement"),
            h("p", { style: { margin: "0 0 8px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
              "Each item's arc across phases. Mediation shows the scaffold level the item needed (L0 = unprompted)."),
            h("div", { style: { overflowX: "auto" } },
              h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
                h("thead", null,
                  h("tr", { style: { background: "var(--da-surface-3)" } },
                    h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Item"),
                    h("th", { scope: "col", style: { textAlign: "center", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Pretest"),
                    h("th", { scope: "col", style: { textAlign: "center", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Mediation"),
                    h("th", { scope: "col", style: { textAlign: "center", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Posttest"),
                    hasTransferCol ? h("th", { scope: "col", style: { textAlign: "center", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Transfer") : null,
                    h("th", { scope: "col", style: { textAlign: "left", padding: "6px 8px", border: "1px solid var(--da-border-2)" } }, "Movement")
                  )
                ),
                h("tbody", null,
                  s.sessionItemIds.map(function (iid, ii) {
                    var item = ITEMS_BY_ID[iid];
                    var ph = byItem[iid] || {};
                    var med = ph.mediation;
                    var mv = movement(ph.pretest, ph.posttest);
                    return h("tr", { key: "da-mv-" + ii },
                      h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)" } }, item ? item.construct : iid),
                      scoreCell(ph.pretest),
                      med
                        ? scoreCell(med, " · L" + med.promptLevelReached + (med.scaffoldLeaked ? " ⚠leak" : ""))
                        : h("td", { style: cellStyle }, h("span", { style: { color: "var(--da-faint)" } }, "—")),
                      scoreCell(ph.posttest),
                      hasTransferCol ? scoreCell(ph.transfer) : null,
                      h("td", { style: { padding: "6px 8px", border: "1px solid var(--da-border)", fontWeight: 700, color: mv.color } }, mv.label)
                    );
                  })
                )
              )
            )
          );
        })(),
        // ── Phase B — AI mediation cycle transcripts ──
        // For each mediation item that has an aiAttemptsLog, render the
        // full Q-A-scaffold-retry transcript so the examiner has the
        // qualitative evidence behind the score for the report.
        (function () {
          var aiItems = (s.itemResults || []).filter(function (r) {
            return r.phase === "mediation" && Array.isArray(r.aiAttemptsLog) && r.aiAttemptsLog.length > 0;
          });
          if (aiItems.length === 0) return null;
          return h("div", { className: "da-card", style: { marginBottom: 14 } },
            h("h3", { style: { margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "var(--da-ink)" } },
              "🤖 AI mediation transcripts"),
            h("p", { style: { margin: "0 0 10px", fontSize: 11, color: "var(--da-muted)", fontStyle: "italic" } },
              "Full Q-A-scaffold-retry log for each mediation item. Useful as qualitative evidence in the report."),
            h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
              aiItems.map(function (r, ri) {
                var item = ITEMS_BY_ID[r.itemId];
                return h("details", { key: "da-ai-trans-" + ri, style: { padding: "8px 10px", background: "var(--da-surface-2)", border: "1px solid var(--da-border)", borderRadius: 8 } },
                  h("summary", { style: { fontSize: 12, fontWeight: 700, color: "var(--da-ink)", cursor: "pointer" } },
                    (item ? item.construct : r.itemId) + " · " + r.aiAttemptsLog.length + " attempt" + (r.aiAttemptsLog.length === 1 ? "" : "s") + " · final L" + r.promptLevelReached + " · " + r.scoreAwarded + " pts"),
                  h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6 } },
                    r.aiAttemptsLog.map(function (a, ai) {
                      var verdictColor = a.verdict === "correct" ? "var(--da-green-text)" : a.verdict === "partial" ? "var(--da-amber-text)" : "var(--da-red-text)";
                      return h("div", { key: "da-ai-trans-" + ri + "-" + ai, style: { padding: 8, background: "var(--da-surface)", border: "1px solid var(--da-border)", borderRadius: 6, fontSize: 11.5 } },
                        h("div", { style: { color: "var(--da-muted)", fontWeight: 700, marginBottom: 3 } },
                          "Attempt " + (ai + 1) + " · ",
                          h("span", { style: { color: verdictColor } }, a.verdict),
                          " · L" + a.levelAfter),
                        h("div", { style: { color: "var(--da-ink)", marginBottom: 2 } }, h("strong", null, "Response: "), "“" + a.response + "”"),
                        a.scaffoldShown ? h("div", { style: { color: "var(--da-amber-text-2)", fontStyle: "italic", marginBottom: 2 } }, "→ Scaffold: " + a.scaffoldShown) : null,
                        a.observationHint ? h("div", { style: { color: "var(--da-muted)" } }, "AI note: " + a.observationHint) : null
                      );
                    })
                  )
                );
              })
            )
          );
        })(),

        // ─── Phase X — Progress monitoring plan panel (collapsible) ───
        monitoringPanelOpen ? (function () {
          var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
          var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
          var pretestSumLocal = sumItemResultScores(pretestResults);
          var posttestSumLocal = sumItemResultScores(posttestResults);
          var modIdxLocal = computeModifiabilityIndex(pretestSumLocal, posttestSumLocal, s.sessionItemIds.length);
          var sessionForGen = Object.assign({}, s, {
            modifiabilityIndex: modIdxLocal,
            modifiabilityTier: modifiabilityTier(modIdxLocal),
            iepGoals: iepGoals && iepGoals.length > 0 ? iepGoals.slice() : []
          });
          var pm = progressMonitoring;
          return h("div", { id: "out-monitoring-anchor", className: "da-card", style: { marginBottom: 14, padding: 16, background: "var(--da-indigo-tint)", borderColor: "var(--da-indigo-border-2)", scrollMarginTop: 16 } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } }, "Phase X · Progress monitoring"),
                h("h3", { style: { margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--da-ink)" } }, "📈 Progress monitoring plan")
              ),
              h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () { generateProgressMonitoringForSession(sessionForGen); },
                  disabled: monitoringBusy,
                  "aria-label": pm ? "Regenerate monitoring plan" : "Generate monitoring plan",
                  style: { padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--da-btn-indigo)", color: "var(--da-on-accent)", fontSize: 12, fontWeight: 800, cursor: monitoringBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: monitoringBusy ? 0.7 : 1 }
                }, monitoringBusy ? "🤖 Drafting…" : (pm ? "Regenerate" : "Generate plan")),
                pm ? h("button", {
                  onClick: function () { setProgressMonitoring(null); setMonitoringError(null); },
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "Clear") : null,
                h("button", {
                  onClick: function () { setMonitoringPanelOpen(false); },
                  "aria-label": "Close monitoring panel",
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "✕ Close")
              )
            ),
            // Caveat
            h("p", { style: { margin: "0 0 10px", fontSize: 12, color: "var(--da-indigo-deep)", lineHeight: 1.55, fontStyle: "italic" } },
              "Plans align with NCII / RTI standards: 4-point rule, trend analysis, minimum 6-8 data points before instructional change. Anchored to evidence-based CBM tools (AIMSweb, FastBridge, DIBELS, mCLASS, iReady). Edit the team-specific details before sharing."),
            // Error
            monitoringError ? h("div", { style: { padding: 10, marginBottom: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, color: "var(--da-red-deep)", fontSize: 12 } }, monitoringError) : null,
            // Empty state
            !pm && !monitoringBusy ? h("div", { style: { padding: 14, textAlign: "center", color: "var(--da-indigo-deep)", fontSize: 13 } },
              h("p", { style: { margin: "0 0 6px" } }, "Click ", h("strong", null, "Generate plan"), " to draft a CBM-anchored monitoring plan with decision rules and a review schedule."),
              iepGoals.length === 0 ? h("p", { style: { margin: 0, fontSize: 11, fontStyle: "italic", color: "var(--da-indigo-text)" } },
                "💡 Tip: Draft IEP goals first — the plan will be more specific when it can monitor each goal individually.") : null
            ) : null,
            // Content
            pm ? h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
              // Overview
              h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-indigo-border-2)", borderRadius: 8 } },
                h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 800, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } }, "Overview"),
                h("textarea", {
                  value: pm.overview, rows: 2,
                  onChange: function (e) { updateMonitoringField("overview", e.target.value); },
                  "aria-label": "Plan overview",
                  style: { width: "100%", padding: "6px 8px", border: "1px solid var(--da-border)", borderRadius: 6, fontFamily: "inherit", fontSize: 13, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }
                })
              ),
              // Goal monitoring entries
              h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-indigo-border-2)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "What to monitor · " + (pm.goalMonitoring || []).length),
                h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
                  (pm.goalMonitoring || []).map(function (g, gi) {
                    return h("div", { key: "da-pm-g-" + gi, style: { padding: 10, background: "var(--da-indigo-tint)", border: "1px solid var(--da-indigo-border)", borderRadius: 6 } },
                      // Summary + probe type row
                      h("div", { style: { display: "flex", gap: 4, alignItems: "flex-start", marginBottom: 6 } },
                        h("input", {
                          type: "text", value: g.goalSummary,
                          onChange: function (e) { updateMonitoringArrayObjectField("goalMonitoring", gi, "goalSummary", e.target.value); },
                          "aria-label": "What's being monitored",
                          style: { flex: 1, padding: "4px 7px", border: "1px solid var(--da-indigo-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--da-ink)", boxSizing: "border-box" }
                        }),
                        h("button", {
                          onClick: function () { removeMonitoringArrayItem("goalMonitoring", gi); },
                          "aria-label": "Remove this monitoring entry",
                          style: { padding: "3px 7px", borderRadius: 4, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                        }, "✕")
                      ),
                      // Probe type + frequency row
                      h("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, marginBottom: 4 } },
                        h("div", null,
                          h("label", { style: { display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Probe / CBM tool"),
                          h("input", {
                            type: "text", value: g.probeType,
                            onChange: function (e) { updateMonitoringArrayObjectField("goalMonitoring", gi, "probeType", e.target.value); },
                            "aria-label": "Probe type / tool",
                            style: { width: "100%", padding: "3px 6px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11.5, boxSizing: "border-box" }
                          })
                        ),
                        h("div", null,
                          h("label", { style: { display: "block", fontSize: 9.5, fontWeight: 700, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em" } }, "Frequency"),
                          h("input", {
                            type: "text", value: g.frequency,
                            onChange: function (e) { updateMonitoringArrayObjectField("goalMonitoring", gi, "frequency", e.target.value); },
                            "aria-label": "Frequency",
                            style: { width: "100%", padding: "3px 6px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11.5, boxSizing: "border-box" }
                          })
                        )
                      ),
                      h("textarea", {
                        value: g.probeDescription, rows: 2, placeholder: "Probe description",
                        onChange: function (e) { updateMonitoringArrayObjectField("goalMonitoring", gi, "probeDescription", e.target.value); },
                        "aria-label": "Probe description",
                        style: { width: "100%", padding: "4px 7px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11.5, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", marginBottom: 4 }
                      }),
                      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 } },
                        h("input", {
                          type: "text", value: g.criterion, placeholder: "Criterion (e.g. ROI 1.0/wk)",
                          onChange: function (e) { updateMonitoringArrayObjectField("goalMonitoring", gi, "criterion", e.target.value); },
                          "aria-label": "Criterion",
                          style: { padding: "3px 6px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }
                        }),
                        h("input", {
                          type: "text", value: g.dataPointsNeeded, placeholder: "Data points needed",
                          onChange: function (e) { updateMonitoringArrayObjectField("goalMonitoring", gi, "dataPointsNeeded", e.target.value); },
                          "aria-label": "Data points needed",
                          style: { padding: "3px 6px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }
                        })
                      ),
                      // Decision rules (read-only since they're prescriptive)
                      g.decisionRules && g.decisionRules.length > 0 ? h("div", { style: { padding: 6, background: "var(--da-surface)", borderLeft: "3px solid var(--da-indigo-mid)", marginBottom: 4 } },
                        h("div", { style: { fontSize: 10, fontWeight: 700, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 } },
                          "Decision rules"),
                        g.decisionRules.map(function (r, ri) {
                          return h("div", { key: "da-pm-r-" + gi + "-" + ri, style: { fontSize: 11, color: "var(--da-indigo-deep)", lineHeight: 1.5 } },
                            "If ", h("strong", null, r.trigger), " → ", r.action);
                        })
                      ) : null,
                      // Tools
                      g.tools && g.tools.length > 0 ? h("div", { style: { fontSize: 10.5, color: "var(--da-ink-3)", fontStyle: "italic" } },
                        "Tools: " + g.tools.join("; ")) : null
                    );
                  })
                )
              ),
              // Review schedule
              (pm.reviewSchedule || []).length > 0 ? h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-indigo-border-2)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "Review schedule"),
                h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55 } },
                  pm.reviewSchedule.map(function (rs, ri) {
                    return h("li", { key: "da-pm-rs-" + ri, style: { marginBottom: 3 } },
                      h("strong", null, rs.timing), " — ", rs.focus);
                  })
                )
              ) : null,
              // Responsibilities
              (pm.responsibilities || []).length > 0 ? h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-indigo-border-2)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-indigo-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "Responsibilities"),
                h("ol", { style: { margin: 0, paddingLeft: 22, fontSize: 12.5, color: "var(--da-ink)", lineHeight: 1.55 } },
                  pm.responsibilities.map(function (r, ri) {
                    return h("li", { key: "da-pm-resp-" + ri, style: { marginBottom: 3 } },
                      h("strong", null, r.role), ": ", r.action, r.cadence ? h("em", { style: { color: "var(--da-ink-3)" } }, " — " + r.cadence) : null);
                  })
                )
              ) : null,
              // Caveat
              pm.caveat ? h("div", { style: { padding: 8, background: "var(--da-amber-tint)", borderLeft: "3px solid var(--da-amber-mid)", fontSize: 11.5, color: "var(--da-orange-deep)", lineHeight: 1.55 } },
                h("strong", { style: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" } }, "⚠ "), pm.caveat
              ) : null,
              // Footer
              h("div", { style: { paddingTop: 6, display: "flex", justifyContent: "flex-end", gap: 6 } },
                h("button", {
                  onClick: function () { copyTextToClipboard(formatMonitoringPlanForClipboard(pm, s.studentNickname)); },
                  "aria-label": "Copy monitoring plan to clipboard",
                  style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "📋 Copy plan")
              )
            ) : null
          );
        })() : null,

        // ─── Phase T — Teacher / case manager handoff panel (collapsible) ───
        teacherPanelOpen ? (function () {
          var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
          var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
          var pretestSumLocal = sumItemResultScores(pretestResults);
          var posttestSumLocal = sumItemResultScores(posttestResults);
          var modIdxLocal = computeModifiabilityIndex(pretestSumLocal, posttestSumLocal, s.sessionItemIds.length);
          var sessionForGen = Object.assign({}, s, {
            modifiabilityIndex: modIdxLocal,
            modifiabilityTier: modifiabilityTier(modIdxLocal)
          });
          var hh = teacherHandoff;
          return h("div", { id: "out-teacher-anchor", className: "da-card", style: { marginBottom: 14, padding: 16, background: "var(--da-sky-tint-2)", borderColor: "var(--da-sky-border-2)", scrollMarginTop: 16 } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-sky-deep)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } }, "Phase T · Teacher handoff"),
                h("h3", { style: { margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--da-ink)" } }, "🧑‍🏫 Classroom handoff page")
              ),
              h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () { generateTeacherHandoffForSession(sessionForGen); },
                  disabled: teacherBusy,
                  "aria-label": hh ? "Regenerate teacher handoff" : "Generate teacher handoff",
                  style: { padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--da-btn-sky)", color: "var(--da-on-accent)", fontSize: 12, fontWeight: 800, cursor: teacherBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: teacherBusy ? 0.7 : 1 }
                }, teacherBusy ? "🤖 Drafting…" : (hh ? "Regenerate" : "Generate handoff")),
                hh ? h("button", {
                  onClick: function () { setTeacherHandoff(null); setTeacherError(null); },
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "Clear") : null,
                h("button", {
                  onClick: function () { setTeacherPanelOpen(false); },
                  "aria-label": "Close teacher handoff panel",
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "✕ Close")
              )
            ),
            // Caveat
            h("p", { style: { margin: "0 0 10px", fontSize: 12, color: "var(--da-sky-deeper)", lineHeight: 1.55, fontStyle: "italic" } },
              "Practical handoff for the implementing teacher / case manager. Technical language OK. Be honest about what didn't work — this audience needs accuracy more than encouragement."),
            // Error
            teacherError ? h("div", { style: { padding: 10, marginBottom: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, color: "var(--da-red-deep)", fontSize: 12 } }, teacherError) : null,
            // Empty state
            !hh && !teacherBusy ? h("div", { style: { padding: 14, textAlign: "center", color: "var(--da-sky-deeper)", fontSize: 13 } },
              h("p", { style: { margin: "0 0 6px" } }, "Click ", h("strong", null, "Generate handoff"), " to draft a one-page handoff for the implementing teacher."),
              h("p", { style: { margin: 0, fontSize: 11, fontStyle: "italic", color: "var(--da-sky-deep)" } },
                "Includes: clinical headline · what works · what to avoid · what to watch for · quick probes · when to re-refer · red flags")
            ) : null,
            // Content
            hh ? h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
              // Headline
              h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-sky-border-2)", borderRadius: 8 } },
                h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 800, color: "var(--da-sky-deep)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } }, "Clinical headline"),
                h("textarea", {
                  value: hh.headline,
                  onChange: function (e) { updateTeacherField("headline", e.target.value); },
                  rows: 2,
                  "aria-label": "Clinical headline",
                  style: { width: "100%", padding: "6px 8px", border: "1px solid var(--da-border)", borderRadius: 6, fontFamily: "inherit", fontSize: 13, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }
                })
              ),
              // What works
              h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-sky-border-2)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-sky-deep)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "✓ What works · " + (hh.whatWorks || []).length),
                h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
                  (hh.whatWorks || []).map(function (w, wi) {
                    return h("div", { key: "da-th-w-" + wi, style: { padding: 8, background: "var(--da-sky-tint)", border: "1px solid var(--da-sky-border)", borderRadius: 6 } },
                      h("div", { style: { display: "flex", gap: 4, alignItems: "flex-start" } },
                        h("input", {
                          type: "text", value: w.title,
                          onChange: function (e) { updateTeacherObjectArrayField("whatWorks", wi, "title", e.target.value); },
                          "aria-label": "Strategy title",
                          style: { flex: 1, padding: "4px 6px", border: "1px solid var(--da-sky-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--da-ink)", boxSizing: "border-box" }
                        }),
                        h("button", {
                          onClick: function () { removeTeacherArrayItem("whatWorks", wi); },
                          "aria-label": "Remove strategy",
                          style: { padding: "3px 7px", borderRadius: 4, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                        }, "✕")
                      ),
                      h("textarea", {
                        value: w.description, rows: 2,
                        onChange: function (e) { updateTeacherObjectArrayField("whatWorks", wi, "description", e.target.value); },
                        "aria-label": "Strategy description",
                        style: { width: "100%", marginTop: 4, padding: "5px 7px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }
                      }),
                      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 } },
                        h("input", {
                          type: "text", value: w.evidenceFromDA || "", placeholder: "Evidence from DA",
                          onChange: function (e) { updateTeacherObjectArrayField("whatWorks", wi, "evidenceFromDA", e.target.value); },
                          "aria-label": "Evidence from DA",
                          style: { padding: "3px 6px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11, boxSizing: "border-box", color: "var(--da-sky-deep)", fontStyle: "italic" }
                        }),
                        h("input", {
                          type: "text", value: w.suggestedFrequency || "", placeholder: "Frequency",
                          onChange: function (e) { updateTeacherObjectArrayField("whatWorks", wi, "suggestedFrequency", e.target.value); },
                          "aria-label": "Suggested frequency",
                          style: { padding: "3px 6px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }
                        })
                      )
                    );
                  })
                )
              ),
              // What did NOT work
              (hh.whatDidNotWork && hh.whatDidNotWork.length > 0) || true ? h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-red-border)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-red-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "✗ What to avoid · " + (hh.whatDidNotWork || []).length),
                h("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
                  (hh.whatDidNotWork || []).map(function (x, xi) {
                    return h("div", { key: "da-th-x-" + xi, style: { display: "flex", gap: 6, alignItems: "flex-start" } },
                      h("div", { style: { fontSize: 11, color: "var(--da-red-text)", fontWeight: 800, paddingTop: 6, minWidth: 16 } }, (xi + 1) + "."),
                      h("textarea", {
                        value: x, rows: 2,
                        onChange: function (e) { updateTeacherArrayItem("whatDidNotWork", xi, e.target.value); },
                        "aria-label": "Avoid item " + (xi + 1),
                        style: { flex: 1, padding: "5px 7px", border: "1px solid var(--da-red-tint-2)", borderRadius: 4, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }
                      }),
                      h("button", {
                        onClick: function () { removeTeacherArrayItem("whatDidNotWork", xi); },
                        "aria-label": "Remove",
                        style: { padding: "3px 7px", borderRadius: 4, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, "✕")
                    );
                  })
                )
              ) : null,
              // Watch for
              h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-sky-border-2)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-sky-deep)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "👀 Watch for · " + (hh.watchFor || []).length),
                h("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
                  (hh.watchFor || []).map(function (x, xi) {
                    return h("div", { key: "da-th-wf-" + xi, style: { display: "flex", gap: 6, alignItems: "flex-start" } },
                      h("div", { style: { fontSize: 11, color: "var(--da-sky-deep)", fontWeight: 800, paddingTop: 6, minWidth: 16 } }, (xi + 1) + "."),
                      h("textarea", {
                        value: x, rows: 2,
                        onChange: function (e) { updateTeacherArrayItem("watchFor", xi, e.target.value); },
                        "aria-label": "Watch for item " + (xi + 1),
                        style: { flex: 1, padding: "5px 7px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }
                      }),
                      h("button", {
                        onClick: function () { removeTeacherArrayItem("watchFor", xi); },
                        "aria-label": "Remove",
                        style: { padding: "3px 7px", borderRadius: 4, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, "✕")
                    );
                  })
                )
              ),
              // Quick probes
              hh.quickProbes && hh.quickProbes.length > 0 ? h("div", { style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-sky-border-2)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-sky-deep)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "🎯 Quick probes for ongoing check-ins · " + hh.quickProbes.length),
                h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
                  hh.quickProbes.map(function (p, pi) {
                    return h("div", { key: "da-th-p-" + pi, style: { padding: 8, background: "var(--da-sky-tint)", border: "1px solid var(--da-sky-border)", borderRadius: 6 } },
                      h("div", { style: { display: "flex", gap: 4, alignItems: "flex-start" } },
                        h("input", {
                          type: "text", value: p.label,
                          onChange: function (e) { updateTeacherObjectArrayField("quickProbes", pi, "label", e.target.value); },
                          "aria-label": "Probe label",
                          style: { flex: 1, padding: "4px 6px", border: "1px solid var(--da-sky-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--da-ink)", boxSizing: "border-box" }
                        }),
                        h("input", {
                          type: "text", value: p.frequency || "", placeholder: "Frequency",
                          onChange: function (e) { updateTeacherObjectArrayField("quickProbes", pi, "frequency", e.target.value); },
                          "aria-label": "Probe frequency",
                          style: { width: 100, padding: "4px 6px", border: "1px solid var(--da-sky-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 11, boxSizing: "border-box" }
                        }),
                        h("button", {
                          onClick: function () { removeTeacherArrayItem("quickProbes", pi); },
                          "aria-label": "Remove probe",
                          style: { padding: "3px 7px", borderRadius: 4, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                        }, "✕")
                      ),
                      h("textarea", {
                        value: p.description, rows: 2,
                        onChange: function (e) { updateTeacherObjectArrayField("quickProbes", pi, "description", e.target.value); },
                        "aria-label": "Probe description",
                        style: { width: "100%", marginTop: 4, padding: "5px 7px", border: "1px solid var(--da-border)", borderRadius: 4, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }
                      })
                    );
                  })
                )
              ) : null,
              // When to re-refer + red flags
              h("div", { style: { padding: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8 } },
                h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-red-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                  "⚠ When to re-refer"),
                h("textarea", {
                  value: hh.whenToReRefer || "", rows: 2,
                  onChange: function (e) { updateTeacherField("whenToReRefer", e.target.value); },
                  "aria-label": "When to re-refer",
                  style: { width: "100%", padding: "6px 8px", border: "1px solid var(--da-red-tint-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box", marginBottom: 6 }
                }),
                hh.redFlags && hh.redFlags.length > 0 ? h("div", null,
                  h("div", { style: { fontSize: 10, fontWeight: 700, color: "var(--da-red-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
                    "Red flags (concrete triggers)"),
                  h("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
                    hh.redFlags.map(function (x, xi) {
                      return h("div", { key: "da-th-rf-" + xi, style: { display: "flex", gap: 6, alignItems: "flex-start" } },
                        h("div", { style: { fontSize: 11, color: "var(--da-red-text)", fontWeight: 800, paddingTop: 6, minWidth: 16 } }, "🚩"),
                        h("textarea", {
                          value: x, rows: 1,
                          onChange: function (e) { updateTeacherArrayItem("redFlags", xi, e.target.value); },
                          "aria-label": "Red flag " + (xi + 1),
                          style: { flex: 1, padding: "4px 7px", border: "1px solid var(--da-red-tint-2)", borderRadius: 4, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }
                        }),
                        h("button", {
                          onClick: function () { removeTeacherArrayItem("redFlags", xi); },
                          "aria-label": "Remove red flag",
                          style: { padding: "3px 7px", borderRadius: 4, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                        }, "✕")
                      );
                    })
                  )
                ) : null
              ),
              // Footer
              h("div", { style: { paddingTop: 6, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () { copyTextToClipboard(formatTeacherHandoffForClipboard(hh, s.studentNickname)); },
                  "aria-label": "Copy handoff to clipboard",
                  style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "📋 Copy handoff"),
                h("button", {
                  onClick: function () {
                    try {
                      document.body.setAttribute("data-da-print-mode", "teacher-handoff");
                      window.print();
                      setTimeout(function () { try { document.body.removeAttribute("data-da-print-mode"); } catch (e) {} }, 500);
                    } catch (e) { addToast("Print is not available in this browser."); }
                  },
                  "aria-label": "Print handoff",
                  title: "Prints just the handoff page in a clean B&W layout",
                  style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-ink-3)", background: "var(--da-surface)", color: "var(--da-ink)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "🖨 Print handoff")
              )
            ) : null
          );
        })() : null,

        // ─── Phase S — Family-facing summary panel (collapsible) ───
        familyPanelOpen ? (function () {
          var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
          var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
          var pretestSumLocal = sumItemResultScores(pretestResults);
          var posttestSumLocal = sumItemResultScores(posttestResults);
          var modIdxLocal = computeModifiabilityIndex(pretestSumLocal, posttestSumLocal, s.sessionItemIds.length);
          var sessionForGen = Object.assign({}, s, {
            modifiabilityIndex: modIdxLocal,
            modifiabilityTier: modifiabilityTier(modIdxLocal)
          });
          return h("div", { id: "out-family-anchor", className: "da-card", style: { marginBottom: 14, padding: 16, background: "var(--da-rose-tint)", borderColor: "var(--da-rose-border)", scrollMarginTop: 16 } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-rose-text)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } }, "Phase S · Family-facing summary"),
                h("h3", { style: { margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--da-ink)" } }, "👨‍👩‍👧 Plain-language letter for the family")
              ),
              h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () { generateFamilySummaryForSession(sessionForGen); },
                  disabled: familyBusy,
                  "aria-label": familySummary ? "Regenerate family summary" : "Generate family summary",
                  style: { padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--da-btn-rose)", color: "var(--da-on-accent)", fontSize: 12, fontWeight: 800, cursor: familyBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: familyBusy ? 0.7 : 1 }
                }, familyBusy ? "🤖 Drafting…" : (familySummary ? "Regenerate" : "Generate summary")),
                familySummary ? h("button", {
                  onClick: function () { setFamilySummary(null); setFamilyError(null); },
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "Clear") : null,
                h("button", {
                  onClick: function () { setFamilyPanelOpen(false); },
                  "aria-label": "Close family summary panel",
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "✕ Close")
              )
            ),
            // Caveat
            h("p", { style: { margin: "0 0 10px", fontSize: 12, color: "var(--da-rose-deep)", lineHeight: 1.55, fontStyle: "italic" } },
              "6th-grade reading level. No clinical jargon. Designed to share with the family before an IEP meeting. Always re-read with the family's literacy level + home language in mind before sending."),
            // Error
            familyError ? h("div", { style: { padding: 10, marginBottom: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, color: "var(--da-red-deep)", fontSize: 12 } }, familyError) : null,
            // Empty state
            !familySummary && !familyBusy ? h("div", { style: { padding: 14, textAlign: "center", color: "var(--da-rose-deep)", fontSize: 13 } },
              h("p", { style: { margin: "0 0 6px" } }, "Click ", h("strong", null, "Generate summary"), " to draft a plain-language letter for the family describing what you learned today."),
              h("p", { style: { margin: 0, fontSize: 11, fontStyle: "italic", color: "var(--da-rose-text)" } },
                "Seven sections: opener · what we learned · strengths · growth areas · what helps · next steps · questions for the team")
            ) : null,
            // Validation warnings (jargon detection)
            familySummary && familySummary._warnings && familySummary._warnings.length > 0 ? h("div", { style: { padding: 8, marginBottom: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 6, fontSize: 11, color: "var(--da-red-deep)" } },
              h("strong", null, "⚠ "), familySummary._warnings.join("; ")
            ) : null,
            // Sections — edit-in-place
            familySummary ? h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
              FAMILY_SECTION_ORDER.map(function (key) {
                if (key === "questions_for_team") {
                  return h("div", { key: "da-fam-sec-" + key, style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-rose-border)", borderRadius: 8 } },
                    h("label", { style: { display: "block", fontSize: 11, fontWeight: 800, color: "var(--da-rose-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 } },
                      FAMILY_SECTION_LABELS[key]),
                    h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
                      (familySummary[key] || []).map(function (q, qi) {
                        return h("div", { key: "da-fam-q-" + qi, style: { display: "flex", gap: 6, alignItems: "flex-start" } },
                          h("div", { style: { fontSize: 12, color: "var(--da-rose-text)", fontWeight: 800, paddingTop: 6, minWidth: 16 } }, (qi + 1) + "."),
                          h("textarea", {
                            value: q, rows: 2,
                            onChange: function (e) { updateFamilyQuestion(qi, e.target.value); },
                            "aria-label": "Family question " + (qi + 1),
                            style: { flex: 1, padding: "5px 8px", border: "1px solid var(--da-border)", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box" }
                          }),
                          h("button", {
                            onClick: function () { removeFamilyQuestion(qi); },
                            "aria-label": "Remove this question",
                            style: { padding: "3px 7px", borderRadius: 5, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                          }, "✕")
                        );
                      }),
                      h("button", {
                        onClick: addFamilyQuestion,
                        "aria-label": "Add another question",
                        style: { padding: "5px 10px", borderRadius: 5, border: "1px dashed var(--da-rose-border)", background: "transparent", color: "var(--da-rose-text)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }
                      }, "+ Add a question")
                    )
                  );
                }
                return h("div", { key: "da-fam-sec-" + key, style: { padding: 10, background: "var(--da-surface)", border: "1px solid var(--da-rose-border)", borderRadius: 8 } },
                  h("label", { style: { display: "block", fontSize: 11, fontWeight: 800, color: "var(--da-rose-text)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 } },
                    FAMILY_SECTION_LABELS[key]),
                  h("textarea", {
                    value: familySummary[key] || "",
                    onChange: function (e) { updateFamilySummaryField(key, e.target.value); },
                    rows: key === "opener" ? 2 : 3,
                    "aria-label": FAMILY_SECTION_LABELS[key],
                    style: { width: "100%", padding: "6px 8px", border: "1px solid var(--da-border)", borderRadius: 6, fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }
                  })
                );
              })
            ) : null,
            // Footer actions
            familySummary ? h("div", { style: { marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--da-rose-border)", display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" } },
              h("button", {
                onClick: function () { copyTextToClipboard(formatFamilySummaryForClipboard(familySummary, s.studentNickname)); },
                "aria-label": "Copy family letter to clipboard",
                style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "📋 Copy as letter"),
              h("button", {
                onClick: function () {
                  try {
                    // Open print dialog — the @media print stylesheet swaps to the letter mode
                    document.body.setAttribute("data-da-print-mode", "family-letter");
                    window.print();
                    // Reset after the print dialog closes
                    setTimeout(function () { try { document.body.removeAttribute("data-da-print-mode"); } catch (e) {} }, 500);
                  } catch (e) { addToast("Print is not available in this browser."); }
                },
                "aria-label": "Print family letter",
                title: "Prints just this letter on a single page in a family-friendly layout",
                style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-ink-3)", background: "var(--da-surface)", color: "var(--da-ink)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "🖨 Print as letter")
            ) : null
          );
        })() : null,

        // ─── Phase Q — Accommodations panel (collapsible) ───
        accomPanelOpen ? (function () {
          var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
          var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
          var pretestSumLocal = sumItemResultScores(pretestResults);
          var posttestSumLocal = sumItemResultScores(posttestResults);
          var modIdxLocal = computeModifiabilityIndex(pretestSumLocal, posttestSumLocal, s.sessionItemIds.length);
          var sessionForGen = Object.assign({}, s, {
            modifiabilityIndex: modIdxLocal,
            modifiabilityTier: modifiabilityTier(modIdxLocal)
          });
          // Group by UDL principle
          var grouped = { "engagement": [], "representation": [], "action-expression": [] };
          accommodations.forEach(function (a, originalIdx) {
            var key = a.udlPrinciple in grouped ? a.udlPrinciple : "representation";
            grouped[key].push({ accom: a, originalIdx: originalIdx });
          });
          return h("div", { id: "out-accom-anchor", className: "da-card", style: { marginBottom: 14, padding: 16, background: "var(--da-green-tint)", borderColor: "var(--da-green-border)", scrollMarginTop: 16 } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-green-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } }, "Phase Q · UDL accommodations"),
                h("h3", { style: { margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--da-ink)" } }, "🛠 Classroom accommodations")
              ),
              h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () { generateAccommodationsForSession(sessionForGen); },
                  disabled: accomBusy,
                  "aria-label": accommodations.length === 0 ? "Generate accommodations from this session" : "Regenerate all accommodations",
                  style: { padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--da-btn-green)", color: "var(--da-on-accent)", fontSize: 12, fontWeight: 800, cursor: accomBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: accomBusy ? 0.7 : 1 }
                }, accomBusy ? "🤖 Drafting…" : (accommodations.length === 0 ? "Generate accommodations" : "Regenerate all")),
                accommodations.length > 0 ? h("button", {
                  onClick: function () { setAccommodations([]); setAccomError(null); },
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "Clear") : null,
                h("button", {
                  onClick: function () { setAccomPanelOpen(false); },
                  "aria-label": "Close accommodations panel",
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "✕ Close")
              )
            ),
            // Caveat
            h("p", { style: { margin: "0 0 10px", fontSize: 12, color: "var(--da-green-deep)", lineHeight: 1.55, fontStyle: "italic" } },
              "Drafted from your DA findings. Each accommodation is anchored to a specific mediation outcome, observation pattern, or construct. Review with classroom realism in mind — the AI can't see your school's logistics. Clinician owns final wording."),
            // Error
            accomError ? h("div", { style: { padding: 10, marginBottom: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, color: "var(--da-red-deep)", fontSize: 12 } }, accomError) : null,
            // Empty state
            accommodations.length === 0 && !accomBusy ? h("div", { style: { padding: 14, textAlign: "center", color: "var(--da-green-deep)", fontSize: 13 } },
              h("p", { style: { margin: "0 0 6px" } }, "Click ", h("strong", null, "Generate accommodations"), " to draft 4-7 specific, evidence-anchored UDL accommodations from this session's mediation findings."),
              h("p", { style: { margin: 0, fontSize: 11, fontStyle: "italic", color: "var(--da-green-text-2)" } },
                "Output is grouped by UDL principle: Engagement, Representation, Action & Expression.")
            ) : null,
            // Grouped accommodation cards
            accommodations.length > 0 ? h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
              Object.keys(grouped).filter(function (k) { return grouped[k].length > 0; }).map(function (principleKey) {
                var items = grouped[principleKey];
                return h("div", { key: "da-accom-group-" + principleKey },
                  h("div", { style: { fontSize: 11, fontWeight: 800, color: "var(--da-green-text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid var(--da-green-border)" } },
                    "UDL · " + UDL_PRINCIPLE_LABELS[principleKey] + " · " + items.length),
                  h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
                    items.map(function (wrap) {
                      var a = wrap.accom;
                      var gi = wrap.originalIdx;
                      return h("div", { key: "da-accom-" + a.id, style: { padding: 12, background: "var(--da-surface)", border: "1px solid var(--da-green-border)", borderRadius: 8 } },
                        // Header row
                        h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6, flexWrap: "wrap" } },
                          h("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
                            h("span", { style: { fontSize: 9.5, fontWeight: 800, color: "var(--da-green-text-2)", textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--da-green-tint-2)", padding: "2px 6px", borderRadius: 4 } },
                              ACCOM_CATEGORY_LABELS[a.category] || a.category)
                          ),
                          h("div", { style: { display: "flex", gap: 4 } },
                            h("button", {
                              onClick: function () { copyTextToClipboard(formatAccommodationForClipboard(a)); },
                              "aria-label": "Copy accommodation to clipboard",
                              style: { padding: "3px 9px", borderRadius: 5, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                            }, "📋 Copy"),
                            h("button", {
                              onClick: function () { regenerateOneAccommodation(gi, sessionForGen); },
                              disabled: accomBusy,
                              "aria-label": "Regenerate this accommodation",
                              style: { padding: "3px 9px", borderRadius: 5, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 10.5, fontWeight: 700, cursor: accomBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: accomBusy ? 0.6 : 1 }
                            }, "🔁"),
                            h("button", {
                              onClick: function () { removeAccommodation(gi); },
                              "aria-label": "Remove this accommodation",
                              style: { padding: "3px 7px", borderRadius: 5, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                            }, "✕")
                          )
                        ),
                        // Title (edit-in-place)
                        h("input", {
                          type: "text", value: a.title,
                          onChange: function (e) { updateAccommodationField(gi, "title", e.target.value); },
                          "aria-label": "Accommodation title",
                          style: { width: "100%", padding: "5px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--da-ink)", boxSizing: "border-box", marginBottom: 6 }
                        }),
                        // Description (edit-in-place)
                        h("textarea", {
                          value: a.description,
                          onChange: function (e) { updateAccommodationField(gi, "description", e.target.value); },
                          rows: 3,
                          "aria-label": "Accommodation description",
                          style: { width: "100%", padding: "5px 8px", border: "1px solid var(--da-border)", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box", marginBottom: 6 }
                        }),
                        // Rationale (edit-in-place, lighter visual treatment)
                        a.rationale !== undefined ? h("div", { style: { padding: 6, background: "var(--da-green-tint)", borderLeft: "3px solid var(--da-green-mid)", fontSize: 11.5, color: "var(--da-green-deep)", lineHeight: 1.5 } },
                          h("strong", { style: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" } }, "Evidence anchor: "),
                          h("input", {
                            type: "text", value: a.rationale,
                            onChange: function (e) { updateAccommodationField(gi, "rationale", e.target.value); },
                            "aria-label": "Accommodation rationale / evidence anchor",
                            style: { width: "calc(100% - 110px)", padding: "2px 6px", border: "1px solid var(--da-green-border-2)", borderRadius: 4, fontFamily: "inherit", fontSize: 11.5, background: "transparent", color: "var(--da-green-deep)" }
                          })
                        ) : null,
                        // Warnings
                        a._warnings && a._warnings.length > 0 ? h("div", { style: { marginTop: 6, padding: 5, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 5, fontSize: 10, color: "var(--da-red-deep)" } },
                          h("strong", null, "⚠ "), a._warnings.join("; ")
                        ) : null
                      );
                    })
                  )
                );
              })
            ) : null,
            // Footer: copy-all
            accommodations.length > 1 ? h("div", { style: { marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--da-green-border)", display: "flex", justifyContent: "flex-end", gap: 6 } },
              h("button", {
                onClick: function () {
                  var all = accommodations.map(function (a, i) { return "── " + (i + 1) + ". " + formatAccommodationForClipboard(a); }).join("\n\n");
                  copyTextToClipboard(all);
                },
                "aria-label": "Copy all accommodations as one text block",
                style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "📋 Copy all accommodations")
            ) : null
          );
        })() : null,

        // ─── Phase K — IEP goals panel (collapsible) ───
        iepPanelOpen ? (function () {
          var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
          var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
          var pretestSumLocal = sumItemResultScores(pretestResults);
          var posttestSumLocal = sumItemResultScores(posttestResults);
          var modIdxLocal = computeModifiabilityIndex(pretestSumLocal, posttestSumLocal, s.sessionItemIds.length);
          var sessionForGen = Object.assign({}, s, {
            modifiabilityIndex: modIdxLocal,
            modifiabilityTier: modifiabilityTier(modIdxLocal)
          });
          return h("div", { id: "out-iep-anchor", className: "da-card", style: { marginBottom: 14, padding: 16, background: "var(--da-amber-tint-3)", borderColor: "var(--da-amber-border-2)", scrollMarginTop: 16 } },
            h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
              h("div", null,
                h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 } }, "Phase K · AI-drafted IEP goals"),
                h("h3", { style: { margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--da-ink)" } }, "🎯 Draft IEP goals from this DA")
              ),
              h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                h("button", {
                  onClick: function () { generateIepGoalsForSession(sessionForGen); },
                  disabled: iepBusy,
                  "aria-label": iepGoals.length === 0 ? "Generate IEP goals from this session" : "Regenerate all IEP goals",
                  style: { padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--da-btn-amber)", color: "var(--da-on-accent)", fontSize: 12, fontWeight: 800, cursor: iepBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: iepBusy ? 0.7 : 1 }
                }, iepBusy ? "🤖 Drafting…" : (iepGoals.length === 0 ? "Generate goals" : "Regenerate all")),
                iepGoals.length > 0 ? h("button", {
                  onClick: function () { setIepGoals([]); setIepError(null); },
                  "aria-label": "Clear all generated goals",
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "Clear") : null,
                h("button", {
                  onClick: function () { setIepPanelOpen(false); },
                  "aria-label": "Close IEP goals panel",
                  style: { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                }, "✕ Close")
              )
            ),
            // Caveat
            h("p", { style: { margin: "0 0 10px", fontSize: 12, color: "var(--da-orange-deep)", lineHeight: 1.55, fontStyle: "italic" } },
              "Drafted from your DA data. The clinician owns final wording — review every goal for accuracy, observability, and fit to this student's context before adding to the IEP. AI cannot judge classroom realism."),
            // Error
            iepError ? h("div", { style: { padding: 10, marginBottom: 10, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 8, color: "var(--da-red-deep)", fontSize: 12 } }, iepError) : null,
            // Empty state
            iepGoals.length === 0 && !iepBusy ? h("div", { style: { padding: 14, textAlign: "center", color: "var(--da-orange-deep)", fontSize: 13 } },
              h("p", { style: { margin: "0 0 6px" } }, "Click ", h("strong", null, "Generate goals"), " to draft 2-4 SMART-format annual goals + short-term objectives from this session's mediation findings."),
              h("p", { style: { margin: 0, fontSize: 11, fontStyle: "italic", color: "var(--da-amber-text-2)" } },
                "Goals are anchored to scaffolds that actually worked + observation patterns recorded during mediation.")
            ) : null,
            // Generated goals list
            iepGoals.length > 0 ? h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
              iepGoals.map(function (g, gi) {
                return h("div", { key: "da-iep-" + g.id, style: { padding: 12, background: "var(--da-surface)", border: "1px solid var(--da-amber-border-2)", borderRadius: 8 } },
                  // Header row
                  h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" } },
                    h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 } },
                      "Goal " + (gi + 1) + " · " + g.domain),
                    h("div", { style: { display: "flex", gap: 4 } },
                      h("button", {
                        onClick: function () { copyTextToClipboard(formatGoalForClipboard(g)); },
                        "aria-label": "Copy goal " + (gi + 1) + " to clipboard",
                        title: "Copy goal + objectives as plain text",
                        style: { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, "📋 Copy"),
                      h("button", {
                        onClick: function () { regenerateOneIepGoal(gi, sessionForGen); },
                        disabled: iepBusy,
                        "aria-label": "Regenerate goal " + (gi + 1),
                        title: "Regenerate this single goal",
                        style: { padding: "4px 10px", borderRadius: 6, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontSize: 10.5, fontWeight: 700, cursor: iepBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: iepBusy ? 0.6 : 1 }
                      }, "🔁 Regenerate"),
                      h("button", {
                        onClick: function () { removeIepGoal(gi); },
                        "aria-label": "Remove goal " + (gi + 1),
                        title: "Drop this goal",
                        style: { padding: "4px 8px", borderRadius: 6, border: "1px solid var(--da-red-border)", background: "transparent", color: "var(--da-red-text)", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
                      }, "✕")
                    )
                  ),
                  // Annual goal — edit-in-place
                  h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Annual goal"),
                  h("textarea", {
                    value: g.annualGoal,
                    onChange: function (e) { updateIepGoalField(gi, "annualGoal", e.target.value); },
                    rows: 3,
                    style: { width: "100%", padding: "6px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, lineHeight: 1.55, resize: "vertical", boxSizing: "border-box", marginBottom: 8 }
                  }),
                  // Rationale
                  g.rationale ? h("div", { style: { marginBottom: 8, padding: 8, background: "var(--da-amber-tint)", borderLeft: "3px solid var(--da-amber-mid)", fontSize: 11.5, color: "var(--da-orange-deep)", lineHeight: 1.5 } },
                    h("strong", { style: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em" } }, "Rationale: "),
                    g.rationale
                  ) : null,
                  // Measurement row
                  h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 } },
                    h("div", null,
                      h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Criterion"),
                      h("input", {
                        type: "text", value: g.measurementCriterion,
                        onChange: function (e) { updateIepGoalField(gi, "measurementCriterion", e.target.value); },
                        style: { width: "100%", padding: "5px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12, boxSizing: "border-box" }
                      })
                    ),
                    h("div", null,
                      h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Evaluation method"),
                      h("input", {
                        type: "text", value: g.evaluationMethod,
                        onChange: function (e) { updateIepGoalField(gi, "evaluationMethod", e.target.value); },
                        style: { width: "100%", padding: "5px 8px", border: "1px solid var(--da-border-2)", borderRadius: 6, fontFamily: "inherit", fontSize: 12, boxSizing: "border-box" }
                      })
                    )
                  ),
                  // Short-term objectives — edit-in-place
                  h("label", { style: { display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--da-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 } }, "Short-term objectives"),
                  h("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
                    (g.shortTermObjectives || []).map(function (sto, stoIdx) {
                      return h("div", { key: "da-iep-sto-" + g.id + "-" + stoIdx, style: { display: "flex", gap: 6, alignItems: "flex-start" } },
                        h("div", { style: { fontSize: 11, color: "var(--da-amber-text-2)", fontWeight: 800, paddingTop: 6, minWidth: 16 } }, (stoIdx + 1) + "."),
                        h("textarea", {
                          value: sto,
                          onChange: function (e) { updateIepShortTermObjective(gi, stoIdx, e.target.value); },
                          rows: 2,
                          style: { flex: 1, padding: "5px 8px", border: "1px solid var(--da-border)", borderRadius: 6, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }
                        })
                      );
                    })
                  ),
                  // Validation warnings (if any)
                  g._warnings && g._warnings.length > 0 ? h("div", { style: { marginTop: 6, padding: 6, background: "var(--da-red-tint)", border: "1px solid var(--da-red-border)", borderRadius: 6, fontSize: 10.5, color: "var(--da-red-deep)" } },
                    h("strong", null, "⚠ "), g._warnings.join("; ")
                  ) : null
                );
              })
            ) : null,
            // Footer: copy-all-as-one-block
            iepGoals.length > 1 ? h("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--da-amber-border-2)", display: "flex", justifyContent: "flex-end", gap: 6 } },
              h("button", {
                onClick: function () {
                  var all = iepGoals.map(function (g, i) { return "── Goal " + (i + 1) + " ──\n" + formatGoalForClipboard(g); }).join("\n\n");
                  copyTextToClipboard(all);
                },
                "aria-label": "Copy all goals as one text block",
                style: { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
              }, "📋 Copy all goals")
            ) : null
          );
        })() : null,

        // Action row
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          h("button", {
            onClick: function () {
              finalizeSession();
              addToast("Session saved.");
            },
            style: { padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--da-btn-green)", color: "var(--da-on-accent)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "✓ Save session"),
          // Phase K — IEP goal generator entry
          !iepPanelOpen ? h("button", {
            onClick: function () { setIepPanelOpen(true); },
            "aria-label": "Open the IEP goal generator panel",
            title: "Draft SMART-format annual goals + short-term objectives from this DA session",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-amber-text-2)", background: "var(--da-amber-tint-3)", color: "var(--da-amber-text-2)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "🎯 Draft IEP goals") : null,
          // Phase Q — UDL accommodations entry
          !accomPanelOpen ? h("button", {
            onClick: function () { setAccomPanelOpen(true); },
            "aria-label": "Open the UDL accommodations panel",
            title: "Draft UDL-aligned classroom accommodations from this DA session",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-green-mid)", background: "var(--da-green-tint)", color: "var(--da-green-text-2)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "🛠 Accommodations") : null,
          // Phase S — Family-facing summary entry
          !familyPanelOpen ? h("button", {
            onClick: function () { setFamilyPanelOpen(true); },
            "aria-label": "Open the family-facing summary panel",
            title: "Draft a plain-language summary to share with the family before an IEP meeting",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-rose-text)", background: "var(--da-rose-tint)", color: "var(--da-rose-text)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "👨‍👩‍👧 Family letter") : null,
          // Phase T — Teacher handoff entry
          !teacherPanelOpen ? h("button", {
            onClick: function () { setTeacherPanelOpen(true); },
            "aria-label": "Open the teacher / case-manager handoff panel",
            title: "Draft a one-page handoff for the implementing teacher",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-sky-deep)", background: "var(--da-sky-tint-2)", color: "var(--da-sky-deep)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "🧑‍🏫 Teacher handoff") : null,
          // Phase X — Monitoring plan entry
          !monitoringPanelOpen ? h("button", {
            onClick: function () { setMonitoringPanelOpen(true); },
            "aria-label": "Open the progress monitoring plan panel",
            title: "Draft a CBM-anchored progress monitoring plan with decision rules",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-indigo-text)", background: "var(--da-indigo-tint)", color: "var(--da-indigo-text)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "📈 Monitoring plan") : null,
          // Generate-all convenience button (only if at least one not yet generated)
          (!iepGoals.length || !accommodations.length || !familySummary || !teacherHandoff || !progressMonitoring) ? h("button", {
            onClick: function () {
              var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
              var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
              var pretestSumLocal = sumItemResultScores(pretestResults);
              var posttestSumLocal = sumItemResultScores(posttestResults);
              var modIdxLocal = computeModifiabilityIndex(pretestSumLocal, posttestSumLocal, s.sessionItemIds.length);
              var sessionForGen = Object.assign({}, s, {
                modifiabilityIndex: modIdxLocal,
                modifiabilityTier: modifiabilityTier(modIdxLocal)
              });
              if (!iepGoals.length) { setIepPanelOpen(true); generateIepGoalsForSession(sessionForGen); }
              if (!accommodations.length) { setAccomPanelOpen(true); generateAccommodationsForSession(sessionForGen); }
              if (!familySummary) { setFamilyPanelOpen(true); generateFamilySummaryForSession(sessionForGen); }
              if (!teacherHandoff) { setTeacherPanelOpen(true); generateTeacherHandoffForSession(sessionForGen); }
              if (!progressMonitoring) { setMonitoringPanelOpen(true); generateProgressMonitoringForSession(Object.assign({}, sessionForGen, { iepGoals: iepGoals && iepGoals.length > 0 ? iepGoals.slice() : [] })); }
              addToast("✨ Generating all outputs in parallel…");
            },
            "aria-label": "Generate all five output panels in parallel",
            title: "Run IEP goals + accommodations + family letter + teacher handoff + monitoring plan in parallel",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-violet-mid-2)", background: "var(--da-violet-tint)", color: "var(--da-violet-mid-2)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "✨ Generate all outputs") : null,
          // Phase E — Print packet
          h("button", {
            onClick: function () {
              try { window.print(); }
              catch (e) { addToast("Print is not available in this browser."); }
            },
            "aria-label": "Print clinical observation report",
            title: "Generates a self-contained black-and-white PDF/print of the session for paste-in to a clinical report.",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-ink-3)", background: "var(--da-surface)", color: "var(--da-ink)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "🖨 Print packet"),
          // Phase D — Export to Report Writer
          h("button", {
            onClick: function () {
              // Compose a synthetic session object that includes the
              // computed mod-index + tier (the live activeSession doesn't
              // have these stamped on it yet — they're only in finalized
              // records). buildDaFactChunks / buildDaNarrativeSection
              // handle both cases.
              var pretestResults = (s.itemResults || []).filter(function (r) { return r.phase === "pretest"; });
              var posttestResults = (s.itemResults || []).filter(function (r) { return r.phase === "posttest"; });
              var pretestSum = sumItemResultScores(pretestResults);
              var posttestSum = sumItemResultScores(posttestResults);
              var modIdx = computeModifiabilityIndex(pretestSum, posttestSum, s.sessionItemIds.length);
              var tier = modifiabilityTier(modIdx);
              var ready = Object.assign({}, s, {
                modifiabilityIndex: modIdx,
                modifiabilityTier: tier,
                // Phase K — include any drafted IEP goals
                iepGoals: iepGoals && iepGoals.length > 0 ? iepGoals.slice() : [],
                // Phase Q — include any drafted accommodations
                accommodations: accommodations && accommodations.length > 0 ? accommodations.slice() : [],
                // Phase S — include any family summary
                familySummary: familySummary || null,
                // Phase T — include any teacher handoff
                teacherHandoff: teacherHandoff || null,
                // Phase X — include any monitoring plan
                progressMonitoring: progressMonitoring || null
              });
              var payload = exportSessionToReportWriter(ready, s.studentNickname);
              if (payload) {
                var extras = [];
                if (iepGoals.length > 0) extras.push(iepGoals.length + " IEP goal" + (iepGoals.length === 1 ? "" : "s"));
                if (accommodations.length > 0) extras.push(accommodations.length + " accommodation" + (accommodations.length === 1 ? "" : "s"));
                if (familySummary) extras.push("family letter");
                if (teacherHandoff) extras.push("teacher handoff");
                if (progressMonitoring) extras.push("monitoring plan");
                var extra = extras.length > 0 ? " + " + extras.join(" + ") : "";
                addToast("📝 Sent to Report Writer (" + payload.factChunks.length + " fact chunks" + extra + "). Open Report Writer to ingest.");
              } else {
                addToast("Could not build export payload.");
              }
            },
            "aria-label": "Send DA findings to Report Writer",
            title: "Stashes DA findings on window.__alloDAExport. Open Report Writer next to ingest them as fact chunks + a pre-drafted section.",
            style: { padding: "10px 18px", borderRadius: 10, border: "1px solid var(--da-accent)", background: "var(--da-blue-tint)", color: "var(--da-accent-text)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }
          }, "📝 Send to Report Writer"),
          h("button", {
            onClick: function () {
              daAskConfirm({
                message: "Discard this session without saving it?",
                confirmLabel: "Discard without saving",
                onConfirm: discardSession
              });
            },
            style: { padding: "10px 16px", borderRadius: 10, border: "1px solid var(--da-border-2)", background: "var(--da-surface)", color: "var(--da-ink-3)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
          }, "Discard without saving")
        ),
        // Phase E — Hidden-onscreen print packet. Made visible only by
        // the @media print CSS rule. Lives inside the summary so it's
        // in the DOM the moment the clinician clicks the print button.
        renderPrintPacket(),
        // Phase S — Hidden-onscreen family letter block. Revealed only when
        // body[data-da-print-mode='family-letter'] is set immediately before
        // window.print() is called from the family panel.
        renderFamilyLetterBlock(),
        // Phase T — Hidden-onscreen teacher handoff print block. Revealed
        // only when body[data-da-print-mode='teacher-handoff'] is set.
        renderTeacherHandoffPrintBlock()
      );
    }
  }

  // ═════════════════════════════════════════════════════════
  // SECTION 5 — Export
  // ═════════════════════════════════════════════════════════
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.DynamicAssessment = DynamicAssessment;
  // Also expose constants for future host integrations / Report Writer.
  // Public read-only query: return DA sessions for a given student nickname,
  // most-recent-first. Used by sibling tools (Student Analytics, Report Writer,
  // etc.) to surface DA findings without coupling to DA's internal storage shape.
  // Returns [] on any failure — never throws.
  function getSessionsByStudent(nickname) {
    if (!nickname || typeof nickname !== "string") return [];
    try {
      var raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return [];
      var state = JSON.parse(raw);
      var sessions = Array.isArray(state && state.sessions) ? state.sessions : [];
      var target = nickname.toLowerCase();
      var matches = sessions.filter(function (s) {
        return s && typeof s.studentNickname === "string" && s.studentNickname.toLowerCase() === target;
      });
      matches.sort(function (a, b) {
        var ad = a && a.dateStarted ? new Date(a.dateStarted).getTime() : 0;
        var bd = b && b.dateStarted ? new Date(b.dateStarted).getTime() : 0;
        return bd - ad;
      });
      return matches;
    } catch (e) { return []; }
  }

  window.AlloModules.DynamicAssessment._meta = {
    version: "1.1.0-uplift", // WCAG/theming/ZPD uplift 2026-07-12 (themed shell, dialog semantics, learning-zone snapshot)
    storageKey: STORAGE_KEY,
    domains: ["math", "reading", "working-memory", "language"],
    itemCounts: {
      math: MATH_ITEMS.length,
      reading: READING_ITEMS.length,
      "working-memory": WM_ITEMS.length,
      language: LANGUAGE_ITEMS.length
    },
    scoreForLevel: scoreForLevel,
    computeModifiabilityIndex: computeModifiabilityIndex,
    modifiabilityTier: modifiabilityTier,
    // Learning-zone (ZPD) snapshot — pure fn; summary card + fact chunks use it.
    computeZpdProfile: computeZpdProfile,
    // Undo + robustness helpers (pure fns; UI wires them).
    rollbackLastItemResult: rollbackLastItemResult,
    computeMiSensitivity: computeMiSensitivity,
    // Psychometrics layer exposed for characterization tests (tests/dynamic_assessment.test.js).
    // Read-only pure fns; zero behavior change.
    transferTier: transferTier,
    aggregateSessionStatistics: aggregateSessionStatistics,
    computeMiZScore: computeMiZScore,
    computeMiPercentile: computeMiPercentile,
    interpretCohenD: interpretCohenD,
    aggregateItemStatistics: aggregateItemStatistics,
    // Phase D — export helpers exposed for cross-tool integration
    buildDaFactChunks: buildDaFactChunks,
    buildDaNarrativeSection: buildDaNarrativeSection,
    exportSessionToReportWriter: exportSessionToReportWriter,
    // Public query helper for sibling tools (Student Analytics, Report Writer, etc.)
    getSessionsByStudent: getSessionsByStudent
  };
  console.log("[CDN] DynamicAssessment loaded (Phases A–BB: math " + MATH_ITEMS.length + ", reading " + READING_ITEMS.length + ", working-memory " + WM_ITEMS.length + ", language " + LANGUAGE_ITEMS.length + " — " + (MATH_ITEMS.length + READING_ITEMS.length + WM_ITEMS.length + LANGUAGE_ITEMS.length) + " items total)");
})();
