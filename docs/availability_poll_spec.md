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
  expiresAt                        // reuse
}
```

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
3. **Retention.** `expiresAt` exists. What should it default to for a poll, and
   should expiry delete the responses or just close voting?
4. **One device, two people.** I verified the token shape but not how a fresh
   respondent is assigned a uid. If two people answer on one shared device, do
   they stay distinct? This needs checking before build, because it decides
   whether `real_name` mode is trustworthy.
