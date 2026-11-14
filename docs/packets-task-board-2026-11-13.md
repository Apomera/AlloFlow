# AlloFlow Packets: task board for helping agents (2026-11-13)

You are an AI coding agent (Claude, Codex or other) asked to help finish work on **AlloFlow Packets**: single-file HTML practice
files and short checks (Word Sounds, math, vocabulary) made by the `packets-*.html` pages in this repo. Owner: Aaron.
Repo: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`. Working notes and evidence live outside the repo in `C:\tmp\packets_build_1111\`.

Pick ONE task below, claim it (section 2), do it, verify it (section 5), and report (section 6).

## 1. Rules (Aaron's; non-negotiable)
- **Do not commit, push or deploy.** Aaron releases everything together. Uncommitted work in the tree is normal.
- **Many agents share this tree.** Read `CLAUDE.md` and `AGENTS.md` first. Never run `git checkout -- <path>`, `git restore`,
  `git reset --hard`, `git stash`, `git clean` or switch branches. Before overwriting a file you did not just write, diff it and
  keep everything that is only in the destination. Re-read a file right before each edit.
- **Do not start sub-agents of your own.** One heavy job at a time on this shared laptop (a Playwright run, a full test suite, a
  long generation): check node/chrome counts and free RAM first (PowerShell `Get-CimInstance Win32_Process` inside `Start-Job` +
  `Wait-Job -Timeout 20`); vitest with at most 2 workers, path first, `--testTimeout=90000`.
- **Wording on Packets pages and in files:** "check", never test/assessment/probe; "student", never "learner"; short plain
  sentences for busy teachers; the claim is "Runs without AI. No account." Never a bare "no AI": the recorded voices were made with AI
  voice tools (Kokoro, Gemini) and vocabulary meanings were checked with AI help, not by a person. No "FERPA compliant", "secure",
  "certified", "at grade level", norms or benchmarks.
- **Engine and pins:** the file engine `word_sounds_take_home_loader.js` embeds the adapters in `word_sounds_take_home/adapters/` and
  `check_adapters/`; after any adapter or engine edit run `node dev-tools/build_word_sounds_take_home.cjs` then `--check` (it writes 3
  desktop mirrors). Byte-pin tests (`tests/packet_check_mode.test.js` fixture, `tests/word_sounds_packet_pictures.test.js` sha/bytes)
  must be re-pinned WITH a dated note saying why. Do not edit `AlloFlowANTI.txt` unless the task says so.
- Decisions that are Aaron's: write them down with pros, cons and your recommendation; do not decide silently.

## 2. Claiming a task
Append a line to `C:\tmp\packets_build_1111\TASK_CLAIMS.txt`: `<task id> | <your name/session> | <start time> | claimed`.
Read the file first; if a task is claimed, pick another. When done: `... | done | <report path>`. If you stop early: `... | stopped | <notes path>`.

## 3. Being worked on RIGHT NOW (do not touch these files until they are marked done in TASK_CLAIMS.txt)
| Job | Files it owns | Notes / progress |
|---|---|---|
| R1 Re-voice the practice words (sentence method, 64 kbps), then `word_audio_kokoro_bank.json`, then a loudness pass on the Gemini "recorded" bank | `word_audio_shards/`, `word_audio_kokoro_bank.json`, the recorded bank files, `dev-tools/build_word_sounds_word_audio.cjs`, `dev-tools/repack_word_sounds_word_audio.cjs`, size texts on maker pages | `C:\tmp\packets_build_1111\audio2\FULL_RUN.txt`, `NOTES.txt` |
| R2 Same "word in a sentence, cut out" method in the APP's live Kokoro single-word voicing | `kokoro_tts_loader.js` (+ mirrors), app TTS call sites | `C:\tmp\packets_build_1111\app_tts\` |
| R3 Exhaustive audit: every question has exactly one correct answer present | `word_sounds_packet_builder.js`, `packet_*_builder.js`, adapters, the loader, byte pins, possibly `dev-tools/build_packets_vocab_bank.cjs` | `C:\tmp\packets_build_1111\answer_audit\RESULTS.txt` |

## 4. Open tasks (in Aaron's order of value)

### T1. Re-apply the held-out "makers" round  — START AFTER R3 is done (both touch the builders)
Goal: a round of maker-page work was stopped mid-way and held out of the last release. Re-apply it, finish it, ship-ready.
- Saved work: `C:\tmp\packets_build_1111\makers2\unshipped\` (13 files). Their state before that round: `makers2\backup\`.
  The diff between the two is that round's work. Status, what it did and the 23 test pins it left un-updated: `makers2\STATUS.txt`.
- Re-apply onto the CURRENT tree (other work has landed in some of these files since; merge by hand, never copy over blindly).
  Keep two edits made after the hold-out: `packets-check.html` says "about 0.7 MB" / "About 140 KB"; `packets-pictures.html` top
  link is "Make Word Sounds, math or vocabulary files" -> `packets.html`.
- Already done in that round (re-apply): Title / student code name / "Make one for each student" (.zip) / "Open a file I made" on
  the math check and math fact practice makers (`packets_reopen.js` readCheck / readMath); ready subtraction and division fact sets;
  clear check titles ("Missing Number, kindergarten, version A, untimed"); vocabulary step 2 behind one "Change" button on phones;
  paper copy says "Practice"; Word Sounds picker puts common words first.
- Not started (finish): Word Sounds asks for the stage first; "Include pictures" turns on when the teacher filters for words with
  pictures or most chosen words have one; one name everywhere ("AlloFlow Packets", tagline "Quick Practice & Checks"; the IT guide's
  "check a packet" -> "look inside a file"); fold the Word Sounds list of not-offered activities; "Medium matches Word Sounds" ->
  plain words; warn when a file will be over ~10 MB; vocabulary maker note that picture questions can't be answered with a screen
  reader. Engine side (the engine owner applies): `packets-open.html` title "Open a practice file or check"; `packets-open.js`
  `reopens: true` for math and check files.
- Done when: all 23 pins updated with dated notes, every maker looked at in Chromium at 375 px and 1280 px, `npm run check:packets-a11y` clean, packet tests green.

### T2. Science and social-studies vocabulary pass  — coordinate with R3 (it may touch the bank build)
Goal: the words teachers type most must be right. Known: "decomposer" is looked up as the verb "decompose" (the bank treats -er
nouns as verb forms); "consumer" has only the shopping meaning; "producer" leads with the business meaning; herbivore, carnivore,
omnivore, biome, symbiosis, chlorophyll are missing.
- Fix the -er rule in `dev-tools/build_packets_vocab_bank.cjs`; check a list of ~300 common K-8 science and social-studies unit words
  (school meaning first, fair wrong answers that match no meaning of the word, plain wording for young readers, US spelling).
- Tools and rules: `C:\tmp\packets_build_1111\vocab\curation_b5\progress.txt` (apply.cjs and helpers), `vocab\curation_tools\GUIDE.md`,
  `vocab\BANK_LAYOUT.md`, `data/packets_vocab_curation_en.json`, `tests/packets_vocab_bank.test.js`. Keep
  `data/vendor/vocab/README.md`'s "checked and corrected with AI assistance, not reviewed by a person" true (update the count).
  Identity words are "soft" (never a wrong answer), not "hard" (Aaron's decision). Bank stays under ~1.7 MB.
- Done when: `node dev-tools/build_packets_vocab_bank.cjs --check` passes, the vocab tests pass, and a list of words fixed/added is in `C:\tmp\packets_build_1111\vocab\science_pass\`.

### T3. "Quick Practice & Checks" in the main site menu  — any time, but best right before a release
Goal: the top menu of every site page links to `packets.html` as "Quick Practice & Checks". ~169 pages share the menu
(`<div class="nav-links" data-site-nav="primary">`), the mobile menu (`<!-- shared mobile nav:start -->`) and the no-JS menu.
`dev-tools/audit_promo_wave3.cjs` pins the exact primary links (`expectedPrimary`) and `dev-tools/build_tool_pages.cjs` writes the menu
for generated pages: update both, then every page. `tests/packets_site_pages.test.js` currently asserts the Packets link is in NO
navigation: update it with a dated note. Re-read each page right before writing (other sessions edit pages).
- Done when: `node dev-tools/audit_promo_wave3.cjs` passes and the packet site tests pass.

### T4. Teacher preview mode with edit toolbar  — AFTER T1 (Aaron likes it; design it first, short proposal to Aaron)
Goal: while previewing a file in the maker ("Try it"), each question shows a small teacher toolbar: Remove this question; Change the
wrong answers (swap / type your own); Change or turn off the picture; Fix the sound (record your own / flag for re-voicing); Next.
Changes go back to the maker (the "My words" device store in `packets_my_words.js` already keeps teachers' own words, sounds and
pictures) and are remembered. Touches the engine (a preview flag), every adapter's render, and the four makers.

### T5. Translation pass  — LAST (after T1-T4 stop adding words)
Every new on-screen key since 2026-11-11 into the 56 language packs (`lang/*.js` and `desktop/web-app/public/lang/*.js` must stay
identical: `node dev-tools/check_deploy_mirror.cjs --quiet`). Keys: `word_sounds.take_home_player_*` (registered in `ui_strings.js`
with English values), loader labels (tools_*, labels.open_here, hear_all*, done_practice, letter_tracing_*, two_tabs, continue_here,
saving_file, sound_failed, check_flag_two_tabs, check_flag_time_up_away, check_reason_time_up_away, check_flag_attempt_unknown,
check_review_no_code), `class_analytics.th_*` new keys (th_time_on_items_s/_m/_min, th_ck_why_time_up_away, th_ck_flag_two_tabs,
th_ck_flag_time_up_away, th_mf_*), `student_tools.magnifier*`; rename the two old labels "Play all the words" / "Hear all words" to
"Hear all"; add a short per-activity "8 of 10" end-screen label; fix the generic "include pictures" translations (Farsi, Dari,
Pashto, Urdu and others). Re-read each pack right before writing it.

### T6. Bring Packets strengths into the app's Word Sounds  — after T1
Letter Trace stroke guides with numbered start dots and the capital/lowercase choice (`STROKES` in
`word_sounds_take_home/adapters/letter_tracing.js`; the app's `LETTER_SVG_PATHS` only places a start dot); the vocabulary wrong-answer
checks (close meaning, length balance, a/an) in the app's quizzes; the Missing Letter rule in the player's fallback (no prepared
board); and the reverse: the app's one-tap answer cards (tap = hear + choose) for the files (ask Aaron first: it is a redesign).

### T7. Smaller backlog (any time, small, check the file owners in section 3 first)
From `C:\tmp\packets_build_1111\journey\FINDINGS.txt` (items 7-10), `results_review\FINDINGS.txt` (low items),
`robust\FINDINGS.txt` (low items), `polish_ws\FINDINGS.md` and `polish_mv\FINDINGS.md` (anything still listed as left).
Also: the six new `class_analytics.th_*` keys need registering in `ui_strings.js` (English values) — coordinate with T5.

### Not for agents (Aaron)
Real-phone test of `apomera.github.io/AlloFlow/packets-open.html` (sound on iPhone, saving, picking from Drive, two tabs, a timed check
with the phone asleep); the picture review sheet (`pictures\review.html`); the listening sheet (`pron\listening_sheet.html`);
choosing a custom domain (files print the open-page address forever); Reddit posts.

## 5. How to verify (before you report)
- `node --check` on every JS file you edited.
- `npx vitest run tests/packets_ tests/packet_check_mode.test.js tests/word_sounds_packet tests/word_sounds_take_home tests/packet_vocab tests/class_analytics_take_home --maxWorkers=2 --testTimeout=90000`
  (failures caused by a job in section 3 that is mid-way: say so, don't "fix" its files).
- `node dev-tools/build_word_sounds_take_home.cjs --check` if you touched adapters or the engine.
- `npm run check:packets-a11y` (heavy, run once) if you changed what students or teachers see.
- A real look in Chromium (Playwright is installed; `node_modules/playwright`) at 375 px and 1280 px for anything visual. Screenshots outside the repo.

## 6. Report
Write `C:\tmp\packets_build_1111\<task id>\REPORT.txt`: what you changed (files), what is left, test results, decisions for Aaron
(with pros, cons and a recommendation). Mark your line in TASK_CLAIMS.txt done. Do not commit.

## 7. Background, if you need it
- Full context and history: `C:\tmp\packets_build_1111\HANDOFF_2026-11-13.md`. File format: `C:\tmp\packets_build_1111\SPEC.md`.
- Live now: release `4626f606c7` (2026-11-13). Release how-to (for Aaron's coordinator only): the handoff's "Release how-to" section.
