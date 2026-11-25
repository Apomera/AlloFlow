# AlloFlow Packets: file formats

For developers and school IT. This document says what is inside the files that Packets makes and reads:

1. the student file (a practice file or a check: one HTML file),
2. the results files a student saves (JSON and CSV),
3. the file that "Save all of this as one file" makes on the Add up results page,
4. the rules for versions.

It describes what the code does as of 2026-11-19 (section 6, sealed QR results: as of 2026-11-23). The code is the final word. Where the code and its comments disagree, or where this document could not settle a point from the code, it says so in [Known differences](#5-known-differences).

The code that writes and reads these files:

| File | What it does |
|---|---|
| `word_sounds_take_home_loader.js` | Writes every student file (`buildHtml`). Holds the student file's player, which writes both results files (`packetCsv`, and the result object in `takeHomeShell`). Reads a results JSON file in the app (`parseResult`). |
| `word_sounds_packet_builder.js`, `packet_math_practice_builder.js`, `packet_check_builder.js`, `packet_vocab_builder.js`, `packet_symbol_runner_builder.js`, `packet_read_along_builder.js` | Make the lesson for one kind of file, call `buildHtml`, and may add fields to the manifest afterward. |
| `packets_results_reader.js` | Reads results files and the one-file bundle for the Add up results page (`packets-results.html`). Writes the bundle and the summary CSV. |
| `packets-results.js` | The Add up results page. Saves the bundle and keeps it in the browser when the teacher turns that on. |
| `packets_verify_core.js` | The checks behind Look inside a file (`packets-verify.html`). |

Words used here: a **practice file** gives feedback and more than one try. A **check** gives one try, no feedback, and keeps a clock. Inside the lesson a check is called mode `probe`. Results and manifests made from 2026-11-12 call it `check`. Every reader treats `check` and `probe` as the same thing.

---

## 1. The student file

### 1.1 What is in it

One HTML file, UTF-8, made by `buildHtml`. Its parts, in order:

| Part | What it holds |
|---|---|
| `<meta charset="utf-8">` and a viewport line | |
| `<meta http-equiv="Content-Security-Policy" content="...">` | The rule the browser enforces on the file (1.2). It comes before anything that loads. |
| `<meta name="generator" content="alloflow-word-sounds-take-home/2">` | The player's name and version. |
| `<title>` | The lesson title, escaped. |
| `<style>` | The two reading fonts as `@font-face` rules with `data:` addresses, then the player's styles (and the check styles in a check). |
| `<body><main>` | The title as `<h1>`; `<div id="app">` with a note for previews that do not run the file; `<p id="live">` for screen readers. In an English file the note also says where to open the file on a phone or tablet: `apomera.github.io/AlloFlow/packets-open.html`. |
| `<script type="application/json" id="packet-manifest">` | The manifest block (1.4): what the file says about itself. Data only: it never runs. |
| `<script>` | The one script that runs. It starts with the lesson (1.3), then the labels, then the code. |

The file has no other script, no `<link>`, no `<iframe>`, no form and no link. The only full web address (with `https://`) is that of a class mailbox, in a file that has one (1.5). The Open page in the preview note, and the license and source in the manifest, are written as plain text with no `https://`.

Both JSON parts are written with the same escaping (`safeJson`): `<`, `>` and `&` become `<`, `>` and `&`, and the line separators U+2028 and U+2029 are escaped. So no value can close a `<script>` tag. The title in the markup is escaped as HTML.

### 1.2 The Content-Security-Policy and the script pin

The policy line of a practice file or a check with no class mailbox:

```
default-src 'none'; script-src 'sha256-<base64>'; style-src 'unsafe-inline'; media-src data: blob:; img-src data:; font-src data:; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; connect-src 'none'
```

| Part | What it means |
|---|---|
| `default-src 'none'` | Anything the policy does not name is refused. |
| `script-src 'sha256-...'` | Only the one script whose SHA-256 matches can run. |
| `style-src 'unsafe-inline'` | The styles written inside the file. |
| `media-src data: blob:` | Only sounds held in the file. |
| `img-src data:` | Only pictures held in the file. |
| `font-src data:` | Only fonts held in the file (the two reading fonts). This part is written only when the loader carries the fonts, which the current loader does. |
| `form-action 'none'`, `base-uri 'none'` | No form can send, and no base address can be set. |
| `object-src`, `frame-src`, `worker-src`, `manifest-src` `'none'` | No plug-ins, frames, background scripts or web app manifest. |
| `connect-src 'none'` | No connection of any kind. In a file with a class mailbox: `connect-src https://script.google.com https://script.googleusercontent.com`. |

**The script pin.** The loader builds the text of the one script, turns every line end into `\n`, and takes the SHA-256 of that text as UTF-8. The policy carries it in base64 (`'sha256-...'`). The manifest carries the same value in hex (`scriptSha256`). A browser hashes the script exactly as it reads it, so a change of one character stops the script from running. If the loader cannot make a SHA-256, it writes `'unsafe-inline'` instead and leaves `scriptSha256` empty. The current loader always can.

The lesson is inside the script, so the pin covers the lesson too. The manifest is outside the script, so the pin does not cover it.

The two reading fonts are Lexend (2019 The Lexend Project Authors) and Atkinson Hyperlegible (2020 Braille Institute of America, Inc.), under the SIL Open Font License 1.1. The manifest's `fonts` field says so.

### 1.3 The lesson (schema `alloflow-take-home-lesson/v2`)

The script starts:

```
(function(){"use strict";
var lesson={...};
var labels={...};
var matches=...
```

The value of `lesson` is JSON. Look inside a file calls it "the data block": the text between `var lesson=` and `;\nvar labels=`. `buildHtml` refuses a lesson whose `schema` is not exactly `alloflow-take-home-lesson/v2`, or that has no blocks.

| Field | What it holds |
|---|---|
| `schema` | `alloflow-take-home-lesson/v2`. |
| `player` | `alloflow-word-sounds-take-home/2`. |
| `lessonId` | The packet id. |
| `revision` | The packet version: `r` and an 8-digit hex hash of the content. |
| `createdAt` | When a Word Sounds lesson was made (ISO time). Checks do not carry it. |
| `language` | `en` for the current makers. |
| `title` | The title the student sees. At most 120 characters. |
| `showLetters` | Whether letters are shown. |
| `activityTitles` | Activity id to its title. |
| `blocks` | One block per activity: `{ activity, items: [...] }`. Each activity's `prepare` step decides what an item may hold (a list of allowed fields). |
| `feedback` | The recordings for right and try-again. |
| `audio` | Recording id to a `data:` address. |
| `images` | Picture id to a `data:` address. |
| `submit` | `null`, or a class mailbox: `{ url, packId, secret, expiresAt }` (1.5). |
| `mode` | `probe` in a check. `practice`, or absent, in a practice file. |
| `form`, `timeLimitS`, `check` | A check only. `check` holds the measure, the score unit, the scoring and form versions, untimed settings, and `lock` (a salted hash of the teacher code) when there is one. The answers are scrambled (XOR with a SHA-256 keystream). |
| `pictures`, `instructionsOnce`, `repeatMissed`, `sequence` | Only when used. `repeatMissed` (from 2026-11-17) repeats missed Word Sounds questions once more at the end. `sequence` (from 2026-11-18) lists item ids in play order when questions are mixed across activities or ordered by the teacher. |
| `directions` | From 2026-11-17, only in a check for the youngest students (Quantity Discrimination, Missing Number) made with the recordings of its directions: the ids, in `audio`, of the recordings of the three lines of its Get ready screen, in order. The screen then has a Hear the directions button. The items, the answers and `revision` are the same with or without it. |
| `read_along` supports | From 2026-11-22, a `read_along` item may also carry `supports: [{ id, line, quote?, occ?, text, img?, alt?, audio? }]` (teacher-authored notes/definitions anchored to a page-local `line` index, capped at 60/page) and optional `glossary[word].a` (clip id in `lesson.audio` for spoken meanings) and `glossary[word].c: true` (teacher custom entry). Support clips use deterministic `g1`, `g2`, … ids in `lesson.audio` and play strictly from embedded `data:` URIs with zero AI or network calls. |

### 1.4 The manifest (`alloflow-packet-manifest`)

| Field | What it holds |
|---|---|
| `kind` | `alloflow-packet-manifest`. |
| `engine` | `alloflow-packet/1`. |
| `player` | `alloflow-word-sounds-take-home/2`. |
| `title` | The lesson title. |
| `packet` | `{ id, version, form, mode }`. `mode` is `practice` or `check` (`probe` before 2026-11-12). `form` is empty in a practice file. |
| `what` | One sentence saying what the file is. |
| `stores` | `[{ where: "localStorage", key, holds, until }]`. The one item the file keeps in the browser. `key` is `alloflow-take-home:<packet id>:<version>`. |
| `saves` | The two results files: `<stem>.csv` with format `alloflow-packet-result/1`, and `<stem>.json` with format `alloflow-take-home-result schemaVersion 3`. In this list the stem shows `LEARNER` and `DATE` where the real names go. |
| `network` | `"none"`, or `{ sendsTo: "script.google.com", what, when }` in a file with a class mailbox. |
| `never` | `["internet connection", "microphone", "camera", "cookies", "AI"]`. A file with a class mailbox leaves out `internet connection`. |
| `integrity` | One sentence about the check value in the results files. |
| `csp` | A copy of the policy line. |
| `scriptSha256` | The script hash in hex (1.2). |
| `licence` | `AGPL-3.0`. (The field name is spelled this way in the code.) |
| `licenceUrl`, `source` | `gnu.org/licenses/agpl-3.0.html` and `github.com/Apomera/AlloFlow`, shown in About this file. Files made before these fields were added do not have them, and the file shows the same two values anyway. |
| `attributions` | The credits for the content of the file, as a list of lines. |
| `fonts` | The credit line of the two reading fonts. |
| `check` | A check only: `measure`, `scoreUnit`, `scoringVersion`, `formVersion`, `timeLimitS`, `items`, `practiceItems`, `clock`, `answers`, `teacherCode`. `teacherCode` says only whether a code is set, never the code. |

The builders add fields after `buildHtml` has run, for example `builder` (`{ name, seed, ai: "none", words, items, order, orderSeed, ... }`, where `order` is `"mixed"`, `"own"` or `"blocks"` from 2026-11-18), `learner` (a code name the file was made for), `pictures`, `vocab` and `speech` (a vocabulary file that reads aloud with the device's own voice). Because the manifest is outside the script, adding a field does not change the script pin.

**The code name.** The student file reads a code name from its own address (`file.html#learner=BlueHeron7`) or from the manifest's `learner` field; the address wins. With a code name, the file keeps its place under the storage key plus `:` and the code name in lower case, so each code name has its own place on a shared device.

### 1.5 The class mailbox kind

A practice file made inside the AlloFlow app by a teacher who set up a class mailbox carries `submit: { url, packId, secret, expiresAt }` in its lesson. The `url` must be a Google Apps Script web app address (`https://script.google.com/.../exec`). Only then does the policy name the two Google hosts, and only then does the file carry the code that sends. The file sends when the student presses Send, as plain-text POST requests. It sends this wrapper:

| Field | Value |
|---|---|
| `kind` | `alloflow-take-home-submission` |
| `schemaVersion` | `1` |
| `studentName` | The label, at most 80 characters (`Student` when blank). |
| `submissionDate` | The finish time (UTC). |
| `takeHomeResult` | The results JSON (2.2). |

The address and the key travel inside the file, so anyone who has the file can post to that mailbox. Files made by the six builders of the Packets maker pages have `submit: null`: they have no mailbox.

### 1.6 What Look inside a file checks

`packets_verify_core.js` reads the file as text. It never runs it and never turns it into page elements. It refuses a file over 60 MB or an empty file. It returns a report with one of three headlines: the file cannot connect anywhere; the file can send to one place (script.google.com); or a person needs to look, with the number of things that were not expected.

It sorts the file first:

- a results file (JSON or CSV), which it sends to Add up results;
- a packet: a file with a `packet-manifest` block whose `kind` is `alloflow-packet-manifest`;
- an older practice file: no manifest, a generator line like `alloflow-.../n`, and a script that names `alloflow-take-home-lesson/` near its start (fewer checks apply);
- anything else: not a packet.

For a packet it then:

| Area | What it checks |
|---|---|
| Fingerprint | The SHA-256 of the file as it is on disk (or of its text). |
| Policy | That there is exactly one policy line, before anything else in the head, with plain ASCII only and no line named twice. It reads each part as a browser would: connections, scripts, styles, pictures, sounds, fonts, frames, plug-ins, workers, forms and base address. It flags any part that lets something in from elsewhere, `'unsafe-eval'`, more than one script hash, a script that is not pinned, and forms or base not blocked. |
| Markup | No element a packet does not have, no code in attributes, no attribute that points to another file, no script loaded from a file, exactly one script that runs, no second data block, and the manifest labeled `application/json`. It also says when the file does not declare UTF-8. |
| Script hash | The SHA-256 of the script, as a browser reads it, against the hash in the policy and the hex hash in the manifest: they agree, or they differ. It also gives a hash of the code with the lesson taken out, so two files made the same way with the same activities show the same value. |
| Scan | Every web address, and every `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `RTCPeerConnection`, `eval(`, `new Function`, `import(`, worker, change of address, `open(`, `<form`, frame, `<object>`, `<embed>`, `<link>`, `<base>`, refresh, `javascript:`, `data:` page, cookie, microphone or recording, `speechSynthesis`, service worker, other storage, markup built from text, `localStorage`, file save, clipboard, `postMessage` and `BroadcastChannel`, with a line, a character and a short excerpt. Each is marked "expected in this kind of file", "not expected" or "needs a person to look". |
| Mailbox | The policy and the lesson agree: both have a class mailbox, or neither does. A file with a mailbox has exactly one call that sends. The key is never shown. |
| Claims | Each statement in the manifest set beside what the code shows: which packet it is, its policy copy, its script hash, what it stores, what it saves, what it connects to and when, each item of `never`, the license and credits, and in a check the teacher code and the scrambled answers. Each is "agree", "differs" or "cannot tell". A license, credits, and when code runs are always "cannot tell": a scan cannot show them. |

---

## 2. The results files

### 2.1 Names

The student file saves two files with the same stem:

```
<title>__<learner>__<YYYY-MM-DD>.csv
<title>__<learner>__<YYYY-MM-DD>.json
```

Each part keeps letters, marks and digits and turns every other run of characters into `-`. The title is cut to 60 characters (40 before 2026-11-16) and the learner label to 40. A blank title reads `packet` and a blank label `results`. The date is the finish date on the student's clock (or the start date when there is no finish). Readers recognize a file by what is in it, never by its name.

### 2.2 The results JSON (`alloflow-take-home-result`)

| Field | What it holds |
|---|---|
| `kind` | `alloflow-take-home-result` |
| `schemaVersion` | `3` |
| `player` | The lesson's player. |
| `sessionId` | A random id for this run (a UUID). |
| `packet` | `{ id, version, engine: "alloflow-packet/1", form, mode }`. `mode` is `practice` or `check`. |
| `lessonId`, `revision` | The same as `packet.id` and `packet.version`. Kept for older readers. |
| `lessonTitle`, `activityTitles` | As in the lesson. |
| `learner`, `learnerName` | The label the student typed. Both carry the same value. |
| `startedAt`, `finishedAt` | UTC times (ISO). |
| `startedLocal`, `finishedLocal` | The device's local time with its offset, for example `2026-11-16T09:10:00-05:00`. |
| `durationMs` | Finish minus start. A file that was resumed spans the days between. |
| `timesAreFromTheLearnerDevice` | `true`. |
| `activeMs` | The time on the items added up, hidden time left out (files saved from 2026-11-13). |
| `items` | One per item (below). |
| `summary` | The counts. A practice file: `items`, `done`, `firstTry`, `afterRetry`, `missed`, `practised`, then the CSV summary's `itemsGiven`, `attempted`, `correct`, `firstTry`, `accuracyPct`, `accuracyOfAttemptedPct` and `byActivity`. A check writes its own `items`, `done`, `firstTry`, `afterRetry`, `missed`, `practised` from its score, then the same CSV fields. |
| `integrity` | `{ method, value, note }`. `method` is `sha256`, or `fnv1a` where the browser could not make SHA-256. The value covers the item rows of the CSV (2.4). |
| `score` | A check only (below). |

Each item:

| Field | What it holds |
|---|---|
| `n` | Its place, from 1. |
| `itemId`, `activity`, `word` | As in the lesson. A Symbol Runner item id ends in `-new` or `-known` in a rehearsal file, and from 2026-11-17 an item with something to ignore (color words, the middle letter, dots and digits) has `-match` or `-conflict` before that: whether the two things on the card agree. The readers count the two kinds apart from the id. |
| `target` | The right answer, or `null`. In a check, the answer is unscrambled only when the results are made. |
| `responses` | Each answer, in order (text, at most 80 characters each). A read-along page (from 2026-11-23): first `read` or `played`, then one entry for each answer to its "Check your understanding" questions: a typed answer as `2: <text>` (at most 240 characters), a choice as `1: Mia (right)`, `1: Mia (right, try 2)`, `1: Soup (not right)` or `1: Soup (not right, 3 tries)`. These answers do not change any count: a read-along is not scored. |
| `attempts`, `firstTry`, `correct`, `done` | The number of answers and the outcome. |
| `ms` | The time on the item, from its being shown to its being done, not counting time the page was hidden. From 2026-11-23 the time on a read-along page adds up when the student comes back to it in the same opening of the file. |
| `supports` | Name to count: each help used (for example `questionReplays`, `wordReplays`, `soundListens`) and each reading tool. |
| `practice` | `null`, or a value that marks an unscored item (`practice` for a check's sample item; the readers also accept `traced`, `skipped`, `read` and `played`). A read-along page is `read` when the student started something on it (Read to me, a sentence, the next or the previous sentence, Auto pace) and `played` when the file turned to it or played it by itself (Auto-advance, Auto pace) and the student started nothing on it. A `played` page the student later comes back to and reads becomes `read`. Both are in `summary.practised`. |
| `flag` | `""`, `skipped`, `time_up`, `resumed` (shown before, in an earlier opening of the file; from 2026-11-23 never for a page looked at again in the same opening) or `paused` (a check's item set aside during a pause). |
| `digitsCorrect`, `digitsPossible` | A check only: whole numbers, or `null`. |
| `recallMs` | From 2026-11-17, math fact practice only (cover, copy, compare; rehearsal): the time from the fact being covered (or, for a card that starts covered, from its being shown) to the first answer from memory, in ms, not counting time the page was hidden. Absent when it was not timed (the file was reloaded in between). It is in the JSON only: the CSV item rows are unchanged. |

The `score` of a check:

| Field | What it holds |
|---|---|
| `measure`, `scoreUnit` | For example `math_dcpm` and `digits_correct_per_minute`, or `items_correct`. |
| `score` | The score, or `null` when there is none. |
| `noScoreReason` | `ended_early`, `time_up_away`, `untimed`, `too_fast` or `""`. |
| `digitsCorrect`, `digitsPossible`, `itemsCorrect`, `itemsAttempted` | Counts of scored items. |
| `timeLimitS`, `elapsedS`, `hiddenS` | Seconds. `elapsedS` and `hiddenS` to a tenth. |
| `completion` | `complete`, `time`, `ended_early` or `time_up_away`. |
| `prorated` | `true` when a rate was worked out from less than the full time. |
| `scoringVersion`, `formVersion`, `attempt` | The try number counts the times this check was started on the device. |
| `flags` | Any of `left_the_page`, `reloaded`, `clock_changed`, `two_tabs`, `paused`, `time_up_away`, `attempt_unknown`. |
| `tools` | The reading tools that were on during a scored item. |
| `untimed`, `usualTimeLimitS` | Only for an untimed check (an accommodation). |
| `pausedS`, `pauses` | Only for a check that was paused: the seconds paused (to a tenth) and how many times. `elapsedS` leaves the paused time out. (Added on 2026-11-17.) |
| `directionsHeard` | Only when Hear the directions was pressed on the Get ready screen: how many times. It says the button was pressed, not that the recording was heard to its end. (Added on 2026-11-17.) |

The score is not covered by the check value. The answers are, and the Add up results page counts the score again from the answers and notes when the two differ.

### 2.3 Results JSON versions

| `schemaVersion` | What it is |
|---|---|
| 1 | The first Find Sounds take-home results. The code in this repository never writes it; the readers still read it. Its items have no `activity`, and readers take each item to be Find Sounds (`isolation`). |
| 2 | The take-home results before 2026-11-11: `kind`, `schemaVersion`, `player`, `lessonId`, `revision`, `lessonTitle`, `activityTitles`, `learnerName`, `startedAt`, `finishedAt`, `timesAreFromTheLearnerDevice`, `items` (`itemId`, `activity`, `word`, `target`, `responses`, `attempts`, `firstTry`, `correct`, `done`, `supports`, `practice`) and `summary`. |
| 3 | Since 2026-11-11. Adds `sessionId`, `packet`, `learner`, `startedLocal`, `finishedLocal`, `durationMs`, the check value `integrity`, the CSV summary fields in `summary`, and on each item `n`, `ms` and `flag`. Later, without a new version number: checks (`score`, item digits, `packet.form`; `packet.mode` `probe`, then `check` from 2026-11-12), `activeMs` and `completion: "time_up_away"` (2026-11-13), `score.tools`, and `summary.accuracyOfAttemptedPct`, `score.pausedS` and `score.pauses` (2026-11-17). |

### 2.4 The results CSV (`alloflow-packet-result/1`)

The text is UTF-8 with a byte-order mark, lines end with CRLF, and the file ends with a line end. Every cell is in double quotes, with `"` doubled. A text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading `'` so a spreadsheet does not run it as a formula. Readers take that `'` off again. Numbers are written as numbers and get no `'`. Text that is a negative number, such as an answer of `-3`, does get one, like any text starting with `-`.

The first line is the header. Then one line for each item. Then the trailer lines.

The columns, in order:

| # | Column | What it holds |
|---|---|---|
| 1 | `format` | Always `alloflow-packet-result/1`. |
| 2 | `session_id` | The random id of this run. |
| 3 | `packet_id` | The packet id. |
| 4 | `packet_version` | The packet version. |
| 5 | `form` | The form of a check (for example `A`, or `custom`). Empty in a practice file. |
| 6 | `mode` | `practice` or `check` (`probe` in a check saved before 2026-11-12). |
| 7 | `learner` | The label the student typed. May be empty. |
| 8 | `started_local` | Start time, local, with its offset. |
| 9 | `finished_local` | Finish time, local, with its offset. |
| 10 | `duration_s` | Finish minus start, in whole seconds. |
| 11 | `item_n` | The item's place, from 1. |
| 12 | `item_id` | The item's id. |
| 13 | `activity` | The activity id, for example `isolation`, `math_ccc`, `vocab_meaning`, `symbol_runner`. |
| 14 | `activity_title` | The activity's title. |
| 15 | `scored` | `1`, or `0` for an item that is practice and not scored (Letter Trace, a check's sample item). |
| 16 | `word` | The word or prompt of the item. |
| 17 | `target` | The right answer. |
| 18 | `responses` | Each answer, in order, joined with ` \| ` (space, bar, space). |
| 19 | `correct` | `1` or `0`. |
| 20 | `first_try` | `1` or `0`. |
| 21 | `tries` | The number of answers. |
| 22 | `time_ms` | The time on the item in milliseconds, hidden time left out. |
| 23 | `supports` | Each help and reading tool used, as `name:count`, joined with `;`. |
| 24 | `flag` | `skipped`, `time_up`, `resumed`, `paused` or empty. |
| 25 | `digits_correct` | A check only: a whole number, or empty. |
| 26 | `digits_possible` | A check only: a whole number, or empty. |

The trailer lines start with `#` in the first cell. Readers skip a `#` line they do not know.

| Line | Cells |
|---|---|
| `#summary` | `#summary`, the session id, then `items_given=`, `attempted=`, `correct=`, `first_try=`, `accuracy_pct=`. In a check, then `attempt=`. Then `title=` (the title the student saw, at most 120 characters), in files from 2026-11-13 `active_s=`, and in files from 2026-11-17 `accuracy_of_attempted_pct=` (right / attempted; empty when nothing was attempted). A math fact practice file that timed a recall then adds `recall_items=` (how many facts were right at the first try from memory) and `recall_median_ms=` (the median of their `recallMs`). |
| `#score` | A check only, between `#summary` and `#integrity`: `#score`, the session id, then `measure=`, `score=`, `score_unit=`, `digits_correct=`, `digits_possible=`, `items_correct=`, `items_attempted=`, `time_limit_s=`, `elapsed_s=`, `hidden_s=`, `completion=`, `prorated=` (`1` or `0`), `scoring_version=`, `form_version=`, `attempt=`, `flags=` (joined with `;`), `tools_used=` (joined with `;`). An untimed check adds `timing=untimed` and `usual_time_limit_s=`. A check that was paused then adds `paused_s=` and `pauses=`. A check whose Hear the directions button was pressed then adds `directions_heard=`. |
| `#integrity` | `#integrity`, the method (`sha256` or `fnv1a`), the value, and the words `detects accidental edits, not deliberate ones`. |

In `#summary`, `accuracy_pct` is correct over items given, so in a timed check it counts items the student never reached; `accuracy_of_attempted_pct` is correct over items attempted. Both are empty when nothing in the file is scored (a read-along, or Letter Trace alone).

**The check value.** The text it covers is:

```
<packet_id>|<packet_version>|<form>|<session_id>
<item line 1>
<item line 2>
...
```

Each item line is exactly as written in the CSV (every cell quoted, with the `'` guard), joined with `\n`. The header and the trailer lines are not covered. The student file makes an FNV-1a value at once (8 hex digits) and replaces it with SHA-256 (64 hex digits) when the browser has made it. The JSON carries the same value. The check value finds accidental changes, not deliberate ones: anyone can work it out again.

**Columns are only ever added at the end.** A new column goes after the last one, and every earlier column keeps its place and its meaning. This is how the two check columns were added after `flag`. The readers find columns by their header names, ignore columns they do not know, and, when checking the value, put unknown columns after the known ones in file order. So a file with an extra column at the end still checks out, and one with a column inserted in the middle would not. A file whose header row was deleted is read in the saved order.

---

## 3. Files of the Add up results page

Add up results (`packets-results.html`) accepts individual `.csv` and `.json` results files, a saved results bundle (3.1), and (from 2026-11-19) `.zip` folders containing `.csv` or `.json` results files (such as LMS bulk downloads), unpacked entirely in the browser (up to 50 MB per archive, up to 500 files, skipping nested `.zip` archives and password-protected entries).

### 3.1 "Save all of this as one file" (`alloflow-packet-results-bundle`)

The button saves `results-all__<YYYY-MM-DD>.json` (`sample-results-all__...` for the sample results). Dropped on the page again, it opens where the teacher left off. The page also keeps this same object in the browser (localStorage key `alloflow-packets-results/1`) only while "Keep these results on this device" is on.

| Field | What it holds |
|---|---|
| `kind` | `alloflow-packet-results-bundle` |
| `version` | `1` |
| `note` | One sentence saying what the file is. |
| `savedLocal` | When it was saved, local time with its offset. |
| `sessions` | The results as the page read them, at most 5000. |
| `merges` | `[{ from, into }]`: labels the teacher counted as one student. |
| `apart` | `[[a, b]]`: pairs of labels the teacher said are different students. |
| `goals` | `[{ learner, measure, value }]`: the goals typed on the page. |
| `goalDates` | `[{ learner, measure, date }]`: optional goal dates (`YYYY-MM-DD`), added on 2026-11-17. |
| `paper` | `[{ learner, measure, name, date, value, note }]`: paper scores typed on the page (kept apart from screen results), added on 2026-11-17. |

Each session holds `sessionId`, `learner`, `packetId`, `packetVersion`, `title`, `mode` (`practice`, or `probe` for a check), `form`, `startedLocal`, `finishedLocal`, `start`, `date`, `dateFromFile`, `durationS`, `activeS`, `items`, `stated` (the score as the file stated it), `attempt`, `integrity` (`ok`, `changed`, `absent` or `unchecked`), `source` (`csv` or `json`) and `sourceFile`. The page also saves the counts it worked out, but on reading it ignores them: every value is read again as untrusted text, and every count is made again from the items. A session with no item done is dropped. From 2026-11-23 the page also works out, for a read-along, what its pages hold (`readAlong`: the pages in the file, the pages read, the pages only played, the time on the pages, and the answers to "Check your understanding" under each page; see `responses` in 2.2). It is made again from the items each time and is not written to this file: the fields above are unchanged.

### 3.2 "Save a summary (CSV)"

`results-summary__<YYYY-MM-DD>.csv`: one row for each result, with the same cell rules as 2.4. Its columns, in order: `learner`, `date`, `measure`, `form`, `score`, `score_unit`, `accuracy_pct`, `first_try_pct`, `items_given`, `items_attempted`, `duration_s`, `flags`, `session_id`, `packet_id`, `packet_version`, `integrity`, `source_file`, `title`, `measure_name`, `accuracy_of_attempted_pct`, `active_s`. The last four were added on 2026-11-13, at the end.

From 2026-11-23 the `flags` column of a check may hold `same_answer`, a note the page counts from the answers (it is not in the student's file): at least 8 answers were given, at least 8 in 10 of them were the same answer, and at least half of those were not right. It is a note only; the score is as counted.

---

## 4. Versions: what a reader must do

| Format | Name and version | A reader must |
|---|---|---|
| Lesson | `schema: "alloflow-take-home-lesson/v2"` | Refuse to build from any other value. Look inside a file accepts any `alloflow-take-home-lesson/` value when it reads a file. |
| Manifest | `kind: "alloflow-packet-manifest"`, `engine: "alloflow-packet/1"` | Treat a block with another `kind` as "not a packet". The engine version is shown, not checked. Ignore fields it does not know. |
| Results JSON | `kind: "alloflow-take-home-result"`, `schemaVersion` 1, 2 or 3 | Read 1 to 3. Refuse a higher number as "saved by a newer version than this page can read", and anything else as not a results file. Ignore fields it does not know. Unwrap a class mailbox copy (`alloflow-take-home-submission`, field `takeHomeResult`) first. |
| Results CSV | `format` cell `alloflow-packet-result/1` | Read rows whose format is exactly `alloflow-packet-result/1`. Skip a row with another `alloflow-packet-result/` version, and when no row is left, say the file was saved by a newer version. Find columns by name, ignore unknown columns and unknown `#` lines. |
| Bundle | `kind: "alloflow-packet-results-bundle"`, `version: 1` | Read version 1. Refuse a higher number as newer. |
| Mailbox copy | `kind: "alloflow-take-home-submission"`, `schemaVersion: 1` | Read the `takeHomeResult` inside it. |

For writers: add fields and columns, never rename, move or reuse one. A change that an older reader would read wrongly needs a new version number.

---

## 5. Known differences

Places where the code and its comments, or two parts of the code, do not say the same thing, and points this document could not settle from the code.

1. **"Data block" means two things.** Look inside a file calls the lesson "the data block", but the lesson is not a separate block: it is a JSON value inside the one script that runs (`var lesson=...;`). The manifest is the file's one data block, and Look inside a file flags any second one ("A second data block").
2. **A check has two mode names.** The lesson says `probe`. The manifest and the results files say `check` from 2026-11-12, `probe` before. The results page's bundle keeps `probe`, its own name for a check.
3. **Version 3 grew without a new number.** `score`, `activeMs`, `completion: "time_up_away"` and `score.tools` were added to results JSON version 3 after it first shipped. A reader of an early version 3 file finds them missing.
4. **Version 1 is not in this repository.** No code here writes results JSON version 1. What it held is known only from how the readers treat it (items with no `activity` read as Find Sounds).
5. **The storage key in the manifest leaves out the code name.** `stores[0].key` is `alloflow-take-home:<id>:<version>`. When the file has a code name (from `#learner=` or the manifest's `learner`), the code adds `:` and the code name to that key.
6. **The two readers set different limits.** Both keep the first 600 items of a result. `parseResult` in the loader caps `attempts` at 9 and keeps 6 answers per item; `packets_results_reader.js` caps tries at 99, keeps 8 answers per item, and reads at most 40 results from one CSV file.
7. **The add-at-the-end rule is written in a comment only for the summary CSV** (3.2). For the results CSV it is how the check columns were added and what the readers' check of the value relies on, but no comment states it for that file.
8. **The manifest field is spelled `licence`.** Look inside a file reads `licence` or `license`.
9. **The manifest's `saves` list writes `LEARNER` and `DATE`** in place of the real label and date.
10. **The Open page address is written into each English file when it is made.** A file made on a Packets page served over http or https names that site's Open page; any other file names `apomera.github.io/AlloFlow/packets-open.html`. A file already handed out cannot change it.

---

## 6. Offline sealed QR results (`AFPK1` / `AFSK1` / `AFQR1`, added 2026-11-22)

When a teacher opts in (via `packets-qr.html` or `opts.qrPublicKey` in `word_sounds_take_home_loader.js`), a packet carries an X25519 teacher public key and can display an encrypted, non-URL QR result on the end screen without any internet connection (`connect-src 'none'`). Regular packets built without a teacher key carry none of this code or data.

| Format | Prefix / kind | Contents |
|---|---|---|
| Teacher public key | `AFPK1.<base64url>` | 32-byte X25519 public key (49 characters total). Safe to embed inside student packets (`lesson.qr = { k, fp }`) or share with a co-teacher. |
| Teacher private key file | `kind: "alloflow-packet-qr-key"`, `version: 1` | Local `.json` file (`alloflow-qr-key__<fp>.json`) holding `label`, `createdAt`, `fingerprint`, `publicKey`, and `secretKey` (`AFSK1.<base64url>`, 32-byte X25519 private scalar). |
| Key ID (`fp`) | 8 lowercase hex chars | First 4 bytes of `SHA-256("AFPK1|" + publicKeyBytes)` (the six ASCII bytes `AFPK1|`, then the 32 key bytes; `fingerprintOf` in `packets_qr_crypto.js`), shown under the student QR and in `manifest.qr.keyFingerprint` so teacher and packet keys can be matched visually and verified by Look inside a file. |
| Sealed QR payload | `AFQR1:<BASE32>` | RFC 4648 Base32 uppercase (`A-Z`, `2-7`, no padding) encoded in ISO 18004 QR Alphanumeric Mode (Versions 1–30 except 23, EC level L; from 2026-11-23 a code that would fit version 23 uses 24, because jsQR 1.4.0, the reader `packets-qr.html` uses where the browser has none, cannot read version 23) and rendered as a 1-bit `data:image/png;base64,...` image (never a URL, no `http://` strings). |

### 6.1 Wire envelope (`AFQR1:`)

After Base32 decoding, the binary envelope is:

1. `version` (1 byte): `0x01`
2. `keyFingerprint` (4 bytes): the Key ID above, first 4 bytes of `SHA-256("AFPK1|" + teacherPublicKeyBytes)`
3. `ephemeralPublicKey` (32 bytes): fresh per-display X25519 public key generated with `crypto.getRandomValues`
4. `nonce` (12 bytes): fresh random ChaCha20-Poly1305 nonce
5. `ciphertext || tag` (variable + 16-byte Poly1305 MAC):
   - Shared secret: `X25519(ephemeralPrivate, teacherPublic)` (RFC 7748)
   - Symmetric key (32 bytes): `HKDF-SHA-256(ikm = sharedSecret, salt = ephemeralPub || teacherPub || nonce, info = "alloflow-packet-qr-v1")` (RFC 5869)
   - AEAD: `ChaCha20-Poly1305(key, nonce, plaintext = compactResultJsonUtf8, aad = "AFQR1|" + keyFingerprintHex)` (RFC 8439)

The code is encrypted, not signed. Anyone who has a sealed file has the public key, and so can make a code that opens with the teacher's key. A code that was changed or cut short is refused, but a code does not prove which student made it, any more than a results file does.

### 6.2 The plaintext (payload version 2, from 2026-11-23)

The plaintext is compact JSON of at most 1,050 UTF-8 bytes (`MAX_QR_PLAINTEXT`), written by `compactResult` and read by `expandResult`.

**The rule: every item is always in the code, with everything that is counted from it.** The results reader counts every number from the items (section 2), so a payload that left items out would give a wrong score. What may be left out to fit is only what describes an item, in a fixed order, and the payload says which.

| Field | Meaning |
|---|---|
| `v` | `2` |
| `sid`, `pid`, `rev`, `t`, `l`, `f` | Session id, packet id, packet version, title, learner, form (absent when empty) |
| `m` | `1` for a check; absent for practice |
| `s`, `e` | Start and finish on the learner's clock. `e` is only `HH:MM:SS` when the date and the offset are those of `s` |
| `du`, `a` | `duration_s`, and `active_s` (absent when the file has none) |
| `sum` | The six numbers of the file's own summary: items, done, first try, after retry, missed, practised. For display on the teacher page only; nothing is counted from them |
| `at` | Activity titles |
| `sc` | A check's score line, short keys, a value left out when it is the default |
| `A` | The activity ids, in order of first use |
| `K` | One character for each item (base64url alphabet): bit 1 first try, 2 correct, 4 done, 8 practice, and the tries (0 to 3) times 16 |
| `G` | One character for each item (0-9, a-z): its place in `A`. Absent when there is one activity |
| `D` | Two characters for each item: digits correct, digits possible (0-9, a-z; `-` for none). Absent when no item has digits |
| `X` | By item number, only where needed: `at` tries above 3, `n` an item number that is not its place, `f` flag, `p` a practice kind other than `practice`, `dc`/`dp` digits above 35 |
| `S`, `P` | The names of the helps used, and for each item `0` or pairs of (place in `S`, count) |
| `rs` | `[recall_items, recall_median_ms]`, as the results file states them |
| `R` | The wording: for each item the end of its id, the word, the target, the answers (`1` when the one answer is the target) and the time |
| `c`, `cn`, `O`, `pt` | What was left out, below |

What is left out, when the whole does not fit:

| `c` | Left out | Still there |
|---|---|---|
| absent | Nothing. The teacher page rebuilds the same item rows as the student's own results file, cell for cell | Everything |
| `1` | The time on each item | Wording of every item |
| `2` | Also the wording of items right at the first try, as many as do not fit. `R` rows then start with the item's place. `cn[0]` is how many items have no wording | Wording of every item that was missed, tried again, flagged, practice or not reached. `O` keeps what is counted from an item id (new or known, matching or conflicting) |
| `3` | Also the wording of the missed items that do not fit (`cn[1]` of them), and which item each help was used on (`pt` holds the totals) | Every count |

A result whose counted part alone does not fit (several hundred items) is not sealed: `sealResult` throws an error with `code: "too_long"`, and the file tells the student to save the results file instead.

**Version 1** (files sealed on 2026-11-22) kept only missed items in a long result (`tr: 1`). No right score can be counted from that, so `unsealResult` refuses such a code with the reason `old_condensed`. A version 1 code that holds every item still opens.

### 6.3 The results file the teacher page writes

`packets-qr.html` turns each unlocked code into a results CSV (section 2.4) with a SHA-256 check value over the rebuilt item rows. Its `#summary` row carries two more cells, outside the check value: `source=sealed_qr` and `qr_left_out=` 0 to 3 (`c` above). The results reader sets `qrShort` from them and adds the note `qr_short` when it is above 0. On the Add up results page, the student's own results file replaces a copy that left something out.

The sealed file needs `BigInt` (Safari and iOS 14 or later). Where it is missing, the file still starts; only the QR button fails, with a message to save the results file.

