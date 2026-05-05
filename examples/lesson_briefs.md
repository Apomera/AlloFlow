# Lesson Briefs for `library.html`

Each section below is a **parameter sheet** for one missing lesson card on `library.html`. You'll plug these parameters into AlloFlow's own pipeline and let AlloFlow generate the source text, analysis, glossary, quiz, and other outputs.

## How AlloFlow generates a lesson (workflow per lesson)

Open AlloFlow in **Teacher Mode** (Gemini Canvas). For each lesson:

### Step 1: Set the global Grade Level
At the top-level grade-level dropdown (the one that controls leveled-text targeting), set the grade band specified in the brief. This calibrates ALL downstream outputs (analysis reading-level, glossary tier difficulty, quiz language, sentence-frame complexity).

### Step 2: Add the Standards
Open the standards picker. Use **Manual** mode for the standards listed in the brief (just paste the codes). If you'd rather use **AI Match**, paste the brief's "Standards query" line into the AI Match field instead. Max 3 standards per lesson.

### Step 3: Use "Generate Source Text" mode
At the source-input panel, toggle the **Generate Source Text** mode (the toggle button next to the textarea). Fill in the form using the brief's "Source generation" block:
- **Topic** (required)
- **Tone** dropdown (Informative / Narrative / Persuasive / Humorous / Step-by-Step)
- **Target Level** dropdown (matches the global grade level)
- **Vocabulary** (optional, comma-separated terms to include)
- **Length** (approximate words)
- **Custom Instructions** (optional, voice/structure guidance)
- **Include Source Citations** (yes/no)

Click **Generate**. AlloFlow produces the source text into the input area.

### Step 4: Run each follow-up output type
For each entry under "Follow-up outputs," click the corresponding generate button in AlloFlow's UI (Analysis, Glossary, Simplified, Outline, Quiz, Sentence Frames, Image, etc.). Where the brief specifies counts or settings (e.g., glossary tier counts, quiz MCQ count, leveled-text length), set those FIRST in the matching control before clicking Generate.

### Step 5: Save and rename
Use **Save Project** / **Export JSON** to download the project state. Rename the file to match the **Filename** field in the brief. Drop in `examples/` and commit.

```
git add examples/<filename>.json
git commit -m "Add <title> example lesson"
git push
```

Reload `library.html` and verify the Download button on that card now serves a working file.

---

## ⚠ Note on `civil_war.json` (existing file vs library.html card mismatch)

`examples/civil_war.json` exists, but the matching card on `library.html` (lines 202-210) is titled **"⚔️ The American Revolution"** with Revolution-era standards (C3 D2.His.1.3-5, CCSS.RI.5.6) and describes Revolution content.

The file's actual content is Civil War, not Revolution. Two valid fixes:

1. **Generate an American Revolution lesson, save it as `american_revolution.json`, and update line 209 of `library.html`** so its href points to the new file. Keep `civil_war.json` and optionally add a new card for it elsewhere on the page (e.g., grades 6-8 social studies).

2. **Rewrite the card on `library.html` to match the file.** Update lines 205-208 so the title says "The American Civil War," update the description, and swap the standards to ones that fit Civil War content (e.g., C3 D2.His.4.6-8 for middle school, CCSS.ELA-LITERACY.RH.6-8.6).

Recommended: **Option 1.** A parameter sheet for the new American Revolution lesson is included at the end of this file (Lesson 8) so you can generate it the same way as the others.

---

## Lesson 1: The Water Cycle

- **Filename**: `water_cycle.json`
- **Title**: 🌊 The Water Cycle
- **Subject / Grade**: ELA, Grades 2-3
- **Standards**: `CCSS.ELA-LITERACY.RI.3.1`, `CCSS.ELA-LITERACY.RI.3.3`
- **Standards query** (for AI Match alternative): "3rd grade ELA informational text reading standards on key details and cause-effect"
- **Learning objective**: Identify the four stages of the water cycle and describe how water moves between Earth and the sky.

### Step 1: Global Grade Level
Set: **3rd Grade**

