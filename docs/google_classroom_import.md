# Google Classroom roster import

This feature is part of the AlloFlow source tree. The teacher roster panel opens the standalone `classroom-import.html` helper; `classroom_import_service.js` implements the read-only acquisition and codename-only export. The helper starts unconfigured. No live Google account, credential, or student record was used to develop or test this change. Deployment and a real-data pilot remain unverified.

## Teacher workflow

After an administrator approves and configures the deployment, a teacher opens the helper from the class roster panel (left sidebar → History tab → Manage Roster → **Google Classroom setup**), explicitly connects their school account, selects an active class they teach, reads its complete roster, reviews names beside newly assigned codenames, confirms the assignments, and either downloads a v4 AlloFlow roster or, when the helper was opened from AlloFlow on the same origin, sends that same v4 roster straight back to the AlloFlow tab with **Send to the AlloFlow tab** (added 2026-09-25). The handoff posts only the codename-only JSON that the download would contain, to `window.opener` with the helper's own origin as the target; the panel accepts it only from the window it opened, only from its own origin, only in that shape and under the 2 MB limit, then asks the teacher to confirm the replacement exactly as a file import would and reports the outcome back to the helper. A cross-origin or unrelated opener gets no send button and the download path remains. The separate preview remains private in the helper's memory. The downloaded JSON contains codenames, fresh random class/learner identifiers, and empty/default AlloFlow state. It contains no Google account/course/student IDs, names, emails, profiles, access tokens, or association table.

**Teacher-private labels (2026-09-25).** The roster panel offers *Show my private labels*: a short note the teacher types beside each codename (initials, a name, a seat) so they no longer need the helper's preview to remember who a codename is. Labels live only in that browser under their own storage key (`alloflow_teacher_private_labels`, keyed by class ID, at most 40 characters and 8 classes) and are never merged into the roster object, so every roster export, Store review file, printed worksheet, live-session sync and AI path stays codename-only by construction. They are hidden again every time the panel closes, are unavailable in parent and independent modes, follow a codename through deletion, and can be cleared per class. They are a convenience on a private teacher device, not a synchronization mechanism, and a projected or shared screen should keep them hidden.

This is initialization for a new or empty AlloFlow class. The standalone helper cannot inspect an AlloFlow destination and cannot prove that the teacher later chooses an empty one. Its acknowledgement is a user workflow guard; the actual import destination must apply its own safeguards. Opened on its own (by URL, or with a download), re-running the helper creates different class and learner IDs and is not synchronization; do not use such a file to refresh an established class. A class **linked** from AlloFlow is different: see *Linked sync* below. Re-reading a linked class reproduces the same learner IDs and flows through AlloFlow's reviewed same-class update pathway.

Student accounts are not created or required. Classroom membership does not specify instructional support needs or AlloFlow groups, so all imported learners begin unassigned. The helper does not read grades, assignments, guardian records or Drive folders and does not write to Classroom. No School Store identity association or award is created.

## Public deployment configuration

`classroom_import_config.js` is public non-secret administrator configuration. Keep the shipped defaults empty/disabled until the deployment has been reviewed. The helper requires `enabled: true`, `reviewedDeployment: true`, a Google OAuth client ID and an exact approved origin in `allowedOrigins`. The OAuth client ID is public; never put a client secret, refresh token, bearer token, identity map, or student record in this file. The helper does not accept these settings through query strings, fragments, uploads, or token textboxes.

