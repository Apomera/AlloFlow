# Vietnamese Translation Handoff

> **Historical language-pack handoff (2026-07-09):** This records the May 2026 Vietnamese completion pass. The language inventory and UI key surface have grown since then; verify `lang/vietnamese.js`, its public mirror, and current i18n reports before relying on the coverage/complete status below.

**Status (May 19, 2026):** 9,285 / ~9,295 keys (~100% coverage, ✓ in manifest). 142 sections complete. **PACK COMPLETE.**

## Final session summary

Vietnamese joins Spanish (Latin America), French, Chinese (Simplified), Arabic, Somali, and Portuguese (Brazil) as the seventh fully complete language pack.

## Session log

- May 18 commit `c9f5599a`: Foundation (1,203 keys, 19 sections)
- May 18 commit `33c94e25`: Tier 1 tools (+628 keys = 1,831)
- May 19 commit `5cdaeae2`: adventure (+529 = 2,360)
- May 19 commit `b0590c5c`: word_sounds + escape_room (+406 = 2,766)
- May 19 commit `a1586fa0`: roster + games + timeline + persona (+509 = 3,275)
- May 19 commit `24f48e74`: concept_map + dbq + export + math + outline + groups (+472 = 3,747)
- May 19 commit `138f31e6`: pdf_audit + baking + about (+594 = 4,341)
- May 19 commit `f3caf97a`: chat_guide/concept_sort/session/class_analytics/fluency/modals/lesson_plan/immersive (+504 = 4,849)
- May 19 commit `4870dd82`: 13 small sections (+447 = 5,296)
- May 19 commit `07120ce2`: 26 mid-small sections (+639 = 5,935)
- May 19 commit `87b64208`: 53 small sections (+333 = 6,268)
- May 19 commit `ad13ccfe`: stem section (+969 = 7,237) — closed ui_strings except behavior_lens
- May 19 commit `467871f9`: behavior_lens.rest (+441 = 7,461)
- May 19 commit `c67415d8`: behavior_lens.hub (+207 = 7,668)
- May 19 commit `84cc9e7a`: behavior_lens.ui (+232 = 7,900)
- May 19 commit `53607d88`: behavior_lens.toast (+189 = 8,089)
- May 19 commit `da3bb738`: behavior_lens.ph placeholders (+74 = 8,163)
- May 19 commit `24ce8b95`: **behavior_lens.raw (+340 = 8,503) — behavior_lens COMPLETE (1,483 keys)**
- May 19 commit `8c2d154d`: help_mode batch 1/10 (+79 = 8,582)
- May 19 commit `875f0849`: help_mode batch 2/10 (+79 = 8,661)
- May 19 commit `dbe1bef5`: help_mode batch 3/10 (+79 = 8,740)
- May 19 commit `9e3ae2d4`: help_mode batch 4/10 (+79 = 8,819)
- May 19 commit `1502cd11`: help_mode batch 5/10 (+79 = 8,898)
- May 19 commit `7990f3fc`: help_mode batch 6/10 (+79 = 8,977)
- May 19 commit `b906af7b`: help_mode batch 7/10 (+79 = 9,056)
- May 19 commit `568b0530`: help_mode batch 8/10 (+79 = 9,135)
- May 19 commit `c58ebc14`: help_mode batch 9/10 (+79 = 9,214)
- May 19 commit `9b680cf7`: **help_mode batch 10/10 FINAL (+71 = 9,285) — help_mode COMPLETE (782 keys), Vietnamese 100%**

## File locations

- Canonical: `lang/vietnamese.js`
- Mirror: `desktop/web-app/public/lang/vietnamese.js` (auto-served via Cloudflare CDN)
- Slug: `vietnamese`
- Display: "Vietnamese"
- Matcher aliases: `vietnamese`, `tiếng việt`, `tieng viet` (in `language_matcher_module.js`)

## Conventions used throughout

**Register**: `bạn` (formal-friendly "you") throughout. Both teacher-facing and student-facing UI use the same register for consistency.

**Key terms**:
- Teacher → `giáo viên`
- Student → `học sinh`
- Class → `lớp` / `lớp học`
- Lesson → `bài học`
- Lesson plan → `giáo án`
- Worksheet → `phiếu bài tập`
- Quiz / Assessment → `bài kiểm tra` / `đánh giá`
- Glossary / Vocabulary → `từ vựng` / `từ điển`
- Term / Definition → `thuật ngữ` / `định nghĩa`
- Standard (educational) → `tiêu chuẩn`
- Adventure → `cuộc phiêu lưu`
- Story → `câu chuyện`
- Timeline → `dòng thời gian`
- Flashcard → `thẻ học`
- Escape Room → `phòng giải đố`
- Scaffolds → `khung hỗ trợ`
- Group / Roster → `nhóm` / `danh sách lớp`
- Session → `phiên`
- Dashboard → `bảng điều khiển`
- Analytics → `phân tích`
- Progress → `tiến độ`

**Behavior/clinical terms** (consistent across behavior_lens + help_mode):
- Antecedent → `tiền đề`
- Behavior → `hành vi`
- Consequence → `hậu quả`
- Reinforcement → `củng cố`
- Intervention → `can thiệp`
- FBA → preserved, with Vietnamese gloss on first mention
- BIP → preserved
- ABC → preserved (`Tiền đề-Hành vi-Hậu quả` on first mention)

**Grade-level mapping**:
- K → `Mẫu giáo`
- 1-12 → `Lớp 1`, `Lớp 2`, ..., `Lớp 12`
- College → `Đại học`
- Graduate → `Sau đại học`

**Acronyms** (preserved as-is, often with Vietnamese gloss on first mention):
- AI, UDL, IEP, RTI, ELL, DBQ, WCPM, TTS, LMS, DOK, ABC, BACB, BCBA, FBA, BIP, API, PDF, MP3, CSV, JSON, HTML, URL, CER, NGSS, MTSS, ORF, DIBELS, AIMSweb, NWF, LNF, QTI, IPA, FERPA, COPPA, ADA, EL, etc.

**Editorial rules** (Aaron's standing guidance):
- NO em dashes (—) or en dashes (–) anywhere in user-facing text. Used commas, periods, colons, semicolons, or parentheses instead.
- Placeholders `{name}`, `{count}`, `{level}`, `${i + 1}`, etc. preserved exactly.
- Brand names DNT: `AlloFlow`, `AlloBot`, `StoryForge`, `BehaviorLens`, `Symbol Studio`, `Report Writer`, `Gemini`, `Canvas`, `Common Core`, `NGSS`, `CASEL`, `Pomodoro`, etc.

## Verification

Final manifest check shows ✓ Vietnamese 9,285 keys, 1,182 KB. All structure checks passed (every batch verified zero missing/extra keys, zero em/en dashes).

The pack is live via Cloudflare CDN at `alloflow-cdn.pages.dev/lang/vietnamese.js` and available to Vietnamese-speaking families at PPS and any other school district running AlloFlow.

## Next priorities (other languages)

With Vietnamese complete, the remaining incomplete packs in the manifest are:
- Haitian Creole (925 keys, ~10%)
- Hebrew (6,388 keys, ~69% after recent expansion to ui_strings)

Both follow the same hand-translation pattern documented here. Hebrew is closest to completion and would benefit from a help_mode pass next.
