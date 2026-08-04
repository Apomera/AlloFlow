# AlloFlow Global Reach: Research Findings and Plan

**Date:** 2026-08-03
**Status:** Research complete (10/10 agents), strategy design complete (3/3 agents). Adversarial red-team phase was cut short for quota. Synthesis below is Claude's, not an independent agent's.
**Raw agent output:** `%TEMP%/claude/C--Users-cabba/<session>/scratchpad/report.txt` (1,096 lines) and `results.json`.

---

## 1. The verdict

**Yes, AlloFlow can reach international communities. No, social media will not be the mechanism.**

Ten researchers checked roughly fifteen verified adoption histories of comparable open-source education
projects (Kolibri, Kiwix, Moodle, H5P, Scratch, Khan Academy, GCompris, Tux Paint, OLPC/Sugar, Ustad
Mobile, Rori, Anki, ClassDojo and others). They found **no case where social media was the primary
driver of international adoption for an education tool.** That is an absence of evidence across a
deliberately broad sample, not proof of impossibility, but it is the single most decision-relevant
finding in the whole run.

What actually drove adoption, in descending order of power:

1. **Riding an installed base you do not own.** H5P went from 600 sites to 3,000 in one year, then to
   ~30,000, by becoming a plugin inside Moodle and WordPress. Moodle has 146,716 registered sites and
   523M users across 236 countries. Kiwix rode Internet-in-a-Box and RACHEL. Tux Paint rode Linux distros.
2. **One institutional or NGO partner who owns the local teacher relationship.** Kolibri's "220+
   countries" is install telemetry; the real work was ~30 country partnerships with UNICEF, UNHCR and
   others. Ustad Mobile's founder lived in Kabul. Kiwix's co-founder built in Bamako.
3. **Governed native-speaker localization with a named owner per locale.** Scratch has ~1,000 Transifex
   volunteers with per-locale reviewers. Khan Academy has unpaid "Language Advocates" who screen
   translators and own quality for their language.
4. **A citable evaluation.** Rori (AI math tutor over WhatsApp, Ghana) published an RCT with effect size
   0.37, p<0.001, at ~$5/student/year, via Oxford and J-PAL (arXiv 2402.09809). That paper is what got
   it into the institutional channel.

