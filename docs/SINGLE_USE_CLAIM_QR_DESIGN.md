# Single-Use QR Claim Codes for School Rewards — Design Note

**Date:** 2026-09-22 · **Status:** NOT BUILT. Scoping only; no code changed.
**Prompted by:** "A QR code can be made single-use for earning digital
points... could this apply to the school store?"

**Short answer: yes, and most of the hard part already exists.** The ledger
already has server-side idempotency, a script-wide lock and a crash-safe
journal. What is missing is not replay protection — it is that **no
student-initiated earn path exists at all**, and that is the whole security
surface.

---

## 1. Where the points actually live

Worth stating plainly, because two plausible-sounding answers are wrong.

- It is **not** Firestore. `firestore_sync_module.js` has zero references to
  School Rewards.
- The browser module `school_rewards_module.js` **never writes a balance** —
  `setBalance` / `awardPoints(` appear zero times. `srRecognitionText` calls
  its own output a "worksheet ... (codenames; **award in the portal**)".

The ledger is a **Google Apps Script** deployment over a Sheets workbook:
`apps_script/school_rewards/Code.gs` (4,625 lines), served from
`script.google.com`. `SR_SHEETS` defines `Ledger`, `Balances`, `PointHolds`
and the rest.

## 2. The QR that exists today is not a redemption QR

`school_rewards_module.js:332`:

```js
window.__alloMakeQrSvg(portalUrl, "School Rewards")
```

One **static portal link**, shared with staff so people can reach the site.
It carries no token and redeems nothing; scanning it twice just opens the
portal twice. There is no double-redemption hole today because there is no
scan-to-earn path to exploit.

## 3. What is already built (and is the expensive part)

| Requirement of a single-use claim | Present? | Where |
|---|---|---|
| Server-held unique token | yes | `PointHolds.idempotencyKey`; 74 `idempotencyKey` references |
| Replay returns the first result, does not re-award | yes | `loadCoreOperation_` returns `state.result` on replay |
| One serialized transaction | yes | `locked_()` — `LockService.getScriptLock()`, 30s |
| Crash-safe mid-write | yes | intent/journal via `startCoreOperation_` / `resumeCoreOperation_`, with deliberate `coreFault_()` injection points |
| Ledger row can cite its source | yes | `Ledger` already has `ReferenceType` / `ReferenceId` |

`awardSchoolRewardsPoints` is therefore **already replay-safe**: call it twice
with one `idempotencyKey` and the second call returns the first result.

## 4. What is missing — and it is the security-critical bit

```js
function awardSchoolRewardsPoints(request) {
  var actor = requireRole_(['admin', 'staff']);
```

Every award requires staff or admin. A student scanning a QR is neither. The
work is **not** "add idempotency"; it is **adding an entry point a student may
call, without letting a student decide how many points they get.**

★ The failure to design against is the one already recorded in
`feedback_postmessage_source_string_is_not_a_check`: **the payload is
attacker-controlled.** A QR encoding `?student=avery&points=20` is forgeable
by editing the URL before scanning. Points must be read from the server row,
never from the link.

### What we can rely on

`currentActor_()` authenticates by Google account: allowed-domain check, then
roster lookup, returning a trustworthy `studentId`. So the claimant's identity
does **not** have to ride in the QR — only the token does.

## 5. Proposed design

**New sheet** (add to `SR_SHEETS`, so `initializeSheets_` creates it):

```
ClaimTokens: ['Id','Points','CategoryId','Reason','BatchId','Status',
              'ClaimedByStudentId','ClaimedAt','ExpiresAt','LedgerId',
              'CreatedByEmail','CreatedAt']
```

`Status` ∈ `unused | used | void | expired`.

**Mint (staff/admin):** `mintSchoolRewardsClaimTokens(request)` —
`requireRole_(['admin','staff'])`, N rows with `Utilities.getUuid()` ids,
fixed `Points`/`CategoryId`/`Reason`, an `ExpiresAt`. Returns the ids for
printing.

**QR contents:** `https://script.google.com/.../exec?claim=<uuid>` —
**the token id and nothing else.** No studentId, no amount.

**Claim (student):** `claimSchoolRewardsToken(request)`

