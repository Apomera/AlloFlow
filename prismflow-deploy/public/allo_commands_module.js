/**
 * AlloFlow AlloCommands Module (Agentic AlloBot S0)
 * Auto-generated. Source: allo_commands_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlloCommands) {
    console.log('[CDN] AlloCommands already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[AlloCommands] React not found on window'); return; }

const { useState, useEffect, useRef, useMemo, useCallback } = React;
const _mkT = (rawT) => (k, f) => {
  let r = null;
  try {
    r = rawT ? rawT(k) : null;
  } catch (_) {
  }
  return r && r !== k ? r : f || k;
};
function buildAlloCommands(ctx) {
  const t = _mkT(ctx && ctx.t);
  const cmds = [
    // ── Navigate ──
    { id: "open_educator_hub", opensPanel: "educatorHub", icon: "\u{1F3EB}", roles: "teacher", label: t("cmd.open_educator_hub", "Open the Educator Hub"), aliases: ["educator hub", "teacher hub", "hub", "document pipeline", "remediation pipeline", "make a document accessible", "fix a pdf"], hint: t("cmd.open_educator_hub_hint", "Lesson tools + the Document Pipeline card"), run: (c) => {
      c.setShowEducatorHub(true);
      return t("cmd.open_educator_hub_done", "Educator Hub opened \u2014 the Document Pipeline card is near the top.");
    } },
    { id: "open_learning_hub", opensPanel: "learningHub", icon: "\u{1F393}", roles: "all", label: t("cmd.open_learning_hub", "Open the Learning Hub"), aliases: ["learning hub", "student hub", "games"], hint: t("cmd.open_learning_hub_hint", "Games, practice, and study tools"), run: (c) => {
      c.setShowLearningHub(true);
      return t("cmd.open_learning_hub_done", "Learning Hub opened.");
    } },
    { id: "open_document_builder", opensPanel: "exportPreview", icon: "\u{1F4DD}", roles: "teacher", label: t("cmd.open_document_builder", "Open the Document Builder"), aliases: ["document builder", "builder", "export preview", "differentiate"], hint: t("cmd.open_document_builder_hint", "Build and export differentiated documents"), run: (c) => {
      c.openExportPreview();
      return t("cmd.open_document_builder_done", "Document Builder opened.");
    } },
    { id: "open_wizard", icon: "\u{1FA84}", roles: "teacher", label: t("cmd.open_wizard", "Start the lesson wizard"), aliases: ["wizard", "new lesson", "create lesson", "guided setup"], hint: t("cmd.open_wizard_hint", "Step-by-step lesson creation"), run: (c) => {
      c.setShowWizard(true);
      return t("cmd.open_wizard_done", "Lesson wizard started.");
    } },
    { id: "open_notebook", opensPanel: "notebook", icon: "\u{1F4D3}", roles: "all", label: t("cmd.open_notebook", "Open my notebook"), aliases: ["notebook", "notes"], hint: t("cmd.open_notebook_hint", "Saved notes and entries"), run: (c) => {
      c.setShowNotebook(true);
      return t("cmd.open_notebook_done", "Notebook opened.");
    } },
    { id: "open_translate", icon: "\u{1F310}", roles: "teacher", label: t("cmd.open_translate", "Open translation"), aliases: ["translate", "translation", "language", "translate to", "translate into"], hint: t("cmd.open_translate_hint", "Translate the current content"), run: (c) => {
      c.openTranslateModal();
      return t("cmd.open_translate_done", "Translation dialog opened.");
    } },
    { id: "open_class_session", opensPanel: "sessionModal", icon: "\u{1F465}", roles: "teacher", label: t("cmd.open_class_session", "Open class session"), aliases: ["class session", "session", "live class", "class code"], hint: t("cmd.open_class_session_hint", "Start or join a live class session"), run: (c) => {
      c.setShowSessionModal(true);
      return t("cmd.open_class_session_done", "Class session dialog opened.");
    } },
    { id: "open_class_analytics", opensPanel: "classAnalytics", icon: "\u{1F4C8}", roles: "teacher", label: t("cmd.open_class_analytics", "Open class analytics"), aliases: ["analytics", "class data", "progress data"], hint: t("cmd.open_class_analytics_hint", "Whole-class progress"), run: (c) => {
      c.setShowClassAnalytics(true);
      return t("cmd.open_class_analytics_done", "Class analytics opened.");
    } },
    { id: "open_export_menu", opensPanel: "exportMenu", icon: "\u{1F4E4}", roles: "teacher", label: t("cmd.open_export_menu", "Open the export menu"), aliases: ["export", "download menu", "share"], hint: t("cmd.open_export_menu_hint", "Export the current content"), run: (c) => {
      c.setShowExportMenu(true);
      return t("cmd.open_export_menu_done", "Export menu opened.");
    } },
    { id: "open_ai_settings", icon: "\u{1F916}", roles: "teacher", label: t("cmd.open_ai_settings", "Open AI settings"), aliases: ["ai settings", "ai backend", "api key", "model settings"], hint: t("cmd.open_ai_settings_hint", "Configure the AI backend"), run: (c) => {
      c.setShowAIBackendModal(true);
      return t("cmd.open_ai_settings_done", "AI settings opened.");
    } },
    // ── Navigate (added 2026-06-13: dashboard + roster + project-settings parity) ──
    { id: "go_dashboard", opensPanel: "dashboard", icon: "\u{1F3E0}", roles: "all", label: t("cmd.go_dashboard", "Go to the dashboard"), aliases: ["dashboard", "home", "go home", "main view", "overview"], hint: t("cmd.go_dashboard_hint", "Back to the main lesson view"), run: (c) => {
      c.goToDashboard();
      return t("cmd.go_dashboard_done", "Dashboard.");
    } },
    { id: "open_roster", icon: "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}", roles: "teacher", label: t("cmd.open_roster", "Open the class roster"), aliases: ["roster", "manage roster", "class roster", "roster key"], hint: t("cmd.open_roster_hint", "Manage your class groups"), run: (c) => {
      c.openRoster();
      return t("cmd.open_roster_done", "Class roster opened.");
    } },
    { id: "open_project_settings", icon: "\u2699\uFE0F", roles: "teacher", label: t("cmd.open_project_settings", "Open project settings"), aliases: ["project settings", "student settings", "lesson settings", "permissions", "allow ai"], hint: t("cmd.open_project_settings_hint", "Per-project AI, dictation, and Socratic gating"), run: (c) => {
      c.openProjectSettings();
      return t("cmd.open_project_settings_done", "Project settings opened.");
    } },
    // ── Open a tool (added 2026-06-13) — quick-launch the workspaces that normally live behind a
    //    hub card. Each is opensPanel-tagged so launching it CLOSES any open hub / other tool (the
    //    panel-stacking fix) instead of stacking. The ctx open-closures mirror the hub cards. ──
    { id: "open_stem_lab", opensPanel: "stemLab", icon: "\u{1F52C}", roles: "all", label: t("cmd.open_stem_lab", "Open the STEM Lab"), aliases: ["stem lab", "stem", "science lab", "math lab", "simulations", "labs"], hint: t("cmd.open_stem_lab_hint", "Interactive science & math tools"), run: (c) => {
      c.openStemLab();
      return t("cmd.open_stem_lab_done", "STEM Lab opened.");
    } },
    { id: "open_storyforge", opensPanel: "storyForge", icon: "\u270D\uFE0F", roles: "all", label: t("cmd.open_storyforge", "Open StoryForge"), aliases: ["storyforge", "story forge", "creative writing", "write a story"], hint: t("cmd.open_storyforge_hint", "Guided creative writing"), run: (c) => {
      c.openStoryForge();
      return t("cmd.open_storyforge_done", "StoryForge opened.");
    } },
    { id: "open_allohaven", opensPanel: "alloHaven", icon: "\u{1F3DD}\uFE0F", roles: "all", label: t("cmd.open_allohaven", "Open AlloHaven"), aliases: ["allohaven", "allo haven", "haven", "calm space", "regulation space", "break space"], hint: t("cmd.open_allohaven_hint", "A calm, regulating space"), run: (c) => {
      c.openAlloHaven();
      return t("cmd.open_allohaven_done", "AlloHaven opened.");
    } },
    { id: "open_behavior_lens", opensPanel: "behaviorLens", icon: "\u{1F50E}", roles: "teacher", label: t("cmd.open_behavior_lens", "Open the Behavior Lens"), aliases: ["behavior lens", "behaviour lens", "abc data", "behavior data", "fba", "observation"], hint: t("cmd.open_behavior_lens_hint", "Behavior observation & analysis"), run: (c) => {
      c.openBehaviorLens();
      return t("cmd.open_behavior_lens_done", "Behavior Lens opened.");
    } },
    { id: "open_report_writer", opensPanel: "reportWriter", icon: "\u{1F4C4}", roles: "teacher", label: t("cmd.open_report_writer", "Open the Report Writer"), aliases: ["report writer", "write a report", "evaluation report", "psych report", "reports"], hint: t("cmd.open_report_writer_hint", "Draft evaluation reports"), run: (c) => {
      c.openReportWriter();
      return t("cmd.open_report_writer_done", "Report Writer opened.");
    } },
    { id: "open_symbol_studio", opensPanel: "symbolStudio", icon: "\u{1F523}", roles: "teacher", label: t("cmd.open_symbol_studio", "Open Symbol Studio"), aliases: ["symbol studio", "aac", "communication board", "picture symbols", "symbols", "visual schedule"], hint: t("cmd.open_symbol_studio_hint", "AAC boards & visual supports"), run: (c) => {
      c.openSymbolStudio();
      return t("cmd.open_symbol_studio_done", "Symbol Studio opened.");
    } },
    { id: "open_accessibility_lab", opensPanel: "accessibilityLab", icon: "\u267F", roles: "teacher", label: t("cmd.open_accessibility_lab", "Open the Accessibility Lab"), aliases: ["accessibility lab", "a11y lab", "accessibility checker", "wcag", "contrast checker"], hint: t("cmd.open_accessibility_lab_hint", "Check & improve accessibility"), run: (c) => {
      c.openAccessibilityLab();
      return t("cmd.open_accessibility_lab_done", "Accessibility Lab opened.");
    } },
    { id: "open_lumen", opensPanel: "stemLab", icon: "\u{1F4A1}", roles: "teacher", label: t("cmd.open_lumen", "Open Lumen (data canvas)"), aliases: ["lumen", "data canvas", "chart data", "graph data", "progress charts", "visualize data"], hint: t("cmd.open_lumen_hint", "Turn assessment data into charts"), run: (c) => {
      c.openLumen();
      return t("cmd.open_lumen_done", "Lumen opened in the STEM Lab.");
    } },
    { id: "open_community_catalog", opensPanel: "communityCatalog", icon: "\u{1F5C2}\uFE0F", roles: "teacher", label: t("cmd.open_community_catalog", "Open the Community Catalog"), aliases: ["community catalog", "catalog", "shared lessons", "browse lessons", "community"], hint: t("cmd.open_community_catalog_hint", "Browse shared community lessons"), run: (c) => {
      c.openCommunityCatalog();
      return t("cmd.open_community_catalog_done", "Community Catalog opened.");
    } },
    { id: "open_dynamic_assessment", opensPanel: "dynamicAssessment", icon: "\u{1F4CA}", roles: "teacher", label: t("cmd.open_dynamic_assessment", "Open Dynamic Assessment"), aliases: ["dynamic assessment", "progress monitoring", "probe", "cbm", "assessment"], hint: t("cmd.open_dynamic_assessment_hint", "Run a dynamic assessment"), run: (c) => {
      c.openDynamicAssessment();
      return t("cmd.open_dynamic_assessment_done", "Dynamic Assessment opened.");
    } },
    { id: "open_reading_library", opensPanel: "readingLibrary", icon: "\u{1F4DA}", roles: "all", label: t("cmd.open_reading_library", "Open the Reading Library"), aliases: ["reading library", "library", "books", "picture books", "storyweaver", "read a book"], hint: t("cmd.open_reading_library_hint", "Browse open picture books in 10 languages"), run: (c) => {
      c.openReadingLibrary();
      return t("cmd.open_reading_library_done", "Reading Library opened.");
    } },
    // ── Create from this content (teacher) + submit (student) — added 2026-06-13 (Slice 2) ──
    { id: "generate_quiz", icon: "\u{1F4DD}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_quiz", "Make a quiz from this"), aliases: ["make a quiz", "quiz me on this", "create a quiz", "comprehension questions", "generate quiz"], hint: t("cmd.generate_quiz_hint", "Generate a quiz from the current content"), run: (c) => {
      c.generateQuiz();
      return t("cmd.generate_quiz_done", "Generating a quiz from this content\u2026");
    } },
    { id: "generate_glossary", icon: "\u{1F4D6}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_glossary", "Make a vocabulary glossary"), aliases: ["glossary", "vocabulary", "vocab", "key terms", "word list"], hint: t("cmd.generate_glossary_hint", "Generate a glossary from the current content"), run: (c) => {
      c.generateGlossary();
      return t("cmd.generate_glossary_done", "Generating a glossary\u2026");
    } },
    { id: "generate_simplified", icon: "\u{1F4C9}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_simplified", "Simplify this text"), aliases: ["simplify", "simplify this", "make it easier", "lower the reading level", "leveled text", "easier version"], hint: t("cmd.generate_simplified_hint", "Generate a simpler reading level \u2014 say \u201Cto grade N\u201D for a target"), run: (c, params) => {
      c.generateSimplified(params && params.grade ? { grade: params.grade } : {});
      return t("cmd.generate_simplified_done", "Generating a simpler version\u2026");
    } },
    { id: "generate_sentence_frames", icon: "\u{1F9E9}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_sentence_frames", "Make sentence frames"), aliases: ["sentence frames", "sentence starters", "scaffolds", "language support"], hint: t("cmd.generate_sentence_frames_hint", "Generate sentence frames from the current content"), run: (c) => {
      c.generateSentenceFrames();
      return t("cmd.generate_sentence_frames_done", "Generating sentence frames\u2026");
    } },
    { id: "generate_analysis", icon: "\u{1F52C}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_analysis", "Analyze this source"), aliases: ["analyze", "analysis", "source analysis", "analyze this"], hint: t("cmd.generate_analysis_hint", "Run a source analysis on the current content"), run: (c) => {
      c.generateAnalysis();
      return t("cmd.generate_analysis_done", "Analyzing this source\u2026");
    } },
    { id: "submit_work", icon: "\u{1F4E8}", roles: "all", when: (c) => !c.isTeacherMode, label: t("cmd.submit_work", "Submit my work"), aliases: ["submit", "submit my work", "hand it in", "turn in"], hint: t("cmd.submit_work_hint", "Send your work to your teacher"), run: (c) => {
      c.submitWork();
      return t("cmd.submit_work_done", "Opening the submit dialog\u2026");
    } },
    // ── Accessibility self-service (available in every mode) ──
    { id: "font_bigger", icon: "\u{1F50D}", roles: "all", label: t("cmd.font_bigger", "Make the text bigger"), aliases: ["bigger text", "larger text", "increase font", "increase text size", "make text bigger", "zoom in text"], hint: t("cmd.font_bigger_hint", "+2 to the reading font size"), run: (c) => {
      const v = c.fontBigger();
      return t("cmd.font_bigger_done", "Text size increased to ") + v + ".";
    } },
    { id: "font_smaller", icon: "\u{1F50E}", roles: "all", label: t("cmd.font_smaller", "Make the text smaller"), aliases: ["smaller text", "decrease font", "reduce text", "make text smaller"], hint: t("cmd.font_smaller_hint", "\u22122 to the reading font size"), run: (c) => {
      const v = c.fontSmaller();
      return t("cmd.font_smaller_done", "Text size decreased to ") + v + ".";
    } },
    { id: "font_reset", icon: "\u21A9\uFE0F", roles: "all", label: t("cmd.font_reset", "Reset the text size"), aliases: ["reset font", "normal text size", "default font"], hint: t("cmd.font_reset_hint", "Back to the default size"), run: (c) => {
      c.resetFontSize();
      return t("cmd.font_reset_done", "Text size reset to default.");
    } },
    { id: "open_text_settings", icon: "\u{1F524}", roles: "all", label: t("cmd.open_text_settings", "Open text settings"), aliases: ["text settings", "font settings", "dyslexia font", "spacing"], hint: t("cmd.open_text_settings_hint", "Font, spacing, and color options"), run: (c) => {
      c.setShowTextSettings(true);
      return t("cmd.open_text_settings_done", "Text settings opened.");
    } },
    { id: "open_voice_settings", icon: "\u{1F5E3}\uFE0F", roles: "all", label: t("cmd.open_voice_settings", "Open voice settings"), aliases: ["voice settings", "speech settings", "tts settings", "speaking voice", "volume", "louder", "quieter"], hint: t("cmd.open_voice_settings_hint", "Voice, speed, and volume"), run: (c) => {
      c.setShowVoiceSettings(true);
      return t("cmd.open_voice_settings_done", "Voice settings opened.");
    } },
    { id: "read_this_page", opensPanel: "readThisPage", icon: "\u{1F4D6}", roles: "all", label: t("cmd.read_this_page", "Read this page to me"), aliases: ["read aloud", "read page", "read it", "listen"], hint: t("cmd.read_this_page_hint", "Opens the page reader"), run: (c) => {
      c.setShowReadThisPage(true);
      return t("cmd.read_this_page_done", "Page reader opened \u2014 choose where to start.");
    } },
    { id: "toggle_focus_mode", icon: "\u{1F3AF}", roles: "all", label: t("cmd.toggle_focus_mode", "Toggle focus mode"), aliases: ["focus mode", "concentrate", "distraction free"], hint: t("cmd.toggle_focus_mode_hint", "Dim everything but the content"), run: (c) => {
      c.handleToggleFocusMode();
      return t("cmd.toggle_focus_mode_done", "Focus mode toggled.");
    } },
    { id: "toggle_reading_ruler", icon: "\u{1F4CF}", roles: "all", label: t("cmd.toggle_reading_ruler", "Toggle the reading ruler"), aliases: ["reading ruler", "line guide", "ruler"], hint: t("cmd.toggle_reading_ruler_hint", "A movable line guide for tracking"), run: (c) => {
      c.handleToggleReadingRuler();
      return t("cmd.toggle_reading_ruler_done", "Reading ruler toggled.");
    } },
    { id: "toggle_help_mode", icon: "\u2753", roles: "all", label: t("cmd.toggle_help_mode", "Toggle help mode"), aliases: ["help mode", "what does this do", "explain buttons"], hint: t("cmd.toggle_help_mode_hint", "Click anything to learn what it does"), run: (c) => {
      c.handleToggleIsHelpMode();
      return t("cmd.toggle_help_mode_done", "Help mode toggled \u2014 click any control to learn about it.");
    } },
    { id: "toggle_bot", icon: "\u{1F916}", roles: "all", label: t("cmd.toggle_bot", "Show or hide AlloBot"), aliases: ["allobot", "bot", "assistant", "hide bot", "show bot"], hint: t("cmd.toggle_bot_hint", "The assistant character"), run: (c) => {
      c.handleToggleIsBotVisible();
      return t("cmd.toggle_bot_done", "AlloBot visibility toggled.");
    } },
    { id: "toggle_line_focus", icon: "\u{1F526}", roles: "all", label: t("cmd.toggle_line_focus", "Toggle line focus"), aliases: ["line focus", "focus line", "one line"], hint: t("cmd.toggle_line_focus_hint", "Highlight one line at a time"), run: (c) => {
      c.toggleLineFocus();
      return t("cmd.toggle_line_focus_done", "Line focus toggled.");
    } },
    { id: "toggle_visual_supports", icon: "\u{1F5BC}\uFE0F", roles: "all", label: t("cmd.toggle_visual_supports", "Toggle visual supports"), aliases: ["visual supports", "picture supports", "visuals"], hint: t("cmd.toggle_visual_supports_hint", "Picture cues alongside the text"), run: (c) => {
      c.handleToggleVisualSupports();
      return t("cmd.toggle_visual_supports_done", "Visual supports toggled.");
    } },
    { id: "toggle_dictation", icon: "\u{1F3A4}", roles: "all", label: t("cmd.toggle_dictation", "Toggle dictation"), aliases: ["dictation", "speech to text", "type by voice"], hint: t("cmd.toggle_dictation_hint", "Speak instead of typing"), run: (c) => {
      c.toggleDictation();
      return t("cmd.toggle_dictation_done", "Dictation toggled.");
    } },
    { id: "toggle_socratic", icon: "\u{1F4AC}", roles: "all", label: t("cmd.toggle_socratic", "Toggle the Socratic chat"), aliases: ["socratic", "study chat", "thinking partner"], hint: t("cmd.toggle_socratic_hint", "A question-first study companion"), run: (c) => {
      c.handleToggleShowSocraticChat();
      return t("cmd.toggle_socratic_done", "Socratic chat toggled.");
    } },
    { id: "zen_on", icon: "\u{1F9D8}", roles: "all", when: (c) => !c.zenActive, label: t("cmd.zen_on", "Enter zen mode"), aliases: ["zen", "zen mode", "quiet mode", "minimal"], hint: t("cmd.zen_on_hint", "Hide everything but the content"), run: (c) => {
      c.zenOn();
      return t("cmd.zen_on_done", "Zen mode on \u2014 press Ctrl+K and run \u201Cexit zen\u201D to come back.");
    } },
    { id: "zen_off", icon: "\u{1F519}", roles: "all", when: (c) => !!c.zenActive, label: t("cmd.zen_off", "Exit zen mode"), aliases: ["exit zen", "leave zen", "show interface"], hint: t("cmd.zen_off_hint", "Bring the interface back"), run: (c) => {
      c.zenOff();
      return t("cmd.zen_off_done", "Zen mode off.");
    } },
    // ── Display & motion + report-a-problem (added 2026-06-13: palette parity) ──
    { id: "switch_theme", icon: "\u{1F3A8}", roles: "all", label: t("cmd.switch_theme", "Switch the theme (light / dark / high contrast)"), aliases: ["theme", "dark mode", "light mode", "high contrast", "contrast mode", "night mode"], hint: t("cmd.switch_theme_hint", "Cycle light \u2192 dark \u2192 high contrast"), run: (c) => {
      c.toggleTheme();
      return t("cmd.switch_theme_done", "Theme switched \u2014 cycling light, then dark, then high contrast.");
    } },
    { id: "toggle_color_overlay", icon: "\u{1F308}", roles: "all", label: t("cmd.toggle_color_overlay", "Toggle the color overlay"), aliases: ["color overlay", "overlay", "tint", "color filter", "irlen", "screen tint"], hint: t("cmd.toggle_color_overlay_hint", "Cycle a soft colored tint over the page"), run: (c) => {
      c.toggleOverlay();
      return t("cmd.toggle_color_overlay_done", "Color overlay changed.");
    } },
    { id: "toggle_animations", icon: "\u{1F300}", roles: "all", label: t("cmd.toggle_animations", "Turn animations off (reduced motion)"), aliases: ["disable animations", "reduce motion", "stop animations", "no motion", "calm motion"], hint: t("cmd.toggle_animations_hint", "Reduce on-screen motion"), run: (c) => {
      c.toggleAnimations();
      return t("cmd.toggle_animations_done", "Animations toggled.");
    } },
    { id: "report_problem", icon: "\u{1F41E}", roles: "all", label: t("cmd.report_problem", "Report a problem"), aliases: ["report a problem", "feedback", "bug report", "something is broken", "contact support"], hint: t("cmd.report_problem_hint", "Open the problem reporter"), run: (c) => {
      c.openErrorReporter();
      return t("cmd.report_problem_done", "Problem reporter opened.");
    } },
    // ── Pipeline (only offered while remediation results are open) ──
    { id: "pipeline_score", icon: "\u{1F3AF}", roles: "teacher", when: (c) => !!c.getPipelineScore && !!c.getPipelineScore(), label: t("cmd.pipeline_score", "What\u2019s my accessibility score?"), aliases: ["score", "my score", "accessibility score", "how accessible"], hint: t("cmd.pipeline_score_hint", "Speaks the current before \u2192 after"), run: (c) => {
      const s = c.getPipelineScore();
      return s ? t("cmd.pipeline_score_done", "Score: ") + (s.before != null ? s.before + " before, " : "") + s.after + " of 100 now, target " + s.target + "." : t("cmd.pipeline_score_none", "No remediation run is open.");
    } },
    { id: "pipeline_issues", icon: "\u{1F4CB}", roles: "teacher", when: (c) => !!c.getRemainingIssues && c.getRemainingIssues().length > 0, label: t("cmd.pipeline_issues", "Read the remaining issues"), aliases: ["remaining issues", "issues left", "what is left", "problems"], hint: t("cmd.pipeline_issues_hint", "Speaks the top remaining issues"), run: (c) => {
      const iss = c.getRemainingIssues();
      const top = iss.slice(0, 3).map((x, i) => i + 1 + ". " + (typeof x === "string" ? x : x.issue || x.description || "")).join(" ");
      return t("cmd.pipeline_issues_done", "Remaining issues: ") + iss.length + ". " + top + (iss.length > 3 ? " \u2026" + t("cmd.pipeline_issues_more", "and ") + (iss.length - 3) + t("cmd.pipeline_issues_more2", " more in the Issues panel.") : "");
    } },
    { id: "pipeline_downloads", icon: "\u{1F4E5}", roles: "teacher", when: (c) => !!c.pipelineOpen, label: t("cmd.pipeline_downloads", "Go to pipeline downloads"), aliases: ["downloads", "get my files", "tagged pdf"], hint: t("cmd.pipeline_downloads_hint", "Scrolls to the Downloads section"), run: (c) => {
      return c.jumpToPipelineSection("allo-sec-downloads") ? t("cmd.pipeline_downloads_done", "Downloads section \u2014 the tagged PDF is the share-ready copy.") : t("cmd.pipeline_jump_miss", "That section isn\u2019t on screen right now.");
    } },
    { id: "pipeline_verification", icon: "\u2705", roles: "teacher", when: (c) => !!c.pipelineOpen, label: t("cmd.pipeline_verification", "Go to pipeline verification"), aliases: ["verification", "verify section", "evidence"], hint: t("cmd.pipeline_verification_hint", "Scrolls to the Verification section"), run: (c) => {
      return c.jumpToPipelineSection("allo-sec-verify") ? t("cmd.pipeline_verification_done", "Verification section.") : t("cmd.pipeline_jump_miss", "That section isn\u2019t on screen right now.");
    } },
    // ── Show me how (tours by command) ──
    { id: "app_tour", icon: "\u2728", roles: "all", when: (c) => !!c.startAppTour, label: t("cmd.app_tour", "Show me around the app"), aliases: ["tour", "app tour", "show me around", "how does this work", "walkthrough"], hint: t("cmd.app_tour_hint", "A guided tour of the main features"), run: (c) => {
      c.startAppTour();
      return t("cmd.app_tour_done", "Starting the tour \u2014 use Next to walk through.");
    } },
    { id: "pipeline_tour", icon: "\u{1F9ED}", roles: "teacher", when: (c) => !!c.pipelineOpen && !!c.startPipelineTour, label: t("cmd.pipeline_tour", "Show me around these results"), aliases: ["pipeline tour", "explain this screen", "walk me through the results"], hint: t("cmd.pipeline_tour_hint", "A 60-second tour of the remediation results"), run: (c) => {
      c.startPipelineTour("results");
      return t("cmd.pipeline_tour_done", "Starting the results tour.");
    } },
    // ── Parameter-carrying commands (S3) ──
    { id: "create_lesson", icon: "\u{1F9D1}\u200D\u{1F3EB}", roles: "teacher", when: (c) => !!c.startLessonFlow, label: t("cmd.create_lesson", "Create a lesson (tell me the topic)"), aliases: ["create a lesson", "make a lesson", "new lesson about", "plan a lesson", "lesson about"], hint: t("cmd.create_lesson_hint", "Starts the guided flow \u2014 say a topic and grade"), run: (c, p) => {
      c.startLessonFlow(p || {});
      return p && p.topic ? t("cmd.create_lesson_done", "Starting a lesson flow about \u201C") + p.topic + "\u201D" + (p.grade ? t("cmd.create_lesson_done2", " for grade ") + p.grade : "") + t("cmd.create_lesson_done3", " \u2014 AlloBot will guide the next steps.") : t("cmd.create_lesson_done_blank", "Starting the guided lesson flow \u2014 AlloBot will ask for your topic.");
    } },
    { id: "set_font_size", icon: "\u{1F520}", roles: "all", when: (c) => !!c.setFontSizeTo, label: t("cmd.set_font_size", "Set the text size (say a number)"), aliases: ["set text size", "text size to", "font size to"], hint: t("cmd.set_font_size_hint", "e.g. \u201Cset text size to 20\u201D (10\u201332)"), run: (c, p) => {
      const v = c.setFontSizeTo(p && p.size);
      return t("cmd.set_font_size_done", "Text size set to ") + v + ".";
    } },
    { id: "translate_document", icon: "\u{1F310}", roles: "teacher", when: (c) => !!c.pipelineOpen && !!c.prefillTranslateLang, label: t("cmd.translate_document", "Translate this document (say a language)"), aliases: ["translate this document", "translate document to", "translate to", "translate it into"], hint: t("cmd.translate_document_hint", "Pre-fills the language and points at the button"), run: (c, p) => {
      const lang = p && p.language ? String(p.language).trim() : "";
      if (lang) c.prefillTranslateLang(lang);
      try {
        if (c.whereIs) c.whereIs("translate document");
      } catch (_) {
      }
      return lang ? t("cmd.translate_document_done", "Set the translation language to ") + lang + t("cmd.translate_document_done2", " and spotlighted the button \u2014 press Translate to run it. (Translations use AI quota, so the click stays yours.)") : t("cmd.translate_document_pick", "Spotlighted the translation controls \u2014 pick a language and press Translate.");
    } },
    // ── Voice control (S2) ──
    { id: "voice_start", icon: "\u{1F399}\uFE0F", roles: "all", when: (c) => !c.voiceActive && c.voiceAvailable, label: t("cmd.voice_start", "Start voice control"), aliases: ["voice control", "start listening", "voice mode", "hands free"], hint: t("cmd.voice_start_hint", "AlloBot listens for commands until you stop it"), run: (c) => {
      c.startVoiceLoop();
      return t("cmd.voice_start_done", "Voice control on. Say a command like \u201Cbigger text\u201D or \u201Copen the educator hub\u201D. Say \u201Cstop listening\u201D to finish.");
    } },
    { id: "voice_stop", icon: "\u{1F6D1}", roles: "all", when: (c) => !!c.voiceActive, label: t("cmd.voice_stop", "Stop voice control"), aliases: ["stop listening", "stop voice", "voice off"], hint: t("cmd.voice_stop_hint", "Stops the microphone"), run: (c) => {
      c.stopVoiceLoop();
      return t("cmd.voice_stop_done", "Voice control off \u2014 the microphone is released.");
    } },
    // ── More coverage (2026-06-13, discovery w59vf8skj) — each maps to ONE existing host handler
    //    (verified by symbol in AlloFlowANTI.txt). Grouped via CMD_GROUP / CMD_CONTEXT above. ──
    { id: "stop_reading", icon: "\u23F9\uFE0F", roles: "all", label: t("cmd.stop_reading", "Stop reading aloud"), aliases: ["stop reading", "stop talking", "be quiet", "silence", "stop speech", "stop the voice"], hint: t("cmd.stop_reading_hint", "Interrupt the current text-to-speech"), run: (c) => {
      c.stopReading();
      return t("cmd.stop_reading_done", "Stopped reading aloud.");
    } },
    { id: "toggle_mute", icon: "\u{1F507}", roles: "all", label: t("cmd.toggle_mute", "Mute or unmute all audio"), aliases: ["mute", "unmute", "mute audio", "sound off", "sound on", "silence audio"], hint: t("cmd.toggle_mute_hint", "Toggle all app audio"), run: (c) => {
      const m = c.toggleMute();
      return m ? t("cmd.toggle_mute_on", "Audio muted.") : t("cmd.toggle_mute_off", "Audio unmuted.");
    } },
    { id: "cycle_reading_theme", icon: "\u{1F3A8}", roles: "all", label: t("cmd.cycle_reading_theme", "Change the reading theme"), aliases: ["reading theme", "next reading theme", "sepia", "dyslexia theme", "reading color", "paper color"], hint: t("cmd.cycle_reading_theme_hint", "Cycle warm, sepia, dark, dyslexia-friendly, and more"), run: (c) => {
      const th = c.cycleReadingTheme();
      return t("cmd.cycle_reading_theme_done", "Reading theme: ") + th + ".";
    } },
    { id: "line_spacing_more", icon: "\u2195\uFE0F", roles: "all", label: t("cmd.line_spacing_more", "Increase line spacing"), aliases: ["more line spacing", "increase spacing", "wider lines", "space out lines"], hint: t("cmd.line_spacing_more_hint", "+0.1 to the line height"), run: (c) => {
      const v = c.lineSpacingMore();
      return t("cmd.line_spacing_more_done", "Line spacing set to ") + v + ".";
    } },
    { id: "line_spacing_less", icon: "\u{1F90F}", roles: "all", label: t("cmd.line_spacing_less", "Decrease line spacing"), aliases: ["less line spacing", "decrease spacing", "tighter lines"], hint: t("cmd.line_spacing_less_hint", "\u22120.1 to the line height"), run: (c) => {
      const v = c.lineSpacingLess();
      return t("cmd.line_spacing_less_done", "Line spacing set to ") + v + ".";
    } },
    { id: "open_study_timer", icon: "\u23F2\uFE0F", roles: "all", label: t("cmd.open_study_timer", "Start a study timer"), aliases: ["study timer", "timer", "pomodoro", "focus timer", "countdown"], hint: t("cmd.open_study_timer_hint", "A focus / break timer"), run: (c) => {
      c.openStudyTimer();
      return t("cmd.open_study_timer_done", "Study timer opened.");
    } },
    { id: "open_sel_hub", opensPanel: "selHub", icon: "\u{1F49A}", roles: "all", label: t("cmd.open_sel_hub", "Open the SEL Hub"), aliases: ["sel hub", "social emotional", "feelings", "check in", "emotions", "calm corner"], hint: t("cmd.open_sel_hub_hint", "Social-emotional learning tools"), run: (c) => {
      c.openSelHub();
      return t("cmd.open_sel_hub_done", "SEL Hub opened.");
    } },
    { id: "open_submission_inbox", icon: "\u{1F4E5}", roles: "teacher", label: t("cmd.open_submission_inbox", "Open the submission inbox"), aliases: ["submission inbox", "submissions", "student work", "turned in", "inbox"], hint: t("cmd.open_submission_inbox_hint", "Review work students have submitted"), run: (c) => {
      c.openSubmissionInbox();
      return t("cmd.open_submission_inbox_done", "Submission inbox opened.");
    } },
    { id: "toggle_cloud_sync", icon: "\u2601\uFE0F", roles: "teacher", label: t("cmd.toggle_cloud_sync", "Turn cloud sync on or off"), aliases: ["cloud sync", "sync", "cloud save", "backup", "enable sync"], hint: t("cmd.toggle_cloud_sync_hint", "Sync your work to the cloud (asks consent the first time)"), run: (c) => {
      const r = c.toggleCloudSync();
      return r === "off" ? t("cmd.toggle_cloud_sync_off", "Cloud sync turned off.") : t("cmd.toggle_cloud_sync_consent", "Opening the cloud-sync consent dialog \u2014 confirm there to turn it on.");
    } },
    { id: "generate_outline", icon: "\u{1F5C2}\uFE0F", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_outline", "Make a concept outline"), aliases: ["outline", "concept outline", "make an outline", "structure", "summary outline"], hint: t("cmd.generate_outline_hint", "Generate an outline from the current content"), run: (c) => {
      c.generateOutline();
      return t("cmd.generate_outline_done", "Generating an outline\u2026");
    } },
    { id: "export_pack", icon: "\u{1F4E6}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.export_pack", "Download the lesson pack"), aliases: ["export pack", "download pack", "download lesson", "save lesson", "export html"], hint: t("cmd.export_pack_hint", "Download the lesson as a self-contained file"), run: (c) => {
      c.exportPack();
      return t("cmd.export_pack_done", "Preparing the lesson pack download\u2026");
    } },
    // ── Round-2 coverage (2026-06-14, discovery wfi4bz28q) — each maps to ONE App-scope handler
    //    (verified by symbol). pipeline_* gate on pipelineOpen / pipelineFixRunning. ──
    { id: "launch_flashcards", icon: "\u{1F0CF}", roles: "all", when: (c) => !!c.contentIsGlossary, label: t("cmd.launch_flashcards", "Study with flashcards"), aliases: ["flashcards", "flash cards", "study cards", "review cards", "study mode"], hint: t("cmd.launch_flashcards_hint", "Study this glossary as a flashcard deck"), run: (c) => {
      c.launchFlashcards();
      return t("cmd.launch_flashcards_done", "Flashcards ready.");
    } },
    { id: "open_persona_chat", icon: "\u{1F3AD}", roles: "all", label: t("cmd.open_persona_chat", "Open Persona interview"), aliases: ["persona", "interview", "interview mode", "talk to a character", "role play", "historical figure"], hint: t("cmd.open_persona_chat_hint", "Interview an AI persona about this topic"), run: (c) => {
      c.openPersona();
      return t("cmd.open_persona_chat_done", "Persona interview opened.");
    } },
    { id: "clear_my_answers", icon: "\u{1F9F9}", roles: "all", when: (c) => !!c.contentLoaded, label: t("cmd.clear_my_answers", "Clear my answers (start over)"), aliases: ["clear answers", "reset answers", "start over", "erase my answers", "redo activity"], hint: t("cmd.clear_my_answers_hint", "Reset your responses on this activity"), run: (c) => {
      c.resetScaffolds();
      return t("cmd.clear_my_answers_done", "Confirm in the dialog to clear your answers.");
    } },
    { id: "clear_workspace", icon: "\u{1F5D1}\uFE0F", roles: "teacher", destructive: true, label: t("cmd.clear_workspace", "Clear everything and start fresh"), aliases: ["clear workspace", "clear all", "start fresh", "clear history", "reset everything", "blank slate"], hint: t("cmd.clear_workspace_hint", "Removes the current content and history \u2014 asks first"), run: (c) => {
      c.clearWorkspace();
      return t("cmd.clear_workspace_done", "Workspace cleared.");
    } },
    { id: "undo_settings", icon: "\u23EA", roles: "teacher", label: t("cmd.undo_settings", "Undo my last settings change"), aliases: ["undo settings", "restore settings", "revert settings", "undo that change"], hint: t("cmd.undo_settings_hint", "Restore the previous lesson settings (not generated content)"), run: (c) => {
      c.restoreLastSettings();
      return t("cmd.undo_settings_done", "Restored your previous settings (if there was a change to undo).");
    } },
    { id: "pipeline_fix_again", icon: "\u{1F501}", roles: "teacher", when: (c) => !!c.pipelineOpen && !c.pipelineFixRunning, label: t("cmd.pipeline_fix_again", "Run the accessibility fix again"), aliases: ["fix again", "run again", "keep fixing", "improve the score", "another round"], hint: t("cmd.pipeline_fix_again_hint", "Another remediation pass to push the score higher"), run: (c) => {
      c.rerunPipelineFix();
      return t("cmd.pipeline_fix_again_done", "Running another remediation pass\u2026");
    } },
    { id: "pipeline_stop", icon: "\u{1F6D1}", roles: "teacher", when: (c) => !!c.pipelineFixRunning, label: t("cmd.pipeline_stop", "Stop the running fix"), aliases: ["stop fixing", "stop the fix", "halt remediation", "cancel fix"], hint: t("cmd.pipeline_stop_hint", "Stop after the current round \u2014 keeps what\u2019s done"), run: (c) => {
      c.stopPipelineFix();
      return t("cmd.pipeline_stop_done", "Stopping after the current round.");
    } },
    { id: "set_ui_language", icon: "\u{1F310}", roles: "all", label: t("cmd.set_ui_language", "Change the interface language"), aliases: ["interface language", "app language", "ui language", "menu language", "change interface language", "language of the app", "change language", "switch language", "my language"], hint: t("cmd.set_ui_language_hint", "Jump to the language picker in the header"), run: (c) => {
      return c.spotlightUiLanguage() ? t("cmd.set_ui_language_done", "Pointed you to the language picker in the header \u2014 choose your language there.") : t("cmd.set_ui_language_miss", "The interface-language picker is in the top menu bar.");
    } },
    { id: "pipeline_new_doc", icon: "\u{1F195}", roles: "teacher", destructive: true, when: (c) => !!c.pipelineOpen, label: t("cmd.pipeline_new_doc", "Start over with a new document"), aliases: ["new document", "new pdf", "another document", "clear pipeline", "upload new"], hint: t("cmd.pipeline_new_doc_hint", "Clear this result and upload a new file"), run: (c) => {
      c.startNewPdfAudit();
      return t("cmd.pipeline_new_doc_done", "Cleared \u2014 upload a new document to begin.");
    } }
  ];
  const isStudentish = !!(ctx.isStudentLinkMode || ctx.isIndependentMode);
  return cmds.filter((c) => (c.roles === "all" || !isStudentish) && (!c.when || (() => {
    try {
      return !!c.when(ctx);
    } catch (_) {
      return false;
    }
  })()));
}
async function routeUtterance(ctx, rawText, opts = {}) {
  const text = String(rawText || "").trim();
  if (!text || text.length > 200) return null;
  const t = _mkT(ctx && ctx.t);
  const _whereM = text.match(/^(?:where(?:'s| is| are)?|find|locate|show me where)\s+(?:the\s+|my\s+|is\s+|are\s+)?(.{2,60}?)\??$/i);
  if (_whereM && !opts.preview && typeof ctx.whereIs === "function") {
    const narration = ctx.whereIs(_whereM[1].trim());
    if (narration) return { handled: true, narration, commandId: "where_is", via: "where-is" };
  }
  const _grammars = [
    { id: "create_lesson", re: /^(?:create|make|start|build|plan)\s+(?:a\s+|new\s+)?lesson\s*(?:about|on)?\s*(.*?)(?:\s+for\s+(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade(?:rs)?)?)?\s*\??$/i, params: (m) => ({ topic: (m[1] || "").trim() || null, grade: m[2] || null }) },
    { id: "set_font_size", re: /^(?:set\s+)?(?:the\s+)?(?:text|font)\s*(?:size)?\s*(?:to)?\s*(\d{1,2})\s*\.?$/i, params: (m) => ({ size: m[1] }) },
    { id: "translate_document", re: /^translate\s+(?:this|the\s+document|document|it)?\s*(?:to|into)\s+([a-z\u00C0-\u024F\s()-]{2,40})\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: "generate_simplified", re: /^(?:simplify|make (?:this|it) (?:easier|simpler)|lower the (?:reading )?level)(?:\s+(?:this|it))?(?:\s+(?:to|for)?\s*(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?)?\s*\??$/i, params: (m) => ({ grade: m[1] || null }) }
  ];
  const commands = buildAlloCommands(ctx);
  const _runCmd = (cmd, via, params) => {
    // preview mode (used by the bot chat): report the match WITHOUT running it,
    // so the chat can ask the user to confirm before any side effect fires.
    if (opts.preview) return { handled: false, preview: true, commandId: cmd.id, label: cmd.label, params: params || {}, via, destructive: !!cmd.destructive };
    if (cmd.destructive && !opts.confirmed) return { handled: true, narration: t("router.needs_confirm", "That action needs confirmation \u2014 use Ctrl+K to run it."), commandId: cmd.id, via };
    if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
      try {
        ctx.closeOtherPanels(cmd.opensPanel);
      } catch (_) {
      }
    }
    let msg = null;
    try {
      msg = cmd.run(ctx, params || {});
    } catch (e) {
      return { handled: true, narration: t("router.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), commandId: cmd.id, via };
    }
    return { handled: true, narration: msg || t("router.done", "Done."), commandId: cmd.id, via };
  };
  for (const g of _grammars) {
    const m = text.match(g.re);
    if (m) {
      const cmd = commands.find((c) => c.id === g.id);
      if (cmd) return _runCmd(cmd, "grammar", g.params(m));
    }
  }
  let best = null, bestScore = 0;
  for (const c of commands) {
    const s = scoreCommand(c, text);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  // The Ctrl+K palette / voice loop accept a 60+ match. The bot CHAT (preview)
  // demands a stronger 80+ match on a >=3 char utterance, so a stray "hi"/"a"
  // opener can't be read as a command (it would only be proposed, but we still
  // avoid the noise). AI-classified matches below still apply in preview.
  if (bestScore >= 60 && (!opts.preview || (bestScore >= 80 && text.length >= 3))) return _runCmd(best, "deterministic");
  if (!opts.allowAi || typeof ctx.callGemini !== "function") return null;
  if (text.split(/\s+/).length > 14) return null;
  try {
    const menu = commands.map((c) => c.id + ": " + c.label + (c.aliases && c.aliases.length ? " (" + c.aliases.slice(0, 3).join(", ") + ")" : "")).join("\n");
    const out = await ctx.callGemini("A user typed a request to an education app's assistant. If it clearly maps to ONE of these app commands, return it; otherwise commandId must be null. Commands:\n" + menu + '\n\nUser: "' + text.replace(/"/g, "'") + '"\n\nReturn ONLY JSON: {"commandId": string | null, "params": object, "confidence": number between 0 and 1}. params carries values the user stated (e.g. {"topic": "photosynthesis", "grade": "5"} or {"size": "20"} or {"language": "Vietnamese"}) \u2014 empty object if none. Use null commandId unless you are confident they want the APP ACTION (not a content question).');
    const m = String(out || "").match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : String(out));
    if (j && j.commandId && typeof j.confidence === "number" && j.confidence >= 0.7) {
      const cmd = commands.find((c) => c.id === j.commandId);
      if (cmd) return _runCmd(cmd, "ai", j.params || {});
    }
  } catch (_) {
  }
  return null;
}
// Run a specific command by id (used by the bot chat AFTER the user confirms a
// previewed match). Mirrors routeUtterance's _runCmd side-effect handling.
function runCommandById(ctx, id, params, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const commands = buildAlloCommands(ctx);
  const cmd = commands.find((c) => c.id === id);
  if (!cmd) return null;
  if (cmd.destructive && !opts.confirmed) return { handled: true, narration: t("router.needs_confirm", "That action needs confirmation — use Ctrl+K to run it."), commandId: cmd.id, via: "confirm" };
  if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
    try {
      ctx.closeOtherPanels(cmd.opensPanel);
    } catch (_) {
    }
  }
  try {
    const msg = cmd.run(ctx, params || {});
    return { handled: true, narration: msg || t("router.done", "Done."), commandId: cmd.id, via: "confirm" };
  } catch (e) {
    return { handled: true, narration: t("router.failed", "That didn’t work: ") + (e && e.message || "unknown"), commandId: cmd.id, via: "confirm" };
  }
}
function createVoiceLoop(getCtx) {
  let rec = null, active = false, errStreak = 0;
  const announce = (msg) => {
    const c = getCtx();
    try {
      if (window.alloAnnounce) window.alloAnnounce(msg);
    } catch (_) {
    }
    try {
      if (c && c.addToast) c.addToast(msg, "info");
    } catch (_) {
    }
  };
  const stop = (reason) => {
    if (!active) return;
    active = false;
    try {
      if (rec) {
        rec.onend = null;
        rec.stop();
      }
    } catch (_) {
    }
    rec = null;
    const c = getCtx();
    try {
      if (c && c.setVoiceActive) c.setVoiceActive(false);
    } catch (_) {
    }
    if (reason) announce(reason);
  };
  const start = () => {
    const c = getCtx();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      announce("Voice control isn\u2019t available in this browser.");
      return false;
    }
    if (active) return true;
    try {
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = c && c.voiceLang || "en-US";
      rec.onresult = async (ev) => {
        errStreak = 0;
        const last = ev.results[ev.results.length - 1];
        if (!last || !last.isFinal) return;
        const text = String(last[0] && last[0].transcript || "").trim();
        if (!text) return;
        const cc = getCtx();
        if (/^(stop listening|stop voice|voice off)\b/i.test(text)) {
          stop("Voice control off \u2014 the microphone is released.");
          return;
        }
        const r = await routeUtterance(cc, text, { allowAi: true });
        if (r && r.handled) announce(r.narration);
        else announce("Didn\u2019t catch a command in \u201C" + text.slice(0, 60) + "\u201D \u2014 try \u201Cbigger text\u201D or \u201Copen the educator hub\u201D.");
      };
      rec.onerror = (ev) => {
        errStreak++;
        if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) {
          stop("Microphone permission was denied \u2014 voice control stopped.");
          return;
        }
        if (errStreak >= 3) stop("Voice control stopped after repeated microphone errors.");
      };
      rec.onend = () => {
        if (active) {
          try {
            rec.start();
          } catch (_) {
            stop("Voice control stopped.");
          }
        }
      };
      rec.start();
      active = true;
      errStreak = 0;
      try {
        if (c && c.setVoiceActive) c.setVoiceActive(true);
      } catch (_) {
      }
      try {
        window.addEventListener("pagehide", () => stop(), { once: true });
      } catch (_) {
      }
      return true;
    } catch (e) {
      announce("Voice control could not start: " + (e && e.message || "unknown"));
      return false;
    }
  };
  return { start, stop: () => stop("Voice control off \u2014 the microphone is released."), isActive: () => active };
}
function scoreCommand(cmd, q) {
  if (!q) return 1;
  const needle = q.toLowerCase().trim();
  let best = 0;
  const texts = [cmd.label].concat(cmd.aliases || []);
  for (const raw of texts) {
    const s = String(raw || "").toLowerCase();
    if (s === needle) best = Math.max(best, 100);
    else if (s.startsWith(needle)) best = Math.max(best, 80);
    else if (s.split(/\s+/).some((w) => w.startsWith(needle))) best = Math.max(best, 60);
    else if (s.includes(needle)) best = Math.max(best, 40);
  }
  if (best < 30 && cmd.hint) {
    const h = String(cmd.hint).toLowerCase();
    if (h.includes(needle) || h.split(/\s+/).some((w) => w.startsWith(needle))) best = 30;
  }
  return best;
}
const CMD_GROUP = {
  open_educator_hub: "navigate",
  open_learning_hub: "navigate",
  open_document_builder: "navigate",
  open_wizard: "navigate",
  open_notebook: "navigate",
  open_translate: "navigate",
  open_class_session: "navigate",
  open_class_analytics: "navigate",
  open_export_menu: "navigate",
  open_ai_settings: "navigate",
  go_dashboard: "navigate",
  open_roster: "navigate",
  open_project_settings: "navigate",
  generate_quiz: "create",
  generate_glossary: "create",
  generate_simplified: "create",
  generate_sentence_frames: "create",
  generate_analysis: "create",
  create_lesson: "create",
  submit_work: "create",
  font_bigger: "accessibility",
  font_smaller: "accessibility",
  font_reset: "accessibility",
  open_text_settings: "accessibility",
  open_voice_settings: "accessibility",
  read_this_page: "accessibility",
  toggle_focus_mode: "accessibility",
  toggle_reading_ruler: "accessibility",
  toggle_help_mode: "accessibility",
  toggle_bot: "accessibility",
  toggle_line_focus: "accessibility",
  toggle_visual_supports: "accessibility",
  toggle_dictation: "accessibility",
  toggle_socratic: "accessibility",
  zen_on: "accessibility",
  zen_off: "accessibility",
  switch_theme: "display",
  toggle_color_overlay: "display",
  toggle_animations: "display",
  pipeline_score: "pipeline",
  pipeline_issues: "pipeline",
  pipeline_downloads: "pipeline",
  pipeline_verification: "pipeline",
  app_tour: "help",
  pipeline_tour: "help",
  report_problem: "help",
  voice_start: "voice",
  voice_stop: "voice",
  open_stem_lab: "tools",
  open_storyforge: "tools",
  open_allohaven: "tools",
  open_behavior_lens: "tools",
  open_report_writer: "tools",
  open_symbol_studio: "tools",
  open_accessibility_lab: "tools",
  open_lumen: "tools",
  open_community_catalog: "tools",
  open_dynamic_assessment: "tools",
  open_reading_library: "tools",
  stop_reading: "accessibility",
  toggle_mute: "accessibility",
  line_spacing_more: "accessibility",
  line_spacing_less: "accessibility",
  open_study_timer: "accessibility",
  cycle_reading_theme: "display",
  set_ui_language: "display",
  open_sel_hub: "tools",
  open_submission_inbox: "navigate",
  toggle_cloud_sync: "navigate",
  generate_outline: "create",
  export_pack: "create",
  launch_flashcards: "create",
  clear_my_answers: "create",
  clear_workspace: "create",
  undo_settings: "create",
  open_persona_chat: "navigate",
  pipeline_fix_again: "pipeline",
  pipeline_stop: "pipeline",
  pipeline_new_doc: "pipeline"
};
const CMD_CONTEXT = {
  pipeline_score: ["pipeline"],
  pipeline_issues: ["pipeline"],
  pipeline_downloads: ["pipeline"],
  pipeline_verification: ["pipeline"],
  pipeline_tour: ["pipeline"],
  translate_document: ["pipeline"],
  open_document_builder: ["educatorHub", "content"],
  open_wizard: ["educatorHub"],
  create_lesson: ["educatorHub"],
  open_translate: ["educatorHub", "content"],
  open_class_session: ["educatorHub"],
  open_class_analytics: ["educatorHub", "behaviorLens"],
  open_roster: ["educatorHub"],
  open_project_settings: ["educatorHub"],
  open_notebook: ["learningHub"],
  toggle_socratic: ["learningHub"],
  generate_quiz: ["content"],
  generate_glossary: ["content"],
  generate_simplified: ["content", "reading"],
  generate_sentence_frames: ["content"],
  generate_analysis: ["content"],
  open_export_menu: ["content"],
  read_this_page: ["learningHub", "symbolStudio", "stemLab", "content", "reading"],
  font_bigger: ["reading"],
  font_smaller: ["reading"],
  toggle_reading_ruler: ["reading"],
  toggle_line_focus: ["reading"],
  toggle_color_overlay: ["reading"],
  zen_off: ["reading"],
  toggle_visual_supports: ["symbolStudio"],
  open_voice_settings: ["symbolStudio"],
  toggle_focus_mode: ["stemLab"],
  zen_on: ["stemLab"],
  stop_reading: ["reading"],
  line_spacing_more: ["reading"],
  line_spacing_less: ["reading"],
  open_submission_inbox: ["educatorHub"],
  generate_outline: ["content"],
  export_pack: ["content"],
  launch_flashcards: ["content", "learningHub"],
  clear_my_answers: ["content"],
  clear_workspace: ["content"],
  open_persona_chat: ["content"],
  pipeline_fix_again: ["pipeline"],
  pipeline_stop: ["pipeline"],
  pipeline_new_doc: ["pipeline"]
};
const GROUP_ORDER = ["navigate", "create", "tools", "accessibility", "display", "pipeline", "help", "voice"];
const GROUP_LABEL_FALLBACK = { navigate: "Navigate", create: "Create from this content", tools: "Open a tool", accessibility: "Reading & access", display: "Display & motion", pipeline: "Pipeline results", help: "Help", voice: "Voice" };
const CTX_FLAG = { pipeline: "pipelineOpen", educatorHub: "educatorHubOpen", learningHub: "learningHubOpen", symbolStudio: "symbolStudioOpen", stemLab: "stemLabOpen", behaviorLens: "behaviorLensOpen", content: "contentLoaded", reading: (c) => !!(c.zenActive || c.focusActive) };
const CTX_PRIORITY = ["symbolStudio", "stemLab", "behaviorLens", "pipeline", "educatorHub", "learningHub", "content", "reading"];
const CONTEXT_LABEL_FALLBACK = { pipeline: "Here \u2014 Pipeline results", educatorHub: "Here \u2014 Educator Hub", learningHub: "Here \u2014 Learning Hub", symbolStudio: "Here \u2014 Symbol Studio", stemLab: "Here \u2014 STEM Lab", behaviorLens: "Here \u2014 Behavior Lens", content: "Here \u2014 this content", reading: "Here \u2014 Reading mode" };
function _activeContexts(ctx) {
  if (!ctx) return [];
  return CTX_PRIORITY.filter((k) => {
    const f = CTX_FLAG[k];
    return typeof f === "function" ? f(ctx) : !!ctx[f];
  });
}
const AlloCommandPalette = ({ ctx }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const inputRef = useRef(null);
  const prevFocusRef = useRef(null);
  const t = _mkT(ctx && ctx.t);
  const commands = useMemo(() => ctx ? buildAlloCommands(ctx) : [], [ctx]);
  const rows = useMemo(() => {
    const out = [];
    if (query) {
      const acts2 = _activeContexts(ctx);
      const ctxRank = (c) => (CMD_CONTEXT[c.id] || []).some((x) => acts2.indexOf(x) >= 0) ? 0 : 1;
      const scored = commands.map((c) => ({ c, s: scoreCommand(c, query) })).filter((x) => x.s > 0);
      scored.sort((a, b) => b.s - a.s || ctxRank(a.c) - ctxRank(b.c));
      scored.slice(0, 12).forEach((x) => out.push({ kind: "cmd", c: x.c }));
      return out;
    }
    const acts = _activeContexts(ctx);
    const promotedIds = /* @__PURE__ */ new Set();
    if (acts.length) {
      const promoted = [];
      for (const c of commands) {
        if ((CMD_CONTEXT[c.id] || []).some((x) => acts.indexOf(x) >= 0)) {
          promoted.push(c);
          promotedIds.add(c.id);
          if (promoted.length >= 6) break;
        }
      }
      if (promoted.length) {
        const top = acts[0];
        out.push({ kind: "header", label: t("palette.ctx." + top, CONTEXT_LABEL_FALLBACK[top] || "Here") });
        promoted.forEach((c) => out.push({ kind: "cmd", c }));
      }
    }
    const PER_GROUP = 6, MAX_ROWS = 40;
    let cmdCount = promotedIds.size;
    for (const g of GROUP_ORDER) {
      if (cmdCount >= MAX_ROWS) break;
      const inGroup = commands.filter((c) => (CMD_GROUP[c.id] || "navigate") === g && !promotedIds.has(c.id));
      const take = inGroup.slice(0, Math.min(PER_GROUP, MAX_ROWS - cmdCount));
      if (!take.length) continue;
      out.push({ kind: "header", label: t("palette.group." + g, GROUP_LABEL_FALLBACK[g]) });
      take.forEach((c) => out.push({ kind: "cmd", c }));
      cmdCount += take.length;
    }
    return out;
  }, [commands, query, ctx, t]);
  const selectable = useMemo(() => {
    const a = [];
    rows.forEach((r, i) => {
      if (r.kind === "cmd") a.push(i);
    });
    return a;
  }, [rows]);
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "k" || (e.ctrlKey || e.metaKey) && e.shiftKey && k === "p") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            try {
              prevFocusRef.current = document.activeElement;
            } catch (_) {
            }
          }
          return !v;
        });
        setQuery("");
        setConfirming(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open && prevFocusRef.current) {
      try {
        prevFocusRef.current.focus();
      } catch (_) {
      }
      prevFocusRef.current = null;
    }
  }, [open]);
  useEffect(() => {
    if (open) setSel(selectable.length ? selectable[0] : 0);
  }, [open, query]);
  useEffect(() => {
    if (!open) return;
    if (!selectable.length) {
      if (sel !== 0) setSel(0);
      return;
    }
    if (selectable.indexOf(sel) === -1) setSel(selectable[0]);
  }, [open, selectable, sel]);
  const announce = useCallback((msg) => {
    try {
      if (window.alloAnnounce) window.alloAnnounce(msg);
    } catch (_) {
    }
    try {
      if (ctx && ctx.addToast) ctx.addToast(msg, "success");
    } catch (_) {
    }
  }, [ctx]);
  const runCmd = useCallback((cmd) => {
    if (!cmd) return;
    if (cmd.destructive && (!confirming || confirming !== cmd.id)) {
      setConfirming(cmd.id);
      return;
    }
    setConfirming(null);
    if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
      try {
        ctx.closeOtherPanels(cmd.opensPanel);
      } catch (_) {
      }
    }
    let msg = null;
    try {
      msg = cmd.run(ctx);
    } catch (e) {
      try {
        ctx.addToast(t("cmd.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), "error");
      } catch (_) {
      }
      setOpen(false);
      return;
    }
    setOpen(false);
    if (msg) announce(msg);
  }, [ctx, confirming, announce, t]);
  if (!open) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[12000] flex items-start justify-center pt-[14vh] px-4", role: "presentation", onClick: () => setOpen(false) }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-slate-900/50", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-label": t("palette.aria", "AlloFlow command palette"),
      "data-help-ignore": "true",
      className: "relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-4 py-3 border-b border-slate-200" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A1"), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => {
              for (const idx of selectable) if (idx > s) return idx;
              return selectable.length ? selectable[selectable.length - 1] : s;
            });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => {
              for (let j = selectable.length - 1; j >= 0; j--) if (selectable[j] < s) return selectable[j];
              return selectable.length ? selectable[0] : s;
            });
          } else if (e.key === "Enter") {
            e.preventDefault();
            const row = rows[sel];
            if (row && row.kind === "cmd") runCmd(row.c);
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (confirming) setConfirming(null);
            else setOpen(false);
          }
        },
        placeholder: t("palette.placeholder", "Type a command \u2014 \u201Cbigger text\u201D, \u201Ceducator hub\u201D, \u201Cread this page\u201D\u2026"),
        "aria-label": t("palette.input_aria", "Search commands"),
        role: "combobox",
        "aria-expanded": "true",
        "aria-controls": "allo-palette-list",
        "aria-activedescendant": rows[sel] && rows[sel].kind === "cmd" ? "allo-cmd-" + rows[sel].c.id : void 0,
        className: "flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-500"
      }
    ), /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-slate-500 border border-slate-300 rounded px-1.5 py-0.5" }, "Esc")),
    /* @__PURE__ */ React.createElement("ul", { id: "allo-palette-list", role: "listbox", "aria-label": t("palette.list_aria", "Matching commands"), className: "max-h-[46vh] overflow-y-auto py-1" }, selectable.length === 0 && /* @__PURE__ */ React.createElement("li", { role: "presentation", className: "px-4 py-6 text-center text-xs text-slate-600" }, t("palette.no_match", "No matching command. The bot chat (and soon voice) understands free-form requests.")), rows.map((row, i) => row.kind === "header" ? /* @__PURE__ */ React.createElement("li", { key: "h-" + i, role: "presentation", className: "px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 select-none" }, row.label) : /* @__PURE__ */ React.createElement("li", { key: row.c.id, id: "allo-cmd-" + row.c.id, role: "option", "aria-selected": i === sel }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => runCmd(row.c),
        onMouseEnter: () => setSel(i),
        className: `w-full text-left px-4 py-2.5 flex items-center gap-3 ${i === sel ? "bg-indigo-50" : ""}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-lg shrink-0", "aria-hidden": "true" }, row.c.icon),
      /* @__PURE__ */ React.createElement("span", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: `block text-sm font-bold ${i === sel ? "text-indigo-900" : "text-slate-800"}` }, row.c.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-600 truncate" }, confirming === row.c.id ? t("palette.confirm", "\u26A0 Press Enter again to confirm") : row.c.hint)),
      i === sel && /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-indigo-600 border border-indigo-300 rounded px-1.5 py-0.5 shrink-0" }, "\u21B5")
    )))),
    /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u2191\u2193"), " ", t("palette.nav", "navigate")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u21B5"), " ", t("palette.run", "run")), /* @__PURE__ */ React.createElement("span", { className: "ml-auto" }, t("palette.footer", "Every action is announced. Ctrl+K toggles.")))
  ));
};

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloCommands = { AlloCommandPalette: AlloCommandPalette, buildAlloCommands: buildAlloCommands, scoreCommand: scoreCommand, routeUtterance: routeUtterance, runCommandById: runCommandById, createVoiceLoop: createVoiceLoop };
  console.log('[CDN] AlloCommands loaded');
})();
