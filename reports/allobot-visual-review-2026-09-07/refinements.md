# Allobot visual and personality review

The refinement keeps Allobot's rounded shape, colorful shell, bright bead eyes, blush and smile. The main opportunity was reducing overlapping motion so the character feels present while leaving room for reading and thinking.

[Try the interactive comparison](index.html) · [View all 30 captures](gallery.html)

## Changes

| Behavior | Before | Refined |
| --- | --- | --- |
| Resting float | 8 CSS pixels over 3 seconds | 2 CSS pixels over 6 seconds |
| Breathing, hands and shadow | Noticeable squash, hand bob and shrinking shadow | Small, coordinated movements with a shared six-second rhythm |
| Ambient glance | 80% pointer response, held indefinitely | 40% response, settling after 1.6 seconds; direct hover stays expressive |
| Typing and scrolling | Background motion continues | Decorative motion pauses, then resumes after three quiet seconds |
| Antenna | Random large bounces and expanding broadcasts; a ping while thinking | One small hover greeting with a cooldown; a steady, gentle glow for active states |
| Unprompted gestures | Wave, shrug, look-around or backflip | A small look-around, deferred during recent activity, speech, listening or generation |
| Concerned expression | Strong brow lift, deeper frown and tear | Softer brows and a shallow frown, with no tear |

Blinks, smiles, listening cues, speech articulation, explicit gestures and celebrations remain. The existing controls, voice ownership, sleep and keyboard movement are preserved. App and operating-system reduced-motion preferences still provide a static presentation.

The visual hierarchy is now the face first, a quiet body rhythm second, and larger reactions for meaningful interactions. The more restrained concerned expression is intended to convey support without making the bot appear distressed.

## Verification

- 162 focused checks passed across runtime behavior, motion accessibility, accessories, generation, sleep/hide, microphone feedback, student tips, keyboard movement and the visual harness.
- Reviewed 30 browser captures at 64px and 200%, including light, dark and high-contrast themes, four moods, voice states, sleeping, controls and accessories.
- Browser measurements confirmed the 8px-to-2px float change and 3s-to-6s cycle. Typing paused both float and breath and centered the eyes; the listening lamp remained active. Reduced motion left zero running avatar animations.
- The interactive comparison was exercised in Chromium: both avatars render, mood and motion controls work, and typing activates quiet presence.
- Browser and desktop modules are identical. The stylesheet and visual baseline were updated after capture review.

The new tests also caught two lifecycle details that were corrected: hover-hint typing could cancel the greeting, and changing dependencies could strand an idle gesture after its end timer was cleared.

## Follow-up observation

These changes are a design judgment, rather than a measured preference result. A short observation with learners and educators should ask whether Allobot feels friendly, whether its state is understandable, and whether attention returns easily to the task. The preview offers actual-size and enlarged views for that comparison.
