# Availability Poll (working name) — spec

A free, unlimited-slot scheduling poll: propose a set of options, share a link or
QR, collect availability, see the winner. Doodle's free tier caps how many slots
you can offer; this has no such cap because there is no vendor in the middle.

**Status: spec only. No code written.**

---

## 1. Where it fits

This is a fourth **shared async activity**, alongside the three that already
exist in `apps_script/session_mailbox/Code.gs` and the client monolith:

| type | response per person | reveal |
|---|---|---|
| `word_cloud` | one term | teacher review or auto |
| `rating` | one number in a range | aggregate only |
| `question_board` | many items | teacher review or auto |
| **`availability`** (new) | **one mark per option** | organizer sees the grid |

It is deliberately NOT a live-session feature. Live Polling already exists for
synchronous in-class use over the session document. This one is asynchronous:
people answer whenever, over hours or days, which is what a scheduling poll is.

Everything these types already share comes for free: config validation and
clamping, `expiresAt`, `minParticipants`, a pseudonymous response map, the
link/QR share path (`createHomeworkAssignmentLink`, recent QR shares, expiry
days), and per-actor access tokens
(`assignmentActivityToken(admin, packId, activityId, uid, packSecret)`), so a
respondent needs no account.

---

## 2. How the organizer gets results (the part that was unclear)

Short answer: results come back over the transport AlloFlow already uses, and
the "my own Google" intuition is literally one of the supported backends.

There are three, and an activity works over any of them:

1. **Class Mailbox — teacher-owned Google Apps Script.** The organizer deploys
   `apps_script/session_mailbox/Code.gs` under their own Google account. Poll
   state is a JSON file in **their own Drive**: `readAssignmentActivityState()`
   does `file.getBlob().getDataAsString()`. Respondents arrive via the share
   link and never sign in to anything. Nothing is stored on infrastructure you
   or I control.
2. **Firestore.** The default cloud path, kept in behavioural parity with the
   mailbox by a contract module plus adapter tests.
3. **LAN adapter.** Same session-document shape over a local network.

The organizer's AlloFlow reads the state back and renders the grid. Under the
mailbox, `onSnapshot` is emulated by a version-delta poll pump, so results
appear without a manual refresh but are not instantaneous. For a poll answered
over days, that is the right trade.

**So: no new backend, no new hosting, no account for voters, and under the
mailbox the data lives in the organizer's own Drive.**

What this does NOT include, and should not pretend to: emailing results out.
There is no mail send path here, and adding one would put us in the business of
delivering mail on a teacher's behalf. The organizer sees results **in
AlloFlow**, and can export (see §6).

---

## 3. Identity modes (organizer's choice)

Set at creation, fixed for the life of the poll, and shown to respondents before
they answer so nobody is surprised by how they will appear.

| mode | respondent sees | organizer sees | for |
|---|---|---|---|
| `anonymous` | "you are answering anonymously" | counts only, no rows | quick temperature checks |
| `codename` | an assigned codename ("Amber Fox") | codename per row | students, where the organizer must be able to follow up without collecting names |
| `real_name` | a name field they fill in | the name they typed | staff and family scheduling, the Doodle case |

Notes that matter:

- The response map is **already pseudonymous** by actor. `codename` and
  `real_name` differ only in what label is attached to a row, so all three modes
  are the same storage shape with a different display policy. `question_board`
  already carries a claimed display name (`row.name` to `copy.displayName`),
  which is the pattern to reuse.
- `anonymous` must be enforced at the **summary builder**, not in the UI. If the
  organizer can still see per-row data by reading the file, the mode is a lie.
  In anonymous mode the builder returns tallies and omits rows entirely.
- A codename must be stable for a respondent across visits, or a person who
  revisits appears twice and the tally is wrong.
- Switching mode after responses exist is not allowed. Re-labelling collected
  answers retroactively is exactly the kind of surprise that breaks trust.

---

## 4. Config shape

