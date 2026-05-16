(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ToolCatalogModuleLoaded) { console.log('[CDN] ToolCatalog already loaded, skipping'); return; }
// tool_catalog_source.jsx — single source of truth for AlloFlow resource tools.
// tool_catalog_source.jsx — Single source of truth for AlloFlow resource tools.
//
// Every "tool" the generate dispatcher knows about gets one entry here.
// Consumers (AlloBot autofill prompt, blueprint-modify prompt, sidebar tile
// registry, ui_strings.js localization) should read from this catalog rather
// than maintaining their own copies — which is how note-taking + anchor-chart
// (and 5 other tools) silently fell out of AlloBot's awareness for a while.
//
// To add a new tool:
//   1. Add an `if (type === 'foo')` branch in generate_dispatcher_source.jsx
//   2. Add an entry below.
//   3. Add `sidebar.tool_<id>` to ui_strings.js if it's user-visible in the sidebar.
//   4. Run `node _check_tool_catalog.cjs` to verify zero drift.
//
// To validate sync:
//   node _check_tool_catalog.cjs

// ─── Catalog ───────────────────────────────────────────────────────────────
// Fields:
//   id              (required) — dispatcher tool id; matches `type === '<id>'`
//   description     (required) — one-sentence "what it does" for the prompt
//   whenToUse       (optional) — second sentence with positioning/cautions
//   placeFirst      (optional) — bot should sequence this first
//   placeLast       (optional) — bot should sequence this last
//   inAutofill      (optional) — bot may auto-recommend in lesson packs (default true)
//   requiresStandards (optional) — only suggest when explicit standards provided
//   isPostHoc       (optional) — runs against already-generated artifacts
//   sidebarKey      (optional) — ui_strings.js key for the sidebar tile label
const TOOL_CATALOG = [
  {
    id: 'analysis',
    description: 'Analyzes source text for key ideas, vocabulary, structure.',
    whenToUse: 'ALWAYS include as first resource.',
    placeFirst: true,
    inAutofill: true,
    sidebarKey: 'sidebar.tool_analysis',
  },
  {
    id: 'simplified',
    description: 'Adapt text to a specific reading level.',
    whenToUse: 'Good for differentiation.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_simplified',
  },
  {
    id: 'glossary',
    description: 'Key vocabulary with definitions, examples, images.',
    whenToUse: 'Essential for content-heavy texts.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_glossary',
  },
  {
    id: 'outline',
    description: 'Visual organizer (Venn, Flow Chart, Structured Outline, T-Chart, Fishbone, KWL, Story Map, etc.).',
    whenToUse: 'Match the diagram type to the content topology.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_outline',
  },
  {
    id: 'image',
    description: 'AI-generated illustration of a key concept.',
    whenToUse: 'Good for visual learners.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_visual',
  },
  {
    id: 'quiz',
    description: 'Assessment questions (MCQ, free response, Exit Ticket, Pre-Check, Formative, Spaced Review).',
    whenToUse: 'Include after content resources.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_quiz',
  },
  {
    id: 'sentence-frames',
    description: 'Scaffolded writing prompts.',
    whenToUse: 'Good for ELL students or structured responses.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_scaffolds',
  },
  {
    id: 'brainstorm',
    description: 'Open-ended idea generation around a topic.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_brainstorm',
  },
  {
    id: 'timeline',
    description: 'Chronological sequence of events.',
    whenToUse: 'Use for historical or procedural content.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_timeline',
  },
  {
    id: 'concept-sort',
    description: 'Categorization activity — students sort terms into groups.',
    whenToUse: 'Good for vocabulary/classification.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_concept',
  },
  {
    id: 'adventure',
    description: 'Interactive choose-your-own-adventure narrative.',
    whenToUse: 'Good for engagement and decision-making.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_adventure',
  },
  {
    id: 'faq',
    description: 'Frequently asked questions generated from source text.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_faq',
  },
  {
    id: 'persona',
    description: 'Interview historical figures, scientists, or literary characters AS IF they were real. Students ask questions; the character responds in-character with historically/textually accurate answers.',
    whenToUse: 'EXCELLENT for history, literature, biography, social studies. Use when the text involves notable people or characters with distinct perspectives. HIGHLY RECOMMENDED — do not overlook this tool.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_persona',
  },
  {
    id: 'dbq',
    description: 'Document-Based Question activity with primary sources, HAPP sourcing framework, corroboration analysis, synthesis essay, and rubric.',
    whenToUse: 'Use for social studies, history, civics, or any text with multiple perspectives.',
    inAutofill: true,
    // No sidebarKey — DBQ has its own dedicated panel, not a standard sidebar tile.
  },
  {
    id: 'note-taking',
    description: 'Lesson-aware scaffolded note-taking templates (Cornell Notes / Lab Report / Reading Response). Persists across lessons.',
    whenToUse: 'Use when students will take structured notes from the source text — great for science labs (Lab Report), nonfiction reading (Cornell or Reading Response), or any text where students actively process and record their thinking.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_note_taking',
  },
  {
    id: 'anchor-chart',
    description: 'EL-style class anchor chart (Reference / Process / Concept Map / Comparison). AI drafts structure + hand-drawn icons; editable; supports peer critique.',
    whenToUse: 'Use for vocabulary norms, sequential processes, concept relationships, or comparisons students will refer back to. Especially strong for EL Education classrooms.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_anchor_chart',
  },
  {
    id: 'math',
    description: 'Opens the STEM Lab — hands-on math/science tools (algebra, calculus, statistics, physics simulations, chemistry, anatomy, etc.).',
    whenToUse: 'Use for STEM content where students benefit from interactive exploration. NOT for simple arithmetic problems (use quiz for that).',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_math',
  },
  {
    id: 'lesson-plan',
    description: 'Teacher-facing synthesized lesson plan with timing, sequencing, materials, and activity descriptions referencing the other generated resources.',
    whenToUse: 'ALWAYS place LAST in the resource plan so it can reference everything else generated.',
    placeLast: true,
    inAutofill: true,
    sidebarKey: 'sidebar.tool_lesson',
  },
  {
    id: 'gemini-bridge',
    description: 'Interactive simulation/app generator (React web app, Python data viz, p5.js physics sim, or AI chatbot).',
    whenToUse: 'Use when the lesson would benefit from a hands-on interactive artifact. Skip for text-heavy content with no clear simulation angle.',
    inAutofill: true,
    sidebarKey: 'sidebar.tool_bridge',
  },
  {
    id: 'alignment-report',
    description: 'Post-hoc audit of generated resources against target standards.',
    whenToUse: 'Only include if explicit standards are provided AND the user requests an audit. Otherwise omit — this is a verification tool, not a teaching resource.',
    requiresStandards: true,
    isPostHoc: true,
    inAutofill: true,
    sidebarKey: 'sidebar.tool_alignment',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

// Comma-separated tool IDs, e.g. for "Valid Tools: analysis, simplified, ..."
function getToolIdsCsv(catalog) {
  return (catalog || TOOL_CATALOG).map(t => t.id).join(', ');
}

// Markdown bullet block for an LLM prompt: "- **id** — description (whenToUse)"
function formatToolCatalogForPrompt(catalog) {
  return (catalog || TOOL_CATALOG)
    .map(t => {
      const wtu = t.whenToUse ? ' ' + t.whenToUse : '';
      return `        - **${t.id}**: ${t.description}${wtu}`;
    })
    .join('\n');
}

// Same as above but with "tool_id — when to use" inline format (used by
// modifyBlueprintWithAI).
function formatToolCatalogInline(catalog) {
  return (catalog || TOOL_CATALOG)
    .map(t => {
      const wtu = t.whenToUse ? ' ' + t.whenToUse : '';
      return `        - ${t.id} — ${t.description}${wtu}`;
    })
    .join('\n');
}

// Lookup by id (returns entry or undefined).
function getToolEntry(id, catalog) {
  return (catalog || TOOL_CATALOG).find(t => t.id === id);
}

// All tool IDs as an array.
function getToolIds(catalog) {
  return (catalog || TOOL_CATALOG).map(t => t.id);
}

// ─── Registration ──────────────────────────────────────────────────────────
// Publish on window.AlloModules.ToolCatalog AND mirror onto window.* for
// convenience (modifyBlueprintWithAI reads window.TOOL_CATALOG directly).
window.AlloModules = window.AlloModules || {};
window.AlloModules.ToolCatalog = {
  TOOL_CATALOG,
  getToolIdsCsv,
  formatToolCatalogForPrompt,
  formatToolCatalogInline,
  getToolEntry,
  getToolIds,
};
window.TOOL_CATALOG = TOOL_CATALOG;
window.formatToolCatalogForPrompt = formatToolCatalogForPrompt;
window.formatToolCatalogInline = formatToolCatalogInline;
window.getToolIdsCsv = getToolIdsCsv;

if (typeof window._upgradeToolCatalog === 'function') {
  window._upgradeToolCatalog();
}
console.log('[ToolCatalog] ' + TOOL_CATALOG.length + ' tools registered.');

window.AlloModules.ToolCatalogModuleLoaded = true;
})();