### Step 3: Source generation parameters
- **Topic**: "The water cycle for elementary students."
- **Tone**: Informative
- **Target Level**: 3rd Grade
- **Vocabulary**: evaporation, condensation, precipitation, collection, water vapor, groundwater
- **Length**: 500
- **Custom Instructions**:
  - Cover the four stages in order: evaporation, condensation, precipitation, collection.
  - Explain that water vapor is invisible, and that the same water has been cycling for millions of years (a memorable hook for elementary readers).
  - For each stage, include one concrete real-world example a child has seen (puddle drying in the sun, dew on grass, rain or snow falling, water soaking into soil).
  - Mention that precipitation can be rain, snow, sleet, or hail depending on temperature.
  - End with one sentence about why the water cycle matters for plants, animals, and people.
  - Use short sentences and second-person voice ("you") where natural.
- **Include Source Citations**: No

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 4 · Tier 3 count: 4 · Definition Level: Same as Source · Etymology: off |
| **Simplified** | Length: Condense (50%) for grade-1-2 readers |
| **Outline / Visual Organizer** | central node "Water Cycle"; expect 4 branches for the stages |
| **Quiz / Exit Ticket** | MCQ count: 5 · Reflection count: 1 · DOK Level: Level 2 |
| **Sentence Frames** | scaffold the response prompt "Water moves from __ to __ when it __." |

---

## Lesson 2: Anansi the Spider (Folktales)

- **Filename**: `anansi.json`
- **Title**: 🕷️ Anansi the Spider (Folktales)
- **Subject / Grade**: ELA, Grades 3-4
- **Standards**: `CCSS.ELA-LITERACY.RL.3.2`, `CCSS.ELA-LITERACY.RL.3.9`
- **Standards query**: "3rd grade ELA literature standards on theme/moral and comparing stories from different cultures"
- **Learning objective**: Identify the moral of an Anansi folktale and compare its trickster theme to a folktale from another culture.

### Step 1: Global Grade Level
Set: **4th Grade**

### Step 3: Source generation parameters
- **Topic**: "An Anansi the Spider folktale, with cultural context, for upper-elementary readers."
- **Tone**: Narrative
- **Target Level**: 4th Grade
- **Vocabulary**: folktale, trickster, Anansi, Akan, diaspora, moral
- **Length**: 700
- **Custom Instructions**:
  - Open with a brief paragraph of cultural context: Anansi is a trickster from the West African Akan (Ghanaian) tradition. Anansi stories spread through the African diaspora to the Caribbean and the Americas.
  - Then tell one well-known Anansi tale (e.g., "How Anansi Got His Stories" with Nyame the sky-god, the Python, the Leopard, and the Hornets; or another canonical tale).
  - Use third-person past-tense narration with concrete sensory details.
  - State the moral of the story explicitly in the closing sentence.
  - Briefly mention (one sentence) that trickster characters appear in folktales worldwide: Coyote in Native American Plains traditions, Loki in Norse traditions, the kitsune fox in Japanese folklore.
  - Note the term *anansesem* ("spider stories") if it fits the narrative naturally.
- **Include Source Citations**: No

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | focus on theme + characters + cultural context |
| **Glossary** | Tier 2 count: 4 · Tier 3 count: 2 · Etymology: on (Anansi is from Akan/Twi) |
| **Outline / Visual Organizer** | story-structure map: setting, characters, problem, three trials, resolution, moral |
| **Sentence Frames** | "The moral of the story is __." "A trickster character is similar to __ because __." |
| **Quiz** | MCQ count: 5 (3 comprehension, 1 vocabulary, 1 cross-cultural compare/contrast) · Reflection count: 1 · DOK Level: Level 2 |
| **Persona / Interview Mode** *(optional)* | Generate Anansi himself as a persona so students can interview him about his trick |

---

## Lesson 3: The Solar System

- **Filename**: `solar_system.json`
- **Title**: 🪐 The Solar System
- **Subject / Grade**: STEM, Grades 3-5
- **Standards**: `NGSS 5-ESS1-1`
- **Standards query**: "5th grade NGSS Earth and Space Science standard on the Sun and stars"
- **Learning objective**: Name the eight planets in order from the Sun and describe at least two distinguishing features of each.

### Step 1: Global Grade Level
Set: **4th Grade** (mid-band of the 3-5 range)

