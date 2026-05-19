// AlloFlow Translation Glossary
// ==============================================================================
// Loaded by useTranslation() in AlloFlowANTI.txt before language-pack generation.
// Two purposes:
//   1) DO_NOT_TRANSLATE — strings the model must pass through verbatim
//      (brand names, units, format placeholders, markdown syntax)
//   2) DOMAIN_GLOSSARY — preferred translations of K-12 special-ed terminology
//      so the same English term renders consistently across all 9,000+ keys
//
// Loaded as a plain JS object via fetch() + JSON.parse(), so this file MUST
// be valid JSON (no comments inside the object body, no trailing commas).
// Comments above the object are stripped by the loader.
// ==============================================================================
{
  "version": 1,

  "DO_NOT_TRANSLATE": [
    "AlloFlow",
    "AlloBot",
    "AlloHaven",
    "AlloFlowANTI",
    "StoryForge",
    "LitLab",
    "PoetTree",
    "SEL Hub",
    "STEM Lab",
    "WriteCraft",
    "Symbol Studio",
    "Doc Builder",
    "Document Builder",
    "Word Sounds",
    "Anchor Chart",
    "Visual Organizer",
    "ChemBalance",
    "RoadReady",
    "WeldLab",
    "FirstResponseLab",
    "Optics Lab",
    "Solar System Explorer",
    "Cell Simulator",
    "Plate Tectonics",
    "Raptor Hunt",
    "Sage",
    "AlloFlowUX",
    "PrismFlow",
    "Pomera",

    "UDL",
    "SEL",
    "RTI",
    "IEP",
    "FERPA",
    "DBQ",
    "PII",
    "PDF",
    "HTML",
    "CSS",
    "JSON",
    "PPTX",
    "IMS",
    "QTI",
    "API",
    "AI",
    "TTS",
    "URL",
    "MP3",
    "WAV",
    "FAQ",
    "WCAG",
    "PWA",

    "Gemini",
    "Kokoro",
    "OpenAI",
    "Claude",
    "GitHub",
    "Firebase",
    "Cloudflare",
    "Google",
    "Apple",
    "Microsoft",

    "Common Core",
    "NGSS",
    "Maine",
    "Portland"
  ],

  "DNT_PATTERNS": [
    "\\{[a-zA-Z_][a-zA-Z0-9_]*\\}",
    "\\d+(\\.\\d+)?(MB|KB|GB|cm|mm|km|m|kg|g|°C|°F|fps|Hz|ms|hr|min|sec|nm|μm|AU|ly)",
    "v\\d+(\\.\\d+)?",
    "#[A-Fa-f0-9]{3,8}",
    "https?://[^\\s\\)]+"
  ],

  "DOMAIN_GLOSSARY": {
    "general": {
      "exit ticket": "A short formative-assessment task completed at the end of a lesson.",
      "anchor chart": "A teacher-made visual reference poster summarizing a concept or skill.",
      "scaffold": "An instructional support that helps a learner reach a goal they couldn't yet reach independently; faded as competence grows.",
      "differentiation": "Adjusting instruction so each learner can access content at their own level.",
      "formative assessment": "Low-stakes check for understanding during learning, used to adjust instruction.",
      "summative assessment": "End-of-unit evaluation of mastery.",
      "rubric": "A scoring tool with criteria + performance levels.",
      "stem": "Science, Technology, Engineering, Mathematics — keep capitalized acronym in translation when used as a domain label.",
      "k-12": "Kindergarten through 12th grade — preserve format K-12 in target language unless locale convention differs.",
      "grade level": "The school-year a student is in (e.g., Grade 3, 8th grade).",
      "lesson plan": "A teacher's structured outline of objectives, activities, and assessment for a class session."
    },

    "udl": {
      "Universal Design for Learning": "An educational framework providing flexible options in HOW students learn (representation), HOW they show what they know (action+expression), and WHY they engage (engagement).",
      "Multiple Means of Representation": "UDL principle: present information in more than one way (visual, auditory, text, video).",
      "Multiple Means of Action and Expression": "UDL principle: let students demonstrate learning in different ways.",
      "Multiple Means of Engagement": "UDL principle: provide multiple paths to motivate and engage learners.",
      "guideline": "A specific UDL rule or recommendation within the framework. Keep numbered references like 'Guideline 2.4' intact."
    },

    "sel": {
      "social-emotional learning": "Curricular work on self-awareness, self-management, social awareness, relationship skills, and responsible decision-making.",
      "self-awareness": "Knowing one's own feelings, strengths, values, identity.",
      "self-management": "Regulating emotions, impulses, and behavior to reach goals.",
      "social awareness": "Understanding others' perspectives, especially across difference.",
      "relationship skills": "Healthy communication, cooperation, conflict resolution.",
      "responsible decision-making": "Choosing constructively while considering ethics + impact on others.",
      "zones of regulation": "Color-coded framework (blue/green/yellow/red) for naming + managing emotional states.",
      "window of tolerance": "The range of arousal where a learner can think + learn well; outside the window they are hyper- or hypo-aroused.",
      "co-regulation": "A trusted adult lending their nervous-system calm to help a child regulate.",
      "trauma-informed": "Practices that recognize and respond to the impact of trauma without re-triggering.",
      "DBT": "Dialectical Behavior Therapy — keep acronym.",
      "DEAR MAN": "DBT skill acronym for assertive requests. Keep as DEAR MAN."
    },

    "rti_mtss": {
      "Response to Intervention": "A multi-tier system of academic supports — preserve acronym RTI.",
      "MTSS": "Multi-Tiered System of Supports — preserve acronym.",
      "Tier 1": "Universal classroom instruction for all students. Preserve as Tier 1 with a numeral.",
      "Tier 2": "Targeted small-group intervention for students not meeting Tier 1 benchmarks.",
      "Tier 3": "Intensive individualized intervention for students with significant gaps.",
      "benchmark": "A predefined performance level expected at a grade or season.",
      "progress monitoring": "Brief, frequent measures of growth on a specific skill."
    },

    "iep_sped": {
      "Individualized Education Program": "Legal document specifying accommodations + goals for a student with a disability — preserve acronym IEP.",
      "504 plan": "Civil-rights accommodation plan for a student with a disability not requiring specialized instruction. Preserve as '504 plan' in most locales.",
      "accommodation": "A change in HOW a student accesses material (extended time, large print) without changing WHAT is learned.",
      "modification": "A change in WHAT a student is expected to learn (reduced content, alternate standards).",
      "least restrictive environment": "Federal requirement that students with disabilities be educated alongside non-disabled peers to the maximum appropriate extent. Preserve acronym LRE.",
      "FAPE": "Free Appropriate Public Education — preserve acronym."
    },

    "literacy": {
      "phoneme": "Smallest unit of sound in a language.",
      "grapheme": "Written letter or letter-cluster representing a phoneme.",
      "decoding": "Reading by translating graphemes to phonemes and blending.",
      "encoding": "Spelling — translating phonemes to graphemes.",
      "fluency": "Reading with accuracy, appropriate rate, and prosody.",
      "comprehension": "Understanding what is read.",
      "phonological awareness": "Awareness of the sound structure of spoken language.",
      "phonemic awareness": "A subset of phonological awareness: hearing + manipulating individual phonemes."
    },

    "math": {
      "number sense": "Intuitive understanding of numbers, their relationships, and operations.",
      "place value": "The value of a digit based on its position in a number.",
      "manipulative": "A physical or virtual object students handle to model a math concept.",
      "tens frame": "A 2×5 grid used to build number-sense for tens. Some locales use 'ten-frame' or 'tens frame' — preserve a hyphenless form unless locale convention differs."
    },

    "udl_microcopy": {
      "Save": "Affirmative imperative — save the user's current work. Should be one short word in target language.",
      "Cancel": "Affirmative imperative — discard the current operation. One short word.",
      "Submit": "Affirmative imperative — send work to the teacher.",
      "Generate": "Affirmative imperative — start AI generation. Use the target-language imperative for 'create' or 'produce'.",
      "Translate": "Affirmative imperative — convert content to another language.",
      "Loading...": "Brief status text indicating work in progress. Should be short and recognizable.",
      "Ready": "Brief status text indicating system is awaiting input."
    }
  }
}
