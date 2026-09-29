# Life Skills: engagement review and original life-simulation concept

Reviewed September 28, 2026. Audience: mixed ages with highly varied support needs.

## Recommendation

Build an original, educational life-simulation experience around the existing Life Skills Lab. A small persistent home and neighborhood could connect practical activities, choices, characters, and visible consequences. Use 3D where space and objects carry useful information; retain equally capable structured and 2D interaction modes.

**Working title: Adulting: Practice Mode.** This is a creative direction, not a cleared name. For younger learners, use the existing Life Skills Lab umbrella and age-appropriate campaign names. The game can share its underlying skills across age groups while changing roles, language, and circumstances.

The first investment should deepen existing interactions and connect them into missions. The project already contains six 3D labs. Additional rooms alone would add little instructional depth.

## What I reviewed

- The main Life Skills module, its navigation, rewards, activities, persistence, and links to the six 3D labs.
- Kitchen, laundry, home safety, repair, transit, and capstone source, plus their relevant tests.
- Local browser walkthroughs of the kitchen and capstone. Confirmed that clicking the kitchen handwashing checklist marks the task complete; also observed the capstone advancing after a correct choice.
- Primary studies and official educational, accessibility, copyright, and trademark guidance linked below.

This is a product and source review, with limited browser inspection. It is not a learner study, comprehensive accessibility audit, trademark clearance, or legal opinion. No application code was changed and the test suite was not run for this review.

## 1. Existing strengths and gaps

### Substantial content already exists

The hub contains 33 tabs, five suggested paths, and six 3D labs. Topics span money, decisions, paperwork, transportation, work, communication, daily routines, home care, and food. Existing activities include calculations, decision matrices, label reading, laundry configuration, interview role-play, checklists, and reflections.

The 3D labs already offer useful access and coaching foundations: checklist alternatives, status announcements, view presets, hints, explanations, pause/help, reflection, confidence, and saved progress. The capstone goes further with linked missions, adjustable support, changed contexts, shuffled challenge choices, targeted replay, and three-step action rehearsal. Preserve these capabilities.

Sources: [hub inventory](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_lifeskills.js), lines 70–122; [kitchen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_kitchen/life_skills_kitchen.html), lines 277–370; [capstone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_capstone/life_skills_capstone.html), lines 370–430 and 524–585.

### Five topic labs largely assess recognition and sequence

In the kitchen, `activateTask()` marks a task done after the learner selects its object or checklist button, subject to the guided order. It does not require manipulating equipment or interpreting a reading. The separate three-question scenario panel offers decision practice, but task completion does not depend on completing it.

This can teach locating objects and recalling a routine. It does not establish procedural competence. The completion message currently overstates what six clicks demonstrate.

The capstone is a better foundation for expansion, although its action rehearsal still mainly uses labeled buttons. Its discrete scene effects can become the beginnings of a more responsive world.

Sources: [kitchen activation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_kitchen/life_skills_kitchen.html), lines 647–681; [capstone action choices](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_capstone/life_skills_capstone.html), lines 640–656 and 725–745.

### The hub makes learners navigate before choosing a purpose

The interface presents 33 wrapping tabs. Start Here then presents passport information, paths, and numerous quick-entry cards before the personal goal form. The five paths name sequences but do not provide a shared consequential experience. For example, paycheck estimates and budget income are independently configured.

Lead with: **What would you like to do today?** Offer a few practical missions, Continue, and Explore. Keep the full activity library available through a secondary entry. Let a learner launch one familiar activity directly.

Sources: [hub navigation and overview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_lifeskills.js), lines 3872–4115; paycheck calculation at 2304–2305 and separate budget default at 2444.

### Engagement depends too much on points and revealed answers

Some badges reward changing a control or revealing content. The contract activity labels the traps before learners select them. Topic-lab scenario answers place the safe response first. Those are useful teaching cues, but independent practice needs a different assessment design.

Make feedback explain consequences and support revision. Reward meaningful accomplishments, help-seeking, and improved strategies. Keep exploration achievements separate from evidence of skill.

Sources: [hub rewards and contract activity](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_lifeskills.js), lines 4297–4349, 6994, and 7212; [kitchen scenarios](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_kitchen/life_skills_kitchen.html), line 392 and choice rendering at 779–788.

## 2. Proposed game: a neighborhood for practicing everyday life

### The player experience

