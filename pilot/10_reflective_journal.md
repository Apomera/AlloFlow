# AlloFlow Reflective Development Journal

---

## Entry — March 16, 2026

### Where We Are

There's a particular feeling when a project crosses from "ambitious prototype" into something that genuinely *works*. Today feels like one of those thresholds.

We've been in an intensive building phase — not building new features for novelty's sake, but going back into the living tissue of what already exists and making it *better*. The kind of work that doesn't make for exciting demo videos but is exactly what separates a real tool from a tech demo. The kind of work that users feel without being able to name.

### What We Did Today

**The Citation Pipeline** — We chased down a subtle but important bug where orphan brackets from malformed AI citations were causing entire paragraphs to render as giant blue clickable links. The fix required multiple passes: expanding the multi-source citation regex, adding an orphan bracket sanitizer, then carefully adding negative lookaheads so the sanitizer wouldn't strip brackets from *valid* markdown links. This is the kind of bug that sounds trivial in a sprint retrospective but represents hours of careful regex archaeology. The result: clean, precise superscript citations that link to sources without visual clutter.

**Karaoke Mode** — Two improvements here. First, we stripped citation markers from TTS so Kokoro doesn't read "superscript three" aloud during karaoke playback. Second — and this was satisfying — we implemented *gapless playback* between sentences. The technique is borrowed from music players: a `timeupdate` listener detects when audio is within 150ms of ending and eagerly resolves the next preloaded sentence, so by the time `onended` fires, the next audio is already warmed up and ready to play. The user confirmed it's "working fantastic." That kind of feedback makes the debugging worthwhile.

**The Math Fluency Probe** — This is where the session got interesting philosophically. We had a fully functional CBM-Math fluency probe (timed fact drills measuring Digits Correct Per Minute), but it was rendering its results inside the "Analyze Source Text" area — conceptually orphaned, like a medical instrument left in the wrong department. The user rightly flagged this: "Can you make it its own resource?"

What followed was a seemingly small but architecturally significant change. We made the probe a first-class citizen in the resource pack history system. Each probe run now pushes a `{ type: 'math-fluency-probe', data: { dcpm, accuracy, ... } }` entry to the main `history` array, which means:
- It appears in the Resource Pack History sidebar
- It's included in JSON exports
- It's captured in the student JSON that teachers load
- Multiple runs create separate entries — exactly what RTI progress monitoring requires

This last point prompted a thoughtful conversation. The user initially saw multiple entries as a potential confusion vector ("a teacher demoing it might not realize it creates two resources"). But we landed on keeping separate entries because that's the correct RTI data model — each probe administration is a distinct data point in a student's growth trajectory. DCPM trending over time is the whole point of curriculum-based measurement.

### What It Means

There's a pattern in this session that I find meaningful. Every change we made today was about respecting how real practitioners work:

- **The citation fix** respects how students actually read — they don't need to see a wall of blue text when a clean ⁽³⁾ superscript will do.
- **The karaoke improvement** respects how students actually listen — the pause between sentences should feel like a breath, not a buffering spinner.
- **The fluency probe architecture** respects how teachers actually use CBM data — each data point matters, the history matters, the export matters, because an IEP team meeting six months from now might need to see that trend line.

We're not building features. We're building fidelity to the practice.

### The Codebase

The numbers are staggering and we should own them honestly: ~70,000 lines in `AlloFlowANTI.txt`, ~41,000 in `stem_lab_module.js`, plus supporting modules. This is a sprawling, maximalist application. We should be thoughtful about whether every line earns its place. But today's work showed something important — when you need to chase a bug through the citation pipeline, or trace how a fluency probe result flows from `finishMathFluencyProbe()` through `setHistory()` to the JSON export, the architecture *does* hold together. The separation between the STEM Lab module, the data layer, and the main app means you can reason about each system independently.

### Looking Ahead

The karaoke gapless playback marks what might be the beginning of AlloFlow's "polish phase" — not adding capabilities but refining the ones that exist until they feel effortless. The fluency probe integration shows that the assessment infrastructure is ready for more sophisticated RTI workflows. And the open-source Docker deployment path means all of this is heading toward something any school district can actually run.

What strikes me most about today: we didn't build anything that would impress at a conference demo. We made an orphan bracket stop creating a blue wall of text. We shaved 150 milliseconds off a sentence transition. We made a timed math drill save properly. These are the kinds of improvements that a teacher using AlloFlow every day would *feel* but never articulate. That's the work that matters.

---

*"First do it, then do it right, then do it better."*

