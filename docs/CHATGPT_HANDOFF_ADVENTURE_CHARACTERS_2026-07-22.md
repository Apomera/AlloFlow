# Handoff: Adventure Mode "Consistent Characters" wave (3 items)

**Date:** 2026-07-22 · **From:** Claude (Fable) session with Aaron · **For:** ChatGPT (or any executor)
**Repo:** `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` (git, branch `main`, SHARED working tree — see §7 rules)

## 0. Mission and decisions already made with Aaron (do not re-litigate)

Three build items for Adventure Mode's consistent-characters feature. Decisions locked:

1. **Upload guard + privacy disclosure** for user-uploaded portraits (photos CAN cross to the AI provider today with no notice — fix that with a consent moment + doc note). Google-education DPA coverage means this is a *disclosure* concern, not a prohibition. Primary surface is the Gemini app's **Canvas, which auto-provisions the API key** (user never enters one); only the **desktop** build uses user-entered/BYOK keys — wording must fit both ("sent to the AI provider configured for this app").
2. **Exposition / establishing scene**: when the cast lobby opens at adventure start, generate a characterless "establishing shot" image immediately so the lobby period isn't a dead spinner. (Aaron's idea; agreed high-value. First *real* scene image must still wait for lobby confirm because edited character appearances feed it.)
3. **Reference-sheet hardening, GEMINI-GATED**: the per-scene consistency pass currently sends only the PROTAGONIST's portrait, though help text promises a "reference sheet." Composite up to 4 cast portraits into one grid image and pass that instead — **but only when the active image-edit backend is Gemini** (OpenAI image models don't support this reference pathway; the existing single-portrait/text-description path stays as the model-agnostic fallback). Plus: a structured-retry before the fragile regex character-extraction fallback.

**Explicitly OUT of scope:** do NOT flip `adventureConsistentCharacters` default (stays `false` — Aaron will flip after testing the new flow). Do NOT deploy (Aaron runs `./deploy.sh` batches). Do NOT build photo→caricature (still a consent design conversation).

## 1. Architecture you must respect

- `AlloFlowANTI.txt` = canonical app source (41k lines, JSX in a .txt). `desktop/web-app/src/App.jsx` is GENERATED — never edit it, never run `node build.js` yourself (deploy.sh does prod builds; dev-mode builds downgrade student loaders).
- CDN modules are **generated**: edit `<name>_source.jsx`, then run `node _build_<name>_module.js`. NEVER hand-edit `*_module.js` for these. Relevant here:
  - `adventure_source.jsx` → `_build_adventure_module.js` → `adventure_module.js` (cast lobby UI, `handlePortraitFileChange` at ~line 849).
  - `adventure_handlers_source.jsx` → `_build_adventure_handlers_module.js` (adventure start flow; character setup ~lines 200–420).
  - `adventure_session_handlers_source.jsx` → `_build_adventure_session_handlers_module.js` (scene image generation, `generateAdventureImage`; consistency pass in module output ~line 655–671: `protagonist?.portrait` → `callGeminiImageEdit(consistencyPrompt, currentBase64, targetWidth, targetQual, portraitBase64)`).
  - Builders also sync a copy to `desktop/web-app/public/` — commit both.
- Modules receive a `deps` object constructed in ANTI (handlers deps built around ANTI line ~27644; wrapper for `generateAdventureImage` at ANTI ~27583). Adding NEW keys to the deps object literal is safe; changing existing wrapper function ARITY is checked by `dev-tools/check_wrapper_contracts.cjs` — keep both sides in sync if you must touch arity (prefer not to).
- After edits: `node --check <built module>` + full gate battery (§6).

## 2. Item 1 — Upload guard + privacy note

**Facts:** `onUploadPortrait` (ANTI ~36089) stores the image data-URL device-local (fine). The crossings happen at: (a) `onRefinePortrait` (ANTI ~36073) sends `char.portrait` base64 to `callGeminiImageEdit`; (b) the per-scene consistency pass (session handlers, §1) re-sends the portrait EVERY scene. `char.isUserUploaded` flags uploads; the "AI Generate" button does NOT use the photo (text→`callImagen`, replaces it).

**Build:** in `adventure_source.jsx` cast lobby, before accepting a file in `handlePortraitFileChange` (~849), show an inline accessible confirm (there's an existing inline error region pattern, `portraitUploadError` + `aria-describedby` — mirror it; do NOT use `window.confirm`): message ≈ *"Uploaded images are used by AI to keep this character consistent — the image is sent to the AI provider configured for this app with each scene. Only upload images you have permission to use this way (for photos of students, check your school's AI/data agreement)."* Buttons: Use image / Cancel. Keyboard + focus per existing lobby a11y patterns (see `tests/adventure_portrait_upload_a11y.test.js` and `adventure_cast_lobby_a11y.test.js` — keep them green; update pins deliberately if counts shift).