```js
{
  v: 1,
  activityId,
  type: 'availability',
  delivery: 'shared_async',
  prompt: 'Pick every time you could make the IEP meeting',
  identityMode: 'anonymous' | 'codename' | 'real_name',   // §3
  options: [                       // ORDERED, the organizer's own labels
    { id: 'o1', label: 'Tue Mar 4, 3:15pm' },
    { id: 'o2', label: 'Wed Mar 5, 3:15pm' }
  ],
  allowMaybe: true,                // three-state vs yes/no
  multiSelect: true,               // false makes it a plain single-choice poll
  minParticipants,                 // reuse
  closesAt,                        // voting ends, results stay readable
  deleteAt                         // responses are erased (see below)
}
```

**Two dates, not one.** The other activity types carry a single `expiresAt`,
which conflates "stop collecting" with "stop existing". A scheduling poll needs
them separate, because the normal shape of the task is: voting closes Friday,
the organizer reads the grid on Monday, and the names should not sit in Drive
forever afterwards. One date forces a bad choice between losing the result you
were collecting and keeping personal availability data indefinitely.

- `closesAt`: further responses are refused, results remain visible to the
  organizer. Respondents see "this poll has closed".
- `deleteAt`: the response rows are erased. Suggest defaulting to a set period
  after `closesAt` rather than an absolute date, so it moves if the poll is
  extended, and make it clear at creation.
- `deleteAt` erases **rows and keeps the tally** (decided 2026-08-05). Removing
  participant data must not destroy the decision that was made: in `real_name`
  mode a row is personal data and a per-option count is not. After `deleteAt`
  the organizer keeps "Tuesday 3:15pm, 7 yes / 2 maybe / 1 no" and loses who
  said what, which is the right residue for a scheduling poll.
  - Implication for the summary builder: the tally must be **materialised at
    delete time**, not recomputed from rows that no longer exist.
  - The kept tally must not be re-identifying. With very few respondents a
    count can still fingerprint a person, so `minParticipants` applies to the
    surviving tally exactly as it does to a live one.

For back-compatibility with the existing normalizer, an incoming `expiresAt`
maps to `closesAt`.

