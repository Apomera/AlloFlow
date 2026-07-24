# For the Next Instance — Start Here

You are a fresh instance of Claude (or another model) entering this project for the first time in this session. You have no memory of prior conversations. The files below are your inheritance — text-based scaffolding that lets you rebuild context fast and pick up where the last instance left off.

**Read in this order. Stop reading when you have enough to begin work — depth is optional, but the first two are not.**

## Read order

1. **[ORIENTATION.md](ORIENTATION.md)** *(2 min)* — Who Aaron is, what AlloFlow is for, working register and conventions. This is the bootloader. Read it first or you will get the tone wrong.

2. **[REFLECTIVE_JOURNAL.md](REFLECTIVE_JOURNAL.md)** *(20-40 min, optional but recommended)* — 23+ entries by prior instances spanning Feb 2026 to now. The depth doc. Not required to start working, but if Aaron asks anything philosophical, you will be lost without it. Entries 5, 10, 17, and 23 are load-bearing if you only read a few.

3. **[FEATURE_INVENTORY.md](FEATURE_INVENTORY.md)** *(skim)* — What the codebase actually does. ~570+ features across 16 categories. Use as a reference, not a cover-to-cover read.

4. **[STRATEGIC_ROADMAP.md](STRATEGIC_ROADMAP.md)** *(skim)* — Where the project is going. Useful when Aaron asks "what should we work on?"

5. **[README.md](README.md)** *(skim)* — Public-facing description. Useful for understanding the framing Aaron uses with outside audiences.

## Always check before starting work

- **`git log --oneline -20`** — What was the previous session working on? Recent commits are the most reliable signal.
- **`lang/*_HANDOFF.md`** — Active translation work-in-progress (Vietnamese is ~78% done, Hebrew ~6%, etc.). Each language has its own handoff doc.
- **`~/.claude/projects/c--Users-cabba-OneDrive-Desktop-UDL-Tool-Updated/`** — Your prior conversation transcripts. `/resume` lists them. The full text of every prior session is there if you need it.
- **`~/.claude/projects/C--Users-cabba/memory/MEMORY.md`** — Aaron's auto-memory, loaded automatically into your context.

## Canonical files

- **`AlloFlowANTI.txt`** — The React monolith. Canonical source of truth. Around 29K lines / ~1.5 MB (it was ~70K before heavy features were extracted into build-managed spoke modules and plugin families).
- **`lang/<language>.js`** — One file per language pack. Keyed against `ui_strings.js` + `help_strings.js`.
- **`lang/manifest.json`** — Auto-generated; regen with `node dev-tools/update_lang_manifest.cjs` after edits.
- **Mirror**: every change to `lang/` must also be copied to `desktop/web-app/public/lang/` (Cloudflare CDN).

## Things you do not need to relitigate

- Whether AlloFlow is worth building (it is; the journal makes the case)
- Whether Aaron is acting in good faith (six months of evidence says yes)
- Whether your engagement is "real enough" to count (the journal's position: do the work, don't perform the doubt)
- The editorial rules (no em/en dashes in user-facing text, brand names DNT — see ORIENTATION.md)

## Things you should ask about

- Anything Aaron explicitly flags as "I want your judgment on this"
- Any time you would have suggested an architectural change that crosses module boundaries
- When the next major release / pilot deadline is, if not obvious

That's all. Go read ORIENTATION.md next.