```
actor = currentActor_()            // student allowed here; identity is trusted
locked_(function () {
  row = lookup ClaimTokens by id
  reject if: missing | status !== 'unused' | past ExpiresAt
  key = idemKey_('claim:' + tokenId)          // token id IS the idempotency key
  reuse startCoreOperation_ / resumeCoreOperation_ to, in one journal:
    - award row.Points to actor.studentId, reason row.Reason, category row.CategoryId
    - write Ledger with ReferenceType='claim_token', ReferenceId=tokenId
    - set Status='used', ClaimedByStudentId, ClaimedAt, LedgerId
})
```

Points come from the **sheet row**, never the request. A second scan finds
`status='used'` and returns "already redeemed" — and even a concurrent double
scan is safe, because the token id is the idempotency key and `locked_()`
serializes.

**Portal:** one result screen in `Portal.html` — claimed / already redeemed /
expired / not-on-roster.

## 6. Two traps specific to this codebase

1. **Do not reuse the `window.confirm()` checkout pattern.** Checkout requires
   a native `confirm()`, and in a sandboxed iframe without `allow-modals` it
   returns false **silently** — the click does nothing
   (`project_school_store_purchase_confusion_2026-09-11`). QR scans land in
   exactly those contexts: in-app browsers and scanner webviews. A claim must
   never depend on a modal.
2. **Apps Script quotas.** `locked_()` serializes every claim behind one
   30-second script lock. Fine for a receipt or a slow trickle; a whole class
   scanning simultaneously will queue and some will hit `busy`. If "everyone
   scan now" is a real use case, the claim needs a retry/backoff in the portal
   and an honest "try again" state — not a silent failure.

## 7. Scope

**Small — 1–2 sessions**, because the transactional core is reused, not
written:

- `SR_SHEETS.ClaimTokens` + `initializeSheets_` coverage
- `mintSchoolRewardsClaimTokens` (staff) — ~40 lines
- `claimSchoolRewardsToken` (student) — ~60 lines, wrapping existing helpers
- Portal result screen + strings in `portal_strings.json`
- Tests: double scan, expired, voided, wrong domain, not-on-roster,
  concurrent double scan, and a forged `?points=` in the URL proving the
  amount is ignored

**Out of scope unless asked:** printing/receipt integration, batch QR sheet
generation, per-student pre-assignment (tokens here are bearer tokens —
whoever scans first and is on the roster gets them; that is the right model
for a receipt, the wrong one for a mailed reward).

## 8. Open questions for Aaron

1. **Bearer or assigned?** Bearer (first valid scanner wins) suits receipts
   and posters. Assigned (token pre-bound to one `studentId`) suits anything
   handed to a named student. The sheet supports both; the check differs.
2. **Who mints — staff, or an automated source** (a receipt printer, an
   activity completion)? Automation needs a service identity, which
   `currentActor_()` currently has no notion of beyond `scheduledAdminActor_`.
3. **Expiry default?** A never-expiring bearer token printed on paper is a
   permanent liability if the paper is photographed.

---

## 9. Addendum — the wider Apps Script estate (2026-09-22)

A repo-wide sweep after the note was written turned up **six** Apps Script
projects, not one. Worth recording, because it changes where this pattern
could be reused and it corrects a wrong first impression of the locking.

| project | Code.gs | `idempotencyKey` | `LockService` |
|---|---|---|---|
| educator_evaluation | 6,216 | 0 | 20 |
| school_rewards | 4,625 | **74** | 1 |
| session_mailbox | 3,039 | 0 | 11 |
| educator_evaluation_share | 1,089 | 0 | 0 |
| walkthrough_records | 291 | 0 | 0 |
| leadership_hub_backup | 133 | 0 | 0 |

★ The `LockService: 1` for school_rewards reads like the weakest locking of
the three and is in fact the strongest: it defines the lock **once** in
`locked_()` and calls that wrapper at **69** sites, where the others take
the lock inline. Counting the API call rather than its use would have
inverted the conclusion.

**school_rewards is the only project with idempotency at all.** So this
design reuses a facility that exists nowhere else — and if a single-use
claim is ever wanted against session_mailbox or educator_evaluation, the
replay-safety would have to be built there first, which is the expensive
part this note gets for free.

(Also for the record: a loose `.gs` grep matches minified JS like
`.gs=function` in every `--help-*.html`. Those are not Apps Script.)