**Honest 12-month estimate** (agent's own numbers, labeled as estimates, not data): 1 to 3 institutional
adopters at most, 50 to 400 repeat international users, and a 10 to 20 percent chance of one sustained
non-US deployment. Timescales in this category are brutal and consistent: Kiwix took ~10 years to reach
1M annual users. Anki ran solo for 19 years before its inflection.

Judge the year by **one partner, one citable artifact, one distribution channel, and honest localization
provenance.** If you judge it by follower count you will conclude you failed.

---

## 2. Do this before anything else (claim integrity)

All three independent strategists converged on the same Phase 0 without coordinating. That convergence is
the strongest signal in the run. **Nothing goes out until this is done.**

### 2.1 `COMPETITOR_RUBRIC.md` is publicly readable right now

Verified 2026-08-03: `https://raw.githubusercontent.com/Apomera/AlloFlow/main/COMPETITOR_RUBRIC.md`
returns HTTP 200 with full content. So does `COMPETITOR_COMPARISON.md`. Neither is gitignored. They are
unlinked but fully readable.

The file names nine competitors (Khanmigo, MagicSchool, Brisk, Diffit, Curipod, SchoolAI, EduAide) and
closes with "AlloFlow scores 490/500 (98%) ... with a 200-point lead over Khanmigo."

The problem is that the file's own caveat concedes the asymmetry that defeats it as substantiation:
AlloFlow was scored from your own `FEATURE_INVENTORY.md`, competitors from "public documentation +
product reviews" rather than hands-on testing.

- Numeric superiority claims are treated as **statements of fact, not puffery**.
- UK CAP rule 3.7 requires documentary evidence held *before* publication; 3.32 requires comparisons with
  identifiable competitors to be objective and **verifiable**. A self-scored rubric fails verifiability
  because a third party cannot reproduce weights you chose.
- The realistic threat is not the FTC. It is a **Lanham Act §43(a) demand letter** from one of the nine
  named companies running a brand alert. (Rated by the agent as its highest practical risk and also the
  finding it verified least. Worth a real lawyer's 30 minutes if you want to keep any version of it.)

**Fix:** retitle it "Internal roadmap self-assessment," move the caveats to a bold block at the top,
delete the closing 490/500 and 200-point sentences. Your exposure exists *now*, before any post. A
campaign is what draws attention to the repo.

**Standing campaign rule:** never state a numeric score, ranking, or head-to-head comparison against a
named competitor. State what AlloFlow does and let readers draw the comparison themselves.

### 2.2 The language claim is the reputational fault line

This is the item with genuine professional risk for a practicing school psychologist, and it is fixable
in an evening.

| Finding | Detail |
|---|---|
| **`lang/acholi.js` is the single most dangerous file in the repo** | Acholi is a **genuine Ugandan medium of instruction for P1-P3** and one of six named assessment languages. The manifest advertises it as `{"display":"Acholi","endonym":"Leb Acholi","keys":21841}` with **no passthrough flag**. It is English. One click by a Ugandan educator disproves the entire 63-language claim. |
| **`lang/karen.js` contains Burmese-script strings** | Karen mother-tongue education exists specifically in opposition to Burmese-language imposition. This is not a cosmetic bug. Your own June 2026 review rates karen "poor" (4 critical / 10 high) and it has roughly half the keys of a full pack. |
| **`lang/portuguese_angola.js` is corrupted** | 134 strings contain `perguntaário`, a bad find-and-replace of `quest` to `pergunta` inside `questionário`. Tour prose is English-syntax code-switched. |
| **13 mojibake keys break your own honesty warning** | A literal U+003F (`?`) sits where an accented character belongs in `toasts.standards_found_unverified`, `toasts.standards_found_verified`, `toasts.standards_search_unavailable` and `toasts.undo_domain_analysis`, across **all seven** Spanish/Portuguese/Creole/French packs. The string telling a teacher that AI-generated standards codes are unverified is the one rendering as garbage. ~30-minute fix. |
| **`lang/tagalog.js` is rated needs-work** | 8 critical / 5 high in your own audit. Sampling found `feedback_error_apology` = "I hit isang snag trying sa bumuo iyan..." The Philippines is the single best beachhead, so this pack is load-bearing. |
| **`lang/haitian_creole.js`** | 0.80% pure-English residual, ~4x the es-LA/pt-BR rate, concentrated in `errors.*` and `toasts.*`. A Kreyòl-speaking teacher hits English exactly when something breaks. Few hundred strings, one or two evenings. |
| **CORRECTION: `lao` is NOT passthrough** | 22,303 keys, 526,055 non-ASCII characters, genuine Lao script, rated "good" with zero critical findings. The "PPS cluster = English passthrough" shorthand in `CLAUDE.md` is **stale for lao** and you have been under-claiming a real asset. |
| **Good news** | `spanish_latin_america` (30,239 strings, 0.22% English residual) and `portuguese_brazil` (29,864, 0.20%) are genuinely production-quality and among the best-covered packs in the project. Claim these without hedging. `ukrainian.js` is verified genuinely distinct from Russian (379,776 Ukrainian-specific characters, different sampled text). Arabic/Hebrew/Farsi/Dari/Urdu/Pashto are all ~60,000 tokens each and real. |

**The truthful sentence** (agent's wording, verify before use): "AlloFlow ships 63 UI language packs of
roughly 22,000 to 30,000 strings each; 49 have been cleaned to under 5 percent untranslated English but
none has been signed off by a native speaker, and 7 are deliberate English passthrough for languages we
could not source translators for."

**Never say a bare "63 languages" in public.**

Precedent worth knowing: Mozilla enabled automated translation on the Japanese SUMO locale on 2025-10-22;
the locale leader, a ~20-year contributor, quit on 2025-11-04 and the Japanese community formally
disbanded. The failure mode was ungoverned quality variance, not opposition to MT. AlloFlow's 63 packs
are the same shape. Disclose provenance before someone discovers it.

### 2.3 The repo shopfront makes the local-first claim false

**There are zero GitHub releases.** So the entire "you do not need Gemini, run AlloFlow Desktop" argument
is currently false in practice: a teacher in Manila or Nairobi must clone the repo, install Node and
electron-builder, and build from source.

Also verified absent or broken:

- `LICENSE` copyright holder line is **blank** (this is DPG Indicator 3, Clear Ownership)
- `desktop/dist/SHA256SUMS-windows.txt` hashes are **stale and match nothing**. Publishing as-is ships a
  verification artifact that fails on every file.
- No repository topics, empty `homepageUrl`, Discussions disabled, no `CITATION.cff`, no `CODE_OF_CONDUCT.md`
- `docs/` holds 135 files dominated by `AGENT_*`, `CLAUDE_HANDOFF_*`, `CHATGPT_HANDOFF_*` internal notes,
  burying `DATA_PRIVACY_POSTURE.md` and `accessibility/`
- `docker/README.md` claims Piper covers "40+ languages". Upstream says **35**, and
  `docker-compose.yml` downloads exactly one voice (`en_US-amy-medium`).
- `docker/models/config.yaml` states 8 to 48GB VRAM tiers. **Do not call School Box low-resource.**
- Two `src/aiProvider.js` defects undercut the non-Google story: backend `claude` falls through to
  `_openaiGenerateImage` and POSTs to an Anthropic image endpoint that does not exist; `_openaiTTS`
  hardcodes `localhost:8880` and `localhost:5500`, blocking the school-server pattern the docs recommend.

---

## 3. The bot question, answered

Your instinct was right, and the answer is better than you expected: **nothing worth doing requires a
bot, and the compliant path is free.**

### Rules verified against primary sources on 2026-08-03

| Platform | Automation | The actual trap |
|---|---|---|
| **Meta (FB/IG/Threads)** | Only "through authorized routes" (Account Integrity, updated 2026-05-28). Meta Business Suite = fine. | Spam standard bans high-frequency posting "**either manually or automatically**." Pasting into 30 groups by hand is the identical violation. Group admins are penalized by Meta for approving your post, which is why they remove promo aggressively. **Message the admin first.** |
| **YouTube** | ToS prohibits automated access with no API carve-out in the ToS body. Use Studio scheduling. | Bans "using automated tools or AI to churn out high volumes of similar content." Rules out 63 near-identical "AlloFlow in [language]" videos. |
| **TikTok** | US Terms §5 bans automated scripts that "otherwise interact with" the service. Broadest wording of the five. | Worst hours-to-value trade for an international special-ed audience. Deprioritize. |
| **X** | **No free API tier. $0.20 per post containing a URL** since 2026-04-16. Automated accounts must carry the "Automated" label. AI-generated replies need **prior approval from X**. | Your whole campaign is link-driven. Do not build an X bot. There is no financial case. |
| **LinkedIn** | User Agreement §8.2 bans bots for posting, liking, commenting AND sharing. But `w_member_social` ("Share on LinkedIn") is **self-serve and free**, 150 posts/day. | Browser extensions and scrapers are banned outright, enforcement is account restriction. Also: "don't agree with others ahead of time to like or re-share each other's content" makes a mutual-support pact with Tyler a violation. |
| **Bluesky** | **Officially supports bots** with a self-label. Free API, ~1,666 creations/hour. | Interaction must be **opt-in**: a bot may broadcast, never reach out. 95.34% of 2025 enforcement was automated and automated takedowns are "nearly always permanent." |
| **Mastodon** | Native `scheduled_at` in the API, first-class `bot` flag. | mastodon.social **requires disclosure of generative AI use** and bans accounts that solely post AI content. There is **no usable education instance**: mastodon.education is dead, scholar.social has closed registration and bans bots and automated cross-posting. |
| **Telegram** | Structurally safe: "Bots can't start conversations with users." | Cannot spam by design. |
| **Discord** | Rule 14 bans self-bots. Registered application bots invited by an admin are fine. | Age floor 13. Educator servers only. |
| **WhatsApp** | Business API requires prior opt-in: "you may only contact people if (a) they gave you their number and (b) you received opt-in permission." **No lawful cold outreach.** | Use **WhatsApp Channels** instead: free, one-way, opt-in by design, no follower cap, and it **hides your phone number**. This is the compliant Global South play. |
| **Reddit** | **Nothing verified.** All Reddit domains were blocked or 403 from the research environment. | Treat every subreddit as no-self-promotion until its sidebar says otherwise, read from your own logged-in browser. |
| **Hacker News** | "Don't solicit upvotes, comments, or submissions." HN penalizes **domains**, not just posts. | Show HN requires something usable "without barriers like signups." **Do not use the Gemini Canvas link.** Link the static Cloudflare shell or a desktop download. |

### Hard prohibitions (these are law, not just ToS)

- **16 CFR §465.8** makes buying followers, likes, views or engagement illegal for "**anyone**," not just
  businesses. No exceptions, not even to seed an account.
- **EU UCPD Annex I point 22** blacklists "falsely representing oneself as a consumer" in all
  circumstances, no balancing test. AI agents posting as if human, or any second persona praising
  AlloFlow, is squarely illegal on both sides of the Atlantic.
- Point 23c blacklists commissioning false endorsements.

### The legitimate automation boundary

**Claude may:** research and verify claims with dated sources; draft every word of every page, post,
release note and email; make repo and site changes; build a claims register and a pre-publish linter that
hard-fails on banned phrases ("63 languages", "full RTL support", "FERPA compliant", "supports Acholi",
"Piper 40+ languages"); assemble applications; produce metrics.

**Claude never:** touches a social account, holds a credential, sends anything, or writes a single string
in a target language.

**Only you:** create accounts (one per platform, real name, never a second), queue and press post, write
every reply and DM, and send every email.

Tooling: **Buffer free plan** ($0, 3 channels, 10 scheduled posts each) is a listed official LinkedIn
Marketing Partner, or just use the native schedulers. **Never** install a Facebook Group bulk-poster
(`fbgroupbulkposter.com` and similar dominate the search results and are designed to get you banned).

---

## 4. Legal and professional posture

**EU AI Act.** Article 50 transparency duties became applicable **2026-08-02**, and Article 2(12)
confirms the free-and-open-source exemption **does not cover Article 50**. AGPL is not a shield. But the
duties split usefully:

- **Marketing copy you draft with AI help: no duty.** Article 50(4)'s text-labelling duty covers AI text
  "informing the public on matters of public interest," and marketing your own product is not that. Do
  not let anyone talk you into an elaborate disclosure regime for ordinary posts.
- **The product: a real gap.** A repo-wide scan for `c2pa|content credential|provenance|watermark`
  returned **zero files**. Article 50(1) wants an "you are interacting with an AI system" notice; 50(2)
  wants machine-readable marking on generated output. An evening's work, and it converts a live exposure
  into a marketing asset.
- **The NotebookLM-style podcast audio in the repo** (`Inside_AlloFlow_s_Automated_Differentiation_Engine.m4a`
  and others) should be captioned "AI-generated audio" if used.
- **Annex III (education, high-risk) was deferred** from 2026-08-02 to **2027-12-02** by the Digital
  Omnibus on AI, Regulation (EU) 2026/1744. You have ~16 months. Deliberately stay out of Annex III
  point 3(b): do not build features that "evaluate learning outcomes" in a way used to steer instruction.

**Not your problem:** California SB 942 binds only providers over 1M monthly users. Most of the FTC
reviews rule (16 CFR 465) defines "business" as one that **sells**, so it does not reach a free product
today. That protection evaporates the day you add a donate button.

**Professional ethics.** NASP Standard III.5.5 names authorship citation as the disclosure mechanism, so
your compliance move is trivial: **always say "I built this" in the same breath as naming AlloFlow**, and
per 16 CFR 465.1(c)(4) it must be unavoidable, not behind a "see more" fold or a bio link, and **in the
same language as the post** if you post in Spanish or Somali.

The genuine bright lines:
- **Never** pitch AlloFlow to a family or student on your caseload, or solicit a quote from anyone you serve (NASP III.4.1/III.4.3).
- Describe yourself as "**a practicing school psychologist**," not "school psychologist at Portland Public Schools." The second implies institutional endorsement you have not been granted.
- **Email district HR or counsel one short written question and keep the reply**: does the outside-employment/conflict-of-interest policy cover an unpaid open-source project, may you identify yourself as a school psychologist in promotional material, must you avoid naming PPS.
- **Run the free USPTO trademark search for "AlloFlow" yourself** at tmsearch.uspto.gov. Every trademark database was blocked from the research environment, so this is genuinely unknown. A campaign is what turns an unregistered name into something worth taking. "Allo" is a crowded commercial prefix.
- **AGPL §13 is a real talking point**: a vendor who forks AlloFlow and hosts it cannot keep their changes secret. And AGPL does not give away the name.
- **Leave the README badges alone.** "FERPA-aligned deployment" and "WCAG 2.2 AA-oriented" are the *safe* wordings. Do not upgrade them to "compliant" or "certified." The only fix needed is the v1.2 vs 2.5Rev VPAT version mismatch between README lines 199 and 243.

**Cold email.** A 200-org blast is not compliant anywhere (CASL is consent-first with CAD $1M/violation
for individuals; GDPR treats a named educator's work address as personal data). The workable route:
**published role addresses of organizations** (`info@`, `contact@`) rather than named individuals, sent
individually, each relevant to that org's published mandate, full identification, once, no follow-up
sequence, contact forms rather than email for Germany and Austria.

---

## 5. Where to go, and where not to

### Priority beachheads

| Rank | Where | Why it is specifically strong | Entry point |
|---|---|---|---|
| 1 | **Philippines** | **DepEd Order 003, s. 2026** (signed 2026-02-20) explicitly permits AI for lesson planning, quiz generation and content development. **1M+ DepEd staff already hold Google Workspace for Education licences with Gemini** under Project S.I.N.A.G. RA 11650 is a live inclusive-education mandate. RA 12027 reverted K-3 medium of instruction to Filipino and English, matching your strongest coverage. The account prerequisite is solved at national scale. | `info@pafte.org` (Philippine Association for Teacher Education). **Fix `tagalog.js` first.** Write a DO 003 alignment note. Never claim DepEd approval; the order requires a school-level Privacy Impact Assessment and AI Registry entry. |
| 2 | **Chile** | **Decreto Exento 83/2015 makes "Diseño Universal de Aprendizaje" the government's own legal vocabulary.** MINEDUC ships DUA kits at especial.mineduc.cl and educarchile.cl. You do not have to sell the UDL concept; the Ministry already did. Ley 21.719 takes effect 2026-12-01 and schools are actively hunting for tools that will still be compliant. | educarchile.cl Contáctanos form, referencing their own Kit Decreto N°83. Position as an implementation aid, not an American framework. |
| 3 | **Ireland** | The most developed UDL infrastructure in Europe, in English. **AHEAD** is verified active through July 2026, runs UDL Digital Badges with UCD and the ALTITUDE Charter, 4000+ badges awarded, with a published address and a stated ~3-working-day response. | `ahead@ahead.ie`, as a practitioner sharing a free AGPL tool, not a vendor. Their remit is tertiary/further education, so do not pitch a K-12 product. |
| 4 | **England** | **Schools White Paper "Every Child Achieving and Thriving" (2026-02-23) requires digital Individual Support Plans for every child with identified SEND**, across a tiered universal/targeted/targeted-plus/specialist model, at scale, with no budget. Best-timed policy fit in the region, and no translation needed. | Write one England-specific mapping page. Add SEND/EHCP vocabulary to the app (`GDPR` currently appears **zero** times in AlloFlowANTI.txt; FERPA appears 12). |
| 5 | **Ukraine-displacement corridor** (Poland, Germany, Romania, Czechia) | `ukrainian.js` is **verified genuinely Ukrainian and distinct from Russian**. Enrolment of Ukrainian learners in European host countries rose from 289,412 (2022) to 664,620 (2024); 600,000+ school-aged Ukrainian refugee children remain out of school. Pupils with beginner host-language ability show a ~50-point enrolment gap. | The most emotionally credible European entry point, and the asset is real. |
| 6 | **Kenya** | Densest verified institutional stack in Africa: KISE (with its EARC network), KICD/Kenya Education Cloud, OER Africa in Nairobi, Wikimedia Kenya running Kiwix in schools. Kiswahili is genuinely load-bearing. | Learning Equality forum first. Kenya's DPA 2019 reaches foreign entities and names education as a mandatory-registration sector; get the no-server position confirmed rather than self-certifying. |

### Do not pitch (verified reasons, not preferences)

- **Ethiopia** (best African language fit after Kiswahili/Kinyarwanda, but 9M+ children out of school, active conflict, HRW World Report 2026)
- **Haiti** (1,600+ schools closed 2024-25, 47 destroyed in Port-au-Prince in Jan 2025 alone; the Kreyòl pack's honest home is your own Maine caseload and the US diaspora)
- **Myanmar** (absent from Google's Gemini region list, and the 2025 Cybersecurity Law bans VPNs, so the workaround is asking teachers to commit a crime under a surveillance regime)
- **The Pacific** (PacREF Phase 2 just pivoted to country-led implementation; there is peer-reviewed 2026 scholarship criticising exactly the pattern of externally-introduced edtech in Fiji)
- **France, Denmark, Netherlands, much of Germany** (US-cloud Workspace is restricted or banned in schools as stated policy, not preference; lead there with **Desktop + Ollama**, never Canvas)
- **Nigeria** (reversed its mother-tongue policy on 2025-11-12; English is now sole medium of instruction, so the Hausa/Igbo/Yoruba packs no longer match policy) and **Ghana** (its 11 classroom languages are all absent from AlloFlow)
- **Sri Lanka** (until Sinhala exists; you ship Tamil but not the majority medium of instruction)
- **Brazil federal, until after 2026-10-25** (gov.br education pages are disabled under electoral law; you will get silence and misread it as rejection). Route through ABPEE, Nova Escola, and municipal/state networks meanwhile. Brazil is the biggest prize: Decreto 12.686/2025 plus LBI 13.146/2015 mandate PEI individualized plans that map onto what AlloFlow produces.
- **South Korea** (the national AI Digital Textbook programme was demoted from official textbook to supplementary material after one semester amid privacy and workload backlash; a free foreign AI tool lands in a hostile news cycle)
- **Mexico** (INAI was abolished March 2025 and the regime is in flux; you cannot make confident compliance statements there)

### The imperialism risk is documented, not hypothetical

eLearning Africa 2026 (Accra, 3-5 June) ran under the theme **"Africa's Time, Africa's Terms: Learning
for Sovereignty, Strength and Solidarity."** An unsolicited free US-built AI tool is exactly the shape of
thing that theme exists to push back on. Compounding it: USAID was dismantled in 2025, and every one of
these countries lost programmes because of a US decision. A solo American arriving in 2026 will be read
in that context whether or not it is fair.

**The only safe posture is to arrive asking to be corrected, never arriving with a solution.** Concretely:
lead with a public request for native speakers to correct the Kiswahili, Kinyarwanda, Hindi, Bengali and
Nepali packs. Asking to be corrected inverts the dynamic.

There is also a **legitimate pedagogical objection** you should be ready for. RREI (Red Regional por la
Educación Inclusiva, active through July 2026, presented before Brazil's STF) and Argentina's Resolución
CFE 311/16 both warn against a "currículum paralelo." AlloFlow's core move, generating grade-level
differentiated versions of the same content, **can be read as manufacturing exactly that.** If you
approach them, go as a listener and ask the question directly.

Also embedded in the product: the Portuguese `help_mode.alignment_standard_select` string currently tells
a Brazilian teacher that Common Core "oferece ampla aplicabilidade." `standards.frameworks` contains only
ccss_ela, ccss_math, ngss, c3, iste, casel, teks. `BNCC` appears **zero** times. **This is the single
highest-leverage anti-imperialism fix in the codebase and it is a handful of strings.**

---

## 6. Time-sensitive

| Deadline | What | Note |
|---|---|---|
| **2026-08-09, 23:59 EDT** | **OEGlobal 2026 early-bird**, Oct 7-9 at MIT, Cambridge MA. In-person $595 (rises to $795 on Sep 20); **online $195**. | ~2 hours from Portland. Hallway conversations with exactly the international open-education people who care about 63 language packs. **Six days.** |
| Before writing anything | **Email `support@digitalpublicgoods.net`** and ask in writing whether AlloFlow is assessed as open-source software or as an "**AI system**." | The AI-system track (added 2025-05-21) requires open training data and open weights, which nothing can meet. Do not spend evenings on an application that may be structurally impossible. |
| After a real Desktop release exists | **DPG Registry submission** at app.digitalpublicgoods.net. Free, ~30-day review, valid 1 year. | Highest credibility-per-hour available. Cite **Ollama + Qwen 2.5 (Apache-2.0)** as the open reference deployment. **Do not cite Llama 3.1**, its licence is not OSI-approved and naming it invites rejection. Indicator 4 (Platform Independence) is what the Gemini dependency probes. |
| Now | **Join CAST's free "UDL and AI Learning Community"** (Mighty Networks, via cast.org/connect/online-community). Monthly Expert Talks, Design Studios, explicitly invites members to post resources. | Best value-per-hour venue found. You arrive as a credentialed UDL practitioner, not a stranger promoting something. |
| **Early May 2027** | NASP 2027 CFP opened 2026-05-04 and closed **2026-07-08**. You missed it by four weeks. | Your own professional home, least reputational risk. Target Mini-Skills (1h45) or a Practitioner Conversation Session (45 min). Also diarize CEC 2028 (2027 closed 2026-06-01) and Scientix Ambassadors (closed 2026-04-30). |
| Rolling, open now | **Journal of Special Education Technology "Technology in Action"** (CEC ISET division, SAGE), max 22 pages. | The one open academic lane. With Dr. Howorth. A citable artifact is the entry ticket to every intermediary channel (EdTech Hub, UNESCO GEC, ministries). **Do not submit solo**: a single-author paper by a practitioner about his own tool reads as promotional. |
| Not yet | **HundrED** requires 1 year of implementation and >1,000 children reached. | Submitting now would require claiming reach you cannot substantiate. Treat as a 24-month milestone. |

Also closed to you, so stop considering them: **eTwinning** (needs a National Support Organisation in
your school's country; the US has none), **Erasmus+** (organisation-based, US is a partially-eligible
third country), **Mastercard Foundation EdTech Fellowship** (requires local registration and operating
history). Their free, open counterpart is **EdTech Mondays**, streaming publicly on the Mastercard
Foundation Young Africa Works Facebook page. Watch a few before writing to anyone.

---

## 7. Ordered plan

### Phase 0 (this week, ~8-12 evening hours) — nothing ships until this is done

| # | Owner | Task |
|---|---|---|
| 1 | Aaron | Decide the SPDX identifier (`AGPL-3.0-only` or `-or-later`) and **name the copyright holder** in `LICENSE`. Currently blank. |
| 2 | Aaron | Set repo topics, fill `homepageUrl` with `https://apomera.github.io/AlloFlow/`, enable Discussions. Four clicks in the web UI. |
| 3 | Aaron | Decide and write down exactly what you will claim about the language packs, before any copy exists. Decide whether `portuguese_angola` is repaired or unshipped. |
| 4 | Claude | Edit `COMPETITOR_RUBRIC.md`: retitle, caveats to the top, delete the 490/500 and 200-point sentences. |
| 5 | Claude | Add a machine-readable passthrough flag to the PPS-cluster entries in `lang/manifest.json` and surface a visible label in `ui_language_selector_module.js` (which currently contains zero occurrences of quality/tier/badge/beta/community/partial). **Acholi is urgent.** Correct the `lao` entry: it is real. |
| 6 | Claude | Fix the 13 mojibake keys, verifying by **char code U+003F**, not by eye. |
| 7 | Claude | Regenerate `desktop/dist/SHA256SUMS-windows.txt`. All three recorded hashes are stale. |
| 8 | Claude | Correct Piper "40+ languages" to 35 in `docker/README.md` and `docker/models/config.yaml`, and state that only `en_US-amy-medium` ships. |
| 9 | Claude | Write `CITATION.cff` and `CODE_OF_CONDUCT.md`. Move `AGENT_*`/`*_HANDOFF_*` files into `docs/internal/`. |
| 10 | Claude | Build `claims.yaml` plus a pre-publish linter that hard-fails on banned overclaim phrases, and run it over the existing README and site. |

### Phase 1 (week 2-3) — make the local-first claim true

| # | Owner | Task |
|---|---|---|
| 11 | Aaron | **Enable the Zenodo GitHub integration BEFORE cutting the release.** Order is load-bearing: Zenodo only archives releases created after the toggle is on. |
| 12 | Aaron | Install the built `.exe` on a clean Windows machine with no Node and no repo checkout. This is the actual test. |
| 13 | Aaron | Press publish on the first tagged GitHub Release. It distributes ~1.3 GB of executables under your name, so no agent does this. |
| 14 | Claude | Draft release notes stating **Windows-only** honestly (no Linux target exists in `desktop/RELEASE.md`, macOS unbuilt). |
| 15 | Claude | Fix the two `src/aiProvider.js` defects (the phantom Anthropic image endpoint, the hardcoded TTS hosts). |
| 16 | Claude | Write "AlloFlow with no cloud dependency" covering Desktop against ollama/localai. This is the document Europe and the DPG reviewer both need. |
| 17 | Claude | Add one line to `launch.html`: if the Canvas link does not open, the school's Workspace admin may have Gemini disabled, with a link to the Desktop download. |

**Kill criterion:** if the clean-machine install fails, unpublish the same evening. A broken download is
materially worse than no download.

### Phase 2 (weeks 4-8) — say true things in the reader's own vocabulary

| # | Owner | Task |
|---|---|---|
| 18 | Claude | Replace the FERPA/COPPA framing on the site with a **three-row deployment table**: Desktop+local model (no personal data leaves the device), Canvas (school is controller, Google is processor, US transfer applies), student shell (static hosting). **Name no statute as a guarantee.** |
| 19 | Claude | Add GDPR/SEND/EHCP vocabulary alongside the US terms. Localize the standards placeholders and rewrite the help string that recommends Common Core to non-US teachers. |
| 20 | Claude | Add the Article 50(1) "you are interacting with an AI system" notice and export provenance metadata. |
| 21 | Claude | Add a single `[dir="rtl"]` override block. RTL is ~1/3 done: `isRtlLang()` covers 16 codes and `dir` is set correctly, but there are 438 physical `ml-/mr-/pl-/pr-` classes, 360 `text-left/right`, 401 left/right positioning classes, and **zero** `[dir="rtl"]` overrides. **Downgrade all RTL marketing to "RTL-aware shell plus six fully translated RTL packs."** |
| 22 | Aaron | Line-edit everything into your own voice. No em dashes. Verify every claim personally. |
| 23 | Aaron | Post and pin a "Translation corrections wanted" Discussion naming the passthrough packs. |

### Phase 3 (months 2-6) — the two things that actually move adoption

| # | Owner | Task |
|---|---|---|
| 24 | Aaron | **Recruit 3-5 named native-speaker reviewers**, chosen by Portland Public Schools' actual newcomer demographics, modeled on Khan Academy's Language Advocates. Direct personal asks, one at a time. Passive channels yield roughly zero. Clear the employment boundary with HR first before approaching any district interpreter or contractor. |
| 25 | Claude | Build a "First 150" extraction: the ~150 highest-credibility strings per language (the `errors.*`/`toasts.*` a stuck user reads, plus the mojibake keys), as an **offline sheet with no login**, so saying yes takes 90 minutes. The receiving plumbing (`translation_feedback_module.js` → Worker `/submitTranslation` → guarded ingest script) **already exists and has never received a live submission.** |
| 26 | Aaron | Ask Dr. Howorth about JSET co-authorship. If she declines or is unavailable within 8 weeks, **do not submit solo.** |
| 27 | Aaron | Pursue **exactly one** partner conversation to depth rather than many shallowly. |
| 28 | Aaron | Register on `community.learningequality.org` and participate as a practitioner. Answer three other people's questions before mentioning AlloFlow once. It is the one verified open door a stranger can walk through today. |

### Phase 4 — social, deliberately last and deliberately small

Two channels only. **Bluesky** (the only platform with a verified live international special-education
audience: `ncseirl.bsky.social` = Ireland's National Council for Special Education, confirmed active July
2026; `senacni.bsky.social`; `rise-open-journal.bsky.social`, a diamond open-access special-ed journal;
`edaccelerator.bsky.social`) and **LinkedIn**. Use `#EduSky` as a discovery tag but expect reach from
individual educators, not org accounts. Skip X entirely.

Format priority for your evenings: **YouTube evergreen screencasts** narrated in your own voice (zero AI
disclosure obligation on any platform, and where your clinical expertise actually shows) > Facebook
Groups via genuine participation aimed at the Philippines > Threads short text. Deprioritize Instagram
and TikTok.

---

## 8. What was not done, and known gaps

- **The two adversarial red-team agents did not run.** Nothing here has been attacked by a hostile
  reviewer. Treat the plan as un-stress-tested.
- **The final synthesis agent did not run.** Section 7 is Claude's ordering, not an independent judge's.
- **Reddit is entirely unverified.** All Reddit domains were blocked from the research environment.
- **Whether Gemini *Canvas specifically* is available where the Gemini web app is** was not confirmed by
  any agent. Google publishes availability for the web app (230+ countries), not for Canvas. **This is
  testable by you and is arguably the single highest-value unknown in the whole report.**
- **Whether a Canvas share link opens usefully for a recipient on a school-managed Workspace for
  Education account, or for an under-18 user**, is unresolved and Google's own docs are internally
  contradictory.
- **Nobody has run AlloFlow from Nairobi, Manila, São Paulo, Delhi or Warsaw.** Everything in the
  readiness audit is static repo reading. No RTL or complex-script rendering was screenshotted, and no
  font check was done: the app ships only 2 `@font-face` declarations (OpenDyslexic) plus KaTeX math
  fonts, so **Amharic, Khmer, Burmese and Tamil depend entirely on the user's system fonts** and may
  render as tofu boxes.
- **Whether "AlloFlow" is trademarked anywhere** is unknown; every database was blocked.
- **Whether AGPL-3.0 creates procurement friction** with ministries or the DPG review is unknown.
- **Dr. Howorth's actual capacity and interest** is an organizational question, not a researchable one,
  and the entire credibility recommendation depends on it.
- Several sub-findings rest on secondary sources and are flagged inline in the raw agent output. The
  Lanham Act analysis in particular was rated the highest practical risk **and** the least verified.
