# Allobot visual review: second pass

This pass preserves the face, colors and gentle motion from the first refinement. It makes the personality more consistent across keyboard use, decorative accessories and long-running activities.

[Open the updated comparison](index.html) · [View the expanded gallery](gallery.html)

## Refinements

- **A keyboard greeting.** Focusing Allobot gives the same brief antenna greeting as hover. Moving between its controls does not repeat the greeting, and keyboard focus does not create a pointer-following glance.
- **Consistent quiet accessories.** Seven more decorative motions now pause during typing or scrolling: timer hands, cap sway, the preparation stopwatch, inbox arrow, progress ornament, maze flag and folder page. They resume afterward. Entrance animations and actual microphone/generation cues remain active.
- **Considerate idle tips.** The five-minute fallback now shares the normal idle routine's busy-state checks. It cannot interrupt a long generation, listening session or system-audio session with an idle suggestion.
- **Correct SVG pausing.** Visibility and reduced-motion handling now target Allobot's own SVG, rather than a satellite-control icon. The hologram's SVG animations pause offscreen, resume on return and reset to a static frame under reduced motion.

The isolated preview was also missing the application's overflow styling. That clipped parts of side accessories and the generation display in captures. The preview and capture harness now match the application's existing overflow-visible behavior, and the comparison has enough height for the full display. Both original and refined previews receive the same correction. An accessory selector makes the pause/resume comparison easier to try.

## Verification

- 168 focused regression checks passed across nine test files.
- Chromium verified seven accessory loops running at rest, pausing during work and resuming afterward; accessory entrances were preserved.
- Native keyboard focus and Tab navigation were exercised, with the one-time greeting confirmed.
- Listening and generation indicators remained animated during quiet presence.
- The actual avatar SVG paused offscreen and resumed onscreen. Reduced motion produced a paused SVG at time zero and no running CSS animations.
- Reviewed 30 refreshed core captures and seven additional accessory captures. The before-and-after preview was exercised with mood, accessory, typing and reduced-motion controls.
- All 30 core scenarios rendered twice with stable pixels; the reviewed visual baseline and its nine contract checks passed.
- Browser and desktop modules match exactly.

The remaining judgment is preference: these checks establish reliable behavior, while the user's positive response supports preserving the current visual direction.
