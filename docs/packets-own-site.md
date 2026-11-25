# AlloFlow Packets on a web address of its own

## What this is

A browser keeps what a site saves (localStorage, IndexedDB) by web address. Today Packets is on `apomera.github.io`
with the whole AlloFlow app, so any page on that address could read what Packets keeps in the teacher's browser:
the results kept with "Keep these results on this device", the places kept on the Open page, My words, and a file
waiting to be handed from one page to another. All of it is stored in the teacher's browser. None of it is on a server.

On an address of its own (for example `alloflow-packets.pages.dev`), only the Packets pages can read it. Cloudflare
can also send a header that stops other sites from showing Packets inside a frame. GitHub Pages cannot.

The build script makes one folder with the Packets pages and every file they load, copied byte for byte from this
repository, plus a `_headers` file. About 1,035 files and 409 MiB, most of it the recorded words (`word_audio_shards/`, 823 files).

## Build it (one command)

```
node dev-tools/build_packets_site.cjs --out=C:\tmp\packets-site
```

The folder must be outside the repository (or a folder in it that git ignores). If the folder exists, it is emptied
only if this script made it. The script stops and says why if a page names a file that is missing, if a script loads a
file the script does not know about, if it would copy anything private or from `tests/`, or if a Cloudflare limit is
passed (20,000 files, 25 MiB for one file). It writes `packets-site-manifest.json` (every file, its size and sha256).

### With the meaning recordings (2026-11-23)

The vocabulary maker can put recordings of the meanings into a file, made ahead of time with the same voice as the
word recordings (Kokoro, af_heart). They are **not in the repository** (they are made from the word list and can be
made again; git would keep every old copy). Make or update them, then build with them:

```
node dev-tools/build_packets_meaning_audio.cjs --plan                 how many, how big, how many are made
node dev-tools/build_packets_meaning_audio.cjs                        the rest (on this laptop about 1.8 s a meaning)
node dev-tools/build_packets_site.cjs --plan --meaning-audio=%USERPROFILE%\AlloFlow-media\packets_meaning_audio
node dev-tools/build_packets_site.cjs --out=C:\tmp\packets-site --meaning-audio=%USERPROFILE%\AlloFlow-media\packets_meaning_audio
```

`--plan` checks the full site + meaning-audio shard set against Cloudflare Pages limits (20,000 files, 25 MiB per file) without writing a folder — even with all 8,192 meaning shards plus ~1,035 site files, the total stays around ~9,228 files (under half the 20,000-file project limit).

The store is `%USERPROFILE%\AlloFlow-media\packets_meaning_audio` (index.json and up to 8,192 files m-0000.json to
m-1fff.json). A meaning's recording is found by its exact text, so a meaning that is reworded is simply recorded again
on the next run. A question plays meaning recordings only when all four answers have one; otherwise the device voice
reads them all, so no answer sounds different. The GitHub copy of Packets has no meaning recordings and reads meanings
with the device voice, as before.

A meaning with no recording (a teacher's own or changed meaning, a wrong answer the teacher wrote, or any meaning where
the site has none) is named under the file, with a link (in More options) to the computer-voice page, which makes it
with the same voice (Heart, at the same loudness) and keeps it in My words (`packets_voice_meanings.js`,
`AlloPacketMyWords.putMeaningClip`, the same key). The maker makes the file again by itself when it is kept. `--pilot 200` makes a listening sample and `listen.html` in
`%USERPROFILE%\AlloFlow-media\meaning-audio-work`.

## Check it (one command, about 2 minutes, opens one browser)

```
node dev-tools/check_packets_smoke.cjs --root=C:\tmp\packets-site
```

It serves the folder with its `_headers`, opens every page, and runs real student files inside the Open page and Try it.
A missing file (404), a refused load or a page error fails it. On 2026-11-23: 41 of 41 checks pass.

## What you do in Cloudflare

1. Log in to Cloudflare. Workers & Pages > Create > Pages > **Upload assets** (direct upload).
2. Name the project, for example `alloflow-packets`. The address becomes `alloflow-packets.pages.dev`.
3. Upload the folder with Wrangler:
   - `npx wrangler pages deploy C:\tmp\packets-site --project-name alloflow-packets` (asks you to log in the first time).
   - Note: Cloudflare's browser dashboard upload caps direct drag-and-drop at 1,000 files; the expanded Packets site now has ~1,035 files (still far below Cloudflare's 20,000-file project limit), so use `wrangler pages deploy`.
4. Open `https://alloflow-packets.pages.dev/` and press through a maker once.

To update later: build again, check again, deploy again. A custom domain can be added in the project's settings
with no change to the files.

## What changes for teachers

- On the new address, nothing kept from the old one is there: kept results, kept places, My words. Each address has
  its own storage in the teacher's browser. My words can be moved: "Save My words as a file" on the old address,
  "Open a My words file" on the new one.
- Files already handed out name the old Open page (`apomera.github.io/AlloFlow/packets-open.html`). It keeps working.
- The pages on the new address show their own Open page address.
- Files made on the new address name its own Open page, with or without `.html` in the address (fixed 2026-11-23 in
  `word_sounds_take_home_loader.js`, `openAddress`: Cloudflare serves `packets-make.html` at `/packets-make`).
- "More from AlloFlow" on every Packets page is the link `./`. On the new address it leads to the Packets front door,
  not to the AlloFlow app. It stays relative on purpose: the Packets pages name no web address at all, so that a school's
  IT person can check that a page reaches nowhere (tests/packets_site_pages.test.js and others enforce it). If the link
  should lead to the app, the build could write the app's address into the copied pages only; that is a decision for later.

## What is still shared until the old pages are retired

- The AlloFlow app's links into Packets (Word Sounds to the maker, the read-along and vocabulary drafts, Symbol Runner
  from Fluency Maze) open the copy on `apomera.github.io`. They hand a draft over through that address's browser storage,
  so they must stay on the same address as the app unless that hand-over is redone.
- The main site keeps its own copy of every Packets page. What a teacher keeps while using that copy is still readable
  by the app's other pages there. Retire it (or send it to the new address) once teachers have moved.

## Other sites the pages contact, and when

Nothing is sent anywhere when a page opens. These are contacted only after a teacher turns something on:

| Site | Page | When |
| --- | --- | --- |
| huggingface.co (and its file servers) | Computer voice, Read-along maker | "Get the voice": the voice model, about 88 MB |
| alloflow-cdn.pages.dev | Computer voice, Read-along maker | only if this site's copy of the voice program does not arrive |
| globalsymbols.com, api.openverse.org, Wikimedia Commons | Pictures | a picture search |
| api.dictionaryapi.dev | Look up a word | a word looked up |
| script.google.com | Open a practice file | a student file made with a Class Mailbox sends its results |
| alloflow-catalog-submit.aaron-pomeranz.workers.dev | Send feedback | a teacher confirms what will be sent and presses Send |
| github.com | front door, About, Guide for school IT | plain links, only when pressed |

## The headers

Every path: no framing (`X-Frame-Options: DENY`, `frame-ancestors 'none'`), `nosniff`, no referrer. No Packets page is
framed by another page; the Open page and Try it show a student file in a frame of their own, which this does not
affect (the check runs files in both with these headers). Device features are off, except the camera on Collect by
sealed QR (`packets-qr`) and the microphone on the two pages that record: the Word Sounds maker (My words) and the
read-along maker. Each page keeps its own Content-Security-Policy.