### Step 3: Source generation parameters
- **Topic**: "An overview of our solar system for upper-elementary readers."
- **Tone**: Informative
- **Target Level**: 4th Grade
- **Vocabulary**: solar system, star, planet, orbit, gravity, gas giant, ice giant, atmosphere, dwarf planet, Kuiper Belt
- **Length**: 900
- **Custom Instructions**:
  - Open by introducing the Sun as a star and explaining that gravity holds the planets in their orbits.
  - Describe the eight planets in order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.
  - For each planet, include 1-2 distinguishing features (size, temperature, atmosphere, notable features like rings, storms, or moons).
  - Use the mnemonic "My Very Educated Mother Just Served Us Noodles" once to anchor planet order.
  - Include one memorable, surprising fact per planet (e.g., Mercury has 88-Earth-day years; Venus is hotter than Mercury despite being farther; Jupiter has 95 known moons; Saturn would float on water; Uranus rotates on its side).
  - Briefly mention dwarf planets (Pluto), the Kuiper Belt, and the Oort Cloud at the end.
  - Conclude with how vast the solar system is (light takes more than a day to cross it).
- **Include Source Citations**: Yes (so the fun-fact claims have visible sources)

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 6 · Tier 3 count: 4 · Definition Level: Same as Source · Etymology: off |
| **Outline / Visual Organizer** | central node "Solar System"; 9 branches (Sun + 8 planets); sub-branches for size/composition/key feature |
| **Quiz** | MCQ count: 10 (one per planet plus 2 synthesis questions on order/categories) · Reflection count: 1 · DOK Level: Level 2 |
| **Sentence Frames** | mnemonic-recall prompt: "My Very Educated Mother Just Served Us __" |
| **Image** *(optional)* | generate a labeled solar-system diagram if Image generation is available in your build |

---

## Lesson 4: Conflict Resolution

