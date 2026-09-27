# Dissection clipping scope regression

The narrow Chromium check passed on 2026-09-27: seven expected pre-fix failures reproduced, then all seven corrected specimen renderings passed. The staged pre-fix Git blob at validation time was `33da07e923ddca85daae042644eb578b9c4d01c4`, SHA256 `78753c4b0e111a1b581c8292c596a16f2fa80a1e5ed2b8b85f71c9ef675ee319`. Corrected canonical and public copies both had SHA256 `91cb6877d757768b5c9002d5119a3b875330966ae62b4f8e8b6635f86869df8a`.

`browser-current.cjs` reads the staged pre-fix source and current canonical source, serves each with a strict-mode prefix, and uses the existing STEM browser harness with real Canvas2D. At this run the staged version threw its corresponding missing trace-function ReferenceError for frog, earthworm, pig, perch, crayfish, sheep eye and sheep heart. The corrected version completed three native `clipSpecimenSurface` calls on each explicit redraw, with no caught render-console errors, page errors or external requests. All four monitored source/harness inputs remained unchanged.

The clip probe wraps the native Canvas2D method only to record its caller; it executes the original method unchanged. It checks the condition/material paths with realistic skin, scene detail and a dehydrated specimen. It does not substitute a drawing implementation, suppress errors, or weaken acceptance based on screenshot appearance. Console errors matter here because the production renderer catches draw exceptions internally.

The staged comparison depends on the index contents at invocation. Do not interpret a rerun after staging the correction as the same pre-fix reproduction; retain the recorded blob identity and `browser-results.json` for that historical evidence. This was a strict-context scope regression, not proof that the prior classic-script release threw in every browser. Annex B compatibility can mask the old declarations. No broad visual, accessibility, application/deployment or performance acceptance is claimed.

Only this report fixture, log and receipt were written by the validation agent; runtime and Git changes remained with the integrator.
