// Add 14 missing top-level AlloFlow features to the About-modal catalog +
// their inputs/outputs diagrams. Writes both root and desktop/web-app mirror.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const stringsFile = path.join(ROOT, 'ui_strings.js');
const mirrorStringsFile = path.join(ROOT, 'desktop/web-app', 'public', 'ui_strings.js');

const data = JSON.parse(fs.readFileSync(stringsFile, 'utf-8'));

const newItems = [
  // ── creation ──
  { title: "Smart Glossary",       icon: "BookOpen",     desc: "Visual vocabulary cards with audio, bilingual translations, and 5 vocabulary games (crossword, bingo, memory match, word search, scramble).", category: "creation",  color: "purple" },
  { title: "Immersive Reader",     icon: "Ear",          desc: "Multi-mode reading support: RSVP speed reading, karaoke highlighting, bionic reading, line-focus ruler, grammar overlays.", category: "creation", color: "blue" },
  { title: "Word Sounds Studio",   icon: "Mic",          desc: "Phonemic awareness practice across 8 activity types — blending, segmenting, rhyming, mapping, isolation, spelling, families, sight & spell.", category: "creation", color: "amber" },
  { title: "StoryForge",           icon: "Quote",        desc: "Six-phase scaffolded creative writing with AI illustrations, narration, custom rubrics, and 18-language support.", category: "creation", color: "rose" },
  // ── activities ──
  { title: "AlloBot",              icon: "Sparkles",     desc: "Always-available AI tutor and platform guide. Answers content questions, navigates AlloFlow, and auto-configures settings on request.", category: "activities", color: "indigo" },
  { title: "Escape Room",          icon: "MapIcon",      desc: "Team-based puzzle challenges built from your lesson content. Teacher-controlled hints, timed escape tracking, multi-stage rooms.", category: "activities", color: "orange" },
  { title: "SEL Hub",              icon: "Heart",        desc: "32 social-emotional learning tools across CASEL competencies — coping cards, restorative circles, self-advocacy rehearsal, and more.", category: "activities", color: "rose" },
  // ── assessment ──
  { title: "BehaviorLens",         icon: "ShieldCheck",  desc: "FBA/BIP suite: ABC data collection, frequency/interval tracking, IOA calculator (5 methods), preference assessments, intervention templates.", category: "assessment", color: "indigo" },
  { title: "Report Writer",        icon: "ClipboardList", desc: "10-step wizard for psychoeducational reports: 17 assessment presets, fact-chunk verification, triangulated drafting, dual-pass accuracy audit.", category: "assessment", color: "purple" },
  { title: "Dynamic Assessment",   icon: "Filter",       desc: "Vygotsky/Feuerstein/Lidz test-teach-retest probes with 4-level prompt ladders, modifiability scoring, IEP goal + accommodation generation.", category: "assessment", color: "blue" },
  { title: "Student Analytics",    icon: "Layout",       desc: "Automated RTI Tier 1/2/3 classification with aimline monitoring, CBM probe history, anomaly flagging, class screening reports.", category: "assessment", color: "emerald" },
  // ── platform ──
  { title: "PDF Accessibility",    icon: "Download",     desc: "Upload any PDF → 5-auditor triangulated audit → WCAG remediation via Vision API → axe-core verification → accessible PDF/HTML/audio export.", category: "platform", color: "cyan" },
  { title: "Symbol Studio",        icon: "ImageIcon",    desc: "Full AAC platform: AI-generated PCS symbols, board builder, visual schedules, social stories, Symbol Quest games, Word Garden vocabulary tracking.", category: "platform", color: "fuchsia" },
  { title: "STEM Lab",             icon: "Layers",       desc: "95+ browser-based interactive simulations across math, science, CS, engineering, and creative design — from DNA labs to physics sandboxes.", category: "platform", color: "teal" }
];

const list = data.about.features_list;
if (!Array.isArray(list.items)) {
  console.error('Unexpected features_list shape');
  process.exit(1);
}

const existingTitles = new Set(list.items.map(i => i.title));
const additions = newItems.filter(i => !existingTitles.has(i.title));
list.items.push(...additions);

// Write back with 2-space indent (matches existing style)
const out = JSON.stringify(data, null, 2);
fs.writeFileSync(stringsFile, out);
if (fs.existsSync(mirrorStringsFile)) fs.writeFileSync(mirrorStringsFile, out);

console.log(`Added ${additions.length} new feature catalog entries (root + mirror)`);
additions.forEach(a => console.log(`  + ${a.category.padEnd(11)} ${a.title}`));