Learners create a character, choose a living context, personalize a small home, and select goals that matter to them. They plan a day and interact with household objects, readable documents, transport information, and a few recurring characters.

Each session has a manageable purpose: prepare for an outing, host a friend, get ready for a shift, organize a shared space, or resolve a changed plan. Characters have preferences and practical needs. Several solutions can succeed.

The world remembers meaningful results: groceries bought, a meal prepared, a plan revised, a repair request sent, or a useful household setup. Those changes provide continuity and reasons to return.

### Core loop

1. **Choose a goal.** Pick a situation, preferred support, and a short or extended session.
2. **Make a plan.** Identify needed items, people, money, or time. Introduce only the resources relevant to this mission.
3. **Act.** Inspect, compare, arrange, operate, communicate, and ask for support.
4. **See the result.** Objects and plans change in understandable ways.
5. **Revise.** Pause, get a cue, replay a decision, or try a different reasonable solution.
6. **Apply it again.** Change one meaningful condition and offer an optional corresponding real-world practice task.

### Example: get ready for an outing

The learner chooses an outing appropriate to their context: a club, library visit, social event, or work shift. They select needed clothing, prepare food, pack a bag, and plan transport. A forecast or route change introduces a reason to reconsider the plan.

| Moment | Player action | Educational evidence |
|---|---|---|
| Choose clothing | Inspect weather and garment information | Uses relevant evidence to choose suitable items |
| Prepare food | Select ingredients and arrange preparation tools | Plans a sequence and identifies relevant constraints |
| Pack | Choose necessary items from several plausible options | Matches items to the actual purpose |
| Travel | Compare departure and arrival information | Builds a workable plan with appropriate support |
| Recover | Respond to a changed departure or unavailable item | Revises the plan or asks a useful question |

At high support, show one decision at a time with pictures, narration, and a model. At lower instructional support, combine decisions and introduce unfamiliar examples. Keep accessibility tools available in every condition.

### Make customization part of learning

- Arrange a kitchen so frequently used items are reachable and work areas make sense.
- Organize storage around a learner's own routine.
- Furnish a room within a fictional budget while considering space and access.
- Plan a meal around preferences, available equipment, and resources.
- Prepare a shared gathering and negotiate responsibilities.

Offer cosmetic personalization from the beginning. Use earned decorations, recipe collections, or visible community projects as optional rewards. Necessary access tools and learning activities remain available regardless of score.

### Meaningful simulation systems

Start with a few understandable systems: inventory, object state, a plan, and optional money/time constraints. Introduce them gradually. Track concrete outcomes such as available ingredients, completed preparation, or arrival time.

Avoid treating a simulated happiness or stress meter as a psychological measurement. Learners choose what matters to their character. Include family homes, shared housing, supported living, walking, public transport, and asking for help as ordinary valid ways of living.

## 3. Where 3D adds value

| Experience | Suggested presentation | Rationale |
|---|---|---|
| Kitchen preparation | 3D or fixed isometric scene plus structured actions | Placement, equipment, and sequencing are relevant |
| Laundry | Interactive 2D or 3D task station | Labels, sorting, amounts, and settings carry the learning |
| Transit | Readable map/timetable plus small 3D stop | Use 3D for orientation and landmarks; keep information easy to read |
| Home organization and simple repair decisions | 3D with focused object views | Spatial access and visible cause/effect can matter |
| Grocery shopping | Good candidate for one new scene after the first pilot | Search, comparison, substitutions, and a shopping plan connect several skills |
| Budget, contracts, calendars, messages | Interactive documents and 2D tools inside the world | Legibility and reasoning are central |
| Conversation | Branching dialogue or reviewed role-play | Useful questions, boundaries, and repair matter more than character realism |

Use a calm, original, stylized world with a fixed or easily controlled camera. Prioritize recognizable objects, readable labels, and visible consequences over elaborate animation. In the observed kitchen preview, the scene stretched with the long coaching column; at a 1280 × 801 CSS-pixel viewport it was about 1269 pixels tall, with substantial empty ceiling. Fit the main task and active controls together and expand explanations on demand.

A shared scenario model should drive both the 3D scene and the accessible interface. For example, `select garment → inspect label → choose load → set cycle` should change the same underlying task state whichever input method is used. Camera navigation should be optional unless navigation itself is the skill.

## 4. Design for mixed ages and varied support

Configure these dimensions independently:

