# Universal Settings: set it once, not per tool

Universal Settings is one card that holds the choices most generators inherit. Set the instructional audience once and the glossary, quiz, lesson plan, and adapted text use the same context. The Source Generator keeps its own primary-source grade control, so the app can distinguish the standard's instructional grade from an access text's language-complexity target.

Open it before you generate anything. That single habit prevents most of the "why does this pack feel mismatched" problems teachers report.

If you have not made a resource yet, start with [Start here](01-start-here.md). To see how these settings fit a full planning routine, see [Prepare a lesson](02-prepare-a-lesson.md).

## What the card controls

The panel gathers the settings that would otherwise repeat in every tool.

![Universal Settings with grade level, output language, and per-setting coverage notes](../assets/screenshots/07-universal-settings.png)

*Interface reference captured August 16, 2026 from the public AlloFlow deployment. The note at the top and the "applies to" lines under each control state exactly which resources a setting reaches.*

| Setting | What it does | Where you notice it |
| --- | --- | --- |
| **Grade level** | Sets the reading and complexity target for new resources. | Sentence length, vocabulary, and question difficulty. |
| **Output language** | Sets the language generated content is written in. | The text students read. |
| **Translations** | Decides whether a second-language version is attached. | A translation block beside the main content. |
| **Standards** | Supplies the standard or framework the content should align to. | Quiz items, objectives, and lesson plans. |
| **Student interests** | Adds a theme or context to examples. | Word problems, scenarios, and prompts. |
| **Depth of Knowledge** | Sets the level of thinking the task should demand. | Question stems and task verbs. |
| **Emoji** | Adds emoji as visual cues in generated material. | Glossary terms, headings, and directions. |
| **Image style** | Sets the lesson-wide visual default for resources that create images. | Visuals, Glossary, Timeline, Concept Sort, Word Sounds, and Adventure when it uses the Universal style. |

Each control tells you how many kinds of resource actually use it. Read that number before you spend time on a setting. Some controls reach almost everything; others reach two or three tools.

You can collapse the card once you are done. The summary line stays visible, so you can check your choices without opening the panel again.

## The rule that surprises teachers

**Universal Settings applies to new work only.**

A resource keeps the settings it was built with. If you generate a glossary at grade 3, then change the grade to grade 7, the glossary you already have is still grade 3. Nothing rewrites itself.

So if a pack looks inconsistent:

1. Check the summary line for the settings in force now.
2. Find the resource that looks wrong.
3. Regenerate that resource, or regenerate the pack, so every part shares one setting.

This is worth checking before you conclude a tool got something wrong. A mismatched pack is usually a settings history problem, not a generation problem.

## Set image style once unless a resource needs an exception

Use **Image style** in Universal Settings to keep one lesson visually coherent. Visuals, Glossary, and Word Sounds begin on **Use Universal style**; their own preset and custom-style controls appear only after you choose **Override for this resource**. Timeline and Concept Sort use the Universal style directly. Adventure keeps story-specific presets, with **Use Universal style** available when continuity matters more than a separate story look.

Choose an override for an instructional reason—for example, a simple line-drawing style for a worksheet that must photocopy clearly—not merely because the same selector is visible. Return the resource to **Use Universal style** when the exception is no longer needed. A change affects new or regenerated images; it does not restyle images that already exist.

## Separate the requested grade from internal calibration

The grade you select is the educator-facing target. It is not silently relabeled as a lower instructional grade. For source writing, AlloFlow may use a lower internal prompt target to compensate for a model's tendency to overshoot. The resource still records the grade you requested, the internal calibration target, and—when an English readability check is appropriate—the measured result as separate facts.

That distinction matters:

- **Instructional grade** identifies the standards and intellectual target.
- **Requested text complexity** identifies the intended language load for this resource.
- **Internal calibration** is a generation technique, not a recommendation about what students should read.
- **Measured complexity** is evidence about the resulting text, not proof that it is instructionally appropriate.

Flesch–Kincaid is an English screening measure based mainly on word and sentence patterns. It cannot judge knowledge demands, text structure, content accuracy, cultural context, or the reader and task. AlloFlow therefore does not show an English grade-level verdict for non-English or bilingual text.

Do this before you share:

- Read a paragraph aloud and listen for sentences a student would lose track of.
- Look for words you would have to stop and define.
- Compare the result against something you know sits at the right grade.
- Use the recorded level check as one signal, then review content, structure, and the actual task.

If an adapted version is used as a companion, leave its role as **Supplemental access version** and keep the linked primary text available as required by the lesson, standard, and local policy. Designating an adapted version as a primary replacement requires an explicit educator choice; AlloFlow does not infer an IEP, modification, or authorization. Lowering language load is not the same as lowering the learning goal. See [Prepare a lesson](02-prepare-a-lesson.md) for how to protect the intellectual target while changing text complexity.

## Set the language and decide about translations

Two separate controls do two different jobs.

**Output language** is the language the resource is written in. If your class works in Spanish, set it to Spanish and the content comes back in Spanish.

**Translations** decides whether a second version rides along with it. It offers three kinds of answer:

- **Automatic** attaches a version in the language you set the app interface to, whenever the content is in a different language. This is the default.
- **None** turns second-language versions off everywhere.
- **A named language** attaches a version in exactly that language.

A hint line under the control always says in plain words what will happen, such as "Resources in Spanish will also include an English version." You do not have to open the list to know where you stand.

The Translations control appears only when it would do something. If your interface and your output language are both English, there is nothing to translate into, so the control stays hidden. It appears as soon as the two differ.

Two cautions:

- A translation is generated text. Check it the way you would check any other generated content, especially for subject vocabulary. A word that is correct in general use can be wrong in a science or mathematics context.
- Ask a proficient speaker to read anything a family will receive. A translation that is merely understandable is not the same as one that is respectful and clear.

## Watch emoji around word activities

Emoji make headings and glossary terms easier to scan for some students. They also carry costs worth knowing about:

- Read-aloud tools may name each emoji out loud, which interrupts the sentence.
- Emoji change how a term looks in letter-based activities such as word scrambles and crosswords.
- Some fonts and older devices cannot display every emoji and show an empty box instead.

Turn emoji on when the visual cue helps and you have previewed the result. Turn them off when the same resource will be printed, read aloud, or used in a spelling or letter puzzle.

## A two-minute preflight

Before you generate the first resource for a lesson:

- Set the instructional grade to match the standards and learning target; use an adapted companion when a different language-complexity target is appropriate.
- Set the output language your class will read.
- Check the Translations line and confirm it says what you expect.
- Add a standard only if you will actually use the alignment.
- Add an interest only if it makes the task clearer, not just more decorated.
- Set Depth of Knowledge to the thinking the goal requires.
- Decide about emoji based on how the resource will be used.
- Collapse the card and confirm the summary line matches your intent.

Then generate one resource and read it before making anything else. See [Accessibility and UDL](04-accessibility-and-udl.md) for the learner-experience check, and [Troubleshooting](08-troubleshooting.md) if a setting does not seem to take effect.