Google Identity Services is loaded only for a configured helper. Authorization starts from an explicit user gesture, and the returned token must grant both required scopes. The two requested scopes are `https://www.googleapis.com/auth/classroom.courses.readonly` and `https://www.googleapis.com/auth/classroom.rosters.readonly`. No email/photo scopes are needed for the implemented course, teacher, account-ID and student-name reads. [Classroom scopes](https://developers.google.com/workspace/classroom/guides/auth), [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model).

An origin allowlist limits where this helper runs; it does not restrict the Google account's organization. An email suffix or Google account chooser hint is not proof of domain authorization. Use a district-controlled internal OAuth application and appropriate school third-party application restrictions. A separately approved `allowedAccountIds` list can constrain this service to exact Classroom user IDs verified by `/userProfiles/me`; it does not infer a district from an ID. Publicly publishing such an allowlist also exposes those teacher identifiers and needs review. The service never requests email access merely to guess domain membership.

Before enabling real access, confirm Google project/client ownership, authorized JavaScript origins, OAuth consent/publishing and applicable verification, district allowlisting, teacher access, where the helper is hosted, token expiry/revocation behavior, retention/printing policy for the name preview, and a new-class pilot with the real AlloFlow deployment. Configuration flags record a deployment decision; they do not themselves prove district approval. No stored name or Google-ID mapping and no background sync is implemented; a linked sync runs only when the teacher starts it and reviews its result. [Google authorization API reference](https://developers.google.com/identity/oauth2/web/reference/js-reference).

## Service API and trust boundary

The browser module registers `window.AlloModules.GoogleClassroomImport`; CommonJS tests can require the same source. It has no default fetch, default token, network activity at load time, or external package dependency.

```js
const service = window.AlloModules.GoogleClassroomImport;
const connector = service.createConnector({
  fetchImpl: window.fetch.bind(window),
  getAccessToken: ({ signal }) => trustedMemoryOnlyTokenProvider(signal),
  // Optional approved exact teacher IDs; never inferred from course/student fields.
  // allowedAccountIds: approvedTeacherIds,
});
const listing = await connector.listTeacherCourses({ signal });
// Explicit teacher choice from listing.courses, without putting IDs in page URLs.
const snapshot = await connector.readSelectedCourse({ courseId: selectedId, signal });
const prepared = service.convertSnapshot(snapshot, { destinationRoster: null });
// Render prepared.preview in the restricted teacher helper using textContent.
// Only after explicit teacher review and new-class acknowledgement:
// download prepared.json, NEVER JSON.stringify(prepared) or snapshot.
```

`listTeacherCourses` returns `{ status: 'complete', courses }`, where each course has `id`, `name`, `courseState`, and optional `section`. The service privately pins the account ID from the first completed listing. Changing accounts requires discarding the connector and starting a new reviewed session. Returned course objects do not control the internal selection allowlist.

`readSelectedCourse` accepts only an ID from that connector's completed listing. One memory-only bearer token is obtained for each operation and reused for the entire operation, so it cannot switch accounts mid-chain through token refresh. The service checks `/userProfiles/me` again, reads every teacher page and verifies the pinned teacher remains a member, then reads every student page. A failed operation invalidates old course selections. `cancel()` aborts active work, `dispose()` aborts and permanently closes the connector, and `getStatus()` returns only a fixed phase and redacted code. Calling a second operation during active work returns `BUSY`.

Only a complete operation returns a snapshot:

```js
{
  status: 'complete',
  selectedCourseId: 'private-source-course-id',
  expectedStudentCount: 2,
  consistency: 'PAGINATED_MEMBERSHIP_CAN_CHANGE',
  pages: [{
    status: 'success', courseId: 'private-source-course-id', requestPageToken: '',
    response: { students: [/* validated private source records */], nextPageToken: '' }
  }]
}
```

`expectedStudentCount` is this adapter's derived assertion after the successful terminal page. It is **not a Google response field** or an independent server count. Pagination completion means the service followed the entire returned token chain; Google does not provide an atomic membership snapshot through these list methods. Students and teachers can change during acquisition. Duplicate identities cause refusal, but changes that do not produce a detectable duplicate may still affect the resulting roster. The teacher must compare the completed preview with the intended class before exporting.

The snapshot and names are private inputs to the trusted helper, not a safe download or general app state object. `convertSnapshot` returns `{ roster, json, studentCount, preview }`; each preview row is `{ fullName, codename, learnerId }`. That preview is an identity association and must never be serialized into shared output, browser storage, telemetry, AI context, URLs, or ordinary AlloFlow roster state. Only `json` is the download payload. Missing names stay blank in the service preview; the actual helper visibly identifies those rows as unavailable and blocks download until the teacher resolves the identities in Classroom and reads the roster again. Identical or Unicode-equivalent names remain separate rows because source user IDs, not names, distinguish membership while held in memory.

The converter revalidates successful page status, course equality, exact token chain, terminal page, unique source user IDs, and count agreement. It requires `destinationRoster: null` or exactly `{ groups: {}, students: {} }`. For an unlinked read, secure `crypto.randomUUID()` creates all identifiers; no names/emails/Google IDs are hashed into them. Random collision retries are bounded. For a linked read, `convertLinkedSnapshot` derives them with a teacher-held key instead (see *Linked sync*). Either way the resulting identifiers are pseudonymous, not anonymous.

## Pinned Google API contract

Official documentation was checked September 8, 2026. Requests use only `GET` and the fixed HTTPS origin `https://classroom.googleapis.com`. Field masks deliberately exclude unneeded personal data. Unknown keys under these masks, unknown states, malformed values and identity mismatches fail closed instead of silently broadening acquisition.

| Method | Request restriction / selected fields | Response |
| --- | --- | --- |
| `/v1/userProfiles/me` | `fields=id` | Required `id`; verified against the pinned account and optional approved account list. |
| `/v1/courses` | `teacherId=me`, `courseStates=ACTIVE`, `courses(id,name,section,courseState),nextPageToken` | `courses` array may be omitted when empty. Includes classes the teacher owns or co-teaches; it does not list all administrator-visible courses. |
| `/v1/courses/{id}/teachers` | `teachers(courseId,userId),nextPageToken` | Validate every teacher's course ID and unique user ID; require the pinned account in the completed collection. |
| `/v1/courses/{id}/students` | `students(courseId,userId,profile(id,name(fullName,givenName,familyName))),nextPageToken` | Validate unique student IDs and course IDs; profile ID, when present, must equal the student ID. |

The returned `nextPageToken` is passed as the next request's `pageToken`; other list parameters remain identical. Omitted/empty terminal tokens end the chain. An omitted array is an empty page, including intermediate pages with a continuation token. Never infer completion from a page shorter than the requested size. [courses.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list), [teachers.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.teachers/list), [students.list](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students/list).

Student records have `courseId`, `userId`, optional `profile`, and other Google fields excluded by the requested mask. User profiles expose `id` and name components with the roster scope; email and photo fields require their own scopes, which this helper does not request. [Student resource](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students), [UserProfile resource](https://developers.google.com/workspace/classroom/reference/rest/v1/userProfiles), [userProfiles.get](https://developers.google.com/workspace/classroom/reference/rest/v1/userProfiles/get).

## Failure, limits and credential handling

Defaults are 30 seconds per entire operation (including token provider and body reads), 100 requested records per page, 50 pages per collection, 250 courses, 100 teachers, 500 students, 256 KiB per response and 2 MiB total response bytes per operation. Trusted test/deployment seams may lower limits; they cannot raise the hard defaults. Streams are counted while reading even without `Content-Length`. The JSON export is independently bounded below AlloFlow's 2 MiB import limit.

Every fetch explicitly uses `redirect: 'error'`, `credentials: 'omit'`, `cache: 'no-store'`, and `referrerPolicy: 'no-referrer'`. Returned redirects and changed response URLs are rejected. Bearer credentials appear only in the request `Authorization` header. Reflected credentials, including JSON-escaped values, are rejected before source strings can become pagination URLs or preview output. No user-supplied endpoint or generic proxy exists. Injected transport/token providers must themselves honor the no-logging and memory-only contract; tests use fictional implementations exclusively.

HTTP error response bodies are never read or surfaced. `401` maps to `AUTH_REQUIRED`, `403` to `ACCESS_DENIED`, `404` to `NOT_FOUND`, `429` to `RATE_LIMITED`, and server failures to `SERVICE_UNAVAILABLE`. Network errors, malformed data, repeated tokens, duplicates, count/page/byte limits, cancellation and timeouts expose fixed codes without source values or nested causes. There is no automatic partial-page retry or partial export. After a failure, re-list and restart acquisition after the teacher resolves access/rate conditions. A timeout/cancel race returns promptly even when an injected dependency ignores its abort signal.

Disposal drops service-held account/selection state; the helper must also clear its token, name preview, raw snapshot and download URL. Clearing JavaScript references is not a secure-erasure guarantee. Disconnecting local state and revoking the Google grant are different operations; deployment review must verify the helper's explicit revoke behavior.

## Verification

From the repository root, using existing dependencies:

```powershell
node node_modules/vitest/vitest.mjs run tests/classroom_import_service.test.js tests/classroom_import_app.test.js --maxWorkers=1
```

The service tests execute the actual shipped service with fabricated Google-format JSON, streaming responses and injected token/fetch functions. They cover account pinning/allowlisting, teachers and selected-course pagination, empty pages, denied/revoked access, later-page failures, 429 responses, duplicate/mismatched IDs, unknown data, response/count/page bounds, redirects, invalid UTF-8/JSON, cancellation/concurrency/timeouts, credential reflection/leakage, 500-learner conversion, empty-destination enforcement and private-preview/export separation. The UI tests execute the shipped HTML and app script in isolated DOM instances with fake Google authorization and connector/converter seams, including the same-origin handoff (no send button without a same-origin opener; only the codename JSON is posted; replies are rendered as text and bounded); `tests/teacher_private_labels_and_classroom_handoff.test.js` renders the actual roster panel for the private labels and the receiving side of the handoff: disabled deployment, exact consent scopes, denial, confirmation/download separation, literal name rendering, unavailable names, duplicate/late callbacks, cancellation, expiry/revocation, and cleanup. On September 8, 2026 these suites passed 67 tests (38 service, 29 UI). Broader integration verification checks actual AlloFlow import compatibility and the browser helper with fictional API responses. These checks cannot certify live Google OAuth, school policy, production hosting, membership consistency, or the actual Gemini Canvas pilot.

## Linked sync (2026-09-25)

A roster imported from Google Classroom used to be a one-time initialization: every read produced new random IDs, so the teacher had to re-import (and lose history) or add students by hand. A linked class can now be read again, and returning students keep their codenames.

**How it works.** When the roster panel opens the helper, the helper greets its opener and the panel answers with a *context*:

- *Link* (the current class is not linked on this device): the panel generates a fresh random 256-bit key and hands it to the helper in memory. The helper derives the class ID from the selected Google course ID and each learner ID from the student's Google user ID with HMAC-SHA-256 under that key, and formats both as the same version-4 UUIDs the roster planner already requires. When the teacher confirms the replacement in AlloFlow, the panel stores the key under the new class ID.
- *Sync* (the current class is linked on this device): the panel sends the stored key, the class ID and the class's `learnerId → codename` map (codenames and opaque IDs only). The helper preselects the Classroom class whose derived ID matches, refuses any other class (`LINKED_CLASS_MISMATCH`), reproduces every returning learner's ID, reuses that learner's existing codename, and assigns unused codenames to newcomers. The result goes to the panel's existing safe-update preview: additions are listed, learners no longer in Classroom are kept and listed as absent, and nothing changes until the teacher acknowledges and confirms.

**Where the key lives.** Only in that browser, under `alloflow_classroom_sync_keys` (per class ID, at most 20 classes), beside the teacher-private labels. It is never merged into the roster object, so no roster export, Store review file, worksheet, live session or AI context contains it. The helper holds it only in tab memory and never logs, displays or downloads it; in link and sync modes the helper hides its download button and returns only the codename-only roster. A teacher can move a link to another device only by the explicit **Save sync key** / **Load sync key** actions (a small JSON file checked against the class ID), and can remove it with **Unlink**. Losing the key means the class can no longer sync; the roster itself is unaffected.

**What changed in the privacy model, and what did not.** Learner IDs of a linked class are now keyed pseudonyms of Google user IDs rather than unrelated random values. Without the key they cannot be recomputed or matched to anyone. With the key *and* read access to the Classroom roster (which already reveals names), a person could match codenames to students; this is why the key stays on the teacher's device, why saving it asks for confirmation and warns that the file must be kept private, and why it is never part of any shared artifact. No name, email, Google user ID, course ID or name-to-codename table is stored anywhere. An unkeyed hash, by contrast, would let anyone holding a roster and a list of Google IDs do that matching, which is why none is used.

**Limits.** Sync works only through the in-app handoff (a helper opened on its own has no key). Classes imported before linking existed, or with a download, have random IDs and cannot be adopted into a link without a replacement import. Students added by hand in AlloFlow are not Classroom members and stay in the roster as absent from each sync. Codenames changed outside this flow are sent to the helper as they stand in the roster.

See [Google connections across Classroom, School Store, and Educator Evaluation](google_workspace_connections.md) for the separate account, permission, hosting, and storage boundaries.

See [Google OAuth verification for the Classroom helper](google_classroom_oauth_verification.md) for what it takes to enable the shipped helper for schools outside a single Workspace tenant.