| Dimension | Examples |
|---|---|
| Life context | Family home, school, shared apartment, supported living, work |
| Language | Plain language, symbols, narration, richer detail, translation |
| Instructional support | Demonstration, prompts, guided practice, independent attempt |
| Complexity | One action, a short routine, several priorities, changed conditions |
| Access | Keyboard, touch, switch-compatible controls, screen reader, reduced motion |

An adult using symbols and extensive coaching should still receive adult roles, appearance, and respectful language. A younger learner can reason deeply within an appropriate setting. Replace the capstone's repeated “responsible adult” wording with a contextual support role where appropriate.

Allow pause, save, replay, quiet mode, captions, and fixed views. Provide select-and-place alternatives to dragging, plus keyboard support. For a learner who cannot use visual space, provide the relevant spatial relationships explicitly and an equivalent task; be precise about what was assessed.

Distinguish an instructional hint that supplies an answer from an access tool that makes the task perceivable. Screen-reader use, AAC, magnification, or extra input time must not lower a mastery rating. Recognize competent use of assistance and interdependence.

This direction aligns with choice, relevant goals, graduated practice, and varied ways of responding in [CAST's UDL Guidelines](https://udlguidelines.cast.org/). [W3C's dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) explains why keyboard support and a simple pointer alternative are separate requirements. [XR Accessibility User Requirements](https://www.w3.org/TR/xaur/) provides additional design guidance; it is a Working Group Note, not a conformance standard.

## 5. Protect educational value

### Define the skill before the scene

Every mission needs a visible purpose, observable success criteria, likely misconceptions, useful feedback, and a changed-context follow-up. Separate factual/safety constraints from personal preferences. A learner's meal choice or living arrangement should not be graded against one preferred lifestyle.

Use reviewed content for consequential safety, health, money, and legal scenarios, with dates and jurisdiction where relevant. If AI is used for conversational variety, keep scoring rules and essential guidance within the reviewed scenario design.

### Improve the existing evidence model

Track four separate things:

1. Exposure and exploration.
2. Performance with specified instructional support.
3. Performance on a new example, including recovery and appropriate help-seeking.
4. Optional real-world observation, with its source and date.

The capstone already records first-try, self-corrected, and coached outcomes. However, its first-try classification checks attempts and explicit hints while guided choices may visibly cue the correct answer. Store support mode and answer cues alongside outcomes. A first click in guided mode is not evidence of independent performance.

Source: [capstone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_capstone/life_skills_capstone.html), lines 482–485 and 652–656; [passport integration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_lifeskills.js), lines 1946–1952.

### Repair scoring issues before expanding rewards

Source inspection identified these specific issues:

- Challenge scores can be repeatedly awarded for the same question because checking does not advance or mark the item as already scored (3742–3754).
- AI Next stores `chalAIQ`, but the displayed and scored question still comes from the fixed bank (3739–3740 and 7801).
- The dental scenario handler increments the score on every correct click, so one scenario can satisfy a badge described as three decisions (2655–2664).
- Contract traps are already labeled before selection, so the activity currently measures revealing information (4334–4349).

These are source-confirmed observations; the Challenge, AI, and dental cases were not reproduced in the browser during this review. The relevant file is [stem_tool_lifeskills.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_lifeskills.js).

## 6. What research supports—and its limits

- A trial with 145 adults with mild-to-moderate intellectual disability found that immersive VR improved cooking and cleaning relative to a control group, but life-skill gains were not significantly different from traditional instruction. Assessment occurred shortly after training. This supports further investigation of contextual practice, not a claim that desktop 3D is superior. [Cheung et al., 2022](https://www.sciencedirect.com/science/article/pii/S2666138122000251)
- A small desktop supermarket study found transfer to a real shopping task among learners with severe learning difficulties. Its small matched sample, age, and design limit generalization. [Cromby et al., 1996](https://www.icdvrat.com/1996/P/1996_12.pdf)
- A university science experiment found greater presence but lower learning in immersive VR than on desktop. This is a different population and topic; it illustrates why immersion and learning need separate measurement. [Makransky et al., 2019](https://www.sciencedirect.com/science/article/abs/pii/S0959475217303274)

These sources inform the design recommendations. They do not validate this proposed game. Desktop 3D, headset VR, photo-based practice, and video instruction are different formats.

## 7. Original identity and the “adulting” title

### General U.S. guidance

An original life-simulation game can use broad ideas such as characters, homes, routines, resource planning, and choices. The U.S. Copyright Office distinguishes a game's idea and methods from protectable expressive material such as its art and text. A new title alone does not resolve copying of protected expression. [Copyright Office: Games](https://www.copyright.gov/register/tx-games.html)

Trademark concerns include whether a name or visual identity creates confusion about source or affiliation; identical wording is not required. [USPTO: likelihood of confusion](https://www.uspto.gov/trademarks/search/likelihood-confusion)

Develop original characters, models, interface, writing, sounds, icons, and branding. Use original or appropriately licensed assets and record their provenance. Avoid The Sims wording in the product name, its green Plumbob, lookalike logos, copied screens, and EA game assets. Describe the product publicly as an educational life simulation. EA's content policy expressly identifies The Sims and the Plumbob as its marks and restricts using its content for spin-off or knock-off products. That policy is not a blanket description of what copyright law permits. [EA content policy](https://help.ea.com/en/articles/security-and-rules/ea-content-policy/)

### Naming direction

| Working direction | Design value | Status |
|---|---|---|
| Adulting: Practice Mode | Playful, reassuring, and clear about rehearsal | Creative candidate; not cleared |
| Adulting: One Day at a Time | Emphasizes manageable routines | Creative candidate; not cleared |
| Adulting: Small Wins | Emphasizes achievable progress | Creative candidate; not cleared |
| Life Skills Lab, with an Adulting campaign | Keeps an inclusive umbrella for mixed ages | Builds on the existing product structure; new branding still needs review |

Keep “adulting” optional for learners who prefer a neutral title. It may appeal to some adults and teens and feel patronizing or irrelevant to others; test the wording with the actual audience.

A preliminary web search found existing [Adulting!](https://eric-c-wilder.itch.io/adulting), [Adulting Simulator](https://ovinisilv.itch.io/adulting-simulator), and [The Adulting Quest](https://theadultingquest.com/) products. “Adulting In Progress” is also a [podcast title](https://open.spotify.com/show/2hCPprHF7pIvywIj8Cwn3Q). These findings do not determine infringement or ownership, but show that the naming space is occupied.

No candidate here is represented as legally available. Before launch, check exact and similar names across relevant trademark registries and existing commercial uses, then obtain professional review for the release markets. Adding a house brand does not automatically cure a conflicting title. [USPTO clearance guidance](https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks)

## 8. Practical delivery sequence

### First: make one mission worth replaying

- Simplify the mission entry and expose support choices early.
- Correct completion/scoring claims and repeated-score defects.
- Build one small home scene using existing kitchen and laundry content, with an outing planner connected to transit.
- Implement a few genuine object actions and a structured equivalent through one shared task model.
- Preserve progress and offer two or three meaningful variations.
- Use original visual assets and the working title only during development.

### Then: create continuity

- Carry inventory, plans, purchases, and selected constraints between activities.
- Add a few recurring characters with reviewed branching conversations.
- Expand the capstone's replay and changed-context approach.
- Add optional home customization and a private record of demonstrated skills.
- Provide educator controls for mission selection, instructional supports, content, and observation notes.

### Finally: add a new location if it earns its place

The strongest first candidate is a small grocery shop, because it connects food planning, labels, quantities, substitutions, budgeting, and communication. A workplace or community hub can follow if learner evaluation supports it. Relative effort is substantially higher for new worlds, character behavior, and content authoring than for repairing the current progression and task logic; estimate schedules only after the first mission's mechanics and access requirements are defined.

### Pilot decision

Compare equivalent versions of one mission using 3D and 2D/structured presentation, while respecting learners' required access modes. Keep objectives, feedback, content, and practice opportunities comparable. Counterbalance order where appropriate. Include learners across the intended ages, support profiles, input methods, and actual classroom devices.

Measure independent decisions under the learner's usual access supports, instructional prompts, recovery, a changed scenario, delayed retention, and an appropriate real-world observation. Separately measure enjoyment, voluntary replay, frustration, and device/access failures. Do not infer mastery from time spent or number of clicks. Broaden the world when the pilot demonstrates worthwhile learning and engagement for the intended learners.

**Recommended next design target: one connected “get ready for an outing” mission with a persistent home, meaningful object actions, and equivalent accessible controls.** That creates a concrete basis for deciding how much larger the game should become.