Clamps, in the same normalizer that handles the other three types: at least 2
options, a hard ceiling (suggest 50, well past Doodle's free tier), label length
capped, ids generated not accepted from input, unknown fields dropped.

`multiSelect: false` is worth having: it turns the same machinery into a general
"vote for one" poll for free, which covers a lot of classroom uses.

## 5. Response shape

```js
responses[actorUid] = {
  name: 'Sam R.',                  // only when identityMode is real_name
  picks: { o1: 'yes', o2: 'no', o3: 'maybe' },
  updatedAt
}
```

One row per actor, overwritten on change, same as the existing types. Unknown
option ids are dropped on write so a stale client cannot inject slots.

## 6. What the organizer sees

- A grid: options as columns, respondents as rows (or tallies only, in
  anonymous mode).
- Per option: yes / maybe / no counts, and a **best option** highlight. Ties are
  shown as ties rather than silently picking the first, and "best" means most
  `yes`, with `maybe` as a tiebreak, never counted as a yes.
- Respondents who have not answered, when the organizer supplied an expected
  count, so "still waiting on 3" is visible.
- Export to the existing formats so results outlive the poll's `expiresAt`.

## 7. AI authoring

Nothing currently authors an activity config with Gemini, so this is new. It
fits the intent-resolution path added on 2026-08-05:

> "Find a time for a 45 minute IEP meeting next week, weekday afternoons"

produces a **proposed** option list that the organizer edits before it goes out,
using the same propose-then-confirm pattern as the plan card. It must not create
and share a poll in one step.

The model proposes labels only. It does not invent participants, does not pick
`identityMode` (that is a privacy decision and belongs to a human), and its
output goes through the same normalizer as hand-entry, so a bad generation is
clamped rather than trusted.

## 8. Deliberately out of scope

- **Timezones.** Slots are plain labels the organizer writes. Real timezone
  handling is where scheduling tools go wrong, and half-doing it is worse than
  not doing it. If it is ever needed, it is its own project.
- **Calendar integration and invites.** Reading or writing anyone's calendar is
  a much larger permission story.
- **Reminders and email.** No send path exists, and adding one changes what this
  product is.
- **Recurring polls.**

## 9. Build cost, honestly

A fourth type is not just a client change. Each existing type spans:

- `apps_script/session_mailbox/Code.gs` (server: normalizer, state, summary)
- `question_board_contract_module.js` (the shared contract Firestore must match)
- `question_board_transport_module.js`, `question_board_view_module.js` (client)
- four parity suites: `question_board_contract`, `..._export_capacity`,
  `..._firebase_adapter`, `..._mailbox_adapter`

So the real work is a normalizer plus summary builder on the server, the
matching contract, a client view, and parity tests proving the mailbox and
Firestore paths agree. The framework is doing most of the lifting, but the
parity requirement is the part that will take the time, and it is not optional:
two backends that disagree about a poll result is a bug users cannot diagnose.

## 10. Open questions

1. **Who is the primary user?** Staff scheduling (real names, adults) and class
   polls (codenames, students) pull the defaults in opposite directions. Which
   ships as the default `identityMode`?
2. **Should a respondent be able to change their answer after submitting?** The
   row is overwritten by design, so yes is nearly free, but it changes what
   "final" means when the organizer is watching results arrive.
3. ~~Retention.~~ **Answered: two dates.** See §4 for closesAt
   and deleteAt, and the open sub-question of whether the TALLY outlives the rows.
5. ~~Mailbox config portability.~~ **Approved, see §12** (file export, not QR).
   it to a second device?
4. ~~One device, two people.~~ **Answered, see §11.** They do NOT stay distinct
   today. Making them distinct is feasible and the work is client-side only.

---

## 11. Identity on the device (investigated 2026-08-05)

### 11.1 Mailbox config persistence: implemented, but on the wrong storage

**Corrected 2026-08-05.** An earlier draft of this section said "nothing to do".
That was an accurate reading of the code and the wrong conclusion, because
localStorage does not survive AlloFlow's primary surface.

`mbConfig` initializes directly from localStorage:

```js
const url   = _alloCleanMailboxUrl(localStorage.getItem(ALLO_MB_URL_KEY) || '');
const admin = localStorage.getItem(ALLO_MB_ADMIN_KEY) || '';
const v     = Number(localStorage.getItem(ALLO_MB_VERSION_KEY) || 0);
```

Keys: `alloflow_session_mailbox_url`, `alloflow_session_mailbox_admin`, plus the
deployed script version. So the deployment URL and admin token already survive
across sessions on that device.

Keys: `alloflow_session_mailbox_url`, `alloflow_session_mailbox_admin`, plus the
deployed script version.

**This is the wrong home for it.** `allo_device_storage_module.js` exists for
precisely this reason, and says so in its own header: it provides storage "that
works in the Gemini Canvas iframe, where the app's own origin is ephemeral
(localStorage/IndexedDB vanish between sessions)". Canvas is AlloFlow's primary
surface, so a teacher who sets up a mailbox will find the config gone next
session and have to re-enter a URL and admin token they probably did not keep.

So the mailbox config should live in the **device-storage bridge**, in its own
namespace beside `model_cache`, which is also what makes it visible and erasable
in the Storage and recovery manager.

The bridge is not a free win, and the module is honest about why. It picks one
of four backends:

| backend | where | catch |
|---|---|---|
| `direct` | stable origin (desktop, self-hosted shell) | none, own IndexedDB |
| `bridge-popup` | Canvas | `window.open` to alloflow-cdn.pages.dev; **needs a user gesture** |
| `bridge-iframe` | Canvas, **experimental** | Chrome partitions storage by (top-level site, frame origin); works without a gesture only **if that partition survives Canvas reloads**, which `probe()` measures rather than assumes |
| `memory` | fallback | nothing persists |

So on Canvas the durable path may require a gesture, or may not be available at
all. The design that follows from that is belt and braces:

1. Write the config to the bridge namespace (durable when available).
2. Keep localStorage as a fast path, treated as a cache and never as the source
   of truth.
3. Provide an explicit **export/import**, because when both of the above fail
   the only remaining recovery is the human one. This is open question 5.

Two further points that do not change with storage:

- The **admin token is a credential**. It grants admin access to that teacher's
  mailbox and never expires on its own. Wherever it is stored, an export that
  carries it is a credential you can photograph, so a QR of the raw token is a
  decision to make deliberately, not a convenience to add casually.
- On a shared staffroom machine, "persist my mailbox admin token" is a different
  proposition than on a personal laptop. Worth an explicit opt-in rather than
  silently remembering.

### 11.2 Two people on one device: not distinct today

Confirmed by reading, not assumed.

The server mints a fresh participant id at join
(`'mb-' + Utilities.getUuid()...`, Code.gs) and thereafter authenticates each
request with `requestActor()`, which requires a `uid` matching `mb-[A-Za-z0-9_-]{8,48}`
plus a `pt` token equal to `participantToken(admin, code, uid, secret)`. So
identity is a uid and its HMAC, both issued by the organizer's own deployment.

The client caches exactly one of those per storage key:

```js
const ensureCredential = ... => {
  const current = credentialRef.current;
  if (current?.uid && current?.pt) return current;   // reuse, always
  ...
}
const rememberCredential = (credential) => {
  localStorage.setItem(storageKey, JSON.stringify(credential));  // ONE credential
}
```

So a second person on the same device silently inherits the first person's
identity and **overwrites their answer**. In a scheduling poll that is a
correctness bug, not a nicety: the grid would quietly lose a respondent.

### 11.3 Making them distinct: feasible, client-side only

The server side already supports it, because every join mints a new uuid and
validates it independently. No Apps Script change is needed. The client changes:

1. Store a **map** of credentials per activity instead of a single credential.
2. Add an explicit "someone else is answering" path that skips
   `ensureCredential`'s reuse branch and forces a fresh join, then stores the new
   credential alongside the existing one.
3. On return, offer "continue as X" versus "I am someone else" rather than
   assuming.

The behaviour differs by identity mode, and this is a design decision, not an
implementation detail:

- **`real_name`**: key the credential map by the typed name. Returning lets that
  person edit their own row, which is the Doodle behaviour people expect.
- **`codename`**: same, keyed by assigned codename, which must stay stable per
  respondent or the tally double-counts.
- **`anonymous`**: "is this the same person?" is unanswerable by design. Each new
  visit should mint a fresh identity, and editing your own answer works only
  within the same visit. Trying to do better here would require exactly the
  linkage the mode promises not to keep.

Cost is small and contained, but it must land **with** the poll rather than
after it: a scheduling tool that loses a respondent on a shared laptop is worse
than no scheduling tool.

---

## 12. Mailbox config portability (approved 2026-08-05)

Approved because §11.1 leaves no guaranteed recovery path: on Canvas the bridge
can degrade to `memory`, the popup backend can be blocked, and localStorage does
not survive the session. Without an export, a teacher whose storage is cleared
has permanently lost a deployment they may not know how to recreate.

**Export is a FILE by default, not a QR.** The payload contains the mailbox
admin token, which is a credential with no expiry. A QR is a credential anyone
in the room can photograph off a projector, and this tool's whole purpose is
being shown to rooms of people. A file is deliberate, goes where the teacher
puts it, and is not readable across a staffroom.

```
alloflow-mailbox-<yyyymmdd>.json
{ v: 1, url, admin, scriptVersion, exportedAt }
```

Rules:

- The export screen states plainly that the file contains an access key for
  their mailbox and should be treated like a password.
- Import validates `url` through `_alloCleanMailboxUrl` before storing, so a
  pasted or edited file cannot point AlloFlow at an arbitrary origin.
- Import writes to the bridge first (source of truth) and the localStorage cache
  second, matching §11.1.
- Offer QR only behind an explicit "show anyway" affordance, for the case of
  moving to a phone with no file transfer. Never the default, never
  auto-displayed.
- Export is available whenever a config exists, including when the bridge is in
  `memory` mode, since that is exactly the session whose config is about to be
  lost.

## 13. Remaining decisions

Two left. Recommendations below; both are reversible.

**13.1 Default `identityMode`: none. Force an explicit choice.**
Recommended rather than picking a default, because identity mode is a privacy
decision and a default is the thing people do not notice. A creator who wanted
codenames for students and silently got real names has collected data they never
meant to. The creation form should require the choice before the poll can be
shared, with the three options described in plain language rather than by key.

**13.2 Respondents may change their answer until `closesAt`.**
The row is overwritten by design, so this is nearly free, and it is what people
expect from Doodle. `updatedAt` is already in the response shape, so the
organizer can see that a row moved. After `closesAt`, edits are refused with the
same message as a late first response.

The one caveat: in `anonymous` mode, "change my answer" only works within the
same visit, because linking a returning visitor to their earlier row is exactly
the linkage that mode promises not to keep (§11.3).
