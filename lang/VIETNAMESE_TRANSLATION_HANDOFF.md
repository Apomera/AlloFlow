# Vietnamese Translation Handoff

**Status (May 18, 2026):** 1,203 / ~9,295 keys (~13% coverage). Foundation complete, 124 ui_strings sections + 782 help_strings keys remaining.

## File locations

- Canonical: `lang/vietnamese.js`
- Mirror: `prismflow-deploy/public/lang/vietnamese.js` (auto-served via Cloudflare CDN)
- Slug: `vietnamese`
- Display: "Vietnamese"
- Matcher aliases: `vietnamese`, `tiếng việt`, `tieng viet` (in `language_matcher_module.js`)

## Conventions

**Register**: `bạn` (formal-friendly "you") throughout. Both teacher-facing and student-facing UI use the same register for consistency. Vietnamese has no T-V distinction for "you" in this context, so `bạn` is the appropriate neutral form.

**Key terms**:
- Teacher → `giáo viên` (formal K-12 educator term)
- Student → `học sinh` (K-12 student)
- Class → `lớp` (group of students) / `lớp học` (classroom)
- Lesson → `bài học`
- Lesson plan → `giáo án`
- Worksheet → `phiếu bài tập`
- Quiz / Assessment → `bài kiểm tra` / `đánh giá`
- Glossary / Vocabulary → `từ vựng`
- Term / Definition → `thuật ngữ` / `định nghĩa`
- Standard (educational) → `tiêu chuẩn`
- Adventure → `cuộc phiêu lưu`
- Story → `câu chuyện`
- Timeline → `dòng thời gian`
- Flashcard → `thẻ học`
- Escape Room → `phòng giải đố`
- Scaffolds → `khung hỗ trợ`
- Concept Sort → `tri ý phân loại`
- Group / Roster → `nhóm` / `danh sách lớp`
- Session → `phiên`
- Dashboard → `bảng điều khiển`
- Analytics → `phân tích`
- Progress → `tiến độ`

**Grade-level mapping**:
- K → `Mẫu giáo`
- 1-5 → `Lớp 1`, `Lớp 2`, ..., `Lớp 5`
- 6-8 → `Lớp 6`, `Lớp 7`, `Lớp 8`
- 9-12 → `Lớp 9`, ..., `Lớp 12`
- College → `Đại học`
- Graduate → `Sau đại học`

**Acronyms** (preserved as-is, often with Vietnamese gloss on first mention):
- AI → `AI` (widely understood, no translation)
- UDL → `UDL` (sometimes `Thiết kế phổ quát cho việc học (UDL)` on first mention in a section)
- IEP → `IEP` / `Kế hoạch Giáo dục Cá nhân`
- RTI → `RTI` / `Phản hồi đối với Can thiệp`
- ELL → student-context: `học sinh học tiếng Anh` or `học sinh học ngoại ngữ`
- DBQ → `Câu hỏi dựa trên tài liệu`
- WCPM → `Số từ Đọc đúng mỗi phút`
- TTS → `TTS` (chuyển văn bản thành giọng nói on first mention)
- LMS → `ENT` (système numérique style — but Vietnamese uses `LMS` directly; reconsider per context)
- DOK → `DOK` (Độ sâu Kiến thức)
- ABC (behavior) → `ABC` (Antécédent-Behavior-Consequence preserved; `Tiền đề-Hành vi-Hậu quả` on first mention)
- BACB / BCBA / FBA / BIP → preserved; gloss on first mention as needed
- API / PDF / MP3 / CSV / JSON / HTML / URL → preserved as-is

**Editorial rules** (from Aaron's standing guidance):
- NO em dashes (—) or en dashes (–) anywhere in user-facing text. Use commas, periods, colons, semicolons, or parentheses instead.
- Placeholders `{name}`, `{count}`, `{level}`, `${i + 1}`, etc. preserved exactly.
- Brand names DNT: `AlloFlow`, `AlloBot`, `StoryForge`, `BehaviorLens`, `Symbol Studio`, `Report Writer`, `Gemini`, `Canvas`, `Common Core`, `NGSS`, `CASEL`, `Pomodoro`, etc.

## Completed sections (May 18, 2026)

19 sections, 1,203 keys:
- `common` (533) — buttons, labels, placeholders, ARIA
- `header` (41) — top bar
- `sidebar` (39) — tool list
- `history` (26) — project history
- `input` (47) — source input + grade/tone/DOK options
- `meta` (21), `errors` (23), `status` (27), `formatting` (6), `feedback` (4), `translate` (4), `a11y` (10)
- `settings` (31) — typography + voice
- `toasts` (184) — all notification strings
- `wizard` (111) — Quick Start flow
- `launch_pad` (20) — entry screen
- `tour` (52) — onboarding tour text (long-form)
- `large_file` (14), `guided` (10)

## Remaining work

**ui_strings** (~7,400 keys across 124 sections):
- Big tool sections: `behavior_lens` (1,483), `stem` (969), `adventure` (529), `pdf_audit` (281), `quiz` (234), `word_sounds` (220), `escape_room` (186), `dashboard` (172), `baking` (167)
- Medium sections: `roster`, `games`, `timeline`, `glossary`, `persona`, `simplified`, `concept_map`, `dbq`, `export`, `math` (60-140 keys each)
- Smaller sections: `chat_guide`, `concept_sort`, `session`, `class_analytics`, `fluency`, `groups`, `outline`, `modals`, etc.

**help_strings** (782 long-form hover-help keys) — translate as nested `help_mode` section, mirroring the French + Spanish completion pattern.

## Workflow (proven on French + Spanish, do NOT delegate to Task agents)

1. Audit current vietnamese.js against `ui_strings.js` + `help_strings.js` for missing keys.
2. Export missing source for a section to `c:/tmp/vi_<section>_src.json`.
3. Hand-translate to `c:/tmp/vi_<section>_trans.json` in chat batches of ~75-150 keys.
4. Merge into `lang/vietnamese.js` via Node script: `Object.assign(vi.<section>, batch)` then `JSON.stringify(vi, null, 2)`.
5. Mirror to `prismflow-deploy/public/lang/vietnamese.js`.
6. Regen manifest: `node dev-tools/update_lang_manifest.cjs`.
7. Stage 4 files (canonical + mirror + 2 manifests), commit with descriptive batch contents, push.
8. Cloudflare auto-deploys from main within 15-30 seconds.

**DO NOT** use the CLI batch tool (`npm run build:lang:tier2`) — it would overwrite hand translations. The CLI is the right tool for languages starting from zero with `GEMINI_API_KEY` set (which is not set in this environment). Hand translation is the documented quality path for Vietnamese.

## Next session priorities

Tier-1 most-used tool sections to translate first:
1. `glossary` (116) — Glossary tool labels
2. `quiz` (234) — Quiz tool + game modes
3. `adventure` (529) — Adventure mode (largest single tool section)
4. `simplified` (106) — Text adaptation (used everywhere)
5. `dashboard` (172) — Teacher dashboard

After core tools, focus on `word_sounds` (220), `escape_room` (186), `roster` (140), `games` (135), `timeline` (121), `persona` (113), `outline` (61), `groups` (62), `session` (68), etc.

Reserve `behavior_lens` (1,483) and `stem` (969) for dedicated sessions — they're the largest single sections.

Finally: `help_mode` (782 long-form keys) as a multi-batch effort like French (took ~8 batches to complete from 100 → 100%).