Add a short section to `docs/DATA_PRIVACY_POSTURE.md`: uploaded portrait images are device-local until used with AI features (refine / consistent-characters scene pass), at which point they are sent to the configured AI provider; Canvas = auto-provisioned Google key (education-account traffic rides the school's Google agreement), desktop = user-configured key.

## 3. Item 2 — Establishing scene during the cast lobby

**Current flow** (`adventure_handlers_source.jsx`, `handleStartAdventure`): scene text generated → if `adventureConsistentCharacters` and characters exist, state gets `sceneImage: null, isImageLoading: true, isReviewingCharacters: true` → lobby blocks → `onConfirm` (ANTI ~36096) runs `generateAdventureImage(sceneText, 1)`. During the lobby the user stares at a spinner.

**Build:** in the branch where the lobby WILL open (`adventureConsistentCharacters && sceneCharacters.length > 0` — see the existing `if (!adventureConsistentCharacters || sceneCharacters.length === 0) generateAdventureImage(...)` at ~line 411), fire an async establishing-shot generation immediately:
- Prompt ≈ `Wide establishing shot introducing this setting: <first ~600 chars of sceneData.text>. Scenic environment only, absolutely no people, no characters, no text.` (+ art style if available).
- `callImagen` is NOT currently in the handlers module deps (check destructure at source line ~21). Add `callImagen` (and optionally `adventureArtStyle`, `adventureCustomArtStyle`) to the handlers deps object literal in ANTI and the source destructure.
- On success: `setAdventureState(prev => prev.isReviewingCharacters ? { ...prev, sceneImage: url, isImageLoading: false } : prev)` — the guard matters: if the teacher already confirmed, do NOT clobber the real scene-1 image race. On failure: `warnLog`, leave spinner (current behavior).
- Leave `onConfirm` as-is (it sets `isImageLoading: true` and generates the real scene image, which replaces the establishing shot). Do not archive the establishing shot (storybook export assumes turn-indexed images; cover-art integration is a possible follow-up, not this wave).

## 4. Item 3 — Reference sheet (Gemini-gated) + structured retry

**Composite:** in `adventure_session_handlers_source.jsx` consistency pass, when ≥2 cast members have portraits AND the Gemini gate passes: draw up to 4 portraits into a 2×2 canvas grid (plain `<canvas>`, ~800×800, name label under each cell is optional), export data-URL, pass its base64 as the reference instead of the single protagonist portrait; adjust the consistency prompt to ≈ *"The attached reference sheet shows this story's cast. Refine the characters in this scene to match their appearances in the reference sheet. Keep composition; no text."* Wrap canvas work in try/catch — on ANY failure fall back to the current single-protagonist path. With exactly 1 portrait, keep current behavior unchanged.

**Gemini gate (Aaron's requirement):** the reference-image pathway is model-specific. The app has a multi-backend layer — `ai_backend_module.js` supports `'gemini' | 'openai' | 'localai' | 'lmstudio' | 'ollama' | 'claude' | 'alloflow-local' | 'custom'` (see ~line 1057) and has a capabilities structure containing an `imageEdit` flag (~line 2450). **Investigate how `callGeminiImageEdit` routes** and gate the composite on the active backend being Gemini-family (or on an `imageEdit`+multi-reference capability if the capabilities matrix expresses it). When gated OFF: keep today's single-portrait pass (it may also be unsupported on some backends — do not make things worse; if the backend can't image-edit at all the existing code path already handles/fails as today). Default Canvas surface = Gemini, so the gate should evaluate TRUE there.

**Structured retry:** in `handleStartAdventure` (~line 330), when `adventureConsistentCharacters` is on and `sceneData.characters` is missing/empty, currently a regex scrape runs. Before the regex: one `callGemini` retry — *"From this opening scene, extract 2–4 characters as JSON: [{name, role, appearance}] …"* — parse with the existing `cleanJson`/`resilientJsonParse` helpers from deps; fall back to the regex only if that fails. Keep the final grade-based default-protagonist fallback.

## 5. Tests to add (mirror existing patterns — source-contract greps are the norm for ANTI/flow pins)

- Upload guard: extend `tests/adventure_portrait_upload_a11y.test.js` (or new file) — consent UI exists in `adventure_source.jsx`, file only accepted after confirm, disclosure text mentions the provider send.
- Establishing shot: pin in handlers source — prompt contains "no people"; state-set is guarded by `isReviewingCharacters`; `callImagen` destructured from deps; ANTI deps literal includes `callImagen`.
- Reference sheet: pin gate («gemini» check present), fallback to single-portrait on failure, prompt mentions reference sheet; structured-retry appears BEFORE the regex fallback.
- Run: `npx vitest run tests/adventure_*.test.js` — all must stay green (a11y pin counts may need deliberate ±1 updates like `teacher_motion_controls_a11y` precedent).

## 6. Gates (all must pass before commit)

```
node dev-tools/check_render_refs.cjs --quiet
node dev-tools/check_free_vars.cjs
node dev-tools/check_tdz_render.cjs --quiet
node dev-tools/check_wrapper_contracts.cjs
node dev-tools/check_keyless_map.cjs --quiet
node dev-tools/check_module_render.cjs --quiet
node dev-tools/check_aria_handler.cjs --quiet
node dev-tools/check_build_smoke.cjs
```

## 7. Shared-tree rules (multiple concurrent AI sessions use this checkout)

- **Pathspec commits ONLY**: `git add -- <your files>` then `git commit -m "…" -- <same files>`. Never `git add .`, never amend, never bare `git stash`, never reset relative.
- The pre-commit hook validates the WHOLE tree — if it fails on files you didn't touch, another session is mid-refactor: WAIT and retry (bounded retry loop precedent exists); never `--no-verify`.
- Commit trailer: `Co-Authored-By:` line naming the executing assistant.
- Leave everything LOCAL/unpushed. Aaron deploys batches with `./deploy.sh "<msg>"`.

## 8. Definition of done

1. All three items implemented in the SOURCE files, modules rebuilt via their `_build_*.js`, `desktop/web-app/public/` copies updated, `node --check` clean on built modules.
2. New + existing adventure tests green; full gate battery green; ANTI build smoke green.
3. `docs/DATA_PRIVACY_POSTURE.md` updated (Item 1).
4. One pathspec commit; default `adventureConsistentCharacters: false` UNCHANGED (verify ANTI ~line 6912 still `false`).