- **Filename**: `conflict_resolution.json`
- **Title**: 🤝 Conflict Resolution
- **Subject / Grade**: SEL, Grades 2-4
- **Standards**: `CASEL: Relationship Skills` (use **Manual** standards mode; CASEL isn't in CCSS pickers)
- **Standards query** (for AI Match alternative): "CASEL relationship skills competency conflict resolution elementary"
- **Learning objective**: Use I-Statements to describe a conflict from the student's own perspective and propose at least one fair (win-win) solution.

### Step 1: Global Grade Level
Set: **3rd Grade**

### Step 3: Source generation parameters
- **Topic**: "Conflict resolution and using I-Statements for elementary students."
- **Tone**: Step-by-Step
- **Target Level**: 3rd Grade
- **Vocabulary**: conflict, I-Statement, You-Statement, win-win, perspective, solution
- **Length**: 600
- **Custom Instructions**:
  - Open by defining what a conflict is (a problem between two people) and normalize it ("conflicts happen to everyone, even adults").
  - Briefly explain why yelling and hitting don't work and tend to make conflicts bigger.
  - Introduce the I-Statement formula: "I feel ___ when ___ because ___."
  - Show ONE full I-Statement in quotes, with a concrete classroom example (e.g., a borrowed pencil or shared toy).
  - Contrast it with a You-Statement ("You always take my stuff! You're a jerk!") to show why I-Statements work better.
  - Cover the concept of a "win-win" solution where both people feel okay.
  - Distinguish clearly between "tattling" (trying to get someone in trouble) and "asking a trusted adult for help with a real problem." Make explicit that asking for help when something is unsafe is good, not weakness.
  - Use second-person voice ("you") to make it feel like a direct conversation with the student.
- **Include Source Citations**: No

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 3 · Tier 3 count: 3 · Definition Level: Same as Source · Etymology: off |
| **Sentence Frames** | "I feel __ when __ because __." (the I-Statement formula itself, scaffolded) |
| **Quiz** | MCQ count: 4 (4 short scenarios; student picks the best I-Statement response) · Reflection count: 1 · DOK Level: Level 3 |
| **Outline / Visual Organizer** | 3-step process: (1) identify your feeling (2) share an I-Statement (3) find a win-win solution |
| **Adventure** *(optional)* | "Playground Peacemaker" RPG-style scenario from the existing card description; use Adventure Mode if active in your build |

---

## Lesson 5: Ancient Egypt

- **Filename**: `ancient_egypt.json`
- **Title**: 🏛️ Ancient Egypt
- **Subject / Grade**: Social Studies, Grades 4-5
- **Standards**: `C3 D2.His.3.3-5`
- **Standards query**: "5th grade C3 framework historical sources analysis ancient civilizations"
- **Learning objective**: Explain how the Nile River, the pharaohs, and the pyramids shaped life in ancient Egypt.

### Step 1: Global Grade Level
Set: **5th Grade**

### Step 3: Source generation parameters
- **Topic**: "An overview of ancient Egyptian civilization for upper-elementary readers."
- **Tone**: Informative
- **Target Level**: 5th Grade
- **Vocabulary**: Nile, pharaoh, pyramid, hieroglyph, mummification, kemet, Ra, dynasty, Rosetta Stone, afterlife
- **Length**: 1100
- **Custom Instructions**:
  - Cover five major aspects, in this order:
    1. The Nile River and its annual flood. Use the Egyptian word *kemet* ("the black land") for the rich soil it left behind. Explain how the flood made farming possible in the desert.
    2. The pharaoh as a god-king. Mention 3-4 famous pharaohs with one-line descriptions: Khufu (built the Great Pyramid), Hatshepsut (one of the few female pharaohs, ruled peacefully for 22 years), Tutankhamun (boy-king whose tomb was found nearly intact in 1922), Ramses II (66-year reign, built the most monuments).
    3. Mummification and afterlife belief. Briefly describe the process (organs removed, body dried with natron, wrapped in linen). Note that the heart was left in because it was thought to be the seat of the soul.
    4. The pyramids of Giza, especially Khufu's Great Pyramid. Include specific numbers: about 2 million stone blocks, 481 feet tall, the tallest building in the world for 4,000 years.
    5. Hieroglyphic writing and the Rosetta Stone. Mention there are 700+ hieroglyphs and that the code was cracked using the trilingual Rosetta Stone discovered by French soldiers in 1799.
  - Important content guardrail: state that the pyramid workers were skilled laborers, not enslaved people, contrary to older popular accounts.
  - End with one paragraph on Egypt's legacy: how Egyptian ideas, art, and architecture continue to shape modern culture.
- **Include Source Citations**: Yes

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 5 · Tier 3 count: 5 · Definition Level: Same as Source · Etymology: on (kemet, hieroglyph, pharaoh have rich etymologies) |
| **Outline / Visual Organizer** | central node "Ancient Egypt"; 5 branches: river, government, religion, monuments, writing |
| **Quiz** | MCQ count: 8 · Reflection count: 1 · DOK Level: Level 2-3 |
| **Math extension** *(optional)* | use the Math output type with the prompt: "If the Great Pyramid contains about 2 million stone blocks and each block weighs 2.5 tons, what is the total weight in tons?" |
| **Image** *(optional)* | generate a labeled diagram of pyramid cross-section or hieroglyphic alphabet sample |

---

## Lesson 6: Digital Literacy & Online Safety

- **Filename**: `digital_literacy.json`
- **Title**: 🔒 Digital Literacy & Online Safety
- **Subject / Grade**: CTE, Grades 4-8
- **Standards**: `ACTE IT Cluster`, `ISTE 2.a` (use **Manual** standards mode)
- **Standards query**: "ISTE Digital Citizen standard 2 elementary middle school online safety"
- **Learning objective**: Identify three common online threats (weak passwords, phishing, oversharing) and demonstrate at least one defense for each.

### Step 1: Global Grade Level
Set: **6th Grade** (middle of 4-8 range)

### Step 3: Source generation parameters
- **Topic**: "Digital literacy and online safety for middle-grade students."
- **Tone**: Informative
- **Target Level**: 6th Grade
- **Vocabulary**: digital literacy, password, passphrase, phishing, oversharing, two-factor authentication, public Wi-Fi, software update, urgency tactic
- **Length**: 1000
- **Custom Instructions**:
  - Open by acknowledging that the internet is genuinely useful AND that knowing how to use it safely is a real skill (like learning to swim or cross the street).
  - Cover three core threats with at least one defense for each:
    1. **Weak passwords.** Use the most common bad password ("123456") as a cautionary example. Introduce the passphrase strategy with a specific example like "PurpleBananaCloudHorse47!" Explain why long random phrases are easier for humans and harder for computers.
    2. **Phishing.** List 3-4 red flags: urgency tactics ("click NOW or your account is deleted"), misspelled sender domains (amaz0n.com vs amazon.com), unexpected links, requests for personal info or money. Defense: stop and think before clicking; go directly to the real site by typing the URL.
    3. **Oversharing.** Use the "grandparent test" ("would I be okay with my grandparent seeing this?") and "stranger test" ("would I share this with a stranger on the street?") as memorable mental rules. Note that what goes online tends to stay there.
  - Then briefly cover supporting habits: two-factor authentication (2FA), public Wi-Fi caution, accepting software updates promptly.
  - Close by making clear that telling a trusted adult when something feels wrong online is good, not weakness, and that the student will never be in trouble for asking.
  - Avoid scaring tactics or moralizing. Keep tone matter-of-fact and skill-building.
- **Include Source Citations**: Yes (NIST, CISA, or Common Sense Media if AlloFlow's grounding picks them up)

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 5 · Tier 3 count: 5 · Definition Level: Same as Source · Etymology: off |
| **Quiz** | MCQ count: 8 (3 password-strength scenarios, 3 phishing red-flag identification, 2 oversharing judgment calls) · Reflection count: 1 · DOK Level: Level 3 |
| **Sentence Frames** | "Before I post online, I ask myself __." "A red flag in a phishing email is __." |
| **Adventure / Escape Room** *(optional)* | "Hack-Proof Challenge" with 4 padlocks: password strength, phishing spotting, oversharing, 2FA. Use Adventure Mode or the Escape Room module if active. |

---

## Lesson 7: Introduction to Fractions

- **Filename**: `fractions.json`
- **Title**: 🍕 Introduction to Fractions
- **Subject / Grade**: Math, Grade 3
- **Standards**: `CCSS.MATH.3.NF.A.1`
- **Standards query**: "3rd grade Common Core math fractions as part of a whole"
- **Learning objective**: Identify a fraction as a number representing one or more equal parts of a whole, name the numerator and denominator, and represent fractions visually.

### Step 1: Global Grade Level
Set: **3rd Grade**

### Step 3: Source generation parameters
- **Topic**: "Introduction to fractions as parts of a whole, for 3rd graders."
- **Tone**: Step-by-Step
- **Target Level**: 3rd Grade
- **Vocabulary**: fraction, numerator, denominator, whole, equal parts
- **Length**: 600
- **Custom Instructions**:
  - Open with a relatable scenario where four friends share one pizza fairly (each gets 1/4).
  - Define a fraction as one or more EQUAL parts of a whole. Emphasize "equal."
  - Introduce numerator (top number, names how many you have) and denominator (bottom number, total equal parts the whole is divided into).
  - Use the mnemonic "**D** is **D**own at the bottom" for denominator. Use "**N**umerator **N**ames how many you have" for numerator.
  - Show 3-4 specific fraction examples in a visual, narrative way: 1/2 pie, 1/4 pizza, 3/4 of a pizza eaten, 8 slices vs 2 slices.
  - Show that a bigger denominator means MORE pieces total, so each piece is SMALLER. Use the rhetorical question, "would you rather share a pizza with 1 friend or 7?"
  - Explicitly state that when the numerator equals the denominator (e.g., 4/4), the fraction equals 1 whole. Repeat this with 8/8 = 1 and 100/100 = 1 to drive the point.
  - End with 3-4 real-world examples beyond food: a quarter is 1/4 of a dollar, half an hour is 1/2 of an hour, 3/4 cup of flour in a recipe.
- **Include Source Citations**: No

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 3 · Tier 3 count: 3 · Definition Level: Same as Source · Etymology: off |
| **Math** | run the Math output type with the prompt: "Create 5 word problems that ask students to identify the fraction of a whole shown in a visual representation (pizza slices, pie pieces, bars). Mix denominators 2, 3, 4, 6, 8." |
| **Quiz** | MCQ count: 8 (4 visual identification, 2 numerator/denominator definitions, 2 ordering by size) · Reflection count: 1 · DOK Level: Level 1-2 |
| **Sentence Frames** | "I divided __ into __ equal parts. Each part is __." "If I have __ out of __ parts, the fraction is __/__." |
| **Outline / Visual Organizer** | central node "Fraction"; branches for numerator (top), denominator (bottom), visual examples |

---

## Lesson 8 (optional, addresses civil_war/Revolution mismatch): The American Revolution

- **Filename**: `american_revolution.json`
- **Title**: ⚔️ The American Revolution
- **Subject / Grade**: Social Studies, Grade 5
- **Standards**: `C3 D2.His.1.3-5`, `CCSS.RI.5.6`
- **Standards query**: "5th grade C3 historical context American Revolution causes events"
- **Learning objective**: Explain at least three causes of the American Revolution and identify multiple perspectives (colonist, British, Indigenous, enslaved people) on the conflict.

### Step 1: Global Grade Level
Set: **5th Grade**

### Step 3: Source generation parameters
- **Topic**: "An overview of the American Revolution for 5th graders, with multiple perspectives."
- **Tone**: Informative
- **Target Level**: 5th Grade
- **Vocabulary**: revolution, taxation, representation, Loyalist, Patriot, Continental Congress, Declaration of Independence, treaty, perspective
- **Length**: 1100
- **Custom Instructions**:
  - Cover four sections in this order:
    1. **Causes.** Taxation without representation, the Stamp Act, the Boston Tea Party, the Boston Massacre. Explain "no taxation without representation" in plain language.
    2. **Key events on a rough timeline.** Lexington and Concord (1775), Declaration of Independence (1776), Yorktown (1781), Treaty of Paris (1783).
    3. **Key figures.** Pick 4-5 with one-line descriptions: George Washington, Thomas Jefferson, Abigail Adams, Crispus Attucks, Phillis Wheatley.
    4. **Multiple perspectives on the war.** Colonist Patriots who supported independence, Loyalists who didn't, Indigenous nations who chose sides based on their own interests, and enslaved Black Americans who fought on both sides hoping for freedom.
  - Include one direct quote from a primary source if AlloFlow's grounding finds one (e.g., Patrick Henry's "Give me liberty or give me death," or Abigail Adams's "Remember the ladies" letter).
  - Important content guardrail: make explicit that the Declaration's "all men are created equal" excluded enslaved people, women, and Indigenous nations from full participation in the new country. State this matter-of-factly, not as moralizing.
  - Conclude with what "independence" actually meant for different groups, with the unfinished work as a clear thread.
- **Include Source Citations**: Yes

### Step 4: Follow-up outputs

| Output type | Settings |
|---|---|
| **Analysis** | default |
| **Glossary** | Tier 2 count: 5 · Tier 3 count: 4 · Definition Level: Same as Source · Etymology: on (revolution, treaty, congress) |
| **Timeline** | run the Timeline output type with the events listed above (Lexington/Concord, Declaration, Yorktown, Treaty of Paris, plus Stamp Act, Boston Tea Party as precedents) |
| **Outline / Visual Organizer** | central node "American Revolution"; branches for causes, key events, key figures, multiple perspectives, outcomes |
| **Quiz** | MCQ count: 8 (3 causes, 2 events, 2 figures, 1 perspective) · Reflection count: 1 · DOK Level: Level 3 |
| **Sentence Frames** | "From the perspective of __, the Revolution meant __." |

After generating, **also update `library.html` line 209** to point to the new file: change `./examples/civil_war.json` to `./examples/american_revolution.json`.

---

## Tips for getting good AlloFlow output

- **Set the Global Grade Level FIRST** before doing anything else. Every downstream generation calibrates to it. Changing it mid-flow can produce inconsistent reading levels across your outputs.
- **Add Standards before generating outputs**, not after. The analysis and glossary steps will tag content against your standards if they're set first.
- **Don't fill the Topic field with the entire desired text.** Topic is a prompt FOR generation, not pasted source. Keep it 2-4 sentences describing what you want, not the lesson itself.
- **Custom Instructions is the big lever.** That's where you steer voice, structure, mnemonics, examples, and content guardrails (e.g., "make the workers skilled laborers, not enslaved"). Use it for anything you'd otherwise rewrite by hand later.
- **Generate analysis FIRST**, then glossary/outline/etc. The analysis grounds the rest of the outputs by extracting concepts the other tools reference.
- **Quiz MCQ + Reflection count are separate fields.** MCQ count drives how many multiple-choice questions you get; Reflection count drives short-answer prompts. Most lessons here use 5-10 MCQ + 1 Reflection.
- **DOK Level (Depth of Knowledge)** controls cognitive complexity of quiz items. Level 1 = recall, Level 2 = skill/concept, Level 3 = strategic thinking, Level 4 = extended thinking. The briefs above pick a sensible default per lesson; bump up or down to taste.
- **Save Project / Export JSON happens at the project level**, not per-output. Generate everything you want for one lesson first, THEN export once at the end.
- **Look at `examples/photosynthesis.json` as your reference shape.** It has a `mode` field plus a `history` array of items (analysis, glossary, etc.). Your new lessons will export in the same shape since they come out of the same pipeline.

When something feels off (lesson is too dry, or skips a key concept, or inserts a wrong fact), iterate on **Custom Instructions** rather than hand-editing the output. The instructions are the steering wheel; the output is the road.
